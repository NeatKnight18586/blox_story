// engine/anchorlock.js — ANCHOR LOCK (Phase 1F; RULEBOOK §4 "the rule object sits in a fixed screen zone"). Opt-in spec
//   "anchorLock": {"object": "<scene object name>", "zone": [x0, y0, x1, y1], "shots": ["S03", …]?, "mode": "centre" | "clamp"}
// zone in frame fractions (x right, y DOWN, 0…1). For every locked shot (all shots when `shots` is omitted) the camera keeps its
// position and the template's framing intent, and only re-aims (yaw + pitch, roll kept) so the object's centre lands on the
// zone centre ("centre", default) or, when it is outside, on the nearest point inside the zone ("clamp"). Solved per frame,
// never hand-typed. Pure: zoneTarget, ndcOf; three: aimTo(camera, point, [sx, sy]) → residual (frame fractions).
import * as T from 'three';

export const zoneTarget = (zone, p, mode = 'centre') => { const [x0, y0, x1, y1] = zone;
  if (mode === 'clamp' && p) return [Math.min(x1, Math.max(x0, p[0])), Math.min(y1, Math.max(y0, p[1]))];
  return [(x0 + x1) / 2, (y0 + y1) / 2]; };
export const inZone = (zone, p) => !!p && p[0] >= zone[0] && p[0] <= zone[2] && p[1] >= zone[1] && p[1] <= zone[3];
// world point → frame fractions (x right, y down) for a camera; null behind the lens
export function ndcOf(camera, point) {
  camera.updateMatrixWorld(); const v = new T.Vector3(...point), c = v.clone().applyMatrix4(camera.matrixWorldInverse); if (c.z >= 0) return null;
  v.project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2];
}
// re-aim the camera (position fixed, world-up kept, roll kept) so `point` projects at frame fraction s; Newton steps on yaw/pitch
export function aimTo(camera, point, s, {iters = 6} = {}) {
  const P = new T.Vector3(...point), e = new T.Euler(0, 0, 0, 'YXZ'); camera.updateProjectionMatrix();
  const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
  e.setFromQuaternion(camera.quaternion, 'YXZ'); const roll = e.z;
  if (!ndcOf(camera, point)) { camera.lookAt(P); e.setFromQuaternion(camera.quaternion, 'YXZ'); e.z = roll; camera.quaternion.setFromEuler(e); }
  let r = [1, 1];
  for (let i = 0; i < iters; i++) {
    const p = ndcOf(camera, point); if (!p) break; r = [p[0] - s[0], p[1] - s[1]]; if (Math.hypot(...r) < 1e-4) break;
    e.setFromQuaternion(camera.quaternion, 'YXZ'); e.y -= r[0] * hf; e.x -= r[1] * vf; e.x = Math.max(-1.45, Math.min(1.45, e.x)); e.z = roll; camera.quaternion.setFromEuler(e);
  }
  camera.updateMatrixWorld(); const p = ndcOf(camera, point); return p ? [p[0] - s[0], p[1] - s[1]] : null;
}
export function createAnchorLock(scene, spec) {
  const L = spec.anchorLock; if (!L?.object || !L.zone) return null;
  const box = new T.Box3(), c = new T.Vector3(), log = {};
  const objectPoint = () => { const o = scene.getObjectByName(L.object); if (!o) throw Error('anchorLock: no object ' + L.object); o.updateWorldMatrix(true, true); box.setFromObject(o); return box.getCenter(c).toArray(); };
  return {
    spec: L, log, objectPoint,
    applies: shot => !L.shots || L.shots.includes(shot.id),
    apply(shot, camera) { if (!this.applies(shot)) return null; const P = objectPoint(), before = ndcOf(camera, P), s = zoneTarget(L.zone, before, L.mode);
      if (L.mode === 'clamp' && inZone(L.zone, before)) return (log[shot.id] = {before, after: before, inZone: true});
      aimTo(camera, P, s); const after = ndcOf(camera, P); return (log[shot.id] = {before, after, inZone: inZone(L.zone, after)}); },
  };
}
