// avatar-style/faces6.js — Faces v6 (P2, opt-in preset `faceStyle: 'v6'`; faces5 stays the default for old specs).
// The owner's sheet linework (faces5 primitives, same solid #111 ink and stroke weight, same cell → head-front layout) plus restrained
// colour fills drawn UNDER the ink. Fixed palette (PALETTE6), no gradients; at most 3 fill roles per face besides skin and ink (ROLES6:
// mouth interior · teeth · tongue · eye whites · glint · blush · water (tears/sweat) · anger mark · sparkle).
//   · FACES6: 24 named expressions, each {brows, eyes, mouth, extras} as faces5 primitives (cell units) + `fills` (role specs).
//   · ALIAS6: every faces5 hero_* name (and the common faces5 / faces4 names) → its nearest v6 face; any other faces5 name draws its
//     faces5 linework unchanged (no fills).
//   · TALK6: four families (happy · neutral · sad · angry) × closed · small · open · wide (coloured interior; top teeth from open;
//     tongue in wide); engine/lipflap.js FAMILY6 / talkFamily6(name) picks the family from the expression. Restraint = ≤ 3 DISTINCT
//     fill colours (white is one colour everywhere).
//   · Life (pure, seeded; opt-in spec `faceLife`): blinkAt6 (every 3–5 s, 2 frames), popAt6 (an expression change: 8 % squash on
//     frame 0, overshootEase settle over 4 frames, a 1-frame blink).
//   · faceItems6 (pure draw list, head units) · faceRoles6 · drawFace6 / faceMaterial6 / setFace6 (browser; decal = faces5's).
import * as T from 'three';
import {HEAD} from './body.js';
import {darkSkin} from './faces3.js';
import {primItem, bbox, GRID5, TIER_PX, INK, EDGE, decalGeometry5, faceItems5, resolveFace5, isHeld as isHeld5} from './faces5.js';
import {CELLS5} from './faces5-data.js';
import {overshootEase} from '../engine/motion5b.js';
import {talkSet6, talkFamily6} from '../engine/lipflap.js';

export const PALETTE6 = {ink: '#111111', mouth: '#4A1520', teeth: '#FFFFFF', teethBand: '#E6E6EA', tongue: '#F2708A', tongueLine: '#C9506A', eyeWhite: '#FFFFFF',
  glint: '#FFFFFF', blush: '#FF8FA3', water: '#6CCBFF', waterHi: '#FFFFFF', anger: '#E2364A', sparkle: '#FFFFFF'};   // P2b owner: white sparkles (white is one colour wherever it appears)
export const ROLE_COLOURS = {mouth: ['mouth'], teeth: ['teeth', 'teethBand'], tongue: ['tongue', 'tongueLine'], eyeWhite: ['eyeWhite'], glint: ['glint'], blush: ['blush'],
  water: ['water', 'waterHi'], anger: ['anger'], sparkle: ['sparkle']};
export const MAX_COLOURS = 3, MAX_ROLES = MAX_COLOURS, GLINT_R = .035, BLUSH_OPACITY = .4;
const K = GRID5.cell, SW = GRID5.stroke, MY = -.20 / K, C = (n, k) => CELLS5[n][k];

// ---- geometry helpers (cell units, y up) ---------------------------------------------------------------------------------------
const ell = (cx, cy, rx, ry, n = 32) => Array.from({length: n}, (_, i) => { const a = i / n * 2 * Math.PI; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const star = (cx, cy, r, k = .38, n = 6) => { const tips = [[cx, cy + r], [cx + r, cy], [cx, cy - r], [cx - r, cy]], out = [];
  for (let i = 0; i < 4; i++) { const a = tips[i], b = tips[(i + 1) % 4], c = [cx + ((a[0] + b[0]) / 2 - cx) * k, cy + ((a[1] + b[1]) / 2 - cy) * k];
    for (let j = 0; j < n; j++) { const t = j / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } } return out; };
const shift = (prims, dx, dy = 0) => prims.map(p => { const [k, w, ...v] = p; if (k === 'r') return [k, w, v[0] + dx, v[1] + dy, v[2], v[3]]; if (k === 'D' || k === 'U') return [k, w, v[0] + dx, v[1] + dy, ...v.slice(2)];
  return [k, w, ...v.map((x, i) => x + (i % 2 ? dy : dx))]; });
const wave = (x0, x1, y, amp, waves = 2, n = 24) => ['p', SW, ...Array.from({length: n + 1}, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * t, y + amp * Math.sin(t * waves * 2 * Math.PI)]; }).flat()];
const zig = (x0, x1, y, amp, k = 4) => ['p', SW, ...Array.from({length: 2 * k + 1}, (_, i) => [x0 + (x1 - x0) * i / (2 * k), y + (i % 2 ? amp : -amp) * (i === 0 || i === 2 * k ? 0 : 1)]).flat()];
// mouth shapes (cell units): a D (flat top, round bottom), a dome U (flat bottom, round top), an oval ring, a rounded clench box
const D = (rx, ry, yt = MY + .06, cx = 0, s = 0) => ['D', SW, cx, yt, rx, ry, s];
const U = (rx, ry, yb = MY - .12, cx = 0, s = 0) => ['U', SW, cx, yb, rx, ry, s];
const O = (rx, ry, cy = MY - .02, cx = 0) => ['r', SW, cx, cy, rx, ry];
const capsule = (cx, cy, w, h) => ['r', SW, cx, cy, w / 2, h / 2];
// shock / terror eyes: white ring, ink outline, ink pupil (disc) — pupil radius p
const eyeWhites = (cx, cy, rx, ry, p, px = 0, py = 0) => ({ring: ['r', SW, cx, cy, rx, ry], pupil: ['o', 0, cx + px, cy + py, p, p]});

// ---- the 24 expressions ------------------------------------------------------------------------------------------------------
// fills: [role, spec] — 'mouth' / 'teeth' {depth} / 'tongue' fill the mouth prim's interior (clipped); 'eyeWhite' {pts}; 'glint' (auto on
// open capsule eyes or the listed pupils); 'blush' (cheeks); 'water' {streams | drops}; 'anger' (corner mark); 'sparkle' {at}
const capsEyes = n => C(n, 'eyes');
const W5 = eyeWhites(-.15, .07, .1, .12, .045), W6 = eyeWhites(.15, .07, .1, .12, .045);
const T5 = eyeWhites(-.15, .07, .11, .13, .022, 0, .01), T6 = eyeWhites(.15, .07, .11, .13, .022, 0, .01);
const TOPY = -.19;
const boxM = (w, h) => ['q2', SW, -w / 2, TOPY - h, w / 2, TOPY];
const lineM = (hw = .09) => ['s', SW, -hw, TOPY - .07, hw, TOPY - .07];
const frownM = () => ['c', SW, -.1, -.31, -.04, -.22, .04, -.22, .1, -.31];
const domeM = (rx, ry) => ['U', SW, 0, TOPY - ry - .02, rx, ry, 0];
function wobbleM(rx, ry, amp = .02, n = 28) {   // a dome whose lower lip wobbles (3 half waves, corners stay on the base line)
  const yb = TOPY - ry - .02, pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI; pts.push([Math.cos(a) * rx, yb + Math.sin(a) * ry]); }
  for (let i = 1; i < n; i++) { const t = i / n; pts.push([-rx + 2 * rx * t, yb + amp * Math.sin(3 * Math.PI * t)]); } return ['poly', SW, pts];
}
const H5 = (() => { const b = bbox(primItem(C('angry', 'mouth')[0]).line); return b[3] - b[1]; })();   // the faces5 angry mouth's height (cu)
export const H5_CU = H5, RAGE_TEETH_CU = Math.min(.8, 1.5 * H5 / .17) * .17;   // teeth band height of rage (cu) vs the faces5 angry mouth's height
const RAGE_DEPTH = Math.min(.8, 1.5 * H5 / .17);   // teeth band height = 1.5 × that (the dome's interior is .17 tall)
const clench = (rx = .15, ry = .075, cy = MY - .03) => ['q2', SW, -rx, cy - ry, rx, cy + ry];   // rounded box (drawn as a ring polygon)
export const FACES6 = {
  neutral: {eyes: capsEyes('smile'), mouth: [['s', SW, -.09, MY - .04, .09, MY - .04]], fills: [['glint']]},
  smile: {eyes: capsEyes('smile'), mouth: C('smile', 'mouth'), fills: [['glint']]},
  grin: {eyes: capsEyes('grin'), mouth: C('grin', 'mouth'), fills: [['mouth'], ['teeth', {depth: .32}], ['glint']]},
  laugh: {eyes: C('happy', 'eyes'), mouth: [D(.2, .24, MY + .08)], fills: [['mouth'], ['tongue']]},
  smirk: {eyes: capsEyes('smile'), mouth: [['c', SW, -.05, -.25, .04, -.29, .15, -.27, .2, -.19]], fills: [['glint']]},
  wink: {eyes: C('wink_soft', 'eyes'), mouth: C('wink_soft', 'mouth'), fills: [['glint'], ['blush', {side: -1}]]},
  scheme: {brows: [['c', SW, .1, .19, .14, .25, .21, .26, .26, .22], ['s', SW, -.27, .16, -.07, .13]], eyes: [['s', .105, -.16, .055, -.16, -.015], ['s', .105, .17, .08, .17, -.01]],
    mouth: [['c', SW, -.06, -.2, .03, -.27, .17, -.26, .23, -.15]], fills: [['glint']]},
  shock: {brows: C('shock', 'brows'), eyes: [W5.ring, W5.pupil, W6.ring, W6.pupil], mouth: [O(.09, .13, MY - .05)], fills: [['eyeWhite', {eyes: [W5, W6]}], ['mouth'], ['glint', {pupils: [W5, W6]}]]},
  gasp: {brows: C('gasp', 'brows'), eyes: C('gasp', 'eyes'), mouth: [U(.12, .14, MY - .13)], fills: [['mouth'], ['glint']]},
  panic: {brows: C('worried', 'brows'), eyes: capsEyes('worried'), mouth: [clench(.17, .07)], fills: [['teeth', {clench: true}], ['water', {sweat: [.3, .26]}], ['glint']]},
  terrified: {brows: C('worried', 'brows'), eyes: [T5.ring, T5.pupil, T6.ring, T6.pupil], mouth: [zig(-.15, .15, MY - .05, .03, 4)], fills: [['eyeWhite', {eyes: [T5, T6]}], ['water', {sweat: [.31, .28]}]]},
  cry: {brows: C('worried', 'brows'), eyes: [['s', .07, -.31, -.04, -.09, .05], ['s', .07, .31, -.04, .09, .05]], mouth: [wobbleM(.16, .17, .025)],
    fills: [['mouth'], ['teeth', {depth: .28}], ['water', {streams: true}]]},   // P2b: eyes squeezed shut, tilted down at the outer corners; wide downturned wobbly mouth; wavy tears
  sad_soft: {brows: C('worried', 'brows'), eyes: capsEyes('worried'), mouth: C('worried', 'mouth'), fills: [['glint']]},
  determined: {brows: [['s', .066, -.28, .19, -.07, .13], ['s', .066, .07, .13, .28, .19]], eyes: [['s', .108, -.15, .08, -.15, .0], ['s', .108, .15, .08, .15, .0]], mouth: [clench(.15, .06)],
    fills: [['teeth', {clench: true}], ['glint']]},
  rage: {eyes: C('angry', 'eyes'), mouth: [U(.17, .17, MY - .12)], fills: [['mouth'], ['teeth', {depth: RAGE_DEPTH, top: true}], ['anger']]},   // P2b: classic anger mark; teeth ≥ the faces5 angry mouth's height
  awe: {brows: [['c', SW, -.31, .27, -.27, .37, -.12, .4, -.05, .3], ['c', SW, .05, .3, .12, .4, .27, .37, .31, .27]], eyes: [['o', 0, -.17, .07, .115, .135], ['o', 0, .17, .07, .115, .135]], mouth: [O(.06, .07, MY - .03)],
    fills: [['mouth'], ['glint', {dots: [[-.125, .125, .046], [-.215, .012, .022], [.215, .125, .046], [.125, .012, .022]]}], ['sparkle', {at: [[.39, .35, .08], [-.41, .31, .06], [.43, .13, .045]]}]]},   // P2b: big round eyes, 2 glints each, raised arched brows, 3 outlined white sparkles
  warm: {eyes: C('content', 'eyes'), mouth: C('content', 'mouth'), fills: [['blush']]},
  embarrassed: {eyes: C('blush_smile', 'eyes'), mouth: [wave(-.13, .13, MY - .03, .025, 1.5)], fills: [['blush']]},
  sleepy: {eyes: C('sleep', 'eyes'), mouth: [O(.04, .05, MY - .02)], extras: C('sleep', 'extras'), fills: [['mouth']]},
  thinking: {brows: [['c', SW, .1, .19, .14, .25, .21, .26, .26, .22]], eyes: [['s', .105, -.15, .06, -.15, -.01], ['s', .105, .15, .08, .15, .01]], mouth: [['s', SW, .02, MY - .03, .18, MY + .0]], fills: [['glint']]},
  disgust: {brows: [['s', SW, -.27, .2, -.08, .16], ['s', SW, .08, .16, .27, .2]], eyes: [['s', .105, -.15, .09, -.15, .01], ['s', .105, .15, .09, .15, .01]], mouth: [['c', SW, -.17, -.17, -.06, -.22, .06, -.22, .17, -.17]],
    tongueOut: true, fills: [['tongue', {out: true}], ['glint']]},
  nervous_laugh: {eyes: C('sweat_smile', 'eyes'), mouth: [D(.17, .17, MY + .06)], fills: [['mouth'], ['teeth', {depth: .38}], ['water', {sweat: [.33, .3]}]]},
  relief: {eyes: C('content', 'eyes'), mouth: [D(.15, .15, MY + .05)], fills: [['mouth'], ['water', {sweat: [.33, .3]}]]},
  yell: {eyes: C('xd_shout', 'eyes'), mouth: [U(.17, .19, MY - .16)], fills: [['mouth'], ['teeth', {depth: .24, top: true}], ['tongue']]},
};
export const FACE_NAMES6 = Object.keys(FACES6);
// Phase 1F: THE GOVERNOR's own faces (opt-in by name; FACE_NAMES6 stays the 24). Thick ink, light skin; his 3D mustache sits
// just above the mouth line (avatar-style/governor.js), so the mouths start low. Talk families in GOV_FAMILY6.
export const FACES_GOV = {
  gov_smug: {brows: [['c', SW * 1.2, .08, .2, .13, .27, .21, .29, .27, .24], ['s', SW * 1.2, -.27, .17, -.07, .15]],
    eyes: [['s', .11, -.21, .06, -.09, .06], ['s', .11, .1, .07, .22, .07]],
    mouth: [['c', SW * 1.15, -.15, -.32, -.03, -.35, .1, -.34, .18, -.25]], fills: []},
  gov_announce: {brows: [['s', SW * 1.2, -.28, .24, -.07, .19], ['s', SW * 1.2, .07, .19, .28, .24]], eyes: [W5.ring, W5.pupil, W6.ring, W6.pupil],
    mouth: [U(.17, .2, MY - .16)], fills: [['eyeWhite', {eyes: [W5, W6]}], ['mouth'], ['teeth', {depth: .24, top: true}]]},
  gov_panic: {brows: C('worried', 'brows'), eyes: [T5.ring, T5.pupil, T6.ring, T6.pupil], mouth: [O(.11, .12, MY - .1)],
    fills: [['eyeWhite', {eyes: [T5, T6]}], ['mouth'], ['water', {sweat: [.33, .3]}], ['water', {sweat: [-.36, .2]}]]},
  gov_oops: {brows: [['s', SW * 1.2, -.27, .16, -.08, .21], ['s', SW * 1.2, .08, .21, .27, .16]], eyes: [['s', .11, -.15, .09, -.15, .02], ['s', .11, .15, .09, .15, .02]],
    mouth: [clench(.2, .075, MY - .1)], fills: [['teeth', {clench: true}], ['water', {sweat: [.36, .24]}], ['glint']]},
};
export const GOV_FAMILY6 = {gov_smug: 'happy', gov_announce: 'angry', gov_panic: 'sad', gov_oops: 'neutral'};
// fearbell pass 2 (owner A3, opt-in by name; FACE_NAMES6 stays the 24): deadpan = heavy flat lids over small eyes, a flat line mouth (the fourth-wall look)
export const FACES_FB = {deadpan: {brows: [['s', SW, -.25, .1, -.06, .1], ['s', SW, .06, .1, .25, .1]], eyes: [['s', .1, -.15, .055, -.15, .015], ['s', .1, .15, .055, .15, .015]],
  mouth: [['s', SW, -.1, MY - .04, .1, MY - .04]], fills: []}};
export const GOV_FACES = Object.keys(FACES_GOV);
const faceDef6 = n => FACES6[n] ?? FACES_GOV[n] ?? FACES_FB[n];
// faces5 names → nearest v6 face (old shot lists keep working)
export const ALIAS6 = {hero_wink: 'wink', hero_grin: 'grin', hero_shock: 'shock', hero_panic: 'panic', hero_scheme: 'scheme', hero_cry: 'cry', hero_rage: 'rage', hero_soft: 'warm',
  happy: 'smile', content: 'warm', wink_soft: 'wink', wink_shine: 'wink', laugh_xd: 'laugh', xd_laugh: 'laugh', xd_grin: 'laugh', beam: 'grin', beam2: 'grin', beam3: 'grin', o_small: 'gasp',
  stare_o: 'shock', worried: 'sad_soft', worried2: 'sad_soft', frown: 'sad_soft', sad: 'sad_soft', sweat_frown: 'panic', side_eye: 'scheme', smug: 'smirk', angry: 'rage', flat_brows: 'determined',
  sparkle: 'awe', starry: 'awe', wonder: 'awe', blush_smile: 'embarrassed', sweat_smile: 'nervous_laugh', sleep: 'sleepy', confused: 'thinking', tongue: 'disgust', xd_shout: 'yell', scream: 'yell',
  shout: 'yell', blank: 'neutral', sob: 'cry', crying: 'cry', calm: 'warm', polite: 'warm', steady: 'neutral', brave: 'determined', curious: 'thinking', sheepish: 'nervous_laugh', nervous: 'panic'};
export const name6 = f => typeof f === 'string' ? (FACES6[f] || FACES_GOV[f] || FACES_FB[f] ? f : ALIAS6[f] && FACES6[ALIAS6[f]] ? ALIAS6[f] : null) : null;
export const faceError6 = f => { if (name6(f)) return null; try { resolveFace5(f); return null; } catch (e) { return e.message; } };
export const family6 = f => talkFamily6(name6(f)) ?? GOV_FAMILY6[name6(f)] ?? (FACES_FB[name6(f)] ? 'neutral' : null);
export const isHeld6 = f => { const n = name6(f); return n ? false : isHeld5(f); };   // P2b: every v6 expression talks (all 24 are in a family)

// ---- talk sets (cell units): four families × closed · small · open · wide (engine/lipflap.js FAMILY6 says which) --------------------
// All hang from TOPY (the jaw drops, the top lip stays). happy keeps the upturned grin-talk; neutral = level; sad = downturned domes
// (corners lower than the centre); angry = clenched / bared teeth (both rows), then a shout. A talk shape owns its fills.
export const TALK6 = {
  happy: [{mouth: C('smile', 'mouth')[0], fills: []}, {mouth: D(.16, .1), fills: [['mouth'], ['teeth', {depth: .36}]]}, {mouth: D(.19, .15), fills: [['mouth'], ['teeth', {depth: .3}]]}, {mouth: D(.21, .21), fills: [['mouth'], ['teeth', {depth: .22}], ['tongue']]}],
  neutral: [{mouth: lineM(), fills: []}, {mouth: boxM(.2, .07), fills: [['mouth']]}, {mouth: boxM(.23, .14), fills: [['mouth'], ['teeth', {depth: .32}]]}, {mouth: boxM(.26, .22), fills: [['mouth'], ['teeth', {depth: .26}], ['tongue']]}],
  sad: [{mouth: frownM(), fills: []}, {mouth: domeM(.1, .07), fills: [['mouth']]}, {mouth: domeM(.13, .12), fills: [['mouth'], ['teeth', {depth: .3}]]}, {mouth: wobbleM(.16, .17), fills: [['mouth'], ['teeth', {depth: .26}], ['tongue']]}],
  angry: [{mouth: boxM(.3, .09), fills: [['teeth', {clench: true}]]}, {mouth: boxM(.3, .12), fills: [['mouth'], ['teeth', {both: true, depth: .34}]]}, {mouth: boxM(.32, .18), fills: [['mouth'], ['teeth', {both: true, depth: .3}]]}, {mouth: U(.17, .19, TOPY - .21), fills: [['mouth'], ['teeth', {depth: .24, top: true}], ['tongue']]}],
};
export const talkSetFor6 = f => talkSet6(family6(f));
export const TALK_NAMES6 = Object.keys(TALK6);
// the mouth corners vs the centre (cell units, pure): + upturned, 0 level, − downturned — the y of the extreme-x points minus the
// mid-height of the centre column (a closed shape / curve; a flat line is level)
export function mouthTurn(prim) {
  const pts = interior(prim), closed = prim[0] !== 's' && prim[0] !== 'c' && prim[0] !== 'p', b = bbox(pts), xs = Math.max(Math.abs(b[0]), Math.abs(b[2])), ys = [];
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; if ((a[0] <= 0) !== (c[0] <= 0)) ys.push(a[1] + (c[1] - a[1]) * (0 - a[0]) / (c[0] - a[0])); }
  const ends = pts.filter(([x]) => Math.abs(Math.abs(x) - xs) < .012), cy = ends.reduce((a, [, y]) => a + y, 0) / ends.length, cmid = (Math.min(...ys) + Math.max(...ys)) / 2;
  return +(cy - cmid).toFixed(3);
}

// ---- fills (pure) -----------------------------------------------------------------------------------------------------------
const interior = m => { if (m[0] === 'q2') return roundBox(m); if (m[0] === 'poly') return m[2]; const it = primItem(m); return it.line ?? it.pts; };
function roundBox([, , x0, y0, x1, y1], r0 = .05, n = 6) { const r = Math.min(r0, (y1 - y0) / 2 - .004, (x1 - x0) / 2 - .004), out = []; const corner = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x1 - r, y0 + r, -Math.PI / 2); corner(x1 - r, y1 - r, 0); corner(x0 + r, y1 - r, Math.PI / 2); corner(x0 + r, y0 + r, Math.PI); return out; }
const bounds = pts => bbox(pts);
function fillItems(spec, mouthPrim, eyePrims, opts = {}) {
  const out = [], [role, o = {}] = spec, P = PALETTE6, add = (pts, colour, extra = {}) => out.push({pts, fill: colour, role, ...extra});
  const mi = mouthPrim ? interior(mouthPrim) : null, mb = mi && bounds(mi);
  if (role === 'mouth' && mi) add(mi, P.mouth);
  else if (role === 'teeth' && mi) {
    if (o.clench) { add(mi, P.teeth); const [x0, y0, x1, y1] = mb, h = y1 - y0; add(rect(x0, y0, x1, y0 + .15 * h), P.teethBand, {clip: mi}); out.push({line: [[x0 + .02, (y0 + y1) / 2], [x1 - .02, (y0 + y1) / 2]], w: SW * .6, color: P.ink, role, under: true}); }
    else if (o.both) { const [x0, y0, x1, y1] = mb, h = (y1 - y0) * (o.depth ?? .3);   // clenched-teeth talk: both rows with the dark gap between
      add(rect(x0 - .01, y1 - h, x1 + .01, y1 + .01), P.teeth, {clip: mi}); add(rect(x0 - .01, y1 - h, x1 + .01, y1 - h * .85), P.teethBand, {clip: mi});
      add(rect(x0 - .01, y0 - .01, x1 + .01, y0 + h), P.teeth, {clip: mi}); add(rect(x0 - .01, y0 + h * .85, x1 + .01, y0 + h), P.teethBand, {clip: mi}); }
    else { const [x0, y0, x1, y1] = mb, h = (y1 - y0) * (o.depth ?? .3), ty = y1; add(rect(x0 - .01, ty - h, x1 + .01, ty + .01), P.teeth, {clip: mi}); add(rect(x0 - .01, ty - h, x1 + .01, ty - h * .85), P.teethBand, {clip: mi}); }
  } else if (role === 'tongue') {
    if (o.out) { const tx = .03, ty = -.33; add(ell(tx, ty, .075, .085), P.tongue); out.push({line: [[tx, ty + .07], [tx, ty - .03]], w: SW * .55, color: P.tongueLine, role}); out.push({line: ell(tx, ty, .075, .085), w: SW, color: P.ink, role, closed: true, ink: true}); }
    else if (mi) { const [x0, y0, x1, y1] = mb, cx = (x0 + x1) / 2, w = (x1 - x0) * .32, h = (y1 - y0) * .32; add(ell(cx, y0 + h * .55, w, h), P.tongue, {clip: mi}); out.push({line: [[cx, y0 + h * 1.2], [cx, y0 + h * .2]], w: SW * .5, color: P.tongueLine, role, clip: mi}); }
  } else if (role === 'eyeWhite') for (const e of o.eyes) { const [, , cx, cy, rx, ry] = e.ring; add(ell(cx, cy, rx, ry), P.eyeWhite); }
  else if (role === 'glint') {
    const g = GLINT_R / K, dots = [];
    if (o.dots) dots.push(...o.dots);
    else if (o.pupils) for (const e of o.pupils) { const [, , px, py, r] = e.pupil; dots.push([px + r * .35, py + r * .4, Math.min(g, r * .55)]); }
    else for (const e of eyePrims) if (e[0] === 's' && e[1] >= .09) { const [, w, x0, y0, x1, y1] = e; if (Math.abs(x1 - x0) > .02) continue; const top = Math.max(y0, y1), room = w / 2 - g - .002; dots.push([x0 + room, top + room, g]); }   // upper-right, kept inside the capsule's round top
    for (const [x, y, r] of dots) add(ell(x, y, r, r, 16), P.glint);
  } else if (role === 'blush') for (const s of o.side ? [o.side] : [-1, 1]) add(ell(s * .3, -.11, .085, .045), P.blush, {opacity: BLUSH_OPACITY});
  else if (role === 'water') {
    if (o.streams) for (const s of [-1, 1]) {   // two wavy streams from the outer eye corners, tapering, a drop at the bottom, a white highlight
      const N = 18, L = .34, cx = t => s * (.31 + .024 * Math.sin(t * 2.6 * Math.PI)), cyy = t => -.04 - t * L, hw = t => .034 * (1 - .6 * t), side = (k, f) => Array.from({length: N + 1}, (_, i) => { const t = i / N * f; return [cx(t) + k * hw(t), cyy(t)]; });
      add([...side(-1, 1), ...side(1, 1).reverse()], P.water); add(ell(cx(1), cyy(1) - .02, .04, .045), P.water);
      const hl = (k, o2) => Array.from({length: 13}, (_, i) => { const t = .05 + i / 12 * .55; return [cx(t) + k * .007 - s * o2, cyy(t)]; }); add([...hl(-1, .008), ...hl(1, .008).reverse()], P.waterHi);
      add(ell(cx(1) - s * .014, cyy(1) - .012, .01, .016, 12), P.waterHi); }
    if (o.sweat) { const [x, y] = o.sweat, drop = [x, y + .075, x, y - .025, .05];   // the faces5 drop: tip up, round end below
      add(primItem(['d', 0, ...drop]).pts, P.water); add(ell(x - .017, y - .03, .012, .018, 12), P.waterHi); out.push({...primItem(['d', SW * .7, ...drop]), color: P.ink, role, ink: true}); }
  } else if (role === 'anger') {   // P3b owner: the classic mark — four SEPARATE arcs around a shared centre, each bowing OUTWARD (a ")" turned to face away from the centre), clear gaps between them; red on an ink outline; top corner of the forehead
    const cx = .31, cy = .31, d = .09, w = .036, bow = .046;
    for (let k = 0; k < 4; k++) { const th = k * Math.PI / 2, ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
      const pt = (a, l) => [cx + ux * (d + a) + vx * l, cy + uy * (d + a) + vy * l];   // a: along the outward axis, l: along the arc's chord
      out.push({line: Array.from({length: 9}, (_, i) => { const l = -w + 2 * w * i / 8, a = bow * (1 - (l / w) ** 2); return pt(a, l); }), w: SW * .72, outline: SW * .24, color: P.anger, role}); } }
  else if (role === 'sparkle') for (const [x, y, r] of o.at) { add(star(x, y, r), P.sparkle); out.push({line: star(x, y, r), w: SW * .5, color: P.ink, role, closed: true, ink: true}); }
  return out;
}

// ---- draw list (pure; head units: x ∈ [−.5, .5], y up) ----------------------------------------------------------------------
// talk: 0..3 (lip flap), blink: closed arcs over the open eyes
const SLEEP_ARC = primItem(CELLS5.sleep.eyes[0]).line;
function blinkLines(eyePrims) {
  const its = eyePrims.map(primItem), b0 = bbox(SLEEP_ARC), c0 = [(b0[0] + b0[2]) / 2, (b0[1] + b0[3]) / 2], hw0 = (b0[2] - b0[0]) / 2, out = [];
  for (const side of [-1, 1]) { const mine = its.filter(it => Math.sign(bbox(it.line ?? it.pts)[0] + bbox(it.line ?? it.pts)[2]) === side); if (!mine.length) continue;
    const b = mine.map(it => bbox(it.line ?? it.pts)), x0 = Math.min(...b.map(q => q[0])), x1 = Math.max(...b.map(q => q[2])), y0 = Math.min(...b.map(q => q[1])), y1 = Math.max(...b.map(q => q[3]));
    const hw = Math.max(.085, Math.min(hw0, (x1 - x0) / 2 + .02)), sc = hw / hw0; out.push({line: SLEEP_ARC.map(([x, y]) => [(x0 + x1) / 2 + (x - c0[0]) * sc, (y0 + y1) / 2 + (y - c0[1])]), w: SW}); }
  return out;
}
// Restraint (P2b owner rule): at most MAX_COLOURS DISTINCT fill colours per face (and per talk shape) besides skin and ink; white is one
// colour wherever it appears (teeth, glints, eye whites, sparkles, highlights). When a shape needs more, the detail colours drop in this
// order: tongue line, teeth band, tongue (the wide talk shape of a face that already carries a colour of its own).
const DROP_ORDER = ['tongueLine', 'teethBand', 'tongue', 'blush'];
const isInk = it => (it.ink || (it.fill ?? it.color).toUpperCase() === INK.toUpperCase());
export const fillColoursOf = items => [...new Set(items.filter(it => !isInk(it)).map(it => (it.fill ?? it.color).toUpperCase()))];
function limitColours(list) {
  let cur = list;
  while (fillColoursOf(cur).length > MAX_COLOURS) {
    const have = fillColoursOf(cur), drop = DROP_ORDER.map(k => PALETTE6[k].toUpperCase()).find(c => have.includes(c)); if (!drop) break;
    cur = cur.filter(it => isInk(it) || (it.fill ?? it.color).toUpperCase() !== drop);
  }
  return cur;
}
export function faceItems6(f, {talk = null, blink = false, box = K} = {}) {
  const n = name6(f);
  if (!n) return faceItems5(f, {talk, blink, box});   // any other faces5 name: its own linework, no fills
  const F = faceDef6(n), items = [], ink = (prims, kind) => prims.forEach(p => { const it = p[0] === 'q2' ? {line: roundBox(p), w: SW, closed: true} : p[0] === 'poly' ? {line: p[2], w: p[1], closed: true} : primItem(p); items.push({...it, kind, color: INK}); });
  const fam = talkFamily6(n) ?? GOV_FAMILY6[n], t = talk !== null ? TALK6[talkSet6(fam)][talk] : null;
  let mouth = F.mouth, fills = F.fills;
  if (t) { mouth = [t.mouth]; fills = [...F.fills.filter(([r]) => !['mouth', 'teeth', 'tongue'].includes(r)), ...t.fills]; }   // a talk shape owns the mouth fills; the glint etc. stay
  const eyes = blink ? null : F.eyes;
  const live = fills.filter(([r]) => !(blink && (r === 'glint' || r === 'eyeWhite')));
  let fillList = live.flatMap(sp => fillItems(sp, mouth.find(m => ['D', 'U', 'r', 'q2', 'poly'].includes(m[0])) ?? null, F.eyes));
  fillList = limitColours(fillList);
  for (const it of fillList.filter(i => !i.ink && i.role !== 'glint')) items.push({...it, kind: 'fill'});
  ink(F.brows ?? [], 'brow');
  if (blink) for (const it of blinkLines(F.eyes)) items.push({...it, kind: 'eye', color: INK}); else ink(eyes, 'eye');
  ink(mouth, 'mouth'); ink(F.extras ?? [], 'extra');
  for (const it of fillList.filter(i => i.ink || i.role === 'glint')) items.push({...it, kind: 'fill'});   // glints and fill outlines sit on top
  const q = ([x, y]) => [x * box, y * box];
  return items.map(it => ({...it, ...(it.line ? {line: it.line.map(q), w: it.w * box, ...(it.outline ? {outline: it.outline * box} : {})} : {pts: it.pts.map(q), holes: it.holes?.map(h => h.map(q)), more: it.more?.map(h => h.map(q))}), ...(it.clip ? {clip: it.clip.map(q)} : {})}));
}
// fill roles a face uses (pure; the restraint gate) and the colours it draws
export const faceRoles6 = (f, o = {}) => [...new Set(faceItems6(f, o).filter(i => i.role).map(i => i.role))];
export const faceColours6 = (f, o = {}) => [...new Set(faceItems6(f, o).map(i => (i.fill ?? i.color).toUpperCase()))];
export const fillColours6 = (f, o = {}) => fillColoursOf(faceItems6(f, o));   // distinct fill colours (skin and ink excluded)

// ---- life (pure, seeded) --------------------------------------------------------------------------------------------------------
const rnd = (seed, k) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
export const LIFE6 = {gapMin: 3, gapMax: 5, blinkFrames: 2, pop: .08, settleFrames: 4};
// blink: closed for 2 frames, every 3–5 s (seeded gaps); changes: expression-change times → a 1-frame blink on each
export function blinkAt6(seed, t, {fps = 24, changes = []} = {}) {
  const f = Math.round(t * fps);
  for (const c of changes) if (f === Math.round(c * fps)) return true;
  let s = LIFE6.gapMin * rnd(seed, 0), k = 1;   // blink starts in frames (seeded gaps of 3–5 s)
  for (let sf = Math.round(s * fps); sf <= f; sf = Math.round(s * fps)) { if (f < sf + LIFE6.blinkFrames) return true; s += LIFE6.gapMin + (LIFE6.gapMax - LIFE6.gapMin) * rnd(seed, k++); }
  return false;
}
// head pop on an expression change: [sx, sy, sz] multipliers. Frame 0: squash (y −8 %, x/z +4 %); frames 1–4 settle with overshootEase.
export function popAt6(t, changes = [], {fps = 24} = {}) {
  let c = null; for (const x of changes) if (x <= t + 1e-9) c = x; if (c === null || c <= 0) return [1, 1, 1];
  const fr = Math.round((t - c) * fps); if (fr > LIFE6.settleFrames) return [1, 1, 1];
  const k = fr === 0 ? 1 : 1 - overshootEase(fr / LIFE6.settleFrames), a = LIFE6.pop * k;
  return [1 + a / 2, 1 - a, 1 + a / 2];
}

// ---- browser ------------------------------------------------------------------------------------------------------------------
export function drawFace6(g2, f, {px, skin = '#f6c9a0', blink = false, talk = null, box = K} = {}) {
  const edge = darkSkin(skin), X = x => (x + .5) * px, Y = y => (.5 - y) * px;
  const path = (p, close) => { const q = new Path2D(); p.forEach(([x, y], i) => i ? q.lineTo(X(x), Y(y)) : q.moveTo(X(x), Y(y))); if (close) q.closePath(); return q; };
  for (const it of faceItems6(f, {talk, blink, box})) {
    g2.save(); g2.lineCap = 'round'; g2.lineJoin = 'round';
    if (it.clip) g2.clip(path(it.clip, true));
    if (it.pts) { const p = path(it.pts, true); for (const h of [...(it.more ?? []), ...(it.holes ?? [])]) p.addPath(path(h, true));
      if (edge && it.fill === INK) { g2.strokeStyle = EDGE; g2.lineWidth = 3; g2.stroke(p); }
      g2.globalAlpha = it.opacity ?? 1; g2.fillStyle = it.fill; g2.fill(p, it.holes?.length ? 'evenodd' : 'nonzero'); }
    else { const p = path(it.line, !!it.closed); if (it.outline) { g2.strokeStyle = INK; g2.lineWidth = (it.w + 2 * it.outline) * px; g2.stroke(p); } if (edge && it.color === INK) { g2.strokeStyle = EDGE; g2.lineWidth = it.w * px + 3; g2.stroke(p); } g2.strokeStyle = it.color; g2.lineWidth = it.w * px; g2.stroke(p); }
    g2.restore();
  }
}
const cache6 = new Map();
export function faceMaterial6(f, tier = 'hero', skin = '#f6c9a0', {blink = false, talk = null} = {}) {
  const key = JSON.stringify([f, tier, darkSkin(skin), blink, talk]); if (cache6.has(key)) return cache6.get(key);
  let mat;
  if (typeof document === 'undefined') mat = new T.MeshBasicMaterial({transparent: true, opacity: 0});
  else { const px = TIER_PX[tier] ?? 512, c = document.createElement('canvas'); c.width = c.height = px; drawFace6(c.getContext('2d'), f, {px, skin, blink, talk});
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    mat = new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}); }
  mat.name = 'face6_' + (typeof f === 'string' ? f : 'custom'); cache6.set(key, mat); return mat;
}
export function setFace6(actor, f, {blink = false, talk = null} = {}) {
  const tier = actor.tier === 'hero' ? 'hero' : 'mid', skin = actor.skin ?? '#f6c9a0';
  if (!actor.faceLayer) { const m = new T.Mesh(decalGeometry5(), faceMaterial6(f, tier, skin)); m.name = 'face_decal'; m.renderOrder = 2; m.position.y = HEAD.centre; actor.pivots.head.add(m); actor.faceLayer = m; }
  actor.faceLayer.material = faceMaterial6(f, tier, skin, {blink, talk}); actor.face = f; actor.faceBlink = blink; actor.faceTalk = talk; return actor;
}
