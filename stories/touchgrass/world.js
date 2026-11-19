// stories/touchgrass/world.js — Touch Grass E1 world: the four E0 locations (parts/locations/*.json, parts/location.js) in one scene,
// side by side on x (OFF), only the one the camera is in shown. Per world: its own environment map, background, fog and tone mapping
// (switched in onCamera, before the shot's look preset sets fog colour / exposure); its key light (location sun, no shadow map)
// and hemisphere light. Shadows: the look's sun (per-shot fitted, texel-snapped) at intensity 0 casts onto the location shadow
// catchers only (ShadowMaterial ignores intensity). dustTown is built twice (dustGray, dustGold), switched at GOLD_AT.
// Crowds (TOWN seated 37 + circle, ZOMBIES ×8 in 3 states, FRIENDS ~90) are posed once and merged by material.
// Actor dressing (opt-in spec.decorate): decorate(a, name, preset, c) once; poseActor(a, name, t, c) per frame (pure in t):
//   c.hs = [[t, 'head' | 'hand' | 'none']] headset on the head / in the right hand · c.visor = [[t, 'on' | 'off']] visor strip
//   c.can = [[t, 'hand' | 'none']] NOVA's watering can · c.canTilt = [[t, deg, 'ramp'?]] pour tilt (spout forward and down)
import * as T from 'three';
import {buildLocation, mergeLocation} from '../../parts/location.js';
import {PROPS7, placeProps, attachHeadset, headset, wateringCan, armor, rimCrowd, visorBand} from '../../parts/sets4/props7.js';
import {mergeByMaterial} from '../../parts/sets4/common.js';
import {buildActor} from '../../engine/actors.js';
import {samplePose, applyPoseSample} from '../../engine/poses.js';
import {valueAt} from '../../engine/timeline.js';
import {HAND} from '../../avatar-style/tools.js';
import * as L5B from '../../engine/look5b.js';

export const OFF = {dustTown: [0, 0, 0], zombieCity: [2000, 0, 0], dragonPeaks: [4000, 0, 0], space: [6000, 0, 0]};
export const WORLD_AT = x => ['dustTown', 'zombieCity', 'dragonPeaks', 'space'][Math.max(0, Math.min(3, Math.round(x / 2000)))];
export const GOLD_AT = 77.74;
// E1 yard (dustTown local): the grass blade G, Leo's porch moved next to it (front +x), the town circle around G
export const YARD = {G: [0.5, 0, 10.5], leoPorch: [-5.5, 0, 10.5], leoChair: [-5.0, .9, 10.5], circleR: [5, 8.5, 12]};
export const CAST_SEATS = {TOWN_A: 3, TOWN_B: 1, TOWN_C: 17};   // seats40 indices taken by the cast townspeople (front row)
export const groundY = () => 0;
export const LAYER = {ground: 0, street: .06};

let S = null;   // built state
const add3 = (a, b) => a.map((v, i) => v + b[i]);

export async function preload(base, {scene, renderer, spec}) {
  const json = async p => (await fetch(new URL(p, base))).json();
  const CAST = await json('cast/touchgrass.json'), AN = await json('parts/locations/anchors-touchgrass.json');
  const manifest = n => ({hdri: Object.fromEntries(n.map(f => [f, {id: '../../../assets/hdri', file: f}]))});
  const envs = {}, worlds = {};
  for (const [name, variant] of [['dustTown', 'dustGray'], ['dustTown', 'dustGold'], ['zombieCity'], ['dragonPeaks'], ['space']]) {
    const url = new URL(`parts/locations/${name}.json`, base); let loc = await json(url.href);
    if (loc.extends) loc = mergeLocation(await json(new URL(loc.extends, url).href), loc);
    if (variant) loc = {...loc, ...loc.looks[variant]};
    const tmp = new T.Scene(), L = await buildLocation(tmp, renderer, loc, {base, manifest: manifest([loc.backdrop?.hdri].filter(Boolean))});
    const key = variant ? `${name}.${variant}` : name, grp = new T.Group(); grp.name = 'env:' + key; grp.position.set(...OFF[name]);
    for (const o of [...tmp.children]) grp.add(o);
    L.sun.castShadow = false; L.fit(new T.Vector3(0, 0, 0), 230);
    envs[key] = {env: tmp.environment, envI: tmp.environmentIntensity, envRot: tmp.environmentRotation.y, bg: tmp.background, bgRot: tmp.backgroundRotation.y, fog: tmp.fog, tone: renderer.toneMapping, grp, sunDir: L.stats.sunDir};
    scene.add(grp);
    if (!worlds[name]) { worlds[name] = new T.Group(); worlds[name].name = 'world:' + name; worlds[name].position.set(...OFF[name]); scene.add(worlds[name]); worlds[name].userData.loc = loc; }
  }
  if (typeof window !== 'undefined') window.__tgSun = Object.fromEntries(Object.entries(envs).map(([k, e]) => [k, e.sunDir]));
  // location props (story props come from spec.props): dustTown loses the grass + birdhouse and Leo's porch moves to the yard;
  // dragonPeaks loses the sword stone; space loses its ships
  const movers = [];
  for (const [name, W] of Object.entries(worlds)) {
    let list = W.userData.loc.props ?? [];
    if (name === 'dustTown') list = list.filter(p => !['grassBlade', 'birdhouse'].includes(p.prop)).map(p => p.id === 'leoPorch' ? {...p, at: YARD.leoPorch, rotY: 90} : p);
    if (name === 'dragonPeaks') list = list.filter(p => p.prop !== 'swordStone');
    if (name === 'space') list = list.filter(p => p.prop !== 'spaceship');
    const P = placeProps(list, {t: 0}); W.add(P); movers.push(P);
  }
  // ---- crowds: posed, then merged by material (vertex-coloured hair / headsets stay separate meshes) ----
  const actor = (id, {at, yaw = 0, pose = 'idle', t = .3, face = null, hs = false}) => {
    const pre = {...CAST.cast[id], ...(face ? {face} : {})}, a = buildActor(pre, id); if (hs) attachHeadset(a, {state: 'on'});
    applyPoseSample(a, samplePose(pose, t, {}), {position: at, yaw}); if (pre.armor) { a.root.updateMatrixWorld(true); armor(a, pre.armor); } return a; };
  const crowd = (W, name, list, after = null) => { const g = new T.Group(); g.name = 'crowd:' + name; g.userData.crowd = name;
    for (const a of list) { if (after) after(a); g.add(a.root); }
    W.add(g); g.updateMatrixWorld(true); g.traverse(o => { if (o.isMesh && [].concat(o.material)[0]?.vertexColors) o.userData.live = true; });
    mergeByMaterial(g); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } }); return g; };
  const D = AN.dustTown, taken = new Set(Object.values(CAST_SEATS));
  const seated = crowd(worlds.dustTown, 'TOWN', D.seats40.flatMap((p, i) => taken.has(i) ? [] : [actor('TOWN_' + (1 + i % 6), {at: [p[0], p[1] - 1.05, p[2] + .05], yaw: D.seatYaw40[i], pose: 'sit', t: i * .1, hs: true})]));
  // the town circle (82.65 on): standing, headsets off, facing the blade; members clear of the porch, crates, tree and poles
  const G = YARD.G, blockers = [[YARD.leoPorch[0], YARD.leoPorch[2], 2.4, 3.9], [-7, 16, 1.2, 1.2], [-12, 22, 1, 1], [4, 22, 1, 1]], circ = [];
  YARD.circleR.forEach((r, k) => { const n = Math.round(2 * Math.PI * r / 2.3); for (let i = 0; i < n; i++) { const a = (i + k * .5) / n * 2 * Math.PI, x = G[0] + Math.sin(a) * r, z = G[2] + Math.cos(a) * r;
    if (blockers.some(([bx, bz, hx, hz]) => Math.abs(x - bx) < hx + .9 && Math.abs(z - bz) < hz + .9) || z < -2.5 || D.seats40.some(s => Math.hypot(s[0] - x, s[2] - z) < 1.6)) continue;
    circ.push(actor('TOWN_' + (1 + (i + k) % 6), {at: [x, 0, z], yaw: Math.atan2(G[0] - x, G[2] - z), pose: 'idle', t: i * .21, face: ['o_small', 'blank', 'calm'][i % 3]})); } });
  const circle = crowd(worlds.dustTown, 'TOWNCIRCLE', circ);
  // zombies: three merged states (0 shuffle, 1 look up in shock, 2 knocked flat), rim #B6FF8A .9 (zombies only)
  const Z = AN.zombieCity.zombies8, zstate = [['zombie', null], ['lookUp', 'shock'], ['zombie', 'shock']].map(([pose, face], k) => {
    const g = crowd(worlds.zombieCity, 'ZOMBIE' + k, Z.map((p, i) => actor('ZOMBIE_' + (i + 1), {at: p, yaw: 0, pose, t: i * .17, face})), k === 2 ? a => { a.root.rotation.x = -Math.PI / 2; a.root.position.y += .35; a.root.position.z -= 2.4; } : null);
    rimCrowd(g, {color: '#B6FF8A', strength: .9}, L5B); g.visible = k === 0; return g; });
  // friends on the plateau ring (cast knight / robot / mage stand in their own spots)
  const F = ['FRIEND_KNIGHT', 'FRIEND_ROBOT', 'FRIEND_NINJA', 'FRIEND_ASTRO', 'FRIEND_PIRATE', 'FRIEND_MAGE', 'BRO'], castSpots = (spec?.tgCastSpots?.dragonPeaks ?? []);
  const friends = crowd(worlds.dragonPeaks, 'FRIENDS', AN.dragonPeaks.friends100.filter(p => Math.hypot(p[0], p[2]) > 4.5 && !castSpots.some(c => Math.hypot(c[0] - p[0], c[2] - p[2]) < 2.6))
    .map((p, i) => actor(F[i % F.length], {at: p, yaw: Math.atan2(-p[0], -p[2]), pose: 'cheer', t: i * .13})));
  // sky cracks (static while shown): zombie sky, space, dragon sky behind the boss
  const crack = (W, at, h, w, seed, rotY = 0) => { const c = PROPS7.skyCrack({h, w, seed}); c.position.set(...at); c.rotation.y = rotY; c.visible = false; W.add(c); return c; };
  const cracks = {crackZ: crack(worlds.zombieCity, [0, 62, -80], 70, 18, 4), crackS: crack(worlds.space, [0, 30, -110], 80, 22, 7), crackD: crack(worlds.dragonPeaks, [-10, 300, -520], 260, 60, 9)};
  for (const c of Object.values(cracks)) c.traverse(o => { o.userData.live = true; });
  S = {scene, renderer, envs, worlds, movers, seated, circle, zstate, friends, cracks, zbase: zstate.map(g => g.position.z), t: 0, active: null};
}

export function build(scene, {look}) {
  if (look?.sky) look.sky.visible = false; if (look?.clouds) look.clouds.visible = false;   // each world brings its own sky
  return {anchors: {}, groundY, update, setState, onCamera};
}
function update(t) { S.t = t; for (const P of S.movers) P.userData.anim(t); }
function setState(k, v) {
  if (k === 'townSeated') S.seated.visible = !!v;
  else if (k === 'townCircle') S.circle.visible = !!v;
  else if (k === 'zombies') S.zstate.forEach((g, i) => { g.visible = i === Math.round(v); });
  else if (k === 'zombieZ') S.zstate.forEach((g, i) => { if (i < 2) g.position.z = S.zbase[i] + v; });
  else if (S.cracks[k]) S.cracks[k].visible = !!v;
}
// the camera decides the world: environment, background, fog, tone mapping, which groups draw
function onCamera(pos) {
  const name = WORLD_AT(pos[0]), key = name === 'dustTown' ? `dustTown.${S.t >= GOLD_AT - 1e-6 ? 'dustGold' : 'dustGray'}` : name;
  for (const [k, e] of Object.entries(S.envs)) e.grp.visible = k === key;
  for (const [n, W] of Object.entries(S.worlds)) W.visible = n === name;
  if (S.active === key) return; S.active = key;
  const e = S.envs[key], scene = S.scene;
  scene.environment = e.env; scene.environmentIntensity = e.envI; scene.environmentRotation.y = e.envRot; scene.background = e.bg; scene.backgroundRotation.y = e.bgRot;
  scene.fog = e.fog ?? new T.Fog('#000000', 1e5, 2e5); S.renderer.toneMapping = e.tone;
}

// ---- actor dressing (opt-in spec.decorate) ----
const _q = new T.Quaternion(), _p = new T.Quaternion(), _y = new T.Quaternion(), _a = new T.Quaternion(), _z = new T.Quaternion(), UP = new T.Vector3(0, 1, 0), ZA = new T.Vector3(0, 0, 1);
export function decorate(a, name, pre, c) {
  a.root.name = name; a.root.userData.castName = name;
  if (pre.vrHeadset === 'on' || c.hs) { const hs = attachHeadset(a, {state: 'on'}); hs.name = name + '_headset';
    const hh = headset({state: 'on'}); hh.name = name + '_headsetHand'; hh.position.set(HAND[0], HAND[1] - .12, HAND[2] + .32); hh.rotation.set(-Math.PI / 2, 0, 0); hh.visible = false; a.pivots.rightShoulder.add(hh);
    a.dress = {...a.dress, hs, hh}; }
  if (pre.armor) { a.root.updateMatrixWorld(true); armor(a, pre.armor); }
  if (pre.glowSword && a.tool) a.tool.traverse(o => { if (o.isMesh && (o.name === 'blade' || (o.geometry?.parameters?.height ?? 0) > 1 || o.geometry?.type === 'ConeGeometry')) { o.material = o.material.clone(); o.material.emissive = new T.Color(pre.glowSword); o.material.emissiveIntensity = 1.2; } });   // the blade + tip glow
  if (c.tap) { const f = PROPS7.giantFinger({}); f.scale.setScalar(.14); f.rotation.x = Math.PI / 2; f.name = 'NOVA_tapFinger'; f.visible = false; a.root.parent.add(f); a.dress = {...a.dress, tap: f}; }   // NOVA's finger on Leo's headset (24)
  if (c.can) { const holder = new T.Group(), can = wateringCan(); can.scale.setScalar(.6); can.position.set(.12 * .6, -1.07 * .6, 0); holder.add(can); holder.position.set(...HAND);
    holder.name = name + '_can'; can.name = 'wateringCan'; a.pivots.rightShoulder.add(holder); a.tool = holder; a.dress = {...a.dress, can: holder}; }
}
export function poseActor(a, name, t, c) {
  const d = a.dress; if (!d) return;
  if (d.hs && c.hs) { const s = valueAt(c.hs, t, 'head'); d.hs.visible = s === 'head'; d.hh.visible = s === 'hand'; }
  if (d.hs && c.visor) { const v = valueAt(c.visor, t, 'on'); if (d.hs.userData.state !== v) d.hs.userData.setState(v); if (d.hh.userData.state !== v) d.hh.userData.setState(v); }
  if (d.tap) { const [t0, t1] = c.tapVis, on = t >= t0 && t < t1; d.tap.visible = on;
    if (on) {   // tip on the headset's +z side at the contact frames (gap 0 for 2 frames), .55 away between taps (pure in t)
      const F = 1 / 24, dt = c.tap.map(tp => t - tp).reduce((b, x) => Math.abs(x) < Math.abs(b) ? x : b, 99), gap = dt >= -1e-6 && dt <= 2 * F ? 0 : .55 * Math.min(1, (dt > 0 ? dt - 2 * F : -dt) / (4 * F));
      a.root.updateMatrixWorld(true); const hp = d.hs.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .06 * a.root.scale.y, 0)), want = hp.add(new T.Vector3(0, 0, .64 * a.root.scale.x + gap));
      d.tap.position.set(0, 0, 0); d.tap.updateMatrixWorld(true); const tip = d.tap.userData.tipWorld(); d.tap.position.copy(want.sub(tip)); } }
  if (d.can) { d.can.visible = valueAt(c.can, t, 'none') === 'hand';
    if (d.can.visible) {   // world orientation = actor yaw · spout forward · tilt down (pure in t): counter-rotate the shoulder pivot
      a.root.updateMatrixWorld(true); d.can.parent.getWorldQuaternion(_p); a.root.getWorldQuaternion(_y);
      _a.setFromAxisAngle(UP, -Math.PI / 2); _z.setFromAxisAngle(ZA, -(valueAt(c.canTilt, t, 0)) * Math.PI / 180);
      _q.copy(_y).multiply(_a).multiply(_z); d.can.quaternion.copy(_p.invert().multiply(_q)); } }
}
