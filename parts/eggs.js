// parts/eggs.js — Season 1 episode 1 eggs: nine original designs (stories/egg/beats.md), one shared shape, a painted shell
// (canvas texture, cached per design), emissive details, a rarity rim (colour only, never text) and one small extra part.
// ≤ 300 triangles per egg. `warm` 0..1 (Plain egg in still hands): the emissive tint goes from cold blue to gold.
//   eggMesh(design, {r, warm, rim, beam}) → THREE.Group · nestMesh(r) → THREE.Group · EGGS / RARITY (pure data)
import * as T from 'three';

export const RARITY = {COMMON: '#f4f1e8', RARE: '#4aa8ff', EPIC: '#b45cff', LEGENDARY: '#ffcc3a'};
export const EGGS = {
  ember: {rarity: 'RARE', shell: '#1d1a1c', detail: '#ff7a1a', glow: 1.6, pattern: 'cracks', extra: 'embers'},
  frost: {rarity: 'RARE', shell: '#cfe8ff', detail: '#8fd0ff', glow: .7, pattern: 'facets', extra: 'shard'},
  moss: {rarity: 'COMMON', shell: '#6fa04a', detail: '#a6d86a', glow: .4, pattern: 'patches', extra: 'sprout'},
  tide: {rarity: 'RARE', shell: '#4fc4b8', detail: '#e8fffb', glow: .6, pattern: 'waves', extra: null},
  geode: {rarity: 'EPIC', shell: '#8a8580', detail: '#c45cff', glow: 1.3, pattern: 'window', extra: 'crystal'},
  storm: {rarity: 'EPIC', shell: '#1f2b5a', detail: '#ffe14a', glow: 1.5, pattern: 'zigzag', extra: null},
  sprinkle: {rarity: 'RARE', shell: '#ff9ccb', detail: '#ffffff', glow: .6, pattern: 'sprinkles', extra: null},
  cosmic: {rarity: 'LEGENDARY', shell: '#3a1a6e', detail: '#fff6c8', glow: 1.4, pattern: 'stars', extra: null},
  plain: {rarity: 'COMMON', shell: '#f2e6cc', detail: '#8a5a36', glow: 0, pattern: 'speckles', extra: null},
};
export const EGG_NAMES = Object.keys(EGGS);

const texCache = new Map(), geoCache = new Map();
const geo = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };
// Shell painting (equirectangular 256×128): colour map + emissive map share the layout (pure drawing, seeded).
function paint(name) {
  if (texCache.has(name) || typeof document === 'undefined') return texCache.get(name) ?? {};
  const e = EGGS[name], W = 256, H = 128, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const col = mk(), emi = mk(), g = col.getContext('2d'), h = emi.getContext('2d'); let s = name.length * 7;
  const R = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  g.fillStyle = e.shell; g.fillRect(0, 0, W, H); h.fillStyle = '#000'; h.fillRect(0, 0, W, H);
  const both = (fn, glow = true) => { g.fillStyle = g.strokeStyle = e.detail; fn(g); if (glow) { h.fillStyle = h.strokeStyle = e.detail; fn(h); } };
  if (e.pattern === 'cracks') both(x => { x.lineWidth = 3; for (let k = 0; k < 7; k++) { x.beginPath(); let px = R() * W, py = 10 + R() * 30; x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (R() - .5) * 40; py += 12 + R() * 10; x.lineTo(px, py); } x.stroke(); } });
  if (e.pattern === 'facets') both(x => { x.globalAlpha = .5; for (let k = 0; k < 18; k++) { x.beginPath(); x.moveTo(R() * W, R() * H); x.lineTo(R() * W, R() * H); x.lineTo(R() * W, R() * H); x.fill(); } x.globalAlpha = 1; }, false);
  if (e.pattern === 'patches') both(x => { for (let k = 0; k < 14; k++) { x.beginPath(); x.ellipse(R() * W, R() * H, 8 + R() * 14, 6 + R() * 8, R() * 3, 0, 7); x.fill(); } }, false);
  if (e.pattern === 'waves') both(x => { x.lineWidth = 5; for (let k = 0; k < 4; k++) { x.beginPath(); for (let px = 0; px <= W; px += 4) x.lineTo(px, 22 + k * 26 + Math.sin(px / 16) * 6); x.stroke(); } });
  if (e.pattern === 'window') both(x => { x.beginPath(); x.moveTo(40, 40); x.lineTo(78, 30); x.lineTo(92, 64); x.lineTo(70, 92); x.lineTo(36, 78); x.closePath(); x.fill(); });
  if (e.pattern === 'zigzag') both(x => { x.lineWidth = 9; x.beginPath(); for (let k = 0; k <= 16; k++) x.lineTo(k * 16, 64 + (k % 2 ? -14 : 14)); x.stroke(); });
  if (e.pattern === 'sprinkles') { const cs = ['#ffffff', '#ffe14a', '#4ad8ff', '#7fc241', '#ff5a5a']; for (let k = 0; k < 60; k++) { const c = cs[k % 5]; g.fillStyle = c; h.fillStyle = c; const x = R() * W, y = R() * H, a = R() * 3; for (const t of [g, h]) { t.save(); t.translate(x, y); t.rotate(a); t.fillRect(-4, -1.5, 8, 3); t.restore(); } } }
  if (e.pattern === 'stars') both(x => { for (let k = 0; k < 40; k++) { const r = .8 + R() * 2.2; x.beginPath(); x.arc(R() * W, R() * H, r, 0, 7); x.fill(); } });
  if (e.pattern === 'speckles') both(x => { x.globalAlpha = .7; for (let k = 0; k < 90; k++) { x.beginPath(); x.arc(R() * W, R() * H, .8 + R() * 1.8, 0, 7); x.fill(); } x.globalAlpha = 1; }, false);
  const tx = c => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; return t; };
  const out = {map: tx(col), emissiveMap: tx(emi)}; texCache.set(name, out); return out;
}
const COLD = new T.Color('#5aa8ff'), GOLD = new T.Color('#ffc23a');
// warm (Plain egg only): a whole-shell glow from cold blue (0) to gold (1); other eggs glow through their details.
export function eggMesh(name, {r = .45, warm = null, rim = true, beam = false} = {}) {
  const e = EGGS[name]; if (!e) throw Error('unknown egg ' + name);
  const grp = new T.Group(); grp.name = 'egg_' + name; const p = paint(name);
  const shell = geo('shell', () => { const g = new T.SphereGeometry(1, 12, 9); g.scale(1, 1.3, 1); return g; });   // 198 triangles
  const m = new T.MeshPhongMaterial({color: '#ffffff', map: p.map ?? null, emissive: '#ffffff', emissiveMap: p.emissiveMap ?? null, emissiveIntensity: e.glow, shininess: name === 'frost' ? 90 : 40, flatShading: name === 'frost'});
  if (!p.map) m.color.set(e.shell);
  if (warm !== null) { m.emissiveMap = null; m.emissive.copy(COLD).lerp(GOLD, Math.min(1, Math.max(0, warm))); m.emissiveIntensity = .35 + .9 * warm; }
  const body = new T.Mesh(shell, m); body.scale.setScalar(r); body.castShadow = true; grp.add(body);
  if (rim) { const rm = new T.Mesh(shell, new T.MeshBasicMaterial({color: warm !== null ? m.emissive : RARITY[e.rarity], side: T.BackSide, toneMapped: false, transparent: true, opacity: .9})); rm.scale.setScalar(r * 1.1); grp.add(rm); }
  const det = new T.MeshPhongMaterial({color: e.detail, emissive: e.detail, emissiveIntensity: e.glow * .8, flatShading: true});
  if (e.extra === 'sprout') { const s = new T.Mesh(geo('sprout', () => new T.ConeGeometry(.12, .5, 4)), det); s.position.y = r * 1.4; s.rotation.z = .25; s.name = 'sway'; grp.add(s); }
  if (e.extra === 'crystal' || e.extra === 'shard') { const c = new T.Mesh(geo('cryst', () => new T.OctahedronGeometry(.18, 0)), det); c.position.set(r * .55, r * .5, r * .5); c.scale.set(1, 1.8, 1); grp.add(c); }
  if (e.extra === 'embers') for (const k of [0, 1]) { const c = new T.Mesh(geo('ember', () => new T.OctahedronGeometry(.05, 0)), det); c.position.set((k - .5) * .3, r * 1.6 + k * .2, .1); c.name = 'rise'; grp.add(c); }
  if (beam) { const b = new T.Mesh(geo('beam', () => new T.CylinderGeometry(.05, .05, 8, 5, 1, true)), new T.MeshBasicMaterial({color: RARITY[e.rarity], transparent: true, opacity: .35, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false})); b.position.y = 4.4; grp.add(b); }
  grp.userData.egg = name; return grp;
}
// A thatch-ring nest (≤ 120 triangles).
export function nestMesh(r = .9, color = '#9a7444') {
  const g = new T.Group(), m = new T.Mesh(geo('nest' + r, () => new T.TorusGeometry(r, r * .32, 5, 12)), new T.MeshPhongMaterial({color, shininess: 4, flatShading: true}));
  m.rotation.x = Math.PI / 2; m.castShadow = true; g.add(m); g.name = 'nest'; return g;
}
export const eggTriangles = () => 198 + 2 * 8 + 6;
