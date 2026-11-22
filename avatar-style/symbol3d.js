// avatar-style/symbol3d.js — E4: the birth-symbol decal on an actor's RIGHT hand (three, browser). Emissive (MeshBasic, never lit) shape on
// a dark ink rim, plus an additive halo whose size and brightness grow with rank. Sits on the back of the hand: the outer face (+x) and
// the front face (+z) of the hand slab (decision: the front echo keeps it readable when the arm hangs; the face / head is never touched).
import * as T from 'three';
import {SHAPE_PATHS, symbolSpec, DARK_COLOR} from './symbol.js';

const INK = '#12141A', texCache = new Map(), PX = 160;
function shade(hex, f) { const n = parseInt(hex.slice(1), 16), c = i => Math.max(0, Math.min(255, Math.round((n >> i & 255) * f))); return `rgb(${c(16)},${c(8)},${c(0)})`; }
function drawShape(g, shape, color, {dark}) {
  const P = SHAPE_PATHS[shape], u = PX * .8, at = ([x, y]) => [PX / 2 + x * u, PX / 2 - y * u];
  const poly = pts => { g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](...at(p))); };
  g.lineJoin = g.lineCap = 'round';
  for (const f of P.fills) { poly(f.pts); g.closePath(); g.fillStyle = g.strokeStyle = INK; g.lineWidth = PX * .15; g.stroke(); g.fill(); }   // ink rim
  for (const s of P.strokes) { poly(s.pts); g.strokeStyle = INK; g.lineWidth = s.w * u + PX * .12; g.stroke(); }
  for (const f of P.fills) { poly(f.pts); g.closePath(); g.fillStyle = dark ? shade(color, f.tone) : shade(color, f.tone); g.fill(); }
  for (const s of P.strokes) { poly(s.pts); g.strokeStyle = shade(color, s.tone); g.lineWidth = s.w * u; g.stroke(); }
}
function decalTex(spec) {
  const k = `${spec.shape}|${spec.color}|${spec.dark}`; if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = PX; drawShape(c.getContext('2d'), spec.shape, spec.color, spec);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; texCache.set(k, t); return t;
}
let haloTex = null;
function halo() {
  if (haloTex) return haloTex; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  haloTex = new T.CanvasTexture(c); haloTex.colorSpace = T.SRGBColorSpace; return haloTex;
}
const quad = new T.PlaneGeometry(1, 1), OFF = .535;   // clears the wrist cuff (half width .515) so a big rank is never cut by it
// Build the group of decals for one hand. The planes are 0.02 off the slab (0.49): clear of the forearm block (0.5) above it.
function build(spec) {
  const g = new T.Group(); g.name = 'birthSymbol';
  const dm = new T.MeshBasicMaterial({map: decalTex(spec), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2}),
    hm = new T.MeshBasicMaterial({map: halo(), color: spec.color, transparent: true, opacity: spec.glow, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false});
  const y = -.23 + spec.size / 2;   // the decal's bottom edge sits 0.02 above the slab's bottom
  for (const [pos, rotY] of [[[OFF, y, 0], Math.PI / 2], [[0, y, OFF], 0]]) {
    const d = new T.Mesh(quad, dm); d.scale.setScalar(spec.size); d.position.set(...pos); d.rotation.y = rotY; d.renderOrder = 6; d.name = 'symbolDecal'; g.add(d);
    const h = new T.Mesh(quad, hm); h.scale.setScalar(spec.size * spec.halo); h.position.set(pos[0] + (rotY ? .004 : 0), y, pos[2] + (rotY ? 0 : .004)); h.rotation.y = rotY; h.renderOrder = 5; h.name = 'symbolHalo'; h.visible = spec.glow > 0; g.add(h);
  }
  g.userData = {dm, hm, spec}; return g;
}
// attachSymbol(actor, {shape, color, rank}, {dark}) → group (on actor.parts.rightHand); one per actor, rebuilt by setSymbolDark.
export function attachSymbol(a, sym, {dark = false} = {}) {
  if (!sym) return null; const hand = a.parts?.rightHand; if (!hand) throw Error('symbol: this actor has no rightHand (needs body v6)');
  a.symbol?.removeFromParent(); const g = build(symbolSpec(sym, {dark})); hand.add(g); a.symbol = g; a.symbolDef = sym; a.symbolDark = dark; return g;
}
// STOLEN / RETURNED state: grey symbol with no glow ↔ the rank colour with its glow (pure in `dark`).
export function setSymbolDark(a, dark) { if (!a.symbol || a.symbolDark === dark) return; attachSymbol(a, a.symbolDef, {dark}); }
export {DARK_COLOR};

// G1 mask (review only): the symbol's fill shape alone as an alpha texture (no ink, no halo), so a flat-green render marks exactly the symbol pixels.
let maskCache = new Map();
export function symbolMaskMaterial(shape) {
  if (!maskCache.has(shape)) { const c = document.createElement('canvas'); c.width = c.height = PX; const g = c.getContext('2d'); g.fillStyle = g.strokeStyle = '#fff'; g.lineJoin = g.lineCap = 'round';
    const P = SHAPE_PATHS[shape], u = PX * .8, at = ([x, y]) => [PX / 2 + x * u, PX / 2 - y * u], poly = pts => { g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](...at(p))); };
    for (const f of P.fills) { poly(f.pts); g.closePath(); g.fill(); } for (const q of P.strokes) { poly(q.pts); g.lineWidth = q.w * u; g.stroke(); }
    const t = new T.CanvasTexture(c); maskCache.set(shape, new T.MeshBasicMaterial({color: '#00ff00', alphaMap: t, alphaTest: .5, transparent: false, toneMapped: false})); }
  return maskCache.get(shape);
}
