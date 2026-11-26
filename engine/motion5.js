// engine/motion5.js — format v5 (Phase 3a) motion grammar, pure (frame maths only; the renderer applies it).
//   shot.freeze = [t, frames]  hold the whole frame (camera, actors, world) from shot-local t for `frames`; afterwards
//                              time is real again (the voice never waits: D3).
//   shot.impact = t            a hit: a 2-frame hold at t, then a camera shake decaying over IMPACT.frames.
//   shot.step = 2              actors and world on twos inside the shot (camera stays smooth); optional, never default.
//   lightsCascade (effect)     lights switch on (or off) one after another: cascadeOn(t, n, {at, step, on}).
import {framesFor} from './fpsframes.js';
export const IMPACT = {hold: 2, frames: 9, amp: .09, hz: 11};
// → {anim, cam}: the source frame for actors/world and for the camera; shake: [dx, dy, dz] camera offset (world units).
export function motionFrame(n, shot, fps = 24) {
  if (!shot) return {anim: n, cam: n, shake: [0, 0, 0]};
  const s0 = shot.start ?? 0; let anim = n, cam = n;
  const holds = [];
  if (shot.freeze) holds.push([s0 + Math.round(shot.freeze[0] * fps), framesFor(shot.freeze[1], fps)]);   // Kit 1: counts are 24 fps frames
  if (shot.impact !== undefined) holds.push([s0 + Math.round(shot.impact * fps), framesFor(IMPACT.hold, fps)]);
  for (const [f0, k] of holds) if (n >= f0 && n < f0 + k) { anim = f0; cam = f0; }
  if (shot.step === 2 && anim === n) anim = s0 + 2 * Math.floor((n - s0) / 2);
  return {anim, cam, shake: impactShake(n, shot, fps)};
}
export function impactShake(n, shot, fps = 24) {
  if (shot?.impact === undefined) return [0, 0, 0];
  const hold = framesFor(IMPACT.hold, fps), nf = framesFor(IMPACT.frames, fps), k = n - ((shot.start ?? 0) + Math.round(shot.impact * fps)) - hold; if (k < 0 || k >= nf) return [0, 0, 0];
  const a = IMPACT.amp * (1 - k / nf) ** 2, w = 2 * Math.PI * IMPACT.hz * k / fps;
  return [a * Math.sin(w), a * .7 * Math.cos(w * 1.3), 0];
}
// Light i of n is on from at + i·step (on: true) or off from then (on: false).
export const cascadeOn = (t, n, {at = 0, step = .12, on = true} = {}) => Array.from({length: n}, (_, i) => (t >= at + i * step) === on);
