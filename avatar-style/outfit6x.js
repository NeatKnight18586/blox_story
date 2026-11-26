// avatar-style/outfit6x.js — E4 opt-in outfit extras on Actor v6, from cast `regions`:
//   regions.skirt {color, h = .7, flare = .3}: a flared block ring hanging from the hip line over the legs (hangs from the root)
//   regions.apron {color, edge}: a bib on the UpperTorso, a waist tie and a short lap over the thighs
// Everything is a satin rounded part sharing the actor's materials style; the legs swing under the skirt / lap (short on purpose).
import * as T from 'three';
import {satin} from './body5.js';

const flared = (top, bot, h, depthTop, depthBot) => { const g = new T.BoxGeometry(1, h, 1, 1, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const hi = p.getY(i) > 0; p.setX(i, p.getX(i) * (hi ? top : bot)); p.setZ(i, p.getZ(i) * (hi ? depthTop : depthBot)); }
  const n = g.toNonIndexed(); n.computeVertexNormals(); g.dispose(); return n; };
const put = (parent, geo, color, at, name) => { const m = new T.Mesh(geo, satin(color)); m.position.set(...at); m.name = name; m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
export function addSkirt(a, {color, h = .7, flare = .3}) {
  const L = a.layout, w = 2.04; put(a.root, flared(w, w + flare, h, 1.04, 1.04 + flare * .6, h), color, [0, 2.0 + .1 - h / 2 + .02, 0], 'skirt');
}
export function addApron(a, {color, edge = '#CFC6B2'}) {
  const L = a.layout, up = a.parts.torso, low = a.parts.lowerTorso, bw = Math.min(1.0, L.waistWidth * .8);
  put(up, new T.BoxGeometry(bw, L.upH - .3, .06), color, [0, -.13, .5 + .03], 'apronBib'); put(up, new T.BoxGeometry(bw + .06, .05, .07), edge, [0, L.upH / 2 - .3 + .01, .5 + .03], 'apronTop');
  put(low, new T.BoxGeometry(Math.min(L.waistWidth, 2) + .02, .1, 1.1), edge, [0, 0, 0], 'apronTie');
  put(a.root, new T.BoxGeometry(1.5, .85, .06), color, [0, 2.0 - .3, .5 + .05], 'apronLap'); put(a.root, new T.BoxGeometry(1.56, .05, .07), edge, [0, 2.0 - .73, .5 + .05], 'apronHem');
}
export function addExtras(a, regions) { if (!regions) return; if (regions.skirt) addSkirt(a, regions.skirt); if (regions.apron) addApron(a, regions.apron); }
