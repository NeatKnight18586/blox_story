// avatar-style/faces4.js — Faces v4 (format v4, Phase 1b redo, owner 2026-11-15): modern bold shapes drawn with doodle marker
// lines. Style references docs/season1/refs/faces-v4 (style only; nothing traced or sampled; never a logo or cap).
//   · Marker strokes: constant width, round caps and joins, a slight seeded wobble (≤ 1 % of head width) fixed per face,
//     never animated. No sketch pass, no double rings: an open eye is one solid shape (or one outline for wide shock).
//   · Units: the head's front face, x ∈ [−.5, .5] (width 1), y ∈ [−.5, .5] up (height 1). On Actor v5 that is the 1×1 head
//     front exactly; on v2 heads the same decal stretches over the 1.25 × 1.16 front.
//   · Placement: eye line 48 % from the top (y .02), eye centres 0.40 apart, mouth centre 70 % from the top (y −.20); main
//     stroke 0.035; ink #1A1A1A.
//   Parts: BROWS4, EYES4, MOUTHS4, EXTRAS4; presets PRESETS4 (8 hero + 24 re-skinned faces3 presets; every other faces3 name
//   maps to its nearest through ALIAS4). TALK families × 4 shapes (closed, small .04, open .08, wide .13 with tongue).
//   faceParts4(f, {px, tier, blink, talk}) (pure) · faceGates4 (pure measures) · faceMaterial4 / setFace4 (browser).
import * as T from 'three';
import {HEAD, headFrontZ} from './body.js';
import {OLD_NAMES, darkSkin, PRESET_GROUPS} from './faces3.js';

export const INK = '#1A1A1A', WHITE = '#ffffff', MOUTH = '#8B1E2B', TONGUE = '#E06A7A', BLUSH = '#ff8fa3', HATCH = '#e0577a', WATER = '#6cc3ff', ANGER = '#e53935';
export const GRID4 = {eyeY: .02, eyeX: .20, mouthY: -.20, stroke: .035, browGap: .06, eyeW: .20, eyeH: .13, wobble: .006};
export const TIER_PX = {hero: 1024, mid: 512, crowd: 128, bg: 128};
const G = GRID4, S = G.stroke;

// ---- geometry helpers (pure) -------------------------------------------------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
export const quad = (p0, c, p1, n = 16) => Array.from({length: n + 1}, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]; });
export const cubic = (p0, c1, c2, p1, n = 20) => Array.from({length: n + 1}, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k]); });
export const ellipse = (cx, cy, rx, ry, n = 36) => Array.from({length: n}, (_, i) => { const a = i / n * 2 * Math.PI; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
// superellipse |x/a|^n + |y/b|^n = 1 (n 2.7: a full almond that keeps its area), outer corner lifted by `lift`
export const superellipse = (cx, cy, a, b, n = 2.7, lift = 0, side = 1, k = 48) => Array.from({length: k}, (_, i) => {
  const t = i / k * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t), x = a * Math.sign(c) * Math.abs(c) ** (2 / n), y = b * Math.sign(s) * Math.abs(s) ** (2 / n);
  return [cx + x, cy + y + lift * (x / a) * side]; });
export const polyArea = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
export function bbox(p) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
const seedOf = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100003, 17);
const rnd = (s, k) => { const x = Math.sin(s * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
// marker wobble: a smooth sideways drift along the line, amplitude ≤ GRID4.wobble (fixed per face + item)
function wobble(pts, seed, amp = G.wobble) {
  if (pts.length < 3 || !amp) return pts;
  let L = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(L); }
  // pass 1 (1b sheet): one gentle bend per stroke, amplitude scaled to its length (short brows and mouths stay clean)
  const A = Math.min(amp, .03 * L), sg = rnd(seed, 1) < .5 ? -1 : 1, sk = .35 + rnd(seed, 2) * .3;
  return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const t = acc[i] / (L || 1), o = sg * A * Math.sin(Math.PI * Math.pow(t, sk / .5 * .5 + .5)); return [p[0] - dy / d * o, p[1] + dx / d * o]; });
}
// items: fill {pts, fill, alpha?, clip?} · line {line: pts, w, color?, closed?}
const fill = (pts, color, o = {}) => ({pts, fill: color, ...o});
const line = (pts, w = S, o = {}) => ({line: pts, w, color: o.color ?? INK, ...o});
const sides = fn => [...fn(-1), ...fn(1)];   // s = −1 viewer's left, +1 right
const eyeC = s => [s * G.eyeX, G.eyeY];
const shine = (x, y, r) => fill(ellipse(x, y, r, r, 20), WHITE, {shine: true, r});

// ---- parts ---------------------------------------------------------------------------------------------------------------------
const yb = G.eyeY + G.eyeH / 2 + G.browGap, BW = S * .8;   // brow line and weight (one thin flat stroke, never doubled)
export const BROWS4 = {
  none: () => [],
  flat: () => sides(s => [line([[s * G.eyeX - .075, yb], [s * G.eyeX + .075, yb]], BW, {brow: true})]),
  raised: () => sides(s => [line(quad([s * G.eyeX - .075, yb + .015], [s * G.eyeX, yb + .055], [s * G.eyeX + .075, yb + .015]), BW, {brow: true})]),
  angry: () => sides(s => [line([[s * (G.eyeX + .075), yb + .03], [s * (G.eyeX - .075), yb - .03]], BW, {brow: true})]),
  worried: () => sides(s => [line([[s * (G.eyeX + .075), yb - .02], [s * (G.eyeX - .075), yb + .035]], BW, {brow: true})]),
  'one-up': () => [line([[-G.eyeX - .075, yb], [-G.eyeX + .075, yb]], BW, {brow: true}), line(quad([G.eyeX - .075, yb + .02], [G.eyeX, yb + .065], [G.eyeX + .075, yb + .025]), BW, {brow: true})],
  wink: () => [line([[-G.eyeX - .075, yb - .025], [-G.eyeX + .075, yb - .035]], BW, {brow: true}), line(quad([G.eyeX - .075, yb + .02], [G.eyeX, yb + .065], [G.eyeX + .075, yb + .025]), BW, {brow: true})],
};
const almondPts = (s, a = G.eyeW / 2, b = G.eyeH / 2) => superellipse(...eyeC(s), a, b, 2.7, .012, -s);
export const EYES4 = {
  almond: s => { const [x, y] = eyeC(s); return [fill(almondPts(s), INK, {eye: true}), shine(x + s * .04, y + .022, .03), shine(x - s * .035, y - .03, .011)]; },
  'half-lid': s => { const [x, y] = eyeC(s), top = y + .02, p = superellipse(x, y - .012, .125, .085, 2.7).map(([px, py]) => [px, Math.min(py, top)]);   // pass 1: 2.05 → ≥ 2.2 % area
    return [fill(p, INK, {eye: true}), line([[x - .13, top + .004], [x + .13, top + .004]], S, {lid: true}), shine(x + s * .045, y - .005, .022)]; },
  squeeze: s => { const [x, y] = eyeC(s), d = -s;   // > on the left eye, < on the right (points to the nose)
    return [line([[x - d * .065, y + .055], [x + d * .06, y], [x - d * .065, y - .055]], S * 1.15, {eye: true, lineEye: true})]; },
  happy: s => { const [x, y] = eyeC(s); return [line(quad([x - .085, y - .03], [x, y + .085], [x + .085, y - .03]), S * 1.1, {eye: true, lineEye: true})]; },
  dot: s => { const [x, y] = eyeC(s); return [fill(ellipse(x, y, .08, .095), INK, {eye: true}), shine(x + s * .03, y + .035, .024)]; },
  sparkle: s => { const [x, y] = eyeC(s); return [fill(almondPts(s, .105, .07), INK, {eye: true}), shine(x + s * .035, y + .022, .036), shine(x - s * .035, y - .028, .022)]; },
  wink: s => { const [x, y] = eyeC(s); return [line(quad([x - .09, y - .035], [x, y + .075], [x + .09, y - .035]), S * 1.6, {eye: true, lineEye: true})]; },
  wide: s => { const [x, y] = eyeC(s), p = ellipse(x, y, .1, .11, 40);
    return [fill(p, WHITE, {eye: true, sclera: true}), line([...p, p[0]], S * .9, {eyeLine: true}), fill(ellipse(x, y - .005, .032, .036), INK, {pupil: true}), shine(x + s * .012, y + .01, .01)]; },
  closed: s => { const [x, y] = eyeC(s); return [line(quad([x - .085, y], [x, y - .035], [x + .085, y]), S, {eye: true, lineEye: true})]; },
};
const LINE_EYES = ['squeeze', 'happy', 'wink', 'closed'];
// mouths (centre y −.20). D = an open mouth: interior, optional tongue/fang (clipped), one outline.
const my = G.mouthY;
function open(pts, {tongue = false, fang = null} = {}) {
  const b = bbox(pts), out = [fill(pts, MOUTH, {mouth: true, interior: true})];
  if (tongue) out.push(fill(ellipse((b[0] + b[2]) / 2, b[1] + (b[3] - b[1]) * .25, (b[2] - b[0]) * .3, (b[3] - b[1]) * .32), TONGUE, {clip: pts}));
  if (fang !== null) out.push(fill([[fang - .016, b[3] + .01], [fang + .016, b[3] + .01], [fang, b[3] - .03]], WHITE, {clip: pts, fang: true}));
  out.push(line([...pts, pts[0]], S, {mouth: true})); return out;
}
// interior opening h at the centre column (x = 0); `lift` raises the right corner (top and bottom move together there)
const D = (w, h, {lift = 0, y = my} = {}) => [...quad([-w / 2, y + h / 2], [0, y + h / 2 + lift * .3], [w / 2, y + h / 2 + lift], 10), ...quad([w / 2, y + h / 2 + lift], [w * .05, y - 1.5 * h + lift * .3], [-w / 2, y + h / 2], 18).slice(1, -1)];   // centre-column opening = h exactly
const oval = (w, h) => ellipse(0, my, w / 2, h / 2, 32);
export const MOUTHS4 = {
  'line smile': () => [line(quad([-.08, my + .02], [0, my - .05], [.08, my + .02]), S, {mouth: true})],
  'small smile': () => [line(quad([-.05, my + .012], [0, my - .03], [.05, my + .012]), S, {mouth: true})],
  frown: () => [line(quad([-.06, my - .015], [0, my + .03], [.06, my - .015]), S, {mouth: true})],
  ':3': () => [line([...quad([-.055, my + .012], [-.028, my - .035], [0, my + .004], 8), ...quad([0, my + .004], [.028, my - .035], [.055, my + .012], 8).slice(1)], S, {mouth: true})],
  o: () => open(oval(.075, .095)),
  flat: () => [line([[-.05, my], [.05, my]], S, {mouth: true})],
  wavy: () => [line(Array.from({length: 25}, (_, i) => [-.07 + i * .14 / 24, my + Math.sin(i / 24 * Math.PI * 5) * .014]), S, {mouth: true})],
  smirk: () => [line(cubic([-.055, my - .005], [-.01, my - .025], [.035, my - .02], [.065, my + .03]), S, {mouth: true})],
  'fang smile': () => open(D(.17, .075), {fang: .04}),
  'lopsided fang': () => open(D(.2, .08, {lift: .045}), {fang: .05}),
  'big open': () => open(D(.3, .12), {tongue: true}),
  // talk shapes: clear size steps (height .04 / .08 / .13; the wide one shows the tongue)
  'smile small': () => open(D(.12, .04)), 'smile open': () => open(D(.16, .08)), 'smile wide': () => open(D(.22, .13), {tongue: true}),
  'grin small': () => open(D(.13, .04, {lift: .02}), {fang: .03}), 'grin open': () => open(D(.17, .08, {lift: .03}), {fang: .04}), 'grin wide': () => open(D(.23, .13, {lift: .035}), {fang: .05, tongue: true}),
  'oval small': () => open(oval(.08, .04)), 'oval open': () => open(oval(.1, .08)), 'oval wide': () => open(oval(.13, .13), {tongue: true}),
};
export const TALK = {
  grin: ['smirk', 'grin small', 'grin open', 'grin wide'],
  smile: ['line smile', 'smile small', 'smile open', 'smile wide'],
  neutral: ['flat', 'oval small', 'oval open', 'oval wide'],
  worried: ['wavy', 'oval small', 'oval open', 'oval wide'],
};
export const TALK_H = [0, .04, .08, .13];
const FAMILY_OF = {'line smile': 'smile', 'small smile': 'smile', 'fang smile': 'smile', ':3': 'smile', smirk: 'grin', 'lopsided fang': 'grin', flat: 'neutral', o: 'neutral', wavy: 'worried', frown: 'worried'};
export const talkFamily = m => FAMILY_OF[m] ?? null;
export const hasMouth = m => !!MOUTHS4[m];

export const EXTRAS4 = {
  blush: () => sides(s => { const cx = s * (G.eyeX + .075), cy = G.eyeY - .105;
    return [fill(ellipse(cx, cy, .06, .03), BLUSH, {alpha: .4, blush: true}), ...[-1, 0, 1].map(k => line([[cx + k * .028 + .012, cy + .018], [cx + k * .028 - .012, cy - .018]], S * .6, {color: HATCH, blush: true}))]; }),
  sweat: () => { const c = [.36, .2], p = [...cubic([c[0], c[1] + .07], [c[0] + .05, c[1]], [c[0] + .045, c[1] - .055], [c[0], c[1] - .055], 10), ...cubic([c[0], c[1] - .055], [c[0] - .045, c[1] - .055], [c[0] - .05, c[1]], [c[0], c[1] + .07], 10).slice(1)];
    return [fill(p, WATER), line(p, S * .7)]; },
  tears: () => sides(s => { const x = s * G.eyeX, p = [[x - .035, G.eyeY - .06], [x + .035, G.eyeY - .06], [x + .05, -.46], [x - .05, -.46]]; return [fill(p, WATER, {alpha: .92})]; }),
  anger: () => { const c = [.31, .31], r = .045; return [0, 1, 2, 3].map(k => { const a = k * Math.PI / 2 + Math.PI / 4, b = [c[0] + Math.cos(a) * r * .35, c[1] + Math.sin(a) * r * .35];
    return line(quad(b, [c[0] + Math.cos(a) * r * 1.2, c[1] + Math.sin(a) * r * 1.2], [c[0] + Math.cos(a + .9) * r, c[1] + Math.sin(a + .9) * r], 6), S * .75, {color: ANGER}); }); },
  z: () => [line([[.27, .33], [.34, .33], [.27, .26], [.34, .26]], S * .7), line([[.37, .4], [.41, .4], [.37, .36], [.41, .36]], S * .6)],
};

// ---- presets -------------------------------------------------------------------------------------------------------------------
const P = (brows, eyes, mouth, extras = [], o = {}) => ({brows, eyes, mouth, extras, ...o});
export const PRESETS4 = {
  // hero (signature: viewer's-left eye winks)
  hero_wink: P('wink', 'wink', 'lopsided fang', ['blush'], {eyesR: 'almond'}),
  hero_grin: P('raised', 'almond', 'fang smile', ['blush']),
  hero_shock: P('raised', 'wide', 'o', [], {held: true}),
  hero_panic: P('worried', 'wide', 'wavy', ['sweat']),
  hero_scheme: P('flat', 'half-lid', 'smirk'),
  hero_cry: P('worried', 'squeeze', 'big open', ['tears'], {held: true}),
  hero_rage: P('angry', 'almond', 'big open', ['anger'], {held: true}),
  hero_soft: P('none', 'happy', 'small smile', ['blush']),
  // the 24 most-used faces3 presets, re-skinned
  smile: P('none', 'almond', 'line smile'), grin: P('raised', 'almond', 'fang smile'), neutral: P('none', 'almond', 'flat'),
  determined: P('flat', 'almond', 'flat'), steady: P('flat', 'almond', 'small smile'), brave: P('flat', 'half-lid', 'flat'),
  rage: P('angry', 'almond', 'big open', ['anger'], {held: true}), smug: P('flat', 'half-lid', 'smirk'), shock: P('raised', 'wide', 'o', [], {held: true}),
  sad: P('worried', 'almond', 'frown'), terrified: P('worried', 'wide', 'big open', ['sweat'], {held: true}), scream: P('raised', 'wide', 'big open', [], {held: true}),
  wonder: P('raised', 'sparkle', 'o'), starry: P('raised', 'sparkle', 'big open', [], {held: true}), curious: P('one-up', 'almond', 'o'),
  polite: P('none', 'happy', 'small smile', ['blush']), laugh: P('raised', 'happy', 'big open', [], {held: true}), sleep: P('none', 'closed', 'o', ['z'], {held: true}),
  cry: P('worried', 'squeeze', 'big open', ['tears'], {held: true}), worried: P('worried', 'almond', 'wavy'), sheepish: P('worried', 'happy', 'small smile', ['blush', 'sweat']),
  ko: P('none', 'squeeze', 'wavy', [], {held: true}), evil_grin: P('angry', 'half-lid', 'fang smile'), xd: P('none', 'squeeze', 'big open', [], {held: true}),
};
export const HERO_PRESETS = Object.keys(PRESETS4).filter(n => n.startsWith('hero_'));
export const RESKINNED = Object.keys(PRESETS4).filter(n => !n.startsWith('hero_'));
// every other faces3 name → its nearest re-skin
export const ALIAS4 = {smirk: 'smug', chill: 'steady', blocky: 'neutral', dots: 'smile', vsmile: 'smile', g_soft: 'smile', g_glossy: 'wonder', g_closed: 'polite',
  g_blush: 'polite', g_uwu: 'polite', g_wink_kid: 'polite', g_sleepy: 'brave', g_teary: 'sad', g_lips: 'smile', g_glam: 'smug', m_brows: 'steady', m_dad: 'smile',
  m_pixel: 'neutral', elder_soft: 'polite', elder_glasses: 'polite', nervous: 'worried', dizzy: 'ko', sob: 'cry', angry: 'rage', monster: 'evil_grin',
  side_eye: 'smug', suspicious: 'curious', unimpressed: 'brave', embarrassed: 'sheepish', sweat_smile: 'sheepish', confused: 'curious', hum: 'polite', love: 'starry'};
export function resolveFace4(f) {
  if (f && typeof f === 'object') return {brows: 'none', eyes: 'almond', mouth: 'line smile', extras: [], ...f};
  const n = PRESETS4[f] ? f : PRESETS4[ALIAS4[f]] ? ALIAS4[f] : PRESETS4[OLD_NAMES[f]] ? OLD_NAMES[f] : null;
  if (!n) throw Error('unknown face ' + f); return {name: n, ...PRESETS4[n]};
}
export const isHeld = f => !!resolveFace4(f).held;
export const faceError4 = f => { resolveFace4(f); return null; };   // v4 has no adult-only parts

// ---- draw list (pure) ----------------------------------------------------------------------------------------------------------
// → [{d, fill | stroke, w (px), alpha, clip, kind, bbox (face units)}]; canvas px × px over the whole head front.
export function faceItems4(f, {tier = 'mid', blink = false, talk = null} = {}) {
  const r = resolveFace4(f), crowd = tier === 'crowd' || tier === 'bg', key = r.name ?? JSON.stringify(f), seed = seedOf(key), items = [];
  const push = (list, kind) => list.forEach((it, i) => { if (crowd && it.shine && it.r < .015) return; items.push({...it, kind: it.kind ?? kind, seed: seed + items.length * 7 + i}); });
  const xs = r.extras ?? [];
  push(xs.filter(e => e === 'tears').flatMap(e => EXTRAS4[e]()), 'extra');   // tears sit under the eyes' ink
  push((BROWS4[r.brows] ?? BROWS4.none)(), 'brow');
  const eyeL = blink ? 'closed' : r.eyes, eyeR = blink ? 'closed' : (r.eyesR ?? r.eyes);
  push([...(EYES4[eyeL] ?? EYES4.almond)(-1), ...(EYES4[eyeR] ?? EYES4.almond)(1)], 'eye');
  const fam = talkFamily(r.mouth), mouth = talk !== null && fam && !r.held ? TALK[fam][talk] : r.mouth;
  push((MOUTHS4[mouth] ?? MOUTHS4['line smile'])(), 'mouth');
  push(xs.filter(e => e !== 'tears' && EXTRAS4[e]).flatMap(e => EXTRAS4[e]()), 'extra');
  return items.map(it => it.line ? {...it, line: wobble(it.line, it.seed)} : it);
}
export function faceParts4(f, {px = 512, ...o} = {}) {
  const X = x => +((x + .5) * px).toFixed(1), Y = y => +((.5 - y) * px).toFixed(1);
  const path = (p, close) => 'M' + p.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + (close ? 'Z' : '');
  return faceItems4(f, o).map(it => it.line
    ? {d: path(it.line, false), stroke: it.color, w: +(it.w * px).toFixed(2), alpha: it.alpha ?? 1, clip: null, kind: kindOf(it), bbox: bbox(it.line)}
    : {d: path(it.pts, true), fill: it.fill, alpha: it.alpha ?? 1, clip: it.clip ? path(it.clip, true) : null, kind: kindOf(it), bbox: bbox(it.pts)});
}
const kindOf = it => it.blush ? 'blush' : it.shine ? 'shine' : it.brow ? 'brow' : it.mouth ? 'mouth' : it.kind;

// ---- measures (pure): the face gates ------------------------------------------------------------------------------------------
// Face = the head front's flat band between the top and bottom rounded rims of the classic head (where a face can sit):
// full width, height 1 − 2 · rim / head height = 0.62. Head front = 1 × 1 (for the eye-area check).
export const FACE = {w: 1, h: 1 - 2 * HEAD.rim / (2 * HEAD.halfHeight), headArea: 1};
export function faceGates4(f, {talk = null} = {}) {
  const items = faceItems4(f, {tier: 'hero', talk}), core = items.filter(it => ['brow', 'eye', 'mouth'].includes(it.kind) || it.eyeLine || it.pupil || it.lid);
  const ext = it => { const b = bbox(it.line ?? it.pts), h = it.line ? it.w / 2 : 0; return [b[0] - h, b[1] - h, b[2] + h, b[3] + h]; };
  const bb = core.map(ext), box = [Math.min(...bb.map(b => b[0])), Math.min(...bb.map(b => b[1])), Math.max(...bb.map(b => b[2])), Math.max(...bb.map(b => b[3]))];
  const r = resolveFace4(f), eyeArea = side => { const name = side < 0 ? r.eyes : (r.eyesR ?? r.eyes); if (LINE_EYES.includes(name)) return null;
    return polyArea(items.find(it => it.kind === 'eye' && it.pts && Math.sign(bbox(it.pts)[0] + bbox(it.pts)[2]) === side).pts); };
  const minW = Math.min(...items.filter(it => it.line).map(it => it.w));
  return {w: +((box[2] - box[0]) / FACE.w).toFixed(3), h: +((box[3] - box[1]) / FACE.h).toFixed(3), hHead: +(box[3] - box[1]).toFixed(3),
    eyeL: eyeArea(-1), eyeR: eyeArea(1), minStroke: +minW.toFixed(4)};
}
export function eyeCentres4(f) {
  const it = faceItems4(f).filter(i => i.kind === 'eye'), c = side => { const b = it.filter(i => Math.sign((bbox(i.line ?? i.pts)[0] + bbox(i.line ?? i.pts)[2])) === side).map(i => bbox(i.line ?? i.pts));
    return (Math.min(...b.map(x => x[0])) + Math.max(...b.map(x => x[2]))) / 2; };
  return [c(-1), c(1)];
}
export const DECAL_PER_HEAD = 1;
// Review/gate shots at 390 × 693 (fov 35°): head centre on the camera axis; head width in px = 693 / (2 d tan 17.5°).
export const SHOTS4 = {medium: {d: 7, fov: 35}, close: {d: 5, fov: 35}};
export const headPx = (shot, frameH = 693) => frameH / (2 * shot.d * Math.tan(shot.fov / 2 * Math.PI / 180));   // the v4 decal spans the whole head front
// Blush clear of the mouth (measured): mouth points inside any blush item's box (0 = clear).
export function blushOverlap(f, talk = null) {
  const items = faceItems4(f, {talk}), bl = items.filter(it => it.blush).map(it => bbox(it.line ?? it.pts));
  const pts = items.filter(it => it.kind === 'mouth').flatMap(it => it.line ?? it.pts);
  return pts.filter(([x, y]) => bl.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])).length;
}
// Mouth opening (pure): the interior's vertical span along the centre column x = 0 (lopsided mouths included).
export function mouthHeight(f, talk) {
  const it = faceItems4(f, {talk}).find(i => i.interior); if (!it) return 0; const p = it.pts, ys = [];
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; if ((a[0] <= 0) !== (b[0] <= 0)) ys.push(a[1] + (b[1] - a[1]) * (0 - a[0]) / (b[0] - a[0])); }
  return ys.length >= 2 ? +(Math.max(...ys) - Math.min(...ys)).toFixed(3) : 0;
}

// ---- browser ---------------------------------------------------------------------------------------------------------------------
export function drawFace4(g2, f, {px, tier, skin = '#f6c9a0', blink = false, talk = null} = {}) {
  const edge = darkSkin(skin);
  for (const it of faceParts4(f, {px, tier, blink, talk})) {
    const p = new Path2D(it.d); g2.save(); g2.globalAlpha = it.alpha; g2.lineCap = 'round'; g2.lineJoin = 'round';
    if (it.clip) g2.clip(new Path2D(it.clip));
    if (it.stroke) { if (edge && it.stroke === INK) { g2.strokeStyle = '#f7ead9'; g2.lineWidth = it.w + 3; g2.stroke(p); } g2.strokeStyle = it.stroke; g2.lineWidth = it.w; g2.stroke(p); }
    else { g2.fillStyle = it.fill; g2.fill(p); }
    g2.restore();
  }
}
// Decal over the whole head front (classic head: 1.25 × 1.16, following the round front), head-pivot coordinates.
let decal4 = null;
export function decalGeometry4() {
  if (decal4) return decal4;
  const W = 2 * HEAD.radius, H = 2 * HEAD.halfHeight, g = new T.PlaneGeometry(W, H, 24, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, headFrontZ(p.getX(i) * .985) + .008);
  g.computeVertexNormals(); return (decal4 = g);
}
const cache = new Map();
export function faceMaterial4(f, tier = 'hero', skin = '#f6c9a0', {blink = false, talk = null} = {}) {
  const key = JSON.stringify([f, tier, darkSkin(skin), blink, talk]); if (cache.has(key)) return cache.get(key);
  let mat;
  if (typeof document === 'undefined') mat = new T.MeshBasicMaterial({transparent: true, opacity: 0});
  else {
    const px = TIER_PX[tier] ?? 512, c = document.createElement('canvas'); c.width = c.height = px;
    drawFace4(c.getContext('2d'), f, {px, tier, skin, blink, talk});
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    mat = new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  }
  mat.name = 'face4_' + (typeof f === 'string' ? f : 'custom'); cache.set(key, mat); return mat;
}
export function setFace4(actor, f, {blink = false, talk = null} = {}) {
  const tier = actor.tier === 'hero' ? 'hero' : 'mid', skin = actor.skin ?? '#f6c9a0';
  if (!actor.faceLayer) { const m = new T.Mesh(decalGeometry4(), faceMaterial4(f, tier, skin)); m.name = 'face_decal'; m.renderOrder = 2; m.position.y = HEAD.centre; actor.pivots.head.add(m); actor.faceLayer = m; }
  actor.faceLayer.material = faceMaterial4(f, tier, skin, {blink, talk}); actor.face = f; actor.faceBlink = blink; actor.faceTalk = talk; return actor;
}
export const REACTIONS3 = PRESET_GROUPS.reactions;
