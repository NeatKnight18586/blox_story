// engine/story6.js — E2 story mechanics for "lastcolor" (pure; node-testable). The renderer side is engine/story6rt.js, opt-in by
// spec.story6 (episode.js). Markers (docs/season1/EPISODE_BRIEF.md "Markers") are parsed here for scripts/v2/brief2spec.js:
//   drain: <actor> <region> @ <word>              region legs | shoes | stripe | jacket | hands | torso | all (the hero's head never drains)
//   bloom: <actor> <region|cheeks|nose|arms> [#colour] @ <word>   ·   bloom: crowd random @ <word>
//   crowd: dummies <n> <wander | idle | limp | run to <anchor> | pile at <anchor> | flop> [at <anchor>]
//   hand: enter | grab <actor> | carry <actor> to <anchor> | throw <actor> [to <anchor>] | release <actor> | exit
//   tumble: <actor> [to <anchor>]   ·   airCatch: <hero> <partner>   ·   splash: big @ <word> [at <anchor>]
//   tag: <actor> "<text>"           ·   spawn: <actor> @ <word>
//   beast: <actor> <idle|walk|run|roar|breathe|flinch|flee|lower|lift|fly|perch|sleep|curl> [to <anchor>] @ <word>   (tuft 2A → shot.beasts)
// Motion is pure in t: tumble arcs, the hand's track, carried / dropped / thrown actors, the air catch, crowd behaviours, the pile
// mound (oriented boxes, exact SAT overlap), wash fronts (drain / bloom), particles (puffs, splash).

export const DUMMY_WHITE = '#F2F2F4', WHITE_STATE = {colour: DUMMY_WHITE, rough: .85, lift: .08};
export const DRAIN_REGIONS = ['legs', 'shoes', 'stripe', 'jacket', 'hands', 'torso', 'all'], BLOOM_EXTRA = ['cheeks', 'nose', 'arms'];
export const BLOOM_REGIONS = [...DRAIN_REGIONS, ...BLOOM_EXTRA], CROWD_RANDOM = ['torso', 'legs', 'arms', 'shoes', 'cheeks'];
export const BEHAVIOURS = ['wander', 'idle', 'limp', 'run', 'pile', 'flop'], HAND_ACTS = ['enter', 'grab', 'carry', 'throw', 'release', 'exit'];
export const BLOOM_LOD_NEAR = 36, DRAIN_FRAMES = 6, BLOOM_FRAMES = 10, PUFF_N = 8, SPLASH_N = 30, CROWD_MAX = 120, G = 34;
export const TUMBLE = {dur: 1.05, apex: 4.2, turns: 1.75, lag: .25, rest: .7, up: .35, dist: 9};
export const CROWD_PALETTE = ['#FF5FA2', '#3CC46A', '#2F80D1', '#F2B632', '#9B59B6', '#1FB5A8', '#E4574A', '#FF8C2E'];
const HEX = /^#[0-9a-fA-F]{6}$/, ID = /^[A-Za-z][A-Za-z0-9_]*$/;
const fail = (key, tok, msg) => { throw Error(`${key}: "${tok}" — ${msg}`); };
const splitAt = s => { const i = s.lastIndexOf('@'); return i < 0 ? [s.trim(), null] : [s.slice(0, i).trim(), s.slice(i + 1).trim() || null]; };

// ---- parsing (pure; errors throw with the marker named) -----------------------------------------------------------------
export function drainError(actor, region, {hero = 'hero'} = {}) {
  if (region === 'head' || region === 'face') return actor === hero ? `the hero's head never drains (asked: ${actor} ${region})` : `"${region}" is not a drain region (${DRAIN_REGIONS.join(' | ')})`;
  if (!DRAIN_REGIONS.includes(region)) return `unknown drain region "${region}" (${DRAIN_REGIONS.join(' | ')})`;
  return null;
}
export function parseDrain(s, o = {}) {
  const [body, word] = splitAt(s), [actor, region, ...rest] = body.split(/\s+/);
  if (!actor || !region || rest.length || !ID.test(actor)) fail('drain', s, 'expected "<actor> <region> @ <word>"');
  const e = drainError(actor, region, o); if (e) fail('drain', s, e);
  return {actor, region, word};
}
export function parseBloom(s) {
  const [body, word] = splitAt(s), p = body.split(/\s+/);
  if (p[0] === 'crowd') { if (p[1] !== 'random' || p.length !== 2) fail('bloom', s, 'expected "crowd random @ <word>"'); return {crowd: true, word}; }
  const [actor, region, colour, ...rest] = p;
  if (!actor || !region || rest.length || !ID.test(actor)) fail('bloom', s, 'expected "<actor> <region> [#colour] @ <word>"');
  if (region === 'head') fail('bloom', s, 'blooms take cheeks / nose, not the head');
  if (!BLOOM_REGIONS.includes(region)) fail('bloom', s, `unknown bloom region "${region}" (${BLOOM_REGIONS.join(' | ')})`);
  if (colour !== undefined && !HEX.test(colour)) fail('bloom', s, `colour "${colour}" is not #rrggbb`);
  return {actor, region, colour: colour ?? null, word};
}
export function parseCrowd(s) {
  const m = /^dummies\s+(\d+)\s+(wander|idle|limp|flop|run\s+to\s+(\w+)|pile\s+at\s+(\w+))(?:\s+at\s+(\w+))?$/.exec(s.trim());
  if (!m) fail('crowd', s, `expected "dummies <n> <${BEHAVIOURS.join(' | ')}> [at <anchor>]" (run to <anchor>, pile at <anchor>)`);
  const n = +m[1]; if (n < 1 || n > CROWD_MAX) fail('crowd', s, `n = ${n}: 1–${CROWD_MAX}`);
  const behaviour = m[2].split(/\s+/)[0];
  return {n, behaviour, anchor: m[3] ?? m[4] ?? m[5] ?? null};
}
export function parseHand(s) {
  const p = s.trim().split(/\s+/), act = p[0];
  if (!HAND_ACTS.includes(act)) fail('hand', s, `unknown hand action "${act}" (${HAND_ACTS.join(' | ')})`);
  if (act === 'enter' || act === 'exit') { if (p.length !== 1) fail('hand', s, `"${act}" takes no actor`); return {act}; }
  const actor = p[1]; if (!actor || !ID.test(actor)) fail('hand', s, `"${act}" needs an actor`);
  if (act === 'carry') { if (p[2] !== 'to' || !p[3] || p.length !== 4) fail('hand', s, 'expected "carry <actor> to <anchor>"'); return {act, actor, anchor: p[3]}; }
  if (act === 'throw') { if (p.length === 2) return {act, actor, anchor: null}; if (p[2] !== 'to' || !p[3] || p.length !== 4) fail('hand', s, 'expected "throw <actor> [to <anchor>]"'); return {act, actor, anchor: p[3]}; }
  if (p.length !== 2) fail('hand', s, `expected "${act} <actor>"`);
  return {act, actor};
}
export function parseTumble(s) {
  const p = s.trim().split(/\s+/);
  if (!p[0] || !ID.test(p[0]) || !(p.length === 1 || (p.length === 3 && p[1] === 'to'))) fail('tumble', s, 'expected "<actor> [to <anchor>]"');
  return {actor: p[0], anchor: p[2] ?? null};
}
export function parseAirCatch(s) { const p = s.trim().split(/\s+/); if (p.length !== 2 || !p.every(x => ID.test(x)) || p[0] === p[1]) fail('airCatch', s, 'expected "<hero> <partner>"'); return {hero: p[0], partner: p[1]}; }
export function parseSplash(s) {
  const m = /^big\s*@\s*(\S+)(?:\s+at\s+(\w+))?$/.exec(s.trim()); if (!m) fail('splash', s, 'expected "big @ <word> [at <anchor>]"');
  return {size: 'big', word: m[1], anchor: m[2] ?? 'pool'};
}
export function parseTag(s) { const m = /^(\w+)\s+"([^"]{1,24})"$/.exec(s.trim()); if (!m) fail('tag', s, 'expected <actor> "<text>" (1–24 characters)'); return {actor: m[1], text: m[2]}; }
export function parseSpawn(s) { const [body, word] = splitAt(s); if (!ID.test(body) || !word) fail('spawn', s, 'expected "<actor> @ <word>"'); return {actor: body, word}; }
// E3b `sitOn: <partner> <lead> [left|right]` (@ word in brief2spec): the lead lies face-down, head turned to that side; the partner sits on
// his back facing that side, until the row ends.
export function parseSitOn(s) { const p = s.trim().split(/\s+/); if (!ID.test(p[0] ?? '') || !ID.test(p[1] ?? '') || p.length > 3 || (p[2] && !['left', 'right'].includes(p[2]))) fail('sitOn', s, 'expected "<partner> <lead> [left|right]"'); return {partner: p[0], lead: p[1], side: p[2] === 'left' ? -1 : 1}; }
export const SIT = {back: 1.05, centre: .55, hip: [-1.45, 0, .25], knee: 1.5, headTurn: 1.25};   // lead: back top / body centre above the ground (× scale); partner: hip / knee pivots (rad); lead head turn (rad)
// E3b `rise: <actor>` (@ word in brief2spec): a held fall ends — the actor stands at its mark (idle pose) until its next mark.
export function parseRise(s) { const p = s.trim().split(/\s+/); if (p.length !== 1 || !ID.test(p[0])) fail('rise', s, 'expected "<actor>"'); return {actor: p[0]}; }
// E3b `lie: <actor> [left|right]` (@ word in brief2spec): the actor lies face-down, head turned to that side, until the row ends.
export function parseLie(s) { const p = s.trim().split(/\s+/); if (!ID.test(p[0] ?? '') || p.length > 2 || (p[1] && !['left', 'right'].includes(p[1]))) fail('lie', s, 'expected "<actor> [left|right]"'); return {actor: p[0], side: p[1] === 'left' ? -1 : 1}; }
// tuft 2A BEAST KIT: `beast: <actor> <state> [to <anchor>] @ <word>` (engine/beast.js parseBeast; brief2spec → shot.beasts)
export { parseBeast } from './beast.js';
import { parseBeast as parseBeast2A } from './beast.js';
import { parsePuff, parseGlow } from './puff.js';   // tuft 2B: `puff: <tuft|hero> <ball|room|colossal|deflate> @ word` · `glow: <actor> <0–1> @ word`
export const MARKERS = {beast: parseBeast2A, puff: parsePuff, glow: parseGlow, lie: parseLie, rise: parseRise, drain: parseDrain, bloom: parseBloom, crowd: parseCrowd, hand: parseHand, tumble: parseTumble, airCatch: parseAirCatch, splash: parseSplash, tag: parseTag, spawn: parseSpawn, sitOn: parseSitOn};
// A notes token "key: value" → {key, value} for a story marker, else null.
export function markerOf(tok) { const m = /^(\w+)\s*:\s*(.+)$/.exec(tok.trim()); return m && MARKERS[m[1]] ? {key: m[1], value: m[2].trim()} : null; }

// ---- small maths ---------------------------------------------------------------------------------------------------------------
const cl = x => Math.max(0, Math.min(1, x)), sm = x => { x = cl(x); return x * x * (3 - 2 * x); }, eo = x => 1 - (1 - cl(x)) ** 3, eio = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u), add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, k) => a.map(v => v * k);
export const rng = seed => { let s = (Math.floor(seed) >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hashS = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// ---- wash fronts (drain top → bottom over 6 frames; bloom bottom → top over 10) ------------------------------------------------
// front(u, yTop, yBot, dir, soft): the world height of the wipe line; `washed(y)` = 1 where the new state has arrived.
export function washFront(u, yTop, yBot, dir = 'down', soft = .15) {
  const k = cl(u), span = yTop - yBot + 2 * soft;
  return dir === 'down' ? yTop + soft - k * span : yBot - soft + k * span;
}
export const washedAt = (y, front, dir = 'down', soft = .15) => dir === 'down' ? sm((y - front + soft) / (2 * soft)) : sm((front - y + soft) / (2 * soft));

// ---- tumble: an airborne arc, ≥ 1.5 turns, limbs lag 0.25 s behind the torso, lie, get up ---------------------------------------
// centre path (the body's centre, 2.6 × scale over the feet when standing); spin = rotation about the actor's side axis (rad).
export function tumbleAt(t, {t0, from, to, dur = TUMBLE.dur, apex = TUMBLE.apex, turns = TUMBLE.turns, k = 1, rest = TUMBLE.rest, up = TUMBLE.up}) {
  if (t < t0) return null;
  const u = (t - t0) / dur, c0 = 2.6 * k, cl0 = .5 * k, lieY = to[1] + cl0;
  const spinAt = tt => turns * 2 * Math.PI * cl((tt - t0) / dur);
  if (u < 1) { const p = lerp3([from[0], from[1] + c0, from[2]], [to[0], lieY, to[2]], u); p[1] += 4 * apex * u * (1 - u); return {phase: 'air', u, centre: p, spin: spinAt(t), lag: spinAt(t - TUMBLE.lag) - spinAt(t)}; }
  const tl = t - t0 - dur, lie = -Math.PI / 2;   // 1.75 turns end on the back (−90°)
  if (tl < rest) return {phase: 'lie', u: 1, centre: [to[0], lieY, to[2]], spin: lie, lag: 0, landedAt: t0 + dur};
  const w = sm((tl - rest) / up);
  if (w < 1) return {phase: 'up', u: 1, centre: [to[0], lieY + (c0 - cl0) * w, to[2]], spin: lie * (1 - w), lag: 0, landedAt: t0 + dur};
  return {phase: 'done', u: 1, centre: [to[0], to[1] + c0, to[2]], spin: 0, lag: 0, landedAt: t0 + dur};
}
// The lag gate (pure): the limb angle (torso spin + lag) at t equals the torso's spin 0.25 s earlier.
export const limbAngle = (tb, t) => (tb.spin ?? 0) + (tb.lag ?? 0);

// ---- giant hand: the pinch point's track (Q), pose and grip; who it holds ------------------------------------------------------
// ev: [{t, act, actor, anchorPos, headAt (head centre of the actor at t), landPos}] sorted by t. pinchLocal = handRig pinch mid-point.
export const HAND_PITCH = 80 * Math.PI / 180, HAND_YAW = Math.PI,   // fingers down, palm toward +z (the park's cameras look north): the pinch faces the lens
  HAND = {enter: 1.0, approach: .5, close: .15, carry: 1.4, lift: 4, swing: .25, exit: 1.0, drop: .02, above: 80, hover: 7};
export function handTrack(ev, t, {hoverDefault = [0, 24, 8]} = {}) {
  let Q = null, pose = 'open', grip = 1, visible = false, holding = null, holdYaw = 0; const released = [];
  const nextGrab = i => ev.slice(i + 1).find(e => e.act === 'grab');
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i]; if (e.t > t) break;
    const lt = Math.min(t, ev[i + 1]?.t ?? Infinity) - e.t, Q0 = Q;
    if (e.act === 'enter') { const g = nextGrab(i), hv = g ? add(g.headAt, [0, HAND.hover, 0]) : hoverDefault; Q = lerp3(add(hv, [0, HAND.above, 0]), hv, eo(lt / HAND.enter)); visible = true; pose = 'open'; grip = 1; }
    else if (e.act === 'grab') { Q = lerp3(Q0 ?? add(e.headAt, [0, HAND.hover, 0]), e.headAt, eio(lt / HAND.approach)); visible = true; pose = 'pinch'; grip = .25 + .75 * sm((lt - HAND.approach) / HAND.close); if (lt >= HAND.approach) holding = e.actor; }
    else if (e.act === 'carry') { const u = eio(lt / HAND.carry); Q = add(lerp3(Q0, e.anchorPos, u), [0, HAND.lift * Math.sin(Math.PI * u), 0]); holding = e.actor; pose = 'pinch'; grip = 1; }
    else if (e.act === 'release') { pose = 'pinch'; grip = 1 - cl(lt / (4 / 30)); if (lt >= HAND.drop) { holding = null; if (!released.some(r => r.t === e.t + HAND.drop)) released.push({actor: e.actor, t: e.t + HAND.drop, from: Q}); } }
    else if (e.act === 'throw') { const dir = e.dir ?? [0, 0, 1]; Q = add(Q0, mul(dir, 4 * eio(lt / HAND.swing))); pose = 'pinch'; grip = lt < HAND.swing ? 1 : 1 - cl((lt - HAND.swing) / (4 / 30)); if (lt >= HAND.swing) { holding = null; released.push({actor: e.actor, t: e.t + HAND.swing, from: Q, thrown: true, to: e.landPos}); } }
    else if (e.act === 'exit') { Q = add(Q0, [0, HAND.above * (cl(lt / HAND.exit) ** 2), 0]); pose = 'open'; grip = 1; holding = null; if (lt >= HAND.exit) visible = false; }
  }
  return {Q, pose, grip, visible, holding, released};
}

// ---- the air catch: the partner leaps off, the hero jumps, they meet at tc and fall together -------------------------------------
export const AIR = {fall: 1.3, jump: .6, hop: 7};   // the partner's leap carries her ~9 studs off the tower: the pair lands clear of it
export function airCatchAt(t, {tc, partnerFrom, heroFrom, dir = [0, -1], groundY = () => 0}) {
  const tp0 = tc - AIR.fall, th0 = tc - AIR.jump, n = Math.hypot(...dir) || 1, d = [dir[0] / n, dir[1] / n];
  const pAt = tt => { const s = cl((tt - tp0) / AIR.fall) * AIR.fall; return [partnerFrom[0] + d[0] * AIR.hop * s, partnerFrom[1] + 2.2 * s - .5 * G * s * s, partnerFrom[2] + d[1] * AIR.hop * s]; };
  const C = pAt(tc), v0 = (C[1] - heroFrom[1] + .5 * G * AIR.jump ** 2) / AIR.jump;
  const hAt = tt => { const s = cl((tt - th0) / AIR.jump) * AIR.jump, u = s / AIR.jump; return [heroFrom[0] + (C[0] - heroFrom[0]) * u, heroFrom[1] + v0 * s - .5 * G * s * s, heroFrom[2] + (C[2] - heroFrom[2]) * u]; };
  const vh = v0 - G * AIR.jump, vp = 2.2 - G * AIR.fall, vc = (vh + vp) / 2, gy = groundY(C[0], C[2]), h = C[1] - gy;
  const tf = (vc + Math.sqrt(vc * vc + 2 * G * h)) / G, land = [C[0], gy, C[2]];
  const out = {catchAt: C, landAt: land, tLand: tc + tf, vh, vp};
  if (t < tp0) return {...out, phase: 'before'};
  if (t < tc) return {...out, phase: 'air', partner: pAt(t), hero: t >= th0 ? hAt(t) : null};
  const s = Math.min(t - tc, tf), y = C[1] + vc * s - .5 * G * s * s;
  return {...out, phase: t < tc + tf ? 'fall' : 'landed', hero: [C[0], Math.max(gy, y), C[2]]};
}

// ---- crowd: seeded behaviours, pure in t -----------------------------------------------------------------------------------------
// crowd = {n, seed, area: {x0, x1, z0, z1}, start: [x, z] centre, steps: [{t, behaviour, anchorPos}]}; returns {p, yaw, pose, lean, lie}.
export const CROWD_SPEED = {wander: 1.2, limp: .95, run: 9}, FLOP_STAGGER = .4;
export const inBox = (x, z, b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
function wanderPath(i, seed, p0, yaw0, t0, t, speed, area, avoid = null) {
  const R = rng(hashS(`${seed}:${i}:${t0.toFixed(3)}`)); let p = [...p0], yaw = yaw0, tt = t0;
  while (tt < t) { const seg = 1.8 + R() * 2.2, dt = Math.min(seg, t - tt); yaw += (R() - .5) * 2.1;
    let nx = p[0] + Math.sin(yaw) * speed * dt, nz = p[1] + Math.cos(yaw) * speed * dt;
    if (nx < area.x0 || nx > area.x1 || nz < area.z0 || nz > area.z1) { yaw += Math.PI; nx = Math.max(area.x0, Math.min(area.x1, nx)); nz = Math.max(area.z0, Math.min(area.z1, nz)); }
    if (avoid && avoid.some(b => inBox(nx, nz, b))) { yaw += Math.PI; nx = p[0]; nz = p[1]; }   // E3b (opt-in crowd.avoid): turn back at a kept-clear box
    p = [nx, nz]; tt += dt; }
  return {p, yaw};
}
export function crowdStart(i, crowd) {
  const R = rng(hashS(`${crowd.seed}:start:${i}`)), a = R() * Math.PI * 2, r = Math.sqrt(R()) * Math.max(4, Math.sqrt(crowd.n) * 1.9);
  if (crowd.spread) { const A = crowd.area, u = a / (Math.PI * 2), v = r / Math.max(4, Math.sqrt(crowd.n) * 1.9); let q = [A.x0 + .5 + u * (A.x1 - A.x0 - 1), A.z0 + .5 + v * v * (A.z1 - A.z0 - 1)];
    for (const b of crowd.avoid ?? []) if (inBox(q[0], q[1], b)) { const d = [[q[0] - b.x0, [b.x0 - .6, q[1]]], [b.x1 - q[0], [b.x1 + .6, q[1]]], [q[1] - b.z0, [q[0], b.z0 - .6]], [b.z1 - q[1], [q[0], b.z1 + .6]]].sort((a2, b2) => a2[0] - b2[0]); q = d[0][1]; }   // pushed out of a kept-clear box
    return {p: q, yaw: R() * Math.PI * 2 - Math.PI}; }   // E3b (opt-in crowd.spread, brief `crowdArea:`): start spread over the wander box (same draws)
  return {p: [crowd.start[0] + Math.sin(a) * r, crowd.start[1] + Math.cos(a) * r], yaw: R() * Math.PI * 2 - Math.PI};
}
export function crowdAt(i, t, crowd, {pile = null} = {}) {
  let {p, yaw} = crowdStart(i, crowd), st = {pose: 'idle', lean: 0, lie: null, flopT: null, moving: false};
  const steps = crowd.steps.filter(s => s.t <= t);
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k]; if (crowd.partial && s.n !== undefined && i >= s.n) continue;   // E3b (opt-in crowd.partial): a step moves only the first n dummies; the rest keep what they were doing
    const nxt = crowd.partial ? crowd.steps.slice(crowd.steps.indexOf(s) + 1).find(q => q.n === undefined || i < q.n) : crowd.steps[crowd.steps.indexOf(s) + 1], tEnd = Math.min(t, nxt?.t ?? Infinity), R = rng(hashS(`${crowd.seed}:${i}:${k}`));
    const prevLie = st.lie; st = {pose: 'idle', lean: 0, lie: null, flopT: null, moving: false};
    if (s.behaviour === 'wander' || s.behaviour === 'limp') { const w = wanderPath(i, crowd.seed, p, yaw, s.t, tEnd, CROWD_SPEED[s.behaviour], crowd.area, crowd.avoid); p = w.p; yaw = w.yaw; st.pose = 'walk'; st.moving = true; if (s.behaviour === 'limp') st.lean = 10; }
    else if (s.behaviour === 'run') { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * Math.max(2.5, Math.sqrt(crowd.n) * .9), tgt = [s.anchorPos[0] + Math.sin(a) * r, s.anchorPos[2] + Math.cos(a) * r];
      const delay = R() * .3, d = Math.hypot(tgt[0] - p[0], tgt[1] - p[1]), dur = d / CROWD_SPEED.run, u = cl((tEnd - s.t - delay) / Math.max(dur, 1e-3));
      if (d > .01) yaw = Math.atan2(tgt[0] - p[0], tgt[1] - p[1]); p = [p[0] + (tgt[0] - p[0]) * u, p[1] + (tgt[1] - p[1]) * u]; st.pose = u > 0 && u < 1 ? 'run' : 'idle'; st.moving = u > 0 && u < 1; }
    else if (s.behaviour === 'pile') { const slots = pile ?? moundSlots(), sl = slots[i];
      if (sl) { const order = slots.order[i], delay = order * .05, d = Math.hypot(sl.c[0] - p[0], sl.c[2] - p[1]), dur = Math.max(.6, d / 10), u = cl((tEnd - s.t - delay) / dur);
        const c = [s.anchorPos[0] + sl.root[0], s.anchorPos[1] + sl.root[1], s.anchorPos[2] + sl.root[2]];
        st.lie = {u, from: [p[0], p[1]], to: c, euler: sl.euler, pose: sl.pose, hop: 1.6 + Math.max(0, sl.root[1])}; if (u >= 1) p = [c[0], c[2]]; }
      else { const a = (i * 2.39996) % (2 * Math.PI), r = (slots.radius ?? 10) + 2.5, tgt = [s.anchorPos[0] + Math.sin(a) * r, s.anchorPos[2] + Math.cos(a) * r], d = Math.hypot(tgt[0] - p[0], tgt[1] - p[1]), u = cl((tEnd - s.t) / Math.max(d / CROWD_SPEED.run, 1e-3));
        if (d > .01 && u < 1) yaw = Math.atan2(tgt[0] - p[0], tgt[1] - p[1]); else yaw = Math.atan2(s.anchorPos[0] - p[0], s.anchorPos[2] - p[1]); p = [p[0] + (tgt[0] - p[0]) * u, p[1] + (tgt[1] - p[1]) * u]; st.pose = u < 1 ? 'run' : 'cheer'; st.moving = u < 1; } }
    else if (s.behaviour === 'flop') { if (prevLie && prevLie.u >= 1) st.lie = prevLie; else { st.flopT = s.t + R() * FLOP_STAGGER; st.pose = 'idle'; } }   // bodies already in the pile stay down
    else st.pose = 'idle';
  }
  return {p, yaw, ...st};
}

// ---- the pile mound: lying bodies as oriented boxes (lying OBB 4 wide × 1.2 thick × 5.3 long), exact SAT overlap --------------
export const BODY_LYING = [2, .6, 2.65];   // half extents: across (arms out at the sides), thickness, length
function obbAxes(yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; }   // x across, y up, z along the body
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Penetration depth of two OBBs {c, yaw, h}: the smallest overlap over the 15 separating axes (0 = apart or touching).
export function obbDepth(A, B) {
  const Aa = obbAxes(A.yaw), Ba = obbAxes(B.yaw), d = sub(B.c, A.c), axes = [...Aa, ...Ba];
  for (const a of Aa) for (const b of Ba) { const x = cross(a, b), n = Math.hypot(...x); if (n > 1e-6) axes.push(mul(x, 1 / n)); }
  let depth = Infinity;
  for (const L of axes) { const ra = A.h.reduce((s, h, k) => s + h * Math.abs(dot(Aa[k], L)), 0), rb = B.h.reduce((s, h, k) => s + h * Math.abs(dot(Ba[k], L)), 0), o = ra + rb - Math.abs(dot(d, L)); if (o <= 0) return 0; depth = Math.min(depth, o); }
  return depth;
}
// Slots (anchor-relative centres) of a 3-high soft mound: layers of tangential rings, greedy, every pair ≤ maxPen (0.1) deep.
export function pileSlots(n, {layers = 3, thick = 1.2, squash = .04, maxPen = .1} = {}) {
  const h = [BODY_LYING[0], thick / 2, BODY_LYING[2]], out = [], R = rng(31);
  const rings = [[[0, 1], [5.6, 5], [10.4, 10]], [[0, 1], [5.6, 5]], [[0, 1], [4.6, 3]]];   // R15 bodies lie 4 wide (arms at the sides): six round a centre body, ten in the outer ring
  for (let L = 0; L < layers && out.length < n; L++) {
    const y = thick / 2 + L * (thick - squash);
    for (const [r, k] of rings[L] ?? []) for (let j = 0; j < k && out.length < n; j++) {
      const a = (j + (L % 2) * .5 + (r > 8 ? .5 : 0)) / k * 2 * Math.PI + (R() - .5) * .04, c = r ? [Math.sin(a) * r, y, Math.cos(a) * r] : [0, y, 0], yaw = r ? a + Math.PI / 2 + (R() - .5) * .06 : L * Math.PI / 2 + .3;
      const box = {c, yaw, h};
      if (out.every(o => obbDepth(o, box) <= maxPen) && (L === 0 || out.some(o => o.c[1] < y && obbDepth({...o, c: [o.c[0], o.c[1] + thick - squash, o.c[2]]}, box) > .5))) out.push({...box, layer: L, face: (out.length % 2) ? 1 : -1});   // upper layers rest on a body below
    }
  }
  const order = {}; out.forEach((s, i) => { order[i] = i; });
  const slots = out.map(s => s); slots.order = order; slots.radius = Math.max(0, ...out.map(s => Math.hypot(s.c[0], s.c[2]) + 2.65)); slots.height = Math.max(0, ...out.map(s => s.c[1] + thick / 2));
  return slots;
}
export function pileWorst(slots) { let w = 0; for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) w = Math.max(w, obbDepth(slots[i], slots[j])); return w; }

// ---- spawn pop and particles --------------------------------------------------------------------------------------------------
export function popScale(t, t0, fps = 30) { const f = (t - t0) * fps; if (f < 0) return 0; if (f >= 6) return 1; return f < 4 ? 1.1 * eo(f / 4) : 1.1 - .1 * sm((f - 4) / 2); }
// Particles of an event at t: [{p, s, colour}] (pure). kind 'puff' (grey dust, 8) | 'splash' (white-blue, 30) | 'glow' (ring, handled apart).
export function particlesAt(ev, t) {
  const lt = t - ev.t; if (lt < 0) return [];
  const R = rng(hashS(`${ev.kind}:${ev.t.toFixed(3)}:${ev.p.map(v => v.toFixed(2)).join(',')}`)), out = [];
  if (ev.kind === 'puff') { const life = .55; if (lt > life) return []; const n = ev.n ?? PUFF_N, k = ev.size ?? 1;
    for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI + R() * .5, sp = (1.6 + R() * 1.4) * k, up = (.4 + R() * .8) * k, u = lt / life;
      out.push({p: [ev.p[0] + Math.sin(a) * sp * eo(u), ev.p[1] + .2 + up * eo(u), ev.p[2] + Math.cos(a) * sp * eo(u)], s: k * (.35 + .35 * R()) * (u < .3 ? u / .3 : 1 - (u - .3) / .7), colour: ev.colour ?? '#B9B6B0'}); } }
  else if (ev.kind === 'splash') { const life = 1.1; if (lt > life) return [];
    for (let i = 0; i < SPLASH_N; i++) { const a = R() * 2 * Math.PI, sp = 2 + R() * 4, vy = 7 + R() * 7, tt = Math.min(lt, life), y = ev.p[1] + vy * tt - .5 * G * tt * tt;
      if (y < ev.p[1] - .1) continue; out.push({p: [ev.p[0] + Math.sin(a) * sp * tt, y, ev.p[2] + Math.cos(a) * sp * tt], s: .22 + R() * .22, colour: i % 3 ? '#FFFFFF' : '#9FD4F2'}); } }
  return out;
}
export const rippleAt = (ev, t) => { const lt = t - ev.t; if (lt < 0 || lt > 1.4) return null; return {r: .8 + 7 * eo(lt / 1.4), opacity: .7 * (1 - lt / 1.4)}; };
export const glowAt = (ev, t) => { const lt = t - ev.t; if (lt < 0 || lt > .8) return null; return {r: .8 + 2.6 * eo(lt / .8), opacity: .65 * (1 - lt / .8)}; };
export const SPAWN_FRAMES = 8;   // E2b: the spawn flash is local and short
export const spawnFlashAt = (t, t0, fps = 30) => { const f = (t - t0) * fps; return f < 0 || f >= SPAWN_FRAMES ? 0 : 1 - f / SPAWN_FRAMES; };
export const burstAt = (t, t0, fps = 30) => { const f = (t - t0) * fps; if (f < 0 || f >= SPAWN_FRAMES) return null; const u = f / SPAWN_FRAMES; return {r: 1 + 4.5 * (1 - (1 - u) ** 3), opacity: .9 * (1 - u)}; };
export const flashAt = (t, t0) => { const lt = t - t0; return lt < 0 ? 0 : lt < .1 ? lt / .1 : Math.max(0, 1 - (lt - .1) / .5); };
// Crowd bloom: one seeded region + tint per dummy, staggered over 1.2 s outward from the hero (rank by distance).
export function crowdBloomPlan(members, heroPos, t0, seed = 5) {
  const ranked = [...members].sort((a, b) => Math.hypot(a.p[0] - heroPos[0], a.p[2] - heroPos[2]) - Math.hypot(b.p[0] - heroPos[0], b.p[2] - heroPos[2]) || (a.name < b.name ? -1 : 1));
  return ranked.map((m, i) => { const R = rng(hashS(`${seed}:${m.name}`)); return {actor: m.name, t: t0 + (ranked.length > 1 ? 1.2 * i / (ranked.length - 1) : 0), region: CROWD_RANDOM[Math.floor(R() * CROWD_RANDOM.length)], colour: CROWD_PALETTE[Math.floor(R() * CROWD_PALETTE.length)]}; });
}

// Times (s) of every story event of a spec (plan check b: each is a novelty 'effect'); [] without spec.story6.
export function story6Times(spec) {
  const D = spec?.story6; if (!D) return [];
  return [...(D.drains ?? []), ...(D.blooms ?? []), ...(D.hand ?? []), ...(D.tumbles ?? []), ...(D.airCatch ?? []), ...(D.splashes ?? []), ...(D.tags ?? []), ...(D.spawns ?? []), ...(D.crowd?.steps ?? [])].map(e => e.t).filter(t => Number.isFinite(t)).sort((a, b) => a - b);
}

// ---- E2b pile: ONE soft mound of posed R15 bodies (frozen by scripts/v2/pile-solve.js → engine/pile6.json) ----------------------
// A body = pose (acting6 channels, limp) + ring angle a, radial distance r of its centre, yaw offset, tilt (about its side axis), roll,
// and for the top layer the height y of its lowest point. Rotation R = Ry(yaw) · Rx(tilt) · Rz(roll) (three.js Euler 'YXZ').
import * as A6 from './acting6.js';
import PILE6 from './pile6.json' with {type: 'json'};   // frozen by scripts/v2/pile-solve.js
const PP = {   // E2b mound poses (acting6 channels, degrees; ik 0 = the legs follow the hip / knee channels)
  lie: {lS: [8, 0, -5], rS: [8, 0, 5], lE: -20, rE: -20, lH: [-70, 0, -8], rH: [-62, 0, 10], lK: 85, rK: 70, head: [-10, 20, 0], ik: 0},   // on the back, knees up: legs drape inward
  lieT: {lS: [4, 0, -4], rS: [4, 0, 4], lE: -15, rE: -10, lH: [-22, 0, -4], rH: [-10, 0, 6], lK: 30, rK: 16, head: [-5, 0, 0], ik: 0},   // on the back along the rim, arms at the sides, knees soft
  sit: {lH: [-40, 0, -14], rH: [-36, 0, 14], lK: 6, rK: 2, waist: [6, 0, 0], head: [18, -15, 0], lS: [14, 0, -26], rS: [10, 0, 24], lE: -22, rE: -15, ik: 0},   // half-reclined (placed at tilt ≈ −50): thighs level, slumped
  slump: {lH: [-70, 0, -16], rH: [-64, 0, 16], lK: 18, rK: 10, waist: [32, 0, 0], head: [24, 10, 0], lS: [-30, 0, -20], rS: [-24, 0, 18], lE: -30, rE: -20, ik: 0},   // sitting, folded forward over the legs (placed facing the centre)
  top: {lS: [0, 0, -45], rS: [0, 0, 40], lE: -8, rE: 0, lH: [-12, 0, -10], rH: [-4, 0, 6], lK: 15, rK: 6, head: [0, -25, 0], ik: 0}};
export const PILE_POSES = Object.fromEntries(Object.entries(PP).map(([k, v]) => [k, A6.solve(A6.P(v), 'dummy').sample]));
const mm3 = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j])), mv3 = (A, v) => A.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const rX = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]], rY = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]], rZ = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const D2 = Math.PI / 180, BODY_C = 2.6;
// → {root: [x, y, z] (the actor's root, anchor-relative), euler: [tilt, yaw, roll] rad ('YXZ'), boxes (world, anchor-relative)}
export function pilePlacement(b) {
  const yaw = ((b.pose === 'sit' ? b.a : b.pose === 'lieT' ? b.a + 90 : b.a + 180) + (b.yo ?? 0)) * D2,   // slump / lie / top: the front faces the centre (lie: head out)
    Rb = mm3(mm3(rY(yaw), rX((b.tilt ?? 0) * D2)), rZ((b.roll ?? 0) * D2));
  const C = [b.r * Math.sin(b.a * D2), 0, b.r * Math.cos(b.a * D2)], local = A6.bodyBoxes(PILE_POSES[b.pose], 'dummy');
  let boxes = local.map(q => ({n: q.n, c: add(C, mv3(Rb, sub(q.c, [0, BODY_C, 0]))), R: mm3(Rb, q.R), h: q.h}));
  const lo = Math.min(...boxes.flatMap(q => [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => q.c[1] + mv3(q.R, [x * q.h[0], y * q.h[1], z * q.h[2]])[1]))))), dy = (b.y ?? 0) - lo;
  boxes = boxes.map(q => ({...q, c: [q.c[0], q.c[1] + dy, q.c[2]]}));
  const root = add([C[0], C[1] + dy, C[2]], mv3(Rb, [0, -BODY_C, 0]));
  return {root, euler: [(b.tilt ?? 0) * D2, yaw, (b.roll ?? 0) * D2], boxes, pose: b.pose};
}
export const pileBodyBoxes = b => pilePlacement(b).boxes;
const corners = q => [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => add(q.c, mv3(q.R, [x * q.h[0], y * q.h[1], z * q.h[2]])))));
export function pileShape(boxesList) { let rad = 0, h = 0; for (const bs of boxesList) for (const q of bs) for (const p of corners(q)) { rad = Math.max(rad, Math.hypot(p[0], p[2])); h = Math.max(h, p[1]); } return {radius: rad, height: h}; }
// Fraction of the disc (radius R) whose vertical line hits a body (seen from above: no ground showing through).
export function pileCoverage(boxesList, Rr = 5, step = .25) {
  const all = boxesList.flat().map(q => ({...q, Rt: [0, 1, 2].map(i => [q.R[0][i], q.R[1][i], q.R[2][i]])})); let n = 0, hit = 0;
  for (let x = -Rr; x <= Rr; x += step) for (let z = -Rr; z <= Rr; z += step) { if (Math.hypot(x, z) > Rr) continue; n++;
    if (all.some(q => { for (let y = 0; y <= 4.4; y += .2) { const l = mv3(q.Rt, sub([x, y, z], q.c)); if (Math.abs(l[0]) <= q.h[0] && Math.abs(l[1]) <= q.h[1] && Math.abs(l[2]) <= q.h[2]) return true; } return false; })) hit++; }
  return hit / Math.max(1, n);
}

// The frozen mound: anchor-relative actor roots + Euler ('YXZ') + pose per body, filled in solver order (the rim first).
export const PILE = PILE6;
export function moundSlots() {
  const slots = PILE6.slots.map(b => { const p = pilePlacement(b); return {pose: b.pose, root: p.root, euler: p.euler, c: p.root, layer: b.pose.startsWith('lie') ? 0 : 1}; });
  slots.order = Object.fromEntries(slots.map((_, i) => [i, i])); slots.radius = PILE6.radius; slots.height = PILE6.height; return slots;
}
