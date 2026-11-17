// parts/sets4/boxart.js — format v5 Phase 3b-R: one 1024 px box-art atlas, 16 invented toy packaging designs (4 × 4 cells of
// 256 px). Bold shapes, invented names drawn with a 5×7 pixel font; no real brands, no logos of anyone. Colours are muted
// (environment: HSL S ≤ .45) so the story props stay the most saturated thing on screen. Pure and deterministic (Node-testable);
// scripts/v2/tex4.js writes it to renders/cache/tex4/boxart-1024.bin, the browser loads that (or generates it once).
//   boxArt(n = 1024) → Uint8Array RGBA · BOX_NAMES · cellUV(i, face) → [u0, v0, u1, v1] (front = whole cell, side = the plain top strip)
import {hexOf} from './look5.js';

export const BOX_NAMES = ['ZOOMKA', 'BLORP', 'MEGA MOO', 'STAX', 'SKY DASH', 'GLOOP', 'TOTO TRUCK', 'BEEP BOT', 'SNUGGLY', 'FIZZ POP', 'DINO STOMP', 'COSMO CUB', 'WOBBLE', 'TURBO TOAD', 'PIXIE PUFF', 'YIPPY YAK'];
export const ART_SIZE = 1024, CELLS = 4, STRIP = 22;   // STRIP px at the top of every cell is plain background (box sides map there)
const G = {   // 5×7 pixel font (rows top → bottom)
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'], C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'], E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'], K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'], N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'], O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'], Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'], U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'], W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'], X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'], ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};
const rnd = s => { let x = s >>> 0 || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296; };
// muted palette per design: background, shape, band (all S ≤ .45), text off-white or deep
export function designColours(i) {
  const h = (i * 137.5 + 20) % 360, r = rnd(i + 3);
  return {bg: hexOf([h, .34 + r() * .1, .58 + r() * .08]), shape: hexOf([(h + 150 + r() * 60) % 360, .38 + r() * .06, .66 + r() * .06]), band: hexOf([(h + 20) % 360, .3 + r() * .1, .3 + r() * .06]), ink: '#f4efe6', deep: hexOf([h, .3, .2])};
}
const rgb = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
export function textWidth(s, scale) { return s.length * 6 * scale - scale; }
export function boxArt(n = ART_SIZE) {
  const out = new Uint8Array(n * n * 4), C = n / CELLS, k = C / 256;
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= n || y >= n) return; const i = (y * n + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; };
  for (let i = 0; i < 16; i++) {
    const cx = (i % CELLS) * C, cy = Math.floor(i / CELLS) * C, col = designColours(i), bg = rgb(col.bg), sh = rgb(col.shape), band = rgb(col.band), ink = rgb(col.ink), deep = rgb(col.deep), r = rnd(i * 31 + 7), kind = i % 6;
    const S = (u, v) => {   // design pixel: u, v in cell px (0..255), v = 0 at the top
      if (v < STRIP) return bg;
      if (u < 6 || u > 249 || v > 249) return band;   // frame
      if (v >= 190) return band;                       // name band
      const x = (u - 128) / 64, y = (v - 105) / 64;     // shape space
      if (kind === 0) return Math.hypot(x, y) < 1 ? (Math.hypot(x + .3, y + .3) < .35 ? ink : sh) : bg;                         // big ball + shine
      if (kind === 1) { const a = Math.atan2(y, x), rr = Math.hypot(x, y), star = .55 + .45 * Math.cos(a * 5); return rr < star ? sh : bg; }   // star
      if (kind === 2) return (Math.floor((u + v) / 24) % 2 ? sh : bg);                                                         // diagonal stripes
      if (kind === 3) return y > -.9 && y < .9 && Math.abs(x) < 1.1 - (y + .9) * .55 ? sh : (Math.abs(x) < .25 && y > .6 ? deep : bg);   // rocket-ish triangle
      if (kind === 4) { const blob = Math.hypot(x * 1.1, y * 1.3) < .8 + .12 * Math.sin(Math.atan2(y, x) * 6); const eye = Math.hypot(x + .3, y + .1) < .14 || Math.hypot(x - .3, y + .1) < .14; return eye ? deep : blob ? sh : bg; }   // plush blob face
      return (Math.abs(y - .25 * Math.sin(x * 4)) < .28 ? sh : Math.abs(y + .7) < .08 ? ink : bg);                          // zigzag wave
    };
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) put(cx + x, cy + y, S(Math.floor(x / k), Math.floor(y / k)));
    // the name in the band (pixel font, centred), a corner badge
    const name = BOX_NAMES[i], sc = Math.max(2, Math.min(5, Math.floor(232 / (name.length * 6)))) * k, tw = textWidth(name, sc), tx = cx + Math.round((C - tw) / 2), ty = cy + Math.round(220 * k - 3.5 * sc);
    [...name].forEach((ch, j) => (G[ch] ?? G[' ']).forEach((row, gy) => [...row].forEach((p, gx) => { if (p !== '#') return; for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) put(tx + j * 6 * sc + gx * sc + a, ty + gy * sc + b, ink); })));
    const bx = cx + Math.round(20 * k), by = cy + Math.round(32 * k), br = Math.round(14 * k); for (let y = -br; y <= br; y++) for (let x = -br; x <= br; x++) if (x * x + y * y <= br * br) put(bx + x, by + y, ink);
  }
  return out;
}
// UV rects (three's v = 0 at the bottom of the image: the atlas rows are written top-down, flipY handled by the loader)
export function cellUV(i, face = 'front') {
  const u0 = (i % CELLS) / CELLS, top = Math.floor(i / CELLS) / CELLS, s = 1 / CELLS, pad = .004;
  if (face === 'front') return [u0 + pad, 1 - top - s + pad, u0 + s - pad, 1 - top - pad];
  const st = STRIP / 256 * s; return [u0 + .2 * s, 1 - top - st + pad * .5, u0 + .8 * s, 1 - top - pad * .5];   // plain background strip
}
// ---- browser: the atlas as a texture (disk cache renders/cache/tex4/boxart-1024.bin, else generated once) ----------------------
import * as T from 'three';
let artTex = null;
export function flipRows(b, n) { const o = new Uint8Array(b.length), row = n * 4; for (let y = 0; y < n; y++) o.set(b.subarray(y * row, (y + 1) * row), (n - 1 - y) * row); return o; }
export async function loadBoxArt(base) {
  if (artTex) return artTex; let buf = null;
  try { const r = await fetch(new URL(`renders/cache/tex4/boxart-${ART_SIZE}.bin`, base)); if (r.ok) buf = new Uint8Array(await r.arrayBuffer()); } catch {}
  if (!buf || buf.length !== ART_SIZE * ART_SIZE * 4) buf = boxArt();
  artTex = new T.DataTexture(flipRows(buf, ART_SIZE), ART_SIZE, ART_SIZE, T.RGBAFormat); artTex.colorSpace = T.SRGBColorSpace; artTex.magFilter = T.LinearFilter; artTex.minFilter = T.LinearMipmapLinearFilter;
  artTex.generateMipmaps = true; artTex.anisotropy = 1;   /* software rasteriser: anisotropic taps cost ~0.5 s a frame on a full aisle */ artTex.needsUpdate = true; return artTex;
}
export const boxArtTexture = () => artTex;
