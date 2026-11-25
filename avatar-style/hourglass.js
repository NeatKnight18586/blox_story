// avatar-style/hourglass.js — modest hourglass R6 torso for ADULT_F (owner 2026-11-24, `torsoShape: 'hourglass'`): waist −8 %, hips +4 %, smooth taper; adult_f only, never kids or grandmas.
import * as T from 'three';
export const HOURGLASS = {waist: .92, hip: 1.04, waistAt: .5, rows: 14};   // width factors on the 2-stud torso at the shoulders (1), the waist (at 50 % of the height) and the hips (bottom)
const sm = x => x * x * (3 - 2 * x);
// width factor at u (0 = shoulders, 1 = bottom): shoulders 1 → waist .92 → hips 1.04, smoothstep between the three
export function widthAt(u, h = HOURGLASS) { return u <= h.waistAt ? 1 + (h.waist - 1) * sm(u / h.waistAt) : h.waist + (h.hip - h.waist) * sm((u - h.waistAt) / (1 - h.waistAt)); }
export const HOURGLASS_BUILDS = ['adult_f'];
let cache = null;
export function hourglassTorso(height = 2) {
  if (cache) return cache;
  const g = new T.BoxGeometry(2, height, 1, 1, HOURGLASS.rows, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * widthAt((height / 2 - p.getY(i)) / height));
  g.computeVertexNormals(); return cache = g;
}
