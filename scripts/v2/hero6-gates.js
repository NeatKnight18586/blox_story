// scripts/v2/hero6-gates.js — P1/P1b gates for Actor v6 (iconic R15) → review/hero6/gates.json (node + three, no browser; the seam
// numbers come from review/hero6/seam.json, written by scripts/v2/hero6-sheet.js):
//   joints     every SHEET6 pose and every R6 pose lifted by liftR6 (t 0–2 s at 24 fps): the rotations the actor's R15 pivots
//              actually get stay inside LIMITS6 (elbows forward only, knees back only); authored key values inside the
//              limits too (auto-levelled ankles listed separately: they are clamped by design)
//   seam       0 magenta pixels enclosed inside any limb chain (seam.json)
//   grounding  standing poses: lowest mesh point y = 0 ± 0.01 on hero B, ref A and every troupe slot (cast/troupe6.json)
//   triangles  ≤ 6000 per hero body (face decal included)
//   heights    P1b: the built body's part heights (world bounding boxes in the ref6 stance, joint overlaps excluded) within
//              ±0.03 of the owner reference (REF6)
//   pop        P1b: idle → walk → idle → run → idle at 24 fps: the cross-fade adds ≤ 3° a frame to any joint
//   crowd      P1b: a v6 crowd member vs a v5 one: far tier (instanced) triangles + draw calls, mid tier (bg actor) triangles + meshes
//   walk       planted foot: the lowest foot's world drift per contact frame on v6 ≤ R6 v5's (same walk, same travel)
//   node scripts/v2/hero6-gates.js
import * as T from 'three';
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {buildActor, driveActor} from '../../engine/actors.js';
import {triangles} from '../../avatar-style/body.js';
import {JOINTS6, LIMITS6, jointKind, jointViolations, REF6, slotPreset6, createActor6, OVERLAP} from '../../avatar-style/body6.js';
import {createActor5} from '../../avatar-style/body5.js';
import {crowdV5Triangles} from '../../engine/crowd.js';
import {SHEET6, STANDING6, rawKey6, inSwing, sampleTimeline6, samplePose6, POP_MAX} from '../../engine/poses6.js';
import {POSE_NAMES, WALK_SPEED} from '../../engine/poses.js';

const h6 = JSON.parse(readFileSync('cast/hero6.json', 'utf8')), hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO, t6 = JSON.parse(readFileSync('cast/troupe6.json', 'utf8'));
const SLOTS = ['LEAD', 'SECOND', 'LITTLE', 'RIVAL', 'ELDER', 'AFK'];
const V = {B: buildActor(h6.HERO, 'B'), A: buildActor(h6.HERO_A_REF, 'A'), ...Object.fromEntries(SLOTS.map(k => [k, buildActor(slotPreset6(k, t6), k)]))}, fails = [];
const D = 180 / Math.PI, box = new T.Box3();
const minY = (a, filter = () => true) => { a.root.updateMatrixWorld(true); let lo = Infinity; a.root.traverse(o => { if (o.isMesh && o.visible && o.name !== 'face_decal' && filter(o)) lo = Math.min(lo, box.setFromObject(o, true).min.y); }); return lo; };
// 1. joints: read the pivots back after driving the actor
const outOfRange = a => { const bad = []; for (const j of JOINTS6) { const L = LIMITS6[jointKind(j)], r = a.pivots[j].rotation; [r.x, r.y, r.z].forEach((x, i) => { if (x < L[i][0] - 1e-6 || x > L[i][1] + 1e-6) bad.push(`${j}.${'xyz'[i]} ${(x * D).toFixed(1)}°`); }); } return bad; };
let checked = 0; const jointBad = [], authored = {}, levelled = {};
for (const n of SHEET6) { driveActor(V.B, 0, {keys: [[0, n]]}); checked++; for (const b of outOfRange(V.B)) jointBad.push(`${n}: ${b}`);
  const v = jointViolations(rawKey6(n)); authored[n] = v.filter(x => !x.joint.endsWith('Ankle')).length; levelled[n] = v.filter(x => x.joint.endsWith('Ankle')).map(x => `${x.joint} ${x.deg}° → clamped`); }
for (const n of POSE_NAMES) for (let f = 0; f <= 48; f += 2) { driveActor(V.A, f / 24, {keys: [[0, n]]}); checked++; for (const b of outOfRange(V.A)) jointBad.push(`${n}@${f}: ${b}`); }
const authoredBad = Object.entries(authored).filter(([, c]) => c).map(([n, c]) => `${n}: ${c} authored values outside limits`);
if (jointBad.length) fails.push(`joints: ${jointBad.length} out of range (${jointBad.slice(0, 3).join('; ')})`); fails.push(...authoredBad);
// 2. seam (from the sheet run)
const seam = existsSync('review/hero6/seam.json') ? JSON.parse(readFileSync('review/hero6/seam.json', 'utf8')) : null;
if (!seam) fails.push('seam: review/hero6/seam.json missing (run scripts/v2/hero6-sheet.js)'); else if (!seam.pass) fails.push(`seam: ${seam.total} enclosed magenta px`);
// 3. grounding
const ground = {};
for (const [k, a] of Object.entries(V)) for (const n of STANDING6) { driveActor(a, 0, {keys: [[0, n]]}); const y = +minY(a).toFixed(4); ground[`${k}.${n}`] = y; if (Math.abs(y) > .01) fails.push(`grounding ${k}.${n}: ${y}`); }
// 4. triangles
const tris = Object.fromEntries(Object.entries(V).map(([k, a]) => [k, triangles(a.root)])), r6 = buildActor(hero, 'R6');
for (const k of ['B', 'A']) if (tris[k] > 6000) fails.push(`triangles ${k}: ${tris[k]} > 6000`);
// P1b heights: world boxes in the reference stance; a block's joint overlap (0.01 into its neighbour) is not visible height
driveActor(V.B, 0, {keys: [[0, 'ref6']]}); V.B.root.updateMatrixWorld(true);
const yb = o => { const mb = o.geometry.userData.mainBox; return mb ? mb.clone().applyMatrix4(o.matrixWorld) : box.setFromObject(o, true).clone(); },   // a fused segment: its own block, not the caps/plugs
  P = V.B.parts, ua = yb(P.rightArm), la = yb(P.rightLowerArm), hd = yb(P.rightHand), ul = yb(P.rightLeg), ll = yb(P.rightLowerLeg), ft = yb(P.rightFoot), so = P.rightSole ? yb(P.rightSole) : ft;
const own = o => { o.geometry.computeBoundingBox(); return o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); }, up = own(P.torso), lo = own(P.lowerTorso);   // the torso pieces alone (not the collar / strip children)
const measured = {upperTorso: (up.max.y - OVERLAP) - (up.min.y + OVERLAP), lowerTorso: (lo.max.y - OVERLAP) - Math.max(lo.min.y, ul.max.y), arm: ua.max.y - la.min.y, hand: hd.max.y - hd.min.y,
  leg: ul.max.y - ll.min.y, foot: ft.max.y - Math.min(ft.min.y, so.min.y)};
const heights = Object.fromEntries(Object.entries(REF6).map(([k, ref]) => { const m = +measured[k].toFixed(3), dv = +(m - ref).toFixed(3); if (Math.abs(dv) > .03 + 1e-9) fails.push(`height ${k}: ${m} vs ${ref}`); return [k, {ref, measured: m, delta: dv, pass: Math.abs(dv) <= .03 + 1e-9}]; }));
// P1b pop: the cross-fade's extra per-frame change over the two sides' own motion
const PK = [[0, 'idle'], [1, 'walk'], [2.7, 'idle'], [4, 'run'], [5.3, 'idle']], KS = PK.map((_, k) => PK.slice(0, k + 1));
let pop = 0; for (let f = 1; f < 6.5 * 24; f++) { const t = f / 24, a = sampleTimeline6(PK, t - 1 / 24), b = sampleTimeline6(PK, t); let i = 0; while (i + 1 < PK.length && PK[i + 1][0] <= t) i++;
  const own = k => { const g = k < i ? (tt => sampleTimeline6(KS[k], tt)) : (tt => samplePose6(PK[k][1], Math.max(0, tt - PK[k][0]))), x = g(t - 1 / 24), y = g(t); return j => x.pivots[j].map((v, q) => Math.abs(y.pivots[j][q] - v)); };
  const o1 = own(i), o0 = i ? own(i - 1) : o1; for (const j of Object.keys(b.pivots)) b.pivots[j].forEach((v, q) => { pop = Math.max(pop, Math.abs(v - a.pivots[j][q]) - Math.max(o1(j)[q], o0(j)[q])); }); }
if (pop > POP_MAX + 1e-9) fails.push(`cross-fade pop ${(pop * D).toFixed(2)}° > 3°`);
// P1b crowd: far tier = the same instanced prisms for v5 and v6 (one InstancedMesh per part); mid tier = one bg actor
const bgCount = a => { let m = 0; a.root.traverse(o => { if (o.isMesh) m++; }); return m; };
const mids = {v5: createActor5({tier: 'bg', skin: '#f5cd30', materials: {}}), v6: createActor6({tier: 'bg', skin: '#f5cd30', materials: {}})};
const crowd = {farTier: {v5: {trisPerMember: crowdV5Triangles(), drawCallsPerCrowd: 6 + 6}, v6: {trisPerMember: crowdV5Triangles(), drawCallsPerCrowd: 6 + 6, note: 'same instanced prisms: the v6 silhouette (flush limbs, flush slabs) is the R6 block outline at this tier'}},
  midTier: Object.fromEntries(Object.entries(mids).map(([k, a]) => [k, {tris: triangles(a.root), meshes: bgCount(a)}]))};
if (crowd.midTier.v6.tris > crowd.midTier.v5.tris || crowd.midTier.v6.meshes > crowd.midTier.v5.meshes) fails.push(`crowd mid tier: v6 ${JSON.stringify(crowd.midTier.v6)} > v5 ${JSON.stringify(crowd.midTier.v5)}`);
// 5. walk: planted-foot drift (world z of the lowest foot, frame to frame, while the same foot stays lowest), v6 vs R6
// planted foot: the stance leg (poses6 inSwing = false: its thigh travelling back), frame to frame, the world drift of the
// foot's bottom centre (bbox centre x/z) while the root travels at WALK_SPEED; same measure on R6 v5 and v6
function drift(a, feet) {
  let prev = [null, null], worst = 0, sum = 0, n = 0;
  for (let f = 0; f <= 72; f++) { const t = f / 24; driveActor(a, t, {keys: [[0, 'walk']], origin: {position: [0, 0, WALK_SPEED * t], yaw: 0}}); a.root.updateMatrixWorld(true);
    ['left', 'right'].forEach((side, i) => { const c = box.setFromObject(feet[i], true).getCenter(new T.Vector3()), on = !inSwing('walk', t, side);
      if (on && prev[i]) { const d = Math.hypot(c.x - prev[i].x, c.z - prev[i].z); worst = Math.max(worst, d); sum += d; n++; } prev[i] = on ? c : null; }); }
  return {maxPerFrame: +worst.toFixed(4), meanPerFrame: +(sum / n).toFixed(4), contactFrames: n};
}
const shoe = (a, s) => a.parts[s + "Leg"].children.find(c => c.isMesh) ?? a.parts[s + "Leg"];
const walk = {r6: drift(r6, [shoe(r6, "left"), shoe(r6, "right")]), v6: drift(V.B, [V.B.parts.leftFoot, V.B.parts.rightFoot]), travelPerFrame: +(WALK_SPEED / 24).toFixed(4)};
if (walk.v6.maxPerFrame > walk.r6.maxPerFrame + .005) fails.push(`walk: v6 planted-foot drift max ${walk.v6.maxPerFrame}/frame > R6 ${walk.r6.maxPerFrame}`);
const rep = {joints: {samples: checked, outOfRange: jointBad.length, authoredOutside: authoredBad, autoLevelledAnklesClamped: Object.fromEntries(Object.entries(levelled).filter(([, v]) => v.length)), limitsDeg: Object.fromEntries(Object.entries(LIMITS6).map(([k, v]) => [k, v.map(r => r.map(x => +(x * D).toFixed(0)))]))},
  seam: seam && {total: seam.total, pass: seam.pass, failing: seam.failing, wholeBodyPinchesInfo: Object.fromEntries(Object.entries(seam.wholeBodyPinchesInfo.px).map(([n, v]) => [n, Object.values(v).reduce((x, y) => x + y, 0)]))},
  groundingY: ground, triangles: {...tris, R6v5: triangles(r6.root), limit: 6000, limitAppliesTo: 'hero B (and ref A)'}, heights, popDeg: +(pop * D).toFixed(2), crowd, walk, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/hero6', {recursive: true}); writeFileSync('review/hero6/gates.json', JSON.stringify(rep, null, 1));
console.log(JSON.stringify({result: rep.result, joints: rep.joints.outOfRange, seam: seam?.total, grounding: Math.max(...Object.values(ground).map(Math.abs)), tris, heights, popDeg: rep.popDeg, crowd, walk, fails}));
process.exitCode = fails.length ? 1 : 0;
