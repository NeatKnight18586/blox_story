// engine/episode.js — story-agnostic v2 renderer (docs/V2_BRIEF.md §5.1).
// Everything arrives as data (episode.json); renderFrame(n) is a pure function of n: no clock, no
// requestAnimationFrame, no unseeded randomness. Session 1: one legacy avatar on a ground plate;
// cast, worlds (world.js), faces, effects and overlays plug in from later sessions.
import * as T from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction, applyActionSample} from '../avatar/actions.js';
import {sampleCamera, maxTargetSpeed} from './camera.js';
import {layoutShots, totalFrames, valueAt, keyAt} from './timeline.js';
import {buildDragon, driveDragon} from '../avatar-style/dragon.js';
import {expandClassReveal, applyPatch} from './classes.js';
import {buildActor, driveActor, townsperson, toolGroup} from './actors.js';
import {resolveTroupe} from './troupe.js';
import {loadFont, fitTags} from './overhead.js';
import {createLook, createLookV3} from './look.js';
import {createEffects} from './effects.js';
import {createCrowds} from './crowd.js';
import {createRuleUI, enforceReadable} from './ruleui.js';
import * as P from '../parts/parts.js';
import * as B from '../parts/build.js';
import * as A from '../parts/ambient.js';
import * as M from '../parts/materials.js';
import * as PR from '../parts/props.js';
import * as TR from '../parts/terrain.js';
import * as BI from '../parts/biomes.js';
import * as V from '../parts/vegetation.js';
import * as W from '../parts/water.js';

const q = new URLSearchParams(location.search);
const specUrl = q.get('spec') ? new URL('../' + q.get('spec'), import.meta.url) : new URL(`../stories/${q.get('story')}/episode.json`, import.meta.url);
const spec = await (await fetch(specUrl)).json();
const FPS = spec.fps ?? 30;

// Shots on the frame timeline: each shot owns [start, start + frames) (timeline.js: `at` cut times or `frames`).
const shots = layoutShots(spec);
const FRAMES = totalFrames(shots);

// Amendment A3 class reveals: shot.classReveal ({actor, cls, at} with `at` relative to the shot, or a list) and
// spec.classReveals (absolute seconds) expand into ordinary effect entries + cast timeline patches (engine/classes.js).
const revealEffects = [];
for (const r of [...(spec.classReveals ?? []), ...shots.flatMap(s => [].concat(s.classReveal ?? []).map(r => ({...r, at: s.start / FPS + r.at})))]) {
  const x = expandClassReveal(r); revealEffects.push(...x.effects);
  if (!spec.cast?.[r.actor]) throw Error('classReveal: unknown actor ' + r.actor);
  spec.cast[r.actor] = applyPatch(spec.cast[r.actor], x.patch);
}

// ---- Scene: the episode's world.js (Session 3+) or the Session 1 placeholder plate ----
const renderer = new T.WebGLRenderer({antialias: q.get('aa') !== '0', preserveDrawingBuffer: true});
renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(45, 9 / 16, .3, 900);   // near 0.3 (A1): more depth precision for the ground layers
let world = null, look = null;
if (spec.world) {
  const mod = await import(new URL('../' + spec.world, import.meta.url).href);
  // A4: a world opts into the v3 look by exporting LOOK (an object, or a function of the spec); "Nobody" does not
  const lk = typeof mod.LOOK === 'function' ? mod.LOOK(spec) : mod.LOOK;
  look = lk ? createLookV3(scene, renderer, {...lk, onEnv: tex => M.setEnvMap(tex, lk.envIntensity ?? .45)}) : createLook(scene, renderer);
  world = mod.build(scene, {P, B, A, M, PR, TR, BI, V, W, look, spec});
} else {
  scene.background = new T.Color('#8fc8ff'); scene.fog = new T.Fog('#8fc8ff', 60, 140);
  scene.add(new T.HemisphereLight('#dfefff', '#6b8f4e', 1.1));
  const sun = new T.DirectionalLight('#fff3dc', 2.4); sun.position.set(14, 26, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 80}); scene.add(sun);
  const phong = c => new T.MeshPhongMaterial({color: c, shininess: 35, specular: '#333333'});
  const plate = new T.Mesh(new T.BoxGeometry(40, .4, 40), phong('#7cc36a')); plate.position.y = -.2; plate.receiveShadow = true; scene.add(plate);
  const palette = ['#e4574a', '#f2b632', '#2f80d1', '#9b59b6', '#1fb5a8', '#ff7aa8'];
  for (let i = 0; i < 12; i++) {            // a ring of coloured posts: parallax for every camera move
    const a = i / 12 * Math.PI * 2, h = 2 + (i % 3) * 1.5, m = new T.Mesh(new T.BoxGeometry(1.2, h, 1.2), phong(palette[i % palette.length]));
    m.position.set(Math.sin(a) * 11, h / 2, Math.cos(a) * 11); m.castShadow = m.receiveShadow = true; scene.add(m);
  }
}
const anchors = world?.anchors ?? {};
// Anchor-relative vectors: {anchor: 'square', offset: [x, y, z]} → world position.
const resolve = v => (v && !Array.isArray(v) && v.anchor) ? anchors[v.anchor].position.map((x, i) => x + (v.offset?.[i] ?? 0)) : v;
for (const s of shots) {
  if (s.anchor && !s.from) { const c = anchors[s.anchor].camera; s.from = {position: c.position, target: c.target, fov: c.fov}; s.move ??= 'push'; }
  for (const k of ['from', 'to']) if (s[k]) s[k] = {...s[k], position: resolve(s[k].position), target: resolve(s[k].target)};
}

// ---- Cast ----
// Legacy entries (no `style`) use the frozen legacy avatar + legacy samplers. `style: 'v2'` entries
// are v2 actors: `preset` names an entry of `castFile` (or the entry itself is the preset); `keys`
// are timed poses (cross-faded), `faces` timed faces, `origin`/`yaw` the mark, and `travel`
// {dir: [x, z], speed} moves the mark at constant speed (e.g. WALK_SPEED for 'walk').
const presets = spec.castFile ? (await (await fetch(new URL('../' + spec.castFile, import.meta.url))).json()).cast : {};
const cast = {};
const troupeData = Object.values(spec.cast ?? {}).some(c => c.troupe) ? await (await fetch(new URL('../' + (spec.troupeFile ?? 'cast/troupe.json'), import.meta.url))).json() : null;   // A4 troupe slots
// Marks (Session 5): `marks: [[t0, {at, offset, yaw, travel}], ...]` re-block an actor over the episode; the
// entry's own at/offset/yaw/travel is the mark before the first key.
const markOf = (c, t) => { const k = keyAt(c.marks, t); return k ? {...k[1], t0: k[0]} : {at: c.at, offset: c.offset, yaw: c.yaw, travel: c.travel, origin: c.origin, t0: 0}; };
for (const [name, c] of Object.entries(spec.cast ?? {})) {
  if (c.at) c.origin = resolve({anchor: c.at, offset: c.offset ?? [0, 0, 0]});
  if (c.style === 'dragon') { const d = buildDragon({scale: c.scale ?? 1, name}); scene.add(d.root); cast[name] = {a: d, c, dragon: true}; continue; }
  if (c.style === 'v2') { if (c.troupe === 'AFK') { c.keys ??= [[0, troupeData.AFK.pose ?? 'walk']]; c.faces ??= [[0, 'neutral']]; }
    const a = buildActor(c.troupe ? resolveTroupe(c, troupeData) : c.town ? townsperson(c.town) : c.preset ? {...presets[c.preset], ...(c.with ?? {})} : c, name); scene.add(a.root); cast[name] = {a, c, v2: true}; }
  else { const a = createBaseAvatar({color: c.color ?? 0xf2c94c}); scene.add(a.root); cast[name] = {a, c}; }
}
if (Object.values(cast).some(x => x.v2)) await loadFont();
for (const s of shots) if (s.fit && s.fit.h === undefined && cast[s.fit.actor]) s.fit.h = 5.3 * cast[s.fit.actor].a.root.scale.y;   // A5 §F: actor height for `fit`
// A5 §E Decision 2: one narrow, soft spotlight per hero (troupe except AFK) for medium/close night shots, aimed from the
// camera side at the chest, shadow-casting (the actor screens the ground behind). Real lights stay ≤ 4 with the world's own.
const NIGHT = ['night', 'nightBright'];
const heroSpots = look?.v3 ? Object.entries(cast).filter(([, x]) => x.v2 && x.c.troupe && x.c.troupe !== 'AFK' && spec.heroSpots !== false).slice(0, 2).map(([name]) => {
  const l = new T.SpotLight('#fff0dc', 0, 16, .2, .55, 1.6); l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -.002; l.name = 'heroSpot_' + name; scene.add(l, l.target); return {name, l}; }) : [];
function aimHeroSpots(shot, camPos) {
  for (const {name, l} of heroSpots) {
    const on = NIGHT.includes(shot?.look ?? spec.look) && ['medium', 'close'].includes(shot?.size) && cast[name].a.root.visible, m = markPos[name];
    l.intensity = on ? (spec.heroSpotIntensity ?? 40) : 0; if (!on || !m) continue;
    const H = 5.3 * cast[name].a.root.scale.y, chest = new T.Vector3(m[0], m[1] + .62 * H, m[2]), dir = new T.Vector3(camPos[0] - m[0], 0, camPos[2] - m[2]).normalize();
    l.position.copy(chest).addScaledVector(dir, 8).add(new T.Vector3(0, 2.2, 0)); l.target.position.copy(chest); l.target.updateMatrixWorld();
  }
}
// A4 night "actor lift" (opt-in spec.actorLift, v3 looks only): plastic avatars get a small self-light (emissive = their
// own colour / texture × k) so they stay the highest-contrast thing in a dark frame. Faces (MeshBasic) are untouched.
const usesNightBright = spec.look === 'nightBright' || (spec.shots ?? []).some(s => s.look === 'nightBright');
// A5: the lift follows each shot: full under night looks (or spec.actorLift everywhere when given), off in daylight shots
const liftMats = [];
if (look?.v3 && (spec.actorLift ?? (usesNightBright ? .5 : 0))) {   // A5 §E: on by default under nightBright
  const k = spec.actorLift ?? .5, seen = new Set();
  for (const {a, v2} of Object.values(cast)) if (v2) a.root.traverse(o => { if (!o.isMesh || seen.has(o.material) || o.material.isMeshBasicMaterial || !o.material.emissive) return; let m = o.material; seen.add(m);
    if (m.map) { m.emissiveMap = m.map; m.emissive.setRGB(k, k, k); } else if (m.vertexColors) { if (!o.geometry.attributes.color) return; const c = o.geometry.attributes.color, avg = [0, 0, 0]; for (let i = 0; i < c.count; i++) { avg[0] += c.getX(i); avg[1] += c.getY(i); avg[2] += c.getZ(i); } m = m.clone(); m.emissive.setRGB(...avg.map(v => v / c.count * k)); o.material = m; seen.add(m); }   // hair lifts by its own colour
    else m.emissive.copy(m.color).multiplyScalar(k);
    m.needsUpdate = true; liftMats.push([m, m.emissive.clone()]); });
}
const applyLift = shot => { const f = spec.actorLift !== undefined ? 1 : ['night', 'nightBright'].includes(shot?.look ?? spec.look) ? 1 : 0; for (const [m, e] of liftMats) m.emissive.copy(e).multiplyScalar(f); };

const markPos = {};
// Where an actor's mark is at time t (pure: no posing). poseCast and A4 trails share it.
function markAt(c, t) {
  const m = markOf(c, t), o = m.at ? resolve({anchor: m.at, offset: m.offset ?? [0, 0, 0]}) : (m.origin ?? [0, 0, 0]), tr = m.travel, d = tr ? tr.speed * Math.max(0, t - m.t0 - (tr.delay ?? 0)) : 0;
  const dd = tr?.max !== undefined ? Math.min(d, tr.max) : d;
  const at = tr ? [o[0] + tr.dir[0] * dd, o[1], o[2] + tr.dir[1] * dd] : [...o];
  if (world?.groundY && m.at !== undefined) at[1] = world.groundY(at[0], at[2]) + (m.offset?.[1] ?? 0);   // feet on the terrain (A1)
  if (tr?.climb) at[1] += tr.climb * dd / Math.max(1e-6, tr.speed);
  return at;
}
function poseCast(t) {
  const out = {};
  for (const [name, {a, c, v2, dragon}] of Object.entries(cast)) {
    const m = markOf(c, t), yaw = (m.yaw ?? 0) * Math.PI / 180;
    if (v2 || dragon) {
      const at = markAt(c, t);
      markPos[name] = [...at];
      if (dragon) driveDragon(a, t, {keys: c.keys ?? [[0, 'perch']], origin: {position: at, yaw}});
      else driveActor(a, t, {keys: c.keys ?? [[0, c.action ?? 'idle']], faces: c.faces, ambient: !!c.ambient,
        origin: {position: at, yaw}, tags: c.tags, fps: FPS, tools: c.tools, toolsLeft: c.toolsLeft, stat: c.stat, bubble: c.bubble, visible: c.visible, kit: c.kit});
      if (dragon && c.visible) a.root.visible = valueAt(c.visible, t, true);
    } else {
      const s = sampleAction(c.action ?? 'idle', t, c.action === 'walk' ? {gait: c.gait ?? 'readable'} : {});
      applyActionSample(a, s, {position: c.origin ?? [0, 0, 0], yaw});
    }
    // follow cameras ride the actor's mark (path), not the posed root: strain shakes and walk bobs never jolt the camera
    out[name] = (v2 || dragon) ? markPos[name] : a.root.position.toArray();
  }
  return out;
}

// ---- Effects (§5.3): targets are cast names ("knight1", "knight1.tool") or world object names; points
// are [x,y,z], {anchor, offset} or {actor, offset} (follows the actor). ----
const resolveTarget = tg => {
  if (typeof tg !== 'string') return null;
  const [who, part] = tg.split('.'), a = cast[who]?.a;
  if (a && part?.startsWith('tool:')) return toolGroup(a, part.slice(5), 'right');   // "nobody.tool:hammer" (cached, even before it is held)
  if (a) return part ? (a[part] ?? a.attachments?.[part] ?? a.parts?.[part] ?? a.pivots?.[part]) : a.root;
  return scene.getObjectByName(tg);
};
const resolvePoint = (p, t) => {
  if (Array.isArray(p)) return p;
  if (p?.actor && p.part) { const o = cast[p.actor].a[p.part]; o.updateWorldMatrix(true, false); const v = new T.Vector3(...(p.offset ?? [0, 0, 0])); o.localToWorld(v); return v.toArray(); }
  if (p?.actor) { const r = cast[p.actor].a.root.position; return [r.x + (p.offset?.[0] ?? 0), r.y + (p.offset?.[1] ?? 0), r.z + (p.offset?.[2] ?? 0)]; }
  return resolve({anchor: p.anchor, offset: p.offset ?? [0, 0, 0]});
};
const effects = createEffects([...(spec.effects ?? []), ...revealEffects], {scene, renderer, resolveTarget, resolvePoint,
  shotAt: tt => Math.max(0, shots.findLastIndex(s => Math.max(0, Math.round(tt * FPS)) >= s.start)),
  actorOf: name => { const a = cast[name]?.a; if (!a) throw Error('effect: unknown actor ' + name); return a; }, toolGroup: (a, name) => toolGroup(a, name, 'right'),
  actorAt: (name, tt) => { const c = cast[name]?.c; if (!c) throw Error('trail: unknown actor ' + name); return markAt(c, tt); }, groundY: world?.groundY});

// A4: instanced crowds (spec.crowds) and rule UI attached to any pivot/object (spec.ui).
const crowds = createCrowds(scene, spec.crowds ?? [], {groundY: world?.groundY ?? (() => 0), resolveCentre: c => Array.isArray(c) ? c : (p => [p[0], p[2]])(resolve(c))});
const ui = createRuleUI(spec.ui ?? [], {scene, resolveTarget, fps: FPS});
const updateExtras = (t, ctx = {}) => { crowds.update(t, ctx); ui.update(t); };   // ctx {camPos, size}: crowd promotion (A5 B)

// Triangles of visible meshes whose bounds touch the camera frustum (the brief's §5.4 budget). The
// renderer's own counter also includes the shadow pass, so both are reported.
const frustum = new T.Frustum(), pv = new T.Matrix4(), sphere = new T.Sphere();
// Debug (A4 budget work): frustum triangles per top-level object name.
function breakdown() {
  pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv); const out = {};
  scene.traverseVisible(o => { if (!o.isMesh) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); if (o.isInstancedMesh && !o.boundingSphere) o.computeBoundingSphere(); sphere.copy(o.isInstancedMesh && o.frustumCulled ? o.boundingSphere : g.boundingSphere).applyMatrix4(o.matrixWorld); if (o.frustumCulled && !frustum.intersectsSphere(sphere)) return;
    let top = o; while (top.parent && top.parent !== scene) top = top.parent; const k = (top.name || o.name || o.type).split('_')[0]; out[k] = (out[k] ?? 0) + (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); });
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1]));
}
function frustumTriangles() {
  pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
  let n = 0;
  scene.traverseVisible(o => {
    if (!o.isMesh) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    if (o.isInstancedMesh && !o.boundingSphere) o.computeBoundingSphere();
    sphere.copy(o.isInstancedMesh && o.frustumCulled ? o.boundingSphere : g.boundingSphere).applyMatrix4(o.matrixWorld); if (o.frustumCulled && !frustum.intersectsSphere(sphere)) return;   // A4: instanced meshes cull by their instances' bounds, as the renderer does
    n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
  });
  return n;
}

// Stable shadows (A1): the sun's shadow box is fitted ONCE per shot — centre = midpoint of the shot's target
// path, radius = shadowRadius + half the path length — and snapped to whole shadow texels in look.frameFixed.
const shadowFit = new Map();
function shotShadow(shot) {
  if (shadowFit.has(shot.id)) return shadowFit.get(shot.id);
  const pts = [0, .25, .5, .75, 1].map(u => { const tt = (shot.start + u * (shot.frames - 1)) / FPS; return sampleCamera({...shot, fps: FPS, openHit: false}, u * (shot.frames - 1) / FPS, poseCast(tt)).target; });
  const lo = [0, 1, 2].map(i => Math.min(...pts.map(p => p[i]))), hi = [0, 1, 2].map(i => Math.max(...pts.map(p => p[i])));
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(...pts[i].map((v, k) => v - pts[i - 1][k]));
  const fit = {centre: new T.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2), radius: (shot.shadowRadius ?? 34) + len / 2};
  shadowFit.set(shot.id, fit); return fit;
}

// World story state (Session 5): spec.worldState = {name: [[t, value], [t, value, 'ramp']...]} → world.setState.
function applyWorldState(shot, t) {
  if (!world) return;
  const ws = spec.worldState ?? {};
  if (!ws.cracks) world.setCracks?.(shot?.stoneCracks ?? spec.stoneCracks ?? 1);   // the clue grows (script lines 14–15)
  if (world.setState) for (const [k, keys] of Object.entries(ws)) world.setState(k, valueAt(keys, t));
}

let lastSize = '';
// nudge (world units, along the camera's right+up+back diagonal): the stability test renders each view twice,
// 4 mm apart. A purely sideways move hides ground-plane z-fighting; changing the view angle exposes it.
export function renderFrame(n, width = 720, height = 1280, nudge = 0) {
  if (!Number.isInteger(n) || n < 0 || n >= FRAMES) throw Error(`frame out of range: ${n}`);
  const t0 = performance.now();
  if (lastSize !== `${width}x${height}`) { renderer.setPixelRatio(1); renderer.setSize(width, height, false); lastSize = `${width}x${height}`; }
  const shot = shots.findLast(s => n >= s.start), t = n / FPS;
  const actors = poseCast(t);
  const c = sampleCamera({...shot, fps: FPS}, (n - shot.start) / FPS, actors);
  world?.update(t); applyWorldState(shot, t); updateExtras(t, {camPos: c.position, size: shot.size}); aimHeroSpots(shot, c.position); applyLift(shot);
  const fx = effects.apply(t, camera);   // poses effect targets; returns the shake offset and any timeOfDay blend
  const pos = c.position.map((v, i) => v + fx.camOffset[i]), tgt = c.target.map((v, i) => v + fx.camOffset[i] * .6);
  camera.fov = c.fov; camera.aspect = width / height; camera.position.fromArray(pos);
  camera.up.set(0, 1, 0); camera.lookAt(...tgt); camera.rotateZ(c.roll); camera.updateProjectionMatrix();
  if (nudge) { const k = nudge / Math.sqrt(3); camera.translateX(k); camera.translateY(k); camera.translateZ(k); }
  if (look) { fx.look ? look.apply(...fx.look) : look.apply(shot.look ?? spec.look ?? 'day'); const sf = shotShadow(shot); poseCast(t); look.frameFixed(sf.centre, sf.radius, camera.position); look.update(t); }
  scene.updateMatrixWorld(true); effects.apply(t, camera); fitTags(scene, camera, {maxFrac: shot.tagMaxFrac ?? .06});
  if (spec.readableUi ?? !!look?.v3) { scene.updateMatrixWorld(true); enforceReadable(scene, camera, {focus: shot.focusUi ?? []}); }   // A5 §C: min text size + safe area (v3 worlds; "Nobody" untouched)
  renderer.info.autoReset = false; renderer.info.reset();   // A4: overlay passes (weather, cards) must not reset the scene counts
  renderer.render(scene, camera); effects.overlay(t, camera, width / height);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));   // forces the GPU work to finish, so ms is real
  if (gl.isContextLost()) throw Error('WebGL context lost');
  return {frame: n, shot: shot.id, size: shot.size, triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}

// Bench / stills: render a world anchor's establishing camera at time t (no shot needed).
export function renderAnchor(name, t, width = 720, height = 1280, lookName = 'day') {
  const a = anchors[name]; if (!a?.camera) throw Error('no camera on anchor ' + name);
  return {anchor: name, ...renderCamera(a.camera, t, width, height, lookName)};
}
export const renderAnchorNudged = (name, t, width, height, nudge) => renderCamera(anchors[name].camera, t, width, height, 'day', nudge);
// Any camera {position, target, fov, up?} at time t (lookdev, layout maps, bench).
export function renderCamera(cam, t = 0, width = 720, height = 1280, lookName = 'day', nudge = 0) {
  const t0 = performance.now(); renderer.setPixelRatio(1); renderer.setSize(width, height, false); lastSize = '';
  poseCast(t); camera.fov = cam.fov ?? 45; camera.aspect = width / height; camera.position.set(...cam.position); camera.up.set(...(cam.up ?? [0, 1, 0])); camera.lookAt(...cam.target); camera.updateProjectionMatrix();
  if (look) { look.apply(lookName); look.frame(new T.Vector3(...cam.target), camera.position.clone(), cam.shadowRadius ?? 34); look.update(t); }
  if (nudge) { const k = nudge / Math.sqrt(3); camera.translateX(k); camera.translateY(k); camera.translateZ(k); }
  world?.update(t); applyWorldState(null, t); updateExtras(t); scene.updateMatrixWorld(true); fitTags(scene, camera); renderer.render(scene, camera);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}

// Plan inspection (scripts/v2/plan.js): camera and projected heads at frame n, without rendering.
const headOf = ({a, v2, dragon}) => { const v = new T.Vector3(); if (dragon) { const w = new T.Vector3(); a.eyes[0].getWorldPosition(v); a.eyes[1].getWorldPosition(w); v.add(w).multiplyScalar(.5); } else if (v2) { a.pivots.head.getWorldPosition(v); v.y += .6 * a.root.scale.y; } else v.copy(a.root.position).add(new T.Vector3(0, 4.6, 0)); return v; };
export function inspectFrame(n, width = 540, height = 960) {
  const shot = shots.findLast(s => n >= s.start), t = n / FPS, actors = poseCast(t);
  const c = sampleCamera({...shot, fps: FPS}, (n - shot.start) / FPS, actors);
  applyWorldState(shot, t); updateExtras(t); effects.apply(t, camera);
  camera.fov = c.fov; camera.aspect = width / height; camera.position.fromArray(c.position); camera.up.set(0, 1, 0); camera.lookAt(...c.target); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const heads = {};
  for (const [name, e] of Object.entries(cast)) {
    if (!e.a.root.visible) continue;
    const h = headOf(e), dist = h.distanceTo(camera.position), p = h.clone().project(camera), r = e.a.root.position;
    heads[name] = {x: (p.x + 1) / 2, y: (1 - p.y) / 2, inFront: p.z < 1, dist: +dist.toFixed(2), rootDist: +camera.position.distanceTo(r).toFixed(2)};
  }
  const cards = effects.cards(t, camera, width / height).map(k => ({cls: k.cls, kind: k.kind, rect: k.rect, landed: k.state.landed, fly: k.state.fly}));   // A3
  return {frame: n, shot: shot.id, camera: {position: c.position, target: c.target, fov: c.fov}, heads, cards};
}
// A5 gates: after renderFrame(n), projected boxes (frame fractions, y down) of visible v2 actors' meshes (no tags/sprites)
// and their framing spans (feet, shoulders at 0.6 H, top at 1.02 H, projected at the actor's mark).
export function measureFrame() {
  const out = {}; camera.updateMatrixWorld(true); const v = new T.Vector3(), b = new T.Box3(), mb = new T.Box3();
  for (const [name, {a, c, v2}] of Object.entries(cast)) {
    if (!v2 || !a.root.visible) continue; b.makeEmpty();
    a.root.traverseVisible(o => { if (!o.isMesh || o.isSprite) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); mb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); b.union(mb); });
    if (b.isEmpty()) continue; let x0 = 1, x1 = 0, y0 = 1, y1 = 0, front = false;
    for (let i = 0; i < 8; i++) { v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); if (v.z < 1) front = true; const x = (v.x + 1) / 2, y = (1 - v.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const H = 5.3 * a.root.scale.y, m = markPos[name] ?? a.root.position.toArray(), py = h => (1 - v.set(m[0], m[1] + h, m[2]).project(camera).y) / 2;
    out[name] = {front, box: {x0, x1, y0, y1}, feet: py(0), shoulder: py(.6 * H), top: py(1.02 * H), troupe: c.troupe ?? null};
  }
  return out;
}
// A5 Decision 2: silhouette mask of one actor (actor-only pass, same camera, after renderFrame): Uint8 array, row 0 = top.
const maskMat = new T.MeshBasicMaterial({color: '#ffffff'});
export function actorMask(name, w, h) {
  const keep = cast[name].a.root, vis = []; scene.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible) { let p = o, inActor = false; while (p) { if (p === keep) { inActor = true; break; } p = p.parent; } if (!inActor || o.isSprite) { vis.push(o); o.visible = false; } } });
  const bg = scene.background, fog = scene.fog; scene.background = new T.Color('#000000'); scene.fog = null; scene.overrideMaterial = maskMat;
  renderer.render(scene, camera);
  const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; for (const o of vis) o.visible = true;
  const m = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = px[((h - 1 - y) * w + x) * 4] > 127 ? 1 : 0;
  return m;
}
export function shotSpeed(i) { const s = shots[i]; return maxTargetSpeed({...s, fps: FPS, openHit: false}, tt => poseCast(s.start / FPS + tt), FPS); }

window.__episode = {debug: {scene, renderer}, breakdown, measureFrame, actorMask, inspectFrame, shotSpeed, END: FRAMES / FPS, anchors: Object.fromEntries(Object.entries(anchors).filter(([, a]) => a.camera).map(([k]) => [k, true])), renderAnchor, renderAnchorNudged, renderCamera, FPS, FRAMES, shots: shots.map(({id, start, frames, size, move, loc, subject, see, openHit, at, why, captionY, fit, spectacle, look: lk}) => ({id, start, frames, size, move, loc, subject, see, openHit: !!openHit, at, why, captionY, fit, spectacle: !!spectacle, look: lk})), renderFrame};
