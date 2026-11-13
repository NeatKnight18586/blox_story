// engine/effects.js — the whole effects budget (docs/V2_BRIEF.md §5.3): fadeColor, flash, ghost, glow,
// particles (sparkle, dust, embers, confetti, fire, stars), melt, squash, shake, timeOfDay.
// (openHit lives in camera.js.) Effects are data: spec.effects = [{type, at, dur, ...}] in episode
// seconds. Every sampler is a pure function of t — no state carries between frames, so any frame
// renders the same in any order. Particles are seeded instanced quads that always face the camera.
import * as T from 'three';
import {cardState, cardRect, CARD} from './classes.js';
import {CLASSES} from '../parts/props.js';
import {classCardCanvas} from './overhead.js';

export const TYPES = ['fadeColor', 'flash', 'ghost', 'glow', 'particles', 'melt', 'squash', 'shake', 'timeOfDay', 'pillar', 'ring', 'halo', 'morph', 'card', 'lightning', 'shockwave', 'weather', 'trail'];   // pillar…card: A3 class reveal; lightning…trail: A4
const clamp01 = x => Math.min(1, Math.max(0, x));
const easeIO = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };

// Progress of effect e at time t: null when inactive, else u ∈ [0, 1]. `hold` keeps the end state.
export function progress(e, t) {
  const dur = Math.max(1e-6, e.dur ?? .5), u = (t - e.at) / dur;
  if (u < 0) return null;
  if (u > 1) return e.hold && t <= e.at + dur + e.hold ? 1 : null;
  return u;
}
export const fadeAlpha = (e, t) => { const u = progress(e, t); if (u === null) return 0; const [a, b] = [e.from ?? 0, e.to ?? 1]; return a + (b - a) * easeIO(u); };
// Flash: snaps up over the first 15 % of its duration, then decays.
export const flashAlpha = (e, t) => { const u = progress(e, t); if (u === null) return 0; const p = e.peak ?? .85; return u < .15 ? p * u / .15 : p * Math.exp(-5 * (u - .15) / .85) * (1 - u); };
// Shake: seeded, damped, ~hz; exactly zero outside its window.
export function shakeOffset(e, t) {
  const u = progress(e, t); if (u === null || u >= 1) return [0, 0, 0];
  const amp = (e.amp ?? .25) * (1 - u) ** 1.5, hz = e.hz ?? 14, s = (e.seed ?? 1) * 1.731, x = (t - e.at) * hz * 2 * Math.PI;
  return [amp * Math.sin(x + s), amp * .7 * Math.sin(x * 1.37 + s * 2), amp * .5 * Math.sin(x * .83 + s * 3)];
}
// Squash: cartoon impact, damped bounce (scale vector).
export function squashScale(e, t) {
  const u = progress(e, t); if (u === null) return [1, 1, 1];
  const k = (e.amount ?? .35) * Math.exp(-5 * u) * Math.cos(u * 18); return [1 + k * .6, 1 - k, 1 + k * .6];
}
export const meltState = (e, t) => { const u = progress(e, t); return u === null ? (t > e.at ? {scaleY: e.min ?? .15, glow: 0} : null) : {scaleY: 1 - (1 - (e.min ?? .15)) * easeIO(u), glow: Math.sin(Math.PI * Math.min(1, u * 1.4)) * 1.2}; };
export const glowLevel = (e, t) => { const u = progress(e, t); if (u === null) return 0; return (e.level ?? 1) * (.6 + .4 * Math.sin((t - e.at) * 2 * Math.PI / (e.period ?? .8))) * Math.min(1, u * 6, (1 - u) * 6 + (e.hold ? 1 : 0)); };

// Particle presets: per-particle seeded params → state at age a (seconds since the burst).
const PRESETS = {
  sparkle: {additive: true, colors: ['#fff6a8', '#ffd84a', '#ffffff'], speed: [2.5, 5], up: 1.5, gravity: -3, life: [.5, 1], size: [.25, .45], tex: 'star'},
  dust: {colors: ['#cdbb9a', '#b8a888', '#e0d4bc'], speed: [.6, 1.6], up: .8, gravity: .2, life: [1, 2.2], size: [.5, 1.1], tex: 'soft', grow: 1.6},
  embers: {additive: true, colors: ['#ff8a1f', '#ffb347', '#ff5a1f'], speed: [.4, 1.2], up: 2.5, gravity: .6, life: [1, 2], size: [.12, .25], tex: 'soft', wobble: 1},
  confetti: {colors: ['#e2483d', '#2f80d1', '#f2c230', '#46a85a', '#ff7aa8'], speed: [3, 6], up: 5, gravity: -6, life: [1.2, 2], size: [.18, .3], tex: 'square', spin: 8},
  fire: {additive: true, colors: ['#ff8a1f', '#ffd84a', '#ff5a1f'], speed: [.3, .9], up: 3.5, gravity: 1, life: [.4, .9], size: [.5, .9], tex: 'soft', shrink: true},
  stars: {additive: true, colors: ['#ffd84a', '#ffffff'], orbit: true, life: [99, 99], size: [.3, .4], tex: 'star', speed: [2.5, 3.5]},   // cartoon dizzy ring
  // A3 class signatures
  steam: {colors: ['#ffffff', '#f3ece0'], speed: [.3, .8], up: 1.6, gravity: .2, life: [1, 1.8], size: [.6, 1.2], tex: 'soft', grow: 1.2},
  flour: {colors: ['#ffffff', '#fff6e0'], speed: [1.5, 3], up: 1, gravity: -2, life: [.6, 1.1], size: [.12, .22], tex: 'square', spin: 6},
  rays: {additive: true, colors: ['#cfe6ff', '#ffffff', '#7ab8ff'], speed: [6, 9], up: 0, gravity: 0, life: [.3, .5], size: [.6, 1.0], tex: 'star'},
  leaves: {colors: ['#3fbf5a', '#7ad04a', '#2e8a3e'], speed: [2, 4], up: 1.5, gravity: -1.5, life: [1, 1.6], size: [.22, .36], tex: 'square', spin: 9, wobble: 1.5},
  petals: {colors: ['#ff9ec7', '#ffd84a', '#ffffff'], speed: [2, 3.5], up: 1.5, gravity: -1.8, life: [1, 1.6], size: [.18, .3], tex: 'soft', spin: 6, wobble: 1},
  goldConfetti: {colors: ['#f2c230', '#ffe27a', '#fff3c0'], speed: [3, 6], up: 5, gravity: -6, life: [1.2, 2], size: [.18, .3], tex: 'square', spin: 8},
  // A4 weather and impact presets. `volume` presets fill a box (e.area = [w, h, d] around the origin) and loop for the
  // effect's whole duration: fall = units/s downward, drift = [x, z] units/s, stretch = streak length factor.
  rain: {volume: true, colors: ['#cfe0ff', '#e8f0ff'], fall: 26, drift: [1.5, 0], size: [.05, .08], stretch: 22, tex: 'soft', alpha: .55},
  snow: {volume: true, colors: ['#ffffff', '#f0f6ff'], fall: 2.2, drift: [.6, .2], size: [.16, .3], tex: 'soft', wobble: 1.2, alpha: .9},
  ash: {volume: true, colors: ['#8a8a8a', '#5f5f5f', '#b0a8a0'], fall: 1.1, drift: [.4, .3], size: [.1, .2], tex: 'square', spin: 2, wobble: 1, alpha: .8},
  sand: {volume: true, colors: ['#e6c98e', '#d4ab72', '#f2dcae'], fall: .3, drift: [9, 1], size: [.08, .16], stretch: 4, tex: 'soft', alpha: .6, horizontal: true},
  fog: {volume: true, colors: ['#ffffff', '#e8eef5'], fall: 0, drift: [.6, .2], size: [6, 11], tex: 'soft', alpha: .18},
  starfall: {volume: true, additive: true, colors: ['#ffffff', '#ffe9a8', '#bfe0ff'], fall: 18, drift: [-9, 0], size: [.12, .2], stretch: 14, tex: 'soft', alpha: .9, sparse: .35},
  mud: {colors: ['#6b4a2e', '#5a3c24', '#7a5a3a'], speed: [2, 4.5], up: 4, gravity: -12, life: [.6, 1], size: [.2, .45], tex: 'soft'},
  splash: {colors: ['#ffffff', '#cfeaff', '#9fd3ff'], speed: [2, 4], up: 6, gravity: -16, life: [.45, .8], size: [.12, .26], tex: 'soft'},
  rockfall: {colors: ['#8f8a84', '#6f6b66', '#a8a29a'], speed: [1, 3], up: 1, gravity: -18, life: [1, 1.6], size: [.5, 1.2], tex: 'square', spin: 4},
};
export const PARTICLES = Object.keys(PRESETS);
const hash = (i, k, s) => { const x = Math.sin(i * 127.1 + k * 311.7 + s * 74.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a, b, w) => a + (b - a) * w;
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const basis = d => { const u1 = norm(cross(d, Math.abs(d[1]) < .9 ? [0, 1, 0] : [1, 0, 0])); return [u1, cross(d, u1)]; };
// A4 looping volume: every particle cycles through the box for the whole effect window (rain, snow, ash, sand, fog, starfall).
function volumeState(e, P, i, t, seed) {
  const color = P.colors[Math.floor(hash(i, 4, seed) * P.colors.length)];
  {
    const [w, h, d] = e.area ?? [40, 24, 40], fall = e.fall ?? P.fall, drift = e.drift ?? P.drift, age = t - e.at, dur = e.dur ?? 4;
    if (age > dur || (P.sparse && hash(i, 9, seed) > P.sparse)) return null;
    const cyc = h / Math.max(.01, fall || 1), ph = hash(i, 8, seed);
    const y = fall ? h / 2 - (((age / cyc + ph) % 1) * h) : (hash(i, 10, seed) - .5) * h;
    const span = (k, len, v) => { const x = hash(i, k, seed) * len + v * age; return ((x % len) + len) % len - len / 2; };
    const wb = P.wobble ? Math.sin(age * 1.7 + i) * .4 * P.wobble : 0;
    const edge = Math.min(1, age / .4, (dur - age) / .4);   // fade in/out at the window edges
    return {pos: [span(11, w, drift[0]) + wb, y, span(12, d, drift[1]) + wb * .5], size: lerp(...P.size, hash(i, 3, seed)) * (e.scale ?? 1), color, alpha: (e.alpha ?? P.alpha ?? 1) * edge, rot: (P.spin ?? 0) * age + i, stretch: P.stretch ?? 1, horizontal: !!P.horizontal};
  }
}
// State of particle i at time t for effect e: {pos: [x,y,z] relative to origin, size, color, alpha} or null.
export function particleState(e, i, t) {
  const P = PRESETS[e.preset ?? 'sparkle']; if (!P) throw Error('unknown particle preset ' + e.preset);
  const seed = e.seed ?? 1, spread = e.spread ?? 1, delay = hash(i, 1, seed) * (e.stagger ?? .15), a = t - e.at - delay;
  const end = e.at + (e.dur ?? 1);
  if (a < 0 || (P.orbit ? t > end : false)) return null;
  if (P.volume) return volumeState(e, P, i, t, seed);
  const life = lerp(...(e.life ?? P.life), hash(i, 2, seed)), k = a / life;
  if (!P.orbit && k > 1) return null;
  const size = lerp(...P.size, hash(i, 3, seed)) * (e.scale ?? 1), color = P.colors[Math.floor(hash(i, 4, seed) * P.colors.length)];
  if (P.orbit) { const n = e.count ?? 5, ang = i / n * Math.PI * 2 + a * lerp(...P.speed, .5); return {pos: [Math.cos(ang) * .9 * spread, .15 * Math.sin(a * 6 + i), Math.sin(ang) * .9 * spread], size, color, alpha: 1}; }
  const th = hash(i, 5, seed) * Math.PI * 2, ph = Math.acos(1 - 2 * hash(i, 6, seed) * .5), v = lerp(...(e.speed ?? P.speed), hash(i, 7, seed)) * spread;
  const up = e.up ?? P.up, grav = e.gravity ?? P.gravity;
  if (e.dir) {   // directed stream (fire breath, a split jet): unit `dir` ± `cone` radians, full speed along it
    const d = norm(e.dir), cone = (e.cone ?? .2) * Math.sqrt(hash(i, 6, seed)), [u1, u2] = basis(d);
    const ca = Math.cos(th) * Math.sin(cone), sa = Math.sin(th) * Math.sin(cone), cc = Math.cos(cone);
    const dir = [0, 1, 2].map(k => d[k] * cc + u1[k] * ca + u2[k] * sa);
    const pos = [dir[0] * v * a, dir[1] * v * a + up * a + .5 * grav * a * a, dir[2] * v * a];
    const s = P.grow ? size * (1 + P.grow * k) : P.shrink ? size * (1 - k * .6) * (e.growAlong ? 1 + e.growAlong * k : 1) : size;
    return {pos, size: Math.max(0, s), color, alpha: 1 - k * k, rot: (P.spin ?? 0) * a + i};
  }
  const dir = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
  const w = P.wobble ? Math.sin(a * 5 + i) * .3 * P.wobble : 0;
  const pos = [dir[0] * v * a + w, dir[1] * v * a * .4 + up * a + .5 * grav * a * a, dir[2] * v * a];
  const s = P.grow ? size * (1 + P.grow * k) : P.shrink ? size * (1 - k) : size * (k < .2 ? k / .2 : 1);
  return {pos, size: Math.max(0, s), color, alpha: 1 - k * k, rot: (P.spin ?? 0) * a + i};
}

// ---- A4 pure helpers -------------------------------------------------------------------------------------
// Branching bolt: main zig-zag from `from` (sky) to `to` (ground) + 2–3 seeded branches. Pure in seed.
export function boltPath(seed, from, to, {segs = 12, jitter = .12, branches = 3} = {}) {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]), main = [];
  for (let k = 0; k <= segs; k++) { const u = k / segs, j = k === 0 || k === segs ? 0 : jitter * L; main.push([lerp(from[0], to[0], u) + (hash(k, 1, seed) - .5) * j, lerp(from[1], to[1], u), lerp(from[2], to[2], u) + (hash(k, 2, seed) - .5) * j]); }
  const out = [main];
  for (let b = 0; b < branches; b++) {
    const k0 = 2 + Math.floor(hash(b, 3, seed) * (segs - 5)), p = main[k0], dir = hash(b, 4, seed) < .5 ? -1 : 1, n = 3 + Math.floor(hash(b, 5, seed) * 3), br = [p];
    for (let k = 1; k <= n; k++) { const q = br[k - 1]; br.push([q[0] + dir * L * .05 * (1 + hash(b * 7 + k, 6, seed)), q[1] - L * .06, q[2] + (hash(b * 7 + k, 7, seed) - .5) * L * .06]); }
    out.push(br);
  }
  return out;
}
// Lightning flicker (pure): on/off per frame in the classic strobe pattern, intensity decays.
export function lightningLevel(e, t, fps = 30) {
  const f = Math.round((t - e.at) * fps), pat = [1, 1, 0, .7, 1, 0, 0, .5, 0, .35]; if (f < 0 || f >= pat.length) return 0; return pat[f] * (e.peak ?? 1);
}
// Shockwave: radius and opacity at t (pure); a second ring follows at 40 % of the first's radius.
export const shockwave = (e, t) => { const u = progress(e, t); if (u === null || u >= 1) return null; return {r: (e.radius ?? 18) * (1 - (1 - u) ** 2.4), alpha: (1 - u) ** 1.3 * .85}; };
// Trail: sample times for a trail of `fade` seconds behind t (pure); alpha 1 at the head → 0 at the tail.
export function trailSamples(e, t, n = 24) {
  if (t < e.at) return []; const end = e.at + (e.dur ?? 3); if (t > end + (e.fade ?? 1.2)) return [];
  const head = Math.min(t, end), tail = Math.max(e.at, t - (e.fade ?? 1.2)), out = [];
  for (let k = 0; k < n; k++) { const tt = head - (head - tail) * k / (n - 1); out.push({t: tt, a: Math.max(0, 1 - (t - tt) / (e.fade ?? 1.2))}); }
  return out;
}

// ---- runtime ----------------------------------------------------------------------------------------
function particleTexture(kind) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  if (kind === 'star') { g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 30, a = i / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); }
  else if (kind === 'square') { g.fillStyle = '#fff'; g.fillRect(14, 20, 36, 24); }
  else { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  if (kind === 'beam') { g.clearRect(0, 0, 64, 64); const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.6, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  if (kind === 'sun') { g.clearRect(0, 0, 64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a - .08) * 31, 32 + Math.sin(a - .08) * 31); g.lineTo(32 + Math.cos(a + .08) * 31, 32 + Math.sin(a + .08) * 31); g.fill(); } }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const outBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };

// ctx: {scene, renderer, look, resolveTarget(spec) → Object3D, resolvePoint(spec, t) → [x,y,z]}
export function createEffects(list = [], ctx) {
  for (const e of list) if (!TYPES.includes(e.type)) throw Error('unknown effect ' + e.type);
  const {scene, renderer} = ctx;
  // Full-screen overlay for fadeColor / flash (drawn after the scene).
  const ovScene = new T.Scene(), ovCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const ovMat = new T.MeshBasicMaterial({transparent: true, depthTest: false, depthWrite: false, toneMapped: false});
  ovScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), ovMat));
  const cardScene = new T.Scene(), cardMat = new T.MeshBasicMaterial({transparent: true, depthTest: false, depthWrite: false, toneMapped: false});
  const cardQuad = new T.Mesh(new T.PlaneGeometry(2, 2), cardMat); cardScene.add(cardQuad);
  // A4 screen-space weather layer (heavy rain / snow / sand): a full-frame procedural shader, pure in t, drawn after the scene.
  const wxScene = new T.Scene(), wxU = {t: {value: 0}, kind: {value: 0}, dens: {value: 1}, asp: {value: 9 / 16}, op: {value: 1}, tint: {value: new T.Color('#dfe8f5')}};
  wxScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({transparent: true, depthTest: false, depthWrite: false, toneMapped: false, uniforms: wxU,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform float t; uniform float kind; uniform float dens; uniform float asp; uniform float op; uniform vec3 tint; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float layer(vec2 uv, float sc, float sp, float len, float th){ vec2 p = uv * vec2(sc * asp, sc / len); p.y += t * sp; vec2 c = floor(p), f = fract(p);
        float r = h(c); if (r > th) return 0.; float x = abs(f.x - .5 - (r - .5) * .6); return smoothstep(.06, 0., x) * smoothstep(0., .25, f.y) * smoothstep(1., .6, f.y); }
      float flakes(vec2 uv, float sc, float sp){ vec2 p = uv * vec2(sc * asp, sc); p.y += t * sp; p.x += sin(t * .8 + floor(p.y) * 1.7) * .3; vec2 c = floor(p), f = fract(p); vec2 o = vec2(h(c), h(c + 7.)) * .6 + .2; return smoothstep(.12, .02, length(f - o)) * step(h(c + 3.), .55 * dens); }
      void main(){ float a = 0.; vec2 uv = vUv;
        if (kind < .5) { uv.x += uv.y * .12; a = layer(uv, 70., 2.6, 6., .35 * dens) * .55 + layer(uv + .3, 40., 1.9, 5., .25 * dens) * .35; }
        else if (kind < 1.5) { a = flakes(uv, 14., .22) * .9 + flakes(uv + .5, 26., .14) * .6 + flakes(uv + .2, 44., .09) * .4; }
        else { vec2 q = vec2(uv.y, uv.x); q.y -= t * .9; a = layer(vec2(q.x, q.y), 90., 0., 8., .3 * dens) * .45; a += .12 * dens * (.6 + .4 * sin(uv.y * 8. + t)); }
        gl_FragColor = vec4(tint, clamp(a * op, 0., 1.)); }`})));
  const weatherQuad = (e, t, aspect) => { const u = progress(e, t); wxU.t.value = t - e.at; wxU.kind.value = {rain: 0, snow: 1, sand: 2}[e.kind ?? 'rain']; wxU.dens.value = e.density ?? 1; wxU.asp.value = aspect;
    wxU.op.value = Math.min(1, u * (e.dur ?? 1) / .5, (1 - u) * (e.dur ?? 1) / .5) * (e.opacity ?? 1); wxU.tint.value.set(e.tint ?? (e.kind === 'sand' ? '#e6c98e' : '#e3ecf8')); };
  // Targets get their own material copies so an effect never leaks onto shared (cached) materials.
  const own = new Map();
  const ownMaterials = obj => { if (own.has(obj)) return own.get(obj); const mats = []; obj.traverse(o => { if (!o.isMesh) return; o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); for (const m of [].concat(o.material)) mats.push(m); }); own.set(obj, mats); return mats; };
  const rigs = list.map(e => {
    const r = {e};
    if (['ghost', 'glow', 'melt', 'squash'].includes(e.type)) {
      r.obj = ctx.resolveTarget(e.target); if (!r.obj) throw Error('effect target not found: ' + JSON.stringify(e.target));
      if (e.type !== 'squash') { r.mats = ownMaterials(r.obj); r.base = r.mats.map(m => ({opacity: m.opacity, transparent: m.transparent, emissive: m.emissive?.clone(), ei: m.emissiveIntensity})); }
      r.scale0 = r.obj.scale.clone();
    }
    if (e.type === 'pillar' || e.type === 'ring' || e.type === 'halo') {
      const m = new T.MeshBasicMaterial({color: e.color ?? '#ffffff', map: particleTexture(e.type === 'pillar' ? 'beam' : e.type === 'halo' ? 'sun' : 'soft'), transparent: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending, side: T.DoubleSide});
      const geo = e.type === 'pillar' ? new T.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, .5, 0) : e.type === 'ring' ? new T.RingGeometry(.82, 1, 40).rotateX(-Math.PI / 2) : new T.PlaneGeometry(1, 1);
      r.fx = new T.Mesh(geo, m); r.fx.visible = false; r.fx.renderOrder = 6; r.fx.frustumCulled = false; scene.add(r.fx);
    }
    if (e.type === 'morph') { r.a = ctx.actorOf(e.actor); r.from = ctx.toolGroup(r.a, e.from); r.to = ctx.toolGroup(r.a, e.to); }
    if (e.type === 'card') { r.info = CLASSES[e.cls]; if (!r.info) throw Error('unknown class ' + e.cls); r.a = ctx.actorOf(e.actor); r.tex = new Map(); }
    if (e.type === 'lightning') {
      const g = new T.Group(), m = new T.MeshBasicMaterial({color: e.color ?? '#dbe8ff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false});
      const from = ctx.resolvePoint(e.from ?? e.origin, e.at), to = ctx.resolvePoint(e.to, e.at);
      boltPath(e.seed ?? 1, from, to).forEach((pts, k) => { const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), false, 'catmullrom', 0); g.add(new T.Mesh(new T.TubeGeometry(c, pts.length * 3, (e.width ?? .35) * (k ? .5 : 1), 5), m)); });
      const glow = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(boltPath(e.seed ?? 1, from, to)[0].map(p => new T.Vector3(...p)), false, 'catmullrom', 0), 40, (e.width ?? .35) * 4, 6), new T.MeshBasicMaterial({color: '#7fa8ff', transparent: true, opacity: .25, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false}));
      g.add(glow); g.visible = false; g.renderOrder = 7; scene.add(g); r.fx = g; r.mat = m;
    }
    if (e.type === 'shockwave') {
      r.rings = [0, 1].map(k => { const m = new T.Mesh(new T.RingGeometry(.86 - k * .06, 1, 64).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({color: e.color ?? '#ffffff', transparent: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending, side: T.DoubleSide})); m.visible = false; m.renderOrder = 6; scene.add(m); return m; });
    }
    if (e.type === 'trail') {
      const n = 24, geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 2 * 3), 3)); geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 2 * 3), 3));
      const idx = []; for (let k = 0; k < n - 1; k++) idx.push(2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 1, 2 * k + 3, 2 * k + 2); geo.setIndex(idx);
      r.fx = new T.Mesh(geo, new T.MeshBasicMaterial({vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: false}));
      r.fx.frustumCulled = false; r.fx.visible = false; r.fx.renderOrder = 4; scene.add(r.fx); r.n = n;
    }
    if (e.type === 'particles') {
      const P = PRESETS[e.preset ?? 'sparkle'], n = e.count ?? 20;
      const m = new T.MeshBasicMaterial({map: particleTexture(P.tex), transparent: true, depthWrite: false, toneMapped: false, blending: P.additive ? T.AdditiveBlending : T.NormalBlending});
      if (P.volume && !P.additive) { m.opacity = e.alpha ?? P.alpha ?? 1; }
      if (P.volume && P.drift && P.fall) r.lean = Math.atan2(P.drift[0], P.fall) * .6;   // streaks lean with the wind
      r.im = new T.InstancedMesh(new T.PlaneGeometry(1, 1), m, n); r.im.frustumCulled = false; r.im.renderOrder = 5; r.im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3); r.n = n;
      scene.add(r.im);
    }
    return r;
  });
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), Pv = new T.Vector3(), C = new T.Color(), Z = new T.Quaternion();

  return {
    // Before render: returns {camOffset, look: [a, b, w] | null}; poses every effect for time t.
    apply(t, camera) {
      let camOffset = [0, 0, 0], lookOverride = null;
      for (const r of rigs) {
        const e = r.e;
        if (e.type === 'shake') { const o = shakeOffset(e, t); camOffset = camOffset.map((v, i) => v + o[i]); }
        else if (e.type === 'timeOfDay') { const u = progress(e, t); if (u !== null) lookOverride = [e.from, e.to, easeIO(u)]; }
        else if (e.type === 'ghost') { const u = progress(e, t), op = u === null ? 1 : 1 - (1 - (e.opacity ?? .35)) * Math.min(1, u * 4); r.mats.forEach((m, i) => { m.transparent = op < 1 || r.base[i].transparent; m.opacity = r.base[i].opacity * op; m.depthWrite = op >= 1; }); }
        else if (e.type === 'glow') { const g = glowLevel(e, t); r.mats.forEach((m, i) => { if (!m.emissive) return; m.emissive.copy(g > 0 ? C.set(e.color ?? '#ffd84a') : r.base[i].emissive); m.emissiveIntensity = g > 0 ? g : r.base[i].ei; }); }
        else if (e.type === 'melt') { const s = meltState(e, t); r.obj.scale.set(r.scale0.x * (s ? 1 + (1 - s.scaleY) * .4 : 1), r.scale0.y * (s ? s.scaleY : 1), r.scale0.z * (s ? 1 + (1 - s.scaleY) * .4 : 1)); r.mats.forEach((m, i) => { if (!m.emissive) return; m.emissive.copy(s?.glow ? C.set('#ff7a1f') : r.base[i].emissive); m.emissiveIntensity = s?.glow ? s.glow : r.base[i].ei; }); }
        else if (e.type === 'squash') { const k = squashScale(e, t); r.obj.scale.set(r.scale0.x * k[0], r.scale0.y * k[1], r.scale0.z * k[2]); }
        else if (e.type === 'pillar' || e.type === 'ring' || e.type === 'halo') {
          const u = progress(e, t); r.fx.visible = u !== null && u < 1;
          if (r.fx.visible) {
            const o = ctx.resolvePoint(e.origin, t); r.fx.position.set(...o);
            if (e.type === 'pillar') { const grow = Math.min(1, u * e.dur / .12), w = (e.radius ?? .75) * (1 - .4 * u); r.fx.scale.set(w, (e.height ?? 16) * grow, w); r.fx.material.opacity = (1 - u) ** 1.5; }
            else if (e.type === 'ring') { const k = (e.radius ?? 4.5) * (1 - (1 - u) ** 3); r.fx.scale.set(k, 1, k); r.fx.material.opacity = (1 - u) * .9; }
            else { camera.getWorldQuaternion(r.fx.quaternion); r.fx.rotateZ((t - e.at) * .6); const k = (e.size ?? 5) * (.6 + .4 * Math.min(1, u * 5)); r.fx.scale.set(k, k, 1); r.fx.material.opacity = Math.min(1, u * 6, (1 - u) * 3) * .85; }
          }
        }
        else if (e.type === 'morph') {   // plain sword squashes thin into light; the class blade grows in (outBack) with a half spin
          const u = progress(e, t), pivot = r.a.pivots.rightShoulder;
          if (u === null || u >= 1) { r.to.scale.set(1, 1, 1); r.to.rotation.y = 0; r.from.scale.set(1, 1, 1); if (r.from.parent === pivot && r.a.tool !== r.from) pivot.remove(r.from); }
          else {
            if (r.from.parent !== pivot) pivot.add(r.from);
            const k = Math.max(.001, 1 - u); r.from.scale.set(k * .25 + .02, 1 + .15 * u, k * .25 + .02);
            const g = Math.max(.001, outBack(u)); r.to.scale.set(g, g, g); r.to.rotation.y = Math.PI * (1 - u);
          }
        }
        else if (e.type === 'lightning') { const k = lightningLevel(e, t); r.fx.visible = k > 0; r.mat.opacity = k; }
        else if (e.type === 'shockwave') { const w = shockwave(e, t), o = w && ctx.resolvePoint(e.origin, t);
          r.rings.forEach((m, k) => { m.visible = !!w; if (!w) return; const rr = w.r * (k ? .62 : 1); m.position.set(o[0], o[1] + .25, o[2]); m.scale.set(rr, 1, rr); m.material.opacity = w.alpha * (k ? .6 : 1); }); }
        else if (e.type === 'trail') {
          const smp = trailSamples(e, t, r.n); r.fx.visible = smp.length > 1; if (!r.fx.visible) continue;
          const pos = r.fx.geometry.attributes.position, col = r.fx.geometry.attributes.color, c0 = C.set(e.color ?? '#7fe8ff'), w = (e.width ?? .9) / 2, lift = e.lift ?? .08;
          const pts = smp.map(s0 => ctx.actorAt(e.actor, s0.t));
          for (let k = 0; k < r.n; k++) {
            const p = pts[Math.min(k, pts.length - 1)], q = pts[Math.min(pts.length - 1, k + 1)], pp = pts[Math.max(0, k - 1)], a = smp[Math.min(k, smp.length - 1)].a;
            let dx = q[0] - pp[0], dz = q[2] - pp[2]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
            const y = (e.mode === 'ribbon' ? p[1] + (e.height ?? 2.5) : (ctx.groundY ? ctx.groundY(p[0], p[2]) : p[1]) + lift);
            if (e.mode === 'ribbon') { pos.setXYZ(2 * k, p[0], y - w, p[2]); pos.setXYZ(2 * k + 1, p[0], y + w, p[2]); }
            else { pos.setXYZ(2 * k, p[0] - dz * w, y, p[2] + dx * w); pos.setXYZ(2 * k + 1, p[0] + dz * w, y, p[2] - dx * w); }
            const f = a * a * (e.level ?? 1); col.setXYZ(2 * k, c0.r * f, c0.g * f, c0.b * f); col.setXYZ(2 * k + 1, c0.r * f, c0.g * f, c0.b * f);
          }
          pos.needsUpdate = true; col.needsUpdate = true;
        }
        else if (e.type === 'particles') {
          const origin = ctx.resolvePoint(e.origin, t); camera.getWorldQuaternion(Z); let live = 0;
          for (let i = 0; i < r.n; i++) {
            const p = particleState(e, i, t);
            if (!p || p.size <= 0 || p.alpha <= 0) { M.makeScale(0, 0, 0); r.im.setMatrixAt(i, M); continue; }
            Q.copy(Z).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), p.stretch > 1 ? (p.horizontal ? Math.PI / 2 : 0) + (r.lean ?? 0) : p.rot ?? 0));
            M.compose(Pv.set(origin[0] + p.pos[0], origin[1] + p.pos[1], origin[2] + p.pos[2]), Q, S.set(p.size, p.size * (p.stretch ?? 1), p.size)); r.im.setMatrixAt(i, M);
            C.set(p.color).multiplyScalar(Math.max(.15, p.alpha)); r.im.setColorAt(i, C); live++;
          }
          r.im.instanceMatrix.needsUpdate = true; r.im.instanceColor.needsUpdate = true; r.im.visible = live > 0;
        }
      }
      return {camOffset, look: lookOverride};
    },
    // A3 class cards on screen at t: [{cls, rect, state}] (frame fractions; same maths as the overlay draws).
    cards(t, camera, aspect = 9 / 16) {
      const out = [];
      for (const r of rigs) {
        if (r.e.type !== 'card') continue;
        const st = cardState(t - r.e.at); if (!st) continue;
        if (ctx.shotAt && ctx.shotAt(t) !== ctx.shotAt(r.e.at)) continue;   // a card lives only in the shot it slams into (beat cuts end it)
        const s = r.a.root.scale.y, head = new T.Vector3().copy(r.a.root.position).add(new T.Vector3(0, 5.9 * s, 0)).project(camera);
        if (head.z > 1) continue;
        const anchor = {x: (head.x + 1) / 2, y: (1 - head.y) / 2};
        const rest = cardRect({x: anchor.x + (r.e.dx ?? 0), y: anchor.y}, r.e.kind, aspect, r.e.scale ?? 1);
        // flying into the tag: centre moves to the head anchor, the card shrinks and fades
        const cx = (rest.x0 + rest.x1) / 2 + (anchor.x - (rest.x0 + rest.x1) / 2) * st.fly, cy = (rest.y0 + rest.y1) / 2 + (anchor.y - .02 - (rest.y0 + rest.y1) / 2) * st.fly;
        const w = rest.w * st.scale, h = rest.h * st.scale;
        out.push({cls: r.e.cls, kind: r.e.kind ?? 'big', state: st, rest, rect: {x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, cap: rest.cap * st.scale, kind: r.e.kind ?? 'big'}, r});
      }
      return out;
    },
    // After render: fades and flashes over the frame (alpha-composited, one quad).
    overlay(t, camera = null, aspect = 9 / 16) {
      let a = 0, col = '#000000';
      for (const {e} of rigs) {
        if (e.type === 'fadeColor') { const v = fadeAlpha(e, t); if (v > a) { a = v; col = e.color ?? '#000000'; } }
        if (e.type === 'flash') { const v = flashAlpha(e, t); if (v > a) { a = v; col = e.color ?? '#ffffff'; } }
        if (e.type === 'lightning' && e.flash !== false) { const v = lightningLevel(e, t) * (e.flashPeak ?? .45); if (v > a) { a = v; col = '#e8f0ff'; } }
      }
      const wx = rigs.find(r => r.e.type === 'weather' && progress(r.e, t) !== null);
      if (wx) { weatherQuad(wx.e, t, aspect); const au = renderer.autoClear; renderer.autoClear = false; renderer.render(wxScene, ovCam); renderer.autoClear = au; }
      const auto = renderer.autoClear; renderer.autoClear = false;
      if (a > 0) { ovMat.color.set(col); ovMat.opacity = a; renderer.render(ovScene, ovCam); }
      if (camera) for (const c of this.cards(t, camera, aspect)) {   // A3 cards: textured quads in screen space, after the flash
        const step = c.state.landed ? Math.min(11, Math.floor(c.state.shine * 11)) : -1, key = c.cls + ':' + step;
        if (!c.r.tex.has(key)) { const cv = classCardCanvas(c.cls, c.r.info, step); const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; c.r.tex.set(key, tx); }
        cardMat.map = c.r.tex.get(key); cardMat.opacity = c.state.alpha; cardMat.needsUpdate = true;
        cardQuad.position.set((c.rect.x0 + c.rect.x1) - 1, 1 - (c.rect.y0 + c.rect.y1), 0); cardQuad.scale.set(c.rect.x1 - c.rect.x0, c.rect.y1 - c.rect.y0, 1);
        renderer.render(cardScene, ovCam);
      }
      renderer.autoClear = auto;
    },
  };
}
