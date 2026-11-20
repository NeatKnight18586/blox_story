// scripts/v2/acting6-gates.js — P3 acting v6 gates → review/acting6/gates.json (run scripts/v2/acting6-sheet.js first: it writes
// renders/acting6/render.json with the silhouette and re-render measures).
//   footSlide    every foot corner in ground contact (y < 0.015) drifts ≤ 0.02 studs per contact (24 fps; verbs, partner verbs,
//                cycles at their CYCLE speed, tumble; intended slides — skid_stop's skid, slip's kick-out — are flagged and excluded)
//   jointLimits  raw (unclamped) joints inside LIMITS6 on every sample, intensities 0.5 / 1 / 1.5, both facings
//   phases       24 verbs: anticipation = 20 % of the verb (15–25 %), opposite-direction motion on the main channel ≥ max(2°, 15 %
//                of the stroke) (studs: ≥ 15 %), overshoot 8–16 % of the stroke inside the overshoot window
//   silhouette   KEY vs rest silhouette (magenta, no AA, the verb's sheet camera): XOR / rest area ≥ 0.12 (threshold set before measuring);
//                idle_alive is exempt (owner Decision 1, P3b) and has the LIFE gate instead
//   life         idle: weight shift (hips travel ≥ 0.06 studs side to side) every 3–5 s, head turn of 6–12° at least once per 5 s (8 seeds × 60 s)
//   fixes        P3b: hug (penetration, squeeze), carry (dip, rise, stagger, penetration), gasp_step_back (stride, lean), arms_cross (stack offsets),
//                look_around (hand above and beside the eyes, ±35°, torso 30 %, face visible), partner plan (≤ 0.5 studs or a walk-in)
//   determinism  10 demo frames re-rendered on a fresh page: byte-identical
//   node scripts/v2/acting6-gates.js
import {readFile, writeFile} from 'node:fs/promises';
import * as A from '../../engine/acting6.js';
import {jointViolations} from '../../avatar-style/body6.js';

const SLIDE = .02, XOR = .12, OS = [.08, .16], ANT = [.15, .25], FPS = 24;
const HUG_LIMIT = {hug: .08, hug_s: .08, hug_l: .05};   // studs; owner-authorized 0.08 for the kid variants (P3c)
const DIPQ = .25, smooth01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const clip = (f, dur, travel = 0) => { const frames = []; let viol = 0;
  for (let i = 0; i <= Math.round(dur * FPS); i++) { const t = i / FPS, r = f(t); frames.push({t, corners: A.cornersOf(r.sample), skid: !!r.ch.skid}); viol += jointViolations(r.raw).length; }
  const c = A.footContacts(frames, {travel}); return {slide: +Math.max(0, ...c.map(x => x.slide)).toFixed(4), contacts: c.length, viol, skidFrames: frames.filter(x => x.skid).length}; };
const foot = {}, limits = {};
for (const n of [...A.VERB_NAMES, ...A.EXTRA_VERBS, 'hug_b', 'hug_b_s', 'hug_b_l', 'comfort_b', 'carried', 'carried_hip']) { const D = A.timing(A.VERBS[n]).D + .6;
  foot[n] = clip(t => A.sampleVerb(n, t), D);
  limits[n] = 0; for (const I of [.5, 1, 1.5]) for (const facing of [30, -30]) limits[n] += clip(t => A.sampleVerb(n, t, {intensity: I, facing}), D).viol; }
for (const n of A.CYCLE_NAMES) { const d = n === 'skid_stop' ? A.SKID.end : 3, v = n === 'skid_stop' ? 0 : A.CYCLES[n].v; foot[n] = clip(t => A.sampleCycle(n, t), d, v);
  limits[n] = 0; for (const I of [.5, 1, 1.5]) limits[n] += clip(t => A.sampleCycle(n, t, {intensity: I}), d, v).viol; }
foot.tumble = clip(t => A.sampleTumble(t), 2.8); limits.tumble = foot.tumble.viol;
for (const g of A.GESTURES) limits[g] = clip(t => A.sampleVerb(g, t), A.timing(A.VERBS[g]).D).viol;
const phases = {};
for (const n of [...A.VERB_NAMES, ...A.EXTRA_VERBS.filter(n => n !== 'carry_box')]) { const p = A.verbPhases(n), deg = !/root\.d[xyz]/.test(p.channel), minA = Math.max(deg ? 2 : 0, .15 * p.stroke);
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
const sil = render ? Object.fromEntries(Object.entries(render.silhouette).map(([k, v]) => [k, k === 'idle_alive' ? {xor: v.xor, area: v.area, exempt: 'LIFE gate (owner Decision 1)', pass: true} : {xor: v.xor, area: v.area, pass: v.xor >= XOR}])) : null;
// ---- LIFE gate (idle_alive, owner Decision 1) ----
const life = {seeds: {}, pass: true};
for (let seed = 1; seed <= 8; seed++) {
  const hip = [], head = []; for (let i = 0; i <= 60 * FPS; i++) { const t = i / FPS, ch = {...A.REST}; for (const [c, x] of Object.entries(A.idleLife(t, seed))) ch[c] += x; const f = A.fk(A.solve(ch).sample); hip.push((f.leftHip.p[0] + f.rightHip.p[0]) / 2); head.push(ch['head.y']); }
  const cross = []; for (let i = 1; i < hip.length; i++) if (hip[i - 1] * hip[i] < 0) cross.push(i / FPS); const gaps = cross.slice(1).map((x, i) => x - cross[i]);
  const travel = Math.max(...hip) - Math.min(...hip);
  // head turns: local extrema of |head.y| that exceed 3° (the plateau of each turn); every 5 s window holds one ≥ 6°
  const peaks = []; for (let i = 1; i < head.length - 1; i++) { const a = Math.abs(head[i]); if (a > 3 && a >= Math.abs(head[i - 1]) && a > Math.abs(head[i + 1])) peaks.push({t: i / FPS, a}); }
  let windowsOk = true; for (let t0 = 0; t0 + 5 <= 60; t0 += .5) if (!peaks.some(p => p.t >= t0 && p.t <= t0 + 5 && p.a >= 6)) windowsOk = false;
  const turnMax = Math.max(...peaks.map(p => p.a)), turnMin = Math.min(...peaks.filter(p => p.a >= 6).map(p => p.a));
  const r = {shifts: cross.length, gapMin: +Math.min(...gaps).toFixed(2), gapMax: +Math.max(...gaps).toFixed(2), hipTravel: +travel.toFixed(3), headPeakMax: +turnMax.toFixed(1), headPeakMin: +turnMin.toFixed(1), everyFiveSecondsOk: windowsOk};
  const br = []; for (let i = 0; i <= 8 * FPS; i++) br.push(-A.idleLife(i / FPS, seed)['torso.sq']); r.breathPeak = +Math.max(...br).toFixed(4); r.breathRise = +(Math.max(...br) - Math.min(...br)).toFixed(4);   // P3c: 1.5 % chest rise, 3.5 s cycle
  r.pass = Math.abs(r.breathPeak - .015) <= .0008 && r.breathRise >= .014 && r.gapMin >= 3 && r.gapMax <= 5 && travel >= .06 && turnMax <= 12 && turnMin >= 6 && windowsOk; life.seeds[seed] = r; life.pass &&= r.pass; }
// ---- P3b fixes ----
const fixes = {};
const ang = r => r / Math.PI * 180, camDir = deg => [Math.sin(deg * Math.PI / 180), 0, Math.cos(deg * Math.PI / 180)];
{ // gasp_step_back: a full stride, the chest leans back
  const T = A.timing(A.VERBS.gasp_step_back), k = A.sampleVerb('gasp_step_back', T.key), e = A.sampleVerb('gasp_step_back', T.end + .3), stride = Math.max(...['lf', 'rf'].map(f => Math.abs(e.ch[`${f}.z`] - A.REST[`${f}.z`]))), lean = -ang(k.sample.root.lean);
  const hands = ['left', 'right'].map(side => { const f = A.fk(k.sample), w = f.waist.p, h = f[side + 'Hand'].p; return {side, x: +(h[0] - w[0]).toFixed(2), y: +(h[1]).toFixed(2), z: +(h[2] - w[2]).toFixed(2)}; });
  fixes.gasp_step_back = {strideStuds: +stride.toFixed(2), leanBackDeg: +lean.toFixed(1), hands, pass: stride >= .9 && lean >= 9.95 && hands.every(h => Math.abs(h.x) >= 1.7 && h.y >= 3.0 && h.y <= 4.2)}; }
{ // arms_cross: forearm blocks stacked with a visible offset (left higher by .25, right in front by .2); the blocks read as two
  const T = A.timing(A.VERBS.arms_cross), f = A.fk(A.sampleVerb('arms_cross', T.end).sample), mid = side => f[side + 'Elbow'].p.map((x, i) => (x + f[side + 'Wrist'].p[i]) / 2), l = mid('left'), r = mid('right');
  const dy = l[1] - r[1], dz = r[2] - l[2]; fixes.arms_cross = {higherBy: +dy.toFixed(3), inFrontBy: +dz.toFixed(3), tol: .03, pass: Math.abs(dy - .25) <= .03 && Math.abs(dz - .2) <= .03}; }
{ // look_around: the brow-shade hand above and beside the eyes, never over the face; head ±35°, torso follows 30 %
  const v = A.VERBS.look_around, T = A.timing(v), cd = camDir(v.cam), po = A.versePoses('look_around'); let handHidden = 0, armHidden = 0, handBottom = 1e9, handX = 0;
  for (let i = 0; i <= 60; i++) { const t = T.ant + (T.end - T.ant) * i / 60, r = A.sampleVerb('look_around', t), f = A.fk(r.sample);
    handHidden = Math.max(handHidden, A.faceVisibility(r.sample, cd, [], 'adult_m', {only: /rightHand/}).hidden); armHidden = Math.max(armHidden, A.faceVisibility(r.sample, cd, [], 'adult_m', {only: /rightForearm|rightUpperArm/}).hidden);
    if (t >= T.key) { handBottom = Math.min(handBottom, f.rightHand.p[1] - .125 - (f.head.p[1] + 1.2)); handX = Math.max(handX, Math.abs(f.rightHand.p[0] - f.head.p[0])); } }
  fixes.look_around = {headLeftDeg: po.key['head.y'], headRightDeg: po.settle['head.y'], torsoFollow: +(po.key['waist.y'] / po.key['head.y']).toFixed(2), faceHiddenByHandMax: handHidden, faceHiddenByForearmMax: armHidden, handBottomAboveHeadTop: +handBottom.toFixed(2), handBesideHeadX: +handX.toFixed(2),
    pass: Math.abs(po.key['head.y'] + 35) < .01 && Math.abs(po.settle['head.y'] - 35) < .01 && Math.abs(po.key['waist.y'] / po.key['head.y'] - .3) < .005 && handHidden === 0 && armHidden <= .15 && handBottom >= 0 && handX >= .8}; }
const placedPair = (leadVerb, t, partnerId = null) => {   // lead at the origin, the partner placed by the same call (partnerOffset / carryOrigin + stagger), both as world boxes
  const v = A.VERBS[leadVerb], T = A.timing(v), pv = v.two.partner, kp = v.kp ?? 1, off = A.partnerOffset(leadVerb), lead = A.sampleVerb(leadVerb, t), pt = Math.max(0, t - T.key + A.timing(A.VERBS[pv]).key), ps = A.sampleVerb(pv, pt);
  let at = [off.x, 0, off.z], yaw = off.yaw; if (v.two.follow) { const c = A.carryOrigin(lead.sample, 'adult_m', leadVerb, kp), w = A.carryW(leadVerb, t, 0); at = at.map((x, i) => x + (c.p[i] - x) * w); yaw = off.yaw + (c.yaw - off.yaw) * w; }
  return {lead, ps, la: A.placeBoxes(A.bodyBoxes(lead.sample), {}), pb: A.placeBoxes(A.bodyBoxes(ps.sample), {at, yaw: yaw * Math.PI / 180, k: kp}), at, yaw, kp}; };
for (const n of ['hug', 'hug_s', 'hug_l']) {   // owner P3b fix 1: no interpenetration, then the squeeze beat (both chests compress 3 %, rock 4°, 6 frames)
  const v = A.VERBS[n], T = A.timing(v); let pen = {depth: 0}, vis = {hidden: 0}; const frames = Math.round((T.D + .5) * FPS); let transit = {depth: 0};   // embrace = from the KEY on; transit = the arms arriving (reported, not gated)
  for (let i = 0; i <= frames; i++) { const t = i / FPS, pp = placedPair(n, t), pn = A.penetration(pp.la, pp.pb); if (t < T.key - 1e-6) { if (pn.depth > transit.depth) transit = {...pn, t: +t.toFixed(2)}; continue; } if (pn.depth > pen.depth) pen = {...pn, t: +t.toFixed(2)};
    if (t >= T.key - .01) { const cd = camDir(v.cam), c = Math.cos(pp.yaw * Math.PI / 180), sn = Math.sin(pp.yaw * Math.PI / 180); const hv = A.faceVisibility(pp.lead.sample, cd, pp.pb); vis.hidden = Math.max(vis.hidden, hv.hidden); } }
  const poses = A.versePoses(n), sq = []; for (let i = 0; i <= (T.D + .5) * 240; i++) sq.push(A.verbChannels(n, i / 240, poses)['torso.sq']);   // fine grid
  const saved = v.squeeze; delete v.squeeze; const axis = saved.axis ?? 'waist.z', fine = t => A.verbChannels(n, t, poses)[axis]; const t0 = T.key + saved.at - .05, N = Math.round((saved.frames / FPS + .1) * 240), base = [], withSq = [];
  for (let i = 0; i <= N; i++) base.push(fine(t0 + i / 240)); v.squeeze = saved; for (let i = 0; i <= N; i++) withSq.push(fine(t0 + i / 240));   // rock measured on a fine grid (a 6-frame beat at 24 fps cannot show its own peak)
  const rock = Math.max(...withSq.map((x, i) => Math.abs(x - base[i]))), on = Math.round(saved.frames), peak = Math.max(...sq);
  fixes[n] = {penetrationMax: pen.depth, pair: pen.pair, at: pen.t, transitMax: transit.depth, transitPair: transit.pair, transitAt: transit.t, partnerScale: v.kp, squeezeCompress: +peak.toFixed(4), rockDeg: +rock.toFixed(2), beatFrames: on, faceHiddenMax: vis.hidden,
    limit: HUG_LIMIT[n], ownerDecision: n === 'hug_l' ? null : 'owner decision: geometric limit of a 2-wide chest and 1-thick arm blocks (kid variants 0.08)', pass: pen.depth <= HUG_LIMIT[n] && Math.abs(peak - .03) <= .0015 && Math.abs(rock - 4) <= .1 && on === 6 && vis.hidden <= .25}; }
for (const n of ['carry', 'carry_hip']) {   // owner P3b fix 2: piggyback (kid) / hip-carry (LITTLE); the lead dips 0.25, rises over 8 frames, the partner 1 frame behind
  const v = A.VERBS[n], T = A.timing(v), frames = Math.round((T.D + .5) * FPS), dy = []; let pen = {depth: 0}, vis = {hidden: 0};
  for (let i = 0; i <= frames; i++) { const t = i / FPS; dy.push(A.sampleVerb(n, t).ch['root.dy']); if (t >= T.key) { const pp = placedPair(n, t), pn = A.penetration(pp.la, pp.pb, {skip: (x, y) => /Hand/.test(x) && /Thigh|Shin/.test(y) || /Hand/.test(y) && /Thigh|Shin/.test(x)}); if (pn.depth > pen.depth) pen = {...pn, t: +t.toFixed(2)};
    vis.hidden = Math.max(vis.hidden, A.faceVisibility(pp.lead.sample, camDir(v.cam), pp.pb).hidden); } }
  const dip = -Math.min(...dy), riseFrames = Math.round(v.act * FPS);
  const startLag = (() => { let tl = null, tp = null; for (let i = 0; i < 200; i++) { const t = T.ant + i / (FPS * 4); if (tl === null && smooth01((t - T.ant) / v.act) > .01) tl = t; if (tp === null && A.carryW(n, t, 0) > .01) tp = t; } return Math.round((tp - tl) * FPS * 10) / 10; })();
  fixes[n] = {dipStuds: +dip.toFixed(3), riseFrames, partnerLagFrames: startLag, penetrationAfterLift: pen.depth, pair: pen.pair, at: pen.t, partnerScale: v.kp, faceHiddenMax: vis.hidden, pass: Math.abs(dip - DIPQ) <= .02 && riseFrames === 8 && startLag >= .8 && startLag <= 1.3 && pen.depth <= .05 && vis.hidden <= .25}; }
{ // partners start within 0.5 studs of the meeting mark, or walk in; no room → FAIL
  const base = {verb: 'hug', leadPos: [0, 0], leadYaw: 0, start: 5};
  const mk = A.partnerOffset('hug'), at = (dx, dz) => [mk.x + dx, mk.z + dz];
  const near = A.partnerPlan({...base, partnerPos: at(.3, 0), avail: 5}), far = A.partnerPlan({...base, partnerPos: at(4, 0), avail: 5}), tight = A.partnerPlan({...base, partnerPos: at(4, 0), avail: .5}), off = A.partnerPlan({...base, partnerPos: at(4, 0), avail: 5, walkIn: false});
  fixes.partnerPlan = {near: near.ok && !near.walk, walkIn: far.ok && !!far.walk && far.walk.t0 < 5, noRoom: !tight.ok, walkInOff: !off.ok, tolerance: A.PARTNER_TOL, pass: near.ok && !near.walk && far.ok && !!far.walk && !tight.ok && !off.ok}; }
{ // P3c hug staging: the verb's review camera is 25–60° off the torso line; the pure plan check rejects other shots
  const out = {}; for (const n of ['hug', 'hug_s', 'hug_l']) { const v = A.VERBS[n], off = A.partnerOffset(n), c = v.cam * Math.PI / 180, a = A.hugAngle({camPos: [Math.sin(c) * 20, Math.cos(c) * 20], leadPos: [0, 0], partnerPos: [off.x, off.z]}); out[n] = {cam: v.cam, angle: +a.toFixed(1)}; }
  const bad = A.hugAngleIssues([{lead: 'H', partner: 'F', key: 1, cam: {camPos: [0, 20], leadPos: [0, 0], partnerPos: [0, 2]}}, {lead: 'H', partner: 'F', key: 1, cam: {camPos: [20, 0], leadPos: [0, 0], partnerPos: [0, 2]}}, {lead: 'H', partner: 'F', key: 1, cam: {camPos: [14, 14], leadPos: [0, 0], partnerPos: [0, 2]}}]);
  fixes.hugAngle = {range: A.HUG_ANGLE, variants: out, planRejects: bad.length === 2, pass: Object.values(out).every(x => x.angle >= 25 && x.angle <= 60) && bad.length === 2}; }
{ // P3c wrist cuffs: hero B only (cast/hero6.json); crossed forearms keep ≥ 0.1 studs between each elbow and the other forearm
  const T = A.timing(A.VERBS.arms_cross), smp = A.sampleVerb('arms_cross', T.end).sample, f = A.fk(smp), bx = A.bodyBoxes(smp);
  const dist = (p, b) => { const l = [0, 1, 2].map(i => b.R[0][i] * (p[0] - b.c[0]) + b.R[1][i] * (p[1] - b.c[1]) + b.R[2][i] * (p[2] - b.c[2])); return Math.hypot(...l.map((x, i) => Math.max(0, Math.abs(x) - b.h[i]))); };
  const gl = dist(f.leftElbow.p, bx.find(b => b.n === 'rightForearm')), gr = dist(f.rightElbow.p, bx.find(b => b.n === 'leftForearm'));
  const hero = JSON.parse(await readFile('cast/hero6.json', 'utf8')); fixes.cuffs = {heroB: hero.HERO.regions.arms.cuff, heroAref: hero.HERO_A_REF?.regions?.arms?.cuff ?? null, elbowClearance: +Math.min(gl, gr).toFixed(2), pass: hero.HERO.regions.arms.cuff === '#E8E8EE' && !hero.HERO_A_REF?.regions?.arms?.cuff && Math.min(gl, gr) >= .1}; }
const g = {
  footSlide: {limit: SLIDE, perClip: foot, max: Math.max(...Object.entries(foot).filter(([k]) => !/^carried/.test(k)).map(([, x]) => x.slide)), excluded: {skid_stop: 'skid (flagged frames)', slip: 'banana-peel kick-out (flagged frames)', carried: 'lifted off the ground by the lead', carried_hip: 'lifted off the ground by the lead'},
    pass: Object.entries(foot).filter(([k]) => !/^carried/.test(k)).every(([, x]) => x.slide <= SLIDE)},
  jointLimits: {violations: limits, total: Object.values(limits).reduce((a, b) => a + b, 0), pass: Object.values(limits).every(x => x === 0)},
  phases: {rule: 'anticipation 15–25 % of the verb; opposite motion ≥ max(2°, 15 % stroke); overshoot 8–16 % of the stroke', perVerb: phases, pass: Object.values(phases).every(p => p.pass)},
  silhouette: {threshold: XOR, measure: 'XOR(KEY, rest) / rest area, 300×375 magenta, no AA, same camera; idle_alive exempt', perVerb: sil, min: sil ? Math.min(...Object.entries(sil).filter(([k]) => k !== 'idle_alive').map(([, s]) => s.xor)) : null,
    failing: sil ? Object.entries(sil).filter(([, s]) => !s.pass).map(([k, s]) => `${k} ${s.xor}`) : null, pass: sil ? Object.values(sil).every(s => s.pass) : null},
  life, fixes: {...fixes, pass: Object.values(fixes).every(x => x.pass)},
  determinism: render ? {...render.determinism, pass: render.determinism.identical === render.determinism.of} : null,
  info: {wristArcs: arcs, overlap: {headLeadFrames: A.LEAD * FPS, handLagFrames: A.LAG * FPS}, comfortReach: A.REACH6.comfort_kneel, overshootEase: A.OS, footRollMargin: A.ROLL_MARGIN},
};
g.pass = ['footSlide', 'jointLimits', 'phases', 'silhouette', 'life', 'fixes', 'determinism'].every(k => g[k]?.pass);
await writeFile('review/acting6/gates.json', JSON.stringify(g, null, 1));
console.log(JSON.stringify({pass: g.pass, slideMax: g.footSlide.max, joints: g.jointLimits.total, phases: g.phases.pass, phaseFails: Object.entries(phases).filter(([, p]) => !p.pass).map(([k]) => k),
  silhouetteMin: g.silhouette.min, silFails: g.silhouette.failing, life: g.life.pass, fixes: Object.fromEntries(Object.entries(fixes).map(([k, v]) => [k, v.pass])), determinism: g.determinism && `${g.determinism.identical}/${g.determinism.of}`, arcMin: Math.min(...Object.values(arcs).map(a => a.bow))}));
