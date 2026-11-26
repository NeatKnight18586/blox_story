// parts/city/kit/mats.js — City Building Kit materials (Phase 1B). One cached material per (kind, colour).
// Textured kinds use the CC0 farm cache (assets/realism.json city_* slots, loaded by parts/city/world.js preload → setKitTextures);
// without it they fall back to the procedural pattern of parts/materials.js (same tint), so node tests and offline renders work.
// UVs are world/local studs ÷ tile (kitBoxUV), so brick reads the same size on every wall.
import * as T from 'three';

// kind → [CC0 slot, procedural pattern, tile studs, gloss]
export const KINDS = {
  brick: ['city_brick', 'brick', 4, .2], plaster: ['city_plaster', 'plaster', 6, .15], wood: ['city_planks', 'woodPlanks', 4, .15],
  shingle: ['city_shingles', 'roofTile', 5, .2], terracotta: ['city_terracotta', 'roofTile', 5, .2], concrete: ['city_sidewalk', 'concrete', 6, .1],
  stone: ['city_stone', 'concrete', 5, .15], paving: ['city_brick', 'brick', 3, .15],
  plastic: [null, null, 1, .35], gloss: [null, null, 1, .55], gold: [null, null, 1, .8], glass: [null, null, 1, .9], metal: [null, null, 1, .6],
};
let TEX = {}, M = null;
const cache = new Map();
// world.js hands over the loaded CC0 maps ({slot: {map, normalMap, roughnessMap}}) and the procedural material module.
export function setKitTextures(tex, materials) { TEX = tex ?? {}; M = materials ?? M; cache.clear(); }
export const textureSource = kind => TEX[KINDS[kind]?.[0]]?.map ? 'cc0:' + KINDS[kind][0] : KINDS[kind]?.[1] ? 'procedural:' + KINDS[kind][1] : 'plain';
export const tileOf = kind => KINDS[kind]?.[2] ?? 1;

export function kitMat(kind, color = '#ffffff', {emissive = null} = {}) {
  const key = kind + color + (emissive ?? ''); if (cache.has(key)) return cache.get(key);
  const [slot, pattern, , gloss] = KINDS[kind] ?? KINDS.plastic, t = slot && TEX[slot];
  let m;
  if (t?.map) { m = new T.MeshStandardMaterial({color, map: t.map, normalMap: t.normalMap ?? null, roughnessMap: t.roughnessMap ?? null, roughness: 1}); m.color.lerp(new T.Color('#ffffff'), .55); }   // the photo map carries the hue: keep the tint light
  else if (pattern && M?.std) { m = M.std(pattern, color).clone(); }
  else m = new T.MeshStandardMaterial({color, roughness: kind === 'gold' ? .3 : kind === 'gloss' ? .35 : .55, metalness: kind === 'gold' || kind === 'metal' ? .6 : 0, emissive: emissive ?? '#000000'});
  if (emissive && m.emissive) m.emissive.set(emissive);
  m.name = 'kit:' + kind + ':' + color; m.userData = {...m.userData, kit: kind, source: textureSource(kind), gloss, tile: tileOf(kind)};
  cache.set(key, m); return m;
}
// Live (never baked) materials: glass, lit displays, water.
export function liveMat(kind, color, o = {}) {
  const key = 'live' + kind + color + JSON.stringify(o); if (cache.has(key)) return cache.get(key);
  const m = kind === 'basic' ? new T.MeshBasicMaterial({color, ...o}) : new T.MeshStandardMaterial({color, roughness: .08, metalness: .1, envMapIntensity: 1.2, ...o});
  m.userData.live = true; m.name = 'kitLive:' + kind + ':' + color; cache.set(key, m); return m;
}
// World-projected box UVs (per face direction) in studs ÷ tile; geometry in the frame the texture should be continuous in.
export function kitBoxUV(g, tile) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv ?? (g.setAttribute('uv', new T.BufferAttribute(new Float32Array(p.count * 2), 2)), g.attributes.uv);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile); else if (ax >= az) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile); else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile); }
  uv.needsUpdate = true; return g;
}
