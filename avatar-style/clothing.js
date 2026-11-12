// avatar-style/clothing.js — clothing is paint (docs/V2_BRIEF.md §6.4): small canvas textures per
// block face in the classic template style. Recipes: tunic, armor, robe, apron, royal, peasant.
// Details: collar, buttons, belt + buckle, hem, stripes, pocket, sleeve cuffs, boot band, a shading
// line under the collar, patches with stitches. Hero torso faces 512 px (holds in a native 1080
// close-up), background 128 px. Materials are cached per outfit + part + face, so identical outfits share them.
import * as T from 'three';
import {PLASTIC, plastic} from './body.js';

export const RECIPES = ['tunic', 'armor', 'robe', 'apron', 'royal', 'peasant'];
const SIDES = ['right', 'left', 'top', 'bottom', 'front', 'back'];   // BoxGeometry group order
const shade = (hex, k) => '#' + new T.Color(hex).multiplyScalar(k).getHexString();
const tint = (hex, k) => '#' + new T.Color(hex).lerp(new T.Color('#ffffff'), k).getHexString();

function kit(g, w, h) {
  return {
    w, h,
    fill: c => { g.fillStyle = c; g.fillRect(0, 0, w, h); },
    rect: (x, y, rw, rh, c) => { g.fillStyle = c; g.fillRect(x * w, y * h, rw * w, rh * h); },
    poly: (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x * w, y * h)); g.closePath(); g.fill(); },
    line: (pts, c, lw = .02, dash = null) => { g.strokeStyle = c; g.lineWidth = lw * Math.max(w, h); g.setLineDash(dash ? dash.map(d => d * w) : []); g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x * w, y * h)); g.stroke(); g.setLineDash([]); },
    dot: (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x * w, y * h, r * Math.min(w, h), 0, 7); g.fill(); },
    grad: (y0, y1, a, b) => { const gr = g.createLinearGradient(0, y0 * h, 0, y1 * h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, y0 * h, w, (y1 - y0) * h); },
  };
}

// Shared helpers (all coordinates are fractions of the face, y down).
const belt = (k, c, buckle, y = .8) => { k.rect(0, y, 1, .09, c); if (buckle) { k.rect(.42, y - .01, .16, .11, buckle); k.rect(.47, y + .025, .06, .04, shade(c, .8)); } };
const collarShade = k => k.grad(0, .12, 'rgba(0,0,0,.22)', 'rgba(0,0,0,0)');
const stitchBox = (k, x, y, w, h, c) => k.line([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], c, .012, [.03, .025]);
const patch = (k, x, y, w, h, c) => { k.rect(x, y, w, h, c); stitchBox(k, x + .015, y + .015, w - .03, h - .03, 'rgba(0,0,0,.45)'); };
const cuff = (k, c, skin, y = .72) => { k.rect(0, y, 1, .1, c); k.rect(0, y + .1, 1, 1, skin); };
const boots = (k, c, y = .78) => { k.rect(0, y, 1, 1, c); k.rect(0, y, 1, .05, shade(c, 1.35)); };

// Outfit painters: (k, part, side, o) where o = {main, trim, accent, legs, boots, belt, skin, pattern}.
const PAINT = {
  tunic(k, part, side, o) {
    if (part === 'torso') {
      k.fill(o.main); if (side === 'front') { collarShade(k); k.poly([[.36, 0], [.64, 0], [.5, .26]], o.skin); k.line([[.36, 0], [.5, .26], [.64, 0]], o.trim, .03); }
      if (side !== 'top' && side !== 'bottom') { belt(k, o.belt, side === 'front' && o.buckle); k.rect(0, .93, 1, .07, o.trim); }
      if (side === 'top') k.rect(.36, 0, .28, .3, o.skin);
    } else if (part === 'arm') { k.fill(o.main); if (side === 'bottom') k.fill(o.skin); else cuff(k, o.trim, o.skin); }
    else { k.fill(o.legs); if (side !== 'top') boots(k, o.boots); if (side === 'bottom') k.fill(shade(o.boots, .7)); }
  },
  armor(k, part, side, o) {
    const steel = o.main, dark = shade(steel, .62), lite = tint(steel, .35);
    if (part === 'torso') {
      k.fill(steel);
      if (side === 'front' || side === 'back') {
        k.poly([[.12, .08], [.88, .08], [.8, .55], [.5, .62], [.2, .55]], lite); k.line([[.5, .1], [.5, .6]], dark, .03);
        for (const y of [.66, .76]) k.rect(.08, y, .84, .06, dark);
        for (const x of [.12, .88]) for (const y of [.12, .45]) k.dot(x, y, .025, dark);
        if (side === 'front' && o.accent) k.poly([[.42, .2], [.58, .2], [.58, .36], [.5, .44], [.42, .36]], o.accent);
      } else if (side !== 'top' && side !== 'bottom') for (const y of [.25, .5, .75]) k.rect(0, y, 1, .05, dark);
      belt(k, o.belt, side === 'front' && o.buckle, .86);
    } else if (part === 'arm') {
      k.fill(steel); if (side === 'bottom') { k.fill(o.skin); return; }
      for (const y of [.12, .3, .48]) k.rect(0, y, 1, .07, dark); k.rect(0, .62, 1, .16, lite); cuff(k, dark, o.skin, .78);
    } else {
      k.fill(steel); if (side === 'front') { k.rect(.25, .3, .5, .18, lite); k.dot(.5, .39, .05, dark); }
      for (const y of [.15, .6]) k.rect(0, y, 1, .05, dark); boots(k, o.boots, .8);
    }
  },
  robe(k, part, side, o) {
    if (part === 'torso') {
      k.fill(o.main); collarShade(k);
      if (side === 'front') { k.rect(.44, 0, .12, 1, o.trim); k.poly([[.32, 0], [.68, 0], [.5, .2]], o.skin); }
      if (side !== 'top' && side !== 'bottom') belt(k, o.belt, false, .62);
    } else if (part === 'arm') { k.fill(o.main); if (side === 'bottom') { k.fill(o.skin); return; } k.rect(0, .7, 1, .16, o.trim); k.rect(0, .86, 1, 1, o.skin); }
    else { k.fill(o.main); if (side === 'front') k.rect(side === 'front' ? .0 : 0, 0, .12, 1, shade(o.main, .85)); k.rect(0, .84, 1, .08, o.trim); boots(k, o.boots, .92); }
  },
  apron(k, part, side, o) {
    PAINT.tunic(k, part, side, {...o, buckle: false});
    if (part === 'torso' && side === 'front') {
      k.rect(.18, .22, .64, .9, o.accent); k.line([[.18, .22], [.36, 0]], o.accent, .05); k.line([[.82, .22], [.64, 0]], o.accent, .05);
      k.rect(.34, .5, .32, .2, shade(o.accent, .9)); stitchBox(k, .35, .51, .3, .18, 'rgba(0,0,0,.3)');
    }
    if (part === 'leg' && side === 'front') k.rect(0, 0, 1, .42, o.accent);
  },
  royal(k, part, side, o) {
    const ermine = '#f7f3ea';
    if (part === 'torso') {
      k.fill(o.main);
      if (side !== 'bottom') { k.rect(0, 0, 1, .2, ermine); for (let i = 0; i < 6; i++) k.rect(.08 + i * .16, .07, .03, .07, '#1a1a1a'); }
      if (side === 'front') { k.rect(.45, .2, .1, .8, o.trim); for (const y of [.32, .48, .64]) k.dot(.5, y, .035, tint(o.trim, .4)); }
      if (side !== 'top' && side !== 'bottom') belt(k, o.trim, side === 'front' && o.buckle, .78);
    } else if (part === 'arm') { k.fill(o.main); if (side === 'bottom') { k.fill(o.skin); return; } k.rect(0, 0, 1, .14, ermine); cuff(k, o.trim, o.skin, .7); }
    else { k.fill(o.legs); if (side === 'front' || side === 'back') k.rect(.42, 0, .16, .78, o.trim); boots(k, o.boots, .76); }
  },
  peasant(k, part, side, o) {
    if (part === 'torso') {
      k.fill(o.main); collarShade(k);
      if (side === 'front') { k.poly([[.38, 0], [.62, 0], [.5, .18]], o.skin); k.line([[.5, .18], [.5, .4]], shade(o.main, .7), .02); patch(k, .6, .42, .22, .2, o.accent2 ?? tint(o.main, .3)); }
      if (side === 'back') patch(k, .18, .3, .26, .22, o.accent2 ?? shade(o.main, .78));
      if (side !== 'top' && side !== 'bottom') {
        k.rect(0, .8, 1, .06, o.belt);                                  // rope belt
        for (let i = 0; i < 12; i++) k.poly([[i / 12, .94], [(i + .5) / 12, 1], [(i + 1) / 12, .94], [(i + 1) / 12, .92], [i / 12, .92]], shade(o.main, .82));   // frayed hem
      }
    } else if (part === 'arm') {
      k.fill(o.main); if (side === 'bottom') { k.fill(o.skin); return; }
      if (side === 'front') patch(k, .2, .3, .45, .14, shade(o.main, .75)); k.rect(0, .7, 1, 1, o.skin);   // rolled sleeves
      k.rect(0, .66, 1, .06, shade(o.main, .8));
    } else {
      k.fill(o.legs); if (side === 'front') patch(k, .25, .4, .4, .14, tint(o.legs, .25)); boots(k, o.boots, .82);
    }
  },
};

const DEFAULTS = {main: '#4f7cc4', trim: '#f2d16b', accent: '#f7f3ea', legs: '#3b3f46', boots: '#4a3222', belt: '#6b4428', buckle: '#f2d16b'};
const matCache = new Map();
// outfit: {recipe, ...colours}. part: 'torso' | 'arm' | 'leg'. size: [x, y, z] studs of the block.
export function outfitMaterials(outfit, part, size, skin, tier = 'hero') {
  const o = {...DEFAULTS, ...outfit, skin};
  if (!PAINT[o.recipe]) throw Error('unknown outfit recipe ' + o.recipe);
  const key = JSON.stringify([o, part, size, tier]);
  if (matCache.has(key)) return matCache.get(key);
  let mats;
  if (typeof document === 'undefined') mats = SIDES.map(() => plastic(part === 'leg' ? o.legs : o.main));   // Node: geometry only
  else {
    const per = tier === 'hero' ? 512 : 128, [sx, sy, sz] = size;   // px per 2 studs: torso front 512² (hero), 128² (bg)
    const dims = {right: [sz, sy], left: [sz, sy], top: [sx, sz], bottom: [sx, sz], front: [sx, sy], back: [sx, sy]};
    mats = SIDES.map(side => {
      const [w, h] = dims[side], c = document.createElement('canvas'); c.width = Math.max(8, Math.round(w * per / 2)); c.height = Math.max(8, Math.round(h * per / 2));
      PAINT[o.recipe](kit(c.getContext('2d'), c.width, c.height), part, side, o);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
      return new T.MeshPhongMaterial({map: t, ...PLASTIC});
    });
  }
  matCache.set(key, mats); return mats;
}

// Materials for all six parts of an actor wearing `outfit` (arms and legs share their painter).
export function dress(outfit, skin, tier) {
  return {
    torso: outfitMaterials(outfit, 'torso', [2, 2, 1], skin, tier),
    leftArm: outfitMaterials(outfit, 'arm', [.98, 1.99, 1], skin, tier), rightArm: outfitMaterials(outfit, 'arm', [.98, 1.99, 1], skin, tier),
    leftLeg: outfitMaterials(outfit, 'leg', [.98, 2, 1], skin, tier), rightLeg: outfitMaterials(outfit, 'leg', [.98, 2, 1], skin, tier),
  };
}
