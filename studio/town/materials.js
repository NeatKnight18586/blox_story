// Town surface materials, painted on canvas the way Roblox builds use surface
// materials (brick, siding, stone, wood, paving) instead of flat colour.
// Patterns are drawn in light greys and tinted by material.color, so one pattern
// serves every colourway. Repeat is set per box face in world units (no stretching).
import * as T from 'three';

const PX = 256, cache = new Map();
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const grey = v => `rgb(${v},${v},${v})`;

const PAINTERS = {
  // Running-bond bricks, 4 courses per tile, per-brick tone jitter, light mortar.
  brick(g, r) {
    g.fillStyle = grey(250); g.fillRect(0, 0, PX, PX);
    const rows = 8, bh = PX / rows, bw = PX / 4;
    for (let y = 0; y < rows; y++) for (let x = -1; x < 5; x++) {
      const off = y % 2 ? bw / 2 : 0; g.fillStyle = grey(196 + Math.floor(r() * 40));
      g.fillRect(x * bw + off + 3, y * bh + 3, bw - 6, bh - 6);
    }
  },
  // Horizontal lap siding: boards with a dark lower shadow line.
  siding(g, r) {
    const rows = 6, h = PX / rows;
    for (let y = 0; y < rows; y++) {
      const grad = g.createLinearGradient(0, y * h, 0, (y + 1) * h);
      grad.addColorStop(0, grey(250)); grad.addColorStop(.85, grey(228)); grad.addColorStop(1, grey(170));
      g.fillStyle = grad; g.fillRect(0, y * h, PX, h);
    }
  },
  // Cut stone blocks of two sizes.
  stone(g, r) {
    g.fillStyle = grey(205); g.fillRect(0, 0, PX, PX);
    for (let y = 0; y < 4; y++) { let x = -r() * 40; while (x < PX) { const w = 50 + r() * 50; g.fillStyle = grey(220 + Math.floor(r() * 30)); g.fillRect(x + 3, y * 64 + 3, w - 6, 58); x += w; } }
  },
  // Smooth plaster with soft speckle.
  plaster(g, r) {
    g.fillStyle = grey(245); g.fillRect(0, 0, PX, PX);
    for (let i = 0; i < 900; i++) { g.fillStyle = grey(225 + Math.floor(r() * 30)); g.fillRect(r() * PX, r() * PX, 2, 2); }
  },
  // Vertical wood planks with grain.
  planks(g, r) {
    for (let x = 0; x < 5; x++) {
      g.fillStyle = grey(215 + Math.floor(r() * 35)); g.fillRect(x * PX / 5, 0, PX / 5, PX);
      g.strokeStyle = grey(175); g.lineWidth = 3; g.strokeRect(x * PX / 5, -2, PX / 5, PX + 4);
      for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(0,0,0,${.05 + r() * .06})`; g.lineWidth = 1; const gx = x * PX / 5 + 6 + r() * (PX / 5 - 12); g.beginPath(); g.moveTo(gx, 0); g.bezierCurveTo(gx + 6, PX * .3, gx - 6, PX * .6, gx + 3, PX); g.stroke(); }
    }
  },
  // Square paving tiles with grout and gentle tone variation.
  paving(g, r) {
    g.fillStyle = grey(175); g.fillRect(0, 0, PX, PX);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = grey(228 + Math.floor(r() * 26)); g.fillRect(x * 64 + 3, y * 64 + 3, 58, 58); }
  },
  asphalt(g, r) {
    g.fillStyle = grey(232); g.fillRect(0, 0, PX, PX);
    for (let i = 0; i < 2500; i++) { g.fillStyle = grey(200 + Math.floor(r() * 55)); g.fillRect(r() * PX, r() * PX, 2, 2); }
  },
  grass(g, r) {
    g.fillStyle = grey(232); g.fillRect(0, 0, PX, PX);
    for (let i = 0; i < 1600; i++) { const v = 200 + Math.floor(r() * 55); g.strokeStyle = grey(v); g.lineWidth = 2; const x = r() * PX, y = r() * PX; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 4, y - 6 - r() * 6); g.stroke(); }
  },
  // Overlapping shingle rows.
  roof(g, r) {
    g.fillStyle = grey(190); g.fillRect(0, 0, PX, PX);
    for (let y = 0; y < 6; y++) for (let x = -1; x < 7; x++) { const off = y % 2 ? 21 : 0; g.fillStyle = grey(222 + Math.floor(r() * 30)); g.beginPath(); g.roundRect(x * 42 + off + 2, y * 43 + 2, 38, 40, [0, 0, 10, 10]); g.fill(); }
  },
  // Window glass: sky reflection gradient and a diagonal glint.
  glass(g) {
    const grad = g.createLinearGradient(0, 0, 0, PX); grad.addColorStop(0, '#cfeeff'); grad.addColorStop(.55, '#6fb3d9'); grad.addColorStop(1, '#3d7fa8');
    g.fillStyle = grad; g.fillRect(0, 0, PX, PX);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(PX * .15, 0); g.lineTo(PX * .4, 0); g.lineTo(PX * .1, PX); g.lineTo(-PX * .15, PX); g.fill();
  },
};

// Surface detail level. 'classic' (default) is the legacy look; 'hd' (opt-in per episode,
// call before building sets) paints at 2× resolution, adds grain, wear and chips, and uses
// the pattern as a bump map so mortar, grout, plank seams and shingles read as relief.
let DETAIL = 'classic';
export function setSurfaceDetail(level) { DETAIL = level; cache.clear(); }
function wear(g, r, kind, S) {
  if (kind === 'glass') return;
  // Fine grain (light and dark specks), a few scuffs and chipped corners.
  for (let i = 0; i < 9000; i++) { const v = r() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${.04 + r() * .05})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5); }
  g.lineCap = 'round';
  for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(0,0,0,${.05 + r() * .06})`; g.lineWidth = 1 + r() * 1.5; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - .5) * 40, y + (r() - .5) * 20, x + (r() - .5) * 70, y + (r() - .5) * 30); g.stroke(); }
  if (kind === 'grass') for (let i = 0; i < 2600; i++) { const v = 180 + Math.floor(r() * 75); g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1.5; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 5, y - 5 - r() * 9); g.stroke(); }
}

export function texture(kind, seed = 3) {
  if (typeof document === 'undefined') return null;
  const hd = DETAIL === 'hd', key = kind + seed + DETAIL; if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'), S = hd ? PX * 2 : PX; c.width = c.height = S;
  const g = c.getContext('2d');
  if (hd) g.scale(2, 2);
  PAINTERS[kind](g, rng(seed));
  if (hd) { g.setTransform(1, 0, 0, 1, 0, 0); wear(g, rng(seed + 11), kind, S); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = hd ? 16 : 8;
  cache.set(key, t); return t;
}
const BUMP = {brick: 2.2, siding: 1.6, stone: 2.2, plaster: .6, planks: 1.4, paving: 1.8, asphalt: .9, grass: 1.2, roof: 1.8};

// Tile size (world units per pattern repeat) for each surface kind.
const TILE = {brick: 4, siding: 3, stone: 5, plaster: 6, planks: 4, paving: 4, asphalt: 8, grass: 6, roof: 4, glass: 0};

function mat(kind, color, repeat, extra = {}) {
  const base = texture(kind);
  let map = null;
  if (base) { map = base.clone(); map.needsUpdate = true; if (TILE[kind]) map.repeat.set(...repeat); }
  const m = new T.MeshStandardMaterial({color: kind === 'glass' ? 0xffffff : color, map, roughness: kind === 'glass' ? .15 : .8, metalness: 0, ...extra});
  if (DETAIL === 'hd' && map && BUMP[kind]) { m.bumpMap = map; m.bumpScale = BUMP[kind]; }
  m.userData.authored = true; return m;
}

// Six face materials with per-face repeat so bricks stay the same size on every face.
export function surfaceMaterials(kind, color, [w, h, d]) {
  const s = TILE[kind] || 1;
  const faces = {right: [d, h], left: [d, h], top: [w, d], bottom: [w, d], front: [w, h], back: [w, h]};
  return ['right', 'left', 'top', 'bottom', 'front', 'back'].map(f => mat(kind, color, [faces[f][0] / s, faces[f][1] / s]));
}
export function flatMaterial(color, extra = {}) { const m = new T.MeshStandardMaterial({color, roughness: .55, ...extra}); m.userData.authored = true; return m; }

// Canvas-drawn sign/label materials (signboards, awnings).
export function paintedMaterial(w, h, draw, extra = {}) {
  if (typeof document === 'undefined') return flatMaterial(0xdddddd);
  const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
  draw(c.getContext('2d'), c.width, c.height);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
  const m = new T.MeshStandardMaterial({map: t, roughness: .6, ...extra}); m.userData.authored = true; return m;
}
