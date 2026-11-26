// tests/v2/fearbell1g.test.js — Phase 1G pure checks: creature kit acts + budgets, cartoon POP timing, megaphone aim weight,
// props, costumes (age-appropriate builds, hourglass only on adult women), interiors data, the bus stop in the plan.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KINDS, ACTS, SIZE, actAt, shrinkRadius, pillarHeight, domeMotion, vacuumMotion, buildCreature, tris} from '../../parts/creatures.js';
import {cartoonPuffAt, POP_CARTOON, puffAt} from '../../engine/clockfx.js';
import {aimWeight} from '../../avatar-style/governor.js';
import {burgerShrink, mailBurstAt, PROPS1G, tris as ptris} from '../../parts/props1g.js';
import {resolveTroupe} from '../../engine/troupe.js';

test('every creature builds in node, ≤ 8k tris, and every act is pure in t', () => {
  for (const k of KINDS) { const c = buildCreature(k, {id: k}); const acts = Object.keys(ACTS[k]).map((act, i) => ({act, at: .5 + i * 2}));
    const snap = t => { c.apply(t, {acts}, {}); c.root.updateMatrixWorld(true); const out = []; c.root.traverse(o => out.push(o.matrixWorld.elements.map(v => +v.toFixed(5)).join())); return out.join('|'); };
    const a = snap(1.3); snap(3.7); snap(.2); assert.equal(snap(1.3), a, k + ' not pure in t'); assert.ok(tris(c.root) <= 8000, k + ' tris ' + tris(c.root)); }
});
test('actAt picks the latest started act; k clamps to 0…1', () => {
  const acts = [{act: 'roar', at: 1}, {act: 'roar', at: 3}, {act: 'stomp', at: 2}];
  assert.equal(actAt(acts, .5, 'roar', 'trex'), null); assert.equal(actAt(acts, 2, 'roar', 'trex').e.at, 1); assert.equal(actAt(acts, 3.2, 'roar', 'trex').e.at, 3);
  assert.equal(actAt(acts, 9, 'stomp', 'trex').k, 1);
});
test('dome shrink: whoosh collapse, two quick steps, palm puff', () => {
  const R = SIZE.dome; assert.equal(shrinkRadius(-1, R), R); assert.ok(shrinkRadius(.1, R) > R, 'anticipation swell');
  assert.ok(shrinkRadius(.55, R) < .2 * R, 'whoosh collapse'); const s1 = shrinkRadius(.66, R), s2 = shrinkRadius(.8, R); assert.equal(shrinkRadius(.6, R), shrinkRadius(.55, R)); assert.ok(s2 < s1 || s2 < .1 * R, 'step 1');
  assert.ok(Math.abs(shrinkRadius(1.2, R) - SIZE.palm) < 1e-9, 'palm'); assert.ok(SIZE.palm < .6, 'palm-sized');
  const m = domeMotion({acts: [{act: 'roll', at: 0, dur: 2, from: [0, 0, -40], to: [0, 0, 0]}]}, 1, [0, 0, -40]); assert.ok(m.pos[2] > -40 && m.pos[2] < 0 && m.lean > 0);
});
test('pillar rises 40 studs fast; vacuum circles back to its start before the lunge', () => {
  assert.equal(pillarHeight(-.1), 0); assert.ok(pillarHeight(.3) > 25); assert.ok(Math.abs(pillarHeight(2) - SIZE.pillar) < 1e-6); assert.equal(SIZE.pillar, 40);
  const v = vacuumMotion({acts: [{act: 'circle', at: 0, r: 3, dur: 1}]}, 1.0); assert.ok(Math.hypot(v.x, v.z) < 1e-6);
  const l = vacuumMotion({acts: [{act: 'lunge', at: 0, dist: 6}]}, .35); assert.ok(l.z > 5 && l.tilt > .2);
});
test('cartoon POP: full size in 3–4 frames (stretch → squash), gone by its end; soft puffAt unchanged', () => {
  const f = n => cartoonPuffAt(1, n / 24); assert.ok(f(1).sy > 1.2, 'stretch first'); assert.ok(f(3).s > .7 * f(5).s && f(3).s > 0); assert.ok(f(4).sy < 1, 'squash');
  assert.equal(cartoonPuffAt(0, POP_CARTOON.dur), null); assert.ok(cartoonPuffAt(0, POP_CARTOON.dur - .01).s < .15); assert.ok(puffAt(0, .1));
});
test('megaphone aims only when the fist is near, in front of and below the mouth', () => {
  assert.equal(aimWeight(1.8, .8, .9), 1); assert.equal(aimWeight(3.0, .8, .9), 0); assert.equal(aimWeight(1.6, .5, -1.2), 0, 'a raised rope-pull fist never aims'); assert.equal(aimWeight(1.6, -.4, .8), 0);
});
test('props: burger → slider, mail burst, budgets', () => {
  assert.equal(burgerShrink(-1).s, 1); assert.ok(Math.abs(burgerShrink(2).s - .45) < 1e-9); assert.equal(mailBurstAt(0, -.1), null); assert.ok(mailBurstAt(3, .5).p[1] > 1); assert.equal(mailBurstAt(3, 3), null);
  for (const [n, f] of Object.entries(PROPS1G)) assert.ok(ptris(f({})) <= 6000, n);
});
test('1G costumes: slots, age-appropriate builds, hourglass only on adult women', () => {
  const d = JSON.parse(readFileSync('cast/troupe-r6.json', 'utf8'));
  for (const [k, slot] of [['LULU', 'LITTLE'], ['KEVIN', 'SECOND'], ['PICKLES', 'ELDER'], ['MAILMAN', 'ELDER'], ['BODYBUILDER', 'ELDER'], ['TEACHER_FB', 'ADULT_F'], ['DAD_FB', 'ELDER'], ['BUSLADY', 'ADULT_F']]) {
    const p = resolveTroupe({troupe: slot, costume: k}, d); assert.equal(d.costumes[k].slot, slot); assert.equal(p.tag, null, 'no name tags');
    if (p.torsoShape === 'hourglass') assert.equal(p.build, 'adult_f', k); if ((p.age ?? 30) < 18) assert.equal(p.build, 'youth', k); }
  assert.equal(resolveTroupe({troupe: 'ADULT_F', costume: 'BUSLADY'}, d).build, 'elder_f'); assert.equal(resolveTroupe({troupe: 'ADULT_F', costume: 'TEACHER_FB'}, d).torsoShape, 'hourglass');
  assert.ok(resolveTroupe({troupe: 'LITTLE', costume: 'LULU'}, d).accessories.includes('plushHug'));
});
test('interiors: two keyArt anchors each, cameras inside the room; the bus stop is on Main St', () => {
  for (const n of ['cityClassroom', 'cityDining']) { const L = JSON.parse(readFileSync(`parts/locations/${n}.json`, 'utf8')), ka = Object.values(L.anchors).filter(a => a.keyArt);
    assert.equal(ka.length, 2, n); for (const a of ka) { const [x, , z] = a.camera.position; assert.ok(Math.abs(x) < L.room.w / 2 && Math.abs(z) < L.room.d / 2, n + ' camera inside'); } }
  const P = JSON.parse(readFileSync('parts/city/plan.json', 'utf8')); assert.ok(P.mainStreet.dressing.props.some(p => p[0] === 'busStop'));
});
