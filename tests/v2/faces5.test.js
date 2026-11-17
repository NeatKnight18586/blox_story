// Faces v5 (owner's face sheet): pure logic — 48 cells, ink-only draw lists, aliases, talk shapes, blink.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F5 from '../../avatar-style/faces5.js';
import {PRESETS as P3, OLD_NAMES} from '../../avatar-style/faces3.js';
import {PRESETS4, ALIAS4} from '../../avatar-style/faces4.js';

const NAMES = 'smile grin happy sparkle content wink_soft wink_shine laugh_xd o_small shock dot_o gasp stare stare_o ring_eyes beam side_eye side_eye_frown confused flat_brows blank worried worried2 sweat_frown beam2 xd_grin xd_laugh beam3 blush_smile love starry calm frown cry bored_o sleep unimpressed angry xd_shout xd_wince kiss xd_squint meh flat_meh tongue sweat_smile shades dots'.split(' ');

test('faces5: one preset per sheet cell, row-major, every cell draws', () => {
  assert.deepEqual(F5.CELL_NAMES, NAMES); assert.deepEqual(Object.keys(F5.PRESETS5), NAMES);
  for (const n of NAMES) assert.ok(F5.faceItems5(n).length >= 2, n);
});
test('faces5: solid #111 only, round-stroke vectors, no wobble / shine / hatching, deterministic', () => {
  for (const n of NAMES) {
    const a = F5.faceItems5(n), b = F5.faceItems5(n); assert.deepEqual(a, b, n + ' deterministic');
    for (const it of a) { assert.equal(it.color, F5.INK, n); assert.ok(!it.shine && !it.hatch, n); }
    for (const p of F5.faceParts5(n, {px: 512})) assert.ok(p.stroke ? p.stroke === F5.INK : p.fill === F5.INK, n);
  }
  const w = F5.faceItems5('smile').find(i => i.kind === 'mouth').w;   // constant stroke ≈ 5.5 % of a cell → 4.4 % of the head front
  assert.ok(Math.abs(w - .044) < .004, 'stroke ' + w);
  const m = F5.faceItems5('smile').find(i => i.kind === 'mouth').line;   // a clean quadratic-ish arc: symmetric about its midpoint
  assert.ok(Math.abs(m[0][1] - m[m.length - 1][1]) < .01);
});
test('faces5: every faces3 / faces4 / hero name resolves (ALIAS5), custom parts mix cells', () => {
  for (const n of [...Object.keys(P3), ...Object.keys(PRESETS4), ...Object.keys(ALIAS4), ...Object.keys(OLD_NAMES)]) assert.ok(F5.resolveFace5(n), n);
  for (const n of F5.HERO_PRESETS5) assert.ok(F5.resolveFace5(n).name);
  assert.equal(F5.resolveFace5('hero_wink').name, 'wink_soft');
  const it = F5.faceItems5({eyes: 'smile', mouth: 'grin'}), g = F5.faceItems5('grin');
  assert.deepEqual(it.filter(i => i.kind === 'mouth'), g.filter(i => i.kind === 'mouth'));
  assert.throws(() => F5.resolveFace5('nope'));
});
test('faces5: talk shapes step .04 / .08 / .13 from the sheet D mouth; held faces never flap', () => {
  for (const fam of ['grin', 'smile']) { const name = fam === 'grin' ? 'grin' : 'smile'; const h = [1, 2, 3].map(k => F5.mouthHeight(name, k)); [.04, .08, .13].forEach((v, i) => assert.ok(Math.abs(h[i] - v) < .006, `${fam} ${h}`)); }
  for (const f of ['grin', 'smile', 'worried', 'blank']) { assert.ok(F5.talkFamily(f), f); assert.ok(!F5.isHeld(f)); }
  for (const f of ['shock', 'angry', 'cry', 'xd_laugh', 'sleep', 'hero_shock']) assert.ok(F5.isHeld(f), f);
  const closed = F5.faceItems5('grin', {talk: 0}).filter(i => i.kind === 'mouth'), open = F5.faceItems5('grin', {talk: 3}).filter(i => i.kind === 'mouth');
  assert.notDeepEqual(closed, open);
  assert.deepEqual(F5.faceItems5('shock', {talk: 3}), F5.faceItems5('shock'));
  for (const fam of Object.keys(F5.TALK)) assert.equal(F5.TALK[fam].length, 4);
});
test('faces5: blink closes both eyes into arcs and keeps the rest', () => {
  for (const n of ['smile', 'grin', 'shock', 'angry', 'flat_brows']) {
    const a = F5.faceItems5(n), b = F5.faceItems5(n, {blink: true});
    assert.equal(b.filter(i => i.kind === 'eye').length, 2, n);
    assert.deepEqual(b.filter(i => i.kind === 'mouth'), a.filter(i => i.kind === 'mouth'), n);
    for (const e of b.filter(i => i.kind === 'eye')) assert.ok(e.line && !e.fill, n);
  }
});
test('faces5: layout stays on the head front (content ≤ 80 % × 1.15 of the head)', () => {
  for (const n of NAMES) for (const it of F5.faceItems5(n)) { const [x0, y0, x1, y1] = F5.bbox(it.line ?? it.pts); assert.ok(x0 > -.45 && x1 < .45 && y0 > -.45 && y1 < .45, `${n} ${[x0, y0, x1, y1]}`); }
});
