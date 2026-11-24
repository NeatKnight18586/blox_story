// tests/r6.js — R6 rig + twos + freeze gates (node-only; the render byte-identity gate spawns scripts/v2/render.js once):  node tests/r6.js
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import * as A from '../engine/acting6.js';
import * as R from '../engine/r6.js';
import {sampleCamera} from '../engine/camera.js';
import {violations} from '../scripts/freeze-check.js';
import {widthAt} from '../avatar-style/hourglass.js';

const gates = [], gate = (name, pass, line) => { gates.push({name, pass}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const REACH_MAX = .35, builds = ['adult_m', 'youth', 'adult_f'];
const verbs = [...new Set([...A.VERB_NAMES, ...Object.values(A.PARTNER).filter(Boolean)])];
// 1. hand / foot target error at each verb's contact key (limbs the verb moves > .6 stud from the idle pose)
const rest = A.fk(A.sampleVerb('idle_alive', 0).sample), centre = c => c.reduce((a, p) => a.map((x, i) => x + p[i] / c.length), [0, 0, 0]), dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const reach = [];
for (const n of verbs) { const s = A.sampleVerb(n, A.timing(A.VERBS[n]).key).sample, f = A.fk(s), r = R.reachErrors(s, 'adult_m'), used = [];
  for (const k of ['leftHand', 'rightHand']) if (dist(f[k].p, rest[k].p) > .6) used.push(k);
  for (const k of ['leftFoot', 'rightFoot']) if (dist(centre(f[k + 'Corners']), centre(rest[k + 'Corners'])) > .6) used.push(k);
  reach.push({verb: n, worst: used.length ? Math.max(...used.map(k => r.err[k])) : 0, limbs: used.map(k => `${k[0]}${k.includes('Hand') ? 'H' : 'F'}:${r.err[k].toFixed(2)}`).join(' ')}); }
const bad = reach.filter(x => x.worst > REACH_MAX);
gate('reach ≤ 0.35 studs at every verb key', bad.length === 0, `${reach.length - bad.length}/${reach.length} verbs pass; worst ${Math.max(...reach.map(x => x.worst)).toFixed(2)}${bad.length ? '; over: ' + bad.map(x => `${x.verb} ${x.worst.toFixed(2)}`).join(', ') : ''}`);
// 2. lowestY ≥ −0.02 and limb / torso overlap ≤ 0.05 over every verb (1/24 s sweep, three builds) and cycle
let lowMin = Infinity, penMax = 0, lowAt = '', penAt = ''; const check = (tag, s, b) => { const lo = R.lowestR6(s, b), bx = R.r6Boxes(s, b); if (lo < lowMin) { lowMin = lo; lowAt = tag; }
  for (const k of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) { const p = R.penetration(bx[k], bx.torso).depth; if (p > penMax) { penMax = p; penAt = `${tag} ${k}`; } } };
for (const b of builds) { for (const n of A.VERB_NAMES) { const tm = A.timing(A.VERBS[n]); for (let t = 0; t <= tm.end; t += 1 / 24) check(`${n}@${t.toFixed(2)}/${b}`, R.retargetR15toR6(A.sampleVerb(n, t, {build: b}).sample, b), b); }
  for (const n of R.R6CYCLE_NAMES) for (let t = 0; t < 2 * A.CYCLES[n].T; t += 1 / 24) check(`${n}@${t.toFixed(2)}/${b}`, R.r6Cycle(n, t, {build: b}), b); }
gate('lowestY ≥ −0.02 (verbs + cycles, 3 builds)', lowMin >= R.LOW_TOL, `min ${lowMin.toFixed(3)} at ${lowAt}`);
gate('limb box inside torso box ≤ 0.05', penMax <= R.MAX_PEN + 1e-3, `max ${penMax.toFixed(3)} at ${penAt}`);
// 3. twos: poses identical on frame pairs (2k, 2k + 1), camera differs
const shot = {move: 'push', from: {position: [0, 4, 20], target: [0, 3, 0], fov: 40}, duration: 3, fps: 24}; let same = 0, camDiff = 0, N = 0;
for (let k = 0; k < 36; k++) { const t0 = 2 * k / 24, t1 = (2 * k + 1) / 24; N++;
  const a = JSON.stringify(A.sampleVerb('cheer', R.twosTime(t0)).sample), b = JSON.stringify(A.sampleVerb('cheer', R.twosTime(t1)).sample); if (a === b && R.twosTime(t0) === R.twosTime(t1)) same++;
  if (JSON.stringify(sampleCamera(shot, t0)) !== JSON.stringify(sampleCamera(shot, t1))) camDiff++; }
gate('twos: poses identical on pairs, camera differs', same === N && camDiff === N && R.twosTime(3 / 24) === 2 / 24, `${same}/${N} pose pairs identical, camera differs on ${camDiff}/${N} pairs`);
// 4. an existing fixture frame without `rig` renders byte-identical to the pre-R6 engine (md5 recorded before the change)
const BASE = '52f4cd4754f23f9688ecf5f99a6a4183', out = mkdtempSync(path.join(tmpdir(), 'r6-'));
let md5 = 'render failed'; try { execFileSync('node', ['scripts/v2/render.js', '--spec', 'engine/fixtures/acting6/episode.json', '--out', out, '--width', '270', '--height', '480', '--from', '60', '--to', '61', '--aa', '0'], {stdio: 'pipe', timeout: 300000});
  md5 = createHash('md5').update(readFileSync(path.join(out, 'frames/frame-00060.png'))).digest('hex'); } catch (e) { md5 = 'render failed: ' + String(e.message).slice(0, 80); }
gate('byte-identical render without `rig`', md5 === BASE, `engine/fixtures/acting6 frame 60 md5 ${md5.slice(0, 12)} vs ${BASE.slice(0, 12)}`);
// 5. freeze-check
const fake = violations(['stories/tuft/episode.json', 'beasts/x.json', 'parts/locations/y.json', 'cast/z.json'], 'tuft'), eng = violations(['stories/tuft/episode.json', 'engine/r6.js'], 'tuft');
gate('freeze-check: episode diff passes, engine diff fails', fake.length === 0 && eng.length === 1 && eng[0] === 'engine/r6.js', `episode diff ${fake.length} violations, engine diff ${eng.length} (${eng.join(',')})`);
// 6. hourglass torso: waist −8 %, hips +4 %, smooth; adult_f only
const w = [0, .25, .5, .75, 1].map(u => widthAt(u)), mono = widthAt(.25) < 1 && widthAt(.25) > widthAt(.5);
gate('hourglass: waist −8 %, hips +4 %, smooth taper', Math.abs(w[2] - .92) < 1e-9 && Math.abs(w[4] - 1.04) < 1e-9 && w[0] === 1 && mono, `widths ${w.map(x => x.toFixed(3)).join(' ')}`);
console.log(`\n${gates.filter(g => !g.pass).length ? 'FAIL' : 'PASS'}: ${gates.filter(g => g.pass).length}/${gates.length} gates`);
process.exit(gates.every(g => g.pass) ? 0 : 1);
