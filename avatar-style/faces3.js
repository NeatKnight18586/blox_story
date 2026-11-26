// avatar-style/faces3.js — Faces v3 (owner, 2026-11-14): modular hand-inked faces of our own design, in the style of the
// owner's references (docs/season1/refs/faces; style only, nothing traced or sampled). A face = brows + eyes + mouth +
// extras. Every part is a pure draw list of filled shapes (SVG path strings in canvas pixels → Path2D): strokes are never
// constant-width lines but filled bodies that swell mid-stroke and taper to points, with a slight overshoot.
//   faceParts(spec, opts) → [{d, fill, rule, ink}]  (pure; Node-testable)   ·   faceMaterial3(name, tier, skin) (browser)
//   setFace3(actor, name) · resolveFace(name) · faceError(name, build) · blinkClosed(seed, t, o) · darkSkin / contrast
// Units: face units, x ∈ [−.5, .5], y ∈ [−.34, .34] up (the faces2.js decal: 1.0 × 0.68 on the head front).
import {framesFor} from '../engine/fpsframes.js';
import * as T from 'three';
import {decalGeometry} from './faces2.js';

export const W = 1.0, H = .68;
export const INK = '#111318', WHITE = '#ffffff', MOUTH = '#5a1f2a', TONGUE = '#ff6b81', TEETH = '#ffffff', BLUSH = '#ff8fa3', WATER = '#4fb6ff', LIP = '#c2485f',
  HEART = '#ff3b5c', STAR = '#ffd23f', EDGE = '#f7ead9';
export const TIER_PX = {hero: 1024, mid: 512, crowd: 128, bg: 128};
// Placement grid (PROGRESS.md style table): eye line, eye half-spacing, brow line, mouth line, main stroke.
export const GRID = {eyeY: .06, eyeX: .21, browY: .21, mouthY: -.17, stroke: .058,
  ek: 1.25, mkx: 1.3, mky: 1.1, bk: 1.15, wobble: .05};   // pass 1: bigger parts, scaled about each part's own centre; a small hand-drawn tilt per side

// ---- geometry helpers (pure) -------------------------------------------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
export function quad(p0, c, p1, n = 18) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); } return o; }
export function cubic(p0, c1, c2, p1, n = 24) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k])); } return o; }
export function arc(cx, cy, rx, ry, a0, a1, n = 24) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; }
export function spiral(cx, cy, r, turns = 2.2, n = 60) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * 2 * Math.PI; o.push([cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t]); } return o; }
// A tapered ink stroke along points: half-width w/2 · sin(πt)^0.6 (pointed ends), ends extended by `over` × length (overshoot).
export function taper(pts, w, {over = .04, min = .12} = {}) {
  const P = pts.slice(), L = P.length; if (L < 2) return [];
  const ext = (a, b, k) => [a[0] + (a[0] - b[0]) * k, a[1] + (a[1] - b[1]) * k];
  let len = 0; for (let i = 1; i < L; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const seg0 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) || 1, segN = Math.hypot(P[L - 1][0] - P[L - 2][0], P[L - 1][1] - P[L - 2][1]) || 1;
  P[0] = ext(P[0], P[1], over * len / seg0); P[L - 1] = ext(P[L - 1], P[L - 2], over * len / segN);
  const left = [], right = []; let acc = 0;
  for (let i = 0; i < L; i++) {
    if (i) acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const a = P[Math.max(0, i - 1)], b = P[Math.min(L - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
    const t = acc / (len * (1 + 2 * over) || 1) + over / (1 + 2 * over), hw = w / 2 * Math.max(min, Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t))), .45));
    left.push([P[i][0] + nx * hw, P[i][1] + ny * hw]); right.push([P[i][0] - nx * hw, P[i][1] - ny * hw]);
  }
  return [...left, ...right.reverse()];
}
// An outline ring of varying thickness (thicker at the bottom than the top: the inked look) around an ellipse.
export function ring(cx, cy, rx, ry, wTop, wBot, n = 40) {
  const out = [], inn = [];
  for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI, s = Math.sin(a), w = lerp(wBot, wTop, (s + 1) / 2) / 2;
    out.push([cx + Math.cos(a) * (rx + w), cy + s * (ry + w)]); inn.push([cx + Math.cos(a) * (rx - w), cy + s * (ry - w)]); }
  return {outer: out, inner: inn.reverse()};
}
export const ellipsePts = (cx, cy, rx, ry, n = 32) => arc(cx, cy, rx, ry, 0, 2 * Math.PI, n);

// ---- part builders: each returns [{pts | rings, fill, ink?, lash?, hi?}] in face units -------------------------------------
const S = GRID.stroke;
export const shape = (pts, fill, o = {}) => ({pts, fill, ...o});
export const stroke = (pts, w = S, o = {}) => shape(taper(pts, w, o), o.fill ?? INK, {ink: true, ...o});
export const outlined = (pts, fill, w = S * .7, o = {}) => { const r = []; r.push(shape(pts, fill, o)); r.push(shape(closedTaper(pts, w), INK, {ink: true})); return r; };
// a closed outline as one filled band (constant-ish but slightly heavier along the bottom)
export function closedTaper(pts, w) {
  const L = pts.length, out = [], inn = [];
  let cy = 0; for (const p of pts) cy += p[1]; cy /= L; let lo = Infinity, hi = -Infinity; for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  let cx = 0; for (const p of pts) cx += p[0]; cx /= L;
  for (let i = 0; i < L; i++) { const a = pts[(i - 1 + L) % L], b = pts[(i + 1) % L], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
    let nx = dy / dl, ny = -dx / dl; const p = pts[i]; if ((p[0] - cx) * nx + (p[1] - cy) * ny < 0) { nx = -nx; ny = -ny; }
    const k = hi > lo ? (hi - p[1]) / (hi - lo) : .5, hw = w / 2 * (.75 + .5 * k);
    out.push([p[0] + nx * hw, p[1] + ny * hw]); inn.push([p[0] - nx * hw, p[1] - ny * hw]); }
  return {outer: out, inner: inn.reverse()};
}
export const sym = (fn) => [...fn(-1), ...fn(1)];   // build both sides; s = −1 left (viewer's left), +1 right

export const BROWS = {
  none: () => [],
  soft: g => sym(s => [stroke(quad([s * (g.eyeX - .08), g.browY - .005], [s * g.eyeX, g.browY + .025], [s * (g.eyeX + .08), g.browY - .005]), S * .7)]),
  thick: g => sym(s => [stroke(quad([s * (g.eyeX - .1), g.browY - .01], [s * g.eyeX, g.browY + .03], [s * (g.eyeX + .1), g.browY]), S * 1.6, {min: .3})]),
  raised: g => sym(s => [stroke(quad([s * (g.eyeX - .09), g.browY + .03], [s * g.eyeX, g.browY + .09], [s * (g.eyeX + .09), g.browY + .03]), S * .9)]),
  'one-up': g => [stroke(quad([-(g.eyeX + .09), g.browY - .01], [-g.eyeX, g.browY + .02], [-(g.eyeX - .09), g.browY - .01]), S * .9),
    stroke(quad([g.eyeX - .09, g.browY + .03], [g.eyeX, g.browY + .1], [g.eyeX + .09, g.browY + .05]), S * .9)],
  worried: g => sym(s => [stroke(quad([s * (g.eyeX - .1), g.browY + .05], [s * (g.eyeX - .01), g.browY + .03], [s * (g.eyeX + .09), g.browY - .03]), S * .9)]),
  'angry-V': g => sym(s => [stroke(quad([s * (g.eyeX - .1), g.browY - .05], [s * g.eyeX, g.browY - .01], [s * (g.eyeX + .1), g.browY + .04]), S * 1.3, {min: .25})]),
  flat: g => sym(s => [stroke([[s * (g.eyeX - .09), g.browY], [s * (g.eyeX + .09), g.browY]], S * 1.0, {min: .3})]),
  sad: g => sym(s => [stroke(quad([s * (g.eyeX - .09), g.browY + .04], [s * (g.eyeX + .02), g.browY + .035], [s * (g.eyeX + .1), g.browY - .025]), S * .8)]),
  'lash-brow': g => sym(s => [stroke(quad([s * (g.eyeX - .09), g.browY + .01], [s * (g.eyeX + .01), g.browY + .05], [s * (g.eyeX + .11), g.browY + .015]), S * .55)]),
};

// highlight helper (dropped at crowd tier)
export const hi = (x, y, r) => shape(ellipsePts(x, y, r, r, 14), WHITE, {hi: true});
export const sclera = (x, y, rx, ry, wT = S * .9, wB = S * .55) => { const rg = ring(x, y, rx, ry, wT, wB); return [shape(ellipsePts(x, y, rx, ry), WHITE, {sclera: true}), shape(rg, INK, {ink: true})]; };
export const EYES = {
  dot: g => sym(s => [shape(ellipsePts(s * g.eyeX, g.eyeY, .055, .068), INK, {ink: true, eye: true}), hi(s * g.eyeX + .016, g.eyeY + .026, .016)]),
  oval: g => sym(s => [shape(ellipsePts(s * g.eyeX, g.eyeY, .056, .085), INK, {ink: true, eye: true}), hi(s * g.eyeX + .018, g.eyeY + .035, .019)]),
  glossy: g => sym(s => [shape(ellipsePts(s * g.eyeX, g.eyeY, .085, .105), INK, {ink: true, eye: true}), shape(ellipsePts(s * g.eyeX, g.eyeY - .03, .065, .055), '#4a4478', {ink: true}),
    hi(s * g.eyeX - .028, g.eyeY + .038, .04), hi(s * g.eyeX + .036, g.eyeY - .046, .02)]),
  lashed: g => sym(s => [...sclera(s * g.eyeX, g.eyeY, .082, .068, S * 1.6, S * .4), shape(ellipsePts(s * g.eyeX, g.eyeY - .006, .045, .056), INK, {ink: true, eye: true}),
    hi(s * g.eyeX - .016, g.eyeY + .02, .018), hi(s * g.eyeX + .018, g.eyeY - .022, .009),
    ...[0, 1, 2].map(k => { const a = (.25 + k * .22) * Math.PI / 2, x0 = s * (g.eyeX + Math.cos(a) * .08), y0 = g.eyeY + Math.sin(a) * .066, dx = s * Math.cos(a - .25), dy = Math.sin(a - .25) + .35;
      return stroke(quad([x0, y0], [x0 + dx * .035, y0 + dy * .03], [x0 + dx * .065 + s * .012, y0 + dy * .045]), S * .85, {lash: true, min: .25}); })]),
  'half-lid': g => sym(s => [shape([...arc(s * g.eyeX, g.eyeY, .075, .06, Math.PI, 2 * Math.PI)], WHITE, {sclera: true}), shape(arc(s * g.eyeX + s * .01, g.eyeY - .005, .038, .045, Math.PI, 2 * Math.PI), INK, {ink: true, eye: true}),
    stroke([[s * g.eyeX - .088, g.eyeY], [s * g.eyeX + .088, g.eyeY + .004]], S * 1.15, {min: .35}), stroke(arc(s * g.eyeX, g.eyeY, .075, .06, Math.PI * 1.05, Math.PI * 1.95), S * .55)]),
  'heavy-lid': g => sym(s => [shape(arc(s * g.eyeX, g.eyeY - .01, .075, .045, Math.PI, 2 * Math.PI), WHITE, {sclera: true}), shape(arc(s * g.eyeX + s * .012, g.eyeY - .014, .034, .035, Math.PI, 2 * Math.PI), INK, {ink: true, eye: true}),
    stroke([[s * g.eyeX - .09 * s, g.eyeY - .006], [s * g.eyeX + .09 * s, g.eyeY - .022]], S * 1.25, {min: .4}), stroke(arc(s * g.eyeX, g.eyeY - .01, .075, .045, Math.PI * 1.08, Math.PI * 1.92), S * .5)]),
  'happy ^': g => sym(s => [stroke(quad([s * g.eyeX - .07, g.eyeY - .025], [s * g.eyeX, g.eyeY + .085], [s * g.eyeX + .07, g.eyeY - .025]), S * 1.1, {eye: true})]),
  'closed-down': g => sym(s => [stroke(quad([s * g.eyeX - .07, g.eyeY + .02], [s * g.eyeX, g.eyeY - .07], [s * g.eyeX + .07, g.eyeY + .02]), S * 1.05, {eye: true})]),
  squeeze: g => sym(s => [stroke([[s * (g.eyeX + .06), g.eyeY + .05], [s * (g.eyeX - .05), g.eyeY], [s * (g.eyeX + .06), g.eyeY - .05]], S * 1.1, {eye: true, min: .25})]),
  x: g => sym(s => [stroke([[s * g.eyeX - .055, g.eyeY + .055], [s * g.eyeX + .055, g.eyeY - .055]], S, {eye: true}), stroke([[s * g.eyeX - .055, g.eyeY - .055], [s * g.eyeX + .055, g.eyeY + .055]], S)]),
  spiral: g => sym(s => [stroke(spiral(s * g.eyeX, g.eyeY, .085, 2.0, 80).map(([x, y]) => [s < 0 ? 2 * s * g.eyeX - x : x, y]), S * .45, {eye: true, min: .3})]),
  heart: g => sym(s => { const c = [s * g.eyeX, g.eyeY], k = .085, p = [...cubic([c[0], c[1] - k * .9], [c[0] - k * 1.3, c[1] - k * .1], [c[0] - k * .9, c[1] + k * 1.0], [c[0], c[1] + k * .35]),
    ...cubic([c[0], c[1] + k * .35], [c[0] + k * .9, c[1] + k * 1.0], [c[0] + k * 1.3, c[1] - k * .1], [c[0], c[1] - k * .9])]; return [...outlined(p, HEART, S * .6, {eye: true}), hi(c[0] - .03, c[1] + .035, .016)]; }),
  star: g => sym(s => { const c = [s * g.eyeX, g.eyeY], p = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .04 : .095; p.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
    return [...outlined(p, STAR, S * .55, {eye: true}), hi(c[0] - .02, c[1] + .02, .013)]; }),
  goggle: g => sym(s => [...sclera(s * g.eyeX, g.eyeY, .105, .118, S * .8, S * .5), shape(ellipsePts(s * g.eyeX + s * .01, g.eyeY - .01, .03, .034), INK, {ink: true, eye: true}), hi(s * g.eyeX, g.eyeY + .005, .011)]),
  pinpoint: g => sym(s => [...sclera(s * g.eyeX, g.eyeY, .09, .1, S * .75, S * .45), shape(ellipsePts(s * g.eyeX, g.eyeY, .016, .018), INK, {ink: true, eye: true}),
    stroke(arc(s * g.eyeX, g.eyeY, .135, .14, s < 0 ? Math.PI * .8 : -Math.PI * .2, s < 0 ? Math.PI * 1.2 : Math.PI * .2, 8), S * .45)]),
  square: g => sym(s => [shape([[s * g.eyeX - .045, g.eyeY - .045], [s * g.eyeX + .045, g.eyeY - .045], [s * g.eyeX + .045, g.eyeY + .045], [s * g.eyeX - .045, g.eyeY + .045]], INK, {ink: true, eye: true})]),
  narrow: g => sym(s => [stroke(quad([s * g.eyeX - .075, g.eyeY - .005], [s * g.eyeX, g.eyeY + .03], [s * g.eyeX + .075, g.eyeY - .01]), S * 1.35, {eye: true, min: .3})]),
  'closed-line': g => sym(s => [stroke([[s * g.eyeX - .065, g.eyeY - .005], [s * g.eyeX + .065, g.eyeY - .005]], S * .95, {eye: true})]),
};

// open-mouth helper: interior + optional tongue and teeth + inked outline
export function openMouth(pts, {tongue = null, teethTop = null, teethBot = null, w = S * .85} = {}) {
  const out = [shape(pts, MOUTH)];
  if (tongue) out.push(shape(tongue, TONGUE, {clip: pts}));
  if (teethTop) out.push(shape(teethTop, TEETH, {clip: pts}));
  if (teethBot) out.push(shape(teethBot, TEETH, {clip: pts}));
  out.push(shape(closedTaper(pts, w), INK, {ink: true})); return out;
}
const M = GRID;
export const MOUTHS = {
  'small smile': g => [stroke(quad([-.07, g.mouthY + .02], [0, g.mouthY - .045], [.07, g.mouthY + .02]), S, {mouth: true})],
  smile: g => [stroke(quad([-.14, g.mouthY + .04], [0, g.mouthY - .08], [.14, g.mouthY + .04]), S * 1.1, {mouth: true})],
  'big open smile': g => openMouth([...quad([-.16, g.mouthY + .05], [0, g.mouthY + .02], [.16, g.mouthY + .05], 10), ...quad([.16, g.mouthY + .05], [0, g.mouthY - .2], [-.16, g.mouthY + .05], 16)],
    {tongue: ellipsePts(0, g.mouthY - .1, .085, .05)}),
  'grin teeth': g => openMouth([...quad([-.2, g.mouthY + .05], [0, g.mouthY + .01], [.2, g.mouthY + .05], 10), ...quad([.2, g.mouthY + .05], [0, g.mouthY - .17], [-.2, g.mouthY + .05], 16)],
    {teethTop: [[-.21, g.mouthY + .06], [.21, g.mouthY + .06], [.21, g.mouthY - .015], [-.21, g.mouthY - .015]], teethBot: [[-.21, g.mouthY - .07], [.21, g.mouthY - .07], [.21, g.mouthY - .2], [-.21, g.mouthY - .2]]}),
  'V smile': g => [stroke(cubic([-.13, g.mouthY + .12], [-.09, g.mouthY - .12], [.09, g.mouthY - .12], [.13, g.mouthY + .12]), S * 1.9, {mouth: true, min: .3})],
  flat: g => [stroke([[-.11, g.mouthY], [-.03, g.mouthY + .005], [.04, g.mouthY + .002], [.11, g.mouthY - .004]], S * .95, {mouth: true, min: .5, over: .02})],
  o: g => openMouth(ellipsePts(0, g.mouthY - .02, .048, .066)),
  'small o': g => openMouth(ellipsePts(0, g.mouthY, .028, .036), {w: S * .7}),
  wavy: g => [stroke(Array.from({length: 33}, (_, i) => [-.16 + i * .01, g.mouthY + Math.sin(i / 32 * Math.PI * 5) * .025]), S * .95, {mouth: true, min: .25})],
  ':3': g => [stroke([...arc(-.035, g.mouthY + .01, .035, .03, Math.PI, 2 * Math.PI, 10), ...arc(.035, g.mouthY + .01, .035, .03, Math.PI, 2 * Math.PI, 10)], S * .8, {mouth: true})],
  w: g => [stroke([[-.09, g.mouthY + .03], [-.045, g.mouthY - .03], [0, g.mouthY + .01], [.045, g.mouthY - .03], [.09, g.mouthY + .03]], S * .85, {mouth: true, min: .25})],
  kiss: g => [stroke([...arc(.0, g.mouthY + .027, .036, .027, Math.PI * .55, -Math.PI * .5, 10), ...arc(.0, g.mouthY - .027, .036, .027, Math.PI * .5, -Math.PI * .55, 10)], S * .85, {mouth: true, min: .25})],
  frown: g => [stroke(quad([-.12, g.mouthY - .04], [0, g.mouthY + .06], [.12, g.mouthY - .04]), S * 1.05, {mouth: true})],
  shout: g => openMouth([...quad([-.14, g.mouthY + .04], [0, g.mouthY + .08], [.14, g.mouthY + .04], 10), ...quad([.14, g.mouthY + .04], [0, g.mouthY - .22], [-.14, g.mouthY + .04], 16)],
    {tongue: ellipsePts(0, g.mouthY - .12, .095, .06)}),
  scream: g => openMouth(ellipsePts(0, g.mouthY - .005, .1, .108), {teethTop: [[-.11, g.mouthY + .115], [.11, g.mouthY + .115], [.11, g.mouthY + .075], [-.11, g.mouthY + .075]], teethBot: [[-.11, g.mouthY - .083], [.11, g.mouthY - .083], [.11, g.mouthY - .125], [-.11, g.mouthY - .125]], tongue: ellipsePts(0, g.mouthY - .075, .065, .033)}),
  'shark teeth': g => { const p = [...quad([-.195, g.mouthY + .06], [0, g.mouthY + .02], [.195, g.mouthY + .06], 10), ...quad([.195, g.mouthY + .06], [0, g.mouthY - .2], [-.195, g.mouthY + .06], 16)], r = [shape(p, MOUTH)];
    for (let k = 0; k < 7; k++) { const x = -.162 + k * .054; r.push(shape([[x - .028, g.mouthY + .06], [x + .028, g.mouthY + .06], [x, g.mouthY - .02]], TEETH, {clip: p})); r.push(shape([[x - .025, g.mouthY - .17], [x + .025, g.mouthY - .17], [x, g.mouthY - .08]], TEETH, {clip: p})); }
    r.push(shape(closedTaper(p, S * .85), INK, {ink: true})); return r; },
  smirk: g => [stroke(cubic([-.1, g.mouthY - .01], [-.02, g.mouthY - .03], [.06, g.mouthY - .02], [.13, g.mouthY + .05]), S * 1.05, {mouth: true})],
  squiggle: g => [stroke([[-.12, g.mouthY], [-.07, g.mouthY + .025], [-.03, g.mouthY - .02], [.02, g.mouthY + .02], [.06, g.mouthY - .025], [.11, g.mouthY + .01]], S * .85, {mouth: true, min: .25})],
  rectangle: g => openMouth([[-.11, g.mouthY + .04], [.11, g.mouthY + .04], [.11, g.mouthY - .04], [-.11, g.mouthY - .04]], {w: S * .8}),
  'tongue-out': g => [...openMouth([...quad([-.07, g.mouthY - .02], [0, g.mouthY - .1], [.07, g.mouthY - .02], 10), ...quad([.07, g.mouthY - .02], [0, g.mouthY - .14], [-.07, g.mouthY - .02], 8)].concat([]), {}).slice(0, 0),
    shape(ellipsePts(.0, g.mouthY - .055, .05, .055), TONGUE), shape(closedTaper(ellipsePts(.0, g.mouthY - .055, .05, .055), S * .6), INK, {ink: true}),
    stroke(quad([-.13, g.mouthY + .03], [0, g.mouthY - .05], [.13, g.mouthY + .03]), S * 1.05, {mouth: true})],
};

export const EXTRAS = {
  'blush ellipse': g => sym(s => [shape(ellipsePts(s * (g.eyeX + .07), g.eyeY - .135, .095, .048), BLUSH, {alpha: .55})]),
  'blush lines': g => sym(s => [0, 1, 2, 3].map(k => stroke([[s * (g.eyeX - .02 + k * .036), g.eyeY - .105], [s * (g.eyeX - .045 + k * .036), g.eyeY - .17]], S * .62, {fill: '#ff5a7a', min: .3}))),
  'sweat drop': g => { const c = [.4, g.eyeY + .12], k = 1.45, p = [...cubic([c[0], c[1] + .07 * k], [c[0] + .05 * k, c[1] - .005 * k], [c[0] + .045 * k, c[1] - .06 * k], [c[0], c[1] - .06 * k]), ...cubic([c[0], c[1] - .06 * k], [c[0] - .045 * k, c[1] - .06 * k], [c[0] - .05 * k, c[1] - .005 * k], [c[0], c[1] + .07 * k])];
    return [...outlined(p, WATER, S * .45), hi(c[0] - .012, c[1] - .018, .012)]; },
  'tear streams': g => sym(s => { const x = s * g.eyeX, p = [[x - .03, g.eyeY - .06], [x + .03, g.eyeY - .06], [x + .045, -.33], [x - .045, -.33]]; return [shape(p, WATER, {alpha: .9}), stroke([[x + .012, g.eyeY - .08], [x + .02, -.3]], S * .35, {fill: WHITE})]; }),
  'held tears': g => sym(s => [...outlined(ellipsePts(s * g.eyeX, g.eyeY - .07, .05, .03), WATER, S * .4), hi(s * g.eyeX - .015, g.eyeY - .06, .01)]),
  z: g => [stroke([[.26, .26], [.33, .26], [.26, .19], [.33, .19]], S * .6, {min: .3}), stroke([[.36, .31], [.4, .31], [.36, .27], [.4, .27]], S * .45, {min: .3})],
  'round glasses': g => [...sym(s => [shape(ring(s * g.eyeX, g.eyeY, .12, .11, S * .55, S * .55), INK, {ink: true})]), stroke([[-g.eyeX + .12, g.eyeY + .02], [g.eyeX - .12, g.eyeY + .02]], S * .5)],
  'smile lines': g => sym(s => [stroke(quad([s * .235, g.mouthY + .075], [s * .272, g.mouthY + .02], [s * .24, g.mouthY - .04]), S * .75, {min: .3})]),
  'lip colour': g => [shape([...quad([-.11, g.mouthY + .005], [0, g.mouthY + .05], [.11, g.mouthY + .005], 10), ...quad([.11, g.mouthY + .005], [0, g.mouthY - .065], [-.11, g.mouthY + .005], 12)], LIP, {adult: true}),
    stroke([[-.11, g.mouthY + .005], [.11, g.mouthY + .005]], S * .55)],
  'shine dot': g => [hi(.33, g.eyeY + .14, .018), hi(.355, g.eyeY + .175, .009)],
};
export const ADULT_ONLY_PARTS = ['lip colour'];

// ---- presets: 50 named + story aliases (each one line) ----------------------------------------------------------------------
const P = (brows, eyes, mouth, extras = [], o = {}) => ({brows, eyes, mouth, extras, ...o});
export const PRESETS = {
  // base
  smile: P('none', 'oval', 'smile'), grin: P('soft', 'oval', 'grin teeth'), neutral: P('none', 'oval', 'flat'), smirk: P('one-up', 'oval', 'smirk'),
  chill: P('soft', 'half-lid', 'small smile'), blocky: P('none', 'square', 'rectangle'), dots: P('none', 'dot', 'small smile'), vsmile: P('none', 'dot', 'V smile'),
  // modern girl
  g_soft: P('lash-brow', 'lashed', 'small smile'), g_glossy: P('lash-brow', 'glossy', 'small smile', ['shine dot']), g_closed: P('lash-brow', 'closed-down', 'small smile', ['blush lines']),
  g_blush: P('lash-brow', 'lashed', 'small smile', ['blush ellipse']), g_uwu: P('lash-brow', 'squeeze', 'w', ['blush lines']), g_wink_kid: P('lash-brow', 'lashed', 'kiss', ['blush ellipse'], {wink: 'right'}),
  g_sleepy: P('lash-brow', 'heavy-lid', 'small o'), g_teary: P('sad', 'glossy', 'wavy', ['held tears']), g_lips: P('raised', 'glossy', 'small smile', ['lip colour'], {adult: true}),
  g_glam: P('lash-brow', 'half-lid', 'smirk', ['lip colour', 'blush ellipse'], {adult: true}),
  // men and elders
  m_brows: P('thick', 'dot', 'small smile'), m_dad: P('flat', 'oval', 'smile', ['smile lines']), m_pixel: P('none', 'square', 'flat'), elder_soft: P('soft', 'closed-down', 'smile', ['smile lines']),
  elder_glasses: P('soft', 'dot', 'small smile', ['round glasses', 'smile lines']),
  // reactions
  laugh: P('raised', 'happy ^', 'big open smile'), xd: P('none', 'squeeze', 'big open smile'), shock: P('raised', 'goggle', 'o'), nervous: P('worried', 'oval', 'wavy', ['sweat drop']),
  scream: P('raised', 'goggle', 'scream'), terrified: P('worried', 'pinpoint', 'scream', ['sweat drop']), dizzy: P('none', 'spiral', 'wavy'), ko: P('none', 'x', 'tongue-out'),
  cry: P('sad', 'closed-down', 'frown', ['tear streams']), sob: P('worried', 'squeeze', 'shout', ['tear streams']), sad: P('sad', 'oval', 'frown'), worried: P('worried', 'oval', 'small o'),
  angry: P('angry-V', 'narrow', 'frown'), rage: P('angry-V', 'pinpoint', 'shout'), evil_grin: P('angry-V', 'heavy-lid', 'grin teeth', [], {villain: true}),
  monster: P('angry-V', 'goggle', 'shark teeth', [], {monster: true}), smug: P('soft', 'heavy-lid', 'smirk'), side_eye: P('flat', 'half-lid', 'flat', [], {look: .03}),
  suspicious: P('one-up', 'narrow', 'squiggle'), unimpressed: P('flat', 'heavy-lid', 'flat'), embarrassed: P('worried', 'closed-down', 'wavy', ['blush lines', 'sweat drop']),
  sweat_smile: P('worried', 'happy ^', 'smile', ['sweat drop']), confused: P('one-up', 'dot', 'squiggle'), sleep: P('none', 'closed-down', 'small o', ['z']), hum: P('soft', 'closed-down', ':3'),
  love: P('raised', 'heart', 'big open smile', ['blush ellipse']), starry: P('raised', 'star', 'big open smile'),
  // story aliases
  curious: P('one-up', 'oval', 'small o'), brave: P('flat', 'squeeze', 'flat'), wonder: P('raised', 'glossy', 'o'), polite: P('soft', 'happy ^', 'small smile'),
  sheepish: P('soft', 'happy ^', 'small smile', ['blush lines', 'sweat drop']), determined: P('flat', 'oval', 'flat'),
  steady: P('soft', 'oval', 'flat'),   // owner pass 2: determined with soft brows (Kit never reads angry)
};
export const PRESET_GROUPS = {
  base: ['smile', 'grin', 'neutral', 'smirk', 'chill', 'blocky', 'dots', 'vsmile'],
  girl: ['g_soft', 'g_glossy', 'g_closed', 'g_blush', 'g_uwu', 'g_wink_kid', 'g_sleepy', 'g_teary', 'g_lips', 'g_glam'],
  men: ['m_brows', 'm_dad', 'm_pixel', 'elder_soft', 'elder_glasses'],
  reactions: ['laugh', 'xd', 'shock', 'nervous', 'scream', 'terrified', 'dizzy', 'ko', 'cry', 'sob', 'sad', 'worried', 'angry', 'rage', 'evil_grin', 'monster', 'smug', 'side_eye', 'suspicious', 'unimpressed', 'embarrassed', 'sweat_smile', 'confused', 'sleep', 'hum', 'love', 'starry'],
  story: ['curious', 'brave', 'wonder', 'polite', 'sheepish', 'determined'],
};
// faces2 names → the nearest v3 preset
export const OLD_NAMES = {smile: 'smile', neutral: 'neutral', determined: 'determined', terrified: 'terrified', smug: 'smug', sad: 'sad', crying: 'cry', shout: 'rage', gasp: 'shock', sleep: 'sleep'};

// ---- rules (pure) --------------------------------------------------------------------------------------------------------------
export function resolveFace(f) {
  if (f && typeof f === 'object') return {brows: f.brows ?? 'none', eyes: f.eyes ?? 'oval', mouth: f.mouth ?? 'smile', extras: f.extras ?? [], ...f};
  const n = PRESETS[f] ? f : OLD_NAMES[f]; if (!n || !PRESETS[n]) throw Error('unknown face ' + f); return {name: n, ...PRESETS[n]};
}
// Adult-only parts never on youth builds. → error string or null.
export function faceError(f, build) {
  const r = resolveFace(f), adult = r.adult || (r.extras ?? []).some(e => ADULT_ONLY_PARTS.includes(e));
  return adult && build === 'youth' ? `face ${r.name ?? 'custom'} uses adult-only parts and cannot go on a youth build` : null;
}
const hex = c => { const s = String(c).replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255); };
export const luma = c => { const [r, g, b] = hex(c); return .2126 * r + .7152 * g + .0722 * b; };
const lin = v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
export const relLum = c => { const [r, g, b] = hex(c).map(lin); return .2126 * r + .7152 * g + .0722 * b; };
export const contrast = (a, b) => { const A = relLum(a), B = relLum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
export const darkSkin = skin => luma(skin) < .35;
// Blink: every 2.5–5 s (seeded per actor), 3 frames of closed-line eyes; never within 3 frames of a face change, never in a
// suppressed shot (a held close-up of ≤ 1 s). Pure.
const r1 = (s, k) => { const x = Math.sin(s * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
export function blinkClosed(seed, t, {fps = 30, changes = [], suppress = false} = {}) {
  if (suppress) return false;
  const ft = Math.round(t * fps), nb = framesFor(3, fps); let t0 = .8 + r1(seed, 0) * 2;   // nb: 3 frames @24 = 0.125 s at any frame rate (Kit 1)   // first blink; everything below in whole frames
  for (let k = 1; k < 10000; k++) {
    const fs = Math.round(t0 * fps); if (fs > ft) return false;
    if (ft - fs < nb) return !changes.some(c => { const fc = Math.round(c * fps); return fc >= fs - nb && fc <= fs + nb - 1; });
    t0 += 2.5 + r1(seed, k) * 2.5;
  }
  return false;
}

// ---- draw list (pure): face → [{d, fill, rule, ink, alpha, clip}] in canvas px ----------------------------------------------
export function faceParts(f, {px = 512, tier = 'mid', blink = false, grid = GRID} = {}) {
  const r = resolveFace(f), g = {...grid, eyeX: grid.eyeX + (r.look ? 0 : 0)}, crowd = tier === 'crowd' || tier === 'bg';
  const eyesL = blink ? 'closed-line' : r.eyes, list = [];
  const add = items => { for (const it of items) { if (crowd && (it.hi || it.lash)) continue; list.push(it); } };
  add(partXf((BROWS[r.brows] ?? BROWS.none)(g), 'brow', g));
  let eyes = (EYES[eyesL] ?? EYES.oval)(g);
  if (r.wink && !blink) eyes = [...eyes.filter(it => centreX(it) < 0), ...EYES['happy ^'](g).filter(it => centreX(it) > 0)];
  if (r.look) eyes = eyes.map(it => it.sclera ? it : {...it, pts: shiftPts(it.pts, r.look)});
  add(partXf(eyes, 'eye', g)); add(partXf((MOUTHS[r.mouth] ?? MOUTHS.smile)(g), 'mouth', g));
  for (const e of r.extras ?? []) if (EXTRAS[e]) add(EXTRAS[e](g));
  const X = x => +((x / W + .5) * px).toFixed(1), Y = y => +((H / 2 - y) * px).toFixed(1);
  const path = p => 'M' + p.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z';
  return list.map(it => ({d: it.pts.outer ? path(it.pts.outer) + path(it.pts.inner) : path(it.pts), fill: it.fill, rule: it.pts.outer ? 'evenodd' : 'nonzero', ink: !!it.ink, alpha: it.alpha ?? 1,
    clip: it.clip ? path(it.clip) : null, kind: it.eye ? 'eye' : it.mouth ? 'mouth' : it.sclera ? 'sclera' : null, bbox: bbox(it.pts.outer ?? it.pts)}));
}
export const centreX = it => { const b = bbox(it.pts.outer ?? it.pts); return (b[0] + b[2]) / 2; };
// Scale a part about its own anchor (each eye about its centre, the mouth about the mouth line, brows about the brow line)
// and give each side a slight hand-drawn tilt (left +wobble, right −wobble·0.7 radians). Pure.
export function partXf(items, part, g) {
  const k = part === 'eye' ? [g.ek, g.ek] : part === 'mouth' ? [g.mkx, g.mky] : part === 'brow' ? [g.bk, g.bk] : [1, 1];
  return items.map(it => {
    const side = centreX(it) < -.02 ? -1 : centreX(it) > .02 ? 1 : 0, ax = part === 'mouth' ? 0 : side * g.eyeX, ay = part === 'eye' ? g.eyeY : part === 'brow' ? g.browY : g.mouthY;
    const rot = part === 'mouth' ? 0 : side < 0 ? g.wobble : -g.wobble * .7, c = Math.cos(rot), sn = Math.sin(rot);
    const f = ([x, y]) => { const dx = (x - ax) * k[0], dy = (y - ay) * k[1]; return [ax + dx * c - dy * sn, ay + dx * sn + dy * c]; };
    const P = it.pts.outer ? {outer: it.pts.outer.map(f), inner: it.pts.inner.map(f)} : it.pts.map(f);
    return {...it, pts: P, clip: it.clip ? it.clip.map(f) : it.clip};
  });
}
export const shiftPts = (p, dx) => p.outer ? {outer: p.outer.map(([x, y]) => [x + dx, y]), inner: p.inner.map(([x, y]) => [x + dx, y])} : p.map(([x, y]) => [x + dx, y]);
export function bbox(p) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
// Measurements of a preset in face units (pure; the gates check them against the style table).
export function faceMeasure(f) {
  const r = resolveFace(f), g = GRID, eyes = partXf((EYES[r.eyes] ?? EYES.oval)(g), 'eye', g).filter(it => it.eye || it.sclera), mouth = partXf((MOUTHS[r.mouth] ?? MOUTHS.smile)(g), 'mouth', g);
  const bb = items => { const b = items.map(it => bbox(it.pts.outer ?? it.pts)); return [Math.min(...b.map(x => x[0])), Math.min(...b.map(x => x[1])), Math.max(...b.map(x => x[2])), Math.max(...b.map(x => x[3]))]; };
  const L = bb(eyes.filter(it => centreX(it) < 0)), R = bb(eyes.filter(it => centreX(it) > 0)), m = bb(mouth);
  return {eyeW: +(L[2] - L[0]).toFixed(3), eyeH: +(L[3] - L[1]).toFixed(3), spacing: +(((R[0] + R[2]) - (L[0] + L[2])) / 2).toFixed(3), eyeY: +((L[1] + L[3]) / 2).toFixed(3),
    mouthY: +((m[1] + m[3]) / 2).toFixed(3), mouthH: +(m[3] - m[1]).toFixed(3), mouthW: +(m[2] - m[0]).toFixed(3), stroke: GRID.stroke};
}

// ---- browser: canvas, material, actor ---------------------------------------------------------------------------------------
export function drawFace(g2, f, {px, tier, skin = '#f6c9a0', blink = false} = {}) {
  const list = faceParts(f, {px, tier, blink}), edge = darkSkin(skin);
  for (const it of list) {
    const p = new Path2D(it.d); g2.save(); g2.globalAlpha = it.alpha;
    if (it.clip) g2.clip(new Path2D(it.clip));
    if (edge && it.ink) { g2.strokeStyle = EDGE; g2.lineWidth = 2; g2.lineJoin = 'round'; g2.stroke(p); }   // dark skin: a 1 px light edge around ink
    g2.fillStyle = it.fill; g2.fill(p, it.rule); g2.restore();
  }
}
const cache = new Map();
export function faceMaterial3(f, tier = 'hero', skin = '#f6c9a0', {blink = false} = {}) {
  const key = JSON.stringify([f, tier, darkSkin(skin), blink]); if (cache.has(key)) return cache.get(key);
  let mat;
  if (typeof document === 'undefined') mat = new T.MeshBasicMaterial({transparent: true, opacity: 0});
  else {
    const px = TIER_PX[tier] ?? 512, c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * H / W);
    drawFace(c.getContext('2d'), f, {px, tier, skin, blink});
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    mat = new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  }
  mat.name = 'face3_' + (typeof f === 'string' ? f : 'custom'); cache.set(key, mat); return mat;
}
// Attach (once) and switch a v3 face; the same decal patch as faces2 (so Nobody's faces2 path is untouched).
export function setFace3(actor, f, {blink = false} = {}) {
  const tier = actor.tier === 'hero' ? 'hero' : 'mid', skin = actor.skin ?? '#f6c9a0';
  if (!actor.faceLayer) { const m = new T.Mesh(decalGeometry(), faceMaterial3(f, tier, skin)); m.name = 'face_decal'; m.renderOrder = 2; m.position.y = .58; actor.pivots.head.add(m); actor.faceLayer = m; }
  let m = faceMaterial3(f, tier, skin, {blink});
  if (actor.ghost !== undefined && actor.ghost < 1) { actor._ghostFaces ??= new Map(); const k = JSON.stringify([f, blink]); if (!actor._ghostFaces.has(k)) { const c = m.clone(); c.opacity = m.opacity * actor.ghost; actor._ghostFaces.set(k, c); } m = actor._ghostFaces.get(k); }
  actor.faceLayer.material = m; actor.face = f; actor.faceBlink = blink; return actor;
}
