// campaigns/tapcap/world/townmesh.js — meshes for a town plan (town.js). Buildings are InstancedMesh per archetype part with
// per-instance colour (4 archetypes, doors ≈ 1.2 H); dressing is instanced; the skyline + haze ring is the FAR layer.
// Every object carries userData.layer ('fg' | 'mid' | 'bg' | 'far') and buildings carry an id map for the measured passes.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {PALETTE, hillY, HILL} from './town.js';

const rbox = (w, h, d, r = .12, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - .01, h / 2 - .01, d / 2 - .01));
const at = (g, x, y, z) => g.translate(x, y, z);
const M4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
const tag = (o, layer) => { o.userData.layer = layer; return o; };

// archetype parts: name → {geo, mat: body|roof|door|window|stone, when(b) → [local Matrix4…]}
function keycapRoof() {   // rounded-square slab with a dished (concave) top
  const g = rbox(2.15, .42, 2.15, .16, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > .1) { const x = p.getX(i) / 1.0, z = p.getZ(i) / 1.0; p.setY(i, p.getY(i) - .17 * Math.max(0, 1 - (x * x + z * z) / 1.15)); }
  g.computeVertexNormals(); return g;
}
function keycapBody() { const g = rbox(2.5, 2.1, 2.5, .2, 3), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 - .09 * (p.getY(i) + 1.05) / 2.1; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); return at(g, 0, 1.05, 0); }
function dripRoof() {   // glossy slime-glaze half-barrel roof with rounded drips along both eaves
  const parts = [at(new T.CylinderGeometry(1.5, 1.5, 3.0, 28, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).scale(1, .72, 1), 0, 2.15, 0)];
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const x = -1.3 + i * .43, len = .18 + ((i * 37 + (s > 0 ? 11 : 3)) % 7) * .06;
    parts.push(at(new T.CapsuleGeometry(.1, len, 4, 10), x, 2.15 - len / 2 - .02, s * 1.42)); }
  return mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
}
function towerCap() { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new T.Vector2(1.15 * Math.cos(t * Math.PI / 2) ** .8, 1.25 * Math.sin(t * Math.PI / 2))); } return new T.LatheGeometry(pts, 24); }
const PARTS = {
  keycap: [{n: 'body', geo: keycapBody, mat: 'body', m: () => [new T.Matrix4()]}, {n: 'roof', geo: keycapRoof, mat: 'roof', m: () => [new T.Matrix4().makeTranslation(0, 2.3, 0)]}],
  stacked: [0, 1, 2].map(i => ({n: 'cube' + i, geo: () => at(rbox([2.3, 1.85, 1.45][i], [2.2, 1.8, 1.4][i], [2.3, 1.85, 1.45][i], .14), 0, [1.1, .9, .7][i], 0), mat: i % 2 ? 'roof' : 'body',
    m: b => b.floors > i ? [new T.Matrix4().makeRotationY([0, .32, -.25][i]).setPosition(0, [0, 2.2, 4.0][i], 0)] : []}))
    .concat([{n: 'lid', geo: () => rbox(1.7, .16, 1.7, .06), mat: 'body', m: b => [new T.Matrix4().makeRotationY([0, .32, -.25][b.floors - 1]).setPosition(0, [2.28, 4.08, 5.48][b.floors - 1], 0)]}]),
  drip: [{n: 'body', geo: () => at(rbox(2.6, 2.15, 2.4, .14), 0, 1.075, 0), mat: 'body', m: () => [new T.Matrix4()]}, {n: 'roof', geo: dripRoof, mat: 'roof', m: () => [new T.Matrix4()]}],
  tower: [0, 1, 2, 3].map(i => ({n: 'floor' + i, geo: () => at(rbox(1.75, 1.45, 1.75, .14), 0, .725, 0), mat: i % 2 ? 'roof' : 'body', m: b => b.floors > i ? [new T.Matrix4().makeRotationY(i % 2 ? .12 : 0).setPosition(0, i * 1.45, 0)] : []}))
    .concat([{n: 'cap', geo: towerCap, mat: 'roof', m: b => [new T.Matrix4().setPosition(0, b.floors * 1.45, 0)]}]),
};
const FRONT = {keycap: 1.15, stacked: 1.15, drip: 1.2, tower: .875};   // front face z (door side)
function windowSlots(b) {   // 1–3 windows on the front face (local), towers: one per floor above the door
  const f = FRONT[b.arch] + .02;
  if (b.arch === 'tower') return Array.from({length: Math.min(3, b.floors - 1)}, (_, i) => [0, 1.45 * (i + 1) + .75, f]).slice(0, b.windows);
  if (b.arch === 'stacked') return [[-.72, 1.25, f], [.72, 1.25, f], [0, 2.2 + .95, .925 + .02]].slice(0, b.windows);
  return [[-.78, 1.3, f], [.78, 1.3, f], [0, 1.95, f]].slice(0, b.windows);
}

export function buildTown(plan, {mood = 'dawnHope', night = false} = {}) {
  const root = new T.Group(); root.name = 'town';
  const mat = {
    body: new T.MeshPhysicalMaterial({color: '#ffffff', roughness: .42, clearcoat: .45, clearcoatRoughness: .25}),
    roof: new T.MeshPhysicalMaterial({color: '#ffffff', roughness: .16, clearcoat: 1, clearcoatRoughness: .05}),
    door: new T.MeshStandardMaterial({color: '#6A4636', roughness: .5}),
    window: new T.MeshPhysicalMaterial({color: night ? '#FFD9A0' : '#CFE6F5', roughness: .08, clearcoat: 1, emissive: night ? '#FFD9A0' : '#000000', emissiveIntensity: night ? 1.6 : 0}),
    stone: new T.MeshStandardMaterial({color: '#CFC6B8', roughness: .8}),
  };
  const B = plan.buildings, mats = new T.Matrix4(), ids = [];
  const place = b => { const y = b.y; Q.setFromAxisAngle(Y, b.yaw); return new T.Matrix4().compose(V.set(b.x, y, b.z), Q, S.setScalar(b.scale)); };
  const col = (i, k = 1) => new T.Color(PALETTE[i]).multiplyScalar(k);
  for (const [arch, parts] of Object.entries(PARTS)) for (const part of parts) {
    const list = B.filter(b => b.arch === arch).flatMap(b => part.m(b).map(lm => ({b, lm}))); if (!list.length) continue;
    const g = part.geo(), im = new T.InstancedMesh(g, mat[part.mat], list.length); im.name = `${arch}_${part.n}`; im.castShadow = im.receiveShadow = true;
    list.forEach(({b, lm}, i) => { im.setMatrixAt(i, place(b).multiply(lm)); im.setColorAt(i, col(part.mat === 'roof' ? b.roof : b.color, part.mat === 'roof' ? .92 : 1)); });
    im.userData.buildingIds = list.map(x => x.b.id); im.userData.arch = arch; tag(im, 'mid'); root.add(im); ids.push(im);
  }
  { const doors = new T.InstancedMesh(rbox(.72, 1.2, .1, .05), mat.door, B.length), win = B.flatMap(b => windowSlots(b).map(w => ({b, w}))), wins = new T.InstancedMesh(rbox(.44, .44, .06, .04), mat.window, win.length);
    B.forEach((b, i) => doors.setMatrixAt(i, place(b).multiply(new T.Matrix4().makeTranslation(0, .6, FRONT[b.arch] + .03))));
    win.forEach(({b, w}, i) => wins.setMatrixAt(i, place(b).multiply(new T.Matrix4().makeTranslation(...w))));
    doors.userData.buildingIds = B.map(b => b.id); wins.userData.buildingIds = win.map(x => x.b.id); for (const m of [doors, wins]) { m.castShadow = true; tag(m, 'mid'); root.add(m); ids.push(m); } }
  { const hs = B.filter(b => b.district === 'hillside'); if (hs.length) { const f = new T.InstancedMesh(rbox(2.9, 1, 2.9, .1), mat.stone, hs.length);   // terraces under Hillside houses
      hs.forEach((b, i) => { const lo = Math.min(...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, c]) => hillY(b.x + a * b.rad, b.z + c * b.rad))), h = b.y - lo + .3;
        Q.setFromAxisAngle(Y, b.yaw); f.setMatrixAt(i, new T.Matrix4().compose(V.set(b.x, lo - .3 + h / 2, b.z), Q, S.set(b.scale, h, b.scale))); }); f.receiveShadow = f.castShadow = true; tag(f, 'bg'); root.add(f); } }
  // hillside buildings read as background
  for (const im of ids) if (im.userData.buildingIds?.every(id => B[B.findIndex(b => b.id === id)]?.district === 'hillside')) tag(im, 'bg');
  // street dressing (instanced)
  const P = plan.props, by = k => P.filter(p => p.kind === k);
  const inst = (list, geo, m, layer, fn) => { if (!list.length) return null; const im = new T.InstancedMesh(geo, m, list.length); list.forEach((p, i) => { Q.setFromAxisAngle(Y, p.yaw); im.setMatrixAt(i, new T.Matrix4().compose(V.set(p.x, p.y, p.z), Q, S.setScalar(1)).multiply(fn ? fn(p) : new T.Matrix4())); });
    im.castShadow = true; im.receiveShadow = true; tag(im, layer); root.add(im); return im; };
  const lamps = by('lamp');
  inst(lamps, at(new T.CylinderGeometry(.06, .08, 2.4, 10), 0, 1.2, 0), new T.MeshStandardMaterial({color: '#3E4552', roughness: .4, metalness: .5}), 'fg');
  const bulbM = new T.MeshStandardMaterial({color: '#FFF1D6', emissive: '#FFD9A0', emissiveIntensity: night ? 3 : .15, roughness: .2});
  inst(lamps.filter(p => !p.dark), at(new T.SphereGeometry(.2, 14, 10), 0, 2.5, 0), bulbM, 'fg');
  inst(lamps.filter(p => p.dark), at(new T.SphereGeometry(.2, 14, 10), 0, 2.5, 0), new T.MeshStandardMaterial({color: '#D9D2C4', roughness: .3}), 'fg');
  const fence = mergeGeometries([0, 1, 2, 3].map(i => at(rbox(.12, .6, .08, .03), (i - 1.5) * .38, .3, 0).toNonIndexed()).concat([at(rbox(1.5, .08, .06, .02), 0, .42, 0).toNonIndexed()]).map(g => { g.deleteAttribute('uv'); return g; }));
  inst(by('fence'), fence, new T.MeshStandardMaterial({color: '#FFF6E8', roughness: .5}), 'fg');
  const planter = mergeGeometries([at(rbox(.7, .45, .7, .08), 0, .225, 0).toNonIndexed(), at(new T.SphereGeometry(.38, 14, 10), 0, .62, 0).toNonIndexed()].map(g => { g.deleteAttribute('uv'); return g; }));
  const pl = inst(by('planter'), planter, new T.MeshStandardMaterial({color: '#ffffff', roughness: .55, vertexColors: false}), 'fg');
  if (pl) by('planter').forEach((p, i) => pl.setColorAt(i, new T.Color(['#7FC98A', '#F2A8C4', '#9FD7F0'][i % 3])));
  inst(by('crate'), at(rbox(.8, .6, .7, .06), 0, .3, 0), new T.MeshStandardMaterial({color: '#E2B07A', roughness: .55}), 'fg');
  // bunting: catenary strings across Market Street with triangular flags (no text)
  { const bl = by('bunting'), flags = []; const tri = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([-.16, 0, 0, .16, 0, 0, 0, -.32, 0], 3)); tri.computeVertexNormals();
    for (const b of bl) { const n = 14, z0 = 26 - b.span / 2; const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new T.Vector3(b.x, 3.0 - 1.1 * 4 * t * (1 - t) * .5, z0 + b.span * t)); }
      const line = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, .015, 4), new T.MeshStandardMaterial({color: '#F7F2EA'})); tag(line, 'fg'); root.add(line);
      for (let i = 1; i < n; i++) flags.push({x: pts[i].x, y: pts[i].y, z: pts[i].z, i}); }
    if (flags.length) { const fm = new T.InstancedMesh(tri, new T.MeshStandardMaterial({color: '#ffffff', side: T.DoubleSide, roughness: .6}), flags.length);
      flags.forEach((f, k) => { fm.setMatrixAt(k, new T.Matrix4().makeRotationY(Math.PI / 2).setPosition(f.x, f.y, f.z)); fm.setColorAt(k, new T.Color(PALETTE[(f.i + k) % PALETTE.length]).offsetHSL(0, .15, .05)); }); tag(fm, 'fg'); root.add(fm); } }
  // far skyline ring + haze band
  { const sk = plan.skyline, g = rbox(1, 1, 1, .08), m = new T.MeshStandardMaterial({color: mood === 'rainNight' ? '#2A3550' : mood === 'golden' ? '#D9A07A' : '#B9C8DC', roughness: .9}), im = new T.InstancedMesh(g, m, sk.length);
    sk.forEach((s, i) => { Q.setFromAxisAngle(Y, s.yaw); im.setMatrixAt(i, new T.Matrix4().compose(V.set(s.x, s.h / 2, s.z), Q, S.set(s.w, s.h, s.w * .8))); }); tag(im, 'far'); root.add(im);
    const caps = sk.filter(s => s.cap), cm = new T.InstancedMesh(new T.SphereGeometry(.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m, caps.length);
    caps.forEach((s, i) => { cm.setMatrixAt(i, new T.Matrix4().compose(V.set(s.x, s.h, s.z), Q.setFromAxisAngle(Y, s.yaw), S.set(s.w, s.w * .7, s.w * .8))); }); tag(cm, 'far'); root.add(cm);
    const hc = mood === 'rainNight' ? '#1C2840' : mood === 'golden' ? '#F4BE8C' : '#DCE8F4';
    const haze = new T.Mesh(new T.CylinderGeometry(66, 66, 22, 96, 1, true), new T.ShaderMaterial({transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: {c: {value: new T.Color(hc)}},
      vertexShader: 'varying float vy; void main(){ vy = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 c; varying float vy; void main(){ gl_FragColor = vec4(c, .62 * (1. - smoothstep(-11., 9., vy))); }'}));
    haze.position.y = 11; tag(haze, 'far'); root.add(haze); }
  return {root, instanced: ids, materials: mat};
}

// cobble-like rounded-tile street material (world xz pattern: rounded squares, grout, slight bulge), wet = glossy
export function cobbleMaterial(base, wet = 0) {
  const m = new T.MeshPhysicalMaterial({color: base, roughness: wet ? .35 : .62, clearcoat: wet ? 1 : 0, clearcoatRoughness: .2});
  m.onBeforeCompile = s => {
    s.vertexShader = 'varying vec2 vXZ;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(position, 1.)).xz;');
    s.fragmentShader = 'varying vec2 vXZ;\nfloat ch(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }\n' + s.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 q = vXZ / .55; q.x += .5 * mod(floor(q.y), 2.); vec2 f = fract(q) - .5, id = floor(q); vec2 d = abs(f) - .36; float r = length(max(d, 0.)) - .08;
        float tile = 1. - smoothstep(-.01, .02, r); diffuseColor.rgb *= mix(.62, .92 + .14 * ch(id), tile);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 q2 = vXZ / .55; q2.x += .5 * mod(floor(q2.y), 2.); vec2 f2 = fract(q2) - .5; normal = normalize(normal + vec3(f2.x, 0., f2.y) * .25 * (1. - smoothstep(.3, .46, max(abs(f2.x), abs(f2.y))))); }`);
  };
  m.customProgramCacheKey = () => 'cobble' + wet; return m;
}
export const HILL_INFO = HILL;
