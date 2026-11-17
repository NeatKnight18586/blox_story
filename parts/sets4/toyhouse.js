// parts/sets4/toyhouse.js — the Toy House hall (format v5, Phase 3b). A reusable location (V4 D4): two levels, ~50×70, built
// to read from a straight-down camera (open top: no roof). x ∈ [−25, 25], z ∈ [−35, 35]; the street side is the front wall z = +35.
// Zones (top-down): go-kart track (left-centre) · foam-blaster arena (right-back) · ball pit (right) · trampoline (right-front) ·
// candy zone (left-front) · gadget wall + HYPERBOX 9 (left wall) · front counter (key on a hook, framed sepia photo, wall clock,
// register) · roll-up shutter + "OPENS 8:00 AM" · mezzanine along the back, stairs on the right · ceiling rollercoaster (mover).
// world.setState(k, v): shutter 0..1 (open amount), clock minutes after midnight. Practicals (rail bulbs) for `lightsCascade`.
// Static geometry is merged per material and baked (engine/bake.js); movers and glass are live.
import * as T from 'three';
import {HALL, TOY, box, plane, cyl, textPlate, tube, rnd, plastic, flat, mergeByMaterial, triCount} from './common.js';
import {toyProp} from './props4.js';

export const ZONES = {   // top-down footprints [x0, z0, x1, z1]
  track: [-17, -28, 5, 0], arena: [3, -33, 20, -8], pit: [8, 1, 23, 16], tramp: [10, 19, 22, 31], candy: [-24, 8, -9, 31], gadget: [-25, -29, -20, -8], counter: [-8, 24, 8, 33], mezz: [-25, -35, 25, -28],
};
export const TRACK = {c: [-6, -14], a: 9.5, b: 12.5, width: 5};
const railPts = () => { const P = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = 1 + .08 * Math.sin(a * 3); P.push([Math.sin(a) * 19 * r, 13.5 + 2.2 * Math.sin(a * 2 + .6) + (i % 4 === 0 ? 1 : 0), Math.cos(a) * 27 * r - 2]); } return P; };
export const railCurve = () => new T.CatmullRomCurve3(railPts().map(p => new T.Vector3(...p)), true);
// 24 evenly spaced bulbs along the rail: the `lightsCascade` points (published to parts/sets4/toyhouse.anchors.json)
export const PRACTICALS = (() => { const c = railCurve(); return Array.from({length: 24}, (_, i) => c.getPointAt(i / 24).toArray().map((v, k) => +(k === 1 ? v - .5 : v).toFixed(2))); })();
export const trackPoint = (u, off = 0) => { const a = u * Math.PI * 2, x = TRACK.c[0] + Math.sin(a) * (TRACK.a + off), z = TRACK.c[1] + Math.cos(a) * (TRACK.b + off); return [x, z, a]; };

// Floor height: the trampoline bed, the ball pit, the mezzanine and the stairs lift actors (pure).
export function groundY(x, z) {
  if (z < -28) return HALL.mezz;
  if (x > 21.4 && z <= -6 && z >= -28) return HALL.mezz * Math.min(1, Math.max(0, (-6 - z) / 22));
  if (Math.hypot(x - 16, z - 25) < 4.4) return 1.05;
  if (x > 8.6 && x < 22.4 && z > 1.6 && z < 15.4) return .8;
  return 0;
}
export const ANCHORS = {   // camera = eye level, top = a top-down camera over the zone
  hall: {at: [0, 0, 0], camera: {position: [0, 12, 23], target: [0, 3, -12], fov: 62}, top: {position: [0, 98, 0], target: [0, 0, 0], fov: 50}},
  counter: {at: [0, 0, 28], camera: {position: [-4.5, 5.5, 15], target: [0, 4.6, 31], fov: 42}, top: {position: [0, 36, 28], target: [0, 0, 28], fov: 45}},
  shutter: {at: [0, 5, 35], camera: {position: [0, 5, 15], target: [0, 5.5, 35], fov: 52}, top: {position: [0, 36, 30], target: [0, 0, 30], fov: 45}},
  track: {at: [-6, 0, -14], camera: {position: [10, 9, 8], target: [-6, 1, -14], fov: 58}, top: {position: [-6, 52, -14], target: [-6, 0, -14], fov: 45}},
  arena: {at: [12, 0, -20], camera: {position: [-6, 9, -2], target: [12, 2, -20], fov: 56}, top: {position: [12, 52, -20], target: [12, 0, -20], fov: 45}},
  pit: {at: [16, 0, 9], camera: {position: [2, 7, 2], target: [16, 1, 9], fov: 52}, top: {position: [16, 38, 9], target: [16, 0, 9], fov: 45}},
  tramp: {at: [16, 0, 25], camera: {position: [3, 8, 14], target: [16, 2, 25], fov: 52}, top: {position: [16, 38, 25], target: [16, 0, 25], fov: 45}},
  candy: {at: [-17, 0, 19], camera: {position: [-1, 8, 6], target: [-17, 3, 19], fov: 56}, top: {position: [-17, 40, 19], target: [-17, 0, 19], fov: 45}},
  gadget: {at: [-22, 0, -18], camera: {position: [-3, 6, -6], target: [-22, 4, -18], fov: 52}, top: {position: [-18, 38, -18], target: [-18, 0, -18], fov: 45}},
  hyperbox: {at: [-22, 2, -18], camera: {position: [-12, 4.2, -11], target: [-22, 2.4, -18], fov: 36}, top: {position: [-22, 22, -18], target: [-22, 0, -18], fov: 40}},
  mezz: {at: [0, 8.5, -32], camera: {position: [0, 13, 4], target: [0, 9.5, -33], fov: 56}, top: {position: [0, 44, -30], target: [0, 8.5, -30], fov: 45}},
  coaster: {at: [0, 14, -2], camera: {position: [0, 6, 28], target: [0, 15, -6], fov: 62}, top: {position: [0, 90, -2], target: [0, 14, -2], fov: 50}},
};

export function build(scene, {M4, look4, spec, front = true} = {}) {   // front: false = the street module supplies the front wall (composite world)
  const v4 = !!M4, dawn = spec?.look4 === 'dawn';
  const surf = (n, c, rep, fallback) => v4 ? M4.mat4(n, c, {repeat: rep}) : plastic(fallback ?? c);
  const wall = surf('plaster', '#fff1dc', [6, 3], '#fff1dc'), floor = surf('polishedFloor', '#fbe8d0', [8, 11], '#fbe8d0');
  const g = new T.Group(); g.name = 'toyhouse'; const live = new T.Group(); live.name = 'toyhouse_live'; live.userData.live = true;
  const W = HALL.w, D = HALL.d, H = HALL.h, X = W / 2, Z = D / 2, rand = rnd(7);
  const add = (...o) => { g.add(...o); return o[0]; };
  // ---- shell: floor, three walls and the front wall around the shutter opening (no roof: the top-down camera sees in) -------
  add(plane(W, D, floor, [0, 0, 0], {cell: 3}));
  add(box(.8, H, D, wall, [-X - .4, H / 2, 0], {cell: 6}), box(.8, H, D, wall, [X + .4, H / 2, 0], {cell: 6}), box(W + 1.6, H, .8, wall, [0, H / 2, -Z - .4], {cell: 6}));
  if (front) add(box(W / 2 - 9, H, .8, wall, [-(X + 9) / 2, H / 2, Z + .4], {cell: 6}), box(W / 2 - 9, H, .8, wall, [(X + 9) / 2, H / 2, Z + .4], {cell: 6}), box(18, H - 11, .8, wall, [0, 11 + (H - 11) / 2, Z + .4], {cell: 6}));
  for (const x of [-X - .4, X + .4]) add(box(.9, 1.1, D, '#3a86ff', [x * (1 + .001), 6.5, 0], {cell: 6}));   // colour band along the side walls
  add(box(W + 1.6, 1.1, .9, '#ff5a5f', [0, 6.5, -Z - .4], {cell: 6}));
  // zone floor plates (colour-coded so the top-down view reads)
  const plate = (z, c, y = .05) => add(box(z[2] - z[0], .12, z[3] - z[1], c, [(z[0] + z[2]) / 2, y, (z[1] + z[3]) / 2], {cell: 3}));
  plate(ZONES.arena, '#2ec4b6'); plate(ZONES.candy, '#ff9ec7'); plate(ZONES.gadget, '#3b3f8f'); plate(ZONES.counter, '#ffd9a0'); plate([ZONES.tramp[0] - 1, ZONES.tramp[1] - 1, ZONES.tramp[2] + 1, ZONES.tramp[3] + 1], '#ffd542');
  // ---- go-kart track: an elliptical ribbon, kerbs, tyre stacks ----------------------------------------------------------
  { const n = 72, pos = [], idx = [], uv = [], asphalt = surf('asphaltLane', '#ffffff', [1, 1], '#3d4047');
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, nx = Math.sin(a) / TRACK.a, nz = Math.cos(a) / TRACK.b, l = Math.hypot(nx, nz), o = [nx / l, nz / l];
      for (const s of [-1, 1]) { const x = TRACK.c[0] + Math.sin(a) * TRACK.a + o[0] * s * TRACK.width / 2, z = TRACK.c[1] + Math.cos(a) * TRACK.b + o[1] * s * TRACK.width / 2; pos.push(x, .1, z); uv.push(i * .35, s > 0 ? 1 : 0); } }
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals(); add(new T.Mesh(tg, asphalt));
    for (let i = 0; i < 36; i++) for (const s of [-1, 1]) { const a = i / 36 * Math.PI * 2, nx = Math.sin(a) / TRACK.a, nz = Math.cos(a) / TRACK.b, l = Math.hypot(nx, nz), r = TRACK.width / 2 + 1.1;
      add(cyl(.62, .7, i % 2 ? '#ff5a5f' : '#ffffff', [TRACK.c[0] + Math.sin(a) * TRACK.a + nx / l * s * r, .35, TRACK.c[1] + Math.cos(a) * TRACK.b + nz / l * s * r], {seg: 6, cell: 3})); }
    add(box(5, .13, .7, '#ffffff', [trackPoint(0)[0], .14, trackPoint(0)[1]], {cell: 3}));   // start line
  }
  // ---- foam-blaster arena: bright barriers, inflatable posts, a blaster rack -----------------------------------------------
  { const [x0, z0, x1, z1] = ZONES.arena;
    for (let i = 0; i < 16; i++) add(box(1.7, 1.6 + rand() * 1.4, 1.7, TOY[i % TOY.length], [x0 + 2 + rand() * (x1 - x0 - 4), 1, z0 + 3 + rand() * (z1 - z0 - 6)], {rot: [0, rand() * 3, 0], cell: 3}));
    for (let i = 0; i < 6; i++) add(cyl(.95, 3.6, TOY[(i + 2) % TOY.length], [x0 + 3 + i * 2.7, 1.8, z1 - 1.6], {seg: 10, cell: 3}));
    add(box(x1 - x0, 1.1, .5, '#ff8a00', [(x0 + x1) / 2, .55, z1 + .3], {cell: 3}), box(.5, 1.1, z1 - z0, '#ff8a00', [x1 + .3, .55, (z0 + z1) / 2], {cell: 3}));
    add(box(5, .4, 1.4, '#ffffff', [x0 + 3.2, 1.0, z1 + 1.8], {cell: 3})); for (let i = 0; i < 6; i++) { const b = toyProp('blaster', i + 1); b.position.set(x0 + 1.4 + i * .8, 1.45, z1 + 1.8); b.rotation.set(0, 0, 1.2); b.scale.setScalar(.7); add(b); } }
  // ---- ball pit (instanced balls ≤ 3k), trampoline ---------------------------------------------------------------------------
  { const [x0, z0, x1, z1] = ZONES.pit; add(box(x1 - x0, 1.5, .5, '#3a86ff', [(x0 + x1) / 2, .75, z0]), box(x1 - x0, 1.5, .5, '#3a86ff', [(x0 + x1) / 2, .75, z1]), box(.5, 1.5, z1 - z0, '#3a86ff', [x0, .75, (z0 + z1) / 2]), box(.5, 1.5, z1 - z0, '#3a86ff', [x1, .75, (z0 + z1) / 2]));
    add(box(x1 - x0 - .6, .1, z1 - z0 - .6, '#ffffff', [(x0 + x1) / 2, .08, (z0 + z1) / 2], {cell: 3}));
    const N = 800, im = new T.InstancedMesh(new T.OctahedronGeometry(.42, 0), new T.MeshLambertMaterial({color: '#ffffff'}), N), M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), r = rnd(11);
    for (let i = 0; i < N; i++) { const x = x0 + .6 + r() * (x1 - x0 - 1.2), z = z0 + .6 + r() * (z1 - z0 - 1.2), y = .35 + r() * .5; im.setMatrixAt(i, M.compose(new T.Vector3(x, y, z), q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), new T.Vector3(1, 1, 1))); im.setColorAt(i, new T.Color(TOY[Math.floor(r() * TOY.length)])); }
    im.name = 'ballPit'; im.userData.live = true; im.frustumCulled = false; g.add(im);
    const [tx, tz] = [16, 25]; add(cyl(5.4, .5, '#ff5a5f', [tx, .95, tz], {seg: 28}), cyl(4.4, .3, '#3a86ff', [tx, 1.15, tz], {seg: 28})); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(cyl(.28, .95, '#cfd3da', [tx + Math.sin(a) * 5, .48, tz + Math.cos(a) * 5], {seg: 6, cell: 3})); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .78; add(cyl(.18, 3.4, '#ffd542', [tx + Math.sin(a) * 5.6, 1.7, tz + Math.cos(a) * 5.6], {seg: 6, cell: 3})); }   // net posts
    add(box(.9, .12, 5, '#ffd542', [tx - 6.2, .1, tz], {cell: 3})); }
  // ---- candy zone: chocolate fountain, waterfall, gumball tower --------------------------------------------------------------
  { const [fx, fz] = [-17, 14]; add(cyl(3.4, .5, '#ffd9ec', [fx, .3, fz], {seg: 20}), cyl(2.6, 1.1, '#5a3320', [fx, 1.2, fz], {seg: 20}), cyl(1.9, 1.0, '#6b3a25', [fx, 2.4, fz], {seg: 20}), cyl(1.2, 1.0, '#7a4630', [fx, 3.5, fz], {seg: 20}), cyl(.35, 1.6, '#c98d5a', [fx, 4.6, fz], {seg: 8, cell: 3}));
    for (const [r, y] of [[2.6, 1.78], [1.9, 2.94], [1.2, 4.05]]) { const f = cyl(r + .08, .5, '#3d2114', [fx, y - .3, fz], {seg: 20, live: true}); live.add(f); }
    const [wx, wz] = [-23.4, 25]; add(box(7, .8, 3.4, '#3a86ff', [wx + 2, .4, wz], {cell: 3}), box(.5, 10, 6, '#f6a5c0', [-24.7, 5, wz], {cell: 3}));
    let map = null; if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 32; c.height = 256; const x = c.getContext('2d'); for (let i = 0; i < 256; i++) { const a = .55 + .35 * Math.sin(i * .35) * Math.sin(i * .11); x.fillStyle = `rgba(190,230,255,${a})`; x.fillRect(0, i, 32, 1); } map = new T.CanvasTexture(c); map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(1, 2); }
    const wf = new T.Mesh(new T.PlaneGeometry(5.2, 9.4), new T.MeshBasicMaterial({map, color: map ? '#ffffff' : '#9fd4ff', transparent: true, opacity: .85, side: T.DoubleSide})); wf.position.set(-24.3, 4.9, wz); wf.rotation.y = Math.PI / 2; wf.name = 'waterfall'; live.add(wf); g.userData.waterfallMap = map;
    const [gx, gz] = [-12, 26]; add(cyl(2.6, .9, '#ff5a5f', [gx, .45, gz], {seg: 16}), cyl(2.3, .5, '#ff5a5f', [gx, 10.1, gz], {seg: 16}), cyl(.5, 1.2, '#ffd542', [gx, 10.9, gz], {seg: 8, cell: 3}));
    const gl = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 8.6, 18, 1, true), new T.MeshStandardMaterial({color: '#cfe8ff', roughness: .1, transparent: true, opacity: .22, side: T.DoubleSide, depthWrite: false})); gl.position.set(gx, 5.4, gz); gl.name = 'gumballGlass'; live.add(gl);
    const GN = 300, gm = new T.InstancedMesh(new T.OctahedronGeometry(.3, 0), new T.MeshLambertMaterial({color: '#ffffff'}), GN), r = rnd(5), M = new T.Matrix4();
    for (let i = 0; i < GN; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 1.8; gm.setMatrixAt(i, M.makeTranslation(gx + Math.cos(a) * d, 1.2 + r() * 7.6, gz + Math.sin(a) * d)); gm.setColorAt(i, new T.Color(TOY[Math.floor(r() * TOY.length)])); }
    gm.name = 'gumballs'; gm.userData.live = true; gm.frustumCulled = false; g.add(gm);
    for (let i = 0; i < 5; i++) add(cyl(.45, 1.5, TOY[i], [-23 + i * 1.1, .8, 9.5], {seg: 6, cell: 3}), cyl(.7, .25, TOY[i], [-23 + i * 1.1, 1.65, 9.5], {seg: 8, cell: 3})); }   // lollipop stand
  // ---- gadget wall + HYPERBOX 9 -------------------------------------------------------------------------------------------------
  { const x = -24.2; for (const y of [1.4, 3.4, 5.4, 7.4]) add(box(1.6, .22, 22, '#6b4428', [x + .4, y, -18.5], {cell: 3}));
    add(box(.3, 8.6, 22, '#3b3f8f', [-24.85, 4.3, -18.5], {cell: 3}));
    const r = rnd(21); for (const y of [1.4, 3.4, 5.4, 7.4]) for (let i = 0; i < 12; i++) { const h = .9 + r() * 1.1; add(box(1.0, h, .8 + r() * .6, TOY[Math.floor(r() * TOY.length)], [x + .4, y + .11 + h / 2, -28 + i * 1.75 + r() * .3], {cell: 3})); }
    add(cyl(2.1, 1.3, '#ffffff', [-21.2, .65, -18.5], {seg: 16}), cyl(1.7, .15, '#ffd542', [-21.2, 1.35, -18.5], {seg: 16, cell: 3})); const hb = toyProp('hyperbox'); hb.position.set(-21.2, 1.42, -18.5); hb.rotation.y = Math.PI / 2 + .1; hb.name = 'hyperbox'; g.add(hb);
    const beam = new T.Mesh(new T.ConeGeometry(2.4, 10, 14, 1, true), new T.MeshBasicMaterial({color: '#fff3c0', transparent: true, opacity: .13, depthWrite: false, side: T.DoubleSide})); beam.position.set(-21.2, 6.5, -18.5); beam.rotation.x = Math.PI; beam.name = 'hyperboxBeam'; live.add(beam); }
  // ---- front: shutter (live: moves), sign, counter, back board with clock / key / photo / register ---------------------------------------------
  const shutter = new T.Group(); shutter.name = 'shutter'; { const slat = plastic('#aeb4bd'), slat2 = plastic('#9aa0a8'); for (let i = 0; i < 22; i++) { const s = new T.Mesh(new T.BoxGeometry(18, .5, .3), i % 2 ? slat : slat2); s.position.set(0, .25 + i * .5, 0); shutter.add(s); }
    shutter.add(box(.5, 11, .5, '#6b7078', [-9.2, 5.5, 0], {cell: 9}), box(.5, 11, .5, '#6b7078', [9.2, 5.5, 0], {cell: 9}), box(18.8, .8, .8, '#6b7078', [0, 11.4, 0], {cell: 9})); }
  shutter.position.set(0, 0, Z - .2); live.add(shutter);
  const sign = textPlate('OPENS 8:00 AM', {w: 8.4, h: 2.4, bg: '#ffd542', fg: '#2b2d33', lines: ['OPENS', '8:00 AM'], border: '#ff5a5f', name: 'signOpens'}); sign.position.set(0, 8.4, Z - .5); sign.rotation.y = Math.PI; live.add(sign);
  const cz = 27.5; add(box(12, 3.4, 2.4, '#ffffff', [0, 1.7, cz]), box(12.6, .3, 3.0, '#ff5a5f', [0, 3.5, cz]), box(12, 3.4, .3, '#3a86ff', [0, 1.7, cz + 1.3], {cell: 3}));
  add(box(17, 10, .4, '#fff7ea', [0, 5, 31.6]), box(17.4, .5, .5, '#ff5a5f', [0, 10.2, 31.6], {cell: 3}), box(.5, 10, .5, '#ff5a5f', [-8.7, 5, 31.6], {cell: 3}), box(.5, 10, .5, '#ff5a5f', [8.7, 5, 31.6], {cell: 3}));
  const reg = toyProp('register'); reg.position.set(3.8, 3.65, cz); reg.rotation.y = Math.PI; g.add(reg);
  const hook = toyProp('hook'); hook.position.set(-4.4, 5.6, 31.25); hook.rotation.y = Math.PI; g.add(hook); const key = toyProp('key'); key.position.set(-4.4, 5.05, 30.95); key.rotation.y = Math.PI; key.scale.setScalar(1.15); key.name = 'key'; g.add(key);
  const frame = toyProp('photoFrame'); frame.position.set(4.6, 6.0, 31.25); frame.rotation.y = Math.PI; frame.scale.setScalar(1.25); g.add(frame);
  // big wall clock: face (canvas), two hands (live, driven by setState('clock', minutes))
  const clock = new T.Group(); clock.name = 'clock'; clock.userData.live = true; { let map = null; if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill(); x.strokeStyle = '#ff5a5f'; x.lineWidth = 26; x.stroke();
      x.fillStyle = '#2b2d33'; x.font = 'bold 64px Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let h = 1; h <= 12; h++) { const a = h / 12 * Math.PI * 2; x.fillText(String(h), 256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190); } map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8; }
    const face = new T.Mesh(new T.CircleGeometry(2.3, 32), new T.MeshBasicMaterial({map, color: map ? '#ffffff' : '#ffffff'})); face.name = 'clockFace'; clock.add(face);
    const hand = (w, l, c, n) => { const p = new T.Group(); const m = new T.Mesh(new T.BoxGeometry(w, l, .06), new T.MeshBasicMaterial({color: c})); m.position.y = l / 2 - .15; p.add(m); p.position.z = .06; p.name = n; clock.add(p); return p; };
    clock.userData.hour = hand(.2, 1.2, '#2b2d33', 'hourHand'); clock.userData.minute = hand(.13, 1.9, '#2b2d33', 'minuteHand'); }
  clock.position.set(0, 7.2, 31.3); clock.rotation.y = Math.PI; live.add(clock);
  const setClock = min => { const h = (min / 60) % 12, m = min % 60; clock.userData.hour.rotation.z = -h / 12 * Math.PI * 2; clock.userData.minute.rotation.z = -m / 60 * Math.PI * 2; }; setClock(7 * 60 + 55);
  // ---- mezzanine (back strip, level 2), rail, stairs (right wall) ---------------------------------------------------------------------------------
  add(box(W, .5, 7, '#ffe3ba', [0, HALL.mezz - .25, -31.5], {cell: 3}), box(W, .45, .4, '#ff8a00', [0, HALL.mezz + 1.4, -27.9], {cell: 3}));
  for (let i = 0; i <= 12; i++) add(box(.3, 1.5, .3, '#ff8a00', [-X + i * W / 12, HALL.mezz + .75, -27.9], {cell: 3}));
  for (let i = 0; i < 6; i++) add(cyl(.5, HALL.mezz, '#cfd3da', [-22 + i * 8.8, HALL.mezz / 2, -28.2], {seg: 6, cell: 4}));
  { const n = 24; for (let i = 0; i < n; i++) add(box(3.6, .35, .95, i % 2 ? '#ffb400' : '#ff8a00', [23.2, .18 + i * HALL.mezz / n, -6 - (i + .5) * 22 / n], {cell: 4})); add(box(.3, 1.2, 22, '#ff8a00', [21.3, 4.6, -17], {rot: [Math.atan2(HALL.mezz, 22) * 0, 0, 0], cell: 4})); }
  // ---- ceiling rollercoaster: rails, supports, truss, lamps --------------------------------------------------------------------------------------
  const rail = tube(railPts(), .28, '#ffd542', {closed: true, step: 1.4}); const rail2 = tube(railPts().map(p => [p[0], p[1] - .7, p[2]]), .18, '#ff5a5f', {closed: true, step: 1.4}); add(rail.mesh, rail2.mesh);
  for (let i = 0; i < 10; i++) { const p = railCurve().getPointAt(i / 10); if ((Math.abs(p.x) < 13 && p.z > 12) || (p.x > ZONES.track[0] && p.x < ZONES.track[2] && p.z > ZONES.track[1] && p.z < ZONES.track[3])) continue; add(cyl(.35, p.y, '#cfd3da', [p.x, p.y / 2, p.z], {seg: 6, cell: 4})); }   // posts stay out of the counter view and the track
  for (const z of [-24, -2, 20]) add(box(W, .5, .5, '#6b7078', [0, H - .4, z], {cell: 4}));
  const lamps = []; for (const z of [-26, -12, 2, 16, 28]) for (const x of [-16, 0, 16]) lamps.push([x, H - 1.3, z]);
  for (const p of lamps) { const l = new T.Mesh(new T.CylinderGeometry(1.1, 1.4, .5, 12), new T.MeshBasicMaterial({color: '#fff3d0', toneMapped: false})); l.position.set(...p); l.userData.live = true; live.add(l); }
  const cart = new T.Group(); cart.name = 'coasterCart'; for (let i = 0; i < 3; i++) { const c = box(1.8, 1.0, 2.6, TOY[i * 2], [0, -.9, -i * 2.9], {live: true}); cart.add(c); } live.add(cart);
  // bulbs on the rail: live (halo sprites are added by the episode's lightsCascade effect from PRACTICALS; the bake sees them as lights)
  const bulbs = PRACTICALS.map(p => { const b = new T.Mesh(new T.SphereGeometry(.25, 8, 6), new T.MeshBasicMaterial({color: '#ffd68a', toneMapped: false})); b.position.set(...p); b.userData.live = true; b.name = 'railBulb'; live.add(b); return b; });
  // ---- movers: go-karts on the track, the coaster cart ---------------------------------------------------------------------------------------------
  const karts = [0, 1, 2].map(i => { const k = toyProp('kart', i * 2 + 1); k.userData.live = true; k.traverse(o => { o.userData.live = true; }); live.add(k); return k; });
  const rc = railCurve(), L = rc.getLength(), tmp = new T.Vector3();
  const placeMovers = t => {
    karts.forEach((k, i) => { const u = ((t * .045 + i * .31) % 1 + 1) % 1, [x, z] = trackPoint(u), [x2, z2] = trackPoint(u + .004); k.position.set(x, .12, z); k.rotation.y = Math.atan2(x2 - x, z2 - z) + Math.PI / 2; });
    const u = ((t * 4.5 / L) % 1 + 1) % 1; rc.getPointAt(u, tmp); cart.position.copy(tmp); const nx = rc.getPointAt((u + .01) % 1); cart.lookAt(nx.x, tmp.y, nx.z);
  };
  placeMovers(0);
  // ---- merge statics, practical lights for the bake -------------------------------------------------------------------------------------------------
  const stats = mergeByMaterial(g); g.add(live); scene.add(g);
  const lights = [...lamps.map(p => ({p: [p[0], p[1] - 1.5, p[2]], color: [1, .93, .8], i: 2.2, range: 24})), {p: [0, 8.4, 29], color: [1, .85, .6], i: 2.4, range: 14}, {p: [-21.2, 8, -18.5], color: [1, .95, .8], i: 2.0, range: 12},
    ...PRACTICALS.filter((_, i) => i % 3 === 0).map(p => ({p, color: [1, .8, .5], i: .6, range: 7}))];
  const world = {anchors: Object.fromEntries(Object.entries(ANCHORS).map(([k, a]) => [k, {position: a.at, camera: a.camera, top: a.top}])), groundY, lights, practicals: PRACTICALS, zones: ZONES, root: g, stats: {...stats, tris: Math.round(triCount(g))}, ballPit: 800,
    setState(k, v) { if (k === 'shutter') shutter.position.y = Math.max(0, Math.min(1, v)) * 11.2; else if (k === 'clock') setClock(v); },
    update(t) { placeMovers(t); const wm = g.userData.waterfallMap; if (wm) wm.offset.y = -t * .9; }};
  return world;
}
