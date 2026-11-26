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
// ctx: {fps, aspect, subjectAt(name, lt) → {eyes, headH, H, foot: [x,y,z], face: [x,z], body?: [torso centre, shoulder, shoulder]} | null, propAt(name, lt) → {centre, H} | null,
//       groundAt(x, z), clear(from, to, ignore[]) → bool, free(p) → bool, cacheKey}
import {lensFov, aimAt, framingTarget, headBox, fitShift, project, FIT} from './cine.js';
const FIT_UP = FIT.headUp;
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
  beastHero: {lens: 24, share: .55, minShare: .45, camH: 1.4, yaw: 40, yaws: [40, 30, 20], push: .1},   // 4C-2: ¾ (yaw 40°), silhouette share .45–.65 (aim .55); camH: studs above the ground (≤ kid-eye); push: a shorter travel
  beastFace: {lens: 35, vHead: 2.4, yaw: 0, drop: .1, eyeShare: .58, eyeY: .1}};   // 4C-2: eyeShare = combined eye width / frame width (gate ≥ .45); eyeY: eyes' NDC height
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
  if (t.kind === 'two') {   // 4C-2: the pair may touch (a hug): each ignores both, only others block
    const A = ctx.subjectAt(t.a, lt), B = ctx.subjectAt(t.b, lt); if (!A || !B) return null;
    const mid = scl(add(A.eyes, B.eyes), .5), ax = [B.eyes[0] - A.eyes[0], B.eyes[2] - A.eyes[2]], al = Math.hypot(...ax) || 1, n = [-ax[1] / al, ax[0] / al];
    const fA = smoothFace(ctx, t.a, lt, dur), fB = smoothFace(ctx, t.b, lt, dur), s = Math.sign(n[0] * (fA[0] + fB[0]) + n[1] * (fA[1] + fB[1])) || side;
    const yaw = yawOfFace([n[0] * s, n[1] * s]) + K.yaw + P.swing + mv.yaw, H = Math.max(A.H, B.H), tx = Math.tan(fov0 * D / 2) * aspect;
    const d = Math.max((al + 1.5 * Math.max(A.headH, B.headH)) * K.pad / (2 * tx), K.v * H / (2 * Math.tan(fov0 * D / 2))) * P.pull * mv.dist, dh = d * Math.cos(K.rise * D);
    const pos = ground(ctx, [mid[0] + Math.sin(yaw * D) * dh, mid[1] + d * Math.sin(K.rise * D) + mv.up, mid[2] + Math.cos(yaw * D) * dh]);
    const f = fitHeads(pos, aimAt(pos, mid, 0, 1 - 2 / 3, fov, aspect), fov, [A, B], aspect, mid);
    return {position: f.pos, target: f.target, fov, ok: f.ok, check: [{p: A.eyes, r: SEARCH.headOut * A.headH, ignore: [t.a, t.b], body: A.body}, {p: B.eyes, r: SEARCH.headOut * B.headH, ignore: [t.a, t.b], body: B.body}], heads: [A, B]};
  }
  if (t.kind === 'ots') {
    const S = ctx.subjectAt(nm.main, lt), Pn = ctx.subjectAt(t.partner, lt); if (!S || !Pn) return null;
    const u0 = [Pn.eyes[0] - S.eyes[0], Pn.eyes[2] - S.eyes[2]], ul = Math.hypot(...u0) || 1, u = [u0[0] / ul, u0[1] / ul], r = [-u[1], u[0]], yawOff = (P.swing + mv.yaw) * D;
    const cu = [u[0] * Math.cos(yawOff) + r[0] * Math.sin(yawOff), u[1] * Math.cos(yawOff) + r[1] * Math.sin(yawOff)], cr = [-cu[1], cu[0]], dS = (ul + K.back) * P.pull * mv.dist;   // the camera swings around the SUBJECT
    const pos = ground(ctx, [S.eyes[0] + cu[0] * dS + cr[0] * side * K.side, Pn.eyes[1] - K.drop * Pn.headH + mv.up, S.eyes[2] + cu[1] * dS + cr[1] * side * K.side]);
    const ft = framingTarget({position: pos, target: S.eyes, fov}, S.eyes, null, S.headH, aspect, side > 0 ? 'left' : 'right');
    const f = fitHeads(pos, aimAt(pos, S.eyes, ft.xn, ft.yn, fov, aspect), fov, [S, Pn], aspect, S.eyes);
    return {position: f.pos, target: f.target, fov, ok: f.ok, check: [{p: S.eyes, r: SEARCH.headOut * S.headH, ignore: [nm.main], body: S.body}], heads: [S, Pn]};
  }
  const S = ctx.subjectAt(nm.main, lt); if (!S) return null;
  const face = smoothFace(ctx, nm.main, lt, dur), yaw = yawOfFace(face) + side * (K.yaw ?? 0) + P.swing + mv.yaw;
  if (t.kind === 'beastHero') {   // 4C-2: "see the whole beast, heroically": ¾, low, the whole silhouette (+ head box, + mouth and 40 % of a breath jet) in frame
    const B = S.box ?? {min: [S.foot[0] - S.H / 3, S.foot[1], S.foot[2] - S.H / 3], max: [S.foot[0] + S.H / 3, S.foot[1] + S.H, S.foot[2] + S.H / 3]};
    const C = [(B.min[0] + B.max[0]) / 2, (B.min[1] + B.max[1]) / 2, (B.min[2] + B.max[2]) / 2], hw = Math.hypot(B.max[0] - B.min[0], B.max[2] - B.min[2]) / 2;
    const corners = S.pts ?? [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i & 1 ? B.max[0] : B.min[0], i & 2 ? B.max[1] : B.min[1], i & 4 ? B.max[2] : B.min[2]]), hh = S.headH * .6;   // the silhouette: posed vertices (else the box)
    const extra = [...[-1, 1].flatMap(a => [-1, 1].map(b => [S.eyes[0] + a * hh, S.eyes[1] + b * hh, S.eyes[2]])), ...(S.jet ? [S.jet.from, add(S.jet.from, scl(S.jet.dir, .4 * S.jet.reach))] : [])], all = [...corners, ...extra];
    const solveAt = yaw => { const at = dh => { const gy = ctx.groundAt?.(C[0] + Math.sin(yaw * D) * dh, C[2] + Math.cos(yaw * D) * dh) ?? B.min[1], pos = [C[0] + Math.sin(yaw * D) * dh, gy + K.camH + mv.up, C[2] + Math.cos(yaw * D) * dh];
      let tg = aimAt(pos, C, 0, 0, fov, aspect);
      for (let i = 0; i < 3; i++) { const cam = {position: pos, target: tg, fov}, q = all.map(p => project(cam, p, aspect)); if (q.some(v => v.z <= .05)) break;
        const xs = q.map(v => v.x), ys = q.map(v => v.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, a = project(cam, C, aspect); tg = aimAt(pos, C, a.x - cx, a.y - cy, fov, aspect); }
      let cam = {position: pos, target: tg, fov}; const head = project(cam, S.eyes, aspect), lowY = Math.min(...all.map(p => project(cam, p, aspect).y));
      if (head.y < 1 / 3 && lowY > -.94) { const a = project(cam, C, aspect), dy = Math.min(1 / 3 - head.y, lowY + .94); tg = aimAt(pos, C, a.x, a.y + dy, fov, aspect); cam = {position: pos, target: tg, fov}; }   // the head into the upper third
      const qc = corners.map(p => project(cam, p, aspect)), qa = all.map(p => project(cam, p, aspect));
      return {pos, tg, share: (Math.max(...qc.map(v => v.y)) - Math.min(...qc.map(v => v.y))) / 2, fit: qa.every(v => v.z > .05 && Math.abs(v.x) <= .94 && Math.abs(v.y) <= .94), headY: project(cam, S.eyes, aspect).y}; };
    let lo = hw + 1, hi = 3000; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (at(m).share > K.share) lo = m; else hi = m; }
    let dh = Math.max(hw + 1, (lo + hi) / 2 * P.pull * mv.dist), r = at(dh); for (let i = 0; i < 12 && !r.fit && r.share > K.minShare; i++) r = at(dh *= 1.06); return r; };
    let r = null; for (const yo of K.yaws) { const q = solveAt(yawOfFace(face) + side * yo + P.swing + mv.yaw); if (!r || (q.fit && q.share >= K.minShare && !(r.fit && r.share >= K.minShare))) r = q; if (r.fit && r.share >= K.minShare) break; }   // ¾ first; flatter only if the silhouette (+ jet) does not fit
    return {position: r.pos, target: r.tg, fov, ok: r.fit, share: r.share, headY: r.headY, check: [{p: S.eyes, r: SEARCH.headOut * S.headH, ignore: [nm.main]}], heads: []};
  }
  if (t.kind === 'beastFace' && S.eyesL?.length >= 2) {   // 4C-2: "eyes fill the screen": on the head's forward axis, both eyes centred, their combined width = eyeShare of the frame width
    const e0 = S.eyesL[0], e1 = S.eyesL[1], mid = scl(add(e0.p, e1.p), .5), span = len(sub(e0.p, e1.p)) + (e0.w + e1.w) / 2, f0 = [Math.sin(yaw * D), 0, Math.cos(yaw * D)];
    const d = span / (2 * K.eyeShare * Math.tan(fov0 * D / 2) * aspect) * P.pull * mv.dist, pos = ground(ctx, add(mid, add(scl(f0, d), [0, mv.up, 0])));
    return {position: pos, target: aimAt(pos, mid, 0, K.eyeY, fov, aspect), fov, ok: true, check: [{p: mid, r: .5 * Math.min(e0.w, e1.w), ignore: [nm.main]}], heads: []};
  }
  const Hf = K.vHead ? K.vHead * S.headH : K.v * S.H, d = Hf / (2 * Math.tan(fov0 * D / 2)) * P.pull * mv.dist, rise = (K.rise ?? 0) * D, dh = d * Math.cos(rise);
  const y = t.kind === 'beastFace' ? S.eyes[1] - K.drop * S.headH : S.eyes[1] + d * Math.sin(rise);
  const pos = ground(ctx, [S.eyes[0] + Math.sin(yaw * D) * dh, y + mv.up, S.eyes[2] + Math.cos(yaw * D) * dh]);
  const ft = framingTarget({position: pos, target: S.eyes, fov}, S.eyes, face, S.headH, aspect, null);
  const f = fitHeads(pos, aimAt(pos, S.eyes, ft.xn, ft.yn, fov, aspect), fov, [S], aspect, S.eyes);
  return {position: f.pos, target: f.target, fov, ok: f.ok, check: [{p: S.eyes, r: SEARCH.headOut * S.headH, ignore: [nm.main], body: S.body}], heads: [S]};
}
// fearbell pass 2 (owner A1, opt-in: format 7 shot.faceAim / template ctx.faceAim): FACE-AIMED close framing for cu / mcu / two / ots.
// The face centre sits on the upper-third line, the head's top (hair / hat included) 8–12 % below the frame top (aim 10 %): the authored
// camera POSITION is kept, the aim is re-solved and the fov (zoom) bisected; every head stays inside the width. Never crops a head (only ecu may).
export const FACE_AIM = {kinds: ['cu', 'mcu', 'two', 'ots', 'close'], eyeLine: 1 / 3, headroom: [.08, .12], aim: .10, fov: [6, 100], xMax: .9, xKeep: .5};
export const headroomOf = (cam, heads, aspect) => Math.min(...heads.map(h => (1 - project(cam, h.top, aspect).y) / 2));
// heads: [{c: face centre [x, y, z], top: the head's highest point [x, y, z], r?: half-width (studs)}]; cam {position, target, fov}
export function faceAim(cam, heads, aspect = 9 / 16, o = {}) {
  const K = {...FACE_AIM, ...o}, F = scl(heads.reduce((a, h) => add(a, h.c), [0, 0, 0]), 1 / heads.length), p0 = project(cam, F, aspect);
  let xn = p0.z > 0 ? Math.max(-K.xKeep, Math.min(K.xKeep, p0.x)) : 0; const yn = 1 - 2 * K.eyeLine, pos = cam.position;
  const at = fov => { const target = aimAt(pos, F, xn, yn, fov, aspect), c = {position: pos, target, fov}; const xs = heads.flatMap(h => { const r = h.r ?? .7 * len(sub(h.top, h.c)); const q = project(c, h.c, aspect), k = r / (q.z * Math.tan(fov * D / 2) * aspect); return [q.x - k, q.x + k]; });
    return {c, head: headroomOf(c, heads, aspect), fits: xs.every(x => Math.abs(x) <= K.xMax)}; };
  const solveFov = () => { let lo = K.fov[0], hi = K.fov[1]; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (at(m).head < K.aim) lo = m; else hi = m; } return (lo + hi) / 2; };   // headroom grows with the fov
  let fov = solveFov(), r = at(fov); if (!r.fits && xn !== 0) { xn = 0; fov = solveFov(); r = at(fov); }   /* an off-centre face that does not fit the width is centred before the lens widens */
  for (let i = 0; i < 40 && !r.fits && fov < K.fov[1]; i++) r = at(fov = Math.min(K.fov[1], fov * 1.04));   // two heads: widen until both fit the width
  if (r.head > K.headroom[1]) { let a = yn, b = .95; for (let i = 0; i < 40; i++) { const m = (a + b) / 2, t2 = aimAt(pos, F, xn, m, fov, aspect), h = headroomOf({position: pos, target: t2, fov}, heads, aspect); if (h > K.aim) a = m; else b = m; }   // widened (two heads): the faces rise above the third line until the headroom is back at the aim
    const t2 = aimAt(pos, F, xn, (a + b) / 2, fov, aspect); r = {...r, c: {position: pos, target: t2, fov}, head: headroomOf({position: pos, target: t2, fov}, heads, aspect)}; }
  return {position: pos, target: r.c.target, fov: +fov.toFixed(3), headroom: +r.head.toFixed(4), ok: r.head >= K.headroom[0] - 1e-3 && r.head <= K.headroom[1] + 1e-3 && r.fits};
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
  const cam = {position: pose.position, target: pose.target, fov: pose.fov}, aspect = ctx.aspect ?? 9 / 16;
  for (const c of pose.check ?? []) {
    if (len(sub(pose.position, c.p)) <= c.r) return false;
    for (const p of headPoints(c.p, pose.position, c.r)) if (!ctx.clear(p, pose.position, c.ignore)) return false;   // 4C-2: from the point itself (own rig ignored): a chair through the head plane blocks
    for (const p of c.body ?? []) { const q = project(cam, p, aspect); if (q.z <= 0 || Math.abs(q.x) > 1 || Math.abs(q.y) > 1) continue; if (!ctx.clear(p, pose.position, c.ignore)) return false; }   // torso centre + shoulders, when on screen
  }
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
  if (ctx.faceAim && FACE_AIM.kinds.includes(shot.tpl.kind) && pose.heads?.length) { const fa = faceAim(pose, pose.heads.map(h => ({c: h.eyes, top: add(h.eyes, [0, FIT_UP * h.headH, 0])})), ctx.aspect ?? 9 / 16); pose = {...pose, target: fa.target, fov: fa.fov}; }   // A1 (opt-in)
  return {position: pose.position, target: pose.target, fov: pose.fov, roll: 0, noise: [0, 0, 0], lens: TPL[shot.tpl.kind].lens, tpl: {kind: shot.tpl.kind, swing: P.swing, pull: P.pull, safety: k, ok: pose.ok, share: pose.share ?? null, clear: poseClear(pose, ctx)}};
}
