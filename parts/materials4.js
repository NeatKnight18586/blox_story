// parts/materials4.js — format v4 Phase 2 surfaces. Pure pixel generators (Node-testable, deterministic) for the v4 set:
// asphalt with cracks and lane paint, plaster, timber, roof tile, glass panel, polished floor. Each returns albedo (RGBA),
// roughness (one channel) and height (0..1) → normal map; 512 px. The browser loads them from the disk cache
// (renders/cache/tex4/<name>-<size>.bin, written by scripts/v2/tex4.js) or generates them once in the page.
// roughnessFromHeight() extends the existing relief patterns (parts/materials.js) with roughness maps (crevices rougher).
//   gen4(name, n) → {albedo, rough, height, n} · tex4(name) (browser) · mat4(name, color, o) (MeshStandard, live)
import * as T from 'three';
import {heightToNormal} from './materials.js';

export const NAMES4 = ['asphaltLane', 'plaster', 'timber', 'roofTile', 'glassPanel', 'polishedFloor'];
export const SIZE4 = 512;
const fract = x => x - Math.floor(x);
const h2 = (x, y, s) => fract(Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453);
// tiling value noise (period p cells)
function vnoise(u, v, p, s) {
  const x = u * p, y = v * p, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const c = (i, j) => h2(((i % p) + p) % p, ((j % p) + p) % p, s);
  return (c(x0, y0) * (1 - sx) + c(x0 + 1, y0) * sx) * (1 - sy) + (c(x0, y0 + 1) * (1 - sx) + c(x0 + 1, y0 + 1) * sx) * sy;
}
const fbm = (u, v, s, o = 4, p = 4) => { let a = 0, w = .5, t = 0; for (let k = 0; k < o; k++) { a += vnoise(u, v, p << k, s + k) * w; t += w; w *= .5; } return a / t; };
const mix = (a, b, t) => a + (b - a) * t;
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

// pixel shader per pattern: (u, v) in [0,1) → [r, g, b, rough 0..1, height 0..1]
const PX = {
  asphaltLane: (u, v) => {
    const n = fbm(u, v, 3, 5, 8), grit = h2(Math.floor(u * 512), Math.floor(v * 512), 9);
    let c = mix(52, 74, n) + (grit > .93 ? 26 : 0), r = .88, h = .5 + n * .2 - (grit > .93 ? -.1 : 0);
    // cracks: thin dark lines along a warped field's zero set
    const w = fbm(u * 1.0 + .3, v, 17, 3, 3) - .5, crack = Math.abs(w + .15 * Math.sin(v * 25)) < .0025 + .002 * fbm(u, v, 21, 2, 6);   // tuning: hairline cracks
    if (crack) { c *= .62; r = .97; h = .1; }
    // lane paint: dashed centre line along v (u ≈ .5), worn by noise
    const dash = Math.abs(u - .5) < .018 && fract(v * 2) < .55, worn = fbm(u, v, 33, 3, 16) > .32;
    if (dash && worn && !crack) return [228, 214, 150, .55, .55];
    return [c, c * 1.01, c * 1.06, r, h];
  },
  plaster: (u, v) => { const n = fbm(u, v, 5, 5, 4), f = fbm(u, v, 6, 3, 32); const k = mix(.9, 1.02, n) - (f > .7 ? .04 : 0); return [236 * k, 226 * k, 208 * k, .9 - n * .08, .4 + n * .3 + f * .1]; },
  timber: (u, v) => {
    const board = Math.floor(u * 6), bu = fract(u * 6), gap = bu < .035 || bu > .965, seed = board * 13.7;
    const grain = Math.sin((v * 40 + fbm(u, v, seed, 3, 4) * 6 + board) * 2.2) * .5 + .5, k = mix(.78, 1, grain) * mix(.9, 1.05, h2(board, 0, 4));
    return gap ? [50, 34, 22, .95, .05] : [150 * k, 104 * k, 66 * k, .72 - grain * .08, .6 + grain * .15];
  },
  roofTile: (u, v) => {
    const row = Math.floor(v * 6), ru = fract(u * 5 + (row % 2) * .5), rv = fract(v * 6), arc = Math.sqrt(Math.max(0, 1 - ((ru - .5) * 2) ** 2));
    const edge = rv < .08 + .1 * (1 - arc), k = mix(.85, 1.05, h2(Math.floor(u * 5 + (row % 2) * .5), row, 2)) * mix(.8, 1, arc);
    return edge ? [70, 32, 24, .9, .05] : [182 * k, 84 * k, 58 * k, .68, .3 + arc * .6 * (1 - rv * .4)];
  },
  glassPanel: (u, v) => {
    const fu = fract(u * 4), fv = fract(v * 3), mull = fu < .04 || fu > .96 || fv < .05 || fv > .95;
    if (mull) return [60, 66, 74, .4, .9];
    const tint = mix(.85, 1, fbm(u, v, 41, 2, 2) * .4 + fv * .6);
    return [120 * tint, 150 * tint, 175 * tint, .06, .5];
  },
  polishedFloor: (u, v) => {
    const fu = fract(u * 2), fv = fract(v * 2), grout = fu < .012 || fu > .988 || fv < .012 || fv > .988, t = h2(Math.floor(u * 2), Math.floor(v * 2), 7), veins = fbm(u, v, 51 + t * 9, 5, 4);
    if (grout) return [120, 116, 110, .85, .2];
    const k = mix(.92, 1, veins) - (Math.abs(veins - .55) < .01 ? .1 : 0);
    return [226 * k, 220 * k, 210 * k, .14 + veins * .06, .55];
  },
};
export function gen4(name, n = SIZE4) {
  if (!PX[name]) throw Error('unknown v4 surface ' + name);
  const albedo = new Uint8Array(n * n * 4), rough = new Uint8Array(n * n), height = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const [r, g, b, ro, h] = PX[name]((x + .5) / n, (y + .5) / n), i = y * n + x;
    albedo[i * 4] = r; albedo[i * 4 + 1] = g; albedo[i * 4 + 2] = b; albedo[i * 4 + 3] = 255; rough[i] = Math.round(Math.min(1, Math.max(0, ro)) * 255); height[i] = h;
  }
  return {albedo, rough, height, n};
}
// Roughness from a relief height map (existing patterns): crevices (low) rough, tops a little smoother. Pure.
export const roughnessFromHeight = (h, base = .86, span = .22) => Uint8Array.from(h, v => Math.round(Math.min(1, base + span * (.5 - v)) * 255));
// Gloss (1 − roughness) as an 8-bit map: the baked material's env-highlight mask.
export const glossFromRough = r => Uint8Array.from(r, v => 255 - v);
// Pack for the disk cache: albedo | rough | normal (from height) in one buffer.
export function pack4(g) { const nrm = heightToNormal(g.height, g.n, g.n, 2.2); const out = new Uint8Array(g.n * g.n * 9); out.set(g.albedo, 0); out.set(g.rough, g.n * g.n * 4); out.set(nrm.subarray(0, g.n * g.n * 4), g.n * g.n * 5); return out; }

// ---- browser ------------------------------------------------------------------------------------------------------------------
const cache = new Map();
export const CACHE_DIR = 'renders/cache/tex4';
// Load every v4 surface once (disk cache if present, else generate in the page). Call before the world builds.
export async function loadTex4(base, names = NAMES4) {
  const stats = {fromDisk: 0, generated: 0};
  for (const name of names) {
    if (cache.has(name)) continue;
    let buf = null;
    try { const r = await fetch(new URL(`${CACHE_DIR}/${name}-${SIZE4}.bin`, base)); if (r.ok) buf = new Uint8Array(await r.arrayBuffer()); } catch {}
    if (!buf || buf.length !== SIZE4 * SIZE4 * 9) { buf = pack4(gen4(name)); stats.generated++; } else stats.fromDisk++;
    const n = SIZE4, mk = (data, fmt, cs) => { const t = new T.DataTexture(data, n, n, fmt); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = cs; t.magFilter = T.LinearFilter;
      t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true; return t; };
    const rough = buf.subarray(n * n * 4, n * n * 5), rgba = new Uint8Array(n * n * 4), gl = new Uint8Array(n * n * 4);
    for (let i = 0; i < n * n; i++) { rgba[i * 4 + 1] = rough[i]; rgba[i * 4 + 3] = 255; const g = 255 - rough[i]; gl[i * 4] = gl[i * 4 + 1] = gl[i * 4 + 2] = g; gl[i * 4 + 3] = 255; }
    cache.set(name, {map: mk(buf.slice(0, n * n * 4), T.RGBAFormat, T.SRGBColorSpace), roughnessMap: mk(rgba, T.RGBAFormat, T.NoColorSpace),
      normalMap: mk(buf.slice(n * n * 5), T.RGBAFormat, T.NoColorSpace), glossMap: mk(gl, T.RGBAFormat, T.NoColorSpace)});
  }
  return stats;
}
export const tex4 = name => cache.get(name);
const mats = new Map();
// mat4('timber', '#ffffff', {repeat: [2, 1]}): MeshStandard with albedo/roughness/normal maps (scene env lights it). The
// baker reads userData.glossMap / gloss to keep a matching env highlight on the cheap baked material.
export function mat4(name, color = '#ffffff', {repeat = [1, 1], live = false, emissive = null} = {}) {
  const key = `${name}|${color}|${repeat}|${live}|${emissive}`; if (mats.has(key)) return mats.get(key);
  const t = tex4(name); if (!t) throw Error('loadTex4 first: ' + name);
  const rep = x => { const c = x.clone(); c.repeat.set(...repeat); c.needsUpdate = true; return c; };
  const m = new T.MeshStandardMaterial({color, map: rep(t.map), roughnessMap: rep(t.roughnessMap), normalMap: rep(t.normalMap), roughness: 1, metalness: 0});
  if (emissive) { m.emissive = new T.Color(emissive); m.emissiveIntensity = 1; }
  m.userData = {pattern4: name, glossMap: rep(t.glossMap), gloss: name === 'glassPanel' ? .9 : name === 'polishedFloor' ? .8 : name === 'asphaltLane' ? .15 : .3, live};
  m.name = 'v4:' + key; mats.set(key, m); return m;
}
