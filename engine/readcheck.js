// engine/readcheck.js — owner readability checks (egg preview pass 2, 2026-11-14): they judge the RENDERED frame, not the
// spec. Pure functions; scripts/v2/read.js gathers the measurements in the episode page (episode.js readMeasure: projected
// boxes and id-mask renders) and writes review/<slug>/read.json. Every failure is an ERROR.
//   1 faceShown · 2 nothingInFront · 3 standsOut · 4 objectReads · 5 moves · 6 sameScale
export const READ = {faceAngle: 70, headInside: .70, frontMax: .10, faceCover: .02, contrast: .12, ring: .06, objInside: .90, objHeight: .25,
  scaleTol: .30, backMax: 3, eggLuma: .15, motionK: .5,
  motion: .021};   // = motionK × 0.042: the stillest of 10 unflagged reference shots of the 65a7da7 preview (S01 S03b S06 S08 S10 S12 S20 S21 S28 S32)

const clip = b => ({x0: Math.max(0, b.x0), x1: Math.min(1, b.x1), y0: Math.max(0, b.y0), y1: Math.min(1, b.y1)});
const area = b => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
// Fraction of a screen box (0–1 coords, y down) inside the frame.
export const insideFrac = b => { const a = area(b); return a > 0 ? area(clip(b)) / a : 0; };

// 1. Face shown (medium, close, heroLow with a subject): head faces the camera within ±70°, ≥ 70 % of the head box in frame;
//    a medium never cuts the head top; a close may crop hair but never the eyes/brows (top 30 % of the head box).
export function faceShown({size, move, back = false}, head) {
  if (!['medium', 'close'].includes(size) && move !== 'heroLow') return null;
  if (!head) return {ok: false, msg: 'no subject head measured'};
  const inside = insideFrac(head.box), out = {angle: +head.angle.toFixed(1), inside: +inside.toFixed(3)};
  if (!head.front) return {...out, ok: false, msg: 'subject head behind the camera'};
  if (!back && head.angle > READ.faceAngle) return {...out, ok: false, msg: `face turned ${head.angle.toFixed(0)}° from the camera (≤ ${READ.faceAngle})`};
  const h = head.box.y1 - head.box.y0;
  if (size === 'close' && head.box.y0 + .4 * h < 0) return {...out, ok: false, msg: 'eyes/brows cut off'};   // brows sit 40 % down the head
  if (inside < READ.headInside) return {...out, ok: false, msg: `${(inside * 100).toFixed(0)} % of the head in frame (≥ ${READ.headInside * 100})`};
  if (size !== 'close' && head.box.y0 < -1e-3) return {...out, ok: false, msg: 'head top cut off in a ' + size};
  return {...out, ok: true};
}
// 2. Nothing in front: occluders nearer than the subject cover ≤ 10 % of the frame and none of the face.
export function nothingInFront({frontFrac, faceCover = 0}) {
  const out = {front: +frontFrac.toFixed(3), faceCover: +faceCover.toFixed(3)};
  if (frontFrac > READ.frontMax) return {...out, ok: false, msg: `objects in front cover ${(frontFrac * 100).toFixed(1)} % (≤ ${READ.frontMax * 100})`};
  if (faceCover > READ.faceCover) return {...out, ok: false, msg: `the face is ${(faceCover * 100).toFixed(1)} % covered`};
  return {...out, ok: true};
}
// 3. Subject stands out: |subject luma − ring luma| ≥ 0.12 on the id mask (ring 6–14 px outside it at 390 px: the A5 night-actor rule,
//    engine/lumagate.js maskStats).
export function standsOut(subj, ring) {
  if (subj === null || ring === null) return {ok: false, msg: 'subject not visible on the id mask'};
  const d = Math.abs(subj - ring); return {subj: +subj.toFixed(3), ring: +ring.toFixed(3), diff: +d.toFixed(3), ok: d >= READ.contrast, msg: d >= READ.contrast ? '' : `subject vs surround luma ${d.toFixed(3)} (≥ ${READ.contrast})`};
}
// 4. Object reads (an insert whose subject is a prop): ≥ 90 % of its box inside, ≥ 25 % of frame height.
export function objectReads(box) {
  if (!box || !box.front) return {ok: false, msg: 'object not in front of the camera'};
  const inside = insideFrac(box), h = Math.min(box.y1, 1) - Math.max(box.y0, 0);
  const out = {inside: +inside.toFixed(3), h: +h.toFixed(3)};
  if (inside < READ.objInside) return {...out, ok: false, msg: `${(inside * 100).toFixed(0)} % of the object in frame (≥ ${READ.objInside * 100})`};
  if (h < READ.objHeight) return {...out, ok: false, msg: `object ${(h * 100).toFixed(0)} % of frame height (≥ ${READ.objHeight * 100})`};
  return {...out, ok: true};
}
// 5. Something moves: mean |Δluma| between frames 0.5 s apart above the threshold (measured from the best shots).
export const moves = (value, threshold) => ({motion: +value.toFixed(4), need: +threshold.toFixed(4), ok: value >= threshold, msg: value >= threshold ? '' : `motion ${value.toFixed(4)} < ${threshold.toFixed(4)}`});
export const motionThreshold = best => READ.motionK * Math.min(...best);   // half the stillest of the reference shots
// 6. Same scale: where Kit's whole body and a whole building are in frame, (Kit h / building h) on screen stays within 30 % of the true ratio.
export function sameScale(kitH, bldH, trueRatio) {
  const r = kitH / bldH, e = r / trueRatio - 1; return {ratio: +r.toFixed(3), want: +trueRatio.toFixed(3), err: +e.toFixed(3), ok: Math.abs(e) <= READ.scaleTol, msg: Math.abs(e) <= READ.scaleTol ? '' : `Kit/building ${r.toFixed(2)} vs true ${trueRatio.toFixed(2)} (${(e * 100).toFixed(0)} %)`};
}
// Opt-out from check 1: `back: true` on ≤ 3 shots, each with a reason in `why`.
export function backIssues(shots) {
  const b = shots.filter(s => s.back), out = [];
  if (b.length > READ.backMax) out.push(`back views in ${b.length} shots (≤ ${READ.backMax})`);
  for (const s of b) if (!/back/i.test(s.why ?? '')) out.push(`${s.id}: back view without a reason in why`);
  return out;
}
// Mask helpers (pure): mean luma inside a mask and in the ring of r px around it (square dilation).
export function maskLuma(mask, luma, w, h, r) {
  let si = 0, ni = 0; const dil = new Uint8Array(w * h), tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let last = -1e9; for (let x = 0; x < w; x++) { if (mask[y * w + x]) last = x; tmp[y * w + x] = x - last <= r ? 1 : 0; } last = 1e9; for (let x = w - 1; x >= 0; x--) { if (mask[y * w + x]) last = x; if (last - x <= r) tmp[y * w + x] = 1; } }
  for (let x = 0; x < w; x++) { let last = -1e9; for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; dil[y * w + x] = y - last <= r ? 1 : 0; } last = 1e9; for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) dil[y * w + x] = 1; } }
  let so = 0, no = 0; for (let i = 0; i < w * h; i++) { if (mask[i]) { si += luma[i]; ni++; } else if (dil[i]) { so += luma[i]; no++; } }
  return {subj: ni ? si / ni : null, ring: no ? so / no : null, n: ni};
}
// Egg glow check (owner): top-to-bottom luma range across the egg's box ≥ 0.15 (shaded, not a flat pancake).
export const eggShaded = range => ({range: +range.toFixed(3), ok: range >= READ.eggLuma, msg: range >= READ.eggLuma ? '' : `glowing egg luma range ${range.toFixed(3)} (≥ ${READ.eggLuma})`});
