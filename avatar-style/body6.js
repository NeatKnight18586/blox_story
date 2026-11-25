// avatar-style/body6.js — Actor v6 (opt-in preset `body: 'v6'`; default for format-6 specs): the iconic blocky R15 body with
// body v5's satin plastic and the classic 1.2 head. P1b (owner reference, front view, studs): UpperTorso 2 × 1.62 × 1 over a
// LowerTorso waist band 2 × 0.38 × 1; each arm ONE continuous 1 × 1.75 × 1 block (UpperArm 1.0 + LowerArm 0.75, flush, the
// same width and depth) over a Hand slab 1 × 0.25 × 1; each leg ONE continuous 1 × 1.73 × 1 block (UpperLeg 1.0 + LowerLeg
// 0.73) over a flush Foot slab 1 × 0.27 × 1 (no toe). Overall lengths match R6 (torso 2.02–4.02, arm and leg 2.0, hip at 2.0,
// the hand's bottom level with the LowerTorso's), so sets, cameras and fits keep working.
// Joint faces: the elbow and knee ends of the limb blocks are flat (no bevel), so a straight limb reads as one block; a
// rounded joint cap (cylinder, radius 0.495: 0.005 inside every outer face, so it never z-fights or shadows the straight
// limb) fills the outside of any bend; the upper and lower blocks share one material and identical side normals. Bevel lines
// show ONLY at the wrist and ankle (the slabs are 0.01 inset with flat tops: a step line), the waist (LowerTorso) and the
// split between the legs. Wrist and
// ankle: the forearm / shin runs on a 0.06 plug (0.92 × 0.76) inside the slab, so a turned hand or foot never opens a gap.
// Pivot tree (names; the five R6 pivots keep their names so applyPoseSample, stoop and faces drive them unchanged):
//   root ─ lowerTorso, waist ─ upperTorso, head (neck), leftShoulder ─ leftElbow ─ leftWrist (same right)
//        └ leftHip ─ leftKnee ─ leftAnkle (same right)
// Joint limits (radians, pure clampJoints): elbows hinge x ∈ [−150°, 0] (forward only), knees x ∈ [0, 150°] (backward only),
// wrists ±30°, ankles ±35°, waist ±35°; shoulders, hips and the neck are free ball joints, as in R6.
// Colour regions (cast `regions`, v5 schema): torso → UpperTorso + LowerTorso (open jacket to the hem); legs.main → the leg
// block, legs.shoes → the Foot slab (legs.sole + soleH: a sole band inside the slab); arms.upper = the sleeve, arms.lower =
// what shows below it; arms.sleeve 'wrist' (sleeve over UpperArm + LowerArm, only the Hand bare) | 'elbow' (short sleeve:
// the whole UpperArm; LowerArm + Hand bare) | 'mid' (opt-in: half way down the UpperArm); default from v5's split: < 0.5 →
// 'elbow' (owner P1c), else 'wrist'. torso.back: a yoke seam across the shoulders and a hem band (edge colour), back only. torso.collarH raises
// the collar rim (v5 0.12).
// Background tier ('bg': crowd mid-tier actors): each limb, and the torso, is ONE rigid mesh (no elbow/knee/wrist/ankle
// pivots, no caps), octagonal prisms with the slab line kept: no more triangles or draw calls than a v5 bg actor.
import * as T from 'three';
import {createActor5, rbox, satin, BEVEL, SEGMENTS, outfitRegions} from './body5.js';
import {BUILDS, buildLayout, torsoWidthAt} from './body.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

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

// Segment sizes in studs [w, h, d] (h = joint to joint; the owner's reference numbers).
export const SEG6 = {upperTorso: [2, 1.62, 1], lowerTorso: [2, .38, 1], upperArm: [1, 1, 1], lowerArm: [1, .75, 1], hand: [1, .25, 1],
  upperLeg: [1, 1, 1], lowerLeg: [1, .73, 1], foot: [1, .27, 1]};
export const REF6 = {upperTorso: 1.62, lowerTorso: .38, arm: 1.75, hand: .25, leg: 1.73, foot: .27};   // owner reference heights (studs)
export const OVERLAP = .01, CAP_R = .495, PLUG = .06, PLUG_D = .76, STEP = .01, SLAB_PLUG = .18, TOE = 0;   // slab plug: 0.18 tall turns with the slab; at ±35° its corner stays inside the limb (0.48 cos35 + 0.18 sin35 < 0.5)   // plug: 0.06 × 0.76 deep, so at the joint limit its corner stays inside the slab

// Pure layout for a build: pivot positions (parent space). Torso pieces split the build's torso height 1.62 : 0.38.
export function layout6(build = 'adult_m') {
  const L = buildLayout(build), b = BUILDS[build] ?? BUILDS.adult_m, th = L.torso.size[1], bottom = 2.02, top = bottom + th;
  const lowH = th * SEG6.lowerTorso[1] / 2, waistY = bottom + lowH;
  return {build, th, bottom, top, lowH, upH: top - waistY, waistY, headPivot: L.headPivot, shoulder: [L.shoulderX, L.shoulderY], hipX: L.hipX,
    leg: L.leg, profile: !!b.profile, waistWidth: torsoWidthAt(build, (top - waistY) / th)};
}
// A troupe slot (cast/troupe6.json) as a format-6 episode builds it (pure): body v6, faces v5, its outfit → v6 colour regions.
export function slotPreset6(k, data) { const {expressions, pose, freeze, ...p} = k === 'AFK' ? data.AFK : data.troupe[k];
  return {...p, body: 'v6', faceStyle: 'v5', regions: outfitRegions(p.outfit, p.skin), outfit: null}; }
// Sleeve mode (pure): 'wrist' | 'mid' | 'elbow' from regions.arms (explicit `sleeve`, else v5's split).
export const sleeveOf = arms => arms?.sleeve ?? ((arms?.split ?? .5) < .5 ? 'elbow' : 'wrist');   // P1c owner: short sleeves end at the elbow

const geo6 = new Map(), cached = (k, f) => { if (!geo6.has(k)) geo6.set(k, f()); return geo6.get(k); };
// A limb block: a rounded box whose bevel is flattened at the joint end(s) — vertical edges stay rounded, the flat end meets
// the next block flush. Built from RoundedBoxGeometry: every vertex in a flattened end's bevel zone moves onto the end plane
// with its side normal kept horizontal (pure geometry, cached).
export function limbBox([w, h, d], {flatTop = false, flatBottom = false, tier = 'hero', bevel = BEVEL, openTop = false, openBottom = false} = {}) {   // open*: drop that flat end (elbow / knee only)
  const B = Math.min(bevel, h / 2);
  return cached(`limb:${w},${h},${d}:${+flatTop}${+flatBottom}${+openTop}${+openBottom}:${tier}:${B}`, () => {
    const g = new RoundedBoxGeometry(w, h, d, tier === 'bg' ? 1 : SEGMENTS, B), p = g.attributes.position, hx = w / 2 - B, hy = h / 2 - B, hz = d / 2 - B;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), end = y > hy + 1e-6 ? (flatTop ? 1 : 0) : y < -hy - 1e-6 ? (flatBottom ? -1 : 0) : 0; if (!end) continue;
      const cx = Math.max(-hx, Math.min(hx, x)), cz = Math.max(-hz, Math.min(hz, z)), nx = x - cx, nz = z - cz, l = Math.hypot(nx, nz);
      p.setXYZ(i, l > 1e-6 ? cx + nx / l * B : x, end * h / 2, l > 1e-6 ? cz + nz / l * B : z);
    }
    g.computeVertexNormals(); return dropDegenerate(g, {open: (flatTop && openTop ? [h / 2] : []).concat(flatBottom && openBottom ? [-h / 2] : [])});
  });
}
// Remove zero-area triangles (a flattened bevel collapses whole rows onto the end plane): fewer triangles, same surface.
// P1c: `open` = joint-end planes whose flat faces are dropped too: inside a straight limb they only fed the shadow map (a soft
// dark line just below every elbow and knee); a bend is closed by the joint cap.
function dropDegenerate(g, {open = []} = {}) {
  const n = g.index ? g.toNonIndexed() : g, P = n.attributes.position, keep = [], a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const onPlane = y => open.some(o => Math.abs(y - o) < 1e-6);
  for (let t = 0; t < P.count; t += 3) { a.fromBufferAttribute(P, t); b.fromBufferAttribute(P, t + 1); c.fromBufferAttribute(P, t + 2);
    if (onPlane(a.y) && onPlane(b.y) && onPlane(c.y) && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.y - c.y) < 1e-6) continue;
    if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-14) keep.push(t); }
  const out = new T.BufferGeometry();
  for (const [name, attr] of Object.entries(n.attributes)) { const k = attr.itemSize, arr = new attr.array.constructor(keep.length * 3 * k); keep.forEach((t, i) => arr.set(attr.array.subarray(t * k, (t + 3) * k), i * 3 * k)); out.setAttribute(name, new T.BufferAttribute(arr, k)); }
  return out;
}
// One mesh per segment (P1b draw calls): the segment plus its joint fillers (caps, plugs), same material, baked at their
// offsets in the pivot's frame. userData.mainBox keeps the segment's own box (the measured block, without fillers).
function fuse(key, main, at, extras) {
  return cached('fuse:' + key, () => {
    const prep = (g, o) => { const c = (g.index ? g.toNonIndexed() : g.clone()); c.translate(...o); for (const k of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(k)) c.deleteAttribute(k); return c; };
    const m = prep(main, at); m.computeBoundingBox(); const box = m.boundingBox.clone(), g = mergeGeometries([m, ...extras.map(([e, o]) => prep(e, o))]); g.userData.mainBox = box; return g;
  });
}
// P1c joint ends: a rounded-rect end face (radius = the bevel) at a flat elbow / knee end, facing up (+1) or down (−1).
const endFace = (w, d, dir) => cached(`end:${w}:${d}:${dir}`, () => { const x = w / 2, z = d / 2, r = BEVEL, sh = new T.Shape();
  sh.moveTo(-x + r, -z); sh.lineTo(x - r, -z); sh.quadraticCurveTo(x, -z, x, -z + r); sh.lineTo(x, z - r); sh.quadraticCurveTo(x, z, x - r, z); sh.lineTo(-x + r, z); sh.quadraticCurveTo(-x, z, -x, z - r); sh.lineTo(-x, -z + r); sh.quadraticCurveTo(-x, -z, -x + r, -z);
  const g = new T.ShapeGeometry(sh, 3); g.rotateX(dir > 0 ? -Math.PI / 2 : Math.PI / 2); return g; });
// The joint fill: the cap plus the lower block's top face, one mesh that RECEIVES but never CASTS shadows (a flat end face
// in the shadow map drew a soft dark line just below every straight elbow and knee: P1c).
const jointFill = (w, capLen, ov, tier) => fuse(`fill:${w}:${capLen}:${ov}:${tier}`, cap(capLen, CAP_R, tier), [0, 0, 0], [[endFace(w, 1, 1), [0, ov, 0]]]);
const noCast = m => { m.castShadow = false; return m; };
// Low tier: an octagonal prism (four chamfered vertical edges, 28 tris), as the v5 crowd parts, centred at `dy`.
function octPrism([w, h, d], b = BEVEL, dy = 0) {
  const x = w / 2, z = d / 2, ring = [[x - b, z], [x, z - b], [x, -z + b], [x - b, -z], [-x + b, -z], [-x, -z + b], [-x, z - b], [-x + b, z]], P = [], y0 = dy - h / 2, y1 = dy + h / 2;
  const tri = (a, c, e) => P.push(...a, ...c, ...e);
  for (let i = 0; i < 8; i++) { const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % 8]; tri([ax, y0, az], [bx, y0, bz], [bx, y1, bz]); tri([ax, y0, az], [bx, y1, bz], [ax, y1, az]); }
  for (let i = 1; i < 7; i++) { tri([ring[0][0], y1, ring[0][1]], [ring[i][0], y1, ring[i][1]], [ring[i + 1][0], y1, ring[i + 1][1]]); tri([ring[0][0], y0, ring[0][1]], [ring[i + 1][0], y0, ring[i + 1][1]], [ring[i][0], y0, ring[i][1]]); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
}
// bg limb: block (1.75) + slab (0.25), the slab's chamfer wider (0.07) so the wrist / ankle line still reads; one mesh.
const bgLimb = (len, slab, w = 1) => cached(`bglimb:${len}:${slab}:${w}`, () => mergeGeometries([octPrism([w, len, 1], BEVEL, -len / 2), octPrism([w, slab, 1], .07, -len - slab / 2)]));
const bgTorso = (L, w) => cached(`bgtorso:${L.upH}:${L.lowH}:${w}`, () => mergeGeometries([octPrism([w, L.upH, 1], BEVEL, L.upH / 2), octPrism([w, L.lowH + .02, 1], .07, -(L.lowH + .02) / 2)]));

// Torso piece geometry: adult_m = the rounded box; other builds = a rowed box following the body.js torso shape.
function torsoPiece(build, u0, u1, h, tier) {
  if (!build || build === 'adult_m') return rbox([2, h + 2 * OVERLAP, 1], tier);
  return cached(`${build}:${u0.toFixed(3)}:${u1.toFixed(3)}:${tier}`, () => {
    const rows = BUILDS[build].profile ? 8 : 4, g = new T.BoxGeometry(2, h + 2 * OVERLAP, 1, 1, rows, 1), p = g.attributes.position, H = h + 2 * OVERLAP;
    for (let i = 0; i < p.count; i++) { const f = (H / 2 - p.getY(i)) / H, u = u0 + (u1 - u0) * f; p.setX(i, p.getX(i) * torsoWidthAt(build, u) / 2); }
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose(); return ng;
  });
}
const cap = (len, r, tier) => cached(`cap:${len}:${r}:${tier}`, () => { const g = new T.CylinderGeometry(r, r, len, tier === 'bg' ? 8 : 12, 1, false); g.rotateZ(Math.PI / 2); return g; });
const plainBox = size => cached(`box:${size}`, () => new T.BoxGeometry(...size));

// Region sub-blocks of the torso pieces (pure): {size, at (relative to the piece centre), color, edge?, collar?, kind?}.
// The strip, lapels and lapel edges run continuously across the waist seam (UpperTorso: bottom to top bevel; LowerTorso:
// seam to the hem bevel).
export function torsoBlocks6(piece, r, L) {
  const t = r?.torso; if (!t?.strip) return [];
  const sw = t.stripW ?? .6, lw = t.lapelW ?? .14, H = piece === 'upper' ? L.upH : L.lowH, h = H - BEVEL + OVERLAP, cy = piece === 'upper' ? -H / 2 + h / 2 - OVERLAP : H / 2 - h / 2 + OVERLAP;
  const out = [{size: [sw, h, .06], at: [0, cy, .5 + .005], color: t.strip, kind: 'strip'},
    ...[-1, 1].map(s => ({size: [lw, h, .08], at: [s * (sw / 2 + lw / 2 - .02), cy, .5 + .015], color: t.lapel ?? t.main, kind: 'lapel'}))];
  if (t.edge) {
    const ew = t.edgeW ?? .05;
    for (const s of [-1, 1]) out.push({size: [ew, h, .09], at: [s * (sw / 2 - .02 + ew / 2), cy, .5 + .02], color: t.edge, edge: true});
    if (t.back && piece === 'upper') out.push({size: [1.9, .05, .02], at: [0, H / 2 - .42, -.5 - .006], color: t.edge, edge: true, kind: 'yoke'});   // P1c back: yoke seam
    if (t.back && piece === 'lower') { const y = -H / 2 + .07; out.push({size: [1.96, .06, .02], at: [0, y, -.5 - .006], color: t.edge, edge: true, kind: 'hem'});
      for (const s of [-1, 1]) out.push({size: [.02, .06, .96], at: [s * 1.006, y, 0], color: t.edge, edge: true, kind: 'hem'}); }   // P1c back: hem band (back + sides)
    if (piece === 'upper') {   // the v5 collar rim (back, sides, front tips); collarH raises it (hero B)
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
  const b = build ?? 'adult_m', L = layout6(b), r = regions ?? {}, bg = tier === 'bg';
  const a5 = createActor5({tier, skin, scale: 1, materials: {}, name, build, regions: null});   // the classic head, unchanged (plus a neck plug)
  const root = new T.Group(); root.name = name; root.scale.setScalar(scale);
  const skinM = satin(skin), fromOutfit = part => materials[part] ? [].concat(materials[part]).map(m => m?.isMeshStandardMaterial ? m : satin(m?.color ?? skin))[0] : null;
  const mTorso = r.torso?.main ? satin(r.torso.main) : fromOutfit('torso') ?? skinM;
  const mSleeve = r.arms?.upper ? satin(r.arms.upper) : fromOutfit('rightArm') ?? skinM, mBare = r.arms?.lower ? satin(r.arms.lower) : r.arms ? skinM : mSleeve;
  const mLeg = r.legs?.main ? satin(r.legs.main) : fromOutfit('rightLeg') ?? skinM, mShoe = r.legs?.shoes ? satin(r.legs.shoes) : mLeg;
  const sleeve = sleeveOf(r.arms), parts = {}, pivots = {};
  pivots.waist = group('waist', [0, L.waistY, 0]); root.add(pivots.waist);
  pivots.head = a5.pivots.head; pivots.head.position.set(0, L.headPivot[1] - L.waistY, 0); pivots.waist.add(pivots.head); parts.head = a5.parts.head;
  if (!bg) { const nk = mesh(cached(`neck:${tier}`, () => new T.CylinderGeometry(.34, .34, .16, tier === 'bg' ? 8 : 12)), skinM, 'neck', [0, .04, 0], tier); nk.castShadow = false; pivots.head.add(nk); }   // P1b: a neck plug (turns with the head) so a nod never opens the neck seam
  const [, hu] = SEG6.upperArm, [, hl] = SEG6.lowerArm, [, hh] = SEG6.hand, [, lu] = SEG6.upperLeg, [, ll] = SEG6.lowerLeg, [, hf] = SEG6.foot;
  if (bg) {   // background tier: rigid merged limbs (bends are not shown at this tier), one mesh per part, no caps
    parts.torso = mesh(bgTorso(L, 2), mTorso, 'torso', [0, 0, 0], tier); pivots.waist.add(parts.torso);
    for (const side of ['left', 'right']) {
      const sx = side === 'left' ? -1 : 1, sh = group(side + 'Shoulder', [sx * L.shoulder[0], L.shoulder[1] - L.waistY, 0]); pivots.waist.add(sh); pivots[side + 'Shoulder'] = sh;
      parts[side + 'Arm'] = mesh(bgLimb(hu + hl, hh), mSleeve, side + 'Arm', [0, 0, 0], tier); sh.add(parts[side + 'Arm']);
      const hp = group(side + 'Hip', [sx * L.hipX, 2, 0]); root.add(hp); pivots[side + 'Hip'] = hp;
      parts[side + 'Leg'] = mesh(bgLimb(lu + ll, hf, L.leg), mLeg, side + 'Leg', [0, 0, 0], tier); hp.add(parts[side + 'Leg']);
    }
  } else {
    // torso: the LowerTorso band on the root (spans 2.00 → waist + 0.01), the UpperTorso on the waist pivot
    parts.lowerTorso = mesh(torsoPiece(b, (L.top - L.waistY) / L.th, 1, L.lowH + OVERLAP, tier), mTorso, 'lowerTorso', [0, L.bottom + L.lowH / 2 - OVERLAP / 2, 0], tier); root.add(parts.lowerTorso);
    parts.torso = mesh(torsoPiece(b, 0, (L.top - L.waistY) / L.th, L.upH, tier), mTorso, 'torso', [0, L.upH / 2, 0], tier); pivots.waist.add(parts.torso);   // `torso` = UpperTorso
    parts.waistCap = mesh(cap(Math.max(.5, L.waistWidth - .1), Math.min(.47, L.lowH - .02), tier), mTorso, 'waistCap', [0, 0, 0], tier); pivots.waist.add(parts.waistCap);   // kept apart: accessories ride the torso's centre
    for (const [piece, m] of [['upper', parts.torso], ['lower', parts.lowerTorso]]) for (const k of torsoBlocks6(piece, r, L)) m.add(mesh(rbox(k.size, 'bg'), satin(k.color), `${piece}Torso_${k.color}`, k.at, tier));
    for (const side of ['left', 'right']) {
      const sx = side === 'left' ? -1 : 1, sh = group(side + 'Shoulder', [sx * L.shoulder[0], L.shoulder[1] - L.waistY, 0]); pivots.waist.add(sh); pivots[side + 'Shoulder'] = sh;
      // UpperArm: rounded shoulder end, flat elbow end (short sleeve: two flush colour bands)
      const mUA = sleeve === 'mid' ? mBare : mSleeve, mLA = sleeve === 'wrist' ? mSleeve : mBare;
      if (sleeve === 'mid') { const sh1 = hu / 2; sh.add(mesh(limbBox([1, sh1, 1], {flatBottom: true, tier}), mSleeve, side + 'Sleeve', [0, -sh1 / 2, 0], tier));
        parts[side + 'Arm'] = mesh(limbBox([1, hu - sh1, 1], {flatTop: true, flatBottom: true, openBottom: true, tier}), mUA, side + 'Arm', [0, -sh1 - (hu - sh1) / 2, 0], tier); }
      else parts[side + 'Arm'] = mesh(limbBox([1, hu, 1], {flatBottom: true, openBottom: true, tier}), mUA, side + 'Arm', [0, -hu / 2, 0], tier);
      sh.add(parts[side + 'Arm']);   // `leftArm` = UpperArm
      sh.add(noCast(mesh(endFace(1, 1, -1), mUA, side + 'ArmEnd', [0, -hu, 0], tier)));   // the UpperArm's elbow end: no shadow casting
      const el = group(side + 'Elbow', [0, -hu, 0]); sh.add(el); pivots[side + 'Elbow'] = el;
      const ov = mLA === mUA ? OVERLAP : 0;   // P1c: same material → the forearm runs 0.01 up into the UpperArm (no sub-pixel crack line)
      el.add(noCast(mesh(jointFill(1, .98, ov, tier), mLA, side + 'ElbowFill', [0, 0, 0], tier)));
      parts[side + 'LowerArm'] = mesh(fuse(`la:${ov}:${tier}`, limbBox([1, hl + ov, 1], {flatTop: true, flatBottom: true, openTop: true, tier}), [0, -(hl - ov) / 2, 0], [[plainBox([.92, PLUG, PLUG_D]), [0, -hl - PLUG / 2 + .005, 0]]]),
        mLA, side + 'LowerArm', [0, 0, 0], tier); el.add(parts[side + 'LowerArm']);   // + the wrist plug
      if (r.arms?.cuff) el.add(noCast(mesh(plainBox([1.03, r.arms.cuffH ?? .12, 1.03]), satin(r.arms.cuff), side + 'Cuff', [0, -hl + (r.arms.cuffH ?? .12) / 2, 0], tier)));   // P3c opt-in: a light band at the wrist (hero B)
      const wr = group(side + 'Wrist', [0, -hl, 0]); el.add(wr); pivots[side + 'Wrist'] = wr;
      // the Hand slab: flat top inset 0.01 (the wrist line is a step, not a groove), a 0.06 plug on it turns with the hand
      parts[side + 'Hand'] = mesh(fuse(`hand:${tier}`, limbBox([1 - 2 * STEP, hh, 1 - 2 * STEP], {flatTop: true, tier}), [0, -hh / 2, 0], [[plainBox([.96, SLAB_PLUG, .96]), [0, SLAB_PLUG / 2 - .005, 0]]]),
        mBare, side + 'Hand', [0, 0, 0], tier); wr.add(parts[side + 'Hand']);
    }
    for (const side of ['left', 'right']) {
      const sx = side === 'left' ? -1 : 1, hp = group(side + 'Hip', [sx * L.hipX, 2, 0]), w = L.leg; root.add(hp); pivots[side + 'Hip'] = hp;
      parts[side + 'Leg'] = mesh(fuse(`ul:${w}:${tier}`, limbBox([w, lu, 1], {flatBottom: true, openBottom: true, tier}), [0, -lu / 2, 0], [[cap(w - .04, .49, tier), [0, 0, 0]]]), mLeg, side + 'Leg', [0, 0, 0], tier); hp.add(parts[side + 'Leg']);   // `leftLeg` = UpperLeg (+ the hip cap)
      hp.add(noCast(mesh(endFace(w, 1, -1), mLeg, side + 'LegEnd', [0, -lu, 0], tier)));   // the UpperLeg's knee end: no shadow casting
      const kn = group(side + 'Knee', [0, -lu, 0]); hp.add(kn); pivots[side + 'Knee'] = kn;
      kn.add(noCast(mesh(jointFill(w, w - .02, OVERLAP, tier), mLeg, side + 'KneeFill', [0, 0, 0], tier)));
      parts[side + 'LowerLeg'] = mesh(fuse(`ll:${w}:${tier}`, limbBox([w, ll + OVERLAP, 1], {flatTop: true, flatBottom: true, openTop: true, tier}), [0, -(ll - OVERLAP) / 2, 0], [[plainBox([w - .08, PLUG, PLUG_D]), [0, -ll - PLUG / 2 + .005, 0]]]),
        mLeg, side + 'LowerLeg', [0, 0, 0], tier); kn.add(parts[side + 'LowerLeg']);   // + the ankle plug (the knee cap lives in the non-casting fill); P1c: the shin runs 0.01 up into the UpperLeg (same material)
      const an = group(side + 'Ankle', [0, -ll, 0]); kn.add(an); pivots[side + 'Ankle'] = an;
      const sole = r.legs?.sole, sH = sole ? (r.legs.soleH ?? .06) : 0;
      // the Foot slab: flat top inset 0.01 (the ankle line is a step), a 0.06 plug on it turns with the foot; B: the sole band
      // (flat top, rounded bottom) inside the 0.27 slab under the shoe upper
      const fw = w - 2 * STEP, fd = 1 - 2 * STEP;
      if (sole) {
        parts[side + 'Foot'] = mesh(fuse(`foot:${fw}:${sH}:${tier}`, limbBox([fw, hf - sH, fd], {flatTop: true, flatBottom: true, tier}), [0, -(hf - sH) / 2, 0], [[plainBox([w - .04, SLAB_PLUG, .96]), [0, SLAB_PLUG / 2 - .005, 0]]]), mShoe, side + 'Foot', [0, 0, 0], tier);
        parts[side + 'Sole'] = mesh(limbBox([fw, sH, fd], {flatTop: true, tier: 'bg', bevel: sH / 2}), satin(sole), side + 'Sole', [0, -hf + sH / 2, 0], tier); an.add(parts[side + 'Sole']);
      } else parts[side + 'Foot'] = mesh(fuse(`foot:${fw}:0:${tier}`, limbBox([fw, hf, fd], {flatTop: true, tier}), [0, -hf / 2, 0], [[plainBox([w - .04, SLAB_PLUG, .96]), [0, SLAB_PLUG / 2 - .005, 0]]]), mShoe, side + 'Foot', [0, 0, 0], tier);   // + the slab plug
      an.add(parts[side + 'Foot']);
    }
  }
  return {root, parts, pivots, tier, skin, body: 'v6', build: b, layout: L, restPositions: Object.fromEntries(Object.entries(pivots).map(([n, p]) => [n, p.position.toArray()])),
    faceCache: new Map(), cosmeticCache: new Map(), faceLayer: null, cosmetic: null, attachments: {}};
}

// ---- pure forward kinematics (no three): lowest point of the legs and the LowerTorso for auto-grounding --------------
const rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const mm = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const mv = (A, v) => A.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const eul = ([x, y, z]) => mm(mm(rx(x), ry(y)), rz(z));   // three.js Euler 'XYZ'
// Lowest y (root space before dy, unscaled) of the soles, knees, shins and LowerTorso for a pose sample. Rounded boxes are
// exact: corners inset by the bevel, minus the bevel (a box ⊕ sphere).
export function lowestY(pose, build = 'adult_m', {sole = 0} = {}) {   // sole: the sole band height (0 = none)
  const L = layout6(build), R0 = mm(rx(pose.root.lean ?? 0), rz(pose.root.roll ?? 0)), P = pose.pivots, z3 = [0, 0, 0];
  let lo = Infinity; const put = (R, o, pts) => { for (const p of pts) lo = Math.min(lo, add(o, mv(R, p))[1]); };
  for (const side of ['left', 'right']) {
    const sx = side === 'left' ? -1 : 1, off = pose.offsets?.[side + 'Hip'] ?? z3, w = L.leg / 2;
    const Rh = mm(R0, eul(P[side + 'Hip'] ?? z3)), oh = mv(R0, add([sx * L.hipX, 2, 0], off));
    const Rk = mm(Rh, eul(P[side + 'Knee'] ?? z3)), ok = add(oh, mv(Rh, [0, -SEG6.upperLeg[1], 0]));
    const Ra = mm(Rk, eul(P[side + 'Ankle'] ?? z3)), oa = add(ok, mv(Rk, [0, -SEG6.lowerLeg[1], 0])), hf = SEG6.foot[1];
    const ring = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * Math.PI; ring.push([-w + .01, CAP_R * Math.cos(a), CAP_R * Math.sin(a)], [w - .01, CAP_R * Math.cos(a), CAP_R * Math.sin(a)]); }
    put(Rk, ok, ring);
    const box = (x, y0, y1, z0, z1, r = BEVEL) => { const o = []; for (const X of x) for (const Y of [y0 + r, y1 - r]) for (const Z of [z0 + r, z1 - r]) o.push([X - Math.sign(X) * r, Y, Z]); return o; };
    const putR = (R, o2, pts, r = BEVEL) => { for (const p of pts) lo = Math.min(lo, add(o2, mv(R, p))[1] - r); };   // rounded: inset corners − bevel
    put(Rk, ok, box([-w, w], -SEG6.lowerLeg[1], 0, -.5, .5, 0));   // the shin block (flat ends: sharp at the ankle line)
    const fw = w - STEP, fz = .5 - STEP;   // the slab is inset 0.01
    if (sole) { const r = sole / 2; putR(Ra, oa, box([-fw, fw], -hf, -hf + sole, -fz, fz, r), r); put(Ra, oa, box([-fw + .012, fw - .012], -hf + sole, 0, -fz + .012, fz - .012, 0)); }
    else putR(Ra, oa, box([-fw, fw], -hf, 0, -fz, fz));
  }
  for (const p of [[-1, -.5], [1, -.5], [-1, .5], [1, .5]]) lo = Math.min(lo, mv(R0, [p[0] - Math.sign(p[0]) * BEVEL, L.bottom - 2 * OVERLAP + BEVEL, p[1] - Math.sign(p[1]) * BEVEL])[1] - BEVEL);
  return lo;
}
