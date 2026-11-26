// avatar-style/extras1g.js — FEAR BELL extras kit (Phase 1G): rigid R6 accessories of our own design, no text or logos.
// Head items (head-pivot coordinates, centre y .58, front z ≈ .55): mailCap (blue postal cap), capBack (backwards red cap), glasses.
// Body items (root coordinates, torso y 2…4, front z .5): bowtie, raincoat (yellow flared hem + collar + toggles), plushHug (Lulu's
// bunny held to the chest), muscles (chest + traps shells; bicep shells ride the shoulder pivots via userData.pivotParts).
import * as T from 'three';
import {HEAD} from './body.js';
import {plush} from '../parts/props1g.js';

const cache = new Map(), c = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const mat = (col, o = {}) => c('m' + col + JSON.stringify(o), () => new T.MeshStandardMaterial({color: col, roughness: .45, metalness: 0, ...o}));
const put = (p, g, m, at, rot = [0, 0, 0]) => { const x = new T.Mesh(g, m); x.position.set(...at); x.rotation.set(...rot); x.castShadow = true; p.add(x); return x; };
const TOP = HEAD.centre + HEAD.halfHeight;
export function mailCap(o = {}) {
  const g = new T.Group(), b = mat(o.color ?? '#1f4fb8');
  put(g, c('mc_crown', () => new T.CylinderGeometry(.62, .64, .42, 24)), b, [0, TOP + .12, -.02]); put(g, c('mc_top', () => new T.CylinderGeometry(.7, .62, .1, 24)), b, [0, TOP + .36, -.02]);
  put(g, c('mc_brim', () => new T.BoxGeometry(1.0, .07, .5)), mat('#14181f'), [0, TOP - .02, .62], [.12, 0, 0]); put(g, c('mc_badge', () => new T.CylinderGeometry(.13, .13, .04, 16)), mat('#f2bf3a', {roughness: .3, metalness: .5}), [0, TOP + .16, .6], [Math.PI / 2, 0, 0]);
  return g;
}
export function capBack(o = {}) {
  const g = new T.Group(), b = mat(o.color ?? '#e8323a'); put(g, c('cb_crown', () => new T.SphereGeometry(.63, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), b, [0, TOP - .1, 0], [0, 0, 0]);
  put(g, c('cb_brim', () => new T.BoxGeometry(.9, .06, .55)), b, [0, TOP - .08, -.78], [-.1, 0, 0]); put(g, c('cb_btn', () => new T.SphereGeometry(.07, 8, 6)), mat('#ffffff'), [0, TOP + .52, 0]); return g;
}
export function glasses(o = {}) {
  const g = new T.Group(), f = mat(o.color ?? '#1b1b22', {roughness: .3}), z = .6, y = .68;
  for (const s of [-1, 1]) put(g, c('gl_rim', () => new T.TorusGeometry(.16, .025, 6, 20)), f, [s * .2, y, z]);
  put(g, c('gl_bridge', () => new T.BoxGeometry(.1, .03, .03)), f, [0, y + .03, z]); for (const s of [-1, 1]) put(g, c('gl_arm', () => new T.BoxGeometry(.03, .03, .55)), f, [s * .37, y + .02, z - .27]);
  return g;
}
export function bowtie(o = {}) {
  const g = new T.Group(), m = mat(o.color ?? '#d8262f'); for (const s of [-1, 1]) put(g, c('bt_wing', () => new T.ConeGeometry(.2, .36, 4)), m, [s * .2, 3.88, .56], [0, 0, s * Math.PI / 2]);
  put(g, c('bt_knot', () => new T.BoxGeometry(.13, .14, .1)), m, [0, 3.88, .6]); return g;
}
export function raincoat(o = {}) {
  const g = new T.Group(), y = mat(o.color ?? '#ffd21f', {roughness: .3}), d = mat('#c99a00', {roughness: .35});
  const hem = put(g, c('rc_hem', () => new T.CylinderGeometry(1.08, 1.3, .9, 4, 1, true).rotateY(Math.PI / 4).scale(1.02, 1, .62)), y, [0, 1.8, 0]); hem.material = c('rc_hemMat', () => y.clone()); hem.material.side = T.DoubleSide;
  put(g, c('rc_collar', () => new T.BoxGeometry(1.5, .22, 1.12)), y, [0, 3.95, 0]); for (const s of [-1, 1]) put(g, c('rc_lapel', () => new T.BoxGeometry(.4, .3, .1)), y, [s * .22, 3.8, .54], [0, 0, s * .5]);
  for (const k of [0, 1, 2]) put(g, c('rc_tog', () => new T.CapsuleGeometry(.04, .14, 2, 6).rotateZ(Math.PI / 2)), d, [.16, 3.5 - k * .45, .53]);
  put(g, c('rc_pocket', () => new T.BoxGeometry(.4, .06, .06)), d, [-.55, 2.55, .52]); return g;
}
export function plushHug() { const g = new T.Group(), p = plush(); p.scale.setScalar(.95); p.position.set(.05, 2.05, .72); p.rotation.set(-.12, -.2, 0); g.add(p); return g; }
export function muscles(o = {}) {
  const g = new T.Group(), skin = mat(o.skin ?? '#c98a5c', {roughness: .5}), top = mat(o.color ?? '#2a2d36', {roughness: .5});
  for (const s of [-1, 1]) { put(g, c('mu_pec', () => new T.BoxGeometry(.98, .7, .32)), top, [s * .5, 3.42, .56]); put(g, c('mu_trap', () => new T.BoxGeometry(.7, .3, .9)), top, [s * .55, 4.07, -.05], [0, 0, -s * .3]); }
  put(g, c('mu_abs', () => new T.BoxGeometry(1.3, .9, .12)), top, [0, 2.55, .53]);
  const arms = {}; for (const [pv, s] of [['leftShoulder', -1], ['rightShoulder', 1]]) { const a = new T.Group(); put(a, c('mu_bi', () => new T.BoxGeometry(1.22, .95, 1.22)), skin, [0, -.62, .06]);
    put(a, c('mu_delt', () => new T.SphereGeometry(.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), top, [0, -.02, 0], [0, 0, 0]); arms[pv] = a; }
  g.userData.pivotParts = arms; return g;
}
export const ACCESSORIES_1G = {mailCap, capBack, glasses, bowtie, raincoat, plushHug, muscles};
export const HEAD_1G = ['mailCap', 'capBack', 'glasses'];
