// avatar-style/dog.js — E4 (unranked) DOG: a blocky golden dog on the v6 look (rounded satin blocks), our own design. Chest-high to a
// kid (≈ 2.3 studs to the top of the head, 2.8 long), facing +z like every actor. `- dog → DOG` in a brief's CAST resolves to a cast entry
// {style: 'dog'}; episode.js builds it like the dragon (a creature entry, not a troupe slot) and drives it with driveDog.
// Pure sampleDog(keys, t): keys [[t0, state, opts?]], cross-fade 0.25 s. States:
//   idle (breath, slow tail)   sit (hindquarters down, chest up, front legs straight)
//   bow  (front legs stretched forward, chest down, rump up, tail up)   wag (idle stance, fast tail)
import * as T from 'three';
import {rbox, satin} from './body5.js';

export const DOG_COLORS = {body: '#E0A54A', muzzle: '#F6E8C8', ear: '#C48A32', nose: '#2B2118', eye: '#1C1410'};
export const DOG_STATES = ['idle', 'sit', 'bow', 'wag'];
const FADE = .25, PI = Math.PI, TAU = 2 * PI, smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const LEG_H = .85, BODY = [1.0, .95, 1.85];   // leg length; body w, h, l
const BASE = {pitch: 0, bodyY: 0, headPitch: 0, fLeg: 0, hLeg: 0, tailUp: .55, tailYaw: 0, earFlap: 0};
const STATES = {
  idle: t => ({bodyY: .012 * Math.sin(TAU * t / 2.4), headPitch: .04 * Math.sin(TAU * t / 3.1), tailUp: .55, tailYaw: .14 * Math.sin(TAU * t / 1.6)}),
  sit: t => ({pitch: -.62, bodyY: -.50, hLeg: -1.38, fLeg: .62, headPitch: .12 + .03 * Math.sin(TAU * t / 3), tailUp: .08, tailYaw: .1 * Math.sin(TAU * t / 1.8)}),
  bow: t => ({pitch: .42, bodyY: -.36, fLeg: -1.38, hLeg: -.42, headPitch: -.22, tailUp: 1.25, tailYaw: .1 * Math.sin(TAU * t / .5), earFlap: .1}),
  wag: t => ({bodyY: .02 * Math.sin(TAU * t / .5), headPitch: .08, tailUp: .7, tailYaw: .75 * Math.sin(TAU * 3.4 * t), earFlap: .12 * Math.sin(TAU * 3.4 * t)}),
};
export function dogPose(state, t, o = {}) { const f = STATES[state]; if (!f) throw Error(`unknown dog state ${state} (${DOG_STATES.join(' | ')})`); return {...BASE, ...f(t), ...o}; }
const mix = (a, b, w) => Object.fromEntries(Object.keys(BASE).map(k => [k, a[k] + (b[k] - a[k]) * w]));
export function sampleDog(keys, t) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const [t0, s, o] = keys[i], cur = dogPose(s, t - t0, o);
  if (i === 0 || t - t0 >= FADE) return cur;
  const [p0, ps, po] = keys[i - 1]; return mix(dogPose(ps, t - p0, po), cur, smooth((t - t0) / FADE));
}

const grp = (parent, at, name) => { const g = new T.Group(); g.position.set(...at); g.name = name; parent.add(g); return g; };
const blk = (parent, size, at, color, name) => { const m = new T.Mesh(rbox(size, 'hero'), satin(color)); m.position.set(...at); m.name = name; m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
export function buildDog({scale = 1, name = 'dog', colors = null} = {}) {
  const C = {...DOG_COLORS, ...(colors ?? {})}, root = new T.Group(); root.name = name; root.scale.setScalar(scale);
  const by = LEG_H + BODY[1] / 2 - .08, body = grp(root, [0, by, 0], 'body');
  blk(body, BODY, [0, 0, 0], C.body, 'torso'); blk(body, [.82, .5, .55], [0, -.2, .62], C.muzzle, 'chest');
  const head = grp(body, [0, .52, .98], 'head');
  blk(head, [.92, .82, .86], [0, .16, .22], C.body, 'skull'); blk(head, [.5, .38, .5], [0, -.02, .74], C.muzzle, 'muzzle'); blk(head, [.2, .14, .08], [0, .1, 1.0], C.nose, 'nose');
  const eyes = [-1, 1].map(s => { const e = blk(head, [.13, .16, .06], [s * .27, .34, .66], C.eye, 'eye'); return e; });
  const ears = [-1, 1].map(s => { const p = grp(head, [s * .5, .52, .1], 'ear'); blk(p, [.2, .56, .36], [s * .06, -.26, 0], C.ear, 'earBlock'); return p; });
  const tail = grp(body, [0, .22, -.92], 'tail'); blk(tail, [.2, .2, .95], [0, 0, -.45], C.body, 'tailBlock'); blk(tail, [.22, .22, .24], [0, 0, -.98], C.muzzle, 'tailTip');
  const legs = {};
  for (const [k, z, front] of [['f', .66, true], ['h', -.66, false]]) for (const s of [-1, 1]) {
    const p = grp(body, [s * .33, -BODY[1] / 2 + .08, z], k + (s < 0 ? 'L' : 'R') + 'Leg'); blk(p, [.34, LEG_H - .1, .34], [0, -(LEG_H - .1) / 2, 0], C.body, 'leg'); blk(p, [.37, .13, .46], [0, -LEG_H + .065 + .02, front ? .05 : .04], C.muzzle, 'paw'); legs[k + (s < 0 ? 'L' : 'R')] = p;
  }
  return {root, body, head, eyes, ears, tail, legs, kind: 'dog', parts: {torso: body}, pivots: {head}};
}
export function applyDogSample(d, s, origin = {position: [0, 0, 0], yaw: 0}) {
  d.root.position.set(...origin.position); d.root.rotation.set(0, origin.yaw ?? 0, 0);
  d.body.position.y = LEG_H + BODY[1] / 2 - .08 + s.bodyY; d.body.rotation.x = s.pitch; d.head.rotation.x = s.headPitch - s.pitch * .7;
  for (const k of ['fL', 'fR']) d.legs[k].rotation.x = s.fLeg - s.pitch; for (const k of ['hL', 'hR']) d.legs[k].rotation.x = s.hLeg - s.pitch;
  d.tail.rotation.set(s.tailUp, s.tailYaw, 0); d.ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (.12 + s.earFlap); });
  return d;
}
export const driveDog = (d, t, {keys = [[0, 'idle']], origin} = {}) => applyDogSample(d, sampleDog(keys, t), origin);
