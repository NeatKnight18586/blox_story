// Director camera: name the shot, the solver places the camera.
//   frameShot({subjects, size: 'MCU', yaw: 25, pitch: 6, x: .1}, aspect)
// Distance comes from the subject's real height (character scale), so a CU of a
// knee-high character is framed like a CU of a tall one. The eye line sits in the
// upper part of the frame, clear of the caption band. Pure functions of their
// inputs: every frame renders identically in any order.
import * as T from 'three';

const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const DEG = Math.PI / 180;
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const easeInOut = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const easeOut = x => 1 - (1 - clamp01(x)) ** 3;
export const easeOutBack = (x, s = 1.6) => { x = clamp01(x) - 1; return 1 + (s + 1) * x ** 3 + s * x ** 2; };

// Frame height in world units for a scale-1 character (head top ≈ 5.2), the screen
// height of the anchor (0 = top, 1 = bottom), the anchor ('eyes' | 'body') and lens.
export const SIZES = Object.freeze({
  // Vertical 9:16 frames are width-limited: a CU shows the head at about half the frame width.
  ECU: {h: 2.4, y: .45, anchor: 'eyes', fov: 30},
  CU: {h: 3.6, y: .40, anchor: 'eyes', fov: 32},
  MCU: {h: 5.0, y: .37, anchor: 'eyes', fov: 34},
  MS: {h: 6.6, y: .32, anchor: 'eyes', fov: 36},
  MLS: {h: 8.6, y: .30, anchor: 'eyes', fov: 38},
  FS: {h: 11, y: .30, anchor: 'eyes', fov: 40},
  WS: {h: 18, y: .42, anchor: 'body', fov: 44},
  EWS: {h: 38, y: .48, anchor: 'body', fov: 50},
});
// Caption band (fraction of frame height from the top) that faces must stay out of.
export const CAPTION_BAND = [.6, .76];
export const SAFE = {x: [.07, .93], y: [.08, .92]};

// Eye point of a six-part character, from its root only (stable while the head acts).
export function eyesOf(a) {
  a.root.updateMatrixWorld(true);
  return a.root.localToWorld(V(0, 4.68, .45));
}
export function bodyOf(a) { a.root.updateMatrixWorld(true); return a.root.localToWorld(V(0, 2.6, 0)); }
export const facingOf = a => a.root.rotation.y;

// subjects: characters (with .root) and/or THREE.Vector3 points; `scaleRef` overrides the size scale.
export function frameShot(spec, aspect = 9 / 16) {
  const S = SIZES[spec.size ?? 'MS']; if (!S) throw Error('unknown shot size ' + spec.size);
  const subs = [].concat(spec.subjects ?? []);
  const chars = subs.filter(s => s.root), pts = subs.filter(s => s.isVector3);
  const anchorOf = s => s.root ? ((spec.anchor ?? S.anchor) === 'eyes' ? eyesOf(s) : bodyOf(s)) : s.clone();
  const anchors = subs.map(anchorOf);
  const anchor = anchors.reduce((a, b) => a.add(b), V()).multiplyScalar(1 / Math.max(1, anchors.length));
  if (spec.offset) anchor.add(V(...spec.offset));
  const scale = spec.scaleRef ?? (chars.length ? Math.max(...chars.map(c => c.root.scale.y)) : 1);
  const fov = spec.fov ?? S.fov;
  let H = (spec.h ?? S.h) * scale * (spec.dist ?? 1);
  // Direction: yaw relative to the main subject's facing (0 = in front), pitch above.
  const base = spec.worldYaw !== undefined ? 0 : (chars[0] ? facingOf(chars[0]) : 0);
  const yaw = base + ((spec.worldYaw ?? spec.yaw ?? 0) * DEG), pitch = (spec.pitch ?? 4) * DEG;
  const dir = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const fwd = dir.clone().negate(), right = fwd.clone().cross(V(0, 1, 0)).normalize(), up = right.clone().cross(fwd);
  // Group shots: widen until every subject fits with margin.
  // The highest eye line takes the composition slot; every other face must stay above the caption band.
  const sy0 = spec.y ?? S.y;
  if (anchors.length > 1) {
    const xs = anchors.map(p => p.clone().sub(anchor).dot(right)), ys = anchors.map(p => p.clone().sub(anchor).dot(up));
    const span = Math.max(...xs) - Math.min(...xs) + (spec.margin ?? 1.6) * scale;
    H = Math.max(H, span / (aspect * (spec.fill ?? .78)), (Math.max(...ys) - Math.min(...ys)) / Math.max(.12, .56 - sy0));
    anchor.add(up.clone().multiplyScalar(Math.max(...ys)));
  }
  const d = H / (2 * Math.tan(fov * DEG / 2));
  const W = H * aspect;
  // Shift camera and target together so the anchor lands at (x, y) on screen.
  const sy = sy0, sx = spec.x ?? 0;
  const shift = up.clone().multiplyScalar((sy - .5) * H).add(right.clone().multiplyScalar(-sx * W));
  const target = anchor.clone().add(shift);
  const position = anchor.clone().add(dir.multiplyScalar(d)).add(shift);
  if (spec.minY !== undefined && position.y < spec.minY) position.y = spec.minY;
  return {position, target, fov, d, H, roll: (spec.roll ?? 0) * DEG};
}

// Moves: a shot spec plus a move gives a start and end spec; u (0..1) eases between.
const MOVES = {
  hold: () => [{}, {}],
  drift: m => [{dist: 1 + (m.amt ?? .05)}, {dist: 1}],
  push: m => [{dist: 1 + (m.amt ?? .18)}, {dist: 1}],
  pull: m => [{dist: 1}, {dist: 1 + (m.amt ?? .22)}],
  orbit: m => [{yaw: -(m.amt ?? 12)}, {yaw: m.amt ?? 12}],
  crane: m => [{pitch: -(m.amt ?? 8)}, {pitch: m.amt ?? 8}],
  craneDown: m => [{pitch: m.amt ?? 14}, {pitch: 0}],
  track: m => [{x: (m.amt ?? .12)}, {x: -(m.amt ?? .12)}],
  tilt: m => [{y: m.amt ?? .18}, {}],};
function mix(spec, delta, k) {
  const out = {...spec};
  for (const [key, v] of Object.entries(delta)) {
    const b = spec[key] ?? (key === 'dist' ? 1 : key === 'x' ? 0 : key === 'y' ? SIZES[spec.size ?? 'MS'].y : key === 'pitch' ? 4 : 0);
    out[key] = key === 'dist' ? b * (1 + (v - 1) * k) : b + v * k;
  }
  return out;
}

// Seeded handheld: a few incommensurate sines (deterministic, no RNG state).
function shake(seed, t, amp) {
  const s = (f, p) => Math.sin(t * f + seed * 12.9898 + p);
  return [amp * (.6 * s(1.7, 0) + .4 * s(4.3, 1)), amp * (.6 * s(1.3, 2) + .4 * s(3.7, 3)), amp * .5 * s(2.1, 4)];
}

// Full camera state for a shot at shot-local u (0..1) and time t (s).
export function cameraAt(spec, u, t, aspect = 9 / 16, seed = 1) {
  const m = typeof spec.move === 'string' ? {type: spec.move} : (spec.move ?? {type: 'drift'});
  const [a, b] = (MOVES[m.type] ?? MOVES.drift)(m);
  const e = (m.ease ?? 'inout') === 'out' ? easeOut(u) : easeInOut(u);
  const cur = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k] ?? (k === 'dist' ? 1 : 0), vb = b[k] ?? (k === 'dist' ? 1 : 0);
    cur[k] = va + (vb - va) * e;
  }
  let s2 = mix(spec, cur, 1);
  // Impact zoom: a fast punch-in over the first ~0.3 s with a small overshoot.
  if (spec.impact) s2 = {...s2, dist: (s2.dist ?? 1) * (1 + spec.impact * (1 - easeOutBack(t / .3)))};
  const c = frameShot(s2, aspect);
  if (spec.shake) {
    const [p, y, r] = shake(seed, t, spec.shake * DEG);
    const off = c.target.clone().sub(c.position);
    off.applyAxisAngle(V(0, 1, 0), y);
    const right = off.clone().cross(V(0, 1, 0)).normalize(); off.applyAxisAngle(right, p);
    c.target = c.position.clone().add(off); c.roll += r;
  }
  return c;
}

export function applyCamera(camera, c) {
  camera.position.copy(c.position); camera.up.set(0, 1, 0); camera.lookAt(c.target);
  if (c.roll) camera.rotateZ(c.roll);
  camera.fov = c.fov; camera.updateProjectionMatrix();
}

// Screen position (x 0..1 left→right, y 0..1 top→bottom, z<1 in front) of a world point.
export function toScreen(camera, p) {
  const v = p.clone().project(camera);
  return {x: (v.x + 1) / 2, y: (1 - v.y) / 2, front: v.z < 1 && v.z > -1};
}
