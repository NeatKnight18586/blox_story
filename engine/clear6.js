// engine/clear6.js — E3b owner decision D1 "clean the foreground" (opt-in: shot.clear, written by brief2spec from the Brief's
// META `clear:` sizes or a row's `clear` note). Pure: which dummies to hide for one camera. A dummy (crowd or named DUMMY) that
// is not a subject is hidden when its body (a vertical capsule, feet → 5.3 × scale, radius R × scale) comes within LENS studs of
// the lens, or crosses a sight line from the lens to the subject (feet / chest / head points + the camera target) nearer
// than that point by more than BEHIND studs. Legacy specs never set shot.clear, so nothing changes for them.
export const CLEAR = {lens: 2.5, r: 1.2, h: 5.3, behind: .8};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cl = (x, a, b) => Math.min(b, Math.max(a, x));
// closest points of segments P0P1 and Q0Q1 → {d, s (on P), u (on Q)}
export function segSeg(P0, P1, Q0, Q1) {
  const d1 = sub(P1, P0), d2 = sub(Q1, Q0), r = sub(P0, Q0), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s, u;
  if (a < 1e-12 && e < 1e-12) { s = u = 0; }
  else if (a < 1e-12) { s = 0; u = cl(f / e, 0, 1); }
  else { const c = dot(d1, r); if (e < 1e-12) { u = 0; s = cl(-c / a, 0, 1); } else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? cl((b * f - c * e) / den, 0, 1) : 0; u = (b * s + f) / e; if (u < 0) { u = 0; s = cl(-c / a, 0, 1); } else if (u > 1) { u = 1; s = cl((b - c) / a, 0, 1); } } }
  const p = P0.map((v, i) => v + d1[i] * s), q = Q0.map((v, i) => v + d2[i] * u);
  return {d: Math.hypot(...sub(p, q)), s, u};
}
// subject body points: feet + .5, chest, head (scaled), from a mark [x, y, z]
export const bodyPoints = (p, k = 1) => [[p[0], p[1] + .5 * k, p[2]], [p[0], p[1] + 2.6 * k, p[2]], [p[0], p[1] + 4.6 * k, p[2]]];
// Screen test (what the engine uses): rects in frame fractions {x0, x1, y0, y1}. A standing dummy is hidden when its rect overlaps
// the subject's rect and its centre is nearer the lens than the subject's centre by more than BEHIND, or when it is within
// LENS of the lens. others [{name, rect, dist (lens → its centre), lensD (lens → its body)}], subj {rect, dist} → Set of names.
export const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
export function clearScreen(subj, others, o = CLEAR) {
  const hide = new Set();
  for (const d of others) if (d.lensD < o.lens || (subj && d.rect && d.dist < subj.dist - o.behind && overlap(d.rect, subj.rect) > 0)) hide.add(d.name);
  return hide;
}
// cam [x,y,z]; sights [[x,y,z]...] (the subject's points); others [{name, p: feet [x,y,z], k}] → Set of names to hide
export function clearHidden(cam, sights, others, o = CLEAR) {
  const hide = new Set();
  for (const d of others) {
    const k = d.k ?? 1, A = d.p, B = [d.p[0], d.p[1] + o.h * k, d.p[2]], r = o.r * k;
    if (segSeg(cam, cam, A, B).d < o.lens + r) { hide.add(d.name); continue; }
    for (const S of sights) { const L = Math.hypot(...sub(S, cam)), c = segSeg(cam, S, A, B); if (c.d < r && c.s * L < L - o.behind) { hide.add(d.name); break; } }
  }
  return hide;
}
