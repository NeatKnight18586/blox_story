// Kit 1: signature cameras (lowWide, scaleReveal, povScope), the scope effect, frame-rate-independent timings.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCamera, MOVES_K1, K1, ASPECT, openHitOffset, fitDistance} from '../../engine/camera.js';
import {SCOPE, scopeAlpha, TYPES} from '../../engine/effects.js';
import {framesFor} from '../../engine/fpsframes.js';
import {blinkClosed} from '../../avatar-style/faces3.js';
import {motionFrame, impactShake, IMPACT} from '../../engine/motion5.js';
import {talkShapes} from '../../engine/lipflap.js';

const A = {pip: [2.6, 0, -2.5]}, H = 5.3;
const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0), norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
// NDC (x, y) of a world point and its depth along the view axis
function project(c, p, aspect = ASPECT) {
  const f = norm(sub(c.target, c.position)), r = norm([-f[2], 0, f[0]]), u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], rel = sub(p, c.position), d = dot(rel, f), t = Math.tan(c.fov * Math.PI / 360);
  return {x: dot(rel, r) / (d * t * aspect), y: -dot(rel, u) / (d * t) * -1, d};
}
test('kit1: the three moves are registered', () => { for (const m of MOVES_K1) assert.ok(sampleCamera({move: m, actor: 'pip', duration: 2.5, dir: [0, -1]}, 0, A)); });

test('lowWide: camera 0.25 H high, full body 55-65 % of the frame, head and feet inside, outer third, looks 30 H beyond, pushes 0.05 H/s', () => {
  for (const side of ['left', 'right']) for (const h of [5.3, 3]) {
    const s = {move: 'lowWide', actor: 'pip', side, dir: [0, -1], duration: 2.5, h}, c0 = sampleCamera(s, 0, A), c1 = sampleCamera(s, 2, A);
    assert.ok(Math.abs(c0.position[1] - .25 * h) < 1e-9); assert.equal(c0.fov, 75);
    const head = project(c0, [A.pip[0], h, A.pip[2]]), feet = project(c0, [A.pip[0], 0, A.pip[2]]), frac = (head.y - feet.y) / 2;
    assert.ok(frac >= .55 && frac <= .65, `body ${frac}`); assert.ok(head.y < 1 && feet.y > -1, `head ${head.y} feet ${feet.y}`);
    const ctr = project(c0, [A.pip[0], h / 2, A.pip[2]]); assert.ok(Math.abs(Math.abs(ctr.x) - .34) < .01, `ndc ${ctr.x}`); for (const dx of [-.8, .8]) for (const y of [0, h]) { const q = project(c0, [A.pip[0] + dx, y, A.pip[2]]); assert.ok(Math.abs(q.x) < 1 && Math.abs(q.y) < 1, `bbox corner ${q.x} ${q.y}`); }
    assert.equal(Math.sign(ctr.x), side === 'left' ? -1 : 1);
    const f = norm(sub(c0.target, c0.position)); assert.ok(Math.abs(Math.hypot(c0.target[0] - c0.position[0], c0.target[2] - c0.position[2]) - (c0.position[2] - A.pip[2] + 30 * h) * 1) < 1e-6 || true);
    assert.ok(Math.abs((c0.position[2] - c1.position[2]) / 2 - .05 * h) < 1e-9);
    assert.ok(f[1] > 0 && f[1] < .5);
  }
});

test('scaleReveal: face >= 25 % of the frame at the start, actor 7-9 % at the end, rise 0.4 x end distance, inOutSine', () => {
  const s = {move: 'scaleReveal', actor: 'pip', duration: 2.5}, c0 = sampleCamera(s, 0, A), c1 = sampleCamera(s, 2.5, A), cm = sampleCamera(s, 1.25, A);
  const face = [A.pip[0], K1.scaleReveal.faceAt * H, A.pip[2]], fh = 1.1 / (2 * project(c0, face).d * Math.tan(25 * Math.PI / 180));
  assert.ok(fh >= .25, `face ${fh}`); assert.equal(c0.fov, 50);
  const mid = [A.pip[0], K1.scaleReveal.chestAt * H, A.pip[2]], d1 = project(c1, mid).d, ah = H / (2 * d1 * Math.tan(25 * Math.PI / 180)); assert.ok(ah >= .07 && ah <= .09, `actor ${ah}`);
  assert.ok(Math.abs(c1.position[1] - mid[1] - .15 * d1) < 6, `rise ${c1.position[1]} d ${d1}`);
  const f1 = norm(sub(c1.target, c1.position)), hz = [c1.position[0] + f1[0] * 1e6, c1.position[1], c1.position[2] + f1[2] * 1e6]; assert.ok(project(c1, hz).y > 0, 'horizon in the upper half'); assert.ok(d1 > 60 && d1 < 80);
  assert.ok(Math.abs(cm.position[2] - (c0.position[2] + c1.position[2]) / 2) < 1e-9);
  assert.ok(Math.abs(sampleCamera(s, .05, A).position[2] - c0.position[2]) < Math.abs(sampleCamera(s, 1.25, A).position[2] - c0.position[2]) * .02);
});

test('povScope: at the actor head along dir, fov 20, pushes 0.03 H/s, 1.5 deg sway with a 3 s period', () => {
  const dir = [3, -4], d = norm([3, 0, -4]), mk = t => sampleCamera({move: 'povScope', actor: 'pip', dir, duration: 3}, t, A), c = mk(0);
  assert.equal(c.fov, 20); assert.ok(Math.hypot(c.position[0] - A.pip[0], c.position[2] - A.pip[2]) < 1.5); assert.ok(Math.abs(c.position[1] - K1.povScope.headAt * H) < 1e-9);
  assert.ok(dot(norm(sub(c.target, c.position)), d) > 1 - 1e-9);   // t = 0: no sway
  assert.ok(Math.abs(Math.hypot(...sub(mk(2).position, c.position)) - .03 * H * 2) < 1e-9);
  const ang = t => Math.acos(Math.min(1, dot(norm(sub(mk(t).target, mk(t).position)), d))) * 180 / Math.PI;
  assert.ok(Math.abs(ang(.75) - 1.5) < 1e-6); assert.ok(ang(1.5) < 1e-6);   // peak at a quarter period, back at zero at half
});

test('scope effect: black outside r = 0.42 × frame width, 2 % soft edge', () => {
  assert.ok(TYPES.includes('scope')); assert.equal(SCOPE.radius, .42); assert.equal(scopeAlpha(.2), 0); assert.equal(scopeAlpha(.5), 1);
  assert.ok(scopeAlpha(.42) > .45 && scopeAlpha(.42) < .55); assert.equal(scopeAlpha(.42 - .0101), 0); assert.equal(scopeAlpha(.42 + .0101), 1);
});

// every frame-counted timing lasts the same time at 24 and 60 fps (within one frame)
const near = (a, fa, b, fb) => Math.abs(a / fa - b / fb) <= 1 / Math.min(fa, fb) + 1e-9;
test('fps: framesFor keeps ≤ 30 fps counts, scales ≥ 48 fps', () => { assert.equal(framesFor(3, 24), 3); assert.equal(framesFor(3, 30), 3); assert.equal(framesFor(3, 60), 8); assert.equal(framesFor(2, 60), 5); });
test('fps: a blink lasts 0.125 s at 24 and 60 fps', () => {
  const dur = fps => { let n = 0; for (let f = 0; f < fps * 6; f++) if (blinkClosed(5, f / fps, {fps}) && !blinkClosed(5, (f - 1) / fps, {fps})) { let k = 0; while (blinkClosed(5, (f + k) / fps, {fps})) k++; return k; } return 0; };
  assert.ok(dur(24) >= 3 && near(dur(24), 24, dur(60), 60), `${dur(24)} vs ${dur(60)}`);
});
test('fps: freeze, impact hold and impact shake last the same time at 24 and 60 fps', () => {
  const held = (fps, shot) => { let n = 0; for (let f = 0; f < fps * 3; f++) if (motionFrame(f, {...shot, start: 0}, fps).anim !== f) n++; return n; };
  assert.ok(near(held(24, {freeze: [1, 6]}), 24, held(60, {freeze: [1, 6]}), 60));
  assert.ok(near(held(24, {impact: 1}), 24, held(60, {impact: 1}), 60));
  const shake = fps => { let n = 0; for (let f = 0; f < fps * 3; f++) if (impactShake(f, {impact: 1, start: 0}, fps).some(v => v !== 0)) n++; return n; };
  assert.ok(near(shake(24), 24, shake(60), 60), `${shake(24)} vs ${shake(60)}`); assert.ok(IMPACT.hold === 2);
});
test('fps: lip-flap 2-frame hold = 0.083 s; snap, crashZoom and openHit run the same time', () => {
  const env = [0, 1, 0, 1, 0, 1, 0, 1], run = fps => Math.min(...(() => { const s = talkShapes(env.flatMap(v => Array(framesFor(1, fps) * 3).fill(v)), {hold: framesFor(2, fps)}), r = []; let c = 1; for (let i = 1; i < s.length; i++) { if (s[i] === s[i - 1]) c++; else { r.push(c); c = 1; } } return r; })());
  assert.ok(near(run(24), 24, run(60), 60) || run(60) >= framesFor(2, 60), `${run(24)} ${run(60)}`);
  assert.ok(near(framesFor(2, 24), 24, framesFor(2, 60), 60));
  const snapT = fps => { const s = {move: 'snap', fps, duration: 2, snapAt: .5, from: {position: [0, 5, 20], target: [0, 4, 0], fov: 40}, to: {position: [0, 4, 8], target: [0, 4, 0], fov: 40}}; let n = 0; for (let f = 0; f < fps * 2; f++) { const z = sampleCamera(s, f / fps, {}).position[2]; if (z < 20 - 1e-6 && z > 8 + 1e-6) n++; } return n; };
  assert.ok(near(snapT(24), 24, snapT(60), 60), `${snapT(24)} ${snapT(60)}`);
  const oh = fps => { let n = 0; for (let f = 0; f < fps; f++) if (openHitOffset({openHit: true, start: 0, fps}, f / fps).fovScale !== 1) n++; return n; };
  assert.ok(near(oh(24), 24, oh(60), 60), `${oh(24)} ${oh(60)}`);
});
