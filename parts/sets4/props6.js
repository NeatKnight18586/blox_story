// parts/sets4/props6.js — Toy House final fix props (owner P8): a gummy bear that reads as a bear (round head, ears, belly,
// arms, legs; translucent red-orange), a toy drone (body + 4 arms + 4 rotors spinning, pure in t), a photo frame showing an
// image file (p.image, e.g. the T34 sepia still). Registered in props4.js SP; old props (gummyBear, drone, photoFrame) unchanged.
import * as T from 'three';
import {box, cyl, plastic} from './common.js';

export const GUMMY = '#ff5a1f';
const gummyMat = (() => { let m = null; return () => (m ??= Object.assign(new T.MeshStandardMaterial({color: GUMMY, roughness: .25, metalness: 0, transparent: true, opacity: .82, emissive: '#8a1a00', emissiveIntensity: .35}), {name: 'gummy'})); })();
const ball = (r, at, sx = 1, sy = 1, sz = 1) => { const g = new T.SphereGeometry(r, 8, 5); g.scale(sx, sy, sz); const m = new T.Mesh(g, gummyMat()); m.position.set(...at); return m; };
// gummy bear: stands on y = 0, faces +z, 2.4 tall at scale 1
export function gummyBear2() {
  const g = new T.Group();
  g.add(ball(.62, [0, 1.0, 0], 1, 1.05, .8), ball(.5, [0, 1.95, 0], 1.05, .95, .85));                               // belly, head
  for (const s of [-1, 1]) g.add(ball(.19, [s * .36, 2.38, 0], 1, 1, .7), ball(.2, [s * .62, 1.25, .12], .9, 1.5, .9), ball(.24, [s * .32, .3, .1], 1, 1.25, 1.1));   // ears, arms, legs
  g.add(ball(.16, [0, 1.85, .4], 1.3, .9, .7));                                                                        // snout
  g.traverse(o => { if (o.isMesh) o.userData.live = true; });
  g.name = 'gummyBear2'; return g;
}
// toy drone: body .9 × .32, four arms on the diagonals, rotors at the arm ends spinning (userData.anim, 9 turns/s)
export function drone2() {
  const g = new T.Group(); g.add(box(1.0, .36, 1.0, '#3a86ff', [0, 0, 0], {cell: 3}), box(.4, .16, .4, '#ffd542', [0, .26, 0], {cell: 3}), box(.3, .2, .12, '#2b2b2f', [0, -.02, .52], {cell: 3}));
  const rotors = [];
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const arm = box(1.1, .12, .16, '#2b2b2f', [x * .62, .06, z * .62], {cell: 3}); arm.rotation.y = -x * z * Math.PI / 4; g.add(arm);
    g.add(cyl(.12, .22, '#2b2b2f', [x * 1.0, .2, z * 1.0], {seg: 8, cell: 3}));                                     // motor
    const r = new T.Group(); r.position.set(x * 1.0, .33, z * 1.0); r.add(box(1.1, .04, .18, '#ff5a5f', [0, 0, 0], {cell: 3}), box(.18, .04, 1.1, '#ff5a5f', [0, .03, 0], {cell: 3}));   // crossed blades .03 apart (no coplanar faces)
    const disc = new T.Mesh(new T.CylinderGeometry(.56, .56, .02, 16).translate(0, .07, 0), new T.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .18, depthWrite: false})); disc.userData.live = true; r.add(disc);   // motion disc
    g.add(r); rotors.push(r);
  }
  g.userData.anim = tl => { rotors.forEach((r, i) => { r.rotation.y = (i % 2 ? -1 : 1) * tl * 9 * 2 * Math.PI; }); };
  g.name = 'drone2'; return g;
}
// photo frame with an image (p.image: a PNG path served next to the page root); sepia applied on the canvas
export function photoFrame2(seed, p = {}) {
  const g = new T.Group(); g.add(box(2.4, 3.0, .18, '#6b4428', [0, 0, 0], {cell: 3}));
  const mat = new T.MeshBasicMaterial({color: '#c9ac80'}); mat.userData.live = true;
  if (typeof document !== 'undefined' && p.image) { const img = new Image(), c = document.createElement('canvas'); c.width = 256; c.height = 320; const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    img.onload = () => { const x = c.getContext('2d'); x.filter = 'sepia(1) contrast(1.05)'; x.drawImage(img, 0, 0, 256, 320); tex.needsUpdate = true; mat.map = tex; mat.color.set('#ffffff'); mat.needsUpdate = true; };
    img.src = '/' + p.image; g.userData.ready = new Promise(r => { img.addEventListener('load', r); img.addEventListener('error', r); }); }
  const ph = new T.Mesh(new T.PlaneGeometry(1.9, 2.4), mat); ph.position.z = .1; ph.name = 'photo'; ph.userData.live = true; g.add(ph);
  g.name = 'photoFrame2'; return g;
}

// gold dawn light flooding the floor from the shutter (T50): additive gradient sheet on the floor, growing inward (−z) with t
export function goldFlood() {
  const g = new T.Group(); let tex = null;
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,214,140,1)'); gr.addColorStop(.6, 'rgba(255,190,100,.55)'); gr.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 256); tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; }
  const m = new T.MeshBasicMaterial({color: '#ffffff', map: tex, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false});
  const geo = new T.PlaneGeometry(26, 1); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -.5);   // spans z ∈ [−1, 0] at scale 1 (inward from the shutter)
  const sheet = new T.Mesh(geo, m); sheet.userData.live = true; sheet.name = 'goldFlood'; g.add(sheet);
  g.userData.anim = tl => { const u = Math.min(1, Math.max(0, (tl - .1) / 1.0)); sheet.scale.set(1, 1, Math.max(.001, 26 * u * (2 - u))); m.opacity = .85 * Math.min(1, u * 3); };
  g.name = 'goldFlood'; return g;
}
export const PROPS6 = {gummyBear2, drone2, photoFrame2, goldFlood};
