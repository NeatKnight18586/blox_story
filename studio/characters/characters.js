// Studio V2 cast: one master six-part rig, three appearance presets.
// Everything is attached to the existing parts/pivots, so applyPose, actions,
// walk and face swaps work unchanged. Built once; nothing regenerates per frame.
import * as T from 'three';
import {createBaseAvatar, block} from '../../avatar/baseAvatar.js';
import {makeFinalHair} from '../../production/dice-town/hair.js';
import {setExpression, EXPRESSIONS} from './faces.js';

export {EXPRESSIONS, setExpression};

export const PRESETS = Object.freeze({
  leo: {
    torso: 'tapered', scale: 1, headScale: 1.1, armWidth: .9,
    skin: 0xf2c49b, top: 0x1aa0a4, topDark: 0x137c80, legs: 0x2f5689, shoes: 0x3a2a22,
    hair: {style: 'neat_side_part', color: 0x6e4126, scaleY: .94, lift: .06},
    sleeves: 'long', accents: 'leo', face: {blush: .18},
  },
  pip: {
    torso: 'classic', scale: .65, headScale: 1.16, armWidth: 1,
    skin: 0xf4cba2, top: 0xe8673a, topDark: 0xc4512a, legs: 0xf4cba2, shoes: 0xd23b33,
    hair: {style: 'soft_textured_crop', color: 0xd59a43, scaleY: 1, lift: .04},
    sleeves: 'short', shorts: 0x3f78c2, accents: 'pip', face: {blush: .32},
  },
  mother: {
    torso: 'classic', scale: 1, headScale: 1.06, armWidth: .9,
    skin: 0xe9b88f, top: 0x8466b8, topDark: 0x6a4f9a, legs: 0x4c5a78, shoes: 0x5a3b2c,
    hair: {style: 'low_bun', color: 0xb9b2a6, templeColor: 0xe0dbd1, scaleY: 1, lift: .02},
    sleeves: 'long', accents: 'mother', face: {blush: .2},
  },
});

function authored(m) { m.material.userData.authored = true; return m; }
function part(parent, name, size, color, pos, radius = .04) {
  const m = authored(block(name, size, color, radius)); m.position.set(...pos); parent.add(m); return m;
}
// V-shaped panel on the torso front (shirt collar, shawl edge).
function vPanel(parent, name, color, {top = .98, depth = .52, outer = .62, inner = .3, z = .505} = {}) {
  const s = new T.Shape();
  s.moveTo(-outer, top); s.lineTo(-inner, top); s.lineTo(0, top - depth * .62); s.lineTo(inner, top); s.lineTo(outer, top); s.lineTo(0, top - depth); s.closePath();
  const m = new T.Mesh(new T.ExtrudeGeometry(s, {depth: .03, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 2}),
    new T.MeshStandardMaterial({color, roughness: .6}));
  m.name = name; m.position.z = z; m.castShadow = m.receiveShadow = true; authored(m); parent.add(m); return m;
}

function tintHair(group, {color, templeColor}) {
  group.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone(); authored(o);
    const base = new T.Color(templeColor && o.name.includes('temple') ? templeColor : color);
    o.material.color.copy(base.multiplyScalar(o.userData.toneMultiplier ?? 1)); o.material.roughness = .62;
  });
}

const ACCENTS = {
  leo(a, p) {
    const torso = a.parts.torso;
    vPanel(torso, 'shirt_collar', 0xf5ead2, {top: .99, depth: .6, outer: .5, inner: .2});
    part(a.root, 'jacket_hem', [2.13, .38, 1.06], p.topDark, [0, 2.14, 0]);
    const strap = part(torso, 'satchel_strap', [.15, 2.05, .05], 0xe0a73e, [.06, 0, .53], .015); strap.rotation.z = -.5;
    part(a.root, 'notebook', [.52, .67, .18], 0xc0603a, [-.72, 2.42, .6], .03);
    for (const y of [.15, -.3]) part(torso, 'jacket_button', [.09, .09, .04], 0xf0c75a, [.32, y, .52], .02);
  },
  pip(a, p) {
    const torso = a.parts.torso;
    part(torso, 'shirt_stripe', [2.02, .26, 1.02], 0xfbe7bd, [0, .12, 0], .02);
    part(torso, 'shirt_collar_band', [.9, .1, .1], p.topDark, [0, .94, .47], .02);
  },
  mother(a, p) {
    const torso = a.parts.torso;
    vPanel(torso, 'cream_shawl', 0xf3e4c5, {top: 1.0, depth: .66, outer: .95, inner: .58, z: .5});
    for (const y of [-.05, -.42]) part(torso, 'cardigan_button', [.1, .1, .04], 0xf3e4c5, [0, y, .52], .02);
    // Round reading glasses: the clearest single age cue at phone size.
    const glasses = new T.Group(); glasses.name = 'glasses';
    const frame = new T.MeshStandardMaterial({color: 0x5a3a2a, roughness: .4}); frame.userData.authored = true;
    for (const x of [-.2, .2]) { const r = new T.Mesh(new T.TorusGeometry(.125, .017, 8, 28), frame); r.position.set(x, .64, .58 - Math.abs(x) * .1); r.rotation.y = x * .5; r.name = 'lens_rim'; glasses.add(r); }
    const bridge = new T.Mesh(new T.CylinderGeometry(.014, .014, .16, 8), frame); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, .67, .59); glasses.add(bridge);
    a.pivots.head.add(glasses); a.glasses = glasses;
  },
};

export function createCharacter(presetName, {expression = 'neutral'} = {}) {
  const p = PRESETS[presetName]; if (!p) throw new Error('Unknown character preset: ' + presetName);
  const a = createBaseAvatar({torsoVariant: p.torso});
  a.root.name = presetName; a.preset = presetName; a.faceStyle = p.face;
  for (const m of Object.values(a.parts)) authored(m);
  a.parts.head.material.color.set(p.skin);
  a.parts.torso.material.color.set(p.top);
  for (const side of ['left', 'right']) {
    const arm = a.parts[side + 'Arm'], leg = a.parts[side + 'Leg'];
    arm.scale.x = p.armWidth;
    if (p.sleeves === 'long') { arm.material.color.set(p.top); part(arm, 'hand', [1.02, .42, 1.03], p.skin, [0, -.79, 0], .05); part(arm, 'cuff', [1.03, .1, 1.04], p.topDark, [0, -.55, 0], .02); }
    else { arm.material.color.set(p.skin); part(arm, 'sleeve', [1.04, .62, 1.05], p.top, [0, .69, 0], .05); }
    leg.material.color.set(p.legs);
    if (p.shorts) part(leg, 'shorts', [1.03, .95, 1.04], p.shorts, [0, .53, 0], .04);
    part(leg, 'shoe', [1.04, .34, 1.12], p.shoes, [0, -.83, .04], .06);
  }
  a.pivots.head.scale.setScalar(p.headScale);
  const hair = makeFinalHair(p.hair.style); tintHair(hair, p.hair);
  hair.scale.y = p.hair.scaleY; hair.position.y = p.hair.lift; a.pivots.head.add(hair); a.hair = hair;
  ACCENTS[p.accents](a, p);
  a.root.scale.setScalar(p.scale);
  // restPositions were captured before scaling and stay valid (pivots are local).
  setExpression(a, expression);
  return a;
}
