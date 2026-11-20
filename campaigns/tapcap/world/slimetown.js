// campaigns/tapcap/world/slimetown.js — Slime Town (prompt §4 + Pass B revision), a toy town in Slime Guy units (H = 1).
//   build({mood, t, cams, seed}) → {root, anchors, plan, crowd, signs, plinth, sunDir}
// Districts: CORE ROW (the opened blind box between houses, a lane of small homes into it), MARKET STREET (Trade Corner, stalls,
// awnings, bunting, a toy bridge over a teal slime stream), HILLSIDE (houses on terraces up the lower slope; summit = plinth only,
// TOP SHELF signpost on the S-path). The town itself comes from town.js (seeded, built for the camera frustums).
import * as T from 'three';
import {createSlimeGuy} from '../assets/slimeguy/index.js';
import {sign} from '../../../engine/signs6.js';
import {crowdFrom, idlePose} from './crowd.js';
import {MOODS_TC, NIGHTS} from './moods.js';
import {layout, planTown, hillY, HILL, PLINTH, TOWN_DIR, PALETTE, resolveCam, camBasis, fovFor, sees} from './town.js';
import {buildTown, cobbleMaterial} from './townmesh.js';

export const SIGN_FONT = 'Lilita One';   // the captions' font file (node_modules/@expo-google-fonts/lilita-one), loaded by world.js
export const SIGHTLINES = ['S1', 'S4', 'S33', 'S40', 'hillWide', 'rainHill'];
export const EXCLUDE = ['S36'];   // golden S36: no props / crowd in frame
const tag = (o, layer) => { o.traverse(n => { n.userData.layer ??= layer; }); return o; };
const std = (color, o = {}) => new T.MeshPhysicalMaterial({color, roughness: .45, ...o});

function holoWallMaterial() {   // white cardboard + holographic teal slime drips hanging from the top edge (no text)
  const m = new T.MeshPhysicalMaterial({color: '#F5F3EE', roughness: .78, metalness: 0, clearcoat: .0, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessMinimum: 250, iridescenceThicknessMaximum: 650});
  m.onBeforeCompile = s => {
    s.uniforms.uTop = {value: 5};
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

function signPlate(text, opt) {   // engine/signs6.js sizing (≥ 3 % cap height from readFrom) + a canvas plate in the captions' font
  const S = sign(text, opt), c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * S.h / S.w); const g = c.getContext('2d');
  g.fillStyle = opt.color ?? '#FFF8EC'; g.beginPath(); g.roundRect(0, 0, c.width, c.height, c.height * .18); g.fill();
  g.strokeStyle = opt.border ?? '#2B2A33'; g.lineWidth = c.height * .06; g.beginPath(); g.roundRect(c.height * .05, c.height * .05, c.width - c.height * .1, c.height - c.height * .1, c.height * .14); g.stroke();
  g.fillStyle = opt.ink ?? '#2B2A33'; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = c.height * .74 / S.lines.length;
  const font = f => `${f}px "${SIGN_FONT}"`; g.font = font(fs); while (S.lines.some(l => g.measureText(l).width > c.width * .86)) g.font = font(fs -= 4);
  S.lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height * (i + .5) / S.lines.length + fs * .06));
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const mesh = new T.Mesh(new T.PlaneGeometry(S.w, S.h), new T.MeshStandardMaterial({map: tex, roughness: .5})); mesh.name = 'sign_' + S.id; mesh.userData.sign = S; mesh.userData.text = true;
  const back = new T.Mesh(new T.BoxGeometry(S.w * 1.02, S.h * 1.04, .08), new T.MeshStandardMaterial({color: '#E9DCC8', roughness: .6})); back.position.z = -.045; mesh.add(back);
  return mesh;
}
function ribbon(pts, w, mat, lift = .02, yAt = (x, z) => 0) {   // flat strip along a polyline [[x, z]…], following the ground
  const pos = [], idx = [];
  pts.forEach(([x, z], i) => { const n = pts[Math.min(i + 1, pts.length - 1)], p = pts[Math.max(i - 1, 0)], dx = n[0] - p[0], dz = n[1] - p[1], l = Math.hypot(dx, dz) || 1;
    for (const s of [-1, 1]) { const px = x - dz / l * w / 2 * s, pz = z + dx / l * w / 2 * s; pos.push(px, yAt(px, pz) + lift, pz); } if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i); });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new T.Mesh(g, mat); m.receiveShadow = true; return m;
}

export function build({mood = 'dawnHope', t = .4, cams = [], seed = 1102, cloudGap = null, skyCam = null, fillCam = null} = {}) {   // skyCam: the golden S36 camera (cloud masses placed in its frame); fillCam: the camera the plinth fill keys from
  const M = MOODS_TC[mood], L = layout(), root = new T.Group(); root.name = 'slimetown';
  const night = NIGHTS.includes(mood), rain = mood === 'rainNight', wet = M.wet, WR = .5, anchors = {}, signs = [];
  // ground + streets (cobble-like rounded tiles); wet = roughness .35
  const ground = new T.Mesh(new T.CircleGeometry(170, 96), std(night ? '#3E4B52' : mood === 'golden' ? '#CBD8B4' : '#D5E5C8', {roughness: wet ? WR : .75, clearcoat: wet ? .6 : 0}));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(tag(ground, 'mid'));
  const cob = cobbleMaterial(night ? '#6F7780' : '#EADFCB', wet);
  root.add(tag(ribbon([[0, 5.8], [0, 23]], 4, cob, .02), 'mid'));
  root.add(tag(ribbon([[L.market.x[0], 26], [L.market.x[1], 26]], 6, cob, .021), 'mid'));
  root.add(tag(ribbon(L.hillRoad, 4, cob, .022), 'mid'));
  { const sq = new T.Mesh(new T.CircleGeometry(L.square.r, 48), cob); sq.rotation.x = -Math.PI / 2; sq.position.set(L.square.at[0], .023, L.square.at[1]); sq.receiveShadow = true; root.add(tag(sq, 'mid')); }
  // slime stream (glossy teal, flowing ripples) + rounded banks + toy bridge on Market Street
  { const sm = new T.MeshPhysicalMaterial({color: '#25C9B8', roughness: .08, clearcoat: 1, transmission: 0, sheen: .3, sheenColor: new T.Color('#BFFFF6')});
    sm.onBeforeCompile = s => { s.uniforms.uT = {value: t}; s.vertexShader = 'varying vec2 vXZ;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(position, 1.)).xz;');
      s.fragmentShader = 'varying vec2 vXZ; uniform float uT;\n' + s.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(normal + vec3(sin(vXZ.y * 3.1 - uT * 2.) * .18 + sin(vXZ.x * 5.3 + vXZ.y) * .08, 0., cos(vXZ.y * 2.3 + vXZ.x * 1.7 - uT) * .15));`); };
    const st = ribbon(L.stream, 2.6, sm, .03); root.add(tag(st, 'mid'));
    for (const s of [-1, 1]) { const bank = L.stream.map(([x, z]) => [x + s * 1.45, z]); const pts = bank.map(([x, z]) => new T.Vector3(x, .08, z));
      const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, .16, 8), std('#F4ECDD', {roughness: .5})); tube.receiveShadow = true; root.add(tag(tube, 'mid')); }
    const br = new T.Group(); br.position.set(L.bridge.at[0], 0, L.bridge.at[1]); root.add(tag(br, 'fg'));
    const deck = new T.Mesh(new T.CylinderGeometry(9, 9, L.bridge.w, 48, 1, false, -Math.PI / 2 - .42, .84), std('#FFB3C8', {roughness: .3, clearcoat: .8}));   // shallow arch along x
    deck.rotation.x = Math.PI / 2; deck.rotation.z = Math.PI / 2; deck.position.y = -8.45; deck.castShadow = deck.receiveShadow = true; br.add(deck);
    for (const s of [-1, 1]) { const rail = new T.Mesh(new T.TorusGeometry(9.25, .09, 8, 48, .84), std('#FFF3F7', {roughness: .35})); rail.rotation.z = Math.PI / 2 - .42; rail.position.set(0, -8.45, s * L.bridge.w / 2); rail.castShadow = true; br.add(rail);
      for (let i = -3; i <= 3; i++) { const x = i * 1.0, y = Math.sqrt(81 - x * x) - 8.45; const post = new T.Mesh(new T.CylinderGeometry(.06, .06, .55, 8), std('#FFF3F7')); post.position.set(x, y + .3, s * L.bridge.w / 2); br.add(post); } } }
  // THE BOX (Core Row centrepiece): walls with holographic drips outside, kraft inside, door on +z, flaps opened flat
  const kraft = std('#CDB894', {roughness: .85}), holo = holoWallMaterial(), BW = L.box, wallT = .18;
  const boxG = new T.Group(); root.add(boxG);
  const wall = (w, h, d, x, y, z, outer) => { const mats = Array(6).fill(kraft); mats[outer] = holo; const m = new T.Mesh(new T.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; boxG.add(m); return m; };
  wall(BW.w, BW.h, wallT, 0, BW.h / 2, -BW.d / 2, 5);
  { const W0 = BW.w / 2, oz = -4.15, ow = 3.6, oy0 = 2.9, oy1 = 4.92;   // §1e/§2-6: left-wall window on the Core Row camera → summit line
    wall(wallT, BW.h, (BW.d / 2 + oz - ow / 2), -W0, BW.h / 2, (-BW.d / 2 + oz - ow / 2) / 2, 1); wall(wallT, BW.h, BW.d / 2 - oz - ow / 2, -W0, BW.h / 2, (oz + ow / 2 + BW.d / 2) / 2, 1);
    wall(wallT, oy0, ow, -W0, oy0 / 2, oz, 1); wall(wallT, BW.h - oy1, ow, -W0, (oy1 + BW.h) / 2, oz, 1);
    const wc = new T.Vector3(-W0 - .05, (oy0 + oy1) / 2, oz), n = new T.Vector3(...L.plinth.top).sub(wc).normalize();   // window normal → hill summit
    const win = new T.Group(); win.position.copy(wc); win.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), n); win.userData.windowNormal = n.toArray().map(v => +v.toFixed(3)); boxG.add(win);
    const fm = std('#FFF6E8', {roughness: .5}), wh = oy1 - oy0;
    for (const [w, h, x, y] of [[ow + .2, .12, 0, wh / 2], [ow + .2, .12, 0, -wh / 2], [.12, wh, -ow / 2, 0], [.12, wh, ow / 2, 0]]) { const b = new T.Mesh(new T.BoxGeometry(w, h, .14), fm); b.position.set(x, y, 0); win.add(b); }
    const hinge = new T.Group(); hinge.position.set(0, wh / 2, 0); hinge.rotation.x = 1.15; win.add(hinge);   /* flap swung up and out of the sightline */ const fl = new T.Mesh(new T.BoxGeometry(ow, wh, wallT), [kraft, kraft, kraft, kraft, holo, kraft]); fl.position.y = wh / 2; fl.castShadow = true; hinge.add(fl); }
  { const rows = [{y: 0, dz: 1.6}, {y: 1.25, dz: 1.05}, {y: 2.5, dz: .5}], cw = .95, n = Math.floor((BW.w - .6) / cw), cub = [];   // §1e: tiered cubby wall (Slime Guy homes, 1.2 H)
    rows.forEach((r, ri) => { for (let i = 0; i < n; i++) cub.push({x: -BW.w / 2 + .3 + cw * (i + .5), y: r.y, z: -BW.d / 2 + wallT / 2 + r.dz / 2, d: r.dz, ri, i}); });
    const frame = new T.InstancedMesh(new T.BoxGeometry(cw - .06, 1.2, 1), std('#ffffff', {roughness: .5}), cub.length), door = new T.InstancedMesh(new T.PlaneGeometry(.52, .82), new T.MeshStandardMaterial({color: night ? '#FFCF8A' : '#3B2A2A', emissive: night ? '#FFB860' : '#000000', emissiveIntensity: night ? .35 : 0}), cub.length);
    const ledge = new T.InstancedMesh(new T.BoxGeometry(BW.w - .4, .1, 1), std('#E8D3B0', {roughness: .6}), rows.length);
    cub.forEach((c, k) => { frame.setMatrixAt(k, new T.Matrix4().compose(new T.Vector3(c.x, c.y + .6, c.z), new T.Quaternion(), new T.Vector3(1, 1, c.d))); frame.setColorAt(k, new T.Color(PALETTE[(c.i * 2 + c.ri * 5) % 9]).lerp(new T.Color('#ffffff'), .25));
      door.setMatrixAt(k, new T.Matrix4().makeTranslation(c.x, c.y + .47, c.z + c.d / 2 + .005)); });
    rows.forEach((r, ri) => ledge.setMatrixAt(ri, new T.Matrix4().compose(new T.Vector3(0, r.y + 1.25, -BW.d / 2 + wallT / 2 + r.dz / 2 + .05), new T.Quaternion(), new T.Vector3(1, 1, r.dz + .1))));
    for (const m of [frame, door, ledge]) { m.castShadow = m.receiveShadow = true; boxG.add(m); }
    const bulbs = [], bm = new T.MeshStandardMaterial({color: '#FFF1D6', emissive: '#FFD9A0', emissiveIntensity: night ? 1.6 : 1.2});   // string lights across the box (warm bulbs, no text)
    for (const [z, sag] of [[-3.2, .5], [-.4, .6], [2.4, .55]]) { const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new T.Vector3(-BW.w / 2 + .2 + (BW.w - .4) * t, BW.h - .15 - sag * 4 * t * (1 - t), z)); }
      const wire = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .012, 4), new T.MeshStandardMaterial({color: '#3A3A3A'})); boxG.add(wire); pts.slice(1, -1).forEach(p => bulbs.push(p)); }
    const bi = new T.InstancedMesh(new T.SphereGeometry(.07, 10, 8), bm, bulbs.length); bulbs.forEach((p, k) => bi.setMatrixAt(k, new T.Matrix4().makeTranslation(p.x, p.y - .06, p.z))); boxG.add(bi); } wall(wallT, BW.h, BW.d, BW.w / 2, BW.h / 2, 0, 0);
  const sideW = (BW.w - BW.door.w) / 2; for (const s of [-1, 1]) wall(sideW, BW.h, wallT, s * (BW.door.w / 2 + sideW / 2), BW.h / 2, BW.d / 2, 4);
  wall(BW.door.w, BW.h - BW.door.h, wallT, 0, BW.door.h + (BW.h - BW.door.h) / 2, BW.d / 2, 4);
  { const fl = new T.Mesh(new T.PlaneGeometry(BW.w, BW.d), kraft); fl.rotation.x = -Math.PI / 2; fl.position.y = .015; fl.receiveShadow = true; boxG.add(fl); }
  for (const [len, wid, x, z, ry] of [[BW.w, 3, 0, -BW.d / 2, 0], [BW.w, 3, 0, BW.d / 2, Math.PI], [BW.d, 3, -BW.w / 2, 0, -Math.PI / 2], [BW.d, 3, BW.w / 2, 0, Math.PI / 2]]) {
    const hinge = new T.Group(); hinge.position.set(x, BW.h, z); hinge.rotation.y = ry; boxG.add(hinge);
    const f = new T.Mesh(new T.BoxGeometry(len, wallT, wid), [kraft, kraft, kraft, holo, kraft, kraft]); f.position.set(0, 0, -wid / 2); f.castShadow = true; hinge.add(f); }
  const core = signPlate('CORE ROW', {readFrom: 16, fov: 74});   /* district banner: reads from 16 H at 24 mm */ core.position.set(0, BW.door.h + core.userData.sign.h / 2 + .25, BW.d / 2 + wallT / 2 + .06); boxG.add(core); signs.push(core);
  tag(boxG, 'mid'); anchors.boxDoor = [0, 0, BW.d / 2]; anchors.coreRow = [0, 0, 0];
  // TOP SHELF HILL (1 : 2.2), S-path, terraces come with the town; summit = plinth only
  { const prof = []; for (let i = 0; i <= 64; i++) { const r = HILL.R * i / 64; prof.push(new T.Vector2(r, hillY(HILL.at[0] + r, HILL.at[1]))); }
    prof.push(new T.Vector2(HILL.R + .01, 0)); const hill = new T.Mesh(new T.LatheGeometry(prof.reverse(), 128), std(night ? '#2F6A47' : '#74C77A', {roughness: wet ? WR : .45, clearcoat: wet ? .4 : .35, clearcoatRoughness: wet ? .5 : .25}));
    hill.position.set(HILL.at[0], 0, HILL.at[1]); hill.receiveShadow = hill.castShadow = true; hill.userData.hillPlinth = true; root.add(tag(hill, 'bg'));
    root.add(tag(ribbon(L.path.map(p => [p[0], p[2]]), 1.15, std(night ? '#8A8A80' : '#F3E7CF', {roughness: wet ? WR : .6, side: T.DoubleSide}), .04, hillY), 'bg')); }
  // PLINTH: tier 1 Ø1.8 × .35 with "1 / 102", tier 2 Ø1.4 × .5 (bevel .08) with a .02 teal emissive rim on its top edge
  const plinth = new T.Group(); plinth.position.set(...L.plinth.at); plinth.rotation.y = Math.atan2(TOWN_DIR[0], TOWN_DIR[1]); root.add(plinth);
  { const white = std('#FBFBFD', {roughness: .08, clearcoat: 1, clearcoatRoughness: .03});
    const b1 = new T.Mesh(new T.CylinderGeometry(PLINTH.base.d / 2, PLINTH.base.d / 2, PLINTH.base.h, 72), white); b1.position.y = PLINTH.base.h / 2; plinth.add(b1);
    const r2 = PLINTH.top.d / 2, h2 = PLINTH.top.h, bv = PLINTH.top.bevel, prof = [new T.Vector2(0, 0), new T.Vector2(r2, 0), new T.Vector2(r2, h2 - bv)];
    for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; prof.push(new T.Vector2(r2 - bv + bv * Math.cos(a), h2 - bv + bv * Math.sin(a))); } prof.push(new T.Vector2(0, h2));
    const b2 = new T.Mesh(new T.LatheGeometry(prof, 72), white); b2.position.y = PLINTH.base.h; b2.userData.tier2 = true; plinth.add(b2);   // tier 2 (profile bottom → top, outward faces)
    const band = .03, rim = new T.Mesh(new T.CylinderGeometry(r2 + .004, r2 + .004, band, 96, 1, true), new T.MeshStandardMaterial({color: PLINTH.rim.color, emissive: PLINTH.rim.color, emissiveIntensity: 3}));
    rim.position.y = PLINTH.base.h + h2 - bv - band / 2; rim.name = 'plinth_rim'; plinth.add(rim);   // §1b: .03 H emissive band on the tier side, at its top edge (below the bevel)
    for (const m of [b1, b2]) { m.castShadow = m.receiveShadow = true; }
    const s = signPlate('1 / 102', {readFrom: 7, fov: 40}); s.scale.setScalar(.7); s.position.set(0, PLINTH.base.h / 2, PLINTH.base.d / 2 + .02); plinth.add(s); signs.push(s); }
  tag(plinth, 'bg'); plinth.userData.plinth = true; plinth.traverse(n => { n.userData.plinth = true; n.userData.hillPlinth = true; });
  anchors.plinthTop = L.plinth.top;
  // spotlight: spill circle = top disc (Ø1.4), visible soft cone (top radius .3), back rim light for the silhouette
  { const top = new T.Vector3(...L.plinth.top), hgt = 12, src = top.clone().add(new T.Vector3(0, hgt, 0));
    const spot = new T.SpotLight('#FFF4E2', (night ? 70 : 28) * M.spot, 40, Math.atan(PLINTH.top.d / 2 / hgt) * 1.05, .35, 1.2); spot.position.copy(src); spot.target.position.copy(top); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); root.add(spot, spot.target);
    const g = new T.CylinderGeometry(.3, PLINTH.top.d / 2, hgt, 48, 1, true); g.translate(0, -hgt / 2, 0);
    const beam = new T.Mesh(g, new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: {k: {value: (night ? .1 : .06) * M.spot}},
      vertexShader: 'varying float vy; varying vec3 vn, vv; void main(){ vy = position.y; vn = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vv = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying float vy; varying vec3 vn, vv; void main(){ float e = pow(abs(dot(vn, vv)), 1.5); float f = smoothstep(-12., -6., vy) * (1. - smoothstep(-1., 0., vy) * .4); gl_FragColor = vec4(vec3(1., .96, .88) * k * e * f, 1.); }'}));
    beam.position.copy(src); beam.userData.layer = 'bg'; beam.userData.fx = true; root.add(beam);
    const back = new T.SpotLight(night ? '#BFD6FF' : '#FFE6C8', (night ? 70 : 25), 30, .1, .4, 1.5); back.position.copy(top).add(new T.Vector3(-TOWN_DIR[0] * 6, 1.4, -TOWN_DIR[1] * 6)); back.target.position.copy(top).add(new T.Vector3(0, -.35, 0));   // back rim: narrow, grazes the plinth, not the ground in front root.add(back, back.target);
    if (mood === 'dawnHope') { const gb = new T.DirectionalLight('#FFD9B0', .15 * M.sun.i); gb.position.copy(top).add(new T.Vector3(TOWN_DIR[0] * 10, -6, TOWN_DIR[1] * 10)); gb.target.position.copy(top); gb.name = 'groundBounce'; root.add(gb, gb.target); }   // §1-3
    if (night && fillCam) { const fc = resolveCam(fillCam), d = new T.Vector3(fc.pos[0] - top.x, 0, fc.pos[2] - top.z).normalize().applyAxisAngle(new T.Vector3(0, 1, 0), .6);   // §1b: front-left fill → tier side mid-grey
      const fill = new T.SpotLight('#C9D8F2', 18, 14, .22, .6, 1.2); fill.position.copy(top).addScaledVector(d, 4.5).add(new T.Vector3(0, .6, 0)); fill.target.position.copy(top).add(new T.Vector3(0, -.35, 0)); root.add(fill, fill.target); }
    if (!night) { const mp = [], r = (i => () => (i = (i * 48271) % 2147483647) / 2147483647)(5); for (let i = 0; i < 140; i++) { const h = r() * 9; mp.push(top.x + (r() - .5) * (.6 + h * .05), top.y + .4 + h, top.z + (r() - .5) * (.6 + h * .05)); }
      const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(mp, 3)); const pts = new T.Points(pg, new T.PointsMaterial({color: '#FFF3DA', size: .04, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false})); pts.userData.layer = 'bg'; pts.userData.fx = true; root.add(pts); } }
  // TOP SHELF signpost on the S-path (faces the town)
  { const [sx, sy, sz] = L.signpost, g = new T.Group(); g.position.set(sx, sy, sz); g.rotation.y = Math.atan2(TOWN_DIR[0], TOWN_DIR[1]); root.add(g);
    const post = new T.Mesh(new T.CylinderGeometry(.09, .11, 2.4, 16), std('#D9A86C', {roughness: .5})); post.position.y = 1.2; post.castShadow = true; g.add(post);
    const s = signPlate('TOP SHELF', {readFrom: 9, fov: 54}); s.position.set(0, 2.0, .14); g.add(s); signs.push(s); tag(g, 'bg'); anchors.signpost = L.signpost; }
  // MARKET STREET stalls (striped awnings, no text) + Trade Corner (TRADES)
  const stall = (x, z, yaw, colA, colB, withSign) => { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; root.add(g);
    for (const [dx, dz] of [[-1.15, 0], [0, 0], [1.15, 0]]) { const c = new T.Mesh(new T.BoxGeometry(1.1, .8, .9), std('#E6B57A', {roughness: .55})); c.position.set(dx, .4, dz); c.castShadow = c.receiveShadow = true; g.add(c); }
    const top = new T.Mesh(new T.BoxGeometry(3.6, .12, 1.1), std('#B97B45')); top.position.y = .86; top.castShadow = true; g.add(top);
    for (const s of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.07, .07, 2.6, 12), std('#B97B45')); p.position.set(s * 1.7, 2.16, -.45); g.add(p); }
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const x2 = cv.getContext('2d'); for (let i = 0; i < 8; i++) { x2.fillStyle = i % 2 ? colA : colB; x2.fillRect(i * 32, 0, 32, 32); }
    const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.userData = {stripes: true}; const aw = new T.Mesh(new T.BoxGeometry(4, .1, 1.5), new T.MeshStandardMaterial({map: tx, roughness: .5})); aw.position.set(0, 3.5, -.1); aw.rotation.x = .18; aw.castShadow = true; aw.name = 'awning_stripes'; g.add(aw);
    if (withSign) { const s = signPlate('TRADES', {readFrom: 12, fov: 54}); s.position.set(0, 3.0, .02); g.add(s); signs.push(s); }
    tag(g, 'fg'); return g; };
  stall(L.trade[0], L.trade[1], 0, '#FF9DB7', '#FFF4F7', true); anchors.trade = [L.trade[0], .92, L.trade[1]];
  L.stalls.forEach(([x, z, yaw], i) => stall(x, z, yaw, PALETTE[(i * 3) % 9], '#FFFFFF', false));
  // the town (seeded, built for the camera frustums)
  const plan = planTown(seed, cams, {sightlines: SIGHTLINES, exclude: EXCLUDE}), town = buildTown(plan, {mood, night, windowK: mood === 'quietNight' ? .5 : 1}); town.root.userData.envK = M.envK; root.add(town.root);
  // CROWD: square + lane + market + Core Row inside the box + 2 on the Trade Corner counter (20–40, shared geometry per colour)
  const spots = [...[-1, 1].flatMap(s => [-3.6, -1.6, .3, 2.3].flatMap(z => [[s * 1.15, z, -s * .25], [s * 2.1, z + .5, -s * .25]])).slice(0, 12),
    [-10.2, .6, .7], [-11.6, .0, .8], [-10.9, -1.3, .6], [-12.4, -1.6, .9], [-11.6, -2.6, .7], [-13.2, -2.9, .8],   /* D1: S1/S40 crowd down the hill road (outside the box) */
    [-8.2, 13.6, .5], [-6.8, 12.4, .2], [-9.6, 11.2, .7], [-5.6, 14.8, .1], [-10.8, 13.8, .9], [-7.6, 15.6, .3], [-11.4, 10.4, 1.0], [-8.8, 16.6, .4],
    [-.9, 10.2, .2], [1.0, 12.3, -.2], [-.5, 15.1, 0], [.9, 17.9, -.3], [-1.1, 20.4, .1],
    [4.5, 25.2, -.4], [7.8, 27.2, -.2], [15.5, 25.4, .3], [18.2, 27.4, -.5], [-3.5, 26.6, .4], [9.8, 25.0, -.1]];
  const members = crowdFrom(spots, {rareShare: .06}); members.push({x: L.trade[0] - .55, z: L.trade[1] + .05, yaw: 0, preset: 'grape', loop: 'sway', phase: .2, y: .92}, {x: L.trade[0] + .65, z: L.trade[1] + .05, yaw: 0, preset: 'frozen', loop: 'tap', phase: .7, y: .92});
  const proto = {};
  const ex = EXCLUDE.map(id => cams.find(c => c.id === id)).filter(Boolean).map(c => resolveCam(c));
  for (const c of members) { if (ex.some(k => sees(k, [c.x, .6, c.z], .6, .05))) continue; const P = (proto[c.preset] ??= createSlimeGuy({preset: c.preset})), g = P.root.clone(true), pose = idlePose(c.loop, t, c.phase);
    g.position.set(c.x, (c.y ?? 0) + pose.dy, c.z); g.rotation.set(0, c.yaw, pose.roll); g.children[0].position.y = pose.tap; g.traverse(n => { n.userData.slime = true; if (n.isMesh) { n.castShadow = n.receiveShadow = true; } }); root.add(tag(g, 'fg')); c.object = g; }
  // cloud deck (puffs at 38–50 H); golden (§1c): 6 masses in the top 45 % of the S36 frame around a centred gap
  if (mood === 'golden' && skyCam) { const c = resolveCam(skyCam), B = camBasis(c), cm = new T.MeshStandardMaterial({color: M.clouds, roughness: 1, emissive: M.clouds, emissiveIntensity: .18}), cr = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(91);
    for (const [nx, ny] of [[-.72, .3], [.72, .3], [-.9, .74], [.9, .74], [-.42, .98], [.42, .98]]) { const d = 70, dir = B.f.map((f, i) => f + nx * B.th * B.r[i] + ny * B.tv * B.u[i]), L2 = Math.hypot(...dir);
      const p = c.pos.map((v, i) => v + dir[i] / L2 * d), s = d * B.tv * .16, cg = new T.Group(); cg.position.set(...p); cg.lookAt(...c.pos);
      for (let k = 0; k < 7; k++) { const b = new T.Mesh(new T.SphereGeometry(s * (.5 + .14 * (k % 3)), 18, 14), cm); b.position.set((k - 3) * s * .32 * (cr() + .6), (cr() - .5) * s * .45, (cr() - .5) * s * .3); cg.add(b); }
      cg.traverse(n => { n.userData.cloud = true; }); root.add(tag(cg, 'far')); } }
  { const ex36 = skyCam ? resolveCam(skyCam) : null, cr = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(77), part = 0, gc = cloudGap ?? [-10, -4], cm = new T.MeshStandardMaterial({color: M.clouds, roughness: 1, emissive: M.clouds, emissiveIntensity: mood === 'golden' ? .25 : .05});
    for (let i = 0; i < (part ? 70 : 46); i++) { const a = cr() * Math.PI * 2, rr = (part ? part + 2 : 20) + cr() * (part ? 60 : 90), x = (part ? gc[0] : -8) + Math.cos(a) * rr, z = (part ? gc[1] : -6) + Math.sin(a) * rr;
      const cy = 38 + cr() * 12, s = 5 + cr() * 7; if (ex36 && sees(ex36, [x, cy, z], s * 1.4, .1)) continue;   /* golden: the S36 frame keeps only its 6 masses */
      const cg = new T.Group(); cg.position.set(x, cy, z);
      for (let k = 0; k < 6; k++) { const b = new T.Mesh(new T.SphereGeometry(s * (.45 + .12 * (k % 3)), 16, 12), cm); b.position.set((k - 2.5) * s * .42, Math.sin(k * 1.7) * s * .14, Math.cos(k * 2.3) * s * .25); cg.add(b); }
      root.add(tag(cg, 'far')); } }
  // rain-night extras: puddles (ripples), 3D rain streaks, warm practicals at the box door (quiet night: practicals only)
  if (mood === 'quietNight') { const glow = new T.PointLight('#FFD9A0', 3.5, 12, 1.4); glow.position.set(0, 4.3, -.5); root.add(glow); }   /* string-light glow inside the box (S14–S17) */
  if (rain) for (const s of [-1, 1]) { const l = new T.PointLight(M.practicals, 6, 9, 1.6); l.position.set(s * 2.4, 3.1, BW.d / 2 + .6); root.add(l); }
  if (rain) {
    const pm = new T.MeshPhysicalMaterial({color: '#25303C', roughness: WR, metalness: .05, clearcoat: .9, clearcoatRoughness: .3});
    pm.onBeforeCompile = s => { s.vertexShader = 'varying vec2 vXZ;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(position, 1.)).xz;');
      s.fragmentShader = 'varying vec2 vXZ;\n' + s.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 r = vec2(0.); for (int i = 0; i < 5; i++) { vec2 c = vec2(sin(float(i) * 12.9) * .7, cos(float(i) * 7.3) * .7); vec2 d = vXZ - floor(vXZ) - .5 - c * .3; float l = length(d);
          r += d / max(l, 1e-3) * sin(l * 70. - float(i)) * exp(-l * 9.); } normal = normalize(normal + vec3(r.x, 0., r.y) * .35); }`); };
    for (const [x, z, sx, sz] of [[-1.2, 11, 1.6, 1], [1.4, 16.5, 1.2, .8], [-8.5, 12.5, 1.8, 1.1], [6, 26.5, 1.6, 1], [-14, -4.5, 1.6, 1]]) { const p = new T.Mesh(new T.CircleGeometry(1, 40), pm); p.rotation.x = -Math.PI / 2; p.scale.set(sx, sz, 1); p.position.set(x, hillY(x, z) + .03, z); root.add(tag(p, 'mid')); }
    const rr = (i => () => (i = (i * 48271) % 2147483647) / 2147483647)(9), lp = [];
    for (let i = 0; i < 9000; i++) { const x = (rr() - .5) * 80 - 10, y = rr() * 28, z = (rr() - .5) * 80 - 4, l = .35 + rr() * .3; lp.push(x, y, z, x + l * .18, y - l, z + l * .05); }
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3)); const rain = new T.LineSegments(lg, new T.LineBasicMaterial({color: '#B8CCE8', transparent: true, opacity: .32, depthWrite: false})); rain.userData.fx = true; rain.userData.layer = 'fg'; root.add(rain);
  }
  return {root, anchors, plan, crowd: members, signs, plinth, sunDir: M.sun.dir, layout: L};
}
