// Classic-clothing painter: like a Roblox shirt/pants template, every detail
// (collar, buttons, belt, shoes, seams, shading) is painted onto the faces of
// the plain body blocks. No extra 3D trim is added to the silhouette.
import * as T from 'three';
import {normalFromHeight} from '../town/materials.js';

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

// ---- HD finish (opt-in): what a top clothing artist adds to a template ----
// Fine weave, stitched seams, baked fold shading per body part and a shared fabric bump.
let weaveCanvas = null, bumpTex = null;
function weave() {
  if (weaveCanvas) return weaveCanvas;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const twill = ((x + y) % 4 < 2) ? 14 : -10, v = 128 + twill + Math.round((r() - .5) * 26);
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1);
  }
  return (weaveCanvas = c);
}
function fabricBump() {
  if (bumpTex) return bumpTex;
  bumpTex = normalFromHeight(weave(), 3);   // baked weave normal map (no derivative-bump NaNs)
  return bumpTex;
}
function fold(g, W, H, pts, width, dark = .1) {
  // A crease: soft shadow line with a thin highlight just above it.
  g.save(); g.filter = `blur(${Math.max(1, W * .012)}px)`; g.lineCap = 'round';
  g.strokeStyle = `rgba(0,0,0,${dark})`; g.lineWidth = width * W;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)); g.stroke();
  g.strokeStyle = `rgba(255,255,255,${dark * .6})`; g.lineWidth = width * W * .5;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H - width * W * .9) : g.moveTo(x * W, y * H - width * W * .9)); g.stroke();
  g.restore();
}
const FOLDS = {
  torso: {front: [[[[.04, .22], [.2, .36], [.3, .5]], .03], [[[.96, .22], [.8, .36], [.7, .5]], .03], [[[.3, .82], [.5, .79], [.7, .82]], .025]],
          back: [[[[.2, .3], [.5, .36], [.8, .3]], .03], [[[.35, .8], [.65, .8]], .02]],
          right: [[[[.2, .3], [.5, .45], [.8, .3]], .03]], left: [[[[.2, .3], [.5, .45], [.8, .3]], .03]]},
  arm: {front: [[[[.15, .44], [.5, .4], [.85, .44]], .05], [[[.25, .5], [.55, .47], [.8, .5]], .03]], right: [[[[.15, .42], [.5, .46], [.85, .42]], .04]],
        left: [[[[.15, .42], [.5, .46], [.85, .42]], .04]], back: [[[[.2, .2], [.5, .24], [.8, .2]], .03]]},
  leg: {front: [[[[.12, .46], [.5, .5], [.88, .46]], .05], [[[.2, .72], [.5, .69], [.8, .72]], .035]], back: [[[[.15, .52], [.5, .48], [.85, .52]], .04]],
        right: [[[[.2, .5], [.5, .53], [.8, .5]], .035]], left: [[[[.2, .5], [.5, .53], [.8, .5]], .035]]},
};
function hdFinish(g, W, H, side, part, cloth = [0, 1]) {
  if (side === 'top' || side === 'bottom' || cloth[1] - cloth[0] < .05) return;
  // Everything below stays on the fabric: never on hands, arms or legs left as skin.
  g.save(); g.beginPath(); g.rect(0, cloth[0] * H, W, (cloth[1] - cloth[0]) * H); g.clip();
  const span = cloth[1] - cloth[0];
  g.save(); g.globalAlpha = .09; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(weave(), 'repeat');
  g.fillRect(0, 0, W, H); g.restore();
  // Folds are authored for full-length fabric; keep only those inside this garment.
  for (const [pts, w] of FOLDS[part]?.[side] ?? []) if (span > .7 && pts.every(([, y]) => y > cloth[0] + .03 && y < cloth[1] - .03)) fold(g, W, H, pts, w);
  // Edge occlusion: cloth darkens softly towards the block's rims.
  const e = Math.min(W, H) * .07;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, e, 0, 0, 0, e, H], [W, 0, W - e, 0, W - e, 0, e, H], [0, H, 0, H - e, 0, H - e, W, e]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  // Stitched seams just inside the vertical edges, like a sewn template.
  g.save(); g.setLineDash([W * .03, W * .022]); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = Math.max(1.5, W * .006);
  for (const x of [.035, .965]) { g.beginPath(); g.moveTo(x * W, 0); g.lineTo(x * W, H); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineDashOffset = W * .01;
  for (const x of [.045, .955]) { g.beginPath(); g.moveTo(x * W, 0); g.lineTo(x * W, H); g.stroke(); }
  g.restore(); g.restore();
}

// size: [x,y,z] studs; paint(k, side) draws one face. opts.hd (opt-in) doubles the
// resolution and adds the HD finish + fabric bump; part = 'torso' | 'arm' | 'leg'.
export function paintedMaterials(size, paint, {roughness = .5, hd = false, part = null} = {}) {
  if (typeof document === 'undefined') return null; // Node tests: geometry only.
  const [sx, sy, sz] = size, px = hd ? PX * 2 : PX;
  const dims = {right: [sz, sy], left: [sz, sy], top: [sx, sz], bottom: [sx, sz], front: [sx, sy], back: [sx, sy]};
  return SIDES.map(side => {
    const [w, h] = dims[side], c = document.createElement('canvas');
    c.width = Math.round(w * px); c.height = Math.round(h * px);
    const g = c.getContext('2d'), k = kit(g, c.width, c.height); k.hd = hd;
    paint(k, side); shade(g, c.width, c.height, side);
    if (hd) hdFinish(g, c.width, c.height, side, part, k.cloth);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = hd ? 8 : 4;
    const m = new T.MeshStandardMaterial({map: t, roughness});
    if (hd && (k.cloth ?? [0, 1])[1] - (k.cloth ?? [0, 1])[0] >= .7) { const b = fabricBump().clone(); b.needsUpdate = true; b.repeat.set(w * 5, h * 5); m.normalMap = b; m.normalScale.set(.5, .5); }
    if (hd) m.roughness = .72;
    m.userData.authored = true; return m;
  });
}

// ---- Outfit recipes -------------------------------------------------------
const darken = (hex, f = .78) => '#' + new T.Color(hex).multiplyScalar(f).getHexString();

// Long-sleeve top: sleeve fabric, darker cuff, hand left as skin (transparent in a real template).
export function longSleeve(top, skin) {
  return (k, side) => {
    if (side === 'bottom') return k.fill(skin);
    k.fill(top); if (side === 'top') return;
    k.cloth = [0, .84];
    k.rect(0, .76, 1, .08, darken(top)); k.rect(0, .84, 1, .16, skin);
    if (side === 'left' || side === 'right') k.line(.5, 0, .5, .76, darken(top, .85), .02);
  };
}
export function shortSleeve(top, skin) {
  return (k, side) => {
    if (side === 'top') return k.fill(top);
    if (side === 'bottom') return k.fill(skin);
    k.cloth = [0, .34];
    k.fill(skin); k.rect(0, 0, 1, .34, top); k.rect(0, .3, 1, .04, darken(top));
  };
}
// Trousers or shorts with painted shoes; legLength 1 = full trousers.
export function legs({cloth, skin, shoe, legLength = 1, belt = null, sock = null}) {
  return (k, side) => {
    if (side === 'bottom') return k.fill(shoe);
    if (side === 'top') return k.fill(cloth);
    k.cloth = [0, .84 * legLength];
    k.fill(skin); k.rect(0, 0, 1, .84 * legLength, cloth);
    if (legLength < 1) k.rect(0, .84 * legLength - .04, 1, .04, darken(cloth));
    if (belt) k.rect(0, 0, 1, .07, belt);
    if (side === 'front' && legLength === 1) k.line(.5, .1, .5, .8, darken(cloth, .82), .012);
    if (sock) k.rect(0, .74, 1, .1, sock);
    k.rect(0, .84, 1, .16, shoe); k.rect(0, .955, 1, .045, '#f2ece2');
    if (side === 'front') k.rect(.15, .86, .7, .04, darken(shoe, 1.25));
    if (k.hd && side !== 'top') {
      k.rect(0, .935, 1, .02, darken(shoe, .7));                                   // sole edge line
      for (let x = .06; x < 1; x += .08) k.rect(x, .962, .03, .03, darken('#f2ece2', .9)); // tread
      if (side === 'front') { for (const y of [.875, .905]) k.line(.32, y, .68, y + .012, '#f4f1ea', .01); k.dot(.5, .87, .02, '#f4f1ea'); } // laces
      if (legLength === 1) k.rect(0, .8, 1, .02, darken(cloth, .8));               // trouser hem
      if (side === 'back' && legLength === 1) { k.rect(.2, .12, .6, .14, darken(cloth, .9)); k.line(.2, .12, .8, .12, darken(cloth, .7), .008); } // pocket
    }
  };
}

export const TORSOS = {
  // Generic crowd tops: plain tee with a chest graphic, hoodie, striped shirt.
  tee({top, accent = '#ffffff'}) {
    return (k, side) => {
      k.fill(top); if (side === 'top' || side === 'bottom') return;
      if (side === 'front') { k.poly([[.36, 0], [.5, .1], [.64, 0]], darken(top, .75)); k.dot(.5, .45, .16, accent); k.dot(.5, .45, .09, top); }
    };
  },
  hoodie({top, accent = '#ffffff'}) {
    return (k, side) => {
      k.fill(top); if (side === 'top' || side === 'bottom') return;
      if (side === 'front') {
        k.poly([[.28, 0], [.5, .22], [.72, 0]], darken(top, .72));
        k.line(.43, .12, .41, .42, accent, .014); k.line(.57, .12, .59, .42, accent, .014);
        k.poly([[.22, .6], [.78, .6], [.86, .9], [.14, .9]], darken(top, .88)); k.line(.5, .6, .5, .9, darken(top, .7), .01);
      }
      if (side === 'back') k.poly([[.2, 0], [.8, 0], [.7, .3], [.3, .3]], darken(top, .85));
      k.rect(0, .9, 1, .1, darken(top, .8));
    };
  },
  stripe({top, accent = '#ffffff'}) {
    return (k, side) => {
      k.fill(top); if (side === 'top' || side === 'bottom') return;
      for (const y of [.2, .44, .68]) k.rect(0, y, 1, .1, accent);
      if (side === 'front') k.poly([[.36, 0], [.5, .1], [.64, 0]], darken(top, .75));
    };
  },
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
