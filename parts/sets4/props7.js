// parts/sets4/props7.js — Touch Grass props (E0). props6 format: each builder returns a named T.Group, moving parts are
// userData.live, motion is pure in time (g.userData.anim(tl)), states via g.userData.setState(s). Rounded block style.
// No coplanar faces: overlays sit ≥ .004 proud of their base AND use polygonOffset (flat overlays: visor strip, screen, labels).
//   headset(p)      black shell #1A1C22 + emissive visor strip #49D9FF; states 'on' | 'off'; attachHeadset(actor) seats it on the
//                   head front with a .02 gap to the face (measured: headsetGap(actor)); a visorScreen rides its front (p.screen)
//   visorScreen(p)  flat canvas screen; states 'off' | 'achievement' ("ACHIEVEMENT UNLOCKED" + gold trophy) | 'touched' ("TOUCHED GRASS" + trophy)
//   giantFinger(p)  Nova's forearm (raincoat sleeve + yellow cuff) + hand + pointing finger, skin #F2C59B; one pose (poke). The flick =
//                   the same pose translated sideways fast: setFlick(u) / flickX(u, dist) (ease-in, pure); userData.tip = fingertip (local)
//   wateringCan · grassBlade (3 blades, 1 tall, #3DDC4A, sway) · spaceship · sunSphere (emissive) · swordStone (props.js sword + heroStone)
//   crate · deadTree · birdhouse (broken, swings) · powerLine · porch · shack
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {sword, heroStone} from '../props.js';
import {HEAD} from '../../avatar-style/body.js';
import {HEAD5} from '../../avatar-style/body5.js';
import {mergeByMaterial} from './common.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const TG = {shell: '#2B2E36', glow: '#49D9FF', skin: '#F2C59B', cuff: '#FFC21A', can: '#4F8F8B', grass: '#3DDC4A', gold: '#F2C230',
  wood: '#8A847C', woodDk: '#6A655F', woodLt: '#A39D94', iron: '#55575B', deadwood: '#6E6862', roof: '#5E5B57'};   // real-world wood/iron: sat ≤ .15
const cache = new Map();
export const smat = (color, {rough = .7, metal = 0, emissive = null, ei = 1.4, basic = false, offset = 0} = {}) => {
  const k = [color, rough, metal, emissive, ei, basic, offset].join('|'); if (cache.has(k)) return cache.get(k);
  const m = basic ? new T.MeshBasicMaterial({color, toneMapped: false}) : new T.MeshStandardMaterial({color, roughness: rough, metalness: metal, emissive: emissive ?? '#000000', emissiveIntensity: emissive ? ei : 0});
  if (offset) Object.assign(m, {polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset});
  m.name = 'p7:' + k; cache.set(k, m); return m;
};
const mesh = (g, m, at = [0, 0, 0], rot = null, name = null) => { const o = new T.Mesh(g, typeof m === 'string' ? smat(m) : m); o.position.set(...at); if (rot) o.rotation.set(...rot); o.castShadow = true; o.receiveShadow = true; if (name) o.name = name; return o; };
const rbox = (w, h, d, r = .08, segs = 2) => new RoundedBoxGeometry(w, h, d, segs, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
const live = g => { g.traverse(o => { if (o.isMesh) o.userData.live = true; }); return g; };
const hash = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---- headset ----------------------------------------------------------------------------------------------------
// Built in head-local world units (classic v5 head = 1.2 cube; front of the face at z = HEAD_FRONT). Visor centred on the eye line.
export const HEAD_W = 1.2, HEAD_FRONT = HEAD.radius * HEAD.depth * HEAD5[2], GAP = .02;
export const HS = {w: 1.34, h: .46, d: .3, eyeY: .06};
export function headset(p = {}) {
  const g = new T.Group(), front = p.front ?? HEAD_FRONT, z0 = front + (p.gap ?? GAP), zc = z0 + HS.d / 2;
  const shell = mesh(rbox(HS.w, HS.h, HS.d, .09), smat(TG.shell, {rough: .35, metal: .2}), [0, HS.eyeY, zc], null, 'hs_shell'); g.add(shell);
  const stripOn = smat('#1E8FB0', {emissive: TG.glow, ei: .9, rough: .3, offset: 2}), stripOff = smat('#20303a', {rough: .4, offset: 2});   // E1: stays cyan after tone mapping (2.4 blew out to white)
  const strip = mesh(rbox(HS.w * .86, .1, .02, .009), stripOn, [0, HS.eyeY + .02, z0 + HS.d + .012], null, 'hs_strip'); g.add(strip);   // .002 proud of the shell front
  // strap: sides + back, each ≥ .03 outside the head box (no contact with the head surface)
  const sx = HEAD_W / 2 + .05, back = -(HEAD_W / 2) - .05, sm = smat('#24262c', {rough: .6});
  for (const s of [-1, 1]) g.add(mesh(rbox(.07, .2, front - back + .12, .03), sm, [s * sx, HS.eyeY + .02, (front + back) / 2 + .02], null, 'hs_strap'));
  g.add(mesh(rbox(HEAD_W + .17, .2, .07, .03), sm, [0, HS.eyeY + .02, back], null, 'hs_strapBack'));
  let screen = null; if (p.screen) { screen = visorScreen({state: p.screen, w: HS.w * .9, h: HS.h * .82}); screen.position.set(0, HS.eyeY, z0 + HS.d + .03); g.add(screen); }
  const setState = s => { strip.material = s === 'off' ? stripOff : stripOn; g.userData.state = s; };
  setState(p.state ?? 'on');
  g.userData = {...g.userData, setState, screen, backZ: z0, kind: 'headset'}; g.name = 'headset'; return g;
}
// Seat a headset on an actor's head pivot. The pivot is scaled by HEAD5; the headset is built in world units, so undo the scale.
// The face front is measured from the head + face-decal geometry in pivot space (never assumed).
export function faceFront(actor) {
  actor.root.updateMatrixWorld(true); const inv = new T.Matrix4().copy(actor.pivots.head.matrixWorld).invert(), b = new T.Box3(), v = new T.Vector3();
  actor.pivots.head.traverse(o => { if (!o.isMesh || o.name?.startsWith('acc_') || o.parent?.name?.startsWith('acc_') || /hair/i.test(o.name ?? '')) return;
    const p = o.geometry.attributes.position, m = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); if (Math.abs(v.x) < .5 && Math.abs(v.y - HEAD.centre) < .5) b.expandByPoint(v); } });
  return b.max.z * HEAD5[2];   // world-unit front of the face in front of the head centre
}
export function attachHeadset(actor, p = {}) {
  const front = faceFront(actor), hs = headset({...p, front}); const s = HEAD5; hs.scale.set(1 / s[0], 1 / s[1], 1 / s[2]); hs.position.set(0, HEAD.centre, 0);
  actor.pivots.head.add(hs); actor.attachments = actor.attachments ?? {}; actor.attachments.vrHeadset = hs; hs.userData.faceFront = front; return hs;
}
export const headsetGap = hs => +(hs.userData.backZ - hs.userData.faceFront).toFixed(4);   // shell back face − face front (world units)

// ---- visor screen -------------------------------------------------------------------------------------------------
export const SCREEN_TEXT = {achievement: 'ACHIEVEMENT UNLOCKED', touched: 'TOUCHED GRASS'};
function trophy(x, cx, cy, s) {   // gold cup: bowl, handles, stem, base
  x.fillStyle = TG.gold; x.strokeStyle = TG.gold; x.lineWidth = s * .09;
  x.beginPath(); x.moveTo(cx - s * .42, cy - s * .5); x.lineTo(cx + s * .42, cy - s * .5); x.quadraticCurveTo(cx + s * .4, cy + s * .12, cx, cy + s * .16); x.quadraticCurveTo(cx - s * .4, cy + s * .12, cx - s * .42, cy - s * .5); x.fill();
  for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * s * .43, cy - s * .3, s * .16, -Math.PI / 2, Math.PI / 2, d < 0); x.stroke(); }
  x.fillRect(cx - s * .06, cy + s * .14, s * .12, s * .22); x.fillRect(cx - s * .26, cy + s * .34, s * .52, s * .12);
  x.fillStyle = '#fff6c8'; x.fillRect(cx - s * .26, cy - s * .44, s * .08, s * .34);   // highlight
}
export function drawScreen(x, W, H, state) {
  x.fillStyle = '#0B0E14'; x.fillRect(0, 0, W, H); if (state === 'off') { x.fillStyle = '#141820'; x.fillRect(W * .04, H * .06, W * .92, H * .88); return; }
  const gr = x.createRadialGradient(W / 2, H * .4, 4, W / 2, H * .4, W * .6); gr.addColorStop(0, '#16304a'); gr.addColorStop(1, '#0B0E14'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  trophy(x, W / 2, H * .36, H * .46);
  const text = SCREEN_TEXT[state] ?? String(state); let fs = H * .2; x.font = `900 ${fs}px Arial Black, Arial, sans-serif`;
  while (x.measureText(text).width > W * .92 && fs > 8) { fs -= 2; x.font = `900 ${fs}px Arial Black, Arial, sans-serif`; }
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H * .82);
}
export function visorScreen(p = {}) {
  const g = new T.Group(), w = p.w ?? 1.2, h = p.h ?? .38, W = 1024, H = Math.round(W * h / w);
  let c = null, tex = null; if (typeof document !== 'undefined') { c = document.createElement('canvas'); c.width = W; c.height = H; tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; }
  const m = new T.MeshBasicMaterial({color: '#ffffff', map: tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4});
  const sc = new T.Mesh(new T.PlaneGeometry(w, h), m); sc.name = 'visorScreen'; sc.userData.live = true; g.add(sc);
  const setState = s => { g.userData.state = s; if (c) { drawScreen(c.getContext('2d'), W, H, s); tex.needsUpdate = true; } else m.color.set(s === 'off' ? '#0B0E14' : '#16304a'); };
  setState(p.state ?? 'off');
  // flicker on (shot 59): p.flicker = [t0, t1] → between them the screen blinks on twos (pure in t)
  g.userData = {...g.userData, setState, anim: tl => { if (!p.flicker) return; const [a, b] = p.flicker; sc.visible = tl < a ? false : tl >= b ? true : Math.floor((tl - a) * 12) % 2 === 0; }};
  g.name = 'visorScreen'; return g;
}

// Flick offset: ease-in (u³) so the hand leaves fast at the end; pure in u ∈ [0, 1].
export const flickX = (u, dist = 7) => dist * Math.min(1, Math.max(0, u)) ** 3;
// ---- giant finger -------------------------------------------------------------------------------------------------------
// Unit scale: hand 2.0 wide; points down −y (comes down through the sky crack). Origin = the wrist (cuff bottom).
export function giantFinger(p = {}) {   // E1 opt-in p.skin / p.sleeve / p.cuffColor (Leo's own small finger in shot 54 mirrors it)
  const g = new T.Group(), skin = smat(p.skin ?? TG.skin, {rough: .62}), coat = smat(p.sleeve ?? TG.cuff, {rough: .55}), coatDk = smat(p.cuffColor ?? '#E6A800', {rough: .55});
  g.add(mesh(rbox(2.3, 7, 2.0, .45, 3), coat, [0, 4.4 + .1, 0], null, 'sleeve'));
  g.add(mesh(rbox(2.62, .78, 2.3, .3, 3), coatDk, [0, .39, 0], null, 'cuff'));
  g.add(mesh(rbox(1.9, 2.1, 1.5, .42, 3), skin, [0, -1.05, 0], null, 'hand'));
  for (const [i, x] of [-.48, 0, .48].entries()) g.add(mesh(rbox(.46, .62, .7, .2, 2), skin, [x + .1, -2.1 + i * .02, .32], [-.5, 0, 0], 'knuckle'));   // curled fingers
  g.add(mesh(rbox(.5, 1.25, .5, .22, 2), skin, [1.12, -1.2, .35], [0, 0, -.35], 'thumb'));
  const knuckle = new T.Group(); knuckle.position.set(-.55, -1.95, -.05); g.add(knuckle);
  knuckle.add(mesh(rbox(.8, 1.75, .8, .34, 3), skin, [0, -.86, 0], null, 'finger1'));
  const joint = new T.Group(); joint.position.set(0, -1.7, 0); knuckle.add(joint);
  joint.add(mesh(rbox(.76, 1.6, .76, .34, 3), skin, [0, -.78, 0], null, 'finger2'));
  joint.add(mesh(rbox(.46, .4, .06, .02, 1), smat('#F7DCC0', {rough: .4, offset: 2}), [0, -1.22, -.395], null, 'nail'));   // nail on the back, .035 proud
  const tip = new T.Object3D(); tip.position.set(0, -1.58, 0); joint.add(tip);
  // E0b: one pose only (the poke). The flick is that pose translated sideways fast: setFlick(u ∈ [0, 1]) → x = u · flickDist (no bend, no reverse bend).
  const kids = [...g.children], x0 = kids.map(o => o.position.x), setFlick = u => { kids.forEach((o, i) => { o.position.x = x0[i] + flickX(u, p.flickDist ?? 7); }); g.userData.flick = u; };
  setFlick(p.flick ?? 0); live(g);
  g.userData = {...g.userData, setFlick, tip, tipWorld: v => tip.getWorldPosition(v ?? new T.Vector3())}; g.name = 'giantFinger'; return g;
}

// ---- watering can (dented teal) ----------------------------------------------------------------------------------------
export function wateringCan(p = {}) {
  const g = new T.Group(), metal = smat(p.color ?? TG.can, {rough: .38, metal: .55}), dk = smat('#3C6E6B', {rough: .4, metal: .5});
  const body = new T.CylinderGeometry(.5, .56, 1.0, 20, 6), pos = body.attributes.position, v = new T.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z); if (r < .3) continue;
    const dent = .07 * Math.exp(-(((a - .9) / .32) ** 2) - (((v.y - .1) / .22) ** 2)) + .045 * Math.exp(-(((a + 2.2) / .25) ** 2) - (((v.y + .25) / .18) ** 2));   // two dents
    pos.setX(i, v.x * (1 - dent / r)); pos.setZ(i, v.z * (1 - dent / r)); }
  body.computeVertexNormals(); g.add(mesh(body, metal, [0, .5, 0], null, 'canBody'));
  g.add(mesh(new T.CylinderGeometry(.53, .53, .06, 20), dk, [0, 1.02, 0], null, 'canRim'));
  const sp = mesh(new T.CylinderGeometry(.06, .1, 1.25, 10), metal, [.82, .78, 0], [0, 0, -1.0], 'spout'); g.add(sp);
  g.add(mesh(new T.CylinderGeometry(.17, .09, .16, 12), dk, [1.36, 1.15, 0], [0, 0, -1.0], 'rose'));
  g.add(mesh(new T.TorusGeometry(.42, .05, 8, 18, Math.PI), dk, [-.12, 1.02, 0], null, 'handle'));
  g.userData.spoutTip = [1.42, 1.19, 0]; g.name = 'wateringCan'; return g;
}

// ---- grass blade: 3 blades (1 tall), vivid green, sway pure in t -------------------------------------------------
function bladeGeo(h, w, bend) {   // tapered, slightly cupped blade with thickness (two sheets .012 apart: no coplanar faces)
  const g = new T.BoxGeometry(w, h, .024, 1, 8, 1); g.translate(0, h / 2, 0); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), u = y / h; p.setX(i, p.getX(i) * (1 - .92 * u)); p.setZ(i, p.getZ(i) + bend * u * u * h); }
  g.computeVertexNormals(); return g;
}
export function grassBlade(p = {}) {
  const g = new T.Group(), m = smat(TG.grass, {rough: .5, emissive: '#1f8a2a', ei: .35}), blades = [];
  for (const [h, w, rotY, rotZ, x, b] of [[1.0, .1, 0, -.04, 0, .1], [.48, .08, 1.9, .3, .05, .16], [.42, .08, -1.6, -.34, -.05, .18]]) {
    const piv = new T.Group(); piv.position.set(x, 0, 0); piv.rotation.set(0, rotY, rotZ); piv.add(mesh(bladeGeo(h, w, b), m, [0, 0, 0], null, 'blade')); g.add(piv); blades.push([piv, rotZ]);
  }
  g.add(mesh(new T.CylinderGeometry(.09, .12, .05, 10), smat('#5A544C', {rough: .95}), [0, .02, 0], null, 'dirtTuft'));
  g.userData.anim = tl => { blades.forEach(([b, z], i) => { b.rotation.z = z + (p.sway ?? .06) * Math.sin(2 * Math.PI * tl / 2.2 + i * 1.3); }); };
  live(g); g.name = 'grassBlade'; return g;
}

// ---- space: chunky fighter + sun ----------------------------------------------------------------------------------------
export function spaceship(p = {}) {   // nose +z, 6 long
  const g = new T.Group(), hull = smat(p.color ?? '#E8ECF2', {rough: .35, metal: .3}), acc = smat(p.accent ?? '#1F3A6B', {rough: .4, metal: .3}), glow = smat(TG.glow, {emissive: TG.glow, ei: 2.5});
  g.add(mesh(rbox(1.5, 1.0, 5.2, .3, 3), hull, [0, 0, 0], null, 'hull'));
  g.add(mesh(rbox(1.0, .7, 1.4, .3, 3), acc, [0, .1, 3.0], null, 'nose'));
  g.add(mesh(rbox(.9, .55, 1.5, .25, 3), smat('#2A3C52', {rough: .25, metal: .3}), [0, .7, .9], null, 'cockpit'));
  for (const s of [-1, 1]) { g.add(mesh(rbox(3.2, .22, 2.0, .1, 2), hull, [s * 2.2, -.1, -.8], [0, s * .18, 0], 'wing'));
    g.add(mesh(rbox(.5, .5, 2.4, .2, 2), acc, [s * 3.7, -.1, -.6], null, 'gun'));
    g.add(mesh(new T.CylinderGeometry(.42, .42, .3, 14).rotateX(Math.PI / 2), glow, [s * .45, 0, -2.75], null, 'engine')); }
  g.add(mesh(rbox(.2, 1.1, 1.4, .08, 2), acc, [0, .9, -1.9], null, 'fin'));
  g.name = 'spaceship'; return g;
}
export function sunSphere(p = {}) {   // E0b: emissive core + additive radial glow sprite (no shell, no ring)
  const g = new T.Group(), r = p.r ?? 1;
  g.add(mesh(new T.SphereGeometry(r, 40, 24), new T.MeshStandardMaterial({color: '#000000', emissive: p.color ?? '#FFE7A0', emissiveIntensity: 1.6, toneMapped: false, fog: false}), [0, 0, 0], null, 'sunCore'));
  const glow = new T.Sprite(new T.SpriteMaterial({map: radialTex(p.glow ?? [255, 190, 110], 128, 1.5), color: '#ffffff', blending: T.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false}));
  glow.scale.setScalar(r * (p.glowScale ?? 6)); glow.name = 'sunGlow'; g.add(glow); live(g); g.name = 'sunSphere'; return g;
}
// Radial falloff texture (pure data, no canvas): alpha = (1 − d)^2.2, rgb = tint; centre bright, edge 0.
const texCache = new Map();
export function radialTex(rgb = [255, 255, 255], n = 128, k = 2.2) {
  const key = rgb.join() + n + k; if (texCache.has(key)) return texCache.get(key); const d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = (x + .5) / n * 2 - 1, dy = (y + .5) / n * 2 - 1, f = Math.max(0, 1 - Math.hypot(dx, dy)) ** k, i = (y * n + x) * 4;
    d[i] = rgb[0] * f; d[i + 1] = rgb[1] * f; d[i + 2] = rgb[2] * f; d[i + 3] = 255 * f; }
  const t = new T.DataTexture(d, n, n); t.needsUpdate = true; t.magFilter = t.minFilter = T.LinearFilter; texCache.set(key, t); return t;
}
// ---- sword in the stone (props.js sword + heroStone), glowing blade for the VR world ----------------------------------------
export function swordStone(p = {}) {
  const g = new T.Group(), hs = heroStone({cracks: 1, dirt: false}), st = hs.group; g.add(st);
  const top = hs.socketTop, s = sword({tier: 'hero', blade: p.blade ?? 2.6}); s.position.set(0, top + (p.blade ?? 2.6) * .55, 0); g.add(s);
  if (p.glow !== false) s.traverse(o => { if (o.isMesh && o.name === 'blade') { o.material = o.material.clone(); o.material.emissive = new T.Color(TG.glow); o.material.emissiveIntensity = .9; } });
  g.userData.hilt = [0, top + (p.blade ?? 2.6) * .55 + .35, 0]; g.name = 'swordStone'; return g;
}

// ---- Dust Town set dressing (sat ≤ .15) ------------------------------------------------------------------------------------
export function crate(p = {}) {   // 1.6 cube; plank frame strips .03 proud
  const g = new T.Group(), s = p.size ?? 1.6, m = smat(p.color ?? TG.wood, {rough: .9}), dk = smat(TG.woodDk, {rough: .9});
  g.add(mesh(rbox(s, s, s, .03, 1), m, [0, s / 2, 0], null, 'crate'));
  for (const [ax, w, h, d] of [['x', s + .06, .16, .16], ['z', .16, .14, s + .06]]) for (const y of [.07, s - .07]) for (const o of [-1, 1])
    g.add(mesh(new T.BoxGeometry(w, h, d), dk, ax === 'x' ? [0, y, o * (s / 2 - .05)] : [o * (s / 2 - .05), y, 0]));
  for (const o of [-1, 1]) g.add(mesh(new T.BoxGeometry(.16, s * 1.25, .1), dk, [0, s / 2, o * (s / 2 + .04)], [0, 0, .78]));   // diagonal brace
  g.name = 'crate'; return g;
}
export function deadTree(p = {}) {
  const g = new T.Group(), m = smat(p.color ?? TG.deadwood, {rough: .95}), r = (i) => hash(i, p.seed ?? 3);
  g.add(mesh(new T.CylinderGeometry(.28, .45, 5, 8, 4), m, [0, 2.5, 0], [0, 0, .05], 'trunk'));
  const branch = (len, r0, at, rz, ry) => { const b = new T.Group(); b.position.set(...at); b.rotation.set(0, ry, rz); b.add(mesh(new T.CylinderGeometry(r0 * .35, r0, len, 6), m, [0, len / 2, 0])); g.add(b); return b; };
  for (let i = 0; i < 5; i++) { const b = branch(1.6 + r(i) * 1.4, .16, [0, 2.6 + i * .5, 0], (i % 2 ? 1 : -1) * (.7 + r(i + 9) * .4), i * 1.3);
    const tw = new T.Group(); tw.position.set(0, 1.2, 0); tw.rotation.z = (i % 2 ? -1 : 1) * .8; tw.add(mesh(new T.CylinderGeometry(.03, .07, .9, 5), m, [0, .45, 0])); b.add(tw); }
  g.name = 'deadTree'; return g;
}
export function birdhouse(p = {}) {   // hangs from its string top (origin), broken roof, swings ±10° (pure in t)
  const g = new T.Group(), sw = new T.Group(); g.add(sw); const m = smat(TG.woodLt, {rough: .9}), dk = smat(TG.woodDk, {rough: .9});
  sw.add(mesh(new T.CylinderGeometry(.015, .015, 1.2, 4), smat('#3a3a3a'), [0, -.6, 0], null, 'string'));
  sw.add(mesh(rbox(.7, .8, .7, .04, 1), m, [0, -1.6, 0], null, 'house'));
  sw.add(mesh(new T.CylinderGeometry(.13, .13, .04, 12).rotateX(Math.PI / 2), smat('#1c1c1c'), [0, -1.5, .36], null, 'hole'));
  sw.add(mesh(new T.BoxGeometry(.52, .05, .84), dk, [-.22, -1.08, 0], [0, 0, .62], 'roofL'));
  sw.add(mesh(new T.BoxGeometry(.48, .05, .6), dk, [.3, -1.18, .08], [.18, 0, -1.05], 'roofR_broken'));   // hanging loose
  sw.add(mesh(new T.CylinderGeometry(.03, .03, .3, 5).rotateX(Math.PI / 2), dk, [0, -1.72, .48], null, 'perch'));
  g.userData.anim = tl => { sw.rotation.z = .17 * Math.sin(2 * Math.PI * tl / 2.4); sw.rotation.x = .05 * Math.sin(2 * Math.PI * tl / 3.1); };
  live(g); g.name = 'birdhouse'; return g;
}
export function powerLine(p = {}) {   // two poles span apart along x, 3 sagging wires; userData.hook = a point on the middle wire
  const g = new T.Group(), span = p.span ?? 14, h = p.h ?? 8, m = smat(TG.deadwood, {rough: .9}), wire = smat('#4A4A48', {rough: .6});
  for (const s of [-1, 1]) { g.add(mesh(new T.CylinderGeometry(.16, .22, h, 8), m, [s * span / 2, h / 2, 0], null, 'pole')); g.add(mesh(new T.BoxGeometry(.2, .2, 2.2), m, [s * span / 2, h - .5, 0], null, 'crossbar'));
    for (const z of [-.9, 0, .9]) g.add(mesh(new T.CylinderGeometry(.06, .06, .18, 6), smat('#7a7a72'), [s * span / 2, h - .31, z])); }
  for (const z of [-.9, 0, .9]) { const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16, x = (u - .5) * span; pts.push(new T.Vector3(x, h - .22 - (p.sag ?? .9) * (1 - (2 * u - 1) ** 2), z)); }
    g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, .025, 4), wire, [0, 0, 0], null, 'wire')); }
  g.userData.hook = [span * .12, h - .22 - (p.sag ?? .9) * (1 - .24 ** 2), 0]; g.name = 'powerLine'; return g;
}
export function porch(p = {}) {   // 6 wide × 3 deep deck at y .9, two steps in front (+z), posts + roof slab; seat anchors on the steps
  const g = new T.Group(), w = p.w ?? 6, d = p.d ?? 3, m = smat(TG.wood, {rough: .9}), dk = smat(TG.woodDk, {rough: .9}), lt = smat(TG.woodLt, {rough: .9});
  g.add(mesh(rbox(w, .9, d, .03, 1), dk, [0, .45, 0], null, 'deck'));
  for (let i = 0; i < 6; i++) g.add(mesh(new T.BoxGeometry(w + .04, .05, d / 6 - .04), lt, [0, .93, -d / 2 + (i + .5) * d / 6], null, 'plank'));   // .005 proud of the deck top
  g.add(mesh(new T.BoxGeometry(w * .5, .3, .5), m, [0, .6, d / 2 + .25], null, 'step2'), mesh(new T.BoxGeometry(w * .5, .3, .5), m, [0, .15, d / 2 + .75], null, 'step1'));
  for (const s of [-1, 1]) g.add(mesh(new T.BoxGeometry(.24, 3.2, .24), m, [s * (w / 2 - .15), 2.5, d / 2 - .15], null, 'post'));
  g.add(mesh(rbox(w + .6, .22, d + .7, .04, 1), smat(TG.roof, {rough: .9}), [0, 4.2, .2], [-.08, 0, 0], 'roof'));
  for (const s of [-1, 1]) g.add(mesh(new T.BoxGeometry(w * .22, .1, .1), lt, [s * w * .36, 1.75, d / 2 - .15], null, 'rail'));
  g.userData.seats = [[-.9, .9, d / 2 + .5], [.9, .9, d / 2 + .5]]; g.name = 'porch'; return g;
}
export function shack(p = {}) {   // 6 × 4 × 5, door + window on the front (+z), lean-to roof
  const g = new T.Group(), w = p.w ?? 6, h = p.h ?? 4, d = p.d ?? 5, m = smat(p.color ?? '#7E7972', {rough: .95}), dk = smat(TG.woodDk, {rough: .9});
  g.add(mesh(rbox(w, h, d, .04, 1), m, [0, h / 2, 0], null, 'walls'));
  for (let i = 0; i < 7; i++) g.add(mesh(new T.BoxGeometry(.06, h - .1, .04), dk, [-w / 2 + (i + .5) * w / 7, h / 2, d / 2 + .025], null, 'batten'));   // .005–.045 proud
  g.add(mesh(new T.BoxGeometry(1.1, 2.2, .1), smat('#4E4A45', {rough: .9}), [-1.2, 1.1, d / 2 + .06], null, 'door'));
  g.add(mesh(new T.BoxGeometry(1.2, .9, .08), smat('#24272b', {rough: .3}), [1.3, 2.3, d / 2 + .05], null, 'window'));
  g.add(mesh(new T.BoxGeometry(1.36, 1.06, .06), dk, [1.3, 2.3, d / 2 + .025], null, 'windowFrame'));
  g.add(mesh(rbox(w + .8, .2, d + .9, .04, 1), smat(TG.roof, {rough: .9}), [0, h + .35, 0], [.12, 0, 0], 'roof'));
  g.name = 'shack'; return g;
}
// ---- E0b world pieces ------------------------------------------------------------------------------------------------------
// Deterministic value noise (hash lattice, trilinear): vnoise(x, y, z, seed) ∈ [−1, 1].
export function vnoise(x, y, z, seed = 1) {
  const h = (i, j, k) => hash(i * 157 + j * 113 + k * 271, seed) * 2 - 1, fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z), u = x - fx, v = y - fy, w = z - fz;
  const s = t => t * t * (3 - 2 * t), a = s(u), b = s(v), c = s(w), L = (p, q, t) => p + (q - p) * t;
  return L(L(L(h(fx, fy, fz), h(fx + 1, fy, fz), a), L(h(fx, fy + 1, fz), h(fx + 1, fy + 1, fz), a), b), L(L(h(fx, fy, fz + 1), h(fx + 1, fy, fz + 1), a), L(h(fx, fy + 1, fz + 1), h(fx + 1, fy + 1, fz + 1), a), b), c);
}
const fbm = (x, y, z, seed) => vnoise(x, y, z, seed) * .62 + vnoise(x * 2.1, y * 2.1, z * 2.1, seed + 7) * .28 + vnoise(x * 4.3, y * 4.3, z * 4.3, seed + 13) * .1;
const flatMat = new Map(), vcMat = (rough = .95) => { if (!flatMat.has(rough)) { const m = new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: rough, metalness: 0}); m.name = 'p7:flatvc' + rough; flatMat.set(rough, m); } return flatMat.get(rough); };
// Per-face colours on a non-indexed geometry: pick(centroid, faceNormal) → '#hex'
function faceColors(g, pick) {
  const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new T.Color(), a = new T.Vector3(), b = new T.Vector3(), d = new T.Vector3(), nr = new T.Vector3();
  for (let i = 0; i < n; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
    nr.subVectors(d, b).cross(new T.Vector3().subVectors(a, b)).normalize(); c.set(pick(a.clone().add(b).add(d).divideScalar(3), nr));   // Color.set converts sRGB hex → linear
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3); }
  g.setAttribute('color', new T.BufferAttribute(col, 3)); return g;
}
// Jagged low-poly rock peak: 1 main cone + 2 shoulder cones, radial + vertical displacement by seeded fbm (apex fixed: total height = h).
// Rock below snow · h (with a noisy snow line), snow above. Origin = base centre.
export function rockPeak(p = {}) {
  const h = p.h ?? 100, r = p.r ?? h * .42, seed = p.seed ?? 1, rock = p.rock ?? '#5B4B45', snow = p.snowColor ?? '#F3F0EE', line = p.snow ?? .65, geos = [];
  const cones = [[0, 0, r, h], [r * .55, -r * .2, r * .62, h * .62], [-r * .5, r * .3, r * .55, h * .5]];
  for (const [k, [cx, cz, cr, ch]] of cones.entries()) {
    const g = new T.ConeGeometry(cr, ch, p.radial ?? 11, p.rings ?? 9).translate(0, ch / 2, 0), pos = g.attributes.position, f = 3 / cr, apex = [];
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), u = y / ch, rr = Math.hypot(x, z); if (rr < 1e-6) { apex.push(i); continue; }
      const nn = fbm(x * f, y * f * .6, z * f, seed + k * 31), radial = 1 + .42 * nn, dy = .07 * ch * (1 - u) * fbm(x * f + 9, y * f, z * f - 4, seed + k * 17 + 5);
      pos.setXYZ(i, x * radial + cx, Math.max(0, y + dy * (u > .02 ? 1 : 0)), z * radial + cz); }
    for (const i of apex) { pos.setX(i, cx); pos.setZ(i, cz); }
    geos.push(g.toNonIndexed());
  }
  const g = mergeGeometries(geos.map(x => { x.deleteAttribute('uv'); return x; }), false); g.computeVertexNormals();
  // E1: rock per-face colour jitter ±8 % around the rock colour (flat shaded); snow above `line` (default .65) of the height
  const jit = new T.Color(), jitter = (c, k) => { jit.set(rock).multiplyScalar(1 + .08 * (2 * hash(Math.round(c.x * 7.1) * 13 + Math.round(c.y * 5.3) * 7 + Math.round(c.z * 3.7), seed + k) - 1)); return '#' + jit.getHexString(); };
  faceColors(g, (c, n) => c.y > h * line + h * .05 * fbm(c.x * .05, 0, c.z * .05, seed + 3) && n.y > .15 ? snow : jitter(c, 11));
  const g0 = new T.Group(); g0.add(mesh(g, vcMat(), [0, 0, 0], null, 'rockPeak')); g0.userData.apex = [0, h, 0]; g0.name = 'rockPeak'; live(g0); return g0;   // E1: live = never merged (the merge drops vertex colours: rock jitter + snow)
}
// Plateau: jagged rock drum (r at the top, flat top at y 0, grass on the top faces); h deep below.
export function rockMesa(p = {}) {
  const r = p.r ?? 26, h = p.h ?? 40, seed = p.seed ?? 5, g = new T.CylinderGeometry(r, r * 1.25, h, p.radial ?? 22, 6).translate(0, -h / 2, 0), pos = g.attributes.position, f = 3 / r;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), rr = Math.hypot(x, z); if (rr < 1e-6) continue;
    const top = y > -1e-3, k = top ? .035 : .16 * Math.min(1, -y / (h * .15) + .3); pos.setX(i, x * (1 + k * fbm(x * f, y * f, z * f, seed))); pos.setZ(i, z * (1 + k * fbm(x * f, y * f, z * f, seed))); }
  const ng = g.toNonIndexed(); ng.deleteAttribute('uv'); ng.computeVertexNormals();
  faceColors(ng, (c, n) => n.y > .9 && c.y > -.5 ? (p.grass ?? '#7BC85A') : (p.rock ?? '#5B4B45'));
  const g0 = new T.Group(); g0.add(mesh(ng, vcMat(), [0, 0, 0], null, 'rockMesa')); g0.userData.ground = true; g0.name = 'rockMesa'; return g0;
}
// Star field: n points on a sphere (radius r) in 3 sizes (world units, size-attenuated), round discs, never fogged.
export function starField(p = {}) {
  const g = new T.Group(), n = p.n ?? 2400, R = p.r ?? 380, seed = p.seed ?? 21, sizes = p.sizes ?? [[.72, 1.1], [.22, 2.0], [.06, 3.4]], disc = radialTex([255, 255, 255], 32, .6);
  let i0 = 0; for (const [k, [frac, size]] of sizes.entries()) {
    const m = Math.round(n * frac), pos = new Float32Array(m * 3), col = new Float32Array(m * 3);
    for (let j = 0; j < m; j++) { const i = i0 + j, th = 2 * Math.PI * hash(i, seed), ph = Math.acos(2 * hash(i, seed + 1) - 1), b = .55 + .45 * hash(i, seed + 2), blue = hash(i, seed + 3) < .2;
      pos.set([R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)], j * 3); col.set(blue ? [b * .75, b * .85, b] : [b, b, b * .95], j * 3); }
    i0 += m; const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({size, sizeAttenuation: true, map: disc, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false}));
    pts.name = 'stars' + k; pts.frustumCulled = false; g.add(pts);
  }
  g.userData.count = i0; live(g); g.name = 'starField'; return g;
}
// Ringed planet (far): sphere + flat ring (both sides), ring tilted.
export function ringPlanet(p = {}) {
  const g = new T.Group(), r = p.r ?? 30;
  g.add(mesh(new T.SphereGeometry(r, 32, 18), smat(p.color ?? '#C9A27A', {rough: .9}), [0, 0, 0], null, 'planet'));
  const ring = mesh(new T.RingGeometry(r * 1.35, r * 2.2, 64, 1), new T.MeshStandardMaterial({color: p.ringColor ?? '#D8C4A0', roughness: .9, side: T.DoubleSide, transparent: true, opacity: .85}), [0, 0, 0], [-Math.PI / 2 + (p.tilt ?? .45), 0, .25], 'ring');
  g.add(ring); live(g); g.name = 'ringPlanet'; return g;
}
// Street lamp: pole + arm + emissive head + a point light (colour p.color).
export function streetLamp(p = {}) {
  const g = new T.Group(), h = p.h ?? 5.2, c = p.color ?? '#7DFF8A', m = smat('#2A2E34', {rough: .6, metal: .4});
  g.add(mesh(new T.BoxGeometry(.18, h, .18), m, [0, h / 2, 0], null, 'lampPole'), mesh(new T.BoxGeometry(1.2, .14, .14), m, [.55, h - .1, 0], null, 'lampArm'));
  g.add(mesh(rbox(.6, .3, .5, .06), m, [1.1, h - .25, 0], null, 'lampHood'), mesh(new T.BoxGeometry(.46, .1, .36), smat(c, {emissive: c, ei: 3}), [1.1, h - .44, 0], null, 'lampGlow'));
  if (p.light !== false) { const L = new T.PointLight(c, p.intensity ?? 14, p.range ?? 11, 1.6); L.position.set(1.1, h - .7, 0); g.add(L); }
  g.name = 'streetLamp'; return g;
}
// Low height fog: stacked soft noise sheets between y 0 and h (≤ 2), additive-free alpha, never above h.
export function groundFog(p = {}) {
  const g = new T.Group(), h = Math.min(2, p.h ?? 2), n = p.layers ?? 4, c = p.color ?? '#5DBF6E', N = 128, seed = p.seed ?? 9, d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = Math.max(0, .5 + .7 * fbm(x / 16, 0, y / 16, seed)), i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, v * 255); }
  const tex = new T.DataTexture(d, N, N); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set((p.w ?? 40) / 14, (p.d ?? 80) / 14); tex.magFilter = tex.minFilter = T.LinearFilter; tex.needsUpdate = true;
  for (let i = 0; i < n; i++) { const m = new T.MeshBasicMaterial({color: c, alphaMap: tex, transparent: true, opacity: (p.opacity ?? .16) * (1 - i / n * .6), depthWrite: false, fog: true});
    const pl = new T.Mesh(new T.PlaneGeometry(p.w ?? 40, p.d ?? 80).rotateX(-Math.PI / 2), m); pl.position.y = h * (i + .5) / n; pl.name = 'groundFog'; pl.renderOrder = 2; g.add(pl); }
  live(g); g.name = 'groundFog'; return g;
}
// Far broken building silhouette: stacked blocks with a jagged broken top + a leaning slab (fades into fog).
export function brokenBuilding(p = {}) {
  const g = new T.Group(), w = p.w ?? 12, h = p.h ?? 20, d = p.d ?? 8, seed = p.seed ?? 1, m = smat(p.color ?? '#6E6B67', {rough: .95}), cols = 4;
  g.add(mesh(new T.BoxGeometry(w, h * .55, d), m, [0, h * .275, 0], null, 'bbBase'));
  for (let i = 0; i < cols; i++) { const ch = h * (.15 + .45 * hash(i, seed)), cw = w / cols; g.add(mesh(new T.BoxGeometry(cw * (.8 + .2 * hash(i, seed + 2)), ch, d * (.7 + .3 * hash(i, seed + 3))), m, [-w / 2 + (i + .5) * cw, h * .55 + ch / 2 - .2, 0], [0, 0, (hash(i, seed + 4) - .5) * .12])); }
  g.add(mesh(new T.BoxGeometry(w * .35, .6, d * .9), m, [w * .45, h * .55 + 1, 0], [0, 0, -.5], 'bbSlab'));
  g.name = 'brokenBuilding'; return g;
}

// ---- E1 visor band (LEO_VR): the headset's shape (front shell + side straps + back strap) as one cyan emissive band at the brow,
// hugging the head: every inner face sits GAP (.02) off the head surface measured at the band's height (pivot space, hair excluded).
export function headExtent(actor, y0, y1) {
  actor.root.updateMatrixWorld(true); const inv = new T.Matrix4().copy(actor.pivots.head.matrixWorld).invert(), v = new T.Vector3(); let x = 0, zf = -9, zb = 9;
  actor.pivots.head.traverse(o => { if (!o.isMesh || o.name?.startsWith('acc_') || o.parent?.name?.startsWith('acc_') || /hair/i.test(o.name ?? '') || o.userData.armor || o.userData.band) return;
    const p = o.geometry.attributes.position, m = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); const y = (v.y - HEAD.centre) * HEAD5[1]; if (y < y0 || y > y1 || Math.abs(v.x) > .9 || Math.abs(v.z) > .9) continue;
      x = Math.max(x, Math.abs(v.x) * HEAD5[0]); zf = Math.max(zf, v.z * HEAD5[2]); zb = Math.min(zb, v.z * HEAD5[2]); } });
  return {x, front: zf, back: zb};
}
export const BAND = {y: .36, h: .15, t: .08};   // head-centre-relative brow height (above the eye line), band height, thickness
export function visorBand(actor, {color = TG.glow, gap = GAP} = {}) {
  const e = headExtent(actor, BAND.y - BAND.h / 2, BAND.y + BAND.h / 2), g = new T.Group(), m = smat(color, {emissive: color, ei: 2.2, rough: .35}), t = BAND.t, y = BAND.y;
  const zF = e.front + gap + t / 2, zB = e.back - gap - t / 2, xS = e.x + gap + t / 2;
  g.add(mesh(rbox(2 * (xS + t / 2), BAND.h, t, .03), m, [0, y, zF], null, 'band_front'));
  for (const s of [-1, 1]) g.add(mesh(rbox(t, BAND.h * .9, zF - zB, .03), m, [s * xS, y, (zF + zB) / 2], null, 'band_side'));
  g.add(mesh(rbox(2 * xS, BAND.h * .9, t, .03), m, [0, y, zB], null, 'band_back'));
  const s = HEAD5; g.scale.set(1 / s[0], 1 / s[1], 1 / s[2]); g.position.set(0, HEAD.centre, 0); g.traverse(o => { o.userData.armor = true; o.userData.band = true; }); g.name = 'visorBand';
  actor.pivots.head.add(g); g.userData.gap = {front: +(zF - t / 2 - e.front).toFixed(4), side: +(xS - t / 2 - e.x).toFixed(4), back: +(e.back - (zB + t / 2)).toFixed(4)}; return g;
}
// E1: a fresnel rim on a crowd's (merged) materials only (look5b shader patch, no actor lift): zombies #B6FF8A .9
export function rimCrowd(root, {color = '#B6FF8A', strength = .9, power = 2.2} = {}, L5B) {
  const U = L5B.makeUniforms({...L5B.params(null), rim: {color, strength, power, away: 0}, actorEV: 0}), own = new Map();
  root.traverse(o => { if (!o.isMesh || o.name === 'face_decal') return; const one = m => !m || m.isMeshBasicMaterial || m.isSpriteMaterial ? m : (own.get(m) ?? (own.set(m, L5B.patchActor(m.clone(), U)), own.get(m)));
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); });
  return U;
}
// ---- E0b armor: primitives on the body v5 parts (no new rigs) ----------------------------------------------------------------
// spec {trim (emissive hex), piece: 'leo'|'horns'|'visor'|'scarf'|'bubble'|'tricorn'|'staff', plate (hex)}. Parts are measured in their
// parent's local space (part geometry box × part matrix), so pieces follow every pose. Overlays sit ≥ .02 proud (no coplanar faces).
function partBox(part, deep = false) {
  const b = new T.Box3(); part.updateMatrix(); part.geometry.computeBoundingBox(); b.copy(part.geometry.boundingBox).applyMatrix4(part.matrix);
  if (deep) { const inv = new T.Matrix4().copy(part.parent.matrixWorld).invert(); part.parent.updateMatrixWorld(true);
    part.parent.traverse(o => { if (!o.isMesh || o === part || o.userData.armor) return; const bb = new T.Box3().setFromObject(o).applyMatrix4(inv); if (bb.max.y > b.min.y + (b.max.y - b.min.y) * .5) b.union(bb); }); }
  return b;
}
export function armor(actor, spec = {}) {
  const P = actor.parts, trim = spec.trim ?? TG.glow, glow = smat(trim, {emissive: trim, ei: 1.8, rough: .4}), plate = smat(spec.plate ?? '#1F3A6B', {rough: .35, metal: .35});
  const add = (parent, geo, m, at, rot = null, name = 'armor') => { const o = mesh(geo, m, at, rot, name); o.userData.armor = true; parent.add(o); return o; };
  const tb = partBox(P.torso), ts = tb.getSize(new T.Vector3()), tc = tb.getCenter(new T.Vector3()), tp = P.torso.parent;
  const hb = partBox(P.head), hs = hb.getSize(new T.Vector3()), hc = hb.getCenter(new T.Vector3()), hp = P.head.parent;
  const collar = () => add(tp, rbox(ts.x * .62, .14, ts.z * 1.12, .05), glow, [tc.x, tb.max.y - .05, tc.z], null, 'trimCollar');
  const belt = () => add(tp, rbox(ts.x * 1.06, .12, ts.z * 1.1, .04), glow, [tc.x, tb.min.y + ts.y * .2, tc.z], null, 'trimBelt');
  if (spec.piece === 'leo') {
    // chest plate (upper torso shell) with cyan edges top + bottom + centre line
    const ph = ts.y * .5, py = tb.max.y - ph / 2 - .04;
    add(tp, rbox(ts.x * 1.08, ph, ts.z * 1.16, .1), plate, [tc.x, py, tc.z], null, 'chestPlate');
    add(tp, rbox(ts.x * 1.1, .09, ts.z * 1.2, .03), glow, [tc.x, py - ph / 2, tc.z], null, 'trimChest');
    add(tp, new T.BoxGeometry(.1, ph * .8, .04), glow, [tc.x, py, tb.max.z + ts.z * .08 + .03], null, 'trimChestV');
    for (const s of ['leftArm', 'rightArm']) { const a = P[s], ab = partBox(a), as = ab.getSize(new T.Vector3()), ac = ab.getCenter(new T.Vector3());
      add(a.parent, rbox(as.x * 1.3, as.y * .22, as.z * 1.3, .08), plate, [ac.x, ab.max.y - as.y * .09, ac.z], null, 'shoulderPad');
      add(a.parent, rbox(as.x * 1.34, .08, as.z * 1.34, .03), glow, [ac.x, ab.max.y - as.y * .2, ac.z], null, 'trimShoulder'); }
    visorBand(actor, {color: trim});   // E1: the box-cage helmet is gone; a cyan visor band in the headset's shape hugs the head (.02 gap)
    return actor;
  }
  collar(); belt();
  const front = hb.max.z, top = hb.max.y;
  if (spec.piece === 'horns') for (const sx of [-1, 1]) {   // dragon.js spike geometry (4-sided cone), curving up and out from the helmet
    add(hp, new T.ConeGeometry(.16, .8, 4), smat('#E8E0D0', {rough: .5}), [hc.x + sx * (hs.x / 2 + .12), top - hs.y * .05, hc.z], [0, 0, -sx * .55], 'horn');
    add(hp, rbox(.16, .14, hs.z * .6, .04), glow, [hc.x + sx * (hs.x / 2 + .04), top - hs.y * .22, hc.z], null, 'trimHorn'); }
  if (spec.piece === 'visor') {
    add(hp, rbox(hs.x * .82, hs.y * .12, .08, .03), glow, [hc.x, hc.y + hs.y * .08, front + .12], null, 'visorSlit');
    add(hp, new T.BoxGeometry(.06, .7, .06), smat('#8E959E', {rough: .4, metal: .6}), [hc.x + hs.x * .25, top + .45, hc.z], null, 'antenna');
    add(hp, new T.IcosahedronGeometry(.11, 0), glow, [hc.x + hs.x * .25, top + .84, hc.z], null, 'antennaTip'); }
  if (spec.piece === 'scarf') {
    add(tp, rbox(ts.x * .8, .26, ts.z * 1.22, .08), glow, [tc.x, tb.max.y - .02, tc.z], null, 'scarf');
    add(tp, rbox(.22, ts.y * .55, .08, .04), glow, [tc.x + ts.x * .25, tb.max.y - ts.y * .3, tb.min.z - .08], [.12, 0, .1], 'scarfTail'); }
  if (spec.piece === 'bubble') {
    const H = partBox(P.head, true), Hc = H.getCenter(new T.Vector3()), R = H.getSize(new T.Vector3()).length() * .55;
    const bub = add(hp, new T.SphereGeometry(R, 28, 16), new T.MeshStandardMaterial({color: '#DDEEFF', roughness: .05, metalness: 0, transparent: true, opacity: .22, depthWrite: false}), [Hc.x, Hc.y, Hc.z], null, 'bubbleHelmet'); bub.castShadow = false;
    add(hp, new T.TorusGeometry(R * .62, .07, 6, 20), glow, [Hc.x, H.min.y + .02, Hc.z], [Math.PI / 2, 0, 0], 'trimBubble');
    add(tp, rbox(ts.x * .7, ts.y * .6, .5, .1), smat('#E8ECF0', {rough: .5}), [tc.x, tc.y + ts.y * .1, tb.min.z - .27], null, 'lifePack'); }   // no straps
  if (spec.piece === 'tricorn') {
    const H = partBox(P.head, true), Hs = H.getSize(new T.Vector3()), Hc = H.getCenter(new T.Vector3()), y = H.max.y - Hs.y * .08, R = Math.max(Hs.x, Hs.z) * .78;
    add(hp, new T.CylinderGeometry(R, R, .12, 3), smat('#1E1E22', {rough: .7}), [Hc.x, y, Hc.z], [0, Math.PI / 2, 0], 'tricornBrim');
    add(hp, new T.CylinderGeometry(R * 1.07, R * 1.07, .06, 3), glow, [Hc.x, y - .05, Hc.z], [0, Math.PI / 2, 0], 'trimTricorn');
    add(hp, rbox(Hs.x * .7, Hs.y * .28, Hs.z * .7, .12), smat('#1E1E22', {rough: .7}), [Hc.x, y + Hs.y * .14, Hc.z], null, 'tricornCrown'); }
  if (spec.piece === 'staff') {
    const a = P.rightArm, ab = partBox(a), ac = ab.getCenter(new T.Vector3());
    add(a.parent, new T.BoxGeometry(.12, 4.6, .12), smat('#4A3426', {rough: .8}), [ac.x, ab.min.y + 1.2, ac.z + .55], null, 'staff');
    add(a.parent, new T.OctahedronGeometry(.32, 0), glow, [ac.x, ab.min.y + 3.75, ac.z + .55], [0, .4, 0], 'staffCrystal');
    const H = partBox(P.head, true), Hs = H.getSize(new T.Vector3()), Hc = H.getCenter(new T.Vector3());   // glowing hood edge framing the face
    add(hp, rbox(Hs.x * .86, .08, .08, .03), glow, [Hc.x, hb.max.y - .02, H.max.z + .03], null, 'trimHood');
    for (const sx of [-1, 1]) add(hp, rbox(.08, hs.y * .9, .08, .03), glow, [Hc.x + sx * Hs.x * .43, hc.y - hs.y * .05, H.max.z + .03], null, 'trimHood'); }
  return actor;
}

// Place a location's props list [{prop, at, rotY (deg), scale, p, id}] → one group; statics merged by material (one draw call per material),
// moving props (userData.anim / live) stay separate and are returned in .live for the per-frame anim(tl). byId: placed groups with an id.
export function placeProps(list, {merge = true, t = 0} = {}) {
  const root = new T.Group(), statics = new T.Group(), movers = [], byId = {}; root.add(statics); root.name = 'props7';
  for (const pr of list ?? []) { const g = PROPS7[pr.prop](pr.p ?? {}); g.position.set(...pr.at); g.rotation.y = (pr.rotY ?? 0) * Math.PI / 180; if (pr.scale) g.scale.setScalar(pr.scale);   // scale: opt-in (E0b) g.userData.anim?.(t);
    g.traverse(o => { if (o.isMesh) { o.castShadow = !g.userData.ground; o.receiveShadow = true; } }); if (pr.id) byId[pr.id] = g;   // ground pieces never cast (shadow acne on the catcher)
    if (g.userData.anim || pr.id) { root.add(g); if (g.userData.anim) movers.push(g); } else statics.add(g); }
  let m = null; if (merge) { m = mergeByMaterial(statics); statics.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  root.userData = {live: movers, byId, merged: m, anim: tl => movers.forEach(g => g.userData.anim(tl))}; return root;
}
// ---- E1 additions ------------------------------------------------------------------------------------------------------------
// headsetScreen: the headset with its visor screen (shots 59–61); setState('off' | 'achievement' | 'touched') drives the screen,
// the strip stays lit; anim(tl) runs the screen's flicker (p.flicker = [t0, t1], shot-local to animAt).
export function headsetScreen(p = {}) {
  const g = headset({screen: 'off', front: p.front ?? HEAD_FRONT}), sc = g.userData.screen, scr = visorScreen({state: 'off', w: HS.w * .9, h: HS.h * .82, flicker: p.flicker});
  sc.parent.remove(sc); scr.position.copy(sc.position); g.add(scr); g.userData.screen = scr;
  g.userData.setState = s => { scr.userData.setState(s); g.userData.state = s; }; g.userData.state = 'off'; g.userData.anim = tl => scr.userData.anim(tl);
  g.name = 'headsetScreen'; return g;
}
// tumbleweed: a loose ball of dry twigs (desaturated), rolls (anim: spin about x, pure in t; the spec moves it)
export function tumbleweed(p = {}) {
  const g = new T.Group(), ball = new T.Group(), m = smat(p.color ?? '#8C857A', {rough: .95}), r = p.r ?? .8; g.add(ball); ball.position.y = r;
  for (let i = 0; i < 26; i++) { const a = hash(i, 3) * Math.PI * 2, b = Math.acos(2 * hash(i, 5) - 1), len = r * (1.2 + .6 * hash(i, 7));
    const tw = mesh(new T.CylinderGeometry(.025, .04, len, 4), m, [0, 0, 0], [b, a, hash(i, 9) * 3], 'twig'); ball.add(tw); }
  g.userData.anim = tl => { ball.rotation.x = tl * (p.spin ?? 4); }; live(g); g.name = 'tumbleweed'; return g;
}
// dry stick lying on cracked dirt (insert 05): a bent twig + two crack lines (thin dark strips .004 proud)
export function dryStick(p = {}) {
  const g = new T.Group(), m = smat('#7A746C', {rough: .95});
  g.add(mesh(new T.CylinderGeometry(.035, .05, 1.1, 6).rotateZ(Math.PI / 2), m, [0, .05, 0], [0, .3, 0], 'stick'));
  g.add(mesh(new T.CylinderGeometry(.02, .03, .45, 5).rotateZ(Math.PI / 2), m, [.25, .05, .12], [0, -.6, 0], 'stickBranch'));
  for (const [x, z, a, l] of [[-.2, .25, .4, .9], [.3, -.2, -.7, .7]]) g.add(mesh(new T.BoxGeometry(l, .006, .025), smat('#4A4642', {rough: 1, offset: 2}), [x, .004, z], [0, a, 0], 'crackLine'));
  g.name = 'dryStick'; return g;
}
// sky crack: jagged bright rift (white-cyan, unlit, never fogged) in the xy plane, `h` tall; static while visible
export function skyCrack(p = {}) {
  const g = new T.Group(), h = p.h ?? 60, w = p.w ?? 14, n = 9, seed = p.seed ?? 4, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, x = (hash(i, seed) - .5) * w * .5, half = w * .5 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (.55 + .45 * hash(i, seed + 2)); pts.push([x, h * (u - .5), half]); }
  const shape = new T.Shape(); shape.moveTo(pts[0][0], pts[0][1]); for (const q of pts) shape.lineTo(q[0] - q[2] * .5, q[1]); for (const q of [...pts].reverse()) shape.lineTo(q[0] + q[2] * .5, q[1]);
  const glow = new T.MeshBasicMaterial({color: '#E8FBFF', toneMapped: false, fog: false, side: T.DoubleSide}), edge = new T.MeshBasicMaterial({color: TG.glow, toneMapped: false, fog: false, side: T.DoubleSide, transparent: true, opacity: .55, depthWrite: false});
  const core = new T.Mesh(new T.ShapeGeometry(shape), glow); core.name = 'crackCore'; g.add(core);
  const halo = new T.Mesh(new T.ShapeGeometry(shape), edge); halo.scale.set(1.6, 1.04, 1); halo.position.z = -.05; halo.name = 'crackHalo'; g.add(halo);
  live(g); g.name = 'skyCrack'; return g;
}
export const PROPS7 = {headset, visorScreen, headsetScreen, tumbleweed, dryStick, skyCrack, giantFinger, wateringCan, grassBlade, spaceship, sunSphere, swordStone, crate, deadTree, birdhouse, powerLine, porch, shack,
  rockPeak, rockMesa, starField, ringPlanet, streetLamp, groundFog, brokenBuilding};
export const PROP7_NAMES = Object.keys(PROPS7);
