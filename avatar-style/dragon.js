// avatar-style/dragon.js — the episode's dragon (docs/V2_BRIEF.md §11.3), built from parts in the same
// blocky style as the avatars: box body, block-chain neck and tail, flapping wedge wings, a hinged jaw,
// neon eyes. Church-sized (≈ 30 long, wingspan ≈ 34, head ≈ 17 high standing) and ≤ 4,000 triangles.
// It can look scared and cry (eyes wide / squeezed shut, tear streams).
//
// sampleDragon(keys, t) is pure: keys = [[t0, state, opts?], ...] with states
//   perch  (standing, slow breath, tail sway)      fly   (wing flaps, legs tucked)
//   roar   (head up, jaw wide, wings spread)       breathe (neck forward and down, jaw open: fire comes out)
//   lower  (head down at the ground: sniff / face a small person)   turn (perch, head swung by opts.yaw)
//   flinch (bonked: head knocked back, eyes shut)  cry   (eyes shut, tears, jaw trembling)   flee (fly + crying)
// Cross-fades between states over 0.3 s. driveDragon applies a sample to the rig built by buildDragon.
import * as T from 'three';

export const DRAGON_STATES = ['perch', 'fly', 'roar', 'breathe', 'lower', 'turn', 'flinch', 'cry', 'flee', 'curl', 'wiggle'];
export const DRAGON_COLORS = {body: '#2f6d7a', dark: '#24525c', belly: '#f2a33a', horn: '#f7f3ea', wing: '#c0392b', wingDk: '#8e2a22', eye: '#c8ff3a', pupil: '#141414', tear: '#7fd6ff', mouth: '#5a1a1a', tooth: '#ffffff'};
const NECK = 4, TAIL = 6, FADE = .3, PI = Math.PI;
const clamp01 = x => Math.min(1, Math.max(0, x)), smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

const BASE = {curl: 0, bodyY: 0, pitch: 0, neck: .45, neckBend: 0, headPitch: 0, headYaw: 0, jaw: .05, wingUp: -.25, wingFold: .9, wingSpread: .35, legs: 0, tailAmp: .12, eyes: 1, tears: 0, tremble: 0};
const STATES = {
  perch: t => ({bodyY: .25 * Math.sin(2 * PI * t / 2.6), neck: 1.1 + .04 * Math.sin(2 * PI * t / 2.6), headPitch: .05, neckBend: -.45, tailAmp: .14}),
  fly: t => { const f = Math.sin(2 * PI * t * 1.6); return {wingUp: .55 * f, wingFold: .1 + .25 * Math.max(0, -f), wingSpread: 1, legs: 1, pitch: .12, bodyY: -1.2 * f, neck: 1.0, headPitch: 0, tailAmp: .2}; },
  roar: t => ({neck: .9, neckBend: -.5, headPitch: -.45, jaw: .85 + .08 * Math.sin(t * 40), wingUp: .45, wingFold: .15, wingSpread: 1, bodyY: .5, pitch: -.12, tailAmp: .25}),
  breathe: t => ({neck: 1.05, neckBend: .2, headPitch: .35, jaw: .8, wingUp: .2, wingFold: .3, wingSpread: .8, pitch: .1, tailAmp: .2, tremble: .02 * Math.sin(t * 50)}),
  lower: t => ({neck: 1.8, neckBend: -.5, headPitch: .25, jaw: .1 + .05 * Math.sin(t * 3), pitch: .16, wingFold: .8, tailAmp: .1}),
  turn: (t, o) => ({headYaw: (o.yaw ?? 40) * PI / 180, neck: 1.0, neckBend: -.2, headPitch: .1, tailAmp: .2}),
  flinch: t => ({neck: 1.0, headPitch: -.75, jaw: .3, eyes: 0, wingUp: .4, wingFold: .4, wingSpread: .9, pitch: -.18, bodyY: .3, tremble: .06 * Math.sin(t * 60) * Math.exp(-t * 3)}),
  cry: t => ({neck: 1.1, neckBend: -.4, headPitch: -.2, jaw: .35 + .12 * Math.sin(t * 9), eyes: 0, tears: 1, tremble: .03 * Math.sin(t * 30), wingFold: .7, tailAmp: .05}),
  wiggle: t => ({bodyY: .5 * Math.abs(Math.sin(2 * PI * t / .9)), neck: .9, neckBend: -.4, headPitch: -.1, headYaw: .35 * Math.sin(2 * PI * t / 1.3), wingUp: .3 * Math.sin(2 * PI * t / .45), wingFold: .5, wingSpread: .6, tailAmp: .45}),   // opt-in: a happy baby wiggle
  curl: t => ({curl: 1, neck: 1.25, neckBend: -.15, headPitch: .35, jaw: .05, wingFold: 1, wingSpread: .2, wingUp: -.15, tailAmp: .03, bodyY: .1 * Math.sin(2 * PI * t / 3.2)}),   // opt-in: lying curled round a nest (head resting, tail wrapped)
  flee: t => { const f = STATES.fly(t); return {...f, eyes: 0, tears: 1, jaw: .3 + .1 * Math.sin(t * 9), headPitch: -.2}; },
};
export function dragonPose(state, t, o = {}) {
  if (!STATES[state]) throw Error('unknown dragon state ' + state);
  return {...BASE, ...STATES[state](Math.max(0, t), o)};
}
const mix = (a, b, w) => Object.fromEntries(Object.keys(BASE).map(k => [k, a[k] + (b[k] - a[k]) * w]));
export function sampleDragon(keys, t) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const [t0, s, o] = keys[i], cur = dragonPose(s, t - t0, o);
  if (i === 0 || t - t0 >= FADE) return cur;
  const [p0, ps, po] = keys[i - 1];
  return mix(dragonPose(ps, t - p0, po), cur, smooth((t - t0) / FADE));
}

// ---- rig ---------------------------------------------------------------------------------------------
const matCache = new Map();
const mat = (c, extra = {}) => { const k = c + JSON.stringify(extra); if (!matCache.has(k)) matCache.set(k, new T.MeshPhongMaterial({color: c, shininess: 36, specular: '#4d4d4d', flatShading: true, ...extra})); return matCache.get(k); };
function box(parent, size, at, color, {rot = [0, 0, 0], cast = true, extra} = {}) {
  const m = new T.Mesh(new T.BoxGeometry(...size), mat(color, extra)); m.position.set(...at); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
function spike(parent, r, h, at, color, rot = [0, 0, 0]) { const m = new T.Mesh(new T.ConeGeometry(r, h, 4), mat(color)); m.position.set(...at); m.rotation.set(...rot); m.castShadow = true; parent.add(m); return m; }
function pivot(parent, at, name) { const p = new T.Group(); p.position.set(...at); p.name = name; parent.add(p); return p; }
// A flat wing membrane: a fan of wedge-like panels between finger bones (+x is outward).
function wingSegment(parent, len, chord, side, C = DRAGON_COLORS) {
  box(parent, [len, .45, .45], [side * len / 2, 0, 0], C.dark);                                         // arm bone
  for (let i = 0; i < 3; i++) {
    const w = len * (1 - i * .18), m = box(parent, [w, .16, chord / 3], [side * w / 2, -.1, -(i + .5) * chord / 3], i % 2 ? C.wingDk : C.wing);
    m.castShadow = i === 0;
  }
  spike(parent, .35, 1.2, [side * (len + .3), 0, 0], C.horn, [0, 0, -side * PI / 2]);
}

// Opt-in (Season 1 egg, 2026-11-14): face 'v2' = a readable face (white eye with a glowing iris and slit pupil, a shine dot, a heavy
// brow ridge, a longer snout with nostril bumps); baby = hatchling proportions (head ≥ 40 % of the body height, short neck,
// stubby legs, small wings, nub horns, big eyes). Neither changes the default dragon.
export const BABY = {head: 1.8, neck: .55, wings: .42, tail: .6, legs: .62, spikes: .45};
// Opt-in (owner pass 2): wingScale (span wider than the body), rim '#hex' (bright edges on the wing bones and tips, for a
// moon backlight), spikes (back-ridge scale; < 1 also drops every other spike) + saddle (a flat seat on the shoulders).
export function buildDragon({scale = 1, name = 'dragon', colors = null, face = null, baby = false, wingScale = 1, rim = null, spikes = 1, saddle = false} = {}) {   // colors (opt-in): override DRAGON_COLORS keys (hatchlings)
  if (baby) face = face ?? 'v2';
  const C = colors ? {...DRAGON_COLORS, ...colors} : DRAGON_COLORS, root = new T.Group(); root.name = name; root.scale.setScalar(scale);
  const body = pivot(root, [0, 9, 0], 'body');
  box(body, [7, 6, 13], [0, 0, 0], C.body);
  box(body, [5.2, 1.2, 11], [0, -3.2, .5], C.belly);                                                     // belly plates
  for (let i = 0; i < 5; i++) if (spikes >= 1 || i % 2 === 0) { const sp = spike(body, .7, 1.8, [0, 3.6, 5 - i * 2.5], C.horn); if (spikes !== 1) { sp.scale.setScalar(spikes); sp.position.y = 3 + .6 * spikes; } }   // back ridge
  if (saddle) { box(body, [4.6, .7, 3.4], [0, 3.35, 3.4], '#8a4a2a'); box(body, [4.8, .9, .5], [0, 3.6, 1.6], '#6a3a20'); }
  box(body, [7.4, 1.2, 4], [0, 1.4, 5.8], C.dark);                                                        // shoulders
  // legs (4): thigh blocks + feet with claws
  const legs = [];
  for (const [x, z] of [[-3, 4], [3, 4], [-3, -4], [3, -4]]) {
    const hip = pivot(body, [x, -2.5, z], 'leg'); box(hip, [2.4, 5, 2.6], [0, -2.5, 0], C.body); box(hip, [2.8, 1.2, 3.6], [0, -5.8, .5], C.dark);
    for (const cx of [-.8, 0, .8]) spike(hip, .25, .8, [cx, -5.9, 2.5], C.horn, [PI / 2, 0, 0]);
    legs.push(hip);
  }
  // neck chain (rises forward from the shoulders), head with horns, jaw, eyes, nostrils, teeth
  const neck = []; let p = pivot(body, [0, 2.2, 6.2], 'neck0');
  for (let i = 0; i < NECK; i++) {
    const s = 1 - i * .1; box(p, [4 * s, 3.4 * s, 3.4], [0, 0, 1.6], i % 2 ? C.body : C.dark); box(p, [3 * s, 1, 3], [0, -1.6 * s, 1.6], C.belly);
    spike(p, .5, 1.3, [0, 1.9 * s, 1.6], C.horn); neck.push(p); p = pivot(p, [0, 0, 3.1], 'neck' + (i + 1));
  }
  const head = pivot(p, [0, 0, .6], 'head');
  box(head, [4.4, 3.2, 5.2], [0, .6, 2.4], C.body);                                                      // skull
  box(head, [3.4, 1.6, 3.4], [0, .2, 5.9], C.body);                                                      // snout
  const nose = box(head, [1.6, .9, 1], [0, .55, 7.6], C.dark); nose.name = 'nose';
  for (const sx of [-1, 1]) {
    spike(head, .55, 3, [sx * 1.6, 2.9, .6], C.horn, [-.5, 0, sx * -.35]);                               // horns
    box(head, [.35, .35, .2], [sx * .55, .75, 8.12], C.pupil, {cast: false});                            // nostrils
  }
  const eyes = [], tears = [];
  for (const sx of [-1, 1]) {
    const e = pivot(head, [sx * 1.75, 1.45, 4.25], 'eye');
    if (face === 'v2') {   // readable face: white eye, glowing iris, slit pupil, shine dot; a heavy brow ridge over it
      e.position.set(sx * 1.95, 1.5, 4.0); e.rotation.y = sx * .35;
      box(e, [1.5, 1.55, .5], [0, 0, 0], '#f4f1e8', {cast: false, extra: {emissive: '#f4f1e8', emissiveIntensity: .35}});
      box(e, [1.0, 1.15, .2], [-sx * .12, -.05, .3], C.eye, {cast: false, extra: {emissive: C.eye, emissiveIntensity: 1.6}});
      box(e, [.26, .95, .12], [-sx * .12, -.05, .42], C.pupil, {cast: false});
      box(e, [.3, .3, .1], [-sx * .4 + sx * .02, .32, .5], '#ffffff', {cast: false, extra: {emissive: '#ffffff', emissiveIntensity: 1}});
      box(head, [1.9, .7, 1.5], [sx * 1.85, 2.55, 4.0], C.dark, {rot: [.25, 0, sx * -.22]});                 // brow ridge (on the head: it does not blink)
      box(head, [.7, .5, .6], [sx * .7, 1.0, 7.75], C.dark);                                                   // nostril bump
    } else {
      box(e, [.9, 1.1, .4], [0, 0, 0], C.eye, {cast: false, extra: {emissive: C.eye, emissiveIntensity: .9}});
      box(e, [.38, .6, .2], [-sx * .12, -.05, .24], C.pupil, {cast: false});
      box(e, [1.2, .35, .5], [0, .8, .05], C.dark, {cast: false});                                         // brow
    }
    eyes.push(e);
    const tr = pivot(head, [sx * 1.9, .6, 4.3], 'tear');
    for (let k = 0; k < 3; k++) box(tr, [.3, .55, .3], [sx * .05 * k, -k * .9, .05 * k], C.tear, {cast: false, extra: {emissive: C.tear, emissiveIntensity: .35, transparent: true, opacity: .9}});
    tears.push(tr);
  }
  const jaw = pivot(head, [0, -.9, 1.2], 'jaw');
  box(jaw, [3.6, 1, 5.6], [0, -.3, 2.9], C.belly); box(jaw, [3, .3, 4.6], [0, .25, 3], C.mouth, {cast: false});
  for (const sx of [-1, 1]) for (const z of [1.6, 3.2, 4.8]) spike(jaw, .18, .6, [sx * 1.3, .5, z], C.tooth, [0, 0, 0]);
  for (const sx of [-1, 1]) for (const z of [4.6, 6.2]) spike(head, .18, .6, [sx * 1.3, -.7, z], C.tooth, [PI, 0, 0]);
  const mouth = pivot(head, [0, -.4, 7.8], 'mouth');                                                    // fire origin
  // wings (two segments each) at the shoulders
  const wings = [];
  for (const sx of [-1, 1]) {
    const inner = pivot(body, [sx * 3.4, 2.6, 3], 'wing'), outer = pivot(inner, [sx * 8, 0, 0], 'wingOuter');
    wingSegment(inner, 8, 8, sx, C); wingSegment(outer, 8.5, 6.5, sx, C); wings.push({inner, outer, sx});
    if (wingScale !== 1) inner.scale.set(wingScale, 1, wingScale);
    if (rim) { const rm = new T.MeshBasicMaterial({color: rim, toneMapped: false}); for (const [pv, len] of [[inner, 8], [outer, 8.5]]) { const e = new T.Mesh(new T.BoxGeometry(len, .5, .5), rm); e.position.set(sx * len / 2, .1, .3); pv.add(e);
      const t = new T.Mesh(new T.BoxGeometry(len * .8, .3, .3), rm); t.position.set(sx * len * .45, -.1, -(len === 8 ? 8 : 6.5) + .2); pv.add(t); } }
  }
  // tail chain (tapers backward)
  const tail = []; p = pivot(body, [0, -.5, -6.5], 'tail0');
  for (let i = 0; i < TAIL; i++) {
    const s = 1 - i * .13; box(p, [3.4 * s, 2.8 * s, 3], [0, 0, -1.5], i % 2 ? C.body : C.dark); spike(p, .45 * s + .1, 1.1, [0, 1.6 * s, -1.5], C.horn);
    tail.push(p); p = pivot(p, [0, 0, -2.9], 'tail' + (i + 1));
  }
  spike(p, 1.1, 2.2, [0, 0, -.6], C.horn, [-PI / 2, 0, 0]);                                              // tail tip
  const d = {root, body, neck, head, jaw, eyes, tears, wings, tail, legs, mouth, nose, preset: {kind: 'dragon'}, isDragon: true};
  if (baby) {   // uniform scales per pivot (no shear): the neck chain shrinks, the head (inside it) grows back to BABY.head
    const B = BABY; neck[0].scale.setScalar(B.neck); head.scale.setScalar(B.head / B.neck); tail[0].scale.setScalar(B.tail);
    for (const w of wings) w.inner.scale.setScalar(B.wings); for (const l of legs) l.scale.setScalar(B.legs);
    body.traverse(o => { if (o.isMesh && o.geometry.type === 'ConeGeometry' && o.parent === body) o.scale.setScalar(B.spikes); });
    head.traverse(o => { if (o.isMesh && o.geometry.type === 'ConeGeometry' && o.parent === head && o.position.y > 2) o.scale.set(.6, .45, .6); });   // nub horns
    d.bodyY0 = 9 - 6.4 * (1 - B.legs); d.baby = true;
  }
  return d;
}

// Apply a sample (absolute, never accumulated). origin: {position, yaw (radians)}.
export function applyDragonSample(d, s, origin = {position: [0, 0, 0], yaw: 0}, t = 0) {
  d.root.position.set(...origin.position); d.root.rotation.set(0, origin.yaw ?? 0, 0);
  d.body.position.y = (d.bodyY0 ?? 9) + s.bodyY * (d.baby ? .3 : 1) - (s.curl ?? 0) * 3 + s.tremble * 8; d.body.rotation.set(s.pitch, 0, s.tremble);
  // neck: `neck` tilts the chain forward from vertical-ish; `neckBend` curls the upper links down
  // the chain is nested: link 0 sets the neck's tilt (neck 0 = up, ~1.25 = level forward), later links add the bend;
  // the head undoes the accumulated tilt so headPitch is its world pitch (+ = nose down)
  const tilt = -(PI / 2 - .35) + s.neck, bend = s.neckBend * .35;
  const cu = s.curl ?? 0;
  d.neck.forEach((n, i) => n.rotation.set(i === 0 ? tilt : bend, (i === NECK - 1 ? s.headYaw * .4 : 0) + cu * .38, 0));
  d.head.rotation.set(-(tilt + bend * (NECK - 1)) - s.pitch + s.headPitch, s.headYaw * .6, s.tremble * 3);
  d.jaw.rotation.x = s.jaw * .8;
  for (const e of d.eyes) e.scale.set(1 + .15 * Math.max(0, s.eyes - 1), Math.max(.12, s.eyes), 1);
  d.tears.forEach((tr, k) => { tr.visible = s.tears > .05; tr.position.y = .6 - ((t * 3 + k * .4) % 1) * .6; tr.scale.setScalar(Math.max(.01, s.tears)); });
  for (const w of d.wings) {
    w.inner.rotation.set(0, w.sx * (1 - s.wingSpread) * 1.1, w.sx * s.wingUp);
    w.outer.rotation.set(0, w.sx * s.wingFold * 1.6, w.sx * s.wingUp * .6);
  }
  d.tail.forEach((p, i) => p.rotation.set(-.12 + i * .03 + cu * .12, s.tailAmp * Math.sin(t * 2.2 - i * .7) + cu * .42, 0));
  d.legs.forEach((l, i) => l.rotation.set(s.legs * (i < 2 ? -.9 : .9) + cu * (i < 2 ? -1.2 : 1.2), 0, 0));
  return d;
}
export function driveDragon(d, t, {keys = [[0, 'perch']], origin} = {}) { return applyDragonSample(d, sampleDragon(keys, t), origin, t); }
export const dragonTriangles = d => { let n = 0; d.root.traverse(o => { if (o.isMesh) { const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return n; };
