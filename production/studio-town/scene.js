// Studio V2 town kit review: a street set and the Dice Town plaza set, built
// only from studio/town/kit.js modules, cast presets and seeded crowd extras.
import * as T from 'three';
import * as K from '../../studio/town/kit.js';
import {createCharacter, createExtra, setExpression} from '../../studio/characters/characters.js';
import {applyStudioLook} from '../../studio/lookdev/look.js';
import {makeDie, topQuaternion, supportY} from '../dice-town-p4b1/die.js';

const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.setSize(1080, 1920); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 9 / 16, .1, 400);
scene.add(new T.HemisphereLight(0xc5e3f1, 0x756a55, 1.7));
const key = new T.DirectionalLight(0xffd6a0, 3.6); key.castShadow = true;
key.shadow.mapSize.set(4096, 4096); Object.assign(key.shadow.camera, {left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160}); key.shadow.bias = -.0005; key.shadow.normalBias = .03;
scene.add(key, key.target);
const fill = new T.DirectionalLight(0xffe8c9, 2.0); fill.position.set(-30, 25, 20); scene.add(fill);
const place = (o, x, z, ry = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };

scene.add(K.grassField({w: 700, d: 400}));
// ---------------- Street set (x around 0) ----------------
place(K.street({len: 150, crossings: [-8]}), 0, 0);
const facades = [
  K.shopFront({text: 'BAKERY', wall: 'brick', color: '#d9785a', awningColors: ['#e2483d', '#fff4e6'], signBg: '#2f6f8f'}),
  K.house({color: '#8fc6e8', roofColor: '#c1543f', door: '#e4574a'}),
  K.shopFront({text: 'RECORDS', wall: 'plaster', color: '#f2c14e', awningColors: ['#2f80d1', '#ffffff'], signBg: '#e2483d', shutter: '#2f80d1', w: 15}),
  K.clockTower({}),
  K.shopFront({text: 'CAFE', wall: 'siding', color: '#7fc8a9', awningColors: ['#f39c34', '#fff4e6'], signBg: '#6b3f2a', shutter: '#d9785a', w: 15}),
  K.house({color: '#f4a7b9', roofColor: '#5a6fb0', door: '#2f6f8f', shutter: '#ffffff'}),
  K.shopFront({text: 'TOYS', wall: 'brick', color: '#6fa8dc', awningColors: ['#ffd23f', '#e2483d'], signBg: '#ffd23f', signFg: '#2b2b2b', shutter: '#e2483d'}),
];
const widths = [16, 14, 15, 9, 15, 14, 16];
let x = -62;
facades.forEach((f, i) => { place(f, x + widths[i] / 2, -12.95); x += widths[i] + 1.2; });
// Opposite row (seen in reverse shots), facing the street.
place(K.shopFront({text: 'BOOKS', wall: 'plaster', color: '#c9a0dc', awningColors: ['#46a85a', '#fff4e6'], signBg: '#46a85a'}), -30, 12.95, Math.PI);
place(K.house({color: '#ffd59e', roofColor: '#2f6f8f'}), -14, 12.95, Math.PI);
// Skyline layer for depth.
[[-70, 26, '#bcd7ea'], [-56, 34, '#cfe0c7'], [-40, 22, '#f1d6b8'], [-24, 38, '#c9d2ee'], [-8, 28, '#e8c8d6'], [8, 32, '#bfe3df'], [24, 24, '#f0e2b6'], [40, 36, '#cdd9f0'], [56, 27, '#e2d1f0']]
  .forEach(([sx, h, c], i) => place(K.skylineBlock({w: 13, h, color: c}), sx, -48 - (i % 2) * 8));
// Sidewalk dressing: lamps, trees, benches, planters, hydrant, stall.
for (let lx = -60; lx <= 60; lx += 15) { place(K.lampPost({}), lx, -7.6); place(K.lampPost({}), lx + 7, 7.6); }
for (const [tx, ty] of [[-52, -1], [-37, 1], [-24, -1], [3, 1], [20, -1], [37, 1]]) place(K.tree({h: 8 + ty, seed: tx & 3}), tx, -9.6);
for (const tx of [-44, -18, 12, 30]) place(K.tree({h: 9, seed: 2, leaf: '#6cc04a'}), tx, 10);
place(K.bench({}), -27, -10.6); place(K.bench({color: '#4a90c2'}), 8, -10.6);
place(K.hydrant(), -9.5, -7.6); place(K.marketStall({}), 26, -9.4);
for (const bx of [-48, -33, 16, 44]) place(K.bush({}), bx, -11.8);

// ---------------- Plaza set (x around 220) ----------------
const P = new T.Vector3(220, 0, 0);
const plazaGroup = place(K.plaza({r: 19}), P.x, P.z);
const ring = [
  [K.shopFront({text: 'RECORDS', wall: 'plaster', color: '#f2c14e', awningColors: ['#2f80d1', '#ffffff'], signBg: '#e2483d', w: 15}), 150],
  [K.clockTower({}), 180],
  [K.shopFront({text: 'MARKET', wall: 'brick', color: '#d9785a', awningColors: ['#46a85a', '#fff4e6'], signBg: '#46a85a'}), 210],
  [K.house({color: '#8fc6e8', roofColor: '#c1543f'}), 236],
  [K.shopFront({text: 'BAKERY', wall: 'siding', color: '#7fc8a9', awningColors: ['#f39c34', '#fff4e6'], signBg: '#6b3f2a', w: 15}), 124],
  [K.house({color: '#f4a7b9', roofColor: '#5a6fb0', door: '#2f6f8f'}), 98],
];
for (const [f, deg] of ring) { const a = deg * Math.PI / 180, r = 27; place(f, P.x + Math.sin(a) * r, P.z + Math.cos(a) * r, a + Math.PI); }
const {group: die, body: dieBody} = makeDie(); die.quaternion.copy(topQuaternion(3)); die.position.set(P.x - 1, supportY(dieBody, die.quaternion, .3), P.z - 1); scene.add(die);
for (const [deg, r, h] of [[60, 21, 9], [300, 22, 8], [110, 20, 8], [250, 21, 9]]) { const a = deg * Math.PI / 180; place(K.tree({h, seed: deg & 3}), P.x + Math.sin(a) * r, P.z + Math.cos(a) * r); }
for (const deg of [40, 80, 280, 320]) { const a = deg * Math.PI / 180; place(K.lampPost({}), P.x + Math.sin(a) * 17, P.z + Math.cos(a) * 17); }
place(K.marketStall({canopy: ['#e2483d', '#fff4e6']}), P.x - 13, P.z - 8, .6); place(K.marketStall({}), P.x + 12, P.z - 10, -.5);
place(K.bench({}), P.x + 14, P.z + 6, -1.2); place(K.fountain(), P.x - 12, P.z + 9);
[[-60, 30, '#bcd7ea'], [-35, 38, '#cfe0c7'], [-10, 26, '#f1d6b8'], [15, 36, '#c9d2ee'], [40, 30, '#e8c8d6'], [62, 34, '#bfe3df']].forEach(([sx, h, c]) => place(K.skylineBlock({w: 14, h, color: c}), P.x + sx, P.z - 62));

// ---------------- People ----------------
const cast = {leo: createCharacter('leo'), pip: createCharacter('pip'), mother: createCharacter('mother')};
for (const a of Object.values(cast)) scene.add(a.root);
const extras = Array.from({length: 22}, (_, i) => { const e = createExtra(i + 3); scene.add(e.root); return e; });
function pose(a, seed) {
  for (const p of Object.values(a.pivots)) p.rotation.set(0, 0, 0);
  const r = n => Math.sin(seed * 12.9898 + n * 78.233) * .5 + .5;
  a.pivots.leftShoulder.rotation.set((r(1) - .5) * .5, 0, -.05 - r(2) * .15); a.pivots.rightShoulder.rotation.set((r(3) - .5) * .5, 0, .05 + r(4) * .15);
  a.pivots.leftHip.rotation.x = (r(5) - .5) * .3; a.pivots.rightHip.rotation.x = -a.pivots.leftHip.rotation.x;
  a.pivots.head.rotation.set((r(6) - .5) * .15, (r(7) - .5) * .5, 0);
}
const STREET_SPOTS = [[-52, -9, .3], [-46, -10.5, 2.6], [-40, -8.5, -.4], [-30, -9.5, 1.2], [-24, 9.5, 3.4], [-27, -10.4, .8], [-4, -8.8, -1.2], [2, -10.5, 2.2], [10, 9, 3.0], [18, -9.2, -.6], [22, -10.6, .4], [34, -9, 1.6]];
const PLAZA_SPOTS = [[-9, 6, .9], [-6, 11, 2.8], [16, 12, -.6], [13, -1, -1.4], [-12, -2, 1.6], [12, -5, -1.8], [-4, -9, .2], [6, -11, -.3], [-15, 5, 1.2], [-17, 10, 2.2]];
function stage(set) {
  for (const e of extras) e.root.visible = false;
  const spots = set === 'street' ? STREET_SPOTS : PLAZA_SPOTS, off = set === 'street' ? new T.Vector3() : P;
  spots.forEach(([sx, sz, ry], i) => { const e = extras[i + (set === 'street' ? 0 : 12)]; e.root.visible = true; e.root.position.set(off.x + sx, set === 'street' ? .35 : .3, off.z + sz); e.root.rotation.y = ry; pose(e, i + 1); });
  const {leo, pip, mother} = cast; for (const a of [leo, pip, mother]) pose(a, 0);
  if (set === 'street') {
    leo.root.position.set(-14, .35, -9.2); leo.root.rotation.y = .5; pip.root.position.set(-11.6, .35, -8.6); pip.root.rotation.y = -.35;
    mother.root.position.set(-35, .35, -10.2); mother.root.rotation.y = .3;
    pip.pivots.rightShoulder.rotation.set(-.2, 0, 2.6); setExpression(leo, 'curious'); setExpression(pip, 'excited'); setExpression(mother, 'pleased');
  } else {
    leo.root.position.set(P.x + 4.8, .3, P.z + 4); leo.root.rotation.y = .35; pip.root.position.set(P.x - 7, .3, P.z + 3); pip.root.rotation.y = .6;
    mother.root.position.set(P.x + 40, 0, P.z + 40); setExpression(leo, 'shocked'); setExpression(pip, 'nervous');
  }
  key.target.position.copy(off); key.position.copy(off).add(new T.Vector3(30, 50, 36));
}
const look = applyStudioLook({scene, camera, renderer});

const SHOTS = {
  street_wide() { stage('street'); camera.fov = 52; camera.position.set(-48, 10, 4.5); camera.lookAt(-14, 6.5, -12); return {focus: null}; },
  street_mid() { stage('street'); camera.fov = 34; camera.position.set(-5.5, 5.4, 4); camera.lookAt(-13.2, 4.3, -9.6); return {focus: cast.leo.parts.head.getWorldPosition(new T.Vector3()), close: true}; },
  plaza_wide() { stage('plaza'); camera.fov = 57; camera.position.set(P.x + 10, 11, P.z + 27); camera.lookAt(P.x - 2, 4.5, P.z - 2); return {focus: null}; },
  plaza_low() { stage('plaza'); camera.fov = 40; camera.position.set(P.x + 9, 3.2, P.z + 14); camera.lookAt(P.x + 3, 5.5, P.z + 1); return {focus: cast.leo.parts.head.getWorldPosition(new T.Vector3()), close: true}; },
};
function render(shot, width = 1080, height = Math.round(width * 16 / 9)) {
  const t0 = performance.now();
  renderer.setSize(width, height); camera.aspect = width / height;
  const {focus, close} = SHOTS[shot](); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  look.render(focus, close);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  let tris = 0; scene.traverse(o => { if (o.isMesh && o.visible) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return {shot, width, height, ms: performance.now() - t0, sceneTriangles: tris};
}
// Internals are exposed so the sequence page can animate this exact set.
window.__town = {render, shots: Object.keys(SHOTS), scene, camera, renderer, cast, extras, key, P, look, die, dieBody, stage, pose};
