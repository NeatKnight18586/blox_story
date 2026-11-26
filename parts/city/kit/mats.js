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
  if (kind === 'glass') { const m = glassMat(); cache.set(key, m); return m; }
  const [slot, pattern, , gloss] = KINDS[kind] ?? KINDS.plastic, t = slot && TEX[slot];
  let m;
  if (t?.map) { m = new T.MeshStandardMaterial({color, map: t.map, normalMap: t.normalMap ?? null, roughnessMap: t.roughnessMap ?? null, roughness: 1}); if (kind === 'paving') { const rc = recolorMap(t.map, color); if (rc) { m.map = rc; m.color.set('#ffffff'); } else m.color.lerp(new T.Color('#ffffff'), .35); } else m.color.lerp(new T.Color('#ffffff'), .55); }   // the photo map carries the hue: keep the tint light (paving: the CC0 brick re-tinted warm red by luminance, below)
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

// ---- Phase 1C: Roblox-Studio light-blue window glass (sky reflection + fresnel via the env map, faint interior card) ----------
// One live material for every kit window (never baked → never darkened by contact AO). The card is a canvas texture (sky gradient, a
// pale sheen, a warm room card with a lamp + curtains); geometry flipped upside-down (the upside-down house) flips the card with it.
let GLASS = null;
export function glassMat() {
  if (GLASS) return GLASS;
  let map = null;
  if (typeof document !== 'undefined') {
    const w = 64, h = 96, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#d2efff'); sky.addColorStop(1, '#8fcdf2'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,238,205,.5)'; g.fillRect(6, 38, w - 12, h - 44);                                   // faint warm room card
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(4, 4, 7, h - 8); g.fillRect(w - 11, 4, 7, h - 8);      // curtains
    g.fillStyle = 'rgba(255,214,120,.7)'; g.beginPath(); g.arc(w / 2, 30, 6, 0, 7); g.fill();               // ceiling lamp (flips with the house)
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(0, h * .55); g.lineTo(w, h * .15); g.lineTo(w, h * .32); g.lineTo(0, h * .72); g.fill();   // sheen
    map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  }
  GLASS = new T.MeshStandardMaterial({color: '#ffffff', map, emissive: '#7fbfe6', emissiveMap: map, emissiveIntensity: .42, roughness: .06, metalness: .15, envMapIntensity: 1.5});
  GLASS.name = 'kit:glass'; GLASS.userData = {kit: 'glass', live: true, source: 'plain', gloss: .9, tile: 1}; return GLASS;
}
// Polished statue gold (Phase 1C): metalness 1, roughness .28–.35, warm base, reflects the sky env map; soft highlights only (no bloom, no glow).
// roles: body | hat (a touch less env so the crown never out-shines the face) | face (the same gold + a small warm emissive lift: the monocle + mustache read).
const GOLD = {};
export function goldMat(role = 'body') {
  if (GOLD[role]) return GOLD[role];
  const base = {color: '#ffb81c', metalness: 1, roughness: role === 'hat' ? .35 : .3, envMapIntensity: role === 'hat' ? 2.4 : 3, emissive: '#3a2400', emissiveIntensity: role === 'hat' ? .2 : .3};
  const m = new T.MeshStandardMaterial(role === 'face' ? {...base, emissive: '#8a5a08', emissiveIntensity: .7} : base);
  m.name = 'kit:gold' + role; m.userData = {kit: 'gold' + role[0].toUpperCase() + role.slice(1), live: true, source: 'plain', gloss: .9, tile: 1}; return GOLD[role] = m;
}
// Analog dial texture (not mirrored), hands drawn at hh:mm (the school clock). Null without a DOM (node tests).
export function dialTexture(hh = 8, mm = 15) {
  if (typeof document === 'undefined') return null;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), R = n / 2;
  g.fillStyle = '#fbf8ee'; g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.fill(); g.lineWidth = 9; g.strokeStyle = '#2b2f3a'; g.beginPath(); g.arc(R, R, R - 7, 0, 7); g.stroke();
  g.fillStyle = '#2b2f3a'; for (let i = 0; i < 12; i++) { g.save(); g.translate(R, R); g.rotate(i / 12 * Math.PI * 2); g.fillRect(-4, -R + 14, 8, 22); g.restore(); }
  const hand = (a, l, w) => { g.save(); g.translate(R, R); g.rotate(a); g.fillRect(-w / 2, -l, w, l + 8); g.restore(); };
  hand((hh % 12 + mm / 60) / 12 * Math.PI * 2, R * .5, 11); hand(mm / 60 * Math.PI * 2, R * .75, 7);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

// Luminance-preserving re-tint of a CC0 map (browser only): out = tint × (.45 + 1.15 × luma) → the brick pattern stays, the hue becomes the tint
// (plaza paving read dark brown under a plain multiply). Returns null without a DOM / decoded image (callers fall back to a light tint).
const RECOLOR = new Map();
export function recolorMap(tex, hex, {bias = .45, gain = 1.15} = {}) {
  const img = tex?.image; if (typeof document === 'undefined' || !img || !(img.width > 0)) return null;
  const key = hex + (img.src ?? img.width); if (RECOLOR.has(key)) return RECOLOR.get(key);
  const w = Math.min(1024, img.width), h = Math.min(1024, img.height), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h), px = d.data, t = new T.Color(hex).convertLinearToSRGB();
  const tr = t.r * 255, tg = t.g * 255, tb = t.b * 255;
  for (let i = 0; i < px.length; i += 4) { const l = (.299 * px[i] + .587 * px[i + 1] + .114 * px[i + 2]) / 255, k = bias + gain * l; px[i] = Math.min(255, tr * k); px[i + 1] = Math.min(255, tg * k); px[i + 2] = Math.min(255, tb * k); }
  g.putImageData(d, 0, 0); const out = new T.CanvasTexture(c); out.wrapS = tex.wrapS; out.wrapT = tex.wrapT; out.anisotropy = tex.anisotropy; out.colorSpace = T.SRGBColorSpace; out.flipY = tex.flipY; out.userData = {recolor: hex};
  RECOLOR.set(key, out); return out;
}
