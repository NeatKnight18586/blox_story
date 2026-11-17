// Look 5b (format v5): pure motion maths, look data, zone colours, accessories, overshooting pose blends.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M from '../../engine/motion5b.js';
import * as L from '../../engine/look5b.js';
import * as PO from '../../engine/poses.js';
import {zoneColor, ZONE_S, hslOf} from '../../parts/sets4/look5.js';

test('overshootEase: 0 → 1, peaks 10–15 % over, settles to exactly 1, deterministic', () => {
  assert.equal(M.overshootEase(0), 0); assert.equal(M.overshootEase(1), 1); assert.equal(M.overshootEase(-1), 0); assert.equal(M.overshootEase(2), 1);
  const peak = M.overshootPeak(); assert.ok(peak >= 1.10 && peak <= 1.15, `peak ${peak}`);
  assert.ok(Math.abs(M.overshootEase(.98) - 1) < .02, 'settled near the end');
  assert.equal(M.overshootEase(.37), M.overshootEase(.37));
  for (const os of [.10, .15]) { const p = M.overshootPeak(os); assert.ok(Math.abs(p - 1 - os) < .015, `os ${os} → ${p}`); }
});
test('breathe: ±0.6 % over a 3.5 s period, per-actor phase', () => {
  let lo = 2, hi = 0; for (let t = 0; t < 3.5; t += .01) { const b = M.breathe(7, t); lo = Math.min(lo, b); hi = Math.max(hi, b); }
  assert.ok(Math.abs(hi - 1.006) < 1e-4 && Math.abs(lo - .994) < 1e-4, `${lo} ${hi}`);
  assert.ok(Math.abs(M.breathe(7, 1.3) - M.breathe(7, 1.3 + 3.5)) < 1e-9, 'periodic');
  assert.notEqual(M.breathe(7, 0), M.breathe(8, 0), 'seeded phase');
});
test('springLag: a step of the anchor lags by −A at once, overshoots past 0, rings out', () => {
  const step = t => t >= 0 ? 1 : 0, at = t => M.springLag(step, t);
  assert.ok(at(.001) < -.95, `${at(.001)}`); assert.ok(Math.max(...[.2, .25, .3].map(at)) > .2, 'swings past rest');
  assert.ok(Math.abs(at(1.55)) < .02, `${at(1.55)}`); assert.equal(M.springLag(() => 3, 2), 0, 'still anchor: no lag');
  assert.equal(M.springKernel(0), 1); assert.equal(M.springKernel(-1), 0);
});
test('camNoise: ≤ 0.15°, smooth, deterministic', () => {
  let m = 0, jump = 0, prev = M.camNoise(0); for (let t = 0; t < 20; t += 1 / 24) { const n = M.camNoise(t); m = Math.max(m, ...n.map(Math.abs)); jump = Math.max(jump, Math.abs(n[0] - prev[0])); prev = n; }
  assert.ok(m * 180 / Math.PI <= .15 + 1e-9); assert.ok(m * 180 / Math.PI > .1); assert.ok(jump * 180 / Math.PI < .02, 'no frame-to-frame jitter');
  assert.deepEqual(M.camNoise(3.2, 4), M.camNoise(3.2, 4));
});
test('motion blur only on whip / crashZoom', () => {
  assert.deepEqual(M.blurOffsets('whip'), [0, -.5]); assert.deepEqual(M.blurOffsets('crashZoom'), [0, -.5]);
  for (const m of ['push', 'topDown', 'aisleTrack', undefined]) assert.deepEqual(M.blurOffsets(m), [0]);
  assert.deepEqual(M.blurOffsets('whip', false), [0]);
});
test('sampleTimeline overshoot is opt-in; with it, a pose change passes the target and lands on it', () => {
  const keys = [[0, 'idle'], [1, 'point', {snap: true}]], opt = {overshoot: {os: .12, settle: .3, ease: u => M.overshootEase(u, .12)}};
  for (const t of [.5, 1.05, 1.2, 2]) assert.deepEqual(PO.sampleTimeline(keys, t), PO.sampleTimeline(keys, t, {}), 'default unchanged');
  const a = PO.samplePose('idle', 0), b = PO.samplePose('point', 0), j = 'rightShoulder';
  const target = b.pivots[j][0], from = PO.sampleTimeline(keys, .999).pivots[j][0];
  let past = false; for (let t = 1; t < 1.5; t += 1 / 48) { const v = PO.sampleTimeline(keys, t, opt).pivots[j][0]; if ((v - target) * (target - from) > .05 * Math.abs(target - from)) past = true; }
  assert.ok(past, 'overshoots the target'); assert.ok(Math.abs(PO.sampleTimeline(keys, 1.6, opt).pivots[j][0] - target) < 1e-9, 'lands');
  assert.deepEqual(PO.blendPoses(a, b, 1.2).pivots, PO.blendPoses(a, b, 1).pivots, 'blendPoses still clamps by default');
});
test('look5b data: daylight/toy +0.5 EV, night unchanged, rim colour from data; env grade −0.15 EV and 5 % cooler', () => {
  const P = JSON.parse(readFileSync('engine/looks4.json', 'utf8'));
  for (const k of ['toy', 'toyTop', 'dawn', 'comedy']) { const p = L.params(P[k]); assert.equal(p.exposureEV, .5); assert.equal(p.rim.color.toUpperCase(), '#BFD8FF'); assert.equal(p.actorEV, .3); assert.equal(p.envEV, -.15); }
  assert.equal(L.params(P.mystery).exposureEV, 0); assert.equal(L.params({}).exposureEV, 0, 'no v5b block: no exposure change');
  const g = L.envGrade([1, 1, 1], L.params(P.toy)), k = Math.pow(2, -.15); assert.ok(Math.abs(g[2] - k) < 1e-12 && Math.abs(g[0] - .95 * k) < 1e-12 && g[0] < g[1] && g[1] < g[2]);
  assert.equal(L.blobAlpha(0), 1); assert.equal(L.blobAlpha(1), 0); assert.ok(L.blobAlpha(.7) > 0 && L.blobAlpha(.7) < 1);
  assert.ok(L.actorShade('#c08457', .45) > L.actorShade('#FFD542', .45), 'darker skin, lighter shade factor'); assert.equal(L.actorShade('#FFD542', .45), .45);
});
test('zone floor plates: S ≤ .65 (owner), L .35–.75', () => {
  for (const c of ['#ff0000', '#4fc4b8', '#ee8fb0', '#202020', '#7f9fc8']) { const [, s, l] = hslOf(zoneColor(c)); assert.ok(s <= ZONE_S + 1e-3 && l >= .35 - 1e-3 && l <= .75 + 1e-3, c); }
  assert.equal(zoneColor('#7f9fc8'), '#7f9fc8');
});
test('taped hero: yellow #FFD542 and blue #0D7CD4 bands; Mo has hoodie strings', () => {
  const C = JSON.parse(readFileSync('cast/toyhouse.json', 'utf8')).cast, bands = C.HERO_TAPED.regions.bands.map(b => b.color.toUpperCase());
  assert.ok(bands.length >= 4 && bands.every(c => ['#FFD542', '#0D7CD4'].includes(c))); assert.ok(bands.includes('#FFD542') && bands.includes('#0D7CD4'));
  assert.ok(C.MO.accessories.some(a => a.name === 'hoodieStrings'));
});
