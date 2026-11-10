// Modular Roblox-style town kit. Every module returns a Group with its origin at
// ground level, front face on z = 0, facing +z, so sets are assembled by
// placing facades along a street. Scale: characters ≈ 5.2 tall, doors 7,
// ground floors 10. Facades are camera-facing shells (8 deep), not interiors.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {surfaceMaterials, flatMaterial, paintedMaterial, texture} from './materials.js';

const D = 8;
function mesh(geometry, material, name) { const m = new T.Mesh(geometry, material); m.name = name; m.castShadow = m.receiveShadow = true; return m; }
// Box by centre; `mat` is a material, a colour, or [kind, colour] for a painted surface.
function box(parent, name, size, pos, mat, round = 0) {
  const g = round ? new RoundedBoxGeometry(...size, 2, round) : new T.BoxGeometry(...size);
  const m = Array.isArray(mat) ? surfaceMaterials(mat[0], mat[1], size) : mat?.isMaterial ? mat : flatMaterial(mat);
  const o = mesh(g, m, name); o.position.set(...pos); parent.add(o); return o;
}
// Rectangular frame of four bars around an opening (window/door trim).
function frame(parent, name, w, h, [x, y, z], color, t = .3, bottom = true) {
  box(parent, name, [w + t * 2, t, t], [x, y + h / 2 + t / 2, z], color, .05);
  if (bottom) box(parent, name, [w + t * 2, t, t], [x, y - h / 2 - t / 2, z], color, .05); // doors have no sill bar
  box(parent, name, [t, h, t], [x - w / 2 - t / 2, y, z], color, .05);
  box(parent, name, [t, h, t], [x + w / 2 + t / 2, y, z], color, .05);
}
function glass(parent, w, h, pos) { return box(parent, 'glass', [w, h, .15], pos, paintedGlass()); }
let glassMat = null;
const paintedGlass = () => glassMat ??= (() => { const t = texture('glass'); const m = new T.MeshStandardMaterial({map: t, color: t ? 0xffffff : 0x7fb8d8, roughness: .12}); m.userData.authored = true; return m; })();

// Flowers: small faceted blobs in a planter box.
function flowers(parent, w, pos, colors = ['#ff6fa1', '#ffd23f', '#ffffff', '#ff8c42']) {
  const g = new T.Group(); g.position.set(...pos); parent.add(g);
  box(g, 'planter_box', [w, .7, .8], [0, 0, 0], ['planks', '#a0673a']);
  for (let i = 0; i < Math.round(w * 2); i++) {
    const leaf = mesh(new T.IcosahedronGeometry(.32, 0), flatMaterial('#3f9b46', {flatShading: true}), 'leaf'); leaf.position.set(-w / 2 + .3 + i * (w - .6) / Math.max(1, Math.round(w * 2) - 1), .45, 0); g.add(leaf);
    const bloom = mesh(new T.IcosahedronGeometry(.2, 0), flatMaterial(colors[i % colors.length], {flatShading: true}), 'bloom'); bloom.position.set(leaf.position.x + .08, .7, .12); g.add(bloom);
  }
  return g;
}
// Upper-floor window: glass, frame, sill, optional shutters and flower box.
function window2(parent, x, y, {frameColor, shutter, flowerBox = true, w = 2.6, h = 3.6}) {
  glass(parent, w, h, [x, y, .08]);
  frame(parent, 'window_frame', w, h, [x, y, .15], frameColor);
  box(parent, 'window_mullion', [.18, h, .2], [x, y, .16], frameColor);
  box(parent, 'sill', [w + 1, .3, .7], [x, y - h / 2 - .45, .35], '#f3ead9', .05);
  if (shutter) for (const s of [-1, 1]) box(parent, 'shutter', [1.0, h + .4, .15], [x + s * (w / 2 + .95), y, .12], ['planks', shutter]);
  if (flowerBox) flowers(parent, w + .4, [x, y - h / 2 - 1.05, .55]);
}
function sign(parent, text, w, pos, bg, fg) {
  const mat = paintedMaterial(w * 64, 1.6 * 64, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = fg; g.font = `bold ${Math.round(H * .58)}px "Trebuchet MS", "DejaVu Sans", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 3);
  });
  return box(parent, 'sign_' + text.toLowerCase(), [w, 1.6, .3], pos, mat);
}
function stripes(w, h, c1, c2, n, scallop = false) {
  return paintedMaterial(w * 48, h * 48, (g, W, H) => {
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * W / n, 0, W / n + 1, H); }
    if (scallop) { g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { g.beginPath(); g.arc((i + .5) * W / n, H * 1.05, W / n / 2, Math.PI, 0); g.fill(); } }
  }, {transparent: scallop, alphaTest: scallop ? .5 : 0, side: T.DoubleSide});
}
function awning(parent, w, x, y, c1, c2) {
  const depth = 3.2, tilt = .36, g = new T.Group(); g.position.set(x, y, 0); parent.add(g);
  const top = box(g, 'awning', [w, .18, depth], [0, -Math.sin(tilt) * depth / 2, Math.cos(tilt) * depth / 2], stripes(w, depth, c1, c2, Math.round(w / .9)));
  top.rotation.x = tilt;
  box(g, 'awning_valance', [w, .8, .06], [0, -Math.sin(tilt) * depth - .4, Math.cos(tilt) * depth + .02], stripes(w, .8, c1, c2, Math.round(w / .9), true));
  return g;
}

// ---- Buildings --------------------------------------------------------------
export function shopFront({w = 16, h = 19, wall = 'brick', color = '#d9785a', trim = '#f6ecd9', frameColor = '#2f6f8f', awningColors = ['#e2483d', '#fff4e6'], text = 'BAKERY', signBg = '#2f6f8f', signFg = '#fff6e0', shutter = '#3f8f74', door = '#355f73'} = {}) {
  const g = new T.Group(); g.name = 'shop_' + text.toLowerCase();
  box(g, 'body', [w, h, D], [0, h / 2, -D / 2], [wall, color]);
  box(g, 'base_band', [w + .2, 1.2, .35], [0, .6, .15], ['stone', '#c9c2b6']);
  box(g, 'floor_trim', [w + .3, .5, .55], [0, 10.25, .25], trim, .05);
  box(g, 'cornice', [w + .7, .9, 1.1], [0, h - .1, .3], trim, .08);
  box(g, 'parapet', [w + .3, 1.0, .5], [0, h + .8, -.1], [wall, color]);
  // Ground floor: big shop window + door under one striped awning and a sign.
  const winW = w * .5, winX = -w / 2 + 1 + winW / 2, doorX = w / 2 - 3;
  glass(g, winW, 5.2, [winX, 4.0, .08]); frame(g, 'shop_window_frame', winW, 5.2, [winX, 4.0, .16], frameColor, .35);
  box(g, 'shop_mullion', [.22, 5.2, .22], [winX, 4.0, .17], frameColor);
  box(g, 'shop_sill', [winW + 1, .35, .8], [winX, 1.35, .4], trim, .05);
  box(g, 'door', [3.2, 6.8, .25], [doorX, 3.4, .12], ['planks', door]);
  glass(g, 1.8, 2.4, [doorX, 4.9, .26]); frame(g, 'door_frame', 3.2, 6.8, [doorX, 3.4, .2], trim, .35, false);
  const knob = mesh(new T.SphereGeometry(.16, 10, 8), flatMaterial('#e8c25a', {metalness: .4, roughness: .3}), 'knob'); knob.position.set(doorX + 1.1, 3.3, .35); g.add(knob);
  box(g, 'step', [4.4, .3, 1.4], [doorX, .15, .7], ['stone', '#bdb6aa']);
  awning(g, w - 1.4, 0, 8.6, ...awningColors);
  sign(g, text, Math.min(w * .62, 10), [0, 9.25, .35], signBg, signFg);
  const n = w >= 15 ? 3 : 2;
  for (let i = 0; i < n; i++) window2(g, -w / 2 + w * (i + .5) / n, 14.4, {frameColor, shutter});
  return g;
}

export function house({w = 14, wall = 'siding', color = '#8fc6e8', roofColor = '#c1543f', trim = '#fbf4e6', frameColor = '#ffffff', door = '#e4574a', shutter = '#2f5f8f'} = {}) {
  const g = new T.Group(); g.name = 'house';
  const h = 13; box(g, 'body', [w, h, D], [0, h / 2, -D / 2], [wall, color]);
  box(g, 'base_band', [w + .2, 1, .35], [0, .5, .15], ['stone', '#c9c2b6']);
  box(g, 'eave_trim', [w + .4, .4, .5], [0, h - .1, .2], trim, .05);
  // Gable: front triangle wall + two shingled roof slopes.
  const rise = 5.5, half = w / 2 + .9, ang = Math.atan2(rise, half), len = Math.hypot(half, rise) + .4;
  const tri = new T.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise - .4); tri.closePath();
  const gable = mesh(new T.ExtrudeGeometry(tri, {depth: D, bevelEnabled: false}), flatMaterial(color), 'gable'); gable.position.set(0, h, -D); g.add(gable);
  for (const s of [-1, 1]) { const r = box(g, 'roof_slope', [len, .45, D + 1.6], [s * half / 2, h + rise / 2 + .1, -D / 2], ['roof', roofColor]); r.rotation.z = -s * ang; }
  box(g, 'chimney', [1.4, 4, 1.4], [w * .26, h + rise * .7, -D * .6], ['brick', '#b55a45']);
  glass(g, 1.6, 1.6, [0, h + 2, .08]); frame(g, 'attic_frame', 1.6, 1.6, [0, h + 2, .14], frameColor, .25);
  const doorX = w * .2;
  box(g, 'door', [3, 6.6, .25], [doorX, 3.3, .12], ['planks', door]); frame(g, 'door_frame', 3, 6.6, [doorX, 3.3, .2], trim, .35, false);
  const knob = mesh(new T.SphereGeometry(.15, 10, 8), flatMaterial('#e8c25a', {metalness: .4, roughness: .3}), 'knob'); knob.position.set(doorX - 1, 3.2, .35); g.add(knob);
  box(g, 'porch_roof', [4.6, .3, 2.4], [doorX, 7.4, 1.2], ['roof', roofColor]);
  for (const s of [-1, 1]) box(g, 'porch_post', [.3, 7.2, .3], [doorX + s * 2, 3.6, 2.2], trim, .05);
  box(g, 'porch_step', [4.6, .35, 2.6], [doorX, .17, 1.2], ['planks', '#b98a5c']);
  window2(g, -w * .22, 4.2, {frameColor, shutter, w: 2.8, h: 3.2});
  window2(g, -w * .22, 10.0, {frameColor, shutter, w: 2.4, h: 2.8, flowerBox: false});
  window2(g, w * .2, 10.0, {frameColor, shutter, w: 2.4, h: 2.8, flowerBox: false});
  return g;
}

export function clockTower({color = '#efe2c6', roofColor = '#3f7fa6', trim = '#ffffff', hour = 10, minute = 10} = {}) {
  const g = new T.Group(); g.name = 'clock_tower';
  const w = 9, h = 28;
  box(g, 'tower', [w, h, w], [0, h / 2, -w / 2], ['stone', color]);
  for (const y of [9, 19, h - .3]) box(g, 'tower_band', [w + .5, .6, w + .5], [0, y, -w / 2], trim, .05);
  const face = paintedMaterial(256, 256, (c, W) => {
    c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2c3e50'; c.lineWidth = 10; c.stroke(); c.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.lineWidth = 7; c.beginPath(); c.moveTo(W / 2 + Math.sin(a) * W * .38, W / 2 - Math.cos(a) * W * .38); c.lineTo(W / 2 + Math.sin(a) * W * .44, W / 2 - Math.cos(a) * W * .44); c.stroke(); }
    const hand = (a, l, wd) => { c.lineWidth = wd; c.beginPath(); c.moveTo(W / 2, W / 2); c.lineTo(W / 2 + Math.sin(a) * W * l, W / 2 - Math.cos(a) * W * l); c.stroke(); };
    hand((hour % 12 + minute / 60) / 12 * Math.PI * 2, .24, 12); hand(minute / 60 * Math.PI * 2, .34, 8);
  }, {transparent: true});
  const disc = mesh(new T.CircleGeometry(2.8, 32), face, 'clock_face'); disc.position.set(0, 23.6, .06); g.add(disc);
  frame(g, 'clock_frame', 6.4, 6.4, [0, 23.6, .1], trim, .35);
  const roof = mesh(new T.ConeGeometry(6.6, 6.5, 4), flatMaterial(roofColor), 'tower_roof'); roof.rotation.y = Math.PI / 4; roof.position.set(0, h + 3.25, -w / 2); g.add(roof);
  box(g, 'arch_door', [3.4, 6.5, .3], [0, 3.25, .1], ['planks', '#6e4a2f']); frame(g, 'arch_frame', 3.4, 6.5, [0, 3.25, .2], trim, .4, false);
  for (const y of [13.5]) { glass(g, 2, 4, [0, y, .08]); frame(g, 'tower_window', 2, 4, [0, y, .14], trim, .3); }
  return g;
}

// ---- Ground -----------------------------------------------------------------
// Road centred on z = 0 along x, with dashed centre line, kerbs and sidewalks.
export function street({len = 120, road = 12, walk = 6, crossings = [0]} = {}) {
  const g = new T.Group(); g.name = 'street';
  box(g, 'road', [len, .1, road], [0, .05, 0], ['asphalt', '#5a5d63']);
  for (let x = -len / 2 + 2; x < len / 2; x += 6) if (!crossings.some(c => Math.abs(x + 1.5 - c) < 5)) box(g, 'lane_dash', [3, .02, .35], [x + 1.5, .11, 0], '#ffd34d');
  for (const s of [-1, 1]) {
    box(g, 'kerb', [len, .45, .45], [0, .22, s * (road / 2 + .22)], ['stone', '#d8d3c9']);
    box(g, 'sidewalk', [len, .35, walk], [0, .17, s * (road / 2 + .45 + walk / 2)], ['paving', '#e7dac3']);
  }
  for (const c of crossings) for (let z = -road / 2 + 1; z < road / 2 - .5; z += 1.6) box(g, 'crossing', [5, .02, .9], [c, .11, z + .4], '#ffffff');
  return g;
}

// Round plaza with painted concentric tile rings.
export function plaza({r = 18, colors = ['#f2dcb0', '#e0a26b', '#f7ecd2', '#7fb9c8']} = {}) {
  const top = paintedMaterial(1024, 1024, (c, W) => {
    const rings = 9; for (let i = rings; i > 0; i--) { c.fillStyle = colors[i % colors.length]; c.beginPath(); c.arc(W / 2, W / 2, W / 2 * i / rings, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 3;
    for (let i = 1; i <= rings; i++) { c.beginPath(); c.arc(W / 2, W / 2, W / 2 * i / rings, 0, Math.PI * 2); c.stroke(); }
    for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; c.beginPath(); c.moveTo(W / 2 + Math.cos(t) * W * .11, W / 2 + Math.sin(t) * W * .11); c.lineTo(W / 2 + Math.cos(t) * W / 2, W / 2 + Math.sin(t) * W / 2); c.stroke(); }
  }, {roughness: .85});
  const side = flatMaterial('#c9b89a');
  const m = mesh(new T.CylinderGeometry(r, r, .3, 96), [side, top, side], 'plaza_paving'); m.position.y = .15;
  const g = new T.Group(); g.name = 'plaza'; g.add(m); return g;
}

export function grassField({w = 300, d = 300} = {}) {
  const g = new T.Group(); g.name = 'grass';
  box(g, 'grass', [w, .1, d], [0, -.05, 0], ['grass', '#7cc45a']); return g;
}

// ---- Props ------------------------------------------------------------------
export function tree({h = 8, leaf = '#5bbf4a', seed = 1} = {}) {
  const g = new T.Group(); g.name = 'tree';
  box(g, 'trunk', [.9, h * .55, .9], [0, h * .275, 0], ['planks', '#8a5a34'], .1);
  const greens = [leaf, new T.Color(leaf).multiplyScalar(.85).getStyle(), new T.Color(leaf).lerp(new T.Color('#e8f55a'), .25).getStyle()];
  [[0, h * .78, 0, 2.6], [-1.3, h * .62, .4, 1.9], [1.3, h * .66, -.3, 2.0], [.3, h * .95, -.2, 1.8]].forEach(([x, y, z, r], i) => {
    const m = mesh(new T.IcosahedronGeometry(r, 0), flatMaterial(greens[(i + seed) % 3], {flatShading: true}), 'canopy'); m.position.set(x, y, z); m.rotation.y = i + seed; g.add(m);
  });
  return g;
}
export function bush({r = 1.2, color = '#4fae45'} = {}) {
  const g = new T.Group(); g.name = 'bush';
  const m = mesh(new T.IcosahedronGeometry(r, 0), flatMaterial(color, {flatShading: true}), 'bush'); m.scale.y = .75; m.position.y = r * .6; g.add(m); return g;
}
export function lampPost({color = '#2f5d50'} = {}) {
  const g = new T.Group(); g.name = 'lamp_post';
  box(g, 'lamp_base', [.8, .6, .8], [0, .3, 0], color, .1);
  const pole = mesh(new T.CylinderGeometry(.14, .18, 8, 10), flatMaterial(color), 'pole'); pole.position.y = 4.3; g.add(pole);
  box(g, 'lantern', [.9, 1.2, .9], [0, 8.9, 0], flatMaterial('#fff3c4', {emissive: '#ffd27a', emissiveIntensity: .35}), .12);
  box(g, 'lantern_cap', [1.2, .3, 1.2], [0, 9.65, 0], color, .08);
  return g;
}
export function bench({color = '#c0804a'} = {}) {
  const g = new T.Group(); g.name = 'bench';
  box(g, 'seat', [4.2, .3, 1.3], [0, 1.6, 0], ['planks', color], .05);
  box(g, 'back', [4.2, 1.2, .25], [0, 2.5, -.6], ['planks', color], .05);
  for (const s of [-1, 1]) { box(g, 'leg', [.3, 1.5, 1.2], [s * 1.7, .75, 0], '#3b3f45', .04); box(g, 'arm', [.3, .9, 1.3], [s * 2.05, 2.0, 0], '#3b3f45', .04); }
  return g;
}
export function hydrant() {
  const g = new T.Group(); g.name = 'hydrant';
  const body = mesh(new T.CylinderGeometry(.4, .45, 1.8, 12), flatMaterial('#d8372f'), 'hydrant_body'); body.position.y = .9; g.add(body);
  const cap = mesh(new T.SphereGeometry(.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), flatMaterial('#d8372f'), 'hydrant_cap'); cap.position.y = 1.8; g.add(cap);
  for (const s of [-1, 1]) { const n = mesh(new T.CylinderGeometry(.15, .15, .4, 8), flatMaterial('#f2c94c'), 'nozzle'); n.rotation.z = Math.PI / 2; n.position.set(s * .5, 1.2, 0); g.add(n); }
  return g;
}
export function marketStall({canopy = ['#2f9e8f', '#fff4e6'], fruit = ['#e2483d', '#f39c34', '#7ac143']} = {}) {
  const g = new T.Group(); g.name = 'market_stall';
  box(g, 'counter', [5.4, 2.4, 2], [0, 1.2, 0], ['planks', '#c48a54']);
  for (const x of [-2.5, 2.5]) for (const z of [-.8, .8]) box(g, 'stall_post', [.25, 6, .25], [x, 3, z], '#7a5233');
  const top = box(g, 'stall_canopy', [6.2, .2, 3.2], [0, 6.1, 0], stripes(6.2, 3.2, ...canopy, 7)); top.rotation.x = .18;
  for (const [i, x] of [-1.7, 0, 1.7].entries()) {
    box(g, 'crate', [1.4, .7, 1.4], [x, 2.75, .1], ['planks', '#d9a86c'], .04);
    for (let k = 0; k < 5; k++) { const f = mesh(new T.IcosahedronGeometry(.26, 1), flatMaterial(fruit[i % fruit.length]), 'fruit'); f.position.set(x - .4 + (k % 3) * .4, 3.25 + Math.floor(k / 3) * .25, -.2 + (k % 2) * .4); g.add(f); }
  }
  return g;
}
export function fountain() {
  const g = new T.Group(); g.name = 'fountain';
  const basin = mesh(new T.CylinderGeometry(3.4, 3.6, 1.2, 32), flatMaterial('#d9d2c4'), 'basin'); basin.position.y = .6; g.add(basin);
  const water = mesh(new T.CylinderGeometry(3.0, 3.0, .1, 32), flatMaterial('#6ec6e8', {roughness: .1, emissive: '#2a8fbf', emissiveIntensity: .15}), 'water'); water.position.y = 1.15; g.add(water);
  const col = mesh(new T.CylinderGeometry(.4, .55, 2.6, 12), flatMaterial('#d9d2c4'), 'column'); col.position.y = 2.2; g.add(col);
  const bowl = mesh(new T.CylinderGeometry(1.4, .6, .5, 20), flatMaterial('#d9d2c4'), 'bowl'); bowl.position.y = 3.5; g.add(bowl);
  return g;
}
// Distant skyline: cheap coloured blocks with window grids, for depth only.
export function skylineBlock({w = 10, h = 22, color = '#b9d4e6'} = {}) {
  const g = new T.Group(); g.name = 'skyline_block';
  const mat = paintedMaterial(w * 16, h * 16, (c, W, H) => {
    c.fillStyle = color; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,255,255,0.45)';
    for (let y = 24; y < H - 20; y += 40) for (let x = 14; x < W - 20; x += 32) c.fillRect(x, y, 16, 22);
  });
  box(g, 'skyline', [w, h, 6], [0, h / 2, -3], mat); return g;
}
