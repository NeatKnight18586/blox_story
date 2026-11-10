// Studio V2 cast, classic Roblox construction: six plain blocks (classic box
// torso, normal-size head), clothing painted onto the block faces like a
// shirt/pants template, a face decal, and accessory meshes (hair, glasses,
// notebook). Built once; poses, actions and face swaps never rebuild meshes.
import * as T from 'three';
import {createBaseAvatar, block} from '../../avatar/baseAvatar.js';
import {makeFinalHair} from '../../production/dice-town/hair.js';
import {setExpression, EXPRESSIONS, ALIASES} from './faces.js';
import {paintedMaterials, longSleeve, shortSleeve, legs, TORSOS} from './clothing.js';

export {EXPRESSIONS, ALIASES, setExpression};

// Skin tones follow the Roblox palette family (Light orange #EAB892, Nougat #CC8E69).
export const PRESETS = Object.freeze({
  leo: {
    scale: 1, skin: '#eab892', top: '#1d9aa0', torso: 'leo', sleeves: 'long',
    legs: {cloth: '#2f5a92', shoe: '#3b2a22', belt: '#6b4428'},
    hair: {style: 'neat_side_part', color: 0x6e4126, scaleY: .94, lift: .06},
    props: ['notebook'],
  },
  pip: {
    scale: .65, skin: '#f0c9a3', top: '#ef6a35', torso: 'pip', sleeves: 'short',
    legs: {cloth: '#3e78c4', shoe: '#d23b33', legLength: .52, sock: '#f4f1ea'},
    hair: {style: 'soft_textured_crop', color: 0xd59a43, scaleY: 1, lift: .04},
    props: [],
  },
  mother: {
    scale: 1, skin: '#e0a882', top: '#8466b8', torso: 'mother', sleeves: 'long',
    legs: {cloth: '#4c5a78', shoe: '#5a3b2c'},
    hair: {style: 'low_bun', color: 0xb9b2a6, templeColor: 0xe0dbd1, scaleY: 1, lift: .02},
    props: ['glasses'],
  },
});

function tintHair(group, {color, templeColor}) {
  group.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone(); o.material.userData.authored = true;
    const base = new T.Color(templeColor && o.name.includes('temple') ? templeColor : color);
    o.material.color.copy(base.multiplyScalar(o.userData.toneMultiplier ?? 1)); o.material.roughness = .55;
  });
}
// Apply painted materials; fall back to a flat colour where no canvas exists (Node).
function dress(mesh, size, paint, fallback) {
  const mats = paintedMaterials(size, paint);
  mesh.material.dispose();
  if (mats) mesh.material = mats;
  else { mesh.material = new T.MeshStandardMaterial({color: fallback, roughness: .5}); mesh.material.userData.authored = true; }
}

const PROPS = {
  notebook(a) { const m = block('notebook', [.52, .67, .18], 0xc0603a, .03); m.material.userData.authored = true; m.position.set(-.72, 2.42, .6); a.root.add(m); },
  glasses(a) {
    const g = new T.Group(); g.name = 'glasses';
    const frame = new T.MeshStandardMaterial({color: 0x3a2a24, roughness: .4}); frame.userData.authored = true;
    // Rims sit on the decal's eye columns (x ±.18, y .65).
    for (const x of [-.18, .18]) { const r = new T.Mesh(new T.TorusGeometry(.105, .014, 8, 28), frame); r.name = 'lens_rim'; r.position.set(x, .65, .565 - Math.abs(x) * .1); r.rotation.y = x * .6; g.add(r); }
    const bridge = new T.Mesh(new T.CylinderGeometry(.012, .012, .15, 8), frame); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, .67, .58); g.add(bridge);
    a.pivots.head.add(g); a.glasses = g;
  },
};

export function createCharacter(presetName, {expression = 'calm'} = {}) {
  const p = PRESETS[presetName]; if (!p) throw new Error('Unknown character preset: ' + presetName);
  const a = createBaseAvatar({torsoVariant: 'classic'});
  a.root.name = presetName; a.preset = presetName;
  a.parts.head.material.color.set(p.skin); a.parts.head.material.roughness = .5; a.parts.head.material.userData.authored = true;
  dress(a.parts.torso, [2, 2, 1], TORSOS[p.torso](p), p.top);
  const sleeve = (p.sleeves === 'long' ? longSleeve : shortSleeve)(p.top, p.skin);
  const leg = legs({skin: p.skin, ...p.legs});
  for (const side of ['left', 'right']) {
    dress(a.parts[side + 'Arm'], [.98, 1.99, 1], sleeve, p.top);
    dress(a.parts[side + 'Leg'], [.98, 2, 1], leg, p.legs.cloth);
  }
  const hair = makeFinalHair(p.hair.style); tintHair(hair, p.hair);
  hair.scale.y = p.hair.scaleY; hair.position.y = p.hair.lift; a.pivots.head.add(hair); a.hair = hair;
  for (const prop of p.props) PROPS[prop](a);
  a.root.scale.setScalar(p.scale);
  setExpression(a, expression);
  return a;
}
