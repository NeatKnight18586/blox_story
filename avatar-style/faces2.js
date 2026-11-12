// avatar-style/faces2.js — flat classic-decal faces of our own design (docs/V2_BRIEF.md §6.2).
// Two solid eyes, one mouth, optional brows, strokes ~1.6× the legacy ones so a face reads at 160 px
// avatar height. Each face is one cached canvas texture + material shared by every actor; switching
// faces swaps the decal's material only (no geometry is rebuilt). Hero decals are 512 px wide (native
// 1080 close-ups), background decals 128 px.
import * as T from 'three';
import {headFrontZ} from './body.js';

export const FACES = ['smile', 'neutral', 'determined', 'terrified', 'smug', 'sad', 'crying', 'shout', 'gasp', 'sleep'];
const W = 1.0, H = .68, Y0 = -.02;                         // decal extent on the head (head-centre coords)
const INK = '#16181c', TEAR = '#46b4ff', TONGUE = '#e0526a', WHITE = '#ffffff';

// Drawing in face units: x ∈ [-.5, .5], y ∈ [-.34, .34] (y up). Stroke widths in face units too.
function painter(g, px) {
  const X = x => (x / W + .5) * px, Y = y => (.5 - (y - Y0) / H) * px * H / W, U = u => u * px / W;
  return {
    eye(x, y, w = .085, h = .16) { g.fillStyle = INK; g.beginPath(); g.ellipse(X(x), Y(y), U(w / 2), U(h / 2), 0, 0, 7); g.fill(); },
    shine(x, y, r = .022) { g.fillStyle = WHITE; g.beginPath(); g.arc(X(x), Y(y), U(r), 0, 7); g.fill(); },
    line(pts, w = .056, c = INK) { g.strokeStyle = c; g.lineWidth = U(w); g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.stroke(); },
    curve(x0, y0, cx, cy, x1, y1, w = .056, c = INK) { g.strokeStyle = c; g.lineWidth = U(w); g.lineCap = 'round'; g.beginPath(); g.moveTo(X(x0), Y(y0)); g.quadraticCurveTo(X(cx), Y(cy), X(x1), Y(y1)); g.stroke(); },
    blob(pts, c = INK) { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.closePath(); g.fill(); },
    oval(x, y, w, h, c = INK) { g.fillStyle = c; g.beginPath(); g.ellipse(X(x), Y(y), U(w / 2), U(h / 2), 0, 0, 7); g.fill(); },
  };
}

const EX = .17, EY = .08, MY = -.15;
const DRAW = {
  smile: p => { p.eye(-EX, EY); p.eye(EX, EY); p.shine(-EX + .015, EY + .04); p.shine(EX + .015, EY + .04); p.curve(-.17, MY + .03, 0, MY - .14, .17, MY + .03); },
  neutral: p => { p.eye(-EX, EY); p.eye(EX, EY); p.shine(-EX + .015, EY + .04); p.shine(EX + .015, EY + .04); p.line([[-.1, MY - .02], [.1, MY - .02]]); },
  determined: p => {
    p.eye(-EX, EY - .01, .085, .13); p.eye(EX, EY - .01, .085, .13);
    p.line([[-.27, EY + .14], [-.08, EY + .08]], .05); p.line([[.27, EY + .14], [.08, EY + .08]], .05);
    p.curve(-.12, MY - .03, 0, MY + .02, .12, MY - .03);
  },
  terrified: p => {
    for (const s of [-1, 1]) { p.oval(s * EX, EY, .155, .215, INK); p.oval(s * EX, EY, .105, .165, WHITE); p.oval(s * EX, EY - .01, .05, .06, INK); }
    p.line([[-.27, EY + .17], [-.09, EY + .21]], .045); p.line([[.27, EY + .17], [.09, EY + .21]], .045);
    p.blob([[-.12, MY + .02], [-.06, MY + .05], [0, MY + .02], [.06, MY + .05], [.12, MY + .02], [.11, MY - .1], [0, MY - .13], [-.11, MY - .1]]);
  },
  smug: p => {
    for (const s of [-1, 1]) p.blob([[s * EX - .05, EY + .02], [s * EX + .05, EY + .02], [s * EX + .045, EY - .05], [s * EX, EY - .07], [s * EX - .045, EY - .05]]);
    p.line([[-.26, EY + .08], [-.09, EY + .09]], .045); p.line([[.08, EY + .14], [.26, EY + .17]], .045);
    p.curve(-.12, MY - .02, .04, MY - .06, .16, MY + .05);
  },
  sad: p => {
    p.eye(-EX, EY - .01, .085, .14); p.eye(EX, EY - .01, .085, .14); p.shine(-EX + .015, EY + .03); p.shine(EX + .015, EY + .03);
    p.line([[-.27, EY + .12], [-.09, EY + .17]], .045); p.line([[.27, EY + .12], [.09, EY + .17]], .045);
    p.curve(-.14, MY - .08, 0, MY + .06, .14, MY - .08);
  },
  crying: p => {
    DRAW.sad(p);
    for (const s of [-1, 1]) p.blob([[s * EX - .03, EY - .08], [s * EX + .03, EY - .08], [s * EX + .035, -.33], [s * EX - .035, -.33]], TEAR);
  },
  shout: p => {
    p.eye(-EX, EY - .01, .09, .13); p.eye(EX, EY - .01, .09, .13);
    p.line([[-.27, EY + .15], [-.08, EY + .09]], .05); p.line([[.27, EY + .15], [.08, EY + .09]], .05);
    p.blob([[-.15, MY + .04], [.15, MY + .04], [.12, MY - .1], [0, MY - .16], [-.12, MY - .1]]);
    p.oval(0, MY - .1, .14, .07, TONGUE);
  },
  gasp: p => {
    for (const s of [-1, 1]) { p.oval(s * EX, EY, .13, .19, INK); p.oval(s * EX + .02, EY + .04, .04, .04, WHITE); }
    p.line([[-.25, EY + .17], [-.1, EY + .2]], .04); p.line([[.25, EY + .17], [.1, EY + .2]], .04);
    p.oval(0, MY - .05, .1, .13, INK);
  },
  sleep: p => {
    p.curve(-EX - .06, EY, -EX, EY - .07, -EX + .06, EY); p.curve(EX - .06, EY, EX, EY - .07, EX + .06, EY);
    p.curve(-.06, MY - .03, 0, MY - .07, .06, MY - .03, .045);
  },
};

const texCache = new Map();
export function faceMaterial(name, tier = 'hero') {
  if (!DRAW[name]) throw Error('unknown face ' + name);
  const key = name + ':' + tier;
  if (texCache.has(key)) return texCache.get(key);
  let mat;
  if (typeof document === 'undefined') mat = new T.MeshBasicMaterial({transparent: true, opacity: 0});   // Node tests: no canvas
  else {
    const px = tier === 'hero' ? 512 : 128, c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * H / W);
    const g = c.getContext('2d'); DRAW[name](painter(g, px));
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    mat = new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  }
  mat.name = 'face_' + name; texCache.set(key, mat); return mat;
}

// Curved decal patch hugging the head front (head-centre coordinates).
let decalGeo = null;
export function decalGeometry() {
  if (decalGeo) return decalGeo;
  const g = new T.PlaneGeometry(W, H, 10, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, headFrontZ(x) + .006); p.setY(i, p.getY(i) + Y0); }
  g.computeVertexNormals(); return (decalGeo = g);
}

// Attach (once) and switch the face on an actor. The decal mesh is created once; later calls swap material.
export function setFace(actor, name) {
  if (!actor.faceLayer) {
    const m = new T.Mesh(decalGeometry(), faceMaterial(name, actor.tier)); m.name = 'face_decal'; m.renderOrder = 2;
    m.position.y = .58; actor.pivots.head.add(m); actor.faceLayer = m;
  }
  actor.faceLayer.material = faceMaterial(name, actor.tier); actor.face = name; return actor;
}
