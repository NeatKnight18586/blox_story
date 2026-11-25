// engine/camtpl.js — tuft 4C camera TEMPLATES (opt-in shot `tpl` under spec camera 'cine'; Brief notes `tpl: <kind> [args]`).
// Pure: no three, no DOM, no clock, no Math.random. The camera is solved EVERY FRAME from the subject's live position + facing:
//   establish | wide | ms | mcu | cu | ecu      an actor (or beast) subject: size band (frame height at the subject = v × its height,
//                                              ecu: vHead × its head height), a 3/4 yaw off its (smoothed) facing, eyes on the upper
//                                              third + lead room (engine/cine.js framingTarget), the whole head in frame and above the
//                                              caption band (cine headBox / fitShift: aim shift, then back off)
//   ots <partner>                              behind the partner's shoulder looking at the subject; both heads in frame
//   two <a> <b>                                square to the a–b line on the side they face; both heads in frame
//   insert <prop>                              the prop fills `fill` of the frame height, from above at `rise`
//   beastHero <beast>                          camera at ≤ kid-eye height (camH), looking up; the beast fills `share` of the frame height
//   beastFace <beast>                          head + eyes fill (frame height = vHead × the beast's head height)
// MOVES ride on top (moveMods): parameter offsets that END on (push, crashZoom, whip, snap, dollyZoom) or are CENTRED on (orbit) or
// START from (drone) the template pose, so the template framing is what the move lands on; track = the live follow itself.
// OCCLUSION (solveShot): rays from every checked head (prop / beast head) to the camera (ctx.clear) + a camera clearance test (ctx.free)
// on sampled times of the whole shot; the camera swings around the subject in 15° steps, then pulls in, until all samples are clear
// (one swing / pull per shot: no pops); a per-frame safety pulls in further if a frame between samples is still blocked.
// ctx: {fps, aspect, subjectAt(name, lt) → {eyes, headH, H, foot: [x,y,z], face: [x,z]} | null, propAt(name, lt) → {centre, H} | null,
//       groundAt(x, z), clear(from, to, ignore[]) → bool, free(p) → bool, cacheKey}
import {lensFov, aimAt, framingTarget, headBox, fitShift, project} from './cine.js';
import {EASE, CRASH, SNAP_FRAMES} from './camera.js';

export const KINDS = ['establish', 'wide', 'ms', 'mcu', 'cu', 'ecu', 'ots', 'two', 'insert', 'beastHero', 'beastFace'];
export const TPL = {
  establish: {lens: 24, v: 6.5, yaw: 35, rise: 14},   // v: frame height at the subject ÷ its height; yaw: degrees off its facing; rise: camera elevation seen from the head (deg)
  wide: {lens: 24, v: 2.3, yaw: 28, rise: 4},
  ms: {lens: 35, v: 1.05, yaw: 24, rise: 0},
  mcu: {lens: 50, v: .85, yaw: 22, rise: 0},
  cu: {lens: 85, v: .65, yaw: 20, rise: 0},
  ecu: {lens: 85, vHead: 1.9, yaw: 14, rise: 0},
  ots: {lens: 35, back: 3, side: 1.2, drop: .25},   // back: studs beyond the partner's head on the subject → partner line; side: off its shoulder; drop: below its eyes (× head height)
  two: {lens: 35, yaw: 0, rise: 2, pad: 1.35, v: 1.1},
  insert: {lens: 50, fill: .45, yaw: 20, rise: 22},
  beastHero: {lens: 24, share: .7, camH: 1.4, yaw: 22, push: .1},   // push: a shorter push / pull travel (the share stays in .6–.8)   // camH: studs above the ground (a kid's chest: never above 1.6)
  beastFace: {lens: 50, vHead: 2.4, yaw: 12, drop: .1}};
export const SEARCH = {swing: 15, maxSwing: 180, pulls: [1, .8, .64, .5, .4], samples: 7, step: .4, safety: 5, safetyK: .85, smoothFace: .5, headOut: .6};
const D = Math.PI / 180, clamp01 = x => Math.min(1, Math.max(0, x)), add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k], len = a => Math.hypot(a[0], a[1], a[2]), tanK = (fov, k) => 2 / D * Math.atan(Math.tan(fov * D / 2) * k);
export const durOf = (shot, fps = 30) => shot.duration ?? (shot.frames ?? 60) / fps;
export const sideOf = shot => shot.tpl?.side ?? ([...String(shot.id ?? '')].reduce((s, c) => s + c.charCodeAt(0), 0) % 2 ? 1 : -1);
// parse a Brief notes value: "ots juni" | "two juni hero" | "beastHero tuft" | "cu" → {kind, ...} (throws on a bad token)
export function parseTpl(s) {
  const w = String(s).trim().split(/\s+/), kind = w[0];
  if (!KINDS.includes(kind)) throw Error(`tpl: "${kind}" is not a template (${KINDS.join(' | ')})`);
  const need = {ots: 1, two: 2, insert: 1, beastHero: 1, beastFace: 1}[kind] ?? 0;
  if (w.length - 1 < need) throw Error(`tpl: ${kind} needs ${need} name${need > 1 ? 's' : ''}`);
  if (kind === 'ots') return {kind, partner: w[1].toLowerCase()};
  if (kind === 'two') return {kind, a: w[1].toLowerCase(), b: w[2].toLowerCase()};
  if (kind === 'insert') return {kind, prop: w[1]};
  if (kind === 'beastHero' || kind === 'beastFace') return {kind, beast: w[1].toLowerCase()};
  return w[1] ? {kind, who: w[1].toLowerCase()} : {kind};
}
// the template's subject names: the framed one first, then every head that must stay in frame and unoccluded
export function namesOf(shot) {
  const t = shot.tpl; if (t.kind === 'two') return {main: t.a, heads: [t.a, t.b]};
  if (t.kind === 'ots') return {main: t.who ?? shot.subject, heads: [t.who ?? shot.subject], inFrame: [t.partner]};
  if (t.kind === 'beastHero' || t.kind === 'beastFace') return {main: t.beast, heads: [t.beast]};
  if (t.kind === 'insert') return {main: null, prop: t.prop, heads: []};
  return {main: t.who ?? shot.subject, heads: [t.who ?? shot.subject]};
}
// the move as offsets on the template parameters: dist (×), yaw (deg), up (studs), fovK (× tan(fov/2))
export function moveMods(shot, lt, fps = 30) {
  const dur = durOf(shot, fps), u = clamp01(lt / Math.max(1e-6, dur)), e = EASE.inOutCubic(u), m = {dist: 1, yaw: 0, up: 0, fovK: 1};
  switch (shot.move) {
    case 'push': case 'lowAuthority': { const k = TPL[shot.tpl?.kind]?.push ?? .2; m.dist = 1 + k - k * e; break; }
    case 'pull': m.dist = 1 + (TPL[shot.tpl?.kind]?.push ?? .2) * e; break;
    case 'orbit': m.yaw = (shot.tpl?.orbit ?? 30) * (e - .5); break;
    case 'crashZoom': { const k = clamp01((lt - (shot.zoomAt ?? 0)) * fps / CRASH.frames); m.fovK = 1.7 - .7 * EASE.outCubic(k); break; }
    case 'whip': m.yaw = 70 * (1 - EASE.outCubic(clamp01(lt / .3))); break;
    case 'snap': m.dist = 1 + .5 * (1 - clamp01(lt * fps / SNAP_FRAMES)); break;
    case 'dollyZoom': m.dist = 1.6 - .6 * e; m.fovK = 1 / m.dist; break;   // the subject keeps its size, the background stretches
    case 'drone': case 'crane': m.up = 5 * e; m.dist = 1 + .35 * e; m.yaw = shot.move === 'drone' ? 25 * e : 0; break;
    default: break;   // track / gamecam / static: the live template (track = it follows the subject)
  }
  return m;
}
const yawOfFace = f => Math.atan2(f[0], f[1]) / D;
// facing averaged over ±smoothFace s (unit [x, z]); the yaw of a walking subject turns smoothly, not per frame
export function smoothFace(ctx, name, lt, dur) {
  let x = 0, z = 0; for (let k = -2; k <= 2; k++) { const s = ctx.subjectAt(name, Math.min(dur, Math.max(0, lt + k * SEARCH.smoothFace / 2))); if (s?.face) { x += s.face[0]; z += s.face[1]; } }
  const l = Math.hypot(x, z); return l > 1e-6 ? [x / l, z / l] : [0, 1];
}
const ground = (ctx, p, h = .3) => { const g = ctx.groundAt?.(p[0], p[2]) ?? 0; return p[1] < g + h ? [p[0], g + h, p[2]] : p; };
// place the camera at yaw (deg, the direction FROM the subject), horizontal distance dh, height y, then aim + head fit
function fitHeads(pos, target, fov, heads, aspect, pivot, maxBack = 10) {
  for (let n = 0; n <= maxBack; n++) {
    let ok = false;
    for (let i = 0; i < 4; i++) {
      const cam = {position: pos, target, fov}, boxes = heads.map(h => headBox(cam, h.eyes, h.headH, aspect)); if (boxes.some(b => !b)) break;
      const sh = fitShift(boxes); if (Math.abs(sh.x) < 1e-4 && Math.abs(sh.y) < 1e-4) { ok = sh.ok; break; }
      const a = project(cam, pivot, aspect); target = aimAt(pos, pivot, a.x + sh.x, a.y + sh.y, fov, aspect);
    }
    if (ok) return {pos, target, ok: true, back: n};
    pos = add(pivot, scl(sub(pos, pivot), 1.07)); target = add(pivot, scl(sub(target, pivot), 1.07));
  }
  return {pos, target, ok: false, back: maxBack};
}
// beastHero: the share of the frame height between the beast's feet and top from a low camera at horizontal distance dh
export function heroShare(foot, top, yawDeg, dh, camY, fov, aspect) {
  const pos = [foot[0] + Math.sin(yawDeg * D) * dh, camY, foot[2] + Math.cos(yawDeg * D) * dh], mid = [foot[0], (foot[1] + top) / 2, foot[2]], tg = aimAt(pos, mid, 0, 0, fov, aspect), cam = {position: pos, target: tg, fov};
  const a = project(cam, [foot[0], top, foot[2]], aspect), b = project(cam, foot, aspect); return {share: (a.y - b.y) / 2, pos, target: tg};
}
// the pose for one frame given the shot's swing / pull: {position, target, fov, ok (heads fit)}
export function solvePose(shot, lt, ctx, P = {swing: 0, pull: 1}) {
  const t = shot.tpl, K = TPL[t.kind], fps = ctx.fps ?? 30, dur = durOf(shot, fps), aspect = ctx.aspect ?? 9 / 16, mv = moveMods(shot, lt, fps), nm = namesOf(shot), side = sideOf(shot);
  const fov0 = lensFov(K.lens), fov = tanK(fov0, mv.fovK);
  if (t.kind === 'insert') {
    const pr = ctx.propAt(t.prop, lt); if (!pr) return null;
    const yaw = (t.yaw ?? 0) + side * K.yaw + P.swing + mv.yaw, d = pr.H / (K.fill * 2 * Math.tan(fov0 * D / 2)) * P.pull * mv.dist, dh = d * Math.cos(K.rise * D);
    const pos = ground(ctx, [pr.centre[0] + Math.sin(yaw * D) * dh, pr.centre[1] + d * Math.sin(K.rise * D) + mv.up, pr.centre[2] + Math.cos(yaw * D) * dh]);
    return {position: pos, target: aimAt(pos, pr.centre, 0, 0, fov, aspect), fov, ok: true, check: [{p: pr.centre, r: .3 * pr.H, ignore: []}]};
  }
  if (t.kind === 'two') {
    const A = ctx.subjectAt(t.a, lt), B = ctx.subjectAt(t.b, lt); if (!A || !B) return null;
    const mid = scl(add(A.eyes, B.eyes), .5), ax = [B.eyes[0] - A.eyes[0], B.eyes[2] - A.eyes[2]], al = Math.hypot(...ax) || 1, n = [-ax[1] / al, ax[0] / al];
    const fA = smoothFace(ctx, t.a, lt, dur), fB = smoothFace(ctx, t.b, lt, dur), s = Math.sign(n[0] * (fA[0] + fB[0]) + n[1] * (fA[1] + fB[1])) || side;
    const yaw = yawOfFace([n[0] * s, n[1] * s]) + K.yaw + P.swing + mv.yaw, H = Math.max(A.H, B.H), tx = Math.tan(fov0 * D / 2) * aspect;
    const d = Math.max((al + 1.5 * Math.max(A.headH, B.headH)) * K.pad / (2 * tx), K.v * H / (2 * Math.tan(fov0 * D / 2))) * P.pull * mv.dist, dh = d * Math.cos(K.rise * D);
    const pos = ground(ctx, [mid[0] + Math.sin(yaw * D) * dh, mid[1] + d * Math.sin(K.rise * D) + mv.up, mid[2] + Math.cos(yaw * D) * dh]);
    const f = fitHeads(pos, aimAt(pos, mid, 0, 1 - 2 / 3, fov, aspect), fov, [A, B], aspect, mid);
    return {position: f.pos, target: f.target, fov, ok: f.ok, check: [{p: A.eyes, r: SEARCH.headOut * A.headH, ignore: [t.a]}, {p: B.eyes, r: SEARCH.headOut * B.headH, ignore: [t.b]}], heads: [A, B]};
  }
  if (t.kind === 'ots') {
    const S = ctx.subjectAt(nm.main, lt), Pn = ctx.subjectAt(t.partner, lt); if (!S || !Pn) return null;
    const u0 = [Pn.eyes[0] - S.eyes[0], Pn.eyes[2] - S.eyes[2]], ul = Math.hypot(...u0) || 1, u = [u0[0] / ul, u0[1] / ul], r = [-u[1], u[0]], yawOff = (P.swing + mv.yaw) * D;
    const cu = [u[0] * Math.cos(yawOff) + r[0] * Math.sin(yawOff), u[1] * Math.cos(yawOff) + r[1] * Math.sin(yawOff)], cr = [-cu[1], cu[0]], dS = (ul + K.back) * P.pull * mv.dist;   // the camera swings around the SUBJECT
    const pos = ground(ctx, [S.eyes[0] + cu[0] * dS + cr[0] * side * K.side, Pn.eyes[1] - K.drop * Pn.headH + mv.up, S.eyes[2] + cu[1] * dS + cr[1] * side * K.side]);
    const ft = framingTarget({position: pos, target: S.eyes, fov}, S.eyes, null, S.headH, aspect, side > 0 ? 'left' : 'right');
    const f = fitHeads(pos, aimAt(pos, S.eyes, ft.xn, ft.yn, fov, aspect), fov, [S, Pn], aspect, S.eyes);
    return {position: f.pos, target: f.target, fov, ok: f.ok, check: [{p: S.eyes, r: SEARCH.headOut * S.headH, ignore: [nm.main]}], heads: [S, Pn]};
  }
  const S = ctx.subjectAt(nm.main, lt); if (!S) return null;
  const face = smoothFace(ctx, nm.main, lt, dur), yaw = yawOfFace(face) + side * K.yaw + P.swing + mv.yaw;
  if (t.kind === 'beastHero') {
    const top = Math.max(S.foot[1] + S.H, S.eyes[1] + .5 * S.headH), C = [(S.foot[0] + S.eyes[0]) / 2, S.foot[1], (S.foot[2] + S.eyes[2]) / 2], g = ctx.groundAt?.(C[0], C[2]) ?? C[1];   // the root–head mid column (a long neck reaches toward the camera)
    const reach = Math.hypot(S.eyes[0] - C[0], S.eyes[2] - C[2]) + S.headH;   // never under the head
    let lo = reach, hi = 600; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, gy = ctx.groundAt?.(C[0] + Math.sin(yaw * D) * m, C[2] + Math.cos(yaw * D) * m) ?? g; if (heroShare(C, top, yaw, m, gy + K.camH, fov0, aspect).share > K.share) lo = m; else hi = m; }
    let dh = Math.max(reach, (lo + hi) / 2), f = null, sh = 0;
    for (let k = 0; k < 5; k++) {   // the head-fit aim shift tilts a low camera, which changes the projected span: re-solve the distance around it
      const d1 = Math.max(reach, dh * P.pull * mv.dist), gy = ctx.groundAt?.(C[0] + Math.sin(yaw * D) * d1, C[2] + Math.cos(yaw * D) * d1) ?? g, hs = heroShare(C, top, yaw, d1, gy + K.camH + mv.up, fov, aspect);
      f = fitHeads(hs.pos, hs.target, fov, [S], aspect, [C[0], (C[1] + top) / 2, C[2]], 0);   // aim shift only: the head in frame
      const cam = {position: f.pos, target: f.target, fov}; sh = (project(cam, [C[0], top, C[2]], aspect).y - project(cam, C, aspect).y) / 2;
      if (Math.abs(sh - K.share * (mv.fovK === 1 ? 1 / mv.dist : 1)) < .02 || d1 <= reach + 1e-9) break; dh *= sh / (K.share / mv.dist); }
    return {position: f.pos, target: f.target, fov, ok: f.ok, share: sh, check: [{p: S.eyes, r: SEARCH.headOut * S.headH, ignore: [nm.main]}], heads: []};
  }
  const Hf = K.vHead ? K.vHead * S.headH : K.v * S.H, d = Hf / (2 * Math.tan(fov0 * D / 2)) * P.pull * mv.dist, rise = (K.rise ?? 0) * D, dh = d * Math.cos(rise);
  const y = t.kind === 'beastFace' ? S.eyes[1] - K.drop * S.headH : S.eyes[1] + d * Math.sin(rise);
  const pos = ground(ctx, [S.eyes[0] + Math.sin(yaw * D) * dh, y + mv.up, S.eyes[2] + Math.cos(yaw * D) * dh]);
  const ft = framingTarget({position: pos, target: S.eyes, fov}, S.eyes, face, S.headH, aspect, null);
  const f = fitHeads(pos, aimAt(pos, S.eyes, ft.xn, ft.yn, fov, aspect), fov, [S], aspect, S.eyes);
  return {position: f.pos, target: f.target, fov, ok: f.ok, check: [{p: S.eyes, r: SEARCH.headOut * S.headH, ignore: [nm.main]}], heads: [S]};
}
// the head's centre + 4 points at ±HEAD5 r across the view (camera right / up): a half-hidden face is occluded
export const HEAD5 = .8;
export function headPoints(c, cam, r) {
  const f = sub(cam, c), l = len(f) || 1, fn = scl(f, 1 / l); let rt = [fn[2], 0, -fn[0]]; const rl = Math.hypot(rt[0], rt[2]) || 1; rt = [rt[0] / rl, 0, rt[2] / rl];
  const up = [fn[1] * rt[2] - fn[2] * rt[1], fn[2] * rt[0] - fn[0] * rt[2], fn[0] * rt[1] - fn[1] * rt[0]], k = HEAD5 * r;
  return [c, add(c, scl(rt, k)), add(c, scl(rt, -k)), add(c, scl(up, k)), add(c, scl(up, -k))]; }
// every checked head (5 points) sees the camera and the camera is clear of geometry
export function poseClear(pose, ctx) {
  if (!pose) return false; if (ctx.free && !ctx.free(pose.position)) return false;
  for (const c of pose.check ?? []) for (const p of headPoints(c.p, pose.position, c.r)) { const v = sub(pose.position, p), l = len(v); if (l <= c.r) return false; if (!ctx.clear(add(p, scl(v, c.r / l)), pose.position, c.ignore)) return false; }
  return true;
}
export const swings = () => { const s = [0]; for (let a = SEARCH.swing; a <= SEARCH.maxSwing; a += SEARCH.swing) { s.push(a); if (a < SEARCH.maxSwing) s.push(-a); } return s; };
export const sampleTimes = (shot, fps = 30) => { const dur = durOf(shot, fps), n = Math.max(2, Math.min(SEARCH.samples, Math.ceil(dur / SEARCH.step) + 1)); return Array.from({length: n}, (_, i) => dur * i / (n - 1) * .999); };
const MEMO = new Map();
// one swing / pull for the whole shot: the first (smallest swing, then least pull-in) clear on every sampled time
export function solveShot(shot, ctx) {
  const key = ctx.cacheKey; if (key && MEMO.has(key)) return MEMO.get(key);
  const ts = sampleTimes(shot, ctx.fps ?? 30); let best = {swing: 0, pull: 1, clear: -1};
  ctx.beginSamples?.();
  outer: for (const pull of SEARCH.pulls) for (const swing of swings()) {
    let n = 0; for (const lt of ts) { ctx.atTime?.(lt); const ps = solvePose(shot, lt, ctx, {swing, pull}); if (ps?.ok && poseClear(ps, ctx)) n++; else break; }   // heads fit AND seen
    if (n > best.clear) best = {swing, pull, clear: n}; if (n === ts.length) break outer;
  }
  ctx.endSamples?.();
  const r = {swing: best.swing, pull: best.pull, clearFrac: best.clear / ts.length, samples: ts.length}; if (key) MEMO.set(key, r); return r;
}
export const clearMemo = () => MEMO.clear();
// the camera for a shot at local time lt → {position, target, fov, roll, noise, tpl: {swing, pull, safety, ok}}
export function sampleTpl(shot, lt, ctx) {
  const P = solveShot(shot, ctx); let pose = solvePose(shot, lt, ctx, P), k = 0;
  while (pose && k < SEARCH.safety && !poseClear(pose, ctx)) { k++; pose = solvePose(shot, lt, ctx, {...P, pull: P.pull * SEARCH.safetyK ** k}); }
  if (!pose) return null;
  return {position: pose.position, target: pose.target, fov: pose.fov, roll: 0, noise: [0, 0, 0], lens: TPL[shot.tpl.kind].lens, tpl: {kind: shot.tpl.kind, swing: P.swing, pull: P.pull, safety: k, ok: pose.ok, share: pose.share ?? null, clear: poseClear(pose, ctx)}};
}
