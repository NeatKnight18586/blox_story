// Ground contact (opt-in, per episode): after posing, an upright character's lowest foot is
// planted on the real surface under it, so feet never hover over a kerb or dip into the
// ground mid-stride (rigid R6 legs swing their toes below the hip line). Sitting, kneeling,
// lying and deliberately lifted characters are left alone. Deterministic: pure geometry.
import * as T from 'three';

const SKIP = /^(rain|tint|studio_sky_gradient|cloud|cloud_clump|bird|sea)$/;
export function makeGrounder(scene, people) {
  const roots = new Set(people.map(a => a.root));
  const owner = o => { while (o.parent && o.parent.type !== 'Scene') o = o.parent; return o; };
  let meshes = null;
  const visible = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), p = new T.Vector3();
  return function ground(a, {maxShift = .6} = {}) {
    if (!a.root.visible || a.userData.noGround) return 0;
    const r = a.root.rotation, hip = Math.max(Math.abs(a.pivots.leftHip.rotation.x), Math.abs(a.pivots.rightHip.rotation.x));
    if (Math.abs(r.x) > .5 || Math.abs(r.z) > .5 || hip > .9) return 0;
    meshes ??= (() => { scene.updateMatrixWorld(true); const l = []; scene.traverse(o => { if (o.isMesh && !SKIP.test(o.name) && !roots.has(owner(o)) && !(o.material?.transparent && o.material.opacity < .5)) l.push(o); }); return l; })();
    a.root.updateMatrixWorld(true);
    const sc = a.root.scale.y; let low = Infinity, fx = 0, fz = 0;
    for (const n of ['leftLeg', 'rightLeg']) {
      const o = a.parts[n], b = o.geometry.boundingBox ?? (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
      for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) low = Math.min(low, p.set(x, b.min.y, z).applyMatrix4(o.matrixWorld).y);
      p.set(0, b.min.y, 0).applyMatrix4(o.matrixWorld); fx += p.x / 2; fz += p.z / 2;
    }
    ray.set(p.set(fx, a.root.position.y + .8 * sc, fz), down); ray.far = 2 * sc;
    const hit = ray.intersectObjects(meshes, false).find(h => visible(h.object));
    if (!hit) return 0;
    const gap = low - hit.point.y;
    if (Math.abs(gap) > maxShift * sc) return 0;   // a deliberate height (held, lifted, on a prop): leave it
    a.root.position.y -= gap; return -gap;
  };
}
