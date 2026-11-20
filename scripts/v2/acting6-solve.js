// scripts/v2/acting6-solve.js — authoring-time pose search for acting v6 (P3b). Not part of the render path: it prints pose numbers that are
// pasted into engine/acting6.js as data (results frozen, so the engine stays pure and deterministic). Seeded random search + hill climbing
// over pure acting6 functions (arm IK, FK, sampled box penetration).
//   node scripts/v2/acting6-solve.js hug [kp=.82] [evals]     (two actors: arms onto each other's backs, no penetration)
//   node scripts/v2/acting6-solve.js cross [evals]            (arms_cross: stacked forearms, hands on the opposite upper arms)
import * as A from '../../engine/acting6.js';

const what = process.argv[2], KP = +(process.argv[3] ?? .82), N = +(process.argv[4] ?? 40000);
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, U = (a, b) => a + (b - a) * rnd(), G = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return (s - 3) / Math.sqrt(.5); };
const D = Math.PI / 180, add3 = (a, b) => a.map((x, i) => x + b[i]), mv3 = (R, v) => R.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]), dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const unit = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };

if (what === 'hug') {
  // q: lead lean / dz / waist, partner placement, per-arm back targets (x, y local to the other's upper torso) and pole angles (a, b)
  const KEYS = ['ldz', 'llean', 'lwx', 'pdz', 'plean', 'pwx', 'px', 'pz', 'pyaw', 'lux', 'luy', 'luz', 'pux', 'puy', 'puz', 'lpa', 'lpb', 'rpa', 'rpb', 'spa', 'spb', 'tpa', 'tpb', 'ldy', 'lfz', 'rfz', 'pfz', 'qfz', 'fxs'];
  const LO = [0, 0, 0, 0, 0, 0, -.6, .6, -30, .3, 1.5, -.5, .1, .1, -.4, -3.2, -3.2, -3.2, -3.2, -3.2, -3.2, -3.2, -3.2, -1.0, -1.2, -1.2, -1.2, -1.2, 0], HI = [.8, 30, 40, .5, 20, 30, .6, 2.0, 30, 1.2, 2.6, .5, .95, 1.4, .6, 3.2, 3.2, 3.2, 3.2, 3.2, 3.2, 3.2, 3.2, 0, 1.0, 1.0, 1.0, 1.0, .5];
  const poleOf = (a, b) => [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
  const build = v => {
    const q = Object.fromEntries(KEYS.map((k, i) => [k, v[i]]));
    const L = {...A.REST, 'root.dz': q.ldz, 'root.dy': q.ldy, 'root.lean': q.llean, 'waist.x': q.lwx, 'lf.z': q.lfz, 'rf.z': q.rfz, 'lf.x': -.98 / 2 - q.fxs, 'rf.x': .98 / 2 + q.fxs}, P0 = {...A.REST, 'root.dz': q.pdz, 'root.lean': q.plean, 'waist.x': q.pwx, 'lf.z': q.pfz, 'rf.z': q.qfz};
    const at = [q.px, 0, q.pz], yaw = Math.PI + q.pyaw * D, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const lw = A.fk(A.solve(L).sample).waist, pw = A.fk(A.solve(P0).sample).waist;
    const toWorldP = p => [at[0] + KP * (p[0] * cs + p[2] * sn), at[1] + KP * p[1], at[2] + KP * (-p[0] * sn + p[2] * cs)];
    const toPartnerLocal = w => { const d = [w[0] - at[0], w[1] - at[1], w[2] - at[2]]; return [(d[0] * cs - d[2] * sn) / KP, d[1] / KP, (d[0] * sn + d[2] * cs) / KP]; };
    let ch = L, cp = P0; const targets = [];
    for (const sx of [-1, 1]) { const side = sx < 0 ? 'left' : 'right', i = sx < 0 ? 'l' : 'r';
      const tp = toWorldP(add3(pw.p, mv3(pw.R, [sx * q.lux, q.luy, q.luz])));   // lead hand → on top of the partner's shoulder / upper back (partner frame)
      ch = A.reachPose(ch, side, tp, poleOf(q[sx < 0 ? 'lpa' : 'rpa'], q[sx < 0 ? 'lpb' : 'rpb'])); targets.push(['lead', side, tp]);
      const tl = add3(lw.p, mv3(lw.R, [sx * (1 + .13 / KP), q.puy, q.puz]));   // partner hand → the lead's side (ribs)
      cp = A.reachPose(cp, side, toPartnerLocal(tl), poleOf(q[sx < 0 ? 'spa' : 'tpa'], q[sx < 0 ? 'spb' : 'tpb'])); targets.push(['partner', side, tl]);
    }
    return {q, ch, cp, at, yaw, targets};
  };
  const cost = v => {
    const m = build(v), a = A.solve(m.ch).sample, b = A.solve(m.cp).sample, pa = A.placeBoxes(A.bodyBoxes(a), {}), pb = A.placeBoxes(A.bodyBoxes(b), {at: m.at, yaw: m.yaw, k: KP});
    const notArmTorso = (x, y) => !(/Forearm|Hand|UpperArm/.test(x) && /torso|lowerTorso/.test(y)) && !(/Forearm|Hand|UpperArm/.test(y) && /torso|lowerTorso/.test(x));
    const pen = A.penetration(pa, pb, {skip: (x, y) => !notArmTorso(x, y)}), penA = A.penetration(pa, pb, {skip: notArmTorso}); let miss = 0;   // pen: everything but arm↔torso; penA: arm↔torso only
    for (const [who, side, t] of m.targets) { const h = who === 'lead' ? A.fk(a)[side + 'Hand'].p : (() => { const p = A.fk(b)[side + 'Hand'].p, c = Math.cos(m.yaw), s = Math.sin(m.yaw); return [m.at[0] + KP * (p[0] * c + p[2] * s), KP * p[1], m.at[2] + KP * (-p[0] * s + p[2] * c)]; })(); miss += dist(h, t); }
    const self = A.penetration(pa, pa, {skip: (x, y) => x === y || !/Hand|Forearm|UpperArm/.test(x + y)}).depth * 0;   // (self collision not measured here)
    return {c: pen.depth * 20 + pen.sum * .6 + penA.depth * 12 + penA.sum * .3 + miss * 4 + (m.q.pz - 1.0) * .3, pen, penA, miss, m};
  };
  let best = null;
  // hand-tuned start: the lead stoops over a kid, forearms go OVER her shoulders (outside her head) and down onto her upper back; she holds the lead's lower back
  const INIT = {ldz: .35, llean: 12, lwx: 28, pdz: 0, plean: 0, pwx: 0, px: 0, pz: 1.0, pyaw: 0, lux: .95, luy: 1.9, luz: -.1, pux: .6, puy: .6, puz: .1, ldy: -.3, lfz: 0, rfz: 0, pfz: 0, qfz: 0, fxs: 0, lpa: Math.PI, lpb: .3, rpa: 0, rpb: .3, spa: Math.PI, spb: -.3, tpa: 0, tpb: -.3};
  for (let r = 0; r < 12; r++) {   // restarts: the first four from the tuned start (jittered), the rest random
    let v = r < 4 ? KEYS.map((k, i) => Math.min(HI[i], Math.max(LO[i], INIT[k] + (r ? G() * (HI[i] - LO[i]) * .05 : 0)))) : KEYS.map((_, i) => U(LO[i], HI[i])), c = cost(v), sig = 1;
    for (let i = 0; i < N / 12; i++) { const w = v.map((x, k) => rnd() < .3 ? Math.min(HI[k], Math.max(LO[k], x + G() * (HI[k] - LO[k]) * .08 * sig)) : x), cw = cost(w); if (cw.c < c.c) { v = w; c = cw; } if (i % 500 === 499) sig *= .8; }
    if (!best || c.c < best.c.c) { best = {v, c}; console.log('restart', r, 'cost', c.c.toFixed(3), 'pen(other)', c.pen.depth, c.pen.pair, 'arm→torso', c.penA.depth, c.penA.pair, 'miss', c.miss.toFixed(3), 'pz', v[7].toFixed(2)); }
  }
  console.log(JSON.stringify(Object.fromEntries(KEYS.map((k, i) => [k, +best.v[i].toFixed(3)]))));
}

if (what === 'cross') {
  // per arm: IK target of the hand (chest frame) + pole (a, b); the left forearm is the high / rear one, the right the low / front one.
  // Blocky arms cannot fold across a 2-wide chest without sinking into it (shoulders 3 apart, forearm 1 long), so the torso overlap is allowed
  // up to 0.35 and the forearms must protrude ≥ 0.25 in front of the chest.
  const KEYS = ['lx', 'ly', 'lz', 'la', 'lb', 'rx', 'ry', 'rz', 'ra', 'rb', 'wx', 'sx'], LO = [-1.9, 1.0, .5, -3.2, -3.2, -1.9, .5, .5, -3.2, -3.2, 0, 0], HI = [1.9, 2.1, 1.9, 3.2, 3.2, 1.9, 1.9, 1.9, 3.2, 3.2, 14, 0];
  const poleOf = (a, b) => [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
  const build = v => { const q = Object.fromEntries(KEYS.map((k, i) => [k, v[i]])); let ch = {...A.REST, 'waist.x': q.wx};
    const w = A.fk(A.solve(ch).sample).waist, W = p => add3(w.p, mv3(w.R, p));
    ch = A.reachPose(ch, 'left', W([q.lx, q.ly, q.lz]), poleOf(q.la, q.lb)); ch = A.reachPose(ch, 'right', W([q.rx, q.ry, q.rz]), poleOf(q.ra, q.rb)); return {q, ch}; };
  const dseg = (p, a, b) => { const ab = b.map((x, i) => x - a[i]), t = Math.max(0, Math.min(1, ab.reduce((s2, x, i) => s2 + x * (p[i] - a[i]), 0) / ab.reduce((s2, x) => s2 + x * x, 0))); return Math.hypot(...p.map((x, i) => x - (a[i] + t * ab[i]))); };
  const cost = v => { const {q, ch} = build(v), s = A.solve(ch).sample, f = A.fk(s), boxes = A.placeBoxes(A.bodyBoxes(s), {});
    const mid = side => f[side + 'Elbow'].p.map((x, i) => (x + f[side + 'Wrist'].p[i]) / 2), ml = mid('left'), mr = mid('right');
    const torso = boxes.filter(b => b.n === 'torso' || b.n === 'lowerTorso'); let pen = 0; for (const a of boxes.filter(b => /Forearm|Hand/.test(b.n))) pen = Math.max(pen, A.penetration([a], torso).depth);
    const e1 = Math.abs((ml[1] - mr[1]) - .25) + Math.abs((mr[2] - ml[2]) - .2), protr = Math.max(0, .75 - Math.min(ml[2], mr[2]) + .0);
    const up = side => [f[side + 'Shoulder'].p, f[side + 'Elbow'].p], hd = dseg(f.leftHand.p, ...up('right')) + dseg(f.rightHand.p, ...up('left'));
    const el = [s.pivots.leftElbow[0], s.pivots.rightElbow[0]].map(x => -x / D), bad = el.reduce((a, e) => a + Math.max(0, 55 - e) + Math.max(0, e - 135), 0) / 30;
    return {c: Math.max(0, pen - .35) * 12 + e1 * 6 + hd * 3 + protr * 4 + bad, pen, e1, hd, protr, ml, mr, q, ch}; };
  let best = null;
  for (let r = 0; r < 10; r++) { let v = KEYS.map((_, i) => U(LO[i], HI[i])), c = cost(v), sig = 1;
    for (let i = 0; i < N / 10; i++) { const w = v.map((x, k) => rnd() < .35 ? Math.min(HI[k], Math.max(LO[k], x + G() * (HI[k] - LO[k]) * .08 * sig)) : x), cw = cost(w); if (cw.c < c.c) { v = w; c = cw; } if (i % 400 === 399) sig *= .8; }
    if (!best || c.c < best.c.c) { best = {v, c}; console.log('restart', r, 'cost', c.c.toFixed(3), 'pen', c.pen, 'offset err', c.e1.toFixed(3), 'hand→upper arm', c.hd.toFixed(3), 'protrusion miss', c.protr.toFixed(3)); } }
  const ch = best.c.ch, out = {}; for (const k of ['leftShoulder.x', 'leftShoulder.y', 'leftShoulder.z', 'leftElbow.x', 'rightShoulder.x', 'rightShoulder.y', 'rightShoulder.z', 'rightElbow.x', 'waist.x']) out[k] = +ch[k].toFixed(1);
  console.log(JSON.stringify(out), 'dy', (best.c.ml[1] - best.c.mr[1]).toFixed(3), 'dz', (best.c.mr[2] - best.c.ml[2]).toFixed(3));
}

// ---- carry: piggyback (kid partner, kp .82) and hip-carry (small kid, kp .62) -------------------------------------------------
const dumpCh = ch => Object.fromEntries(Object.entries(ch).filter(([k, v]) => typeof v === 'number' && Math.abs(v - (A.REST[k] ?? 0)) > 1e-6).map(([k, v]) => [k, +v.toFixed(3)]));
const search = ({KEYS, LO, HI, INIT: INIT0 = {}, cost, evals, restarts = 8, log = true}) => {
  const INIT = process.env.INITV ? {...INIT0, ...JSON.parse(process.env.INITV)} : INIT0, SIG0 = +(process.env.SIG0 ?? 1);   // INITV: refine a found vector (jittered restarts) with a smaller step SIG0
  if (process.env.VEC) { const q = JSON.parse(process.env.VEC), c = cost(KEYS.map(k => q[k])); console.log(JSON.stringify(c.info)); console.log('LEAD', JSON.stringify(dumpCh(c.m.L))); console.log('PARTNER', JSON.stringify(dumpCh(c.m.P))); console.log('EXTRA', JSON.stringify({origin: c.m.origin, yaw: c.m.yaw})); return; }
  let best = null;
  for (let r = 0; r < restarts; r++) {
    let v = KEYS.map((k, i) => k in INIT && (r < 3 || process.env.INITV) ? Math.min(HI[i], Math.max(LO[i], INIT[k] + (r ? G() * (HI[i] - LO[i]) * .03 : 0))) : U(LO[i], HI[i])), c = cost(v), sig = SIG0;
    for (let i = 0; i < evals / restarts; i++) { const w = v.map((x, k) => rnd() < .3 ? Math.min(HI[k], Math.max(LO[k], x + G() * (HI[k] - LO[k]) * .08 * sig)) : x), cw = cost(w); if (cw.c < c.c) { v = w; c = cw; } if (i % 400 === 399) sig *= .85; }
    if (!best || c.c < best.c.c) { best = {v, c}; if (log) console.log('restart', r, 'cost', c.c.toFixed(3), JSON.stringify(c.info), JSON.stringify(Object.fromEntries(KEYS.map((k, i) => [k, +v[i].toFixed(2)])))); }
  }
  console.log(JSON.stringify(Object.fromEntries(KEYS.map((k, i) => [k, +best.v[i].toFixed(2)]))));
  return best;
};
const placeP = (sample, at, yaw, kp) => A.placeBoxes(A.bodyBoxes(sample), {at, yaw, k: kp});
const worldP = (p, at, yaw, kp) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [at[0] + kp * (p[0] * c + p[2] * s), at[1] + kp * p[1], at[2] + kp * (-p[0] * s + p[2] * c)]; };
const lowestOf = (boxes, re) => Math.min(...boxes.filter(b => re.test(b.n)).flatMap(b => [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => { const w = A.placeBoxes([b], {})[0]; return w.c[1] + w.R[1][0] * x * w.h[0] + w.R[1][1] * y * w.h[1] + w.R[1][2] * z * w.h[2]; })))));
if (what === 'pig') {
  const KP = KP_ARG();
  const KEYS = ['llean', 'lwx', 'ldz', 'ldy', 'pz', 'py', 'plean', 'pwx', 'hx', 'hz', 'kn', 'psx', 'psz', 'pel', 'phd', 'lpa', 'lpb', 'rpa', 'rpb'];
  const LO = [0, 0, -.2, -.5, -1.7, 0, 0, -10, -125, 5, 20, -140, 5, -120, -30, -3.2, -3.2, -3.2, -3.2], HI = [26, 28, .5, 0, -.5, 2.8, 42, 25, -30, 65, 130, 0, 85, -3, 20, 3.2, 3.2, 3.2, 3.2];
  const poleOf = (a, b) => [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
  const build = v => { const q = Object.fromEntries(KEYS.map((k, i) => [k, v[i]]));
    const P0 = {...A.REST, ik: 0, 'root.lean': q.plean, 'waist.x': q.pwx, 'leftHip.x': q.hx, 'rightHip.x': q.hx, 'leftHip.z': -q.hz, 'rightHip.z': q.hz, 'leftKnee.x': q.kn, 'rightKnee.x': q.kn,
      'leftShoulder.x': q.psx, 'rightShoulder.x': q.psx, 'leftShoulder.z': -q.psz, 'rightShoulder.z': q.psz, 'leftElbow.x': q.pel, 'rightElbow.x': q.pel, 'head.x': q.phd};
    const ps = A.solve(P0).sample, at = [0, q.py, q.pz], fkp = A.fk(ps);
    let L = {...A.REST, 'root.lean': q.llean, 'waist.x': q.lwx, 'root.dz': q.ldz, 'root.dy': q.ldy};
    for (const sx of [-1, 1]) { const side = sx < 0 ? 'left' : 'right', hip = fkp[side + 'Hip'].p, kn = fkp[side + 'Knee'].p, th = hip.map((x, i) => x + .65 * (kn[i] - x));
      const t = worldP([th[0], th[1] - .5 - .13 / KP, th[2]], at, 0, KP); L = A.reachPose(L, side, t, poleOf(q[sx < 0 ? 'lpa' : 'rpa'], q[sx < 0 ? 'lpb' : 'rpb'])); L['t' + side] = t; }
    return {q, P0, L, ps, at}; };
  const cost = v => { const m = build(v), a = A.solve(m.L).sample, la = A.placeBoxes(A.bodyBoxes(a), {}), pb = placeP(m.ps, m.at, 0, KP);
    const pen = A.penetration(la, pb, {skip: (x, y) => /Hand/.test(x) && /Thigh|Shin/.test(y) || /Hand/.test(y) && /Thigh|Shin/.test(x)});
    let miss = 0; const f = A.fk(a); for (const side of ['left', 'right']) miss += Math.hypot(...f[side + 'Hand'].p.map((x, i) => x - m.L['t' + side][i]));
    const low = lowestOf(pb, /Foot|Shin/), air = Math.max(0, .35 - low), close = Math.abs(m.q.pz + .5 + .5 * KP) * .8;
    const hipY = m.at[1] + KP * 2.0, hipTerm = Math.abs(hipY - 2.5) * 5, footTerm = Math.max(0, low - 1.8) * 3;
    return {c: pen.depth * 14 + pen.sum * .5 + miss * 4 + air * 6 + hipTerm + footTerm + (m.q.pz + 1.4) * .15, info: {pen: pen.depth, pair: pen.pair, miss: +miss.toFixed(3), lowestFoot: +low.toFixed(2)}, m}; };
  const INIT = {llean: 18, lwx: 12, ldz: 0, ldy: -.1, pz: -.95, py: 1.0, plean: 20, pwx: 5, hx: -75, hz: 28, kn: 85, psx: -85, psz: 25, pel: -80, phd: 5, lpa: .2, lpb: -.6, rpa: 2.9, rpb: -.6};
  search({KEYS, LO, HI, INIT, cost, evals: N, restarts: 6});
}
function KP_ARG() { return KP; }

// ---- side hug: shoulder to shoulder, each inner arm around the other's back, outer arms hanging --------------------------------
if (what === 'side') {
  const KEYS = ['px', 'pz', 'pyaw', 'lroll', 'proll', 'ldz', 'pdz', 'lu', 'ly', 'pu', 'py', 'lpa', 'lpb', 'ppa', 'ppb', 'llean', 'plean', 'lyaw'];
  const LO = [1.9, -.6, -45, -14, -14, -.2, -.2, -.5, .1, -.5, .1, -3.2, -3.2, -3.2, -3.2, 0, 0, -30], HI = [3.6, .6, 45, 0, 14, .4, .4, .8, 1.5, .8, 1.5, 3.2, 3.2, 3.2, 3.2, 12, 12, 30];
  const INIT = {px: 2.8, pz: 0, pyaw: -15, lroll: -6, proll: 6, ldz: 0, pdz: 0, lu: .2, ly: .9, pu: .2, py: .9, lpa: 0, lpb: .2, ppa: Math.PI, ppb: .2, llean: 2, plean: 2, lyaw: 10};
  const poleOf = (a, b) => [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
  const build = v => { const q = Object.fromEntries(KEYS.map((k, i) => [k, v[i]]));
    const L0 = {...A.REST, 'root.roll': q.lroll, 'root.dz': q.ldz, 'root.lean': q.llean, 'root.yaw': q.lyaw}, P0 = {...A.REST, 'root.roll': q.proll, 'root.dz': q.pdz, 'root.lean': q.plean};
    const at = [q.px, 0, q.pz], yaw = q.pyaw * D, cs = Math.cos(yaw), sn = Math.sin(yaw), lw = A.fk(A.solve(L0).sample).waist, pw = A.fk(A.solve(P0).sample).waist;
    const toWorldP = p => [at[0] + KP * (p[0] * cs + p[2] * sn), at[1] + KP * p[1], at[2] + KP * (-p[0] * sn + p[2] * cs)];
    const toPartnerLocal = w => { const d = [w[0] - at[0], w[1] - at[1], w[2] - at[2]]; return [(d[0] * cs - d[2] * sn) / KP, d[1] / KP, (d[0] * sn + d[2] * cs) / KP]; };
    const tp = toWorldP(add3(pw.p, mv3(pw.R, [q.pu, q.py, -.5 - .14]))), tl = add3(lw.p, mv3(lw.R, [q.lu, q.ly, -.5 - .14 / KP]));
    const L = A.reachPose(L0, 'right', tp, poleOf(q.lpa, q.lpb)), Pc = A.reachPose(P0, 'left', toPartnerLocal(tl), poleOf(q.ppa, q.ppb));
    return {q, L, Pc, at, yaw, tp, tl}; };
  const cost = v => { const m = build(v), a = A.solve(m.L).sample, b = A.solve(m.Pc).sample, pa = A.placeBoxes(A.bodyBoxes(a), {}), pb = A.placeBoxes(A.bodyBoxes(b), {at: m.at, yaw: m.yaw, k: KP});
    const pen = A.penetration(pa, pb), ha = A.fk(a).rightHand.p, hb = (() => { const p = A.fk(b).leftHand.p, c = Math.cos(m.yaw), s = Math.sin(m.yaw); return [m.at[0] + KP * (p[0] * c + p[2] * s), KP * p[1], m.at[2] + KP * (-p[0] * s + p[2] * c)]; })();
    const miss = dist(ha, m.tp) + dist(hb, m.tl); return {c: pen.depth * 14 + miss * 5 + (m.q.px - 2.2) * .1, info: {pen: pen.depth, pair: pen.pair, miss: +miss.toFixed(3), px: +m.q.px.toFixed(2)}, m}; };
  search({KEYS, LO, HI, INIT, cost, evals: N, restarts: 10});
}

// ---- carry, structured: the partner's hip pivot is a fixed point in the lead's CHEST frame; her root pitch follows the chest ------------------------
if (what === 'pig2') {
  const mvv = (R, v) => R.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]), sub = (a, b) => a.map((x, i) => x - b[i]);
  const KEYS = ['lean', 'wx', 'ldy', 'hy', 'hz', 'hx', 'hzs', 'kn', 'psx', 'psz', 'pel', 'phd', 'pwx', 'tu', 'pa1', 'pb1'];
  const LO = [8, 0, -.1, -.4, -1.6, -125, 0, 10, -150, 0, -140, -30, -10, .3, -3.2, -3.2], HI = [26, 25, 0, 1.2, -.6, -20, 85, 140, 0, 80, -5, 25, 25, .95, 3.2, 3.2];
  const INIT = {lean: 16, wx: 10, ldy: -.08, hy: .55, hz: -.95, hx: -70, hzs: 60, kn: 80, psx: -80, psz: 22, pel: -60, phd: 6, pwx: 0, tu: .65, pa1: -2.8, pb1: -1.0};
  const poleOf = (a, b) => [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
  const build = v => { const q = Object.fromEntries(KEYS.map((k, i) => [k, v[i]]));
    const L0 = {...A.REST, 'root.lean': q.lean, 'waist.x': q.wx, 'root.dy': q.ldy, 'head.x': -14}, W = A.fk(A.solve(L0).sample).waist, H = add3(W.p, mvv(W.R, [0, q.hy, q.hz])), origin = sub(H, [0, 2 * KP, 0]);
    const P0 = {...A.REST, ik: 0, 'root.lean': q.lean + q.wx, 'waist.x': q.pwx, 'leftHip.x': q.hx, 'rightHip.x': q.hx, 'leftHip.z': -q.hzs, 'rightHip.z': q.hzs, 'leftKnee.x': q.kn, 'rightKnee.x': q.kn,
      'leftShoulder.x': q.psx, 'rightShoulder.x': q.psx, 'leftShoulder.z': -q.psz, 'rightShoulder.z': q.psz, 'leftElbow.x': q.pel, 'rightElbow.x': q.pel, 'head.x': q.phd};
    const ps = A.solve(P0).sample, pf = A.fk(ps), wp = p => add3(origin, p.map(x => x * KP)); let L = L0; const tg = {};
    for (const side of ['left', 'right']) { const hip = pf[side + 'Hip'].p, kn = pf[side + 'Knee'].p, th = hip.map((x, i) => x + q.tu * (kn[i] - x)); tg[side] = wp([th[0], th[1] - .5 - .13 / KP, th[2]]);
      const pl = poleOf(q.pa1, q.pb1); L = A.reachPose(L, side, tg[side], side === 'left' ? pl : [-pl[0], pl[1], pl[2]]); }
    return {q, L, P: P0, ps, origin, tg}; };
  const cost = v => { const m = build(v), a = A.solve(m.L).sample, la = A.placeBoxes(A.bodyBoxes(a), {}), pb = A.placeBoxes(A.bodyBoxes(m.ps), {at: m.origin, yaw: 0, k: KP});
    const skip = (x, y) => /Hand/.test(x) && /Thigh|Shin/.test(y) || /Hand/.test(y) && /Thigh|Shin/.test(x), pen = A.penetration(la, pb, {skip}), f = A.fk(a);
    const miss = ['left', 'right'].reduce((s, side) => s + Math.hypot(...f[side + 'Hand'].p.map((x, i) => x - m.tg[side][i])), 0), low = lowestOf(pb, /Foot|Shin/), air = Math.max(0, .45 - low), hipY = m.origin[1] + KP * 2;
    return {c: pen.depth * 16 + pen.sum * .5 + miss * 12 + air * 5 + Math.abs(hipY - 2.9) * 4 + Math.max(0, low - 2.0) * 4, info: {pen: pen.depth, pair: pen.pair, miss: +miss.toFixed(3), low: +low.toFixed(2), hipY: +hipY.toFixed(2)}, m}; };
  search({KEYS, LO, HI, INIT, cost, evals: N, restarts: 8});
}

// ---- hip carry (small kid, kp .62): she sits on the lead's +x hip, one arm round his neck, his near arm round her back --------------------------------
if (what === 'hip2') {
  const mvv = (R, v) => R.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]), sub = (a, b) => a.map((x, i) => x - b[i]);
  const KEYS = ['lroll', 'llean', 'ldy', 'hx', 'hy', 'hz', 'pyaw', 'proll', 'plean', 'hip', 'hsp', 'kn', 'phd', 'nx', 'ny', 'nz', 'bu', 'by', 'pa', 'pb', 'qa', 'qb', 'fa', 'fb'];
  const LO = [-14, 0, -.1, .7, 1.6, -.5, -100, -25, -10, -110, -5, 10, -25, .2, 1.3, -.5, -.5, .1, -3.2, -3.2, -3.2, -3.2, -3.2, -3.2], HI = [0, 8, 0, 2.0, 3.3, .7, 100, 25, 25, -20, 45, 120, 20, 1.2, 1.9, .6, .6, 1.3, 3.2, 3.2, 3.2, 3.2, 3.2, 3.2];
  const HEADY = +(process.env.HEADY ?? 0), ROCK = +(process.env.ROCK ?? 0), SQ = +(process.env.SQ ?? 0);   // lead head turn toward the partner; robustness states: chest rock ±ROCK° and squeeze SQ on BOTH actors
  const STAND = !!process.env.STAND;   // side hug: she stands on the ground beside him (legs straight, feet planted), same arms
  if (STAND) { const set = (k, a, b) => { const i = KEYS.indexOf(k); LO[i] = a; HI[i] = b; }; set('hy', 2 * KP, 2 * KP); set('hip', 0, 0); set('hsp', 0, 0); set('kn', 0, 0); set('ldy', 0, 0); set('hx', 1.9, 3.4); set('hz', -.6, .6); }
  const INIT = {lroll: -6, llean: 2, ldy: -.04, hx: 1.25, hy: 2.6, hz: .1, pyaw: -40, proll: 8, plean: 6, hip: -75, hsp: 15, kn: 70, phd: 0, nx: .5, ny: 1.55, nz: -.1, bu: -.1, by: .6, pa: 1.5, pb: .3, qa: 0, qb: .3, fa: 1.6, fb: -.5};
  const poleOf = (a, b) => [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
  const build = v => { const q = Object.fromEntries(KEYS.map((k, i) => [k, v[i]]));
    const L0 = {...A.REST, 'root.roll': q.lroll, 'root.lean': q.llean, 'root.dy': q.ldy, 'head.y': HEADY}, lsol = A.solve(L0).sample, lfk = A.fk(lsol), lw = lfk.waist;
    const origin = [q.hx, q.hy - 2 * KP, q.hz], yaw = q.pyaw * D, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const P0 = {...A.REST, ik: STAND ? 1 : 0, 'root.roll': q.proll, 'root.lean': q.plean, 'leftHip.x': q.hip, 'rightHip.x': q.hip, 'leftHip.z': -q.hsp, 'rightHip.z': q.hsp, 'leftKnee.x': q.kn, 'rightKnee.x': q.kn, 'head.x': q.phd};
    const toPartnerLocal = w => { const d = [w[0] - origin[0], w[1] - origin[1], w[2] - origin[2]]; return [(d[0] * cs - d[2] * sn) / KP, d[1] / KP, (d[0] * sn + d[2] * cs) / KP]; };
    // her hand → round the lead's neck (chest frame point); her other arm hangs
    const neck = add3(lw.p, mvv(lw.R, [q.nx, q.ny, q.nz])); let P = A.reachPose(P0, 'left', toPartnerLocal(neck), poleOf(q.pa, q.pb)); P = A.reachPose(P, 'right', toPartnerLocal(add3(lw.p, mvv(lw.R, [q.nx * .2, q.ny - .1, q.nz + .2]))), poleOf(q.qa, q.qb));
    const ps = A.solve(P).sample, pw = A.fk(ps).waist, wp = p => [origin[0] + KP * (p[0] * cs + p[2] * sn), origin[1] + KP * p[1], origin[2] + KP * (-p[0] * sn + p[2] * cs)];
    const back = wp(add3(pw.p, mvv(pw.R, [q.bu, q.by, -.5 - .14]))); let L = A.reachPose(L0, 'right', back, poleOf(q.fa, q.fb)); L = A.reachPose(L, 'left', add3(lw.p, mvv(lw.R, [-1.55, -.55, .05])), [-1, -.3, 0]);
    return {q, L, P, ps, origin, yaw, back, neck}; };
  const cost = v => { const m = build(v), a = A.solve(m.L).sample, la0 = A.placeBoxes(A.bodyBoxes(a), {}), pb0 = A.placeBoxes(A.bodyBoxes(m.ps), {at: m.origin, yaw: m.yaw, k: KP});
    let pen = A.penetration(la0, pb0);   // nominal, then the rock / squeeze extremes (the verb's squeeze beat and the moving hold must not push the arms into her)
    for (const r of ROCK ? [ROCK, -ROCK] : []) { const Ls = {...m.L, 'waist.z': m.L['waist.z'] + r, 'torso.sq': SQ}, Ps = {...m.P, 'waist.z': m.P['waist.z'] + r, 'torso.sq': SQ};
      const ls = A.solve(Ls).sample, pss = A.solve(Ps).sample, q2 = A.penetration(A.placeBoxes(A.bodyBoxes(ls), {}), A.placeBoxes(A.bodyBoxes(pss), {at: m.origin, yaw: m.yaw, k: KP})); if (q2.depth > pen.depth) pen = {...q2, sum: Math.max(pen.sum, q2.sum)}; }
    const la = la0, pb = pb0; let f = A.fk(a), miss = Math.hypot(...f.rightHand.p.map((x, i) => x - m.back[i])), pf = A.fk(m.ps), pl = (p => [m.origin[0] + KP * (p[0] * Math.cos(m.yaw) + p[2] * Math.sin(m.yaw)), m.origin[1] + KP * p[1], m.origin[2] + KP * (-p[0] * Math.sin(m.yaw) + p[2] * Math.cos(m.yaw))]),
      pmiss = Math.hypot(...pl(pf.leftHand.p).map((x, i) => x - m.neck[i])), low = lowestOf(pb, /Foot|Shin/), air = STAND ? 0 : Math.max(0, .3 - low), hipY = m.origin[1] + 2 * KP;
    const cam = (+(process.env.CAM ?? 8)) * D, vis = A.faceVisibility(a, [Math.sin(cam), 0, Math.cos(cam)], pb0).hidden;   // the hero's face stays visible from the verb's camera
    return {c: pen.depth * 16 + pen.sum * .5 + miss * 8 + pmiss * 6 + air * 5 + (STAND ? 0 : Math.max(0, low - 1.5) * 2) + Math.max(0, vis - .08) * 12, info: {pen: pen.depth, pair: pen.pair, miss: +miss.toFixed(3), pmiss: +pmiss.toFixed(3), low: +low.toFixed(2), hipY: +hipY.toFixed(2), faceHidden: vis}, m}; };
  search({KEYS, LO, HI, INIT, cost, evals: N, restarts: 8});
}
