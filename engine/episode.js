// engine/episode.js — story-agnostic v2 renderer (docs/V2_BRIEF.md §5.1).
// Everything arrives as data (episode.json); renderFrame(n) is a pure function of n: no clock, no
// requestAnimationFrame, no unseeded randomness. Session 1: one legacy avatar on a ground plate;
// cast, worlds (world.js), faces, effects and overlays plug in from later sessions.
import * as T from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction, applyActionSample} from '../avatar/actions.js';
import {sampleCamera, maxTargetSpeed} from './camera.js';
import {layoutShots, totalFrames, valueAt, keyAt} from './timeline.js';
import {buildDragon, driveDragon} from '../avatar-style/dragon.js';
import {maskStats} from './lumagate.js';
import {expandClassReveal, applyPatch} from './classes.js';
import {buildActor, driveActor, townsperson, toolGroup} from './actors.js';
import {resolveTroupe} from './troupe.js';
import {flapActive, shapeAt} from './lipflap.js';
import {heroColours, heroSafeOutfit} from '../avatar-style/body5.js';
import {loadFont, fitTags} from './overhead.js';
import {createLook, createLookV3, sunDir} from './look.js';
import {createEffects} from './effects.js';
import {createCrowds} from './crowd.js';
import {createRuleUI, enforceReadable, uiMeasure} from './ruleui.js';
import {stripLabels} from './nolabels.js';
import {rimFor, RIM} from './heroread.js';
import * as P from '../parts/parts.js';
import * as B from '../parts/build.js';
import * as A from '../parts/ambient.js';
import * as M from '../parts/materials.js';
import * as M4 from '../parts/materials4.js';
import {createLookV4, loadLooks4, halo, water4} from './look4.js';
import {bakeScene} from './bake.js';
import * as PR from '../parts/props.js';
import * as TR from '../parts/terrain.js';
import * as BI from '../parts/biomes.js';
import * as V from '../parts/vegetation.js';
import * as W from '../parts/water.js';

const q = new URLSearchParams(location.search);
const specUrl = q.get('spec') ? new URL('../' + q.get('spec'), import.meta.url) : new URL(`../stories/${q.get('story')}/episode.json`, import.meta.url);
const spec = stripLabels(await (await fetch(specUrl)).json());   // owner rule §2c: Season 1 (or labels: false) draws no labels
const FPS = spec.fps ?? 30;

// Shots on the frame timeline: each shot owns [start, start + frames) (timeline.js: `at` cut times or `frames`).
const shots = layoutShots(spec);
const FRAMES = totalFrames(shots);

// Amendment A3 class reveals: shot.classReveal ({actor, cls, at} with `at` relative to the shot, or a list) and
// spec.classReveals (absolute seconds) expand into ordinary effect entries + cast timeline patches (engine/classes.js).
const revealEffects = [];
for (const r of [...(spec.classReveals ?? []), ...shots.flatMap(s => [].concat(s.classReveal ?? []).map(r => ({...r, at: s.start / FPS + r.at})))]) {
  const x = expandClassReveal(r); revealEffects.push(...x.effects);
  if (!spec.cast?.[r.actor]) throw Error('classReveal: unknown actor ' + r.actor);
  spec.cast[r.actor] = applyPatch(spec.cast[r.actor], x.patch);
}

// ---- Scene: the episode's world.js (Session 3+) or the Session 1 placeholder plate ----
const renderer = new T.WebGLRenderer({antialias: q.get('aa') !== '0', preserveDrawingBuffer: true});
renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(45, 9 / 16, .3, 900);   // near 0.3 (A1): more depth precision for the ground layers
let world = null, look = null, BAKE = null;
if (spec.world) {
  const mod = await import(new URL('../' + spec.world, import.meta.url).href);
  if (spec.look4) {   // format v4 Phase 2 (opt-in): AgX + PMREM sky env + v4 surfaces + baked static light (engine/look4.js, bake.js)
    const presets = await loadLooks4(new URL('./', import.meta.url)), P4 = presets[spec.look4]; if (!P4) throw Error('unknown look4 ' + spec.look4);
    await M4.loadTex4(new URL('../', import.meta.url));
    look = createLookV4(scene, renderer, presets, {initial: spec.look4}); look.apply(spec.look4);
    world = mod.build(scene, {P, B, A, M, M4, PR, TR, BI, V, W, look, spec, look4: {preset: P4, halo, water4}});
    look.setGround(world.groundY ?? (() => 0));
    const bk = P4.v4.bake;
    BAKE = bakeScene(scene, {sunDir: sunDir(P4.base.sunEl, P4.base.sunAz), sun: bk.sun, sunI: bk.sunI, sky: bk.sky, skyI: bk.skyI, ground: bk.ground, groundI: bk.groundI, aoDist: bk.aoDist,
      lights: bk.lights ? (world.lights ?? []) : []}, {env: look.envMap(), reflect: P4.v4.staticReflect});
  } else {
  // A4: a world opts into the v3 look by exporting LOOK (an object, or a function of the spec); "Nobody" does not
  const lk = typeof mod.LOOK === 'function' ? mod.LOOK(spec) : mod.LOOK;
  look = lk ? createLookV3(scene, renderer, {...lk, onEnv: tex => M.setEnvMap(tex, lk.envIntensity ?? .45)}) : createLook(scene, renderer);
  world = mod.build(scene, {P, B, A, M, PR, TR, BI, V, W, look, spec});
  }
} else {
  scene.background = new T.Color('#8fc8ff'); scene.fog = new T.Fog('#8fc8ff', 60, 140);
  scene.add(new T.HemisphereLight('#dfefff', '#6b8f4e', 1.1));
  const sun = new T.DirectionalLight('#fff3dc', 2.4); sun.position.set(14, 26, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 80}); scene.add(sun);
  const phong = c => new T.MeshPhongMaterial({color: c, shininess: 35, specular: '#333333'});
  const plate = new T.Mesh(new T.BoxGeometry(40, .4, 40), phong('#7cc36a')); plate.position.y = -.2; plate.receiveShadow = true; scene.add(plate);
  const palette = ['#e4574a', '#f2b632', '#2f80d1', '#9b59b6', '#1fb5a8', '#ff7aa8'];
  for (let i = 0; i < 12; i++) {            // a ring of coloured posts: parallax for every camera move
    const a = i / 12 * Math.PI * 2, h = 2 + (i % 3) * 1.5, m = new T.Mesh(new T.BoxGeometry(1.2, h, 1.2), phong(palette[i % palette.length]));
    m.position.set(Math.sin(a) * 11, h / 2, Math.cos(a) * 11); m.castShadow = m.receiveShadow = true; scene.add(m);
  }
}
const anchors = world?.anchors ?? {};
// Anchor-relative vectors: {anchor: 'square', offset: [x, y, z]} → world position.
const resolve = v => (v && !Array.isArray(v) && v.anchor) ? anchors[v.anchor].position.map((x, i) => x + (v.offset?.[i] ?? 0)) : v;
for (const s of shots) {
  if (s.anchor && !s.from) { const c = anchors[s.anchor].camera; s.from = {position: c.position, target: c.target, fov: c.fov}; s.move ??= 'push'; }
  for (const k of ['from', 'to']) if (s[k]) s[k] = {...s[k], position: resolve(s[k].position), target: resolve(s[k].target)};
}

// ---- Cast ----
// Legacy entries (no `style`) use the frozen legacy avatar + legacy samplers. `style: 'v2'` entries
// are v2 actors: `preset` names an entry of `castFile` (or the entry itself is the preset); `keys`
// are timed poses (cross-faded), `faces` timed faces, `origin`/`yaw` the mark, and `travel`
// {dir: [x, z], speed} moves the mark at constant speed (e.g. WALK_SPEED for 'walk').
const presets = spec.castFile ? (await (await fetch(new URL('../' + spec.castFile, import.meta.url))).json()).cast : {};
const cast = {};
const FACES_V3 = spec.faces === 'v3' || (spec.season === 1 && spec.faces !== 'v2');
const troupeData = Object.values(spec.cast ?? {}).some(c => c.troupe) ? await (await fetch(new URL('../' + (spec.troupeFile ?? 'cast/troupe.json'), import.meta.url))).json() : null;   // A4 troupe slots
if (Object.values(spec.cast ?? {}).some(c => c.troupe === 'HERO')) troupeData.troupe.HERO = (await (await fetch(new URL('../' + (spec.heroFile ?? 'cast/hero.json'), import.meta.url))).json()).HERO;   // format v4 hero slot
// format v4 lip flaps: per-frame mouth shapes from the voice envelope (scripts/v2/envelope.js; the voice file is only read)
const HERO_COLS = troupeData?.troupe?.HERO ? heroColours(troupeData.troupe.HERO) : null;   // format v4 1b: hero colours to keep clear
const NIGHT_EP = ['night', 'nightBright'].includes(spec.look) || (spec.shots ?? []).some(sh => ['night', 'nightBright'].includes(sh.look));
const flapShapes = spec.lipFlap ? (await (await fetch(new URL('../' + (spec.lipFlap.envelope ?? `stories/${spec.slug}/build/envelope.json`), import.meta.url))).json()).shapes : null;
// Marks (Session 5): `marks: [[t0, {at, offset, yaw, travel}], ...]` re-block an actor over the episode; the
// entry's own at/offset/yaw/travel is the mark before the first key.
const markOf = (c, t) => { const k = keyAt(c.marks, t); return k ? {...k[1], t0: k[0]} : {at: c.at, offset: c.offset, yaw: c.yaw, travel: c.travel, origin: c.origin, t0: 0}; };
for (const [name, c] of Object.entries(spec.cast ?? {})) {
  if (c.at) c.origin = resolve({anchor: c.at, offset: c.offset ?? [0, 0, 0]});
  if (c.style === 'dragon') { const d = buildDragon({scale: c.scale ?? 1, name, colors: c.colors ?? null, face: c.dragonFace ?? null, baby: !!c.baby, wingScale: c.wingScale ?? 1, rim: c.rim ?? null, spikes: c.spikes ?? 1, saddle: !!c.saddle}); scene.add(d.root); cast[name] = {a: d, c, dragon: true}; continue; }
  if (c.style === 'v2' || c.style === 'v5') { if (c.troupe === 'AFK') { c.keys ??= [[0, troupeData.AFK.pose ?? 'walk']]; c.faces ??= [[0, 'neutral']]; }
    const pre0 = c.troupe ? resolveTroupe(c, troupeData) : c.town ? townsperson(c.town) : c.preset ? {...presets[c.preset], ...(c.with ?? {})} : c;
    const pre1 = c.style === 'v5' ? {...pre0, body: 'v5', faceStyle: pre0.faceStyle ?? 'v4'} : pre0;   // format v4: Actor v5 + Faces v4
    const pre2 = HERO_COLS && c.troupe !== 'HERO' && pre1.outfit ? {...pre1, outfit: heroSafeOutfit(pre1.outfit, HERO_COLS, {minL: NIGHT_EP ? .32 : 0})} : pre1;   // v4 1b: nobody dresses like the hero
    const pre = FACES_V3 && !pre2.faceStyle ? {...pre2, faceStyle: 'v3'} : pre2;   // Faces v3: default for season 1 (or spec.faces 'v3')
    const a = buildActor(c.noTag ? {...pre, tag: null} : pre, name); scene.add(a.root); cast[name] = {a, c, v2: true}; }
  else { const a = createBaseAvatar({color: c.color ?? 0xf2c94c}); scene.add(a.root); cast[name] = {a, c}; }
}
if (Object.values(cast).some(x => x.v2)) await loadFont();
for (const s of shots) if (s.fit && s.fit.h === undefined && cast[s.fit.actor]) s.fit.h = 5.3 * cast[s.fit.actor].a.root.scale.y;   // A5 §F: actor height for `fit`
// A5 §E Decision 2: one narrow, soft spotlight per hero (troupe except AFK) for medium/close night shots, aimed from the
// camera side at the chest, shadow-casting (the actor screens the ground behind). Real lights stay ≤ 4 with the world's own.
const NIGHT = ['night', 'nightBright'];
const heroSpots = look?.v3 ? Object.entries(cast).filter(([, x]) => x.v2 && x.c.troupe && x.c.troupe !== 'AFK' && spec.heroSpots !== false).slice(0, 2).map(([name]) => {
  const l = new T.SpotLight('#fff0dc', 0, 16, .2, .55, 1.6); l.castShadow = false; l.visible = false; l.shadow.mapSize.set(512, 512); l.shadow.bias = -.002; l.name = 'heroSpot_' + name; scene.add(l, l.target); return {name, name0: name, l}; }) : [];
function aimHeroSpots(shot, camPos) {
  if (spec.heroSpotSubject && heroSpots.length) {   // opt-in (owner pass 2, check 3): the first spot follows the shot's subject, whoever it is
    const who = shot?.subject ?? shot?.fit?.actor; if (who && cast[who]?.v2) heroSpots[0].name = who; else if (heroSpots[0].name0) heroSpots[0].name = heroSpots[0].name0;
  }
  for (const {name, l} of heroSpots) {
    const subjOnly = spec.heroSpotSubject && heroSpots[0].l === l, on = (subjOnly ? !!(shot?.subject ?? shot?.fit?.actor) && heroSpots[0].name === (shot?.subject ?? shot?.fit?.actor) : NIGHT.includes(shot?.look ?? spec.look) && ['medium', 'close'].includes(shot?.size)) && cast[name].a.root.visible, m = markPos[name];   // heroSpotSubject: the spot lights the shot's subject in any size and look
    l.intensity = on ? (spec.heroSpotIntensity ?? 40) : 0; l.visible = !!(on && m); l.castShadow = l.visible; if (!on || !m) continue;   // off = no light and no shadow pass
    const H = 5.3 * cast[name].a.root.scale.y, chest = new T.Vector3(m[0], m[1] + .62 * H, m[2]), dir = new T.Vector3(camPos[0] - m[0], 0, camPos[2] - m[2]).normalize();
    l.position.copy(chest).addScaledVector(dir, 8).add(new T.Vector3(0, 2.2, 0)); l.target.position.copy(chest); l.target.updateMatrixWorld();
  }
}
// A4 night "actor lift" (opt-in spec.actorLift, v3 looks only): plastic avatars get a small self-light (emissive = their
// own colour / texture × k) so they stay the highest-contrast thing in a dark frame. Faces (MeshBasic) are untouched.
const usesNightBright = spec.look === 'nightBright' || (spec.shots ?? []).some(s => s.look === 'nightBright');
// A5: the lift follows each shot: full under night looks (or spec.actorLift everywhere when given), off in daylight shots
const liftMats = [];
if (look?.v3 && (spec.actorLift ?? (usesNightBright ? .5 : 0))) {   // A5 §E: on by default under nightBright
  const k = spec.actorLift ?? .5, seen = new Set();
  for (const {a, v2} of Object.values(cast)) if (v2) a.root.traverse(o => { if (!o.isMesh || seen.has(o.material) || o.material.isMeshBasicMaterial || !o.material.emissive) return; let m = o.material; seen.add(m);
    if (m.map) { m.emissiveMap = m.map; m.emissive.setRGB(k, k, k); } else if (m.vertexColors) { if (!o.geometry.attributes.color) return; const c = o.geometry.attributes.color, avg = [0, 0, 0]; for (let i = 0; i < c.count; i++) { avg[0] += c.getX(i); avg[1] += c.getY(i); avg[2] += c.getZ(i); } m = m.clone(); m.emissive.setRGB(...avg.map(v => v / c.count * k)); o.material = m; seen.add(m); }   // hair lifts by its own colour
    else m.emissive.copy(m.color).multiplyScalar(k);
    m.needsUpdate = true; liftMats.push([m, m.emissive.clone()]); });
}
// opt-in spec.subjectLift (owner pass 2, check 3): the shot's subject (a v2 actor) gets its own self-light on cloned materials,
// so it stands out from its surround; other actors and later shots keep the originals
let lifted = null; const liftClones = new Map();
function liftSubject(shot) {
  const k = spec.subjectLift, who = k ? (shot?.subject ?? shot?.fit?.actor) : null, want = who && cast[who]?.v2 ? who : null;
  if (lifted === want) return;
  if (lifted) cast[lifted].a.root.traverse(o => { const e = liftClones.get(o); if (e) o.material = e.orig; });
  lifted = want; if (!want) return;
  cast[want].a.root.traverse(o => { if (!o.isMesh || !o.material?.emissive || o.material.isMeshBasicMaterial) return; let e = liftClones.get(o);
    if (!e || e.orig !== o.material && e.lift !== o.material) { const m = o.material.clone(); let base = m.color.clone();
      if (m.map) { m.emissiveMap = m.map; base = new T.Color(1, 1, 1); }
      else if (m.vertexColors && o.geometry.attributes.color) { const cc = o.geometry.attributes.color, avg = [0, 0, 0]; for (let i = 0; i < cc.count; i++) { avg[0] += cc.getX(i); avg[1] += cc.getY(i); avg[2] += cc.getZ(i); } base = new T.Color(avg[0] / cc.count, avg[1] / cc.count, avg[2] / cc.count); }   // hair keeps its own colour (never white)
      m.emissive = base.multiplyScalar(k); e = {orig: o.material, lift: m}; liftClones.set(o, e); }
    o.material = e.lift; });
}
const applyLift = shot => { const f = spec.actorLift !== undefined ? 1 : ['night', 'nightBright'].includes(shot?.look ?? spec.look) ? 1 : 0; for (const [m, e] of liftMats) m.emissive.copy(e).multiplyScalar(f); };

const markPos = {};
// Where an actor's mark is at time t (pure: no posing). poseCast and A4 trails share it.
function markAt(c, t) {
  const m = markOf(c, t), o = m.at ? resolve({anchor: m.at, offset: m.offset ?? [0, 0, 0]}) : (m.origin ?? [0, 0, 0]), tr = m.travel, d = tr ? tr.speed * Math.max(0, t - m.t0 - (tr.delay ?? 0)) : 0;
  const dd = tr?.max !== undefined ? Math.min(d, tr.max) : d;
  const at = tr ? [o[0] + tr.dir[0] * dd, o[1], o[2] + tr.dir[1] * dd] : [...o];
  if (world?.groundY && m.at !== undefined) at[1] = world.groundY(at[0], at[2]) + (m.offset?.[1] ?? 0);   // feet on the terrain (A1)
  if (tr?.climb) at[1] += tr.climb * dd / Math.max(1e-6, tr.speed);
  return at;
}
// Faces v3 blink: no blink in a held close-up of ≤ 1 s (the shot at t)
const blinkOff = t => { const f = Math.round(t * FPS), sh = shots.findLast(s => f >= s.start); return !!sh && sh.size === 'close' && sh.frames / FPS <= 1 + 1e-9; };
const talkOf = (name, t) => { if (!flapShapes) return null; const f = Math.round(t * FPS), sh = shots.findLast(s => f >= s.start);
  return flapActive(sh, name, {narrator: spec.lipFlap.narrator ?? 'HERO'}) ? shapeAt(flapShapes, t) : null; };
function poseCast(t) {
  const out = {};
  for (const [name, {a, c, v2, dragon}] of Object.entries(cast)) {
    const m = markOf(c, t), yaw = (m.yaw ?? 0) * Math.PI / 180;
    if (v2 || dragon) {
      const at = markAt(c, t);
      markPos[name] = [...at];
      if (dragon) driveDragon(a, t, {keys: c.keys ?? [[0, 'perch']], origin: {position: at, yaw}});
      else driveActor(a, t, {keys: c.keys ?? [[0, c.action ?? 'idle']], faces: c.faces, ambient: !!c.ambient,
        origin: {position: at, yaw}, tags: c.tags, fps: FPS, tools: c.tools, toolsLeft: c.toolsLeft, stat: c.stat, bubble: c.bubble, visible: c.visible, kit: c.kit, blinkSuppress: blinkOff(t), talk: talkOf(name, t)});
      if (dragon && c.visible) a.root.visible = valueAt(c.visible, t, true);
    } else {
      const s = sampleAction(c.action ?? 'idle', t, c.action === 'walk' ? {gait: c.gait ?? 'readable'} : {});
      applyActionSample(a, s, {position: c.origin ?? [0, 0, 0], yaw});
    }
    // follow cameras ride the actor's mark (path), not the posed root: strain shakes and walk bobs never jolt the camera
    out[name] = (v2 || dragon) ? markPos[name] : a.root.position.toArray();
  }
  return out;
}

// ---- Effects (§5.3): targets are cast names ("knight1", "knight1.tool") or world object names; points
// are [x,y,z], {anchor, offset} or {actor, offset} (follows the actor). ----
const resolveTarget = tg => {
  if (typeof tg !== 'string') return null;
  const [who, part] = tg.split('.'), a = cast[who]?.a;
  if (a && part?.startsWith('tool:')) return toolGroup(a, part.slice(5), 'right');   // "nobody.tool:hammer" (cached, even before it is held)
  if (a) return part ? (a[part] ?? a.attachments?.[part] ?? a.parts?.[part] ?? a.pivots?.[part]) : a.root;
  return scene.getObjectByName(tg);
};
const resolvePoint = (p, t) => {
  if (Array.isArray(p)) return p;
  if (p?.actor && p.part) { const o = cast[p.actor].a[p.part]; o.updateWorldMatrix(true, false); const v = new T.Vector3(...(p.offset ?? [0, 0, 0])); o.localToWorld(v); return v.toArray(); }
  if (p?.actor) { const r = cast[p.actor].a.root.position; return [r.x + (p.offset?.[0] ?? 0), r.y + (p.offset?.[1] ?? 0), r.z + (p.offset?.[2] ?? 0)]; }
  return resolve({anchor: p.anchor, offset: p.offset ?? [0, 0, 0]});
};
const effects = createEffects([...(spec.effects ?? []), ...revealEffects], {scene, renderer, resolveTarget, resolvePoint,
  shotAt: tt => Math.max(0, shots.findLastIndex(s => Math.max(0, Math.round(tt * FPS)) >= s.start)),
  actorOf: name => { const a = cast[name]?.a; if (!a) throw Error('effect: unknown actor ' + name); return a; }, toolGroup: (a, name) => toolGroup(a, name, 'right'),
  actorAt: (name, tt) => { const c = cast[name]?.c; if (!c) throw Error('trail: unknown actor ' + name); return markAt(c, tt); }, groundY: world?.groundY});

// A4: instanced crowds (spec.crowds) and rule UI attached to any pivot/object (spec.ui).
// Season 1 hero readability (engine/heroread.js): crowds never wear a shot subject's main outfit colour; a soft rim light
// from behind the current subject in wides and mediums (one SpotLight, no shadow); "Nobody" and older specs: off.
const HERO_READ = spec.season === 1 || spec.heroRead === true;
const subjectMains = HERO_READ ? [...new Set(shots.map(s => s.subject ?? s.fit?.actor).filter(n => cast[n]?.a.preset?.outfit?.main).map(n => cast[n].a.preset.outfit.main))] : [];
const crowds = createCrowds(scene, spec.crowds ?? [], {groundY: world?.groundY ?? (() => 0), resolveCentre: c => Array.isArray(c) ? c : (p => [p[0], p[2]])(resolve(c)), avoidColours: HERO_COLS ? [...subjectMains, ...HERO_COLS] : subjectMains, faces: FACES_V3 ? 'v3' : 'v2'});
const rim = HERO_READ ? (() => { const l = new T.SpotLight(RIM.color, 0, RIM.distance, RIM.angle, RIM.penumbra, RIM.decay); l.castShadow = false; l.visible = false; l.name = 'subjectRim'; scene.add(l, l.target); return l; })() : null;
function aimRim(shot, camPos) {
  if (!rim) return; const n = shot?.subject ?? shot?.fit?.actor, m = n && markPos[n], r = m && cast[n].a.root.visible ? rimFor(shot.size, m, camPos, 5.3 * cast[n].a.root.scale.y) : null;
  rim.visible = !!r; rim.intensity = r ? r.intensity * (spec.rimScale ?? 1) : 0; if (!r) return;
  rim.position.set(...r.position); rim.target.position.set(...r.target); rim.target.updateMatrixWorld();
}
const ui = createRuleUI(spec.ui ?? [], {scene, resolveTarget, fps: FPS});
const updateExtras = (t, ctx = {}) => { crowds.update(t, ctx); ui.update(t); };   // ctx {camPos, size}: crowd promotion (A5 B)

// Triangles of visible meshes whose bounds touch the camera frustum (the brief's §5.4 budget). The
// renderer's own counter also includes the shadow pass, so both are reported.
const frustum = new T.Frustum(), pv = new T.Matrix4(), sphere = new T.Sphere();
// Debug (A4 budget work): frustum triangles per top-level object name.
function breakdown() {
  pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv); const out = {};
  scene.traverseVisible(o => { if (!o.isMesh) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); if (o.isInstancedMesh && !o.boundingSphere) o.computeBoundingSphere(); sphere.copy(o.isInstancedMesh && o.frustumCulled ? o.boundingSphere : g.boundingSphere).applyMatrix4(o.matrixWorld); if (o.frustumCulled && !frustum.intersectsSphere(sphere)) return;
    let top = o; while (top.parent && top.parent !== scene) top = top.parent; const k = (top.name || o.name || o.type).split('_')[0]; out[k] = (out[k] ?? 0) + (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); });
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1]));
}
function frustumTriangles() {
  pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
  let n = 0;
  scene.traverseVisible(o => {
    if (!o.isMesh) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    if (o.isInstancedMesh && !o.boundingSphere) o.computeBoundingSphere();
    sphere.copy(o.isInstancedMesh && o.frustumCulled ? o.boundingSphere : g.boundingSphere).applyMatrix4(o.matrixWorld); if (o.frustumCulled && !frustum.intersectsSphere(sphere)) return;   // A4: instanced meshes cull by their instances' bounds, as the renderer does
    n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
  });
  return n;
}

// Stable shadows (A1): the sun's shadow box is fitted ONCE per shot — centre = midpoint of the shot's target
// path, radius = shadowRadius + half the path length — and snapped to whole shadow texels in look.frameFixed.
const shadowFit = new Map();
function shotShadow(shot) {
  if (shadowFit.has(shot.id)) return shadowFit.get(shot.id);
  const pts = [0, .25, .5, .75, 1].map(u => { const tt = (shot.start + u * (shot.frames - 1)) / FPS; return sampleCamera({...shot, fps: FPS, openHit: false}, u * (shot.frames - 1) / FPS, poseCast(tt)).target; });
  const lo = [0, 1, 2].map(i => Math.min(...pts.map(p => p[i]))), hi = [0, 1, 2].map(i => Math.max(...pts.map(p => p[i])));
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(...pts[i].map((v, k) => v - pts[i - 1][k]));
  const fit = {centre: new T.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2), radius: (shot.shadowRadius ?? 34) + len / 2};
  shadowFit.set(shot.id, fit); return fit;
}

// World story state (Session 5): spec.worldState = {name: [[t, value], [t, value, 'ramp']...]} → world.setState.
function applyWorldState(shot, t) {
  if (!world) return;
  const ws = spec.worldState ?? {};
  if (!ws.cracks) world.setCracks?.(shot?.stoneCracks ?? spec.stoneCracks ?? 1);   // the clue grows (script lines 14–15)
  if (world.setState) for (const [k, keys] of Object.entries(ws)) world.setState(k, valueAt(keys, t));
}

let lastSize = '';
// nudge (world units, along the camera's right+up+back diagonal): the stability test renders each view twice,
// 4 mm apart. A purely sideways move hides ground-plane z-fighting; changing the view angle exposes it.
export function renderFrame(n, width = 720, height = 1280, nudge = 0) {
  if (!Number.isInteger(n) || n < 0 || n >= FRAMES) throw Error(`frame out of range: ${n}`);
  const t0 = performance.now();
  if (lastSize !== `${width}x${height}`) { renderer.setPixelRatio(1); renderer.setSize(width, height, false); lastSize = `${width}x${height}`; }
  const shot = shots.findLast(s => n >= s.start), t = n / FPS;
  const actors = poseCast(t);
  const c = sampleCamera({...shot, fps: FPS}, (n - shot.start) / FPS, actors);
  world?.update(t); applyWorldState(shot, t); updateExtras(t, {camPos: c.position, size: shot.size}); aimHeroSpots(shot, c.position); aimRim(shot, c.position); applyLift(shot); liftSubject(shot);
  const fx = effects.apply(t, camera);   // poses effect targets; returns the shake offset and any timeOfDay blend
  const pos = c.position.map((v, i) => v + fx.camOffset[i]), tgt = c.target.map((v, i) => v + fx.camOffset[i] * .6);
  camera.fov = c.fov; camera.aspect = width / height; camera.position.fromArray(pos);
  camera.up.set(0, 1, 0); camera.lookAt(...tgt); camera.rotateZ(c.roll); camera.updateProjectionMatrix();
  if (nudge) { const k = nudge / Math.sqrt(3); camera.translateX(k); camera.translateY(k); camera.translateZ(k); }
  if (look) { fx.look ? look.apply(...fx.look) : look.apply(shot.look ?? spec.look ?? 'day'); const sf = shotShadow(shot); poseCast(t); look.frameFixed(sf.centre, sf.radius, camera.position); look.update(t); }
  scene.updateMatrixWorld(true); effects.apply(t, camera); fitTags(scene, camera, {maxFrac: shot.tagMaxFrac ?? .06});
  if (spec.readableUi ?? !!look?.v3) { scene.updateMatrixWorld(true); enforceReadable(scene, camera, {focus: shot.focusUi ?? []}); }   // A5 §C: min text size + safe area (v3 worlds; "Nobody" untouched)
  renderer.info.autoReset = false; renderer.info.reset();   // A4: overlay passes (weather, cards) must not reset the scene counts
  renderer.render(scene, camera); effects.overlay(t, camera, width / height);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));   // forces the GPU work to finish, so ms is real
  if (gl.isContextLost()) throw Error('WebGL context lost');
  return {frame: n, shot: shot.id, size: shot.size, triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}

// Bench / stills: render a world anchor's establishing camera at time t (no shot needed).
export function renderAnchor(name, t, width = 720, height = 1280, lookName = 'day') {
  const a = anchors[name]; if (!a?.camera) throw Error('no camera on anchor ' + name);
  return {anchor: name, ...renderCamera(a.camera, t, width, height, lookName)};
}
export const renderAnchorNudged = (name, t, width, height, nudge) => renderCamera(anchors[name].camera, t, width, height, 'day', nudge);
// Any camera {position, target, fov, up?} at time t (lookdev, layout maps, bench).
export function renderCamera(cam, t = 0, width = 720, height = 1280, lookName = 'day', nudge = 0) {
  const t0 = performance.now(); renderer.setPixelRatio(1); renderer.setSize(width, height, false); lastSize = '';
  poseCast(t); camera.fov = cam.fov ?? 45; camera.aspect = width / height; camera.position.set(...cam.position); camera.up.set(...(cam.up ?? [0, 1, 0])); camera.lookAt(...cam.target); camera.updateProjectionMatrix();
  if (look) { look.apply(lookName); look.frame(new T.Vector3(...cam.target), camera.position.clone(), cam.shadowRadius ?? 34); look.update(t); }
  if (nudge) { const k = nudge / Math.sqrt(3); camera.translateX(k); camera.translateY(k); camera.translateZ(k); }
  world?.update(t); applyWorldState(null, t); updateExtras(t); scene.updateMatrixWorld(true); fitTags(scene, camera); renderer.render(scene, camera);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}

// Plan inspection (scripts/v2/plan.js): camera and projected heads at frame n, without rendering.
const headOf = ({a, v2, dragon}) => { const v = new T.Vector3(); if (dragon) { const w = new T.Vector3(); a.eyes[0].getWorldPosition(v); a.eyes[1].getWorldPosition(w); v.add(w).multiplyScalar(.5); } else if (v2) { a.pivots.head.getWorldPosition(v); v.y += .6 * a.root.scale.y; } else v.copy(a.root.position).add(new T.Vector3(0, 4.6, 0)); return v; };
export function inspectFrame(n, width = 540, height = 960) {
  const shot = shots.findLast(s => n >= s.start), t = n / FPS, actors = poseCast(t);
  const c = sampleCamera({...shot, fps: FPS}, (n - shot.start) / FPS, actors);
  applyWorldState(shot, t); updateExtras(t); effects.apply(t, camera);
  camera.fov = c.fov; camera.aspect = width / height; camera.position.fromArray(c.position); camera.up.set(0, 1, 0); camera.lookAt(...c.target); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const heads = {};
  for (const [name, e] of Object.entries(cast)) {
    if (!e.a.root.visible) continue;
    const h = headOf(e), dist = h.distanceTo(camera.position), p = h.clone().project(camera), r = e.a.root.position;
    heads[name] = {x: (p.x + 1) / 2, y: (1 - p.y) / 2, inFront: p.z < 1, dist: +dist.toFixed(2), rootDist: +camera.position.distanceTo(r).toFixed(2)};
  }
  const cards = effects.cards(t, camera, width / height).map(k => ({cls: k.cls, kind: k.kind, rect: k.rect, landed: k.state.landed, fly: k.state.fly}));   // A3
  return {frame: n, shot: shot.id, camera: {position: c.position, target: c.target, fov: c.fov}, heads, cards};
}
// A5 gates: after renderFrame(n), projected boxes (frame fractions, y down) of visible v2 actors' meshes (no tags/sprites)
// and their framing spans (feet, shoulders at 0.6 H, top at 1.02 H, projected at the actor's mark).
export function measureFrame() {
  const out = {}; camera.updateMatrixWorld(true); const v = new T.Vector3(), b = new T.Box3(), mb = new T.Box3();
  for (const [name, {a, c, v2}] of Object.entries(cast)) {
    if (!v2 || !a.root.visible) continue; b.makeEmpty();
    a.root.traverseVisible(o => { if (!o.isMesh || o.isSprite) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); mb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); b.union(mb); });
    if (b.isEmpty()) continue; let x0 = 1, x1 = 0, y0 = 1, y1 = 0, front = false;
    for (let i = 0; i < 8; i++) { v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); if (v.z < 1) front = true; const x = (v.x + 1) / 2, y = (1 - v.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const H = 5.3 * a.root.scale.y, m = markPos[name] ?? a.root.position.toArray(), py = h => (1 - v.set(m[0], m[1] + h, m[2]).project(camera).y) / 2;
    const hd = a.parts?.head, face = hd ? projBox(new T.Box3().setFromObject(hd)) : null;   // A4 §E: the face (head block) on screen
    if (face) { const fw = new T.Vector3(0, 0, 1).transformDirection(hd.matrixWorld), hp = hd.getWorldPosition(new T.Vector3()); face.toward = fw.dot(camera.position.clone().sub(hp).normalize()) > .2; }
    out[name] = {front, box: {x0, x1, y0, y1}, feet: py(0), shoulder: py(.6 * H), top: py(1.02 * H), troupe: c.troupe ?? null, face, opacity: a.preset?.opacity ?? 1};
  }
  return out;
}
// Projected box of a world Box3 (frame fractions, y down) + height fraction; front = any corner in front of the camera.
function projBox(b) {
  const v = new T.Vector3(); let x0 = 1, x1 = 0, y0 = 1, y1 = 0, front = false, all = true;
  for (let i = 0; i < 8; i++) { v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); if (v.z < 1) front = true; else all = false; const x = (v.x + 1) / 2, y = (1 - v.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return {x0: +x0.toFixed(4), x1: +x1.toFixed(4), y0: +y0.toFixed(4), y1: +y1.toFixed(4), h: +(y1 - y0).toFixed(4), front, allFront: all};
}
// Footprints for the overlap check: visible v2 cast actors and crowd members, [x, z, radius] (radius ≈ half the shoulder span).
function placesNow() {
  const out = []; for (const [name, {a, v2}] of Object.entries(cast)) if (v2 && a.root.visible && markPos[name]) out.push({name, x: markPos[name][0], z: markPos[name][2], y: markPos[name][1], r: .95 * a.root.scale.x});
  for (const m of crowds.places?.() ?? []) out.push(m);
  return out;
}
// A4 §E season gates (plan.js): render frame n, then report actors (measureFrame + face), named objects' projected boxes
// (scene objects by name, or cast actors) and the rule UI as it was left on screen (v3 worlds).
export function seasonMeasure(n, objects = [], width = 360, height = 640) {
  renderFrame(n, width, height); camera.updateMatrixWorld(true); scene.updateMatrixWorld(true);
  const shot = shots.findLast(s => n >= s.start), obj = {};
  for (const name of objects) { const o = cast[name]?.a.root ?? scene.getObjectByName(name); obj[name] = o ? projBox(new T.Box3().setFromObject(o)) : null;
    if (o && obj[name]) { const wp = o.getWorldPosition(new T.Vector3()), fd = o.getWorldDirection(new T.Vector3()); let vis = o.visible; for (let p = o.parent; p && vis; p = p.parent) vis = p.visible; obj[name].facing = fd.dot(camera.position.clone().sub(wp)) > 0; obj[name].visible = vis; } }   // owner rule 2: a clock face / board seen from behind (or hidden) does not count
  // Season 1 eggs (parts/eggs.js groups carry userData.egg): on-screen height of the shell alone (h) and with its rarity beam (hb)
  const eggs = []; scene.traverseVisible(o => { if (!o.userData?.egg) return; const body = o.getObjectByName('eggBody'); if (!body) return;
    const b = projBox(new T.Box3().setFromObject(body)), bb = projBox(new T.Box3().setFromObject(o)); if (!b.allFront) return; eggs.push({kind: o.userData.egg, box: b, h: b.h, hb: bb.allFront ? bb.h : b.h, front: b.front, dist: +body.getWorldPosition(new T.Vector3()).distanceTo(camera.position).toFixed(2)}); });
  const crowdBoxes = (crowds.places?.() ?? []).map(m => { const sc = m.r / .95, b = projBox(new T.Box3(new T.Vector3(m.x - m.r, m.y, m.z - m.r), new T.Vector3(m.x + m.r, m.y + 5.3 * sc, m.z + m.r)));
    return b.allFront ? {x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, dist: +Math.hypot(m.x - camera.position.x, m.y + 2.6 * sc - camera.position.y, m.z - camera.position.z).toFixed(2)} : null; }).filter(Boolean);   // owner rule 4: foreground crowd cover
  const dist = Object.fromEntries(Object.entries(cast).filter(([n, c]) => c.v2 && markPos[n]).map(([n]) => [n, +Math.hypot(markPos[n][0] - camera.position.x, markPos[n][1] + 2.6 - camera.position.y, markPos[n][2] - camera.position.z).toFixed(2)]));
  return {frame: n, actors: measureFrame(), objects: obj, eggs, places: placesNow(), crowdBoxes, dist, ui: (spec.readableUi ?? !!look?.v3) ? uiMeasure(scene, camera, {focus: shot.focusUi ?? []}) : [], v3: !!look?.v3};
}
// A5 Decision 2: silhouette mask of one actor (actor-only pass, same camera, after renderFrame): Uint8 array, row 0 = top.
const maskMat = new T.MeshBasicMaterial({color: '#ffffff'});
export function actorMask(name, w, h) {
  const keep = cast[name].a.root, vis = []; scene.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible) { let p = o, inActor = false; while (p) { if (p === keep) { inActor = true; break; } p = p.parent; } if (!inActor || o.isSprite) { vis.push(o); o.visible = false; } } });
  const bg = scene.background, fog = scene.fog; scene.background = new T.Color('#000000'); scene.fog = null; scene.overrideMaterial = maskMat;
  renderer.render(scene, camera);
  const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; for (const o of vis) o.visible = true;
  const m = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = px[((h - 1 - y) * w + x) * 4] > 127 ? 1 : 0;
  return m;
}
// Owner readability checks (engine/readcheck.js, scripts/v2/read.js): id-mask renders of the frame left by renderFrame.
// maskPass(keep, w, h, far): render only meshes for which keep(o) is true, white on black, fog off; far clips the camera.
function maskPass(keep, w, h, far = null) {
  const hidden = []; scene.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible && !keep(o)) { hidden.push(o); o.visible = false; } });
  const bg = scene.background, fog = scene.fog, f0 = camera.far; scene.background = new T.Color('#000000'); scene.fog = null; scene.overrideMaterial = maskMat;
  if (far !== null) { camera.far = Math.max(camera.near * 2, far); camera.updateProjectionMatrix(); }
  renderer.render(scene, camera);
  const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; for (const o of hidden) o.visible = true;
  if (far !== null) { camera.far = f0; camera.updateProjectionMatrix(); }
  const m = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = px[((h - 1 - y) * w + x) * 4] > 127 ? 1 : 0;
  return m;
}
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const visibleChain = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
function frameLuma(w, h) {
  const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const L = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((h - 1 - y) * w + x) * 4; L[y * w + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; }
  return L;
}
export function lumaAt(n, w = 135, h = 240) { renderFrame(n, w, h); return Array.from(frameLuma(w, h)); }
export function readMeasure(n, {subject = null, prop = null, w = 390, h = 693} = {}) {
  renderFrame(n, w, h); camera.updateMatrixWorld(true); scene.updateMatrixWorld(true);
  const luma = frameLuma(w, h), cam = camera.position.clone(), out = {frame: n};
  const c = subject ? cast[subject] : null, root = c ? c.a.root : (subject || prop) ? scene.getObjectByName(subject ?? prop) : null;
  if (!root || !visibleChain(root)) { out.missing = subject ?? prop; return out; }
  const meshesOf = r => { const l = []; r.traverse(o => { if ((o.isMesh) && o.visible && visibleChain(o) && !(o.material?.transparent && o.material.opacity < .5) && !o.isSprite) l.push(o); }); return l; };
  const boxOf = r => { const b = new T.Box3(); for (const o of meshesOf(r)) b.expandByObject(o); return b; };
  const sb = boxOf(root); out.box = projBox(sb);
  const subjMask = maskPass(o => under(o, root) && !(o.material?.transparent && o.material.opacity < .5), w, h);
  const lm = maskStats(luma, subjMask, w, h, {r0: 6 * w / 390, r1: 14 * w / 390}); out.subj = lm.actor; out.ring = lm.ring; out.px = lm.actorPx;   // the A5 night-actor rule
  // head (v2 actor: head pivot subtree; dragon: head pivot)
  const headRoot = c?.v2 ? c.a.pivots.head : c?.dragon ? c.a.head : null;
  if (headRoot) {
    const hm = []; headRoot.traverse(o => { if (o.isMesh && visibleChain(o) && (o.geometry?.type === 'LatheGeometry' || c.dragon)) hm.push(o); });   // the head itself (not hair, hats or a hood)
    const hb = new T.Box3(); for (const o of hm) hb.expandByObject(o); if (hb.isEmpty()) hb.copy(boxOf(headRoot)); const hc = hb.getCenter(new T.Vector3()), fwd = new T.Vector3(0, 0, 1).transformDirection(headRoot.matrixWorld), toCam = cam.clone().sub(hc).normalize();
    out.head = {box: projBox(hb), front: projBox(hb).allFront, angle: THREE_DEG * Math.acos(Math.max(-1, Math.min(1, fwd.dot(toCam))))};
    // own body parts in front of the head (hands, a held egg, a hatchling held up)
    const arms = c.v2 ? [c.a.pivots.leftShoulder, c.a.pivots.rightShoulder].filter(Boolean) : [];   // arms and anything they hold (tools ride the hands)
    const hands = maskPass(o => arms.some(r => under(o, r)) && !(o.material?.transparent), w, h, hb.distanceToPoint(cam));
    out.handsOnFace = rectFrac(hands, out.head.box, w, h);
  }
  // objects nearer than the subject (ground-level meshes and see-through effects excluded)
  // in front = clearly in the foreground (nearer than 0.6 × the subject's distance); flat, wide meshes (terrain, roads, plaza) are ground, not occluders
  const far = sb.distanceToPoint(cam), flat = o => { const b = new T.Box3().setFromObject(o), sz = b.getSize(new T.Vector3()); return sz.y < .35 * Math.max(sz.x, sz.z); };
  const solid = o => !(under(o, root) || o.isSprite || o.isPoints || o.isLine || o.material?.transparent) && !flat(o);
  const occ = maskPass(solid, w, h, .6 * far);
  let k = 0; for (const v of occ) k += v; out.frontFrac = k / (w * h);
  if (out.head) { const hb2 = new T.Box3(); headRoot.traverse(o => { if (o.isMesh && (o.geometry?.type === 'LatheGeometry' || c.dragon)) hb2.expandByObject(o); });
    const occF = maskPass(solid, w, h, hb2.isEmpty() ? far : hb2.distanceToPoint(cam)); out.faceCover = Math.max(rectFrac(occF, out.head.box, w, h), out.handsOnFace ?? 0); } else out.faceCover = 0;
  // same scale: Kit's whole body and whole buildings in frame
  const kit = cast.kit;
  if (kit && visibleChain(kit.a.root)) { const kb = projBox(boxOf(kit.a.root)); if (kb.allFront && insideAll(kb)) {
    const kd = new T.Box3().setFromObject(kit.a.root).distanceToPoint(cam);   // buildings at a depth comparable to Kit's (≤ 2 × her distance): far ones shrink by perspective
    const blds = []; scene.traverse(o => { if (/^(base_\d+_|clockTower$|townHall$)/.test(o.name) && visibleChain(o)) { const B = new T.Box3().setFromObject(o), pb = projBox(B); if (pb.allFront && insideAll(pb) && B.distanceToPoint(cam) <= 2 * kd) blds.push({name: o.name, h: pb.h, worldH: B.max.y - B.min.y}); } });
    const kw = new T.Box3().setFromObject(kit.a.root); out.scale = {kitH: kb.h, kitWorldH: kw.max.y - kw.min.y, blds}; } }
  // the plain egg's shading (held tool) on this frame
  if (kit) { let egg = null; kit.a.root.traverse(o => { if (o.name === 'eggBody' && visibleChain(o) && o.parent?.userData?.egg === 'plain') egg = o; });
    if (egg) { const eb = projBox(new T.Box3().setFromObject(egg)); if (eb.allFront && eb.h > .06) { const em = maskPass(o => o === egg, w, h); let n = 0; for (const v of em) n += v; if (n > 40) out.eggRange = maskRowRange(luma, em, w, h); } } }
  return out;
}
const THREE_DEG = 180 / Math.PI;
const insideAll = b => b.x0 >= 0 && b.x1 <= 1 && b.y0 >= 0 && b.y1 <= 1;
function rectFrac(m, b, w, h) { const x0 = Math.max(0, Math.floor(b.x0 * w)), x1 = Math.min(w, Math.ceil(b.x1 * w)), y0 = Math.max(0, Math.floor(b.y0 * h)), y1 = Math.min(h, Math.ceil(b.y1 * h)); let k = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { n++; k += m[y * w + x]; } return n ? k / n : 0; }
function maskRowRange(L, m, w, h) { const rows = []; for (let y = 0; y < h; y++) { let s = 0, n = 0; for (let x = 0; x < w; x++) if (m[y * w + x]) { s += L[y * w + x]; n++; } if (n >= 3) rows.push(s / n); } return rows.length > 2 ? Math.max(...rows) - Math.min(...rows) : 0; }
function colRange(L, b, w, h) { const x0 = Math.floor((b.x0 + (b.x1 - b.x0) * .3) * w), x1 = Math.ceil((b.x0 + (b.x1 - b.x0) * .7) * w), y0 = Math.max(0, Math.floor(b.y0 * h)), y1 = Math.min(h, Math.ceil(b.y1 * h)); const rows = [];
  for (let y = y0; y < y1; y++) { let s = 0, n = 0; for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) { s += L[y * w + x]; n++; } if (n) rows.push(s / n); } return rows.length ? Math.max(...rows) - Math.min(...rows) : 0; }
export function shotSpeed(i) { const s = shots[i]; return maxTargetSpeed({...s, fps: FPS, openHit: false}, tt => poseCast(s.start / FPS + tt), FPS); }

window.__episode = {debug: {scene, renderer}, bake: BAKE, breakdown, measureFrame, seasonMeasure, actorMask, readMeasure, lumaAt, inspectFrame, shotSpeed, END: FRAMES / FPS, anchors: Object.fromEntries(Object.entries(anchors).filter(([, a]) => a.camera).map(([k]) => [k, true])), renderAnchor, renderAnchorNudged, renderCamera, FPS, FRAMES, shots: shots.map(({id, start, frames, size, move, loc, subject, see, openHit, at, why, captionY, fit, spectacle, look: lk}) => ({id, start, frames, size, move, loc, subject, see, openHit: !!openHit, at, why, captionY, fit, spectacle: !!spectacle, look: lk})), renderFrame};
