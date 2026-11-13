// engine/crowd.js — instanced background crowds (Amendment A4 B3): up to 60 low-detail block bodies per shot.
// One InstancedMesh per body part (torso, head, hair, 2 arms, 2 legs: 7 draw calls for the whole crowd, 12 triangles a
// part). Each member is posed by the same pose library as the cast (ambientPose, `run` for panic, `lookUp`), so the crowd
// moves like the actors; per-member matrices are a pure function of (member, t).
// spec.crowds = [{id, count, centre: [x, z] | {anchor, offset}, radius | area: [w, d], mode: 'ambient'|'panic'|'lookUp'|'cheer',
//   dir: [x, z] (panic), speed, seed, face: [x, z] (look toward), expression (face decal), visible: [[t, bool]], scale}]
import * as T from 'three';
import {ambientPose, samplePose, RUN_SPEED} from './poses.js';
import {PARTS, SKINS} from '../avatar-style/body.js';
import {faceMaterial} from '../avatar-style/faces2.js';

export const CROWD_MAX = 60;
const SHIRTS = ['#4f7cc4', '#c0392b', '#7a8a4a', '#6b4a8f', '#2e9e78', '#a0683a', '#d9a440', '#e2733a', '#3f8fb0', '#b84a7a'];
const PANTS = ['#3b3f46', '#5a4632', '#2f4a6b', '#6b6b6b', '#2a2a30'];
const HAIR = ['#3a2418', '#6b4428', '#c8692a', '#e8c25a', '#202020', '#9a9a9a'];
const r1 = (seed, k) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 43758.5453; return x - Math.floor(x); };

// Members (pure): seeded positions inside a disc or rectangle, colours, phase.
export function crowdMembers({count = 20, centre = [0, 0], radius = 12, area = null, seed = 1, mode = 'ambient', dir = [0, 1], speed = RUN_SPEED * .8, face = null, scale = 1} = {}) {
  const n = Math.min(CROWD_MAX, count), out = [];
  for (let i = 0; i < n; i++) {
    const s = seed * 1000 + i, a = r1(s, 1) * Math.PI * 2, d = Math.sqrt(r1(s, 2)) * radius;
    const x = area ? centre[0] + (r1(s, 1) - .5) * area[0] : centre[0] + Math.sin(a) * d, z = area ? centre[1] + (r1(s, 2) - .5) * area[1] : centre[1] + Math.cos(a) * d;
    const yaw = mode === 'panic' ? Math.atan2(dir[0], dir[1]) + (r1(s, 3) - .5) * .5 : face ? Math.atan2(face[0] - x, face[1] - z) + (r1(s, 3) - .5) * .6 : r1(s, 3) * Math.PI * 2;
    out.push({i, x, z, yaw, seed: s, phase: r1(s, 4) * 3, speed: speed * (.8 + r1(s, 5) * .4), scale: scale * (.86 + r1(s, 6) * .2),
      skin: SKINS[Math.floor(r1(s, 7) * SKINS.length)], shirt: SHIRTS[Math.floor(r1(s, 8) * SHIRTS.length)], pants: PANTS[Math.floor(r1(s, 9) * PANTS.length)], hair: HAIR[Math.floor(r1(s, 10) * HAIR.length)]});
  }
  return out;
}
// Pose sample for a member at time t (pure).
export function memberPose(m, mode, t) {
  if (mode === 'panic') return samplePose('run', t + m.phase);
  if (mode === 'lookUp') return samplePose('lookUp', t + m.phase * .3);
  if (mode === 'cheer') return samplePose('cheer', t + m.phase);
  return ambientPose(m.seed, t);
}
// Where the member stands at t (pure): panic members run along dir from their spot.
export function memberAt(m, c, t, groundY = () => 0) {
  const k = c.mode === 'panic' ? m.speed * Math.max(0, t - (c.at ?? 0)) : 0, l = Math.hypot(...(c.dir ?? [0, 1])) || 1;
  const x = m.x + (c.dir?.[0] ?? 0) / l * k, z = m.z + (c.dir?.[1] ?? 1) / l * k; return [x, groundY(x, z), z];
}

const BODY = [   // instanced parts: [name, pivot, size]
  ['torso', null, PARTS.torso.size], ['head', 'head', [1.15, 1.1, 1.05]], ['hair', 'head', [1.22, .42, 1.12]],
  ['leftArm', 'leftShoulder', PARTS.leftArm.size], ['rightArm', 'rightShoulder', PARTS.rightArm.size], ['leftLeg', 'leftHip', PARTS.leftLeg.size], ['rightLeg', 'rightHip', PARTS.rightLeg.size]];
const PIVOT_AT = {head: [0, 4.03, 0], leftShoulder: PARTS.leftArm.pivotAt, rightShoulder: PARTS.rightArm.pivotAt, leftHip: PARTS.leftLeg.pivotAt, rightHip: PARTS.rightLeg.pivotAt};
const PART_AT = {face: [0, .56, .535], torso: PARTS.torso.at, head: [0, .58, 0], hair: [0, 1.2, -.03], leftArm: PARTS.leftArm.at, rightArm: PARTS.rightArm.at, leftLeg: PARTS.leftLeg.at, rightLeg: PARTS.rightLeg.at};

// Matrices for one member: {part: Matrix4} (pure, THREE math only).
const _r = new T.Matrix4(), _p = new T.Matrix4(), _o = new T.Matrix4(), _e = new T.Euler(), _q = new T.Quaternion(), _v = new T.Vector3(), _s = new T.Vector3();
export function memberMatrices(m, s, at) {
  const root = new T.Matrix4().compose(_v.set(at[0] + s.root.dx * m.scale, at[1] + s.root.dy * m.scale, at[2] + s.root.dz * m.scale), _q.setFromEuler(_e.set(s.root.lean, m.yaw + s.root.yaw, s.root.roll, 'YXZ')), _s.setScalar(m.scale));
  const out = {};
  for (const [name, pivot, size] of [...BODY, ['face', 'head', [1, 1, 1]]]) {
    _o.compose(_v.fromArray(PART_AT[name]), _q.identity(), _s.fromArray(size));
    if (pivot) { _p.compose(_v.fromArray(PIVOT_AT[pivot]), _q.setFromEuler(_e.set(...s.pivots[pivot], 'XYZ')), _s.setScalar(1)); out[name] = root.clone().multiply(_p).multiply(_o); }
    else out[name] = root.clone().multiply(_o);
  }
  return out;
}

export function createCrowds(scene, list = [], {groundY = () => 0, resolveCentre = c => c} = {}) {
  const crowds = list.map(c => {
    const members = crowdMembers({...c, centre: resolveCentre(c.centre ?? [0, 0])}), n = members.length, group = new T.Group(); group.name = 'crowd_' + (c.id ?? 'x');
    const geo = new T.BoxGeometry(1, 1, 1), mat = new T.MeshPhongMaterial({color: '#ffffff', shininess: 30, specular: '#333333'});
    const meshes = Object.fromEntries(BODY.map(([name]) => { const im = new T.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = false; im.name = group.name + '_' + name; im.frustumCulled = false; group.add(im); return [name, im]; }));
    const col = new T.Color();
    members.forEach((m, i) => { for (const [name] of BODY) meshes[name].setColorAt(i, col.set(name === 'torso' || name.endsWith('Arm') ? (name === 'torso' ? m.shirt : (m.i % 3 ? m.shirt : m.skin)) : name.endsWith('Leg') ? m.pants : name === 'hair' ? m.hair : m.skin)); });
    for (const im of Object.values(meshes)) im.instanceColor.needsUpdate = true;
    const face = new T.InstancedMesh(new T.PlaneGeometry(1, .68), faceMaterial(c.expression ?? 'smile', 'bg'), n); face.name = group.name + '_face'; face.frustumCulled = false; group.add(face); meshes.face = face;
    scene.add(group); return {c, members, meshes, group};
  });
  return {
    crowds,
    update(t) {
      for (const {c, members, meshes, group} of crowds) {
        let vis = true; for (const [t0, v] of c.visible ?? []) if (t >= t0) vis = v; group.visible = vis; if (!vis) continue;
        members.forEach((m, i) => { const mm = memberMatrices(m, memberPose(m, c.mode, Math.max(0, t)), memberAt(m, c, t, groundY)); for (const [name, im] of Object.entries(meshes)) im.setMatrixAt(i, mm[name]); });
        for (const im of Object.values(meshes)) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
      }
    },
  };
}
