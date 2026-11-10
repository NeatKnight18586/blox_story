// Studio V2 cast, classic Roblox construction: six plain blocks (classic box
// torso, normal-size head), clothing painted onto the block faces like a
// shirt/pants template, a face decal, and accessory meshes (hair, glasses,
// notebook). Built once; poses, actions and face swaps never rebuild meshes.
import * as T from 'three';
import {createBaseAvatar, block} from '../../avatar/baseAvatar.js';
import {makeHair, HAIR_OPTIONS} from './hair.js';
import {setExpression, EXPRESSIONS, ALIASES} from './faces.js';
import {paintedMaterials, longSleeve, shortSleeve, legs, TORSOS} from './clothing.js';

export {EXPRESSIONS, ALIASES, setExpression, HAIR_OPTIONS};

// Skin tones follow the Roblox palette family (Light orange #EAB892, Nougat #CC8E69).
export const PRESETS = Object.freeze({
  leo: {
    scale: 1, skin: '#eab892', top: '#1d9aa0', torso: 'leo', sleeves: 'long',
    legs: {cloth: '#2f5a92', shoe: '#3b2a22', belt: '#6b4428'},
    hair: {option: 'messy_brown'},
    props: ['notebook'],
  },
  pip: {
    scale: .65, skin: '#f0c9a3', top: '#ef6a35', torso: 'pip', sleeves: 'short',
    legs: {cloth: '#3e78c4', shoe: '#d23b33', legLength: .52, sock: '#f4f1ea'},
    hair: {option: 'spiky_blonde'},
    props: [],
  },
  mother: {
    scale: 1, skin: '#e0a882', top: '#8466b8', torso: 'mother', sleeves: 'long',
    legs: {cloth: '#4c5a78', shoe: '#5a3b2c'},
    hair: {option: 'bun_red', color: '#b8b3aa'},
    props: ['glasses'],
  },
});

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
  return buildCharacter(presetName, p, expression);
}

// Crowd extras: deterministic random outfits on the same rig (seeded, so a shot re-renders identically).
const SKINS = ['#eab892', '#cc8e69', '#f2d0b0', '#a0694a', '#e0a882', '#7c4a32'];
const TOPS = ['#e2483d', '#2f80d1', '#f2b632', '#46a85a', '#9b59b6', '#ff7aa8', '#1fb5a8', '#f0f0f0', '#35393f'];
const LEGS = [{cloth: '#2f5a92', shoe: '#2b2b2b'}, {cloth: '#3b3f45', shoe: '#f2f2f2'}, {cloth: '#c9a46a', shoe: '#5a3b2c'}, {cloth: '#2f5a92', shoe: '#e2483d', legLength: .52, sock: '#ffffff'}, {cloth: '#7a4fa0', shoe: '#2b2b2b'}];
const HAIR_PICKS = [['messy_brown'], ['spiky_blonde'], ['swept_blue', '#2a2a30'], ['ponytail_black'], ['long_blonde'], ['bun_pink'], ['long_red', '#5a3420'], ['messy_brown', '#2a2a30'], ['bun_red', '#3a2418'], ['spiky_blonde', '#c96b2c']];
export function createExtra(seed, {expression} = {}) {
  let s = seed * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const top = pick(TOPS), hair = pick(HAIR_PICKS);
  const p = {scale: r() < .2 ? .7 : 1, skin: pick(SKINS), top, accent: pick(['#ffffff', '#ffd23f', '#35393f']), torso: pick(['tee', 'hoodie', 'stripe']),
    sleeves: r() < .5 ? 'short' : 'long', legs: pick(LEGS), hair: {option: hair[0], color: hair[1]}, props: []};
  return buildCharacter('extra_' + seed, p, expression ?? pick(['happy', 'calm', 'pleased', 'confident', 'curious', 'excited']));
}

function buildCharacter(presetName, p, expression) {
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
  setHair(a, p.hair.option, {color: p.hair.color});
  for (const prop of p.props) PROPS[prop](a);
  a.root.scale.setScalar(p.scale);
  setExpression(a, expression);
  return a;
}

// Swap hair accessories; each option is built once per avatar and cached.
export function setHair(avatar, option, {color} = {}) {
  avatar.hairCache ??= new Map();
  const key = option + (color ?? '');
  if (!avatar.hairCache.has(key)) avatar.hairCache.set(key, makeHair(option, {color}));
  if (avatar.hair) avatar.hair.removeFromParent();
  avatar.hair = avatar.hairCache.get(key); avatar.pivots.head.add(avatar.hair); return avatar;
}

// One-off characters (baker, townspeople with set roles) from an explicit preset object.
export function createCustom(name, preset, {expression = 'calm'} = {}) { return buildCharacter(name, preset, expression); }
