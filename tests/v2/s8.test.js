// npm run v2:test — Session 8 (Amendment A4): camera moves, terrain groundY, biome tables, hair v3 budgets + eye clearance.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleCamera, maxTargetSpeed, speedOk, catmull, droneBank, HERO_LOW, DRONE, SNAP_FRAMES, MOVES, SPEED_CAP} from '../../engine/camera.js';
import {heightFn, splatWeights, chunkPlan, buildTerrain} from '../../parts/terrain.js';
import {BIOMES, BIOME_NAMES, TREE_SPECIES, biome} from '../../parts/biomes.js';
import {PATTERNS, PATTERNS_V3, TILE} from '../../parts/materials.js';
import {PRESETS} from '../../engine/look.js';
import {treeGeometry, triCount} from '../../parts/vegetation.js';
import {depthMap} from '../../parts/water.js';

const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('A4 moves exist and are deterministic', () => {
  for (const m of ['drone', 'heroLow', 'snap', 'tiltUp']) assert.ok(MOVES.includes(m));
  const s = {move: 'drone', duration: 4, path: [[0, 20, 60], [10, 16, 20], [0, 12, -20], [-12, 10, -50]], from: {fov: 50}};
  assert.deepEqual(sampleCamera(s, 1.3), sampleCamera(s, 1.3));
});

test('drone flies its spline, starts and ends on the path, banks into turns (capped)', () => {
  const path = [[0, 20, 60], [20, 16, 20], [0, 12, -20], [-20, 10, -50]], s = {move: 'drone', duration: 4, path, from: {fov: 50}};
  assert.ok(d3(sampleCamera(s, 0).position, path[0]) < 1e-6); assert.ok(d3(sampleCamera(s, 4).position, path[3]) < 1e-6);
  assert.ok(d3(catmull(path, 1 / 3), path[1]) < 1e-6);   // passes through the control points
  let maxRoll = 0; for (let t = 0; t <= 4; t += .1) maxRoll = Math.max(maxRoll, Math.abs(sampleCamera(s, t).roll));
  assert.ok(maxRoll > .01 && maxRoll <= DRONE.bankDeg * Math.PI / 180 + 1e-9, String(maxRoll));
  const straight = [[0, 10, 30], [0, 10, 0], [0, 10, -30]]; assert.ok(Math.abs(droneBank(straight, .5)) < 1e-9);
});

test('heroLow clamps the camera to 0.6–1.2 above the ground with fov 60–70', () => {
  const s = {move: 'heroLow', duration: 3, ground: 4, from: {position: [0, 9, 10], target: [0, 7, 0], fov: 40}, to: {position: [0, 4.1, 8], target: [0, 7, 0], fov: 90}};
  for (let t = 0; t <= 3; t += .25) { const c = sampleCamera(s, t); const h = c.position[1] - 4; assert.ok(h >= HERO_LOW.minH - 1e-9 && h <= HERO_LOW.maxH + 1e-9); assert.ok(c.fov >= 60 && c.fov <= 70); assert.ok(c.target[1] > c.position[1]); }
});

test('snap punches in over 2 frames on the same axis, then holds; exempt from the speed cap', () => {
  const s = {move: 'snap', duration: 2, fps: 30, from: {position: [0, 10, 40], target: [0, 4, 0], fov: 50}, to: {position: [0, 4.6, 4], target: [0, 4, 0], fov: 40}};
  const c0 = sampleCamera(s, 0), c2 = sampleCamera(s, SNAP_FRAMES / 30), c9 = sampleCamera(s, 1.5);
  assert.ok(d3(c0.position, s.from.position) < 1e-6);
  const axis = p => { const d = [p[0], p[1] - 4, p[2]], l = Math.hypot(...d); return d.map(v => v / l); };
  for (const c of [c2, c9, sampleCamera(s, 1 / 30)]) assert.ok(d3(axis(c.position), axis(s.from.position)) < 1e-9);   // same axis
  assert.ok(near(d3(c2.position, [0, 4, 0]), d3(s.to.position, [0, 4, 0]), 1e-6)); assert.deepEqual(c2.position, c9.position);
  assert.ok(speedOk(s, () => ({}), 30));
});

test('tiltUp keeps the camera and raises the look from feet to sky under the speed cap', () => {
  const s = {move: 'tiltUp', duration: 5, ease: 'inOutSine', from: {position: [0, 2, 14], target: [0, .5, 0], fov: 55}, to: {position: [0, 2.6, 14], target: [0, 14, 0], fov: 55}};
  const a = sampleCamera(s, 0), b = sampleCamera(s, 5);
  assert.ok(d3(a.position, b.position) < 1); assert.ok(b.target[1] - a.target[1] > 10);
  assert.ok(maxTargetSpeed(s) <= SPEED_CAP, String(maxTargetSpeed(s)));
});

test('terrain: groundY is the control list evaluated in order; pads are exact, skirts and LOD plan', () => {
  const h = heightFn({seed: 3, controls: [{type: 'noise', amp: 2, scale: 20}, {type: 'hill', at: [0, 0], r: 30, h: 10}, {type: 'pad', x0: -5, x1: 5, z0: -5, z1: 5, y: 7, blend: 3}]});
  assert.equal(h(1.234, -2.5), h(1.234, -2.5)); assert.equal(h(0, 0), 7); assert.equal(h(4.9, -4.9), 7);
  assert.ok(Math.abs(h(80, 80)) <= 2.0001);   // only noise far away
  const slope = heightFn({controls: [{type: 'slope', dir: [0, -1], grade: .3, at: [0, 0]}]}); assert.ok(near(slope(5, -10), 3)); assert.ok(near(slope(-7, 10), -3));
  const river = heightFn({controls: [{type: 'river', points: [[-50, 0], [50, 0]], w: 10, depth: 2, bank: 4}]}); assert.ok(near(river(0, 0), -2)); assert.equal(river(0, 20), 0);
  const plan = chunkPlan({size: 400, chunk: 40, fine: 2, fullR: 60, focus: [[0, 0]]});
  assert.equal(plan.length, 100); assert.ok(plan.some(c => c.near) && plan.some(c => !c.near)); assert.ok(plan.filter(c => !c.near).every(c => c.step === 8));
  const g = buildTerrain({height: h, size: 80, chunk: 40, fine: 4, fullR: 20, focus: [[0, 0]], material: null});
  const m = g.children[0], p = m.geometry.attributes.position;
  for (let i = 0; i < 40; i++) { const y = p.getY(i), x = p.getX(i), z = p.getZ(i); if (y > -3) assert.ok(near(y, h(x, z), 1e-4)); }   // grid vertices lie on groundY
  let low = Infinity; for (let i = 0; i < p.count; i++) low = Math.min(low, p.getY(i)); assert.ok(low < -1, 'skirts hang below the surface');
  const [lo, rock, hi] = splatWeights(0, .3, {rockSlope: .78}); assert.ok(rock > .9 && near(lo + rock + hi, 1));
  const [lo2, , hi2] = splatWeights(60, 1, {highY: 40}); assert.ok(hi2 > .9 && lo2 < .1);
});

test('biome tables are complete and point at real patterns, sky presets and tree species', () => {
  assert.deepEqual(BIOME_NAMES, ['alpine', 'meadow', 'coast', 'desert', 'cave', 'cloudtop', 'suburb', 'downtown', 'nightfield']);
  const pats = new Set([...PATTERNS, ...PATTERNS_V3]);
  for (const [n, b] of Object.entries(BIOMES)) {
    assert.equal(b.terrain.layers.length, 3, n); for (const l of b.terrain.layers) assert.ok(pats.has(l.pattern), `${n}: ${l.pattern}`);
    assert.ok(PRESETS[b.sky], `${n}: sky ${b.sky}`); assert.ok(b.fog.color && b.fog.near < b.fog.far, n);
    for (const t of b.vegetation.trees) assert.ok(TREE_SPECIES.includes(t), `${n}: ${t}`);
    for (const k of ['grass', 'rock', 'snow', 'path', 'accent']) assert.match(b.palette[k], /^#[0-9a-f]{6}$/i);
  }
  for (const p of PATTERNS_V3) assert.ok(TILE[p] > 0, p);
  assert.equal(biome('alpine', {terrain: {highY: 80}}).terrain.highY, 80); assert.equal(biome('alpine', {terrain: {highY: 80}}).terrain.layers.length, 3);
});

test('trees ≤ 260 triangles each (A5); water depth map is shore 0 → deep 1', () => {
  for (const sp of TREE_SPECIES) { const g = treeGeometry(sp, 2); assert.ok(triCount(g.trunk) + triCount(g.leaves) <= 260, sp); assert.ok(g.leaves.index, sp + ' welded'); }   // A5: ≤ 260, smooth
  const dm = depthMap((x, z) => -Math.abs(x) / 5, {x0: -20, x1: 20, z0: -2, z1: 2, y: -1, res: 16, maxDepth: 2});
  assert.equal(dm[8], 0); assert.ok(dm[0] > .99);
});

// ---- B/C pure helpers ----------------------------------------------------------------------------------
import {landformRig, sampleLandform, LANDFORM_MAX_TRIS} from '../../parts/landform.js';
import {crowdMembers, memberAt, memberMatrices, memberPose, CROWD_MAX} from '../../engine/crowd.js';
import {uiState, checklistRows, UI_KINDS} from '../../engine/ruleui.js';
import {boltPath, lightningLevel, shockwave, trailSamples, particleState, PARTICLES, TYPES} from '../../engine/effects.js';

test('landform rig: named pivots, ≤ 12k triangles, terrain splat on every piece, pure poses', () => {
  const r = landformRig({material: null});
  for (const k of ['shoulder', 'eyelid', 'arm', 'hand', 'leg', 'foot']) assert.ok(r.pivots[k], k);
  assert.ok(r.triangles <= LANDFORM_MAX_TRIS, String(r.triangles));
  r.root.traverse(o => { if (o.isMesh && o.name !== 'eye') assert.ok(o.geometry.attributes.splat, 'splat'); });
  const a = sampleLandform([[0, 'sleep'], [2, 'open'], [4, 'reach']], 5.1), b = sampleLandform([[0, 'sleep'], [2, 'open'], [4, 'reach']], 5.1);
  assert.deepEqual(a, b); assert.ok(a.eyelid[0] < -1.3 && a.arm[0] < -.3);
  assert.equal(sampleLandform([[0, 'sleep']], 3).eyelid[0], 0);
});

test('crowds: ≤ 60 seeded members, panic runs along dir, matrices for every part', () => {
  const m = crowdMembers({count: 80, seed: 3, radius: 10}); assert.equal(m.length, CROWD_MAX);
  assert.deepEqual(crowdMembers({count: 5, seed: 3}), crowdMembers({count: 5, seed: 3}));
  for (const x of m) assert.ok(Math.hypot(x.x, x.z) <= 10 + 1e-9);
  const c = {mode: 'panic', dir: [1, 0], at: 2}, p0 = memberAt(m[0], c, 2), p1 = memberAt(m[0], c, 3);
  assert.ok(p1[0] - p0[0] > 2 && Math.abs(p1[2] - p0[2]) < 1e-9);
  const mm = memberMatrices(m[0], memberPose(m[0], 'lookUp', 1), [0, 0, 0]);
  for (const k of ['torso', 'head', 'hair', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'face']) assert.ok(mm[k], k);
});

test('rule UI: kinds, state + pop frames, checklist ticks in order', () => {
  for (const k of ['tag', 'stat', 'bar', 'icon', 'card', 'checklist', 'plate']) assert.ok(UI_KINDS.includes(k));
  assert.equal(uiState([[1, 'a'], [2, 'b']], .5), null);
  assert.deepEqual(uiState([[1, 'a'], [2, 'b']], 2.1), {value: ['b'], since: 3});
  assert.deepEqual(checklistRows(['x', 'y', 'z'], 2).map(r => r.done), [true, true, false]);
});

test('A4 effects: weather volumes loop inside their box, bolt, flicker, shockwave and trail are pure', () => {
  for (const p of ['rain', 'snow', 'ash', 'sand', 'fog', 'steam', 'mud', 'splash', 'starfall', 'leaves', 'rockfall']) assert.ok(PARTICLES.includes(p), p);
  for (const t of ['lightning', 'shockwave', 'weather', 'trail']) assert.ok(TYPES.includes(t), t);
  const e = {preset: 'snow', at: 0, dur: 10, area: [20, 10, 20]};
  for (let i = 0; i < 30; i++) for (const t of [1, 5.5, 9]) { const s = particleState(e, i, t); assert.ok(Math.abs(s.pos[1]) <= 5 + 1e-9 && Math.abs(s.pos[0]) <= 10 + 2 && Math.abs(s.pos[2]) <= 10 + 2); }
  assert.equal(particleState(e, 0, 11), null);
  const b = boltPath(4, [0, 50, 0], [0, 0, 0]); assert.deepEqual(b, boltPath(4, [0, 50, 0], [0, 0, 0])); assert.deepEqual(b[0][0], [0, 50, 0]); assert.deepEqual(b[0].at(-1), [0, 0, 0]);
  assert.equal(lightningLevel({at: 1}, 1), 1); assert.equal(lightningLevel({at: 1}, 1.5), 0);
  assert.ok(shockwave({at: 0, dur: 1, radius: 10}, .99).r > 9.5); assert.equal(shockwave({at: 0, dur: 1}, 1.2), null);
  const tr = trailSamples({at: 0, dur: 3, fade: 1}, 2, 5); assert.equal(tr[0].t, 2); assert.equal(tr[0].a, 1); assert.ok(tr.at(-1).a <= 1e-9);
});

// ---- G: hair v3 and the troupe -----------------------------------------------------------------------------
import {HAIR3_STYLES, HAIR3_BOYS, HAIR3_GIRLS, HAIR3_BUDGET, EYE_CLEAR, EYE_BAND, hair3Geometry, hair3Triangles} from '../../avatar-style/hair3.js';
import {HAIR_STYLES} from '../../avatar-style/hair.js';
import {resolveTroupe, SLOTS} from '../../engine/troupe.js';
import {readFileSync} from 'node:fs';

test('hair v3: 8 + 10 + 2 styles, budgets hero ≤ 600 / bg ≤ 80, never in the eye band, v2 presets untouched', () => {
  assert.equal(HAIR3_BOYS.length, 8); assert.equal(HAIR3_GIRLS.length, 10); assert.equal(HAIR3_STYLES.length, 20);
  assert.equal(HAIR_STYLES.length, 10);   // the v2 set stays for "Nobody"
  for (const s of HAIR3_STYLES) for (const tier of ['hero', 'bg']) {
    const g = hair3Geometry(s, tier, '#5a3a22'); assert.ok(hair3Triangles(g) <= HAIR3_BUDGET[tier], `${s} ${tier} ${hair3Triangles(g)}`);
    if (!g) { assert.equal(s, 'bald'); continue; }
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > .3 && Math.abs(p.getX(i)) < EYE_BAND) assert.ok(p.getY(i) >= EYE_CLEAR - 1e-6, `${s} ${tier} covers the eyes`);
  }
  assert.ok(hair3Triangles(hair3Geometry('long_layered', 'hero')) > hair3Triangles(hair3Geometry('buzz', 'hero')));
  assert.equal(hair3Geometry('wavy_bob', 'hero', '#123456'), hair3Geometry('wavy_bob', 'hero', '#123456'));   // cached + deterministic
});

test('troupe: five fixed slots + AFK; episodes re-costume but cannot change who a slot is', () => {
  const data = JSON.parse(readFileSync('cast/troupe.json', 'utf8'));
  assert.deepEqual(Object.keys(data.troupe), SLOTS);
  const want = {LEAD: 'messy_fringe', SECOND: 'long_layered', LITTLE: 'space_buns', RIVAL: 'quiff', ELDER: 'side_part'};
  for (const [k, h] of Object.entries(want)) { assert.equal(data.troupe[k].hair.style, h); assert.equal(data.troupe[k].hair.v, 4); assert.equal(data.troupe[k].expressions.length, 3); }
  assert.equal(data.troupe.LITTLE.scale, .62); assert.ok(data.troupe.RIVAL.scale > data.troupe.LEAD.scale);
  const kit = resolveTroupe({troupe: 'SECOND', role: 'Kit', outfit: {recipe: 'hoodie', main: '#111111'}, with: {skin: '#000000', scale: 3}}, data);
  assert.equal(kit.tag.name, 'Kit'); assert.equal(kit.outfit.main, '#111111'); assert.equal(kit.skin, data.troupe.SECOND.skin); assert.equal(kit.scale, .82);
  const afk = resolveTroupe({troupe: 'AFK', role: 'whatever'}, data);
  assert.equal(afk.opacity, .4); assert.equal(afk.tag, undefined, 'no AFK tag (owner rule §2c)'); assert.equal(afk.hair.style, 'buzz'); assert.equal(afk.outfit.recipe, 'classic'); assert.ok(afk.freeze > 0);
});
