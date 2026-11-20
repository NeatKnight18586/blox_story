// avatar-style/body6.js — Actor v6 (P1, opt-in preset `body: 'v6'`): a blocky R15 body with body v5's satin plastic and the
// classic 1.2 head. Fifteen rigid segments; overall lengths match R6 (torso 2.02–4.02, arms and legs 2.0, the hip at y 2.0,
// the same shoulder, hip and head pivots), so sets, cameras and fits keep working. Segments overlap 0.02 at every joint
// (0.01 each side) and hinge caps (cylinders, radius 0.47 < half the limb width, hidden when straight) fill the outside
// of a bend, so no background shows through a seam; the bevelled edges read as the R15 seam line.
// Pivot tree (names; the five R6 pivots keep their names so applyPoseSample, stoop and faces drive them unchanged):
//   root ─ lowerTorso, waist ─ upperTorso, head (neck), leftShoulder ─ leftElbow ─ leftWrist (same right)
//        └ leftHip ─ leftKnee ─ leftAnkle (same right)
// Joint limits (radians, pure clampJoints): elbows hinge x ∈ [−150°, 0] (forward only), knees x ∈ [0, 150°] (backward only),
// wrists ±30°, ankles ±35°, waist ±35°; shoulders, hips and the neck are free ball joints, as in R6.
// Colour regions (cast `regions`, same schema as v5): torso → UpperTorso + LowerTorso (open jacket to the hem), arms.upper →
// UpperArm, arms.lower → LowerArm + Hand (v5's split is ignored), legs.main → UpperLeg + LowerLeg, legs.shoes → Foot.
// v6 extras (all optional): torso.collarH (collar rim height, v5 0.12), arms.cuff (band at the UpperArm bottom),
// legs.sole + legs.soleH (sneaker sole band), regions.fabric {weave, zip, pockets} (painted DataTextures, no canvas).
import * as T from 'three';
import {createActor5, rbox, satin, BEVEL} from './body5.js';
import {BUILDS, buildLayout, torsoWidthAt, PARTS} from './body.js';

const D = Math.PI / 180;
export const JOINTS6 = ['waist', 'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];
export const LIMITS6 = {
  elbow: [[-150 * D, 0], [0, 0], [0, 0]], knee: [[0, 150 * D], [0, 0], [0, 0]],
  wrist: [[-30 * D, 30 * D], [-30 * D, 30 * D], [-30 * D, 30 * D]], ankle: [[-35 * D, 35 * D], [-35 * D, 35 * D], [-35 * D, 35 * D]],
  waist: [[-35 * D, 35 * D], [-35 * D, 35 * D], [-35 * D, 35 * D]],
};
export const jointKind = j => j === 'waist' ? 'waist' : j.replace(/^(left|right)/, '').toLowerCase();
const clampV = (v, [a, b]) => Math.min(b, Math.max(a, v));
// Pure: a copy of the pose with every v6 joint inside its limits (a hinge can never bend the wrong way or twist).
export function clampJoints(pose) {
  const s = {...pose, pivots: {...pose.pivots}};
  for (const j of JOINTS6) { const L = LIMITS6[jointKind(j)], v = s.pivots[j] ?? [0, 0, 0]; s.pivots[j] = v.map((x, i) => clampV(x, L[i])); }
  return s;
}
// Pure: every limit violation of a pose's raw (unclamped) v6 joints, [{joint, axis, value°, range°}].
export function jointViolations(pose, eps = 1e-9) {
  const out = [];
  for (const j of JOINTS6) { const L = LIMITS6[jointKind(j)], v = pose.pivots[j]; if (!v) continue;
    v.forEach((x, i) => { if (x < L[i][0] - eps || x > L[i][1] + eps) out.push({joint: j, axis: 'xyz'[i], deg: +(x / D).toFixed(2), range: L[i].map(r => +(r / D).toFixed(1))}); }); }
  return out;
}

// Segment sizes in studs [w, h, d] (h is the joint-to-joint length; meshes add the 0.01 overlap each side).
export const SEG6 = {upperTorso: [2, 1.55, 1], lowerTorso: [2, .45, 1], upperArm: [1, 1, 1], lowerArm: [.96, .75, .96], hand: [.96, .25, .96],
  upperLeg: [1, 1, 1], lowerLeg: [.96, .8, .96], foot: [1, .2, 1.15]};
export const OVERLAP = .01, CAP_R = .47, TOE = .15, PLUG = .15;

// Pure layout for a build: pivot positions (parent space) and segment boxes. Torso pieces split the build's torso height
// in the adult 1.55 : 0.45 ratio; leg and arm lengths never change.
export function layout6(build = 'adult_m') {
  const L = buildLayout(build), b = BUILDS[build] ?? BUILDS.adult_m, th = L.torso.size[1], bottom = 2.02, top = bottom + th;
  const lowH = th * SEG6.lowerTorso[1] / 2, waistY = bottom + lowH;
  return {build, th, bottom, top, lowH, upH: top - waistY, waistY, headPivot: L.headPivot, shoulder: [L.shoulderX, L.shoulderY], hipX: L.hipX,
    leg: L.leg, profile: !!b.profile, waistWidth: torsoWidthAt(build, (top - waistY) / th)};
}

// Torso piece geometry: adult_m (2 wide everywhere) = the rounded box; other builds = a rowed box whose width follows the
// body.js torso shape over the piece's height range (u from the torso top), flat faces like the v5 build torsos.
const geo6 = new Map();
function torsoPiece(build, u0, u1, h, tier) {
  if (!build || build === 'adult_m') return rbox([2, h + 2 * OVERLAP, 1], tier);
  const k = `${build}:${u0.toFixed(3)}:${u1.toFixed(3)}:${tier}`;
  if (!geo6.has(k)) {
    const rows = BUILDS[build].profile ? 8 : 4, g = new T.BoxGeometry(2, h + 2 * OVERLAP, 1, 1, rows, 1), p = g.attributes.position, H = h + 2 * OVERLAP;
    for (let i = 0; i < p.count; i++) { const f = (H / 2 - p.getY(i)) / H, u = u0 + (u1 - u0) * f; p.setX(i, p.getX(i) * torsoWidthAt(build, u) / 2); }
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose(); geo6.set(k, ng);
  }
  return geo6.get(k);
}
function cap(len, tier) { const k = `cap:${len}:${tier}`; if (!geo6.has(k)) { const g = new T.CylinderGeometry(CAP_R, CAP_R, len, tier === 'bg' ? 8 : 14, 1, false); g.rotateZ(Math.PI / 2); geo6.set(k, g); } return geo6.get(k); }

// ---- fabric paint (variant C): procedural DataTextures, no canvas, so node gates and the browser build the same thing ----
const tex6 = new Map();
function dataTex(key, w, h, px, {repeat = [1, 1], alpha = false} = {}) {
  if (tex6.has(key)) return tex6.get(key);
  const d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(px(x, y), 4 * (y * w + x));
  const t = new T.DataTexture(d, w, h, T.RGBAFormat); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat); t.needsUpdate = true; t.userData.alpha = alpha; tex6.set(key, t); return t;
}
// fine twill: ±4 % luminance on a 2-texel diagonal (multiplies the satin colour; reads as cloth only up close)
export const weaveTex = (rep = 10) => dataTex('weave:' + rep, 32, 32, (x, y) => { const v = ((x + y) >> 1) % 2 ? 255 : 235, n = (x * 7 + y * 13) % 5 === 0 ? -8 : 0; return [v + n, v + n, v + n, 255]; }, {repeat: [rep, rep]});
// zip: a 2 px pale-grey tape with dark teeth every 4 px, down the left edge of the strip (u 0.04–0.14 of its width)
const zipTex = () => dataTex('zip', 32, 128, (x, y) => { const tape = x >= 1 && x <= 4, tooth = tape && (y % 4 < 2); return tooth ? [74, 78, 87, 255] : tape ? [178, 182, 190, 255] : [255, 255, 255, 255]; });
// pockets: two rounded-corner outlines (1.5 px dark stitch) on a transparent decal, laid on the LowerTorso front
const pocketTex = () => dataTex('pockets', 128, 32, (x, y) => {
  const box = (x0, x1) => { const inX = x >= x0 && x <= x1, inY = y >= 6 && y <= 27, edge = inX && inY && (x - x0 < 2 || x1 - x < 2 || y - 6 < 2 || 27 - y < 2); return edge; };
  return box(8, 40) || box(87, 119) ? [24, 25, 30, 200] : [0, 0, 0, 0]; }, {alpha: true});
const mats6 = new Map();
function fabricSatin(color, fabric) {
  if (!fabric?.weave) return satin(color);
  const k = color + ':w'; if (!mats6.has(k)) { const m = satin(color).clone(); m.map = weaveTex(fabric.weaveRepeat ?? 10); m.name = 'satin6_weave_' + color; mats6.set(k, m); }
  return mats6.get(k);
}

// Region sub-blocks of the torso pieces (pure): {size, at (relative to the piece centre), color, edge?, collar?, kind?}.
// The strip, lapels and lapel edges run continuously across the waist seam: on the UpperTorso from its bottom to the top
// bevel, on the LowerTorso from the seam to the bottom bevel (the hem).
export function torsoBlocks6(piece, r, L) {
  const t = r?.torso; if (!t?.strip) return [];
  const sw = t.stripW ?? .6, lw = t.lapelW ?? .14, H = piece === 'upper' ? L.upH : L.lowH, h = H - BEVEL + OVERLAP, cy = piece === 'upper' ? -H / 2 + h / 2 - OVERLAP : H / 2 - h / 2 + OVERLAP;
  const out = [{size: [sw, h, .06], at: [0, cy, .5 + .005], color: t.strip, kind: 'strip'},
    ...[-1, 1].map(s => ({size: [lw, h, .08], at: [s * (sw / 2 + lw / 2 - .02), cy, .5 + .015], color: t.lapel ?? t.main, kind: 'lapel'}))];
  if (t.edge) {
    const ew = t.edgeW ?? .05;
    for (const s of [-1, 1]) out.push({size: [ew, h, .09], at: [s * (sw / 2 - .02 + ew / 2), cy, .5 + .02], color: t.edge, edge: true});
    if (piece === 'upper') {   // the v5 collar rim (back, sides, front tips); collarH raises it (B, C)
      const top = H / 2, rh = t.collarH ?? .12, rw = .09, cx = .62, cz = .36, y = top + rh / 2 - .02;
      out.push({size: [2 * cx + rw, rh, rw], at: [0, y, -cz], color: t.edge, edge: true, collar: true});
      for (const s of [-1, 1]) {
        out.push({size: [rw, rh, 2 * cz], at: [s * cx, y, 0], color: t.edge, edge: true, collar: true});
        out.push({size: [cx - sw / 2 + .02, rh, rw], at: [s * (sw / 2 - .02 + (cx - sw / 2 + .02) / 2 + rw / 2), y, cz], color: t.edge, edge: true, collar: true});
      }
    }
  }
  return out;
}

const mesh = (g, m, name, at, tier) => { const x = new T.Mesh(g, m); x.name = name; if (at) x.position.set(...at); x.castShadow = true; x.receiveShadow = tier === 'hero'; return x; };
const group = (name, at) => { const g = new T.Group(); g.name = name; g.position.set(...at); return g; };

export function createActor6({tier = 'hero', skin, scale = 1, materials = {}, name = 'actor', build = null, regions = null} = {}) {
  const b = build ?? 'adult_m', L = layout6(b), r = regions ?? {}, fabric = r.fabric ?? null;
  // the classic head (and its satin, its 1.2 pivot scale) comes from Actor v5 unchanged
  const a5 = createActor5({tier, skin, scale: 1, materials: {}, name, build, regions: null});
  const root = new T.Group(); root.name = name; root.scale.setScalar(scale);
  const skinM = satin(skin), pick = (c, fb) => c ? fabricSatin(c, fabric) : fb;
  const torsoC = r.torso?.main, armU = r.arms?.upper, armL = r.arms?.lower, legC = r.legs?.main, shoeC = r.legs?.shoes;
  const fromOutfit = part => materials[part] ? [].concat(materials[part]).map(m => m?.isMeshStandardMaterial ? m : satin(m?.color ?? skin))[0] : null;   // dressed (painted) parts: their main colour, flat satin
  const mTorso = pick(torsoC, fromOutfit('torso') ?? skinM), mArmU = pick(armU, fromOutfit('rightArm') ?? skinM), mArmL = armL ? satin(armL) : (fromOutfit('rightArm') ?? skinM);
  const mLeg = pick(legC, fromOutfit('rightLeg') ?? skinM), mShoe = shoeC ? satin(shoeC) : mLeg;
  const parts = {}, pivots = {};
  // torso: LowerTorso on the root (bridges the legacy 0.02 hip gap), UpperTorso on the waist pivot
  const lowC = L.bottom + L.lowH / 2 - OVERLAP / 2;   // spans [bottom − 0.02, waistY + 0.01]
  const lowG = torsoPiece(b, (L.top - L.waistY) / L.th, 1, L.lowH + OVERLAP, tier);
  parts.lowerTorso = mesh(lowG, mTorso, 'lowerTorso', [0, lowC, 0], tier); root.add(parts.lowerTorso);
  pivots.waist = group('waist', [0, L.waistY, 0]); root.add(pivots.waist);
  parts.torso = mesh(torsoPiece(b, 0, (L.top - L.waistY) / L.th, L.upH, tier), mTorso, 'torso', [0, L.upH / 2, 0], tier); pivots.waist.add(parts.torso);   // `torso` = UpperTorso (fits, accessories)
  parts.waistCap = mesh(cap(Math.max(.5, L.waistWidth - .06), tier), mTorso, 'waistCap', [0, 0, 0], tier); pivots.waist.add(parts.waistCap);
  for (const [piece, m] of [['upper', parts.torso], ['lower', parts.lowerTorso]]) for (const k of torsoBlocks6(piece, r, L)) {
    const s = mesh(rbox(k.size, 'bg'), k.kind === 'strip' && fabric?.zip ? zipSatin(k.color) : satin(k.color), `${piece}Torso_${k.color}`, k.at, tier); m.add(s); }
  if (fabric?.pockets && r.torso?.strip) {   // two pocket outlines on the LowerTorso front, outside the lapels
    const pm = new T.MeshStandardMaterial({map: pocketTex(), transparent: true, roughness: .6, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}); pm.name = 'pockets6';
    const pl = mesh(new T.PlaneGeometry(1.9, L.lowH * .9), pm, 'pockets', [0, -.01, .5 + .004], tier); pl.castShadow = false; parts.lowerTorso.add(pl);
  }
  // head: the v5 head pivot (scale HEAD5, satin skin) re-parented to the neck at the top of the UpperTorso
  pivots.head = a5.pivots.head; pivots.head.position.set(0, L.headPivot[1] - L.waistY, 0); pivots.waist.add(pivots.head); parts.head = a5.parts.head;
  // arms
  for (const side of ['left', 'right']) {
    const sx = side === 'left' ? -1 : 1, sh = group(side + 'Shoulder', [sx * L.shoulder[0], L.shoulder[1] - L.waistY, 0]); pivots.waist.add(sh); pivots[side + 'Shoulder'] = sh;
    const [, hu] = SEG6.upperArm, [, hl] = SEG6.lowerArm, [, hh] = SEG6.hand;
    const ua = mesh(rbox([1, hu + OVERLAP, 1], tier), mArmU, side + 'Arm', [0, -(hu + OVERLAP) / 2, 0], tier); sh.add(ua); parts[side + 'Arm'] = ua;   // `leftArm` = UpperArm
    if (r.arms?.cuff) { const c = mesh(rbox([1.04, .08, 1.04], 'bg'), satin(r.arms.cuff), side + 'Cuff', [0, -hu + .04, 0], tier); sh.add(c); parts[side + 'Cuff'] = c; }
    const el = group(side + 'Elbow', [0, -hu, 0]); sh.add(el); pivots[side + 'Elbow'] = el;
    const ec = mesh(cap(.94, tier), mArmU, side + 'ElbowCap', [0, -hu, 0], tier); sh.add(ec);
    // the forearm runs on 0.15 inside the hand (a wrist plug): at ±30° the hand turns over it with no gap
    parts[side + 'LowerArm'] = mesh(rbox([.96, hl + OVERLAP + PLUG, .96], tier), mArmL, side + 'LowerArm', [0, (OVERLAP - hl - PLUG) / 2, 0], tier); el.add(parts[side + 'LowerArm']);
    const wr = group(side + 'Wrist', [0, -hl, 0]); el.add(wr); pivots[side + 'Wrist'] = wr;
    parts[side + 'Hand'] = mesh(rbox([.96, hh + OVERLAP, .96], tier), mArmL, side + 'Hand', [0, -(hh + OVERLAP) / 2 + OVERLAP, 0], tier); wr.add(parts[side + 'Hand']);
  }
  // legs
  for (const side of ['left', 'right']) {
    const sx = side === 'left' ? -1 : 1, hp = group(side + 'Hip', [sx * L.hipX, 2, 0]); root.add(hp); pivots[side + 'Hip'] = hp;
    const [, hu] = SEG6.upperLeg, [, hl] = SEG6.lowerLeg, [, hf] = SEG6.foot, w = L.leg;
    hp.add(mesh(cap(w - .06, tier), mLeg, side + 'HipCap', [0, 0, 0], tier));
    const ul = mesh(rbox([w, hu + OVERLAP, 1], tier), mLeg, side + 'Leg', [0, -(hu + OVERLAP) / 2 + OVERLAP / 2 - OVERLAP / 2, 0], tier); hp.add(ul); parts[side + 'Leg'] = ul;   // `leftLeg` = UpperLeg
    const kn = group(side + 'Knee', [0, -hu, 0]); hp.add(kn); pivots[side + 'Knee'] = kn;
    kn.add(mesh(cap(w - .08, tier), mLeg, side + 'KneeCap', [0, 0, 0], tier));
    // the shin runs on 0.15 inside the shoe (an ankle plug, as a boot tongue): at ±35° the foot turns over it with no gap
    parts[side + 'LowerLeg'] = mesh(rbox([w - .04, hl + OVERLAP + PLUG, .96], tier), mLeg, side + 'LowerLeg', [0, (OVERLAP - hl - PLUG) / 2, 0], tier); kn.add(parts[side + 'LowerLeg']);
    const an = group(side + 'Ankle', [0, -hl, 0]); kn.add(an); pivots[side + 'Ankle'] = an;
    const sole = r.legs?.sole, soleH = sole ? (r.legs.soleH ?? .06) : 0, fz = TOE / 2;
    const sink = sole ? .03 : 0, rise = OVERLAP + .03, ft = mesh(rbox([w, hf - soleH + rise + sink, SEG6.foot[2]], tier), mShoe, side + 'Foot', [0, -hf + soleH - sink + (hf - soleH + rise + sink) / 2, fz], tier); an.add(ft); parts[side + 'Foot'] = ft;   // the shoe rises 0.04 over the ankle (the shin's bottom bevel sits inside it); B/C: the upper sinks 0.03 into the (wider) sole
    if (sole) { const so = mesh(rbox([w + .02, soleH, SEG6.foot[2] + .02], 'bg'), satin(sole), side + 'Sole', [0, -hf + soleH / 2, fz], tier); an.add(so); parts[side + 'Sole'] = so; }
  }
  return {root, parts, pivots, tier, skin, body: 'v6', build: b, layout: L, restPositions: Object.fromEntries(Object.entries(pivots).map(([n, p]) => [n, p.position.toArray()])),
    faceCache: new Map(), cosmeticCache: new Map(), faceLayer: null, cosmetic: null, attachments: {}};
}
function zipSatin(color) { const k = color + ':zip'; if (!mats6.has(k)) { const m = satin(color).clone(); m.map = zipTex(); m.name = 'satin6_zip_' + color; mats6.set(k, m); } return mats6.get(k); }

// ---- pure forward kinematics (no three): lowest point of the legs and the LowerTorso for auto-grounding --------------
const rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const mm = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const mv = (A, v) => A.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const eul = ([x, y, z]) => mm(mm(rx(x), ry(y)), rz(z));   // three.js Euler 'XYZ'
// Lowest y (root space before dy, unscaled) of the soles, knees, shins and LowerTorso for a pose sample. Rounded boxes are
// exact: corners inset by the bevel, minus the bevel (a box ⊕ sphere); `sole` (B, C) = the plain 1.02 × 1.17 sole box.
export function lowestY(pose, build = 'adult_m', {sole = false} = {}) {
  const L = layout6(build), R0 = mm(rx(pose.root.lean ?? 0), rz(pose.root.roll ?? 0)), P = pose.pivots, z3 = [0, 0, 0];
  let lo = Infinity; const put = (R, o, pts) => { for (const p of pts) lo = Math.min(lo, add(o, mv(R, p))[1]); };
  for (const side of ['left', 'right']) {
    const sx = side === 'left' ? -1 : 1, off = pose.offsets?.[side + 'Hip'] ?? z3, w = L.leg / 2;
    const Rh = mm(R0, eul(P[side + 'Hip'] ?? z3)), oh = mv(R0, add([sx * L.hipX, 2, 0], off));
    const Rk = mm(Rh, eul(P[side + 'Knee'] ?? z3)), ok = add(oh, mv(Rh, [0, -1, 0]));
    const Ra = mm(Rk, eul(P[side + 'Ankle'] ?? z3)), oa = add(ok, mv(Rk, [0, -.8, 0]));
    const ring = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * Math.PI; ring.push([-w, CAP_R * Math.cos(a), CAP_R * Math.sin(a)], [w, CAP_R * Math.cos(a), CAP_R * Math.sin(a)]); }
    put(Rk, ok, ring);
    const box = (x, y0, y1, z0, z1, r = BEVEL) => { const o = []; for (const X of x) for (const Y of [y0 + r, y1 - r]) for (const Z of [z0 + r, z1 - r]) o.push([X - Math.sign(X) * r, Y, Z]); return o; };
    const putR = (R, o2, pts) => { for (const p of pts) lo = Math.min(lo, add(o2, mv(R, p))[1] - BEVEL); };   // rounded: inset corners − bevel
    putR(Rk, ok, box([-w + .02, w - .02], -.8 - PLUG, 0, -.48, .48));
    if (sole) put(Ra, oa, box([-w - .01, w + .01], -.2, -.14, -.51, .51 + TOE, 0));   // the plain sole box: sharp corners
    else putR(Ra, oa, box([-w, w], -.2, 0, -.5, .5 + TOE));
  }
  for (const p of [[-1, -.5], [1, -.5], [-1, .5], [1, .5]]) lo = Math.min(lo, mv(R0, [p[0] - Math.sign(p[0]) * BEVEL, L.bottom - 2 * OVERLAP + BEVEL, p[1] - Math.sign(p[1]) * BEVEL])[1] - BEVEL);
  return lo;
}
