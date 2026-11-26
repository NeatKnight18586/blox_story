// parts/city/kit/building.js — City Building Kit (Phase 1B): pure data in → meshes out, seeded, three LODs, merged by material.
//   building(spec) → {group, near, mid, far, w, d, h, signs, tris: {near, mid, far}}; setLOD(b, 'near'|'mid'|'far').
// Local frame: footprint centred on the origin, FRONT face at +z (the street), ground at y 0 (the body sinks `sink` below for slopes).
// spec = {footprint: [w, d], floors, floorH, style: brick|plaster|candy|wood|civic, palette: {body, trim, roof, accent, door, display: []},
//   windows: {rhythm, type: sash|arch|square}, ground: storefront|door|garage|columns, awning: {stripes, colors: [a, b]}|null,
//   sign: {text, color, bg}|null, roof: flat-parapet|gable|hip|mansard, trim: colour, seed, sink, groundH}
// Phase 1C opt-in extras (all absent from the 1B presets): steps {n, w, depth, rise} (raises the floor, the whole building lifts), pavilion {w, proj} (central
//   projecting bay, gable pediment), clock {r, hh, mm} (dial above the door), doorW, doorH, siding, chimney, shutters (colour), porch, garage {w, side, h} (attached).
// Look: clean plastic shapes (bevel .04 family on the big volumes) + CC0 textures through kit/mats.js (brick, plaster, wood, shingle).
// Budget (tests/v2/city-kit.test.js): near ≤ 3k tris, mid ≤ 600, far = a box (+ roof cap). Static parts are baked by the world's
// bakeGroups (contact AO + sun in vertex colours); glass, lit displays and sign plates stay live.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bevelBoxGeometry} from '../../sets4/look5.js';
import {textPlate} from '../../sets4/common.js';
import {kitMat, liveMat, kitBoxUV, tileOf, dialTexture} from './mats.js';

const BODY = {brick: 'brick', plaster: 'plaster', candy: 'plastic', wood: 'wood', civic: 'plaster'};
const DEF = {floors: 2, floorH: 3.6, style: 'plaster', windows: {rhythm: 0, type: 'sash'}, ground: 'door', awning: null, sign: null, roof: 'flat-parapet', seed: 1, sink: .8};
export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const triCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

// geometry bins: material → [geometry] (all converted to non-indexed with uv), merged to one mesh per material
function bins() {
  const map = new Map();
  const add = (mat, g, uvTile = null) => { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (uvTile) kitBoxUV(g, uvTile); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!map.has(mat)) map.set(mat, []); map.get(mat).push(g); };
  const build = (name) => { const grp = new T.Group(); grp.name = name; let n = 0;
    for (const [mat, list] of map) { const m = new T.Mesh(mergeGeometries(list, false), mat); m.name = name + ':' + (mat.userData?.kit ?? 'x'); if (mat.userData?.live) m.userData.live = true; n += triCount(m.geometry); grp.add(m); }
    grp.userData.tris = n; return grp; };
  return {add, build};
}
// look5 bevelBoxGeometry winds its −x/−y/−z faces inward (frozen module): the kit flips any triangle whose winding opposes its normal.
export function fixWinding(g) {
  const p = g.attributes.position, n = g.attributes.normal, ix = g.index.array, A = [0, 0, 0], B = [0, 0, 0];
  for (let t = 0; t < ix.length; t += 3) { const [i, j, k] = [ix[t], ix[t + 1], ix[t + 2]];
    for (let c = 0; c < 3; c++) { const o = p.array[i * 3 + c]; A[c] = p.array[j * 3 + c] - o; B[c] = p.array[k * 3 + c] - o; }
    const cx = A[1] * B[2] - A[2] * B[1], cy = A[2] * B[0] - A[0] * B[2], cz = A[0] * B[1] - A[1] * B[0];
    if (cx * (n.getX(i) + n.getX(j) + n.getX(k)) + cy * (n.getY(i) + n.getY(j) + n.getY(k)) + cz * (n.getZ(i) + n.getZ(j) + n.getZ(k)) < 0) { ix[t + 1] = k; ix[t + 2] = j; } }
  g.index.needsUpdate = true; return g;
}
const bevel = (w, h, d, x, y, z, cell = 3, skip = ['-y']) => fixWinding(bevelBoxGeometry(w, h, d, .04, cell, {skip})).translate(x, y + h / 2, z);
const pbox = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
const plane = (w, h, x, y, z) => new T.PlaneGeometry(w, h).translate(x, y + h / 2, z);
function prism(w, rh, d) {   // gable roof: triangle (across x) extruded along z, base at y 0
  const s = new T.Shape([new T.Vector2(-w / 2, 0), new T.Vector2(w / 2, 0), new T.Vector2(0, rh)]), g = new T.ExtrudeGeometry(s, {depth: d, bevelEnabled: false}); g.translate(0, 0, -d / 2); return g.index ? g.toNonIndexed() : g;
}
function pyramid(w, d, h, top = .08) {   // hip / mansard: 4-sided frustum, base w × d at y 0
  const g = new T.CylinderGeometry(top, 1, h, 4, 1, false).toNonIndexed(); g.rotateY(Math.PI / 4); g.scale(w / Math.SQRT2, 1, d / Math.SQRT2); g.translate(0, h / 2, 0); g.computeVertexNormals(); return g;
}

export function resolve(spec) {
  const s = {...DEF, ...spec, windows: {...DEF.windows, ...(spec.windows ?? {})}, palette: {...(spec.palette ?? {})}};
  const [w, d] = s.footprint; s.w = w; s.d = d;
  if (s.steps) { s.steps = {n: 5, w: 8, depth: 4.5, rise: .45, ...s.steps}; s.lift = s.steps.n * s.steps.rise; s.sink += s.lift; } else s.lift = 0;
  s.groundH = s.groundH ?? (s.ground === 'storefront' ? 6.4 : s.ground === 'garage' ? 6 : s.floorH * 1.15);
  s.h = s.groundH + (s.floors - 1) * s.floorH;
  s.windows.rhythm = s.windows.rhythm || Math.max(1, Math.floor(w / 3.2));
  const P = s.palette; P.body ??= {brick: '#b9533d', plaster: '#efe4cf', candy: '#ff6b8b', wood: '#c99a6b', civic: '#f4f1ea'}[s.style]; P.trim ??= s.trim ?? '#fbf8f0'; P.roof ??= '#5b6270'; P.accent ??= P.body; P.door ??= '#4a3b33';
  P.display ??= ['#ffd23f', '#4fc3f7', '#7ed957', '#ff8fab'];
  return s;
}

export {bins, bevel, pbox, prism, pyramid, window1};
export function building(spec) {
  const s = resolve(spec), {w, d, h, palette: P} = s, R = rng(s.seed), F = d / 2;
  const bodyKind = BODY[s.style] ?? 'plaster', bodyMat = kitMat(bodyKind, P.body), trim = kitMat('plastic', P.trim), roofKind = s.roof === 'flat-parapet' ? 'concrete' : 'shingle';
  const roofMat = kitMat(roofKind, P.roof), glass = kitMat('glass', '#2f4a6b'), accent = kitMat('gloss', P.accent), dark = kitMat('plastic', '#3a3f47');
  const texTile = k => (k === 'plastic' ? null : tileOf(k));
  const signs = [];
  // ---------- NEAR ----------
  const N = bins(), A = N.add;
  A(bodyMat, bevel(w, h + s.sink, d, 0, -s.sink, 0, 4), texTile(bodyKind));
  // cornice + base band + floor bands
  A(trim, bevel(w + .5, .55, d + .5, 0, h - .2, 0, 99));
  A(trim, pbox(w + .16, .5, d + .16, 0, -.2, 0));
  for (let f = 1; f < s.floors; f++) A(trim, pbox(w + .14, .22, .14, 0, s.groundH + (f - 1) * s.floorH - .11, F + .05));
  // upper-floor windows (front)
  const WN = s.windows.rhythm, ww = Math.min(1.7, w / WN * .48), wh = s.floorH * .56;
  for (let f = 1; f < s.floors; f++) for (let i = 0; i < WN; i++) {
    const x = -w / 2 + (i + .5) * w / WN, y = s.groundH + (f - 1) * s.floorH + s.floorH * .24;
    if (s.pavilion && Math.abs(x) < s.pavilion.w / 2 + .6) continue;
    window1(A, x, y, F, ww, wh, s.windows.type, trim, glass); if (s.shutters) shutters(A, x, y, F, ww, wh, kitMat('plastic', s.shutters));
  }
  // ground floor
  const G = s.groundH;
  if (s.ground === 'storefront') {
    const doorW = 1.9, doorX = w / 2 - .7 - doorW / 2, wx0 = -w / 2 + .7, wx1 = doorX - doorW / 2 - .5, winW = wx1 - wx0, winX = (wx0 + wx1) / 2, winTop = G - 2.7;
    A(accent, pbox(w - .2, .7, .5, 0, 0, F + .25));                                   // kick plate
    for (const x of [-w / 2 + .3, doorX - doorW / 2 - .25, w / 2 - .3]) A(trim, pbox(.5, winTop + .2, .6, x, 0, F + .3));   // pilasters
    A(trim, pbox(w, .35, .65, 0, winTop, F + .32));                                   // lintel
    // lit display: back panel (live), shelf, a few products, glass in front
    const disp = plane(winW, winTop - .7, winX, .7, F + .04); A(liveMat('basic', '#fff1d6'), disp);
    A(trim, pbox(winW, .15, .9, winX, 1.15, F + .45));
    const nP = 3 + Math.floor(R() * 2);
    for (let k = 0; k < nP; k++) { const px = wx0 + (k + .5) * winW / nP, c = P.display[(k + Math.floor(R() * 4)) % P.display.length], sz = .5 + R() * .45, m = kitMat('gloss', c);
      const g = k % 3 === 1 ? new T.CylinderGeometry(sz * .5, sz * .5, sz * 1.3, 8).translate(px, 1.25 + sz * .65, F + .45) : k % 3 === 2 ? new T.IcosahedronGeometry(sz * .55, 0).translate(px, 1.25 + sz * .55, F + .45) : pbox(sz, sz * 1.2, sz * .7, px, 1.25, F + .45);
      A(m, g); }
    A(liveMat('std', '#d8eeff', {transparent: true, opacity: .26, depthWrite: false}), plane(winW, winTop - .7, winX, .7, F + .58));
    // door: frame, panel with a glass inset, handle
    A(trim, pbox(doorW + .4, 3.3, .3, doorX, 0, F + .12)); A(accent, pbox(doorW, 3.05, .3, doorX, 0, F + .2)); A(glass, pbox(doorW * .6, 1.5, .08, doorX, 1.3, F + .37));
    A(kitMat('gold', '#e8b923'), pbox(.14, .14, .2, doorX - doorW * .32, 1.35, F + .42));
    // awning (striped, sloped) + sign board above it
    if (s.awning) awning(A, s.awning, winX + (doorW + .5) / 2 * 0, w - .4, winTop + .4, F + .35);
    if (s.sign) signBoard(A, s, signs, G, trim, F);
  } else if (s.ground === 'garage') {
    const n = s.garages ?? Math.max(1, Math.floor(w / 6)), gw = w / n * .72, gh = G - 1.8;
    for (let i = 0; i < n; i++) { const x = -w / 2 + (i + .5) * w / n;
      A(trim, pbox(gw + .6, gh + .4, .3, x, 0, F + .12)); A(kitMat('plastic', P.door === '#4a3b33' ? '#f4f4f0' : P.door), pbox(gw, gh, .3, x, 0, F + .2));
      for (let k = 1; k < 5; k++) A(dark, pbox(gw - .2, .08, .06, x, gh * k / 5, F + .36));
      A(glass, pbox(gw - .6, .5, .08, x, gh * .62, F + .37)); }
    if (s.sign) signBoard(A, s, signs, G, trim, F);
  } else if (s.ground === 'columns') {
    const n = s.columns ?? 4, cw = Math.min(w * .7, n * 3.2);
    A(trim, bevel(cw + 1.2, .5, 3.2, 0, 0, F + 1.4, 99));
    for (let i = 0; i < n; i++) A(trim, new T.CylinderGeometry(.42, .5, G - .6, 10).translate(-cw / 2 + (i + .5) * cw / n, .5 + (G - .6) / 2, F + 2.2));
    A(trim, bevel(cw + 1.2, .6, 3.2, 0, G - .1, F + 1.4, 99));
    A(accent, pbox(2.4, 3.4, .3, 0, 0, F + .12)); A(glass, pbox(1.6, 1.2, .08, 0, 1.8, F + .3));
    if (s.sign) signBoard(A, s, signs, G + .6, trim, F + 1.6);
  } else {   // door + ground-floor windows
    const dw = s.doorW ?? 1.7, FD = F + (s.pavilion?.proj ?? 0), doorMat = s.palette.door !== '#4a3b33' ? liveMat('std', s.palette.door, {roughness: .4, metalness: 0, envMapIntensity: .5}) : accent;   // the door is live (lit in real time, never baked dark under the porch)
    const dh = s.doorH ?? 3.1;
    A(trim, pbox(dw + .5, dh + .3, .3, 0, 0, FD + .12)); A(doorMat, pbox(dw, dh, .3, 0, 0, FD + .2)); A(trim, pbox(dw + .9, .3, .9, 0, dh + .3, FD + .45));
    if (dw > 2.4) { A(trim, pbox(.12, dh, .08, 0, 0, FD + .37)); for (const sx of [-1, 1]) A(glass, pbox(dw * .3, 1.4, .08, sx * dw * .24, 1.2, FD + .37)); }   // double door: centre stile + two glass lights
    else { A(kitMat('gold', '#e8b923'), pbox(.14, .14, .2, dw * .3, dh * .45, FD + .4)); A(glass, pbox(dw * .42, .9, .08, 0, dh * .61, FD + .37)); }
    for (let i = 0; i < WN; i++) { const x = -w / 2 + (i + .5) * w / WN; if (Math.abs(x) < 1.9 + (s.pavilion ? s.pavilion.w / 2 : 0)) continue; window1(A, x, G * .28, F, ww, wh, s.windows.type, trim, glass); if (s.shutters) shutters(A, x, G * .28, F, ww, wh, kitMat('plastic', s.shutters)); }
    if (s.awning) awning(A, s.awning, 0, 3, 3.6, F + .35);
    if (s.sign) signBoard(A, s, signs, G, trim, F);
  }
  extras(A, s, 'near', {bodyMat, bodyKind, trim, roofMat, roofKind, glass, accent, dark, texTile});
  roof(A, s, roofMat, trim, bodyMat, R, texTile(roofKind), texTile(bodyKind), 'near');
  const near = N.build('near');
  for (const sg of signs) near.add(sg);
  // ---------- MID ----------
  const Mb = bins(), B = Mb.add;
  B(bodyMat, pbox(w, h + s.sink, d, 0, -s.sink, 0), texTile(bodyKind));
  B(trim, pbox(w + .5, .55, d + .5, 0, h - .2, 0));
  const frames = [], panes = [];
  for (let f = 1; f < s.floors; f++) for (let i = 0; i < WN; i++) { const x = -w / 2 + (i + .5) * w / WN, y = s.groundH + (f - 1) * s.floorH + s.floorH * .24; if (s.pavilion && Math.abs(x) < s.pavilion.w / 2 + .6) continue; frames.push(plane(ww + .3, wh + .3, x, y - .15, F + .02)); panes.push(plane(ww, wh, x, y, F + .04)); }
  if (frames.length) { B(trim, mergeGeometries(frames.map(g => g.toNonIndexed()))); B(glass, mergeGeometries(panes.map(g => g.toNonIndexed()))); }
  if (s.ground === 'storefront') { B(liveMat('basic', '#fff1d6'), plane(w - 3.6, G - 3.4, -1.2, .7, F + .04)); B(accent, plane(1.9, 3.05, w / 2 - 1.65, 0, F + .04)); }
  else if (s.ground === 'garage') { const n = s.garages ?? Math.max(1, Math.floor(w / 6)); for (let i = 0; i < n; i++) B(kitMat('plastic', '#f4f4f0'), plane(w / n * .72, G - 1.8, -w / 2 + (i + .5) * w / n, 0, F + .04)); }
  else B(accent, plane(1.7, 3.1, 0, 0, F + (s.pavilion?.proj ?? 0) + .04));
  if (s.awning) B(kitMat('plastic', s.awning.colors[0]), pbox(w - .4, .2, 1.8, 0, G - 2.3 - .1, F + .9).rotateX(0));
  extras(B, s, 'mid', {bodyMat, bodyKind, trim, roofMat, roofKind, glass, accent, dark, texTile});
  roof(B, s, roofMat, trim, bodyMat, R, texTile(roofKind), texTile(bodyKind), 'mid');
  const mid = Mb.build('mid');
  for (const sg of signs) { const c = new T.Mesh(sg.geometry, sg.material); c.position.copy(sg.position); c.name = sg.name; c.userData = {...sg.userData}; mid.add(c); }
  // ---------- FAR: a box ----------
  const Fb = bins(); Fb.add(kitMat('plastic', P.body), pbox(w, h + s.sink, d, 0, -s.sink, 0));
  if (s.roof === 'gable' || s.roof === 'hip' || s.roof === 'mansard') Fb.add(kitMat('plastic', P.roof), s.roof === 'gable' ? prism(w + .6, Math.min(w, d) * .35, d + .6).translate(0, h, 0) : pyramid(w + .6, d + .6, Math.min(w, d) * .3, s.roof === 'mansard' ? .55 : .08).translate(0, h, 0));
  if (s.garage) { const g = s.garage; Fb.add(kitMat('plastic', P.body), pbox(g.w, g.h ?? 4.4, d - 1.5, g.side * (w / 2 + g.w / 2), -s.sink, -.75)); }
  const far = Fb.build('far');
  if (s.lift) { near.position.y = mid.position.y = far.position.y = s.lift; }   // steps raise the floor; the body already sinks `lift` deeper
  const group = new T.Group(); group.name = 'bld:' + (s.id ?? s.sign?.text ?? s.style); group.add(near, mid, far);
  const b = {group, near, mid, far, w, d, h: h + s.lift, signs: [...near.children.filter(c => c.userData.capH), ...mid.children.filter(c => c.userData.capH)], spec: s,
    tris: {near: near.userData.tris + signs.length * 2, mid: mid.userData.tris + signs.length * 2, far: far.userData.tris}};
  setLOD(b, 'near'); return b;
}
export function setLOD(b, level) { b.near.visible = level === 'near'; b.mid.visible = level === 'mid'; b.far.visible = level === 'far'; b.level = level; }
// LOD by distance (studs) from the camera to the building centre.
export const LOD_R = {near: 70, mid: 170};
export const lodFor = (dist, R = LOD_R) => dist < R.near ? 'near' : dist < R.mid ? 'mid' : 'far';   // Phase 1C: optional radii override

function window1(A, x, y, F, ww, wh, type, trim, glass) {
  A(trim, pbox(ww + .36, wh + .36, .12, x, y - .18, F + .04));
  A(glass, plane(ww, wh, x, y, F + .11));
  A(trim, pbox(ww + .6, .18, .38, x, y - .3, F + .17));
  if (type === 'sash' || type === 'square') { A(trim, pbox(.1, wh, .06, x, y, F + .17)); A(trim, pbox(ww, .1, .06, x, y + wh * .52, F + .17)); }
  if (type === 'arch') { A(trim, new T.CircleGeometry(ww / 2 + .18, 7, 0, Math.PI).translate(x, y + wh, F + .1)); A(glass, new T.CircleGeometry(ww / 2, 7, 0, Math.PI).translate(x, y + wh, F + .11)); }
}
function awning(A, aw, x, width, y, F) {
  const n = aw.stripes ?? 7, cols = aw.colors ?? ['#ffffff', '#ff5a5f'], depth = 1.9, tilt = .42, sw = width / n;
  for (let i = 0; i < n; i++) { const m = kitMat('plastic', cols[i % cols.length]), sx = x - width / 2 + (i + .5) * sw;
    const g = new T.BoxGeometry(sw, .12, depth).translate(0, 0, depth / 2).rotateX(tilt).translate(sx, y, F); A(m, g);
    A(m, new T.BoxGeometry(sw, .5, .08).translate(sx, y - Math.sin(tilt) * depth - .25, F + Math.cos(tilt) * depth)); }
  for (const k of [-1, 1]) A(kitMat('metal', '#5a5f66'), new T.BoxGeometry(.08, .08, depth).translate(0, 0, depth / 2).rotateX(tilt).translate(x + k * (width / 2 - .1), y - .1, F));
}
function signBoard(A, s, signs, G, trim, F) {
  const sw = Math.min(s.w - .8, s.sign.w ?? 13), sh = s.sign.h ?? 2.8, y = G - 2.3 + .05;
  A(kitMat('gloss', s.sign.frame ?? s.palette.trim), bevel(sw + .5, sh + .4, .35, 0, y, F + .2, 99));
  const p = textPlate(s.sign.text, {w: sw, h: sh, bg: s.sign.bg ?? '#ffffff', fg: s.sign.color ?? '#222222', maxFont: 1000, name: 'shopSign'});
  p.position.set(0, y + .2 + sh / 2, F + .39); signs.push(p);
}
function roof(A, s, roofMat, trim, bodyMat, R, roofTile, bodyTile, lod) {
  const {w, d, h} = s;
  if (s.roof === 'flat-parapet') {
    if (lod === 'near') { for (const [pw, pd, px, pz] of [[w + .5, .45, 0, d / 2], [w + .5, .45, 0, -d / 2], [.45, d, -w / 2, 0], [.45, d, w / 2, 0]]) A(trim, pbox(pw, .9, pd, px, h + .3, pz));
      A(roofMat, pbox(w - .4, .1, d - .4, 0, h + .3, 0), roofTile);
      if (R() < .7) A(kitMat('metal', '#b8bcc2'), bevel(1.6, 1, 1.2, (R() - .5) * w * .5, h + .35, -d * .15, 99)); }
    else A(trim, pbox(w + .5, .9, d + .5, 0, h + .3, 0));
  } else if (s.roof === 'gable') {
    const rh = Math.min(w, d) * .38; A(roofMat, prism(w + .8, rh, d + .8).translate(0, h + .3, 0), roofTile);
    if (lod === 'near') A(bodyMat, prism(w - .1, rh - .2, d - .3).translate(0, h + .3, 0), bodyTile);
  } else {
    const rh = Math.min(w, d) * (s.roof === 'mansard' ? .32 : .3); A(roofMat, pyramid(w + .8, d + .8, rh, s.roof === 'mansard' ? .55 : .08).translate(0, h + .3, 0), roofTile);
    if (s.roof === 'mansard') A(trim, pbox(w * .55 + .3, .3, d * .55 + .3, 0, h + .3 + rh, 0));
  }
}

function shutters(A, x, y, F, ww, wh, mat) { for (const k of [-1, 1]) A(mat, pbox(.42, wh + .1, .08, x + k * (ww / 2 + .4), y - .05, F + .13)); }
// Phase 1C opt-in extras (see the header). lod: 'near' | 'mid' (far is a box + the garage box, added by building()).
function extras(A, s, lod, M) {
  const {w, d, h, palette: P} = s, F = d / 2, {bodyMat, bodyKind, trim, roofMat, roofKind, glass, accent, dark, texTile} = M, near = lod === 'near', G = s.groundH;
  if (s.siding && near) {   // horizontal clapboard lines (front + both sides), a shade darker than the body
    const line = kitMat('plastic', '#' + new T.Color(P.body).multiplyScalar(.86).getHexString());
    for (let y = .9; y < h - .6; y += .95) { A(line, pbox(w + .05, .07, .05, 0, y, F + .015)); for (const sx of [-1, 1]) A(line, pbox(.05, .07, d + .05, sx * (w / 2 + .015), y, 0)); } }
  if (s.pavilion) {   // central projecting bay: brick, white pilasters, gable pediment, clock over the door
    const pv = s.pavilion, pw = pv.w, pp = pv.proj ?? 1.4, tall = h;
    A(bodyMat, bevel(pw, tall + s.sink, pp + .6, 0, -s.sink, F + pp / 2 - .3, 4), texTile(bodyKind));
    if (near) for (const sx of [-1, 1]) A(trim, pbox(.7, tall - .2, .7, sx * (pw / 2 - .2), 0, F + pp - .05));
    A(trim, pbox(pw + .8, .5, pp + 1, 0, tall - .2, F + pp / 2 - .1));
    A(trim, prism(pw + 1.4, Math.min(3.4, pw * .34), pp + 1).translate(0, tall + .3, F + pp / 2 - .1));
    if (s.clock) { const r = s.clock.r ?? 1.5, cy = G + s.floorH * .62 + r * .3, dial = dialTexture(s.clock.hh ?? 8, s.clock.mm ?? 15);
      A(trim, new T.CylinderGeometry(r + .28, r + .28, .25, 20).rotateX(Math.PI / 2).translate(0, cy, F + pp + .05));
      A(dial ? liveMat('basic', '#ffffff', {map: dial}) : liveMat('basic', '#fbf8ee'), new T.CircleGeometry(r, 24).translate(0, cy, F + pp + .2)); }
  }
  if (s.steps) {   // stacked blocks, bottom → top; the top tread meets the door sill at y 0 (the group is lifted by `lift`)
    const st = s.steps, FD = F + (s.pavilion?.proj ?? 0), td = st.depth / st.n, kind = liveMat('std', '#e2d9c4', {roughness: .8, metalness: 0, envMapIntensity: .3}), top = liveMat('std', '#f4eee0', {roughness: .8, metalness: 0, envMapIntensity: .3});   // live: steps under the pavilion never bake black
    if (near) { for (let k = 0; k < st.n; k++) { const dd = (st.n - k) * td, hh = (k + 1) * st.rise; A(kind, pbox(st.w, hh + .8, dd, 0, -s.lift - .8, FD + dd / 2)); A(top, pbox(st.w + .04, .1, dd + .04, 0, -s.lift + hh - .1, FD + dd / 2)); }
      for (const sx of [-1, 1]) A(trim, pbox(.7, s.lift + .9, st.depth + .3, sx * (st.w / 2 + .35), -s.lift - .1, FD + st.depth / 2)); }
    else A(kind, pbox(st.w, s.lift + .8, st.depth, 0, -s.lift - .8, FD + st.depth / 2));
  }
  if (s.chimney && near) { const cx = (s.chimney.x ?? .28) * w, rh = Math.min(w, d) * .38, brick = kitMat('brick', '#b8553f');
    A(brick, pbox(1.3, rh + 1.2, 1.3, cx, h + .1, -d * .15), texTile('brick')); A(trim, pbox(1.7, .25, 1.7, cx, h + rh + 1.2, -d * .15)); }
  if (s.porch) {   // small gabled porch: slab, two posts, roof
    const pz = F + 1.5, pw = s.porch.w ?? 4;
    A(trim, pbox(pw, .3, 3, 0, 0, pz)); if (near) for (const sx of [-1, 1]) A(trim, pbox(.28, 3.2, .28, sx * (pw / 2 - .3), .3, F + 2.7));
    A(roofMat, prism(pw + .8, 1.3, 3.4).translate(0, 3.5, pz), texTile(roofKind)); }
  if (s.garage) {   // attached garage: set back .75, low gable, white sectional door
    const g = s.garage, gh = g.h ?? 4.4, gx = g.side * (w / 2 + g.w / 2), gd = d - 1.5, gz = -.75, gf = gz + gd / 2;
    A(bodyMat, bevel(g.w, gh + s.sink, gd, gx, -s.sink, gz, 4), texTile(bodyKind)); A(trim, pbox(g.w + .3, .3, gd + .3, gx, gh - .15, gz));
    A(roofMat, prism(g.w + .8, 1.2, gd + .8).translate(gx, gh + .1, gz), texTile(roofKind));
    const dw = g.w - 1.4, dh = gh - 1.1; A(trim, pbox(dw + .5, dh + .3, .2, gx, 0, gf + .06)); A(kitMat('plastic', '#f6f6f2'), pbox(dw, dh, .2, gx, 0, gf + .12));
    if (near) { for (let k = 1; k < 4; k++) A(dark, pbox(dw - .1, .06, .06, gx, dh * k / 4, gf + .24)); A(glass, pbox(dw * .8, .45, .06, gx, dh * .78, gf + .25)); }
    A(trim, pbox(g.w - .6, .2, 2.4, gx, 0, gf + 1.3));   // driveway apron
  }
}
