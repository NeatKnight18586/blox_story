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
export function createActor({tier = 'hero', skin = SKINS[0], scale = 1, materials = {}, name = 'actor'} = {}) {
  const root = new T.Group(); root.name = name; root.scale.setScalar(scale);
  const parts = {}, pivots = {};
  for (const [part, d] of Object.entries(PARTS)) {
    let parent = root;
    if (d.pivot) { const p = new T.Group(); p.name = d.pivot; p.position.set(...d.pivotAt); root.add(p); pivots[d.pivot] = p; parent = p; }
    const geo = part === 'head' ? headGeometry(tier) : blockGeometry(d.size, tier);
    const m = new T.Mesh(geo, materials[part] ?? plastic(skin)); m.name = part; m.position.set(...d.at);
    m.castShadow = true; m.receiveShadow = tier === 'hero'; parent.add(m); parts[part] = m;
  }
  return {root, parts, pivots, tier, skin, restPositions: Object.fromEntries(Object.entries(pivots).map(([n, p]) => [n, p.position.toArray()])),
    faceCache: new Map(), cosmeticCache: new Map(), faceLayer: null, cosmetic: null, attachments: {}};
}

export function triangles(object) {
  let n = 0;
  object.traverse(o => { if (!o.isMesh && !o.isSprite) return; if (o.isSprite) { n += 2; return; } const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; });
  return n;
}
