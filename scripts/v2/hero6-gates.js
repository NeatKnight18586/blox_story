// scripts/v2/hero6-gates.js — P1 gates for Actor v6 (R15) → review/hero6/gates.json (node + three, no browser; the seam
// numbers come from review/hero6/seam.json, written by scripts/v2/hero6-sheet.js):
//   joints     every SHEET6 pose and every R6 pose lifted by liftR6 (t 0–2 s at 24 fps): the rotations the actor's R15 pivots
//              actually get stay inside LIMITS6 (elbows forward only, knees back only); authored key values inside the
//              limits too (auto-levelled ankles listed separately: they are clamped by design)
//   seam       0 magenta pixels enclosed inside any limb chain (seam.json)
//   grounding  standing poses: lowest mesh point y = 0 ± 0.01 on A, B, C
//   triangles  ≤ 6000 per hero body (face decal included)
//   walk       planted foot: the lowest foot's world drift per contact frame on v6 ≤ R6 v5's (same walk, same travel)
//   node scripts/v2/hero6-gates.js
import * as T from 'three';
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {buildActor, driveActor} from '../../engine/actors.js';
import {triangles} from '../../avatar-style/body.js';
import {JOINTS6, LIMITS6, jointKind, jointViolations} from '../../avatar-style/body6.js';
import {SHEET6, STANDING6, rawKey6, inSwing} from '../../engine/poses6.js';
import {POSE_NAMES, WALK_SPEED} from '../../engine/poses.js';

const h6 = JSON.parse(readFileSync('cast/hero6.json', 'utf8')), hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO;
const V = {A: buildActor(h6.HERO_A, 'A'), B: buildActor(h6.HERO_B, 'B'), C: buildActor(h6.HERO_C, 'C')}, fails = [];
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
for (const [k, n] of Object.entries(tris)) if (n > 6000) fails.push(`triangles ${k}: ${n} > 6000`);
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
const walk = {r6: drift(r6, [shoe(r6, "left"), shoe(r6, "right")]), v6: drift(V.A, [V.A.parts.leftFoot, V.A.parts.rightFoot]), travelPerFrame: +(WALK_SPEED / 24).toFixed(4)};
if (walk.v6.maxPerFrame > walk.r6.maxPerFrame + .005) fails.push(`walk: v6 planted-foot drift max ${walk.v6.maxPerFrame}/frame > R6 ${walk.r6.maxPerFrame}`);
const rep = {joints: {samples: checked, outOfRange: jointBad.length, authoredOutside: authoredBad, autoLevelledAnklesClamped: Object.fromEntries(Object.entries(levelled).filter(([, v]) => v.length)), limitsDeg: Object.fromEntries(Object.entries(LIMITS6).map(([k, v]) => [k, v.map(r => r.map(x => +(x * D).toFixed(0)))]))},
  seam: seam && {total: seam.total, pass: seam.pass, failing: seam.failing, wholeBodyPinchesInfo: Object.fromEntries(Object.entries(seam.wholeBodyPinchesInfo.px).map(([n, v]) => [n, Object.values(v).reduce((x, y) => x + y, 0)]))},
  groundingY: ground, triangles: {...tris, R6v5: triangles(r6.root), limit: 6000}, walk, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/hero6', {recursive: true}); writeFileSync('review/hero6/gates.json', JSON.stringify(rep, null, 1));
console.log(JSON.stringify({result: rep.result, joints: rep.joints.outOfRange, seam: seam?.total, grounding: Math.max(...Object.values(ground).map(Math.abs)), tris, walk, fails}));
process.exitCode = fails.length ? 1 : 0;
