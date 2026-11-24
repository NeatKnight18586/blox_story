// engine/episode.js — story-agnostic v2 renderer (docs/V2_BRIEF.md §5.1).
// Everything arrives as data (episode.json); renderFrame(n) is a pure function of n: no clock, no
// requestAnimationFrame, no unseeded randomness. Session 1: one legacy avatar on a ground plate;
// cast, worlds (world.js), faces, effects and overlays plug in from later sessions.
import * as T from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction, applyActionSample} from '../avatar/actions.js';
import {sampleCamera, maxTargetSpeed} from './camera.js';
import {twosTime} from './r6.js';   // R6 rig / twos (opt-in)
import {layoutShots, totalFrames, valueAt, keyAt} from './timeline.js';
import {buildDragon, driveDragon} from '../avatar-style/dragon.js';
import {buildDog, driveDog} from '../avatar-style/dog.js';
import {maskStats} from './lumagate.js';
import {expandClassReveal, applyPatch} from './classes.js';
import {buildActor, driveActor, townsperson, toolGroup} from './actors.js';
import {resolveTroupe} from './troupe.js';
import {flapActive, shapeAt} from './lipflap.js';
import {motionFrame, cascadeOn} from './motion5.js';
import {cascadeFrac, localContrast, actorPool} from './look6.js';
import {overshootEase, breathe, springLag, camNoise, blurOffsets} from './motion5b.js';
import * as L5B from './look5b.js';
import {createFill} from './fill.js';
import {heroColours, heroSafeOutfit, outfitRegions} from '../avatar-style/body5.js';
import {hair4Material} from '../avatar-style/hair.js';
import {loadFont, fitTags} from './overhead.js';
import {createLook, createLookV3, sunDir} from './look.js';
import {createEffects} from './effects.js';
import {groundedSky} from '../parts/location.js';
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
import {lodPick, keyPreset} from './lod.js';
import {clearScreen} from './clear6.js';

const q = new URLSearchParams(location.search);
const specUrl = q.get('spec') ? new URL('../' + q.get('spec'), import.meta.url) : new URL(`../stories/${q.get('story')}/episode.json`, import.meta.url);
const spec = stripLabels(await (await fetch(specUrl)).json());   // owner rule §2c: Season 1 (or labels: false) draws no labels
// tuft 1B (opt-in): spec `post: 'cine'` = the Look Pack post pipeline (engine/cinelook.js; spec.look stays the look preset); spec `camera: 'cine'` = engine/cine.js
const CINE_LOOK = spec.post === 'cine', CINE_CAM = spec.camera === 'cine';
const CINE = CINE_CAM || CINE_LOOK ? await import('./cine.js') : null;
const FPS = spec.fps ?? 30;

// Shots on the frame timeline: each shot owns [start, start + frames) (timeline.js: `at` cut times or `frames`).
// P4 moods (opt-in spec.moods, format 6): a shot's `mood` fills move / fov defaults here; its light is applied per frame as shared uniforms
// (renderer exposure, a saturation / temperature / haze term injected before the colour-space step of every material that has one: no re-bake, no extra pass).
const M6 = spec.moods && spec.format === 6 ? await import('./mood6.js') : null;
const MOODU = {uMoodSat: {value: 1}, uMoodTint: {value: new T.Vector3(1, 1, 1)}, uMoodHaze: {value: 0}, uMoodBloom: {value: 0}, uMoodVig: {value: 0}, uMoodRes: {value: new T.Vector2(1, 1)}};
if (M6) {
  const inject = sh => { if (!sh.fragmentShader.includes('#include <tonemapping_fragment>')) return; Object.assign(sh.uniforms, MOODU);
    sh.fragmentShader = 'uniform float uMoodSat; uniform vec3 uMoodTint; uniform float uMoodHaze; uniform float uMoodBloom; uniform float uMoodVig; uniform vec2 uMoodRes;\n' + sh.fragmentShader.replace('#include <tonemapping_fragment>', '#include <tonemapping_fragment>\n{ vec3 mc = gl_FragColor.rgb; float ml = dot(mc, vec3(.2126, .7152, .0722)); mc = mix(vec3(ml), mc, uMoodSat) * uMoodTint; mc = mc + uMoodHaze * .06 * (1. - mc); mc += uMoodBloom * smoothstep(.55, 1., ml) * mc * .5; vec2 mv = gl_FragCoord.xy / uMoodRes - .5; mc *= 1. - uMoodVig * clamp(dot(mv, mv) * 2.4, 0., 1.); gl_FragColor.rgb = mc; }'); };   // P5b: key bloom (highlight lift) and vignette, both 0 unless the shot's mood light sets them
  Object.defineProperty(T.Material.prototype, 'onBeforeCompile', {configurable: true, get() { return this._mood6 ?? ((sh) => inject(sh)); }, set(fn) { this._mood6 = (sh, r) => { fn?.call(this, sh, r); inject(sh); }; }});
}
const shots = M6 ? layoutShots(spec).map(M6.resolveMood) : layoutShots(spec);
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
if (CINE_LOOK) renderer.shadowMap.enabled = false;   // tuft 1B: no live shadow maps on post 'cine' (baked light + contact blobs)
document.body.appendChild(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(45, 9 / 16, .3, 900);   // near 0.3 (A1): more depth precision for the ground layers
let world = null, look = null, BAKE = null, GROUNDFIX = null, WMOD = null;   // WMOD: the world module (Touch Grass E1 opt-in spec.decorate hooks)
// Toy House final fix (owner P4, opt-in spec.groundFix = {sep, aniso, bias, normalBias}): flat ground-level meshes (≤ 1.2 high,
// thinner than 5 % of their span) whose top faces lie within `sep` of another overlapping one are lifted in `sep` steps and get
// polygonOffset (the higher, the stronger); every ground texture gets mipmaps + anisotropy `aniso`; the sun shadow bias is tuned.
function groundFix(root, lk, {sep = .02, aniso = 8, bias = -.0008, normalBias = .06} = {}) {
  root.updateMatrixWorld(true); const flat = [], bb = new T.Box3(), sz = new T.Vector3();
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.geometry || o.userData.live) return; bb.setFromObject(o); bb.getSize(sz); if (bb.max.y > 1.2 || sz.y > .05 * Math.max(sz.x, sz.z) || Math.max(sz.x, sz.z) < .5) return; flat.push({o, b: bb.clone(), top: bb.max.y}); });
  flat.sort((a, b) => a.top - b.top); let pairs = 0, lifted = 0;
  for (let i = 0; i < flat.length; i++) { const A = flat[i]; let k = 0;
    for (let j = 0; j < i; j++) { const Bf = flat[j]; if (Math.abs(A.top - Bf.top) >= sep - 1e-4) continue; if (A.b.max.x <= Bf.b.min.x || A.b.min.x >= Bf.b.max.x || A.b.max.z <= Bf.b.min.z || A.b.min.z >= Bf.b.max.z) continue; pairs++; k = Math.max(k, 1); }
    if (k) { const d = Math.max(0, Math.max(...flat.slice(0, i).filter(Bf => Math.abs(A.top - Bf.top) < sep).map(Bf => Bf.top)) + sep - A.top); A.o.position.y += d; A.top += d; A.b.min.y += d; A.b.max.y += d; lifted++;
      A.o.material = [].concat(A.o.material).map(m => { const c = m.clone(); c.polygonOffset = true; c.polygonOffsetFactor = -1 - i % 3; c.polygonOffsetUnits = -1 - i % 3; return c; }); if (A.o.material.length === 1) A.o.material = A.o.material[0]; } }
  let tex = 0; for (const {o} of flat) for (const m of [].concat(o.material)) for (const key of ['map', 'normalMap', 'roughnessMap']) { const t = m[key]; if (!t || t.isDataTexture && !t.generateMipmaps) continue; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = aniso; t.needsUpdate = true; tex++; }
  const sun = lk?.sun ?? lk?.L?.sun; if (sun?.shadow) { sun.shadow.bias = bias; sun.shadow.normalBias = normalBias; }
  return {flat: flat.length, pairs, lifted, textures: tex, bias, normalBias};
}
if (spec.world) {
  const mod = await import(new URL('../' + spec.world, import.meta.url).href); WMOD = mod;
  if (spec.look4) {   // format v4 Phase 2 (opt-in): AgX + PMREM sky env + v4 surfaces + baked static light (engine/look4.js, bake.js)
    const presets = await loadLooks4(new URL('./', import.meta.url)), P4 = presets[spec.look4]; if (!P4) throw Error('unknown look4 ' + spec.look4);
    await M4.loadTex4(new URL('../', import.meta.url));
    look = createLookV4(scene, renderer, presets, {initial: spec.look4, ...(CINE_LOOK ? {fogStart: (await import('./cinelook.js')).FOG.start} : {})});   // tuft 1B fix: post 'cine' = no height fog near the camera look.apply(spec.look4);
    if (mod.preload) await mod.preload(new URL('../', import.meta.url), {scene, renderer, spec});   // format v5 3b-R (opt-in): async world assets (box-art atlas)
    world = mod.build(scene, {P, B, A, M, M4, PR, TR, BI, V, W, look, spec, look4: {preset: P4, halo, water4}});
    if (spec.groundFix) GROUNDFIX = groundFix(scene, look, spec.groundFix);   // Toy House final fix (owner P4, opt-in): before the bake
    look.setGround(world.groundY ?? (() => 0));
    const bakeWith = (root, pr, lights, layers = null) => { const PP = presets[pr], bk = PP.v4.bake;   // Look 6 (opt-in): light layers + height fade
      return bakeScene(root, {sunDir: sunDir(PP.base.sunEl, PP.base.sunAz), sun: bk.sun, sunI: bk.sunI, sky: bk.sky, skyI: bk.skyI, ground: bk.ground, groundI: bk.groundI, aoDist: bk.aoDist, lights: bk.lights ? (lights ?? []) : [], ...(bk.heightFade ? {heightFade: bk.heightFade} : {})}, {env: look.envMap(), reflect: PP.v4.staticReflect, ...(layers ? {layers, layerU: world.lightU} : {})}); };
    BAKE = world.bakeGroups ? world.bakeGroups.map(gr => bakeWith(gr.root, gr.preset, gr.lights, gr.layers)) : bakeWith(scene, spec.look4, world.lights, world.lightLayers);   // format v5: composite worlds bake each module with its own preset
  } else {
  // A4: a world opts into the v3 look by exporting LOOK (an object, or a function of the spec); "Nobody" does not
  const lk = typeof mod.LOOK === 'function' ? mod.LOOK(spec) : mod.LOOK;
  look = lk ? createLookV3(scene, renderer, {...lk, onEnv: tex => M.setEnvMap(tex, lk.envIntensity ?? .45)}) : createLook(scene, renderer);
  if (mod.preload) await mod.preload(new URL('../', import.meta.url), {scene, renderer, spec});   // Kit 1 (opt-in, v3 worlds that export preload): async world assets / a parts/location.js street
  world = mod.build(scene, {P, B, A, M, PR, TR, BI, V, W, look, spec});
  }
  // E3 (opt-in spec.worldObjects): a `prop:<name>` subject is the world's own object of that name (giantHand = the story6 hand): exactly one, never an insert copy
  if (spec.worldObjects) { const {worldObjectErrors} = await import('./worldobjects.js'), bad = worldObjectErrors(spec.worldObjects, n => { let k = 0; scene.traverse(o => { if (o.name === n) k++; }); return k; }, spec.props ?? []); if (bad.length) throw Error(bad.join('; ')); }
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
// Kit 1 (opt-in spec.backdrop {hdri, height 5, radius 400, intensity .7, rotation 0}): a grounded photo sky from assets/hdri/<hdri> (parts/location.js
// groundedSky). It becomes scene.environment only when the look has none. Specs without "backdrop" take none of this.
let BD = null;   // Kit 1c: per-frame backdrop hooks (sky follows the camera, distance cull, per-actor rim)
if (spec.backdrop) {
  const bd = {height: 5, radius: 400, intensity: .7, rotation: 0, ...spec.backdrop}, {sky, hdr} = await groundedSky(T, renderer, new URL('../assets/hdri/' + bd.hdri, import.meta.url).href, bd);
  camera.far = 500; camera.updateProjectionMatrix();   // Kit 1c: sky radius 400 follows the camera; world meshes > 160 from it are hidden per frame
  BD = {sky, cull: [], rims: {}}; scene.add(sky); if (!scene.environment) { scene.environment = new T.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentRotation.y = bd.rotation * Math.PI / 180; }
}
const anchors = world?.anchors ?? {};
// Anchor-relative vectors: {anchor: 'square', offset: [x, y, z]} → world position.
const resolve = v => (v && !Array.isArray(v) && v.anchor) ? anchors[v.anchor].position.map((x, i) => x + (v.offset?.[i] ?? 0)) : v;
for (const s of shots) {
  if (s.move === 'splitScreen') for (const k of ['a', 'b']) if (s[k]?.anchor && !s[k].from) { const c = anchors[s[k].anchor].camera; s[k] = {...s[k], from: {position: c.position, target: c.target, fov: c.fov}}; }   // format v5: split halves by anchor
  if (s.anchor && !s.from) { const c = s.move === 'topDown' && anchors[s.anchor].top ? anchors[s.anchor].top : anchors[s.anchor].camera; s.from = {position: c.position, target: c.target, fov: c.fov}; s.move ??= 'push'; }   // format v5: topDown uses the anchor's `top` camera
  for (const k of ['from', 'to']) if (s[k]) s[k] = {...s[k], position: resolve(s[k].position), target: resolve(s[k].target)};
  if (s.move === 'aisleTrack' && s.from && !s.to) { const f = s.from; s.to = {position: f.position.map((v, i) => i === 1 ? v : v + (f.target[i] - v) * .55), target: f.target, fov: f.fov}; }   // format v5: default aisle run = 55 % of the way in
}

// ---- Cast ----
// Legacy entries (no `style`) use the frozen legacy avatar + legacy samplers. `style: 'v2'` entries
// are v2 actors: `preset` names an entry of `castFile` (or the entry itself is the preset); `keys`
// are timed poses (cross-faded), `faces` timed faces, `origin`/`yaw` the mark, and `travel`
// {dir: [x, z], speed} moves the mark at constant speed (e.g. WALK_SPEED for 'walk').
const presets = spec.castFile ? (await (await fetch(new URL('../' + spec.castFile, import.meta.url))).json()).cast : {};
const cast = {};
const FACES_V3 = spec.faces === 'v3' || (spec.season === 1 && spec.faces !== 'v2');
const troupeData = Object.values(spec.cast ?? {}).some(c => c.troupe) ? await (await fetch(new URL('../' + (spec.troupeFile ?? (spec.rig === 'r6' ? 'cast/troupe-r6.json' : spec.format === 6 ? 'cast/troupe6.json' : 'cast/troupe.json')), import.meta.url))).json() : null;   // A4 troupe slots
if (Object.values(spec.cast ?? {}).some(c => c.troupe === 'HERO')) troupeData.troupe.HERO = (await (await fetch(new URL('../' + (spec.heroFile ?? (spec.format === 6 && spec.rig !== 'r6' ? 'cast/hero6.json' : 'cast/hero.json')), import.meta.url))).json()).HERO;   // format v4 hero slot
// format v4 lip flaps: per-frame mouth shapes from the voice envelope (scripts/v2/envelope.js; the voice file is only read)
const RIG6 = spec.rig === 'r6', TWOS = spec.twos === true;   // R6 rig (owner 2026-11-24, engine/r6.js): classic rigid R6 on Actor v5 + faces v6; twos: actor poses + faces hold 2 frames at 24 fps
const BODY6 = spec.format === 6 && spec.body !== 'v5' && !RIG6;   // P1b: new format-6 specs put the hero, troupe and crowds on Actor v6 (spec.body 'v5' opts out)
const HERO_COLS = troupeData?.troupe?.HERO ? heroColours(troupeData.troupe.HERO) : null;   // format v4 1b: hero colours to keep clear
const NIGHT_EP = ['night', 'nightBright'].includes(spec.look) || (spec.shots ?? []).some(sh => ['night', 'nightBright'].includes(sh.look));
const flapShapes = spec.lipFlap ? (await (await fetch(new URL('../' + (spec.lipFlap.envelope ?? `stories/${spec.slug}/build/envelope.json`), import.meta.url))).json()).shapes : null;
// Marks (Session 5): `marks: [[t0, {at, offset, yaw, travel}], ...]` re-block an actor over the episode; the
// entry's own at/offset/yaw/travel is the mark before the first key.
const markOf = (c, t) => { const k = keyAt(c.marks, t); return k ? {...k[1], t0: k[0]} : {at: c.at, offset: c.offset, yaw: c.yaw, travel: c.travel, origin: c.origin, t0: 0}; };
const presetOf = c => {
  const pre0 = c.troupe ? resolveTroupe(c, troupeData) : c.town ? townsperson(c.town) : c.preset ? {...presets[c.preset], ...(c.with ?? {})} : c;
  const pre1 = RIG6 ? {...pre0, body: 'v5', faceStyle: 'v6', rig: 'r6'} : BODY6 ? {...pre0, body: 'v6', faceStyle: pre0.faceStyle ?? 'v5'} : c.style === 'v5' || spec.look4 ? {...pre0, body: 'v5', faceStyle: pre0.faceStyle ?? 'v5'} : pre0;   // P1b: format 6 = Actor v6 (R15) for everyone   // Actor v5 + Faces v5 (owner's sheet; 'v4' stays opt-in) (2b: every actor of a look4 episode)
  const pre2 = HERO_COLS && c.troupe !== 'HERO' && pre1.outfit ? {...pre1, outfit: heroSafeOutfit(pre1.outfit, HERO_COLS, {minL: NIGHT_EP ? .32 : 0})} : pre1;   // v4 1b: nobody dresses like the hero
  const pre3 = (spec.look4 || BODY6 || RIG6) && !pre2.regions && pre2.outfit ? {...pre2, regions: outfitRegions(pre2.outfit, pre2.skin ?? '#f5cd30'), outfit: null} : pre2;   // 2b: outfits as colour regions (data)
  const pre = FACES_V3 && !pre3.faceStyle ? {...pre3, faceStyle: 'v3'} : pre3;   // Faces v3: default for season 1 (or spec.faces 'v3')
  if ((spec.format === 5 || spec.format === 6) && pre.build !== 'youth' && !(pre.age < 18)) pre.scale = 1;   // format v5: every adult stands at the same height (builds differ in shape, not size)
  return pre; };
for (const [name, c] of Object.entries(spec.cast ?? {})) {
  if (c.at) c.origin = resolve({anchor: c.at, offset: c.offset ?? [0, 0, 0]});
  if (c.style === 'dog') { const d = buildDog({scale: c.scale ?? 1, name, colors: c.colors ?? null}); scene.add(d.root); cast[name] = {a: d, c, dragon: true, dog: true}; continue; }   // E4: the DOG (creature entry like the dragon; driveDog)
  if (c.style === 'dragon') { const d = buildDragon({scale: c.scale ?? 1, name, colors: c.colors ?? null, face: c.dragonFace ?? null, baby: !!c.baby, wingScale: c.wingScale ?? 1, rim: c.rim ?? null, spikes: c.spikes ?? 1, saddle: !!c.saddle}); scene.add(d.root); cast[name] = {a: d, c, dragon: true}; continue; }
  if (c.style === 'v2' || c.style === 'v5') { if (c.troupe === 'AFK') { c.keys ??= [[0, troupeData.AFK.pose ?? 'walk']]; c.faces ??= [[0, 'neutral']]; }
    const pre = presetOf(c);
    const a = buildActor(c.noTag ? {...pre, tag: null} : pre, name); scene.add(a.root); cast[name] = {a, c, v2: true};
    if (spec.lod && c.lod) { const {costume, ...cn} = c, an = buildActor(presetOf(cn), name); an.root.visible = false; scene.add(an.root); cast[name].lod = {far: a, near: an}; }   // E1b (opt-in spec.lod): full-detail twin, swapped in by camera distance
    if (spec.decorate && WMOD?.decorate) WMOD.decorate(a, name, pre, c); }   // Touch Grass E1 (opt-in spec.decorate): the world module dresses an actor once (headset, armor, held props)
  else { const a = createBaseAvatar({color: c.color ?? 0xf2c94c}); scene.add(a.root); cast[name] = {a, c}; }
}
// E1b crowd LOD (opt-in spec.lod {near: 18, max: 24}): cast entries with `lod: true` carry a full-detail twin; per frame the
// nearest ≤ max of them within `near` studs of the camera (to the chest, 2.6 up) show it, the rest their far (CROWD) build.
const LODS = spec.lod ? Object.entries(cast).filter(([, x]) => x.lod) : [];
function applyLod(camPos, t) {
  const dists = LODS.map(([name]) => { const m = markPos[name]; return m ? Math.hypot(m[0] - camPos[0], m[1] + 2.6 - camPos[1], m[2] - camPos[2]) : Infinity; });
  const pick = lodPick(dists, S6?.lodNear(t) ?? spec.lod.near ?? 18, spec.lod.max ?? 24);   // E2: a crowd-bloom shot swaps the nearest dummies to full detail
  LODS.forEach(([name, x], i) => { const want = pick.has(i) ? x.lod.near : x.lod.far, other = want === x.lod.near ? x.lod.far : x.lod.near;
    if (x.a !== want) { x.a = want; poseOne(name, x, t, {}); }
    other.root.visible = false; want.root.visible = x.c.visible ? valueAt(x.c.visible, t, true) : true; });
}
// E3b D1 (opt-in shot.clear): hide non-subject dummies (crowd or named DUMMY) standing between the lens and the subject or within
// 2.5 studs of the lens (engine/clear6.js); lying pile bodies count as ground (lens rule only). Restored at the next drawFrame.
const CLEARED = [];
function unclear() { for (const r of CLEARED) r.visible = true; CLEARED.length = 0; }
function applyClear(shot, cam, tgt, fov, aspect) {
  const subj = [shot.subject, ...(shot.pair ?? []), ...(shot.see ?? [])].filter(n => cast[n] && cast[n].a.root.visible), keep = shot.keep ?? [], kOf = n => cast[n].a.root.scale.x || 1;
  camera.fov = fov; camera.aspect = aspect; camera.position.fromArray(cam); camera.up.set(0, 1, 0); camera.lookAt(...tgt); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const C = camera.position, rectOf = pts => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { const q = p.clone().project(camera); if (q.z > 1) continue; x0 = Math.min(x0, (q.x + 1) / 2); x1 = Math.max(x1, (q.x + 1) / 2); y0 = Math.min(y0, (1 - q.y) / 2); y1 = Math.max(y1, (1 - q.y) / 2); } return x1 > x0 ? {x0, x1, y0, y1} : null; };
  const corners = b => [0, 1, 2, 3, 4, 5, 6, 7].map(i => new T.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  let sub = null; if (subj.length) { const b = new T.Box3(); for (const n of subj) { cast[n].a.root.updateMatrixWorld(true); cast[n].a.root.traverse(o => { if (o.isMesh && o.visible && !o.isSprite && !o.material?.transparent) b.expandByObject(o); }); } const r = rectOf(corners(b)); if (r) sub = {rect: r, dist: b.getCenter(new T.Vector3()).distanceTo(C)}; }   // between = nearer than the subject's centre
  else { const p = new T.Vector3(...tgt); sub = {rect: {x0: .35, x1: .65, y0: .35, y1: .65}, dist: p.distanceTo(C)}; }   // a world-object subject: the middle of the frame up to the target
  const others = [];
  for (const [n, x] of Object.entries(cast)) { if (subj.includes(n) || keep.includes(n) || x.c.troupe !== 'DUMMY' || !x.a.root.visible || !markPos[n]) continue; const k = kOf(n), p = x.a.root.position, c = new T.Vector3(p.x, p.y + 2.65 * k, p.z);
    const lensD = Math.max(0, Math.hypot(C.x - p.x, C.z - p.z) - 1.3 * k) + Math.max(0, C.y - (p.y + 5.3 * k), p.y - C.y);
    if (x.s6lie) { others.push({name: n, rect: null, dist: Infinity, lensD}); continue; }   // a body in the pile is ground: the lens rule only
    const b = new T.Box3(new T.Vector3(p.x - 1.3 * k, p.y, p.z - 1.3 * k), new T.Vector3(p.x + 1.3 * k, p.y + 5.3 * k, p.z + 1.3 * k));
    const inside = subj.some(m => markPos[m] && Math.hypot(markPos[m][0] - p.x, markPos[m][2] - p.z) < 1.6 * k);   // standing inside a subject's body: hidden too
    others.push({name: n, rect: rectOf(corners(b)), dist: inside ? -1 : c.distanceTo(C), lensD}); }
  for (const n of clearScreen(sub, others)) { const r = cast[n].a.root; r.visible = false; CLEARED.push(r); }
}
// format v5 lightsCascade (world effect): spec.effects [{type: 'lightsCascade', at, step, on, color, size, points: [[x, y, z]...] | {anchor, offset}[]}]
const cascades = (spec.effects ?? []).filter(e => e.type === 'lightsCascade').map(e => { const g = new T.Group(); g.name = 'lightsCascade';
  const bulbs = e.points.map(p => { const at = resolve(p), b = new T.Group(); b.position.set(...at);
    const core = new T.Mesh(new T.SphereGeometry(e.bulb ?? .22, 12, 8), new T.MeshBasicMaterial({color: e.color ?? '#ffd68a', toneMapped: false})); core.userData.live = true; b.add(core);
    const h = halo([0, 0, 0], e.color ?? '#ffd68a', e.size ?? 2.4, .85); h.position.set(0, 0, 0); b.add(h); g.add(b); return b; });
  scene.add(g); return {e, bulbs}; });
function updateCascades(t) { for (const {e, bulbs} of cascades) { const on = cascadeOn(t, bulbs.length, e); bulbs.forEach((b, i) => { b.visible = on[i]; }); } }
// Look 6 (opt-in spec.look6): the shot's light state (looks4 <preset>.v6) mixed into the baked layers; the first lightsCascade drives the
// pendants and zone signs on (its fraction of bulbs lit; no cascade = fully on). Presets without v6 (the dawn street) keep the last state.
const LOOK6 = !!(spec.look6 && world?.setLight6), CASC6 = cascades[0]?.e ?? null;
function applyMood(shot, n) {   // P4: exposure × 2^ev, saturation, temperature tint, haze, rim; after the look has set the frame's exposure
  if (!M6) return; const u = M6.moodUniforms(shot), pe = M6.payoffEV(shots, n); renderer.toneMappingExposure *= pe === null ? u.exposure : 2 ** pe;
  MOODU.uMoodSat.value = u.sat; MOODU.uMoodTint.value.set(...u.tint); MOODU.uMoodHaze.value = u.haze; if (LOOK5B && u.rim !== 1) U5B.uRim.value *= u.rim;
  // P5b (all 0 / 1 by default = no change): bloom, vignette, sky exposure, fill (hemisphere) and rim temperature, shadow hardness. The look has just set the frame's colours, so these never accumulate.
  MOODU.uMoodBloom.value = u.bloom; MOODU.uMoodVig.value = u.vignette; renderer.getDrawingBufferSize(MOODU.uMoodRes.value);
  const kel = (c, K) => { if (c && K) { c.r *= 1 + K * 1.2e-4; c.b *= 1 - K * 1.2e-4; } };
  if (look?.sky && u.skyEV) { const su = look.sky.material.uniforms, k = 2 ** u.skyEV; su.top.value.multiplyScalar(k); su.horizon.value.multiplyScalar(k); }
  if (look?.hemi && u.fillK) kel(look.hemi.color, u.fillK);   // fill temperature: the sky half of the hemisphere light
  if (look?.hemi && (u.groundNeutral || u.groundGain !== 1)) { const g = look.hemi.groundColor, l = .2126 * g.r + .7152 * g.g + .0722 * g.b; g.r += (l - g.r) * u.groundNeutral; g.g += (l - g.g) * u.groundNeutral; g.b += (l - g.b) * u.groundNeutral; g.multiplyScalar(u.groundGain); }   // ground bounce toward grey (stops the grass tint on a jacket seen from below)
  if (look?.rim && u.rimK) kel(look.rim.color, u.rimK);
  if (look?.sun?.shadow && u.shadow !== 1) look.sun.shadow.radius = 1 / u.shadow;
}
function apply6(shot, t) { if (!LOOK6) return; const v6 = look.presets[shot.look ?? spec.look4]?.v6; if (!v6) return; world.setLight6(v6, CASC6 ? cascadeFrac(t, CASC6, cascades[0].bulbs.length) : 1);
  if (U5B) for (const [name, u] of Object.entries(U5B.poolOf)) { const m = markPos[name]; u.value = m ? actorPool(world.lightAt6([m[0], (world.groundY?.(m[0], m[2]) ?? 0) + 2.5, m[2]]), v6.actorPool) : 1; } }   // actors in a pool read brighter
if (Object.values(cast).some(x => x.v2)) await loadFont();
// Format v4 2b: baked actor light. Every actor and crowd mesh gets MeshMatcapMaterial with the preset's matcap (colour ×
// 1 / MC_LIGHT, the matcap's light scale); the close shot's subject may keep its MeshStandard (shot `heroLit`, default on).
const MATCAP = spec.look4 ? (await look.preloadMatcap(new URL('../', import.meta.url), spec.look4), look.matcap(spec.look4)) : null;
const mcCache = new Map();
const toMatcap = m => { if (Array.isArray(m)) return m.map(toMatcap); if (!m || m.isMeshBasicMaterial || m.isSpriteMaterial || m.isMeshMatcapMaterial) return m;
  if (!mcCache.has(m)) { const x = new T.MeshMatcapMaterial({matcap: MATCAP, color: (m.color ?? new T.Color('#ffffff')).clone().multiplyScalar(1 / look.MC_LIGHT), map: m.map ?? null, transparent: m.transparent, opacity: m.opacity, side: m.side, vertexColors: m.vertexColors});
    x.name = 'matcap:' + (m.name ?? ''); mcCache.set(m, x); } return mcCache.get(m); };
const litSwap = [];   // [{name, mesh, std, mc}]
if (MATCAP) for (const [name, x] of Object.entries(cast)) if (x.v2) x.a.root.traverse(o => { if (!o.isMesh || o.name === 'face_decal') return; const mc = toMatcap(o.material); if (mc === o.material) return; litSwap.push({name, mesh: o, std: o.material, mc}); o.material = mc; });
let litNow = null;
function setHeroLit(shot) {   // the close shot's subject keeps real light (MeshStandard), everyone else the matcap
  if (!MATCAP) return; const who = shot.size === 'close' && shot.heroLit !== false ? (shot.subject ?? shot.fit?.actor ?? null) : null;
  if (who === litNow) return; litNow = who; for (const e of litSwap) e.mesh.material = e.name === who ? e.std : e.mc;
}
// Look 5b (opt-in spec.look5b; data looks4.json <preset>.v5b, engine/look5b.js): cast materials get their own clones with a fresnel
// rim + an actor exposure lift (shared uniforms, set per shot's preset); the world is graded −0.15 EV and 5 % cooler once; daylight
// presets add exposure; one soft contact blob per actor; motion (overshoot, breathing, springs), static-shot camera noise, and a
// 2-sub-frame motion blur on whip / crashZoom shots.
const LOOK5B = !!(spec.look5b && look?.v4), P5B = name => L5B.params(look.presets[name] ?? look.presets[spec.look4]);
const U5B = LOOK5B ? {...L5B.makeUniforms(P5B(spec.look4)), uRelief: {value: 0}, poolOf: {}} : null;
const M5B = LOOK5B ? {overshoot: {os: P5B(spec.look4).overshoot, settle: .3, ease: u => overshootEase(u, P5B(spec.look4).overshoot)}, breathe: P5B(spec.look4).breathe, springs: P5B(spec.look4).springs, breatheFn: breathe, springLag} : null;
const blobs5b = {};
if (LOOK5B) {
  const own = new Map(), mine = (m, who) => { if (Array.isArray(m)) return m.map(x => mine(x, who)); if (!m || m.isMeshBasicMaterial || m.isSpriteMaterial) return m; const k = who + '|' + m.uuid;
    if (!own.has(k)) own.set(k, L5B.patchActor(m.clone(), {...U5B, uShade: U5B.shadeOf[who], uPool: (U5B.poolOf[who] ??= {value: 1})})); return own.get(k); };   // per-actor clones: each actor its own shadow depth
  U5B.shadeOf = Object.fromEntries(Object.entries(cast).filter(([, x]) => x.v2).map(([n, x]) => [n, {value: 1, skin: x.a.preset?.skin}]));
  for (const e of litSwap) { e.mc = mine(e.mc, e.name); e.std = mine(e.std, e.name); e.mesh.material = e.name === litNow ? e.std : e.mc; }
  for (const x of Object.values(cast)) if (x.v2) x.a.root.traverse(o => { if (o.name === 'face_decal') for (const m of [].concat(o.material)) L5B.patchDecal(m, U5B); });   // in place: setFace4 swaps the decal's map
  for (const [name, x] of Object.entries(cast)) if (x.v2) { const w = 4.2 * x.a.root.scale.x, b = L5B.contactBlob(P5B(spec.look4).blob.radius * w, P5B(spec.look4).blob.opacity); b.visible = false; scene.add(b); blobs5b[name] = b; }
}
// Kit 1: under a backdrop every actor gets the look5b fresnel rim (strength .6) and the +0.3 EV actor lift (look5b DEFAULTS.actorEV), per-actor material clones.
if (spec.backdrop && !LOOK5B) {
  const p = L5B.params(null), own = new Map();   // Kit 1c: per-actor uniforms, so a scaleReveal subject gets rim .9 and the others .6
  for (const [name, x] of Object.entries(cast)) if (x.v2) {
    const U = L5B.makeUniforms({...p, rim: {...p.rim, strength: .6}}); BD.rims[name] = U.uRim;
    const mine = m => Array.isArray(m) ? m.map(mine) : !m || m.isMeshBasicMaterial || m.isSpriteMaterial ? m : (own.has(m) ? own : own.set(m, L5B.patchActor(m.clone(), U))).get(m);
    x.a.root.traverse(o => { if (!o.isMesh) return; if (o.name === 'face_decal') for (const m of [].concat(o.material)) L5B.patchDecal(m, U); else o.material = mine(o.material); });
  }
}
if (BD) {   // Kit 1c: world meshes (not actors, sky, catcher) with their world bounding-sphere centres, hidden when > 160 units from the camera
  const roots = Object.values(cast).map(x => x.a?.root).filter(Boolean), inActor = o => roots.some(r => { for (let q = o; q; q = q.parent) if (q === r) return true; return false; });
  scene.updateMatrixWorld(true);
  scene.traverse(o => { if (!o.isMesh || o === BD.sky || o.name === 'shadowCatcher' || o.name === 'groundedSkybox' || o.userData.live || inActor(o)) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); BD.cull.push({o, c: o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld)}); });
  BD.pre = (cam, shot) => { BD.sky.position.x = cam.position.x; BD.sky.position.z = cam.position.z; const hid = [];
    for (const e of BD.cull) if (e.o.visible && e.c.distanceTo(cam.position) > 160) { e.o.visible = false; hid.push(e.o); }
    for (const [n, u] of Object.entries(BD.rims)) u.value = shot?.move === 'scaleReveal' && (shot.subject ?? shot.actor) === n ? .9 : .6;
    return () => { for (const o of hid) o.visible = true; }; };
}
function apply5b(shot) {
  if (!LOOK5B) return; const p = P5B(shot.look ?? spec.look4);   // E1 fix 2 (opt-in per shot): shot.rim {color, strength, power, away}, shot.actorEV
  U5B.uRimColor.value.set(shot.rim?.color ?? p.rim.color); U5B.uRim.value = shot.rim?.strength ?? p.rim.strength; U5B.uRimPow.value = shot.rim?.power ?? p.rim.power; U5B.uRimAway.value = shot.rim?.away ?? p.rim.away ?? 0; U5B.uLift.value = L5B.ev(shot.actorEV ?? p.actorEV); U5B.uShade.value = p.shade; U5B.uKnee.value = p.knee; for (const v of Object.values(U5B.shadeOf)) v.value = L5B.actorShade(v.skin, p.shade);
  U5B.uRelief.value = ['close', 'medium'].includes(shot.size) ? p.relief : 0;
  renderer.toneMappingExposure *= L5B.ev(p.exposureEV);
  const gc = c => { const v = L5B.envGrade([c.r, c.g, c.b], p); c.setRGB(...v); };   // fog and sky are environment too
  if (scene.fog) { gc(scene.fog.color); if (p.fogFar) scene.fog.far = p.fogFar; } if (look.sky?.material?.uniforms) { gc(look.sky.material.uniforms.top.value); gc(look.sky.material.uniforms.horizon.value); }
  for (const [name, b] of Object.entries(blobs5b)) { const m = markPos[name], vis = cast[name].a.root.visible && m; b.visible = !!vis; if (vis) b.position.set(m[0], (world?.groundY?.(m[0], m[2]) ?? m[1]) + .14, m[2]); }   // above the .12 zone plates
}
const STATIC_MOVES = ['topDown'];   // plus any shot marked static: true
const camNoise5b = (shot, t) => LOOK5B && (shot.static || STATIC_MOVES.includes(shot.move)) ? camNoise(t, shots.indexOf(shot) + 1, P5B(shot.look ?? spec.look4).camNoiseDeg) : null;
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
  const k = shot?.subjectLift ?? spec.subjectLift, who = k ? (shot?.subject ?? shot?.fit?.actor) : null, want = who && cast[who]?.v2 ? who + ':' + k : null;   // E1 fix: per-shot subjectLift (opt-in)
  if (lifted === want) return;
  if (lifted) cast[lifted.split(':')[0]].a.root.traverse(o => { const e = liftClones.get(o); if (e) o.material = e.orig; });
  lifted = want; if (!want) return;
  cast[who].a.root.traverse(o => { if (!o.isMesh || !o.material?.emissive || o.material.isMeshBasicMaterial) return; let e = liftClones.get(o);
    if (e && e.k !== k) { liftClones.delete(o); e = null; }
    if (!e || e.orig !== o.material && e.lift !== o.material) { const m = o.material.clone(); let base = m.color.clone();
      if (m.map) { m.emissiveMap = m.map; base = new T.Color(1, 1, 1); }
      else if (m.vertexColors && o.geometry.attributes.color) { const cc = o.geometry.attributes.color, avg = [0, 0, 0]; for (let i = 0; i < cc.count; i++) { avg[0] += cc.getX(i); avg[1] += cc.getY(i); avg[2] += cc.getZ(i); } base = new T.Color(avg[0] / cc.count, avg[1] / cc.count, avg[2] / cc.count); }   // hair keeps its own colour (never white)
      m.emissive = base.multiplyScalar(k); e = {orig: o.material, lift: m, k}; liftClones.set(o, e); }
    o.material = e.lift; });
}
// E1 fix 2 (opt-in shot.propGlow = k with shot.prop): the shot's prop gets a self-light (emissive = colour × k; basic materials ×(1 + 2k)),
// restored on the next shot, so a prop stands out from its surround (read check 3).
let glowing = null; const glowSaved = [];
function glowProp(shot) {
  const want = shot?.propGlow && shot.prop ? shot.prop + ':' + shot.propGlow : null; if (want === glowing) return;
  for (const g of glowSaved) { const m = g.m; if (g.emissive) { m.emissive.copy(g.emissive); m.emissiveMap = g.emissiveMap; } else m.color.copy(g.color); m.needsUpdate = true; } glowSaved.length = 0;
  glowing = want; if (!want) return; const root = scene.getObjectByName(shot.prop), k = shot.propGlow; if (!root) return;
  const seen = new Set(); root.traverse(o => { const m = o.isMesh && !Array.isArray(o.material) ? o.material : null; if (!m || seen.has(m) || m.transparent) return; seen.add(m);
    if (m.emissive) { glowSaved.push({m, emissive: m.emissive.clone(), emissiveMap: m.emissiveMap}); if (m.map) { m.emissiveMap = m.map; m.emissive.setRGB(k, k, k); } else m.emissive.copy(m.color).multiplyScalar(k); }
    else if (m.color) { glowSaved.push({m, color: m.color.clone()}); m.color.multiplyScalar(1 + 2 * k); }
    m.needsUpdate = true; });
}
const applyLift = shot => { const f = spec.actorLift !== undefined ? 1 : ['night', 'nightBright'].includes(shot?.look ?? spec.look) ? 1 : 0; for (const [m, e] of liftMats) m.emissive.copy(e).multiplyScalar(f); };

// P3 acting v6 (opt-in spec.acting === 6, v6 actors only): shot `actions` [{actor, verb | cycle | face, at: s (shot-local) |
// {word, nth}, intensity, target, facing, hold}] + spec.talk [{actor, line, gesture?, stress?}] compile into per-actor tracks
// (engine/acting6.js); the KEY of each verb lands on its time / word start. Specs without `acting: 6` never load it.
const ACT6 = spec.acting === 6 ? await import('./acting6.js') : null, R6 = RIG6 && ACT6 ? await import('./r6.js') : null;
const actTracks = ACT6 ? await (async () => {
  const get = async u => { try { const r = await fetch(new URL('../' + u, import.meta.url)); return r.ok ? await r.json() : null; } catch { return null; } };
  const cues = await get(spec.cues ?? `stories/${spec.slug}/cues.json`) ?? await get(`stories/${spec.slug}/build/cues.json`), env = await get(`stories/${spec.slug}/build/envelope.json`);
  const actions = shots.flatMap(sh => (sh.actions ?? []).map(a => { const b = typeof a.at === 'number' ? {...a, at: sh.start / FPS + a.at} : {...a}; if (b.target && cast[b.target] && cast[b.actor]) b.partnerScale = cast[b.target].a.root.scale.x / cast[b.actor].a.root.scale.x; return b; }));   // partnerScale picks the hug / carry variant
  return ACT6.compileActing(actions, {cues, env, talk: spec.talk ?? []});
})() : null;
// Partners (hug, carry, comfort_kneel): the partner's meeting mark comes from the lead's mark; it must START within PARTNER_TOL of it —
// a Brief that places it further away gets a walk-in (walk cycle, straight line at CYCLES.walk.v) ending at the verb's start (never a slide).
const markOfActor = (name, t) => { const c = cast[name].c, m = markAt(c, t); return [m[0], m[2]]; };
const actPlans = [];
if (ACT6) for (const [pn, tr] of Object.entries(actTracks)) for (const [i, it] of tr.items.entries()) {
  if (!it.partnerOf) continue;
  const lead = cast[it.partnerOf], lt = actTracks[it.partnerOf].items.find(x => x.key === it.key && x.target === pn), ts = it.start, prev = tr.items[i - 1], avail = ts - (prev ? prev.start + ACT6.timing(ACT6.VERBS[prev.verb] ?? ACT6.VERBS.idle_alive).D : 0);
  const plan = ACT6.partnerPlan({verb: lt?.verb ?? it.verb, leadPos: markOfActor(it.partnerOf, ts), leadYaw: (markOf(lead.c, ts).yaw ?? 0) * Math.PI / 180, leadScale: lead.a.root.scale.x, partnerPos: markOfActor(pn, ts), start: ts, avail, walkIn: it.walkIn !== false, facing: -(it.facing ?? 0)});
  if (!plan) continue; it.plan = plan; actPlans.push({partner: pn, lead: it.partnerOf, verb: lt?.verb ?? it.verb, key: it.key, start: ts, ...plan});
  if (plan.walk) tr.cycles.push({name: 'walk', start: plan.walk.t0, until: ts});
}
function actingOrigin(name, t, at, yaw) {
  const tr = actTracks?.[name]; if (!tr) return [at, yaw];
  const wk = tr.items.find(x => x.plan?.walk && t >= x.plan.walk.t0 && t < x.start);   // walk-in: straight line, constant speed, turning to face the mark on arrival
  if (wk) { const w = wk.plan.walk, u = (t - w.t0) / w.dur, to = w.to, from = w.from, h = Math.atan2(to[0] - from[0], to[1] - from[1]), e = x => x * x * (3 - 2 * x), turn = e(Math.min(1, (t - w.t0) / .2)), end = e(Math.max(0, (t - (wk.start - .3)) / .3));
    const y1 = yaw + Math.atan2(Math.sin(h - yaw), Math.cos(h - yaw)) * turn, y2 = y1 + Math.atan2(Math.sin(wk.plan.yaw - y1), Math.cos(wk.plan.yaw - y1)) * end;
    return [[from[0] + (to[0] - from[0]) * u, at[1], from[1] + (to[1] - from[1]) * u], y2]; }
  const it = tr.items.findLast(x => x.start <= t); if (!it?.partnerOf) return [at, yaw];
  const lead = cast[it.partnerOf], lat = markAt(lead.c, t), lyaw = (markOf(lead.c, t).yaw ?? 0) * Math.PI / 180, k = lead.a.root.scale.x, rot = ([x, y, z]) => [x * Math.cos(lyaw) + z * Math.sin(lyaw), y, -x * Math.sin(lyaw) + z * Math.cos(lyaw)];
  const T = ACT6.timing(ACT6.VERBS[it.verb]), sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const mark = it.plan?.mark ?? [at[0], at[2]], myaw = it.plan?.yaw ?? yaw;
  if (it.two.follow) {   // carry: the partner stands on its mark through the pickup, then rides the lead's body (1-frame stagger behind the lead's rise)
    const o = ACT6.carryOrigin(ACT6.sampleActing(actTracks[it.partnerOf], t, {build: lead.a.build}).sample, lead.a.build, it.verb, cast[name].a.root.scale.x / k), p = rot(o.p).map(x => x), w = ACT6.carryW(it.verb, t, it.start);
    const rid = [lat[0] + p[0] * k, lat[1] + p[1] * k, lat[2] + p[2] * k], gnd = [mark[0], at[1], mark[1]];
    return [rid.map((x, i) => gnd[i] + (x - gnd[i]) * w), myaw + (lyaw + o.yaw * Math.PI / 180 - myaw) * w];
  }
  if (it.plan?.walk) return [[mark[0], at[1], mark[1]], myaw];   // walked in: already on the mark
  const e = sm((t - it.start) / (T.ant + ACT6.VERBS[it.verb].act));   // within PARTNER_TOL: moved in over the anticipation + action
  return [[at[0] + (mark[0] - at[0]) * e, at[1], at[2] + (mark[1] - at[2]) * e], yaw + Math.atan2(Math.sin(myaw - yaw), Math.cos(myaw - yaw)) * e];
}
const markPos = {};
// E2 story mechanics (opt-in spec.story6): drains, blooms, crowd, giant hand, tumble, air catch, splash, tags, spawn (engine/story6rt.js)
const S6 = spec.story6 ? await (await import('./story6rt.js')).createStory6({spec, scene, cast, FPS, markAt, markOf, markPos, driveActor, shots, groundY: (x, z) => world?.groundY?.(x, z) ?? 0,
  anchorPos: n => { const an = anchors[n]; if (!an) throw Error('story6: unknown anchor ' + n); return [...an.position]; },
  cameraAt: tt => { const sh = shots.findLast(s => Math.round(tt * FPS) >= s.start) ?? shots[0]; return sampleCamera({...sh, fps: FPS}, Math.max(0, tt - sh.start / FPS), markPos); }}) : null;
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
  return flapActive(sh, name, {narrator: spec.lipFlap.narrator ?? 'HERO'}) ? shapeAt(flapShapes, t, FPS) : null; };
function poseCast(t) {
  const out = {};
  for (const [name, x] of Object.entries(cast)) poseOne(name, x, t, out);
  return out;
}
function poseOne(name, x, t, out) {
  if (S6?.owns(name)) { S6.drive(name, x, t, out); return; }   // E2: the story crowd is driven by engine/story6rt.js
  const {a, c, v2, dragon} = x;
  {
    const m = markOf(c, t), yaw = (m.yaw ?? 0) * Math.PI / 180;
    if (v2 || dragon) {
      const at = markAt(c, t);
      markPos[name] = [...at];
      const tq = TWOS && !x.dog && !dragon ? twosTime(t, FPS) : t, atq = tq === t ? at : markAt(c, tq);   // twos: the body and its faces sample the even frame; markPos (camera paths) stays on ones
      if (x.dog) driveDog(a, t, {keys: c.keys ?? [[0, 'idle']], origin: {position: at, yaw}});
      else if (dragon) driveDragon(a, t, {keys: c.keys ?? [[0, 'perch']], origin: {position: at, yaw}});
      else if (actTracks?.[name] && (a.body === 'v6' || R6)) {   // P3 acting v6: the track's sample, faces on their words, props in the hands
        const tr = actTracks[name], [pos, y2] = actingOrigin(name, tq, atq, yaw), still = M6 && shots.findLast(s => Math.round(t * FPS) >= s.start)?.still, tS = still ? shots.findLast(s => Math.round(t * FPS) >= s.start).start / FPS + .001 : tq, act = (R6 ?? ACT6)[R6 ? 'sampleActingR6' : 'sampleActing'](tr, tS, {seed: a.blinkSeed ?? 1, build: a.build});   // P5b `still` shot (moods only): ambient motion off = the track sampled at the shot's first frame
        driveActor(a, tq, {keys: [[0, 'idle']], acting: () => act.sample, faces: tr.faces.length ? [[0, c.faces?.[0]?.[1] ?? a.preset.face ?? 'smile'], ...tr.faces] : c.faces, origin: {position: pos, yaw: y2}, tags: c.tags, fps: FPS, visible: c.visible, blinkSuppress: blinkOff(t) || !!still, talk: talkOf(name, tq), ...(spec.faceLife && !still ? {faceLife: true} : {})});
        for (const [id, pr] of Object.entries(act.props)) { const o = scene.getObjectByName(id); if (!o || !pr) continue; const k = a.root.scale.x, cy = Math.cos(y2), sy = Math.sin(y2);
          o.position.set(pos[0] + (pr.p[0] * cy + pr.p[2] * sy) * k, pos[1] + pr.p[1] * k, pos[2] + (-pr.p[0] * sy + pr.p[2] * cy) * k); }
      }
      else driveActor(a, tq, {keys: c.keys ?? [[0, c.action ?? 'idle']], faces: c.faces, ambient: !!c.ambient,
        origin: {position: atq, yaw}, tags: c.tags, fps: FPS, tools: c.tools, toolsLeft: c.toolsLeft, stat: c.stat, bubble: c.bubble, visible: c.visible, kit: c.kit, blinkSuppress: blinkOff(t), talk: talkOf(name, tq), ...(M5B ? {m5b: M5B} : {}), ...(spec.faceLife ? {faceLife: true} : {})});   // P2: faces v6 life (opt-in)
      if (v2 && spec.decorate) WMOD?.poseActor?.(a, name, t, c);   // Touch Grass E1 (opt-in): per-frame dress state, pure in t
      if (dragon && c.visible) a.root.visible = valueAt(c.visible, t, true);
    } else {
      const s = sampleAction(c.action ?? 'idle', t, c.action === 'walk' ? {gait: c.gait ?? 'readable'} : {});
      applyActionSample(a, s, {position: c.origin ?? [0, 0, 0], yaw});
    }
    // follow cameras ride the actor's mark (path), not the posed root: strain shakes and walk bobs never jolt the camera
    out[name] = (v2 || dragon) ? markPos[name] : a.root.position.toArray();
  }
  if (S6 && v2) S6.post(name, x, t, out);   // E2: tumble / held / air / spawn / tag overrides on top of the drive
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
const effects = createEffects([...(spec.effects ?? []).filter(e => e.type !== 'lightsCascade'), ...revealEffects], {scene, renderer, resolveTarget, resolvePoint,
  shotAt: tt => Math.max(0, shots.findLastIndex(s => Math.max(0, Math.round(tt * FPS)) >= s.start)),
  actorOf: name => { const a = cast[name]?.a; if (!a) throw Error('effect: unknown actor ' + name); return a; }, toolGroup: (a, name) => toolGroup(a, name, 'right'),
  actorAt: (name, tt) => { const c = cast[name]?.c; if (!c) throw Error('trail: unknown actor ' + name); return markAt(c, tt); }, groundY: world?.groundY});

// A4: instanced crowds (spec.crowds) and rule UI attached to any pivot/object (spec.ui).
// Season 1 hero readability (engine/heroread.js): crowds never wear a shot subject's main outfit colour; a soft rim light
// from behind the current subject in wides and mediums (one SpotLight, no shadow); "Nobody" and older specs: off.
const HERO_READ = spec.season === 1 || spec.heroRead === true;
const subjectMains = HERO_READ ? [...new Set(shots.map(s => s.subject ?? s.fit?.actor).filter(n => cast[n]?.a.preset?.outfit?.main).map(n => cast[n].a.preset.outfit.main))] : [];
const crowds = createCrowds(scene, spec.crowds ?? [], {...(spec.look4 ? {body: BODY6 ? 'v6' : 'v5', material: toMatcap(new T.MeshStandardMaterial({color: '#ffffff', roughness: .45})), colourScale: 1 / look.MC_LIGHT, hairMaterial: toMatcap(hair4Material())} : BODY6 ? {body: 'v6'} : {}), groundY: world?.groundY ?? (() => 0), resolveCentre: c => Array.isArray(c) ? c : (p => [p[0], p[2]])(resolve(c)), avoidColours: HERO_COLS ? [...subjectMains, ...HERO_COLS] : subjectMains, faces: spec.look4 ? 'v5' : FACES_V3 ? 'v3' : 'v2'});
// format v5 3b-R (opt-in spec.crowdCull): each crowd group is culled by its own bounds (ambient kids stay in their area), so a
// shot pays only for the groups it sees. Bounds = the group's area + 3 units, computed once from the members after the first pose.
if (spec.crowdCull) { crowds.update(0, {}); scene.traverse(o => { if (o.isInstancedMesh && /^crowd_/.test(o.parent?.name ?? '')) { o.computeBoundingSphere(); o.boundingSphere.radius += 3; o.frustumCulled = true; } }); }
const rim = HERO_READ ? (() => { const l = new T.SpotLight(RIM.color, 0, RIM.distance, RIM.angle, RIM.penumbra, RIM.decay); l.castShadow = false; l.visible = false; l.name = 'subjectRim'; scene.add(l, l.target); return l; })() : null;
function aimRim(shot, camPos) {
  if (!rim) return; const n = shot?.subject ?? shot?.fit?.actor, m = n && markPos[n], r = m && cast[n].a.root.visible ? rimFor(shot.size, m, camPos, 5.3 * cast[n].a.root.scale.y) : null;
  rim.visible = !!r; rim.intensity = r ? r.intensity * (spec.rimScale ?? 1) : 0; if (!r) return;
  rim.position.set(...r.position); rim.target.position.set(...r.target); rim.target.updateMatrixWorld();
}
const ui = createRuleUI(spec.ui ?? [], {scene, resolveTarget, fps: FPS});
const fill = spec.fill ? createFill(scene, spec.fill, {groundY: world?.groundY ?? (() => 0)}) : null;   // format v5: ~200 instanced fill kids
if (LOOK5B) { const roots = Object.values(cast).map(x => x.a.root), skip = o => { for (let p = o; p; p = p.parent) if (roots.includes(p)) return true; return o.name === 'contactBlob'; };
  L5B.gradeWorld(scene, P5B(spec.look4), skip);
  const plain = M4.tex4('plaster')?.normalMap, seen = new Set();   // set relief: baked statics and the gondolas get their pattern's normal map back as an emboss
  scene.traverse(o => { if (skip(o) || !o.isMesh || !o.geometry?.attributes?.uv) return; if (!(o.material?.userData?.baked || [].concat(o.material).some(m => m?.userData?.baked) || /^gondola_/.test(o.name))) return;
    for (const m of [].concat(o.material)) { if (!m?.isMeshBasicMaterial || seen.has(m) || m.transparent || m.toneMapped === false) continue; seen.add(m); const pat = m.userData?.pattern4 && M4.tex4(m.userData.pattern4);
      L5B.patchRelief(m, pat?.normalMap ?? plain, pat && m.map ? [m.map.repeat.x, m.map.repeat.y] : [1, 1], U5B); } }); }   // Look 5b: environment −0.15 EV, 5 % cooler (baked vertex light × material colour)
const updateExtras = (t, ctx = {}) => { crowds.update(t, ctx); fill?.update(t, {camY: ctx.camPos?.[1] ?? ctx.camPos?.y ?? 0, shotFill: ctx.fill}); ui.update(t); };   // ctx {camPos, size}: crowd promotion (A5 B)

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

// format v5 story props (opt-in spec.props): toy props (parts/sets4/props4.js) placed and moved by timelines —
//   {id, prop, seed, scale, pos: [[t, [x, y, z]], [t, [x, y, z], 'ramp']…], rot: [[t, [x°, y°, z°]]…], visible: [[t, bool]…]}; named `prop_<id>`.
const storyProps = [];
if (spec.props?.length) { const {toyProp} = await import('../parts/sets4/props4.js'), P7 = spec.props.some(p => p.set === 'props7') ? (await import('../parts/sets4/props7.js')).PROPS7 : null;
  for (const p of spec.props) { const g = p.set === 'props7' ? P7[p.prop](p.p ?? {}) : toyProp(p.prop, p.seed ?? 1, p); if (g.userData.ready) await g.userData.ready; g.name = 'prop_' + p.id; g.scale.setScalar(p.scale ?? 1); g.traverse(o => { o.userData.live = true; }); scene.add(g); storyProps.push({p, g}); } }   // Touch Grass E1 (opt-in p.set 'props7'): props7 builders, p.p = builder options
// tuft 1B (opt-in spec.glowCubes [{at, size, color, hdr}]): emissive stand-ins (a glowing beast); HDR (> 1) only under post 'cine'
const glowCubes = (spec.glowCubes ?? []).map((g, i) => { const m = new T.Mesh(new T.BoxGeometry(g.size ?? 1.2, g.size ?? 1.2, g.size ?? 1.2), new T.MeshBasicMaterial({color: g.color ?? '#7fe8ff'}));
  m.material.userData.glow = 1; if (g.hdr) m.material.userData.glowHDR = g.hdr; m.position.set(...g.at); m.userData.live = true; m.name = 'glowCube_' + i; scene.add(m); return m; });
const CL = CINE_LOOK ? (await import('./cinelook.js')).createCineLook({renderer, scene, spec, aa: q.get('aa') !== '0'}) : null, CINE_OPTS = {bloom: true, grain: true, actorLight: true};
// 1B fix: each actor's head centre above its root at load (rest pose, root yaw ignored: the head sits over the root axis)
const CINE_HEAD = {}; if (CINE_CAM) for (const [n, x] of Object.entries(cast)) if (x.v2) { x.a.root.updateMatrixWorld(true); const b = new T.Box3().setFromObject(x.a.pivots.head, true), c = b.getCenter(new T.Vector3()); CINE_HEAD[n] = [0, c.y - x.a.root.position.y, 0]; }
if (CL) { const roots = new Set(Object.values(cast).map(x => x.a.root)); CL.markGlow(scene, o => { for (let p = o; p; p = p.parent) if (roots.has(p)) return true; return false; }); CL.lightActors([...roots]); }
// E1 fix (opt-in spec.hide): set objects hidden by name (a story prop replaces them)
for (const n of spec.hide ?? []) { const o = scene.getObjectByName(n); if (o) o.visible = false; else console.warn('spec.hide: no object ' + n); }
const vecAt = (keys, t, d) => keys?.length ? d.map((v, i) => valueAt(keys.map(k => [k[0], k[1][i], k[2], k[3]]), t, v)) : d;
function updateProps(t) { for (const {p, g} of storyProps) { g.position.fromArray(vecAt(p.pos, t, [0, 0, 0])); const r = vecAt(p.rot, t, [0, 0, 0]); g.rotation.set(...r.map(v => v * Math.PI / 180)); g.visible = valueAt(p.visible, t, true); if (g.visible && g.userData.anim) g.userData.anim(t - (p.animAt ?? 0), p);
  if (p.states && g.userData.setState) { const st = valueAt(p.states, t, null); if (st !== null && st !== g.userData.state) g.userData.setState(st); }   // Touch Grass E1 (opt-in): step states (headset on/off, visor screen)
  if (p.flick && g.userData.setFlick) g.userData.setFlick(valueAt(p.flick, t, 0)); } }   // Touch Grass E1 (opt-in): giant finger flick u (ramp keys); E1 fix (opt-in): props5 moving parts, pure in t
// World story state (Session 5): spec.worldState = {name: [[t, value], [t, value, 'ramp']...]} → world.setState.
function applyWorldState(shot, t) {
  if (storyProps.length) updateProps(t);
  if (!world) return;
  const ws = spec.worldState ?? {};
  if (!ws.cracks) world.setCracks?.(shot?.stoneCracks ?? spec.stoneCracks ?? 1);   // the clue grows (script lines 14–15)
  if (world.setState) for (const [k, keys] of Object.entries(ws)) world.setState(k, valueAt(keys, t));
}

let lastSize = '';
// nudge (world units, along the camera's right+up+back diagonal): the stability test renders each view twice,
// 4 mm apart. A purely sideways move hides ground-plane z-fighting; changing the view angle exposes it.
// format v5 splitScreen: two cameras, top and bottom halves, a 6 px dark divider
function renderSplit(cams, width, height) {
  const H = Math.floor(height / 2); renderer.setScissorTest(true);
  cams.forEach((cc, i) => { const y = i === 0 ? height - H : 0; renderer.setViewport(0, y, width, H); renderer.setScissor(0, y, width, H);
    camera.fov = cc.fov; camera.aspect = width / H; camera.position.fromArray(cc.position); camera.up.set(0, 1, 0); camera.lookAt(...cc.target); camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true); renderer.render(scene, camera); });
  renderer.setViewport(0, H - 3, width, 6); renderer.setScissor(0, H - 3, width, 6); renderer.setClearColor('#111318', 1); renderer.clear(true, true, false);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, width, height);
}
export function renderFrame(n, width = 720, height = 1280, nudge = 0) {
  if (!Number.isInteger(n) || n < 0 || n >= FRAMES) throw Error(`frame out of range: ${n}`);
  const t0 = performance.now();
  if (lastSize !== `${width}x${height}`) { renderer.setPixelRatio(1); renderer.setSize(width, height, false); lastSize = `${width}x${height}`; }
  const shot = shots.findLast(s => n >= s.start), mf = motionFrame(n, shot, FPS), offs = LOOK5B ? blurOffsets(shot.move, P5B(shot.look ?? spec.look4).motionBlur) : [0];   // format v5: freeze / impact / step (shots without them: mf.anim = n)
  if (offs.length > 1) { const rts = offs.map((o, i) => blurTarget(i, width, height)); let c;
    offs.forEach((o, i) => { renderer.setRenderTarget(rts[i]); c = drawFrame(shot, mf, o, width, height, nudge); }); renderer.setRenderTarget(null); blendTargets(rts);
    effects.overlay((mf.anim) / FPS, camera, width / height); return finishFrame(n, shot, t0); }
  const t = mf.anim / FPS, c = drawFrame(shot, mf, 0, width, height, nudge);
  effects.overlay(t, camera, width / height);
  return finishFrame(n, shot, t0);
}
// Look 5b motion blur: two sub-frame targets, averaged by a fullscreen quad (only whip / crashZoom shots of a look5b spec).
const blurRTs = [], blurQuad = (() => { const m = new T.ShaderMaterial({uniforms: {a: {value: null}, b: {value: null}}, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: 'uniform sampler2D a; uniform sampler2D b; varying vec2 vUv; void main(){ gl_FragColor = .5 * (texture2D(a, vUv) + texture2D(b, vUv));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}', depthTest: false, depthWrite: false});   // linear HDR targets: tone map + encode once, after the average
  const q = new T.Mesh(new T.PlaneGeometry(2, 2), m); q.frustumCulled = false; const sc = new T.Scene(); sc.add(q); return {m, sc, cam: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1)}; })();
function blurTarget(i, w, h) { if (!blurRTs[i] || blurRTs[i].width !== w || blurRTs[i].height !== h) { blurRTs[i]?.dispose(); blurRTs[i] = new T.WebGLRenderTarget(w, h, {type: T.HalfFloatType}); } return blurRTs[i]; }   // no MSAA: the average hides the stair-steps (cost)
function blendTargets(rts) { blurQuad.m.uniforms.a.value = rts[0].texture; blurQuad.m.uniforms.b.value = rts[1].texture; renderer.render(blurQuad.sc, blurQuad.cam); }
function finishFrame(n, shot, t0) {
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));   // forces the GPU work to finish, so ms is real
  if (gl.isContextLost()) throw Error('WebGL context lost');
  return {frame: n, shot: shot.id, size: shot.size, triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}
// One scene state + render at frame mf (+ off frames, Look 5b sub-frames), into the current render target.
function drawFrame(shot, mf, off, width, height, nudge) {
  const t = (mf.anim + off) / FPS;
  if (CLEARED.length) unclear();
  setHeroLit(shot); const actors = poseCast(t);
  const lt = M6 && shot.still ? 0 : Math.max(0, (mf.cam + off - shot.start) / FPS), c = CINE_CAM ? sampleCineShot(shot, lt, width / height) : sampleCamera({...shot, fps: FPS}, lt, actors);   // P5b `still` (moods only): the camera is locked at its first frame
  if (mf.shake.some(v => v)) c.position = c.position.map((v, i) => v + mf.shake[i]);
  if (LODS.length) applyLod(c.position, t);
  if (shot.clear && c.position && c.target) applyClear(shot, c.position, c.target, c.fov, width / height);
  updateCascades(t);
  const tw = M6 && shot.still ? shot.start / FPS : t;   // P5b `still` shot (moods only): the world's own movers, crowds and clouds hold their first-frame state
  world?.update(tw); applyWorldState(shot, t); S6?.frame(t); updateExtras(tw, {camPos: c.position, size: shot.size, fill: shot.fill}); aimHeroSpots(shot, c.position); aimRim(shot, c.position); applyLift(shot); liftSubject(shot); glowProp(shot);
  const fx = effects.apply(t, camera);   // poses effect targets; returns the shake offset and any timeOfDay blend
  const pos = c.position.map((v, i) => v + fx.camOffset[i]), tgt = c.target.map((v, i) => v + fx.camOffset[i] * .6);
  camera.fov = c.fov; camera.aspect = width / height; camera.position.fromArray(pos);
  camera.up.set(0, 1, 0); camera.lookAt(...tgt); camera.rotateZ(c.roll); camera.updateProjectionMatrix();
  if (CINE_CAM && c.noise) { camera.rotateX(c.noise[0]); camera.rotateY(c.noise[1]); camera.rotateZ(c.noise[2]); }   // tuft 1B handheld (rotation only)
  const cn = CINE_CAM ? null : camNoise5b(shot, t) ?? (M6 && M6.moodUniforms(shot).camNoise ? camNoise(t, shots.indexOf(shot) + 1, M6.moodUniforms(shot).camNoise) : null); if (cn) { camera.rotateX(cn[0]); camera.rotateY(cn[1]); }   // Look 5b: static-shot micro-noise
  if (nudge) { const k = nudge / Math.sqrt(3); camera.translateX(k); camera.translateY(k); camera.translateZ(k); }
  world?.onCamera?.(camera.position.toArray());   // format v5 3b-R (opt-in): a world may hide what this camera cannot see (hall ↔ street)
  if (look) { fx.look ? look.apply(...fx.look) : look.apply(shot.look ?? spec.look ?? 'day'); if (shot.key) look.apply(keyPreset(look.preset, camera.position.toArray(), tgt, shot.key));   // E1b (opt-in shot.key {el, offset}): key light from the camera side
    const sf = shotShadow(shot); poseCast(t); look.frameFixed(sf.centre, sf.radius, camera.position); look.update(tw); }
  apply5b(shot); apply6(shot, t); applyMood(shot, mf.anim);
  scene.updateMatrixWorld(true); effects.apply(t, camera); fitTags(scene, camera, {maxFrac: shot.tagMaxFrac ?? .06});
  if (spec.readableUi ?? !!look?.v3) { scene.updateMatrixWorld(true); enforceReadable(scene, camera, {focus: shot.focusUi ?? []}); }   // A5 §C: min text size + safe area (v3 worlds; "Nobody" untouched)
  renderer.info.autoReset = false; renderer.info.reset();   // A4: overlay passes (weather, cards) must not reset the scene counts
  const undoBD = BD?.pre(camera, shot);
  if (c.split) renderSplit(c.split, width, height); else if (CL) cineRender(shot, mf, off, lt, width, height); else renderer.render(scene, camera);
  undoBD?.();
  return c;
}
// tuft 1B: the cine camera for a shot at local time lt (engine/cine.js; actors on their marks for the follow / framing simulation)
function cineCtx(shot, aspect) {
  const t0 = shot.start / FPS, subj = shot.subject && cast[shot.subject]?.v2 ? cast[shot.subject] : null;
  let eyes = null, face = null, headH = 1.2;
  if (subj) { const h = headOf(subj).toArray(), r = subj.a.root.position, off = [h[0] - r.x, h[1] - r.y, h[2] - r.z];   // eye point = the posed head, carried along the mark
    eyes = tt => { const mk = markAt(subj.c, t0 + tt); return [mk[0] + off[0], mk[1] + off[1], mk[2] + off[2]]; }; face = tt => { const yw = (markOf(subj.c, t0 + tt).yaw ?? 0) * Math.PI / 180; return [Math.sin(yw), Math.cos(yw)]; }; headH = 1.2 * subj.a.root.scale.x; }   // 1B fix: facing = the mark's yaw (pure in t: same frame = same camera in any render order)
  // 1B fix: every v2 actor's eye point (posed head offset carried along its mark), head and body height → size band + all-subjects head fit
  const hoff = Object.fromEntries(Object.entries(cast).filter(([, x]) => x.v2).map(([n, x]) => [n, {off: CINE_HEAD[n] ?? [0, 4.6 * x.a.root.scale.y, 0], s: x.a.root.scale.x, c: x.c}]));   // rest-pose head centre (measured once at load: same frame = same camera in any render order)
  const headsAt = tt => Object.fromEntries(Object.entries(hoff).map(([n, o]) => { const mk = markAt(o.c, t0 + tt); return [n, {eyes: [mk[0] + o.off[0], mk[1] + o.off[1], mk[2] + o.off[2]], headH: 1.2 * o.s, H: 5.3 * o.s}]; }));
  return {fps: FPS, aspect, cacheKey: `${shot.id}|${shot.start}|${aspect.toFixed(4)}`, headH, eyesAt: eyes, faceAt: face, headsAt, actorsAt: tt => Object.fromEntries(Object.entries(cast).map(([n, x]) => [n, markAt(x.c, t0 + tt)]))};
}
const sampleCineShot = (shot, lt, aspect) => CINE.sampleCine({...shot, fps: FPS}, lt, cineCtx(shot, aspect));
const cineCam0 = {};
function cineRender(shot, mf, off, lt, width, height) {
  const gy = (x, z) => world?.groundY?.(x, z) ?? 0, items = [];
  for (const [n, x] of Object.entries(cast)) { const r = x.a.root; items.push({key: n, x: r.position.x, y: r.position.y, z: r.position.z, r: 1.35 * r.scale.x, visible: r.visible && !!visibleChain(r)}); }
  glowCubes.forEach((m, i) => items.push({key: 'glow' + i, x: m.position.x, y: m.position.y - m.geometry.parameters.height / 2, z: m.position.z, r: .8 * m.geometry.parameters.width, visible: m.visible}));
  CL.blobsFor(items, gy);
  const k = `${shot.id}|${shot.start}`; if (shot.fg && !cineCam0[k]) { const c0 = CINE_CAM ? sampleCineShot(shot, 0, width / height) : sampleCamera({...shot, fps: FPS}, 0, poseCast(shot.start / FPS));
    const s = shot.subject && cast[shot.subject] ? CINE.project(c0, headOf(cast[shot.subject]).toArray(), width / height).x : 0; cineCam0[k] = {c0, s}; poseCast(mf.anim / FPS); }
  CL.fg(CINE_OPTS.fg === false ? {...shot, fg: null} : shot, cineCam0[k]?.c0, cineCam0[k]?.s ?? 0);
  if (scene.fog?.isFog) { const fs = CL.FOG.start; if (scene.fog.near < fs) { scene.fog.far += fs - scene.fog.near; scene.fog.near = fs; } }   // 1B fix: no distance fog within FOG.start (look.apply resets it each frame)
  const hd = n => cast[n] ? camera.position.distanceTo(headOf(cast[n])) : null, focus = shot.subject && cast[shot.subject] ? CINE.focusAt(shot, lt, hd) : null;
  if (CINE_OPTS.actorLight) {   // 1B fix: actors-only rim (behind-above, far side from the camera) + warm key from the nearest world practical
    const sx = shot.subject && cast[shot.subject] ? cast[shot.subject].a.root : Object.values(cast).find(x => x.a.root.visible)?.a.root, y = sx?.rotation.y ?? 0;
    CL.state.actorLight = CL.aimActorLight(sx ? sx.position.toArray() : camera.position.toArray(), camera.position.toArray(), [Math.sin(y), Math.cos(y)], world?.lights ?? []);
  } else CL.setActorLight(false);
  const ex = renderer.toneMappingExposure; if (!M6) renderer.toneMappingExposure *= 2 ** CL.moodEV(shot);   // exposure per mood (mood6.json ev; spec.moods applies it itself)
  scene.updateMatrixWorld(true); const sz = shot.subject && cast[shot.subject]?.a.root.visible ? headOf(cast[shot.subject]).sub(camera.position).dot(camera.getWorldDirection(new T.Vector3())) : null;   // the subject's view depth (background falloff)
  CL.render(camera, {w: width, h: height, shot, frame: Math.round(mf.cam + off), focus, subjectZ: sz, bgOn: CINE_OPTS.bgFalloff !== false, fogColor: spec.cineFog ? new T.Color(spec.cineFog) : null, bloomOn: CINE_OPTS.bloom, grainOn: CINE_OPTS.grain});
  CL.state.subjectDist = shot.subject ? hd(shot.subject) : null; CL.state.rackDist = shot.rack ? hd(shot.rack.to) : null; CL.state.rackFromDist = shot.rack ? hd(shot.rack.from ?? shot.subject) : null; CL.state.lt = lt; renderer.toneMappingExposure = ex;
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
  world?.update(t); applyWorldState(null, t); world?.onCamera?.(camera.position.toArray()); updateExtras(t); scene.updateMatrixWorld(true); fitTags(scene, camera); renderer.render(scene, camera);
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
    const tp = a.parts?.torso, torso = tp ? projBox(new T.Box3().setFromObject(tp)) : null;   // Toy House final fix (P3): head + shoulders = head ∪ torso top
    out[name] = {front, box: {x0, x1, y0, y1}, feet: py(0), shoulder: py(.6 * H), top: py(1.02 * H), troupe: c.troupe ?? null, face, torso, opacity: a.preset?.opacity ?? 1};
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
// Toy House final fix gates (scripts/v2/toyhouse-gates.js), after renderFrame(n): actor + story-prop projected boxes,
// footprints (actors: mark + radius; props: world xz box), background luma (frame minus actors) and, with floor: true,
// a mask of flat ground meshes (floor flicker). Read-only: renders masks into the default framebuffer like readMeasure.
export function gateMeasure(n, {w = 270, h = 480, floor = false, render = true} = {}) {
  if (render) renderFrame(n, w, h); camera.updateMatrixWorld(true); scene.updateMatrixWorld(true);
  const luma = frameLuma(w, h), actors = measureFrame(), props = {}, prints = [];
  for (const {p, g} of storyProps) { if (!visibleChain(g)) continue; const b = new T.Box3(); g.traverse(o => { if (o.isMesh && visibleChain(o) && !o.isSprite && !o.isPoints) b.expandByObject(o); });
    if (b.isEmpty()) continue; props[p.id] = projBox(b); prints.push({id: p.id, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, y0: b.min.y, y1: b.max.y}); }
  const tools = {}; for (const [name, c] of Object.entries(cast)) { const tl = c.a.tool; if (tl && visibleChain(tl)) tools[name] = {name: tl.name, ...projBox(new T.Box3().setFromObject(tl))}; }
  const roots = Object.values(cast).filter(c => c.v2 && visibleChain(c.a.root)).map(c => c.a.root);
  const am = roots.length ? maskPass(o => roots.some(r => under(o, r)), w, h) : new Uint8Array(w * h);
  let s = 0, k = 0; for (let i = 0; i < luma.length; i++) if (!am[i]) { s += luma[i]; k++; }
  const out = {frame: n, actors, props, tools, prints, places: placesNow(), bgLuma: k ? s / k : 0, luma: Array.from(luma, v => Math.round(v * 255))};
  if (floor) { const flat = o => { if (!o.geometry) return false; const b = new T.Box3().setFromObject(o), sz = b.getSize(new T.Vector3()); return sz.y < .35 * Math.max(sz.x, sz.z) && b.max.y < 1.2; };
    // visible floor only: floor meshes white, every other visible mesh black (it occludes), sprites/points/lines hidden
    const white = new T.MeshBasicMaterial({color: '#ffffff'}), black = new T.MeshBasicMaterial({color: '#000000'}), saved = [];
    const bs = new T.SpriteMaterial({color: '#000000'}), bp = new T.PointsMaterial({color: '#000000', size: 1});   // smoke, sparks: they cover the floor (not counted)
    scene.traverse(o => { if (!o.visible) return; if (o.isSprite || o.isPoints) { saved.push([o, o.material]); o.material = o.isSprite ? bs : Object.assign(bp.clone(), {size: o.material.size ?? 1, sizeAttenuation: o.material.sizeAttenuation ?? true}); return; } if (o.isLine) { saved.push([o, null]); o.visible = false; return; } if (!o.isMesh) return; saved.push([o, o.material]); o.material = (!roots.some(r => under(o, r)) && flat(o)) ? white : black; });
    const bg = scene.background, fog = scene.fog; scene.background = new T.Color('#000000'); scene.fog = null; renderer.render(scene, camera); scene.background = bg; scene.fog = fog;
    for (const [o, m] of saved) { if (m === null) o.visible = true; else o.material = m; }
    const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); const fm = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fm[y * w + x] = px[((h - 1 - y) * w + x) * 4] > 127 ? 1 : 0;
    out.floor = Array.from(fm); white.dispose(); black.dispose(); }
  return out;
}
export function placesAt(n) { const t = n / FPS; poseCast(t); if (storyProps.length) updateProps(t); scene.updateMatrixWorld(true);
  const prints = []; for (const {p, g} of storyProps) { if (!visibleChain(g)) continue; const b = new T.Box3(); g.traverse(o => { if (o.isMesh && visibleChain(o) && !o.isSprite && !o.isPoints) b.expandByObject(o); }); if (!b.isEmpty()) prints.push({id: p.id, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, y0: b.min.y, y1: b.max.y}); }
  return {places: placesNow().filter(m => m.name), prints}; }
export function shotSpeed(i) {   // Toy House final fix: props first (kart riders); the metric's end sample (t = duration) is the next shot's first frame, so the
  const s = shots[i], P = tt => { const t = s.start / FPS + tt; if (storyProps.length) updateProps(t); return JSON.parse(JSON.stringify(poseCast(t))); }, last = (s.frames - 1) / FPS;   // actors there are extrapolated from the shot's last two frames
  return maxTargetSpeed({...s, fps: FPS, openHit: false}, tt => { if (tt <= last + 1e-9) return P(tt); const a = P(last - 1 / FPS), b = P(last), k = (tt - last) * FPS; for (const n of Object.keys(b)) if (a[n]) b[n] = b[n].map((v, q) => v + (v - a[n][q]) * k); return b; }, FPS); }

// format v5 3b-R gates (scripts/v2/toy5-gates.js), all after renderFrame(n):
//   satMeasure: mean HSL saturation of subject pixels (cast actors + every object tagged userData.story, the silhouette mask path)
//   vs everything else; depthLuma: RMS luma contrast of pixels nearer than `near` vs farther than `far` (a distance pass);
//   lumaProbe: mean luma (3×3) at projected world points.
function frameRGBA(w, h) { const gl = renderer.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; }
const satOf = (r, g, b) => { const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn; return d < 1e-6 ? 0 : d / (1 - Math.abs(2 * l - 1)); };
export function satMeasure(n, {w = 390, h = 693} = {}) {
  renderFrame(n, w, h); const px = frameRGBA(w, h), roots = [];
  for (const x of Object.values(cast)) if (x.a.root.visible) roots.push(x.a.root);
  scene.traverse(o => { if (o.userData?.story && visibleChain(o)) roots.push(o); });
  const m = maskPass(o => roots.some(r => under(o, r)) && !(o.material?.transparent && o.material.opacity < .5), w, h);
  let ss = 0, sn = 0, bs = 0, bn = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((h - 1 - y) * w + x) * 4, s = satOf(px[i], px[i + 1], px[i + 2]); if (m[y * w + x]) { ss += s; sn++; } else { bs += s; bn++; } }
  return {frame: n, subj: sn ? ss / sn : 0, bg: bn ? bs / bn : 0, subjPx: sn, ratio: sn && bs ? (ss / sn) / (bs / bn) : 0, subjects: roots.length};
}
const distMat = new T.ShaderMaterial({vertexShader: `varying vec3 vw;
void main(){ vec4 p = vec4(position, 1.);
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
#endif
  vec4 wp = modelMatrix * p; vw = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: 'varying vec3 vw; void main(){ float d = min(length(vw - cameraPosition), 1000.); gl_FragColor = vec4(floor(d / 4.) / 255., fract(d / 4.), 1., 1.); }'});
export function depthLuma(n, {w = 390, h = 693, near = 15, far = 60} = {}) {
  renderFrame(n, w, h); const L = frameLuma(w, h), hidden = []; scene.traverse(o => { if ((o.isSprite || o.isPoints || o.isLine || (o.isMesh && [].concat(o.material).some(m => m.transparent))) && o.visible) { hidden.push(o); o.visible = false; } });
  const bg = scene.background, fog = scene.fog; scene.background = new T.Color('#000000'); scene.fog = null; scene.overrideMaterial = distMat; renderer.render(scene, camera);
  const px = frameRGBA(w, h); scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; for (const o of hidden) o.visible = true;
  const acc = {near: [], far: []}; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((h - 1 - y) * w + x) * 4; if (px[i + 2] < 128) continue; const d = (px[i] + px[i + 1] / 255) * 4, l = L[y * w + x]; if (d < near) acc.near.push(l); else if (d > far) acc.far.push(l); }
  const rms = a => { if (a.length < 50) return null; const mu = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - mu) ** 2, 0) / a.length); };
  return {frame: n, nearRms: rms(acc.near), farRms: rms(acc.far), nearPx: acc.near.length, farPx: acc.far.length, ratio: rms(acc.near) && rms(acc.far) !== null ? rms(acc.far) / rms(acc.near) : null};
}
export function lumaProbe(n, points, {w = 540, h = 960} = {}) {
  renderFrame(n, w, h); camera.updateMatrixWorld(true); const L = frameLuma(w, h);
  return points.map(p => { const v = new T.Vector3(...p).project(camera), x = Math.round((v.x * .5 + .5) * w), y = Math.round((-v.y * .5 + .5) * h); let s = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += L[yy * w + xx]; k++; } } return {p, x, y, luma: k ? s / k : null}; });
}
// Look 5b gates (scripts/v2/sep5b-gates.js), after renderFrame(n) at w×h:
//   sepMeasure: the subject's silhouette (actor-only pass) → rim = mean luma of the 3 px inner edge band / the eroded interior;
//   link = subject mean luma / background mean luma; head = 20th / 99th percentile luma of the head block (ink < .12 excluded);
//   lap = Laplacian variance of the background (≥ 3 px outside) / the actor interior; contact = mean luma beside the feet
//   (inside the blob, off the silhouette) vs 1 unit further out.
//   classHaze: RMS luma contrast of gondola-frame pixels (the same class of object) nearer than `near` vs farther than `far`.
function erode(m, w, h, k) { let a = m; for (let i = 0; i < k; i++) { const b = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const j = y * w + x; b[j] = a[j] && a[j - 1] && a[j + 1] && a[j - w] && a[j + w] ? 1 : 0; } a = b; } return a; }
const dilate = (m, w, h, k) => { const inv = m.map(v => 1 - v); return erode(inv, w, h, k).map(v => 1 - v); };
export function sepMeasure(n, {w = 540, h = 960, subject = null} = {}) {
  const shot = shots.findLast(s => n >= s.start), who = subject ?? shot.subject; renderFrame(n, w, h); camera.updateMatrixWorld(true);
  if (!who || !cast[who]?.a.root.visible) return {frame: n, missing: who};
  const L = frameLuma(w, h), m = actorMask(who, w, h), inner = erode(m, w, h, 3), outer = dilate(m, w, h, 3);
  let band = 0, bn = 0, int = 0, inn = 0, bg = 0, bgn = 0; for (let i = 0; i < w * h; i++) { if (m[i] && !inner[i]) { band += L[i]; bn++; } if (inner[i]) { int += L[i]; inn++; } if (!m[i]) { bg += L[i]; bgn++; } }
  const out = {frame: n, shot: shot.id, size: shot.size, subject: who, px: bn + inn, rim: bn && inn ? (band / bn) / (int / inn) : null, link: inn && bgn ? ((band + int) / (bn + inn)) / (bg / bgn) : null};
  // Look 6 (owner, 8159612): value targets (subject mean luma, background mean luma) + local contrast in either direction against the
  // background within 1.5 body widths (the subject's bounding box grown by 1.5 × its width on every side, subject pixels excluded)
  { let x0 = w, x1 = -1, y0 = h, y1 = -1; for (let i = 0; i < w * h; i++) if (m[i]) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bw = x1 - x0 + 1, X0 = Math.max(0, x0 - 1.5 * bw), X1 = Math.min(w - 1, x1 + 1.5 * bw), Y0 = Math.max(0, y0 - 1.5 * bw), Y1 = Math.min(h - 1, y1 + 1.5 * bw); let ls = 0, ln = 0;
    for (let y = Y0 | 0; y <= Y1; y++) for (let x = X0 | 0; x <= X1; x++) { const j = y * w + x; if (!outer[j]) { ls += L[j]; ln++; } }
    out.subjL = (band + int) / Math.max(1, bn + inn); out.bgL = bg / Math.max(1, bgn); out.localBg = ln ? ls / ln : null; out.contrast = out.localBg ? localContrast(out.subjL, out.localBg) : null; out.bodyPx = bw; }
  const head = cast[who].a.parts?.head; if (head) { const hm = maskPass(o => o === head, w, h); let L1 = null;
    if (U5B) { const sv = U5B.shadeOf[who], k = sv.value; sv.value = 1; renderer.render(scene, camera); L1 = frameLuma(w, h); sv.value = k; }   // shadow side = head pixels the key shading darkens by > 10 %
    const v = [], sh = []; for (let i = 0; i < w * h; i++) if (hm[i] && m[i] && L[i] >= .12) { v.push(L[i]); if (L1 && L[i] < .9 * L1[i]) sh.push(L[i]); } v.sort((a, b) => a - b);
    out.head = v.length > 30 ? {px: v.length, shadowPx: sh.length, shadow: sh.length > 20 ? sh.reduce((a, b) => a + b, 0) / sh.length : v[Math.floor(.2 * v.length)], high: v[Math.floor(.99 * (v.length - 1))]} : null; }
  const lap = new Float32Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const j = y * w + x; lap[j] = 4 * L[j] - L[j - 1] - L[j + 1] - L[j - w] - L[j + w]; }
  const vr = sel => { let s1 = 0, s2 = 0, k = 0; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const j = y * w + x; if (!sel(j)) continue; s1 += lap[j]; s2 += lap[j] * lap[j]; k++; } return k > 50 ? s2 / k - (s1 / k) ** 2 : null; };
  out.lapActor = vr(j => inner[j]); out.lapBg = vr(j => !outer[j]); out.lap = out.lapActor && out.lapBg ? out.lapBg / out.lapActor : null;
  const mk = markPos[who], b5 = blobs5b[who]; if (mk && b5) { const R = b5.geometry.parameters.width / 2, right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize(), gy = (x, z) => world?.groundY?.(x, z) ?? mk[1];
    const probe = r => { let s = 0, k = 0; for (let q8 = 0; q8 < 8; q8++) { const an = q8 * Math.PI / 4, x = mk[0] + r * Math.cos(an), z = mk[2] + r * Math.sin(an), v = new T.Vector3(x, gy(x, z) + .02, z).project(camera), px = Math.round((v.x * .5 + .5) * w), py = Math.round((-v.y * .5 + .5) * h);
      if (px < 1 || py < 1 || px >= w - 1 || py >= h - 1 || outer[py * w + px]) continue; s += L[py * w + px]; k++; } return k ? s / k : null; };
    const r0 = Math.max(.5 * R, 1.25 * cast[who].a.root.scale.x), a0 = probe(r0), a1 = probe(r0 + 1); out.contact = a0 !== null && a1 ? {under: a0, floor: a1, drop: 1 - a0 / a1, r: r0} : null; }
  return out;
}
// Look 6: ceiling luma = median luma of the pixels the ceiling plane covers (meshes whose bounds start at ≥ ceilingY), null when unseen.
export function ceilingLuma(n, {w = 390, h = 693, ceilingY = 35.9} = {}) {
  renderFrame(n, w, h); const L = frameLuma(w, h), isC = o => { if (!o.isMesh || o.isInstancedMesh) return false; const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = new T.Box3().copy(g.boundingBox).applyMatrix4(o.matrixWorld); return b.min.y >= ceilingY && b.max.y <= ceilingY + .6; };   // the flat ceiling plane only
  const sw = [], hid = []; scene.traverse(o => { if (!o.visible) return; if (o.isSprite || o.isPoints || o.isLine || (o.isMesh && [].concat(o.material).some(m => m.transparent))) { hid.push(o); o.visible = false; return; } if (o.isMesh) { sw.push([o, o.material]); o.material = isC(o) ? maskMat : blackMat; } });
  const bg = scene.background, fog = scene.fog; scene.background = new T.Color('#000000'); scene.fog = null; renderer.render(scene, camera); const px = frameRGBA(w, h); scene.background = bg; scene.fog = fog;
  for (const [o, m] of sw) o.material = m; for (const o of hid) o.visible = true;   // occlusion-aware: only ceiling pixels nothing stands in front of
  const v = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[((h - 1 - y) * w + x) * 4] > 127) v.push(L[y * w + x]); v.sort((a, b) => a - b); return {frame: n, px: v.length, median: v.length > 50 ? v[v.length >> 1] : null};
}
const occMat = new T.MeshBasicMaterial({colorWrite: false}), blackMat = new T.MeshBasicMaterial({color: '#000000'});
export function classHaze(n, {w = 390, h = 693, near = 15, far = 60, match = /^gondola_/} = {}) {
  renderFrame(n, w, h); const L = frameLuma(w, h), swapped = [], hidden = [];
  scene.traverse(o => { if (!o.visible) return; if (o.isSprite || o.isPoints || o.isLine || (o.isMesh && [].concat(o.material).some(m => m.transparent))) { hidden.push(o); o.visible = false; return; } if (!o.isMesh) return;
    swapped.push([o, o.material]); o.material = match.test(o.name) && Array.isArray(o.material) ? o.material.map((m, i) => (/_far_/.test(o.name) ? i === 1 : i === 0) ? distMat : occMat) : occMat; });
  const bg = scene.background, fog = scene.fog; scene.background = new T.Color('#000000'); scene.fog = null; renderer.render(scene, camera);
  const px = frameRGBA(w, h); scene.background = bg; scene.fog = fog; for (const [o, m] of swapped) o.material = m; for (const o of hidden) o.visible = true;
  const acc = {near: [], far: []}; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((h - 1 - y) * w + x) * 4; if (px[i + 2] < 128) continue; const d = (px[i] + px[i + 1] / 255) * 4; if (d < near) acc.near.push(L[y * w + x]); else if (d > far) acc.far.push(L[y * w + x]); }
  const rms = a => { if (a.length < 50) return null; const mu = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - mu) ** 2, 0) / a.length); };
  const rn = rms(acc.near), rf = rms(acc.far); return {frame: n, nearRms: rn, farRms: rf, nearPx: acc.near.length, farPx: acc.far.length, ratio: rn && rf !== null ? rf / rn : null};
}
const hugCam = p => { const f = Math.round(p.key * FPS), sh = shots.findLast(s => f >= s.start), t = f / FPS, actors = poseCast(t), c = sampleCamera({...sh, fps: FPS}, (f - sh.start) / FPS, actors); const lp = markAt(cast[p.lead].c, t); return {camPos: [c.position[0], c.position[2]], leadPos: [lp[0], lp[2]], partnerPos: p.mark}; };
// tuft 1B fix gates: per actor, the head's NDC box (every visible vertex of the head pivot subtree: head, face, hair, projected) and the size measure
// v = frame height at the head's depth / body height (5.3 × scale), for the camera of the last rendered frame
function cineMeasure(names = Object.keys(cast)) {
  const out = {}, b = new T.Box3(), v = new T.Vector3(), f = new T.Vector3(); camera.updateMatrixWorld(); camera.getWorldDirection(f);
  for (const n of names) { const x = cast[n]; if (!x?.v2 || !x.a.root.visible) continue; b.setFromObject(x.a.pivots.head, true); let x0 = 9, x1 = -9, y0 = 9, y1 = -9, behind = false;
    x.a.pivots.head.traverse(o => { if (!o.isMesh || !visibleChain(o)) return; const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);   // every head vertex (head, face, hair) projected: the exact extent
      if (v.clone().sub(camera.position).dot(f) <= 0) behind = true; v.project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } });
    const c = b.getCenter(new T.Vector3()), z = c.clone().sub(camera.position).dot(f);
    out[n] = {x0, x1, y0, y1, behind, v: 2 * z * Math.tan(camera.fov * Math.PI / 360) / (5.3 * x.a.root.scale.y), z}; }
  return out; }
window.__episode = {cine: CL ? {state: CL.state, opts: CINE_OPTS, glowCount: CL.glowCount, setGlow: CL.setGlow, measure: cineMeasure} : null, story6: S6, clearedNow: () => CLEARED.map(r => r.name), actingPlan: () => actPlans.map(p => /^hug/.test(p.verb) ? {...p, cam: hugCam(p)} : p), groundFix: () => GROUNDFIX, sepMeasure, ceilingLuma, classHaze, satMeasure, depthLuma, lumaProbe, debug: {scene, renderer, camera, look, pool: U5B?.poolOf ?? null}, bake: BAKE, matcapBytes: MATCAP ? (n => Array.from(look.matcapBytes(n ?? spec.look4))) : null, breakdown, measureFrame, seasonMeasure, actorMask, readMeasure, gateMeasure, placesAt, lumaAt, inspectFrame, shotSpeed, END: FRAMES / FPS, anchors: Object.fromEntries(Object.entries(anchors).filter(([, a]) => a.camera).map(([k]) => [k, true])), renderAnchor, renderAnchorNudged, renderCamera, FPS, FRAMES, shots: shots.map(({id, start, frames, size, move, loc, subject, see, openHit, at, why, captionY, fit, spectacle, look: lk}) => ({id, start, frames, size, move, loc, subject, see, openHit: !!openHit, at, why, captionY, fit, spectacle: !!spectacle, look: lk})), renderFrame};
