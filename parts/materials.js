// parts/materials.js — procedural tiling materials we draw ourselves (docs/V2_BRIEF.md §7.2, Amendment A1 B1).
// Every pattern is a calm 256 px albedo (tone variation within ±8 %, gaps/mortar ≥ 80 % of the block tone),
// multiplied by the material colour, so one texture serves every tint. Relief patterns also get a SEPARATE clean
// height drawing (white = high), blurred ~1.5 px and turned into a tiling normal map with a wrapped Sobel filter
// (heightToNormal, pure). Height is never derived from the albedo, and bumpMap is never used (NaN blobs, earlier).
// UVs are in world units (parts.js), so TILE = world units per repeat keeps pattern size constant on any block.
// Caps (A1): tiling maps only, 256 px, ≤ 16 albedo + ≤ 10 normal textures, no per-object textures.
import * as T from 'three';

export const N = 256;
export const PATTERNS = ['plastic', 'studs', 'grass', 'brick', 'woodPlanks', 'cobble', 'slate', 'sand', 'thatch', 'water', 'glass', 'neon', 'rock', 'dirt', 'metal', 'moss'];
export const TILE = {plastic: 4, studs: 2, grass: 6, brick: 3, woodPlanks: 3, cobble: 4, slate: 3, sand: 6, thatch: 3, water: 8, glass: 4, neon: 4, rock: 3, dirt: 4, metal: 2, moss: 4};
export const RELIEF = {brick: .5, cobble: .65, slate: .55, woodPlanks: .5, thatch: .55, rock: .5, dirt: .6};   // normalScale per relief pattern

// Deterministic value noise (no Math.random anywhere in the engine).
export const hash = (x, y, s) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
const grey = l => `rgb(${l | 0},${l | 0},${l | 0})`;
// Draw a shape at its position and at every wrapped copy, so tiles join seamlessly.
const wrap = (fn, n = N) => { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) fn(dx, dy); };
const softBlotches = (g, seed, count, amp) => {
  for (let i = 0; i < count; i++) {
    const x = hash(i, 1, seed) * N, y = hash(i, 2, seed) * N, r = 30 + hash(i, 3, seed) * 50, l = hash(i, 4, seed) < .5 ? 0 : 255;
    wrap((dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, `rgba(${l},${l},${l},${amp})`); gr.addColorStop(1, `rgba(${l},${l},${l},0)`); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r); });
  }
};
const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
// Jittered wrapped grid points (k × k cells): shared by rock facets and dirt cracks so both tile.
const jgrid = (k, seed, j = .35) => (i, l) => { const ii = ((i % k) + k) % k, ll = ((l % k) + k) % k; return [(i + .5 + (hash(ii, ll, seed) - .5) * j * 2) * N / k, (l + .5 + (hash(ii, ll, seed + 9) - .5) * j * 2) * N / k]; };

// ---- layouts shared by albedo and height so relief lines up with the paint ---------------------------------
const BRICK = {rows: 4, cols: 2};
const brickCells = () => { const out = [], h = N / BRICK.rows, w = N / BRICK.cols; for (let r = 0; r < BRICK.rows; r++) for (let c = 0; c < BRICK.cols; c++) out.push({x: c * w + (r % 2) * w / 2, y: r * h, w, h, k: r * 7 + c}); return out; };
const cobbleCells = () => { const out = [], k = 4, s = N / k; for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) out.push({x: c * s + (r % 2) * s / 2, y: r * s, s, k: r * 5 + c}); return out; };
const slateCells = () => { const out = [], rows = 4, h = N / rows, w = N / 4; for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) out.push({x: c * w - (r % 2) * w / 2, y: r * h, w, h, k: r * 4 + c}); return out; };
const plankRows = 4;

const DRAW = {   // albedo (calm)
  plastic: g => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, N, N); },
  studs(g) { g.fillStyle = '#efefef'; g.fillRect(0, 0, N, N); for (const [x, y] of [[.25, .25], [.75, .25], [.25, .75], [.75, .75]]) { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(x * N + 3, y * N + 4, N * .14, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x * N, y * N, N * .14, 0, 7); g.fill(); } },
  grass(g) { g.fillStyle = grey(236); g.fillRect(0, 0, N, N); softBlotches(g, 3, 10, .07); },
  sand(g) { g.fillStyle = grey(240); g.fillRect(0, 0, N, N); softBlotches(g, 13, 9, .06); },
  brick(g) {
    g.fillStyle = grey(206); g.fillRect(0, 0, N, N);                                       // mortar ≥ 80 % of block tone
    for (const b of brickCells()) { const l = 238 + hash(b.k, 1, 5) * 17; wrap((dx, dy) => { g.fillStyle = grey(l); roundRect(g, b.x + dx + 4, b.y + dy + 4, b.w - 8, b.h - 8, 6); }); }
  },
  cobble(g) {
    g.fillStyle = grey(205); g.fillRect(0, 0, N, N);
    for (const c of cobbleCells()) { const l = 236 + hash(c.k, 1, 9) * 19; wrap((dx, dy) => { g.fillStyle = grey(l); roundRect(g, c.x + dx + 5, c.y + dy + 5, c.s - 10, c.s - 10, 16); }); }
  },
  slate(g) {
    g.fillStyle = grey(210); g.fillRect(0, 0, N, N);
    for (const t of slateCells()) { const l = 236 + hash(t.k, 1, 11) * 19; wrap((dx, dy) => { g.fillStyle = grey(l); g.fillRect(t.x + dx + 2, t.y + dy, t.w - 4, t.h - 4); }); }
  },
  woodPlanks(g) {
    const h = N / plankRows;
    for (let i = 0; i < plankRows; i++) {
      g.fillStyle = grey(236 + hash(i, 0, 7) * 18); g.fillRect(0, i * h, N, h);
      g.fillStyle = grey(208); g.fillRect(0, i * h, N, 3);                                  // plank gap
      g.fillStyle = grey(212); g.fillRect((hash(i, 1, 7) * .8 + .1) * N, i * h, 3, h);       // end joint
    }
  },
  thatch(g) {
    g.fillStyle = grey(232); g.fillRect(0, 0, N, N);
    for (let i = 0; i < 140; i++) { const x = hash(i, 1, 15) * N, y = hash(i, 3, 15) * N; g.strokeStyle = grey(222 + hash(i, 2, 15) * 33); g.lineWidth = 3; wrap((dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + 4, y + dy + 30); g.stroke(); }); }
  },
  rock(g) {
    g.fillStyle = grey(240); g.fillRect(0, 0, N, N);
    const P = jgrid(3, 21);
    for (let i = 0; i < 3; i++) for (let l = 0; l < 3; l++) { const c = [P(i, l), P(i + 1, l), P(i + 1, l + 1), P(i, l + 1)]; const t = 232 + hash(i, l, 23) * 23; wrap((dx, dy) => { g.fillStyle = grey(t); g.beginPath(); c.forEach(([x, y], k) => (k ? g.lineTo : g.moveTo).call(g, x + dx, y + dy)); g.closePath(); g.fill(); }); }
    g.strokeStyle = grey(205); g.lineWidth = 2; for (const s of [31, 37]) { g.beginPath(); let x = hash(s, 1, 1) * N, y = hash(s, 2, 1) * N; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (hash(s, k, 3) - .3) * 50; y += (hash(s, k, 5) - .5) * 40; g.lineTo(x, y); } g.stroke(); }
  },
  dirt(g) {
    g.fillStyle = grey(240); g.fillRect(0, 0, N, N); softBlotches(g, 41, 6, .05);
    const P = jgrid(5, 43, .4); g.strokeStyle = grey(200); g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) for (let l = 0; l < 5; l++) for (const [a, b] of [[P(i, l), P(i + 1, l)], [P(i, l), P(i, l + 1)]]) if (hash(i, l, 47 + a[0] % 3) < .78) wrap((dx, dy) => { g.beginPath(); g.moveTo(a[0] + dx, a[1] + dy); g.lineTo(b[0] + dx, b[1] + dy); g.stroke(); });
  },
  metal(g) { const gr = g.createLinearGradient(0, 0, N, 0); [[0, 236], [.3, 255], [.5, 244], [.75, 255], [1, 236]].forEach(([o, l]) => gr.addColorStop(o, grey(l))); g.fillStyle = gr; g.fillRect(0, 0, N, N); },
  moss(g) { g.fillStyle = grey(236); g.fillRect(0, 0, N, N); softBlotches(g, 51, 14, .1); },
  water(g) { g.fillStyle = grey(232); g.fillRect(0, 0, N, N); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const y = hash(i, 1, 17) * N, x = hash(i, 2, 17) * N; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 8, x + 40, y); g.stroke(); } },
  glass(g) { g.fillStyle = grey(224); g.fillRect(0, 0, N, N); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(N * .15, N); g.lineTo(N * .45, 0); g.lineTo(N * .55, 0); g.lineTo(N * .25, N); g.fill(); },
  neon: g => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, N, N); },
};

const HEIGHT = {   // clean shapes only, white = high
  brick(g) { g.fillStyle = grey(80); g.fillRect(0, 0, N, N); for (const b of brickCells()) wrap((dx, dy) => { g.fillStyle = grey(175); roundRect(g, b.x + dx + 4, b.y + dy + 4, b.w - 8, b.h - 8, 7); g.fillStyle = grey(240); roundRect(g, b.x + dx + 9, b.y + dy + 9, b.w - 18, b.h - 18, 5); }); },
  cobble(g) { g.fillStyle = '#000'; g.fillRect(0, 0, N, N); for (const c of cobbleCells()) wrap((dx, dy) => { const cx = c.x + dx + c.s / 2, cy = c.y + dy + c.s / 2, gr = g.createRadialGradient(cx, cy, 2, cx, cy, c.s * .55); gr.addColorStop(0, grey(255)); gr.addColorStop(1, grey(110)); g.fillStyle = gr; roundRect(g, c.x + dx + 5, c.y + dy + 5, c.s - 10, c.s - 10, 16); }); },
  slate(g) { g.fillStyle = '#000'; g.fillRect(0, 0, N, N); for (const t of slateCells()) wrap((dx, dy) => { const gr = g.createLinearGradient(0, t.y + dy, 0, t.y + dy + t.h); gr.addColorStop(0, grey(110)); gr.addColorStop(1, grey(255)); g.fillStyle = gr; g.fillRect(t.x + dx + 2, t.y + dy, t.w - 4, t.h - 4); }); },
  woodPlanks(g) {
    const h = N / plankRows; g.fillStyle = grey(220); g.fillRect(0, 0, N, N);
    for (let i = 0; i < plankRows; i++) {
      g.fillStyle = '#000'; g.fillRect(0, i * h, N, 4); g.fillRect((hash(i, 1, 7) * .8 + .1) * N, i * h, 4, h);
      g.fillStyle = grey(150); for (let k = 0; k < 2; k++) g.fillRect(0, i * h + 14 + k * 26 + hash(i, k, 8) * 6, N, 2);   // a few grain grooves
    }
  },
  thatch(g) {
    g.fillStyle = grey(90); g.fillRect(0, 0, N, N);
    for (let i = 0; i < 140; i++) { const x = hash(i, 1, 15) * N, y = hash(i, 3, 15) * N; g.strokeStyle = grey(150 + hash(i, 2, 15) * 105); g.lineWidth = 4; wrap((dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + 4, y + dy + 30); g.stroke(); }); }
    for (let r = 0; r < 4; r++) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, r * N / 4 + N / 4 - 5, N, 5); }
  },
  rock(g) {
    g.fillStyle = grey(128); g.fillRect(0, 0, N, N);
    const P = jgrid(3, 21);
    for (let i = 0; i < 3; i++) for (let l = 0; l < 3; l++) {   // 9 large chisel facets, each a tilted plane
      const c = [P(i, l), P(i + 1, l), P(i + 1, l + 1), P(i, l + 1)], cx = c.reduce((a, p) => a + p[0], 0) / 4, cy = c.reduce((a, p) => a + p[1], 0) / 4, a = hash(i, l, 29) * 6.28;
      wrap((dx, dy) => { const gr = g.createLinearGradient(cx + dx - Math.cos(a) * 40, cy + dy - Math.sin(a) * 40, cx + dx + Math.cos(a) * 40, cy + dy + Math.sin(a) * 40); gr.addColorStop(0, grey(125)); gr.addColorStop(1, grey(195)); g.fillStyle = gr; g.beginPath(); c.forEach(([x, y], k) => (k ? g.lineTo : g.moveTo).call(g, x + dx, y + dy)); g.closePath(); g.fill(); });
    }
    g.strokeStyle = '#000'; g.lineWidth = 2; for (const s of [31, 37]) { g.beginPath(); let x = hash(s, 1, 1) * N, y = hash(s, 2, 1) * N; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (hash(s, k, 3) - .3) * 50; y += (hash(s, k, 5) - .5) * 40; g.lineTo(x, y); } g.stroke(); }   // two thin cracks
  },
  dirt(g) {
    g.fillStyle = grey(225); g.fillRect(0, 0, N, N);
    const P = jgrid(5, 43, .4); g.strokeStyle = '#000'; g.lineWidth = 4; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) for (let l = 0; l < 5; l++) for (const [a, b] of [[P(i, l), P(i + 1, l)], [P(i, l), P(i, l + 1)]]) if (hash(i, l, 47 + a[0] % 3) < .78) wrap((dx, dy) => { g.beginPath(); g.moveTo(a[0] + dx, a[1] + dy); g.lineTo(b[0] + dx, b[1] + dy); g.stroke(); });
  },
};
export const RELIEF_PATTERNS = Object.keys(HEIGHT);

// ---- A4 (Format v3) patterns: opt-in names, drawn the same way (calm albedo + a separate clean height drawing) --------
export const PATTERNS_V3 = ['bark', 'leaves', 'cliff', 'snow', 'mud', 'concrete', 'asphalt', 'roofTile', 'plaster', 'crystal', 'ice'];
Object.assign(TILE, {bark: 2, leaves: 3, cliff: 6, snow: 8, mud: 5, concrete: 4, asphalt: 6, roofTile: 2.5, plaster: 5, crystal: 3, ice: 6});
Object.assign(RELIEF, {bark: .7, leaves: .6, cliff: .8, snow: .25, mud: .45, concrete: .35, roofTile: .7, crystal: .6, ice: .35});
const strata = seed => { const out = []; let y = 0, k = 0; while (y < N) { const h = 18 + hash(k, 1, seed) * 30; out.push({y, h, k}); y += h; k++; } out[out.length - 1].h = N - out[out.length - 1].y; return out; };
const tiles = (rows, cols) => { const out = [], h = N / rows, w = N / cols; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({x: c * w + (r % 2) * w / 2, y: r * h, w, h, k: r * 9 + c}); return out; };
const leafBlobs = () => Array.from({length: 26}, (_, i) => ({x: hash(i, 1, 61) * N, y: hash(i, 2, 61) * N, r: 14 + hash(i, 3, 61) * 16, k: i}));
const crystalCells = () => { const P = jgrid(3, 71, .45), out = []; for (let i = 0; i < 3; i++) for (let l = 0; l < 3; l++) out.push({c: [P(i, l), P(i + 1, l), P(i + 1, l + 1), P(i, l + 1)], k: i * 3 + l}); return out; };
const crackPath = (g, s, n = 5, len = 46) => { let x = hash(s, 1, 1) * N, y = hash(s, 2, 1) * N; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < n; k++) { x += (hash(s, k, 3) - .5) * len; y += (hash(s, k, 5) - .5) * len; g.lineTo(x, y); } g.stroke(); };
const speckle = (g, seed, n, lo, hi, r = 1.6) => { for (let i = 0; i < n; i++) { g.fillStyle = grey(lo + hash(i, 3, seed) * (hi - lo)); g.fillRect(hash(i, 1, seed) * N, hash(i, 2, seed) * N, r, r); } };
Object.assign(DRAW, {
  bark(g) { g.fillStyle = grey(222); g.fillRect(0, 0, N, N); for (let i = 0; i < 9; i++) { const x = i * N / 9 + hash(i, 1, 81) * 8; g.fillStyle = grey(236 + hash(i, 2, 81) * 19); wrap((dx, dy) => { g.beginPath(); g.moveTo(x + dx, dy); g.bezierCurveTo(x + dx + 8, dy + N * .3, x + dx - 8, dy + N * .7, x + dx, dy + N); g.lineTo(x + dx + N / 9 - 6, dy + N); g.bezierCurveTo(x + dx + N / 9 - 14, dy + N * .7, x + dx + N / 9 + 2, dy + N * .3, x + dx + N / 9 - 6, dy); g.fill(); }); } },
  leaves(g) { g.fillStyle = grey(200); g.fillRect(0, 0, N, N); for (const b of leafBlobs()) wrap((dx, dy) => { g.fillStyle = grey(226 + hash(b.k, 4, 61) * 29); g.beginPath(); g.ellipse(b.x + dx, b.y + dy, b.r, b.r * .62, hash(b.k, 5, 61) * 3, 0, 7); g.fill(); }); },
  cliff(g) { for (const b of strata(91)) { g.fillStyle = grey(228 + hash(b.k, 2, 91) * 27); g.fillRect(0, b.y, N, b.h); g.fillStyle = grey(206); g.fillRect(0, b.y, N, 2); } g.strokeStyle = grey(208); g.lineWidth = 2; for (const s of [93, 97, 101]) crackPath(g, s, 3, 60); },
  snow(g) { g.fillStyle = grey(250); g.fillRect(0, 0, N, N); softBlotches(g, 111, 8, .04); },
  mud(g) { g.fillStyle = grey(236); g.fillRect(0, 0, N, N); softBlotches(g, 121, 12, .08); for (let i = 0; i < 5; i++) { const x = hash(i, 1, 123) * N, y = hash(i, 2, 123) * N; wrap((dx, dy) => { g.fillStyle = grey(214); g.beginPath(); g.ellipse(x + dx, y + dy, 18 + hash(i, 3, 123) * 14, 8, hash(i, 4, 123) * 3, 0, 7); g.fill(); }); } },
  concrete(g) { g.fillStyle = grey(240); g.fillRect(0, 0, N, N); speckle(g, 131, 900, 222, 252); g.fillStyle = grey(212); g.fillRect(0, 0, N, 2); g.fillRect(0, 0, 2, N); },
  asphalt(g) { g.fillStyle = grey(236); g.fillRect(0, 0, N, N); speckle(g, 141, 2200, 214, 255, 1.4); softBlotches(g, 143, 6, .04); },
  roofTile(g) { g.fillStyle = grey(200); g.fillRect(0, 0, N, N); for (const t of tiles(4, 4)) wrap((dx, dy) => { g.fillStyle = grey(232 + hash(t.k, 1, 151) * 23); g.beginPath(); g.moveTo(t.x + dx + 2, t.y + dy); g.lineTo(t.x + dx + t.w - 2, t.y + dy); g.lineTo(t.x + dx + t.w - 2, t.y + dy + t.h * .7); g.quadraticCurveTo(t.x + dx + t.w / 2, t.y + dy + t.h + 4, t.x + dx + 2, t.y + dy + t.h * .7); g.fill(); }); },
  plaster(g) { g.fillStyle = grey(242); g.fillRect(0, 0, N, N); softBlotches(g, 161, 12, .05); },
  crystal(g) { g.fillStyle = grey(230); g.fillRect(0, 0, N, N); for (const f of crystalCells()) wrap((dx, dy) => { g.fillStyle = grey(222 + hash(f.k, 1, 171) * 33); g.beginPath(); f.c.forEach(([x, y], k) => (k ? g.lineTo : g.moveTo).call(g, x + dx, y + dy)); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.stroke(); }); },
  ice(g) { g.fillStyle = grey(246); g.fillRect(0, 0, N, N); softBlotches(g, 181, 7, .05); g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 2; for (const s of [183, 187, 191]) crackPath(g, s, 4, 50); },
});
Object.assign(HEIGHT, {
  bark(g) { g.fillStyle = '#000'; g.fillRect(0, 0, N, N); for (let i = 0; i < 9; i++) { const x = i * N / 9 + hash(i, 1, 81) * 8; wrap((dx, dy) => { const gr = g.createLinearGradient(x + dx, 0, x + dx + N / 9, 0); gr.addColorStop(0, grey(60)); gr.addColorStop(.5, grey(255)); gr.addColorStop(1, grey(60)); g.fillStyle = gr; g.beginPath(); g.moveTo(x + dx, dy); g.bezierCurveTo(x + dx + 8, dy + N * .3, x + dx - 8, dy + N * .7, x + dx, dy + N); g.lineTo(x + dx + N / 9 - 6, dy + N); g.bezierCurveTo(x + dx + N / 9 - 14, dy + N * .7, x + dx + N / 9 + 2, dy + N * .3, x + dx + N / 9 - 6, dy); g.fill(); }); } },
  leaves(g) { g.fillStyle = '#000'; g.fillRect(0, 0, N, N); for (const b of leafBlobs()) wrap((dx, dy) => { const gr = g.createRadialGradient(b.x + dx, b.y + dy, 1, b.x + dx, b.y + dy, b.r); gr.addColorStop(0, grey(255)); gr.addColorStop(1, grey(90)); g.fillStyle = gr; g.beginPath(); g.ellipse(b.x + dx, b.y + dy, b.r, b.r * .62, hash(b.k, 5, 61) * 3, 0, 7); g.fill(); }); },
  cliff(g) { for (const b of strata(91)) { const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, grey(255)); gr.addColorStop(.85, grey(150)); gr.addColorStop(1, grey(40)); g.fillStyle = gr; g.fillRect(0, b.y, N, b.h); } g.strokeStyle = '#000'; g.lineWidth = 3; for (const s of [93, 97, 101]) crackPath(g, s, 3, 60); },
  snow(g) { g.fillStyle = grey(128); g.fillRect(0, 0, N, N); softBlotches(g, 113, 10, .5); },
  mud(g) { g.fillStyle = grey(170); g.fillRect(0, 0, N, N); softBlotches(g, 125, 10, .4); for (let i = 0; i < 5; i++) { const x = hash(i, 1, 123) * N, y = hash(i, 2, 123) * N; wrap((dx, dy) => { g.fillStyle = grey(70); g.beginPath(); g.ellipse(x + dx, y + dy, 18 + hash(i, 3, 123) * 14, 8, hash(i, 4, 123) * 3, 0, 7); g.fill(); }); } },
  concrete(g) { g.fillStyle = grey(220); g.fillRect(0, 0, N, N); g.fillStyle = '#000'; g.fillRect(0, 0, N, 3); g.fillRect(0, 0, 3, N); },
  roofTile(g) { g.fillStyle = '#000'; g.fillRect(0, 0, N, N); for (const t of tiles(4, 4)) wrap((dx, dy) => { const gr = g.createLinearGradient(0, t.y + dy, 0, t.y + dy + t.h); gr.addColorStop(0, grey(90)); gr.addColorStop(1, grey(255)); g.fillStyle = gr; g.beginPath(); g.moveTo(t.x + dx + 2, t.y + dy); g.lineTo(t.x + dx + t.w - 2, t.y + dy); g.lineTo(t.x + dx + t.w - 2, t.y + dy + t.h * .7); g.quadraticCurveTo(t.x + dx + t.w / 2, t.y + dy + t.h + 4, t.x + dx + 2, t.y + dy + t.h * .7); g.fill(); }); },
  crystal(g) { g.fillStyle = grey(128); g.fillRect(0, 0, N, N); for (const f of crystalCells()) { const cx = f.c.reduce((a, p) => a + p[0], 0) / 4, cy = f.c.reduce((a, p) => a + p[1], 0) / 4, a = hash(f.k, 2, 171) * 6.28; wrap((dx, dy) => { const gr = g.createLinearGradient(cx + dx - Math.cos(a) * 40, cy + dy - Math.sin(a) * 40, cx + dx + Math.cos(a) * 40, cy + dy + Math.sin(a) * 40); gr.addColorStop(0, grey(100)); gr.addColorStop(1, grey(230)); g.fillStyle = gr; g.beginPath(); f.c.forEach(([x, y], k) => (k ? g.lineTo : g.moveTo).call(g, x + dx, y + dy)); g.closePath(); g.fill(); }); } },
  ice(g) { g.fillStyle = grey(200); g.fillRect(0, 0, N, N); g.strokeStyle = '#000'; g.lineWidth = 3; for (const s of [183, 187, 191]) crackPath(g, s, 4, 50); },
});

// ---- pure helpers (Node-testable) ------------------------------------------------------------------------
// Wrapped binomial blur [1 4 6 4 1]/16 (σ ≈ 1), applied twice ≈ 1.4 px.
export function blurWrap(h, w, hh, passes = 2) {
  const k = [1, 4, 6, 4, 1].map(v => v / 16); let a = Float32Array.from(h), b = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -2; i <= 2; i++) s += k[i + 2] * a[y * w + ((x + i + w) % w)]; b[y * w + x] = s; }
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -2; i <= 2; i++) s += k[i + 2] * b[((y + i + hh) % hh) * w + x]; a[y * w + x] = s; }
  }
  return a;
}
// Height (0..1, row 0 = bottom / v = 0) → tangent-space normal map RGBA bytes, wrapped Sobel. Pure.
export function heightToNormal(h, w, hh, strength = 2.5) {
  const out = new Uint8Array(w * hh * 4), at = (x, y) => h[((y + hh) % hh) * w + ((x + w) % w)];
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * strength, ny = -dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4; out[i] = Math.round((nx * .5 + .5) * 255); out[i + 1] = Math.round((ny * .5 + .5) * 255); out[i + 2] = Math.round((nz * .5 + .5) * 255); out[i + 3] = 255;
  }
  return out;
}

// ---- textures --------------------------------------------------------------------------------------------
const texCache = new Map(), nrmCache = new Map();
export function patternTexture(name, size = N) {
  if (!DRAW[name]) throw Error('unknown pattern ' + name);
  const ck = size === N ? name : name + '@' + size;
  if (texCache.has(ck)) return texCache.get(ck);
  let tex = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.scale(size / N, size / N); DRAW[name](g);   // A4: hero tier draws the same vectors at 512
    tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8;   // A2: 8× keeps ground textures crisp at grazing angles (bench-checked)
  }
  texCache.set(ck, tex); return tex;
}
export function normalTexture(name, size = N) {
  if (!HEIGHT[name]) return null;
  const ck = size === N ? name : name + '@' + size;
  if (nrmCache.has(ck)) return nrmCache.get(ck);
  let tex = null;
  if (typeof document !== 'undefined') {
    const S = size, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', {willReadFrequently: true}); g.scale(S / N, S / N); HEIGHT[name](g);
    const px = g.getImageData(0, 0, S, S).data, h = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[(S - 1 - y) * S + x] = px[(y * S + x) * 4] / 255;   // flip: row 0 = v 0, matching the albedo
    tex = new T.DataTexture(heightToNormal(blurWrap(h, S, S, S === N ? 2 : 3), S, S, 2.5 * S / N), S, S, T.RGBAFormat);
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.colorSpace = T.NoColorSpace; tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true;   // A2: relief at 4× (bench-checked)
  }
  nrmCache.set(ck, tex); return tex;
}

const matCache = new Map();
// mat('brick', '#c9a27a'), mat('neon', '#ffcf6b') (emissive), mat('metal', '#d7dde6') (shiny), mat('rock', c, {vertexColors}).
export function mat(pattern = 'plastic', color = '#cccccc', {flat = false, vertexColors = false} = {}) {
  const key = `${pattern}|${color}|${flat}|${vertexColors}`; if (matCache.has(key)) return matCache.get(key);
  const map = pattern === 'plastic' || pattern === 'neon' ? null : patternTexture(pattern);
  const shiny = {glass: [90, '#888888'], water: [70, '#888888'], metal: [80, '#bbbbbb']}[pattern] ?? [22, '#2a2a2a'];
  const m = new T.MeshPhongMaterial({color, map, shininess: shiny[0], specular: shiny[1], flatShading: flat, vertexColors});
  const nm = normalTexture(pattern); if (nm) { m.normalMap = nm; m.normalScale = new T.Vector2(RELIEF[pattern], RELIEF[pattern]); }
  if (pattern === 'neon') { m.emissive = new T.Color(color); m.emissiveIntensity = 1.1; }
  m.userData.pattern = pattern; m.name = key; matCache.set(key, m); return m;
}
export const tileOf = m => TILE[m?.userData?.pattern] ?? 4;
export const textureCounts = () => ({albedo: PATTERNS.filter(k => k !== 'plastic' && k !== 'neon').length, normal: RELIEF_PATTERNS.length});   // the v2 ("Nobody") set
export const textureCountsV3 = () => ({albedo: Object.keys(DRAW).filter(k => k !== 'plastic' && k !== 'neon').length, normal: Object.keys(HEIGHT).length});

// ---- A4 environment materials (hero-tier ENVIRONMENT only; avatars keep Phong) -----------------------------------
// One small generated environment map (engine/look.js v3 sets it before the world builds). std() = MeshStandardMaterial
// with the pattern at 512 px (hero) or 256, its normal map, roughness by pattern, a little env reflection.
export const ENV = {map: null, intensity: .45};
export const setEnvMap = (tex, intensity = .45) => { ENV.map = tex; ENV.intensity = intensity; };
const ROUGH = {glass: .15, water: .1, metal: .35, ice: .2, crystal: .25, snow: .7, asphalt: .9, concrete: .85};
const stdCache = new Map();
export function std(pattern = 'plastic', color = '#cccccc', {hero = true, flat = false, vertexColors = false, emissive = null} = {}) {
  const key = `${pattern}|${color}|${hero}|${flat}|${vertexColors}|${emissive}`; if (stdCache.has(key)) return stdCache.get(key);
  const size = hero ? 512 : N, map = pattern === 'plastic' || pattern === 'neon' ? null : patternTexture(pattern, size);
  const m = new T.MeshStandardMaterial({color, map, roughness: ROUGH[pattern] ?? .82, metalness: pattern === 'metal' ? .5 : 0, flatShading: flat, vertexColors,
    envMap: ENV.map, envMapIntensity: ENV.intensity});
  const nm = normalTexture(pattern, size); if (nm) { m.normalMap = nm; m.normalScale = new T.Vector2(RELIEF[pattern], RELIEF[pattern]); }
  if (pattern === 'neon' || emissive) { m.emissive = new T.Color(emissive ?? color); m.emissiveIntensity = 1.1; }
  m.userData.pattern = pattern; m.name = 'std:' + key; stdCache.set(key, m); return m;
}
// Terrain splat material: three layers [{pattern, color, tile}] mixed by the geometry's `splat` attribute (terrain.js),
// albedo AND normal maps blended, plus a low-frequency macro tone so big slopes never show the tile repeat.
let flatN = null;
const flatNormal = () => { if (!flatN) { flatN = new T.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); flatN.needsUpdate = true; } return flatN; };
export function splatMaterial(layers, {baseTile = 8, standard = true, macro = .12} = {}) {
  const L = layers.map(l => ({...l, tex: l.pattern === 'plastic' ? patternTexture('snow', 512) : patternTexture(l.pattern, 512), nrm: normalTexture(l.pattern, 512) ?? flatNormal(),
    k: RELIEF[l.pattern] ?? 0, rep: baseTile / (l.tile ?? TILE[l.pattern] ?? 4)}));
  const Mat = standard ? T.MeshStandardMaterial : T.MeshPhongMaterial;
  const m = new Mat(standard ? {color: '#ffffff', map: L[0].tex, normalMap: L[0].nrm, roughness: .9, metalness: 0, envMap: ENV.map, envMapIntensity: ENV.intensity * .6}
    : {color: '#ffffff', map: L[0].tex, normalMap: L[0].nrm, shininess: 8, specular: '#111111'});
  m.onBeforeCompile = sh => {
    L.forEach((l, i) => { sh.uniforms['sT' + i] = {value: l.tex}; sh.uniforms['sN' + i] = {value: l.nrm}; sh.uniforms['sC' + i] = {value: new T.Color(l.color)}; sh.uniforms['sR' + i] = {value: l.rep}; sh.uniforms['sK' + i] = {value: l.k}; });
    sh.uniforms.sMacro = {value: macro};
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 splat; varying vec3 vSplat;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvSplat = splat;');
    const U = [0, 1, 2].map(i => `uniform sampler2D sT${i}; uniform sampler2D sN${i}; uniform vec3 sC${i}; uniform float sR${i}; uniform float sK${i};`).join('\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vSplat; uniform float sMacro;\n${U}`)
      .replace('#include <map_fragment>', `vec3 sw = vSplat / max(1e-4, vSplat.x + vSplat.y + vSplat.z);
        vec3 alb = texture2D(sT0, vMapUv * sR0).rgb * sC0 * sw.x + texture2D(sT1, vMapUv * sR1).rgb * sC1 * sw.y + texture2D(sT2, vMapUv * sR2).rgb * sC2 * sw.z;
        float mac = texture2D(sT0, vMapUv * .061).g * .6 + texture2D(sT1, vMapUv * .023).g * .4;
        diffuseColor.rgb *= alb * (1. - sMacro + sMacro * 2. * mac);`)
      .replace('#include <normal_fragment_maps>', `vec3 n0 = texture2D(sN0, vNormalMapUv * sR0).xyz * 2. - 1.; n0.xy *= sK0;
        vec3 n1 = texture2D(sN1, vNormalMapUv * sR1).xyz * 2. - 1.; n1.xy *= sK1;
        vec3 n2 = texture2D(sN2, vNormalMapUv * sR2).xyz * 2. - 1.; n2.xy *= sK2;
        vec3 mapN = normalize(n0 * sw.x + n1 * sw.y + n2 * sw.z);
        normal = normalize(tbn * mapN);`);
  };
  m.customProgramCacheKey = () => 'splat3';
  m.userData.pattern = 'splat'; m.userData.layers = layers; m.name = 'splat:' + layers.map(l => l.pattern + l.color).join(',');
  return m;
}
