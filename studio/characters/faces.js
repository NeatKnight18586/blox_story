// Classic Roblox-style face decals: thin black ink drawn on a canvas and
// wrapped onto the curved head front, like a Roblox face decal on the head mesh.
// The 35 expressions follow the owner's "35 Expression Exercise" sheet
// (dot eyes, line brows, simple mouths), redrawn as original vector strokes.
import * as T from 'three';
import {headFrontZ} from '../../avatar/headGeometry.js';

// Each expression is a list of strokes in a 100×100 box (like one sheet cell):
// eyes sit near y≈40, mouths near y≈75; x 32/68 are the eye columns.
// d=[x,y,r] filled dot · l=[x1,y1,x2,y2] line · q=[x1,y1,cx,cy,x2,y2] curve ·
// o=[x,y,rx,ry] outline ellipse · p=[[x,y]...] closed outline · w=[x1,x2,y,amp,waves] wavy line
const D = (x, y, r = 4.6) => ({d: [x, y, r]}), L = (...a) => ({l: a}), Q = (...a) => ({q: a}), O = (...a) => ({o: a}), P = (...pts) => ({p: pts}), W = (...a) => ({w: a});
// Mouth fills: dark interior, pink tongue, white teeth; outlines stay ink.
const MOUTH = '#6e1f2b', TONGUE = '#e8707c', TEETH = '#ffffff';
const F = (f, ...pts) => ({p: pts, f});
const dots = (y = 41, r) => [D(32, y, r), D(68, y, r)];
const closedSmile = (y = 40) => [Q(25, y - 2, 32, y + 6, 39, y - 2), Q(61, y - 2, 68, y + 6, 75, y - 2)];
const squeeze = (y = 40) => [L(25, y - 5, 37, y), L(37, y, 25, y + 5), L(75, y - 5, 63, y), L(63, y, 75, y + 5)];

export const FACES = Object.freeze({
  happy: [Q(23, 24, 30, 18, 37, 23), Q(63, 23, 70, 18, 77, 24), ...dots(), Q(31, 66, 50, 92, 69, 66)],
  sad: [L(22, 27, 39, 24), L(61, 24, 78, 27), L(24, 36, 39, 36), L(61, 36, 76, 36), Q(34, 80, 50, 66, 66, 80)],
  angry: [L(25, 16, 40, 32), L(75, 16, 60, 32), D(35, 44), D(65, 44), Q(30, 84, 50, 62, 70, 84)],
  confused: [L(22, 22, 34, 20), Q(60, 22, 69, 12, 78, 21), ...dots(), W(43, 58, 77, 2.5, 1.5)],
  pleased: [Q(24, 38, 31, 43, 38, 38), Q(62, 38, 69, 43, 76, 38), Q(43, 76, 51, 81, 58, 74)],
  pain: [Q(22, 16, 30, 22, 38, 16), Q(62, 16, 70, 22, 78, 16), ...squeeze(38), P([36, 70], [50, 62], [66, 70], [62, 84], [50, 78], [38, 84])],
  scared: [Q(22, 26, 30, 20, 38, 22), Q(62, 22, 70, 20, 78, 26), ...dots(40), P([34, 76], [44, 66], [58, 66], [68, 78], [56, 82], [50, 76], [42, 82])],
  serious: [L(24, 24, 38, 24), L(62, 24, 76, 24), ...dots(), L(42, 78, 58, 78)],
  silly: [Q(22, 22, 30, 16, 37, 21), Q(63, 21, 70, 16, 78, 22), L(24, 41, 38, 39), D(68, 41), L(34, 66, 68, 62), F(TONGUE, [46, 66], [58, 64], [60, 78], [53, 85], [47, 79])],
  flirty: [L(22, 22, 37, 24), L(63, 24, 78, 22), L(23, 42, 38, 39), L(62, 39, 77, 42), L(21, 44, 24, 40), L(79, 44, 76, 40), P([32, 66], [50, 70], [69, 62], [56, 82], [44, 82])],
  nervous: [L(22, 24, 36, 26), L(64, 26, 78, 24), Q(84, 10, 80, 18, 86, 20), ...dots(40, 4), W(32, 68, 77, 2.2, 2)],
  tired: [L(22, 24, 38, 27), L(62, 27, 78, 24), L(24, 40, 38, 40), L(62, 40, 76, 40), P([36, 80], [42, 70], [58, 70], [64, 80], [50, 76])],
  shocked: [Q(22, 22, 30, 12, 38, 20), Q(62, 20, 70, 12, 78, 22), ...dots(40, 4), O(50, 75, 8, 12)],
  irritated: [L(26, 22, 38, 30), L(74, 22, 62, 30), D(34, 42), D(66, 42), Q(42, 80, 50, 72, 58, 80)],
  wtf: [W(18, 40, 18, 2, 2), W(60, 82, 18, 2, 2), O(32, 40, 12, 9), O(68, 40, 12, 9), D(32, 42, 4.2), D(68, 42, 4.2)],
  rage: [L(22, 18, 40, 30), L(78, 18, 60, 30), L(28, 41, 38, 43), L(62, 43, 72, 41), P([30, 82], [38, 66], [50, 72], [62, 66], [70, 82], [50, 78])],
  disgusted: [L(22, 22, 38, 22), L(62, 22, 78, 22), L(22, 30, 38, 31), L(62, 31, 78, 30), L(24, 41, 38, 41), L(62, 41, 76, 41), W(32, 70, 76, 3, 1.5)],
  confident: [Q(24, 24, 31, 18, 38, 23), L(62, 22, 78, 20), Q(24, 38, 31, 46, 38, 38), L(62, 41, 76, 40), Q(40, 80, 58, 78, 66, 68)],
  drunk: [L(20, 28, 38, 24), L(62, 24, 80, 28), L(22, 31, 36, 29), L(64, 29, 78, 31), P([30, 68], [50, 74], [72, 64], [64, 82], [44, 84])],
  concerned: [L(26, 28, 36, 24), L(64, 24, 74, 28), D(34, 44, 4), D(66, 44, 4), L(44, 78, 56, 78)],
  curious: [Q(24, 18, 28, 12, 34, 14), Q(62, 22, 69, 16, 76, 22), ...dots(42), O(50, 76, 4.5, 6.5)],
  pouty: [L(26, 30, 38, 33), L(74, 30, 62, 33), D(34, 42), D(66, 42), Q(44, 80, 50, 70, 56, 80)],
  sick: [L(24, 24, 38, 21), L(62, 21, 76, 24), W(24, 38, 40, 1.5, 1), W(62, 76, 40, 1.5, 1), L(20, 50, 26, 50), L(74, 50, 80, 50), L(44, 78, 54, 78)],
  laughing: [L(24, 32, 40, 46), L(40, 32, 24, 46), L(60, 32, 76, 46), L(76, 32, 60, 46), P([30, 62], [70, 60], [62, 84], [40, 86]), F(TONGUE, [40, 83], [46, 75], [55, 75], [61, 82], [50, 86])],
  shame: [L(24, 26, 36, 22), L(64, 22, 76, 26), D(34, 42, 3.6), D(66, 42, 3.6), L(18, 54, 22, 48), L(24, 54, 28, 48), L(72, 54, 76, 48), L(78, 54, 82, 48), Q(44, 80, 50, 72, 56, 80)],
  incredulous: [L(22, 22, 38, 22), L(62, 20, 78, 22), L(24, 40, 38, 40), L(62, 40, 76, 40), L(40, 82, 54, 74)],
  bored: [L(24, 34, 38, 34), L(62, 34, 76, 34), D(32, 39, 3.6), D(68, 39, 3.6), L(36, 78, 64, 78)],
  snooty: [Q(22, 22, 30, 14, 38, 20), Q(62, 20, 70, 14, 78, 22), L(24, 40, 38, 40), L(62, 40, 76, 40), D(28, 42, 3), D(68, 42, 3), L(46, 82, 54, 82)],
  cold: [L(22, 24, 36, 28), L(64, 28, 78, 24), L(24, 39, 36, 39), L(64, 39, 76, 39), D(30, 42, 3), D(70, 42, 3), W(30, 70, 76, 2.5, 3)],
  calm: [...dots(42), L(48, 82, 52, 76)],
  crying: [L(22, 24, 38, 24), L(62, 24, 78, 24), L(24, 38, 38, 38), L(62, 38, 76, 38), L(27, 42, 27, 92), L(35, 42, 35, 92), L(65, 42, 65, 92), L(73, 42, 73, 92)],
  devious: [L(20, 14, 40, 30), L(80, 14, 60, 30), ...closedSmile(40), Q(34, 64, 50, 86, 66, 64)],
  pensive: [L(24, 24, 36, 24), L(64, 22, 76, 26), D(32, 42, 3.6), D(64, 42, 3.6), Q(42, 80, 50, 73, 58, 80)],
  excited: [Q(22, 22, 30, 12, 38, 20), Q(62, 20, 70, 12, 78, 22), Q(25, 42, 32, 34, 39, 42), Q(61, 42, 68, 34, 75, 42), P([30, 62], [70, 62], [64, 82], [50, 86], [36, 82]), F(TEETH, [31, 62], [69, 62], [68, 68], [32, 68]), L(32, 68, 68, 68)],
  triumph: [L(22, 18, 38, 24), L(78, 18, 62, 24), ...squeeze(38), P([28, 60], [72, 58], [62, 82], [40, 84]), F(TEETH, [29, 60], [71, 58], [70, 64], [30, 66]), L(30, 66, 70, 64)],
});

// Older scene code and tests use these six names; they map onto sheet faces.
export const ALIASES = Object.freeze({neutral: 'calm', worried: 'nervous', surprised: 'shocked', determined: 'serious'});
export const EXPRESSIONS = Object.freeze(Object.keys(FACES));
export const resolveExpression = name => ALIASES[name] ?? name;

const INK = '#1b1a1c', RES = 512;
const textures = new Map();
// Face styles (opt-in per avatar; legacy avatars keep the classic ink dots):
// 'lively' turns dot eyes into tall glossy eyes with an iris tint and two catchlights
// (the big-shiny-eye look popular on today's avatar faces, drawn originally here),
// with optional lashes and a soft cheek blush.
function livelyEye(g, s, x, y, r, st) {
  const rx = r * 1.3 * s, ry = r * 2.0 * s, X = x * s, Y = y * s - ry * .15;
  g.save();
  g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  const grad = g.createLinearGradient(0, Y - ry, 0, Y + ry); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(.55, 'rgba(0,0,0,0)'); grad.addColorStop(1, st.iris ?? '#6b4a2e');
  g.beginPath(); g.ellipse(X, Y, rx * .82, ry * .86, 0, 0, Math.PI * 2); g.fillStyle = grad; g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(X + rx * .3, Y - ry * .42, rx * .42, ry * .3, -.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(X - rx * .38, Y + ry * .38, rx * .2, 0, Math.PI * 2); g.fill();
  if (st.lashes) { g.strokeStyle = INK; g.lineWidth = 2.4 * s; const sd = x < 50 ? -1 : 1; g.beginPath(); g.moveTo(X + sd * rx * .7, Y - ry * .62); g.lineTo(X + sd * rx * 1.45, Y - ry * .95); g.stroke(); g.beginPath(); g.moveTo(X + sd * rx * .95, Y - ry * .2); g.lineTo(X + sd * rx * 1.6, Y - ry * .38); g.stroke(); }
  g.restore();
}
function drawFace(name, style = null) {
  const c = document.createElement('canvas'); c.width = c.height = RES;
  const g = c.getContext('2d'), s = RES / 100;
  if (style?.blush) { for (const x of [21, 79]) { const rg = g.createRadialGradient(x * s, 57 * s, 0, x * s, 57 * s, 10 * s); rg.addColorStop(0, 'rgba(255,120,140,.42)'); rg.addColorStop(1, 'rgba(255,120,140,0)'); g.fillStyle = rg; g.fillRect(0, 0, RES, RES); } }
  g.strokeStyle = g.fillStyle = INK; g.lineWidth = (style ? 5.2 : 4.6) * s; g.lineCap = g.lineJoin = 'round';
  for (const st of FACES[name]) {
    g.beginPath();
    if (st.d && style && st.d[1] < 55) { livelyEye(g, s, ...st.d, style); continue; }
    if (st.d) { const [x, y, r] = st.d; g.arc(x * s, y * s, r * 1.15 * s, 0, Math.PI * 2); g.fill(); continue; }
    if (st.l) { const [a, b, c2, d] = st.l; g.moveTo(a * s, b * s); g.lineTo(c2 * s, d * s); }
    if (st.q) { const [a, b, cx, cy, c2, d] = st.q; g.moveTo(a * s, b * s); g.quadraticCurveTo(cx * s, cy * s, c2 * s, d * s); }
    if (st.o) { const [x, y, rx, ry] = st.o; g.ellipse(x * s, y * s, rx * s, ry * s, 0, 0, Math.PI * 2); }
    if (st.p) { st.p.forEach(([x, y], i) => i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)); g.closePath(); }
    // Closed shapes below the eyes are mouths: fill them, then ink the outline.
    const cy = st.o ? st.o[1] : st.p ? st.p.reduce((a, q) => a + q[1], 0) / st.p.length : 0;
    const fill = st.f ?? ((st.o || st.p) && cy > 55 ? MOUTH : null);
    if (fill) { g.fillStyle = fill; g.fill(); g.fillStyle = INK; }
    if (st.w) { const [x1, x2, y, amp, waves] = st.w; for (let i = 0; i <= 40; i++) { const x = x1 + (x2 - x1) * i / 40; const yy = y + amp * Math.sin(i / 40 * Math.PI * 2 * waves); i ? g.lineTo(x * s, yy * s) : g.moveTo(x * s, yy * s); } }
    g.stroke();
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
const styleKey = st => st ? '|' + JSON.stringify(st) : '';
const faceTexture = (name, style = null) => { if (typeof document === 'undefined') return null; const k = name + styleKey(style); if (!textures.has(k)) textures.set(k, drawFace(name, style)); return textures.get(k); };

// One shared decal surface: the head front from x −.5….5, y .05…1.05 (clear of fringes), hugging the oval.
let decalGeometry = null;
function decalSurface() {
  if (decalGeometry) return decalGeometry;
  const g = new T.PlaneGeometry(1, 1, 32, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setXYZ(i, x, p.getY(i) + .55, headFrontZ(x) + .004); }
  g.computeVertexNormals(); return (decalGeometry = g);
}

export function makeFace(name, style = null) {
  const key = resolveExpression(name);
  if (!FACES[key]) throw new Error('Unknown expression: ' + name);
  const m = new T.Mesh(decalSurface(), new T.MeshStandardMaterial({map: faceTexture(key, style), transparent: true, roughness: .55, polygonOffset: true, polygonOffsetFactor: -2}));
  m.name = 'face_decal'; m.material.userData.authored = true;
  const g = new T.Group(); g.name = `face_${key}`; g.add(m); return g;
}

// Swap the visible decal; every expression is built once per avatar and reused.
export function setExpression(avatar, name) {
  const key = resolveExpression(name);
  if (!FACES[key]) throw new Error('Unknown expression: ' + name);
  const ck = 'decal:' + key + styleKey(avatar.faceStyle);
  if (!avatar.faceCache.has(ck)) avatar.faceCache.set(ck, makeFace(key, avatar.faceStyle ?? null));
  if (avatar.faceLayer) avatar.faceLayer.removeFromParent();
  avatar.faceLayer = avatar.faceCache.get(ck); avatar.pivots.head.add(avatar.faceLayer);
  avatar.expression = key; return avatar;
}
