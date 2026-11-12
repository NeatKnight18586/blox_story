// Interior kit and story props (Studio V3). Same conventions as kit.js: origin at
// ground level, front facing +z, blocky Roblox-style parts with painted surfaces.
// Everything is reusable across episodes; story-specific dressing lives in stories/.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {surfaceMaterials, flatMaterial, paintedMaterial} from './materials.js';

function mesh(geometry, material, name) { const m = new T.Mesh(geometry, material); m.name = name; m.castShadow = m.receiveShadow = true; return m; }
export function box(parent, name, size, pos, mat, round = 0) {
  const g = round ? new RoundedBoxGeometry(...size, 2, round) : new T.BoxGeometry(...size);
  const m = Array.isArray(mat) ? surfaceMaterials(mat[0], mat[1], size) : mat?.isMaterial ? mat : flatMaterial(mat);
  const o = mesh(g, m, name); o.position.set(...pos); parent.add(o); return o;
}
const group = name => { const g = new T.Group(); g.name = name; return g; };
const label = (text, {bg = '#2f6f8f', fg = '#fff6e0', w = 4, h = 1.2, font = 'bold'} = {}) => paintedMaterial(w * 64, h * 64, (g, W, H) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(7, 7, W - 14, H - 14);
  // Fit the text to the board (never clipped by the texture edge).
  let px = Math.round(H * .5); const fam = '"Trebuchet MS", "DejaVu Sans", sans-serif';
  g.font = `${font} ${px}px ${fam}`; const tw = g.measureText(text).width; if (tw > W * .86) px = Math.floor(px * W * .86 / tw);
  g.fillStyle = fg; g.font = `${font} ${px}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 2);
});

// A free-standing sign board (optionally on a stake), for gags and labels.
export function signBoard(text, {w = 3.6, h = 1.4, bg = '#fff6e0', fg = '#c23a22', stake = 2.2} = {}) {
  const g = group('sign_board');
  box(g, 'sign_face', [w, h, .15], [0, stake + h / 2, 0], label(text, {bg, fg, w, h}), .04);
  if (stake) box(g, 'sign_stake', [.2, stake + .2, .2], [0, stake / 2, -.12], '#7a5233');
  return g;
}
export function fence({len = 12, h = 2.6, color = '#fbf4e6'} = {}) {
  const g = group('fence');
  for (const y of [h * .35, h * .75]) box(g, 'fence_rail', [len, .25, .15], [0, y, 0], color);
  for (let x = -len / 2 + .3; x <= len / 2; x += .7) { const p = box(g, 'picket', [.4, h, .12], [x, h / 2, .1], color); }
  return g;
}

// ---------------- Interior shell ----------------
// Open-front room: floor, back and side walls, skirting, a window on the back wall.
export function room({w = 24, d = 18, h = 11, wall = '#f3d9b1', floor = '#b98a5c', trim = '#ffffff', windowAt = [0, 6], night = false, closed = false, ceiling = false} = {}) {
  const g = group('room');
  box(g, 'room_floor', [w, .3, d], [0, -.15, -d / 2 + 2], ['planks', floor]);
  // Wild walls: each wall knows its inward normal; a director runner hides any wall the camera is behind.
  box(g, 'room_wall_back', [w, h, .5], [0, h / 2, -d + 2], ['plaster', wall]);
  for (const s of [-1, 1]) box(g, 'room_wall_side', [.5, h, d], [s * w / 2, h / 2, -d / 2 + 2], ['plaster', wall]).userData.wild = [-s, 0, 0];
  if (closed) {
    const f = box(g, 'room_wall_front', [w, h, .5], [0, h / 2, 2], ['plaster', wall]); f.userData.wild = [0, 0, -1];
    box(f, 'room_door', [3.2, 6.8, .2], [w * .3, 3.4 - h / 2, -.3], ['planks', '#a0673a']);
  }
  if (ceiling) box(g, 'room_ceiling', [w, .4, d], [0, h, -d / 2 + 2], '#fbf4e6');
  box(g, 'skirting', [w, .6, .2], [0, .3, -d + 2.3], trim);
  const winMat = new T.MeshStandardMaterial({color: night ? 0x1d2f5a : 0x9fd3f2, roughness: .2, emissive: night ? 0x0d1730 : 0x6fb8e8, emissiveIntensity: night ? .6 : .55}); winMat.userData.authored = true;
  const [wx, wy] = windowAt;
  box(g, 'interior_window', [4.2, 3.6, .1], [wx, wy, -d + 2.3], winMat);
  for (const [sx, sy, sw, sh] of [[0, 1.9, 4.8, .3], [0, -1.9, 4.8, .3], [-2.25, 0, .3, 3.8], [2.25, 0, .3, 3.8], [0, 0, .2, 3.6]]) box(g, 'window_frame', [sw, sh, .3], [wx + sx, wy + sy, -d + 2.45], trim, .04);
  box(g, 'sill', [5.2, .3, .8], [wx, wy - 2.2, -d + 2.6], trim, .04);
  g.userData.window = g.getObjectByName('interior_window');
  return g;
}

// ---------------- Furniture ----------------
export function chair({color = '#c0804a', scale = 1} = {}) {
  const g = group('chair');
  box(g, 'chair_seat', [2, .3, 2], [0, 2, 0], ['planks', color], .05);
  box(g, 'chair_back', [2, 2.2, .3], [0, 3.2, -.85], ['planks', color], .05);
  for (const x of [-.8, .8]) for (const z of [-.8, .8]) box(g, 'chair_leg', [.25, 2, .25], [x, 1, z], '#7a5233');
  g.scale.setScalar(scale); g.userData.seat = 2.15 * scale; return g;
}
export function desk({color = '#d9a86c', w = 3, d = 2, h = 2.6, shelf = true} = {}) {
  const g = group('desk');
  box(g, 'desk_top', [w, .25, d], [0, h, 0], ['planks', color], .05);
  if (shelf) box(g, 'desk_shelf', [w - .3, .15, d - .3], [0, h - .9, 0], ['planks', color]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) box(g, 'desk_leg', [.2, h, .2], [x * (w / 2 - .2), h / 2, z * (d / 2 - .2)], '#5a6a7a');
  return g;
}
export function chalkboard({w = 12, h = 5, text = ['2 + 2 = 4', 'TRUTH'], color = '#2f4f3f'} = {}) {
  const g = group('chalkboard');
  const mat = paintedMaterial(w * 48, h * 48, (c, W, H) => {
    c.fillStyle = color; c.fillRect(0, 0, W, H); c.globalAlpha = .1; c.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) c.fillRect((i * 53) % W, (i * 37) % H, 60, 6);
    c.globalAlpha = .9; c.fillStyle = '#f4f1e6'; c.font = `bold ${Math.round(H * .17)}px "Trebuchet MS", sans-serif`; c.textAlign = 'left';
    text.forEach((s, i) => c.fillText(s, W * .08, H * (.32 + i * .28)));
  });
  box(g, 'board', [w, h, .2], [0, h / 2 + 3.2, 0], mat);
  box(g, 'board_frame', [w + .5, .35, .4], [0, 3.1, .1], '#a0673a', .05);
  box(g, 'board_frame', [w + .5, .35, .4], [0, h + 3.3, .1], '#a0673a', .05);
  return g;
}
export function bed({w = 4.6, l = 7.6, blanket = '#5b8fd9', frame = '#a0673a'} = {}) {
  const g = group('bed');
  box(g, 'bed_frame', [w, 1.2, l], [0, .9, 0], ['planks', frame], .08);
  box(g, 'headboard', [w, 3.4, .5], [0, 1.7, -l / 2], ['planks', frame], .1);
  box(g, 'mattress', [w - .3, .6, l - .4], [0, 1.8, .1], '#f4f1ea', .2);
  box(g, 'pillow', [w - 1.2, .6, 1.4], [0, 2.35, -l / 2 + 1.2], '#ffffff', .25);
  const quilt = paintedMaterial(256, 256, (c, W, H) => { c.fillStyle = blanket; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) c.fillRect(i * W / 8, j * H / 8, W / 8, H / 8); });
  g.userData.blanket = box(g, 'blanket', [w - .1, .7, l * .74], [0, 2.55, l * .09], quilt, .2);
  g.userData.top = 2.1; g.userData.pillowZ = -l / 2 + 1.2; return g;
}
export function nightstand({lampOn = true} = {}) {
  const g = group('nightstand');
  box(g, 'stand', [1.8, 2.2, 1.6], [0, 1.1, 0], ['planks', '#c48a54'], .06);
  box(g, 'lamp_base', [.5, 1.1, .5], [0, 2.75, 0], '#3f6f8f', .1);
  const shade = new T.Mesh(new T.CylinderGeometry(.45, .8, .9, 12), flatMaterial('#fff1c9', {emissive: '#ffcf7a', emissiveIntensity: lampOn ? .9 : 0}));
  shade.name = 'lamp_shade'; shade.position.y = 3.6; g.add(shade); g.userData.bulb = new T.Vector3(0, 3.6, 0);
  return g;
}
export function rug({w = 6, d = 4, color = '#d9785a'} = {}) {
  const g = group('rug');
  const m = paintedMaterial(256, 180, (c, W, H) => { c.fillStyle = color; c.fillRect(0, 0, W, H); c.strokeStyle = '#fff4e6'; c.lineWidth = 10; c.strokeRect(14, 14, W - 28, H - 28); c.strokeRect(36, 36, W - 72, H - 72); });
  box(g, 'rug', [w, .05, d], [0, .03, 0], m); return g;
}
export function shelf({w = 5, books = 10} = {}) {
  const g = group('shelf');
  box(g, 'shelf_body', [w, 6, 1.2], [0, 3, 0], ['planks', '#a0673a'], .05);
  const cols = ['#e2483d', '#2f80d1', '#f2b632', '#46a85a', '#9b59b6', '#f0f0f0'];
  for (const y of [1.6, 3.6]) for (let i = 0; i < books; i++) box(g, 'book', [.35, 1.2 + (i % 3) * .15, .9], [-w / 2 + .5 + i * (w - 1) / books, y + .6, .2], cols[(i + y) % cols.length | 0]);
  return g;
}

// ---------------- Story props ----------------
export function bookStack({n = 7, seed = 1} = {}) {
  const g = group('book_stack'); let y = 0;
  const cols = ['#e2483d', '#2f80d1', '#f2b632', '#46a85a', '#9b59b6', '#d9785a', '#1fb5a8'];
  for (let i = 0; i < n; i++) {
    const h = .45 + ((i * 7 + seed) % 3) * .12, w = 2.6 - ((i * 5 + seed) % 4) * .18;
    const b = box(g, 'stack_book', [w, h, 1.9], [0, y + h / 2, 0], cols[(i + seed) % cols.length], .04);
    b.rotation.y = ((i * 13 + seed) % 7 - 3) * .06; box(b, 'pages', [w - .2, h - .12, .05], [0, 0, .96], '#f6efe0'); y += h;
  }
  g.userData.top = y; return g;
}
export function podium({text = 'MAYOR'} = {}) {
  const g = group('podium');
  box(g, 'podium_body', [3, 4, 2], [0, 2, 0], ['planks', '#7a4a2a'], .08);
  box(g, 'podium_top', [3.4, .3, 2.4], [0, 4.1, -.1], '#5a3420', .05);
  box(g, 'podium_label', [2.4, .9, .1], [0, 2.8, 1.02], label(text, {bg: '#c23a22', w: 2.4, h: .9}));
  return g;
}
export function banner(text, {w = 16, bg = '#f2b632', fg = '#3a2418', postH = 11} = {}) {
  const g = group('banner');
  box(g, 'banner_cloth', [w, 2.2, .1], [0, postH - 1.4, 0], label(text, {bg, fg, w, h: 2.2}));
  for (const s of [-1, 1]) box(g, 'banner_post', [.35, postH, .35], [s * (w / 2 + .3), postH / 2, 0], '#7a5233');
  return g;
}
export function teacup({color = '#ffffff', band = '#2f80d1'} = {}) {
  const g = group('teacup');
  const cup = mesh(new T.CylinderGeometry(.36, .26, .45, 18), flatMaterial(color), 'cup'); cup.position.y = .3; g.add(cup);
  const ring = mesh(new T.CylinderGeometry(.365, .35, .08, 18), flatMaterial(band), 'cup_band'); ring.position.y = .43; g.add(ring);
  const tea = mesh(new T.CylinderGeometry(.32, .32, .02, 18), flatMaterial('#9a5a2a'), 'tea'); tea.position.y = .5; g.add(tea);
  const handle = mesh(new T.TorusGeometry(.13, .04, 8, 14), flatMaterial(color), 'cup_handle'); handle.position.set(.4, .32, 0); g.add(handle);
  const saucer = mesh(new T.CylinderGeometry(.55, .45, .07, 20), flatMaterial(color), 'saucer'); saucer.position.y = .04; g.add(saucer);
  return g;
}
export function fish({len = 1.6, color = '#7fa8c9', belly = '#e8eef2'} = {}) {
  const g = group('fish');
  const body = mesh(new T.SphereGeometry(.5, 14, 10), flatMaterial(color), 'fish_body'); body.scale.set(len, .55, .32); g.add(body);
  const b2 = mesh(new T.SphereGeometry(.5, 14, 10), flatMaterial(belly), 'fish_belly'); b2.scale.set(len * .8, .35, .3); b2.position.y = -.1; g.add(b2);
  const tail = mesh(new T.ConeGeometry(.35, .6, 4), flatMaterial(color), 'fish_tail'); tail.rotation.z = Math.PI / 2; tail.position.x = -len * .55; tail.scale.z = .3; g.add(tail);
  const eye = mesh(new T.SphereGeometry(.07, 8, 6), flatMaterial('#1c1c1c'), 'fish_eye'); eye.position.set(len * .32, .08, .15); g.add(eye);
  return g;
}
export function cart({color = '#e2483d', tag = '$5', lid = '#f6ecd9'} = {}) {
  const g = group('cart');
  box(g, 'cart_body', [3.2, 1.4, 2], [0, 1.6, 0], ['planks', color], .08);
  box(g, 'cart_rim', [3.4, .2, 2.2], [0, 2.35, 0], lid, .04);   // lid: colour or ['planks', colour]
  for (const x of [-1.1, 1.1]) for (const z of [-1.05, 1.05]) { const w = mesh(new T.CylinderGeometry(.55, .55, .25, 16), flatMaterial('#3b3f45'), 'wheel'); w.rotation.x = Math.PI / 2; w.position.set(x, .55, z); g.add(w); }
  const h = box(g, 'cart_handle', [2.2, .15, .15], [-2.5, 2.1, 0], '#7a5233'); h.rotation.z = .25;
  const t = box(g, 'price_tag', [.9, .55, .05], [.6, 2.9, 1.05], label(tag, {bg: '#fff6e0', fg: '#c23a22', w: .9, h: .55}));
  t.rotation.z = -.15; box(g, 'tag_stick', [.05, .6, .05], [.6, 2.45, 1.05], '#7a5233');
  return g;
}
export function cat({color = '#f39c34', stripe = '#c96b2c'} = {}) {
  const g = group('cat'); const m = flatMaterial(color), s = flatMaterial(stripe);
  const body = box(g, 'cat_body', [.8, .7, 1.6], [0, .85, 0], m, .15);
  for (const z of [-.45, .1]) box(body, 'cat_stripe', [.82, .72, .18], [0, 0, z], s, .1);
  const head = box(g, 'cat_head', [.8, .7, .7], [0, 1.4, .85], m, .18); g.userData.head = head;
  for (const x of [-.22, .22]) { const e = box(head, 'cat_ear', [.2, .3, .14], [x, .42, 0], m); e.rotation.z = -x; }
  for (const x of [-.18, .18]) box(head, 'cat_eye', [.1, .14, .05], [x, .05, .36], '#1f2a1f');
  box(head, 'cat_nose', [.1, .07, .05], [0, -.1, .37], '#ff8fa3');
  for (const x of [-.25, .25]) for (const z of [-.55, .55]) box(g, 'cat_leg', [.2, .5, .2], [x, .25, z], m);
  const tail = new T.Group(); tail.position.set(0, 1.1, -.8); g.add(tail); box(tail, 'cat_tail', [.15, .15, .9], [0, .1, -.4], m); tail.rotation.x = -.6; g.userData.tail = tail;
  return g;
}
export function groceryBag() {
  const g = group('grocery_bag');
  box(g, 'bag', [1.3, 1.6, .9], [0, .8, 0], ['planks', '#d9b27a'], .05);
  const bread = box(g, 'baguette', [.25, 1.3, .25], [-.3, 1.9, 0], '#e0a35a', .1); bread.rotation.z = .25;
  const leaf = mesh(new T.IcosahedronGeometry(.3, 0), flatMaterial('#46a85a', {flatShading: true}), 'greens'); leaf.position.set(.3, 1.75, 0); g.add(leaf);
  const apple = mesh(new T.IcosahedronGeometry(.2, 1), flatMaterial('#e2483d'), 'apple'); apple.position.set(.05, 1.7, .25); g.add(apple);
  return g;
}
// Hanging shop sign on a wall bracket; setTilt(0..1) swings it from crooked to straight.
export function hangingSign(text, {bg = '#6b3f2a', fg = '#fff6e0'} = {}) {
  const g = group('hanging_sign');
  box(g, 'bracket', [3.4, .2, .2], [1.7, 0, 0], '#3b3f45');
  const pivot = new T.Group(); pivot.position.set(1.8, -.1, 0); g.add(pivot);
  box(pivot, 'sign_board', [3, 1.5, .2], [0, -1.1, 0], label(text, {bg, fg, w: 3, h: 1.5}), .05);
  for (const x of [-1.2, 1.2]) box(pivot, 'chain', [.06, .4, .06], [x, -.25, 0], '#3b3f45');
  g.userData.setTilt = k => { pivot.rotation.z = .55 * (1 - k); };
  return g;
}
// Waterfront: a wide calm water plane, a plank pier and a little boat.
export function pier({len = 18, w = 5} = {}) {
  const g = group('pier');
  const water = mesh(new T.PlaneGeometry(400, 260), flatMaterial('#4fb3d9', {roughness: .15, emissive: '#1f6f99', emissiveIntensity: .2}), 'water');
  water.rotation.x = -Math.PI / 2; water.position.set(0, -.6, -130); water.castShadow = false; g.add(water);
  box(g, 'pier_deck', [w, .35, len], [0, .2, -len / 2], ['planks', '#b98a5c']);
  for (let z = 0; z <= len; z += 3) for (const x of [-1, 1]) box(g, 'pier_post', [.45, 2.6, .45], [x * (w / 2 - .1), -.6, -z], '#7a5233');
  const boat = new T.Group(); boat.name = 'boat'; boat.position.set(w + 2.5, -.5, -len * .7); g.add(boat);
  box(boat, 'hull', [3, 1.2, 7], [0, .3, 0], ['planks', '#e2483d'], .3); box(boat, 'hull_trim', [3.1, .3, 7.1], [0, .95, 0], '#fff4e6', .1);
  g.userData.boat = boat; return g;
}
// A porch rail beside a door step (for tiny characters to stand at eye level).
export function porchRail({w = 3, h = 3.2, color = '#fbf4e6'} = {}) {
  const g = group('porch_rail');
  box(g, 'rail_top', [w, .3, .5], [0, h, 0], color, .05);
  for (let x = -w / 2 + .15; x <= w / 2; x += .5) box(g, 'baluster', [.18, h, .18], [x, h / 2, 0], color);
  g.userData.top = h + .15; return g;
}
export function pothole({r = 1.2} = {}) {
  const g = group('pothole');
  const m = mesh(new T.CylinderGeometry(r, r * .9, .06, 16), flatMaterial('#6f5a45'), 'pothole'); m.scale.z = .6; m.position.y = .02; m.receiveShadow = true; m.castShadow = false; g.add(m);
  for (let i = 0; i < 4; i++) { const c = box(g, 'rubble', [.3, .2, .25], [Math.cos(i * 1.7) * r * 1.1, .1, Math.sin(i * 1.7) * r * .7], '#9a8a76', .05); c.rotation.y = i; }
  return g;
}
export function steps({n = 8, w = 4, rise = .7, run = 1.4, color = '#c9c2b6'} = {}) {
  const g = group('steps');
  for (let i = 0; i < n; i++) box(g, 'step', [w, rise * (i + 1), run], [0, rise * (i + 1) / 2, -i * run], ['stone', color]);
  g.userData.at = i => new T.Vector3(0, rise * (i + 1), -i * run); return g;
}

// ---------------- Civic and harbour pieces (Studio V3) ----------------
// Town hall: wide facade with columns, a pediment, a clock and front steps.
export function townHall({w = 24, color = '#f1e4c8', trim = '#ffffff', roof = '#3f7fa6', text = 'TOWN HALL'} = {}) {
  const g = group('town_hall'), D = 10, h = 14;
  box(g, 'hall_body', [w, h, D], [0, h / 2 + 1.6, -D / 2], ['plaster', color]);
  for (let i = 0; i < 4; i++) box(g, 'hall_step', [w * .6 + i * 1.6, .4, 1.2 + (3 - i) * 1.2], [0, .2 + i * .4, .6 + (3 - i) * .6], ['stone', '#d8d3c9']);
  for (let i = 0; i < 6; i++) { const c = new T.Mesh(new T.CylinderGeometry(.55, .65, h - 1, 14), flatMaterial(trim)); c.name = 'column'; c.castShadow = true; c.position.set(-w * .3 + i * w * .12, h / 2 + 1.1, 1.4); g.add(c); }
  box(g, 'entablature', [w * .7, 1.2, 2.2], [0, h + 1.2, .9], trim, .05);
  const tri = new T.Shape(); tri.moveTo(-w * .36, 0); tri.lineTo(w * .36, 0); tri.lineTo(0, 4.2); tri.closePath();
  const ped = new T.Mesh(new T.ExtrudeGeometry(tri, {depth: 2, bevelEnabled: false}), flatMaterial(trim)); ped.name = 'pediment'; ped.position.set(0, h + 1.8, -.1); ped.castShadow = true; g.add(ped);
  box(g, 'hall_roof', [w + 1, .6, D + 1], [0, h + 1.9, -D / 2], ['roof', roof]);
  box(g, 'hall_sign', [8, 1.3, .2], [0, h - 1.4, 2.05], label(text, {bg: '#3f7fa6', fg: '#fff6e0', w: 8, h: 1.3}));
  box(g, 'hall_door', [3.6, 6.5, .3], [0, 4.85, .05], ['planks', '#6b3f2a']);
  for (const x of [-w * .38, w * .38]) { box(g, 'hall_window', [2.6, 4, .2], [x, 8, .05], '#9fd3f2'); box(g, 'window_frame', [3.1, .3, .4], [x, 10.1, .1], trim); }
  return g;
}
// Lighthouse on a little rock: striped tower, lamp room, rail.
export function lighthouse({h = 22} = {}) {
  const g = group('lighthouse');
  const rock = new T.Mesh(new T.IcosahedronGeometry(6, 0), flatMaterial('#8a8f96', {flatShading: true})); rock.name = 'rock'; rock.scale.y = .5; rock.position.y = .4; g.add(rock);
  const stripe = paintedMaterial(64, 256, (c, W, H) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#e2483d' : '#fbf4e6'; c.fillRect(0, i * H / 6, W, H / 6 + 1); } });
  const tower = new T.Mesh(new T.CylinderGeometry(1.8, 2.6, h, 18), stripe); tower.name = 'lighthouse_tower'; tower.castShadow = true; tower.position.y = h / 2 + 2; g.add(tower);
  const lamp = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 2.2, 12), flatMaterial('#fff3c4', {emissive: '#ffd27a', emissiveIntensity: .8})); lamp.name = 'lamp_room'; lamp.position.y = h + 3.1; g.add(lamp);
  const cap = new T.Mesh(new T.ConeGeometry(2.1, 2.2, 12), flatMaterial('#e2483d')); cap.name = 'lighthouse_cap'; cap.position.y = h + 5.3; g.add(cap);
  box(g, 'gallery', [5, .3, 5], [0, h + 2, 0], '#3b3f45');
  return g;
}
// Moored rowing boat (bobs when its group is animated by the episode).
export function boat({color = '#2f80d1', len = 6} = {}) {
  const g = group('boat');
  box(g, 'hull', [2.6, 1.1, len], [0, .3, 0], ['planks', color], .3); box(g, 'hull_trim', [2.7, .25, len + .1], [0, .9, 0], '#fff4e6', .1);
  box(g, 'thwart', [2.4, .2, .7], [0, .8, 0], ['planks', '#b98a5c']);
  return g;
}
// Stone quay wall along the waterfront (front face toward -x, i.e. the sea).
export function quay({len = 120, h = 1.6} = {}) {
  const g = group('quay');
  box(g, 'quay_wall', [3, h + .8, len], [0, (h - .8) / 2, 0], ['stone', '#c9c2b6']);
  for (let z = -len / 2 + 4; z < len / 2; z += 9) { const b = new T.Mesh(new T.CylinderGeometry(.35, .45, .9, 10), flatMaterial('#3b3f45')); b.name = 'bollard'; b.position.set(-.8, h + .45, z); b.castShadow = true; g.add(b); }
  return g;
}
// Low stone wall / planter border for the edges of yards and squares.
export function lowWall({len = 10, h = 1.1, color = '#d8d3c9'} = {}) { const g = group('low_wall'); box(g, 'low_wall', [len, h, .8], [0, h / 2, 0], ['stone', color]); return g; }
