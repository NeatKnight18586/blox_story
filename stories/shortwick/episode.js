// Shortwick — "In this town, every lie makes you shorter." (Episode 2)
// Episode spec for production/episode/?ep=shortwick. Above the SHOTS marker: sets,
// cast and helpers (changing them re-renders every shot). Below it: one entry per
// shot, anchored to a narration phrase (changing one re-renders only that shot).
import * as T from 'three';
import * as K from '../../studio/town/kit.js';
import * as PR from '../../studio/town/props.js';
import {createCustom, createExtra, setExpression} from '../../studio/characters/characters.js';
import {locomote, idle, ease, lerp, onTwos} from '../../studio/motion/r6.js';
import {act, talk, shiver, faceAt} from '../../studio/motion/acting.js';
import {clouds, birds, rain} from '../../studio/director/world.js';
import {flatMaterial, paintedMaterial} from '../../studio/town/materials.js';
import {easeOutBack} from '../../studio/director/camera.js';

const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
// Set origins, far apart so each set has its own light and horizon.
export const P = V(0, 0, 0), S = V(500, 0, 0), N = V(900, 0, 0), Q = V(1400, 0, 0), C = V(2000, 0, 0), B = V(2400, 0, 0);
export const tail = 2.2;

// ---------------- Cast: new for this episode ----------------
const CAST = {
  wren: {scale: 1.2, skin: '#f2d0b0', top: '#f4f1ea', accent: '#e2483d', torso: 'tee', sleeves: 'long', legs: {cloth: '#3e6fb0', shoe: '#e2483d'}, hair: {option: 'long_red', color: '#c8692a'}, props: []},
  bo: {scale: .58, skin: '#f2d0b0', top: '#7fb0e8', accent: '#ffffff', torso: 'stripe', sleeves: 'long', legs: {cloth: '#7fb0e8', shoe: '#f4f1ea', legLength: .52}, hair: {option: 'messy_brown', color: '#c8692a'}, props: []},
  nan: {scale: .11, skin: '#e0a882', top: '#c94f7c', torso: 'mother', sleeves: 'long', legs: {cloth: '#6b5a8a', shoe: '#5a3b2c'}, hair: {option: 'bun_red', color: '#d9d4cc'}, props: ['glasses']},
  mayor: {scale: .34, skin: '#eab892', top: '#2b2f3a', accent: '#f2b632', torso: 'tee', sleeves: 'long', legs: {cloth: '#2b2f3a', shoe: '#111111'}, hair: {option: 'swept_blue', color: '#7a7a80'}, props: []},
  fisher: {scale: .84, skin: '#cc8e69', top: '#f2b632', accent: '#2f6f8f', torso: 'hoodie', sleeves: 'long', legs: {cloth: '#2f5a92', shoe: '#2b2b2b'}, hair: {option: 'messy_brown', color: '#4a2c1e'}, props: []},
  sales: {scale: .14, skin: '#eab892', top: '#e2483d', accent: '#ffffff', torso: 'stripe', sleeves: 'short', legs: {cloth: '#3b3f45', shoe: '#f2f2f2'}, hair: {option: 'swept_blue', color: '#2a2a30'}, props: []},
  teacher: {scale: .85, skin: '#cc8e69', top: '#46a85a', torso: 'mother', sleeves: 'long', legs: {cloth: '#4c5a78', shoe: '#5a3b2c'}, hair: {option: 'bun_pink', color: '#3a2418'}, props: ['glasses']},
  pell: {scale: 1, skin: '#e0a882', top: '#8a6a4a', torso: 'mother', sleeves: 'long', legs: {cloth: '#5a5d63', shoe: '#3b2a22'}, hair: {option: 'messy_brown', color: '#d9d4cc'}, props: []},
  boy: {scale: .44, skin: '#a0694a', top: '#e2483d', accent: '#ffffff', torso: 'hoodie', sleeves: 'long', legs: {cloth: '#2f5a92', shoe: '#ffd23f', legLength: .52}, hair: {option: 'spiky_blonde', color: '#2a2a30'}, props: []},
  baker: {scale: .9, skin: '#cc8e69', top: '#ffffff', accent: '#e9a64b', torso: 'stripe', sleeves: 'short', legs: {cloth: '#3e6fb0', shoe: '#6b4428'}, hair: {option: 'messy_brown', color: '#3a2418'}, props: []},
  gossipA: {scale: .72, skin: '#eab892', top: '#9b59b6', accent: '#ffd23f', torso: 'tee', sleeves: 'short', legs: {cloth: '#3b3f45', shoe: '#e2483d'}, hair: {option: 'long_blonde'}, props: []},
  gossipB: {scale: .8, skin: '#7c4a32', top: '#1fb5a8', accent: '#ffffff', torso: 'stripe', sleeves: 'long', legs: {cloth: '#c9a46a', shoe: '#5a3b2c'}, hair: {option: 'ponytail_black'}, props: []},
  liar: {scale: .95, skin: '#e0a882', top: '#2f80d1', accent: '#ffffff', torso: 'tee', sleeves: 'short', legs: {cloth: '#3b3f45', shoe: '#2b2b2b'}, hair: {option: 'spiky_blonde', color: '#8a5528'}, props: []},
  girl: {scale: .5, skin: '#f2d0b0', top: '#ff7aa8', accent: '#ffffff', torso: 'tee', sleeves: 'short', legs: {cloth: '#7a4fa0', shoe: '#ffffff', legLength: .52, sock: '#ffffff'}, hair: {option: 'ponytail_black', color: '#5a3420'}, props: []},
};

// Wren's loose cardigan and shoes: shells parented to her limbs that keep her
// original size when she shrinks, so sleeves slide past her fingers and shoes go loose.
function outerLayer(a) {
  const yarn = flatMaterial('#e9a64b'), cuff = flatMaterial('#d18a2e');
  const front = paintedMaterial(128, 128, (g, W, H) => { g.fillStyle = '#e9a64b'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4f1ea'; g.fillRect(W * .38, 0, W * .24, H * .9); g.fillStyle = '#d18a2e'; g.fillRect(0, H * .88, W, H * .12); for (const y of [.3, .5, .7]) { g.beginPath(); g.arc(W * .35, H * y, 4, 0, 7); g.fill(); } });
  const mk = (geo, mats, parent, name) => { const m = new T.Mesh(geo, mats); m.name = name; m.castShadow = true; parent.add(m); return m; };
  const L = {torso: mk(new T.BoxGeometry(2.1, 2.06, 1.1), [yarn, yarn, yarn, yarn, front, yarn], a.parts.torso, 'cardigan_body'), arms: [], shoes: []};
  for (const side of ['left', 'right']) {
    const s = mk(new T.BoxGeometry(1.06, 2.0, 1.06), yarn, a.parts[side + 'Arm'], 'cardigan_sleeve'); mk(new T.BoxGeometry(1.08, .22, 1.08), cuff, s, 'cuff').position.y = -.9; L.arms.push(s);
    const shoe = mk(new T.BoxGeometry(1.04, .5, 1.22), flatMaterial('#e2483d'), a.parts[side + 'Leg'], 'loose_shoe'); mk(new T.BoxGeometry(1.06, .12, 1.24), flatMaterial('#f4f1ea'), shoe, 'sole').position.y = -.2; L.shoes.push(shoe);
  }
  // k = original scale / current scale (1 = fits).
  L.set = (k = 1, on = true, slip = 0) => {
    for (const m of [L.torso, ...L.arms, ...L.shoes]) m.visible = on;
    L.torso.scale.setScalar(k); L.torso.position.y = 1.03 - 1.03 * k;
    for (const s of L.arms) { s.scale.setScalar(k); s.position.y = 1.0 - 1.0 * k; }
    for (const s of L.shoes) { s.scale.setScalar(k); s.position.set(0, -1 + .25 * k - slip, .06 * k); }
  };
  L.set(1); return L;
}
function topHat(a) {
  const g = new T.Group(); g.name = 'top_hat'; const m = flatMaterial('#1c1c22'), band = flatMaterial('#c23a22');
  const brim = new T.Mesh(new T.CylinderGeometry(.85, .85, .08, 20), m); brim.position.y = 1.2; g.add(brim);
  const crown = new T.Mesh(new T.CylinderGeometry(.55, .58, 1.1, 20), m); crown.position.y = 1.78; g.add(crown);
  const b = new T.Mesh(new T.CylinderGeometry(.585, .59, .2, 20), band); b.position.y = 1.35; g.add(b);
  a.pivots.head.add(g);
}

export async function build(W) {
  const {scene, camera} = W;
  const add = (o, at, x, z, ry = 0, y = 0) => { o.position.set(at.x + x, at.y + y, at.z + z); o.rotation.y = ry; scene.add(o); return o; };

  // ---------- Plaza (P): podium, banner, potholed road ----------
  add(K.grassField({w: 360, d: 300}), P, 0, 0);
  add(K.plaza({r: 19}), P, 0, 0);
  const ring = [[K.shopFront({text: 'TOYS', wall: 'plaster', color: '#f2c14e', awningColors: ['#2f80d1', '#ffffff'], signBg: '#e2483d', w: 15}), 150],
    [K.clockTower({}), 180], [K.shopFront({text: 'MARKET', wall: 'brick', color: '#d9785a', awningColors: ['#46a85a', '#fff4e6'], signBg: '#46a85a'}), 210],
    [K.house({color: '#8fc6e8', roofColor: '#c1543f'}), 236], [K.shopFront({text: 'CAFE', wall: 'siding', color: '#7fc8a9', awningColors: ['#f39c34', '#fff4e6'], signBg: '#6b3f2a', w: 15}), 124],
    [K.house({color: '#f4a7b9', roofColor: '#5a6fb0', door: '#2f6f8f'}), 98], [K.house({color: '#ffd59e', roofColor: '#2f6f8f'}), 262]];
  for (const [f, deg] of ring) { const a = deg * Math.PI / 180; add(f, P, Math.sin(a) * 27, Math.cos(a) * 27, a + Math.PI); }
  for (const [deg, r, h] of [[60, 21, 9], [300, 22, 8], [110, 20, 8], [250, 21, 9]]) { const a = deg * Math.PI / 180; add(K.tree({h, seed: deg & 3}), P, Math.sin(a) * r, Math.cos(a) * r); }
  for (const deg of [40, 80, 280, 320]) { const a = deg * Math.PI / 180; add(K.lampPost({}), P, Math.sin(a) * 17, Math.cos(a) * 17); }
  add(K.fountain(), P, -12, 9); const plazaBench = add(K.bench({color: '#4a90c2'}), P, 13, 7, -1.2); add(K.marketStall({canopy: ['#e2483d', '#fff4e6']}), P, -13, -8, .6);
  [[-60, 30, '#bcd7ea'], [-35, 38, '#cfe0c7'], [-10, 26, '#f1d6b8'], [15, 36, '#c9d2ee'], [40, 30, '#e8c8d6'], [62, 34, '#bfe3df']].forEach(([x, h, c]) => add(K.skylineBlock({w: 14, h, color: c}), P, x, -62));
  add(PR.banner('WELCOME TO SHORTWICK', {w: 18}), P, 0, 22);
  const podium = add(PR.podium({text: 'MAYOR'}), P, 2, -6);
  const stack = add(PR.bookStack({n: 7, seed: 2}), P, 2, -7.7);
  const road = add(K.street({len: 70, crossings: []}), P, 0, 56, Math.PI / 2);
  const holes = [[1.5, 34, 1.4], [-2.2, 40, 1.1], [2.6, 47, 1.6], [-1, 53, 1.2]].map(([x, z, r]) => add(PR.pothole({r}), P, x, z));
  const oldSigns = [add(PR.signBoard('ROADS FIXED SOON!', {w: 4.4}), P, 6.2, 37, -.5), add(PR.signBoard('ROADS FIXED VERY SOON!', {w: 5.2, bg: '#ffd23f'}), P, 7.6, 39.5, -.3)];
  oldSigns[0].rotation.z = .22; oldSigns[1].rotation.z = -.12;

  // ---------- Main street (S): shops, cart lot ----------
  add(K.grassField({w: 360, d: 300}), S, 0, 0);
  add(K.street({len: 160, crossings: [-8]}), S, 0, 0);
  const facades = [K.shopFront({text: 'BOOKS', wall: 'plaster', color: '#c9a0dc', awningColors: ['#46a85a', '#fff4e6'], signBg: '#46a85a'}),
    K.house({color: '#8fc6e8', roofColor: '#c1543f', door: '#e4574a'}), K.shopFront({text: 'HATS', wall: 'brick', color: '#6fa8dc', awningColors: ['#ffd23f', '#e2483d'], signBg: '#ffd23f', signFg: '#2b2b2b', shutter: '#e2483d'}),
    K.clockTower({roofColor: '#c1543f'}), K.shopFront({text: 'USED CARTS', wall: 'siding', color: '#f2c14e', awningColors: ['#e2483d', '#ffffff'], signBg: '#e2483d', w: 18}),
    K.house({color: '#f4a7b9', roofColor: '#5a6fb0', door: '#2f6f8f', shutter: '#ffffff'}), K.shopFront({text: 'CAFE', wall: 'siding', color: '#7fc8a9', awningColors: ['#f39c34', '#fff4e6'], signBg: '#6b3f2a', w: 15})];
  const widths = [16, 14, 15, 9, 18, 14, 15]; let fx = -62;
  facades.forEach((f, i) => { add(f, S, fx + widths[i] / 2, -12.95); fx += widths[i] + 1.2; });
  add(K.shopFront({text: 'FLOWERS', wall: 'plaster', color: '#ffd59e', awningColors: ['#ff6fa1', '#fff4e6'], signBg: '#ff6fa1'}), S, -30, 12.95, Math.PI);
  add(K.house({color: '#bfe3df', roofColor: '#2f6f8f'}), S, -12, 12.95, Math.PI); add(K.house({color: '#f1d6b8', roofColor: '#c1543f'}), S, 6, 12.95, Math.PI);
  [[-70, 26, '#bcd7ea'], [-50, 34, '#cfe0c7'], [-30, 22, '#f1d6b8'], [-10, 38, '#c9d2ee'], [10, 28, '#e8c8d6'], [30, 32, '#bfe3df'], [50, 24, '#f0e2b6']].forEach(([x, h, c], i) => add(K.skylineBlock({w: 13, h, color: c}), S, x, -48 - (i % 2) * 8));
  for (let lx = -60; lx <= 60; lx += 15) { add(K.lampPost({}), S, lx, -7.6); add(K.lampPost({}), S, lx + 7, 7.6); }
  for (const tx of [-52, -37, -24, 3, 37]) add(K.tree({h: 8, seed: tx & 3}), S, tx, -9.8);
  add(K.bench({}), S, -27, -10.6); add(K.hydrant(), S, -9.5, -7.6);
  const lotX = 9.4; // in front of USED CARTS
  const potCart = add(PR.cart({color: '#9b59b6', tag: '$2'}), P, 1.2, 31);
  const carts = [['#e2483d', '$5'], ['#2f80d1', '$9'], ['#46a85a', '$3'], ['#f2b632', '$12']].map(([c, tag], i) => add(PR.cart({color: c, tag}), S, lotX - 6 + i * 4.2, -9.6, .2 - i * .15, .35));

  // ---------- Nan's lane (N): Nan's house with a raised porch, bakery, Mr. Pell's steps ----------
  add(K.grassField({w: 360, d: 300}), N, 0, 0);
  add(K.street({len: 160, crossings: []}), N, 0, 12);
  const nanHouse = add(K.house({w: 14, color: '#fbe3b8', roofColor: '#3f8f74', door: '#c94f7c', shutter: '#3f8f74'}), N, 0, -9.5, 0, 2.2);
  PR.box(scene, 'foundation', [14.4, 2.2, 8], [N.x, 1.1, N.z - 13.5], ['stone', '#c9c2b6']);
  const deckTop = 2.2;
  PR.box(scene, 'porch_deck', [9, .3, 3.6], [N.x + 1, deckTop - .15, N.z - 7.7], ['planks', '#b98a5c']);
  for (const x of [-3.3, 1, 5.3]) PR.box(scene, 'porch_post_low', [.35, deckTop, .35], [N.x + x, deckTop / 2, N.z - 6.1], '#fbf4e6');
  for (let i = 0; i < 3; i++) PR.box(scene, 'porch_stair', [3, deckTop / 3 * (i + 1), .75], [N.x + 2.8, deckTop / 6 * (i + 1), N.z - 4.0 - i * .75], ['planks', '#b98a5c']);
  const rail = add(PR.porchRail({w: 3.4, h: 1.4}), N, -1.2, -6.2, 0, deckTop);
  const table = PR.box(scene, 'porch_table', [1.4, 1.5, 1.4], [N.x - 2.6, deckTop + .75, N.z - 8.2], ['planks', '#a0673a'], .05);
  const cup = add(PR.teacup({}), N, -2.6, -8.2, 0, deckTop + 1.5);
  add(K.house({color: '#c9d2ee', roofColor: '#c1543f'}), N, 17, -12.5);
  add(PR.fence({len: 12}), N, 17, -3);
  const bakery = add(K.shopFront({text: 'BAKERY', wall: 'brick', color: '#d9785a', awningColors: ['#e2483d', '#fff4e6'], signBg: '#2f6f8f', w: 16}), N, 34, -12.95);
  const sign = add(PR.hangingSign('FRESH BREAD', {bg: '#6b3f2a'}), N, 25.6, -11.2, -Math.PI / 2, 6.0);
  const crates = [0, 1, 2].map(i => PR.box(scene, 'crate_stack', [1.5, 1.4, 1.5], [N.x + 25.6, .7 + i * 1.4, N.z - 7.0], ['planks', '#d9a86c'], .04));
  const steps = add(PR.steps({n: 8, w: 4.4, rise: .7, run: 1.4}), N, -24, -1);
  PR.box(scene, 'hill', [26, 5.6, 22], [N.x - 30, 2.8, N.z - 23], ['grass', '#7cc45a']);
  add(K.house({w: 12, color: '#f1d6b8', roofColor: '#6b3f2a', door: '#2f6f8f'}), N, -30, -16, 0, 5.6);
  for (const tx of [-44, -14, 46, 60]) add(K.tree({h: 9, seed: tx & 3}), N, tx, -10);
  add(K.bush({}), N, -7, -6); add(K.bush({r: 1.4}), N, 9, -6.2); add(K.lampPost({}), N, 10, 4.5);
  [[-70, 30, '#bcd7ea'], [-40, 26, '#cfe0c7'], [-10, 34, '#f1d6b8'], [20, 28, '#c9d2ee'], [50, 36, '#e8c8d6']].forEach(([x, h, c]) => add(K.skylineBlock({w: 14, h, color: c}), N, x, -60));
  const cats = [['#f39c34', '#c96b2c'], ['#9a9a9a', '#5a5a5a'], ['#2b2b2b', '#444444']].map(([c, s]) => { const k = PR.cat({color: c, stripe: s}); scene.add(k); return k; });
  const bag = PR.groceryBag(); scene.add(bag);
  const nanFish = PR.fish({len: .5, color: '#a9c4d9'}); scene.add(nanFish);

  // ---------- Pier (Q) ----------
  PR.box(scene, 'sand', [220, .3, 60], [Q.x, -.15, Q.z + 30], '#ead6a6');
  const pier = add(PR.pier({len: 20}), Q, 0, 0);
  for (const [x, c] of [[-30, '#8fc6e8'], [-12, '#f4a7b9'], [14, '#fbe3b8'], [32, '#bfe3df']]) add(K.house({color: c, roofColor: '#c1543f'}), Q, x, 38, Math.PI);
  const bucket = new T.Group(); bucket.name = 'bucket';
  PR.box(bucket, 'bucket_body', [.9, .8, .9], [0, .4, 0], '#8fa3b0', .1); scene.add(bucket);
  const tinyFish = PR.fish({len: .55, color: '#c9a0dc'}); scene.add(tinyFish);
  for (const [x, z] of [[-1.6, -4], [1.7, -9]]) PR.box(scene, 'barrel', [1.1, 1.4, 1.1], [Q.x + x, 1.05, Q.z + z], ['planks', '#a0673a'], .3);

  // ---------- Classroom (C) ----------
  add(PR.room({w: 28, d: 26, h: 12, wall: '#f6e2b8', floor: '#c48a54', windowAt: [-7, 6.5], closed: true}), C, 0, 0);
  add(PR.chalkboard({w: 12, h: 4.6, text: ['Spelling: H O N E S T', '3 x 4 = 12']}), C, 2, -23.4);
  add(PR.desk({w: 4, d: 2.4, h: 2.8, color: '#a0673a'}), C, 6, -19);
  add(PR.shelf({w: 6}), C, -10, -23.1);
  const kids = [], kidDesks = [];
  for (const [r, z] of [-18.5, -14.5, -10.5].entries()) for (const [k, x] of [-7.5, -2.5, 2.5, 7.5].entries()) {
    kidDesks.push(add(PR.desk({w: 2.4, d: 1.6, h: 1.75}), C, x, z));
    const ch = add(PR.chair({scale: .62, color: ['#e2483d', '#2f80d1', '#f2b632', '#46a85a'][(r + k) % 4]}), C, x, z + 1.5, Math.PI);
    const kid = createExtra(40 + r * 4 + k); kid.userData = {base: .58}; kid.root.scale.setScalar(.58); scene.add(kid.root); kids.push([kid, V(C.x + x, ch.userData.seat, C.z + z + 1.3)]);
  }
  const wrenDesk = add(PR.desk({w: 3.6, d: 2.2, h: 2.9}), C, 0, -5.2);
  const wrenChair = add(PR.chair({}), C, 0, -3.4, Math.PI);
  const teacherChair = add(PR.chair({color: '#2f80d1'}), C, 2.6, -6.4, -.6);

  // ---------- Bedroom (B) ----------
  const bedRoom = add(PR.room({w: 22, d: 20, h: 11, wall: '#cfe0f2', floor: '#b98a5c', windowAt: [-5, 6], closed: true, night: true}), B, 0, 0);
  const bedG = add(PR.bed({blanket: '#5b8fd9'}), B, 3, -10);
  const stand = add(PR.nightstand({}), B, 7.4, -13.2);
  add(PR.rug({w: 7, d: 4.5}), B, -1, -8); add(PR.shelf({w: 4.4, books: 8}), B, -7.6, -16.6);
  const bedChair = add(PR.chair({color: '#e9a64b'}), B, -2.2, -9.6, Math.PI / 2);

  // ---------- People ----------
  const cast = {};
  for (const [name, p] of Object.entries(CAST)) { const a = createCustom(name, p); a.userData = {base: p.scale}; scene.add(a.root); cast[name] = a; }
  topHat(cast.mayor);
  const layer = outerLayer(cast.wren);
  const extras = Array.from({length: 18}, (_, i) => { const e = createExtra(i + 7); e.userData = {base: 0}; e.userData.base = [.62, .9, .78, .86, .55, .95, .7, .82, .9, .6, .88, .75, .8, .92, .66, .84, .58, .9][i]; e.root.scale.setScalar(e.userData.base); scene.add(e.root); return e; });
  const people = [...Object.values(cast), ...extras, ...kids.map(k => k[0])];

  // Screen tint (memories), parented to the camera.
  const tint = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false}));
  tint.position.z = -.2; tint.renderOrder = 999; tint.name = 'tint'; camera.add(tint);

  const props = [bag, nanFish, bucket, tinyFish, ...cats];
  function reset() {
    for (const a of people) { a.root.visible = false; a.root.rotation.set(0, 0, 0); a.root.scale.setScalar(a.userData.base); for (const p of Object.values(a.pivots)) p.rotation.set(0, 0, 0); }
    for (const p of props) p.visible = false;
    layer.set(1, false); sign.userData.setTilt(1); tint.material.opacity = 0;
    for (const s of [...extras]) setExpression(s, 'calm');
  }
  // Ambient life per set + rain.
  const amb = [P, S, N, Q].map(c => [clouds(scene, c, {seed: c.x + 3}), birds(scene, c, {seed: c.x % 7})]);
  const rainFx = rain(scene);
  function ambient(t, camPos, out) { for (const [c, b] of amb) { c(t); b(t); } rainFx(t, camPos, out.rain); if (out.tint) { tint.material.color.set(out.tint[0]); tint.material.opacity = out.tint[1]; } }

  const points = {
    pothole: () => holes[0].position.clone().add(V(0, .3, 0)), signs: () => V(P.x + 6.9, 2.8, P.z + 38.2),
    stackBase: () => stack.position.clone().add(V(0, 1.2, 0)), rooftops: () => V(N.x + 6, 15, N.z - 12),
    cup: () => cup.position.clone().add(V(0, .35, 0)), sign: () => sign.localToWorld(V(1.8, -1.2, 0)),
    stepsTop: () => V(N.x - 24, 5.6, N.z - 12.6), bucket: () => at(Q, 1.6, 1, -14), hand: () => cast.wren.parts.rightArm.localToWorld(V(0, -1.1, .2)),
    feet: () => cast.wren.root.localToWorld(V(0, 2.0, 1.9)), bed: () => V(B.x + 1, 2.8, B.z - 10.5), lot: () => V(S.x + lotX, 2.4, S.z - 9.6),
    plaza: () => V(P.x, 4, P.z), town: () => V(N.x, 6, N.z - 6), deck: () => V(N.x + 1.2, 3.4, N.z - 5.4), pier: () => V(Q.x, 2.4, Q.z - 15),
  };
  return {plazaBench, potCart, bedWindow: bedRoom.userData.window, cast, extras, kids, layer, reset, ambient, points, P, S, N, Q, C, B, podium, stack, holes, carts, cats, bag, nanFish, bucket, tinyFish, sign, crates, steps, rail, deckTop, cup, table, pier,
    wrenChair, teacherChair, bedG, stand, bedChair, lotX};
}

// ---------------- Staging helpers ----------------
export function put(a, pos, ry = 0, face = null, scale = null) {
  a.root.visible = true; a.root.position.copy(pos); a.root.rotation.set(0, ry, 0);
  a.root.scale.setScalar(scale ?? a.userData.base); if (face) setExpression(a, face); return a;
}
export const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
export const at = (o, x, y, z) => V(o.x + x, o.y + y, o.z + z);
// A quick shrink with a squash-and-settle pop (the rule firing).
export function shrink(a, t, t0, from, to, dur = .32) {
  const k = easeOutBack((t - t0) / dur, 2.2), s = from + (to - from) * k;
  const sq = t > t0 && t < t0 + dur ? 1 - .12 * Math.sin((t - t0) / dur * Math.PI) : 1;
  a.root.scale.set(s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq)); return s;
}
// Seated on a seat of height h (sit pose lowers the root by one body unit).
export const seatY = (h, s) => h - .5 * s + s;
export const crowdFace = (t, k) => ['curious', 'pleased', 'confident', 'calm', 'happy'][(k + Math.floor(t)) % 5];
function crowdAt(X, t, list, {face = null, look = null} = {}) {
  list.forEach(([i, x, z, ry, base], k) => {
    const e = X.extras[i]; put(e, V(x, z === undefined ? 0 : .3, 0).set(x, .3, z), ry, face ?? crowdFace(t, k), base);
    act(e, t, [[0, 'stand']], {seed: k}); if (look) e.pivots.head.rotation.x = look;
  });
}
function walkers(X, t, list) {
  for (const [i, from, dir, gait = 'walk'] of list) { const e = X.extras[i]; e.root.visible = true; e.root.scale.setScalar(e.userData.base); locomote(e, t, {gait, from, dir}); }
}

// ==== SHOTS ====
export const shots = [
  // --- Cold open ---
  {id: 'C01', at: 'In this town', cam: {on: 'plaza', size: 'WS', worldYaw: 8, pitch: 16, h: 44, y: .52, move: {type: 'craneDown', amt: 20}},
    stage(c, X) {
      walkers(X, c.T, [[0, [X.P.x - 14, .3, X.P.z + 4], [1, 0]], [1, [X.P.x + 12, .3, X.P.z + 9], [-1, 0]], [2, [X.P.x - 6, .3, X.P.z + 14], [.6, -.8]], [3, [X.P.x + 3, .3, X.P.z - 2], [-.7, .7]], [4, [X.P.x + 9, .3, X.P.z - 1], [0, 1], 'child_walk']]);
      put(X.cast.wren, at(X.P, -2, .3, 6), .3, 'calm'); idle(X.cast.wren, c.t);
      put(X.cast.nan, at(X.P, -.6, .3, 6.6), -.4, 'pleased'); idle(X.cast.nan, c.t, {seed: 2});
    }},
  {id: 'C02', at: 'makes you shorter', cam: {on: 'liar', size: 'MS', yaw: 30, pitch: 2, move: 'push', impact: .25},
    stage(c, X) {
      const L = X.cast.liar, w = X.extras[5];
      put(L, at(X.P, 4, .3, 4), -.8, null); put(w, at(X.P, 6.6, .3, 2.6), -1.9, 'curious');
      const tS = c.at('shorter'); shrink(L, c.t, tS, .95, .66);
      act(L, c.t, [[0, 'shrug'], [tS + .1, 'recoil']]); if (c.t < tS) talk(L, c.t);
      setExpression(L, c.t < tS ? 'confident' : 'shocked'); act(w, c.t, [[0, 'stand'], [tS + .15, 'gasp']]);
      return {cam: {on: 'liar', scaleRef: .95}};
    }},
  // --- Three demonstrations ---
  {id: 'D01', at: 'The mayor promised', cam: {on: 'pothole', size: 'MLS', worldYaw: 25, pitch: 16, h: 12, y: .55, move: 'push'},
    stage(c, X) {
      walkers(X, c.T, [[6, [X.P.x - 3, .1, X.P.z + 28], [.2, 1]]]);
      const cartT = c.at('roads', -.2), k = ease((c.t - cartT) / .5);
      X.potCart.position.set(X.P.x + 1.5, .1 - .7 * k, X.P.z + 28 + 6 * Math.min(1, c.t / Math.max(.1, cartT))); X.potCart.rotation.set(0, Math.PI / 2, -.3 * k);
      return {light: at(X.P, 0, 0, 40)};
    }},
  {id: 'D02', at: 'Twice', cam: {on: 'signs', size: 'MS', h: 10, worldYaw: -30, pitch: 4, y: .42, move: {type: 'push', amt: .1}, impact: .2},
    stage(c, X) { return {light: at(X.P, 6, 0, 38)}; }},
  {id: 'D03', at: 'Now he gives', cam: (c, X) => ({on: X.points.stackBase(), size: 'MLS', h: 7.5, worldYaw: 55, pitch: 6, y: lerp(.62, .55, c.u), offset: [0, lerp(0, 3.6, ease(c.u)), 0], move: 'hold'}),
    stage(c, X) {
      const m = X.cast.mayor; put(m, X.stack.position.clone().setY(X.stack.userData.top + .02), 0, 'confident');
      act(m, c.t, [[0, 'speech'], [1.2, 'pointUp']]); talk(m, c.t);
      crowdAt(X, c.t, [[7, X.P.x - 2, X.P.z + 2, Math.PI], [8, X.P.x + 5, X.P.z + 3, Math.PI + .3], [9, X.P.x + 1, X.P.z + 5, Math.PI - .2]], {look: -.2});
    }},
  {id: 'D04', at: 'standing on a stack', cam: {on: 'mayor', size: 'CU', yaw: -25, pitch: -8, move: 'orbit'},
    stage(c, X) {
      const m = X.cast.mayor; put(m, X.stack.position.clone().setY(X.stack.userData.top + .02), 0, 'confident');
      act(m, c.t, [[0, 'speech'], [c.at('books'), 'armsWide']]); talk(m, c.t, {amt: 1.4});
    }},
  {id: 'F01', at: 'The fisherman swore', cam: {on: 'fisher', size: 'MS', yaw: 28, pitch: 4, move: 'push'},
    stage(c, X) {
      const f = X.cast.fisher; put(f, at(X.Q, .3, .4, -15), 0, 'confident');
      act(f, c.t, [[0, 'stand'], [c.at('this big', -.25), 'armsWide', {blend: .35}]]); talk(f, c.t, {amt: .8});
      put(X.extras[2], at(X.Q, -1.9, .4, -12.4), 2.4, 'curious'); put(X.extras[11], at(X.Q, -1.6, .4, -10.6), 2.6, 'incredulous');
      return {light: at(X.Q, 0, 0, -10)};
    }},
  {id: 'F02', at: 'and lost an inch', cam: {on: 'fisher', size: 'MCU', yaw: -12, pitch: 0, move: {type: 'push', amt: .1}, scaleRef: .84},
    stage(c, X) {
      const f = X.cast.fisher; put(f, at(X.Q, .3, .4, -15), 0, null);
      const tI = c.at('inch'); shrink(f, c.t, tI, .84, .74);
      act(f, c.t, [[0, 'armsWide'], [tI + .1, 'gasp']]); if (c.t < tI) talk(f, c.t);
      setExpression(f, faceAt(c.t, [[0, 'confident'], [tI + .05, 'shocked'], [tI + .9, 'shame']]));
      return {light: at(X.Q, 0, 0, -10)};
    }},
  {id: 'F03', at: 'before he finished', cam: {on: 'bucket', size: 'CU', h: 3.6, worldYaw: 20, pitch: 35, y: .45, move: 'push'},
    stage(c, X) {
      X.bucket.visible = true; X.bucket.position.copy(at(X.Q, 1.6, .38, -14));
      X.tinyFish.visible = true; X.tinyFish.position.copy(at(X.Q, 1.6, 1.0, -14)); X.tinyFish.rotation.set(0, .6, .5 * Math.sin(onTwos(c.t) * 9));
      const f = X.cast.fisher; put(f, at(X.Q, .3, .4, -15), 0, 'shame', .74); act(f, c.t, [[0, 'lookDown']]);
      return {light: at(X.Q, 0, 0, -10)};
    }},
  {id: 'L01', at: 'And the man who sells', cam: {on: 'lot', size: 'WS', h: 13, worldYaw: 18, pitch: 8, move: 'track'},
    stage(c, X) {
      walkers(X, c.T, [[3, [X.S.x - 6, .35, X.S.z - 7.4], [1, 0]]]);
      put(X.extras[12], at(X.S, X.lotX + 3.4, .35, -7.2), -1.7, 'curious');
      put(X.cast.sales, at(X.S, X.lotX + 1.2, .35, -7.6), .2, 'devious'); act(X.cast.sales, c.t, [[0, 'armsWide']]);
      return {light: at(X.S, X.lotX, 0, -8)};
    }},
  {id: 'L02', at: "He's about the size", cam: {on: 'sales', size: 'MS', yaw: 20, pitch: 6, scaleRef: .32, y: .5, move: 'push', impact: .15},
    stage(c, X) {
      const s = X.cast.sales; put(s, at(X.S, X.lotX + 1.2, .35, -7.6), .2, null);
      act(s, c.t, [[0, 'point'], [c.at('shoe'), 'handsHips']]); talk(s, c.t);
      setExpression(s, faceAt(c.t, [[0, 'devious'], [c.at('shoe'), 'confident']]));
      put(X.extras[12], at(X.S, X.lotX + .3, .35, -7.5), 1.7, 'incredulous');
      return {light: at(X.S, X.lotX, 0, -8), focus: X.cast.sales.root.position.clone()};
    }},
  // --- The kid ---
  {id: 'K01', at: 'Then there was Wren', cam: {on: 'wren', size: 'FS', yaw: -35, pitch: -6, move: {type: 'orbit', amt: 8}},
    stage(c, X) {
      const w = X.cast.wren; w.root.visible = true; locomote(w, c.t, {from: [X.S.x - 20, .35, X.S.z - 8.6], dir: [1, 0]}); setExpression(w, 'calm');
      walkers(X, c.T, [[0, [X.S.x - 6, .35, X.S.z - 9.6], [-1, 0]], [9, [X.S.x - 26, .35, X.S.z - 9.8], [1, 0], 'child_walk'], [13, [X.S.x - 2, .35, X.S.z - 7.6], [-1, 0]]]);
      return {light: X.cast.wren.root.position.clone()};
    }},
  {id: 'K02', at: 'Wren had never told', cam: {on: 'wren', size: 'MCU', yaw: 18, pitch: -4, move: 'push'},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.S, -14, .35, -8.6), .6, 'pleased'); act(w, c.t, [[0, 'stand']]); }},
  {id: 'K03', at: 'Not one. And in', cam: {on: 'wren', size: 'CU', yaw: -15, pitch: -6, move: {type: 'push', amt: .12}},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.S, -14, .35, -8.6), .6, 'happy'); act(w, c.t, [[0, 'stand']]); }},
  {id: 'K04', at: 'that made her the tallest', cam: {on: 'wren', size: 'WS', h: 11, yaw: 10, pitch: 10, y: .38, move: {type: 'crane', amt: 6}},
    stage(c, X) {
      const w = X.cast.wren; put(w, at(X.S, -14, .35, -8.6), .2, 'pleased'); act(w, c.t, [[0, 'stand']]);
      crowdAt(X, c.t, [[0, X.S.x - 17, X.S.z - 7.4, .8], [1, X.S.x - 11, X.S.z - 7.8, -.6], [4, X.S.x - 15.6, X.S.z - 5.6, .3], [6, X.S.x - 12.2, X.S.z - 5.4, -.4], [10, X.S.x - 18.4, X.S.z - 9.6, .9]], {look: -.25});
    }},
  {id: 'K05', at: 'People called it showing', cam: {on: ['gossipA', 'gossipB'], size: 'MS', worldYaw: 10, pitch: 2, move: 'drift'},
    stage(c, X) {
      const a = X.cast.gossipA, b = X.cast.gossipB, p = at(X.S, -37, .35, -8.4);
      put(a, p, .9, 'snooty'); put(b, p.clone().add(V(1.6, 0, .2)), -1.2, 'devious');
      act(a, c.t, [[0, 'handsHips']]); act(b, c.t, [[0, 'shy']]); talk(b, c.t, {amt: .6});
      a.pivots.head.rotation.y = .5; setExpression(a, faceAt(c.t, [[0, 'snooty'], [c.at('off', -.1), 'irritated']]));
    }},
  {id: 'K06', at: 'Kids made her sit', cam: {on: 'wren', size: 'WS', h: 12, worldYaw: 180, pitch: 10, y: .42, move: 'pull'},
    stage(c, X) {
      for (const [k, [kid, seat]] of X.kids.entries()) { put(kid, V(seat.x, seatY(seat.y, .58) - .58, seat.z), Math.PI, ['calm', 'happy', 'curious', 'bored'][k % 4], .58); act(kid, c.t, [[0, 'sitHands']], {seed: k}); kid.pivots.head.rotation.y = (k % 3 - 1) * .5; }
      const w = X.cast.wren; put(w, V(X.C.x, seatY(X.wrenChair.userData.seat, 1.2) - 1.2, X.C.z - 3.6), Math.PI, 'pouty'); act(w, c.t, [[0, 'sitHands']]);
      return {light: at(X.C, 0, 0, -10), mood: 'interior'};
    }},
  {id: 'K07', at: 'Even her teacher', cam: {on: ['teacher', 'wren'], size: 'MS', worldYaw: 50, pitch: 4, move: 'push'},
    stage(c, X) {
      const w = X.cast.wren; put(w, V(X.C.x, seatY(X.wrenChair.userData.seat, 1.2) - 1.2, X.C.z - 3.6), Math.PI, null); act(w, c.t, [[0, 'sitHands'], [c.at('talk'), 'shy']]);
      setExpression(w, faceAt(c.t, [[0, 'calm'], [c.at('talk'), 'shame']]));
      const tc = X.cast.teacher, up = ease((c.t - c.at('stood', -.2)) / .45), base = at(X.C, 2.6, 0, -6.4);
      put(tc, base.clone().setY(X.teacherChair.userData.seat * up + .25 * Math.sin(Math.PI * up)), .5, 'irritated');
      act(tc, c.t, [[0, 'stand'], [c.at('talk'), 'point']]); if (c.t > c.at('talk')) talk(tc, c.t);
      return {light: at(X.C, 0, 0, -6), mood: 'interior'};
    }},
  // --- Re-hook ---
  {id: 'R01', at: 'But Wren noticed', cam: {on: 'wren', size: 'MCU', yaw: 30, pitch: -2, move: {type: 'push', amt: .15}},
    stage(c, X) {
      const w = X.cast.wren; put(w, at(X.N, 8, .35, 3.4), -1.4, null); act(w, c.t, [[0, 'stand'], [c.at('strange', -.2), 'lookDown']]);
      w.pivots.head.rotation.y = -.5 * ease((c.t - c.at('noticed')) / .3); setExpression(w, faceAt(c.t, [[0, 'calm'], [c.at('noticed'), 'curious']]));
    }},
  {id: 'R02', at: 'The kindest woman', cam: {on: 'nan', size: 'FS', scaleRef: .4, worldYaw: -12, pitch: 6, y: .45, move: 'push'},
    stage(c, X) {
      const n = X.cast.nan; put(n, at(X.N, -1.6, X.deckTop, -7.6), .2, 'pleased'); act(n, c.t, [[0, 'stand']]);
      put(X.cast.wren, at(X.N, 8, .35, 3.4), -1.4 - .5, 'curious');
    }},
  {id: 'R03', at: 'was barely as tall', cam: {on: 'nan', size: 'MS', yaw: 25, pitch: 4, move: 'push', impact: .12},
    stage(c, X) {
      const n = X.cast.nan; put(n, at(X.N, -2.2, X.deckTop + 1.5, -8.2), -.4, 'pleased');
      act(n, c.t, [[0, 'stand'], [c.at('teacup'), 'hold']]);
      return {cam: {on: X.points.cup().add(V(.2, 0, 0)), scaleRef: .16, size: 'FS', y: .5}};
    }},
  {id: 'R04', at: 'Everyone whispered', cam: {on: ['gossipA', 'gossipB'], size: 'MCU', yaw: -20, pitch: 0, move: 'drift'},
    stage(c, X) {
      const a = X.cast.gossipA, b = X.cast.gossipB, p = at(X.N, 16, .35, -2.2);
      put(a, p, .2, 'devious'); put(b, p.clone().add(V(1.3, 0, -.2)), -.5, 'snooty');
      act(a, c.t, [[0, 'shy']]); act(b, c.t, [[0, 'handsHips']]); talk(a, c.t, {amt: .7}); a.pivots.head.rotation.y = .6;
    }},
  {id: 'R05', at: 'that she must be', cam: {on: 'gossipB', size: 'CU', yaw: 15, pitch: 0, move: {type: 'push', amt: .12}},
    stage(c, X) {
      const b = X.cast.gossipB; put(b, at(X.N, 17.3, .35, -2.4), -.5, null); act(b, c.t, [[0, 'handsHips']]); talk(b, c.t);
      setExpression(b, faceAt(c.t, [[0, 'snooty'], [c.at('biggest'), 'disgusted']]));
    }},
  // --- Investigation ---
  {id: 'I01', at: "Wren didn't believe", cam: {on: 'wren', size: 'CU', yaw: -20, pitch: -4, move: 'push', impact: .1},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.N, 8, .35, 3.4), -2.2, 'serious'); act(w, c.t, [[0, 'tense']]); }},
  {id: 'I02', at: 'So she decided', cam: {on: 'wren', size: 'MS', yaw: 40, pitch: 0, move: 'track'},
    stage(c, X) {
      const w = X.cast.wren; put(w, at(X.N, 7.4, .35, 4.0), -2.4, null); act(w, c.t, [[0, 'stand'], [c.at('find out', -.2), 'crouch']]);
      setExpression(w, faceAt(c.t, [[0, 'serious'], [c.at('find out'), 'devious']]));
    }},
  {id: 'I03', at: 'She followed Nan', cam: {on: 'wren', size: 'WS', h: 10, yaw: -80, pitch: 6, y: .4, move: 'track'},
    stage(c, X) {
      const n = X.cast.nan, w = X.cast.wren; n.root.visible = true; locomote(n, c.t, {from: [X.N.x + 6, .35, X.N.z + 2.6], dir: [1, 0], gait: 'child_walk'}); setExpression(n, 'pleased');
      w.root.visible = true; w.root.scale.setScalar(1.2); locomote(w, c.t * .12, {from: [X.N.x - 2, .35, X.N.z + 2.6], dir: [1, 0], gait: 'walk', twos: false});
      w.root.rotation.x = .28; w.pivots.leftShoulder.rotation.x -= .6; w.pivots.rightShoulder.rotation.x -= .6; setExpression(w, 'devious');
    }},
  {id: 'I04', at: 'Nan fed the stray', cam: {on: 'nan', size: 'FS', worldYaw: 15, pitch: 8, y: .45, move: 'push', scaleRef: .5},
    stage(c, X) {
      const n = X.cast.nan, p = at(X.N, -10, .35, 2.4); put(n, p, 2.2, 'happy'); act(n, c.t, [[0, 'reach']]);
      X.nanFish.visible = true; n.root.updateMatrixWorld(true); X.nanFish.position.copy(n.parts.rightArm.localToWorld(V(0, -1.1, .3))); X.nanFish.rotation.y = 1.2;
      X.cats.forEach((k, i) => { k.visible = true; k.position.copy(p).add(V(.9 + i * .9, 0, -1.4 - (i % 2) * .7)); k.rotation.y = facing(k.position, p); k.userData.tail.rotation.x = -.6 + .3 * Math.sin(onTwos(c.t) * 6 + i); k.userData.head.rotation.x = .2 * Math.sin(onTwos(c.t) * 4 + i); });
    }},
  {id: 'I05', at: "Nan fixed the baker's", cam: {on: ['sign', 'nan'], size: 'MS', scaleRef: .4, worldYaw: 60, pitch: -4, y: .4, move: 'push'},
    stage(c, X) {
      const n = X.cast.nan, top = V(X.crates[2].position.x, 4.2, X.crates[2].position.z - .2);
      put(n, top, .9, 'serious'); act(n, c.t, [[0, 'pointUp'], [c.at('sign'), 'cheer']]);
      X.sign.userData.setTilt(ease((c.t - c.at('broken')) / .5));
      setExpression(n, faceAt(c.t, [[0, 'serious'], [c.at('sign', .3), 'happy']]));
      put(X.cast.baker, at(X.N, 23, .35, -6.5), 2.6, 'pleased'); act(X.cast.baker, c.t, [[0, 'handsHips']]);
      return {light: at(X.N, 25, 0, -8)};
    }},
  {id: 'I06', at: 'Nan carried groceries', cam: {on: 'nan', size: 'FS', yaw: 90, pitch: 10, y: .45, scaleRef: .45, move: 'track'},
    stage(c, X) {
      const n = X.cast.nan, i = Math.min(2.4, c.t * .5), pos = X.steps.userData.at(Math.floor(i)), base = X.steps.position;
      put(n, base.clone().add(pos).add(V(0, .02, -.3)), Math.PI, 'tired'); act(n, c.t, [[0, 'carry']]);
      X.bag.visible = true; n.root.updateMatrixWorld(true); X.bag.position.copy(n.root.localToWorld(V(0, 2.4, 2.6))); X.bag.rotation.y = Math.PI; X.bag.scale.setScalar(.4);
      put(X.cast.pell, X.points.stepsTop(), .3, 'happy'); act(X.cast.pell, c.t, [[0, 'stand']]);
    }},
  {id: 'I07', at: 'which, for Nan', mood: 'golden', cam: {on: 'stepsTop', size: 'WS', h: 13, worldYaw: 35, pitch: 8, y: .45, move: 'push'},
    stage(c, X) {
      const n = X.cast.nan, pos = X.steps.userData.at(5), base = X.steps.position;
      put(n, base.clone().add(pos).add(V(0, .02, -.3)), Math.PI, 'tired'); act(n, c.t, [[0, 'carry']]); n.root.position.y += .04 * Math.abs(Math.sin(onTwos(c.t) * 6));
      X.bag.visible = true; n.root.updateMatrixWorld(true); X.bag.position.copy(n.root.localToWorld(V(0, 2.4, 2.6))); X.bag.rotation.y = Math.PI; X.bag.scale.setScalar(.4);
      put(X.cast.pell, X.points.stepsTop(), .3, 'bored'); act(X.cast.pell, c.t, [[0, 'handsHips']]);
      return {light: at(X.N, -24, 0, -6)};
    }},
  {id: 'I08', at: 'No lies', mood: 'golden', cam: {on: 'wren', size: 'CU', yaw: 25, pitch: -2, move: 'push'},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.N, -12, .35, 2.2), -2.0, 'confused'); act(w, c.t, [[0, 'crouch']]); }},
  {id: 'I09', at: 'Not one. Then', mood: 'golden', cam: {on: 'deck', size: 'WS', h: 11, worldYaw: 20, pitch: 6, move: 'pull'},
    stage(c, X) {
      const n = X.cast.nan; put(n, at(X.N, -1.6, X.deckTop, -7.6), .2, 'happy'); act(n, c.t, [[0, 'stand'], [.3, 'cheer'], [.8, 'stand']]);
      put(X.cast.wren, at(X.N, 9, .35, 1.6), -1.9, 'confused'); act(X.cast.wren, c.t, [[0, 'shrug']]);
    }},
  // --- Midpoint: the storm ---
  {id: 'M01', at: 'Then the storm came', mood: 'storm', cam: {on: 'town', size: 'EWS', h: 34, worldYaw: 10, pitch: 10, y: .62, move: {type: 'push', amt: .08}},
    stage(c, X) { return {rain: c.t > .4, flash: c.t > .5 && c.t < .62 ? 1 : 0, light: at(X.N, 0, 0, -6)}; }},
  {id: 'M02', at: 'Thunder cracked', mood: 'storm', cam: {on: 'rooftops', size: 'WS', h: 18, worldYaw: -15, pitch: -18, y: .4, move: 'drift', shake: .6},
    stage(c, X) { const f = c.t - c.at('cracked'); return {rain: true, flash: f > 0 && f < .1 ? 1 : f > .2 && f < .26 ? .6 : 0, light: at(X.N, 0, 0, -6)}; }},
  {id: 'M03', at: 'and a little boy', mood: 'storm', cam: {on: 'boy', size: 'MS', yaw: 15, pitch: 2, move: 'push'},
    stage(c, X) {
      const b = X.cast.boy; put(b, at(X.N, -1.0, 0, -7), .2, 'scared'); act(b, c.t, [[0, 'crouch']]); shiver(b, c.t, 1.2);
      return {rain: true, light: at(X.N, 0, 0, -6)};
    }},
  {id: 'M04', at: 'Nan knelt beside', mood: 'storm', cam: {on: ['nan', 'boy'], size: 'MCU', worldYaw: 35, pitch: 4, scaleRef: .4, move: 'push'},
    stage(c, X) {
      const b = X.cast.boy, n = X.cast.nan; put(b, at(X.N, -1.0, 0, -7), .2, 'scared'); act(b, c.t, [[0, 'crouch']]); shiver(b, c.t, .7);
      put(n, at(X.N, -2.2, 0, -6.4), 2.03, null); act(n, c.t, [[0, 'stand'], [c.at('knelt'), 'kneel']]);
      setExpression(n, faceAt(c.t, [[0, 'concerned'], [c.at('smiled'), 'happy']]));
      return {rain: true, light: at(X.N, 0, 0, -6)};
    }},
  {id: 'M05', at: "That's just the sky", mood: 'storm', cam: {on: 'nan', size: 'CU', yaw: -45, pitch: 6, move: {type: 'push', amt: .1}},
    stage(c, X) {
      const n = X.cast.nan; put(n, at(X.N, -2.2, 0, -6.4), 2.03, 'pleased'); act(n, c.t, [[0, 'kneel']]); if (c.t < c.at('she said')) talk(n, c.t, {amt: .6});
      put(X.cast.boy, at(X.N, -1.0, 0, -7), .2, 'nervous'); act(X.cast.boy, c.t, [[0, 'crouch']]);
      return {rain: true, light: at(X.N, 0, 0, -6)};
    }},
  {id: 'M06', at: 'And Wren watched', mood: 'storm', cam: {on: 'wren', size: 'CU', yaw: 20, pitch: -3, move: 'push', impact: .12},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.N, 15.6, .35, -1.6), -1.93, 'shocked'); act(w, c.t, [[0, 'gasp']]); return {rain: true, light: at(X.N, 10, 0, -4)}; }},
  {id: 'M07', at: 'Just a little', mood: 'storm', cam: {on: ['nan', 'boy'], size: 'MS', worldYaw: 20, pitch: 10, scaleRef: .3, move: 'hold'},
    stage(c, X) {
      const n = X.cast.nan; put(n, at(X.N, -2.2, 0, -6.4), 2.03, 'happy'); act(n, c.t, [[0, 'kneel']]); shrink(n, c.t, c.at('little', -.1), .11, .1);
      put(X.cast.boy, at(X.N, -1.0, 0, -7), .2, faceAt(c.t, [[0, 'nervous'], [c.at('little'), 'pleased']])); act(X.cast.boy, c.t, [[0, 'crouch']]);
      return {rain: true, light: at(X.N, 0, 0, -6)};
    }},
  // --- False ending ---
  {id: 'E01', at: 'So it was true', mood: 'storm', cam: {on: 'wren', size: 'MCU', yaw: -30, pitch: -2, move: 'pull'},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.N, 15.6, .35, -1.6), -1.93, 'sad'); act(w, c.t, [[0, 'slump']]); return {rain: true, light: at(X.N, 10, 0, -4)}; }},
  {id: 'E02', at: 'Nan was a liar', mood: 'storm', cam: {on: 'wren', size: 'MLS', yaw: 160, pitch: 8, move: 'drift'},
    stage(c, X) {
      const w = X.cast.wren; put(w, at(X.N, 15.6, .35, -1.6), -1.93, 'sad'); act(w, c.t, [[0, 'slump']]);
      put(X.cast.nan, at(X.N, -2.2, 0, -6.4), 2.03, 'happy', .1); act(X.cast.nan, c.t, [[0, 'kneel']]); put(X.cast.boy, at(X.N, -1.0, 0, -7), .2, 'pleased'); act(X.cast.boy, c.t, [[0, 'crouch']]);
      return {rain: true, light: at(X.N, 10, 0, -4)};
    }},
  {id: 'E03', at: 'Wren ran home', mood: 'storm', cam: {on: 'wren', size: 'FS', yaw: -75, pitch: 4, move: 'track'},
    stage(c, X) { const w = X.cast.wren; w.root.visible = true; locomote(w, c.t, {gait: 'run', from: [X.S.x - 18, .35, X.S.z - 7.4], dir: [1, 0]}); setExpression(w, 'sad'); return {rain: true, light: w.root.position.clone()}; }},
  {id: 'E04', at: 'feeling silly', mood: 'storm', cam: {on: 'wren', size: 'MCU', yaw: -25, pitch: 0, move: 'hold'},
    stage(c, X) { const w = X.cast.wren; w.root.visible = true; locomote(w, c.t + 3, {gait: 'run', from: [X.S.x - 30, .35, X.S.z - 8.6], dir: [1, 0]}); setExpression(w, 'pouty'); return {rain: true, light: w.root.position.clone()}; }},
  // --- Stakes and choice ---
  {id: 'B01', at: 'That night', mood: 'interiorNight', cam: {on: 'bed', size: 'WS', h: 12, worldYaw: 25, pitch: 30, y: .5, fov: 44, move: 'push'},
    stage(c, X) { return bedScene(c, X, {wrenFace: 'concerned', boFace: 'sick'}); }},
  {id: 'B02', at: 'had a fever', mood: 'interiorNight', cam: {on: 'bo', size: 'CU', yaw: 0, pitch: 55, move: {type: 'push', amt: .1}},
    stage(c, X) { return bedScene(c, X, {boFace: 'sick'}); }},
  {id: 'B03', at: 'He looked up', mood: 'interiorNight', cam: {on: 'wren', size: 'MCU', worldYaw: 118, pitch: -6, fov: 46, move: 'push'},
    stage(c, X) { return bedScene(c, X, {wrenFace: 'concerned', boFace: 'scared'}); }},
  {id: 'B04', at: 'Am I going', mood: 'interiorNight', cam: {on: 'bo', size: 'CU', yaw: 15, pitch: 50, move: {type: 'push', amt: .12}},
    stage(c, X) { const r = bedScene(c, X, {boFace: 'scared'}); talk(X.cast.bo, c.t, {amt: .4}); return r; }},
  {id: 'B05', at: "Wren didn't know", mood: 'interiorNight', cam: {on: 'wren', size: 'CU', yaw: 25, pitch: -4, move: 'push'},
    stage(c, X) { return bedScene(c, X, {wrenFace: 'nervous'}); }},
  {id: 'B06', at: 'She opened her mouth', mood: 'interiorNight', cam: {on: 'wren', size: 'ECU', yaw: 5, pitch: -2, move: {type: 'push', amt: .2}},
    stage(c, X) { return bedScene(c, X, {wrenFace: faceAt(c.t, [[0, 'serious'], [c.at('truth'), 'concerned']])}); }},
  {id: 'B07', at: 'and instead', mood: 'interiorNight', cam: {on: 'wren', size: 'MCU', yaw: 40, pitch: -6, move: 'orbit'},
    stage(c, X) { return bedScene(c, X, {wrenFace: 'pensive'}); }},
  {id: 'B08', at: 'Of course you are', mood: 'interiorNight', cam: {on: 'wren', size: 'CU', yaw: 20, pitch: -6, move: {type: 'push', amt: .08}},
    stage(c, X) { const r = bedScene(c, X, {wrenFace: 'pleased', boFace: 'pleased'}); talk(X.cast.wren, c.t, {amt: .3}); return r; }},
  // --- Twist ---
  {id: 'T01', at: 'Her sleeves slid', mood: 'interiorNight', cam: {on: 'wren', size: 'MCU', yaw: 55, pitch: 6, y: .3, move: 'hold'},
    stage(c, X) { return bedScene(c, X, {shrinkAt: c.at('slid', -.15), shrinkDur: 1.1, wrenFace: 'shocked', handOut: true}); }},
  {id: 'T02', at: 'Her shoes went', mood: 'interiorNight', cam: {on: 'feet', size: 'CU', h: 4.0, worldYaw: 0, pitch: 2, y: .5, move: 'hold'},
    stage(c, X) { return bedScene(c, X, {shrunk: true, wiggle: true, slip: .32 * ease((c.t - c.at('loose', -.2)) / .5)}); }},
  {id: 'T03', at: 'She had shrunk', mood: 'interiorNight', cam: {on: 'wren', size: 'MS', yaw: 50, pitch: 2, fov: 50, move: 'pull', impact: .2},
    stage(c, X) { return bedScene(c, X, {shrunk: true, wrenFace: 'shocked', standUp: true}); }},
  {id: 'T04', at: 'And suddenly', mood: 'interiorNight', cam: {on: 'wren', size: 'ECU', yaw: 0, pitch: -2, move: {type: 'push', amt: .3}},
    stage(c, X) { return bedScene(c, X, {shrunk: true, standUp: true, wrenFace: faceAt(c.t, [[0, 'shocked'], [c.at('understood'), 'pensive']])}); }},
  {id: 'T05', at: 'Nan Tilly had never', mood: 'golden', cam: {on: ['nan', 'boy'], size: 'MCU', worldYaw: 35, pitch: 4, scaleRef: .4, move: 'push'},
    stage(c, X) {
      put(X.cast.boy, at(X.N, -1.0, 0, -7), .2, 'pleased'); act(X.cast.boy, c.t, [[0, 'crouch']]);
      put(X.cast.nan, at(X.N, -2.2, 0, -6.4), 2.03, 'happy'); act(X.cast.nan, c.t, [[0, 'kneel']]);
      return {tint: ['#ffcf8a', .16], light: at(X.N, 0, 0, -6)};
    }},
  {id: 'T06', at: 'She had spent', mood: 'golden', cam: {on: ['girl', 'nan'], size: 'MS', yaw: 20, pitch: 6, scaleRef: .5, move: 'orbit'},
    stage(c, X) {
      const g = X.cast.girl, n = X.cast.nan; put(g, at(X.P, -9, .3, 6), .8, faceAt(c.t, [[0, 'crying'], [c.dur * .55, 'pleased']])); act(g, c.t, [[0, 'kneel']]);
      put(n, at(X.P, -8.2, .3, 6.9), -2.4, 'happy'); act(n, c.t, [[0, 'reach']]);
      return {tint: ['#ffcf8a', .16], light: at(X.P, -9, 0, 6)};
    }},
  {id: 'T07', at: 'telling scared people', mood: 'golden', cam: {on: ['extra', 'nan'], size: 'MS', yaw: 25, pitch: 8, move: 'push'},
    stage(c, X) {
      const m = X.extras[13], n = X.cast.nan, B = X.plazaBench; B.updateMatrixWorld(true);
      put(m, B.localToWorld(V(-.7, 0, .1)).setY(seatY(1.75, .92) - .92), B.rotation.y, faceAt(c.t, [[0, 'nervous'], [c.at('everything'), 'pleased']])); act(m, c.t, [[0, 'sitHands']]);
      put(n, B.localToWorld(V(1.1, 1.75, .1)), B.rotation.y - .9, 'happy'); act(n, c.t, [[0, 'reach']]);
      return {tint: ['#ffcf8a', .16], cam: {on: [m, n]}, light: X.plazaBench.position.clone()};
    }},
  {id: 'T08', at: "Every inch she'd lost", mood: 'golden', cam: {on: 'nan', size: 'MS', yaw: 15, pitch: 2, move: {type: 'push', amt: .15}},
    stage(c, X) { const n = X.cast.nan; put(n, at(X.N, -1.2, X.deckTop + X.rail.userData.top, -6.2), .1, 'pleased', .1); act(n, c.t, [[0, 'stand']]); return {light: at(X.N, 0, 0, -6)}; }},
  // --- Payoff ---
  {id: 'P01', at: 'The next morning', mood: 'interior', cam: {on: 'bo', size: 'MS', yaw: 20, pitch: 6, move: 'push'},
    stage(c, X) { return bedScene(c, X, {morning: true}); }},
  {id: 'P02', at: 'Wren walked to', mood: 'dawn', cam: {on: 'wren', size: 'FS', yaw: 55, pitch: 0, move: 'track'},
    stage(c, X) { const w = X.cast.wren; w.root.visible = true; locomote(w, c.t, {from: [X.N.x + 12, .35, X.N.z + 2.4], dir: [-1, 0]}); w.root.scale.setScalar(1.06); setExpression(w, 'pensive'); return {light: w.root.position.clone()}; }},
  {id: 'P03', at: 'and sat beside', mood: 'dawn', cam: {on: 'deck', size: 'MLS', h: 8, worldYaw: 25, pitch: 4, move: 'push'},
    stage(c, X) { return stepScene(c, X, {sit: c.at('sat')}); }},
  {id: 'P04', at: 'For the first time', mood: 'dawn', cam: {on: ['wren', 'nan'], size: 'MS', worldYaw: -8, pitch: 2, scaleRef: 1.06, move: {type: 'push', amt: .08}},
    stage(c, X) { return stepScene(c, X, {}); }},
  {id: 'P05', at: 'Did it hurt', mood: 'dawn', cam: {on: 'wren', size: 'CU', yaw: -60, pitch: 0, move: 'drift'},
    stage(c, X) { const r = stepScene(c, X, {wrenFace: 'curious', look: true}); talk(X.cast.wren, c.t, {amt: .3}); return r; }},
  {id: 'P06', at: 'Nan laughed', mood: 'dawn', cam: {on: 'nan', size: 'CU', yaw: 60, pitch: 0, move: {type: 'push', amt: .1}},
    stage(c, X) { const r = stepScene(c, X, {nanFace: faceAt(c.t, [[0, 'laughing'], [c.at('Only'), 'pleased']]), look: true}); if (c.t > c.at('Only')) talk(X.cast.nan, c.t, {amt: .5}); return r; }},
  // --- Button ---
  {id: 'Z01', at: 'In Shortwick, everyone', mood: 'dawn', cam: {on: 'plaza', size: 'WS', h: 40, worldYaw: 30, pitch: 22, y: .5, move: 'orbit'},
    stage(c, X) {
      walkers(X, c.T, [[0, [X.P.x - 14, .3, X.P.z + 4], [1, 0]], [5, [X.P.x + 12, .3, X.P.z + 9], [-1, 0]], [8, [X.P.x - 6, .3, X.P.z + 12], [.6, -.8]]]);
      put(X.cast.mayor, X.stack.position.clone().setY(X.stack.userData.top + .02), 0, 'confident'); act(X.cast.mayor, c.t, [[0, 'speech']]);
    }},
  {id: 'Z02', at: 'But the smallest', mood: 'dawn', cam: {on: ['wren', 'nan'], size: 'MS', worldYaw: 12, pitch: 6, scaleRef: 1.06, move: {type: 'pull', amt: 1.6}},
    stage(c, X) { return stepScene(c, X, {}); }},
];

// Bedroom: Bo in bed, Wren on the chair beside him; the shrink happens here.
function bedScene(c, X, o) {
  const bo = X.cast.bo, w = X.cast.wren, s0 = 1.2, s1 = 1.06, bed = X.bedG.position, top = X.bedG.userData.top;
  const win = X.bedWindow.material; win.color.set(o.morning ? 0x9fd3f2 : 0x1d2f5a); win.emissive.set(o.morning ? 0x6fb8e8 : 0x0d1730);
  bo.root.visible = true; bo.root.scale.setScalar(.58);
  if (o.morning) {
    put(bo, V(bed.x, seatY(top, .58) - .58, bed.z - 2.2), 0, 'happy'); act(bo, c.t, [[0, 'sitHands'], [.35, 'sitCheer']]);
    return {mood: 'interior', light: bed.clone()};
  }
  bo.root.position.set(bed.x, top + .29 + .15, bed.z + .2); bo.root.rotation.set(-Math.PI / 2, 0, 0);
  setExpression(bo, o.boFace ?? 'sick');
  const sh = o.shrinkAt !== undefined ? ease((c.t - o.shrinkAt) / (o.shrinkDur ?? .6)) : o.shrunk ? 1 : 0, s = s0 + (s1 - s0) * sh;
  const ch = X.bedChair.position, seat = X.bedChair.userData.seat;
  put(w, V(ch.x, seatY(seat, s) - s, ch.z), Math.PI / 2, o.wrenFace ?? 'concerned', s);
  if (o.standUp) { w.root.position.set(ch.x + .6, 0, ch.z + 2.2); w.root.rotation.y = Math.PI / 2 + .45; act(w, c.t, [[0, o.handOut ? 'hold' : 'lookDown']]); }
  else { act(w, c.t, [[0, o.handOut ? 'sitReach' : 'sitHands']]); if (o.handOut) { w.pivots.leftShoulder.rotation.x = w.pivots.rightShoulder.rotation.x = -.95; w.pivots.head.rotation.x = .35; } }
  if (o.wiggle) w.pivots.leftHip.rotation.x += .14 * Math.sin(onTwos(c.t) * 8);
  X.layer.set(s0 / s, true, o.slip ?? 0);
  return {lamp: [X.stand.position.clone().add(V(0, 3.8, 0)), 40], light: bed.clone()};
}
// Morning porch: Wren sits on the bottom porch stair, Nan stands on the rail at her eye level.
function stepScene(c, X, o) {
  const w = X.cast.wren, n = X.cast.nan, s = 1.06, stair = at(X.N, 2.8, 0, -4.1), seat = X.deckTop / 3;
  const sitting = o.sit === undefined || c.t >= o.sit;
  if (sitting) { put(w, V(stair.x, seatY(seat, s) - s, stair.z), 0, o.wrenFace ?? 'pleased', s); act(w, c.t, [[0, 'sitHands']]); }
  else { w.root.visible = true; w.root.scale.setScalar(s); locomote(w, c.t - o.sit + 1.3, {from: [stair.x + 6.05, .35, stair.z + .2], dir: [-1, 0], stopAt: 1.3}); setExpression(w, 'pensive'); }
  put(n, at(X.N, .1, X.deckTop + X.rail.userData.top, -6.2), .6, o.nanFace ?? 'pleased', .1); act(n, c.t, [[0, 'stand']]);
  if (o.look && sitting) w.pivots.head.rotation.y = -.55;
  return {light: at(X.N, 0, 0, -5)};
}
