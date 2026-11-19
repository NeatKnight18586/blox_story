// engine/fixtures/realism/street.js — Phase R test scene (code = generic glue only; the street is data).
// ?loc=<location json in this folder> → parts/location.js builds it (palette, modules + layout, HDRI/sky, fog, sun, bake);
// shots.json places two cast actors (body5, faces v5, satin, untextured) and defines three cameras.
// window.__realism = {shots, stats, render(i, w, h) → ms, measure(i, w, h) → {lapBg, lapActor, lap, subjL, localBg, contrast}, png(i, w, h)}
import * as T from 'three';
import {buildLocation, mergeLocation} from '../../../parts/location.js';
import {buildActor} from '../../actors.js';
import {samplePose, applyPoseSample} from '../../poses.js';
import {localContrast} from '../../look6.js';

const q = new URLSearchParams(location.search), here = new URL('./', import.meta.url), base = new URL('../../../', import.meta.url);
const json = async u => (await fetch(u)).json();
let loc = await json(new URL(q.get('loc') ?? 'street-cc0.json', here));
if (loc.extends) loc = mergeLocation(await json(new URL(loc.extends, here)), loc);
if (q.get('static')) loc.bake = {...loc.bake, material: q.get('static')};   // cost probe: ?static=basic|standard
const manifest = await json(new URL('renders/cache/assets/manifest.json', base)).catch(() => ({materials: {}, hdri: {}}));
const S = await json(new URL('shots.json', here)), cast = (await json(new URL('cast/toyhouse.json', base))).cast;

const renderer = new T.WebGLRenderer({antialias: q.get('aa') !== '0', preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; document.body.appendChild(renderer.domElement);
const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 9 / 16, .1, 1200);
const L = await buildLocation(scene, renderer, loc, {base, manifest});
const actors = {};
for (const [k, c] of Object.entries(S.cast)) {
  const a = buildActor({...cast[c.preset], face: c.face ?? cast[c.preset].face}, k);
  applyPoseSample(a, samplePose('idle', 0), {position: c.at, yaw: c.yaw ?? 0}); a.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  scene.add(a.root); actors[k] = a;
}
function setShot(i, w, h, nudge = 0) {
  const s = S.shots[i]; camera.fov = s.fov; camera.aspect = w / h; camera.position.set(s.pos[0] + nudge, s.pos[1], s.pos[2]); camera.lookAt(...s.look); camera.updateProjectionMatrix();
  for (const [k, c] of Object.entries(S.cast)) { const a = actors[k]; a.root.rotation.y = Math.atan2(camera.position.x - c.at[0], camera.position.z - c.at[2]); }
  const sub = S.cast[s.subject].at; L.fit(new T.Vector3(...sub), 9); return s;
}
let size = '';
function render(i, w = 540, h = 960, nudge = 0) {
  const t0 = performance.now(); if (size !== `${w}x${h}`) { renderer.setSize(w, h, false); size = `${w}x${h}`; }
  setShot(i, w, h, nudge); renderer.render(scene, camera);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return performance.now() - t0;
}
function rgba(w, h) { const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; }
const luma = (px, w, h) => { const L = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((h - 1 - y) * w + x) * 4; L[y * w + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; } return L; };
const occ = new T.MeshBasicMaterial({colorWrite: false}), white = new T.MeshBasicMaterial({color: '#ffffff'});
function mask(who, w, h) {
  const sw = [], fog = scene.fog, bg = scene.background; scene.traverse(o => { if (o.isMesh || o.isSprite) { sw.push([o, o.material, o.visible]); let a = false; for (let p = o; p; p = p.parent) if (p === actors[who].root) a = true;
    if (o.name === 'groundedSkybox' || o.name === 'skyDome' || o.name === 'shadowCatcher' || o.isSprite) o.visible = false; else o.material = a ? white : occ; } });
  scene.fog = null; scene.background = new T.Color('#000000'); const tm = renderer.toneMapping; renderer.toneMapping = T.NoToneMapping; renderer.setClearColor('#000000', 1); renderer.render(scene, camera);
  const px = rgba(w, h); for (const [o, m, v] of sw) { o.material = m; o.visible = v; } scene.fog = fog; scene.background = bg; renderer.toneMapping = tm;
  const m = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = px[((h - 1 - y) * w + x) * 4] > 127 ? 1 : 0; return m;
}
const erode = (m, w, h, k) => { let a = m; for (let i = 0; i < k; i++) { const b = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const j = y * w + x; b[j] = a[j] && a[j - 1] && a[j + 1] && a[j - w] && a[j + w] ? 1 : 0; } a = b; } return a; };
const dilate = (m, w, h, k) => erode(m.map(v => 1 - v), w, h, k).map(v => 1 - v);
// Same definitions as engine/episode.js sepMeasure (Look 5b/6): Laplacian variance bg (≥ 3 px outside) / actor interior;
// local contrast = |subject − local bg| / local bg, local bg = subject box grown by 1.5 body widths, subject excluded.
function measure(i, w = 540, h = 960) {
  const s = S.shots[i]; render(i, w, h); const Lm = luma(rgba(w, h), w, h), m = mask(s.subject, w, h), inner = erode(m, w, h, 3), outer = dilate(m, w, h, 3);
  const lap = new Float32Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const j = y * w + x; lap[j] = 4 * Lm[j] - Lm[j - 1] - Lm[j + 1] - Lm[j - w] - Lm[j + w]; }
  const vr = sel => { let s1 = 0, s2 = 0, k = 0; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const j = y * w + x; if (!sel(j)) continue; s1 += lap[j]; s2 += lap[j] * lap[j]; k++; } return k > 50 ? s2 / k - (s1 / k) ** 2 : null; };
  let sl = 0, sn = 0, x0 = w, x1 = -1, y0 = h, y1 = -1; for (let j = 0; j < w * h; j++) if (m[j]) { sl += Lm[j]; sn++; const x = j % w, y = (j / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, X0 = Math.max(0, x0 - 1.5 * bw) | 0, X1 = Math.min(w - 1, x1 + 1.5 * bw), Y0 = Math.max(0, y0 - 1.5 * bw) | 0, Y1 = Math.min(h - 1, y1 + 1.5 * bw); let ls = 0, ln = 0;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const j = y * w + x; if (!outer[j]) { ls += Lm[j]; ln++; } }
  const lapActor = vr(j => inner[j]), lapBg = vr(j => !outer[j]), subjL = sl / Math.max(1, sn), localBg = ln ? ls / ln : null;
  render(i, w, h);   // leave the beauty frame on the canvas
  return {shot: s.id, subjectPx: sn, subjectFrac: +(sn / (w * h)).toFixed(4), lapBg, lapActor, lap: lapActor && lapBg ? lapBg / lapActor : null, subjL, localBg, contrast: localContrast(subjL, localBg)};
}
function texMemory() { let bytes = 0, n = 0; const seen = new Set(); scene.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap']) { const t = m[k]; if (!t || seen.has(t.source)) continue; seen.add(t.source);
  const im = t.image; if (im?.width) { bytes += Math.round(im.width * im.height * 4 * 4 / 3); n++; } } }); return {textures: n, bytes, env: scene.environment ? 'PMREM' : null}; }
function triangles() { let t = 0; scene.traverse(o => { if (o.isMesh && o.visible) { const g = o.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return t; }
renderer.compile(scene, camera);
window.__dbg = {scene, renderer, actors};
window.__realism = {loc: loc.name, shots: S.shots, stats: L.stats, render, measure, texMemory, triangles, png: (i, w, h) => { render(i, w, h); return renderer.domElement.toDataURL('image/png'); }};
