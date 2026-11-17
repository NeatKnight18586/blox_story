// engine/actors.js — builds v2 actors from data (docs/V2_BRIEF.md §6, §11.3) and drives them per frame.
// Preset: {tier: 'hero'|'bg', skin, scale, outfit: {recipe, ...colours}, hair: {style, color},
//          accessories: ['crown' | {name, ...opts}], tool: 'sword' | {name, ...opts}, tag: {name, role}, face}
// Everything is built once; per frame only pivots, faces, tags and the root move.
import {createActor, SKINS, BUILDS, buildError} from '../avatar-style/body.js';
import {dress} from '../avatar-style/clothing.js';
import {attachHair, attachHair3, attachHair4} from '../avatar-style/hair.js';
import {attachAccessory} from '../avatar-style/accessories.js';
import {setFace} from '../avatar-style/faces2.js';
import {setFace3, faceError, blinkClosed} from '../avatar-style/faces3.js';
import {setFace4, faceError4, isHeld} from '../avatar-style/faces4.js';
import {setFace5, faceError5, isHeld as isHeld5} from '../avatar-style/faces5.js';
import {createActor5} from '../avatar-style/body5.js';
import {attachTool, buildTool} from '../avatar-style/tools.js';
import {setTag, statSprite, bubbleSprite} from './overhead.js';
import {CLASSES} from '../parts/props.js';
import {sampleTimeline, ambientPose, applyPoseSample} from './poses.js';

export function buildActor(preset, name = 'actor') {
  const tier = preset.tier ?? 'hero', skin = preset.skin ?? SKINS[0];
  const err = buildError({...preset, name}); if (err) throw Error('build: ' + err);   // A5 Decision 5: never an adult build under 18
  const mk = preset.body === 'v5' ? createActor5 : createActor;   // format v4: Actor v5 (classic R6, satin), opt-in
  const a = mk({tier, skin, scale: preset.scale ?? 1, name, build: preset.build ?? null, regions: preset.regions ?? null, materials: preset.outfit ? dress(preset.outfit, skin, tier, {fitted: !!BUILDS[preset.build]?.profile}) : {}});
  if (preset.hair) (preset.hair.v === 4 ? attachHair4(a, preset.hair.style, preset.hair.color, preset.hairTier ?? null)   // A5: v4 sculpted (Season 1)
    : preset.hair.v === 3 || preset.hairStyle === 'v3' ? attachHair3(a, preset.hair.style, preset.hair.color, {streak: preset.hair.streak}) : attachHair(a, preset.hair.style, preset.hair.color));
  for (const acc of preset.accessories ?? []) typeof acc === 'string' ? attachAccessory(a, acc) : attachAccessory(a, acc.name, acc);
  if (preset.tool) typeof preset.tool === 'string' ? attachTool(a, preset.tool) : attachTool(a, preset.tool.name, preset.tool);
  if (preset.opacity !== undefined && preset.opacity < 1) a.ghost = preset.opacity;
  if (preset.faceStyle === 'v5') {   // Faces v5 (owner's face sheet): the default on Actor v5
    const fe = faceError5(preset.face ?? 'smile'); if (fe) throw Error('face: ' + fe);
    a.faceStyle = 'v5'; a.blinkSeed = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7); setFace5(a, preset.face ?? 'smile');
  } else if (preset.faceStyle === 'v4') {   // format v4: Faces v4 (wide-set, sketch pass, talking mouths)
    const fe = faceError4(preset.face ?? 'smile', a.build); if (fe) throw Error('face: ' + fe);
    a.faceStyle = 'v4'; a.blinkSeed = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7); setFace4(a, preset.face ?? 'smile');
  } else if (preset.faceStyle === 'v3') {   // Faces v3 (season 1 and the troupe): adult-only face parts never on a youth build
    const fe = faceError(preset.face ?? 'smile', a.build); if (fe) throw Error('face: ' + fe);
    a.faceStyle = 'v3'; a.blinkSeed = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7); setFace3(a, preset.face ?? 'smile');
  } else setFace(a, preset.face ?? 'smile');
  if (preset.tag) setTag(a, preset.tag.name, preset.tag.role ?? null);
  if (preset.opacity !== undefined && preset.opacity < 1) a.root.traverse(o => {   // A4 AFK: see-through, own material copies
    if (!o.isMesh || o.name === 'face_decal') return; o.material = [].concat(o.material).map(m => { const c = m.clone(); c.transparent = true; c.opacity = preset.opacity; c.depthWrite = true; return c; }); if (o.material.length === 1) o.material = o.material[0]; });
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
// Session 5 timelines (all optional, step keys [[t0, ...]]):
//   tools / toolsLeft = [[t0, name | null]]   tool in the right / left fist (built once per name, cached)
//   stat   = [[t0, kind, value, label?] | [t0, null]]   stat sprite above the tag (number / bar / tile)
//   bubble = [[t0, text | null]]                        chat bubble (≤ 4 words) beside the head
//   visible = [[t0, bool]]
export function driveActor(a, t, {keys, faces, tags, origin = {position: [0, 0, 0], yaw: 0}, ambient = false, fps = 30,
  tools, toolsLeft, stat, bubble, visible, kit, blinkSuppress = false, talk = null} = {}) {
  if (visible) { let v = true; for (const [t0, x] of visible) if (t >= t0) v = x; a.root.visible = v; }
  const s = ambient ? ambientPose(a.preset.seed ?? 1, t) : sampleTimeline(keys ?? [[0, 'idle']], a.preset.freeze ?? t);   // A4: preset.freeze holds one instant (AFK mid-step)
  applyPoseSample(a, s, origin);
  const stoop = BUILDS[a.build]?.stoop; if (stoop) { a.root.rotation.x += stoop; a.pivots.head.rotation.x -= stoop * .6; }   // elder_f: slight forward stoop, eyes kept forward
  if (a.faceStyle === 'v5') {   // v5: the timeline face, a seeded blink (closed arcs), and the lip-flap shape (never on a held reaction face)
    let f = a.preset.face ?? 'smile'; if (faces) { f = faces[0][1]; for (const [t0, n] of faces) if (t >= t0) f = n; }
    const bl = blinkClosed(a.blinkSeed, t, {fps, changes: (faces ?? []).map(k => k[0]), suppress: !!blinkSuppress}), tk = talk !== null && !isHeld5(f) ? talk : null;
    if (f !== a.face || bl !== !!a.faceBlink || tk !== (a.faceTalk ?? null)) setFace5(a, f, {blink: bl, talk: tk});
  } else if (a.faceStyle === 'v4') {   // v4: the timeline face, a seeded blink, and the lip-flap shape (never on a held reaction face)
    let f = a.preset.face ?? 'smile'; if (faces) { f = faces[0][1]; for (const [t0, n] of faces) if (t >= t0) f = n; }
    const bl = blinkClosed(a.blinkSeed, t, {fps, changes: (faces ?? []).map(k => k[0]), suppress: !!blinkSuppress}), tk = talk !== null && !isHeld(f) ? talk : null;
    if (f !== a.face || bl !== !!a.faceBlink || tk !== (a.faceTalk ?? null)) setFace4(a, f, {blink: bl, talk: tk});
  } else if (a.faceStyle === 'v3') {   // v3: the timeline face plus a seeded blink (3 frames every 2.5–5 s; not at a face change or in a held close-up ≤ 1 s)
    let f = a.preset.face ?? 'smile'; if (faces) { f = faces[0][1]; for (const [t0, n] of faces) if (t >= t0) f = n; }
    const bl = blinkClosed(a.blinkSeed, t, {fps, changes: (faces ?? []).map(k => k[0]), suppress: !!blinkSuppress});
    if (f !== a.face || bl !== !!a.faceBlink) setFace3(a, f, {blink: bl});
  } else if (faces) { let f = faces[0][1]; for (const [t0, n] of faces) if (t >= t0) f = n; if (f !== a.face) setFace(a, f); }
  if (tags) {
    let cur = null; for (const k of tags) if (t >= k[0]) cur = k;
    const st = cur?.[3]?.cls ? {cls: cur[3].cls, color: CLASSES[cur[3].cls].color, icon: CLASSES[cur[3].cls].icon} : null;   // A3 class-coloured tag
    if (cur) setTag(a, cur[1], cur[2] ?? null, cur[0] > 0 ? Math.round((t - cur[0]) * fps) : 99, st);
    else setTag(a, null, null);
  }
  if (kit) setAccessories(a, step(kit, t) ?? []);
  const lift = kit ? Math.max(0, ...(step(kit, t) ?? []).map(n => KIT_LIFT[n] ?? 0)) : 0;   // tall class hats push the tag up
  if (a.tag) a.tag.position.y = 5.75 + lift;
  if (tools) setTool(a, step(tools, t), 'right');
  if (toolsLeft) setTool(a, step(toolsLeft, t), 'left');
  if (stat) { let cur = null; for (const k of stat) if (t >= k[0]) cur = k; setOverlay(a, 'stat', cur?.[1] ? sprite(a, `s:${cur.slice(1).join('|')}`, () => statSprite(cur[1], cur[2], {label: cur[3] ?? ''})) : null, [0, 6.6, 0]); }
  if (bubble) { const txt = step(bubble, t); setOverlay(a, 'bubble', txt ? sprite(a, 'b:' + txt, () => bubbleSprite(txt)) : null, [0, 7.0, 0]); }
  return a;
}
// How far a kit hat's crown rises above the name tag's normal height (world units at actor scale 1).
const KIT_LIFT = {chefHat: .5, featherCap: .25};
// Accessory timeline `kit` (A3): [[t0, [names]]] — every named accessory is built once and shown or hidden; the preset's own
// accessories are untouched. A pop-on lands with a quick scale-in (pure in the frame count).
function setAccessories(a, names) {
  a._acc ??= {};
  for (const n of names) if (!a._acc[n]) { const before = a.attachments?.[n]; a._acc[n] = attachAccessory(a, n, n === 'cape' ? {color: '#6b2fa3', accent: '#f2c230'} : {}); if (before) a.attachments[n] = before; }
  for (const [n, g] of Object.entries(a._acc)) g.visible = names.includes(n);
}
const sprite = (a, key, make) => { a._spr ??= new Map(); if (!a._spr.has(key)) a._spr.set(key, make()); return a._spr.get(key); };
const step = (keys, t) => { let v = null; for (const k of keys) if (t >= k[0]) v = k[1]; return v; };

// Cached tool groups: toolGroup(a, name, side) builds a tool once per actor, hand and name (effects can target it
// before it is ever shown); setTool swaps which one hangs from the fist.
export function toolGroup(a, name, side = 'right') {
  a._tools ??= new Map(); const key = side + ':' + name;
  if (!a._tools.has(key)) {
    // the preset's own right-hand tool is reused, so effects on "<actor>.tool" keep working across swaps
    const g = side === 'right' && a.toolName === name && a.tool ? a.tool : buildTool(name, {});
    a._tools.set(key, g);
  }
  return a._tools.get(key);
}
export function setTool(a, name, side = 'right') {
  const slot = side === 'right' ? 'tool' : 'toolLeft', nameSlot = side === 'right' ? 'toolName' : 'toolLeftName';
  if (a[nameSlot] === name && (name === null || a[slot]?.parent)) return;
  if (a[slot]) a[slot].removeFromParent();
  if (!name) { a[slot] = null; a[nameSlot] = null; return; }
  const g = toolGroup(a, name, side);
  (side === 'right' ? a.pivots.rightShoulder : a.pivots.leftShoulder).add(g);
  a[slot] = g; a[nameSlot] = name;
}
// One overlay sprite per slot (stat, bubble), re-parented only when its text changes (sprites are cached by text).
function setOverlay(a, slot, sprite, at) {
  a._ov ??= {};
  if (a._ov[slot] === sprite) return;
  a._ov[slot]?.removeFromParent();
  a._ov[slot] = sprite;
  if (sprite) { sprite.position.set(...at); sprite.scale.copy(sprite.userData.base ?? sprite.scale).multiplyScalar(1 / a.root.scale.x); a.root.add(sprite); }
}
