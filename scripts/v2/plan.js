// npm run v2:plan -- --story <slug> [--spec <episode.json>] [--cues <cues.json>]   (docs/V2_BRIEF.md §5.2)
// Validates episode.json against cues.json. Measurements come from the real episode page (cameras that follow
// actors, projected heads), the rules from engine/plancheck.js. Prints errors and warnings; exit 1 on any error.
// Also writes review/<slug>/plan.json (the shot table with timings, sizes and the why of each shot).
import {readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {plan5} from '../../engine/plancheck5.js';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {checkPlan} from '../../engine/plancheck.js';
import {checkSeason} from '../../engine/seasoncheck.js';
import {labelIssues} from '../../engine/nolabels.js';
import {layoutShots, MAX_END7} from '../../engine/timeline.js';
import {checkMoods} from '../../engine/plancheck6.js';
import {spawnSync} from 'node:child_process';
import {segmentPlan} from './segments.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const story = arg('story'), specPath = arg('spec') ?? `stories/${story}/episode.json`, cuesPath = arg('cues') ?? `stories/${story}/cues.json`;
if (!story && !arg('spec')) { console.error('usage: plan.js --story <slug> [--spec file] [--cues file]'); process.exit(2); }
const spec = JSON.parse(readFileSync(specPath, 'utf8')), cues = JSON.parse(readFileSync(cuesPath, 'utf8')), fps = spec.fps ?? 30;
const shots = layoutShots(spec);

const server = await startServer(), browser = await launch();
let info = new Array(shots.length), meas = [], insertH = {}, actingPlans = [];
const {segments} = segmentPlan(specPath);   // tuft 4C: spec.locations → one page per location (as render / read); measurements merged back by shot index
try {
  for (const [si, seg] of segments.entries()) {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const idx = shots.map((s, i) => i).filter(i => !seg.shotIds || seg.shotIds.has(shots[i].id)), sub = idx.map(i => shots[i]);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(seg.specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 180000});
  if (errors.length) throw Error(errors.join('; '));
  const part = await page.evaluate(list => list.map(s => { const i = s.i;
    const E = window.__episode, at = f => E.inspectFrame(Math.min(s.start + s.frames - 1, Math.max(s.start, f)));
    const cards = [];   // A3: class cards sampled every 3rd frame
    for (let f = s.start; f < s.start + s.frames; f += 3) { const r = E.inspectFrame(f); if (r.cards.length) cards.push({frame: f, cards: r.cards}); }
    return {speed: E.shotSpeed(i), first: at(s.start), early: at(s.start + 6), mid: at(s.start + Math.floor(s.frames / 2)), last: at(s.start + s.frames - 1), cards};
  }), idx.map(i => ({start: shots[i].start, frames: shots[i].frames, i}))); idx.forEach((i, k) => { info[i] = part[k]; });
  // A4 §E season gates + A5 framing/uiSize: season episodes and v3 worlds (rendered at 360×640, first/middle/last frame)
  const probe = await page.evaluate(() => window.__episode.seasonMeasure(0));
  if (spec.season || probe.v3) { const pm = await page.evaluate(list => list.map(s => [s.start, s.start + Math.floor(s.frames / 2), s.start + s.frames - 1].map(f => window.__episode.seasonMeasure(f, s.objects))),
    sub.map(({start, frames, clueObject}) => ({start, frames, objects: [...(clueObject ? [clueObject] : []), ...(spec.season ? ['clockFace', 'clockFace1', 'clockFace2', 'clockFace3', 'scoreboard'] : [])]}))); idx.forEach((i, k) => { meas[i] = pm[k]; }); }
  // format v5: story-prop inserts measured on the real frame (middle frame, the prop's projected box height)
  if (spec.format >= 5 && spec.format <= 7) Object.assign(insertH, Object.fromEntries(await page.evaluate(list => list.map(s => { const r = window.__episode.readMeasure(s.mid, {subject: null, prop: s.prop}); const b = r.box;
    return [s.id, !(b && b.front) ? {h: 0, margin: 0} : s.p3 ? {h: b.y1 - b.y0, margin: Math.min(b.x0, b.y0, 1 - b.x1, 1 - b.y1)} : Math.min(b.y1, 1) - Math.max(b.y0, 0)]; }), sub.filter(s => s.size === 'insert' && s.prop).map(s => ({id: s.id, prop: s.prop, p3: spec.framing === 'p3', mid: s.start + Math.floor(s.frames / 2)})))));
  if ((spec.format >= 5 && spec.format <= 7) && spec.framing === 'p3') { const fh = await page.evaluate(list => list.map(s => { const r = window.__episode.readMeasure(s.mid, {subject: s.subject}); return [s.id, r.head?.box?.allFront ? r.head.box.h : 0]; }),
    sub.filter(s => s.subject && ['medium', 'close'].includes(s.size) && !s.back && s.move !== 'splitScreen').map(s => ({id: s.id, subject: s.subject, mid: s.start + Math.floor(s.frames / 2)})));
    for (const [id, h] of fh) shots.find(s => s.id === id).faceH = +h.toFixed(3); }   // Toy House final fix (owner P3): people medium/close, face 12–35 %
  if (spec.acting === 6 && si === 0) actingPlans = await page.evaluate(() => window.__episode.actingPlan());   // the partner plan is spec-wide: once
  await page.close();
  }   // P3b: partner meeting marks (engine/acting6.js partnerPlan)
} finally { await browser.close(); await server.close(); }

const hero = spec.hero ?? Object.entries(spec.cast ?? {}).find(([, c]) => c.troupe === 'HERO')?.[0];   // FORMAT_V6 rule 5
const r = checkPlan({shots, cues, fps, end: spec.end, info, format: spec.format, hero, lengthVariant: spec.lengthVariant});
const sz = checkSeason({spec, shots, cues, fps, end: spec.end, info, meas});
r.errors.push(...sz.errors, ...labelIssues(spec));
if (actingPlans.length) { const {partnerIssues} = await import('../../engine/acting6.js'); r.errors.push(...partnerIssues(actingPlans), ...(await import('../../engine/acting6.js')).hugAngleIssues(actingPlans)); }   // P3b owner Decision 3: partners start ≤ 0.5 studs from the mark, or walk in
r.stats.partners = actingPlans.map(p => ({partner: p.partner, verb: p.verb, dist: p.dist, walkIn: p.walk ? p.walk.dur : null, ok: p.ok}));
if (spec.format >= 5 && spec.format <= 7) { const pushOf = Object.fromEntries(shots.map((s, i) => { const d = c => Math.hypot(...c.position.map((v, k) => v - c.target[k])), a = d(info[i].first.camera), b = d(info[i].last.camera); return [s.id, a > 0 ? 1 - b / a : 0]; }));   // P4b: measured slow push (fraction of the camera distance)
  const p5 = plan5(shots, {fps, cues, insertH, end: spec.end, ...(spec.format >= 7 ? {len: [0, MAX_END7[spec.lengthVariant ?? 'short']]} : spec.format >= 6 ? {len: [0, 125]} : {}), ...(spec.moods && spec.format >= 6 ? {moods: true, pushOf} : {})}); r.errors.push(...p5.errors); r.stats.format5 = {lengthS: p5.lengthS, averageShotS: p5.averageShotS, insertH}; }   // format v5 rules   // owner rule §2c: noLabels (Season 1 / labels: false)
let moods = null;   // P4 (opt-in `moods: true`, format 6): mood lengths, dead stretches, emphasis, breath, escalation, 180°, loops, pacing curve
if (spec.moods && spec.format >= 6) { moods = checkMoods({shots, cues, spec, fps, heads: info.map(i => i.mid.heads), means: (() => { try { return JSON.parse(readFileSync(`stories/${story ?? spec.slug}/moodmeans.json`, 'utf8')); } catch { return null; } })()});; /* P5b: per-shot mean colour for moodSeparation (stories/<slug>/moodmeans.json, optional) */ r.errors.push(...moods.errors); r.warnings.push(...moods.warnings); }
r.warnings.push(...sz.warnings); r.stats.season = !!spec.season; r.stats.framing = sz.stats.framing; r.stats.uiItems = sz.stats.ui; r.stats.eggs = sz.stats.eggs; r.stats.overlaps = sz.stats.overlaps; r.stats.crowdCover = sz.stats.cover; r.stats.clockBoard = sz.stats.clockBoard;
const table = shots.map((s, i) => ({id: s.id, beat: !!s.beat, t: +(s.start / fps).toFixed(2), dur: +(s.frames / fps).toFixed(2), size: s.size, move: s.move, loc: s.loc, speed: +(info[i].speed * 100).toFixed(0),
  subject: s.subject ? `${s.subject}@${(info[i].mid.heads[s.subject]?.x * 100).toFixed(0)},${(info[i].mid.heads[s.subject]?.y * 100).toFixed(0)}` : '', why: s.why}));
console.table(table.map(({why, ...x}) => x));
for (const w of r.warnings) console.log('WARN ', w);
for (const e of r.errors) console.log('ERROR', e);
const slug = story ?? spec.slug;
await mkdir(`review/${slug}`, {recursive: true});
if (moods) {
  for (const [k, c] of Object.entries(moods.checks)) console.log(`${c.level.padEnd(4)} ${k}. ${c.name}${c.items.map(x => '\n       ' + x).join('')}`);
  console.log('\ncuts per 10 s (pacing curve)\n' + moods.pacing.ascii);
  await writeFile(`review/${slug}/pacing.json`, JSON.stringify({title: `${slug}: cuts per 10 s`, bins: moods.pacing.bins}, null, 1));
  spawnSync('python3', ['scripts/v2/pacing.py', `review/${slug}/pacing.json`, `review/${slug}/pacing.png`], {stdio: 'inherit'});
  r.stats.moods = Object.fromEntries(Object.entries(moods.checks).map(([k, c]) => [k, c.level]));
}
await writeFile(`review/${slug}/plan.json`, JSON.stringify({spec: specPath, cues: cuesPath, ...r.stats, errors: r.errors, warnings: r.warnings, shots: table}, null, 1));
console.log(JSON.stringify({...r.stats, errors: r.errors.length, warnings: r.warnings.length, result: r.errors.length ? 'FAIL' : 'PASS'}));
process.exitCode = r.errors.length ? 1 : 0;
