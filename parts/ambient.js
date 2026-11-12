// parts/ambient.js — ambient movers (docs/V2_BRIEF.md §7.2), each {object, update(t)} with t in
// seconds and NO hidden state: the same t always gives the same pose, so frames render in any order.
// flag, smoke, birds, flame, spinner, walkers (background actors along a curve), floaters.
import * as T from 'three';
import {mat} from './materials.js';
import {rng} from './build.js';
import {buildActor, townsperson} from '../engine/actors.js';
import {samplePose, applyPoseSample, WALK_SPEED} from '../engine/poses.js';

// Flag/banner on a pole: a segmented cloth whose vertices wave (CPU, deterministic).
export function flag({w = 3, h = 2, color = '#e2483d', pole = 7, seed = 1} = {}) {
  const g = new T.Group(); g.userData.keep = true;
  const p = new T.Mesh(new T.CylinderGeometry(.12, .12, pole, 6), mat('plastic', '#6b4428')); p.position.y = pole / 2; p.castShadow = true; g.add(p);
  const geo = new T.PlaneGeometry(w, h, 8, 1); geo.translate(w / 2, 0, 0);
  const cloth = new T.Mesh(geo, new T.MeshPhongMaterial({color, side: T.DoubleSide, shininess: 10})); cloth.position.y = pole - h / 2 - .2; cloth.castShadow = true; g.add(cloth);
  const base = Float32Array.from(geo.attributes.position.array), ph = rng(seed)() * 6;
  return {object: g, update(t) {
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = base[i * 3], k = x / w; a.setZ(i, Math.sin(t * 5 + ph - x * 1.6) * .32 * k); a.setY(i, base[i * 3 + 1] - .15 * k * k); }
    a.needsUpdate = true; geo.computeVertexNormals();
  }};
}

// Chimney smoke: N grey block puffs rising, growing and fading on a loop (instanced).
export function smoke({at = [0, 0, 0], n = 7, rise = 6, period = 4, seed = 1, color = '#d9dde3'} = {}) {
  const m = new T.MeshPhongMaterial({color, transparent: true, opacity: .75, flatShading: true, depthWrite: false});
  const im = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), m, n); im.userData.keep = true; im.frustumCulled = false;
  const R = rng(seed), off = Array.from({length: n}, () => [R() * period, R() - .5, R() - .5]), M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  return {object: im, update(t) {
    off.forEach(([o, dx, dz], i) => {
      const u = ((t + o) % period) / period, s = .5 + u * 1.4;
      e.set(u * 2, u * 3, 0); q.setFromEuler(e);
      M.compose(new T.Vector3(at[0] + dx * u * 2 + u * 1.5, at[1] + u * rise, at[2] + dz * u * 2), q, new T.Vector3(s, s, s)); im.setMatrixAt(i, M);
    });
    im.instanceMatrix.needsUpdate = true;
  }};
}

// Birds: little dark V shapes circling a point, wings flapping.
export function birds({centre = [0, 30, 0], n = 5, r = 14, seed = 1} = {}) {
  const g = new T.Group(); g.userData.keep = true; const R = rng(seed), list = [];
  const wing = new T.BoxGeometry(.9, .08, .35), m = mat('plastic', '#2b2f36');
  for (let i = 0; i < n; i++) {
    const b = new T.Group(), l = new T.Mesh(wing, m), rr = new T.Mesh(wing, m); l.position.x = -.42; rr.position.x = .42; b.add(l, rr); g.add(b);
    list.push({b, l, rr, ph: R() * 6, rad: r * (.7 + R() * .6), h: (R() - .5) * 4, sp: .25 + R() * .15});
  }
  return {object: g, update(t) {
    for (const k of list) {
      const a = k.ph + t * k.sp; k.b.position.set(centre[0] + Math.sin(a) * k.rad, centre[1] + k.h + Math.sin(t * .7 + k.ph) * .6, centre[2] + Math.cos(a) * k.rad);
      k.b.rotation.y = a + Math.PI / 2; const f = Math.sin(t * 9 + k.ph) * .5; k.l.rotation.z = f; k.rr.rotation.z = -f;
    }
  }};
}

// Flame: two emissive cones flickering (torches, braziers, the dragon night).
export function flame({at = [0, 0, 0], size = 1, seed = 1} = {}) {
  const g = new T.Group(); g.userData.keep = true; g.position.set(...at);
  const outer = new T.Mesh(new T.ConeGeometry(.35 * size, 1.1 * size, 5), mat('neon', '#ff8a1f')), inner = new T.Mesh(new T.ConeGeometry(.2 * size, .7 * size, 5), mat('neon', '#ffe066'));
  outer.position.y = .55 * size; inner.position.y = .4 * size; g.add(outer, inner); const ph = rng(seed)() * 6;
  return {object: g, update(t) { const k = 1 + .18 * Math.sin(t * 13 + ph) + .1 * Math.sin(t * 29 + ph * 2); outer.scale.set(1, k, 1); inner.scale.set(1, 2 - k, 1); outer.rotation.y = t * 2; }};
}

// Spinner: rotates a group about an axis (windmill sails, a weathervane).
export function spinner(object, {axis = 'z', speed = .6} = {}) { object.userData.keep = true; return {object, update(t) { object.rotation[axis] = t * speed; }}; }

// Walkers: background townsfolk walking a closed curve (or back and forth on an open one), seeded.
export function walkers(curve, count, seed = 1, {closed = true, speed = WALK_SPEED} = {}) {
  const g = new T.Group(); g.userData.keep = true; const R = rng(seed), L = curve.getLength(), people = [];
  for (let i = 0; i < count; i++) { const a = buildActor(townsperson(Math.floor(R() * 1000) + 1)); g.add(a.root); people.push({a, off: R() * L, dir: R() < .5 ? 1 : -1, ph: R() * 1.2}); }
  return {object: g, update(t) {
    for (const p of people) {
      let d = p.off + p.dir * speed * t, u;
      if (closed) u = ((d % L) + L) % L / L; else { const k = ((d % (2 * L)) + 2 * L) % (2 * L); u = k <= L ? k / L : 2 - k / L; }
      const pt = curve.getPointAt(u), tan = curve.getTangentAt(u), back = !closed && (((d % (2 * L)) + 2 * L) % (2 * L)) > L;
      const sgn = (p.dir > 0) !== back ? 1 : -1;
      applyPoseSample(p.a, samplePose('walk', t + p.ph), {position: [pt.x, pt.y, pt.z], yaw: Math.atan2(tan.x * sgn, tan.z * sgn)});
    }
  }};
}

// Floaters: objects bobbing and drifting gently (lanterns, boats, leaves, block clouds).
export function floaters(objects, {amp = .3, speed = .8, drift = [0, 0, 0], seed = 1} = {}) {
  const g = new T.Group(); g.userData.keep = true; const R = rng(seed), base = objects.map(o => { g.add(o); return {o, p: o.position.clone(), ph: R() * 6}; });
  return {object: g, update(t) { for (const b of base) b.o.position.set(b.p.x + drift[0] * t, b.p.y + Math.sin(t * speed + b.ph) * amp + drift[1] * t, b.p.z + drift[2] * t); }};
}
