// campaigns/tapcap/previz/blocking.js — Pass C blocking for EP01 (pure, node-testable). Cuts come from the aligner's word starts
// (stories/tapcap-ep01-rarity/build/cues.json, owner: the aligner is truth). Every shot moves (no locked-off shots).
//   shots(cues) → [{id, start, end, frames, mood, size, wide, move, cam: {from, to, ease, orbit?, snap?, rack?}, cast, clix, taps, grade}]
//   sampleCam(shot, u) → {pos, look, mm, focus?}  (u = 0…1 through the shot)
import {moodForShot} from '../world/moods.js';
import {TAP, tapStartFor} from '../../../engine/tapcap.js';
import {TOWN_DIR, layout} from '../world/town.js';

export const FPS = 24, END = 75.16;
const L = layout(), PT = L.plinth.top, TD = TOWN_DIR, PERP = [-TD[1], TD[0]];
const P = (dx, dy, dz) => [+(PT[0] + dx).toFixed(3), +(PT[1] + dy).toFixed(3), +(PT[2] + dz).toFixed(3)];
const onPlinth = s => P(PERP[0] * s, 0, PERP[1] * s);          // s = sideways offset on the top disc (Ø 1.4)
const toward = (d, up = 0, side = 0) => P(TD[0] * d + PERP[0] * side, up, TD[1] * d + PERP[1] * side);
const yawTown = Math.atan2(TD[0], TD[1]);
const BANANA_LANE = [0, 0, 12.3], BOX_IN = [0, 0, -1.6], FLAP = [0, 5.09, 7.3];

// cut word: [line index, word index] → the word's start (s)
export function wordStart(cues, li, wi = 0) { return cues.lines[li].words[wi].start; }
export const CLICKS = [[16, 0], [31, 0], [31, 1]];   // "Click." at S21, both S37 clicks

// The shot table (ids follow shots.yml; S16/S30/S37 are split into inserts a/b/c). cut: [line, word] or a time.
const T = [
  {id: 'S1', cut: [0, 0], hero: 1, size: 'wide', move: 'push', cam: {from: {pos: [-8.9, .5, 2.5], look: [-24, 5.4, -16], mm: 50}, to: {pos: [-9.5, .6, 1.7], look: [-24, 5.8, -16], mm: 50}}, jolt: true,   /* D1: down the hill-road axis (a clear street to the summit) */ cast: [{who: 'hero1', preset: 'frozen', at: [-10.95, 0, .7], yaw: .9}]},
  {id: 'S2', cut: [1, 0], size: 'insert', move: 'whip', cam: {from: {pos: toward(3.3, -.45, .6), look: toward(.9, -.68), mm: 50}, to: {pos: toward(2.9, -.5, .2), look: toward(.9, -.68), mm: 50}, whip: 30, snapAt: [1, 5]}},
  {id: 'S3', cut: [1, 6], size: 'wide', move: 'crane', cam: {from: {pos: [-11.2, 1.5, -1.6], look: [-21, 6.0, -13.5], mm: 24}, to: {pos: [-11.9, 4.4, -2.4], look: PT, mm: 24}}},
  {id: 'S4', cut: [2, 0], size: 'medium', move: 'push', cam: {from: {pos: 'signpost+town:5.2,up:1.0', look: 'signpost', mm: 35}, to: {pos: 'signpost+town:3.9,up:1.1', look: 'signpost', mm: 35}}},
  {id: 'S5', cut: [3, 0], size: 'wide', move: 'tilt', cam: {from: {pos: [14, 34, 40], look: [-2, 6, -6], mm: 24}, to: {pos: [13, 33, 38], look: [0, 0, 6], mm: 24}}},
  {id: 'S6', cut: [4, 0], size: 'medium', move: 'orbit', cam: {orbit: {center: PT, r: 3.6, h: .9, a0: yawTown + .55, a1: yawTown + .15}, mm: 50}},
  {id: 'S7', cut: [5, 0], size: 'close', move: 'push', cam: {from: {pos: [1.05, .82, 3.1], look: [1.15, .62, .3], mm: 85}, to: {pos: [1.1, .74, 2.2], look: [1.15, .62, .3], mm: 85}}, cast: [{who: 'banana', at: [1.15, 0, .3]}]},
  {id: 'S8', cut: [6, 0], size: 'wide', move: 'track', cam: {from: {pos: [8.4, 1.4, 27.8], look: [-3, .9, 25.4], mm: 24}, to: {pos: [7.2, 1.4, 27.4], look: [-4, .9, 25.4], mm: 24}}, cast: [{who: 'banana', at: [2.4, 0, 25.6], yaw: 1.2}]},
  {id: 'S9', cut: [7, 0], size: 'medium', move: 'push', cam: {from: {pos: [-6.6, .3, 6.4], look: [-24, 14, -17], mm: 35}, to: {pos: [-6.8, .3, 6.0], look: [-24, 14, -17], mm: 35}}, cast: [{who: 'banana', at: [-8.0, 0, 3.6], yaw: -2.45, face: 'sad'}], clix: {mode: 'arm', end: [-24, 17, -17]}},
  {id: 'S10', cut: [8, 0], size: 'medium', move: 'track', cam: {from: {pos: [8.2, 1.4, 25.4], look: [11.6, 1.05, 21.6], mm: 35}, to: {pos: [9.6, 1.4, 25.6], look: [12.4, 1.05, 21.6], mm: 35}}},
  {id: 'S11', cut: [9, 0], size: 'medium', move: 'push', see: ['CORE ROW'], cam: {from: {pos: [0, 5.3, 12.9], look: [0, 4.4, 7.0], mm: 28}, to: {pos: [0, 5.25, 12.3], look: [0, 4.4, 7.0], mm: 28}},
    cast: [{who: 'banana', at: [FLAP[0] - .35, FLAP[1], FLAP[2]]}, {who: 'sunny', at: [FLAP[0] + .35, FLAP[1], FLAP[2]], face: 'hopeful'}]},
  {id: 'S12', cut: [10, 0], size: 'medium', move: 'push', cam: {from: {pos: [.98, 6.4, 5.75], look: [.05, 5.45, 9.2], mm: 50}, to: {pos: [.95, 6.38, 5.9], look: [.05, 5.45, 9.2], mm: 50}}, clue: 'fleck',
    cast: [{who: 'banana', at: [FLAP[0] - .35, FLAP[1], FLAP[2]]}, {who: 'sunny', at: [FLAP[0] + .35, FLAP[1], FLAP[2]]}]},
  {id: 'S13', cut: [11, 0], size: 'close', move: 'push', cam: {from: {pos: [.38, 5.95, 9.4], look: [.35, 5.88, 7.3], mm: 85}, to: {pos: [.37, 5.93, 8.85], look: [.35, 5.88, 7.3], mm: 85}},
    cast: [{who: 'banana', at: [FLAP[0] - .35, FLAP[1], FLAP[2]]}, {who: 'sunny', at: [FLAP[0] + .35, FLAP[1], FLAP[2]], face: 'hopeful'}]},
  {id: 'S14', cut: [12, 0], size: 'wide', move: 'crane', cam: {from: {pos: [2.9, 3.6, 2.6], look: [-1.2, 1.6, -3.4], mm: 20}, to: {pos: [2.5, 1.9, 2.0], look: [-1.0, 1.4, -3.4], mm: 20}}, cast: [{who: 'banana', at: BOX_IN, rim: true}], props: ['pots']},
  {id: 'S15', cut: [13, 0], size: 'close', move: 'push', cam: {from: {pos: [.6, .75, -.6], look: [0, .62, -1.6], mm: 85}, to: {pos: [.45, .72, -.9], look: [0, .62, -1.6], mm: 85}}, cast: [{who: 'banana', at: BOX_IN, paint: 'fake_cosmic', run: .55, rim: true}], props: ['pots']},
  {id: 'S16a', cut: [13, 4], size: 'insert', move: 'push', cam: {from: {pos: [-.35, .95, -1.05], look: [0, .85, -1.55], mm: 85}, to: {pos: [-.3, .93, -1.15], look: [0, .85, -1.55], mm: 85}}, cast: [{who: 'banana', at: BOX_IN, paint: 'fake_cosmic', run: .4, rim: true}], props: ['pots']},
  {id: 'S16b', cut: [13, 5], size: 'medium', move: 'push', cam: {from: {pos: [1.4, .7, -.4], look: [0, .5, -1.6], mm: 50}, to: {pos: [1.3, .68, -.5], look: [0, .5, -1.6], mm: 50}}, cast: [{who: 'banana', at: BOX_IN, paint: 'fake_cosmic', run: .25, rim: true}], props: ['pots']},
  {id: 'S16c', cut: [13, 6], size: 'insert', move: 'push', cam: {from: {pos: [-.2, .3, -1.0], look: [0, .22, -1.55], mm: 85}, to: {pos: [-.15, .3, -1.12], look: [0, .22, -1.55], mm: 85}}, cast: [{who: 'banana', at: BOX_IN, paint: 'fake_cosmic', run: 0, rim: true}], props: ['pots']},
  {id: 'S17', cut: [14, 0], size: 'medium', move: 'snap', cam: {from: {pos: [1.6, .55, -.3], look: [0, .5, -1.6], mm: 35}, to: {pos: [1.5, .55, -.4], look: [0, .5, -1.6], mm: 70}, snapAt: [0, 4]}, cast: [{who: 'banana', at: BOX_IN, paint: 'fake_cosmic', face: 'joy', rim: true}], props: ['pots', 'puddle']},
  {id: 'S18', cut: [15, 0], size: 'wide', move: 'crane', cam: {from: {pos: [2.2, .5, 17.2], look: [-1, 26, -2], mm: 24}, to: {pos: [2.2, 1.1, 17.2], look: [-.6, 20, 2], mm: 24}}, cast: [{who: 'banana', at: BANANA_LANE, paint: 'fake_cosmic'}], clix: {mode: 'arm', end: [0, 24, 12.3], endTo: [0, 14, 12.3]}},
  {id: 'S19', cut: [15, 6], size: 'medium', move: 'pull', cam: {from: {pos: [0, 2.0, 17.6], look: [0, 1.0, 13], mm: 35}, to: {pos: [0, 2.3, 18.6], look: [0, 1.2, 13], mm: 35}}, cast: [{who: 'banana', at: BANANA_LANE, paint: 'fake_cosmic'}], crowdFace: 'gasp', clix: {mode: 'arm', end: [0, 12, 12.3], endTo: [0, 7, 12.3]}},
  {id: 'S20', cut: [15, 11], size: 'close', move: 'push', cam: {from: {pos: [1.3, 1.0, 14.6], look: [0, 1.15, 12.3], mm: 85}, to: {pos: [1.15, 1.0, 14.2], look: [0, 1.1, 12.3], mm: 85}, blur: true}, cast: [{who: 'banana', at: BANANA_LANE, paint: 'fake_cosmic', tap: 0}], clix: {mode: 'arm', end: [0, 3.0, 12.3], endTo: [0, 1.15, 12.3]}},
  {id: 'S21', cut: 'click0', size: 'insert', move: 'push', cam: {from: {pos: [1.25, .48, 13.0], look: [0, .42, 12.3], mm: 85}, to: {pos: [1.15, .47, 12.95], look: [0, .42, 12.3], mm: 85}}, cast: [{who: 'banana', at: BANANA_LANE, paint: 'fake_cosmic', tap: 0}], clix: {mode: 'arm', press: 0}},
  {id: 'S22', cut: [17, 0], size: 'wide', move: 'pull', cam: {from: {pos: P(5, 4.5, 6), look: PT, mm: 35}, to: {pos: P(17, 7.5, 16.5), look: PT, mm: 35}}, aerial: true, cast: [{who: 'banana', at: onPlinth(0), paint: 'fake_cosmic', yaw: yawTown}]},
  {id: 'S23', cut: [18, 0], size: 'close', move: 'push', cam: {from: {pos: P(1.9, .35, 1.7), look: P(0, .1, 0), mm: 85}, to: {pos: P(1.7, .32, 1.5), look: P(0, .1, 0), mm: 85}}, cast: [{who: 'banana', at: onPlinth(0), paint: 'fake_cosmic', yaw: yawTown}]},
  {id: 'S24', cut: [19, 0], size: 'close', move: 'push', cam: {from: {pos: toward(1.5, .55, .3), look: P(0, .5, 0), mm: 85}, to: {pos: toward(1.25, .55, .25), look: P(0, .5, 0), mm: 85}}, cast: [{who: 'banana', at: onPlinth(0), paint: 'fake_cosmic', run: .45, yaw: yawTown}]},
  {id: 'S25', cut: [20, 0], size: 'wide', move: 'whip', cam: {from: {pos: [-12.6, .35, -2.4], look: [-21, 3.2, -11], mm: 24}, to: {pos: [-12.6, .35, -2.4], look: [-19, 3.2, -13], mm: 24}, whip: 25}, crowd: 'hillbase', crowdFace: 'gasp', cast: [{who: 'banana', at: onPlinth(0), paint: 'fake_cosmic', run: .65, yaw: yawTown}]},
  {id: 'S26', cut: [21, 0], size: 'close', move: 'push', cam: {from: {pos: toward(1.4, .65, -.1), look: P(0, .62, 0), mm: 85}, to: {pos: toward(1.15, .64, -.08), look: P(0, .62, 0), mm: 85}}, cast: [{who: 'banana', at: onPlinth(0), paint: 'fake_cosmic', run: .85, face: 'sad', pool: .6, yaw: yawTown}]},
  {id: 'S27', cut: [22, 0], size: 'medium', move: 'track', cam: {from: {pos: [-16.2, 2.4, -6.4], look: [-19.8, 4.6, -11.2], mm: 35}, to: {pos: [-17.6, 3.9, -8.2], look: [-21.2, 6.4, -12.8], mm: 35}}, cast: [{who: 'sunny', path: [.38, .62], hop: true, paint: 'fake_banana'}, {who: 'banana', at: onPlinth(0), paint: 'fake_cosmic', run: 1, yaw: yawTown}]},
  {id: 'S28', cut: [22, 10], size: 'medium', move: 'push', cam: {from: {pos: toward(3.0, 1.0, .4), look: P(0, .55, 0), mm: 50}, to: {pos: toward(2.5, .95, .35), look: P(0, .55, 0), mm: 50}}, cast: [{who: 'sunny', at: toward(.32), yaw: yawTown + Math.PI, paint: 'fake_banana'}, {who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown}]},
  {id: 'S29', cut: [23, 0], size: 'close', move: 'push', zoomAt: 1.4, cam: {from: {pos: toward(-1.6, .6, -.7), look: toward(.32, .5), mm: 85}, to: {pos: toward(-1.35, .58, -.6), look: toward(.32, .5), mm: 85}, punch: {at: 1.4, k: 1.12}}, cast: [{who: 'sunny', at: toward(.32), yaw: yawTown + Math.PI, paint: 'fake_banana', run: .45}, {who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown}]},
  ...['a', 'b', 'c'].map((k, i) => ({id: 'S30' + k, cut: [24, i + 1], size: i === 1 ? 'medium' : 'insert', move: 'push', cam: i === 1 ? {from: {pos: toward(-1.9, .7, -.9), look: toward(.32, .5), mm: 50}, to: {pos: toward(-1.75, .68, -.85), look: toward(.32, .5), mm: 50}} : {from: {pos: toward(-.95, [.85, .55, .25][i], -.25), look: toward(.32, [.82, .5, .2][i]), mm: 85}, to: {pos: toward(-.85, [.85, .55, .25][i], -.22), look: toward(.32, [.82, .5, .2][i]), mm: 85}},
    cast: [{who: 'sunny', at: toward(.32), yaw: yawTown + Math.PI, paint: 'fake_banana', run: [.7, .85, 1][i]}, {who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown}], bloom: true})),
  {id: 'S31', cut: [25, 0], hero: 2, size: 'medium', move: 'orbit', cam: {orbit: {center: toward(.32, .5), r: 2.2, h: .15, a0: yawTown + Math.PI + .2, a1: yawTown + .2}, mm: 50, rack: {from: 2.2, to: 3.4}},
    cast: [{who: 'sunny', at: toward(.32), yaw: yawTown, preset: 'cosmic'}, {who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown}]},
  {id: 'S32', cut: [26, 0], size: 'medium', move: 'push', grade: 'memory', cam: {from: {pos: toward(2.6, .9, .6), look: P(0, .5, 0), mm: 50}, to: {pos: toward(2.2, .85, .5), look: P(0, .5, 0), mm: 50}}, cast: [{who: 'sunny', at: onPlinth(0), paint: 'fake_banana', run: 0, yaw: yawTown}]},
  {id: 'S33', cut: [27, 0], size: 'wide', move: 'pull', cam: {from: {pos: [-10.5, 3.2, -1.2], look: PT, mm: 35}, to: {pos: [-8.2, 3.4, 1.4], look: PT, mm: 35}}, cast: [{who: 'sunny', at: onPlinth(0), preset: 'cosmic', yaw: yawTown}]},
  {id: 'S34', cut: [28, 0], size: 'medium', move: 'push', cam: {from: {pos: P(PERP[0] * 2.6, .85, PERP[1] * 2.6), look: P(0, .55, 0), mm: 50}, to: {pos: P(PERP[0] * 2.2, .82, PERP[1] * 2.2), look: P(0, .55, 0), mm: 50}}, rainK: .5,
    cast: [{who: 'sunny', at: toward(.32), yaw: yawTown + Math.PI, preset: 'cosmic', face: 'hopeful'}, {who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown}]},
  {id: 'S35', cut: [29, 0], size: 'close', move: 'push', cam: {from: {pos: toward(-1.55, .72, -.1), look: toward(-.3, .62), mm: 85}, to: {pos: toward(-1.25, .7, -.08), look: toward(-.3, .62), mm: 85}}, rainK: .35,
    cast: [{who: 'sunny', at: toward(.32), yaw: yawTown + Math.PI, preset: 'cosmic'}, {who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, face: 'joy', yaw: yawTown}]},
  {id: 'S36a', cut: [30, 0], size: 'wide', move: 'crane', cam: {from: {pos: [-10.5, .6, 15.5], look: [-24, 6, 34], mm: 24}, to: {pos: [-10.5, .9, 15.5], look: [-24, 11.5, 34], mm: 24}}, clix: {mode: 'reveal'}},
  {id: 'S36b', cut: [30, 9], size: 'medium', move: 'crane', cam: {from: {pos: toward(3.2, .3, 1.2), look: P(0, 5, 0), mm: 28}, to: {pos: toward(3.0, .5, 1.1), look: P(0, 4, 0), mm: 28}},
    cast: [{who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown, face: 'hopeful'}, {who: 'sunny', at: toward(.32), preset: 'cosmic', yaw: yawTown, face: 'hopeful'}], clix: {mode: 'arms2', endY: [7, 3.2]}},
  {id: 'S37a', cut: 'click1', size: 'insert', move: 'push', cam: {from: {pos: toward(-.6, .48, -1.25), look: toward(-.3, .42), mm: 85}, to: {pos: toward(-.58, .47, -1.15), look: toward(-.3, .42), mm: 85}}, cast: [{who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown, tap: 1}, {who: 'sunny', at: toward(.32), preset: 'cosmic', yaw: yawTown}], clix: {mode: 'arm', press: 1, onto: 'banana'}},
  {id: 'S37b', cut: 'click2', size: 'insert', move: 'push', cam: {from: {pos: toward(.62, .48, 1.3), look: toward(.32, .42), mm: 85}, to: {pos: toward(.6, .47, 1.2), look: toward(.32, .42), mm: 85}}, cast: [{who: 'banana', at: toward(-.3), paint: 'fake_cosmic', run: 1, yaw: yawTown}, {who: 'sunny', at: toward(.32), preset: 'cosmic', yaw: yawTown, tap: 2}], clix: {mode: 'arm', press: 2, onto: 'sunny'}},
  {id: 'S38', cut: [32, 0], size: 'close', move: 'push', cam: {clixHead: true, from: {d: 22, up: -4, side: 7}, to: {d: 19, up: -3.6, side: 6}, mm: 50}, clix: {mode: 'reveal', face: 'grin'}},
  {id: 'S39', cut: [33, 0], size: 'medium', move: 'push', cam: {from: {pos: toward(2.6, .78, 0), look: P(0, .55, 0), mm: 50}, to: {pos: toward(2.2, .76, 0), look: P(0, .55, 0), mm: 50}},
    cast: [{who: 'banana', at: onPlinth(-.3), paint: 'fake_cosmic', run: 1, face: 'joy', yaw: yawTown}, {who: 'sunny', at: onPlinth(.3), preset: 'cosmic', face: 'joy', yaw: yawTown}]},
  {id: 'S40', cut: [34, 0], hero: 3, size: 'wide', move: 'push', replay: 'S1', cast: [{who: 'hero1', preset: 'frozen', at: [-10.95, 0, .7], yaw: .9}, {who: 'banana', at: onPlinth(-.3), paint: 'fake_cosmic', run: 1, face: 'joy', yaw: yawTown}, {who: 'sunny', at: onPlinth(.3), preset: 'cosmic', face: 'joy', yaw: yawTown}]},
];

export function shots(cues) {
  const clickAt = CLICKS.map(([l, w]) => wordStart(cues, l, w));
  const startOf = s => { if (Array.isArray(s.cut)) return wordStart(cues, ...s.cut);
    const k = +s.cut.replace('click', ''); return Math.ceil(clickAt[k] * FPS - 2) / FPS; };   /* click shots open ≤ 2 frames before the onset (R-CUT-01) */
  const out = T.map(s => ({...s, start: +startOf(s).toFixed(4)}));
  out[0].start = 0;
  out.forEach((s, i) => { s.end = i < out.length - 1 ? out[i + 1].start : END; const f0 = Math.round(s.start * FPS), f1 = Math.round(s.end * FPS); s.f0 = f0; s.frames = f1 - f0;
    s.mood = moodForShot(s.id.replace(/[abc]$/, '')); s.num = +s.id.replace(/\D/g, ''); s.wide = s.size === 'wide'; });
  // S40 replays S1's move exactly; S1's move is shortened/stretched to S40's length by shot-relative u, so the last frames match
  const s1 = out.find(s => s.id === 'S1'); out.find(s => s.id === 'S40').cam = s1.cam;
  // taps: press bottom on each click onset (TC-05)
  const taps = clickAt.map(t => ({onset: t, start: tapStartFor(t, FPS), bottom: Math.round(t * FPS)}));
  for (const s of out) for (const c of s.cast ?? []) if (c.tap !== undefined) c.tapStart = taps[c.tap].start;
  return {shots: out, taps, clicks: clickAt};
}

// ---------- camera (pure) ----------
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, lerp = (a, b, t) => a + (b - a) * t, lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
export function resolvePt(v, L0 = L) {
  if (Array.isArray(v)) return v; const [name, ...mods] = String(v).split('+'), b = [...{signpost: L0.signpost, plinth: L0.plinth.top}[name]];
  for (const m of mods.join('+').split(',').filter(Boolean)) { const [k, n] = m.split(':'); if (k === 'town') { b[0] += TD[0] * +n; b[2] += TD[1] * +n; } if (k === 'up') b[1] += +n; }
  if (name === 'signpost' && !mods.length) b[1] += 1.6; return b;
}
export function sampleCam(s, u, {clixHead = null} = {}) {
  const c = s.cam;
  if (c.orbit) { const o = c.orbit, a = lerp(o.a0, o.a1, ease(u)); const pos = [o.center[0] + Math.sin(a) * o.r, o.center[1] + o.h, o.center[2] + Math.cos(a) * o.r];
    return {pos, look: o.center, mm: c.mm, focus: c.rack ? lerp(c.rack.from, c.rack.to, Math.min(1, Math.max(0, (u - .55) / .4))) : null}; }
  if (c.clixHead && !clixHead) return {pos: null, look: null, mm: c.mm, focus: null};   /* resolved on the page, once Clix is placed */
  if (c.clixHead && clixHead) { const {head, fwd, right} = clixHead, k = ease(u), d = lerp(c.from.d, c.to.d, k), up = lerp(c.from.up, c.to.up, k), side = lerp(c.from.side, c.to.side, k);
    return {pos: head.map((h, i) => h + fwd[i] * d + right[i] * side + (i === 1 ? up : 0)), look: head, mm: c.mm}; }
  const f = c.from, t = c.to, k = ease(u);
  let pos = lerp3(resolvePt(f.pos), resolvePt(t.pos), k), look = lerp3(resolvePt(f.look), resolvePt(t.look), k), mm = lerp(f.mm, t.mm, k);
  const fr = u * s.frames;
  if (c.punch) { const q = Math.min(1, Math.max(0, (fr / FPS - c.punch.at) * FPS / 3)); mm *= 1 + (c.punch.k - 1) * q; }   /* camera event inside a VO gap (R-LEAK-01) */
  if (c.snapAt) { const [a, b] = c.snapAt, q = Math.min(1, Math.max(0, (fr - a) / (b - a))); mm = lerp(f.mm, t.mm, q) * (s.move === 'whip' ? 1.6 - .6 * (1 - q) : 1); }
  if (c.whip) { const w = Math.max(0, 1 - fr / 6) * c.whip * Math.PI / 180, d = [look[0] - pos[0], look[2] - pos[2]], cs = Math.cos(w), sn = Math.sin(w);
    look = [pos[0] + d[0] * cs - d[1] * sn, look[1], pos[2] + d[0] * sn + d[1] * cs]; }
  return {pos, look, mm, focus: null};
}
// camera travel over the shot (H units + degrees of look rotation) — the "no locked-off shots" metric
export function camTravel(s, opts) { const a = sampleCam(s, 0, opts), b = sampleCam(s, 1, opts), d = Math.hypot(...a.pos.map((v, i) => v - b.pos[i]));
  const dir = p => { const v = p.look.map((x, i) => x - p.pos[i]), l = Math.hypot(...v); return v.map(x => x / l); }, da = dir(a), db = dir(b);
  return {move: +d.toFixed(3), turnDeg: +(Math.acos(Math.min(1, da.reduce((s, v, i) => s + v * db[i], 0))) * 180 / Math.PI).toFixed(2), zoom: +(b.mm / a.mm).toFixed(3)}; }
