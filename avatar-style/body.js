// avatar-style/body.js — the v2 block avatar (docs/V2_BRIEF.md §6.1, opt-in `style: 'v2'`).
// Same classic proportions, pivot names and rest positions as avatar/baseAvatar.js (frozen), so the
// legacy samplers (avatar/actions.js) and every v2 pose drive it unchanged. Cheaper geometry:
//   hero tier       2-segment rounded blocks (300 tris) + 16-sided head lathe   (~1.8k tris body)
//   background tier plain boxes (12 tris)               + 8-sided head lathe    (~0.1k tris body)
// Materials are Phong "toy plastic". Geometry is shared through caches; nothing is rebuilt on a
// pose, face, outfit or tag change.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PLASTIC = {shininess: 38, specular: '#4d4d4d'};
export const HEAD = {radius: .625, halfHeight: .58, rim: .22, depth: 1.1 / 1.25, centre: .58};
export const SKINS = ['#f5cd30', '#f6c9a0', '#e0a77a', '#c08457', '#8d5a3b', '#fbdcc0'];   // flat bright skin tones

const geoCache = new Map();
const cached = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };

// Low-poly lathed head: the legacy oval silhouette (1.25 × 1.16 × 1.10) with far fewer segments.
export function headProfile(rimSteps) {
  const {radius: r, halfHeight: h, rim} = HEAD, p = [new T.Vector2(0, -h), new T.Vector2(r - rim, -h)];
  for (let i = 1; i <= rimSteps; i++) { const a = -Math.PI / 2 + i * Math.PI / 2 / (rimSteps + 1); p.push(new T.Vector2(r - rim + rim * Math.cos(a), -h + rim + rim * Math.sin(a))); }
  p.push(new T.Vector2(r, -h + rim), new T.Vector2(r, h - rim));
  for (let i = 1; i <= rimSteps; i++) { const a = i * Math.PI / 2 / (rimSteps + 1); p.push(new T.Vector2(r - rim + rim * Math.cos(a), h - rim + rim * Math.sin(a))); }
  p.push(new T.Vector2(r - rim, h), new T.Vector2(0, h));
  return p;
}
export function headGeometry(tier = 'hero') {
  return cached('head:' + tier, () => {
    // The lathe's wrap seam (split normals) starts at the back of the head, and the front sits mid-panel,
    // so no shading line runs down the face.
    const n = tier === 'hero' ? 20 : 8, g = new T.LatheGeometry(headProfile(tier === 'hero' ? 2 : 0), n, Math.PI + Math.PI / n);
    g.scale(1, 1, HEAD.depth); g.computeVertexNormals(); return g;
  });
}
// Front surface z of the head at height-independent x (for face decals that sit on the curve).
export const headFrontZ = x => HEAD.depth * HEAD.radius * Math.sqrt(Math.max(0, 1 - (x / HEAD.radius) ** 2));

export function blockGeometry(size, tier = 'hero') {
  return cached(`block:${tier}:${size.join(',')}`, () => tier === 'hero' ? new RoundedBoxGeometry(...size, 2, .03) : new T.BoxGeometry(...size));
}

const matCache = new Map();
export function plastic(color) {
  const k = String(color); if (!matCache.has(k)) matCache.set(k, new T.MeshPhongMaterial({color, ...PLASTIC}));
  return matCache.get(k);
}

export const PARTS = {
  torso: {size: [2, 2, 1], pivot: null, at: [0, 3.02, 0]},
  head: {pivot: 'head', pivotAt: [0, 4.03, 0], at: [0, HEAD.centre, 0]},
  leftArm: {size: [.98, 1.99, 1], pivot: 'leftShoulder', pivotAt: [-1.51, 4.02, 0], at: [0, -.995, 0]},
  rightArm: {size: [.98, 1.99, 1], pivot: 'rightShoulder', pivotAt: [1.51, 4.02, 0], at: [0, -.995, 0]},
  leftLeg: {size: [.98, 2, 1], pivot: 'leftHip', pivotAt: [-.5, 2, 0], at: [0, -1, 0]},
  rightLeg: {size: [.98, 2, 1], pivot: 'rightHip', pivotAt: [.5, 2, 0], at: [0, -1, 0]},
};

// createActor: {tier: 'hero'|'bg', skin, scale, materials: {torso, leftArm, ...}} → avatar-shaped object.
// `materials[part]` may be one material or a 6-face array (clothing paint); default is skin plastic.
// ---- A5 Decision 5: body builds (opt-in `build`; adult_m = the original torso) -----------------------------------
// Widths in studs at the shoulders (top), waist (at waistAt of the torso height, from the top) and hips (bottom).
export const BUILDS = {
  adult_m: {shoulder: 2, waist: 2, hip: 2, waistAt: .55, height: 1, leg: .98},
  adult_f: {shoulder: 1.9, waist: 1.6, hip: 1.85, waistAt: .55, height: 1, leg: .9},     // subtle hourglass, adult women only
  youth: {shoulder: 2, waist: 2, hip: 2, waistAt: .55, height: .9, leg: .98},            // anyone under 18: straight, 0.9 torso
  elder_f: {shoulder: 2, waist: 2.12, hip: 2.04, waistAt: .55, height: 1, leg: .98, stoop: .09},   // grandmas: wider waist, stoop
};
export const ADULT_ONLY = ['adult_f', 'elder_f', 'adult_m'];
// Torso width at u (0 = top/shoulders … 1 = bottom/hips): linear shoulder → waist → hip (pure).
export function torsoWidthAt(build, u) {
  const b = BUILDS[build] ?? BUILDS.adult_m, w = Math.min(1, Math.max(0, u));
  return w <= b.waistAt ? b.shoulder + (b.waist - b.shoulder) * (w / b.waistAt) : b.waist + (b.hip - b.waist) * ((w - b.waistAt) / (1 - b.waistAt));
}
// A cast entry's build must fit its age: under 18 → youth only (never adult_f / elder_f / adult_m). Returns an error or null.
export function buildError(entry) {
  const b = entry.build ?? (entry.age !== undefined && entry.age < 18 ? 'youth' : 'adult_m');
  if (!BUILDS[b]) return `unknown build ${b}`;
  if (entry.age !== undefined && entry.age < 18 && b !== 'youth') return `${entry.name ?? 'actor'} is ${entry.age}: build must be youth, not ${b}`;
  if (entry.age !== undefined && entry.age >= 18 && b === 'youth') return `${entry.name ?? 'actor'} is ${entry.age}: youth is for under 18`;
  return null;
}
// Part layout for a build (pure): torso size/centre, shoulder and hip pivots, leg width.
export function buildLayout(build) {
  const b = BUILDS[build] ?? BUILDS.adult_m, th = 2 * b.height, top = 2.02 + th;
  return {torso: {size: [2, th, 1], at: [0, 2.02 + th / 2, 0]}, headPivot: [0, top + .01, 0], shoulderX: b.shoulder / 2 + .51, shoulderY: top, hipX: Math.max(b.leg / 2 + .005, b.hip / 2 - b.leg / 2 - .005), leg: b.leg};
}
function torsoGeometry(build, tier) {
  if (!build || build === 'adult_m') return blockGeometry(PARTS.torso.size, tier);
  const L = buildLayout(build), [w, h, d] = L.torso.size;
  return cached(`torso:${build}:${tier}`, () => {
    const g = new T.BoxGeometry(w, h, d, 1, tier === 'hero' ? 10 : 6, 1);   // rows through the height so the waist exists (a rounded box only has rows at its bevels)
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = (h / 2 - p.getY(i)) / h; p.setX(i, p.getX(i) * torsoWidthAt(build, u) / 2); }
    g.computeVertexNormals(); return g;
  });
}

export function createActor({tier = 'hero', skin = SKINS[0], scale = 1, materials = {}, name = 'actor', build = null} = {}) {
  const L = build && build !== 'adult_m' ? buildLayout(build) : null;
  const layout = L ? {torso: {...PARTS.torso, size: L.torso.size, at: L.torso.at}, head: {...PARTS.head, pivotAt: L.headPivot},
    leftArm: {...PARTS.leftArm, pivotAt: [-L.shoulderX, L.shoulderY, 0]}, rightArm: {...PARTS.rightArm, pivotAt: [L.shoulderX, L.shoulderY, 0]},
    leftLeg: {...PARTS.leftLeg, size: [L.leg, 2, 1], pivotAt: [-L.hipX, 2, 0]}, rightLeg: {...PARTS.rightLeg, size: [L.leg, 2, 1], pivotAt: [L.hipX, 2, 0]}} : PARTS;
  const root = new T.Group(); root.name = name; root.scale.setScalar(scale);
  const parts = {}, pivots = {};
  for (const [part, d] of Object.entries(layout)) {
    let parent = root;
    if (d.pivot) { const p = new T.Group(); p.name = d.pivot; p.position.set(...d.pivotAt); root.add(p); pivots[d.pivot] = p; parent = p; }
    const geo = part === 'head' ? headGeometry(tier) : part === 'torso' ? torsoGeometry(build, tier) : blockGeometry(d.size, tier);
    const m = new T.Mesh(geo, materials[part] ?? plastic(skin)); m.name = part; m.position.set(...d.at);
    m.castShadow = true; m.receiveShadow = tier === 'hero'; parent.add(m); parts[part] = m;
  }
  return {root, parts, pivots, tier, skin, build: build ?? 'adult_m', restPositions: Object.fromEntries(Object.entries(pivots).map(([n, p]) => [n, p.position.toArray()])),
    faceCache: new Map(), cosmeticCache: new Map(), faceLayer: null, cosmetic: null, attachments: {}};
}

export function triangles(object) {
  let n = 0;
  object.traverse(o => { if (!o.isMesh && !o.isSprite) return; if (o.isSprite) { n += 2; return; } const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; });
  return n;
}
