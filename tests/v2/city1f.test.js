// npm run v2:test — Phase 1F: the Governor (cast + faces + acts), the rule-clock kit, anchor lock, bell crack, flower tufts, night matcap rim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {FACE_NAMES6, FACES_GOV, GOV_FACES, name6, family6, fillColours6, MAX_COLOURS, faceItems6} from '../../avatar-style/faces6.js';
import {GOV_ACCESSORIES, GOV_HEAD, monocle, megaphone} from '../../avatar-style/governor.js';
import {GOV_VERBS, VERBS, timing} from '../../engine/acting6.js';
import {R6KEYS} from '../../engine/r6keys.js';
import {sampleVerbR6, lowestR6} from '../../engine/r6.js';
import {DONG, POP, dongSwing, shockAt, puffAt, sparkAt} from '../../engine/clockfx.js';
import {zoneTarget, inZone, aimTo, ndcOf} from '../../engine/anchorlock.js';
import {BELL_CRACK, profR} from '../../parts/city/downtown.js';
import {flowerTuft} from '../../parts/city/wild.js';
import {matcapRim} from '../../engine/look4.js';

const GOV = JSON.parse(readFileSync('cast/governor.json', 'utf8')).GOVERNOR;
test('Governor preset: R6 satin adult, kit names exist, no labels; 4 own faces resolve, the 24 v6 faces untouched', () => {
  assert.equal(GOV.body, 'v5'); assert.equal(GOV.rig, 'r6'); assert.equal(GOV.build, 'adult_m'); assert.equal(GOV.tool, 'megaphone'); assert.ok(!GOV.tag && !GOV.role);
  for (const a of GOV.accessories) assert.ok(GOV_ACCESSORIES[a], a);
  assert.deepEqual(GOV_HEAD, ['govHat', 'monocle', 'mustache']); assert.equal(FACE_NAMES6.length, 24);
  assert.deepEqual(GOV_FACES, ['gov_smug', 'gov_announce', 'gov_panic', 'gov_oops']); assert.deepEqual(GOV.expressions, GOV_FACES); assert.equal(GOV.face, 'gov_smug');
  for (const f of GOV_FACES) { assert.equal(name6(f), f); assert.ok(family6(f), f); assert.ok(faceItems6(f).length > 3, f);
    for (const o of [{}, {blink: true}, {talk: 0}, {talk: 2}]) assert.ok(fillColours6(f, o).length <= MAX_COLOURS, `${f} ${JSON.stringify(o)}`); }
  assert.ok(faceItems6('gov_panic').filter(i => i.role === 'water').length >= 2);   // sweat drops
  assert.ok(FACES_GOV.gov_announce.fills.some(([r]) => r === 'mouth'));
});
test('Governor monocle pops off; megaphone is an extend-grip tool', () => {
  const m = monocle(), lens = m.getObjectByName('monocleLens'), y0 = lens.position.y; m.userData.setPop(1);
  assert.ok(lens.position.y > y0 + .2 && lens.position.z > .6); m.userData.setPop(0); assert.ok(Math.abs(lens.position.y - y0) < 1e-9);
  assert.equal(megaphone().userData.grip, 'extend');
});
test('Governor acts: rope_pull / announce / panic_up have R6 keys, stay planted, reach their key', () => {
  assert.deepEqual(GOV_VERBS, ['rope_pull', 'announce', 'panic_up']);
  for (const n of GOV_VERBS) { assert.ok(VERBS[n] && R6KEYS[n], n); const D = timing(VERBS[n]).D;
    for (let t = 0; t <= D + .5; t += 1 / 24) { const s = sampleVerbR6(n, t).sample; assert.ok(Math.abs(lowestR6(s)) < .03, `${n}@${t}`); } }
  assert.ok(sampleVerbR6('rope_pull', .0).ch['rightShoulder.x'] > -1 && sampleVerbR6('rope_pull', .2).ch['rightShoulder.x'] < -100);   // reaches up, then yanks
  assert.ok(sampleVerbR6('announce', .8).ch['rightShoulder.x'] < -90); assert.ok(sampleVerbR6('panic_up', .8).ch['leftShoulder.z'] < -120);
});
test('clock kit (pure): dong swing decays, shockwave ≤ 1 s and grows, pop puff + sparks live POP.dur', () => {
  assert.equal(dongSwing(-.1), 0); assert.equal(dongSwing(DONG.dur + .1), 0); assert.ok(Math.abs(dongSwing(.2)) > 10); assert.ok(Math.abs(dongSwing(2.6)) < 4);
  assert.ok(DONG.wave.dur <= 1); assert.equal(shockAt(-.01), null); assert.equal(shockAt(DONG.wave.dur), null); assert.ok(shockAt(.6).r > shockAt(.2).r && shockAt(.6).alpha < shockAt(.2).alpha);
  assert.equal(puffAt(0, POP.dur), null); assert.ok(puffAt(0, .15).s > 0); assert.ok(puffAt(0, POP.swap).s > .3 * POP.radius * .6, 'puff is big at the swap');
  assert.ok(sparkAt(3, .5).opacity < sparkAt(3, .1).opacity + 1e-9); assert.ok(POP.swap < POP.dur / 2);
});
test('anchor lock: zone target + inZone; aimTo lands the point on the zone centre and keeps the camera position', () => {
  const z = [.56, .08, .76, .22]; assert.ok(Math.hypot(zoneTarget(z)[0] - .66, zoneTarget(z)[1] - .15) < 1e-9); assert.deepEqual(zoneTarget(z, [.9, .5], 'clamp'), [.76, .22]); assert.ok(inZone(z, [.6, .1])); assert.ok(!inZone(z, [.5, .1]));
  for (const [pos, look, P] of [[[0, 2, 10], [0, 2, 0], [3, 12, -20]], [[5, 1, 5], [-4, 3, -2], [-10, 30, -40]], [[0, 15, 30], [20, 0, -10], [0, 50, -60]]]) {
    const c = new T.PerspectiveCamera(50, 9 / 16, .1, 1000); c.position.set(...pos); c.lookAt(...look); c.updateMatrixWorld();
    const r = aimTo(c, P, zoneTarget(z)); assert.ok(r && Math.hypot(...r) < 2e-3, JSON.stringify(r)); assert.deepEqual(c.position.toArray(), pos); assert.ok(inZone(z, ndcOf(c, P)));
    const e = new T.Euler().setFromQuaternion(c.quaternion, 'YXZ'); assert.ok(Math.abs(e.z) < 1e-6, 'no roll'); }
});
test('bell crack follows the bell profile; flower tufts are 3D (stem + petals), ≤ 60 tris', () => {
  const prof = [[0, 0], [.55, 0], [.85, -.25], [.95, -.9], [1.1, -1.9], [1.45, -2.55], [1.95, -2.9]].map(([r, y]) => new T.Vector2(r, y));
  assert.ok(Math.abs(profR(prof, -1.9) - 1.1) < 1e-9 && profR(prof, -2.7) > 1.45); assert.equal(BELL_CRACK.ys.length, BELL_CRACK.phi.length);
  const {stems, petals} = flowerTuft(), tris = (stems.attributes.position.count + petals.attributes.position.count) / 3; assert.ok(tris <= 60, tris);
  stems.computeBoundingBox(); assert.ok(stems.boundingBox.max.y > .45, 'stems stand up'); petals.computeBoundingBox(); assert.ok(petals.boundingBox.max.y - petals.boundingBox.min.y > .05, 'petals are not flat on the ground');
});
test('night matcap rim brightens the sphere edge only; lift scales', () => {
  const n = 16, b = new Uint8Array(n * n * 4).fill(100), c = matcapRim(Uint8Array.from(b), n, {color: '#ffffff', k: .5, from: .6}, 1);
  const at = (x, y) => c[(y * n + x) * 4]; assert.equal(at(8, 8), 100); assert.ok(at(0, 8) > 150); assert.equal(at(0, 0), 100);   // centre untouched, edge lit, corner (off the sphere) untouched
  assert.equal(matcapRim(Uint8Array.from(b), n, null, 1.5)[0], 150);
});
