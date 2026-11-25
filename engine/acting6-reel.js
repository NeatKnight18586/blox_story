// engine/acting6-reel.js — P3 review reel (pure): what the acting6 stage draws for verbs.png, cycles.png, the silhouette
// gate and demo.mp4. A shot = {actors: [{id, origin [x, y, z], yaw°, sample, face}], props: [{id, kind, p}], camera}.
// Actors stand on a plain set; partner verbs place the partner from acting6.partnerOffset / carryOrigin (one call).
import * as A from './acting6.js';

const D = Math.PI / 180;
// Expression per verb (cast/hero6.json HERO expressions, faces v5 aliases); the partner keeps its own.
export const FACE = {idle_alive: 'hero_wink', look_around: 'hero_scheme', flinch: 'hero_shock', gasp_step_back: 'hero_shock', point: 'hero_grin', cheer: 'hero_grin', facepalm: 'hero_cry',
  shrug: 'hero_soft', arms_cross: 'hero_scheme', hug: 'hero_soft', grab: 'hero_scheme', tug_pull: 'hero_rage', push: 'hero_rage', throw: 'hero_grin', catch: 'hero_shock', carry: 'hero_soft',
  jump: 'hero_grin', land: 'hero_grin', trip_fall: 'hero_panic', slip: 'hero_panic', bonk_dizzy: 'hero_shock', knees_collapse: 'hero_cry', reach_for: 'hero_panic', comfort_kneel: 'hero_soft', tumble: 'hero_panic'};
const PROPS = {grab: 'ball', throw: 'ball', catch: 'ball', carry_box: 'box', tug_pull: 'rope'};
// The review stage's partner actors by scale: SECOND .82 (P), LITTLE .62 (P62), an adult .1.0 (P100)
export const PARTNER_ID = {hug: 'P', hug_s: 'P62', hug_l: 'P100', carry: 'P', carry_hip: 'P62', comfort_kneel: 'P'}, PARTNER_K = {P: .82, P62: .62, P100: 1};
const rot = (yaw, [x, y, z]) => { const c = Math.cos(yaw * D), s = Math.sin(yaw * D); return [x * c + z * s, y, -x * s + z * c]; };
const addv = (a, b) => a.map((x, i) => x + b[i]);

// One verb (or cycle / tumble) at verb-local time t; the hero stands at the origin turned so the camera (at +z) sees the
// verb's readable side (`cam` degrees toward the actor's +x).
export function verbShot(name, t, {yaw = null} = {}) {
  const isCycle = A.CYCLE_NAMES.includes(name), v = A.VERBS[name], y0 = yaw ?? -(v?.cam ?? (isCycle ? 70 : name === 'tumble' ? 80 : 30));
  const lead = isCycle ? A.sampleCycle(name, t) : name === 'tumble' ? A.sampleTumble(t) : A.sampleVerb(name, t);
  const actors = [{id: 'B', origin: [0, 0, 0], yaw: y0, sample: lead.sample, face: FACE[name] ?? 'hero_wink'}], props = [];
  if (v?.two) {
    const off = A.partnerOffset(name), pv = v.two.partner, id = PARTNER_ID[name] ?? 'P', k = PARTNER_K[id], T = A.timing(v), pt = Math.max(0, t - T.key + A.timing(A.VERBS[pv]).key), ps = A.sampleVerb(pv, pt);
    let o = [off.x, 0, off.z], py = off.yaw;
    if (v.two.follow) { const c = A.carryOrigin(lead.sample, 'adult_m', name, k), w = A.carryW(name, t, 0); o = [0, 1, 2].map(i => ([off.x, 0, off.z][i]) + (c.p[i] - [off.x, 0, off.z][i]) * w); py = off.yaw + (c.yaw - off.yaw) * w; }
    actors.push({id, origin: rot(y0, o), yaw: y0 + py, sample: ps.sample, face: name === 'comfort_kneel' ? 'cry' : 'warm'});
  }
  if (name === 'carry_box') {
    const h = A.handAt(lead.sample, 'both'); props.push({id: 'box', kind: 'box', p: rot(y0, h.p), yaw: y0 + (lead.sample.root.yaw / D)});
  } else if (PROPS[name]) {
    const tm = A.timing(v), mode = v.prop, side = 'right', key = tm.key;
    if (name === 'tug_pull') { const h = A.handAt(lead.sample, 'both'); props.push({id: 'rope', kind: 'rope', p: rot(y0, h.p), yaw: y0}); }
    else {
      const hand = tt => A.handAt(A.sampleVerb(name, tt).sample, side).p;
      let p;
      if (mode === 'release') { if (t <= key) p = hand(t); else { const a = hand(key), b = hand(key - 1 / 24), vv = a.map((x, i) => (x - b[i]) * 24 * 1.25), d = t - key; p = [a[0] + vv[0] * d, Math.max(A.PROP_R, a[1] + vv[1] * d + .5 * A.GRAV * d * d), a[2] + vv[2] * d]; } }
      else if (name === 'catch') { if (t >= key) p = hand(t); else { const k = hand(key), d = t - key; p = [k[0], k[1] + 5.5 * d + .5 * A.GRAV * d * d, k[2] - 7 * d]; } }
      else { const g = hand(key); p = t >= key ? hand(t) : g; props.push({id: 'crate', kind: 'crate', p: rot(y0, [g[0], (g[1] - A.PROP_R) / 2, g[2]]), h: g[1] - A.PROP_R, yaw: y0}); }   // grab: the ball waits on a crate where the hand closes
      props.push({id: 'ball', kind: 'ball', p: rot(y0, p), yaw: y0});
    }
  }
  return {actors, props};
}
// World points of a shot (FK of every actor, origin + yaw applied): camera fitting.
export function shotPoints(shot) {
  const pts = [];
  for (const a of shot.actors) { const f = A.fk(a.sample), put = p => pts.push(addv(a.origin, rot(a.yaw, p)));
    for (const k of ['head', 'leftHand', 'rightHand', 'waist', 'leftKnee', 'rightKnee']) put(f[k].p);
    put(A.fk(a.sample).head.p.map((x, i) => x + [0, 1.3, 0][i])); for (const c of [...f.leftFootCorners, ...f.rightFootCorners]) put(c); }
  for (const p of shot.props) if (Math.hypot(p.p[0], p.p[2]) < 4.5) pts.push(p.p);   // a thrown prop leaves the frame; the camera stays on the actor
  return pts;
}
// A camera at +z that frames every point of the shots (fov 30, aspect w/h, margin), looking level-ish at the centre.
export function fitCamera(shots, aspect = 1, {fov = 30, margin = 1.18, minH = 5.6, lift = .9} = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = 0, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of shots) for (const [x, y, z] of shotPoints(s)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = Math.max(minH, (y1 - y0) * margin), w = (x1 - x0 + 1) * margin, half = Math.tan(fov / 2 * D);
  const dist = Math.max(h / 2 / half, w / 2 / half / aspect) + (z1 - z0) / 2 + 1, cy = Math.max(h / 2, (y0 + y1) / 2);
  return {position: [cx, cy + lift, cz + dist], target: [cx, cy, cz], fov};
}
// The three key times of a verb for verbs.png: anticipation · KEY (action / apex / contact) · settle.
export const keyTimes = name => { if (name === 'tumble') return [.3, 1.0, 2.4]; const T = A.timing(A.VERBS[name]); return [T.ant, T.key, T.end]; };
// demo.mp4: every verb once (24 + tumble), hard cuts, ~0.8 s each around its KEY (anticipation in, settle out).
export const DEMO = {seconds: 20, fps: 24, clips: [...A.VERB_NAMES, 'carry_hip', 'tumble']};
export function demoClips() {
  const n = DEMO.clips.length, F = DEMO.seconds * DEMO.fps;
  return DEMO.clips.map((name, i) => { const f0 = Math.round(i * F / n), f1 = Math.round((i + 1) * F / n), len = (f1 - f0) / DEMO.fps, key = name === 'tumble' ? .55 : A.timing(A.VERBS[name]).key;
    const pre = name === 'tumble' ? .3 : Math.min(key, .45 * len + .02), t0 = Math.max(0, key - pre);
    return {name, f0, f1, t0, len}; });
}
export function demoFrame(f) {
  const c = demoClips().find(k => f >= k.f0 && f < k.f1), t = c.t0 + (f - c.f0) / DEMO.fps;
  const shot = verbShot(c.name, t);
  return {clip: c.name, t, shot};
}
export function demoCamera(name, aspect) {
  const c = demoClips().find(k => k.name === name), shots = [];
  for (let i = 0; i <= 8; i++) { const t = c.t0 + c.len * i / 8; shots.push(verbShot(name, t)); }
  return fitCamera(shots, aspect, {margin: 1.12});
}
