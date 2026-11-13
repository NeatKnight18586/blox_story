// Dice Town story sets and props in the studio style (kit materials, Roblox scale).
// Every builder returns plain Three.js groups plus small setter functions, so a shot
// can pose them as pure functions of time.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {surfaceMaterials, flatMaterial, paintedMaterial} from '../town/materials.js';
import * as K from '../town/kit.js';
import {makeDie} from '../../production/dice-town-p4b1/die.js';

const mesh = (g, m, name) => { const o = new T.Mesh(g, m); o.name = name; o.castShadow = o.receiveShadow = true; return o; };
function box(parent, name, size, pos, mat, round = 0) {
  const g = round ? new RoundedBoxGeometry(...size, 2, round) : new T.BoxGeometry(...size);
  const m = Array.isArray(mat) ? surfaceMaterials(mat[0], mat[1], size) : mat?.isMaterial ? mat : flatMaterial(mat);
  const o = mesh(g, m, name); o.position.set(...pos); parent.add(o); return o;
}
const BRASS = () => flatMaterial('#d4a63c', {metalness: .55, roughness: .32});
const IRON = () => flatMaterial('#3d4147', {metalness: .3, roughness: .5});

// ---- Plaza dais with the floor hatch Leo slips through ---------------------------
export function dais() {
  const g = new T.Group(); g.name = 'die_dais';
  const sm = surfaceMaterials('stone', '#cbbfa8', [12, 1.2, 12]);
  const top = mesh(new T.CylinderGeometry(5.4, 5.8, 1.2, 40), [sm[4], sm[2], sm[3]], 'dais'); top.position.y = .9; g.add(top);
  const rim = mesh(new T.CylinderGeometry(5.55, 5.55, .2, 40), flatMaterial('#efe3c8'), 'dais_rim'); rim.position.y = 1.55; g.add(rim);
  // Hatch in the plaza floor, in front-right of the dais.
  const hatch = new T.Group(); hatch.name = 'hatch'; hatch.position.set(6.6, .3, 3.2); g.add(hatch);
  box(hatch, 'hatch_hole', [2.4, .02, 2.4], [0, .01, 0], flatMaterial('#120d0b', {roughness: 1}));
  for (const [x, z, w, d] of [[0, 1.3, 2.9, .3], [0, -1.3, 2.9, .3], [1.3, 0, .3, 2.3], [-1.3, 0, .3, 2.3]]) box(hatch, 'hatch_frame', [w, .14, d], [x, .07, z], IRON(), .03);
  const lid = new T.Group(); lid.position.set(-1.3, .1, 0); hatch.add(lid);
  box(lid, 'hatch_lid', [2.4, .16, 2.4], [-1.2, 0, 0], ['planks', '#7a5233']); lid.rotation.z = -1.9; // propped open
  const ring = mesh(new T.TorusGeometry(.22, .05, 8, 20), IRON(), 'hatch_ring'); ring.position.set(1.2, .2, 1.0); ring.rotation.x = Math.PI / 2; hatch.add(ring);
  // Brass paddle tip that pokes up through the dais top under the die (the wobble's cause).
  const tip = box(g, 'paddle_tip', [1.2, .5, .5], [2.3, 1.35, 2.3], BRASS(), .05); tip.rotation.y = Math.PI / 4;
  return {group: g, hatch, ring, tip, topY: 1.65};
}

// ---- Rope between two world points (tether) ----------------------------------------
export function rope(color = '#c9a46a') {
  const m = mesh(new T.CylinderGeometry(.055, .055, 1, 8), flatMaterial(color), 'rope'); m.castShadow = false;
  const up = new T.Vector3(0, 1, 0);
  m.update = (a, b) => { const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, .5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(up, d.normalize()); };
  return m;
}
// Harness belt + back ring on an avatar's torso; returns the ring (rope anchor).
export function harness(a) {
  const belt = box(a.parts.torso, 'harness_belt', [2.06, .26, 1.06], [0, -.55, 0], '#6b4428', .03);
  const strap = box(a.parts.torso, 'harness_strap', [.22, 1.6, 1.06], [-.5, .1, 0], '#6b4428', .03); strap.rotation.z = .5;
  const ring = mesh(new T.TorusGeometry(.18, .05, 8, 18), IRON(), 'harness_ring'); ring.position.set(0, -.55, -.58); a.parts.torso.add(ring);
  return {belt, strap, ring};
}

// ---- Notebook with sketched pages (no legible paragraphs) --------------------------
function pageMaterial(kind) {
  return paintedMaterial(320, 400, (c, W, H) => {
    c.fillStyle = '#fbf6e6'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(80,120,170,0.35)'; c.lineWidth = 2; for (let y = 40; y < H; y += 28) { c.beginPath(); c.moveTo(16, y); c.lineTo(W - 12, y); c.stroke(); }
    c.strokeStyle = '#2c3440'; c.fillStyle = '#2c3440'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
    const fig = (x, y, s = 1) => { c.strokeRect(x - 9 * s, y - 34 * s, 18 * s, 16 * s); c.strokeRect(x - 12 * s, y - 16 * s, 24 * s, 22 * s); c.beginPath(); c.moveTo(x - 6 * s, y + 6 * s); c.lineTo(x - 6 * s, y + 26 * s); c.moveTo(x + 6 * s, y + 6 * s); c.lineTo(x + 6 * s, y + 26 * s); c.stroke(); };
    if (kind === 'contingency') {
      // Floating figure with up-arrows → figure tied to a tower with a rope; a tick mark.
      fig(80, 150); for (const x of [50, 110]) { c.beginPath(); c.moveTo(x, 120); c.lineTo(x, 70); c.moveTo(x - 10, 82); c.lineTo(x, 70); c.lineTo(x + 10, 82); c.stroke(); }
      c.beginPath(); c.moveTo(150, 150); c.lineTo(190, 150); c.moveTo(178, 140); c.lineTo(190, 150); c.lineTo(178, 160); c.stroke();
      c.strokeRect(250, 60, 36, 130); fig(220, 280); c.beginPath(); c.moveTo(222, 268); c.quadraticCurveTo(250, 230, 268, 190); c.stroke();
      c.strokeStyle = '#2f9e5a'; c.lineWidth = 7; c.beginPath(); c.moveTo(200, 340); c.lineTo(220, 362); c.lineTo(262, 318); c.stroke();
    } else if (kind === 'tallies') {
      // Roll tallies and three identical wobble sketches.
      for (let g = 0; g < 4; g++) { const x = 30 + g * 70; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 11, 40); c.lineTo(x + k * 11, 84); c.stroke(); } c.beginPath(); c.moveTo(x - 6, 76); c.lineTo(x + 42, 46); c.stroke(); }
      for (let r = 0; r < 3; r++) { const y = 140 + r * 85; c.strokeRect(50, y, 54, 54); c.beginPath(); c.arc(77, y + 27, 6, 0, 7); c.fill();
        c.beginPath(); c.moveTo(126, y + 27); c.quadraticCurveTo(150, y - 6, 176, y + 27); c.quadraticCurveTo(200, y + 60, 226, y + 27); c.stroke();
        c.beginPath(); c.moveTo(236, y + 12); c.lineTo(262, y + 42); c.moveTo(262, y + 12); c.lineTo(236, y + 42); c.stroke(); }
    }
  });
}
export function notebook() {
  const g = new T.Group(); g.name = 'notebook';
  const cover = flatMaterial('#c0603a'), w = .9, h = 1.15;
  const left = new T.Group(), right = new T.Group(); g.add(left, right);
  box(left, 'nb_cover_l', [w, h, .05], [-w / 2, 0, -.03], cover, .02);
  const pl = box(left, 'nb_page_l', [w - .06, h - .06, .03], [-w / 2, 0, .02], pageMaterial('contingency'));
  box(right, 'nb_cover_r', [w, h, .05], [w / 2, 0, -.03], cover, .02);
  const pr = box(right, 'nb_page_r', [w - .06, h - .06, .03], [w / 2, 0, .02], pageMaterial('tallies'));
  const pages = {contingency: pl.material, tallies: pr.material};
  // open = 1: flat spread; open = 0: closed (right half folded onto the left).
  g.setOpen = open => { right.rotation.y = -(1 - open) * Math.PI * .98; };
  g.setPage = kind => { pl.material = pages[kind] ?? pages.contingency; pr.material = kind === 'tallies' ? pages.tallies : flatMaterial('#fbf6e6'); };
  g.setOpen(1); return g;
}

// ---- Underground chamber with the crank, paddle and removable pin ------------------
export function chamber() {
  const g = new T.Group(); g.name = 'chamber';
  box(g, 'floor', [22, .3, 18], [0, -.15, 0], ['stone', '#9c8e7c']);
  box(g, 'back_wall', [22, 12, .6], [0, 6, -9], ['brick', '#a0614a']);
  for (const s of [-1, 1]) box(g, 'side_wall', [.6, 12, 18], [s * 11, 6, 0], ['brick', '#a0614a']);
  for (const x of [-7, 7]) box(g, 'ceiling', [8, .8, 18], [x, 12.2, 0], ['planks', '#6e4a2f']);
  for (const z of [-5.5, 5.5]) box(g, 'ceiling_mid', [6, .8, 7], [0, 12.2, z], ['planks', '#6e4a2f']);
  for (const x of [-6, 6]) box(g, 'beam', [.8, 12, .8], [x, 6, -8.4], ['planks', '#5a3a24']);
  // Ladder from the hatch above.
  for (const x of [-9.4, -8.2]) box(g, 'ladder_rail', [.18, 12, .18], [x, 6, 4], '#7a5233');
  for (let y = 1; y < 12; y += 1.1) box(g, 'ladder_rung', [1.3, .14, .14], [-8.8, y, 4], '#7a5233');
  // The die's underside, seen through the ceiling opening.
  const {group: die} = makeDie(); die.position.set(0, 12.2 + 3.15, 0); die.name = 'die_underside'; g.add(die);
  // Mechanism: crank wheel on a stand → link → paddle hinged under the opening.
  const stand = box(g, 'stand', [1.2, 2.8, 1.2], [3.2, 1.4, .4], ['planks', '#7a5233']);
  const wheel = new T.Group(); wheel.position.set(3.2, 2.6, 1.15); g.add(wheel);
  const rim = mesh(new T.TorusGeometry(1.15, .12, 10, 32), BRASS(), 'crank_wheel'); wheel.add(rim);
  for (let k = 0; k < 4; k++) { const sp = mesh(new T.BoxGeometry(2.2, .12, .1), BRASS(), 'spoke'); sp.rotation.z = k * Math.PI / 4; wheel.add(sp); }
  const handle = mesh(new T.CylinderGeometry(.13, .13, .7, 10), flatMaterial('#5a3a24'), 'crank_handle'); handle.rotation.x = Math.PI / 2; handle.position.set(1.0, 0, .35); wheel.add(handle);
  // Connecting rod from the crank axle up to the paddle hinge (re-aimed every frame).
  const link = mesh(new T.CylinderGeometry(.11, .11, 1, 8), IRON(), 'link'); g.add(link);
  const up = new T.Vector3(0, 1, 0);
  const aimLink = () => { const a = new T.Vector3(3.2, 2.6, .5), b = new T.Vector3(.4, 11.1, -2.6), d = b.clone().sub(a); link.position.copy(a).addScaledVector(d, .5); link.scale.set(1, d.length(), 1); link.quaternion.setFromUnitVectors(up, d.normalize()); };
  aimLink();
  const hinge = new T.Group(); hinge.position.set(0, 11.4, -2.6); g.add(hinge);
  box(hinge, 'paddle_arm', [.35, .35, 4.2], [0, 0, 2.1], BRASS(), .05);
  box(hinge, 'paddle_blade', [1.6, .2, 1.1], [0, .1, 4.1], BRASS(), .05);
  const sleeve = box(g, 'pin_sleeve', [.6, .6, .6], [4.1, 2.3, .4], IRON(), .06); // lock pin couples crank to rod
  const pin = new T.Group(); g.add(pin);
  const shaft = mesh(new T.CylinderGeometry(.09, .09, 1.3, 10), BRASS(), 'pin'); shaft.rotation.z = Math.PI / 2; pin.add(shaft);
  const head = mesh(new T.SphereGeometry(.16, 12, 8), BRASS(), 'pin_head'); head.position.x = .65; pin.add(head);
  const lantern = box(g, 'lantern', [.7, 1, .7], [-4, 7.5, -8.3], flatMaterial('#fff0c0', {emissive: '#ffb84d', emissiveIntensity: .9}), .1);
  const light = new T.PointLight(0xffc27a, 0, 34, 1.4); light.position.set(-2, 8, -4); g.add(light);
  const fill = new T.PointLight(0xffe2b0, 0, 30, 1.6); fill.position.set(4, 6, 6); g.add(fill);
  const api = {group: g, wheel, hinge, pin, sleeve, light, fill, lantern, die, pinRest: new T.Vector3(4.45, 2.3, .4)};
  api.setCrank = a => { wheel.rotation.z = a; };
  api.setPaddle = a => { hinge.rotation.x = -a; }; // a>0 lifts the blade toward the die underside
  api.setPin = (out, world = null) => { if (world) { pin.position.copy(g.worldToLocal(world.clone())); } else pin.position.copy(api.pinRest).add(new T.Vector3(out * 1.2, 0, 0)); };
  api.setLights = on => { light.intensity = on ? 48 : 0; fill.intensity = on ? 20 : 0; };
  api.setPin(0); api.setLights(false);
  return api;
}
// A loose pin (held in hands outside the machine).
export function loosePin() {
  const g = new T.Group(); g.name = 'loose_pin';
  const s = mesh(new T.CylinderGeometry(.09, .09, 1.3, 10), BRASS(), 'pin'); s.rotation.z = Math.PI / 2; g.add(s);
  const h = mesh(new T.SphereGeometry(.16, 12, 8), BRASS(), 'pin_head'); h.position.x = .65; g.add(h);
  return g;
}

// ---- Town gate set: wall, posts, two leaves, road continuing to houses -------------
export function gateSet() {
  const g = new T.Group(); g.name = 'gate_set';
  g.add(K.grassField({w: 260, d: 260}));
  const road = K.street({len: 160, road: 10, walk: 4, crossings: []}); road.rotation.y = Math.PI / 2; g.add(road);
  for (const s of [-1, 1]) {
    box(g, 'town_wall', [30, 9, 2], [s * 20.5, 4.5, 0], ['stone', '#d9cbb0']);
    box(g, 'wall_cap', [30.4, .6, 2.4], [s * 20.5, 9.2, 0], '#efe3c8', .05);
    box(g, 'gate_post', [3, 12, 3], [s * 6.5, 6, 0], ['stone', '#cbbfa8']);
    box(g, 'post_cap', [3.6, .8, 3.6], [s * 6.5, 12.3, 0], '#efe3c8', .05);
  }
  const leaves = [-1, 1].map(s => {
    const hinge = new T.Group(); hinge.position.set(s * 5, 0, .2); g.add(hinge);
    box(hinge, 'gate_leaf', [5, 8.5, .4], [-s * 2.5, 4.4, 0], ['planks', '#2f6f5a']);
    for (const y of [1.6, 7.2]) box(hinge, 'gate_band', [5.1, .35, .5], [-s * 2.5, y, 0], BRASS());
    return {hinge, s};
  });
  // Outside the wall: the road continues to a few houses (Pip's at the end on the right).
  const beyond = [[-12, -26, '#f4a7b9', Math.PI / 2], [12, -40, '#ffd59e', -Math.PI / 2], [-12, -54, '#bfe3df', Math.PI / 2], [11, -70, '#8fc6e8', -Math.PI / 2]];
  for (const [x, z, c, ry] of beyond) { const h = K.house({color: c, roofColor: '#c1543f'}); h.position.set(x, 0, z); h.rotation.y = ry; g.add(h); }
  for (const [x, z] of [[-9, -18], [9, -32], [-9, -46], [9, -60]]) { const t = K.tree({h: 8, seed: z & 3}); t.position.set(x, 0, z); g.add(t); }
  // Inside the wall (camera side): a little town context.
  for (const [x, z] of [[-14, 10], [14, 12]]) { const l = K.lampPost({}); l.position.set(x * .6, 0, z); g.add(l); }
  g.setOpen = u => { for (const {hinge, s} of leaves) hinge.rotation.y = s * u * 1.75; };
  g.setOpen(0); return g;
}

// ---- Mother's house: exterior doorway and kitchen interior --------------------------
export function homeExterior() {
  const g = new T.Group(); g.name = 'home_exterior';
  g.add(K.grassField({w: 200, d: 200}));
  const path = box(g, 'path', [4, .1, 14], [2.8, .05, 7], ['paving', '#e7dac3']);
  const h = K.house({color: '#8fc6e8', roofColor: '#c1543f', door: '#e4574a'}); g.add(h);
  for (const o of [...h.children]) if (o.name === 'door' || o.name === 'knob') o.visible = false;
  box(g, 'doorway_dark', [3, 6.6, .05], [2.8, 3.3, .13], flatMaterial('#5a3f2e', {roughness: 1}));
  box(g, 'hall_wall', [3, 6.6, .05], [2.8, 3.3, -1.6], ['plaster', '#f2e2c4']);
  const leaf = new T.Group(); leaf.position.set(1.3, 0, .2); g.add(leaf); leaf.rotation.y = 1.25;
  box(leaf, 'door_open', [3, 6.6, .25], [1.5, 3.3, 0], ['planks', '#e4574a']);
  for (const [x, z] of [[-10, 6], [12, 7]]) { const t = K.tree({h: 9, seed: 1}); t.position.set(x, 0, z); g.add(t); }
  for (const x of [-4.5, 9]) { const b = K.bush({}); b.position.set(x, 0, 1.6); g.add(b); }
  return {group: g, door: [2.8, 0, .3]};
}
export function homeInterior() {
  const g = new T.Group(); g.name = 'home_interior';
  box(g, 'floor', [16, .3, 14], [0, -.15, 0], ['planks', '#c48a54']);
  box(g, 'back_wall', [16, 11, .4], [0, 5.5, -7], ['plaster', '#f2e2c4']);
  for (const s of [-1, 1]) box(g, 'side_wall', [.4, 11, 14], [s * 8, 5.5, 0], ['plaster', '#f2e2c4']);
  box(g, 'skirting', [16, .6, .5], [0, .3, -6.75], '#ffffff');
  box(g, 'wall_band', [16, .3, .45], [0, 3.6, -6.75], '#e4574a');
  const win = new T.Group(); win.position.set(3.5, 6, -6.75); g.add(win);
  box(win, 'window_glass', [3.4, 3, .1], [0, 0, 0], flatMaterial('#bfe6ff', {emissive: '#9fd4ff', emissiveIntensity: .35}));
  for (const [w, h, x, y] of [[3.8, .3, 0, 1.6], [3.8, .3, 0, -1.6], [.3, 3.4, 1.85, 0], [.3, 3.4, -1.85, 0], [.2, 3, 0, 0]]) box(win, 'window_frame', [w, h, .2], [x, y, .1], '#ffffff');
  // Kitchen table (adult) and the small chair kept for Pip.
  const table = new T.Group(); table.position.set(-1.5, 0, -3); g.add(table);
  box(table, 'table_top', [5, .35, 3], [0, 3.1, 0], ['planks', '#a86a3c'], .05);
  for (const [x, z] of [[-2.2, -1.2], [2.2, -1.2], [-2.2, 1.2], [2.2, 1.2]]) box(table, 'table_leg', [.3, 3, .3], [x, 1.5, z], '#7a5233');
  box(table, 'cloth', [3.4, .05, 3.05], [0, 3.3, 0], paintedMaterial(128, 128, (c, W) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#ffffff' : '#e4574a'; c.fillRect(x * W / 8, y * W / 8, W / 8, W / 8); } }));
  const chair = new T.Group(); chair.position.set(2.6, 0, -1.6); chair.rotation.y = -.5; g.add(chair);
  box(chair, 'chair_seat', [1.5, .22, 1.5], [0, 1.6, 0], ['planks', '#5aa0d8'], .04);
  box(chair, 'chair_back', [1.5, 1.6, .2], [0, 2.5, -.65], ['planks', '#5aa0d8'], .04);
  for (const [x, z] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) box(chair, 'chair_leg', [.18, 1.6, .18], [x, .8, z], '#3f7fae');
  const lamp = new T.PointLight(0xffe0b0, 90, 30, 1.5); lamp.position.set(0, 9, 2); g.add(lamp);
  return {group: g, chair, table};
}

// ---- Family photograph rendered from the real 3D characters -------------------------
export function renderPhoto(renderer, actors, {w = 512, h = 640} = {}) {
  const scene = new T.Scene(); scene.background = new T.Color('#e9dcc0');
  scene.add(new T.HemisphereLight(0xfff4e0, 0x8a7a60, 2.2));
  const k = new T.DirectionalLight(0xffe6c0, 2.4); k.position.set(4, 8, 10); scene.add(k);
  const wall = box(scene, 'photo_wall', [20, 14, .4], [0, 7, -2.5], ['plaster', '#efe0c0']);
  box(scene, 'photo_door', [3.2, 7, .2], [-3.6, 3.5, -2.2], ['planks', '#b5654a']);
  const chair = new T.Group(); chair.position.set(3.4, 0, -.8); scene.add(chair);
  box(chair, 'chair_seat', [1.5, .22, 1.5], [0, 1.6, 0], ['planks', '#5aa0d8']); box(chair, 'chair_back', [1.5, 1.6, .2], [0, 2.5, -.65], ['planks', '#5aa0d8']);
  box(scene, 'photo_floor', [20, .2, 10], [0, -.1, 0], ['planks', '#c48a54']);
  for (const [a, pos, ry] of actors) { a.root.position.set(...pos); a.root.rotation.set(0, ry, 0); scene.add(a.root); }
  const cam = new T.PerspectiveCamera(30, w / h, .1, 100); cam.position.set(0, 4.2, 15); cam.lookAt(0, 3.1, 0);
  const rt = new T.WebGLRenderTarget(w, h, {samples: 4}); rt.texture.colorSpace = T.SRGBColorSpace;
  const prevTM = renderer.toneMapping; renderer.toneMapping = T.NoToneMapping;
  renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); renderer.toneMapping = prevTM;
  const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); rt.dispose();
  for (const [a] of actors) scene.remove(a.root);
  // Aged print: sepia mix, soft vignette, cream border; rows flipped (GL is bottom-up).
  const c = document.createElement('canvas'), B = 36; c.width = w + B * 2; c.height = h + B * 2 + 30;
  const g = c.getContext('2d'); g.fillStyle = '#f6efdc'; g.fillRect(0, 0, c.width, c.height);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((h - 1 - y) * w + x) * 4, o = (y * w + x) * 4, r = px[i], gg = px[i + 1], b = px[i + 2];
    const sr = r * .393 + gg * .769 + b * .189, sg = r * .349 + gg * .686 + b * .168, sb = r * .272 + gg * .534 + b * .131;
    const v = 1 - .35 * (((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2) / 2;
    img.data[o] = Math.min(255, (r * .45 + sr * .55) * v); img.data[o + 1] = Math.min(255, (gg * .45 + sg * .55) * v); img.data[o + 2] = Math.min(255, (b * .45 + sb * .55) * v); img.data[o + 3] = 255;
  }
  g.putImageData(img, B, B);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function photo(texture, width = 1.4) {
  const ratio = texture.image ? texture.image.height / texture.image.width : 1.3;
  const m = new T.Mesh(new T.BoxGeometry(width, width * ratio, .02), flatMaterial(0xd8d8d8, {map: texture, roughness: .95}));
  m.name = 'photo'; m.castShadow = true; return m;
}
