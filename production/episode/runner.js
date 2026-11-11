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
const X = await E.build(W);                 // {cast, reset(), ambient(T, camPos, frameInfo)}
W.finish();
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
  W.mood(out.mood ?? s.mood ?? 'day', {flashAmt: out.flash ?? 0});
  if (out.lamp) { W.lamp.position.copy(out.lamp[0]); W.lamp.intensity = out.lamp[1]; }
  const camSpec = resolve(typeof s.cam === 'function' ? s.cam(c, X) : {...s.cam, ...(out.cam ?? {})});
  if (out.light) W.lightAt(out.light); else if (camSpec.subjects[0]) W.lightAt((camSpec.subjects[0].root?.position ?? camSpec.subjects[0]).clone().setY(0));
  const cam = cameraAt(camSpec, u, t, W.camera.aspect, n + 1);
  applyCamera(W.camera, cam);
  for (const o of WILD) { const n = new T.Vector3(...o.userData.wild).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())); o.visible = W.camera.position.clone().sub(o.getWorldPosition(new T.Vector3())).dot(n) > -.25; }
  X.ambient?.(c.T, W.camera.position, out);
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
  return {frame: f, shot: s.id, faces, clipping, cam: cam.toArray().map(v => +v.toFixed(2))};
}

// Cache keys: a shot re-renders only when its own spec, stage code or length changes.
const keys = SHOTS.map((s, n) => ({id: s.id, start: ranges[n].start, end: ranges[n].end,
  src: [typeof s.cam === 'function' ? s.cam.toString() : JSON.stringify(s.cam), s.stage?.toString() ?? '', s.mood ?? '', ranges[n].end - ranges[n].start].join('\n')}));
window.__lint = lint; window.__world = W;
window.__sequence = {renderFrame, FPS, FRAMES, CUTS, SHOTS: ranges.map(r => [r.id, r.start, r.end]), keys, timingSource, words: words.length};
