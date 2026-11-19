// campaigns/tapcap/world/slimetown.js — Slime Town (prompt §4), a Pixar-style miniature-toy world in Slime Guy units (H = 1).
//   build({mood}) → {root, anchors, cameras, crowd, signs, setRain(on), sunDir}
// The Box (open white blind box, holographic teal drip art, no text, Core rows inside), Top Shelf Hill (glossy white plinth under a
// spotlight, EMPTY), Trade Corner (crate stall), 20–40 crowd Slime Guys (shared geometry/material per colour), 4 diegetic signs sized
// with engine/signs6.js. Everything standing is to Slime Guy scale: box walls 5 H, door 2.6 H, plinth 0.7 H, hill 9 H.
import * as T from 'three';
import {createSlimeGuy} from '../assets/slimeguy/index.js';
import {sign} from '../../../engine/signs6.js';
import {crowdFrom, idlePose} from './crowd.js';
import {MOODS_TC} from './moods.js';

export const BOX = {w: 16, d: 12, h: 5, wall: .18, door: {w: 3.6, h: 2.6}};
export const HILL = {at: [-21, -32], r: 19, h: 9}, PLINTH = {r: .85, h: 1.1};
export const TRADE = {at: [11.2, 7.2]};
export const SIGNPOST = {at: [-11.5, -14.5]};
export const hillY = (x, z) => { const d = Math.hypot(x - HILL.at[0], z - HILL.at[1]) / HILL.r; return d >= 1 ? 0 : HILL.h * Math.pow(Math.cos(d * Math.PI / 2), 2.2); };
const PLINTH_AT = [HILL.at[0], HILL.h, HILL.at[1]];

// crowd spots: Core Row inside the box (two crowded rows each side of the aisle) + the Box street outside the door
export const ROW_SPOTS = [...[-1, 1].flatMap(s => [[1.15, 1], [2.1, 1]].flatMap(([x]) => [-3.6, -2.3, -1.0, .3, 1.6, 2.9].map(z => [s * x, z, -s * .25])))].slice(0, 18);
export const STREET_SPOTS = [[-3.2, 8.2, .3], [-1.6, 9.3, .1], [.4, 8.6, -.2], [2.4, 9.6, -.4], [4.1, 8.4, -.6], [-4.9, 10.4, .5], [1.3, 11.2, 0], [-2.6, 12.1, .2],
  [3.4, 12.4, -.3], [5.8, 10.8, -.7], [-6.4, 8.6, .7], [7.6, 8.9, -.8], [6.6, 12.9, -.5], [-0.8, 13.6, 0]];

function holoWallMaterial() {   // white cardboard + holographic teal slime drips hanging from the top edge (no text)
  const m = new T.MeshPhysicalMaterial({color: '#F5F3EE', roughness: .78, metalness: 0, clearcoat: .0, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessMinimum: 250, iridescenceThicknessMaximum: 650});
  m.onBeforeCompile = s => {
    s.uniforms.uTop = {value: BOX.h};
    s.vertexShader = 'varying vec3 vW; varying vec3 vON;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(position, 1.0)).xyz; vON = normal;');
    s.fragmentShader = `varying vec3 vW; varying vec3 vON; uniform float uTop;
      float hh(float n){ return fract(sin(n * 91.3) * 43758.5); }
      float dripMask(float u, float v){ float c = floor(u / 1.15), cu = fract(u / 1.15) - .5, len = .6 + 2.4 * hh(c), w = .13 + .07 * hh(c + 3.0);
        float top = uTop - .55 + .12 * sin(u * 2.3); if (v > top) return 1.0;
        float end = top - len; if (v > end && abs(cu) < w * (.6 + .4 * (v - end) / len)) return 1.0;
        return length(vec2(cu * 1.15, v - end)) < w * 1.5 ? 1.0 : 0.0; }
      ` + s.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float u = abs(vON.x) > .5 ? vW.z : vW.x; float art = abs(vON.y) < .5 ? dripMask(u, vW.y) : 0.0;
        vec3 vdir = normalize(cameraPosition - vW); float fr = 1.0 - abs(dot(vdir, normalize(vON)));
        vec3 holo = mix(vec3(.16, .78, .72), vec3(.55, .95, 1.0), fr); holo = mix(holo, vec3(.78, .66, 1.0), smoothstep(.55, .95, fr) * .6);
        diffuseColor.rgb = mix(diffuseColor.rgb, holo, art);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .22, art);')
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_IRIDESCENCE
        material.iridescence *= art;
        #endif`);
  };
  m.customProgramCacheKey = () => 'holoWall'; return m;
}
function signPlate(text, opt) {   // engine/signs6.js sizing (≥ 3 % cap height from readFrom) + a canvas plate (no font file in the repo: bold sans fallback)
  const S = sign(text, opt), c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * S.h / S.w); const g = c.getContext('2d');
  g.fillStyle = opt.color ?? '#FFF8EC'; g.beginPath(); g.roundRect(0, 0, c.width, c.height, c.height * .18); g.fill();
  g.strokeStyle = opt.border ?? '#2B2A33'; g.lineWidth = c.height * .06; g.beginPath(); g.roundRect(c.height * .05, c.height * .05, c.width - c.height * .1, c.height - c.height * .1, c.height * .14); g.stroke();
  g.fillStyle = opt.ink ?? '#2B2A33'; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = c.height * .72 / S.lines.length;
  const font = f => `900 ${f}px "Arial Black", "DejaVu Sans", sans-serif`; g.font = font(fs); while (S.lines.some(l => g.measureText(l).width > c.width * .86)) g.font = font(fs -= 4);
  S.lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height * (i + .5) / S.lines.length + fs * .04));
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const mesh = new T.Mesh(new T.PlaneGeometry(S.w, S.h), new T.MeshStandardMaterial({map: tex, roughness: .5})); mesh.name = 'sign_' + S.id; mesh.userData.sign = S;
  const back = new T.Mesh(new T.BoxGeometry(S.w * 1.02, S.h * 1.04, .08), new T.MeshStandardMaterial({color: '#E9DCC8', roughness: .6})); back.position.z = -.045; mesh.add(back);
  return mesh;
}
const std = (color, o = {}) => new T.MeshPhysicalMaterial({color, roughness: .45, ...o});

export function build({mood = 'dawnHope', t = .4} = {}) {
  const M = MOODS_TC[mood], root = new T.Group(); root.name = 'slimetown';
  const wet = M.wet, anchors = {}, signs = [];
  // ground: soft play-mat plastic; wet = glossy + darker
  const ground = new T.Mesh(new T.CircleGeometry(160, 96), std(mood === 'rainNight' ? '#4C5B66' : '#DCE9CF', {roughness: wet ? .12 : .7, clearcoat: wet ? 1 : 0, clearcoatRoughness: .08}));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const street = new T.Mesh(new T.PlaneGeometry(9, 22), std(mood === 'rainNight' ? '#5B6670' : '#F1E6D2', {roughness: wet ? .1 : .7, clearcoat: wet ? 1 : 0}));
  street.rotation.x = -Math.PI / 2; street.position.set(0, .01, 15); street.receiveShadow = true; root.add(street);
  // THE BOX: thin walls (outer face holographic art, inner face kraft), open top, flaps folded out, door on +z
  const kraft = std('#CDB894', {roughness: .85}), holo = holoWallMaterial(), BW = BOX;
  const wall = (w, h, d, x, y, z, outer) => { const mats = Array(6).fill(kraft); mats[outer] = holo; const m = new T.Mesh(new T.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; root.add(m); return m; };
  wall(BW.w, BW.h, BW.wall, 0, BW.h / 2, -BW.d / 2, 5); wall(BW.wall, BW.h, BW.d, -BW.w / 2, BW.h / 2, 0, 1); wall(BW.wall, BW.h, BW.d, BW.w / 2, BW.h / 2, 0, 0);
  const sideW = (BW.w - BW.door.w) / 2;   // front wall with a door opening
  for (const s of [-1, 1]) wall(sideW, BW.h, BW.wall, s * (BW.door.w / 2 + sideW / 2), BW.h / 2, BW.d / 2, 4);
  wall(BW.door.w, BW.h - BW.door.h, BW.wall, 0, BW.door.h + (BW.h - BW.door.h) / 2, BW.d / 2, 4);
  const floor = new T.Mesh(new T.PlaneGeometry(BW.w, BW.d), kraft); floor.rotation.x = -Math.PI / 2; floor.position.y = .015; floor.receiveShadow = true; root.add(floor);
  for (const [len, wid, x, z, ry] of [[BW.w, BW.d / 4, 0, -BW.d / 2, 0], [BW.w, BW.d / 4, 0, BW.d / 2, Math.PI], [BW.d, BW.d / 4, -BW.w / 2, 0, -Math.PI / 2], [BW.d, BW.d / 4, BW.w / 2, 0, Math.PI / 2]]) {
    const hinge = new T.Group(); hinge.position.set(x, BW.h, z); hinge.rotation.y = ry; root.add(hinge);   // flap folded out and down 125°
    const f = new T.Mesh(new T.BoxGeometry(len, BW.wall, wid), [kraft, kraft, kraft, holo, kraft, kraft]); f.position.set(0, 0, -wid / 2); const p = new T.Group(); p.rotation.x = 0; p.add(f); hinge.add(p); f.castShadow = true; }   // flap opened flat outward (an opened blind box; keeps sightlines to the hill clear)
  const core = signPlate('CORE ROW', {readFrom: 12, fov: 54}); core.position.set(0, BW.door.h + core.userData.sign.h / 2 + .25, BW.d / 2 + BW.wall / 2 + .06); root.add(core); signs.push(core);
  anchors.boxDoor = [0, 0, BW.d / 2]; anchors.coreRow = [0, 0, 0];
  // TOP SHELF HILL: smooth glossy-toy green mound, path, plinth (EMPTY) under a soft spotlight beam, dust motes
  { const prof = []; for (let i = 0; i <= 48; i++) { const d = i / 48; prof.push(new T.Vector2(d * HILL.r, hillY(HILL.at[0] + d * HILL.r, HILL.at[1]))); }
    const g = new T.LatheGeometry(prof.reverse(), 96); const hill = new T.Mesh(g, std(mood === 'rainNight' ? '#2F6A47' : '#74C77A', {roughness: wet ? .15 : .42, clearcoat: wet ? 1 : .35, clearcoatRoughness: .2}));
    hill.position.set(HILL.at[0], 0, HILL.at[1]); hill.receiveShadow = hill.castShadow = true; root.add(hill);
    const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60, ang = -1.2 + a * 2.9, rr = HILL.r * (1 - a) * .98; pts.push([HILL.at[0] + Math.sin(ang) * rr, HILL.at[1] + Math.cos(ang) * rr]); }
    const pos = [], idx = []; pts.forEach(([x, z], i) => { const n = pts[Math.min(i + 1, pts.length - 1)], p0 = pts[Math.max(i - 1, 0)], dx = n[0] - p0[0], dz = n[1] - p0[1], l = Math.hypot(dx, dz) || 1, w = .7;
      for (const s of [-1, 1]) { const px = x - dz / l * w * s, pz = z + dx / l * w * s; pos.push(px, hillY(px, pz) + .03, pz); } if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i); });
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); pg.setIndex(idx); pg.computeVertexNormals();
    const path = new T.Mesh(pg, std(mood === 'rainNight' ? '#7B7A70' : '#F3E7CF', {roughness: wet ? .1 : .6, side: T.DoubleSide})); path.receiveShadow = true; root.add(path); }
  const plinth = new T.Group(); plinth.position.set(...PLINTH_AT); root.add(plinth);
  { const body = new T.Mesh(new T.CylinderGeometry(PLINTH.r, PLINTH.r * 1.04, PLINTH.h, 64), std('#FBFBFD', {roughness: .08, clearcoat: 1, clearcoatRoughness: .03})); body.position.y = PLINTH.h / 2; body.castShadow = body.receiveShadow = true; plinth.add(body);
    const cap = new T.Mesh(new T.CylinderGeometry(PLINTH.r * 1.12, PLINTH.r * 1.12, .12, 64), std('#FFFFFF', {roughness: .05, clearcoat: 1})); cap.position.y = PLINTH.h + .06; cap.castShadow = true; plinth.add(cap);
    const lip = new T.Mesh(new T.TorusGeometry(PLINTH.r * 1.12, .06, 12, 64), std('#FFFFFF', {roughness: .05, clearcoat: 1})); lip.rotation.x = Math.PI / 2; lip.position.y = PLINTH.h + .06; plinth.add(lip);
    const base = new T.Mesh(new T.CylinderGeometry(PLINTH.r * 1.25, PLINTH.r * 1.3, .2, 64), std('#F2F2F5', {roughness: .1, clearcoat: 1})); base.position.y = -.05; plinth.add(base);
    const s = signPlate('1 / 102', {readFrom: 7, fov: 40}); s.scale.setScalar(.85); s.position.set(0, PLINTH.h * .42, PLINTH.r + .05); plinth.add(s); signs.push(s); }
  anchors.plinthTop = [PLINTH_AT[0], PLINTH_AT[1] + PLINTH.h + .12, PLINTH_AT[2]];
  // spotlight + visible soft beam + dust motes
  const spot = new T.SpotLight('#FFF4E2', 60 * M.spot, 30, .28, .6, 1.4); spot.position.set(PLINTH_AT[0] + 1.5, PLINTH_AT[1] + 16, PLINTH_AT[2] + 2); spot.target.position.set(...PLINTH_AT); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); root.add(spot, spot.target);
  { const len = 16, g = new T.CylinderGeometry(.75, PLINTH.r * 1.5, len, 48, 1, true); g.translate(0, -len / 2, 0);
    const beam = new T.Mesh(g, new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: {k: {value: .07 * M.spot}},
      vertexShader: 'varying float vy; varying vec3 vn, vv; void main(){ vy = position.y; vn = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vv = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying float vy; varying vec3 vn, vv; void main(){ float e = pow(abs(dot(vn, vv)), 1.5); float f = smoothstep(-16., -9., vy) * (1. - smoothstep(-1.5, 0., vy) * .3); gl_FragColor = vec4(vec3(1., .96, .88) * k * e * f, 1.); }'}));
    beam.position.set(PLINTH_AT[0] + 1.5 * .02, PLINTH_AT[1] + 16, PLINTH_AT[2] + 2 * .02); const dir = new T.Vector3(1.5, 16, 2).normalize(); beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    beam.position.set(PLINTH_AT[0] + 1.5, PLINTH_AT[1] + 16, PLINTH_AT[2] + 2); root.add(beam);
    const mp = []; const r = (i => () => (i = (i * 48271) % 2147483647) / 2147483647)(5); for (let i = 0; i < 160; i++) { const a = r(), h = r() * 9; mp.push(PLINTH_AT[0] + (r() - .5) * (1 + h * .12) * 2 + h * .09, PLINTH_AT[1] + .9 + h, PLINTH_AT[2] + (r() - .5) * (1 + h * .12) * 2 + h * .12); }
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(mp, 3));
    root.add(new T.Points(pg, new T.PointsMaterial({color: '#FFF3DA', size: .045, transparent: true, opacity: mood === 'rainNight' ? .0 : .85, blending: T.AdditiveBlending, depthWrite: false}))); }
  // TOP SHELF signpost at the foot of the path
  { const post = new T.Mesh(new T.CylinderGeometry(.09, .11, 2.6, 16), std('#D9A86C', {roughness: .5})); post.position.set(SIGNPOST.at[0], 1.3, SIGNPOST.at[1]); post.castShadow = true; root.add(post);
    const s = signPlate('TOP SHELF', {readFrom: 12, fov: 54}); s.position.set(SIGNPOST.at[0], 2.2, SIGNPOST.at[1] + .14); s.rotation.y = .5; root.add(s); signs.push(s);
    const arrow = new T.Mesh(new T.ConeGeometry(.16, .34, 3), std('#2B2A33')); arrow.rotation.z = Math.PI / 2; arrow.position.set(SIGNPOST.at[0] - s.userData.sign.w / 2 - .12, 2.2, SIGNPOST.at[1] + .1); root.add(arrow); }
  anchors.signpost = [SIGNPOST.at[0], 0, SIGNPOST.at[1]];
  // TRADE CORNER: toy crates (stall + counter) with the TRADES sign
  { const crate = (x, y, z, s = 1, col = '#E6B57A') => { const g = new T.Group(); g.position.set(x, y, z);
      const b = new T.Mesh(new T.BoxGeometry(1.1 * s, .8 * s, .9 * s), std(col, {roughness: .55})); b.castShadow = b.receiveShadow = true; g.add(b);
      for (const yy of [-.25, .05, .3]) { const slat = new T.Mesh(new T.BoxGeometry(1.14 * s, .1 * s, .94 * s), std('#C98F52', {roughness: .5})); slat.position.y = yy * s; g.add(slat); } root.add(g); return g; };
    const [tx, tz] = TRADE.at;
    for (const [dx, dz, y] of [[-1.15, 0, .4], [0, 0, .4], [1.15, 0, .4], [-2.4, -.9, .4], [2.4, -.8, .4], [-2.4, -.9, 1.2], [2.6, -1.6, .4]]) crate(tx + dx, y, tz + dz);
    const top = new T.Mesh(new T.BoxGeometry(3.6, .12, 1.1), std('#B97B45', {roughness: .45})); top.position.set(tx, .86, tz); top.castShadow = top.receiveShadow = true; root.add(top);
    for (const s of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.07, .07, 2.6, 12), std('#B97B45')); p.position.set(tx + s * 1.7, 1.3 + .86, tz - .45); root.add(p); }
    const aw = new T.Mesh(new T.BoxGeometry(4, .1, 1.5), std('#FF9DB7', {roughness: .4})); aw.position.set(tx, 3.5, tz - .1); aw.rotation.x = .18; aw.castShadow = true; root.add(aw);
    const s = signPlate('TRADES', {readFrom: 12, fov: 54}); s.position.set(tx, 3.0, tz + .02); root.add(s); signs.push(s);
    anchors.trade = [tx, .92, tz]; }
  // CROWD: Core Row (inside the box) + Box street; shared geometry/material per colour (clones), idle loops
  const proto = {}, members = crowdFrom([...ROW_SPOTS, ...STREET_SPOTS], {rareShare: .06});
  members.push({x: TRADE.at[0] - .55, z: TRADE.at[1] + .05, yaw: 0, preset: 'grape', loop: 'sway', phase: .2, y: .92}, {x: TRADE.at[0] + .65, z: TRADE.at[1] + .05, yaw: 0, preset: 'frozen', loop: 'tap', phase: .7, y: .92});   // two Core slimes on the counter
  for (const c of members) { const P = (proto[c.preset] ??= createSlimeGuy({preset: c.preset}));
    const g = P.root.clone(true); const keycap = g.children.find(ch => ch === g.children[0]); const pose = idlePose(c.loop, t, c.phase);
    g.position.set(c.x, (c.y ?? 0) + pose.dy, c.z); g.rotation.set(0, c.yaw, pose.roll); if (keycap) keycap.position.y = pose.tap;
    g.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); root.add(g); c.object = g; }
  // clouds
  for (const [x, y, z, s] of [[-60, 34, -110, 9], [30, 40, -130, 11], [85, 30, -90, 7], [-25, 46, -150, 12]]) { const cg = new T.Group(); cg.position.set(x, y, z);
    for (let i = 0; i < 7; i++) { const b = new T.Mesh(new T.SphereGeometry(s * (.45 + .1 * (i % 3)), 24, 16), new T.MeshStandardMaterial({color: M.clouds, roughness: 1})); b.position.set((i - 3) * s * .38, Math.sin(i * 1.7) * s * .12, Math.cos(i * 2.3) * s * .15); cg.add(b); } root.add(cg); }
  // rain-night extras: puddles with ripples, 3D rain streaks, warm practicals at the door
  if (mood === 'rainNight') {
    const pm = new T.MeshPhysicalMaterial({color: '#25303C', roughness: .03, metalness: .1, clearcoat: 1});
    pm.onBeforeCompile = s => { s.vertexShader = 'varying vec2 vXZ;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(position, 1.)).xz;');
      s.fragmentShader = 'varying vec2 vXZ;\n' + s.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 r = vec2(0.); for (int i = 0; i < 5; i++) { vec2 c = vec2(sin(float(i) * 12.9) * .7, cos(float(i) * 7.3) * .7); vec2 d = vXZ - floor(vXZ) - .5 - c * .3; float l = length(d);
          r += d / max(l, 1e-3) * sin(l * 70. - float(i)) * exp(-l * 9.); } normal = normalize(normal + vec3(r.x, 0., r.y) * .35); }`); };
    for (const [x, z, sx, sz] of [[-1.5, 10, 2.2, 1.3], [3, 13.5, 1.6, 1], [-4.5, 13, 1.4, .9], [HILL.at[0] + 2.5, HILL.at[1] + 12, 2, 1.2], [9.5, 11, 1.4, 1]]) {
      const p = new T.Mesh(new T.CircleGeometry(1, 40), pm); p.rotation.x = -Math.PI / 2; p.scale.set(sx, sz, 1); p.position.set(x, hillY(x, z) + .025, z); root.add(p); }
    for (const [x, z, sx, sz] of [[-8.5, -13.5, 1.8, 1.1], [-12, -17.5, 1.3, .8]]) { const p = new T.Mesh(new T.CircleGeometry(1, 40), pm); p.rotation.x = -Math.PI / 2; p.scale.set(sx, sz, 1); p.position.set(x, hillY(x, z) + .025, z); root.add(p); }
    const rr = (i => () => (i = (i * 48271) % 2147483647) / 2147483647)(9), lp = [];
    for (let i = 0; i < 7000; i++) { const x = (rr() - .5) * 70 - 12, y = rr() * 26, z = (rr() - .5) * 70 - 18, l = .35 + rr() * .3; lp.push(x, y, z, x + l * .18, y - l, z + l * .05); }
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3));
    root.add(new T.LineSegments(lg, new T.LineBasicMaterial({color: '#B8CCE8', transparent: true, opacity: .38, depthWrite: false})));
    for (const s of [-1, 1]) { const l = new T.PointLight(M.practicals, 6, 9, 1.6); l.position.set(s * 2.4, 3.1, BOX.d / 2 + .6); root.add(l);
      const bulb = new T.Mesh(new T.SphereGeometry(.16, 16, 12), new T.MeshBasicMaterial({color: '#FFE2B8'})); bulb.position.copy(l.position); root.add(bulb); }
  }
  // cameras for the Pass B stills (Slime Guy eye level ≈ 0.6–1.2 H)
  const cameras = {
    boxStreet: {pos: [2.6, 1.1, 14.2], look: [-.6, 2.2, 4], mm: 24, feature: 'CORE ROW'},
    coreRow: {pos: [0, .9, 4.6], look: [0, .6, -4], mm: 24},
    trade: {pos: [7.4, 1.6, 12.6], look: [11.2, 1.5, 7.2], mm: 35, feature: 'TRADES'},
    hillWide: {pos: [7, 14, 22], look: [-17, 4, -26], mm: 24, tilt: true},
    plinthClose: {pos: [PLINTH_AT[0] + 2.2, PLINTH_AT[1] + 1.6, PLINTH_AT[2] + 7.2], look: [PLINTH_AT[0], PLINTH_AT[1] + .9, PLINTH_AT[2]], mm: 50, dof: true, feature: '1 / 102'},
    rainHill: {pos: [-1, 1.5, -12], look: [-19.5, 7.6, -31], mm: 28},
  };
  return {root, anchors, cameras, crowd: members, signs, sunDir: M.sun.dir, spot};
}
