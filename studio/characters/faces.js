// Studio V2 faces: larger, readable eyes with catchlights, thick brows and
// filled mouth shapes, all wrapped onto the oval head front. Cached per avatar.
import * as T from 'three';
import {headFrontZ} from '../../avatar/headGeometry.js';

export const EXPRESSIONS = Object.freeze(['neutral', 'happy', 'worried', 'surprised', 'determined', 'sad']);

const INK = 0x231c1f, MOUTH = 0x5b1f27, WHITE = 0xffffff;
const mat = (color, extra = {}) => new T.MeshBasicMaterial({color, ...extra});

// Per expression: eye size/height, brow inner/outer heights, mouth recipe.
const SPEC = {
  neutral:    {eye: [.068, .13], eyeY: .64, brow: [.89, .885], mouth: {kind: 'curve', w: .17, y: .33, bend: .045}},
  happy:      {eye: [.07, .105], eyeY: .65, brow: [.915, .9], mouth: {kind: 'open', w: .22, y: .36, h: .17, smile: true}},
  worried:    {eye: [.066, .124], eyeY: .63, brow: [.95, .855], mouth: {kind: 'wave', w: .16, y: .32}},
  surprised:  {eye: [.074, .14], eyeY: .65, brow: [.98, .965], mouth: {kind: 'o', w: .085, y: .3, h: .11}},
  determined: {eye: [.07, .11], eyeY: .63, brow: [.82, .91], mouth: {kind: 'curve', w: .16, y: .32, bend: -.012}},
  sad:        {eye: [.066, .116], eyeY: .61, brow: [.94, .845], mouth: {kind: 'curve', w: .16, y: .29, bend: -.065}},
};

function onFace(x, y, lift = .012) { return new T.Vector3(x, y, headFrontZ(x) + lift); }
function faceYaw(x) { return Math.atan2(x / .625 ** 2, headFrontZ(x) / .55 ** 2); }

function stroke(name, pts, radius, material) {
  const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(([x, y]) => onFace(x, y))), 28, radius, 8, false), material);
  m.name = name; return m;
}
// Flat shape whose outline vertices are pushed onto the curved head front.
function patch(name, shape, material, lift = .011) {
  // Densify the outline so every triangle is narrow and follows the curved front.
  const g = new T.ShapeGeometry(new T.Shape(shape.getSpacedPoints(96)), 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, headFrontZ(p.getX(i)) + lift);
  g.computeVertexNormals();
  const m = new T.Mesh(g, material); m.name = name; return m;
}

export function makeFaceV2(name, {blush = 0, inkColor = INK} = {}) {
  const s = SPEC[name]; if (!s) throw new Error('Unknown expression: ' + name);
  const g = new T.Group(); g.name = `face_v2_${name}`;
  const ink = mat(inkColor), mouthMat = mat(MOUTH), white = mat(WHITE);
  for (const [side, x] of [['left', -.2], ['right', .2]]) {
    const eye = new T.Mesh(new T.SphereGeometry(1, 20, 14), ink); eye.name = `eye_${side}`;
    eye.scale.set(s.eye[0], s.eye[1], .014); eye.position.copy(onFace(x, s.eyeY, .006)); eye.rotation.y = faceYaw(x); g.add(eye);
    const glint = new T.Mesh(new T.SphereGeometry(1, 12, 8), white); glint.name = `glint_${side}`;
    glint.scale.set(s.eye[0] * .34, s.eye[1] * .26, .008); glint.position.copy(onFace(x + s.eye[0] * .35, s.eyeY + s.eye[1] * .42, .02)); glint.rotation.y = faceYaw(x); g.add(glint);
    const sign = side === 'left' ? -1 : 1, [inner, outer] = s.brow;
    g.add(stroke(`brow_${side}`, [[sign * .09, inner], [sign * .2, (inner + outer) / 2 + .014], [sign * .31, outer]], .028, ink));
  }
  const m = s.mouth;
  if (m.kind === 'curve') {
    const pts = []; for (let i = 0; i <= 24; i++) { const x = -m.w + 2 * m.w * i / 24; pts.push([x, m.y + m.bend * (x / m.w) ** 2]); }
    g.add(stroke('mouth', pts, .024, ink));
  } else if (m.kind === 'wave') {
    const pts = []; for (let i = 0; i <= 24; i++) { const x = -m.w + 2 * m.w * i / 24; pts.push([x, m.y + .018 * Math.sin((x / m.w) * Math.PI * 1.5)]); }
    g.add(stroke('mouth', pts, .022, ink));
  } else if (m.kind === 'open') {
    // Open smile: flat top lip line, round lower edge.
    const sh = new T.Shape(); sh.moveTo(-m.w, m.y); sh.quadraticCurveTo(0, m.y + .02, m.w, m.y); sh.quadraticCurveTo(m.w * .7, m.y - m.h, 0, m.y - m.h); sh.quadraticCurveTo(-m.w * .7, m.y - m.h, -m.w, m.y);
    g.add(patch('mouth', sh, mouthMat));
    const tp = []; for (let i = 0; i <= 20; i++) { const x = -m.w * .72 + 1.44 * m.w * i / 20; tp.push([x, m.y - .024 + .006 * (x / m.w) ** 2]); }
    const teeth = stroke('teeth', tp, .02, white); teeth.position.z += .004; g.add(teeth);
  } else if (m.kind === 'o') {
    const sh = new T.Shape(); sh.absellipse(0, m.y, m.w, m.h, 0, Math.PI * 2, false, 0);
    g.add(patch('mouth', sh, mouthMat));
  }
  if (blush > 0) for (const x of [-.37, .37]) {
    const sh = new T.Shape(); sh.absellipse(x, .46, .09, .05, 0, Math.PI * 2, false, 0);
    g.add(patch(`blush_${x < 0 ? 'left' : 'right'}`, sh, mat(0xff8a8a, {transparent: true, opacity: blush, depthWrite: false}), .008));
  }
  return g;
}

// Swap the visible face; every expression is built once per avatar and reused.
export function setExpression(avatar, name) {
  const key = 'v2:' + name;
  if (!avatar.faceCache.has(key)) avatar.faceCache.set(key, makeFaceV2(name, avatar.faceStyle ?? {}));
  if (avatar.faceLayer) avatar.faceLayer.removeFromParent();
  avatar.faceLayer = avatar.faceCache.get(key); avatar.pivots.head.add(avatar.faceLayer);
  avatar.expression = name; return avatar;
}
