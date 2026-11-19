// campaigns/tapcap/assets/clix — Clix (sponsor talent) on the repo's R6 rig (Actor v5, satin), Pass A revision §1.
//   createClix({face, tier, scale}) → actor (body5) with Clix regions, hair, chain, pockets, wrist band. Heights in Slime Guy H via
//   `scale` (CLIX.heightH = 40: feet → top of head, hair excluded). Taps with the flat blue end of the arm (rest pose = arm straight down).
// Nothing on him carries a mark (TC-04): plain colours only; the chain and pocket decals are plain shapes; sneakers are plain white.
import * as T from 'three';
import {createActor5, satin} from '../../../../avatar-style/body5.js';
import {HEAD} from '../../../../avatar-style/body.js';
import {setFace5} from '../../../../avatar-style/faces5.js';
import {mass, clump, bun, skull} from '../../../../avatar-style/hair4.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const CLIX = {
  heightH: 40, rigHeight: 4.03 + 1.2,   // R6: head pivot 4.03 + classic head 1.2 (body5 HEAD_SIZE)
  skin: '#E8B796', hair: '#3B2416', coat: '#F4F4F2', tee: '#111111', chain: '#C9CCD1', glove: '#3D7BFF', band: '#C9CCD1', legs: '#1A1A1A', shoes: '#F7F7F5', lapel: '#D3D4D0', pocket: '#2C2C2C',
  armSplit: .70, cuffLine: .02, bandH: .04, teeStrip: .30,   // sleeve = top 70 % of the arm; cuff line 2 % and wrist band 4 % of arm height; tee 30 % of torso width
  faces: [{id: 2, name: 'grin', label: 'confident smile'}, {id: 5, name: 'content', label: 'warm smile'}, {id: 32, name: 'calm', label: 'neutral'}],
  hairTargets: {topRise: .25, fringe: .30, side: .08, curls: [6, 10]},
};
const ARM_H = 2;   // R6 arm height (part units)

// ---- hair (head-centre coordinates, the hair4 skull) ----
const {radius: HR, halfHeight: HH} = HEAD, HEAD_H = 2 * HH, HEAD_W = 2 * HR;
// 8 curl clumps carry the top volume (top = +25 % of head height); a row of 6 rounded curls makes the fringe (top 30 % of the face)
export const CURLS = [[-.28, .70, .12], [-.06, .73, .20], [.17, .72, .15], [.33, .66, .02], [-.20, .72, -.14], [.06, .73, -.06], [.27, .69, -.22], [-.36, .65, -.02]];
const CURL_R = .16;
export function clixHairGeometries(color = CLIX.hair) {
  const side = CLIX.hairTargets.side * HEAD_W;   // 0.08 head widths
  const out = [mass(color, {segs: 28, rings: 7,
    hairline: a => { const x = Math.abs(((a + 540) % 360) - 180); return x < 40 ? .55 : x < 60 ? .55 - (x - 40) / 20 * .95 : x < 120 ? -.40 : -.40 - (x - 120) / 60 * .45; },   // high front, faded sides to the temple, nape at the back
    thick: (a, h) => side * 1.22 + .04 * Math.max(0, h)})];   // close shell: sides .08 W (skin-fade look)
  for (const [x, y, z] of CURLS) out.push(bun(color, [x, y, z], CURL_R, {detail: 2}));
  const fy = HH - CLIX.hairTargets.fringe * HEAD_H, fr = .1;   // fringe curls: their lowest point = top 30 % of the face
  for (const [x, dy, z] of [[-.34, .07, .5], [-.2, .03, .58], [-.06, 0, .61], [.08, .02, .6], [.22, .05, .57], [.35, .09, .49]])
    out.push(bun(color, [x, fy + fr * .92 + dy, z], fr, {detail: 2}));
  for (const [x, z] of [[-.27, .38], [-.05, .45], [.17, .42], [.33, .3]]) out.push(bun(color, [x, .5, z], .14, {detail: 2}));   // bridge curls crown → fringe
  return out.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; });
}
// measured on the geometry (head-centre coords; ratios are scale-free): top rise, fringe cover, side thickness, curl count
export function hairMeasure(geos) {
  const g = mergeGeometries(geos), p = g.attributes.position; let top = -9, fr = 9, sx = 0;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); top = Math.max(top, y);
    if (z > .3 && Math.abs(x) < .3) fr = Math.min(fr, y); if (Math.abs(y - .22) < .06 && Math.abs(z) < .2) sx = Math.max(sx, Math.abs(x)); }   // side at temple height
  return {topRise: +((top - HH) / HEAD_H).toFixed(4), fringeCover: +((HH - fr) / HEAD_H).toFixed(4), side: +((sx - HR) / HEAD_W).toFixed(4), curls: CURLS.length};
}

function chainTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.strokeStyle = CLIX.chain; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, 0); x.quadraticCurveTo(128, 210, 216, 0); x.stroke();
  x.fillStyle = CLIX.chain; x.beginPath(); x.arc(128, 116, 9, 0, 7); x.fill();   // plain round pendant, no symbol
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

export function createClix({face = 'grin', tier = 'hero', scale = CLIX.heightH / CLIX.rigHeight} = {}) {
  const regions = {torso: {main: CLIX.coat, strip: CLIX.tee, stripW: 2 * CLIX.teeStrip, lapel: CLIX.coat, lapelW: .16, edge: CLIX.lapel, edgeW: .05},
    arms: {upper: CLIX.coat, lower: CLIX.glove, split: CLIX.armSplit}, legs: {main: CLIX.legs, shoes: CLIX.shoes, shoeFrac: .14},
    bands: ['leftArm', 'rightArm'].map(part => ({part, y: 1 - 2 * CLIX.armSplit - CLIX.cuffLine * ARM_H / 2, h: CLIX.cuffLine * ARM_H, color: CLIX.coat, w: 1.06, d: 1.06}))   // white cuff line at the sleeve/glove boundary
      .concat([{part: 'leftArm', y: 1 - 2 * CLIX.armSplit - CLIX.cuffLine * ARM_H - .1 - CLIX.bandH * ARM_H / 2, h: CLIX.bandH * ARM_H, color: CLIX.band, w: 1.07, d: 1.07}])};   // left wrist band
  const a = createActor5({tier, skin: CLIX.skin, scale, regions, name: 'clix'});
  setFace5(a, face);
  const hair = new T.Mesh(mergeGeometries(clixHairGeometries()), new T.MeshStandardMaterial({vertexColors: true, roughness: .5, metalness: 0}));
  hair.name = 'clix_hair'; hair.position.y = HEAD.centre; hair.castShadow = true; a.pivots.head.add(hair);
  const chain = new T.Mesh(new T.PlaneGeometry(.62, .62), new T.MeshBasicMaterial({map: chainTexture(), transparent: true, polygonOffset: true, polygonOffsetFactor: -3}));
  chain.name = 'clix_chain'; chain.position.set(0, .66, .5 + .045); a.parts.torso.add(chain);
  for (const leg of ['leftLeg', 'rightLeg']) { const m = a.parts[leg], s = Math.sign(a.pivots[leg === 'leftLeg' ? 'leftHip' : 'rightHip'].position.x);   // side pocket, outer face
    const pk = new T.Mesh(new T.BoxGeometry(.035, .5, .46), satin(CLIX.pocket)); pk.position.set(s * .5, .05, 0); pk.name = 'pocket'; m.add(pk);
    const flap = new T.Mesh(new T.BoxGeometry(.045, .06, .5), satin(CLIX.pocket)); flap.position.set(s * .5, .32, 0); m.add(flap); }
  a.clix = {scale, regions};
  return a;
}
