// parts/materials.js — procedural tiling textures we draw ourselves (docs/V2_BRIEF.md §7.2).
// Each pattern is a 128 px greyscale-ish canvas (RepeatWrapping) multiplied by the material colour,
// so one texture serves every tint. UVs are in world units (see parts.js), so `scale` = studs per
// tile keeps the pattern size constant on any block. Subtle contrast: these stop a build reading as
// untextured grey boxes without turning it into noise. Materials are Phong, cached per (pattern, colour).
import * as T from 'three';

export const PATTERNS = ['plastic', 'studs', 'grass', 'brick', 'woodPlanks', 'cobble', 'slate', 'sand', 'thatch', 'water', 'glass', 'neon'];
export const TILE = {plastic: 4, studs: 2, grass: 6, brick: 3, woodPlanks: 3, cobble: 4, slate: 3, sand: 6, thatch: 3, water: 8, glass: 4, neon: 4};   // world units per tile

// Deterministic value noise (no Math.random anywhere in the engine).
const hash = (x, y, s) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };

const DRAW = {
  plastic(g, n) { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, n, n); },
  studs(g, n) {
    g.fillStyle = '#efefef'; g.fillRect(0, 0, n, n);
    for (const [x, y] of [[.25, .25], [.75, .25], [.25, .75], [.75, .75]]) {
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x * n + 2, y * n + 3, n * .14, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x * n, y * n, n * .14, 0, 7); g.fill();
    }
  },
  grass(g, n) {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 260; i++) { const x = hash(i, 1, 3) * n, y = hash(i, 2, 3) * n, l = 200 + hash(i, 3, 3) * 55; g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x, y, 2, 4 + hash(i, 4, 3) * 4); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,.06)'; g.beginPath(); g.arc(hash(i, 5, 3) * n, hash(i, 6, 3) * n, 6 + hash(i, 7, 3) * 10, 0, 7); g.fill(); }
  },
  brick(g, n) {
    g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, n, n);
    const rows = 4, h = n / rows;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 2; c++) {
      const x = c * n / 2 + (r % 2) * n / 4, l = 225 + hash(r, c, 5) * 30;
      g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x + 2, r * h + 2, n / 2 - 4, h - 4);
    }
  },
  woodPlanks(g, n) {
    for (let i = 0; i < 4; i++) {
      const l = 215 + hash(i, 0, 7) * 35; g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(0, i * n / 4, n, n / 4);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * n / 4, n, 2);
      g.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 3; k++) g.fillRect(0, i * n / 4 + 6 + k * 8, n, 1);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect((hash(i, 1, 7) * .8 + .1) * n, i * n / 4, 2, n / 4);
    }
  },
  cobble(g, n) {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, n, n);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const l = 205 + hash(x, y, 9) * 45, ox = (y % 2) * n / 8;
      g.fillStyle = `rgb(${l},${l},${l})`; g.beginPath(); g.roundRect(((x * n / 4 + ox) % n) + 3, y * n / 4 + 3, n / 4 - 6, n / 4 - 6, 6); g.fill();
    }
  },
  slate(g, n) {
    g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, n, n);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const l = 215 + hash(r, c, 11) * 40, x = c * n / 4 - (r % 2) * n / 8;
      g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x + 1, r * n / 4, n / 4 - 2, n / 4 - 3);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 1, r * n / 4 + n / 4 - 4, n / 4 - 2, 2);
    }
  },
  sand(g, n) { g.fillStyle = '#ececec'; g.fillRect(0, 0, n, n); for (let i = 0; i < 500; i++) { const l = 205 + hash(i, 1, 13) * 50; g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(hash(i, 2, 13) * n, hash(i, 3, 13) * n, 2, 2); } },
  thatch(g, n) {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 180; i++) { const x = hash(i, 1, 15) * n, l = 200 + hash(i, 2, 15) * 55; g.strokeStyle = `rgb(${l},${l},${l})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, hash(i, 3, 15) * n); g.lineTo(x + 3, hash(i, 3, 15) * n + 18); g.stroke(); }
    for (let r = 0; r < 4; r++) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, r * n / 4 + n / 4 - 3, n, 3); }
  },
  water(g, n) { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, n, n); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { const y = hash(i, 1, 17) * n, x = hash(i, 2, 17) * n; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 20, y); g.stroke(); } },
  glass(g, n) { g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, n, n); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(n * .15, n); g.lineTo(n * .45, 0); g.lineTo(n * .55, 0); g.lineTo(n * .25, n); g.fill(); },
  neon(g, n) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); },
};

const texCache = new Map();
export function patternTexture(name) {
  if (!DRAW[name]) throw Error('unknown pattern ' + name);
  if (texCache.has(name)) return texCache.get(name);
  let tex = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = 128; DRAW[name](c.getContext('2d'), 128);
    tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8;
  }
  texCache.set(name, tex); return tex;
}

const matCache = new Map();
// mat('brick', '#c9a27a'), mat('neon', '#ffcf6b') (emissive), mat('glass', '#9fd3ff') (slightly see-through look, opaque).
export function mat(pattern = 'plastic', color = '#cccccc', {flat = false} = {}) {
  const key = `${pattern}|${color}|${flat}`; if (matCache.has(key)) return matCache.get(key);
  const map = pattern === 'plastic' || pattern === 'neon' ? null : patternTexture(pattern);
  const m = new T.MeshPhongMaterial({color, map, shininess: pattern === 'glass' ? 90 : pattern === 'water' ? 70 : 22, specular: pattern === 'glass' || pattern === 'water' ? '#888888' : '#2a2a2a', flatShading: flat});
  if (pattern === 'neon') { m.emissive = new T.Color(color); m.emissiveIntensity = 1.1; }
  m.userData.pattern = pattern; m.name = key; matCache.set(key, m); return m;
}
export const tileOf = m => TILE[m?.userData?.pattern] ?? 4;
