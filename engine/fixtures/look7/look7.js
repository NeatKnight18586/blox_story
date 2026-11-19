// engine/fixtures/look7/look7.js — Phase 5 look test page (generic glue; the world, moods and shots are data).
// ?mood=<engine/moods7.json key> &loc=street-look7.json &aa=0|1 &post=0 (raw, for the before/after) &shots=../realism/shots.json
// window.__look7 = {mood, shots, stats, render(i, w, h, {tier}) → ms, png(i, w, h, {tier}), measure(i, w, h)}
// tiers: previz = no MSAA, no AO, no DOF, bloom + grade on (cheap); final = MSAA 4, AO, rays, DOF on close shots, bloom, grade.
import * as T from 'three';
import {buildLocation, mergeLocation} from '../../../parts/location.js';
import {buildActor} from '../../actors.js';
import {samplePose, applyPoseSample} from '../../poses.js';
import {moodLocation, postFor} from '../../moods7.js';
import {createPost} from '../../post7.js';
import {localContrast} from '../../look6.js';

const q = new URLSearchParams(location.search), here = new URL('./', import.meta.url), base = new URL('../../../', import.meta.url);
const json = async u => (await fetch(u)).json();
const MOODS = await json(new URL('engine/moods7.json', base)), moodKey = q.get('mood') ?? 'goldenBittersweet', M = MOODS[moodKey];
if (!M) throw Error('unknown mood ' + moodKey);
let loc = await json(new URL(q.get('loc') ?? 'street-look7.json', here));
if (loc.extends) loc = mergeLocation(await json(new URL(loc.extends, here)), loc);
loc = moodLocation(loc, M);
const manifest = await json(new URL('renders/cache/assets/manifest.json', base)).catch(() => ({materials: {}, hdri: {}}));
const S = await json(new URL(q.get('shots') ?? '../realism/shots.json', here)), cast = (await json(new URL('cast/toyhouse.json', base))).cast;

const renderer = new T.WebGLRenderer({antialias: false, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; document.body.appendChild(renderer.domElement);
const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 9 / 16, .1, 1200);
const L = await buildLocation(scene, renderer, loc, {base, manifest});
if (L.mats.lampGlass) L.mats.lampGlass.mat.emissiveIntensity = M.practicals ?? 1;   // night: practical lamps above 1.0 → bloom
const actors = {};
for (const [k, c] of Object.entries(S.cast)) {
  const p = cast[c.preset], acc = [...(p.accessories ?? [])]; if (c.preset === 'HERO') acc.push({name: 'stormLantern', light: M.lantern ?? 0});
  const a = buildActor({...p, accessories: acc, face: c.face ?? p.face}, k);
  applyPoseSample(a, samplePose('idle', 0), {position: c.at, yaw: c.yaw ?? 0}); a.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(a.root); actors[k] = a;
}
const posts = {final: createPost(renderer, scene, camera, {samples: q.get('aa') === '0' ? 0 : 4}), previz: createPost(renderer, scene, camera, {samples: 0})};
function setShot(i, w, h) {
  const s = S.shots[i]; camera.fov = s.fov; camera.aspect = w / h; camera.position.set(...s.pos); camera.lookAt(...s.look); camera.updateProjectionMatrix();
  for (const [k, c] of Object.entries(S.cast)) { const a = actors[k]; a.root.rotation.y = Math.atan2(camera.position.x - c.at[0], camera.position.z - c.at[2]); }
  const sub = S.cast[s.subject].at; L.fit(new T.Vector3(...sub), 9); return s;
}
let size = '';
function render(i, w = 540, h = 960, {tier = 'final'} = {}) {
  const t0 = performance.now(); if (size !== `${w}x${h}`) { renderer.setSize(w, h, false); size = `${w}x${h}`; }
  const s = setShot(i, w, h);
  if (q.get('post') === '0') renderer.render(scene, camera);
  else {
    const sub = new T.Vector3(...S.cast[s.subject].at).add(new T.Vector3(0, 4, 0)), focus = camera.position.distanceTo(sub);
    const set = postFor(M, {shot: {size: s.size ?? (s.fov <= 35 ? 'close' : 'wide')}, t: 0, focus});
    const P = posts[tier]; if (tier === 'previz') { set.ao = null; set.dof = null; }
    for (const k of (q.get('off') ?? '').split(',').filter(Boolean)) set[k] = null;   // debug: &off=ao,rays,bloom,dof
    P.setSize(w, h); P.render({...set, seed: 1}, {sunDir: L.sunDir.toArray()});
  }
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return performance.now() - t0;
}
function lumaStats(w, h) {
  const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let s = 0, s2 = 0, n = w * h, r = 0, b = 0, clip = 0; for (let k = 0; k < n; k++) { const l = (.2126 * px[k * 4] + .7152 * px[k * 4 + 1] + .0722 * px[k * 4 + 2]) / 255; s += l; s2 += l * l; r += px[k * 4]; b += px[k * 4 + 2]; if (l >= .97) clip++; }
  const m = s / n; return {meanLuma: +m.toFixed(3), sdLuma: +Math.sqrt(Math.max(0, s2 / n - m * m)).toFixed(3), rOverB: +(r / Math.max(1, b)).toFixed(3), clip: +(clip / n).toFixed(4)};
}
renderer.compile(scene, camera);
window.__look7 = {mood: moodKey, shots: S.shots, stats: L.stats, render, lumaStats,
  png: (i, w, h, o) => { render(i, w, h, o); return renderer.domElement.toDataURL('image/png'); }};
