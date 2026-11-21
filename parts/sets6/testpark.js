// parts/sets6/testpark.js — E1 world `testPark` (registered in parts/library6.json): our own open "ragdoll test park".
// An 80 × 120 plaza of pale concrete tiles (#D9D9D4, 8-stud grid lines #BDBDB8) in a bowl of low sage hills (#8FB38A) with
// pine clusters (vegetation.js conifers), a hazy pale-blue sky (#C9D8E4, own dome) and fog from 120 studs.
// Ground plan (north = −z, the usual camera looks north from the south end): spawn pad south (0, 42); dummy crowd area
// in the middle; giant fan west (−14, 18) blowing +x; two pools east (24, 18); launch tower north-west (−30, −22) with its
// slide down the west edge; boxing ring north-east (16, −20) with the sign wall behind it (16, −31); coaster along the
// north edge (track origin (−30, −46), loop at x 12); crates / barrels / benches south-east; stone watch tower south-west.
// Story state (world.setState): fanSpin (rpm, default 40), cart (pathT 0..1; default moves with t), padFlash (0..1),
// handOn (0|1), hand (pose name), handGrip (0..1), handY (studs), handX / handZ, handYaw (degrees), press (heal button 0..1).
// No labels (Season 1): the only text is the painted sign wall.
import * as T from 'three';
import {PROPS6, PARK, pm, fanAngle, TOWER_H} from '../props.js';
import {treeGeometry} from '../vegetation.js';

export const LAYER = {terrain: 0, plaza: .15, pad: .45, ring: 1.45};
export const PLAZA = {x0: -40, x1: 40, z0: -60, z1: 60, tile: 8};
// Every placed piece (world position, yaw degrees). Anchors are derived from these (pure, node-testable).
export const PLACES = {
  spawnPad: {at: [0, 0, 42], yaw: 0}, fan: {at: [-14, 0, 18], yaw: 90}, pool: {at: [24, 0, 18], yaw: 0},
  coaster: {at: [-30, 0, -46], yaw: 0}, ring: {at: [16, 0, -20], yaw: 0}, sign: {at: [16, 0, -31], yaw: 0},
  tower: {at: [-30, 0, -22], yaw: 0}, crates: {at: [28, 0, 46], yaw: -20}, barrels: {at: [34, 0, 38], yaw: 0},
  benches: {at: [36, 0, 8], yaw: -90}, watchTower: {at: [-32, 0, 47], yaw: 15}, healButton: {at: [3, 0, -12], yaw: 0},
};
const RING_HALF = 8.4, PAD_R = 6;
export function groundY(x, z) {
  const P = PLACES;
  if (Math.abs(x - P.ring.at[0]) <= RING_HALF && Math.abs(z - P.ring.at[2]) <= RING_HALF) return LAYER.ring;
  if (Math.hypot(x - P.spawnPad.at[0], z - P.spawnPad.at[2]) <= PAD_R) return LAYER.pad;
  if (x >= PLAZA.x0 && x <= PLAZA.x1 && z >= PLAZA.z0 && z <= PLAZA.z1) return LAYER.plaza;
  return hillHeight(x, z);
}
// Terrain (pure): a flat pad under the plaza blending into low hills; the outer ring rises to hide the terrain edge.
const HILLS = [[-95, -40, 45, 9], [-110, 60, 55, 11], [95, -70, 50, 10], [115, 40, 60, 12], [0, -120, 60, 13], [-60, -130, 50, 10], [70, -140, 55, 12],
  [-40, 125, 50, 8], [60, 130, 55, 9], [-170, -10, 70, 18], [175, 0, 75, 20], [0, 200, 80, 18], [0, -210, 90, 24], [-150, -160, 70, 20], [160, -150, 70, 22], [-150, 160, 70, 16], [160, 160, 70, 17]];
export function hillHeight(x, z) {
  const dx = Math.max(0, Math.abs(x) - 46), dz = Math.max(0, Math.abs(z) - 66), d = Math.hypot(dx, dz), w = Math.min(1, d / 30), blend = w * w * (3 - 2 * w);
  let h = 0; for (const [hx, hz, r, hh] of HILLS) { const q = Math.hypot(x - hx, z - hz) / r; if (q < 1) h += hh * (Math.cos(q * Math.PI) * .5 + .5); }
  h += 1.2 * Math.sin(x * .045 + 1.3) * Math.sin(z * .038 + .4) + .6 * Math.sin(x * .11 - z * .07);
  const rim = Math.max(0, Math.hypot(x, z) - 230) * .12;
  return blend * (h + rim);
}
const rot = (v, yaw) => { const a = yaw * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
const place = (k, local = [0, 0, 0]) => { const p = PLACES[k], r = rot(local, p.yaw); return [p.at[0] + r[0], p.at[1] + r[1], p.at[2] + r[2]]; };
// Sub-anchors (pure): name → {position, facing (degrees)}. y = the walkable surface there.
export function parkAnchors() {
  const A = {}, put = (n, p, facing = 0) => { A[n] = {position: [p[0], p[1] || groundY(p[0], p[2]), p[2]], facing}; };
  put('plaza', [0, 0, 8]); put('spawnPad', place('spawnPad')); put('fan', place('fan', [0, 0, 6]), 90); put('pool', place('pool'));
  put('coaster', place('coaster', [42, 0, 1.5])); put('ring', place('ring')); put('crates', place('crates', [0, 0, 3]));
  put('towerBase', place('tower', [4.4, 0, -4.6])); put('towerTop', place('tower', [0, TOWER_H, 0]));
  A.ring.position[1] = LAYER.ring; A.towerTop.position[1] = TOWER_H + LAYER.plaza;
  return A;
}
export const LOOK = () => ({fog: {color: PARK.sky, near: 120, far: 460, height: {amount: 0}}, envPreset: 'day', envIntensity: .45, cloudCover: .3});

function plazaTexture() {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); x.fillStyle = PARK.concrete; x.fillRect(0, 0, N, N);
  const img = x.getImageData(0, 0, N, N), d = img.data; let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < d.length; i += 4) { const k = (r() - .5) * 7; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
  x.putImageData(img, 0, 0); x.fillStyle = PARK.grid; const L = 3; x.fillRect(0, 0, N, L); x.fillRect(0, N - L, N, L); x.fillRect(0, 0, L, N); x.fillRect(N - L, 0, L, N);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set((PLAZA.x1 - PLAZA.x0) / PLAZA.tile, (PLAZA.z1 - PLAZA.z0) / PLAZA.tile); t.anisotropy = 4; return t;
}
function skyDome() {
  const m = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, fog: false, uniforms: {top: {value: new T.Color('#A9C1D6')}, horizon: {value: new T.Color(PARK.sky)}},
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vd; void main(){ float h = clamp(vd.y, 0., 1.); gl_FragColor = vec4(mix(horizon, top, pow(h, .6)), 1.);\n#include <colorspace_fragment>\n}'});
  const s = new T.Mesh(new T.SphereGeometry(700, 32, 16), m); s.name = 'parkSky'; s.renderOrder = -10; s.frustumCulled = false; return s;
}
function pines(rng) {
  const near = treeGeometry('conifer', 3), far = treeGeometry('conifer', 3, {lod: 'far'}), list = [];
  for (let c = 0; c < 34; c++) { const a = rng() * Math.PI * 2, r = 70 + rng() * 170, cx = Math.sin(a) * r, cz = Math.cos(a) * r;
    if (Math.abs(cx) < 56 && Math.abs(cz) < 76) continue;
    const n = 4 + Math.floor(rng() * 6); for (let i = 0; i < n; i++) { const x = cx + (rng() - .5) * 18, z = cz + (rng() - .5) * 18; if (Math.abs(x) < 52 && Math.abs(z) < 72) continue; list.push({x, z, s: .9 + rng() * .8, ry: rng() * 6.28, far: Math.hypot(x, z) > 110}); } }
  const g = new T.Group(); g.name = 'pines'; const bark = new T.MeshLambertMaterial({vertexColors: true}), leaf = new T.MeshLambertMaterial({vertexColors: true});
  for (const lod of [false, true]) { const L = list.filter(p => p.far === lod), G = lod ? far : near; if (!L.length) continue;
    for (const [geo, m, cast] of [[G.trunk, bark, false], [G.leaves, leaf, !lod]]) { const im = new T.InstancedMesh(geo, m, L.length), M = new T.Matrix4(), q = new T.Quaternion();
      L.forEach((p, i) => { q.setFromAxisAngle(new T.Vector3(0, 1, 0), p.ry); M.compose(new T.Vector3(p.x, hillHeight(p.x, p.z) - .3, p.z), q, new T.Vector3(p.s, p.s * 1.15, p.s)); im.setMatrixAt(i, M); });
      im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); im.name = 'pine' + (lod ? 'Far' : 'Near'); g.add(im); } }
  g.userData.count = list.length; return g;
}

export function build(scene, {B, TR, look, spec}) {
  const R = B.rng(21), statics = new T.Group(); statics.name = 'testPark';
  if (look?.sky) look.sky.visible = false;
  const sky = skyDome(); scene.add(sky);
  scene.add(TR.buildTerrain({height: hillHeight, size: 720, chunk: 60, fine: 4, fullR: 70, focus: [[0, 0]], material: pm(PARK.sage, {rough: .95}), name: 'parkHills'}));
  scene.add(pines(R));
  // plaza slab (top at LAYER.plaza), tiled
  const slab = new T.Mesh(new T.BoxGeometry(PLAZA.x1 - PLAZA.x0, .65, PLAZA.z1 - PLAZA.z0), [pm('#C9C9C4', {rough: .9}), pm('#C9C9C4', {rough: .9}), new T.MeshStandardMaterial({map: plazaTexture(), roughness: .88}), pm('#C9C9C4', {rough: .9}), pm('#C9C9C4', {rough: .9}), pm('#C9C9C4', {rough: .9})]);
  slab.position.set(0, LAYER.plaza - .325, 0); slab.receiveShadow = true; slab.name = 'plaza'; scene.add(slab);
  const put = (k, obj, local = [0, 0, 0]) => { const p = place(k, local); obj.position.set(p[0], (p[1] || 0) + (k === 'coaster' ? 0 : LAYER.plaza), p[2]); obj.rotation.y = PLACES[k].yaw * Math.PI / 180; return obj; };
  const live = {};
  statics.add(put('tower', PROPS6.launchTower()));
  statics.add(put('ring', PROPS6.boxingRing())); statics.add(put('sign', PROPS6.wallSign({base: 5})));
  statics.add(put('pool', PROPS6.pool())); statics.add(put('crates', PROPS6.crates())); statics.add(put('barrels', PROPS6.redBarrels()));
  statics.add(put('benches', PROPS6.benches({n: 4}))); statics.add(put('watchTower', PROPS6.watchTower()));
  const track = PROPS6.coasterTrack(); put('coaster', track); track.position.y = LAYER.plaza; statics.add(track);
  scene.add(B.mergeByDistrict(statics, 40));
  live.fan = put('fan', PROPS6.giantFan()); scene.add(live.fan);
  live.pad = put('spawnPad', PROPS6.spawnPad()); scene.add(live.pad);
  live.heal = put('healButton', PROPS6.healButton()); scene.add(live.heal);
  const cartHolder = new T.Group(); cartHolder.name = 'cartHolder'; put('coaster', cartHolder); cartHolder.position.y = LAYER.plaza; scene.add(cartHolder);
  live.cart = PROPS6.coasterCart(); cartHolder.add(live.cart);
  live.hand = PROPS6.giantHand(); live.hand.name = 'giantHand'; live.hand.visible = false; scene.add(live.hand);
  const anchors = parkAnchors();
  const S = {fanSpin: 40, cart: null, padFlash: 0, handOn: 0, hand: 'open', handGrip: 0, handY: 24, handX: 0, handZ: 10, handYaw: 0, press: 0};
  let T0 = 0;   // the renderer calls update(t) before setState (applyWorldState), so a state change re-applies at once
  const apply = t => {
    live.fan.userData.set({spin: fanAngle(t, S.fanSpin)});
    live.cart.userData.set({pathT: S.cart ?? ((t * .045) % 1)});
    live.pad.userData.set({flash: S.padFlash});
    live.heal.userData.set({press: S.press});
    const h = live.hand; h.visible = !!S.handOn; if (h.visible) { h.userData.set({pose: S.hand, grip: S.handGrip}); h.position.set(S.handX, S.handY, S.handZ); h.rotation.set(0, 0, 0); h.rotateY(S.handYaw * Math.PI / 180); h.rotateX(Math.PI / 2 - .35); }   // fingers down toward the plaza, tilted toward the south camera
  };
  return {anchors, groundY, places: PLACES,
    setState(k, v) { if (k in S && S[k] !== v) { S[k] = v; apply(T0); } },
    onCamera(p) { sky.position.set(p[0], 0, p[2]); },
    update(t) { T0 = t; apply(t); }};
}
