// parts/sets4/props7.js — Touch Grass props (E0). props6 format: each builder returns a named T.Group, moving parts are
// userData.live, motion is pure in time (g.userData.anim(tl)), states via g.userData.setState(s). Rounded block style.
// No coplanar faces: overlays sit ≥ .004 proud of their base AND use polygonOffset (flat overlays: visor strip, screen, labels).
//   headset(p)      black shell #1A1C22 + emissive visor strip #49D9FF; states 'on' | 'off'; attachHeadset(actor) seats it on the
//                   head front with a .02 gap to the face (measured: headsetGap(actor)); a visorScreen rides its front (p.screen)
//   visorScreen(p)  flat canvas screen; states 'off' | 'achievement' ("ACHIEVEMENT UNLOCKED" + gold trophy) | 'touched' ("TOUCHED GRASS" + trophy)
//   giantFinger(p)  Nova's forearm (raincoat sleeve + yellow cuff) + hand + pointing finger, skin #F2C59B; setBend(k ∈ [−1, 1]) bends the
//                   knuckle and the middle joint (poke = 0, flick wind-up = −1, flick release = 1); userData.tip = fingertip (local)
//   wateringCan · grassBlade (3 blades, 1 tall, #3DDC4A, sway) · spaceship · sunSphere (emissive) · swordStone (props.js sword + heroStone)
//   crate · deadTree · birdhouse (broken, swings) · powerLine · porch · shack
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {sword, heroStone} from '../props.js';
import {HEAD} from '../../avatar-style/body.js';
import {HEAD5} from '../../avatar-style/body5.js';
import {mergeByMaterial} from './common.js';

export const TG = {shell: '#1A1C22', glow: '#49D9FF', skin: '#F2C59B', cuff: '#FFC21A', can: '#4F8F8B', grass: '#3DDC4A', gold: '#F2C230',
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
  const stripOn = smat(TG.glow, {emissive: TG.glow, ei: 2.4, rough: .3, offset: 2}), stripOff = smat('#20303a', {rough: .4, offset: 2});
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

// ---- giant finger -------------------------------------------------------------------------------------------------------
// Unit scale: hand 2.0 wide; points down −y (comes down through the sky crack). Origin = the wrist (cuff bottom).
export function giantFinger(p = {}) {
  const g = new T.Group(), skin = smat(TG.skin, {rough: .62}), coat = smat(TG.cuff, {rough: .55}), coatDk = smat('#E6A800', {rough: .55});
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
  const setBend = k => { knuckle.rotation.x = .55 * k; joint.rotation.x = .75 * Math.max(0, k) - .25 * Math.max(0, -k); g.userData.bend = k; };
  setBend(p.bend ?? 0); live(g);
  g.userData = {...g.userData, setBend, tip, tipWorld: v => tip.getWorldPosition(v ?? new T.Vector3())}; g.name = 'giantFinger'; return g;
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
  g.add(mesh(rbox(.9, .55, 1.5, .25, 3), smat('#14202e', {rough: .1, metal: .5}), [0, .7, .9], null, 'cockpit'));
  for (const s of [-1, 1]) { g.add(mesh(rbox(3.2, .22, 2.0, .1, 2), hull, [s * 2.2, -.1, -.8], [0, s * .18, 0], 'wing'));
    g.add(mesh(rbox(.5, .5, 2.4, .2, 2), acc, [s * 3.7, -.1, -.6], null, 'gun'));
    g.add(mesh(new T.CylinderGeometry(.42, .42, .3, 14).rotateX(Math.PI / 2), glow, [s * .45, 0, -2.75], null, 'engine')); }
  g.add(mesh(rbox(.2, 1.1, 1.4, .08, 2), acc, [0, .9, -1.9], null, 'fin'));
  g.name = 'spaceship'; return g;
}
export function sunSphere(p = {}) {
  const g = new T.Group(), r = p.r ?? 1;
  g.add(mesh(new T.SphereGeometry(r, 40, 24), smat(p.color ?? '#FFE7A0', {basic: true}), [0, 0, 0], null, 'sunCore'));
  const halo = new T.Mesh(new T.SphereGeometry(r * 1.35, 32, 16), new T.MeshBasicMaterial({color: '#FFB54A', transparent: true, opacity: .28, side: T.BackSide, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false}));
  halo.name = 'sunHalo'; g.add(halo); live(g); g.name = 'sunSphere'; return g;
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
  const g = new T.Group(), span = p.span ?? 14, h = p.h ?? 8, m = smat(TG.deadwood, {rough: .9}), wire = smat('#2a2a2a', {rough: .6});
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
// Place a location's props list [{prop, at, rotY (deg), p, id}] → one group; statics merged by material (one draw call per material),
// moving props (userData.anim / live) stay separate and are returned in .live for the per-frame anim(tl). byId: placed groups with an id.
export function placeProps(list, {merge = true, t = 0} = {}) {
  const root = new T.Group(), statics = new T.Group(), movers = [], byId = {}; root.add(statics); root.name = 'props7';
  for (const pr of list ?? []) { const g = PROPS7[pr.prop](pr.p ?? {}); g.position.set(...pr.at); g.rotation.y = (pr.rotY ?? 0) * Math.PI / 180; g.userData.anim?.(t);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); if (pr.id) byId[pr.id] = g;
    if (g.userData.anim || pr.id) { root.add(g); if (g.userData.anim) movers.push(g); } else statics.add(g); }
  let m = null; if (merge) { m = mergeByMaterial(statics); statics.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  root.userData = {live: movers, byId, merged: m, anim: tl => movers.forEach(g => g.userData.anim(tl))}; return root;
}
export const PROPS7 = {headset, visorScreen, giantFinger, wateringCan, grassBlade, spaceship, sunSphere, swordStone, crate, deadTree, birdhouse, powerLine, porch, shack};
export const PROP7_NAMES = Object.keys(PROPS7);
