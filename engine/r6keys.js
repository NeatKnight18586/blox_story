// engine/r6keys.js — authored classic R6 key poses (owner 2026-11-24: rigid R6, no bends). Data only: acting6 P() specs on
// shoulders / hips / head / root, waist 0, ik 0. Timing (act, tail, anticipation, overshoot, settle, holds) stays acting6's.
// Classic R6 cheats: a crouch is a leg splay (the body plants lower), a kneel is a leg laid flat behind, a bend is a whole-body
// lean with the legs counter-rotated. engine/r6.js plants every grounded pose on the floor, so no key carries a root height.
// Conventions (degrees): shoulder/hip x < 0 = forward/up; left z < 0 / right z > 0 = outward; root lean > 0 = forward.
// A leg's world angle = hip x + root lean (> 0 = behind): a lean of 40 with straight-down legs needs hips at −40.
import {P, REST, VERBS} from './acting6.js';

const Z = {waist: [0, 0, 0], ik: 0};
const k = spec => P({...Z, ...spec});
// settle = the key eased 12 % back toward rest (a held key that breathes out), unless authored
const ease = (key, f = .12) => Object.fromEntries(Object.entries(key).map(([c, x]) => [c, typeof x === 'number' && typeof REST[c] === 'number' && c !== 'ik' ? x + f * (REST[c] - x) : x]));
const V = (key, {settle = null, antic = null, ...rest} = {}) => { const K = k(key); return {key: K, settle: settle ? k(settle) : ease(K), ...(antic ? {antic: k(antic)} : {}), ...rest}; };
const ARC = {arc: undefined};   // no elbow arc on a rigid arm

export const R6KEYS = {
  idle_alive: V({lS: [0, 0, -4], rS: [2, 0, 5], head: [0, 9, 0], root: {dx: .06, roll: -1.5}}, {settle: {lS: [0, 0, -4], rS: [2, 0, 5], head: [0, 9, 0], root: {dx: .06, roll: -1.5}}}),
  look_around: V({head: [-6, -35, 0], rS: [-165, 0, -18], lS: [2, 0, -6], root: {yaw: -10}}, {settle: {head: [-6, 35, 0], rS: [-165, 0, -18], lS: [2, 0, -6], root: {yaw: 10}}}),
  flinch: V({lS: [-125, 0, 32], rS: [-112, 0, -34], head: [14, -28, -8], lH: [8, 0, -5], rH: [-8, 0, 5], root: {lean: -10, roll: 4, dz: -.12}}, {antic: {head: [-6, 0, 0], root: {lean: 3}}, ...ARC}),
  gasp_step_back: V({lS: [-35, 0, -70], rS: [-35, 0, 70], head: [-12, 0, 0], lH: [-18, 0, -3], rH: [22, 0, 3], root: {lean: -10}}, ARC),
  point: V({rS: [-92, 0, 38], lS: [4, 0, -8], head: [-5, 30, 0], lH: [2, 0, -3], rH: [-12, 0, 4], root: {yaw: 15, lean: 4}}, ARC),
  cheer: V({lS: [-12, 0, -152], rS: [-12, 0, 152], head: [-20, 0, 0], lH: [0, 0, -8], rH: [0, 0, 8], root: {lean: -8}}, ARC),
  // facepalm / comfort_kneel arms: solved by engine/r6.js aimArm (tests/r6.js re-checks them: hand ≤ 0.25 from the face / on the shoulder)
  facepalm: V({rS: [-76.25, 0, -61.25], lS: [2, 0, -6], head: [24, -6, 0], root: {lean: 12}, lH: [-10, 0, -2], rH: [-10, 0, 2]},
    {settle: {rS: [-81.5, 0, -60.5], lS: [2, 0, -6], head: [21, -5, 0], root: {lean: 10.56}, lH: [-8.8, 0, -2], rH: [-8.8, 0, 2]}, ...ARC}),
  shrug: V({lS: [-22, 0, -52], rS: [-22, 0, 52], head: [0, 0, 12], root: {roll: -3}}, ARC),
  arms_cross: V({lS: [-80, 0, 52], rS: [-72, 0, -52], head: [-6, -12, 4], lH: [0, 0, -7], rH: [0, 0, 7], root: {lean: -3}}),
  grab: V({rS: [-62, 0, 6], lS: [-18, 0, -10], head: [12, 0, 0], lH: [-48, 0, -4], rH: [-25, 0, 4], root: {lean: 40}},
    {settle: {rS: [-80, 0, 6], lS: [-8, 0, -8], head: [4, 0, 0], lH: [-16, 0, -3], rH: [-4, 0, 3], root: {lean: 10}}, ...ARC}),
  tug_pull: V({lS: [-62, 0, 14], rS: [-68, 0, -14], head: [-6, 0, 0], lH: [-10, 0, -4], rH: [40, 0, 4], root: {lean: -24}}),
  push: V({lS: [-108, 0, 8], rS: [-108, 0, -8], head: [-6, 0, 0], lH: [-42, 0, -3], rH: [22, 0, 3], root: {lean: 20}}),
  throw: V({rS: [-125, 0, 14], lS: [-32, 0, -30], head: [-5, 4, 0], lH: [-40, 0, -5], rH: [12, 0, 5], root: {lean: 18, yaw: 30, roll: 8}},
    {antic: {rS: [55, 0, 22], lS: [-40, 0, -20], lH: [-10, 0, -4], rH: [10, 0, 4], root: {lean: -10, yaw: -22}}, ...ARC}),
  catch: V({lS: [-132, 0, 16], rS: [-132, 0, -16], head: [-15, 0, 0], lH: [-6, 0, -4], rH: [6, 0, 4], root: {lean: -6}}, ARC),
  jump: V({lS: [-160, 0, -22], rS: [-160, 0, 22], head: [-15, 0, 0], lH: [-45, 0, -4], rH: [22, 0, 4], root: {lean: -4}},
    {antic: {lS: [42, 0, -12], rS: [42, 0, 12], head: [10, 0, 0], lH: [-38, 0, -4], rH: [14, 0, 4], root: {lean: 16}},
      settle: {lS: [-12, 0, -10], rS: [-12, 0, 10], lH: [-6, 0, 0], rH: [4, 0, 0], root: {lean: 4}}, sub: undefined}),
  land: V({lS: [-50, 0, -42], rS: [-50, 0, 42], head: [14, 0, 0], lH: [-48, 0, -8], rH: [10, 0, 8], root: {lean: 24}},
    {settle: {lS: [-10, 0, -10], rS: [-10, 0, 10], lH: [-6, 0, 0], rH: [4, 0, 0], root: {lean: 4}}}),
  trip_fall: V({lS: [-170, 0, -22], rS: [-170, 0, 22], head: [-30, 0, 0], lH: [4, 0, -4], rH: [10, 0, 4], root: {lean: 88}}),
  slip: V({lS: [0, 0, -100], rS: [0, 0, 100], head: [20, 0, 0], lH: [-62, 0, -8], rH: [-30, 0, 8], root: {lean: -85}},
    {settle: {lS: [0, 0, -80], rS: [0, 0, 82], head: [12, 6, 0], lH: [-16, 0, -8], rH: [-6, 0, 8], root: {lean: -86}}}),
  bonk_dizzy: V({lS: [-15, 0, -30], rS: [-10, 0, 24], head: [25, 0, 12], lH: [0, 0, -10], rH: [0, 0, 4], root: {lean: 6, roll: 8}}),
  // classic R6 kneel: legs laid flat behind (hip + lean ≈ 90°: a forward lean swings the legs back too), the body planted on them
  knees_collapse: V({lS: [-10, 0, -6], rS: [-10, 0, 6], head: [22, 0, 0], lH: [78, 0, -4], rH: [78, 0, 4], root: {lean: 12}},
    {settle: {lS: [-6, 0, -5], rS: [-6, 0, 5], head: [30, 0, 0], lH: [70, 0, -4], rH: [70, 0, 4], root: {lean: 20}}}),
  reach_for: V({rS: [-140, 0, 16], lS: [20, 0, -20], head: [-20, 25, 0], lH: [15, 0, -4], rH: [-25, 0, 4], root: {lean: 14, yaw: 20, roll: 6}}, ARC),
  // comfort: the classic two-knee R6 kneel (legs flat behind), the reaching hand resting on the partner's near shoulder top
  comfort_kneel: V({rS: [-157.5, 0, -25.25], lS: [-6, 0, -8], head: [12, 21, 0], lH: [84, 0, -4], rH: [84, 0, 4], root: {lean: 6, yaw: 10}},
    {settle: {rS: [-156.5, 0, -24.75], lS: [-5.3, 0, -7.4], head: [10.6, 18.5, 0], lH: [84.72, 0, -4], rH: [84.72, 0, 4], root: {lean: 5.28, yaw: 8.8}}, ...ARC}),
  comfort_b: V({head: [28, -16, 0], lS: [-4, 0, -4], rS: [-4, 0, 4], root: {lean: 10}}),
  // hugs: both arms forward and in, around the partner's torso (size by partner: _s small, _l large); engine/r6.js turns each actor to face its partner
  hug: V({lS: [-88, 0, 38], rS: [-88, 0, -38], head: [0, 14, 0], root: {lean: 8, roll: -4}}),
  hug_b: V({lS: [-92, 0, 36], rS: [-92, 0, -36], head: [-10, -14, 0], root: {lean: 8, roll: 4}}),
  hug_s: V({lS: [-62, 0, 62], rS: [-62, 0, -62], head: [22, 14, 0], lH: [-30, 0, -4], rH: [4, 0, 4], root: {lean: 22}}),
  hug_b_s: V({lS: [-140, 0, 22], rS: [-140, 0, -22], head: [-24, 0, 0], root: {lean: -4}}),
  hug_l: V({lS: [-120, 0, 46], rS: [-120, 0, -46], head: [-20, 14, 0], root: {lean: -4}}),
  hug_b_l: V({lS: [-62, 0, 36], rS: [-62, 0, -36], head: [18, -14, 0], lH: [-26, 0, -4], rH: [4, 0, 4], root: {lean: 18}}),
  // carries (acting6 CARRY): piggyback = the carried actor's hips on the lead's back, his arms angled back under her legs;
  // hip carry = she sits on his right hip (yawed toward him), his right arm across her back. The carried actor is never planted.
  carry: V({lS: [34, 0, -22], rS: [34, 0, 22], head: [-14, 0, 0], lH: [-26, 0, -5], rH: [-18, 0, 5], root: {lean: 24}}, {antic: {lS: [22, 0, -8], rS: [22, 0, 8], head: [6, 0, 0], lH: [-18, 0, -4], rH: [-10, 0, 4], root: {lean: 14}}}),
  carried: V({lS: [-95, 0, 26], rS: [-95, 0, -26], head: [-26, 0, 0], lH: [-80, 0, -52], rH: [-80, 0, 52], root: {lean: 40}}),
  carry_hip: V({rS: [-58, 0, -26], lS: [-6, 0, -8], head: [6, 14, 0], lH: [0, 0, -6], rH: [0, 0, 8], root: {roll: -5}}),
  carried_hip: V({lS: [-100, 0, 30], rS: [-100, 0, -30], head: [-6, 10, 0], lH: [-70, 0, -34], rH: [-70, 0, 34], root: {lean: -6}}),
  carry_box: V({lS: [-80, 0, 12], rS: [-80, 0, -12], head: [6, 0, 0], root: {lean: -5}}),
  // gestures (talk): rigid arm flicks, head moves keep acting6's own keys
  beat: {key: k({rS: [-28, 0, 10]})},
  open_palms: {key: k({lS: [-42, 0, -32], rS: [-42, 0, 32]})},
  // Phase 1F: THE GOVERNOR (GOV_VERBS): rope yank (both hands high, then down with the knees giving), megaphone up, panic arms
  rope_pull: V({lS: [-62, 0, -6], rS: [-62, 0, 6], head: [-10, 0, 0], root: {lean: -6}}, {antic: {lS: [-174, 0, -4], rS: [-174, 0, 4], head: [-26, 0, 0], root: {lean: -4}},
    settle: {lS: [-72, 0, -6], rS: [-72, 0, 6], head: [-12, 0, 0], root: {lean: -5}}}),
  announce: V({rS: [-100, 0, 8], lS: [-4, 0, -30], head: [-8, 0, 0], root: {lean: -5}}, {antic: {rS: [12, 0, 6], head: [8, 0, 0], root: {lean: 5}}}),
  panic_up: V({lS: [-30, 0, -150], rS: [-30, 0, 150], head: [-16, 0, 0], lH: [-14, 0, -6], rH: [10, 0, 6], root: {lean: -8}}, {antic: {lS: [10, 0, -6], rS: [10, 0, 6], head: [10, 0, 0], root: {lean: 8}}, ...ARC}),
};
// hugs: each actor turns to face its partner (a rigid body cannot reach sideways; yaw from acting6's two.place) and steps in
const HUG_STEP = [.7, .45];
for (const sfx of ['', '_s', '_l']) { const v = VERBS['hug' + sfx]; if (!v?.two) continue; const [x, z, yw] = v.two.place, lead = Math.atan2(x, z) * 180 / Math.PI, back = Math.atan2(-x, -z) * 180 / Math.PI - yw;
  const bk = ((back + 540) % 360) - 180, step = (k, yaw, d) => { k['root.yaw'] = yaw; k['root.dx'] = d * Math.sin(yaw * Math.PI / 180); k['root.dz'] = d * Math.cos(yaw * Math.PI / 180); };
  for (const ph of ['key', 'settle']) { step(R6KEYS['hug' + sfx][ph], lead, HUG_STEP[0]); step(R6KEYS['hug_b' + sfx][ph], bk, HUG_STEP[1]); } }   // each steps in toward the other
