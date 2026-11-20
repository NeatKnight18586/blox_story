// scripts/v2/acting6-gates.js — P3 acting v6 gates → review/acting6/gates.json (run scripts/v2/acting6-sheet.js first: it writes
// renders/acting6/render.json with the silhouette and re-render measures).
//   footSlide    every foot corner in ground contact (y < 0.015) drifts ≤ 0.02 studs per contact (24 fps; verbs, partner verbs,
//                cycles at their CYCLE speed, tumble; intended slides — skid_stop's skid, slip's kick-out — are flagged and excluded)
//   jointLimits  raw (unclamped) joints inside LIMITS6 on every sample, intensities 0.5 / 1 / 1.5, both facings
//   phases       24 verbs: anticipation = 20 % of the verb (15–25 %), opposite-direction motion on the main channel ≥ max(2°, 15 %
//                of the stroke) (studs: ≥ 15 %), overshoot 8–16 % of the stroke inside the overshoot window
//   silhouette   KEY vs rest silhouette (magenta, no AA, the verb's sheet camera): XOR / rest area ≥ 0.12 (threshold set before measuring)
//   determinism  10 demo frames re-rendered on a fresh page: byte-identical
//   node scripts/v2/acting6-gates.js
import {readFile, writeFile} from 'node:fs/promises';
import * as A from '../../engine/acting6.js';
import {jointViolations} from '../../avatar-style/body6.js';

const SLIDE = .02, XOR = .12, OS = [.08, .16], ANT = [.15, .25], FPS = 24;
const clip = (f, dur, travel = 0) => { const frames = []; let viol = 0;
  for (let i = 0; i <= Math.round(dur * FPS); i++) { const t = i / FPS, r = f(t); frames.push({t, corners: A.cornersOf(r.sample), skid: !!r.ch.skid}); viol += jointViolations(r.raw).length; }
  const c = A.footContacts(frames, {travel}); return {slide: +Math.max(0, ...c.map(x => x.slide)).toFixed(4), contacts: c.length, viol, skidFrames: frames.filter(x => x.skid).length}; };
const foot = {}, limits = {};
for (const n of [...A.VERB_NAMES, 'hug_b', 'comfort_b']) { const D = A.timing(A.VERBS[n]).D + .6;
  foot[n] = clip(t => A.sampleVerb(n, t), D);
  limits[n] = 0; for (const I of [.5, 1, 1.5]) for (const facing of [30, -30]) limits[n] += clip(t => A.sampleVerb(n, t, {intensity: I, facing}), D).viol; }
for (const n of A.CYCLE_NAMES) { const d = n === 'skid_stop' ? A.SKID.end : 3, v = n === 'skid_stop' ? 0 : A.CYCLES[n].v; foot[n] = clip(t => A.sampleCycle(n, t), d, v);
  limits[n] = 0; for (const I of [.5, 1, 1.5]) limits[n] += clip(t => A.sampleCycle(n, t, {intensity: I}), d, v).viol; }
foot.tumble = clip(t => A.sampleTumble(t), 2.8); limits.tumble = foot.tumble.viol;
for (const g of A.GESTURES) limits[g] = clip(t => A.sampleVerb(g, t), A.timing(A.VERBS[g]).D).viol;
limits.carried = clip(t => A.sampleVerb('carried', t), 2).viol;   // held off the ground by the lead: limits only (no foot contact)
const phases = {};
for (const n of A.VERB_NAMES) { const p = A.verbPhases(n), deg = !/root\.d[xyz]/.test(p.channel), minA = Math.max(deg ? 2 : 0, .15 * p.stroke);
  phases[n] = {channel: p.channel, anticFrac: +p.anticFrac.toFixed(3), antic: +p.antic.toFixed(3), stroke: +p.stroke.toFixed(3), overshoot: +p.overshoot.toFixed(3), key: +p.key.toFixed(3),
    pass: p.anticFrac >= ANT[0] && p.anticFrac <= ANT[1] && p.antic >= minA && p.overshoot >= OS[0] && p.overshoot <= OS[1]}; }
{ const lean = t => A.tumbleChannels(t)['root.lean']; let m = 0; for (let i = 0; i <= 30; i++) m = Math.min(m, lean(.3 * i / 30)); phases.tumble = {channel: 'root.lean', antic: +(-m).toFixed(2), note: 'comedy roll: rear-back anticipation, two bounces, limp settle (no overshoot ease by design)', pass: -m >= 2}; }
// wrist arcs (info): max distance of the wrist path from its chord / chord length over the stroke
const arcs = {};
for (const n of A.VERB_NAMES) { const v = A.VERBS[n]; if (!v.arc) continue; const T = A.timing(v), sides = v.arc.side === 'both' ? ['left', 'right'] : [v.arc.side];
  for (const s of sides) { const P = []; for (let i = 0; i <= 12; i++) P.push(A.fk(A.sampleVerb(n, T.ant + v.act * i / 12).sample)[s + 'Wrist'].p);
    const a = P[0], b = P.at(-1), ab = b.map((x, i) => x - a[i]), L = Math.hypot(...ab); let dev = 0;
    for (const p of P) { const ap = p.map((x, i) => x - a[i]), u = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (L * L || 1); dev = Math.max(dev, Math.hypot(...ap.map((x, i) => x - u * ab[i]))); }
    arcs[`${n}.${s}`] = {chord: +L.toFixed(3), bow: +(L > 1e-6 ? dev / L : 0).toFixed(3)}; } }
let render = null; try { render = JSON.parse(await readFile('renders/acting6/render.json', 'utf8')); } catch { /* sheet not run */ }
const sil = render ? Object.fromEntries(Object.entries(render.silhouette).map(([k, v]) => [k, {xor: v.xor, area: v.area, pass: v.xor >= XOR}])) : null;
const g = {
  footSlide: {limit: SLIDE, perClip: foot, max: Math.max(...Object.values(foot).map(x => x.slide)), excluded: {skid_stop: 'skid (flagged frames)', slip: 'banana-peel kick-out (flagged frames)', carried: 'held off the ground'},
    pass: Object.values(foot).every(x => x.slide <= SLIDE)},
  jointLimits: {violations: limits, total: Object.values(limits).reduce((a, b) => a + b, 0), pass: Object.values(limits).every(x => x === 0)},
  phases: {rule: 'anticipation 15–25 % of the verb; opposite motion ≥ max(2°, 15 % stroke); overshoot 8–16 % of the stroke', perVerb: phases, pass: Object.values(phases).every(p => p.pass)},
  silhouette: {threshold: XOR, measure: 'XOR(KEY, rest) / rest area, 300×375 magenta, no AA, same camera', perVerb: sil, min: sil ? Math.min(...Object.values(sil).map(s => s.xor)) : null,
    failing: sil ? Object.entries(sil).filter(([, s]) => !s.pass).map(([k, s]) => `${k} ${s.xor}`) : null, pass: sil ? Object.values(sil).every(s => s.pass) : null},
  determinism: render ? {...render.determinism, pass: render.determinism.identical === render.determinism.of} : null,
  info: {wristArcs: arcs, overlap: {headLeadFrames: A.LEAD * FPS, handLagFrames: A.LAG * FPS}, comfortReach: A.REACH6.comfort_kneel, overshootEase: A.OS, footRollMargin: A.ROLL_MARGIN},
};
g.pass = ['footSlide', 'jointLimits', 'phases', 'silhouette', 'determinism'].every(k => g[k]?.pass);
await writeFile('review/acting6/gates.json', JSON.stringify(g, null, 1));
console.log(JSON.stringify({pass: g.pass, slideMax: g.footSlide.max, joints: g.jointLimits.total, phases: g.phases.pass, phaseFails: Object.entries(phases).filter(([, p]) => !p.pass).map(([k]) => k),
  silhouetteMin: g.silhouette.min, silFails: g.silhouette.failing, determinism: g.determinism && `${g.determinism.identical}/${g.determinism.of}`, arcMin: Math.min(...Object.values(arcs).map(a => a.bow))}));
