// avatar-style/body5.js — Actor v5 (format v4 Phase 1, opt-in preset `body: 'v5'` / cast `style: 'v5'`). Classic R6: six rigid
// parts, torso 2×2×1, arms and legs 1×2×1 as RoundedBox (bevel 0.04, 2 segments; 1 segment at the bg tier), and the classic
// rounded head (the v2 lathe head) scaled into a 1×1×1 box through the head pivot, so v4 hair, head accessories and face
// decals keep fitting without change. Material: one shared satin-plastic MeshStandardMaterial per colour (roughness 0.45,
// metalness 0, no clearcoat); outfit paint maps are carried over onto satin copies. Builds (adult_f, youth, elder_f) keep
// their body.js torso shapes. Colour regions are data (`regions`, see cast/hero.json): stacked rigid sub-blocks per colour.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createActor, HEAD} from './body.js';
import {hourglassTorso, HOURGLASS_BUILDS} from './hourglass.js';

export const SATIN = {roughness: .45, metalness: 0};
export const BEVEL = .04, SEGMENTS = 2;
// Classic head inside a 1.2 × 1.2 × 1.2 box (owner P1, 2026-11-15: real classic R6 heads read ~1.2 studs, 60 % of the torso
// width): the lathe head is 1.25 wide, 1.16 tall, 1.10 deep.
export const HEAD_SIZE = 1.2, HEAD5 = [HEAD_SIZE / (2 * HEAD.radius), HEAD_SIZE / (2 * HEAD.halfHeight), HEAD_SIZE / (2 * HEAD.radius * HEAD.depth)];
export const LIMB = [1, 2, 1], TORSO = [2, 2, 1];
export const BROAD = {x: 1.24, z: 1.14, shoulder: .24};   // fearbell add-on (opt-in `torsoShape: 'broad'`, adult_m only): torso ×1.24 wide ×1.14 deep, shoulders 0.24 out each side

const geo = new Map();
export function rbox(size, tier = 'hero', dy = 0) {
  const k = `${tier}:${size.join(',')}:${dy}`;
  if (!geo.has(k)) { const g = Math.min(...size) < 2 * BEVEL + 1e-3 ? new T.BoxGeometry(...size) : new RoundedBoxGeometry(...size, tier === 'bg' ? 1 : SEGMENTS, BEVEL);   // thin trims: plain box
    if (dy) g.translate(0, dy, 0); geo.set(k, g); }
  return geo.get(k);
}
const mats = new Map();
export function satin(color) {
  const k = new T.Color(color).getHexString(); if (!mats.has(k)) { const m = new T.MeshStandardMaterial({color: '#' + k, ...SATIN}); m.name = 'satin_' + k; mats.set(k, m); }
  return mats.get(k);
}
const converted = new WeakMap();
// Any part material (or 6-face array) → satin. Plain colours share satin(color); painted maps get one satin copy each.
export function toSatin(m) {
  if (Array.isArray(m)) return m.map(toSatin);
  if (!m || m.isMeshStandardMaterial) return m;
  if (!m.map) return satin(m.color);
  if (!converted.has(m)) converted.set(m, new T.MeshStandardMaterial({color: m.color, map: m.map, ...SATIN, transparent: m.transparent, opacity: m.opacity}));
  return converted.get(m);
}

// Region layout (pure): rigid sub-blocks of one part, each {size, at: [x, y, z] relative to the part centre, color}.
//   torso: {main, strip, stripW = .6, lapel = main, lapelW = .14}   open jacket: body colour, a recessed centre strip, two lapels
//   arms:  {upper, lower, split = .5}                                upper fraction of the arm in `upper` (sleeve), the rest `lower`
//   legs:  {main, shoes, shoeFrac = .2}                              bottom fraction in `shoes`
export function regionBlocks(part, r, {torsoH = 2} = {}) {
  if (!r) return null;
  if (part === 'torso' && r.torso) {
    if (!r.torso.strip) return null;   // a plain torso (outfitRegions): just its main colour
    const t = r.torso, sw = t.stripW ?? .6, lw = t.lapelW ?? .14, h = torsoH - 2 * BEVEL;
    const out = [{size: [sw, h, .06], at: [0, 0, .5 + .005], color: t.strip},
      ...[-1, 1].map(s => ({size: [lw, h, .08], at: [s * (sw / 2 + lw / 2 - .02), 0, .5 + .015], color: t.lapel ?? t.main}))];
    if (t.edge) {   // lapel trims along the opening (≥ 4 px at the full-body 390 px shot: P4) and a raised collar rim that
      // folds around the neck (back + two sides + two front tips stopping at the opening), standing above the shoulders
      const ew = t.edgeW ?? .05, top = torsoH / 2, rh = .12, rw = .09, cx = .62, cz = .36;
      for (const s of [-1, 1]) out.push({size: [ew, h, .09], at: [s * (sw / 2 - .02 + ew / 2), 0, .5 + .02], color: t.edge, edge: true});
      out.push({size: [2 * cx + rw, rh, rw], at: [0, top + rh / 2 - .02, -cz], color: t.edge, edge: true, collar: true});
      for (const s of [-1, 1]) {
        out.push({size: [rw, rh, 2 * cz], at: [s * cx, top + rh / 2 - .02, 0], color: t.edge, edge: true, collar: true});
        out.push({size: [cx - sw / 2 + .02, rh, rw], at: [s * (sw / 2 - .02 + (cx - sw / 2 + .02) / 2 + rw / 2), top + rh / 2 - .02, cz], color: t.edge, edge: true, collar: true});
      }
    }
    return out;
  }
  if ((part === 'leftArm' || part === 'rightArm') && r.arms) {
    const a = r.arms, hu = 2 * (a.split ?? .5);
    return [{size: [1, hu, 1], at: [0, 1 - hu / 2, 0], color: a.upper, base: true}, {size: [1, 2 - hu, 1], at: [0, -1 + (2 - hu) / 2, 0], color: a.lower}];
  }
  if ((part === 'leftLeg' || part === 'rightLeg') && r.legs) {
    const l = r.legs, hs = 2 * (l.shoeFrac ?? .2);
    return [{size: [1, 2 - hs, 1], at: [0, 1 - (2 - hs) / 2, 0], color: l.main, base: true}, {size: [1, hs, 1], at: [0, -1 + hs / 2, 0], color: l.shoes}];
  }
  return null;
}
// Main colour of a region part (pure): what the part reads as from a distance (torso main, upper sleeve, trouser).
export const regionMain = (r, part) => part === 'torso' ? r?.torso?.main : part === 'arms' ? r?.arms?.upper : r?.legs?.main;

export function createActor5({tier = 'hero', skin, scale = 1, materials = {}, name = 'actor', build = null, regions = null, torsoShape = null} = {}) {
  if (torsoShape === 'hourglass' && !HOURGLASS_BUILDS.includes(build)) throw Error(`hourglass torso: adult_f only (build ${build ?? 'adult_m'})`);   // R6 rig (owner): never kids or grandmas
  if (torsoShape === 'broad' && build && build !== 'adult_m') throw Error(`broad torso: adult_m only (build ${build})`);
  const a = createActor({tier, skin, scale, materials, name, build});
  a.body = 'v5';
  for (const [part, m] of Object.entries(a.parts)) {
    if (part === 'head') { m.material = toSatin(m.material); continue; }
    if (part === 'torso' && torsoShape === 'hourglass') m.geometry = hourglassTorso(2);
    else if (part === 'torso' && (!build || build === 'adult_m')) m.geometry = rbox(TORSO, tier);
    else if (part !== 'torso') m.geometry = rbox(LIMB, tier);
    m.material = toSatin(m.material);
    if (part === 'torso' && regions?.torso?.main) m.material = satin(regions.torso.main);
    const blocks = regionBlocks(part, regions, {torsoH: m.geometry.parameters?.height ?? 2});
    if (!blocks) continue;
    for (const b of blocks) {
      if (b.base) { m.geometry = rbox(b.size, tier, b.at[1]); m.material = satin(b.color); continue; }
      if (part === 'torso') m.material = satin(regions.torso.main);
      const s = new T.Mesh(rbox(b.size, tier), satin(b.color)); s.name = `${part}_${b.color}`; s.position.set(...b.at);
      s.castShadow = true; s.receiveShadow = tier === 'hero'; m.add(s);
    }
  }
  // taped / strapped looks (data): regions.bands = [{part, y, h, color, w?, d?, x?}] — a slightly oversized box around the part
  for (const b of regions?.bands ?? []) { const m = a.parts[b.part]; if (!m) continue; const head = b.part === 'head', th = m.geometry.parameters?.height ?? 2;
    const size = head ? [b.w ?? 1.29, b.h, b.d ?? 1.16] : b.part === 'torso' ? [b.w ?? 2.08, b.h, b.d ?? 1.08] : [b.w ?? 1.08, b.h, b.d ?? 1.08];
    const bm = new T.Mesh(rbox(size, tier), satin(b.color)); if (b.emissive) { bm.material = bm.material.clone(); bm.material.emissive?.set(b.emissive); bm.material.emissiveIntensity = b.glow ?? 1.6; }   // Touch Grass (opt-in): a glowing trim band
    bm.name = `band_${b.part}`; bm.position.set(b.x ?? 0, b.y, 0); bm.castShadow = true; m.add(bm); }
  if (torsoShape === 'broad') { a.parts.torso.scale.set(BROAD.x, 1, BROAD.z); a.broad = BROAD;   // fearbell add-on: the broad torso (trims ride the torso mesh)
    for (const [pv, s] of [['leftShoulder', -1], ['rightShoulder', 1]]) a.pivots[pv].position.x += s * BROAD.shoulder; }
  a.pivots.head.scale.set(...HEAD5);   // classic head 1×1×1 (hair, hats and the face decal ride the same pivot)
  a.parts.head.material = satin(skin);
  return a;
}

// Head width / torso width at a front orthographic view (world-space boxes of the head and torso meshes; P1 target .58–.62).
export function headTorsoRatio(a) {
  a.root.updateMatrixWorld(true); const box = m => new T.Box3().setFromObject(m, true), w = b => b.max.x - b.min.x, t = new T.Box3();
  a.parts.torso.geometry.computeBoundingBox(); t.copy(a.parts.torso.geometry.boundingBox).applyMatrix4(a.parts.torso.matrixWorld);
  return +(w(box(a.parts.head)) / w(t)).toFixed(3);
}
// Outfit recipe → colour regions (pure; Phase 2b: the whole cast on v5 is built from data, not painted textures).
//   tee: short sleeves (upper 35 % main, then skin) · hoodie / robe / armor / tunic / royal / apron / peasant: long sleeves
//   (85 % main, then the hand) · classic: sleeves = main to 50 % · trousers = legs + dark shoes (bottom 15 %)
export const SHOES = '#2b2b2f';
export function outfitRegions(outfit, skin) {
  if (!outfit) return null;
  const main = outfit.main ?? '#cccccc', legs = outfit.legs ?? '#3b3f46', split = outfit.recipe === 'tee' ? .35 : outfit.recipe === 'classic' ? .5 : .85;
  return {torso: {main}, arms: {upper: main, lower: skin, split}, legs: {main: legs, shoes: outfit.shoes ?? SHOES, shoeFrac: .15}};
}
// Head width / shoulder width (the torso's top row: 2 studs on every build), from the built geometry. Pure-ish (three, no GL).
export function headShoulderRatio(a) {
  a.root.updateMatrixWorld(true); const hb = new T.Box3().setFromObject(a.parts.head, true), g = a.parts.torso.geometry, p = g.attributes.position;
  let top = -Infinity; for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
  let x0 = Infinity, x1 = -Infinity; for (let i = 0; i < p.count; i++) if (p.getY(i) > top - .05) { x0 = Math.min(x0, p.getX(i)); x1 = Math.max(x1, p.getX(i)); }
  const sx = new T.Vector3().setFromMatrixScale(a.parts.torso.matrixWorld).x;
  return +((hb.max.x - hb.min.x) / ((x1 - x0) * sx)).toFixed(3);
}
// Hero colours (pure): jacket, centre strip, trousers and the yellow head/hands.
export const heroColours = hero => [...new Set([hero.regions?.torso?.main, hero.regions?.torso?.strip, hero.regions?.legs?.main, hero.skin].filter(Boolean).map(c => c.toUpperCase()))];
const hexOf = v => '#' + v.map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
const hsl = c => { const n = parseInt(c.replace('#', ''), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255; return (Math.max(r, g, b) + Math.min(r, g, b)) / 2; };
// Nearest colour (RGB distance) that keeps ≥ min from every avoided colour (and HSL L ≥ minL); grid search, deterministic.
export function safeColour(c, avoid, {min = 90, minL = 0, step = 15} = {}) {
  if (avoid.every(a => rgbDist(c, a) >= min) && hsl(c) >= minL) return c;
  let best = null, bd = Infinity;
  for (let r = 0; r <= 255; r += step) for (let g = 0; g <= 255; g += step) for (let b = 0; b <= 255; b += step) {
    const h = hexOf([r, g, b]); if (hsl(h) < minL || !avoid.every(a => rgbDist(h, a) >= min)) continue;
    const d = rgbDist(c, h); if (d < bd) { bd = d; best = h; }
  }
  return best ?? c;
}
// Phase 1b (owner): in an episode with HERO, troupe and crowd outfits closer than RGB 90 to a hero colour swap to the
// nearest colour that passes. Pure; returns a new outfit (main and legs only: the colours that read at a distance).
export function heroSafeOutfit(outfit, avoid, o = {}) {
  if (!outfit) return outfit; const out = {...outfit};
  for (const k of ['main', 'legs']) if (typeof out[k] === 'string') out[k] = safeColour(out[k], avoid, o);
  return out;
}
// Hero check (pure): torso and legs main colours differ from every troupe outfit main/legs by RGB distance ≥ 90.
export const rgbDist = (a, b) => { const p = c => [0, 2, 4].map(i => parseInt(c.replace('#', '').slice(i, i + 2), 16)), x = p(a), y = p(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
export function heroColourCheck(hero, troupe, min = 90) {
  const mine = Object.fromEntries(heroColours(hero).map(c => [c, c])), out = [];   // Phase 1b: every hero colour (jacket, strip, trousers, yellow)
  for (const [slot, p] of Object.entries(troupe)) for (const k of ['main', 'legs']) { const c = p.outfit?.[k]; if (!c) continue;
    for (const [part, h] of Object.entries(mine)) if (h) { const d = rgbDist(h, c); if (d < min) out.push({slot, key: k, part, hero: h, troupe: c, d: Math.round(d)}); } }
  return out;
}
