// node scripts/v2/brief2spec.js --story <slug> [--brief f] [--cues f] [--out f]
// Reads stories/<slug>/BRIEF.md (docs/season1/EPISODE_BRIEF.md format) + stories/<slug>/cues.json and writes stories/<slug>/episode.json
// (format 6, moods: true, body v6, faceStyle v6, acting 6). Every BEATS column maps to a spec field (docs/season1/EPISODE_BRIEF.md); times
// are word-anchored in cues.json. Any unknown value is an error naming the row; locations / props missing from the set library are listed, never invented.
// Pure parts (parseBrief, briefToSpec) are exported for tests; exit 1 on any error.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {MOVES, fitDistance, fitSpan} from '../../engine/camera.js';
import {MOOD_NAMES, MOODS} from '../../engine/mood6.js';
import {VERB_NAMES} from '../../engine/acting6.js';
import {faceError6} from '../../avatar-style/faces6.js';
import {cueWords} from '../../engine/plancheck6.js';
import {loadLibrary} from './lib6.js';

export const SIZES6 = ['wide', 'medium', 'close', 'insert', 'ecu'], EFFECTS6 = ['impact', 'freeze', 'crash', 'none'], SLOTS = ['LEAD', 'SECOND', 'LITTLE', 'RIVAL', 'ELDER'];
export const COLS = ['#', 'cue', 'vo', 'mood', 'size', 'move', 'subject', 'verb', 'expression', 'effect', 'notes'];
const norm = w => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
const num = x => Number(String(x).replace(',', '.'));

export function parseBrief(md) {
  const sec = {}; let cur = null;
  for (const line of md.split(/\r?\n/)) { const m = /^##\s+(.+?)\s*$/.exec(line); if (m) { cur = m[1].toUpperCase(); sec[cur] = []; } else if (cur) sec[cur].push(line); }
  const kv = name => Object.fromEntries((sec[name] ?? []).map(l => /^-\s*([^:]+?):\s*(.*)$/.exec(l)).filter(Boolean).map(m => [m[1].toLowerCase(), m[2].trim()]));
  const cast = (sec.CAST ?? []).filter(l => /^-\s*[A-Za-z]/.test(l)).map(l => {
    const m = /^-\s*([A-Za-z0-9_]+)(.*)$/.exec(l), slot = /(?:→|->)\s*([A-Z]+)/.exec(m[2])?.[1];
    return {role: m[1], slot: m[1].toUpperCase() === 'HERO' ? 'HERO' : slot ?? null, line: l.trim()};
  });
  const rows = [];
  for (const l of sec.BEATS ?? []) {
    if (!l.trim().startsWith('|')) continue;
    const cells = l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
    if (!/^\d+$/.test(cells[0])) continue;   // header / separator
    rows.push(Object.fromEntries(COLS.map((c, i) => [c, cells[i] ?? ''])));
  }
  return {meta: kv('META'), premise: kv('PREMISE'), world: kv('WORLD'), payoff: kv('PAYOFF SHOT'), cast, rows};
}
function camera(shot, {size, move, mood, fov, pos, subjects, stand, ecu}) {
  const H = 5.3, xs = subjects.map(s => pos[s][0]), zs = subjects.map(s => pos[s][2]), cx = xs.reduce((a, b) => a + b, 0) / xs.length, cz = zs.reduce((a, b) => a + b, 0) / zs.length;
  const part = size === 'close' || ecu ? 'head' : 'full', frac = ecu ? .8 : { wide: .26, medium: .6, close: .5, insert: .35 }[size];
  let d = fitDistance(fitSpan(part, H).hi - fitSpan(part, H).lo, frac, fov);
  if (subjects.length > 1) { const w = Math.abs(Math.max(...xs) - Math.min(...xs)) + 2.4, hf = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * 9 / 16); d = Math.max(d, w / (2 * Math.tan(hf / 2))); }
  const ty = move === 'crashZoom' ? 3 : part === 'head' ? 4.6 : 2.7, tgt = [cx, ty, cz], yaw = stand * 18 * Math.PI / 180, dir = [Math.sin(yaw), .1, Math.cos(yaw)], at = k => [tgt[0] + dir[0] * d * k, tgt[1] + dir[1] * d * k + (k === 1 ? 0 : 0), tgt[2] + dir[2] * d * k];
  const from = {position: at(1), target: tgt, fov}, out = {from};
  const to = (k, o = {}) => ({position: at(k), target: tgt, fov, ...o});
  switch (move) {
    case 'push': case 'lowAuthority': out.to = to(1 - (MOODS[mood]?.push ? (MOODS[mood].push[0] + MOODS[mood].push[1]) / 2 : .055)); if (move === 'lowAuthority') { from.position[1] = .7; out.to.position[1] = .7; from.fov = out.to.fov = Math.min(Math.max(fov, 28), 40); } break;
    case 'pull': out.to = to(1.06); break;
    case 'static-drift': break;
    case 'orbit': out.degrees = 6; out.to = to(.97); break;
    case 'crane': out.to = {...to(1), position: [...at(1).slice(0, 1), at(1)[1] + 2.5, at(1)[2]]}; break;
    case 'whip': out.to = {position: from.position, target: [tgt[0] + .6, tgt[1], tgt[2]], fov}; break;
    case 'snap': { const wide = fitDistance(fitSpan('full', H).hi, .26, fov), close = fitDistance(fitSpan('head', H).hi - fitSpan('head', H).lo, .5, fov), p = k => [tgt[0] + dir[0] * k, tgt[1] + dir[1] * k, tgt[2] + dir[2] * k]; out.from = {position: p(wide), target: tgt, fov}; out.to = {position: p(close), target: tgt, fov}; out.snapAt = shot.snapAt ?? .6; break; }
    case 'crashZoom': out.to = {...to(1), fov: fov * .85}; break;
    case 'tiltUp': out.from = {...from, target: [cx, .6, cz]}; out.to = {...from, target: [cx, 6.5, cz]}; break;
    case 'heroLow': out.ground = 0; out.from = {...from, position: [from.position[0], .9, from.position[2]], fov: Math.min(Math.max(fov, 60), 70)}; out.to = {...out.from, position: [out.from.position[0], .9, out.from.position[2] - .6]}; break;
    case 'track': out.follow = subjects[0]; out.from = {position: [from.position[0] - pos[subjects[0]][0], from.position[1], from.position[2] - pos[subjects[0]][2]], target: [0, ty, 0], fov}; out.to = {...out.from, position: [out.from.position[0] + .7, ...out.from.position.slice(1)]}; break;
    case 'drone': out.path = [0, 1, 2, 3].map(i => [cx + 26 * Math.sin(i * .5), 14 + i * 2, cz + 26 * Math.cos(i * .5)]); out.targets = [[cx, 3, cz], [cx, 3, cz], [cx, 3, cz], [cx, 3, cz]]; break;
    default: out.follow = subjects[0]; out.heading = 20; out.distance = d; out.height = 3;   // gamecam / scaleReveal / …: the move's own defaults
  }
  return out;
}

export function briefToSpec(brief, cues, lib, {slug} = {}) {
  const errors = [], missing = {locations: [], props: []}, E = (where, msg) => errors.push(`${where}: ${msg}`);
  const words = cueWords(cues), {meta, world, rows} = brief;
  if (meta.slug && slug && meta.slug !== slug) E('META', `slug "${meta.slug}" ≠ story folder "${slug}"`);
  if (!rows.length) E('BEATS', 'no table rows');
  // WORLD: locations + props against the set library
  const locs = (world.locations ?? '').split(/[,;·]/).map(x => x.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
  for (const l of locs) if (!lib.locations[l]) missing.locations.push(l);
  const props = (world.props ?? '').split(/[,;·]/).map(x => x.trim()).filter(Boolean);
  for (const p of props) if (!lib.props.has(p)) missing.props.push(p);
  const loc0 = locs.find(l => lib.locations[l]), worldMod = world['world module'] ?? lib.locations[loc0]?.world ?? (existsSync(`stories/${slug}/world.js`) ? `stories/${slug}/world.js` : null);
  if (!worldMod) E('WORLD', `no world module for ${locs.join(', ') || 'any location'} (add one to parts/library6.json or write stories/${slug}/world.js)`);
  // CAST
  const castKeys = {}, cast = {}, pos = {};
  brief.cast.forEach((c, i) => {
    const key = c.role.toLowerCase(); castKeys[key] = key;
    if (!c.slot || (c.slot !== 'HERO' && !SLOTS.includes(c.slot))) E(`CAST ${c.role}`, `unknown troupe slot "${c.slot ?? ''}" (${SLOTS.join(' | ')})`);
    const x = (i - (brief.cast.length - 1) / 2) * 4, z = c.slot === 'HERO' ? 4 : 0; pos[key] = [x, 0, z];
    cast[key] = {style: 'v5', faceStyle: 'v6', troupe: c.slot, at: loc0 ? (lib.locations[loc0].anchors[0] ?? loc0) : undefined, offset: [x, 0, z], yaw: 0, keys: [[0, 'idle']]};
  });
  if (!cast.hero) E('CAST', 'no HERO line');
  const shots = [], emphasis6 = [], effects = []; let lastAt = -1;
  rows.forEach((r, i) => {
    const R = `row ${r['#']}`, bad = (col, v, ok) => E(`${R} (${col})`, `unknown ${col} "${v}"${ok ? ` (${ok})` : ''}`);
    const m = /^(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)$/.exec(r.cue);
    if (!m) { E(`${R} (cue)`, `"${r.cue}" is not "start–end" seconds`); return; }
    const [c0, c1] = [num(m[1]), num(m[2])];
    if (!(c1 > c0)) { E(`${R} (cue)`, `end ${c1} ≤ start ${c0}`); return; }
    if (!MOOD_NAMES.includes(r.mood)) bad('mood', r.mood, MOOD_NAMES.join(' | '));
    if (!SIZES6.includes(r.size)) bad('size', r.size, SIZES6.join(' | '));
    if (!MOVES.includes(r.move)) bad('move', r.move, 'a name in engine/camera.js MOVES');
    if (!EFFECTS6.includes(r.effect || 'none')) bad('effect', r.effect, EFFECTS6.join(' | '));
    const subs = r.subject.split('+').map(x => x.trim().toLowerCase()).filter(Boolean), propSub = subs[0]?.startsWith('prop:') ? subs[0].slice(5) : null;
    if (propSub) { if (!lib.props.has(propSub)) { if (!missing.props.includes(propSub)) missing.props.push(propSub); } }
    else { if (!subs.length) E(`${R} (subject)`, 'empty'); for (const s of subs) if (!castKeys[s]) bad('subject', s, `CAST: ${Object.keys(castKeys).join(', ')}`); }
    // word-anchored cut time: the nearest word onset (±0.5 s); row 1 starts at 0
    const near = i === 0 ? {start: 0} : words.reduce((b, w) => Math.abs(w.start - c0) < Math.abs(b.start - c0) ? w : b, {start: Infinity});
    if (Math.abs(near.start - c0) > .5) { E(`${R} (cue)`, `start ${c0} s is ${Math.abs(near.start - c0).toFixed(2)} s from the nearest word onset in cues.json`); return; }
    const at = +near.start.toFixed(3); if (at <= lastAt) E(`${R} (cue)`, `starts at ${at} s, not after the previous row (${lastAt} s)`); lastAt = at;
    const win = words.filter(w => w.start >= c0 - .5 && w.start < c1 + .5), localN = (nm, w) => words.filter(x => x.line === w.line && x.n === nm && x.start <= w.start + 1e-6).length;   // acting6 refs: nth is 1-based inside the line
    const find = (wd, col) => { const w = win.find(x => x.n === norm(wd)); if (!w) { E(`${R} (${col})`, `word "${wd}" is not spoken in cues ${c0}–${c1} s`); return null; } return {word: w.w.replace(/[^\w']/g, '').toLowerCase(), nth: localN(w.n, w), line: w.line, t: w.start}; };
    // VO words: *emphasis*
    const em = [...r.vo.matchAll(/\*([^*]+)\*/g)].map(x => x[1].trim()), voFirst = norm(r.vo.replace(/\*/g, '').trim().split(/\s+/)[0] ?? ''), emHits = [];
    for (const w of em) { const f = find(w, 'VO words'); if (f) { emHits.push(f); emphasis6.push({word: w, t: +f.t.toFixed(3), shot: null, row: r['#']}); } }
    const anchorWord = emHits[0] ?? (voFirst ? find(voFirst, 'VO words') : null), actions = [];
    const act = c => anchorWord ? {...c, at: {word: anchorWord.word, nth: anchorWord.nth, line: anchorWord.line}} : {...c, at: 0};
    const actor = propSub ? null : subs[0];
    if (r.verb && r.verb !== '-') { const [who, v] = r.verb.includes(':') ? r.verb.split(':').map(x => x.trim()) : [actor, r.verb];
      if (!VERB_NAMES.includes(v)) bad('action verb', v, VERB_NAMES.join(' | ')); else if (!who || !castKeys[who.toLowerCase()]) bad('action verb actor', who, 'a CAST role'); else actions.push(act({actor: who.toLowerCase(), verb: v})); }
    for (const part of (r.expression || '').split(';').map(x => x.trim()).filter(x => x && x !== '-')) {
      const [face, wd] = part.split('@').map(x => x.trim()), err = faceError6(face);
      if (err) { bad('expression', face, 'a faces v6 / v5 name'); continue; }
      const f = wd ? find(wd, 'expression') : null; if (wd && !f) continue;
      if (!actor) { E(`${R} (expression)`, 'a prop insert has no face'); continue; }
      actions.push({actor, face, at: f ? {word: f.word, nth: f.nth, line: f.line} : 0});
    }
    // effect
    const ef = r.effect || 'none', tLocal = Math.max(0, +((emHits[0]?.t ?? c0 + .4) - at).toFixed(3)); const sh = {id: `S${String(r['#']).padStart(2, '0')}`, at};
    if (ef === 'impact') sh.impact = tLocal; else if (ef === 'freeze') sh.freeze = [tLocal, 4]; else if (ef === 'crash') { sh.impact = tLocal; if (r.move !== 'crashZoom') E(`${R} (effect)`, 'crash needs move crashZoom'); }
    // notes markers
    const notes = [];
    for (const tok of (r.notes || '').split(/[;,]/).map(x => x.trim()).filter(Boolean)) {
      let g;
      if (tok === 'twist') sh.twist = true; else if (tok === 'payoff') sh.payoffMark = true; else if (tok === 'cross') sh.cross = true; else if (tok === 'blur') sh.blur = true;
      else if ((g = /^gag\s+(\d+)$/.exec(tok))) sh.gag = +g[1]; else if (/^gag\b/.test(tok)) E(`${R} (notes)`, `"${tok}" must be "gag 1", "gag 2" or "gag 3"`);
      else if ((g = /^loopOpen\s*:\s*(\S.*)$/.exec(tok))) sh.loopOpen = g[1]; else if ((g = /^loopClose\s*:\s*(\S.*)$/.exec(tok))) sh.loopClose = g[1];
      else if (/^loop(Open|Close)\b/.test(tok)) E(`${R} (notes)`, `"${tok}" must be "loopOpen: name" or "loopClose: name"`);
      else if ((g = /^loc\s*:\s*(\S+)$/.exec(tok))) { if (!lib.locations[g[1]]) { if (!missing.locations.includes(g[1])) missing.locations.push(g[1]); } else sh.loc = g[1]; }
      else notes.push(tok);
    }
    if (sh.payoffMark && r.mood !== 'payoff') E(`${R} (notes)`, 'payoff marker on a shot whose mood is not payoff');
    delete sh.payoffMark; if (sh.gag !== undefined && ![1, 2, 3].includes(sh.gag)) E(`${R} (notes)`, `gag ${sh.gag}: only 1, 2, 3`);
    sh.loc ??= loc0;
    const fov = MOODS[r.mood] ? +((MOODS[r.mood].fov[0] + MOODS[r.mood].fov[1]) / 2).toFixed(1) : 45, ecu = r.size === 'ecu', size = ecu ? 'close' : r.size;
    Object.assign(sh, {mood: r.mood, size, move: r.move, why: `${r.mood}: ${r.verb && r.verb !== '-' ? r.verb : r.vo.replace(/\*/g, '')}`.slice(0, 140), see: propSub ? [] : subs, vo: r.vo.replace(/\*/g, ''), cue: [c0, c1]});
    if (ecu) sh.ecu = true; if (propSub) sh.prop = propSub; else sh.subject = subs[0]; if (subs.length > 1) sh.pair = subs.slice(0, 2); if (actions.length) sh.actions = actions; if (notes.length) sh.note = notes.join('; ');
    if (i === 0) sh.openHit = true;
    if (!errors.some(e => e.startsWith(R)) && !propSub) Object.assign(sh, camera(sh, {size, move: r.move, mood: r.mood, fov, pos, subjects: subs.filter(s => pos[s]), stand: i % 2 ? 1 : -1, ecu}));
    for (const e of emphasis6) if (e.row === r['#']) e.shot = sh.id;
    shots.push(sh);
  });
  const end = +(cues.duration + .85).toFixed(3);
  const spec = {slug, fps: 30, format: 6, moods: true, body: 'v6', faceStyle: 'v6', acting: 6, labels: false, hero: 'hero', world: worldMod, look: 'day', cues: `stories/${slug}/cues.json`, end,
    note: `Written by scripts/v2/brief2spec.js from stories/${slug}/BRIEF.md (${shots.length} shots). Edit the Brief, not this file.`,
    brief: {title: meta.title, ruleLine: brief.premise['rule line'], palette: world.palette, colourScript: world['colour script'], setting: world.setting, props, payoff: brief.payoff},
    cast, emphasis6: emphasis6.map(({row, ...e}) => e), effects, shots};
  return {spec, errors, missing};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; }, slug = arg('story');
  if (!slug) { console.error('usage: brief2spec.js --story <slug> [--brief f] [--cues f] [--out f]'); process.exit(2); }
  const brief = parseBrief(readFileSync(arg('brief', `stories/${slug}/BRIEF.md`), 'utf8')), cues = JSON.parse(readFileSync(arg('cues', `stories/${slug}/cues.json`), 'utf8'));
  const {spec, errors, missing} = briefToSpec(brief, cues, loadLibrary('.'), {slug});
  if (missing.locations.length || missing.props.length) { console.error('MISSING from the set library (not invented):'); if (missing.locations.length) console.error('  locations: ' + missing.locations.join(', ')); if (missing.props.length) console.error('  props: ' + missing.props.join(', ')); }
  for (const e of errors) console.error('ERROR ' + e);
  if (errors.length || missing.locations.length || missing.props.length) process.exit(1);
  const out = arg('out', `stories/${slug}/episode.json`); writeFileSync(out, JSON.stringify(spec, null, 1) + '\n');
  console.log(`wrote ${out}: ${spec.shots.length} shots, ${spec.emphasis6.length} emphasis words, end ${spec.end} s`);
}
