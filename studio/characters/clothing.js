// Classic-clothing painter: like a Roblox shirt/pants template, every detail
// (collar, buttons, belt, shoes, seams, shading) is painted onto the faces of
// the plain body blocks. No extra 3D trim is added to the silhouette.
import * as T from 'three';

// Box face order used by BoxGeometry/RoundedBoxGeometry material groups.
export const SIDES = ['right', 'left', 'top', 'bottom', 'front', 'back'];
const PX = 256; // pixels per stud

// Small drawing kit in normalized face coordinates (0..1, y down).
function kit(g, W, H) {
  return {
    W, H,
    fill(c) { g.fillStyle = c; g.fillRect(0, 0, W, H); },
    rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x * W, y * H, w * W, h * H); },
    poly(pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)); g.closePath(); g.fill(); },
    line(x1, y1, x2, y2, c, w = .012) { g.strokeStyle = c; g.lineWidth = w * Math.max(W, H); g.lineCap = 'round'; g.beginPath(); g.moveTo(x1 * W, y1 * H); g.lineTo(x2 * W, y2 * H); g.stroke(); },
    dot(x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x * W, y * H, r * Math.min(W, H), 0, Math.PI * 2); g.fill(); },
    band(x1, y1, x2, y2, width, c) { g.strokeStyle = c; g.lineWidth = width * Math.min(W, H); g.lineCap = 'butt'; g.beginPath(); g.moveTo(x1 * W, y1 * H); g.lineTo(x2 * W, y2 * H); g.stroke(); },
  };
}
// Drawn shading, as classic shirt artists paint it: light top, darker bottom, seam outline.
function shade(g, W, H, side) {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)'); grad.addColorStop(.55, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.16)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  if (side === 'left' || side === 'right') { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, W, H); }
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = Math.max(W, H) * .012; g.strokeRect(0, 0, W, H);
}

// size: [x,y,z] studs; paint(k, side) draws one face.
export function paintedMaterials(size, paint, {roughness = .5} = {}) {
  if (typeof document === 'undefined') return null; // Node tests: geometry only.
  const [sx, sy, sz] = size;
  const dims = {right: [sz, sy], left: [sz, sy], top: [sx, sz], bottom: [sx, sz], front: [sx, sy], back: [sx, sy]};
  return SIDES.map(side => {
    const [w, h] = dims[side], c = document.createElement('canvas');
    c.width = Math.round(w * PX); c.height = Math.round(h * PX);
    const g = c.getContext('2d'), k = kit(g, c.width, c.height);
    paint(k, side); shade(g, c.width, c.height, side);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    const m = new T.MeshStandardMaterial({map: t, roughness}); m.userData.authored = true; return m;
  });
}

// ---- Outfit recipes -------------------------------------------------------
const darken = (hex, f = .78) => '#' + new T.Color(hex).multiplyScalar(f).getHexString();

// Long-sleeve top: sleeve fabric, darker cuff, hand left as skin (transparent in a real template).
export function longSleeve(top, skin) {
  return (k, side) => {
    if (side === 'bottom') return k.fill(skin);
    k.fill(top); if (side === 'top') return;
    k.rect(0, .76, 1, .08, darken(top)); k.rect(0, .84, 1, .16, skin);
    if (side === 'left' || side === 'right') k.line(.5, 0, .5, .76, darken(top, .85), .02);
  };
}
export function shortSleeve(top, skin) {
  return (k, side) => {
    if (side === 'top') return k.fill(top);
    if (side === 'bottom') return k.fill(skin);
    k.fill(skin); k.rect(0, 0, 1, .34, top); k.rect(0, .3, 1, .04, darken(top));
  };
}
// Trousers or shorts with painted shoes; legLength 1 = full trousers.
export function legs({cloth, skin, shoe, legLength = 1, belt = null, sock = null}) {
  return (k, side) => {
    if (side === 'bottom') return k.fill(shoe);
    if (side === 'top') return k.fill(cloth);
    k.fill(skin); k.rect(0, 0, 1, .84 * legLength, cloth);
    if (legLength < 1) k.rect(0, .84 * legLength - .04, 1, .04, darken(cloth));
    if (belt) k.rect(0, 0, 1, .07, belt);
    if (side === 'front' && legLength === 1) k.line(.5, .1, .5, .8, darken(cloth, .82), .012);
    if (sock) k.rect(0, .74, 1, .1, sock);
    k.rect(0, .84, 1, .16, shoe); k.rect(0, .955, 1, .045, '#f2ece2');
    if (side === 'front') k.rect(.15, .86, .7, .04, darken(shoe, 1.25));
  };
}

export const TORSOS = {
  leo({top}) {
    return (k, side) => {
      k.fill(top);
      const dark = darken(top);
      if (side === 'front') {
        k.poly([[.18, 0], [.5, .42], [.36, 0]], dark); k.poly([[.82, 0], [.5, .42], [.64, 0]], dark); // lapels
        k.poly([[.36, 0], [.5, .3], [.64, 0]], '#f3e6cc'); // shirt collar
        k.line(.5, .42, .5, .86, darken(top, .7), .012);
        for (const y of [.52, .68]) k.dot(.56, y, .025, '#f0c65a');
        k.rect(.6, .62, .22, .14, darken(top, .9)); k.line(.6, .62, .82, .62, darken(top, .7), .01); // pocket
        k.band(.9, -.02, .14, 1.02, .085, '#e0a73e'); k.band(.9, -.02, .14, 1.02, .02, '#b8812b'); // satchel strap
      }
      if (side === 'back') { k.line(.5, 0, .5, .86, darken(top, .82), .01); k.band(.1, -.02, .86, 1.02, .085, '#e0a73e'); }
      if (side === 'top') k.band(.82, 0, .2, 1, .16, '#e0a73e');
      if (side !== 'top' && side !== 'bottom') k.rect(0, .86, 1, .14, dark); // hem
    };
  },
  pip({top}) {
    return (k, side) => {
      k.fill(top);
      if (side === 'top' || side === 'bottom') return;
      k.rect(0, .38, 1, .14, '#fbe7bd'); k.rect(0, .52, 1, .03, darken(top));
      if (side === 'front') { k.poly([[.36, 0], [.5, .1], [.64, 0]], darken(top, .8)); k.rect(.36, 0, .28, .025, darken(top, .7)); }
    };
  },
  mother({top}) {
    return (k, side) => {
      k.fill(top);
      if (side === 'front') {
        k.poly([[.06, 0], [.5, .64], [.94, 0], [.74, 0], [.5, .4], [.26, 0]], '#f2e3c6');
        k.line(.5, .64, .5, 1, darken(top, .72), .012);
        for (const y of [.74, .88]) k.dot(.5, y, .022, '#f2e3c6');
        for (const x of [.1, .66]) k.rect(x, .7, .24, .16, darken(top, .9));
      }
      if (side === 'back' || side === 'left' || side === 'right') k.rect(0, .9, 1, .1, darken(top));
      if (side === 'top') { k.rect(0, 0, .22, 1, '#f2e3c6'); k.rect(.78, 0, .22, 1, '#f2e3c6'); }
    };
  },
};
