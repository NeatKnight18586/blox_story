// Episode runner: production/episode/?ep=<story>. Loads stories/<story>/episode.js
// (sets, cast and a list of word-anchored shots), lays shots onto the narration
// words, and renders any frame as a pure function of its index.
// Exposes window.__sequence (renderFrame, FPS, FRAMES, CUTS, SHOTS, keys) and window.__lint.
import * as T from 'three';
import {createWorld} from '../../studio/director/world.js';
import {cameraAt, applyCamera, toScreen, eyesOf, SIZES, CAPTION_BAND, SAFE} from '../../studio/director/camera.js';
import {spokenText, estimateTimings, layoutShots, findPhrase} from '../../studio/director/timing.js';

const FPS = 30;
const ep = new URLSearchParams(location.search).get('ep');
if (!/^[a-z0-9_-]+$/.test(ep ?? '')) throw Error('missing ?ep=');
const base = new URL(`../../stories/${ep}/`, import.meta.url);
const md = await (await fetch(new URL('SCRIPT.md', base))).text();
const wt = await fetch(new URL('word-timings.json', base));
const words = wt.ok ? await wt.json() : estimateTimings(spokenText(md));
const timingSource = wt.ok ? 'aligned' : 'estimated';

const W = createWorld();
const E = await import(new URL('episode.js', base).href);
if (E.sun) W.sunDir = E.sun;
const X = await E.build(W);                 // {cast, reset(), ambient(T, camPos, frameInfo)}
W.finish(E.look ?? {});   // episode-level look options (e.g. {ao: {...}})
const WILD = []; W.scene.traverse(o => { if (o.userData.wild) WILD.push(o); });
const SHOTS = E.shots;
const ranges = layoutShots(SHOTS, words, {fps: FPS, tail: E.tail ?? 1.6});
const FRAMES = ranges.total;
const CUTS = ranges.map(r => r.start).concat(FRAMES);

// Per-shot word clock: c.at('phrase') → seconds into the shot when that phrase starts.
function wordClock(n) {
  const r = ranges[n], from = Math.max(0, (SHOTS[n].wordIndex ?? 0) - 2);
  const cache = new Map();
  return (phrase, d = 0) => {
    if (!cache.has(phrase)) cache.set(phrase, words[findPhrase(words, phrase, from)].start - r.start / FPS);
    return cache.get(phrase) + d;
  };
}
const clocks = SHOTS.map((_, n) => wordClock(n));
const resolve = spec => ({...spec, subjects: [].concat(spec.on ?? []).map(s => typeof s === 'string' ? (X.cast[s] ?? X.points?.[s]?.() ?? (() => { throw Error('unknown subject ' + s); })()) : s)});

let lastSize = '';
function stage(f) {
  const n = ranges.findIndex(r => f >= r.start && f < r.end), r = ranges[n], s = SHOTS[n];
  const dur = (r.end - r.start) / FPS, t = (f - r.start) / FPS, u = (f - r.start) / Math.max(1, r.end - r.start - 1);
  const c = {t, u, dur, T: f / FPS, at: clocks[n], f, shot: s.id};
  X.reset(); W.mood('day');
  const out = s.stage?.(c, X) ?? {};
  X.settle?.(c);                              // secondary motion after posing (hair locks)
  W.mood(out.mood ?? s.mood ?? 'day', {flashAmt: out.flash ?? 0});
  if (out.lamp) { W.lamp.position.copy(out.lamp[0]); W.lamp.intensity = out.lamp[1]; }
  const camSpec = resolve(typeof s.cam === 'function' ? s.cam(c, X) : {...s.cam, ...(out.cam ?? {})});
  if (out.light) W.lightAt(out.light, out.lightDir); else if (camSpec.subjects[0]) W.lightAt((camSpec.subjects[0].root?.position ?? camSpec.subjects[0]).clone().setY(0), out.lightDir);
  const cam = cameraAt(camSpec, u, t, W.camera.aspect, n + 1);
  applyCamera(W.camera, cam);
  for (const o of WILD) { const n = new T.Vector3(...o.userData.wild).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())); o.visible = W.camera.position.clone().sub(o.getWorldPosition(new T.Vector3())).dot(n) > 1.2; }   // hide a wall the camera is behind or hugging
  X.ambient?.(c.T, W.camera.position, out, W.camera);
  const close = out.close ?? (SIZES[camSpec.size]?.h <= SIZES.MS.h);
  const focus = out.focus ?? (close && camSpec.subjects[0] ? (camSpec.subjects[0].root ? eyesOf(camSpec.subjects[0]) : camSpec.subjects[0]) : null);
  return {n, s, camSpec, focus, close};
}

export function renderFrame(f, width = 1080) {
  if (!Number.isInteger(f) || f < 0 || f >= FRAMES) throw Error('frame out of range');
  const t0 = performance.now(), height = Math.round(width * 16 / 9);
  if (lastSize !== `${width}x${height}`) { W.renderer.setSize(width, height); W.camera.aspect = width / height; lastSize = `${width}x${height}`; }
  const {s, focus, close} = stage(f);
  W.camera.updateProjectionMatrix(); W.scene.updateMatrixWorld(true);
  W.look.render(focus, close);
  const gl = W.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {frame: f, shot: s.id, width, height, ms: performance.now() - t0};
}

// Lint: framing facts for a frame, no pixels needed.
const ray = new T.Raycaster();
function rootOf(o) { while (o.parent && o.parent.type !== 'Scene') o = o.parent; return o; }
// Really visible: every ancestor visible, not a camera overlay, not rain/cloud, not fully transparent.
const BODY = new Set(['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'face_decal', 'hair', 'hair_lock', 'cardigan_body', 'cardigan_sleeve', 'loose_shoe', 'cuff', 'sole']);
function solid(o) {
  if (['rain', 'tint'].includes(o.name) || o.name.startsWith('cloud') || (o.material?.transparent && o.material.opacity < .5)) return false;
  for (let p = o; p; p = p.parent) { if (!p.visible || p.isCamera) return false; }
  return true;
}
export function lint(f) {
  const {s, camSpec} = stage(f); W.camera.updateProjectionMatrix(); W.scene.updateMatrixWorld(true);
  const cam = W.camera.position.clone(), faces = [];
  for (const a of camSpec.subjects.filter(x => x.root)) {
    const e = eyesOf(a), p = toScreen(W.camera, e);
    ray.set(cam, e.clone().sub(cam).normalize()); ray.far = cam.distanceTo(e);
    const hit = ray.intersectObjects(W.scene.children, true).find(h => solid(h.object) && h.distance < ray.far - .7 * a.root.scale.y);
    const blocker = hit && rootOf(hit.object) !== a.root ? (hit.object.name || 'mesh') : null;
    faces.push({who: a.root.name, x: +p.x.toFixed(3), y: +p.y.toFixed(3), front: p.front, inCaptionBand: p.y > CAPTION_BAND[0] && p.y < CAPTION_BAND[1],
      outsideSafe: p.x < SAFE.x[0] || p.x > SAFE.x[1] || p.y < SAFE.y[0] || p.y > SAFE.y[1], occludedBy: blocker});
  }
  // Camera inside or touching geometry: anything within 0.3 units in six directions.
  let clipping = null;
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    ray.set(cam, new T.Vector3(...d)); ray.far = .3;
    const h = ray.intersectObjects(W.scene.children, true).find(h => solid(h.object));
    if (h) { clipping = h.object.name; break; }
  }
  // Harsher checks: cropped sign text, heads cut by the frame edge, unreadably small subjects.
  const issues = [], corners = b => [0, 1, 2, 3, 4, 5, 6, 7].map(i => new T.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  // Oriented box: the mesh's own bounds carried by its world matrix (no inflated world AABB).
  const obb = o => { o.geometry.boundingBox ?? o.geometry.computeBoundingBox(); return corners(o.geometry.boundingBox).map(p => p.applyMatrix4(o.matrixWorld)); };
  const onScreen = p => p.front && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
  W.scene.traverse(o => {
    if (!o.isMesh || !/^(sign_face|sign_board|hall_sign|podium_label|board)$/.test(o.name) || !solid(o)) return;   // story text, not background shop signs
    const pts = obb(o).map(p => toScreen(W.camera, p)), inn = pts.filter(onScreen).length;
    if (inn >= 2 && inn < 8 && pts.every(p => p.front)) {
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y), w = Math.max(...xs) - Math.min(...xs);
      if (w > .3) issues.push(`text cropped: ${o.name}`);
    }
  });
  const subjects = new Set(camSpec.subjects.filter(x => x.root).map(a => a.root));
  W.scene.traverse(o => {
    if (o.name !== 'head' || !o.isMesh || !solid(o)) return;
    let r = o; while (r.parent && r.parent.type !== 'Scene') r = r.parent;
    const pts = obb(o).map(p => toScreen(W.camera, p));
    if (!pts.every(p => p.front)) return;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2, h = Math.max(...ys) - Math.min(...ys);
    const centreIn = cx > 0 && cx < 1 && cy > 0 && cy < 1, crosses = Math.min(...xs) < 0 || Math.max(...xs) > 1 || Math.min(...ys) < 0 || Math.max(...ys) > 1;
    if (centreIn && crosses && camSpec.size !== 'ECU' && (subjects.has(r) || h > .05)) issues.push(`head cut by frame: ${r.name}`);
    if (subjects.has(r) && centreIn && h < .022 && !['WS', 'EWS'].includes(camSpec.size)) issues.push(`subject too small: ${r.name}`);
  });
  // Anything solid between the lens and a point subject, or across a subject's body (poles, posts).
  const blockedBy = (p, self) => { ray.set(cam, p.clone().sub(cam).normalize()); ray.far = cam.distanceTo(p) - .4; const h = ray.intersectObjects(W.scene.children, true).find(h => solid(h.object) && !BODY.has(h.object.name) && (!self || rootOf(h.object) !== self)); return h?.object.name; };   // other characters overlapping in a group shot are fine; props and set pieces are not
  for (const sub of camSpec.subjects) {
    if (sub.isVector3) { const b = blockedBy(sub); if (b) issues.push(`view blocked by ${b}`); }
    else { sub.root.updateMatrixWorld(true); const b = blockedBy(sub.root.localToWorld(new T.Vector3(0, 3, .3)), sub.root); if (b) issues.push(`${sub.root.name} body blocked by ${b}`); }
  }
  return {frame: f, shot: s.id, faces, clipping, issues, cam: cam.toArray().map(v => +v.toFixed(2))};
}

// Audit (harsh QA, no pixels): physical glitches a viewer notices that framing lint can't see.
//  • hair over face: a hair mesh of the same character is the first thing the lens hits on an eye/mouth point
//  • penetration: a limb's core passes through another body or a prop
//  • feet: lowest foot floats above, or sinks into, the surface below it
// Also returns per-avatar pose samples so scripts/episode-audit.js can find pops between frames.
const _m = new T.Matrix4(), _p = new T.Vector3(), _bb = new T.Box3();
const LIMBS = ['torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
let auditProps = null;
export function audit(f) {
  const {s, camSpec} = stage(f); W.camera.updateProjectionMatrix(); W.scene.updateMatrixWorld(true);
  const cam = W.camera.position.clone(), issues = [], avatars = [];
  const people = [];
  W.scene.traverse(o => { if (o.isObject3D && o.parent?.type === 'Scene' && o.getObjectByName?.('torso') && o.getObjectByName('head')) people.push(o); });
  auditProps ??= (() => { const l = []; W.scene.traverse(o => { if (o.isMesh && !BODY.has(o.name) && !o.name.startsWith('hair') && !/^(land|sea|hill|mountain|cloud|cloud_clump|rain|tint|studio_sky_gradient|hill_tree|crack|road_cracks)$/.test(o.name) && !o.userData.wild) { o.geometry.boundingBox ?? o.geometry.computeBoundingBox(); l.push(o); } }); return l; })();
  const vis = people.filter(r => solid(r) && r.visible);
  const inside = (o, p, shrink = .06) => { _m.copy(o.matrixWorld).invert(); _p.copy(p).applyMatrix4(_m); _bb.copy(o.geometry.boundingBox).expandByScalar(-shrink); return _bb.containsPoint(_p); };
  for (const r of vis) {
    const sc = r.scale.y, parts = Object.fromEntries(LIMBS.map(n => [n, r.getObjectByName(n)]));
    const info = {who: r.name, pos: r.position.toArray().map(v => +v.toFixed(3)), q: {}};
    r.traverse(o => { if (o.isGroup && /Shoulder|Hip|^head$/.test(o.name)) info.q[o.name] = o.quaternion.toArray().map(v => +v.toFixed(4)); });
    avatars.push(info);
    // Hair over face (only when the face points at the lens and is a meaningful size on screen).
    const head = r.getObjectByName('head'), hp = head.parent;
    const fwd = new T.Vector3(0, 0, 1).applyQuaternion(hp.getWorldQuaternion(new T.Quaternion())), toCam = cam.clone().sub(hp.getWorldPosition(new T.Vector3())).normalize();
    const hs = toScreen(W.camera, hp.localToWorld(new T.Vector3(0, .55, 0))), size = toScreen(W.camera, hp.localToWorld(new T.Vector3(0, 1.1, 0)));
    if (fwd.dot(toCam) > .25 && hs.front && hs.x > 0 && hs.x < 1 && hs.y > 0 && hs.y < 1 && Math.abs(size.y - hs.y) > .025) {
      let covered = 0;
      for (const lp of [[-.18, .66, .58], [.18, .66, .58], [0, .4, .58]]) {
        const p = hp.localToWorld(new T.Vector3(...lp)); ray.set(cam, p.clone().sub(cam).normalize()); ray.far = cam.distanceTo(p) + .05;
        const h = ray.intersectObjects([r], true).find(h => solid(h.object));
        if (h && h.object.name.startsWith('hair') && h.distance < ray.far - .12 * sc) covered++;
      }
      if (covered >= 1) issues.push(`hair over face: ${r.name} (${covered}/3)`);
    }
    // Limb cores through other people or props (not for someone lying in bed under the covers).
    if (Math.abs(r.rotation.x) > 1 || Math.abs(r.rotation.z) > 1) continue;
    const core = [];
    for (const n of LIMBS) { const o = parts[n]; if (!o) continue; o.geometry.boundingBox ?? o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; for (const k of [.15, .5, .85]) core.push([n, o.localToWorld(new T.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * k, (b.min.z + b.max.z) / 2))]); }
    for (const other of vis) if (other !== r) for (const n of LIMBS) { const o = other.getObjectByName(n); if (!o) continue; o.geometry.boundingBox ?? o.geometry.computeBoundingBox(); for (const [ln, p] of core) if (inside(o, p, .04 * other.scale.y)) { issues.push(`body through body: ${r.name}.${ln} in ${other.name}.${n}`); break; } }
    const near = auditProps.filter(o => solid(o) && o.getWorldPosition(_p).distanceTo(r.position) < 12 * Math.max(.5, sc));
    for (const o of near) for (const [ln, p] of core) if (inside(o, p, .05)) { issues.push(`body through prop: ${r.name}.${ln} in ${o.name}`); break; }
    // Feet against the surface below.
    let low = Infinity; for (const n of ['leftLeg', 'rightLeg']) { const o = parts[n]; const b = o.geometry.boundingBox; for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) low = Math.min(low, o.localToWorld(new T.Vector3(x, b.min.y, z)).y); }
    const foot = parts.leftLeg.localToWorld(new T.Vector3(0, -1, 0)).add(parts.rightLeg.localToWorld(new T.Vector3(0, -1, 0))).multiplyScalar(.5);
    ray.set(foot.clone().setY(low + .35 * sc), new T.Vector3(0, -1, 0)); ray.far = 6 * sc;   // from just above the feet: desks/tables overhead don't count
    const g = ray.intersectObjects(W.scene.children, true).find(h => solid(h.object) && rootOf(h.object) !== r && !people.includes(rootOf(h.object)));
    const bent = Math.max(Math.abs(r.getObjectByName('leftHip').rotation.x), Math.abs(r.getObjectByName('rightHip').rotation.x)) > .5;   // sitting/kneeling: legs may leave the ground
    if (g) { const gap = low - g.point.y; info.gap = +gap.toFixed(3); if (gap > .2 * sc && !bent) issues.push(`feet floating: ${r.name} ${gap.toFixed(2)}`); if (gap < -.2 * sc) issues.push(`feet sunk: ${r.name} ${(-gap).toFixed(2)} in ${g.object.name}`); }
  }
  return {frame: f, shot: s.id, issues, avatars};
}

// Cache keys: a shot re-renders only when its own spec, stage code or length changes.
const keys = SHOTS.map((s, n) => ({id: s.id, start: ranges[n].start, end: ranges[n].end,
  src: [typeof s.cam === 'function' ? s.cam.toString() : JSON.stringify(s.cam), s.stage?.toString() ?? '', s.mood ?? '', ranges[n].end - ranges[n].start].join('\n')}));
window.__lint = lint; window.__audit = audit; window.__world = W;
window.__sequence = {renderFrame, FPS, FRAMES, CUTS, SHOTS: ranges.map(r => [r.id, r.start, r.end]), keys, timingSource, words: words.length, lintIgnore: Object.fromEntries(SHOTS.filter(s => s.lintIgnore).map(s => [s.id, s.lintIgnore]))};
