// engine/actors.js — builds v2 actors from data (docs/V2_BRIEF.md §6, §11.3) and drives them per frame.
// Preset: {tier: 'hero'|'bg', skin, scale, outfit: {recipe, ...colours}, hair: {style, color},
//          accessories: ['crown' | {name, ...opts}], tool: 'sword' | {name, ...opts}, tag: {name, role}, face}
// Everything is built once; per frame only pivots, faces, tags and the root move.
import {createActor, SKINS} from '../avatar-style/body.js';
import {dress} from '../avatar-style/clothing.js';
import {attachHair} from '../avatar-style/hair.js';
import {setFace} from '../avatar-style/faces2.js';
import {attachAccessory} from '../avatar-style/accessories.js';
import {attachTool} from '../avatar-style/tools.js';
import {setTag} from './overhead.js';
import {sampleTimeline, ambientPose, applyPoseSample} from './poses.js';

export function buildActor(preset, name = 'actor') {
  const tier = preset.tier ?? 'hero', skin = preset.skin ?? SKINS[0];
  const a = createActor({tier, skin, scale: preset.scale ?? 1, name, materials: preset.outfit ? dress(preset.outfit, skin, tier) : {}});
  if (preset.hair) attachHair(a, preset.hair.style, preset.hair.color);
  for (const acc of preset.accessories ?? []) typeof acc === 'string' ? attachAccessory(a, acc) : attachAccessory(a, acc.name, acc);
  if (preset.tool) typeof preset.tool === 'string' ? attachTool(a, preset.tool) : attachTool(a, preset.tool.name, preset.tool);
  setFace(a, preset.face ?? 'smile');
  if (preset.tag) setTag(a, preset.tag.name, preset.tag.role ?? null);
  a.preset = preset; return a;
}

// Seeded background townsperson (background tier), varied from a small palette.
const TOWN = {
  hair: ['short_messy', 'side_swept', 'bowl', 'ponytail', 'long_straight', 'curly_blocks', 'spiky', 'bald'],
  hairColor: ['#3a2418', '#6b4428', '#c8692a', '#e8c25a', '#202020', '#9a9a9a'],
  outfit: [['tunic', '#4f7cc4'], ['apron', '#c0392b'], ['peasant', '#7a8a4a'], ['robe', '#6b4a8f'], ['tunic', '#2e9e78'], ['peasant', '#a0683a'], ['apron', '#d9a440']],
  legs: ['#3b3f46', '#5a4632', '#2f4a6b', '#6b6b6b'],
};
export function townsperson(seed) {
  const r = k => { const x = Math.sin(seed * 91.7 + k * 47.3) * 43758.5453; return x - Math.floor(x); }, pick = (arr, k) => arr[Math.floor(r(k) * arr.length)];
  const [recipe, main] = pick(TOWN.outfit, 1);
  return {tier: 'bg', skin: pick(SKINS, 2), scale: .9 + r(3) * .15, outfit: {recipe, main, legs: pick(TOWN.legs, 4), accent: '#f2ead8'},
    hair: {style: pick(TOWN.hair, 5), color: pick(TOWN.hairColor, 6)}, face: pick(['smile', 'neutral', 'smile', 'gasp'], 7), seed};
}

// Per-frame drive: keys = [[t0, pose, opts]] (cross-faded), faces = [[t0, face]], or ambient (bg).
// tags = [[t0, name, role?], ...]: the name tag shown from t0 (null hides it); it pops when it changes.
export function driveActor(a, t, {keys, faces, tags, origin = {position: [0, 0, 0], yaw: 0}, ambient = false, fps = 30} = {}) {
  const s = ambient ? ambientPose(a.preset.seed ?? 1, t) : sampleTimeline(keys ?? [[0, 'idle']], t);
  applyPoseSample(a, s, origin);
  if (faces) { let f = faces[0][1]; for (const [t0, n] of faces) if (t >= t0) f = n; if (f !== a.face) setFace(a, f); }
  if (tags) {
    let cur = null; for (const k of tags) if (t >= k[0]) cur = k;
    if (cur) setTag(a, cur[1], cur[2] ?? null, cur[0] > 0 ? Math.round((t - cur[0]) * fps) : 99);
    else setTag(a, null, null);
  }
  return a;
}
