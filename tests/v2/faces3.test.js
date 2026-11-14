// Faces v3 (owner, 2026-11-14): parts, presets, the age rule, dark skin, blink, tiers, tapered strokes — pure logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../../avatar-style/faces3.js';

test('faces v3: part library sizes, presets, old names', () => {
  assert.equal(Object.keys(F.BROWS).length, 10); assert.equal(Object.keys(F.EYES).length, 18); assert.equal(Object.keys(F.MOUTHS).length, 20); assert.equal(Object.keys(F.EXTRAS).length, 10);
  const groups = F.PRESET_GROUPS, named = [...groups.base, ...groups.girl, ...groups.men, ...groups.reactions];
  assert.equal(named.length, 50); assert.equal(new Set(named).size, 50);
  for (const a of ['curious', 'brave', 'wonder', 'polite', 'sheepish', 'determined']) assert.ok(F.PRESETS[a], a);
  for (const [n, p] of Object.entries(F.PRESETS)) { assert.ok(F.BROWS[p.brows] && F.EYES[p.eyes] && F.MOUTHS[p.mouth], n); for (const e of p.extras) assert.ok(F.EXTRAS[e], `${n}: ${e}`); }
  assert.notEqual(F.PRESETS.determined.brows, 'angry-V', 'determined never has V brows');
  for (const [o, n] of Object.entries(F.OLD_NAMES)) assert.equal(F.resolveFace(o).name, n);
  assert.equal(F.resolveFace({eyes: 'heart', mouth: 'w'}).eyes, 'heart', 'runtime combinations');
  assert.throws(() => F.resolveFace('nope'));
});
test('faces v3: draw lists are deterministic, inside the decal, and tiers drop detail', () => {
  const a = F.faceParts('g_soft', {px: 512}), b = F.faceParts('g_soft', {px: 512});
  assert.deepEqual(a, b);
  for (const n of Object.keys(F.PRESETS)) for (const it of F.faceParts(n, {px: 512})) { if (it.clip) continue; const [x0, y0, x1, y1] = it.bbox; assert.ok(x0 >= -.5 && x1 <= .5 && y0 >= -.34 && y1 <= .34, `${n} part outside the decal ${it.bbox.map(v => v.toFixed(2))}`); }
  const mid = F.faceParts('g_glossy', {px: 512, tier: 'mid'}).length, crowd = F.faceParts('g_glossy', {px: 128, tier: 'crowd'}).length;
  assert.ok(crowd < mid, 'crowd tier drops highlights'); assert.ok(F.faceParts('g_soft', {tier: 'crowd'}).length < F.faceParts('g_soft').length, 'and lashes');
  const blink = F.faceParts('laugh', {blink: true}).filter(it => it.kind === 'eye'); assert.equal(blink.length, 2);
});
test('faces v3: tapered strokes are pointed at both ends and widest in the middle', () => {
  const pts = Array.from({length: 21}, (_, i) => [i / 20, 0]), poly = F.taper(pts, .1, {over: 0, min: 0}), n = poly.length / 2;
  const width = i => Math.abs(poly[i][1] - poly[poly.length - 1 - i][1]);
  assert.ok(width(0) < .01 && width(n - 1) < .01, 'pointed ends'); assert.ok(Math.abs(width(10) - .1) < 1e-9, 'full width at the middle');
});
test('faces v3: age rule, dark skin, blink', () => {
  assert.ok(F.faceError('g_lips', 'youth')); assert.ok(F.faceError('g_glam', 'youth')); assert.ok(F.faceError({eyes: 'oval', mouth: 'smile', extras: ['lip colour']}, 'youth'));
  assert.equal(F.faceError('g_lips', 'adult_f'), null); assert.equal(F.faceError('smile', 'youth'), null);
  assert.ok(F.darkSkin('#5a3826') && F.darkSkin('#4a2c1d') && !F.darkSkin('#8d5a3b') && !F.darkSkin('#f6c9a0'));
  assert.ok(F.contrast(F.INK, '#8d5a3b') >= 3, 'ink still reads on the darkest skin above the cut-off');
  for (const s of ['#5a3826', '#4a2c1d']) assert.ok(F.contrast(F.EDGE, s) >= 3, s);
  const fps = 30, closed = []; for (let f = 0; f < fps * 60; f++) if (F.blinkClosed(42, f / fps, {fps})) closed.push(f);
  const starts = closed.filter((f, i) => i === 0 || closed[i - 1] !== f - 1);
  assert.ok(starts.length >= 11 && starts.length <= 24, `${starts.length} blinks a minute`);
  for (let i = 1; i < starts.length; i++) { const d = (starts[i] - starts[i - 1]) / fps; assert.ok(d >= 2.5 - 1 / fps && d <= 5 + 1 / fps, `gap ${d}`); }
  for (const s of starts) for (let k = 0; k < 3; k++) assert.ok(closed.includes(s + k)); assert.ok(!closed.includes(starts[0] + 3), 'three frames');
  const s0 = starts[0] / fps; assert.equal(F.blinkClosed(42, s0, {fps, changes: [s0 + 1 / fps]}), false, 'never at a face change');
  assert.equal(F.blinkClosed(42, s0, {fps, suppress: true}), false, 'never in a held close-up ≤ 1 s');
  assert.notDeepEqual(starts.slice(0, 3), [], 'seeded'); assert.notEqual(F.blinkClosed(7, s0, {fps}), undefined);
});
