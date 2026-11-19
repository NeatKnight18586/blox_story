#!/usr/bin/env node
// tools/plan_cuts.js — Retention Engine cut planner CLI (Phase 4). VO word timestamps + beats prompt → episode shots.
//   node tools/plan_cuts.js --story <slug> --beats <BEATS.md|beats.json> --base <episode.json> --out <episode.json>
//        [--places <module exporting ANCHORS> | --targets-from <episode.json>] [--reversal 52.4] [--subjectH 5.3] [--loop] [--plan-out plan.json]
// Planning (cuts, intents, sizes, hero shots, jolt): engine/cutplan.js. Camera data: engine/presets6.js.
// Targets: --places = named world anchors {at, camera} matched to beats by name (a beat with no place keeps the previous one);
// --targets-from = the look point and azimuth of another cut of the same VO at each shot's time (used to re-cut an old episode).
// Output: the base episode with format 6, end = last word + 0.2 s, the planned shots, labels false, sfx false.
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {planCuts, parseBeatsTable} from '../engine/cutplan.js';
import {preset, loopify, loopScore} from '../engine/presets6.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; }, has = k => argv.includes(`--${k}`);
const story = arg('story'), dir = story ? `stories/${story}` : arg('dir');
if (!dir || !arg('base') || !arg('out')) { console.error('usage: plan_cuts.js --story <slug> --beats <file> --base <episode.json> --out <episode.json> [--places m.js | --targets-from ep.json]'); process.exit(2); }
const cues = JSON.parse(readFileSync(`${dir}/cues.json`, 'utf8')), base = JSON.parse(readFileSync(arg('base'), 'utf8'));
const script = existsSync(`${dir}/script.txt`) ? readFileSync(`${dir}/script.txt`, 'utf8') : '';
const fps = base.fps ?? 24, H = Number(arg('subjectH', 5.3));

// words, lines (with word index ranges), stressed words (*marks* in script.txt + the base's caption keywords)
const words = [], lines = [];
for (const l of cues.lines) { const i0 = words.length; for (const w of l.words) words.push({w: w.w ?? w.word, start: w.start, end: w.end}); lines.push({start: l.start, text: l.text, wordIdx: [i0, words.length - 1]}); }
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
const marks = new Set([...script.matchAll(/\*([^*]+)\*/g)].flatMap(m => m[1].split(/\s+/).map(norm)));
for (const k of base.keywords ?? []) for (const w of String(k).split(/\s+/)) marks.add(norm(w));
const stressed = new Set(words.map((w, i) => marks.has(norm(w.w)) ? i : -1).filter(i => i >= 0));

// beats + places
let places = null;
if (arg('places')) places = (await import(pathToFileURL(path.resolve(arg('places'))).href)).ANCHORS;
const bf = arg('beats'), btext = bf ? readFileSync(bf, 'utf8') : '';
const beats = !bf ? [] : bf.endsWith('.json') ? JSON.parse(btext) : parseBeatsTable(btext, places ? Object.keys(places) : []);
const plan = planCuts({words, lines, stressed, beats, fps, reversalAt: arg('reversal') ? Number(arg('reversal')) : null});

// targets
const ref = arg('targets-from') ? JSON.parse(readFileSync(arg('targets-from'), 'utf8')) : null;
const refShots = ref ? [...ref.shots].sort((a, b) => a.at - b.at) : [];
const azOf = (pos, tgt) => Math.atan2(pos[0] - tgt[0], pos[2] - tgt[2]) * 180 / Math.PI;
let lastPlace = places ? Object.keys(places)[0] : null;
function aim(s) {
  if (ref) {   // the other cut's camera at this moment: its look point and azimuth (crash/snap/split use their from pose)
    const r = refShots.findLast(x => x.at <= s.at + s.dur / 2) ?? refShots[0];
    const f = r.from ?? r.a?.from ?? {position: [0, 10, 20], target: [0, 2, 0]};
    let dist = Math.hypot(f.position[0] - f.target[0], f.position[2] - f.target[2]), dy = f.position[1] - f.target[1];   // keep the hand-placed camera's clear sight line
    if (dist < .25 * Math.abs(dy)) { dist = .5 * Math.abs(dy); dy = .7 * Math.abs(dy); }   // a top-down reference: give the preset a real horizontal offset
    return {target: f.target, az: azOf(f.position, f.target), ground: r.ground ?? 0, ref: r.id, base: {dist, dy, fov: f.fov ?? 50}};
  }
  const name = s.place ?? lastPlace; lastPlace = name; const a = places[name];
  const yk = {wide: .55, medium: .6, close: .85, insert: .15}[s.size] ?? .6;
  return {target: [a.at[0], a.at[1] + H * yk, a.at[2]], az: azOf(a.camera.position, a.at), ground: a.at[1], ref: name};
}

// consecutive shots inside one reference shot: alternate the azimuth ±30° and scale the distance by size, so no two neighbours share a
// composition (a jump cut)
let prevRef = null, rep = 0;
const SIZE_DIST = {close: .6, medium: 1, wide: 1.4, insert: .5};
let shots = plan.shots.map((s, n) => {
  const A = aim(s);
  if (A.base) { rep = A.ref === prevRef ? rep + 1 : 0; prevRef = A.ref;
    if (rep) { A.az += (rep % 2 ? 30 : -30) * Math.ceil(rep / 2); A.base = {...A.base, dist: A.base.dist * (SIZE_DIST[s.size] ?? 1), dy: A.base.dy * (SIZE_DIST[s.size] ?? 1)}; } }
  const cam = preset(s.preset, {target: A.target, az: A.az, ground: A.ground, dur: s.dur, size: s.size, lens: s.lens, subjectH: H, intensity: 1, base: A.base});
  const id = `S${String(n + 1).padStart(2, '0')}-${s.preset}`;
  return {id, at: s.at, ...cam, see: s.see.length ? s.see : [A.ref], why: s.why, ...(s.hero ? {hero: s.hero} : {}), ...(s.openHit ? {openHit: true, reveal: true} : {}),
    beat: s.beat, intent: s.intent, ...(s.size === 'insert' ? {} : {})};
});
if (has('loop')) shots = loopify(shots);
const ep = {...base, format: 6, end: plan.end, labels: false, sfx: false, shots,
  note: `Retention Engine cut plan (tools/plan_cuts.js) from ${bf ?? 'no beats'}; ${plan.stats.shots} shots, average ${plan.stats.average} s.`};
delete ep.keywords;
mkdirSync(path.dirname(arg('out')), {recursive: true});
writeFileSync(arg('out'), JSON.stringify(ep, null, 1));
const loop = loopScore(shots[0], shots.at(-1));
if (arg('plan-out')) writeFileSync(arg('plan-out'), JSON.stringify({stats: plan.stats, loop, shots: plan.shots}, null, 1));
console.log(JSON.stringify({out: arg('out'), ...plan.stats, end: plan.end, beats: beats.length, stressed: stressed.size, loop}));
