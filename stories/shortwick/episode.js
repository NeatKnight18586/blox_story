// Shortwick — "In this town, every lie makes you shorter." (Episode 2)
// Episode spec for production/episode/?ep=shortwick. Above the SHOTS marker: sets,
// cast and helpers (changing them re-renders every shot). Below it: one entry per
// shot, anchored to a narration phrase (changing one re-renders only that shot).
import * as T from 'three';
import * as K from '../../studio/town/kit.js';
import * as PR from '../../studio/town/props.js';
import {createCustom, createExtra, setExpression, settleHair} from '../../studio/characters/characters.js';
import {bodyShell} from '../../studio/characters/bodies.js';
import {setSurfaceDetail} from '../../studio/town/materials.js';
import {locomote, idle, ease, lerp, onTwos} from '../../studio/motion/r6.js';
import {act, talk, shiver, faceAt} from '../../studio/motion/acting.js';
import {clouds, birds, rain} from '../../studio/director/world.js';
import {flatMaterial, paintedMaterial} from '../../studio/town/materials.js';
import {easeOutBack} from '../../studio/director/camera.js';
import {landscape, roadCracks} from '../../studio/town/terrain.js';

const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
// Set frames: an origin and a heading (yaw), all in one connected harbour town.
// Shot code places people in a frame's local coordinates; at()/hd() convert to world.
const frame = (x, z, yaw = 0) => ({isFrame: true, x, y: 0, z, yaw});
export const P = frame(0, 0);                    // market square, town hall to the east, sea to the west
export const S = frame(0, 96, -Math.PI / 2);     // High Street: local +x runs south (world +z), local -z is the east side
export const N = frame(60, -70);                 // Tilly Lane, north of the square
export const Q = frame(-80, 6, Math.PI / 2);     // the pier: local -z runs out to sea (world -x)
export const C = frame(3000, 0), B = frame(3400, 0);   // interiors, closed sets away from town
export const sun = [-34, 52, 30];                // afternoon sun from the sea side (west-south-west)
export const tail = 1.8;   // button hold after the last word
export const look = {ao: {intensity: 1, radius: 1.4}};   // contact shading (GTAO)

// ---------------- Cast: new for this episode ----------------
const CAST = {
  wren: {body: 'woman', hd: true, hairLocks: true, scale: 1.2, skin: '#f2d0b0', top: '#f4f1ea', accent: '#e2483d', torso: 'tee', sleeves: 'long', legs: {cloth: '#3e6fb0', shoe: '#e2483d'}, hair: {option: 'long_red', color: '#c8692a'}, faceStyle: {iris: '#3f7f4a', lashes: true}, props: []},
  bo: {body: 'boy', hd: true, hairLocks: true, scale: .58, skin: '#f2d0b0', top: '#7fb0e8', accent: '#ffffff', torso: 'stripe', sleeves: 'long', legs: {cloth: '#7fb0e8', shoe: '#f4f1ea', legLength: .52}, hair: {option: 'messy_brown', color: '#c8692a'}, faceStyle: {iris: '#3f7f4a', blush: true}, props: []},
  nan: {body: 'woman', hd: true, hairLocks: true, scale: .11, skin: '#e0a882', top: '#c94f7c', torso: 'mother', sleeves: 'long', legs: {cloth: '#6b5a8a', shoe: '#5a3b2c'}, hair: {option: 'bun_red', color: '#d9d4cc'}, faceStyle: {iris: '#2f6f8f', lashes: true}, props: ['glasses']},
  mayor: {body: 'man', hd: true, hairLocks: true, scale: .34, skin: '#eab892', top: '#2b2f3a', accent: '#f2b632', torso: 'tee', sleeves: 'long', legs: {cloth: '#2b2f3a', shoe: '#111111'}, hair: {option: 'swept_blue', color: '#7a7a80'}, props: []},
  fisher: {body: 'man', hd: true, hairLocks: true, scale: .84, skin: '#cc8e69', top: '#f2b632', accent: '#2f6f8f', torso: 'hoodie', sleeves: 'long', legs: {cloth: '#2f5a92', shoe: '#2b2b2b'}, hair: {option: 'messy_brown', color: '#4a2c1e'}, props: []},
  sales: {body: 'man', hd: true, hairLocks: true, scale: .14, skin: '#eab892', top: '#e2483d', accent: '#ffffff', torso: 'stripe', sleeves: 'short', legs: {cloth: '#3b3f45', shoe: '#f2f2f2'}, hair: {option: 'swept_blue', color: '#2a2a30'}, props: []},
  teacher: {body: 'woman', hd: true, hairLocks: true, scale: .85, skin: '#cc8e69', top: '#46a85a', torso: 'mother', sleeves: 'long', legs: {cloth: '#4c5a78', shoe: '#5a3b2c'}, hair: {option: 'bun_pink', color: '#3a2418'}, faceStyle: {iris: '#3f7f4a', lashes: true}, props: ['glasses']},
  pell: {body: 'man', hd: true, hairLocks: true, scale: 1, skin: '#e0a882', top: '#8a6a4a', torso: 'mother', sleeves: 'long', legs: {cloth: '#5a5d63', shoe: '#3b2a22'}, hair: {option: 'messy_brown', color: '#d9d4cc'}, props: []},
  boy: {body: 'boy', hd: true, hairLocks: true, scale: .44, skin: '#a0694a', top: '#e2483d', accent: '#ffffff', torso: 'hoodie', sleeves: 'long', legs: {cloth: '#2f5a92', shoe: '#ffd23f', legLength: .52}, hair: {option: 'spiky_blonde', color: '#2a2a30'}, faceStyle: {iris: '#5a3a1e', blush: true}, props: []},
  baker: {body: 'man', hd: true, hairLocks: true, scale: .9, skin: '#cc8e69', top: '#ffffff', accent: '#e9a64b', torso: 'stripe', sleeves: 'short', legs: {cloth: '#3e6fb0', shoe: '#6b4428'}, hair: {option: 'messy_brown', color: '#3a2418'}, props: []},
  gossipA: {body: 'woman', hd: true, hairLocks: true, scale: .72, skin: '#eab892', top: '#9b59b6', accent: '#ffd23f', torso: 'tee', sleeves: 'short', legs: {cloth: '#3b3f45', shoe: '#e2483d'}, hair: {option: 'long_blonde'}, faceStyle: {iris: '#2f6f8f', lashes: true}, props: []},
  gossipB: {body: 'woman', hd: true, hairLocks: true, scale: .8, skin: '#7c4a32', top: '#1fb5a8', accent: '#ffffff', torso: 'stripe', sleeves: 'long', legs: {cloth: '#c9a46a', shoe: '#5a3b2c'}, hair: {option: 'ponytail_black'}, faceStyle: {iris: '#5a3a1e', lashes: true}, props: []},
  liar: {body: 'man', hd: true, hairLocks: true, scale: .95, skin: '#e0a882', top: '#2f80d1', accent: '#ffffff', torso: 'tee', sleeves: 'short', legs: {cloth: '#3b3f45', shoe: '#2b2b2b'}, hair: {option: 'spiky_blonde', color: '#8a5528'}, props: []},
  girl: {body: 'girl', hd: true, hairLocks: true, scale: .5, skin: '#f2d0b0', top: '#ff7aa8', accent: '#ffffff', torso: 'tee', sleeves: 'short', legs: {cloth: '#7a4fa0', shoe: '#ffffff', legLength: .52, sock: '#ffffff'}, hair: {option: 'ponytail_black', color: '#5a3420'}, faceStyle: {iris: '#6b4a2e', lashes: true, blush: true}, props: []},
};

// Wren's loose cardigan and shoes: shells parented to her limbs that keep her
// original size when she shrinks, so sleeves slide past her fingers and shoes go loose.
function outerLayer(a) {
  const yarn = flatMaterial('#e9a64b'), cuff = flatMaterial('#d18a2e');
  const front = paintedMaterial(128, 128, (g, W, H) => { g.fillStyle = '#e9a64b'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4f1ea'; g.fillRect(W * .38, 0, W * .24, H * .9); g.fillStyle = '#d18a2e'; g.fillRect(0, H * .88, W, H * .12); for (const y of [.3, .5, .7]) { g.beginPath(); g.arc(W * .35, H * y, 4, 0, 7); g.fill(); } });
  const mk = (geo, mats, parent, name) => { const m = new T.Mesh(geo, mats); m.name = name; m.castShadow = true; parent.add(m); return m; };
  // Shells follow her body type (shaped like the body under them, a little looser).
  const type = a.body.type, [aw, ad] = a.body.arm, [lw, ld] = a.body.leg;
  const L = {torso: mk(bodyShell(type, 'torso', .06), [yarn, yarn, yarn, yarn, front, yarn], a.parts.torso, 'cardigan_body'), arms: [], shoes: []};
  for (const side of ['left', 'right']) {
    const s = mk(bodyShell(type, 'arm', .05, {h: 2.0}), yarn, a.parts[side + 'Arm'], 'cardigan_sleeve'); mk(bodyShell(type, 'arm', .07, {h: .22}), cuff, s, 'cuff').position.y = -.9; L.arms.push(s);
    const shoe = mk(new T.BoxGeometry(lw + .06, .5, ld + .24), flatMaterial('#e2483d'), a.parts[side + 'Leg'], 'loose_shoe'); mk(new T.BoxGeometry(lw + .08, .12, ld + .26), flatMaterial('#f4f1ea'), shoe, 'sole').position.y = -.2; L.shoes.push(shoe);
  }
  // k = original scale / current scale (1 = fits).
  L.set = (k = 1, on = true, slip = 0) => {
    for (const m of [L.torso, ...L.arms, ...L.shoes]) m.visible = on;
    L.torso.scale.setScalar(k); L.torso.position.y = 1.03 - 1.03 * k;
    for (const s of L.arms) { const ks = 1 + 2.4 * (k - 1); s.scale.set(k, ks, k); s.position.y = 1.0 - 1.0 * ks; }
    for (const s of L.shoes) { s.scale.setScalar(k); s.position.set(0, -1 + .25 * k, .06 * k + slip); }
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
  setSurfaceDetail('hd');   // opt-in HD surfaces (2× texture resolution, bump relief, wear)
  const add = (o, F, x, z, ry = 0, y = 0) => { o.position.copy(at(F, x, y, z)); o.rotation.y = hd(F, ry); scene.add(o); return o; };

  // ---------- One connected harbour town on endless land and sea ----------
  landscape(scene, {seaX: -80, seed: 11, beach: false});
  add(PR.quay({len: 240, h: .4}), P, -80, 0);
  add(PR.lighthouse({}), P, -150, -62);
  const boats = [['#e2483d', -92, -14, .3], ['#2f80d1', -95, 22, -.2], ['#f2b632', -112, -2, .8]].map(([c, x, z, r]) => add(PR.boat({color: c}), P, x, z, r, -.55));

  // ---------- Market square (P): cobbles, town hall to the east, harbour to the west ----------
  PR.box(scene, 'square_paving', [44, .3, 32], [0, .15, 0], ['paving', '#e7dac3']);
  for (const [x, z, w, d] of [[0, 16.2, 44, .5], [0, -16.2, 44, .5]]) PR.box(scene, 'square_kerb', [w, .45, d], [x, .22, z], ['stone', '#d8d3c9']);
  add(PR.townHall({}), P, 34, 0, -Math.PI / 2);
  const podium = add(PR.podium({text: 'MAYOR'}), P, 25.4, 0, -Math.PI / 2, .3);
  const stack = add(PR.bookStack({n: 7, seed: 2}), P, 27.2, 0, -Math.PI / 2, .3);
  add(K.fountain(), P, -10, -6, 0, .3);
  const plazaBench = add(K.bench({color: '#4a90c2'}), P, 8, 12.4, Math.PI, .3);
  add(K.bench({}), P, -14, 12.4, Math.PI, .3);
  for (const [x, z] of [[-20, -14], [20, -14], [-20, 14], [20, 14]]) add(K.lampPost({}), P, x, z, 0, .3);
  for (const [x, z] of [[-18, -9], [16, 9]]) add(K.tree({h: 8, seed: x & 3}), P, x, z, 0, .3);
  add(K.marketStall({canopy: ['#e2483d', '#fff4e6']}), P, -2, -11, 0, .3);
  // North row (facing the square), with the lane to Tilly Lane between them.
  add(K.shopFront({text: 'TOYS', wall: 'plaster', color: '#f2c14e', awningColors: ['#2f80d1', '#ffffff'], signBg: '#e2483d', w: 15}), P, -21, -17);
  add(K.shopFront({text: 'CAFE', wall: 'siding', color: '#7fc8a9', awningColors: ['#f39c34', '#fff4e6'], signBg: '#6b3f2a', w: 15}), P, 10, -17);
  add(K.house({color: '#f4a7b9', roofColor: '#5a6fb0', door: '#2f6f8f'}), P, 25, -19);
  add(K.street({len: 40, road: 8, walk: 3, crossings: []}), P, -5, -36, Math.PI / 2);
  // Harbour Road west to the quay, cottages either side.
  add(K.street({len: 58, crossings: [-24]}), P, -51, 0);
  [[-36, '#8fc6e8', '#c1543f'], [-58, '#fbe3b8', '#3f8f74']].forEach(([x, c, r]) => add(K.house({color: c, roofColor: r}), P, x, -13));
  [[-34, '#c9d2ee', '#c1543f'], [-56, '#ffd59e', '#2f6f8f']].forEach(([x, c, r]) => add(K.house({color: c, roofColor: r}), P, x, 13, Math.PI));
  add(K.shopFront({text: 'FISH', wall: 'siding', color: '#bfe3df', awningColors: ['#2f80d1', '#ffffff'], signBg: '#2f80d1', w: 14}), P, -70, -13);

  // ---------- High Street (S): runs south from the square, cracked and potholed ----------
  add(K.street({len: 160, crossings: [-70]}), S, 0, 0);
  const east = [K.shopFront({text: 'BOOKS', wall: 'plaster', color: '#c9a0dc', awningColors: ['#46a85a', '#fff4e6'], signBg: '#46a85a'}), K.house({color: '#8fc6e8', roofColor: '#c1543f', door: '#e4574a'}),
    K.shopFront({text: 'USED CARTS', wall: 'siding', color: '#f2c14e', awningColors: ['#e2483d', '#ffffff'], signBg: '#e2483d', w: 18}), K.house({color: '#f4a7b9', roofColor: '#5a6fb0', door: '#2f6f8f', shutter: '#ffffff'}),
    K.shopFront({text: 'HATS', wall: 'brick', color: '#6fa8dc', awningColors: ['#ffd23f', '#e2483d'], signBg: '#ffd23f', signFg: '#2b2b2b', shutter: '#e2483d'}), K.house({color: '#ffd59e', roofColor: '#2f6f8f'})];
  const ew = [16, 14, 18, 14, 16, 14]; let fx = -66;
  east.forEach((f, i) => { add(f, S, fx + ew[i] / 2, -12.95); fx += ew[i] + 1.2; });
  const west = [K.house({color: '#bfe3df', roofColor: '#2f6f8f'}), K.shopFront({text: 'FLOWERS', wall: 'plaster', color: '#ffd59e', awningColors: ['#ff6fa1', '#fff4e6'], signBg: '#ff6fa1'}),
    K.house({color: '#f1d6b8', roofColor: '#c1543f'}), K.clockTower({roofColor: '#c1543f'}), K.house({color: '#c9d2ee', roofColor: '#3f8f74'}), K.shopFront({text: 'CAFE', wall: 'siding', color: '#7fc8a9', awningColors: ['#f39c34', '#fff4e6'], signBg: '#6b3f2a', w: 15})];
  const ww = [14, 16, 14, 9, 14, 15]; fx = -66;
  west.forEach((f, i) => { add(f, S, fx + ww[i] / 2, 12.95, Math.PI); fx += ww[i] + 1.2; });
  for (let lx = -70; lx <= 70; lx += 15) { add(K.lampPost({}), S, lx, -7.6); add(K.lampPost({}), S, lx + 7, 7.6); }
  for (const tx of [-44, -18, 26, 52]) add(K.tree({h: 8, seed: tx & 3}), S, tx, -9.8);
  add(K.bench({}), S, -37, -10.6); add(K.hydrant(), S, -9.5, -7.6);
  const holes = [[-64, 1.5, 1.6], [-58, -2.4, 1.2], [-52, 2.6, 1.8], [-46, -1.2, 1.3]].map(([x, z, r]) => add(PR.pothole({r}), S, x, z));
  [[-70, 0, 9, 1], [-61, -3, 7, 2], [-55, 1, 10, 3], [-49, 3.5, 6, 4], [-43, -2, 8, 5], [-66, 3.6, 5, 6]].forEach(([x, z, len, seed]) => add(roadCracks({len, seed}), S, x, z, seed * .7));
  const potCart = add(PR.cart({color: '#9b59b6', tag: '$2'}), S, -60, 0);
  // Two promises, the newer nailed below the older one.
  const oldSigns = [add(PR.signBoard('ROADS FIXED SOON!', {w: 4.6, stake: 2.6}), S, -55.5, 9.6, Math.PI), add(PR.signBoard('ROADS FIXED VERY SOON!', {w: 5.4, bg: '#ffd23f', stake: .9}), S, -55.5, 9.35, Math.PI)];
  oldSigns[0].rotation.z = .04; oldSigns[1].rotation.z = -.07;
  const lotX = -5;
  const carts = [['#e2483d', '$5'], ['#2f80d1', '$9'], ['#46a85a', '$3'], ['#f2b632', '$12']].map(([c, tag], i) => add(PR.cart({color: c, tag}), S, lotX - 6 + i * 4.2, -9.6, .2 - i * .15, .35));

  // ---------- Tilly Lane (N): Nan's house with a raised porch, bakery, Mr. Pell's steps ----------
  add(K.street({len: 170, crossings: []}), N, 0, 12);
  const nanHouse = add(K.house({w: 14, color: '#fbe3b8', roofColor: '#3f8f74', door: '#c94f7c', shutter: '#3f8f74'}), N, 0, -9.5, 0, 2.2);
  PR.box(scene, 'foundation', [14.4, 2.2, 8], [N.x, 1.1, N.z - 13.5], ['stone', '#c9c2b6']);
  const deckTop = 2.2;
  PR.box(scene, 'porch_deck', [9, .3, 3.6], [N.x + 1, deckTop - .15, N.z - 7.7], ['planks', '#b98a5c']);
  for (const x of [-3.3, 1, 5.3]) PR.box(scene, 'porch_post_low', [.35, deckTop, .35], [N.x + x, deckTop / 2, N.z - 6.1], '#fbf4e6');
  for (let i = 0; i < 3; i++) PR.box(scene, 'porch_stair', [3, deckTop / 3 * (i + 1), .75], [N.x + 2.8, deckTop / 6 * (i + 1), N.z - 4.0 - i * .75], ['planks', '#b98a5c']);
  const rail = add(PR.porchRail({w: 3.4, h: 1.4}), N, -1.2, -6.2, 0, deckTop);
  const newelTop = 3.62; PR.box(scene, 'newel_post', [.5, newelTop, .5], [N.x + 1.0, newelTop / 2, N.z - 4.3], '#fbf4e6', .04); PR.box(scene, 'newel_cap', [.7, .14, .7], [N.x + 1.0, newelTop - .05, N.z - 4.3], '#fbf4e6', .03);
  const table = PR.box(scene, 'porch_table', [1.4, 1.5, 1.4], [N.x - 2.6, deckTop + .75, N.z - 8.2], ['planks', '#a0673a'], .05);
  const cup = add(PR.teacup({}), N, -2.6, -8.2, 0, deckTop + 1.5);
  add(K.house({color: '#c9d2ee', roofColor: '#c1543f'}), N, 17, -12.5);
  add(PR.fence({len: 12}), N, 17, -3);
  add(K.shopFront({text: 'BAKERY', wall: 'brick', color: '#d9785a', awningColors: ['#e2483d', '#fff4e6'], signBg: '#2f6f8f', w: 16}), N, 34, -12.95);
  const sign = add(PR.hangingSign('FRESH BREAD', {bg: '#6b3f2a'}), N, 25.6, -11.2, -Math.PI / 2, 6.0);
  const crates = [0, 1, 2].map(i => PR.box(scene, 'crate_stack', [1.5, 1.4, 1.5], [N.x + 25.6, .7 + i * 1.4, N.z - 7.0], ['planks', '#d9a86c'], .04));
  add(K.house({w: 13, color: '#e8c8d6', roofColor: '#6b3f2a'}), N, 52, -12.5); add(K.house({w: 13, color: '#bfe3df', roofColor: '#c1543f'}), N, -48, -12.5);
  const steps = add(PR.steps({n: 8, w: 4.4, rise: .7, run: 1.4}), N, -24, -1);
  PR.box(scene, 'hill', [30, 5.6, 26], [N.x - 30, 2.8, N.z - 25], ['grass', '#7cc45a']);
  add(K.house({w: 12, color: '#f1d6b8', roofColor: '#6b3f2a', door: '#2f6f8f'}), N, -30, -16, 0, 5.6);
  for (const tx of [-60, -14, 46, 66]) add(K.tree({h: 9, seed: tx & 3}), N, tx, -10);
  add(K.bush({}), N, -7, -6); add(K.bush({r: 1.4}), N, 9, -6.2); add(K.lampPost({}), N, 10, 4.5);
  const cats = [['#f39c34', '#c96b2c'], ['#9a9a9a', '#5a5a5a'], ['#2b2b2b', '#444444']].map(([c, s]) => { const k = PR.cat({color: c, stripe: s}); scene.add(k); return k; });
  const bag = PR.groceryBag(); scene.add(bag);
  const nanFish = PR.fish({len: .5, color: '#a9c4d9'}); scene.add(nanFish);

  // ---------- Pier (Q): from the quay out to sea ----------
  PR.box(scene, 'pier_deck', [5, .35, 24], [Q.x - 12, .2, Q.z], ['planks', '#b98a5c']).rotation.y = Math.PI / 2;
  for (let x = 0; x <= 24; x += 3) for (const z of [-2.4, 2.4]) PR.box(scene, 'pier_post', [.45, 2.6, .45], [Q.x - x, -.6, Q.z + z], '#7a5233');
  for (const [x, z] of [[-1.6, -4], [1.7, -9]]) PR.box(scene, 'barrel', [1.1, 1.4, 1.1], [...at(Q, x, 1.05, z).toArray()], ['planks', '#a0673a'], .3);
  const tinyFish = PR.fish({len: .55, color: '#7fa8c9'}); scene.add(tinyFish);
  const bucket = new T.Group(); bucket.name = 'bucket'; PR.box(bucket, 'bucket_body', [.9, .8, .9], [0, .4, 0], '#8fa3b0', .1); scene.add(bucket);

  // ---------- Classroom (C) and bedroom (B): closed sets away from town ----------
  add(PR.room({w: 28, d: 26, h: 12, wall: '#f6e2b8', floor: '#c48a54', windowAt: [-7, 6.5], closed: true}), C, 0, 0);
  add(PR.chalkboard({w: 12, h: 4.6, text: ['Spelling: H O N E S T', '3 x 4 = 12']}), C, 2, -23.4);
  add(PR.desk({w: 4, d: 2.4, h: 2.8, color: '#a0673a'}), C, 6, -19);
  add(PR.shelf({w: 6}), C, -10, -23.1);
  const kids = [];
  for (const [r, z] of [-18.5, -14.5, -10.5].entries()) for (const [k, x] of [-7.5, -2.5, 2.5, 7.5].entries()) {
    add(PR.desk({w: 2.4, d: 1.6, h: 2.15}), C, x, z);   // top clears a seated kid's thighs
    const ch = add(PR.chair({scale: .62, color: ['#e2483d', '#2f80d1', '#f2b632', '#46a85a'][(r + k) % 4]}), C, x, z + 1.5, Math.PI);
    const kid = createExtra(40 + r * 4 + k, {v3: 'kid'}); kid.userData = {base: .58}; kid.root.scale.setScalar(.58); scene.add(kid.root); kids.push([kid, V(C.x + x, ch.userData.seat, C.z + z + 1.3)]);
  }
  add(PR.desk({w: 3.6, d: 2.2, h: 3.8, shelf: false}), C, 0, -5.2);   // Wren's desk: high enough for her seated legs
  const wrenChair = add(PR.chair({}), C, 0, -3.4, Math.PI);
  const teacherChair = add(PR.chair({color: '#2f80d1'}), C, 2.6, -6.4, -.6);
  const bedRoom = add(PR.room({w: 22, d: 20, h: 11, wall: '#cfe0f2', floor: '#b98a5c', windowAt: [-5, 6], closed: true, night: true}), B, 0, 0);
  const bedG = add(PR.bed({blanket: '#5b8fd9'}), B, 3, -10);
  const stand = add(PR.nightstand({}), B, 7.4, -13.2);
  add(PR.rug({w: 7, d: 4.5}), B, -1, -8); add(PR.shelf({w: 4.4, books: 8}), B, -7.6, -16.6);
  const bedChair = add(PR.chair({color: '#e9a64b'}), B, -2.2, -9.6, Math.PI / 2);

  // ---------- People (lively eyes for everyone in this episode) ----------
  const cast = {};
  for (const [name, p] of Object.entries(CAST)) { const a = createCustom(name, p); a.userData = {base: p.scale}; scene.add(a.root); cast[name] = a; }
  topHat(cast.mayor);
  const layer = outerLayer(cast.wren);
  const IRIS = ['#6b4a2e', '#2f6f8f', '#3f7f4a', '#5a3a6e', '#8a5528'];
  const extras = Array.from({length: 18}, (_, i) => { const e = createExtra(i + 7, {v3: true}); e.userData = {base: [.62, .9, .78, .86, .55, .95, .7, .82, .9, .6, .88, .75, .8, .92, .66, .84, .58, .9][i]}; e.root.scale.setScalar(e.userData.base); scene.add(e.root); return e; });
  const people = [...Object.values(cast), ...extras, ...kids.map(k => k[0])];
  people.forEach((a, i) => { a.faceStyle ??= {iris: IRIS[i % IRIS.length], blush: a.userData.base < .7}; setExpression(a, a.expression); });

  // Screen tint (memories), parented to the camera.
  const tint = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false}));
  tint.position.z = -.2; tint.renderOrder = 999; tint.name = 'tint'; camera.add(tint);

  const props = [bag, nanFish, bucket, tinyFish, ...cats];
  function reset() {
    for (const a of people) { a.root.visible = false; a.root.rotation.set(0, 0, 0); a.root.scale.setScalar(a.userData.base); for (const p of Object.values(a.pivots)) p.rotation.set(0, 0, 0); }
    for (const p of props) { p.visible = false; p.scale.setScalar(1); p.rotation.set(0, 0, 0); if (p.parent !== scene) scene.add(p); }
    layer.set(1, false); sign.userData.setTilt(1); tint.material.opacity = 0;
    potCart.position.copy(at(S, -60, 0, 0)); potCart.rotation.set(0, hd(S, 0), 0);
    for (const s of extras) setExpression(s, 'calm');
  }
  // Ambient life (episode time, so it flows across cuts) + rain + gently bobbing boats.
  const amb = [P, at(S, 0, 0, 0), N, Q].map(c => [clouds(scene, c, {seed: Math.round(c.x) + 3}), birds(scene, c, {seed: Math.abs(Math.round(c.z)) % 7})]);
  const rainFx = rain(scene);
  function ambient(t, camPos, out, camera) {
    for (const [c, b] of amb) { c(t); b(t); }
    boats.forEach((b, i) => { b.position.y = -.55 + .12 * Math.sin(t * 1.3 + i * 2); b.rotation.z = .04 * Math.sin(t * 1.1 + i); });
    rainFx(t, camPos, out.rain, camera); if (out.tint) { tint.material.color.set(out.tint[0]); tint.material.opacity = out.tint[1]; }
  }

  const points = {
    pothole: () => holes[1].position.clone().add(V(0, .4, 0)), signs: () => oldSigns[0].position.clone().add(V(0, 2.6, 0)),
    stackBase: () => stack.position.clone().add(V(0, 1.2, 0)), rooftops: () => V(N.x + 6, 19, N.z - 6),
    cup: () => cup.position.clone().add(V(0, .35, 0)), sign: () => sign.localToWorld(V(1.8, -1.2, 0)),
    stepsTop: () => V(N.x - 24, 5.6, N.z - 12.6), bucket: () => at(Q, 1.6, 1, -14),
    fish: () => { tinyFish.updateMatrixWorld(true); return tinyFish.getWorldPosition(V()); },
    hand: () => cast.wren.parts.rightArm.localToWorld(V(0, -1.1, .2)),
    feet: () => cast.wren.root.localToWorld(V(0, 2.0, 1.9)), feetStand: () => cast.wren.root.localToWorld(V(0, .6, .5)), bed: () => V(B.x + 1, 2.8, B.z - 10.5), lot: () => at(S, lotX, 2.4, -9.6),
    plaza: () => V(P.x + 4, 4, P.z), town: () => V(N.x, 6, N.z - 6), deck: () => V(N.x + 1.8, 3.2, N.z - 4.4), pier: () => at(Q, 0, 2.4, -15),
  };
  // After each stage: front hair locks hang with the body (secondary motion).
  const settle = () => { for (const a of people) if (a.root.visible) settleHair(a); };
  return {settle, plazaBench, potCart, bedWindow: bedRoom.userData.window, cast, extras, kids, layer, reset, ambient, points, P, S, N, Q, C, B, podium, stack, holes, carts, cats, bag, nanFish, bucket, tinyFish, sign, crates, steps, rail, deckTop, newelTop: 3.62 + .02,   // cap top (cap centre 3.57, .14 tall)
    cup, table,
    wrenChair, teacherChair, bedG, stand, bedChair, lotX, oldSigns};
}

// ---------------- Staging helpers ----------------
export function put(a, pos, ry = 0, face = null, scale = null) {
  a.root.visible = true; a.root.position.copy(pos); a.root.rotation.set(0, ry, 0);
  a.root.scale.setScalar(scale ?? a.userData.base); if (face) setExpression(a, face); return a;
}
export const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
export const at = (F, x, y, z) => { const c = Math.cos(F.yaw ?? 0), s = Math.sin(F.yaw ?? 0); return V(F.x + x * c + z * s, (F.y ?? 0) + y, F.z - x * s + z * c); };
export const hd = (F, a) => a + (F.yaw ?? 0);                         // local heading → world heading
export const wyaw = (F, deg) => deg + (F.yaw ?? 0) * 180 / Math.PI;   // local camera yaw → world
export const fromA = (F, x, y, z) => at(F, x, y, z).toArray();
export const dirA = (F, dx, dz) => { const v = at({x: 0, z: 0, yaw: F.yaw}, dx, 0, dz); return [v.x, v.z]; };
// A quick shrink with a squash-and-settle pop (the rule firing).
export function shrink(a, t, t0, from, to, dur = .32) {
  const k = easeOutBack((t - t0) / dur, 2.2), s = from + (to - from) * k;
  const sq = t > t0 && t < t0 + dur ? 1 - .12 * Math.sin((t - t0) / dur * Math.PI) : 1;
  a.root.scale.set(s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq)); return s;
}
// Seated on a seat of height h (sit pose lowers the root by one body unit).
export const seatY = (h, s) => h - .5 * s + s;
export const crowdFace = (t, k) => ['curious', 'pleased', 'confident', 'calm', 'happy'][(k + Math.floor(t)) % 5];
const xz = v => [v.x, v.z];
// The fisherman's tiny catch, held up in his right hand (it wiggles on twos).
function holdFish(X, f, t) {
  const fish = X.tinyFish; fish.visible = true; f.parts.rightArm.add(fish);
  fish.position.set(0, -1.15, .35); fish.scale.setScalar(1 / f.root.scale.x * .9 * f.root.scale.x / .84); fish.rotation.set(0, Math.PI / 2, Math.PI / 2 + .25 * Math.sin(onTwos(t) * 9));
}
function crowdAt(X, t, list, {face = null, look = null} = {}) {
  list.forEach(([i, x, z, ry, base], k) => {
    const e = X.extras[i]; put(e, V(x, .3, z), ry, face ?? crowdFace(t, k), base);
    act(e, t, [[0, 'stand']], {seed: k}); if (look) e.pivots.head.rotation.x = look;
  });
}
function walkers(X, t, list) {
  for (const [i, from, dir, gait = 'walk'] of list) { const e = X.extras[i]; e.root.visible = true; e.root.scale.setScalar(e.userData.base); locomote(e, t, {gait, from, dir}); }
}

// ==== SHOTS ====
export const shots = [
  // --- Cold open ---
  {id: 'C01', at: 'In this town', cam: {on: 'plaza', size: 'WS', worldYaw: -100, pitch: 16, h: 52, y: .55, move: {type: 'craneDown', amt: 18}},
    stage(c, X) {
      walkers(X, c.T, [[0, fromA(X.P, -14, .3, 4), [1, 0]], [1, fromA(X.P, 12, .3, 9), [-1, 0]], [2, fromA(X.P, -6, .3, 12), [.6, -.8]], [3, fromA(X.P, 3, .3, -4), [-.7, .7]], [4, fromA(X.P, 9, .3, -1), [0, 1], 'child_walk']]);
      put(X.cast.wren, at(X.P, -4, .3, 6), -1.2, 'calm'); idle(X.cast.wren, c.t);
      put(X.cast.nan, at(X.P, -5.2, .3, 6.6), -1.6, 'pleased'); idle(X.cast.nan, c.t, {seed: 2});
    }},
  {id: 'C02', at: 'makes you shorter', cam: {on: 'liar', size: 'MS', yaw: 25, pitch: 2, move: 'push', impact: .25},
    stage(c, X) {
      const L = X.cast.liar, w = X.extras[5], p = at(X.P, -3, .3, -6.5);
      put(L, p, .35, null); put(w, at(X.P, -7.2, .3, -5.2), facing(at(X.P, -7.2, 0, -5.2), p), 'curious');
      const tS = c.at('shorter'); shrink(L, c.t, tS, .95, .66);
      act(L, c.t, [[0, 'shrug'], [tS + .1, 'recoil']]); if (c.t < tS) talk(L, c.t);
      setExpression(L, c.t < tS ? 'confident' : 'shocked'); act(w, c.t, [[0, 'stand'], [tS + .15, 'gasp']]);
      return {cam: {on: 'liar', scaleRef: .95}};
    }},
  // --- Three demonstrations ---
  {id: 'D01', at: 'The mayor promised', lintIgnore: ['view blocked'], cam: {on: 'pothole', size: 'MLS', worldYaw: 180, pitch: 24, h: 15, y: .55, move: 'push'},
    stage(c, X) {
      walkers(X, c.T, [[6, fromA(X.S, -40, .35, -8.6), dirA(X.S, -1, 0)]]);
      const cartT = c.at('roads', -.25), k = ease((c.t - cartT) / .45), roll = Math.min(1, c.t / Math.max(.1, cartT));
      X.potCart.position.copy(at(X.S, -56 + 2.6 * (1 - roll), .1 - .75 * k, -2.4)); X.potCart.rotation.set(0, hd(X.S, 0), .35 * k);
    }},
  {id: 'D02', at: 'Twice', cam: {on: 'signs', size: 'MS', h: 11.5, worldYaw: wyaw(S, 180), pitch: 4, y: .45, move: {type: 'push', amt: .08}, impact: .15},
    stage(c, X) {}},
  {id: 'D03', at: 'Now he gives', lintIgnore: ['view blocked'], cam: (c, X) => ({on: X.points.stackBase(), size: 'MLS', h: lerp(8.5, 5.8, ease(c.u)), worldYaw: 8, pitch: 4, y: lerp(.62, .45, ease(c.u)), offset: [0, lerp(0, 5.1, ease(Math.min(1, c.u * 1.3))), 0], move: 'hold'}),
    stage(c, X) {
      const m = X.cast.mayor; put(m, X.stack.position.clone().setY(X.stack.position.y + X.stack.userData.top + .02), -.55, 'confident');
      act(m, c.t, [[0, 'speech'], [c.at('books', -.3), 'pointUp']]); talk(m, c.t);
      crowdAt(X, c.t, [[7, X.P.x + 16, X.P.z + 2, Math.PI / 2], [8, X.P.x + 15, X.P.z - 3, Math.PI / 2 + .3], [9, X.P.x + 13, X.P.z + 5, Math.PI / 2 - .3]], {look: -.2});
    }},
  {id: 'F01', at: 'The fisherman swore', cam: {on: 'fisher', size: 'MS', yaw: -22, pitch: 4, move: 'push'},
    stage(c, X) {
      const f = X.cast.fisher; put(f, at(X.Q, .3, .4, -19), hd(X.Q, 0), 'confident');
      act(f, c.t, [[0, 'hold'], [c.at('this big', -.25), 'armsWide', {blend: .35}]]); talk(f, c.t, {amt: .8}); holdFish(X, f, c.t);
      return {lightDir: [30, 50, 20]};
    }},
  {id: 'F02', at: 'and lost an inch', cam: {on: 'fisher', size: 'MCU', yaw: 15, pitch: 0, move: {type: 'push', amt: .1}, scaleRef: .84},
    stage(c, X) {
      const f = X.cast.fisher; put(f, at(X.Q, .3, .4, -19), hd(X.Q, 0), null);
      const tI = c.at('inch'); shrink(f, c.t, tI, .84, .74);
      act(f, c.t, [[0, 'armsWide'], [tI + .1, 'gasp']]); if (c.t < tI) talk(f, c.t); holdFish(X, f, c.t);
      setExpression(f, faceAt(c.t, [[0, 'confident'], [tI + .05, 'shocked'], [tI + .9, 'shame']]));
      return {lightDir: [30, 50, 20]};
    }},
  {id: 'F03', at: 'the sentence', cam: {on: 'fisher', size: 'MS', scaleRef: .74, yaw: -55, pitch: 2, move: 'push', impact: .1},
    stage(c, X) {
      const f = X.cast.fisher; put(f, at(X.Q, .3, .4, -19), hd(X.Q, 0), 'shame', .74); act(f, c.t, [[0, 'gasp']]); f.pivots.head.rotation.x = .3; holdFish(X, f, c.t);
      return {lightDir: [30, 50, 20]};
    }},
  {id: 'L01', at: 'And the man who sells', cam: {on: 'sales', size: 'FS', scaleRef: .55, yaw: 10, pitch: 6, y: .45, move: 'push'},
    stage(c, X) {
      walkers(X, c.T, [[3, fromA(X.S, -18, .35, -7.2), dirA(X.S, 1, 0)]]);
      X.carts[1].updateMatrixWorld(true);
      put(X.cast.sales, X.carts[1].localToWorld(V(-.9, 2.45, .2)), hd(X.S, .1), 'devious'); act(X.cast.sales, c.t, [[0, 'armsWide'], [.6, 'cheer'], [1.1, 'armsWide']]);
    }},
  {id: 'L02', at: "He's about the size", cam: {on: 'sales', size: 'MS', yaw: 70, pitch: 14, scaleRef: .3, y: .48, move: 'push', impact: .15},
    stage(c, X) {
      const s = X.cast.sales, base = at(X.S, 14, .35, -8.2); put(s, base, hd(X.S, 0), null);
      act(s, c.t, [[0, 'point'], [c.at('shoe'), 'handsHips']]); talk(s, c.t);
      setExpression(s, faceAt(c.t, [[0, 'devious'], [c.at('shoe'), 'confident']]));
      put(X.extras[12], at(X.S, 13.2, .35, -8.55), hd(X.S, .3), 'incredulous'); act(X.extras[12], c.t, [[0, 'lookDown']]);
    }},
  // --- The kid ---
  {id: 'K01', at: 'Then there was Wren', cam: {on: 'wren', size: 'FS', yaw: 35, pitch: -6, move: {type: 'orbit', amt: 8}},
    stage(c, X) {
      const w = X.cast.wren; w.root.visible = true; locomote(w, c.t, {from: fromA(X.S, 2, .35, -8.6), dir: dirA(X.S, -1, 0)}); setExpression(w, 'calm');
      walkers(X, c.T, [[0, fromA(X.S, -16, .35, -9.6), dirA(X.S, 1, 0)], [9, fromA(X.S, 12, .35, -9.8), dirA(X.S, -1, 0), 'child_walk'], [13, fromA(X.S, -12, .35, -7.4), dirA(X.S, 1, 0)]]);
    }},
  {id: 'K02', at: 'Wren had never told', cam: {on: 'wren', size: 'MCU', yaw: 18, pitch: -4, move: 'push'},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.S, -14, .35, -8.6), hd(X.S, .6), 'pleased'); act(w, c.t, [[0, 'stand']]); }},
  {id: 'K03', at: 'Not one. And in', cam: {on: 'wren', size: 'CU', yaw: -15, pitch: -6, move: {type: 'push', amt: .12}},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.S, -14, .35, -8.6), hd(X.S, .6), 'happy'); act(w, c.t, [[0, 'stand']]); }},
  {id: 'K04', at: 'that made her the tallest', cam: {on: 'wren', size: 'WS', h: 14, yaw: 10, pitch: 10, y: .38, move: {type: 'crane', amt: 6}},
    stage(c, X) {
      const w = X.cast.wren; put(w, at(X.S, -14, .35, -8.6), hd(X.S, .6), 'pleased'); act(w, c.t, [[0, 'stand']]);
      crowdAt(X, c.t, [[0, ...xz(at(X.S, -17, 0, -7.4)), hd(X.S, .8)], [1, ...xz(at(X.S, -11, 0, -7.8)), hd(X.S, -.6)], [4, ...xz(at(X.S, -15.6, 0, -5.6)), hd(X.S, 2.6)], [6, ...xz(at(X.S, -12.2, 0, -5.4)), hd(X.S, -2.6)], [10, ...xz(at(X.S, -18.4, 0, -9.6)), hd(X.S, .9)]], {look: -.25});
    }},
  {id: 'K05', at: 'People called it showing', cam: {on: ['gossipA', 'gossipB'], size: 'MS', yaw: 15, pitch: 2, move: 'drift'},
    stage(c, X) {
      const a = X.cast.gossipA, b = X.cast.gossipB, p = at(X.S, -37, .35, 8.4);
      put(a, p, hd(X.S, Math.PI + 1.15), 'snooty'); put(b, at(X.S, -35.4, .35, 8.2), hd(X.S, Math.PI - 1.2), 'devious');
      act(a, c.t, [[0, 'handsHips']]); act(b, c.t, [[0, 'shy']]); talk(b, c.t, {amt: .6});
      a.pivots.head.rotation.y = .25; setExpression(a, faceAt(c.t, [[0, 'snooty'], [c.at('off', -.1), 'irritated']]));
    }},
  {id: 'K06', at: 'Kids made her sit', lintIgnore: ['head cut'], cam: {on: 'wren', size: 'WS', h: 12, worldYaw: 180, pitch: 10, y: .42, fov: 62, move: {type: 'pull', amt: .1}},
    stage(c, X) {
      for (const [k, [kid, seat]] of X.kids.entries()) { put(kid, V(seat.x, seatY(seat.y, .58) - .58, seat.z), Math.PI, ['calm', 'happy', 'curious', 'bored'][k % 4], .58); act(kid, c.t, [[0, 'sitHands']], {seed: k}); kid.pivots.head.rotation.y = (k % 3 - 1) * .5; }
      const w = X.cast.wren; put(w, V(X.C.x, seatY(X.wrenChair.userData.seat, 1.2) - 1.2, X.C.z - 3.6), Math.PI, 'pouty'); act(w, c.t, [[0, 'sitHands']]);
      return {light: at(X.C, 0, 0, -10), mood: 'interior'};
    }},
  {id: 'K07', at: 'Even her teacher', cam: {on: ['teacher', 'wren'], size: 'MLS', worldYaw: -110, pitch: 4, fov: 46, move: 'push'},
    stage(c, X) {
      const w = X.cast.wren; put(w, V(X.C.x, seatY(X.wrenChair.userData.seat, 1.2) - 1.2, X.C.z - 3.6), Math.PI, null); act(w, c.t, [[0, 'sitHands'], [c.at('talk'), 'shy']], {seated: true});
      setExpression(w, faceAt(c.t, [[0, 'calm'], [c.at('talk'), 'shame']]));
      // Teacher: seated on her chair, then rises and steps forward clear of it before pointing.
      const tc = X.cast.teacher, ts = .85, tUp = c.at('stood', -.2), up = ease((c.t - tUp) / .55), ry = -.75;
      const seatPos = at(X.C, 2.6, 0, -6.4).setY(seatY(X.teacherChair.userData.seat, ts) - ts), standPos = seatPos.clone().add(V(Math.sin(ry), 0, Math.cos(ry)).multiplyScalar(1.3)).setY(0);
      put(tc, seatPos.clone().lerp(standPos, up), ry, 'irritated');
      if (c.t < tUp) act(tc, c.t, [[0, 'sitHands']], {seated: true});
      else { act(tc, c.t, [[tUp - 1, 'sitHands'], [tUp, 'stand', {blend: .55, smooth: true}], [c.at('talk'), 'point']]); if (up < 1) tc.root.position.y = seatPos.y * (1 - up) - ts * (1 - up); }
      if (c.t > c.at('talk')) talk(tc, c.t);
      return {light: at(X.C, 0, 0, -6), mood: 'interior'};
    }},
  // --- Re-hook ---
  {id: 'R01', at: 'But Wren noticed', cam: {on: 'wren', size: 'MCU', yaw: 18, pitch: -2, move: {type: 'push', amt: .15}},
    stage(c, X) {
      const w = X.cast.wren; put(w, at(X.N, 8, .35, 3.4), -1.4 - .3 * ease((c.t - c.at('noticed')) / .3), null); act(w, c.t, [[0, 'stand']]); setExpression(w, faceAt(c.t, [[0, 'calm'], [c.at('noticed'), 'curious']]));
    }},
  {id: 'R02', at: 'The kindest woman', cam: {on: 'nan', size: 'FS', scaleRef: .4, worldYaw: -12, pitch: 6, y: .45, move: 'push'},
    stage(c, X) {
      const n = X.cast.nan; put(n, at(X.N, -1.2, X.deckTop + X.rail.userData.top, -6.2), .2, 'pleased'); act(n, c.t, [[0, 'stand'], [c.at('Tilly'), 'cheer'], [c.at('Tilly', .5), 'stand']]);
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
      put(a, p, .5, 'devious'); put(b, p.clone().add(V(1.3, 0, -.2)), -.5, 'snooty');
      act(a, c.t, [[0, 'shy']]); act(b, c.t, [[0, 'handsHips']]); talk(a, c.t, {amt: .7}); a.pivots.head.rotation.y = .3;
    }},
  {id: 'R05', at: 'that she must be', cam: {on: 'gossipB', size: 'CU', yaw: 15, pitch: 0, move: {type: 'push', amt: .12}},
    stage(c, X) {
      const b = X.cast.gossipB; put(b, at(X.N, 17.3, .35, -2.4), -.5, null); act(b, c.t, [[0, 'handsHips']]); talk(b, c.t);
      setExpression(b, faceAt(c.t, [[0, 'snooty'], [c.at('biggest'), 'disgusted']]));
    }},
  // --- Investigation ---
  {id: 'I01', at: "Wren didn't believe", cam: {on: 'wren', size: 'CU', yaw: -20, pitch: -4, move: 'push', impact: .1},
    stage(c, X) { const w = X.cast.wren; put(w, at(X.N, 8, .35, 3.4), -2.2, 'serious'); act(w, c.t, [[0, 'tense']]); }},
  {id: 'I02', at: 'So she decided', cam: {on: 'wren', size: 'FS', yaw: 20, pitch: 4, move: 'push'},
    stage(c, X) {
      const w = X.cast.wren; put(w, at(X.N, 7.4, .35, 4.0), -2.4, null); act(w, c.t, [[0, 'stand'], [c.at('find out', -.2), 'handsHips']]);
      setExpression(w, faceAt(c.t, [[0, 'serious'], [c.at('find out'), 'devious']]));
    }},
  {id: 'I03', at: 'She followed Nan', lintIgnore: ['too small', 'caption band'], cam: {on: 'nan', size: 'FS', scaleRef: .8, yaw: 0, pitch: 2, y: .7, move: 'track'},
    stage(c, X) {
      const n = X.cast.nan, w = X.cast.wren; n.root.visible = true; locomote(n, c.t, {from: [X.N.x + 6, .35, X.N.z + 2.6], dir: [1, 0], gait: 'child_walk'}); setExpression(n, 'pleased');
      w.root.visible = true; w.root.scale.setScalar(1.2); locomote(w, c.t * .12, {from: [X.N.x + 2.2, .35, X.N.z + 2.6], dir: [1, 0], gait: 'walk', twos: false});
      w.root.rotation.x = .28; w.pivots.leftShoulder.rotation.x -= .6; w.pivots.rightShoulder.rotation.x -= .6; setExpression(w, 'devious');
    }},
  {id: 'I04', at: 'Nan fed the stray', cam: {on: 'nan', size: 'FS', worldYaw: 15, pitch: 8, y: .45, move: 'push', scaleRef: .5},
    stage(c, X) {
      const n = X.cast.nan, p = at(X.N, -10, .35, 2.4); put(n, p, 2.2, 'happy'); act(n, c.t, [[0, 'reach']]);
      X.nanFish.visible = true; n.root.updateMatrixWorld(true); X.nanFish.position.copy(n.parts.rightArm.localToWorld(V(0, -1.1, .3))); X.nanFish.rotation.y = 1.2;
      X.cats.forEach((k, i) => { k.visible = true; k.position.copy(p).add(V(.9 + i * .9, 0, -1.4 - (i % 2) * .7)); k.rotation.y = facing(k.position, p); k.userData.tail.rotation.x = -.6 + .3 * Math.sin(onTwos(c.t) * 6 + i); k.userData.head.rotation.x = .2 * Math.sin(onTwos(c.t) * 4 + i); });
    }},
  {id: 'I05', at: "Nan fixed the baker's", lintIgnore: ['too small'], cam: {on: ['sign', 'nan'], size: 'MS', h: 9, scaleRef: 1, margin: .6, worldYaw: 60, pitch: -4, y: .4, move: 'push'},
    stage(c, X) {
      const n = X.cast.nan, top = V(X.crates[2].position.x, 4.2, X.crates[2].position.z - .2);
      put(n, top, .9, 'serious'); act(n, c.t, [[0, 'pointUp'], [c.at('sign'), 'cheer']]);
      X.sign.userData.setTilt(ease((c.t - c.at('broken')) / .5));
      setExpression(n, faceAt(c.t, [[0, 'serious'], [c.at('sign', .3), 'happy']]));
      return {light: at(X.N, 25, 0, -8)};
    }},
  {id: 'I06', at: 'Nan carried groceries', cam: {on: 'nan', size: 'FS', worldYaw: 30, pitch: 14, y: .45, scaleRef: .42, move: 'push'},
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
    stage(c, X) { const w = X.cast.wren; put(w, at(X.N, -12, .35, 2.2), -2.0, 'confused'); act(w, c.t, [[0, 'tense']]); }},
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
  {id: 'M04', at: 'Nan knelt beside', mood: 'storm', cam: {on: ['nan', 'boy'], size: 'MCU', worldYaw: 0, pitch: 4, scaleRef: .4, move: 'push'},
    stage(c, X) {
      const b = X.cast.boy, n = X.cast.nan; put(b, at(X.N, -1.0, 0, -7), .2, 'scared'); act(b, c.t, [[0, 'crouch']]); shiver(b, c.t, .7);
      put(n, at(X.N, -2.2, 0, -6.4), 2.03, null); act(n, c.t, [[0, 'stand'], [c.at('knelt'), 'kneel']]);
      setExpression(n, faceAt(c.t, [[0, 'concerned'], [c.at('smiled'), 'happy']]));
      return {rain: true, light: at(X.N, 0, 0, -6)};
    }},
  {id: 'M05', at: "That's just the sky", mood: 'storm', cam: {on: 'nan', size: 'MCU', yaw: 40, pitch: 6, y: .5, move: {type: 'push', amt: .1}},
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
  {id: 'E03', at: 'Wren ran home', mood: 'storm', cam: {on: 'wren', size: 'FS', yaw: 12, pitch: 4, move: 'track'},
    stage(c, X) { const w = X.cast.wren; w.root.visible = true; locomote(w, c.t, {gait: 'run', from: fromA(X.S, -40, .12, 2.6), dir: dirA(X.S, 1, 0)}); setExpression(w, 'sad'); return {rain: true}; }},
  {id: 'E04', at: 'feeling silly', mood: 'storm', cam: {on: 'wren', size: 'MCU', yaw: 25, pitch: 0, move: 'hold'},
    stage(c, X) { const w = X.cast.wren; w.root.visible = true; locomote(w, c.t + 3, {gait: 'run', from: fromA(X.S, -40, .12, 2.6), dir: dirA(X.S, 1, 0)}); setExpression(w, 'pouty'); return {rain: true}; }},
  // --- Stakes and choice ---
  {id: 'B01', at: 'That night', mood: 'interiorNight', cam: {on: ['bo', 'wren'], size: 'MLS', worldYaw: 35, pitch: 32, fov: 44, move: 'push'},
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
  {id: 'T01', at: 'Her sleeves slid', mood: 'interiorNight', cam: {on: 'wren', size: 'MS', yaw: 25, pitch: 10, y: .42, scaleRef: 1.2, move: 'hold'},
    stage(c, X) { return bedScene(c, X, {shrinkAt: c.at('slid', -.15), shrinkDur: 1.1, wrenFace: 'shocked', standUp: true, pose: 'stand'}); }},
  {id: 'T02', at: 'Her shoes went', lintIgnore: ['head cut'], mood: 'interiorNight', cam: {on: 'feetStand', size: 'CU', h: 9, worldYaw: wyaw({yaw: Math.PI / 2 + .45}, -75), pitch: 35, y: .55, move: 'hold'},
    stage(c, X) { return bedScene(c, X, {shrunk: true, standUp: true, pose: 'lookDown', slip: .45 * ease((c.t - c.at('loose', -.2)) / .5)}); }},
  {id: 'T03', at: 'She had shrunk', mood: 'interiorNight', cam: {on: 'wren', size: 'FS', yaw: -35, pitch: 6, fov: 50, move: 'pull', impact: .2},
    stage(c, X) { return bedScene(c, X, {shrunk: true, wrenFace: 'shocked', standUp: true}); }},
  {id: 'T04', at: 'And suddenly', mood: 'interiorNight', cam: {on: 'wren', size: 'ECU', yaw: 0, pitch: -2, move: {type: 'push', amt: .3}},
    stage(c, X) { return bedScene(c, X, {shrunk: true, standUp: true, wrenFace: faceAt(c.t, [[0, 'shocked'], [c.at('understood'), 'pensive']])}); }},
  {id: 'T05', at: 'Nan Tilly had never', mood: 'golden', cam: {on: ['nan', 'boy'], size: 'MCU', worldYaw: 0, pitch: 4, scaleRef: .4, move: 'push'},
    stage(c, X) {
      put(X.cast.boy, at(X.N, -1.0, 0, -7), .2, 'pleased'); act(X.cast.boy, c.t, [[0, 'crouch']]);
      put(X.cast.nan, at(X.N, -2.2, 0, -6.4), 2.03, 'happy'); act(X.cast.nan, c.t, [[0, 'kneel']]);
      return {tint: ['#ffcf8a', .16], light: at(X.N, 0, 0, -6)};
    }},
  {id: 'T06', at: 'She had spent', mood: 'golden', cam: {on: ['girl', 'nan'], size: 'MS', yaw: 20, pitch: 6, scaleRef: .5, move: 'orbit'},
    stage(c, X) {
      const g = X.cast.girl, n = X.cast.nan; put(g, at(X.P, 2, .3, 6), .8, faceAt(c.t, [[0, 'crying'], [c.dur * .55, 'pleased']])); act(g, c.t, [[0, 'kneel']]);
      put(n, at(X.P, 2.8, .3, 6.9), -2.4, 'happy'); act(n, c.t, [[0, 'reach']]);
      return {tint: ['#ffcf8a', .16]};
    }},
  {id: 'T07', at: 'telling scared people', lintIgnore: ['too small'], mood: 'golden', cam: {on: 'nan', size: 'MS', yaw: 20, pitch: 2, scaleRef: .45, y: .42, move: 'push'},
    stage(c, X) {
      const m = X.extras[13], n = X.cast.nan, B = X.plazaBench; B.updateMatrixWorld(true);
      put(m, B.localToWorld(V(-.7, 0, .1)).setY(B.position.y + seatY(1.75, .92) - .92), B.rotation.y, faceAt(c.t, [[0, 'nervous'], [c.at('everything'), 'pleased']])); act(m, c.t, [[0, 'sit']]); m.pivots.head.rotation.y = .12;
      put(n, B.localToWorld(V(1.25, 3.12, -.62)), B.rotation.y - Math.PI / 2, 'happy'); act(n, c.t, [[0, 'stand']]); talk(n, c.t, {amt: .5});
      return {tint: ['#ffcf8a', .16], cam: {on: [m, n]}, light: X.plazaBench.position.clone()};
    }},
  {id: 'T08', at: "Every inch she'd lost", mood: 'golden', cam: {on: 'nan', size: 'MS', yaw: 15, pitch: 2, move: {type: 'push', amt: .15}},
    stage(c, X) { const n = X.cast.nan; put(n, at(X.N, -1.2, X.deckTop + X.rail.userData.top, -6.2), .1, 'pleased', .1); act(n, c.t, [[0, 'stand']]); return {light: at(X.N, 0, 0, -6)}; }},
  // --- Payoff ---
  {id: 'P01', at: 'The next morning', mood: 'interior', cam: {on: 'bo', size: 'MS', yaw: 20, pitch: 6, move: 'push'},
    stage(c, X) { return bedScene(c, X, {morning: true}); }},
  {id: 'P02', at: 'Wren walked to', mood: 'dawn', cam: {on: 'wren', size: 'FS', yaw: 30, pitch: 0, move: 'track'},
    stage(c, X) { const w = X.cast.wren; w.root.visible = true; locomote(w, c.t, {from: [X.N.x + 12, .35, X.N.z + 2.4], dir: [-1, 0]}); w.root.scale.setScalar(1.06); setExpression(w, 'pensive'); return {light: w.root.position.clone()}; }},
  {id: 'P03', at: 'and sat beside', lintIgnore: ['view blocked'], mood: 'dawn', cam: {on: 'deck', size: 'MLS', h: 9, worldYaw: -15, pitch: 6, y: .45, move: 'push'},
    stage(c, X) { return stepScene(c, X, {sit: c.at('sat')}); }},
  {id: 'P04', at: 'For the first time', mood: 'dawn', lintIgnore: ['head cut', 'text cropped'], cam: {on: 'nan', size: 'MS', scaleRef: .3, worldYaw: -90, pitch: 0, x: -.22, y: .42, move: {type: 'push', amt: .08}},
    stage(c, X) { const r = stepScene(c, X, {}); return r; }},
  {id: 'P05', at: 'Did it hurt', mood: 'dawn', cam: {on: 'wren', size: 'MCU', yaw: -35, pitch: 0, y: .42, move: 'drift'},
    stage(c, X) { const r = stepScene(c, X, {wrenFace: 'curious', look: true}); talk(X.cast.wren, c.t, {amt: .3}); return r; }},
  {id: 'P06', at: 'Nan laughed', mood: 'dawn', cam: {on: 'nan', size: 'MCU', yaw: 60, pitch: 0, y: .5, move: {type: 'push', amt: .1}},
    stage(c, X) { const r = stepScene(c, X, {nanFace: faceAt(c.t, [[0, 'laughing'], [c.at('Only'), 'pleased']]), look: true}); if (c.t > c.at('Only')) talk(X.cast.nan, c.t, {amt: .5}); return r; }},
  // --- Button ---
  {id: 'Z01', at: 'In Shortwick, everyone', mood: 'dawn', cam: {on: 'plaza', size: 'WS', h: 44, worldYaw: -60, pitch: 35, y: .5, move: 'orbit'},
    stage(c, X) {
      walkers(X, c.T, [[0, fromA(X.P, -14, .3, 4), [1, 0]], [5, fromA(X.P, 12, .3, 9), [-1, 0]], [8, fromA(X.P, -6, .3, 12), [.6, -.8]]]);
      put(X.cast.mayor, X.stack.position.clone().setY(X.stack.position.y + X.stack.userData.top + .02), -Math.PI / 2, 'confident'); act(X.cast.mayor, c.t, [[0, 'speech']]);
    }},
  {id: 'Z02', at: 'But the smallest', lintIgnore: ['too small', 'head cut'], mood: 'dawn', cam: {on: ['wren', 'nan'], size: 'CU', worldYaw: -30, pitch: 6, scaleRef: 1.06, margin: .3, fill: .95, move: {type: 'pull', amt: 3.2}},
    stage(c, X) { const r = stepScene(c, X, {}); return r; }},
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
  if (o.standUp) { w.root.position.set(ch.x - .2, 0, ch.z + 3.4); w.root.rotation.y = Math.PI / 2 + .45; act(w, c.t, [[0, o.pose ?? 'lookDown']]); }
  else act(w, c.t, [[0, 'sit']]);
  if (o.wiggle) w.pivots.leftHip.rotation.x += .14 * Math.sin(onTwos(c.t) * 8);
  X.layer.set(s0 / s, true, o.slip ?? 0);
  return {lamp: [X.stand.position.clone().add(V(0, 3.8, 0)), 40], light: bed.clone()};
}
// Morning porch: Wren sits on the bottom porch stair, Nan stands on the rail at her eye level.
function stepScene(c, X, o) {
  const w = X.cast.wren, n = X.cast.nan, s = 1.06, stair = at(X.N, 2.4, 0, -4.1), seat = X.deckTop / 3;
  const sitting = o.sit === undefined || c.t >= o.sit, turn = o.look === false ? 0 : -.8;   // seated, she turns her body to Nan
  const walk = {from: [stair.x + 6.05, .35, stair.z + .2], dir: [-1, 0], stopAt: 1.3};
  if (sitting) {
    // Sit-down: a quick hop from the end of her walk into the seat (position, heading, pose) in .25 s.
    const k = o.sit === undefined ? 1 : ease((c.t - o.sit) / .25), seatPos = V(stair.x, seatY(seat, s) - s, stair.z);
    w.root.visible = true; w.root.scale.setScalar(s); locomote(w, walk.stopAt, walk); const end = w.root.position.clone();
    for (const p of Object.values(w.pivots)) p.rotation.set(0, 0, 0);
    put(w, end.lerp(seatPos, k), -Math.PI / 2 + (turn + Math.PI / 2) * k, o.wrenFace ?? 'pleased', s);
    act(w, c.t, o.sit === undefined ? [[0, 'sit']] : [[o.sit - 1, 'stand'], [o.sit, 'sit', {blend: .25, smooth: true}]]);
    if (k < 1) w.root.position.y += .45 * s * Math.sin(Math.PI * k);   // quick hop into the seat, Roblox-style, so legs clear the step
    w.pivots.head.rotation.y = 0;
  } else { w.root.visible = true; w.root.scale.setScalar(s); locomote(w, c.t - o.sit + 1.3, walk); setExpression(w, 'pensive'); }
  // Nan stands on the stair's newel post, right beside Wren's head: eye to eye.
  put(n, at(X.N, 1.0, X.newelTop, -4.3), Math.PI / 2, o.nanFace ?? 'pleased', .1); act(n, c.t, [[0, 'stand']]);
  return {light: at(X.N, 0, 0, -5)};
}
