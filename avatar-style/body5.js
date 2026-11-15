// avatar-style/body5.js — Actor v5 (format v4 Phase 1, opt-in preset `body: 'v5'` / cast `style: 'v5'`). Classic R6: six rigid
// parts, torso 2×2×1, arms and legs 1×2×1 as RoundedBox (bevel 0.04, 2 segments; 1 segment at the bg tier), and the classic
// rounded head (the v2 lathe head) scaled into a 1×1×1 box through the head pivot, so v4 hair, head accessories and face
// decals keep fitting without change. Material: one shared satin-plastic MeshStandardMaterial per colour (roughness 0.45,
// metalness 0, no clearcoat); outfit paint maps are carried over onto satin copies. Builds (adult_f, youth, elder_f) keep
// their body.js torso shapes. Colour regions are data (`regions`, see cast/hero.json): stacked rigid sub-blocks per colour.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createActor, HEAD} from './body.js';

export const SATIN = {roughness: .45, metalness: 0};
export const BEVEL = .04, SEGMENTS = 2;
// Classic head inside a 1×1×1 box: the lathe head is 1.25 wide, 1.16 tall, 1.10 deep.
export const HEAD5 = [1 / (2 * HEAD.radius), 1 / (2 * HEAD.halfHeight), 1 / (2 * HEAD.radius * HEAD.depth)];
export const LIMB = [1, 2, 1], TORSO = [2, 2, 1];

const geo = new Map();
export function rbox(size, tier = 'hero', dy = 0) {
  const k = `${tier}:${size.join(',')}:${dy}`;
  if (!geo.has(k)) { const g = new RoundedBoxGeometry(...size, tier === 'bg' ? 1 : SEGMENTS, BEVEL); if (dy) g.translate(0, dy, 0); geo.set(k, g); }
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
    const t = r.torso, sw = t.stripW ?? .6, lw = t.lapelW ?? .14, h = torsoH - 2 * BEVEL;
    return [{size: [sw, h, .06], at: [0, 0, .5 + .005], color: t.strip},
      ...[-1, 1].map(s => ({size: [lw, h, .08], at: [s * (sw / 2 + lw / 2 - .02), 0, .5 + .015], color: t.lapel ?? t.main}))];
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

export function createActor5({tier = 'hero', skin, scale = 1, materials = {}, name = 'actor', build = null, regions = null} = {}) {
  const a = createActor({tier, skin, scale, materials, name, build});
  a.body = 'v5';
  for (const [part, m] of Object.entries(a.parts)) {
    if (part === 'head') { m.material = toSatin(m.material); continue; }
    if (part === 'torso' && (!build || build === 'adult_m')) m.geometry = rbox(TORSO, tier);
    else if (part !== 'torso') m.geometry = rbox(LIMB, tier);
    m.material = toSatin(m.material);
    const blocks = regionBlocks(part, regions, {torsoH: m.geometry.parameters?.height ?? 2});
    if (!blocks) continue;
    for (const b of blocks) {
      if (b.base) { m.geometry = rbox(b.size, tier, b.at[1]); m.material = satin(b.color); continue; }
      if (part === 'torso') m.material = satin(regions.torso.main);
      const s = new T.Mesh(rbox(b.size, tier), satin(b.color)); s.name = `${part}_${b.color}`; s.position.set(...b.at);
      s.castShadow = true; s.receiveShadow = tier === 'hero'; m.add(s);
    }
  }
  a.pivots.head.scale.set(...HEAD5);   // classic head 1×1×1 (hair, hats and the face decal ride the same pivot)
  a.parts.head.material = satin(skin);
  return a;
}

// Hero check (pure): torso and legs main colours differ from every troupe outfit main/legs by RGB distance ≥ 90.
export const rgbDist = (a, b) => { const p = c => [0, 2, 4].map(i => parseInt(c.replace('#', '').slice(i, i + 2), 16)), x = p(a), y = p(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
export function heroColourCheck(hero, troupe, min = 90) {
  const mine = {torso: regionMain(hero.regions, 'torso'), legs: regionMain(hero.regions, 'legs')}, out = [];   // the jacket and trousers (the strip is a detail)
  for (const [slot, p] of Object.entries(troupe)) for (const k of ['main', 'legs']) { const c = p.outfit?.[k]; if (!c) continue;
    for (const [part, h] of Object.entries(mine)) if (h) { const d = rgbDist(h, c); if (d < min) out.push({slot, key: k, part, hero: h, troupe: c, d: Math.round(d)}); } }
  return out;
}
