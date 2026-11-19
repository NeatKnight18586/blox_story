// campaigns/tapcap/assets/slimeguy — ONE parametric TapCap Slime Guy (prompt §2), every colour / paint / face from presets.
//   createSlimeGuy({preset, paint: null | 'fake_cosmic' | 'fake_banana', run: 0..1, face, flat, H}) →
//   {root, keycap, setTap(fracOfH), setRun(p), setFace(name), fleck}
// All geometry is baked in rest-pose root space (y = 0 at the feet, H = 1) so the shader's swirl / glitter / paint masks are
// stable and move with the keycap during a tap. Eyes and mouth are flat black decals, never spheres.
import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {LAYOUT as L, COLORS, PAINT, FACES, FLAT} from './presets.js';

// ---------- geometry helpers ----------
const lerp = (a, b, t) => a + (b - a) * t;
// per-vertex tags: aDrip (drip colour / paint runs longer), aTip (drip tips + head rim: fake paint peeks there), aPart (2 = arm)
function tag(g, drip = 0, ud = g.userData) {
  const n = g.attributes.position.count;
  g.setAttribute('aDrip', new T.BufferAttribute(new Float32Array(n).fill(drip), 1));
  g.setAttribute('aTip', new T.BufferAttribute(new Float32Array(n).fill(ud.tip ?? 0), 1));
  g.setAttribute('aPart', new T.BufferAttribute(new Float32Array(n).fill(ud.part ?? 0), 1));
  return g;
}
const mark = (g, k, v) => { g.userData[k] = v; return g; };
// Rounded box whose width/depth taper linearly with height; vertices clustered at the edges so the rounding is sampled.
function taperBox({y0, y1, wBot, wTop, dBot = wBot, dTop = wTop, r = .03, seg = 18}) {
  let g = new T.BoxGeometry(1, 1, 1, seg, seg, seg); g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-6); const p = g.attributes.position, h = y1 - y0, v = new T.Vector3();
  const cl = u => .5 * Math.sin(Math.PI * u);   // cluster toward ±0.5
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const ux = cl(v.x), uy = cl(v.y), uz = cl(v.z), t = uy + .5;
    const hx = lerp(wBot, wTop, t) / 2, hz = lerp(dBot, dTop, t) / 2, hy = h / 2;
    const P = new T.Vector3(ux * 2 * hx, uy * h, uz * 2 * hz);
    const rr = Math.min(r, hx * .95, hy * .95, hz * .95);
    const I = new T.Vector3(T.MathUtils.clamp(P.x, -(hx - rr), hx - rr), T.MathUtils.clamp(P.y, -(hy - rr), hy - rr), T.MathUtils.clamp(P.z, -(hz - rr), hz - rr));
    const d = P.clone().sub(I); if (d.lengthSq() > 1e-12) P.copy(I.add(d.normalize().multiplyScalar(rr)));
    p.setXYZ(i, P.x, P.y + y0 + hy, P.z);
  }
  g.computeVertexNormals(); return g;
}
function capsule(r, len, a, b) {   // capsule between points a and b (vectors)
  const g = new T.CapsuleGeometry(r, Math.max(1e-4, len), 6, 14); g.deleteAttribute('uv');
  const dir = b.clone().sub(a), mid = a.clone().add(b).multiplyScalar(.5);
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
  g.applyMatrix4(new T.Matrix4().compose(mid, q, new T.Vector3(1, 1, 1))); return g;
}
const capsuleAB = (r, a, b) => capsule(r, a.distanceTo(b), a, b);
const bulb = (r, c) => { const g = new T.SphereGeometry(r, 16, 12); g.deleteAttribute('uv'); g.scale(1, 1.1, .85); g.translate(c.x, c.y, c.z); g.userData.tip = 1; return g; };   // rounded drip tip
function heart(s) {
  const sh = new T.Shape(); sh.moveTo(0, -.5);
  sh.bezierCurveTo(-.15, -.3, -.55, -.1, -.5, .2); sh.bezierCurveTo(-.45, .5, -.08, .55, 0, .25);
  sh.bezierCurveTo(.08, .55, .45, .5, .5, .2); sh.bezierCurveTo(.55, -.1, .15, -.3, 0, -.5);
  const g = new T.ExtrudeGeometry(sh, {depth: .05, bevelEnabled: true, bevelThickness: .18, bevelSize: .12, bevelSegments: 4, curveSegments: 10});
  g.deleteAttribute('uv'); g.scale(s, s, s); g.translate(0, 0, -.05 * s); return g;
}
// face point helpers: a box face at height y (taper); side 0 front +z, 1 right +x, 2 back −z, 3 left −x
const halfW = (b, y) => lerp(b.wBot, b.wTop, (y - b.y0) / (b.y1 - b.y0)) / 2;
function onFace(b, side, u, y, out = 0) {   // u ∈ [-.5, .5] across the face, out = distance along the face normal
  const hw = halfW(b, y), slope = (b.wBot - b.wTop) / 2 / (b.y1 - b.y0), n = new T.Vector3(0, slope, 1).normalize();
  const local = new T.Vector3(u * 2 * hw, y, hw).add(n.clone().multiplyScalar(out));
  return local.applyAxisAngle(new T.Vector3(0, 1, 0), -side * Math.PI / 2);
}

// ---------- materials ----------
const GLSL = `
varying vec3 vP; varying float vDrip, vTip, vPart;
uniform float uMode, uPaint, uRun, uGlitter, uFleckR, uFlatMask, uFlakeDens, uFlakeGain; uniform vec3 uBody, uDripCol, uC0, uC1, uC2, uP0, uP1, uP2, uPY, uFleck;
float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 h33(vec3 p){ return vec3(h31(p), h31(p + 19.19), h31(p + 47.7)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = .5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }
vec3 cosmicCol(vec3 p){ vec3 q = p * 5.0; q += 1.6 * vec3(fbm(q + 3.1), fbm(q + 7.7), fbm(q + 1.3));
  float t = fract(fbm(q) * 2.6 + p.y * 1.3); vec3 c = t < .333 ? mix(uC0, uC1, smoothstep(.18, .333, t)) : t < .666 ? mix(uC1, uC2, smoothstep(.5, .666, t)) : mix(uC2, uC0, smoothstep(.85, 1.0, t));
  c *= .82 + .3 * fbm(q * 2.7);
  return c; }
// paint coverage: 1 = paint. Runs top→bottom with uRun; drips keep paint a little longer (rivulets follow the drips).
// fake cosmic peeks (reason): 1 = drip tips + head rim, 2 = arm edges (grazing), 3 = thin brush gaps elsewhere
float peekWhy = 0.0;
float paintMask(vec3 p, vec3 nv, vec3 vv){ peekWhy = 0.0; if (uPaint < .5) return 0.0;
  float cov = 1.0;
  if (uPaint < 1.5) {
    if (vTip > .5 && vn(p * 70.0) > .12) { cov = 0.0; peekWhy = 1.0; }
    else if (vPart > 1.5 && abs(dot(normalize(nv), normalize(vv))) < .60) { cov = 0.0; peekWhy = 2.0; }
    else if (fbm(vec3(p.x * 16.0, p.y * 5.0, p.z * 16.0) + 4.0) > .74) { cov = 0.0; peekWhy = 3.0; } }
  if (uPaint > 1.5 && uFleckR > 0.0 && distance(p, uFleck) < uFleckR) cov = 0.0;   // the one Cosmic fleck (S12 clue)
  float line = 1.12 - uRun * 1.3 - vDrip * .07 + .10 * (vn(vec3(p.x * 46.0, 0.0, p.z * 46.0)) - .5);
  return cov * step(p.y, line); }
vec3 paintCol(vec3 p){ if (uPaint > 1.5) return uPY * (.9 + .18 * vn(vec3(p.x * 90.0, p.y * 8.0, p.z * 90.0)));
  float n = fbm(vec3(p.x * 13.0, p.y * 1.6, p.z * 13.0) + 11.0 + .25 * vn(p * 30.0)); vec3 c = n < .41 ? uP0 : n < .52 ? uP1 : uP2;
  float streak = vn(vec3(p.x * 160.0, p.y * 6.0, p.z * 160.0)), dry = vn(vec3(p.x * 60.0, p.y * 3.0, p.z * 60.0));
  return c * (.78 + .32 * streak) * (.92 + .1 * dry); }   // brush streaks run vertically
`;
export function slimeMaterial(preset, {paint = null, run = 0, fleck = null, flatMask = false} = {}) {
  const P = COLORS[preset] ?? COLORS.banana, cosmic = !!P.cosmic, grad = P.gradient;
  const m = new T.MeshPhysicalMaterial({color: '#ffffff', roughness: .26, metalness: 0, clearcoat: 1, clearcoatRoughness: .06,
    iridescence: cosmic ? .75 : 0, iridescenceIOR: 1.35, iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 520, sheen: 0, envMapIntensity: 1.1});
  const C = c => new T.Color(c);
  const u = {uMode: {value: grad ? 2 : cosmic ? 1 : 0}, uPaint: {value: paint === 'fake_cosmic' ? 1 : paint === 'fake_banana' ? 2 : 0}, uRun: {value: run},
    uGlitter: {value: P.glitter ?? 1}, uBody: {value: C(P.body)}, uDripCol: {value: C(P.drip ?? P.body)},
    uC0: {value: C((P.cosmic ?? grad)?.[0] ?? '#000')}, uC1: {value: C((P.cosmic ?? grad)?.[1] ?? '#000')}, uC2: {value: C((P.cosmic ?? grad)?.[2] ?? '#000')},
    uP0: {value: C(PAINT.cosmic[0])}, uP1: {value: C(PAINT.cosmic[1])}, uP2: {value: C(PAINT.cosmic[2])}, uPY: {value: C(PAINT.banana)},
    uFleck: {value: fleck ?? new T.Vector3(9, 9, 9)}, uFleckR: {value: fleck ? .011 : 0}, uFlatMask: {value: flatMask ? 1 : 0},
    uFlakeDens: {value: cosmic ? .03 : .006}, uFlakeGain: {value: cosmic ? 6 : .9}};   // Cosmic: flakes on 3 % of the surface; solids: subtle
  m.userData.u = u;
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    s.vertexShader = 'attribute float aDrip, aTip, aPart;\nvarying vec3 vP; varying float vDrip, vTip, vPart;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position; vDrip = aDrip; vTip = aTip; vPart = aPart;');
    s.fragmentShader = GLSL + s.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 baseC = uMode > 1.5 ? (vP.y < .5 ? mix(uC0, uC1, vP.y * 2.0) : mix(uC1, uC2, vP.y * 2.0 - 1.0)) : uMode > .5 ? cosmicCol(vP) : mix(uBody, uDripCol, vDrip);
        float pm = paintMask(vP, vNormal, vViewPosition); diffuseColor.rgb = mix(baseC, paintCol(vP), pm);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .82, pm);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uMode > .5 && uMode < 1.5) {   // Cosmic: fresnel hue ramp facing C0 → mid C1 → grazing C2, swirled a little so it shifts across the surface
          float fv = 1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
          fv = clamp(fv * 1.35 + .55 * (fbm(vP * 7.0 + 2.0) - .5), 0.0, 1.0);
          vec3 rc = fv < .5 ? mix(uC0, uC1, smoothstep(0.0, .5, fv)) : mix(uC1, uC2, smoothstep(.5, 1.0, fv));
          diffuseColor.rgb = mix(rc, diffuseColor.rgb, pm); }`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
        material.clearcoat *= (1.0 - pm);
        #endif
        #ifdef USE_IRIDESCENCE
        material.iridescence *= (1.0 - pm);
        #endif
        `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 cell = floor(vP * 150.0); if (h31(cell + 5.3) > 1.0 - uFlakeDens * (1.0 - pm)) {   // glitter flakes: view-dependent glints
            vec3 nf = normalize(normal + (h33(cell) - .5) * 1.4), v = normalize(vViewPosition), l = normalize(vec3(.35, .8, .5));
            float g = pow(max(dot(reflect(-v, nf), l), 0.0), 24.0) + .6 * pow(max(dot(reflect(-v, nf), normalize(vec3(-.6, .3, -.4))), 0.0), 24.0);
            totalEmissiveRadiance += vec3(1.0, .97, .92) * g * uFlakeGain; } }`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uFlatMask > .5) gl_FragColor = vec4(pm > .5 ? vec3(1.0, 0.0, 1.0) : peekWhy == 1.0 ? vec3(1.0, 1.0, 0.0) : peekWhy == 2.0 ? vec3(1.0, .8, 0.0) : peekWhy == 3.0 ? vec3(1.0, 1.0, .5) : vec3(0.0, 1.0, 1.0), 1.0);`);
  };
  m.customProgramCacheKey = () => 'slime';
  return m;
}
const ink = () => new T.MeshBasicMaterial({color: '#0b0b0e', polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4});

// ---------- chest print (canvas): large diagonal bone, small trident fragment upper-left, two tiny bones below ----------
function printTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const bone = (ax, ay, bx, by, w) => { for (const [col, add] of [['#1d1d24', 10], ['#ffffff', 0]]) { x.strokeStyle = x.fillStyle = col; x.lineCap = 'round'; x.lineWidth = w + add;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, k = w * .75 + add / 2;
    for (const [px, py] of [[ax, ay], [bx, by]]) for (const s of [-1, 1]) { x.beginPath(); x.arc(px + nx * s * w * .55, py + ny * s * w * .55, k, 0, 7); x.fill(); } } };
  bone(150, 400, 380, 150, 46);   // large diagonal
  for (const [col, add] of [['#1d1d24', 9], ['#ffffff', 0]]) { x.strokeStyle = col; x.lineWidth = 16 + add; x.lineCap = 'round';   // trident-like fragment
    x.beginPath(); x.moveTo(110, 205); x.lineTo(110, 120); x.moveTo(80, 135); x.lineTo(80, 100); x.moveTo(140, 135); x.lineTo(140, 100); x.moveTo(80, 135); x.quadraticCurveTo(110, 160, 140, 135); x.stroke(); }
  bone(250, 455, 300, 430, 15); bone(350, 470, 395, 440, 15);   // two tiny bones
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
let PRINT = null;

// arm centre line (x for the right arm): shoulder → elbow down the side, forearm bends forward around the belly (side view ≥ 25°)
export const ARM_PTS = [[.150, .600, .00], [.205, .545, .025], [.212, .480, .085], [.150, .440, .200], [.058, .428, .240]];
export function armBendDeg(pts = ARM_PTS) {   // side view (z, y): angle between the upper arm (first 40 % of the curve) and the forearm (last 40 %)
  const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), d = (a, b) => { const p = c.getPoint(a), q = c.getPoint(b); return Math.atan2(q.y - p.y, q.z - p.z); };
  return Math.abs(d(.6, 1) - d(0, .4)) * 180 / Math.PI;
}

// ---------- the model ----------
export function createSlimeGuy({preset = 'banana', paint = null, run = 0, face = 'default', flat = false, flatMask = false} = {}) {
  const root = new T.Group(), keycap = new T.Group(); root.add(keycap); root.name = `slimeguy_${preset}`;
  const H = L.head, TO = L.torso, B = L.base, S = L.switch;
  const torsoSlope = (TO.wBot - TO.wAt67) / (.67 - TO.y0), tw = y => TO.wBot - torsoSlope * (y - TO.y0);
  const torso = {y0: TO.y0, y1: TO.y1, wBot: TO.wBot, wTop: tw(TO.y1)};
  const head = {y0: H.yb, y1: H.yt, wBot: H.wBot, wTop: H.wTop};
  const base = {y0: B.y0 + B.notchH * (B.y1 - B.y0), y1: B.y1, wBot: lerp(B.wBot, B.wTop, B.notchH), wTop: B.wTop};
  const geo = {head: [], headDrip: [], torso: [], torsoDrip: [], base: [], baseDrip: []};

  // HEAD: tapered rounded block + puddle top + rim roll + side drips → scalloped skirt of 10 tongues + side heart blobs
  geo.head.push(taperBox({y0: head.y0, y1: head.y1, wBot: head.wBot, wTop: head.wTop, r: .034}));
  { const g = new T.PlaneGeometry(1, 1, 56, 56); g.rotateX(-Math.PI / 2); g.deleteAttribute('uv'); const p = g.attributes.position, hw = head.wTop / 2 + .006;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) * 2, z = p.getZ(i) * 2, s = Math.pow(Math.pow(Math.abs(x), 6) + Math.pow(Math.abs(z), 6), 1 / 6), d = Math.hypot(x, z);
      const edge = Math.max(0, (s - .82) / .18), y = head.y1 + .010 - .014 * edge * edge + .0022 * Math.sin(d * 34) * (1 - edge) * Math.exp(-d * .9);
      p.setXYZ(i, x * hw, y, z * hw); }
    g.computeVertexNormals(); geo.head.push(g); }
  for (let side = 0; side < 4; side++) { const a = onFace(head, side, -.5, head.y1 - .004, -.004), b = onFace(head, side, .5, head.y1 - .004, -.004); geo.headDrip.push(mark(capsuleAB(.017, a, b), 'tip', 1)); }   // rim roll (fake paint peeks here)
  const TONGUES = [[0, -.42, .38, .030], [0, -.20, .22, .020], [0, .42, .33, .026], [1, -.18, 1, .034], [1, .27, .78, .020],
    [2, -.33, .9, .046], [2, .04, 1, .032], [2, .36, .7, .024], [3, -.22, .85, .028], [3, .21, 1, .044]];   // [side, u, start (0 bottom..1 top), hang]
  let fleck = null; const drips = [];
  for (const [side, u, start, hang] of TONGUES) {
    const r = .019 + hang * .08; drips.push({side, u, len: +(lerp(head.y0, head.y1, start) - .01 - (head.y0 - hang + r) + 2 * r).toFixed(4)});
    const top = onFace(head, side, u, lerp(head.y0, head.y1, start) - .01, -.006), bot = onFace(head, side, u, head.y0 - hang + r, -.006);
    geo.headDrip.push(capsuleAB(r, top, bot), bulb(r * 1.22, bot.clone().add(new T.Vector3(0, r * .05, 0))));
    if (side === 2 && Math.abs(u - .36) < 1e-6) fleck = onFace(head, side, u, head.y0 - hang + .004, r - .004);   // tip of a back drip
  }
  for (const side of [1, 3]) { const g = heart(.05), c = onFace(head, side, side === 1 ? .1 : -.08, lerp(head.y0, head.y1, .5), .002);
    g.applyMatrix4(new T.Matrix4().makeRotationY(-side * Math.PI / 2)); g.translate(c.x, c.y, c.z); geo.headDrip.push(g);
    const b = new T.SphereGeometry(.016, 14, 10); b.deleteAttribute('uv'); b.scale(1, 1.5, .7); const c2 = onFace(head, side, side === 1 ? -.28 : .3, lerp(head.y0, head.y1, .3), 0);
    b.applyMatrix4(new T.Matrix4().makeRotationY(-side * Math.PI / 2)); b.translate(c2.x, c2.y, c2.z); geo.headDrip.push(b); }

  // TORSO: trapezoid, arms hugging the belly (hands low-centre, not touching), side/back drip blobs
  geo.torso.push(taperBox({y0: torso.y0, y1: torso.y1, wBot: torso.wBot, wTop: torso.wTop, r: .03}));
  for (const s of [-1, 1]) {
    const pts = ARM_PTS.map(([x, y, z]) => new T.Vector3(s * x, y, z));
    const tube = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .041, 16, false); tube.deleteAttribute('uv'); geo.torso.push(mark(tube, 'part', 2));
    for (const [i, rr] of [[0, .041], [pts.length - 1, .043]]) { const sp = new T.SphereGeometry(rr, 18, 12); sp.deleteAttribute('uv'); sp.translate(pts[i].x, pts[i].y, pts[i].z); geo.torso.push(mark(sp, 'part', 2)); }
  }
  for (const [side, u, y, sx] of [[1, .25, .5, 1], [3, -.2, .55, 1.2], [2, -.25, .48, 1], [2, .2, .6, .8]]) {
    const b = new T.SphereGeometry(.018 * sx, 14, 10); b.deleteAttribute('uv'); b.scale(1, 1.7, .7); const c = onFace(torso, side, u, y, 0);
    b.applyMatrix4(new T.Matrix4().makeRotationY(-side * Math.PI / 2)); b.translate(c.x, c.y, c.z); geo.torsoDrip.push(b); }

  // BASE: block slightly narrower at the bottom, long vertical drips, two feet split by a centred notch
  geo.base.push(taperBox({y0: base.y0, y1: base.y1, wBot: base.wBot, wTop: base.wTop, r: .032}));
  const footW = (B.wBot * (1 - B.notchW)) / 2, notchY = base.y0 + .03;
  for (const s of [-1, 1]) geo.base.push(taperBox({y0: 0, y1: notchY, wBot: footW, wTop: footW, dBot: B.wBot - .01, dTop: base.wBot, r: .024})
    .translate(s * (B.wBot * B.notchW / 2 + footW / 2), 0, 0));
  for (let side = 0; side < 4; side++) { const a = onFace(base, side, -.5, base.y1 - .017, -.004), b = onFace(base, side, .5, base.y1 - .017, -.004); geo.baseDrip.push(capsuleAB(.016, a, b));
    for (const [u, len] of [[-.36, .62], [-.06, .38], [.22, .8], [.42, .5]]) { const r = .017, t = onFace(base, side, u + side * .03, base.y1 - .01, -.006), btm = onFace(base, side, u + side * .03, base.y1 - len * (base.y1 - base.y0) + r, -.006);
      geo.baseDrip.push(capsuleAB(r, t, btm), bulb(r * 1.2, btm)); } }

  // build meshes (merged per part)
  const mat = flat ? null : slimeMaterial(preset, {paint, run, fleck, flatMask});
  const flatMat = c => new T.MeshBasicMaterial({color: c});
  const merge = (list, drip) => { const g = new T.BufferGeometry(), all = list.map(x => { const y = x.index ? x.toNonIndexed() : x; if (!y.attributes.normal) y.computeVertexNormals(); return tag(y, drip, x.userData); });
    for (const k of ['position', 'normal', 'aDrip', 'aTip', 'aPart']) { const n = all.reduce((s, y) => s + y.attributes[k].array.length, 0), arr = new Float32Array(n); let o = 0;
      for (const y of all) { arr.set(y.attributes[k].array, o); o += y.attributes[k].array.length; } g.setAttribute(k, new T.BufferAttribute(arr, all[0].attributes[k].itemSize)); }
    return g; };
  const add = (parent, part, list, drip) => { const m = new T.Mesh(merge(list, drip), flat ? flatMat(FLAT[part]) : mat); m.name = part + (drip ? '_drip' : ''); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  add(keycap, 'head', geo.head, 0); add(keycap, 'head', geo.headDrip, 1); add(keycap, 'torso', geo.torso, 0); add(keycap, 'torso', geo.torsoDrip, 1);
  add(root, 'base', geo.base, 0); add(root, 'base', geo.baseDrip, 1);

  // SWITCH: clear housing, faint stem cross + edges
  { const sw = new T.Group(); sw.name = 'switch'; root.add(sw); const h = S.y1 - S.y0 + .012;
    const box = taperBox({y0: S.y0 - .006, y1: S.y1 + .006, wBot: S.w, wTop: S.w * .94, r: .01, seg: 6});
    sw.add(new T.Mesh(box, flat ? flatMat(FLAT.switch) : new T.MeshPhysicalMaterial({color: '#ffffff', color: '#eef6ff', transmission: 1, thickness: .08, roughness: .03, ior: 1.5, clearcoat: 1, transparent: true, opacity: .7, envMapIntensity: 1.8})));
    if (!flat) { const stemM = new T.MeshPhysicalMaterial({color: '#dfe8f2', transparent: true, opacity: .35, roughness: .2});
      for (const [w, d] of [[.06, .016], [.016, .06]]) { const st = new T.Mesh(new T.BoxGeometry(w, h, d), stemM); st.position.y = (S.y0 + S.y1) / 2; sw.add(st); }
      sw.add(new T.LineSegments(new T.EdgesGeometry(box, 30), new T.LineBasicMaterial({color: '#ffffff', transparent: true, opacity: .8}))); } }

  // CHEST PRINT decal on the slanted torso front
  let print = null;
  { const y = .512, z = tw(y) / 2 + .0015, tilt = Math.atan(torsoSlope / 2);
    const g = new T.PlaneGeometry(.27, .27); print = new T.Mesh(g, flat ? flatMat(FLAT.print) : new T.MeshBasicMaterial({map: PRINT ??= printTexture(), transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
    print.position.set(0, y, z); print.rotation.x = -tilt; print.name = 'print'; keycap.add(print); if (flat) print.visible = false; }

  // FACE decals (front of head)
  const faceG = new T.Group(); faceG.name = 'face'; keycap.add(faceG);
  function setFace(name = 'default') {
    faceG.clear(); const F = FACES[name] ?? FACES.default, hh = head.y1 - head.y0, ey = head.y0 + hh * L.eye.yOfHead, wE = halfW(head, ey) * 2;
    const eh = hh * L.eye.hOfHead * F.eyeH, ew = hh * L.eye.hOfHead * L.eye.wOfH, tilt = Math.atan(((head.wBot - head.wTop) / 2) / hh);
    const em = flat ? flatMat(FLAT.eye) : ink(), mm = flat ? flatMat(FLAT.mouth) : ink();
    const pill = (w, h) => { const s = new T.Shape(), r = w / 2, k = h / 2 - r; s.moveTo(-r, -k); s.lineTo(-r, k); s.absarc(0, k, r, Math.PI, 0, true); s.lineTo(r, -k); s.absarc(0, -k, r, 0, Math.PI, true); return new T.ShapeGeometry(s, 24); };
    const place = (m, x, y) => { const z = halfW(head, y) + .0012; m.position.set(x, y, z); m.rotation.x = -tilt; faceG.add(m); };
    for (const s of [-1, 1]) { const m = new T.Mesh(pill(ew, eh), em); m.rotation.z = 0; const e = new T.Group(); e.add(m); m.rotation.set(0, 0, s * F.eyeTilt * Math.PI / 180); place(e, s * wE * L.eye.sepOfBlockW / 2, ey); }
    const my = ey - eh * .5 - hh * .035;
    let mg;
    if (F.mouth === 'oval') { const s = new T.Shape(); s.absellipse(0, 0, hh * .045, hh * .06, 0, Math.PI * 2); mg = new T.ShapeGeometry(s, 32); }
    else { const w = hh * .16, sag = F.sag * (F.mouth === 'frown' ? 1 : -1), th = hh * .02, pts = [];   // arc: frown "︵" bulges up, smile "‿" sags
      for (let i = 0; i <= 24; i++) { const t = i / 24 * 2 - 1; pts.push(new T.Vector2(t * w / 2, sag * (1 - t * t))); }
      const s = new T.Shape(); const off = (sgn) => pts.map((p, i) => { const q = pts[Math.min(i + 1, 24)], o = pts[Math.max(i - 1, 0)], dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy); return new T.Vector2(p.x - dy / l * th / 2 * sgn, p.y + dx / l * th / 2 * sgn); });
      const up = off(1), dn = off(-1).reverse(); s.moveTo(up[0].x, up[0].y); up.forEach(p => s.lineTo(p.x, p.y)); dn.forEach(p => s.lineTo(p.x, p.y)); mg = new T.ShapeGeometry(s, 8);
      for (const e of [pts[0], pts[24]]) { const cap = new T.Mesh(new T.CircleGeometry(th / 2, 12), mm); cap.position.set(e.x, e.y, 0); mg.userData.caps = (mg.userData.caps ?? []).concat(cap); } }
    const mouth = new T.Mesh(mg, mm); for (const c of mg.userData.caps ?? []) mouth.add(c);
    place(mouth, 0, my);
  }
  setFace(face);

  const setTap = f => { keycap.position.y = f; };   // fraction of H (H = 1 in model units); see engine/tapcap.js tapOffset
  const setRun = p => { if (mat) mat.userData.u.uRun.value = p; if (print && !flat) print.visible = !paint || p > .62; };
  setRun(run);
  root.userData = {preset, paint, fleck};
  return {root, keycap, setTap, setRun, setFace, fleck, drips, material: mat, dims: {head, torso, base, switch: S}};
}
// Puddle of run-off paint at the feet (paint_run), radius grows with p.
export function paintPool(paint, p) {
  const g = new T.CircleGeometry(.36, 48); g.rotateX(-Math.PI / 2); const m = new T.MeshPhysicalMaterial({color: paint === 'fake_banana' ? PAINT.banana : PAINT.cosmic[0], roughness: .3, clearcoat: .6});
  if (paint !== 'fake_banana') { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    for (let i = 0; i < 90; i++) { x.fillStyle = PAINT.cosmic[i % 3]; x.beginPath(); x.ellipse(128 + 90 * Math.cos(i * 2.4) * Math.sqrt(i / 90), 128 + 90 * Math.sin(i * 2.4) * Math.sqrt(i / 90), 26, 12, i, 0, 7); x.fill(); }
    m.map = new T.CanvasTexture(c); m.map.colorSpace = T.SRGBColorSpace; m.color.set('#ffffff'); }
  const mesh = new T.Mesh(g, m); const s = Math.max(.01, p); mesh.scale.set(s * 1.1, 1, s); mesh.position.y = .002; mesh.name = 'paintPool'; return mesh;
}
