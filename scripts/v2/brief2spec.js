// node scripts/v2/brief2spec.js --story <slug> [--brief f] [--cues f] [--out f]
// Reads stories/<slug>/BRIEF.md (docs/season1/EPISODE_BRIEF.md format) + stories/<slug>/cues.json and writes stories/<slug>/episode.json
// (format 6, moods: true, body v6, faceStyle v6, acting 6). Every BEATS column maps to a spec field (docs/season1/EPISODE_BRIEF.md); times
// are word-anchored in cues.json. Any unknown value is an error naming the row; locations / props missing from the set library are listed, never invented.
// Pure parts (parseBrief, briefToSpec) are exported for tests; exit 1 on any error.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {MOVES, fitDistance, fitSpan} from '../../engine/camera.js';
import {MOOD_NAMES, MOODS} from '../../engine/mood6.js';
import {VERB_NAMES, CYCLES, pickVerb, partnerOffset} from '../../engine/acting6.js';
import {faceError6} from '../../avatar-style/faces6.js';
import {cueWords} from '../../engine/plancheck6.js';
import {loadLibrary} from './lib6.js';
import {LOOKS} from '../../engine/look.js';
import * as S6 from '../../engine/story6.js';
import {parseTpl} from '../../engine/camtpl.js';

export const SIZES6 = ['wide', 'medium', 'close', 'insert', 'ecu'], EFFECTS6 = ['impact', 'freeze', 'crash', 'none'], SLOTS = ['LEAD', 'SECOND', 'LITTLE', 'RIVAL', 'ELDER', 'DUMMY', 'ADULT_F', 'DOG'];   // E4: ADULT_F (mom) and DOG (a creature entry)
const FACE_ALIAS = {awe_small: 'o_small'};
const SLOT_SCALE = {LITTLE: .62, LEAD: .82, SECOND: .82, RIVAL: .95};   // E2: partner scale picks the carry (cast/troupe6.json)   // Brief vocabulary → faces6 name (the small round-mouth wonder face)
const PROP_H = {streetLamp: 5.2, crate: 1.2, porch: 3.5, shack: 5, deadTree: 6, birdhouse: 1.5, powerLine: 9};   // library prop heights (insert camera fit)
export const FLAG_KEYS = ['format', 'season', 'acting', 'rig', 'twos', 'post', 'camera', 'grade', 'faceLife', 'beastPlace'];   // 4C-2: beastPlace (beasts honour later place: marks)   // SPEC FLAGS keys (+ `night look <name>`)
export const P2B = ['spider', 'toaster', 'spaghettiPlates', 'giantCage', 'chains', 'lanternSea'];   // engine/powersrt.js props2b kinds
const P2B_H = {spider: .25, toaster: 1, spaghettiPlates: .5, chains: 6, dinnerTable: 3.4};   // insert camera fit heights (giantCage / lanternSea / locations use the location view)
const NIGHTS = ['night', 'nightBright', 'storm', 'fireNight', 'moonlit'], LOOKS_IN = [...LOOKS, 'moonlit', 'dusk', 'dawn'];
const LANTERNS = {n: 600, streams: {src: [[0, 1, 10, 18], [-30, 13, -5, 5], [-21, 13, -24, 5], [0, 13, -24, 5], [21, 13, -24, 5], [30, 13, -5, 5], [-52, 11, 30, 7], [52, 11, 30, 7]], yMax: 34, rise: .9, wind: [.3, 0, -.15], seed: 5, keepClear: {top: 1 / 3}}};   // = scripts/v2/village-fixtures.js LANTERNS
export const COLS = ['#', 'cue', 'vo', 'mood', 'size', 'move', 'subject', 'verb', 'expression', 'effect', 'notes'];
const norm = w => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
const num = x => Number(String(x).replace(',', '.'));

export function parseBrief(md) {
  const sec = {}; let cur = null;
  for (const line of md.split(/\r?\n/)) { const m = /^##\s+(.+?)\s*$/.exec(line); if (m) { cur = m[1].toUpperCase(); sec[cur] = []; } else if (cur) sec[cur].push(line); }
  const kv = name => Object.fromEntries((sec[name] ?? []).map(l => /^-\s*([^:]+?):\s*(.*)$/.exec(l)).filter(Boolean).map(m => [m[1].toLowerCase(), m[2].trim()]));
  const cast = (sec.CAST ?? []).filter(l => /^-\s*[A-Za-z]/.test(l)).map(l => {
    const m = /^-\s*([A-Za-z0-9_]+)(.*)$/.exec(l), slot = /(?:→|->)\s*([A-Z_]+)/.exec(m[2])?.[1];
    const xz = /\bat\s+(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/.exec(m[2]), yw = /\byaw\s+(-?\d+(?:\.\d+)?)/.exec(m[2]);   // optional start mark: `at x z`, `yaw deg`
    const cos = /\bcostume\s+([A-Z_]+)/.exec(m[2])?.[1] ?? null;   // E2: `costume BITSY` (cast/troupe6.json costumes)
    const bst = /\bbeast\s+([A-Z][A-Z0-9_]*)(?:\s+(hero|low))?/.exec(m[2]);   // tuft 2A: `- nightfang: beast NIGHTFANG [low]` (beasts/*.json)
    return {role: m[1], slot: m[1].toUpperCase() === 'HERO' ? 'HERO' : slot ?? null, line: l.trim(), at: xz ? [+xz[1], +xz[2]] : null, yaw: yw ? +yw[1] : 0, costume: cos, ...(bst ? {beast: bst[1], tier: bst[2] ?? 'hero'} : {})};
  });
  const rows = [];
  for (const l of sec.BEATS ?? []) {
    if (!l.trim().startsWith('|')) continue;
    const cells = l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
    if (!/^\d+$/.test(cells[0])) continue;   // header / separator
    rows.push(Object.fromEntries(COLS.map((c, i) => [c, cells[i] ?? ''])));
  }
  const fl = /^SPEC FLAGS[^:\n]*:\s*(.*)$/mi.exec(md)?.[1] ?? '', flags = {}, flagErrors = [];   // 4A: the Brief's SPEC FLAGS line → spec fields
  for (const m of fl.matchAll(/`([^`]+)`/g)) { const g = /^(\w+)\s*:\s*(.+?)\s*$/.exec(m[1]); if (!g) continue; const v = g[2].replace(/^'(.*)'$|^"(.*)"$/, '$1$2');
    if (!FLAG_KEYS.includes(g[1])) flagErrors.push(`SPEC FLAGS: unknown flag "${g[1]}" (${FLAG_KEYS.join(' | ')})`); else flags[g[1]] = v === 'true' ? true : v === 'false' ? false : /^-?\d+(\.\d+)?$/.test(v) ? +v : v; }
  const nl = /night look\s+`(\w+)`/i.exec(fl); if (nl) flags.nightLook = nl[1];
  return {meta: kv('META'), premise: kv('PREMISE'), world: kv('WORLD'), payoff: kv('PAYOFF SHOT'), cast, rows, flags, flagErrors};
}
function camera(shot, {size, move, mood, fov, pos, subjects, stand, ecu, aim, aimx = 0, fitF, pushTo, camY = null}) {   // stand = camera yaw off the subject's front (deg), aim = target height override
  const H = 5.3, xs = subjects.map(s => pos[s][0]), zs = subjects.map(s => pos[s][2]), cx = xs.reduce((a, b) => a + b, 0) / xs.length, cz = zs.reduce((a, b) => a + b, 0) / zs.length;
  const part = size === 'close' || ecu ? 'head' : 'full', frac = fitF ?? (ecu ? .8 : { wide: .26, medium: .6, close: .5, insert: .35 }[size]);
  let d = fitDistance(fitSpan(part, H).hi - fitSpan(part, H).lo, frac, fov);
  if (subjects.length > 1) { const w = Math.abs(Math.max(...xs) - Math.min(...xs)) + 2.4, hf = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * 9 / 16); d = Math.max(d, w / (2 * Math.tan(hf / 2))); }
  const ty = aim ?? (move === 'crashZoom' && part === 'full' ? 3 : part === 'head' ? 4.6 : 2.7), tgt = [cx + aimx, ty, cz], yaw = stand * Math.PI / 180, dir = [Math.sin(yaw), .1, Math.cos(yaw)], at = k => [tgt[0] + dir[0] * d * k, tgt[1] + dir[1] * d * k + (k === 1 ? 0 : 0), tgt[2] + dir[2] * d * k];
  const atH = camY === null ? at : k => { const h = Math.sqrt(Math.max(d * d - (ty - camY) ** 2, .25)); return [tgt[0] + Math.sin(yaw) * h * k, camY, tgt[2] + Math.cos(yaw) * h * k]; };   // `camy`: camera at that height, line-of-sight distance d kept
  const from = {position: atH(1), target: tgt, fov}, out = {from};
  const to = (k, o = {}) => ({position: atH(k), target: tgt, fov, ...o});
  switch (move) {
    case 'push': case 'lowAuthority': out.to = to(pushTo ?? 1 - (MOODS[mood]?.push ? (MOODS[mood].push[0] + MOODS[mood].push[1]) / 2 : .055)); if (move === 'lowAuthority') { from.position[1] = .7; out.to.position[1] = .7; from.fov = out.to.fov = Math.min(Math.max(fov, 28), 40); } break;
    case 'pull': out.to = to(1.06); break;
    case 'scaleReveal': out.actor = subjects[0]; out.dir = [0, 1]; break;   // Kit 1 signature camera: the move builds its own path from the actor's mark
    case 'static-drift': break;
    case 'orbit': out.degrees = 6; out.to = to(pushTo ?? .97); break;
    case 'crane': out.to = {...to(1), position: [...at(1).slice(0, 1), at(1)[1] + 2.5, at(1)[2]]}; break;
    case 'whip': out.to = {position: from.position, target: [tgt[0] + .6, tgt[1], tgt[2]], fov}; break;
    case 'snap': { const wide = fitDistance(fitSpan('full', H).hi, .26, fov), close = fitDistance(fitSpan('head', H).hi - fitSpan('head', H).lo, .5, fov), p = k => [tgt[0] + dir[0] * k, tgt[1] + dir[1] * k, tgt[2] + dir[2] * k]; out.from = {position: p(wide), target: tgt, fov}; out.to = {position: p(close), target: tgt, fov}; out.snapAt = shot.snapAt ?? .6; break; }
    case 'crashZoom': out.to = {...to(1), fov: fov * .85}; break;
    case 'tiltUp': out.from = {...from, target: [cx, .6, cz]}; out.to = {...from, target: [cx, 6.5, cz]}; break;
    case 'heroLow': { const hf = Math.min(Math.max(fov, 60), 70),   // the sampler clamps heroLow to fov 60–70: fit the distance at that lens
       dl = fitDistance(fitSpan(part, H).hi - fitSpan(part, H).lo, frac, hf); out.ground = 0; out.from = {position: [tgt[0] + dir[0] * dl, .9, tgt[2] + dir[2] * dl], target: tgt, fov: hf}; out.to = {...out.from, position: [out.from.position[0], .9, out.from.position[2] - .6]}; break; }
    case 'track': out.follow = subjects[0]; out.from = {position: [from.position[0] - pos[subjects[0]][0], from.position[1], from.position[2] - pos[subjects[0]][2]], target: [0, ty, 0], fov}; out.to = {...out.from, position: [out.from.position[0] + .7, ...out.from.position.slice(1)]}; break;
    case 'drone': out.path = [0, 1, 2, 3].map(i => [cx + 26 * Math.sin(i * .5), 14 + i * 2, cz + 26 * Math.cos(i * .5)]); out.targets = [[cx, 3, cz], [cx, 3, cz], [cx, 3, cz], [cx, 3, cz]]; break;
    default: out.follow = subjects[0]; out.heading = 20; out.distance = d; out.height = 3;   // gamecam / scaleReveal / …: the move's own defaults
  }
  return out;
}

const look4Of = (name, e, flags = {}) => NIGHTS.includes(name) ? (flags.nightLook ?? 'moonlit') : name === 'dusk' || name === 'goldenHour' ? (e.lookMap?.dusk ?? 'dusk') : name === 'dawn' ? 'dawn' : (e.lookMap?.day ?? 'comedy');
export function briefToSpec(brief, cues, lib, {slug, root = '.'} = {}) {
  const errors = [], tplLog = [], missing = {locations: [], props: []}, E = (where, msg) => errors.push(`${where}: ${msg}`);
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
  const castKeys = {}, cast = {}, pos = {}, yawOf = {}, props7 = [], worldObjs = new Set();
  const VIL = /parts\/village\//.test(worldMod ?? ''), flags = brief.flags ?? {};
  for (const m of brief.flagErrors ?? []) errors.push(m);
  const orgOf = L => { try { return JSON.parse(readFileSync(`${root}/parts/library6.json`, 'utf8')).locations?.[L]?.origin ?? [0, 0, 0]; } catch { return [0, 0, 0]; } };
  // 4A: per LOCATION data (village worlds: the location file's world anchors, `street` as the common mark anchor and origin)
  const info = L => { const e = lib.locations[L] ?? {}, wa = VIL && !!e.anchorNames?.includes('street'); return {e, at: wa ? 'street' : (e.anchors?.[0] ?? L), org: wa ? e.origin : orgOf(L), anchors: new Set([...(e.anchors ?? []), ...(wa ? e.anchorNames : [])])}; };
  const atOf = L => L ? info(L).at : undefined;
  let {org, anchors: anchorsOf} = info(loc0), curLoc = loc0, curLook = 'day';   // the CURRENT shot's location (inherited from the previous shot unless `loc:`)   // the location anchor's world position (library6.json `origin`): cameras and props are world coordinates, marks stay anchor-relative
  brief.cast.forEach((c, i) => {
    const key = c.role.toLowerCase(); castKeys[key] = key;
    if (c.beast) { if (!existsSync(`${root}/beasts/${c.beast}.json`)) E(`CAST ${c.role}`, `unknown beast preset "${c.beast}" (beasts/*.json)`); const x = c.at ? c.at[0] : (i - (brief.cast.length - 1) / 2) * 4, z = c.at ? c.at[1] : 0; pos[key] = [x, 0, z]; yawOf[key] = c.yaw;
      cast[key] = {style: 'beast', preset: c.beast, tier: c.tier, at: atOf(loc0), offset: [x, 0, z], yaw: c.yaw}; return; }   // tuft 2A
    if (!c.slot || (c.slot !== 'HERO' && !SLOTS.includes(c.slot))) E(`CAST ${c.role}`, `unknown troupe slot "${c.slot ?? ''}" (${SLOTS.join(' | ')})`);
    const x = c.at ? c.at[0] : (i - (brief.cast.length - 1) / 2) * 4, z = c.at ? c.at[1] : c.slot === 'HERO' ? 4 : 0; pos[key] = [x, 0, z]; yawOf[key] = c.yaw;
    if (c.slot === 'DOG') { cast[key] = {style: 'dog', at: atOf(loc0), offset: [x, 0, z], yaw: c.yaw, keys: [[0, 'idle']]}; return; }   // E4: `- dog → DOG`
    cast[key] = {style: 'v5', faceStyle: 'v6', troupe: c.slot, at: atOf(loc0), offset: [x, 0, z], yaw: c.yaw, keys: [[0, 'idle']], ...(c.costume ? {costume: c.costume} : {})};
  });
  if (!cast.hero) E('CAST', 'no HERO line');
  const cur = Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, [...v]])), yawNow = {...yawOf};   // where every actor stands after the rows so far (cameras frame the actor where it is)
  const shots = [], emphasis6 = [], effects = []; let lastAt = -1;
  const clearSizes = (meta.clear ?? '').replace(/\(.*?\)/g, '').split(/[\s,;]+/).filter(Boolean); for (const z of clearSizes) if (!SIZES6.includes(z)) E('META', `clear: unknown size "${z}" (${SIZES6.join(' | ')})`);   // E3b D1
  let crowdArea = null; const crowdAvoid = [];
  const cues2b = [];   // tuft 2B: sfx cues written by markers (spec.sfxCues)
  const p2b = [], locFirstLook = {}, cageRows = [];   // 4A: spec.props2b entries (engine/powersrt.js) {id, kind, at, from, until, loc}; the first look of every location (its baked light)
  const ensure2b = (kind, loc, from, until) => {   // one entry per kind + location + run of rows; position defaults are data (hero mark / stage / table anchors)
    const hit = p2b.find(q => q.kind === kind && q.loc === loc && q.until >= from - .3); if (hit) { hit.until = +Math.max(hit.until, until).toFixed(3); hit.from = +Math.min(hit.from, from).toFixed(3); return hit; }
    const L = info(loc), st = L.e.stage ?? [0, 1.6, -21], tb = L.e.table ?? [-2, 0, 2.5], hp = cur.hero ?? [0, 0, 0], hx = hp[0] + L.org[0], hz = hp[2] + L.org[2];
    const base = {spider: {at: [hx, 4, hz + .8]}, toaster: {at: [tb[0] + 2, 3.2, tb[2]], yaw: -20}, spaghettiPlates: {at: [tb[0], 3.2, tb[2]], scale: .9}, giantCage: {at: [st[0], st[1], st[2] - 3], scale: .3},
      chains: {at: [st[0], st[1] + 4.2, st[2]], n: 6}, lanternSea: {at: [0, 0, -10], ...LANTERNS}}[kind];
    const e = {id: kind + (p2b.filter(q => q.kind === kind).length || ''), kind, ...base, from: +from.toFixed(3), until: +until.toFixed(3), loc}; p2b.push(e); return e; };
  const st6 = {drains: [], blooms: [], crowd: null, hand: [], tumbles: [], airCatch: [], splashes: [], tags: [], spawns: [], sits: [], rises: [], lies: []};   // E2 story markers
  rows.forEach((r, i) => {
    const R = `row ${r['#']}`, bad = (col, v, ok) => E(`${R} (${col})`, `unknown ${col} "${v}"${ok ? ` (${ok})` : ''}`);
    const m = /^(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)$/.exec(r.cue);
    if (!m) { E(`${R} (cue)`, `"${r.cue}" is not "start–end" seconds`); return; }
    const [c0, c1] = [num(m[1]), num(m[2])];
    if (!(c1 > c0)) { E(`${R} (cue)`, `end ${c1} ≤ start ${c0}`); return; }
    if (!MOOD_NAMES.includes(r.mood)) bad('mood', r.mood, MOOD_NAMES.join(' | '));
    if (!SIZES6.includes(r.size)) bad('size', r.size, SIZES6.join(' | '));
    if (!MOVES.includes(r.move)) bad('move', r.move, 'a name in engine/camera.js MOVES');
    for (const e of (r.effect || 'none').split('+')) if (!EFFECTS6.includes(e.trim())) bad('effect', r.effect, EFFECTS6.join(' | ') + '; combine with +, e.g. crash+freeze');
    const lt = /(?:^|;)\s*loc\s*:\s*(\S+?)\s*(?:;|$)/.exec(r.notes ?? '')?.[1], subj0 = /^prop:(\w+)$/.exec(r.subject.split('+')[0].trim())?.[1];
    if (lt && lib.locations[lt]) curLoc = lt; else if (subj0 && lib.locations[subj0] && !P2B.includes(subj0) && info(subj0).e.file) curLoc = subj0;   // `prop:<location>` = that location's establishing view
    if (lt && lib.locations[lt] || subj0 && curLoc === subj0) curLook = 'day';
    ({org, anchors: anchorsOf} = info(curLoc));
    const LI = info(curLoc), named = !!subj0 && (P2B.includes(subj0) || (curLoc === subj0 && !!LI.e.file) || (subj0 === 'dinnerTable' && !!LI.e.table));   // 4A: props2b kinds / locations / the dining table are not insert copies
    const subs = r.subject.split('+').map(x => x.trim()).filter(Boolean).map(x => x.startsWith('prop:') ? x : x.toLowerCase()), propSub = subs[0]?.startsWith('prop:') ? subs[0].slice(5) : null;   // prop names keep their case
    const wobj = !!propSub && (lib.locations[curLoc]?.worldObjects ?? []).includes(propSub);   // E3 (opt-in by data): an object the world builds itself (library6 `worldObjects`) — the subject resolves to it, no insert copy, camera from `cam:`
    if (propSub) { if (!lib.props.has(propSub) && !named) { if (!missing.props.includes(propSub)) missing.props.push(propSub); } }
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
    let verbT = null;   // `a; b`: the i-th verb lands on the i-th emphasised word (partner verbs hug / carry / comfort_kneel take the other subject as target)
    if (r.verb && r.verb !== '-') for (const [vi, one0] of r.verb.split(';').map(x => x.trim()).filter(Boolean).entries()) { const [one, vw] = one0.split('@').map(x => x.trim());   // E3: `verb @ word` lands that key on the word
      const [who, v] = one.includes(':') ? one.split(':').map(x => x.trim()) : [actor, one], hit = vw ? find(vw, 'action verb') : emHits[vi] ?? anchorWord; if (vw && !hit) continue;
      if (!VERB_NAMES.includes(v)) bad('action verb', v, VERB_NAMES.join(' | ')); else if (!who || !castKeys[who.toLowerCase()]) bad('action verb actor', who, 'a CAST role');
      else { const tg = ['hug', 'carry', 'comfort_kneel'].includes(v) ? subs.find(x => x !== who.toLowerCase()) : null; actions.push({actor: who.toLowerCase(), verb: v, ...(tg ? {target: tg} : {}), at: hit ? {word: hit.word, nth: hit.nth, line: hit.line} : 0}); if (vi === 0) verbT = hit?.t ?? c0; } }
    for (const part of (r.expression || '').split(';').map(x => x.trim()).filter(x => x && x !== '-')) {
      const [face0, wd] = part.split('@').map(x => x.trim()), face = FACE_ALIAS[face0] ?? face0, err = faceError6(face);
      if (err) { bad('expression', face, 'a faces v6 / v5 name'); continue; }
      const f = wd ? find(wd, 'expression') : null; if (wd && !f) continue;
      if (!actor) { E(`${R} (expression)`, 'a prop insert has no face'); continue; }
      actions.push({actor, face, at: f ? {word: f.word, nth: f.nth, line: f.line} : 0});
    }
    // effect
    const ef = r.effect || 'none', tLocal = Math.max(0, +((emHits[0]?.t ?? c0 + .4) - at).toFixed(3)); const sh = {id: `S${String(r['#']).padStart(2, '0')}`, at};
    for (const e of ef.split('+').map(x => x.trim())) if (e === 'impact') sh.impact = tLocal; else if (e === 'freeze') sh.freeze = [tLocal, 4]; else if (e === 'crash') { sh.impact = tLocal; sh.zoomAt = Math.max(0, +(tLocal - .17).toFixed(3)); /* the 5-frame zoom lands on the impact word */ if (r.move !== 'crashZoom') E(`${R} (effect)`, 'crash needs move crashZoom'); }
    // notes markers
    const notes = [], places = []; let cyc = null, propScale = 1, propAt = [0, 0, 0], standDeg = null, aimY = null, aimX = 0, fitF = null, pushK = .93, pushNote = null, camY = null, fovNote = null, holdS = null, freezeF = null, drift = null, tiltDeg = null, tplNote = null;
    const s6m = []; let camNote = null, camB = null;
    for (const tok of (r.notes || '').split(/[;,]/).map(x => x.trim()).filter(Boolean)) {
      let g; const mk = S6.markerOf(tok); if (mk) { s6m.push(mk); continue; }   // E2 story markers (engine/story6.js)
      if ((g = /^cam(b?)\s*:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+at\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/.exec(tok))) { const c = {position: [+g[2], +g[3], +g[4]], target: [+g[5], +g[6], +g[7]]}; if (g[1]) camB = c; else camNote = c; continue; }   // E2: explicit world camera (camb: the split screen's second half)
      if ((g = /^keep\s*:\s*([\w ]+)$/.exec(tok))) { sh.keep = g[1].trim().split(/\s+/).map(x => x.toLowerCase()); continue; }   // E3b D1: dummies `clear` never hides in this shot (a staged non-subject)
      if (tok === 'clear') { sh.clear = true; continue; } if (/^clear\s*:\s*off$/.test(tok)) { sh.clear = false; continue; }   // E3b D1: clean the foreground (engine/clear6.js); META `clear:` sets the default per size
      if (tok === 'twist') sh.twist = true; else if (tok === 'payoff') sh.payoffMark = true; else if (tok === 'cross') sh.cross = true; else if (tok === 'blur') sh.blur = true;
      else if ((g = /^gag\s+(\d+)$/.exec(tok))) sh.gag = +g[1]; else if (/^gag\b/.test(tok)) E(`${R} (notes)`, `"${tok}" must be "gag 1", "gag 2" or "gag 3"`);
      else if ((g = /^loopOpen\s*:\s*(\S.*)$/.exec(tok))) sh.loopOpen = g[1]; else if ((g = /^loopClose\s*:\s*(\S.*)$/.exec(tok))) sh.loopClose = g[1];
      else if (/^loop(Open|Close)\b/.test(tok)) E(`${R} (notes)`, `"${tok}" must be "loopOpen: name" or "loopClose: name"`);
      else if ((g = /^place\s*:\s*(\S+)\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s+(-?[\d.]+))?(?:\s+yaw\s+(-?[\d.]+))?$/.exec(tok))) places.push({who: g[1], x: +g[2], z: +g[3], y: g[4] === undefined ? 0 : +g[4], yaw: g[5] === undefined ? null : +g[5]});   // place: role x z [y] [yaw d] (hard mark at the cut; tuft 4C: y = height above the ground, e.g. in an attic window) · place: <prop> x z [y]
      else if ((g = /^cycle\s*:\s*(\w+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/.exec(tok))) { if (!CYCLES[g[1]]) bad('notes', tok, 'cycle: ' + Object.keys(CYCLES).join(' | ') + ' dirX dirZ'); else cyc = {name: g[1], dir: [+g[2], +g[3]]}; }   // the subject travels at the cycle's speed until its first verb
      else if ((g = /^scale\s*:\s*([\d.]+)$/.exec(tok))) propScale = +g[1];
      else if ((g = /^stand\s*:\s*(-?[\d.]+)$/.exec(tok))) standDeg = +g[1];   // camera yaw off the subject's front, degrees (default ±18, alternating)
      else if ((g = /^look\s*:\s*(\w+)$/.exec(tok))) { if (!LOOKS_IN.includes(g[1])) bad('notes', tok, 'look: ' + LOOKS_IN.join(' | ')); else curLook = sh.look = g[1]; }   // per-shot light preset (engine/look.js); default the episode look 'day'
      else if ((g = /^light\s*:\s*((?:\w+\s+-?[\d.]+\s*)+)$/.exec(tok))) { sh.light = {...(sh.light ?? {}), ...Object.fromEntries([...g[1].matchAll(/(\w+)\s+(-?[\d.]+)/g)].map(m => [m[1], +m[2]]))}; }   // per-shot mood light override: light: skyEV .5 fillK 600 (names of engine/mood6.js DEFAULT_LIGHT)
      else if (tok === 'still') { sh.still = true; sh.light = {...(sh.light ?? {}), camNoise: 0}; }   // ambient motion off (moods only): no idle life, blink, camera noise
      else if ((g = /^punch\s*(?::\s*([\d.]+)|@\s*(\S+))$/.exec(tok))) { const w = g[2] ? find(g[2], 'notes') : null; if (!g[2] || w) (sh.punch ??= []).push(+(g[2] ? w.t - at : +g[1]).toFixed(3)); }   // E3: camera punch-in (engine/camera.js PUNCH) on a word or s after the cut
      else if ((g = /^hold\s*:\s*([\d.]+)$/.exec(tok))) holdS = +g[1];   // the first verb holds its fall / key pose this long (s)
      else if ((g = /^freeze\s*:\s*(\d+)$/.exec(tok))) freezeF = +g[1];   // freeze length in frames (default 4)
      else if ((g = /^drift\s*:\s*(-?[\d.]+)\s+(-?[\d.]+)$/.exec(tok))) drift = [+g[1], +g[2]];
      else if ((g = /^tilt\s*:\s*([\d.]+)$/.exec(tok))) tiltDeg = +g[1];   // prop insert: the camera looks up this many degrees
      else if ((g = /^camy\s*:\s*(-?[\d.]+)$/.exec(tok))) camY = +g[1];   // camera height (push / static shots)
      else if ((g = /^fov\s*:\s*([\d.]+)$/.exec(tok))) fovNote = +g[1];   // lens (deg) instead of the mood's mid fov
      else if ((g = /^push\s*:\s*([\d.]+)$/.exec(tok))) pushK = pushNote = +g[1];   // insert on a prop: the camera ends at this fraction of its start distance (default .93)
      else if ((g = /^fit\s*:\s*([\d.]+)$/.exec(tok))) fitF = +g[1];   // frame fraction the subject fills (default by size)
      else if ((g = /^aimx\s*:\s*(-?[\d.]+)$/.exec(tok))) aimX = +g[1];   // camera target shifted along x (a fall that travels)
      else if ((g = /^aim\s*:\s*(-?[\d.]+)$/.exec(tok))) aimY = +g[1];   // camera target height
      else if ((g = /^key\s*:\s*(-?[\d.]+)\s+(-?[\d.]+)$/.exec(tok))) sh.key = {el: +g[1], offset: +g[2]};   // E3b D4: key light from the camera side (engine/lod.js keyPreset: sun elevation, azimuth offset)
      else if ((g = /^crowdAvoid\s*:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/.exec(tok))) crowdAvoid.push({x0: +g[1], x1: +g[2], z0: +g[3], z1: +g[4]});   // E3b: a box the wandering crowd keeps clear of (world)
      else if ((g = /^crowdArea\s*:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/.exec(tok))) crowdArea = {x0: +g[1], x1: +g[2], z0: +g[3], z1: +g[4]};   // E3b: the crowd's wander box (world x0 x1 z0 z1; default the whole plaza)
      else if ((g = /^tpl\s*:\s*(\S.*)$/.exec(tok))) { try { tplNote = parseTpl(g[1]); } catch (e) { E(`${R} (notes)`, e.message); } }   // tuft 4C: camera template (engine/camtpl.js)
      else if ((g = /^loc\s*:\s*(\S+)$/.exec(tok))) { if (!lib.locations[g[1]]) { if (!missing.locations.includes(g[1])) missing.locations.push(g[1]); } else sh.loc = g[1]; }
      else notes.push(tok);
    }
    if (freezeF && sh.freeze) sh.freeze[1] = freezeF; if (holdS) { const v0 = actions.find(a => a.verb); if (v0) v0.hold = holdS; for (const a of actions) if (a !== v0 && ['trip_fall', 'knees_collapse', 'slip'].includes(a.verb)) a.hold = holdS; }   // E3: every fall verb in the row holds (a shared flop)
    if (tplNote) {   // tuft 4C: a template row never uses hand coordinates for the camera: cam: / camb: / fov: dropped (logged); place: stays actor blocking only
      const drop = [camNote && 'cam:', camB && 'camb:', fovNote !== null && 'fov:'].filter(Boolean); if (drop.length) tplLog.push(`${R}: tpl ${tplNote.kind} — ignored ${drop.join(' ')}`);
      if (places.length) tplLog.push(`${R}: tpl ${tplNote.kind} — place: kept as actor blocking only (the camera never reads it)`);
      camNote = camB = null; fovNote = null; sh.tpl = tplNote; }
    if (sh.payoffMark && r.mood !== 'payoff') E(`${R} (notes)`, 'payoff marker on a shot whose mood is not payoff');
    delete sh.payoffMark; if (sh.gag !== undefined && ![1, 2, 3].includes(sh.gag)) E(`${R} (notes)`, `gag ${sh.gag}: only 1, 2, 3`);
    sh.loc = curLoc; if (VIL) sh.look = look4Of(curLook, LI.e, flags);   // 4A: the shot's location; village worlds take looks4 names
    // blocking: hard marks at the cut (`place:`), a travel cycle until the first verb (`cycle:`); tracked in `cur` so later cameras frame the actor where it stands
    const putMark = (who, t, o) => (cast[who].marks ??= []).push([+t.toFixed(3), {at: cast[who].at, offset: o.offset, yaw: o.yaw, ...(o.travel ? {travel: o.travel} : {})}]);
    for (const pl of places) {
      if (cast[pl.who.toLowerCase()]) { pl.who = pl.who.toLowerCase(); cur[pl.who] = [pl.x, pl.y, pl.z]; if (pl.yaw !== null) yawNow[pl.who] = pl.yaw; putMark(pl.who, at, {offset: [pl.x, pl.y, pl.z], yaw: yawNow[pl.who]}); }
      else if (lib.props.has(pl.who)) propAt = [pl.x, pl.y, pl.z]; else E(`${R} (notes)`, `place: "${pl.who}" is neither a CAST role nor a library prop`);
    }
    if (cyc && actor && cast[actor]) {
      const cy = CYCLES[cyc.name], u1 = verbT !== null ? Math.max(at + .2, verbT - .25) : c1, n = Math.hypot(...cyc.dir) || 1, d = cyc.dir.map(v => v / n), yaw = Math.atan2(d[0], d[1]) * 180 / Math.PI;
      putMark(actor, at, {offset: [...cur[actor]], yaw, travel: {dir: d, speed: cy.v}});
      cur[actor] = [cur[actor][0] + d[0] * cy.v * (u1 - at), 0, cur[actor][2] + d[1] * cy.v * (u1 - at)]; yawNow[actor] = yaw; putMark(actor, u1, {offset: [...cur[actor]], yaw});
      actions.push({actor, cycle: cyc.name, at: 0, until: +u1.toFixed(3)});
    }
    // E2 story markers → spec.story6 (absolute seconds). `@ word` = that word's onset in the row; no word = the row start + 0.15 s + 0.55 s per earlier unworded marker.
    let unworded = 0;
    for (const {key, value} of s6m) {
      const WORDED = ['drain', 'bloom', 'splash', 'spawn'], [body, wd] = WORDED.includes(key) ? [value, null] : (i2 => i2 < 0 ? [value, null] : [value.slice(0, i2).trim(), value.slice(i2 + 1).trim()])(value.lastIndexOf('@'));
      let P; try { P = S6.MARKERS[key](body, {hero: 'hero'}); } catch (e) { E(`${R} (notes)`, e.message); continue; }
      const word = P.word ?? wd, f = word ? find(word, 'notes') : null; if (word && !f) continue;
      const t = +(f ? f.t : at + .15 + .55 * unworded++).toFixed(3), who = n => { if (!castKeys[n]) { E(`${R} (notes)`, `${key}: "${n}" is not a CAST role`); return false; } return true; }, anc = n => { if (n && !anchorsOf.has(n)) { E(`${R} (notes)`, `${key}: anchor "${n}" is not in ${curLoc} (${[...anchorsOf].join(', ')})`); return false; } return true; };
      if (key === 'beast') { if (who(P.actor) && anc(P.to)) { if (cast[P.actor]?.style !== 'beast') E(`${R} (notes)`, `beast: "${P.actor}" is not a beast (CAST: - ${P.actor}: beast <PRESET>)`); else (sh.beasts ??= []).push({actor: P.actor, state: P.state, at: +(t - at).toFixed(3), ...(P.to ? {to: P.to} : {})}); } continue; }   // tuft 2A → shot.beasts (shot-local s)
      if (key === 'puff') { if (who(P.actor)) { (sh.puffs ??= []).push({actor: P.actor, size: P.size, at: +(t - at).toFixed(3)}); if (P.size === 'deflate') cues2b.push([t, 'squeak']); } continue; }   // tuft 2B → shot.puffs (+ sfx 'squeak' on a deflate)
      if (key === 'power') { if (who(P.actor)) (sh.powers ??= []).push({actor: P.actor, kind: P.kind, at: +(t - at).toFixed(3)}); continue; }   // tuft 2B → shot.powers
      if (key === 'fizzle') { if (who(P.actor)) (sh.fizzles ??= []).push({actor: P.actor, at: +(t - at).toFixed(3)}); continue; }   // tuft 2B → shot.fizzles
      if (key === 'cage' || key === 'chains') { sh[key] = {kind: P.kind, at: +(t - at).toFixed(3)}; cageRows.push({key, loc: curLoc, from: at, until: c1}); continue; }   // tuft 2B → shot.cage / shot.chains
      if (key === 'glow') { if (who(P.actor)) { if (cast[P.actor]?.style !== 'beast') E(`${R} (notes)`, `glow: "${P.actor}" is not a beast`); else (sh.glows ??= []).push({actor: P.actor, level: P.level, at: +(t - at).toFixed(3)}); } continue; }   // tuft 2B → shot.glows
      if (key === 'drain' && who(P.actor)) st6.drains.push({actor: P.actor, region: P.region, t});
      else if (key === 'bloom') { if (P.crowd) st6.blooms.push({crowd: true, t}); else if (who(P.actor)) st6.blooms.push({actor: P.actor, region: P.region, colour: P.colour, t}); }
      else if (key === 'crowd' && anc(P.anchor)) {
        if (!st6.crowd) { const names = Array.from({length: P.n}, (_, k) => 'crowd' + String(k + 1).padStart(3, '0'));
          for (const n of names) cast[n] = {style: 'v5', faceStyle: 'v6', troupe: 'DUMMY', costume: 'CROWD', lod: true, at: cast.hero?.at, offset: [0, 0, 0], yaw: 0, keys: [[0, 'idle']]};
          st6.crowd = {names, seed: 7, startAt: P.behaviour !== 'run' && P.behaviour !== 'pile' ? (P.anchor ?? null) : null, start: [org[0], org[2]], area: {x0: -36, x1: 36, z0: -50, z1: 56}, steps: []}; }
        else if (P.n > st6.crowd.names.length) E(`${R} (notes)`, `crowd: ${P.n} dummies, but the crowd was created with ${st6.crowd.names.length}`);
        st6.crowd.steps.push({t, behaviour: P.behaviour, n: P.n, ...(P.behaviour === 'run' || P.behaviour === 'pile' ? {anchor: P.anchor} : {})}); }
      else if (key === 'hand' && (!P.actor || who(P.actor)) && anc(P.anchor)) st6.hand.push({t, act: P.act, ...(P.actor ? {actor: P.actor} : {}), ...(P.anchor ? {anchor: P.anchor} : {})});
      else if (key === 'tumble' && who(P.actor) && anc(P.anchor)) st6.tumbles.push({actor: P.actor, t, ...(P.anchor ? {anchor: P.anchor} : {})});
      else if (key === 'airCatch' && who(P.hero) && who(P.partner)) { st6.airCatch.push({t, hero: P.hero, partner: P.partner}); actions.push({actor: P.hero, verb: 'carry', target: P.partner, at: +(t - at).toFixed(3)});
        const kp = SLOT_SCALE[cast[P.partner].troupe] ?? 1, vn = pickVerb({verb: 'carry', target: P.partner, partnerScale: kp}), off = partnerOffset(vn, {}), ly = (yawNow[P.hero] ?? 0) * Math.PI / 180, hp = cur[P.hero];   // her ground mark = the carry's meeting mark (plan partnerDistance)
        if (off) { const mk2 = [hp[0] + off.x * Math.cos(ly) + off.z * Math.sin(ly), 0, hp[2] - off.x * Math.sin(ly) + off.z * Math.cos(ly)]; cur[P.partner] = mk2; yawNow[P.partner] = (yawNow[P.hero] ?? 0) + off.yaw; putMark(P.partner, Math.max(at, t - 1.0), {offset: mk2, yaw: yawNow[P.partner]}); } }   // the partner snaps into the P3b carry on the catch frame
      else if (key === 'splash' && anc(P.anchor)) st6.splashes.push({t, anchor: P.anchor});
      else if (key === 'tag') { const ok = (slug === 'lastcolor' && ['14', '29'].includes(String(r['#']))) || String(slug ?? '').startsWith('_');   // owner decision E2b: diegetic in-world game tags in lastcolor shots 14 and 29 only (+ engine test fixtures); no labels anywhere else
        if (!ok) E(`${R} (notes)`, 'tag: name tags are labels (Season 1 no-labels rule); the only exception is episode lastcolor, shots 14 and 29'); else if (who(P.actor)) st6.tags.push({actor: P.actor, text: P.text, t, until: +c1.toFixed(3)}); }
      else if (key === 'spawn' && who(P.actor)) st6.spawns.push({actor: P.actor, t});
      else if (key === 'lie' && who(P.actor)) st6.lies.push({actor: P.actor, side: P.side, t, until: +c1.toFixed(3)});   // E3b
      else if (key === 'rise' && who(P.actor)) st6.rises.push({actor: P.actor, t});   // E3b
      else if (key === 'sitOn' && who(P.partner) && who(P.lead)) st6.sits.push({partner: P.partner, lead: P.lead, side: P.side, t, until: +c1.toFixed(3)});   // E3b
    }
    if (wobj) { worldObjs.add(propSub); if (!camNote) E(`${R} (notes)`, `prop:${propSub} is an object the world builds (no insert copy): it needs a cam: note (world camera)`); }
    if (propSub && !wobj && !named) { const set7 = ['streetLamp', 'crate', 'porch', 'shack', 'deadTree', 'birdhouse', 'powerLine', 'grassBlade', 'rockPeak', 'rockMesa'].includes(propSub);
      let pr = props7.find(p => p.id === propSub); if (!pr) props7.push(pr = {id: propSub, prop: propSub, ...(set7 ? {set: 'props7'} : {}), ...(propSub === 'streetLamp' ? {p: {color: '#ffd9a0', light: false}} : {}), scale: propScale, pos: [[0, [propAt[0] + org[0], propAt[1], propAt[2] + org[2]]]], visible: [[0, false]]});
      if (drift) pr.pos = [[0, pr.pos[0][1]], [+at.toFixed(3), pr.pos[0][1]], [+c1.toFixed(3), [pr.pos[0][1][0] + drift[0], 0, pr.pos[0][1][2] + drift[1]], 'ramp']];   // `drift: dx dz` slides the prop (and its shadow) over its insert
      pr.visible.push([at, true], [+c1.toFixed(3), false]); }   // the prop exists only during its insert
    const fov = fovNote ?? (MOODS[r.mood] ? +((MOODS[r.mood].fov[0] + MOODS[r.mood].fov[1]) / 2).toFixed(1) : 45), ecu = r.size === 'ecu', size = ecu ? 'close' : r.size;
    Object.assign(sh, {mood: r.mood, size, move: r.move, why: `${r.mood}: ${r.verb && r.verb !== '-' ? r.verb : r.vo.replace(/\*/g, '')}`.slice(0, 140), see: propSub ? [propSub] : subs, vo: r.vo.replace(/\*/g, ''), cue: [c0, c1]});
    if (sh.clear === undefined && clearSizes.includes(r.size)) sh.clear = true; if (sh.clear === false) delete sh.clear;   // E3b D1 (opt-in): META `clear: close insert ecu medium`
    if (ecu) sh.ecu = true; if (propSub) { if (named) { if (P2B.includes(propSub)) sh.prop = 'prop2b_' + propSub; } else sh.prop = wobj ? propSub : 'prop_' + propSub; } else sh.subject = subs[0]; if (subs.length > 1) sh.pair = subs.slice(0, 2); if (actions.length) sh.actions = actions; if (notes.length) sh.note = notes.join('; ');
    if (i === 0) sh.openHit = true; if (r.move === 'crashZoom' && aimX) sh.subjectAimOffset = [aimX, 0, 0]; if (r.move === 'crashZoom' && aimY !== null) sh.subjectAimY = aimY;   // the zoom re-aims at the subject: keep the same x shift
    if (!errors.some(e => e.startsWith(R)) && !propSub) Object.assign(sh, camera(sh, {size, move: r.move, mood: r.mood, fov, pos: Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, [v[0] + org[0], v[1] + org[1], v[2] + org[2]]])), subjects: subs.filter(s => cur[s]), stand: standDeg ?? (i % 2 ? 18 : -18), ecu, aim: aimY, aimx: aimX, fitF, pushTo: pushNote ?? undefined, camY}));
    else if (named && !wobj && !errors.some(e => e.startsWith(R))) {   // 4A: props2b / location / table subjects: the entry (or the location view) + the camera
      const fv = Math.min(Math.max(fov, 28), 52), VIEW = LI.e.views?.establish ?? Object.values(LI.e.views ?? {})[0], k2 = P2B.includes(propSub);
      if (k2) ensure2b(propSub, curLoc, at - .05, c1 + .05);
      const e0 = k2 ? p2b.findLast(q => q.kind === propSub && q.loc === curLoc) : null, wide = k2 ? ['giantCage', 'lanternSea'].includes(propSub) : propSub !== 'dinnerTable';
      if (wide || !P2B_H[propSub]) { if (!VIEW) E(`${R} (notes)`, `prop:${propSub}: location ${curLoc} has no views to frame it (add \`cam:\`)`); else { const f = {...VIEW, fov: VIEW.fov ?? fv}, toward = k3 => ({...f, position: f.position.map((v, j) => v + (f.target[j] - v) * k3)}); Object.assign(sh, {from: f, to: r.move === 'pull' ? toward(-.04) : r.move === 'static-drift' ? f : toward(.04)}); } }
      else { const [px, py, pz] = e0 ? e0.at : [LI.e.table[0], 0, LI.e.table[2]], H = P2B_H[propSub] * (e0?.scale ?? 1), d = H / ((fitF ?? .47) * 2 * Math.tan(Math.min(Math.max(fov, 28), 40) * Math.PI / 360)), ty = e0 ? py + (propSub === 'chains' ? 0 : H / 2) : H / 2, cy = camY ?? (e0 ? py : .8);
        const f = {position: [px + .08 * d, cy, pz + d], target: [px, ty, pz], fov: Math.min(Math.max(fov, 28), 40)}; Object.assign(sh, {from: f, to: {...f, position: [px + .08 * d * pushK, cy, pz + d * pushK]}}); } }
    else if (propSub && !wobj && !errors.some(e => e.startsWith(R))) { const [px, , pz] = [propAt[0] + org[0], 0, propAt[2] + org[2]], k = propScale, fv = Math.min(Math.max(fov, 28), 40), H = (PROP_H[propSub] ?? 3) * k, d = H / ((fitF ?? .47) * 2 * Math.tan(fv * Math.PI / 360));   // insert on a library prop: low lens, the whole prop 47 % of the frame height, a slow push
      const cy = camY ?? .6, f = {position: [px + .08 * d, cy, pz + d], target: tiltDeg === null ? [px, H / 2, pz] : [px + .08 * d * .9, cy + Math.tan(tiltDeg * Math.PI / 180) * d, pz], fov: fv}; Object.assign(sh, {from: f, to: {...f, position: [px + .08 * d * pushK, cy, pz + d * pushK]}}); }
    if (camNote && !errors.some(e => e.startsWith(R))) {   // E2 `cam:`: the camera at world coordinates (fov from the mood / `fov:`); moves keep their kind
      const fv = sh.from?.fov ?? fov, f = {...camNote, fov: fv}; for (const k of ['follow', 'heading', 'distance', 'height', 'actor', 'dir', 'path', 'targets', 'ground']) delete sh[k];
      const toward = (k2) => ({...f, position: f.position.map((v, j) => v + (f.target[j] - v) * k2)});
      sh.from = f; sh.to = r.move === 'push' || r.move === 'lowAuthority' ? toward(pushNote !== null ? +(1 - pushNote).toFixed(3) : .06) : r.move === 'pull' ? toward(-.06) : r.move === 'crane' ? {...f, position: [f.position[0], f.position[1] + 2.5, f.position[2]]} : r.move === 'orbit' ? toward(.03) : r.move === 'whip' ? {...f, target: [f.target[0] + .6, f.target[1], f.target[2]]} : f;
      if (r.move === 'orbit') sh.degrees = 4;
      if (r.move === 'drone') { const P0 = f.position, d = [f.target[0] - P0[0], f.target[2] - P0[2]], l = Math.hypot(...d) || 1, s = [-d[1] / l, d[0] / l];   // E3: drone from cam: a 4-point path that rises 3 and slides 4 sideways, eyes on the cam: target
        sh.path = [0, 1, 2, 3].map(i => [+(P0[0] + s[0] * 4 * i / 3).toFixed(3), +(P0[1] + i).toFixed(3), +(P0[2] + s[1] * 4 * i / 3).toFixed(3)]); sh.targets = [f.target, f.target, f.target]; }
      if (r.move === 'tiltUp') sh.from = {...f, target: [f.target[0], Math.min(f.target[1], f.position[1] - 3), f.target[2]]};   // E3: tilt from below the lens up to the cam: target
      if (r.move === 'splitScreen') { if (!camB) E(`${R} (notes)`, 'splitScreen needs cam: and camb:'); else { const b = {...camB, fov: fv}; sh.a = {from: f, to: toward(.05)}; sh.b = {from: b, to: {...b, position: b.position.map((v, j) => v + (b.target[j] - v) * .05)}}; } }
    } else if (r.move === 'splitScreen') E(`${R} (notes)`, 'splitScreen needs cam: and camb: (world cameras for the two halves)');
    for (const e of emphasis6) if (e.row === r['#']) e.shot = sh.id;
    shots.push(sh);
  });
  for (const sh of shots) locFirstLook[sh.loc] ??= VIL ? sh.look : null;
  for (const c of cageRows.filter(c => c.key === 'cage')) ensure2b('giantCage', c.loc, c.from - .05, Math.max(...cageRows.filter(q => q.key === 'chains').map(q => q.until), c.until) + .1);
  for (const c of cageRows.filter(c => c.key === 'chains')) ensure2b('chains', c.loc, c.from - .05, c.until + .05);
  const end = +(cues.duration + .85).toFixed(3);
  const used = [...new Set(shots.map(x => x.loc).filter(Boolean))];
  const spec = {slug, fps: 30, format: 6, moods: true, body: 'v6', faceStyle: 'v6', acting: 6, labels: false, hero: 'hero', world: worldMod, look: 'day', cues: `stories/${slug}/cues.json`, end,
    note: `Written by scripts/v2/brief2spec.js from stories/${slug}/BRIEF.md (${shots.length} shots). Edit the Brief, not this file.`,
    brief: {title: meta.title, ruleLine: brief.premise['rule line'], palette: world.palette, colourScript: world['colour script'], setting: world.setting, props, payoff: brief.payoff},
    cast, ...(props7.length ? {props: props7} : {}), ...(p2b.length ? {props2b: p2b} : {}), ...(worldObjs.size ? {worldObjects: [...worldObjs]} : {}), emphasis6: emphasis6.map(({row, ...e}) => e), effects, shots};
  const {nightLook, ...fl} = flags; Object.assign(spec, fl);   // 4A: SPEC FLAGS → spec (format, season, acting, rig, twos, post, camera, grade)
  if (VIL && used.length) { spec.location = used[0]; spec.look4 = locFirstLook[used[0]] ?? 'comedy'; if (used.length > 1) { spec.locations = used; spec.locationLook4 = Object.fromEntries(used.map(L => [L, locFirstLook[L] ?? 'comedy'])); } }
  if (crowdArea && st6.crowd) { st6.crowd.area = crowdArea; st6.crowd.spread = true; st6.crowd.partial = true; if (crowdAvoid.length) st6.crowd.avoid = crowdAvoid; }   // E3b: spread start, kept-clear boxes, a marker's n moves only that many
  else if (st6.crowd) for (const q of st6.crowd.steps) delete q.n;   // legacy specs: steps unchanged   // E3b: the crowd starts spread over its wander box
  if (cues2b.length) spec.sfxCues = [...(spec.sfxCues ?? []), ...cues2b];
  if (Object.values(st6).some(v => Array.isArray(v) ? v.length : v)) { spec.story6 = Object.fromEntries(Object.entries(st6).filter(([, v]) => Array.isArray(v) ? v.length : v)); if (st6.crowd) spec.lod = {near: 18, max: 24}; }   // E2 (opt-in): only specs that use a marker get story6
  if (tplLog.length) spec.tplLog = tplLog;
  return {spec, errors, missing, tplLog};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; }, slug = arg('story');
  if (!slug) { console.error('usage: brief2spec.js --story <slug> [--brief f] [--cues f] [--out f]'); process.exit(2); }
  const brief = parseBrief(readFileSync(arg('brief', `stories/${slug}/BRIEF.md`), 'utf8')), cues = JSON.parse(readFileSync(arg('cues', `stories/${slug}/cues.json`), 'utf8'));
  const {spec, errors, missing, tplLog} = briefToSpec(brief, cues, loadLibrary('.'), {slug});
  if (missing.locations.length || missing.props.length) { console.error('MISSING from the set library (not invented):'); if (missing.locations.length) console.error('  locations: ' + missing.locations.join(', ')); if (missing.props.length) console.error('  props: ' + missing.props.join(', ')); }
  for (const e of errors) console.error('ERROR ' + e);
  for (const l of tplLog ?? []) console.log('TPL ' + l);
  if (errors.length || missing.locations.length || missing.props.length) process.exit(1);
  const out = arg('out', `stories/${slug}/episode.json`); writeFileSync(out, JSON.stringify(spec, null, 1) + '\n');
  console.log(`wrote ${out}: ${spec.shots.length} shots, ${spec.emphasis6.length} emphasis words, end ${spec.end} s`);
}
