// engine/crowd.js — instanced background crowds (Amendment A4 B3): up to 60 low-detail block bodies per shot.
// One InstancedMesh per body part (torso, head, hair, 2 arms, 2 legs: 7 draw calls for the whole crowd, 12 triangles a
// part). Each member is posed by the same pose library as the cast (ambientPose, `run` for panic, `lookUp`), so the crowd
// moves like the actors; per-member matrices are a pure function of (member, t).
// spec.crowds = [{id, count, centre: [x, z] | {anchor, offset}, radius | area: [w, d], mode: 'ambient'|'panic'|'lookUp'|'cheer',
//   dir: [x, z] (panic), speed, seed, face: [x, z] (look toward), expression (face decal), visible: [[t, bool]], scale}]
import * as T from 'three';
import {crowdColours} from './heroread.js';
import {ambientPose, samplePose, RUN_SPEED} from './poses.js';
import {PARTS, SKINS, headGeometry, createActor, plastic} from '../avatar-style/body.js';
import {hair4Geometry} from '../avatar-style/hair4.js';
import {hair4Material} from '../avatar-style/hair.js';
import {setFace} from '../avatar-style/faces2.js';
import {applyPoseSample} from './poses.js';
import {faceMaterial} from '../avatar-style/faces2.js';
import {faceMaterial3, setFace3} from '../avatar-style/faces3.js';

export const CROWD_MAX = 60;
const SHIRTS = ['#4f7cc4', '#c0392b', '#7a8a4a', '#6b4a8f', '#2e9e78', '#a0683a', '#d9a440', '#e2733a', '#3f8fb0', '#b84a7a'];
const PANTS = ['#3b3f46', '#5a4632', '#2f4a6b', '#6b6b6b', '#2a2a30'];
const HAIR = ['#3a2418', '#6b4428', '#c8692a', '#e8c25a', '#202020', '#9a9a9a'];
const r1 = (seed, k) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 43758.5453; return x - Math.floor(x); };

// Members (pure): seeded positions inside a disc or rectangle, colours, phase.
export function crowdMembers({count = 20, centre = [0, 0], radius = 12, inner = 0, area = null, seed = 1, mode = 'ambient', dir = [0, 1], speed = RUN_SPEED * .8, face = null, scale = 1,
  spacing = 0, clear = []} = {}) {   // inner (opt-in): a ring · spacing / clear [[x, z, r]] (opt-in): no two members closer than spacing, none inside a clear circle
  const n = Math.min(CROWD_MAX, count), out = [], spot = s => { const a = r1(s, 1) * Math.PI * 2, d = inner ? Math.sqrt(inner * inner + r1(s, 2) * (radius * radius - inner * inner)) : Math.sqrt(r1(s, 2)) * radius;
    return area ? [centre[0] + (r1(s, 1) - .5) * area[0], centre[1] + (r1(s, 2) - .5) * area[1]] : [centre[0] + Math.sin(a) * d, centre[1] + Math.cos(a) * d]; };
  const ok = ([x, z]) => out.every(m => Math.hypot(m.x - x, m.z - z) >= spacing) && clear.every(([cx, cz, cr]) => Math.hypot(cx - x, cz - z) >= cr);
  for (let i = 0; i < n; i++) {
    let s = seed * 1000 + i, p = spot(s);
    if (spacing || clear.length) { let k = 0; while (!ok(p) && k < 60) { k++; s = seed * 1000 + i + k * 7919; p = spot(s); } if (!ok(p)) continue; }   // a member that cannot fit is left out
    const [x, z] = p;
    const yaw = mode === 'panic' ? Math.atan2(dir[0], dir[1]) + (r1(s, 3) - .5) * .5 : face ? Math.atan2(face[0] - x, face[1] - z) + (r1(s, 3) - .5) * .6 : r1(s, 3) * Math.PI * 2;
    out.push({i: out.length, x, z, yaw, seed: s, phase: r1(s, 4) * 3, speed: speed * (.8 + r1(s, 5) * .4), scale: scale * (.86 + r1(s, 6) * .2),
      skin: SKINS[Math.floor(r1(s, 7) * SKINS.length)], shirt: SHIRTS[Math.floor(r1(s, 8) * SHIRTS.length)], pants: PANTS[Math.floor(r1(s, 9) * PANTS.length)], hair: HAIR[Math.floor(r1(s, 10) * HAIR.length)]});
  }
  return out;
}
// Pose sample for a member at time t (pure).
export function memberPose(m, mode, t) {
  if (mode === 'panic') return samplePose('run', t + m.phase);
  if (mode === 'lookUp') return samplePose('lookUp', t + m.phase * .3);
  if (mode === 'cheer') return samplePose('cheer', t + m.phase);
  if (mode === 'sit') { const p = samplePose('sit', t, {ground: true}); p.pivots.leftShoulder = [-.75, 0, .35]; p.pivots.rightShoulder = [-.75, 0, -.35]; p.pivots.head = [.22, 0, 0]; return p; }   // opt-in (egg S51): seated, hands round a lap egg, looking down at it
  return ambientPose(m.seed, t);
}
// Where the member stands at t (pure): panic members run along dir from their spot.
export function memberAt(m, c, t, groundY = () => 0) {
  const k = c.mode === 'panic' ? m.speed * Math.max(0, t - (c.at ?? 0)) : 0, l = Math.hypot(...(c.dir ?? [0, 1])) || 1;
  const x = m.x + (c.dir?.[0] ?? 0) / l * k, z = m.z + (c.dir?.[1] ?? 1) / l * k; return [x, groundY(x, z), z];
}

// A5: heads are the low lathe head (a box's corners poke through fitted hair) and hair is hair v4's `crowd` tier
// (the mass alone, ≤ 140 tris) in one of CROWD_HAIR styles × six colours (instance colour × a white vertex gradient).
export const CROWD_HAIR = ['messy_fringe', 'long_layered', 'curtains', 'wavy_bob', 'shaggy_mop', 'high_ponytail'];
export const PROMOTE = {radius: 9, max: 8, sizes: ['close', 'medium']};
// Pure: which crowd members (indices) become mid-tier actors in this shot: shot size close/medium, nearer than 9 units
// to the camera, at most 8, nearest first (ties by index).
export function promoteNear(points, camPos, size, {radius = PROMOTE.radius, max = PROMOTE.max} = {}) {
  if (!PROMOTE.sizes.includes(size)) return [];
  return points.map((p, i) => ({i, d: Math.hypot(p[0] - camPos[0], p[1] + 2.5 - camPos[1], p[2] - camPos[2])})).filter(x => x.d < radius).sort((a, b) => a.d - b.d || a.i - b.i).slice(0, max).map(x => x.i);
}
const BODY = [   // instanced parts: [name, pivot, size]
  ['torso', null, PARTS.torso.size], ['head', 'head', [1, 1, 1]], ['hair', 'head', [1, 1, 1]],
  ['leftArm', 'leftShoulder', PARTS.leftArm.size], ['rightArm', 'rightShoulder', PARTS.rightArm.size], ['leftLeg', 'leftHip', PARTS.leftLeg.size], ['rightLeg', 'rightHip', PARTS.rightLeg.size]];
const PIVOT_AT = {head: [0, 4.03, 0], leftShoulder: PARTS.leftArm.pivotAt, rightShoulder: PARTS.rightArm.pivotAt, leftHip: PARTS.leftLeg.pivotAt, rightHip: PARTS.rightLeg.pivotAt};
const PART_AT = {lap: [0, 2.45, .95], face: [0, .56, .555], torso: PARTS.torso.at, head: [0, .58, 0], hair: [0, .58, 0], leftArm: PARTS.leftArm.at, rightArm: PARTS.rightArm.at, leftLeg: PARTS.leftLeg.at, rightLeg: PARTS.rightLeg.at};

// Matrices for one member: {part: Matrix4} (pure, THREE math only).
const _r = new T.Matrix4(), _p = new T.Matrix4(), _o = new T.Matrix4(), _e = new T.Euler(), _q = new T.Quaternion(), _v = new T.Vector3(), _s = new T.Vector3();
export function memberMatrices(m, s, at) {
  const root = new T.Matrix4().compose(_v.set(at[0] + s.root.dx * m.scale, at[1] + s.root.dy * m.scale, at[2] + s.root.dz * m.scale), _q.setFromEuler(_e.set(s.root.lean, m.yaw + s.root.yaw, s.root.roll, 'YXZ')), _s.setScalar(m.scale));
  const out = {};
  for (const [name, pivot, size] of [...BODY, ['face', 'head', [1, 1, 1]], ['lap', null, [.5, .65, .5]]]) {
    _o.compose(_v.fromArray(PART_AT[name]), _q.identity(), _s.fromArray(size));
    if (pivot) { _p.compose(_v.fromArray(PIVOT_AT[pivot]), _q.setFromEuler(_e.set(...s.pivots[pivot], 'XYZ')), _s.setScalar(1)); out[name] = root.clone().multiply(_p).multiply(_o); }
    else out[name] = root.clone().multiply(_o);
  }
  return out;
}

export function createCrowds(scene, list = [], {groundY = () => 0, resolveCentre = c => c, avoidColours = [], faces = 'v2'} = {}) {   // faces 'v3': Faces v3 crowd tier (season 1)   // avoidColours: Season 1 hero readability (engine/heroread.js)
  const box = new T.BoxGeometry(1, 1, 1), mat = new T.MeshPhongMaterial({color: '#ffffff', shininess: 30, specular: '#333333'});
  const hairWhite = CROWD_HAIR.map(st => hair4Geometry(st, '#ffffff', 'crowd'));
  const crowds = list.map(c => {
    const members = crowdColours(crowdMembers({...c, centre: resolveCentre(c.centre ?? [0, 0])}), avoidColours), n = members.length, group = new T.Group(); group.name = 'crowd_' + (c.id ?? 'x');
    members.forEach(m => { m.hairStyle = m.i % CROWD_HAIR.length; });
    const meshes = {};
    for (const [name] of BODY) {
      if (name === 'hair') continue;
      const im = new T.InstancedMesh(name === 'head' ? headGeometry('bg') : box, mat, n); im.castShadow = true; im.receiveShadow = false; im.name = group.name + '_' + name; im.frustumCulled = false; group.add(im); meshes[name] = im;
    }
    // one hair InstancedMesh per crowd style, holding only that style's members (slot map: member → [style, slot])
    const hairs = CROWD_HAIR.map((st, k) => { const ms = members.filter(m => m.hairStyle === k); if (!ms.length) return null; const im = new T.InstancedMesh(hairWhite[k], hair4Material(), ms.length);
      im.castShadow = true; im.frustumCulled = false; im.name = group.name + '_hair_' + st; ms.forEach((m, j) => { m.hairSlot = j; im.setColorAt(j, new T.Color(m.hair)); }); im.instanceColor.needsUpdate = true; group.add(im); return im; });
    const col = new T.Color();
    members.forEach((m, i) => { for (const [name, im] of Object.entries(meshes)) im.setColorAt(i, col.set(name === 'torso' || name.endsWith('Arm') ? (name === 'torso' ? m.shirt : (m.i % 3 ? m.shirt : m.skin)) : name.endsWith('Leg') ? m.pants : m.skin)); });
    for (const im of Object.values(meshes)) im.instanceColor.needsUpdate = true;
    const face = new T.InstancedMesh(new T.PlaneGeometry(1, .68), faces === 'v3' ? faceMaterial3(c.expression ?? 'smile', 'crowd', '#5a3826') : faceMaterial(c.expression ?? 'smile', 'bg'), n); face.name = group.name + '_face'; face.frustumCulled = false; group.add(face); meshes.face = face;
    // promotion pool: up to PROMOTE.max mid-tier actors (lathe body, faces, v4 mid hair), recoloured per assignment
    const pool = Array.from({length: Math.min(PROMOTE.max, n)}, (_, k) => { const mats = {torso: plastic('#ffffff').clone(), arm: plastic('#ffffff').clone(), leg: plastic('#ffffff').clone(), skin: plastic('#ffffff').clone()};
      const a = createActor({tier: 'bg', name: group.name + '_mid' + k, materials: {torso: mats.torso, leftArm: mats.arm, rightArm: mats.arm, leftLeg: mats.leg, rightLeg: mats.leg, head: mats.skin}});
      if (faces === 'v3') setFace3(a, c.expression ?? 'smile'); else setFace(a, c.expression ?? 'smile'); const hm = new T.Mesh(hair4Geometry(CROWD_HAIR[0], '#ffffff', 'mid'), hair4Material()); hm.position.y = .58; hm.castShadow = true; a.pivots.head.add(hm);
      a.root.visible = false; group.add(a.root); return {a, mats, hm}; });
    let lap = null;   // opt-in lapEggs: '#rrggbb' → one glowing egg in every lap (sit mode)
    if (c.lapEggs) { const eg = new T.SphereGeometry(1, 10, 7); lap = new T.InstancedMesh(eg, new T.MeshPhongMaterial({color: c.lapEggs, emissive: c.lapEggs, emissiveIntensity: 1.3, shininess: 60}), n); lap.name = group.name + '_lapEggs'; lap.frustumCulled = false; group.add(lap); }
    const exprMats = c.expressions && faces === 'v3' ? Object.fromEntries(c.expressions.map(([, e]) => [e, faceMaterial3(e, 'crowd', '#5a3826')])) : null;   // opt-in: [[t, expression]]
    scene.add(group); return {c, members, meshes, hairs, group, pool, lap, exprMats};
  });
  const Z = new T.Matrix4().makeScale(0, 0, 0);
  const last = new Map();   // per crowd: positions from the last update (overlap check)
  return {
    crowds,
    // ctx (optional): {camPos, size} of the current shot → near members are promoted to mid-tier actors
    places: () => crowds.filter(x => x.group.visible).flatMap(x => { const L = last.get(x.c); return L ? L.at.map((p, i) => ({name: `${x.c.id ?? 'crowd'}#${i}`, crowd: x.c.mode ?? 'ambient', x: p[0], z: p[2], y: p[1], r: .95 * L.members[i].scale})) : []; }),
    update(t, ctx = {}) {
      for (const {c, members, meshes, hairs, group, pool, lap, exprMats} of crowds) {
        let vis = true; for (const [t0, v] of c.visible ?? []) if (t >= t0) vis = v; group.visible = vis; if (!vis) continue;
        const at = members.map(m => memberAt(m, c, t, groundY)); last.set(c, {at, members}); const promoted = ctx.camPos ? promoteNear(at, ctx.camPos, ctx.size) : [], P = new Set(promoted);
        members.forEach((m, i) => {
          const pose = memberPose(m, c.mode, Math.max(0, t)), mm = memberMatrices(m, pose, at[i]);
          for (const [name, im] of Object.entries(meshes)) im.setMatrixAt(i, P.has(i) ? Z : mm[name]);
          hairs[m.hairStyle]?.setMatrixAt(m.hairSlot, P.has(i) ? Z : mm.hair); lap?.setMatrixAt(i, mm.lap);
        });
        if (lap) { lap.instanceMatrix.needsUpdate = true; lap.computeBoundingSphere(); }
        if (exprMats) { let e = null; for (const [t0, x] of c.expressions) if (t >= t0) e = x; if (e) meshes.face.material = exprMats[e]; }
        pool.forEach((p, k) => { const i = promoted[k]; p.a.root.visible = i !== undefined; if (i === undefined) return; const m = members[i];
          p.mats.torso.color.set(m.shirt); p.mats.arm.color.set(m.i % 3 ? m.shirt : m.skin); p.mats.leg.color.set(m.pants); p.mats.skin.color.set(m.skin);
          p.hm.geometry = hair4Geometry(CROWD_HAIR[m.hairStyle], m.hair, 'mid'); p.a.root.scale.setScalar(m.scale);
          applyPoseSample(p.a, memberPose(m, c.mode, Math.max(0, t)), {position: at[i], yaw: m.yaw}); });
        for (const im of [...Object.values(meshes), ...hairs.filter(Boolean)]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
      }
    },
  };
}
