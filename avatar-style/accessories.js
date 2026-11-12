// avatar-style/accessories.js — rigid low-poly accessories of our own design (docs/V2_BRIEF.md §6.4):
// crown, knight helmet, hood, straw hat, scarf, cape slab, backpack. Head items ride the head pivot
// (head centre is .58 above it); body items ride the root. Geometry and materials are cached.
import * as T from 'three';
import {plastic, HEAD} from './body.js';

export const ACCESSORIES = ['crown', 'helmet', 'hood', 'strawHat', 'scarf', 'cape', 'backpack'];
const HEAD_ITEMS = new Set(['crown', 'helmet', 'hood', 'strawHat']);
const geo = new Map();
const g = (k, f) => { if (!geo.has(k)) geo.set(k, f()); return geo.get(k); };
const flat = c => { const k = 'flat:' + c; if (!geo.has(k)) geo.set(k, new T.MeshPhongMaterial({color: c, shininess: 35, specular: '#3a3a3a', flatShading: true})); return geo.get(k); };
function put(parent, geometry, material, at, rot = [0, 0, 0], name = 'acc') {
  const m = new T.Mesh(geometry, material); m.position.set(...at); m.rotation.set(...rot); m.castShadow = true; m.name = name; parent.add(m); return m;
}
const TOP = HEAD.centre + HEAD.halfHeight;                // top of the head, in head-pivot coordinates

const BUILD = {
  crown(o) {
    const grp = new T.Group(), gold = flat(o.color ?? '#f2c230'), gem = flat(o.accent ?? '#e2304f');
    put(grp, g('crown_band', () => { const c = new T.CylinderGeometry(.5, .46, .26, 10, 1, true); c.scale(1, 1, .9); return c; }), gold, [0, TOP + .08, 0]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; put(grp, g('crown_spike', () => new T.ConeGeometry(.1, .3, 4)), gold, [Math.sin(a) * .46, TOP + .34, Math.cos(a) * .41]); }
    put(grp, g('crown_gem', () => new T.BoxGeometry(.13, .13, .06)), gem, [0, TOP + .08, .45], [0, 0, Math.PI / 4]);
    return grp;
  },
  helmet(o) {
    const grp = new T.Group(), steel = flat(o.color ?? '#aab3bf'), dark = flat('#1d2026');
    put(grp, g('helm_body', () => { const c = new T.CylinderGeometry(.7, .7, 1.12, 10); c.scale(1, 1, .9); return c; }), steel, [0, HEAD.centre + .06, 0]);
    put(grp, g('helm_dome', () => { const c = new T.SphereGeometry(.7, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2); c.scale(1, .45, .9); return c; }), steel, [0, HEAD.centre + .62, 0]);
    put(grp, g('helm_slit', () => new T.BoxGeometry(.86, .1, .08)), dark, [0, HEAD.centre + .1, .62]);
    put(grp, g('helm_nose', () => new T.BoxGeometry(.1, .5, .08)), steel, [0, HEAD.centre - .06, .64]);
    if (o.accent) put(grp, g('helm_plume', () => new T.BoxGeometry(.16, .5, .7)), flat(o.accent), [0, HEAD.centre + .95, -.1], [-.3, 0, 0]);
    return grp;
  },
  hood(o) {
    const grp = new T.Group(), m = flat(o.color ?? '#6b4a8f');
    put(grp, g('hood_back', () => new T.BoxGeometry(1.42, 1.3, .36)), m, [0, HEAD.centre + .05, -.48]);
    put(grp, g('hood_top', () => new T.BoxGeometry(1.42, .26, 1.16)), m, [0, TOP + .08, -.02]);
    for (const s of [-1, 1]) put(grp, g('hood_side', () => new T.BoxGeometry(.2, 1.2, 1.1)), m, [s * .74, HEAD.centre + .02, -.02]);
    put(grp, g('hood_tip', () => new T.ConeGeometry(.3, .7, 4)), m, [0, TOP - .1, -.82], [-1.9, Math.PI / 4, 0]);
    return grp;
  },
  strawHat(o) {
    const grp = new T.Group(), straw = flat(o.color ?? '#e9c46a');
    put(grp, g('hat_brim', () => new T.CylinderGeometry(1.05, 1.05, .07, 12)), straw, [0, TOP - .08, 0]);
    put(grp, g('hat_crown', () => new T.CylinderGeometry(.5, .6, .4, 10)), straw, [0, TOP + .14, 0]);
    put(grp, g('hat_band', () => new T.CylinderGeometry(.605, .605, .1, 10, 1, true)), flat(o.accent ?? '#c0392b'), [0, TOP + .0, 0]);
    return grp;
  },
  scarf(o) {   // the hero's accent piece: a chunky wrap at the neck and two tails over the chest
    const grp = new T.Group(), m = flat(o.color ?? '#ff2e63'), dk = flat('#' + new T.Color(o.color ?? '#ff2e63').multiplyScalar(.75).getHexString());
    put(grp, g('scarf_wrap', () => new T.BoxGeometry(2.12, .34, 1.14)), m, [0, 3.92, 0]);
    put(grp, g('scarf_tail', () => new T.BoxGeometry(.36, 1.0, .12)), m, [-.42, 3.32, .58], [.08, 0, .08]);
    put(grp, g('scarf_tail2', () => new T.BoxGeometry(.3, .7, .12)), dk, [-.06, 3.45, .6], [.05, 0, -.12]);
    return grp;
  },
  cape(o) {
    const grp = new T.Group(); put(grp, g('cape', () => new T.BoxGeometry(2.1, 3.3, .1)), flat(o.color ?? '#b3203a'), [0, 2.42, -.58], [.06, 0, 0]);
    put(grp, g('cape_collar', () => new T.BoxGeometry(2.2, .22, .3)), flat(o.accent ?? '#f2c230'), [0, 3.98, -.5]);
    return grp;
  },
  backpack(o) {
    const grp = new T.Group(), m = flat(o.color ?? '#8a5a35'), strap = flat('#4a3222');
    put(grp, g('pack', () => new T.BoxGeometry(1.4, 1.5, .6)), m, [0, 3.0, -.8]);
    put(grp, g('pack_flap', () => new T.BoxGeometry(1.42, .5, .64)), flat('#' + new T.Color(o.color ?? '#8a5a35').multiplyScalar(.8).getHexString()), [0, 3.55, -.8]);
    for (const s of [-1, 1]) put(grp, g('pack_strap', () => new T.BoxGeometry(.18, 1.9, .06)), strap, [s * .55, 3.05, .53]);
    return grp;
  },
};

export function attachAccessory(actor, name, opts = {}) {
  if (!BUILD[name]) throw Error('unknown accessory ' + name);
  const a = BUILD[name](opts); a.name = 'acc_' + name;
  (HEAD_ITEMS.has(name) ? actor.pivots.head : actor.root).add(a);
  actor.attachments[name] = a; return a;
}
