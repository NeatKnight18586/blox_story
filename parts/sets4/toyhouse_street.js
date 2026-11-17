// parts/sets4/toyhouse_street.js — the street outside the Toy House at dawn (format v5, Phase 3b): the shop facade (shutter down,
// "OPENS 8:00 AM"), neighbours, lamp posts still lit, a moving truck that drives in (world.setState('truck', 0..1)).
// Coordinates match the hall: the shop's front wall is the plane z = +35; the street runs along x at z ≈ 52; camera side is +z.
import * as T from 'three';
import {box as box0, plane, cyl, textPlate, plastic, TOY, rnd, mergeByMaterial, triCount} from './common.js';

const box = (w, h, d, m, at, o = {}) => box0(w, h, d, m, at, {cell: 8, ...o});   // the street is seen from afar: coarse tessellation
export const TRUCK = {from: -78, to: -24, z: 52.5, len: 17};
export const truckX = u => TRUCK.from + (TRUCK.to - TRUCK.from) * (1 - (1 - Math.max(0, Math.min(1, u))) ** 2.2);   // eased arrival (pure)
export const groundY = () => 0;
export const ANCHORS = {
  street: {at: [0, 0, 50], camera: {position: [2, 7, 80], target: [0, 6.5, 35], fov: 52}, top: {position: [0, 96, 52], target: [0, 0, 52], fov: 50}},
  facade: {at: [0, 6, 35], camera: {position: [0, 4.5, 56], target: [0, 6, 35], fov: 48}, top: {position: [0, 44, 40], target: [0, 0, 40], fov: 45}},
  shutter: {at: [0, 5, 35], camera: {position: [0, 3.2, 47], target: [0, 5.2, 35], fov: 44}, top: {position: [0, 30, 40], target: [0, 0, 40], fov: 40}},
  truck: {at: [-24, 3, 52.5], camera: {position: [-6, 3.6, 70], target: [-24, 3.4, 52.5], fov: 50}, top: {position: [-24, 46, 52.5], target: [-24, 0, 52.5], fov: 45}},
  lamp: {at: [18, 5, 44], camera: {position: [10, 3, 62], target: [18, 5.5, 44], fov: 40}, top: {position: [18, 30, 44], target: [18, 0, 44], fov: 40}},
};
export function build(scene, {M4, look4, spec} = {}) {
  const v4 = !!M4, surf = (n, c, rep, f) => v4 ? M4.mat4(n, c, {repeat: rep}) : plastic(f ?? c);
  const g = new T.Group(); g.name = 'toystreet'; const live = new T.Group(); live.name = 'toystreet_live'; live.userData.live = true; const r = rnd(3), lights = [];
  g.add(plane(260, 220, surf('plaster', '#8f9a86', [14, 12], '#8f9a86'), [0, -.02, 20], {cell: 6}));
  { const road = plane(12, 260, surf('asphaltLane', '#ffffff', [1, 14], '#3d4047'), [0, .03, 0], {cell: 3}); road.geometry.rotateY(Math.PI / 2); road.position.set(0, .03, TRUCK.z); g.add(road); }
  g.add(box(260, .35, 7.5, surf('polishedFloor', '#cfc8bd', [40, 1], '#cfc8bd'), [0, .17, 42.2], {cell: 4}), box(260, .35, 6, surf('polishedFloor', '#cfc8bd', [40, 1], '#cfc8bd'), [0, .17, 62.4], {cell: 4}));
  g.add(box(260, .5, .5, '#e6e0d6', [0, .3, 46.2], {cell: 6}), box(260, .5, .5, '#e6e0d6', [0, .3, 59.2], {cell: 6}));
  // the shop facade: wall, colour band, big windows either side, awning, shutter (live), sign
  const wall = surf('plaster', '#ffe9c7', [10, 4], '#ffe9c7'), H = 18;
  g.add(box(16, H, 1.0, wall, [-17, H / 2, 35.5]), box(16, H, 1.0, wall, [17, H / 2, 35.5]), box(18, H - 11, 1.0, wall, [0, 11 + (H - 11) / 2, 35.5]), box(50, 1.2, 1.2, '#ff5a5f', [0, 12.5, 35.9], {cell: 6}), box(50.6, .8, 1.3, '#3a86ff', [0, H + .3, 35.7], {cell: 6}));
  for (const sx of [-1, 1]) { g.add(box(10, 6, .5, '#2b2d33', [sx * 17, 5.4, 36.15], {cell: 3})); const glass = new T.Mesh(new T.PlaneGeometry(9, 5), new T.MeshStandardMaterial({color: '#9fb6d8', roughness: .08, metalness: .2, emissive: '#ffcf8a', emissiveIntensity: .35})); glass.position.set(sx * 17, 5.4, 36.45); glass.userData.live = true; live.add(glass); }
  for (let i = 0; i < 12; i++) g.add(box(4.2, .5, 3.2, i % 2 ? '#ff5a5f' : '#ffffff', [-12.6 + i * 2.3 * (1.0), 9.6, 37.4], {cell: 6}));   // striped awning (rows)
  g.add(box(2.4, 6, .8, '#ffd542', [-9.5, 3, 36.2], {cell: 3}), box(2.4, 6, .8, '#ffd542', [9.5, 3, 36.2], {cell: 3}));
  const slat = plastic('#aeb4bd'), shutter = new T.Group(); shutter.name = 'shutter'; for (let i = 0; i < 22; i++) { const s = new T.Mesh(new T.BoxGeometry(18, .5, .3), i % 2 ? slat : plastic('#9aa0a8')); s.position.set(0, .25 + i * .5, 0); shutter.add(s); }
  shutter.position.set(0, 0, 36.2); live.add(shutter);
  const sign = textPlate('OPENS 8:00 AM', {w: 9, h: 2.6, bg: '#ffd542', fg: '#2b2d33', lines: ['OPENS', '8:00 AM'], border: '#ff5a5f', name: 'signOpens'}); sign.position.set(0, 14.3, 36.7); live.add(sign);
  const logo = textPlate('TOY HOUSE', {w: 20, h: 3, bg: '#3a86ff', fg: '#ffffff', name: 'shopName'}); logo.position.set(0, 17.0, 36.75); logo.scale.setScalar(.8); live.add(logo);
  // neighbours and the far side of the street
  for (const [x, w, h, c] of [[-52, 24, 22, '#b8c4d8'], [-76, 22, 16, '#d9b8a8'], [52, 26, 20, '#c9d8b8'], [78, 22, 24, '#d8c8e0']]) { g.add(box(w, h, 24, surf('plaster', c, [3, 3], c), [x, h / 2, 31]), box(w + 1, 1, 25, '#8a6a5a', [x, h + .5, 31], {cell: 6})); for (let i = 0; i < 3; i++) for (let j = 0; j < Math.floor(h / 7); j++) { const wn = new T.Mesh(new T.PlaneGeometry(3.2, 3.6), new T.MeshBasicMaterial({color: '#ffcf8a'})); wn.position.set(x - w / 3 + i * w / 3, 5 + j * 6.5, 43.2); wn.userData.live = true; live.add(wn); } }
  for (const [x, z] of [[-30, 70], [34, 72], [70, 68], [-64, 72]]) { g.add(box(26, 16 + r() * 6, 14, surf('plaster', ['#b8c4d8', '#e8d7b0', '#c8d0b8'][Math.floor(r() * 3)], [3, 3], '#c8c8c8'), [x, 9, z + 14])); }
  // lamp posts (lit at dawn) + trees
  for (const x of [-34, -12, 18, 40]) { g.add(cyl(.28, 9, '#4a4f58', [x, 4.5, 44.5], {seg: 6, cell: 4}), box(2.4, .25, .3, '#4a4f58', [x - 1.1, 9, 44.5], {cell: 6})); const bulb = new T.Mesh(new T.SphereGeometry(.6, 10, 8), new T.MeshBasicMaterial({color: '#ffe0a0', toneMapped: false})); bulb.position.set(x - 2.2, 8.8, 44.5); bulb.userData.live = true; live.add(bulb); lights.push({p: [x - 2.2, 8.4, 44.5], color: [1, .8, .5], i: 2.6, range: 16}); if (look4?.halo) { const h = look4.halo([x - 2.2, 8.9, 44.5], '#ffcf8a', 3.4, .7); live.add(h); } }
  for (const [x, z] of [[-24, 63], [8, 63.5], [30, 63]]) { g.add(cyl(.45, 3.4, '#7a5538', [x, 1.9, z], {seg: 6, cell: 4})); for (let i = 0; i < 3; i++) g.add(box(3.2 - i * .7, 2.2, 3.2 - i * .7, ['#6bbf59', '#5aae4a', '#74c868'][i], [x, 4.5 + i * 1.6, z], {rot: [0, i * .5, 0], cell: 4})); }
  for (let i = 0; i < 6; i++) g.add(box(1.6, 1.2, 1.6, TOY[i], [-20 + i * 2.2, .95, 40 + r()], {rot: [0, r(), 0], cell: 4}));   // toy crates by the shop
  // moving truck: cab, cargo box, open back door + ramp, wheels (spin with x); setState('truck') drives it in
  const truck = new T.Group(); truck.name = 'movingTruck'; { const L = TRUCK.len;
    for (const [w, h, d, c, x, y] of [[11, 7.2, 6.6, '#f4f1ea', -L / 2 + 5.5, 4.9], [4.6, 5.2, 6.4, '#ff5a5f', L / 2 - 1.6, 3.8], [3.2, 2.4, 6.2, '#9fb6d8', L / 2 + .2, 5.3], [11.2, .6, 6.8, '#2b2d33', -L / 2 + 5.5, 1.3]]) truck.add(box(w, h, d, c, [x, y, 0], {cell: 6, live: true}));
    truck.add(box(11.1, 1.0, 6.7, '#3a86ff', [-L / 2 + 5.5, 6.4, 0], {cell: 6, live: true}));
    const ramp = box(5, .25, 5, '#9aa0a8', [-L / 2 - 2.3, .9, 0], {cell: 6, live: true}); ramp.rotation.z = .3; truck.add(ramp);
    truck.userData.wheels = []; for (const [x, z] of [[-L / 2 + 2, 3.2], [-L / 2 + 2, -3.2], [L / 2 - 1.8, 3.2], [L / 2 - 1.8, -3.2]]) { const w = cyl(1.3, .9, '#222226', [x, 1.3, z], {seg: 12, live: true}); w.rotation.x = Math.PI / 2; truck.add(w); truck.userData.wheels.push(w); }
    for (let i = 0; i < 3; i++) truck.add(box(1.6, 1.3, 1.8, TOY[i], [-L / 2 - 3 + i * .1, 1.6 + i * 1.35, -1.6 + i * 1.6], {cell: 6, live: true})); }
  truck.userData.live = true; truck.position.set(TRUCK.to, 0, TRUCK.z); truck.rotation.y = 0; live.add(truck);
  const setTruck = u => { const x = truckX(u); truck.position.x = x; for (const w of truck.userData.wheels) w.rotation.y = -x * .7; };
  let shut = 0;
  const stats = mergeByMaterial(g); g.add(live); scene.add(g);
  return {shutterNode: shutter, setTruck, anchors: Object.fromEntries(Object.entries(ANCHORS).map(([k, a]) => [k, {position: a.at, camera: a.camera, top: a.top}])), groundY, lights, root: g, stats: {...stats, tris: Math.round(triCount(g))},
    setState(k, v) { if (k === 'truck') setTruck(v); else if (k === 'shutter') { shut = v; shutter.position.y = Math.max(0, Math.min(1, v)) * 11.2; } }, update() {}};
}
