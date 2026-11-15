// avatar-style/faces4.js — Faces v4 (format v4 Phase 1, opt-in `faceStyle: 'v4'`): cartoony, wide-set, a subtle sketch.
// Extends the faces3 part library (same filled tapered strokes, same decal, no new drawing system):
//   · grid: eye centres 0.30 of the head width apart (decal 1.0 face unit = 0.8 head widths on v2 heads and v5 heads alike);
//     expression comes from brows and mouth first.
//   · sketch pass: 1–2 thin offset lines at 35 % opacity along brows (2) and the mouth (1), never on eyes.
//   · hero parts: wink, wide (oval pupil + two shines), arched / arched-wink brows, lopsided grin family, hatch blush,
//     waterfall tears, flush; 8 hero presets.
//   · talking mouths: 4 shapes (closed, small, open, wide) per family; `talk` 0..3 swaps the mouth of a talk-capable face.
//   faceParts4(f, {px, tier, blink, talk}) (pure) · faceMaterial4 · setFace4(actor, f, {blink, talk}) · TALK · isHeld
import * as T from 'three';
import * as F from './faces3.js';
import {decalGeometry} from './faces2.js';

const {GRID, INK, WHITE, MOUTH, TEETH, TONGUE, WATER, quad, cubic, arc, taper, ellipsePts, shape, stroke, sym, hi, sclera, openMouth, partXf, centreX, shiftPts, bbox} = F;
export const HEAD_SPACING = .30, DECAL_PER_HEAD = .8;
export const GRID4 = {...GRID, eyeX: HEAD_SPACING / DECAL_PER_HEAD / 2, browY: .2};   // eyeX .1875 face units
export const SKETCH = {alpha: .35, w: GRID.stroke * .22, offsets: {brow: [[.007, .013], [-.009, -.008]], mouth: [[.006, -.011]]}};
const S = GRID.stroke, BLUSH4 = '#ff9a3c', FLUSH = '#ff3b30';

export const BROWS4 = {
  arched: g => sym(s => [stroke(quad([s * (g.eyeX - .1), g.browY + .01], [s * (g.eyeX - .005), g.browY + .1], [s * (g.eyeX + .11), g.browY + .02]), S * 1.05)]),
  // the winking side (viewer's left) pressed down and flat, the open side arched high
  'arched-wink': g => [stroke(quad([-(g.eyeX + .1), g.browY - .025], [-g.eyeX, g.browY + .0], [-(g.eyeX - .1), g.browY - .045]), S * 1.05),
    stroke(quad([g.eyeX - .1, g.browY + .03], [g.eyeX + .005, g.browY + .12], [g.eyeX + .11, g.browY + .035]), S * 1.05)],
};
export const EYES4 = {
  wink: g => sym(s => [stroke(quad([s * g.eyeX - .075, g.eyeY - .015], [s * g.eyeX, g.eyeY + .07], [s * g.eyeX + .075, g.eyeY - .015]), S * 1.75, {eye: true, min: .3})]),
  wide: g => sym(s => [...F.sclera(s * g.eyeX, g.eyeY, .078, .098, S * .85, S * .5),
    shape(ellipsePts(s * g.eyeX + s * .008, g.eyeY - .008, .036, .058), INK, {ink: true, eye: true}),
    hi(s * g.eyeX + s * .008 - .012, g.eyeY + .022, .014), hi(s * g.eyeX + s * .008 + .014, g.eyeY - .03, .008)]),
};
// lopsided open mouth raised on the viewer's right; k = opening 0 (closed line) … 1 (wide)
function lopsided(g, k, {teeth = true, tongue = false} = {}) {
  const y = g.mouthY - .025, L = [-.16 - .02 * k, y + .01], R = [.19 + .02 * k, y + .055 + .01 * k];   // pass 2: lower, less raised (clears the blush)
  if (k <= 0) return [stroke(cubic([L[0], y + .02], [-.05, y - .05], [.08, y - .04], R), S * 1.1, {mouth: true})];
  const top = quad(L, [.03, y + .02 - .01 * k], R, 10), bot = quad(R, [.02, y - .09 - .14 * k], L, 16), pts = [...top, ...bot];
  return openMouth(pts, {teethTop: teeth ? [[L[0] - .02, L[1] + .03], [R[0] + .02, R[1] + .03], [R[0] + .02, R[1] - .05 - .03 * k], [L[0] - .02, L[1] - .06 - .03 * k]] : null,   // pass 2: a fuller teeth band
    tongue: tongue ? ellipsePts(.03, y - .07 - .09 * k, .08, .04 + .02 * k) : null});
}
const dMouth = (g, w, h, o = {}) => openMouth([...quad([-w, g.mouthY + .03], [0, g.mouthY + .03 - h * .15], [w, g.mouthY + .03], 10), ...quad([w, g.mouthY + .03], [0, g.mouthY - h], [-w, g.mouthY + .03], 16)], o);
export const MOUTHS4 = {
  'lopsided closed': g => lopsided(g, 0),
  'lopsided small': g => lopsided(g, .35, {teeth: true}),
  'lopsided grin': g => lopsided(g, .7, {teeth: true}),
  'lopsided wide': g => lopsided(g, 1.05, {teeth: true, tongue: true}),
  'small open': g => dMouth(g, .09, .09),
  'wide open': g => dMouth(g, .17, .24, {tongue: ellipsePts(0, g.mouthY - .14, .1, .06)}),
};
export const EXTRAS4 = {
  'hatch blush': g => sym(s => [0, 1, 2, 3].map(k => stroke([[s * g.eyeX - .045 + k * .03 + .012, g.eyeY - .13], [s * g.eyeX - .045 + k * .03 - .008, g.eyeY - .158]], S * .48, {fill: BLUSH4, min: .3, alpha: .8}))),
  waterfall: g => sym(s => { const x = s * g.eyeX, p = [[x - .05, g.eyeY - .04], [x + .05, g.eyeY - .04], [x + .085, -.335], [x - .085, -.335]];
    return [shape(p, WATER, {alpha: .92}), stroke([[x - .02, g.eyeY - .07], [x - .035, -.31]], S * .3, {fill: WHITE}), stroke([[x + .025, g.eyeY - .09], [x + .04, -.3]], S * .25, {fill: WHITE})]; }),
  flush: g => [shape(ellipsePts(0, g.browY + .02, .44, .12), FLUSH, {alpha: .32, under: true}), ...sym(s => [0, 1, 2].map(k => stroke([[s * (.06 + k * .045), g.browY + .1], [s * (.04 + k * .045), g.browY + .04]], S * .45, {fill: FLUSH, min: .3, alpha: .7})))],
};
const ALL = {brows: {...F.BROWS, ...BROWS4}, eyes: {...F.EYES, ...EYES4}, mouths: {...F.MOUTHS, ...MOUTHS4}, extras: {...F.EXTRAS, ...EXTRAS4}};

const P = (brows, eyes, mouth, extras = [], o = {}) => ({brows, eyes, mouth, extras, ...o});
export const PRESETS4 = {
  hero_wink: P('arched-wink', 'wink', 'lopsided grin', ['hatch blush'], {eyesR: 'wide'}),   // signature: viewer's-left eye winks
  hero_grin: P('arched', 'wide', 'lopsided grin', ['hatch blush']),
  hero_shock: P('raised', 'wide', 'o', [], {held: true}),
  hero_panic: P('worried', 'pinpoint', 'wavy', ['sweat drop']),
  hero_scheme: P('one-up', 'half-lid', 'smirk'),
  hero_cry: P('sad', 'closed-down', 'shout', ['waterfall'], {held: true}),
  hero_rage: P('angry-V', 'narrow', 'shark teeth', ['flush'], {held: true}),
  hero_soft: P('soft', 'happy ^', 'small smile', ['hatch blush']),
};
export const HERO_PRESETS = Object.keys(PRESETS4);
// Talking mouths: family → [closed, small, open, wide]; a face's mouth picks its family.
export const TALK = {
  grin: ['lopsided closed', 'lopsided small', 'lopsided grin', 'lopsided wide'],
  smile: ['smile', 'small open', 'big open smile', 'wide open'],
  neutral: ['flat', 'small o', 'o', 'shout'],
  worried: ['wavy', 'small o', 'o', 'scream'],
};
const FAMILY_OF = {smile: 'smile', 'small smile': 'smile', 'big open smile': 'smile', 'grin teeth': 'smile', 'V smile': 'smile', smirk: 'grin',
  flat: 'neutral', 'small o': 'neutral', o: 'neutral', shout: 'neutral', wavy: 'worried', frown: 'worried', squiggle: 'worried'};
for (const [fam, shapes] of Object.entries(TALK)) for (const m of shapes) FAMILY_OF[m] ??= fam;
export const talkFamily = mouth => FAMILY_OF[mouth] ?? null;
export const hasMouth = m => !!ALL.mouths[m];
// Blush clear of the mouth (pure, measured): mouth outline vertices inside any blush stroke's box (0 = clear).
export function blushOverlap(f, talk = null) {
  const L = faceParts4(f, {talk}), bl = L.filter(it => it.fill === BLUSH4).map(it => it.bbox), pts = [];
  for (const it of L) if (it.kind === 'mouth' || it.fill === F.MOUTH) for (const m of it.d.matchAll(/([\d.]+) ([\d.]+)/g)) pts.push([+m[1] / 512 - .5, F.H / 2 - +m[2] / 512]);
  return pts.filter(([x, y]) => bl.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])).length;
}
const REACTIONS = new Set(F.PRESET_GROUPS.reactions);

export function resolveFace4(f) {
  if (f && typeof f === 'object') return {brows: 'none', eyes: 'oval', mouth: 'smile', extras: [], ...f};
  if (PRESETS4[f]) return {name: f, ...PRESETS4[f]};
  const r = F.resolveFace(f); return {...r, held: REACTIONS.has(r.name)};
}
// Held reaction faces never flap.
export const isHeld = f => !!resolveFace4(f).held;
export const faceError4 = (f, build) => PRESETS4[f] ? null : F.faceError(f, build);

// Sketch lines (pure): a thin offset copy of a stroke's leading edge (or an outline's outer ring).
function sketchOf(it, [dx, dy]) {
  const edge = it.pts.outer ? it.pts.outer : it.pts.slice(0, Math.ceil(it.pts.length / 2));
  if (edge.length < 3) return null;
  return {pts: taper(edge.map(([x, y]) => [x + dx, y + dy]), SKETCH.w, {over: .02, min: .25}), fill: INK, ink: true, alpha: SKETCH.alpha, sketch: true};
}
export function sketchPass(items, part) {
  const out = []; for (const it of items) if (it.ink && !it.eye && !it.sketch && (it.fill === INK)) for (const o of SKETCH.offsets[part]) { const s = sketchOf(it, o); if (s) out.push(s); }
  return out;
}

// Draw list (pure), the faces3 format: [{d, fill, rule, ink, alpha, clip, kind, bbox}] in canvas px.
export function faceParts4(f, {px = 512, tier = 'mid', blink = false, talk = null, grid = GRID4} = {}) {
  const r = resolveFace4(f), g = grid, crowd = tier === 'crowd' || tier === 'bg', list = [];
  const add = items => { for (const it of items) { if (crowd && (it.hi || it.lash || it.sketch)) continue; list.push(it); } };
  const extras = (r.extras ?? []).flatMap(e => ALL.extras[e] ? ALL.extras[e](g) : []);
  add(extras.filter(it => it.under));   // a flush sits under the ink
  const brows = partXf((ALL.brows[r.brows] ?? ALL.brows.none)(g), 'brow', g);
  add(brows); add(sketchPass(brows, 'brow'));
  let eyes;
  if (blink) eyes = ALL.eyes['closed-line'](g);
  else { const L = (ALL.eyes[r.eyes] ?? ALL.eyes.oval)(g), R = (ALL.eyes[r.eyesR ?? r.eyes] ?? ALL.eyes.oval)(g); eyes = [...L.filter(it => centreX(it) < 0), ...R.filter(it => centreX(it) > 0)]; }
  if (r.look) eyes = eyes.map(it => it.sclera ? it : {...it, pts: shiftPts(it.pts, r.look)});
  add(partXf(eyes, 'eye', g));
  const fam = talkFamily(r.mouth), mouthName = talk !== null && fam && !r.held ? TALK[fam][talk] : r.mouth;
  const mouth = partXf((ALL.mouths[mouthName] ?? ALL.mouths.smile)(g), 'mouth', g);
  add(mouth); add(sketchPass(mouth, 'mouth'));
  add(extras.filter(it => !it.under));
  const X = x => +((x / F.W + .5) * px).toFixed(1), Y = y => +((F.H / 2 - y) * px).toFixed(1);
  const path = p => 'M' + p.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z';
  return list.map(it => ({d: it.pts.outer ? path(it.pts.outer) + path(it.pts.inner) : path(it.pts), fill: it.fill, rule: it.pts.outer ? 'evenodd' : 'nonzero', ink: !!it.ink, alpha: it.alpha ?? 1,
    clip: it.clip ? path(it.clip) : null, kind: it.sketch ? 'sketch' : it.eye ? 'eye' : it.mouth ? 'mouth' : it.sclera ? 'sclera' : null, bbox: bbox(it.pts.outer ?? it.pts)}));
}
// Eye centres in face units (pure; the 0.30-of-head-width check).
export function eyeCentres4(f) {
  const r = resolveFace4(f), g = GRID4, items = partXf([...(ALL.eyes[r.eyes] ?? ALL.eyes.oval)(g).filter(it => centreX(it) < 0), ...(ALL.eyes[r.eyesR ?? r.eyes] ?? ALL.eyes.oval)(g).filter(it => centreX(it) > 0)], 'eye', g);
  const c = side => { const b = items.filter(it => (it.eye || it.sclera) && side * centreX(it) > 0).map(it => bbox(it.pts.outer ?? it.pts)); return (Math.min(...b.map(x => x[0])) + Math.max(...b.map(x => x[2]))) / 2; };
  return [c(-1), c(1)];
}

// ---- browser --------------------------------------------------------------------------------------------------------------
export function drawFace4(g2, f, {px, tier, skin = '#f6c9a0', blink = false, talk = null} = {}) {
  const edge = F.darkSkin(skin);
  for (const it of faceParts4(f, {px, tier, blink, talk})) {
    const p = new Path2D(it.d); g2.save(); g2.globalAlpha = it.alpha;
    if (it.clip) g2.clip(new Path2D(it.clip));
    if (edge && it.ink && it.kind !== 'sketch') { g2.strokeStyle = F.EDGE; g2.lineWidth = 2; g2.lineJoin = 'round'; g2.stroke(p); }
    g2.fillStyle = it.fill; g2.fill(p, it.rule); g2.restore();
  }
}
const cache = new Map();
export function faceMaterial4(f, tier = 'hero', skin = '#f6c9a0', {blink = false, talk = null} = {}) {
  const key = JSON.stringify([f, tier, F.darkSkin(skin), blink, talk]); if (cache.has(key)) return cache.get(key);
  let mat;
  if (typeof document === 'undefined') mat = new T.MeshBasicMaterial({transparent: true, opacity: 0});
  else {
    const px = F.TIER_PX[tier] ?? 512, c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * F.H / F.W);
    drawFace4(c.getContext('2d'), f, {px, tier, skin, blink, talk});
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    mat = new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  }
  mat.name = 'face4_' + (typeof f === 'string' ? f : 'custom'); cache.set(key, mat); return mat;
}
export function setFace4(actor, f, {blink = false, talk = null} = {}) {
  const tier = actor.tier === 'hero' ? 'hero' : 'mid', skin = actor.skin ?? '#f6c9a0';
  if (!actor.faceLayer) { const m = new T.Mesh(decalGeometry(), faceMaterial4(f, tier, skin)); m.name = 'face_decal'; m.renderOrder = 2; m.position.y = .58; actor.pivots.head.add(m); actor.faceLayer = m; }
  actor.faceLayer.material = faceMaterial4(f, tier, skin, {blink, talk}); actor.face = f; actor.faceBlink = blink; actor.faceTalk = talk; return actor;
}
