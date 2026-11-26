// avatar-style/governor.js — THE GOVERNOR's kit (Phase 1F, owner-approved design A + B): rigid classic R6 accessories in satin.
// Tall black TOP HAT with a red band, a gold-rimmed MONOCLE on his left eye (viewer's right), a big brown handlebar MUSTACHE, a
// GOLD CHAIN with a round medallion on the chest, and the signature GOLDEN MEGAPHONE (a right-hand tool). No text, no labels.
// Head items are in head-pivot coordinates (classic head: centre y .58, front z ≈ .55, scaled into the 1.2 box by Actor v5);
// the chain is in root coordinates (torso 2 × 2 × 1, y 2…4, front z .5). Registered by accessories.js / tools.js under
// the names govHat · monocle · mustache · govChain and the tool `megaphone`.
//   monocle option {pop: 0…1}: 0 = on the eye; 1 = popped off (flung up + out, spinning) — the panic face's gag; the
//   episode drives it with actor.attachments.monocle.userData.setPop(k).
import * as T from 'three';
import {HEAD} from './body.js';

export const GOV = {black: '#17171c', red: '#c61f2b', gold: '#f2bf3a', goldDeep: '#c9902a', brown: '#6a3d1f', glass: '#d9f1ff',
  eye: [.15, .645], mustacheY: .505, frontZ: .56};
const cache = new Map();
const c = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const satin = (col, extra = {}) => c('m:' + col + JSON.stringify(extra), () => new T.MeshStandardMaterial({color: col, roughness: .45, metalness: 0, ...extra}));
const gold = () => satin(GOV.gold, {roughness: .3, metalness: .55});
const put = (p, g, m, at, rot = [0, 0, 0], name = 'gov') => { const x = new T.Mesh(g, m); x.position.set(...at); x.rotation.set(...rot); x.castShadow = true; x.name = name; p.add(x); return x; };
const TOP = HEAD.centre + HEAD.halfHeight;

export function govHat(o = {}) {   // taller than the mayor's topHat, a slight flare, red band
  const grp = new T.Group(), black = satin(o.color ?? GOV.black), H = 1.35;
  put(grp, c('gh_brim', () => new T.CylinderGeometry(.86, .86, .08, 28)), black, [0, TOP + .06, 0]);
  put(grp, c('gh_crown', () => new T.CylinderGeometry(.6, .55, H, 28)), black, [0, TOP + .1 + H / 2, 0]);
  put(grp, c('gh_band', () => new T.CylinderGeometry(.565, .56, .24, 28)), satin(o.accent ?? GOV.red), [0, TOP + .24, 0]);
  grp.rotation.z = -.06; return grp;   // a jaunty tilt
}
export function monocle(o = {}) {
  const grp = new T.Group(), lens = new T.Group(); lens.name = 'monocleLens';
  put(lens, c('mo_rim', () => new T.TorusGeometry(.13, .028, 8, 24)), gold(), [0, 0, 0], [0, 0, 0], 'monocleRim');
  put(lens, c('mo_glass', () => new T.CircleGeometry(.12, 20)), satin(GOV.glass, {transparent: true, opacity: .28, roughness: .05}), [0, 0, -.005], [0, 0, 0], 'monocleGlass');
  const [x, y] = o.eye ?? GOV.eye, z = o.z ?? GOV.frontZ + .01; lens.position.set(x, y, z); grp.add(lens);
  const cord = put(grp, c('mo_cord', () => new T.CylinderGeometry(.012, .012, .42, 5)), gold(), [x + .1, y - .24, z - .03], [0, 0, .42], 'monocleCord');
  const rest = lens.position.clone();
  grp.userData.setPop = k => {   // 0 on the eye … 1 popped: up 0.55 and out 0.35, spun, the cord hidden
    k = Math.max(0, Math.min(1, k)); const s = Math.sin(k * Math.PI * .5);
    lens.position.set(rest.x + .35 * s, rest.y + .55 * s - .25 * k * k, rest.z + .28 * s); lens.rotation.set(0, 0, k * 4.2); cord.visible = k < .05; };
  grp.userData.setPop(o.pop ?? 0); return grp;
}
export function mustache(o = {}) {   // a big handlebar: two plump lobes drooping outward from the centre, curled-up tips
  const grp = new T.Group(), m = satin(o.color ?? GOV.brown), y = o.y ?? GOV.mustacheY, z = GOV.frontZ;
  for (const s of [-1, 1]) {
    put(grp, c('mu_lobe', () => new T.SphereGeometry(.12, 16, 10).scale(1.55, .72, .5)), m, [s * .155, y, z - .005], [0, -s * .3, s * .2]);
    put(grp, c('mu_curl', () => new T.TorusGeometry(.06, .036, 8, 14, Math.PI * 1.4)), m, [s * .345, y + .03, z - .06], [0, -s * .55, s > 0 ? -1.1 : Math.PI + 1.1]);
  }
  put(grp, c('mu_mid', () => new T.SphereGeometry(.085, 12, 8).scale(1, .9, .6)), m, [0, y + .015, z + .01]);
  return grp;
}
export function govChain(o = {}) {   // gold chain over the shoulders, round medallion on the chest (root coordinates)
  const grp = new T.Group(), g = gold();
  put(grp, c('gc_tie', () => new T.BoxGeometry(.2, 1.05, .05)), satin(GOV.red), [0, 3.38, .545], [0, 0, 0], 'govTie');
  put(grp, c('gc_knot', () => new T.BoxGeometry(.26, .2, .07)), satin(GOV.red), [0, 3.86, .55], [0, 0, 0], 'govTieKnot');
  put(grp, c('gc_chain', () => new T.TorusGeometry(.62, .05, 6, 28, Math.PI)), g, [0, 3.98, .53], [-.18, 0, Math.PI], 'govChainLoop');
  put(grp, c('gc_med', () => new T.CylinderGeometry(.33, .33, .09, 28)), g, [0, 3.3, .56], [Math.PI / 2, 0, 0], 'govMedallion');
  put(grp, c('gc_rim', () => new T.TorusGeometry(.24, .035, 6, 24)), satin(GOV.goldDeep, {roughness: .35, metalness: .5}), [0, 3.3, .61], [0, 0, 0], 'govMedallionRim');
  return grp;
}
// Golden megaphone: mouthpiece at the fist, the cone continues the arm ('extend' grip: forward when the arm is raised), bell rim.
export function megaphone(o = {}) {
  const grp = new T.Group(), g = gold(), L = o.length ?? 1.05, R = o.bell ?? .42;
  put(grp, c('mg_handle', () => new T.CylinderGeometry(.08, .08, .42, 10)), satin(GOV.goldDeep, {roughness: .4, metalness: .4}), [0, .04, -.18], [Math.PI / 2, 0, 0]);
  put(grp, c('mg_mouth', () => new T.CylinderGeometry(.13, .11, .22, 14)), g, [0, .1, 0]);
  put(grp, c('mg_cone' + L + R, () => new T.CylinderGeometry(.14, R, L, 24, 1, true)), satin(GOV.gold, {roughness: .3, metalness: .55, side: T.DoubleSide}), [0, -L / 2, 0]);
  put(grp, c('mg_rim' + R, () => new T.TorusGeometry(R, .045, 8, 28)), satin(GOV.red), [0, -L, 0], [Math.PI / 2, 0, 0], 'megaphoneRim');
  grp.userData.grip = 'extend'; return grp;
}
export const GOV_HEAD = ['govHat', 'monocle', 'mustache'];
export const GOV_ACCESSORIES = {govHat, monocle, mustache, govChain};
