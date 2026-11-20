// P2 Faces v6 — palette / restraint rule, alias map, talk-set choice, life (pure logic).
import test from 'node:test';
import assert from 'node:assert/strict';
import {FACE_NAMES6, FACES6, ALIAS6, PALETTE6, MAX_ROLES, faceRoles6, faceColours6, name6, talkSetFor6, isHeld6, blinkAt6, popAt6, TALK6, faceItems6} from '../../avatar-style/faces6.js';
import {HERO_PRESETS5} from '../../avatar-style/faces5.js';
import {talkSet6} from '../../engine/lipflap.js';

test('24 named expressions, each within the palette and at most 3 fill roles (also while talking and blinking)', () => {
  assert.equal(FACE_NAMES6.length, 24);
  const ok = new Set(Object.values(PALETTE6).map(c => c.toUpperCase()));
  for (const n of FACE_NAMES6) for (const o of [{}, {blink: true}, {talk: 1}, {talk: 2}, {talk: 3}]) {
    assert.ok(faceRoles6(n, o).length <= MAX_ROLES, `${n} ${JSON.stringify(o)}: ${faceRoles6(n, o)}`);
    for (const c of faceColours6(n, o)) assert.ok(ok.has(c), `${n}: ${c} off palette`);
  }
  assert.ok(faceRoles6('shock').includes('eyeWhite') && faceRoles6('terrified').includes('eyeWhite'));
  for (const n of FACE_NAMES6.filter(n => !['shock', 'terrified'].includes(n))) assert.ok(!faceRoles6(n).includes('eyeWhite'), n);   // eye whites only in shock / terror
});

test('every faces5 hero_* name maps to a v6 face; unknown faces5 names still draw (faces5 linework)', () => {
  for (const h of HERO_PRESETS5) assert.ok(FACES6[name6(h)], h);
  for (const [k, v] of Object.entries(ALIAS6)) assert.ok(FACES6[v], `${k} → ${v}`);
  assert.ok(faceItems6('love').length > 0);   // a faces5 cell with no v6 alias
});

test('talk-set choice: happy expressions flap the grin set, the rest the standard set; held faces never flap', () => {
  assert.equal(talkSet6('happy'), 'grin'); assert.equal(talkSet6('sad'), 'standard'); assert.equal(talkSet6(null), 'standard');
  assert.equal(talkSetFor6('smile'), 'grin'); assert.equal(talkSetFor6('hero_grin'), 'grin'); assert.equal(talkSetFor6('determined'), 'standard');
  assert.equal(Object.keys(TALK6).length, 2); for (const s of Object.values(TALK6)) assert.equal(s.length, 4);
  assert.ok(isHeld6('shock') && !isHeld6('smile'));
  assert.deepEqual(faceItems6('shock', {talk: 3}), faceItems6('shock'));   // a held face ignores the flap
  assert.ok(faceRoles6('neutral', {talk: 3}).includes('tongue') && faceRoles6('neutral', {talk: 2}).includes('teeth') && !faceRoles6('neutral', {talk: 1}).includes('teeth'));
});

test('life: blinks every 3–5 s for 2 frames, a 1-frame blink and an 8 % squash on a change, settled after 4 frames', () => {
  const fps = 24, closed = []; for (let f = 0; f < 30 * fps; f++) if (blinkAt6(7, f / fps, {fps})) closed.push(f);
  const starts = closed.filter((f, i) => i === 0 || closed[i - 1] !== f - 1), runs = starts.map(s => closed.filter(f => f >= s && f < s + 5).length);
  assert.ok(runs.every(r => r === 2)); for (let i = 1; i < starts.length; i++) { const g = (starts[i] - starts[i - 1]) / fps; assert.ok(g >= 3 - 1 / fps && g <= 5 + 1 / fps, `gap ${g}`); }
  assert.ok(blinkAt6(7, 10.5, {fps, changes: [10.5]}));
  assert.deepEqual(popAt6(10.5, [10.5], {fps}).map(v => +v.toFixed(3)), [1.04, .92, 1.04]);
  assert.deepEqual(popAt6(10.5 + 5 / fps, [10.5], {fps}), [1, 1, 1]); assert.deepEqual(popAt6(3, [], {fps}), [1, 1, 1]);
  assert.deepEqual([blinkAt6(3, 12.3, {fps}), popAt6(11, [10.9])], [blinkAt6(3, 12.3, {fps}), popAt6(11, [10.9])]);   // pure
});
