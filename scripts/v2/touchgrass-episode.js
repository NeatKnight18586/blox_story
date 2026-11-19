// scripts/v2/touchgrass-episode.js — writes stories/touchgrass/episode.json from stories/touchgrass/BEATS.md (owner shot list, 61 shots;
// shots 22 and 57 carry their 3 beat cuts as sub-shots a/b/c → 65 spec shots). toyhouse-episode.js pattern: every shot is data
// (cut = the BEATS word start in cues.json, move, size, subject, see/prop, faces, poses, effects, contact frames).
// World: stories/touchgrass/world.js (the 4 E0 locations side by side on x; OFF). Looks: per-world look presets built from the
// location JSONs (fog, sun direction for the shadow catcher, exposure); the location's own key/hemi lights do the lighting.
// The narration, voice, cues and BEATS are owner files: only read.
//   node scripts/v2/touchgrass-episode.js
import {readFileSync, writeFileSync} from 'node:fs';

const FPS = 24, OUT_FPS = 60, END = 89.95, F = 1 / FPS;   // E2 owner decision: END 89.95 (shot 61 = 88.62–89.95)
const cues = JSON.parse(readFileSync('stories/touchgrass/cues.json', 'utf8')), WORDS = cues.lines.flatMap(l => l.words.map(w => w.start));
const AN = JSON.parse(readFileSync('parts/locations/anchors-touchgrass.json', 'utf8')), CASTF = JSON.parse(readFileSync('cast/touchgrass.json', 'utf8'));
const LOC = Object.fromEntries(['dustTown', 'zombieCity', 'dragonPeaks', 'space'].map(n => [n, JSON.parse(readFileSync(`parts/locations/${n}.json`, 'utf8'))]));
const R = Math.PI / 180, add = (a, b) => a.map((v, i) => v + (b[i] ?? 0)), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, k) => a.map(v => v * k), r3 = v => +v.toFixed(3), r3v = a => a.map(r3);
const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
// ---- worlds (must match stories/touchgrass/world.js) ----
const OFF = {D: [0, 0, 0], Z: [2000, 0, 0], P: [4000, 0, 0], S: [6000, 0, 0]};
const at = (w, p) => r3v(add(OFF[w], p));
const YARD = {G: [0.3, 0, 12.4], leoPorch: [-5.5, 0, 10.5]};
// ---- looks: one preset object per world (the legacy look: its sky / hemi / rim off, its sun only casts onto the catchers) ----
const preset = ({fog, near, far, el, az, exposure}) => ({skyTop: '#000000', skyHorizon: '#000000', fog, fogNear: near, fogFar: far, hemiSky: '#000000', hemiGround: '#000000', hemi: 0,
  sun: '#ffffff', sunI: 0, sunEl: el, sunAz: az, rim: '#000000', rimI: 0, cloud: '#000000', exposure, windows: 0});
const dg = LOC.dustTown.looks.dustGray, dgo = LOC.dustTown.looks.dustGold, zc = LOC.zombieCity, dp = LOC.dragonPeaks, sp = LOC.space;
const LK = {
  gray: preset({fog: dg.fog.color, near: dg.fog.near, far: dg.fog.far, el: dg.sun.el, az: dg.sun.az, exposure: dg.exposure}),
  gold: preset({fog: dgo.fog.color, near: dgo.fog.near, far: dgo.fog.far, el: Math.max(9, dgo.sun.el), az: dgo.sun.az, exposure: dgo.exposure}),
  Z: preset({fog: zc.fog.color, near: zc.fog.near, far: zc.fog.far, el: zc.sun.el, az: zc.sun.az, exposure: zc.exposure}),
  P: preset({fog: dp.fog.color, near: dp.fog.near, far: dp.fog.far, el: 16, az: 250, exposure: dp.exposure}),
  S: preset({fog: '#000000', near: 1e5, far: 2e5, el: sp.sun.el, az: sp.sun.az, exposure: sp.exposure}),
};
const GOLD = 77.74;
// ---- cameras: P = subject ground point; az = direction subject → camera (deg, 0 = +z); h, aim above P's y ----
const camAt = (P, az, dist, h, aim, fov) => ({position: r3v([P[0] + Math.sin(az * R) * dist, P[1] + h, P[2] + Math.cos(az * R) * dist]), target: r3v([P[0], P[1] + aim, P[2]]), fov});
const push = (c, k) => ({position: r3v(lerp3(c.position, c.target, k)), target: c.target, fov: c.fov});
const slide = (c, d) => ({position: r3v(add(c.position, d)), target: r3v(add(c.target, d)), fov: c.fov});
const C = (from, to) => ({from, to});
// ---- E2 camera math (pure): projection into the 9:16 frame (x right, y down, 0..1), aim a point at a screen spot, rays ----
const ASP = 9 / 16, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = v => mul(v, 1 / Math.hypot(...v)), crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const basis = c => { const f = nrm(sub(c.target, c.position)), r = nrm(crs(f, [0, 1, 0])); return {f, r, u: crs(r, f), th: Math.tan(c.fov * R / 2)}; };
const proj = (c, P) => { const {f, r, u, th} = basis(c), d = sub(P, c.position), z = dot(d, f); return [.5 + dot(d, r) / z / (th * ASP) / 2, .5 - dot(d, u) / z / th / 2, z]; };
const aimAt = (C0, P, xf, yf, fov) => { let yaw = Math.atan2(P[0] - C0[0], P[2] - C0[2]), pit = Math.atan2(P[1] - C0[1], Math.hypot(P[0] - C0[0], P[2] - C0[2])); const dist = Math.hypot(...sub(P, C0));
  const cam = () => ({position: r3v(C0), target: r3v(add(C0, mul([Math.sin(yaw) * Math.cos(pit), Math.sin(pit), Math.cos(yaw) * Math.cos(pit)], dist))), fov});
  for (let i = 0; i < 120; i++) { const [x, y] = proj(cam(), P); yaw -= (x - xf) * 2 * Math.atan(Math.tan(fov * R / 2) * ASP) * .7; pit -= (y - yf) * fov * R * .7; } return cam(); };
const projY = (c, P) => { const [, y, z] = proj(c, P); return z <= 1e-6 ? (P[1] > c.position[1] ? -1e9 : 1e9) : y; };   // behind the lens: above / below the frame
const bisect = (f, lo, hi, want) => { for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if ((f(m) > want) === (f(lo) > want)) lo = m; else hi = m; } return (lo + hi) / 2; };
const rayAt = (c, xf, yf, d) => { const {f, r, u, th} = basis(c); return add(c.position, mul(nrm(add(add(f, mul(r, (xf - .5) * 2 * th * ASP)), mul(u, (.5 - yf) * 2 * th))), d)); };
// ---- E2 giant finger rig (pure): tip (local, unflicked) knuckle (-.55, -1.95) + joint -1.7 + tip -1.58 → (-.55, -5.23, -.05) × FS, pointing down;
// a tilt ax (deg, about x) leans the tip toward +z (ax < 0). The arm axis is the sleeve (local x 0), 20.7 wide. The owner's camera rule
// (25 26 28 33 34 39 40): the finger enters from the top edge through the crack, its box 40–70 % of frame height, nothing in front.
const TIP = [-.55, -5.23, -.05], FS = 9, ARM_W = 2.3 * FS, rotX = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
const wristFor = (tip, ax = 0) => sub(tip, rotX(mul(TIP, FS), ax * R));
const armAt = (tip, ax, s, dx = 0) => add(add(wristFor(tip, ax), [dx, 0, 0]), rotX([0, s, 0], ax * R));   // a point on the sleeve axis, s above the wrist
// the crack (props7 skyCrack, one per shot): centred on the arm where it crosses the frame top (yf), `behind` further along that ray,
// facing the camera; h = hFrac of the frame there (÷ cos elevation: the crack is upright), width ≈ 1.7 × the arm's width there
const crackFor = (cam, tip, ax = 0, {dx = 0, yf = .1, behind = 40, hFrac = .44} = {}) => {
  const s = bisect(q => projY(cam, armAt(tip, ax, q, dx)), -5.3 * FS, 9 * FS, yf), E = armAt(tip, ax, s, dx), dE = Math.hypot(...sub(E, cam.position)), dir = nrm(sub(E, cam.position)), dist = dE + behind, P = add(cam.position, mul(dir, dist));
  return {pos: r3v(P), rotY: +(Math.atan2(cam.position[0] - P[0], cam.position[2] - P[2]) / R).toFixed(2), h: +(hFrac * 2 * dist * Math.tan(cam.fov * R / 2) / Math.max(.4, Math.cos(Math.asin(dir[1])))).toFixed(2), w: +(4.2 * ARM_W * dist / dE).toFixed(2), entry: r3v(E)};
};
const heightAt = (cam, x, z, yf) => bisect(y => projY(cam, [x, y, z]), cam.position[1] - 60, cam.position[1] + 900, yf);
// ---- actor places ----
const KID = .84, KH = 5.3 * KID, SEAT = 1.05;   // a seated actor's root sits SEAT × scale below the seat top
const seat = (i, s = 1) => { const p = AN.dustTown.seats40[i]; return r3v([p[0], p[1] - SEAT * s, p[2] + .05]); };
const TA = seat(3), TB = seat(1), TC = seat(17);   // world.js CAST_SEATS (TOWN_C one row back: ≥ 1 body width from TOWN_B)
const LEO_CRATE = [-3.2, 0, 10.5], LEO_SIT = r3v([-3.2, 1.2 - SEAT * KID, 10.5]);
const NOVA_STEP = r3v([10.25, .75 - SEAT * KID, 4]);
const G = YARD.G, LEO_STAND = [-2.0, 0, 12.4], NOVA_STAND = [2.5, 0, 12.6], LEO_KNEEL = [-0.95, 0, 12.4];
const NOVA_W9 = [2.4, 0, 14.4], NOVA_23 = [-1.7, 0, 12.3];
const ZC = AN.zombieCity, LVZ = at('Z', ZC.heroLow), BROZ = at('Z', ZC.bro);
const LVP = at('P', [0, 0, 0]), SWORD = at('P', [0, 0, -14]), LVreach = at('P', [0, 0, -11.4]);
const KNIGHT = at('P', [-15.5, 0, 15.6]), ROBOT = at('P', [15.2, 0, 16.2]), MAGE = at('P', [1.5, 0, 22.5]);   // outside the friends ring, facing out
const BOSS0 = at('P', AN.dragonPeaks.bossPeak), BOSS1 = at('P', [-20, -40, -150]);
const SHIP = at('S', [0, 0, 0]);
// ---- shot list (BEATS.md): n, start (s), move, size, subject, see, prop, why ----
const T0 = {};   // shot id → start
const S = [];
const shot = (n, t, o) => { T0[n] = t; S.push({n, t, ...o}); };
const W = n => WORDS.reduce((b, w) => Math.abs(w - n) < Math.abs(b - n) ? w : b, 0);   // snap to the nearest word start
// TAP contact frames (owner): finger contact exactly on these frames
const TAPS = {a: [31.08, 31.66, 32.23], b: [43.96, 44.49, 45.00], c: [52.40, 52.92, 53.40]};
const fr = t => Math.round(t * FPS) / FPS;
// ---- dust town ----
const faceTA = add(TA, [0, 4.7, 0]);
shot('01', 0, {m: 'push', sz: 'close', sub: 'TOWN_A', see: ['TOWN_A'], look: LK.gray, why: 'hook: extreme close of a gray townsperson, visor glowing blue, dust across the lens, slow push',
  cam: C(camAt(TA, 15, 9.0, 4.65, 4.6, 30), camAt(TA, 15, 8.6, 4.65, 4.6, 30)), reveal: true});
shot('02', 1.06, {m: 'crane', sz: 'wide', sub: null, see: ['town'], look: LK.gray, why: 'crane up and back: rows of 40 seated, every visor glowing, dust town to the horizon (scale reveal)',
  cam: (() => { const T2 = add(TA, [-.3, 3.6, -4]), d = nrm([.24, .42, 1]); return C({position: r3v(add(T2, mul(d, 10))), target: r3v(T2), fov: 38}, {position: r3v(add(T2, mul(d, 25))), target: r3v(T2), fov: 46}); })()});   // E2: pull back along one ray (pan 0)
shot('03', 3.21, {m: 'push', sz: 'wide', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'NOVA in yellow walks between the rows toward camera, the only colour (E2: explicit camera, no foreground block)',
  cam: C(aimAt([.5, .9, -1.2], [.5, 2.2, -7.9], .5, .5, 62), aimAt([.5, .9, -1.4], [.5, 2.2, -7.3], .5, .5, 62))});   // E3: low in the aisle; NOVA walks the clear stretch in front of the -9 / -11 seat groups (mark), rows only at the edges
shot('04', 5.18, {m: 'push', sz: 'wide', see: ['tumbleweed', 'deadTree'], look: LK.gray, why: 'wide establishing: cracked ground, dead tree, tumbleweed rolling across, shacks, haze',
  cam: C({position: [3, 3.2, 34], target: [-3, 2.4, 6], fov: 50}, {position: [2.6, 3.1, 32.6], target: [-3, 2.4, 6], fov: 50})});
shot('05', 7.21, {glow: 1.2, m: 'push', sz: 'insert', see: ['dryStick'], prop: 'prop_stick', look: LK.gray, why: 'insert: cracked dry dirt, one dry stick, slow slide',
  cam: C(aimAt([2.0, 2.62, 29.22], [2.0, .05, 27], .5, .5, 40), aimAt([2.15, 2.58, 29.14], [2.1, .05, 27], .5, .5, 40))});   // E2: whole stick inside the margins
shot('06', 7.92, {glow: .6, m: 'push', sz: 'insert', see: ['birdhouse', 'powerLine'], prop: 'prop_birdhouse', look: LK.gray, why: 'empty power line + broken birdhouse swinging',
  cam: C({position: [-.1, 5.0, 28.0], target: [-2.08, 5.75, 22], fov: 40}, {position: [-.2, 5.0, 27.7], target: [-2.08, 5.8, 22], fov: 40})});
shot('07', 8.93, {m: 'push', sz: 'wide', see: ['town'], look: LK.gray, why: 'wide, a dust gust crosses the whole frame',
  cam: C({position: [-6, 7.5, 30], target: [1, 2, -10], fov: 48}, {position: [-5.2, 7.2, 28.4], target: [1, 2, -10], fov: 48})});
shot('08', 10.14, {m: 'push', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'NOVA sits outside every day: porch step, medium; timelapse shadows sweep (days passing)',
  cam: C(camAt(NOVA_STEP, -70, 9.2, 3.0, 2.9, 40), camAt(NOVA_STEP, -70, 8.6, 3.0, 2.9, 40))});
shot('09', 12.52, {glow: 1.6, m: 'push', sz: 'insert', see: ['NOVA'], prop: 'NOVA_can', look: LK.gray, why: 'insert: the watering can pouring onto dry dirt; can + stream 35–60 % of frame',
  cam: C(aimAt([.45, 3.0, 18.85], [.5, 2.95, 15.2], .5, .42, 44), aimAt([.45, 2.98, 18.75], [.5, 2.95, 15.2], .5, .42, 44))});   // E3: side view at can height (+z); spout and stream below it
shot('10', 13.82, {lift: .5, m: 'push', sz: 'wide', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'over the shoulder of a seated headset person (soft, foreground); NOVA small, watering in the background',
  cam: C({position: r3v(add(TB, [.9, 6.4, -5.2])), target: [2.0, 2.6, 14.4], fov: 32}, {position: r3v(add(TB, [.95, 6.35, -4.8])), target: [2.0, 2.6, 14.4], fov: 32})});
shot('11', 15.08, {lift: .5, m: 'push', sz: 'medium', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'LEO slumped on his porch chair, headset in his hand, unimpressed',
  cam: C(camAt(LEO_SIT, 70, 9.4, 3.7, 3.6, 40), camAt(LEO_SIT, 70, 8.8, 3.7, 3.6, 40))});
shot('12', 16.23, {glow: .8, m: 'push', sz: 'insert', see: ['LEO'], prop: 'LEO_headset', look: LK.gray, why: 'insert: the headset clicks ON on his head, the visor ignites', impact: 0,
  cam: C({position: [.05, 8.75, 11.37], target: [-3.1, 4.05, 10.5], fov: 34}, {position: [-.1, 8.55, 11.32], target: [-3.1, 4.05, 10.5], fov: 34})});
shot('13', 16.85, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'fast push to close LEO, the visor\'s cyan spill on his face, freeze 2 frames, grin (E2: a push, the snap held still)', freeze: [.12, 2],
  cam: C(camAt(LEO_SIT, 90, 9.4, 3.9, 3.85, 38), camAt(LEO_SIT, 90, 7.2, 3.9, 3.85, 38))});
const VISOR = [-2.42, 4.11, 10.5];   // LEO's visor strip front (seated, facing +x)
shot('14', 17.74, {m: 'crashZoom', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'crash zoom INTO the glowing visor (snaps at +.6 s); blue flash at 18.70', zoomAt: .6, subjectAimY: 3.75,
  subjectAimOffset: r3v(sub(VISOR, add(LEO_SIT, [0, 3.75, 0]))), cam: C({position: r3v(add(VISOR, [7.2, 0, -1.2])), target: VISOR, fov: 34}, {position: r3v(add(VISOR, [7.2, 0, -1.2])), target: VISOR, fov: 20})});   // E2 stability passes: fov 8 (0.396 %) and 14 (0.305 %) failed the 4 mm nudge
// ---- VR 1 ----
shot('15', 18.84, {m: 'push', sz: 'wide', see: ['zombies'], look: LK.Z, why: 'zombieCity wide, green fog, 8 zombies shuffling toward camera',
  cam: C({position: at('Z', [1.5, 3.6, 7]), target: at('Z', [0, 2.6, -14]), fov: 46}, {position: at('Z', [1.4, 3.5, 5.8]), target: at('Z', [0, 2.6, -14]), fov: 46})});
shot('16', 20.21, {lift: 1.2, m: 'heroLow', sz: 'medium', sub: 'LEO_VR', see: ['LEO_VR', 'zombies'], look: LK.Z, why: 'heroLow LEO_VR, glowing sword, heroPose, zombies behind, grin',
  cam: C({position: r3v(add(LVZ, [1.4, .8, 6.4])), target: r3v(add(LVZ, [0, 3.0, 0])), fov: 64}, {position: r3v(add(LVZ, [1.2, .8, 5.8])), target: r3v(add(LVZ, [0, 3.1, 0])), fov: 64})});
const CAM17 = aimAt(at('P', [24, 4, -34]), add(at('P', [62, 150, -190]), [17 + 20, 25, 0]), .5, .17, 50);   // = DR0 (declared with the cast)   // E3: from the plateau edge; the dragon (mid-shot, +17 travel) in the upper third, peaks below
shot('17', 21.17, {m: 'push', sz: 'wide', sub: 'DRAGON', see: ['DRAGON'], look: LK.P, why: 'dragonPeaks wide from the plateau edge: three snow peaks fill the lower 60 %, the dragon flies across the upper third',
  cam: C(CAM17, {...CAM17, position: r3v(lerp3(CAM17.position, CAM17.target, .03))})});
shot('18', 22.17, {lift: 1.6, m: 'track', sz: 'wide', sub: 'LEO_VR', see: ['LEO_VR', 'DRAGON'], look: LK.P, why: 'side track: LEO_VR seated on the dragon\'s neck (≥ 15 % of frame), body across the frame, peaks below', follow: 'DRAGON',   // E3: side track level with the rider on the neck base (+19 x, +32.5 y from the root), peaks below
  cam: C({position: [19, 52, 50], target: [19, 31, 0], fov: 24}, {position: [19, 51, 48.5], target: [19, 31, 0], fov: 24})});   // E3 read pass 2: outside the wing span, above the wing beat
shot('19', 23.04, {m: 'push', sz: 'wide', see: ['ships'], look: LK.S, why: 'space wide: ships crossing, laser trails, big sun',
  cam: C({position: at('S', [-30, 10, 44]), target: at('S', [30, 6, -60]), fov: 50}, {position: at('S', [-25, 9, 37]), target: at('S', [30, 6, -60]), fov: 50})});
shot('20', 23.98, {lift: .9, m: 'push', sz: 'medium', sub: 'LEO_VR', see: ['LEO_VR', 'leoShip'], look: LK.S, why: 'LEO_VR standing on his ship\'s nose, pointUp, stars streaking',
  cam: C({position: at('S', [6.5, 3.8, 13.5]), target: at('S', [0, 4.6, 4.6]), fov: 40}, {position: at('S', [6.0, 3.8, 12.6]), target: at('S', [0, 4.6, 4.6]), fov: 40})});
shot('21', 25.16, {lift: 1.2, m: 'crane', sz: 'wide', sub: 'LEO_VR', see: ['LEO_VR', 'friends'], look: LK.P, why: 'dragonPeaks plateau: crane up over 100 armored friends cheering around LEO_VR',
  cam: C({position: r3v(add(LVP, [0, 19, 17])), target: r3v(add(LVP, [0, 2, 0])), fov: 54}, {position: r3v(add(LVP, [0, 26, 24])), target: r3v(add(LVP, [0, 2, 0])), fov: 54})});   // E2: 45° down, one ray (pan 0)
for (const [k, t, who, P] of [['a', 27.27, 'FRIEND_KNIGHT', KNIGHT], ['b', 27.88, 'FRIEND_ROBOT', ROBOT], ['c', 28.60, 'FRIEND_MAGE', MAGE]])
  shot('22' + k, t, {lift: .8, m: 'push', sz: 'close', sub: who, see: [who], look: LK.P, why: `beat cut ${k}: close of ${who.slice(7).toLowerCase()}, cheering`, cam: C(camAt(P, Math.atan2(P[0] - OFF.P[0], P[2]) / R, 8.2, 3.7, 3.55, 38), camAt(P, Math.atan2(P[0] - OFF.P[0], P[2]) / R, 7.5, 3.7, 3.55, 38))});
// ---- real: the taps ----
shot('23', 29.27, {m: 'push', sz: 'wide', sub: 'LEO', see: ['LEO', 'NOVA'], look: LK.gray, why: 'flash → DUST TOWN wide two-shot: LEO frozen on his chair (headset on), NOVA beside him watering; cold',
  cam: C(camAt(add(LEO_SIT, [1.4, 0, .8]), 80, 17, 4.2, 2.4, 42), camAt(add(LEO_SIT, [1.4, 0, .8]), 80, 16, 4.1, 2.4, 42))});
shot('24', 31.08, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], prop: 'LEO_headset', look: LK.gray, why: 'insert: NOVA\'s finger taps LEO\'s headset at 31.08 / 31.66 / 32.23 (contact frames); headset 35–60 % of frame',
  cam: C(aimAt([-3.1, 4.25, 6.3], [-3.1, 4.25, 10.5], .5, .5, 48), aimAt([-3.1, 4.25, 6.5], [-3.1, 4.25, 10.5], .5, .5, 48))});   // E3: profile from LEO's left at head height (head + headset 40–50 %); NOVA's finger from the right edge (tapSide)
// ---- VR 2: the finger ----
// E2 finger cameras (owner rule): zombies / BRO / ship / boss low in frame, the finger tip 45–66 % down, the arm out of the top edge
const Z = p => at('Z', p), CAM25 = aimAt(Z([.5, .8, 7.5]), Z([0, 4.8, -10.8]), .5, .76, 56), ZT25 = Z([-.2, 0, -15.5]);
const T25 = [ZT25[0], +heightAt(CAM25, ZT25[0], ZT25[2], .47).toFixed(2), ZT25[2]];
const ZCON = Z([-.2, 1.6, -15.5]), CAM26 = aimAt(Z([.8, 3.6, 10.5]), ZCON, .5, .64, 52), T26s = [ZCON[0], +heightAt(CAM26, ZCON[0], ZCON[2], .2).toFixed(2), ZCON[2]];
const BF = add(BROZ, [0, 3.95, 0]), CAM28 = aimAt(add(BROZ, [.9, 2.0, 8.8]), BF, .5, .55, 50), AX28 = -20;
const T28 = (() => { const x = BROZ[0] - 6, z = BROZ[2] - 52; return [x, +heightAt(CAM28, x, z, .42).toFixed(2), z]; })();
const CAM31 = aimAt(add(LVZ, [-3.0, 4.4, 8.4]), add(LVZ, [0, 3.9, 0]), .5, .54, 46), T31 = (() => { const x = LVZ[0] - 2, z = LVZ[2] - 50; return [x, +heightAt(CAM31, x, z, .3).toFixed(2), z]; })();
shot('25', 32.98, {m: 'push', sz: 'wide', see: ['zombies', 'fingerZ'], prop: 'prop_fingerZ', look: LK.Z, why: 'flash → zombieCity low angle up: the sky cracks, the finger comes through; 4 zombies look up in the lower third',
  cam: C(CAM25, {...CAM25, position: r3v(add(CAM25.position, [0, 0, -.5])), target: r3v(add(CAM25.target, [0, 0, -.5]))})});
shot('26', 34.34, {m: 'push', sz: 'wide', see: ['fingerZ', 'zombies'], prop: 'prop_fingerZ', look: LK.Z, why: 'the giant finger comes down through the crack; the tip touches the zombies at 35.12 → knocked flat, shockwave dust',
  cam: C(CAM26, {...CAM26, position: r3v(add(CAM26.position, [0, 0, -.8])), target: r3v(add(CAM26.target, [0, 0, -.8]))})});
shot('27', 36.37, {lift: .9, m: 'push', sz: 'medium', sub: 'BRO', see: ['LEO_VR', 'BRO'], look: LK.Z, why: '"Bro," his friend whispers: two-shot LEO_VR + BRO, BRO leans in',
  cam: C(camAt(add(LVZ, [1.2, 0, -.2]), 10, 12.8, 4.8, 3.3, 40), camAt(add(LVZ, [1.2, 0, -.2]), 10, 12.2, 4.7, 3.3, 40))});
shot('28', 37.98, {m: 'push', sz: 'close', sub: 'BRO', see: ['BRO', 'fingerZ'], prop: 'prop_fingerZ', look: LK.Z, why: 'MEME SHOT: BRO close in the lower half, wince; the finger in the cracked sky above him, pointing down at camera',
  cam: C(CAM28, {...CAM28, position: r3v(add(CAM28.position, [0, 0, -1.4])), target: r3v(add(CAM28.target, [0, 0, -1.4]))})});
shot('29', 39.80, {m: 'push', sz: 'close', sub: 'LEO_VR', see: ['LEO_VR'], look: LK.Z, why: 'LEO_VR close, looks up, side eye', cam: C(camAt(LVZ, -10, 8.0, 3.2, 3.5, 38), camAt(LVZ, -10, 7.4, 3.2, 3.5, 38))});
shot('30', 41.08, {lift: 1.2, m: 'push', sz: 'close', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'flash → real: NOVA close, tapping, flat meh (E2: from above, the dirt behind her)', cam: C(camAt(NOVA_23, 180, 7.4, 4.3, 3.85, 38), camAt(NOVA_23, 180, 6.9, 4.3, 3.85, 38))});   // E3: from the front (−z, clear of Leo's porch); her tapping hand (mark yaw −155) toward camera-left
shot('31', 41.50, {m: 'push', sz: 'medium', sub: 'LEO_VR', see: ['LEO_VR', 'fingerZ'], look: LK.Z, why: 'flash → LEO_VR turns his back on the finger, arms crossed, unimpressed; the finger high behind him',
  cam: C(CAM31, {...CAM31, position: r3v(add(CAM31.position, [0, 0, -.5])), target: r3v(add(CAM31.target, [0, 0, -.5]))})});
const SMID = add(SHIP, [-1, 1, -17]), CAM32 = aimAt(at('S', [1.5, 6, 6]), SMID, .5, .56, 40);   // E3: lower and closer (ship ≥ 30 % by mid)
shot('32', 42.89, {glow: .6, m: 'push', sz: 'medium', see: ['leoShip'], prop: 'prop_leoShip', look: LK.S, why: 'space: LEO\'s ship (≥ 30 % of frame) flying toward camera, battle trails behind',
  cam: C(CAM32, {...CAM32, position: r3v(add(CAM32.position, [0, -.4, -1]))})});
const SC = add(SHIP, [0, 1.4, 0]), CAM33 = aimAt(at('S', [20, 10, 56]), SC, .5, .66, 48), FLICK_S = 1.5;
const SHIP34 = add(SHIP, [24, 4, -26]), SMID34 = lerp3(SHIP, SHIP34, .29), CAM34 = aimAt(add(lerp3(SC, add(SC, [FLICK_S * FS, 0, 0]), .5), [-4, 14, 62]), lerp3(add(SMID34, [0, 1.4, 0]), add(SC, [FLICK_S * FS, 0, 0]), .5), .5, .64, 50);
shot('33', 43.96, {m: 'push', sz: 'wide', see: ['leoShip', 'fingerS'], prop: 'prop_fingerS', look: LK.S, why: 'space: a crack opens, the finger comes through and taps the ship 43.96 / 44.49 / 45.00 (the ship jolts)',
  cam: C(CAM33, {...CAM33, position: r3v(add(CAM33.position, [-.6, 0, -1.5]))})});
shot('34', 45.62, {m: 'push', sz: 'wide', see: ['leoShip', 'fingerS'], prop: 'prop_fingerS', look: LK.S, why: 'the finger flicks (contact 45.96 "boops"); the ship spins away tumbling',
  cam: C(CAM34, {...CAM34, position: r3v(add(CAM34.position, [0, 0, -1.5]))})});
shot('35', 47.12, {m: 'push', sz: 'wide', see: ['leoShip', 'sun'], look: LK.S, why: 'straight into the sun: the ship shrinks into it; white flash 48.30',
  cam: C({position: at('S', [-10, 6, 40]), target: at('S', [180, 20, -260]), fov: 44}, {position: at('S', [-6, 6, 36]), target: at('S', [180, 20, -260]), fov: 40})});
// ---- VR 3: the boss ----
const HD = add(BOSS0, [16.7, 42.5, 47.6]), HC = add(BOSS0, [16.5, 47.5, 46]), FLICK_D = 1.6, H41 = add(BOSS1, [18, 40, 48]);   // boss head centre / skull top (perched), head at the bottom
const CAM36 = aimAt(add(BOSS0, [55, 12, 150]), HD, .5, .38, 46), CAM37 = aimAt([HD[0] + 40, BOSS0[1] + .7, HD[2] + 122], HD, .5, .4, 40);
const CAM39 = aimAt(add(HC, [58, 26, 115]), add(HC, [0, 6, 0]), .5, .5, 50), CAM40 = aimAt(add(HC, [76, 24, 148]), add(HC, [FLICK_D * FS, 6, 0]), .5, .52, 50), CAM41 = aimAt(add(H41, [35, 9, 82]), H41, .5, .38, 40);
shot('36', 48.48, {m: 'push', sz: 'wide', sub: 'BOSS', see: ['BOSS'], look: LK.P, why: 'dragonPeaks wide: BOSS on the highest peak (≥ 25 % of frame), sunset, lightning',
  cam: C(CAM36, {...CAM36, position: r3v(lerp3(CAM36.position, CAM36.target, .22))})});
shot('37', 49.44, {m: 'lowAuthority', sz: 'medium', sub: 'BOSS', see: ['BOSS'], look: LK.P, why: 'final boss: low authority, roars, shake', ground: BOSS0[1],
  cam: C(CAM37, {...CAM37, position: r3v(add(lerp3(CAM37.position, CAM37.target, .08), [-10, 0, 0]))})});
const CAM38 = (() => {   // E3: front view at stone height through the clearest gap in the friends ring; LEO_VR (+z of the stone) enters from the right
  const fr = AN.dragonPeaks.friends100.filter(p => Math.hypot(p[0], p[2]) > 4.5).map(p => at('P', p)), S0 = SWORD, seg = (P, A, B) => { const ab = sub(B, A), u = Math.max(0, Math.min(1, ((P[0] - A[0]) * ab[0] + (P[2] - A[2]) * ab[2]) / (ab[0] ** 2 + ab[2] ** 2))); return Math.hypot(P[0] - A[0] - u * ab[0], P[2] - A[2] - u * ab[2]); };
  let best = null; for (let a = 0; a < 360; a += 2) for (const D of [6.5, 7.5, 8.5]) { const fov = 2 * Math.atan(4.23 / .44 / 2 / D) / R, C0 = add(S0, [Math.sin(a * R) * D, 1.6, Math.cos(a * R) * D]), c = aimAt(C0, add(S0, [0, 2.1, 0]), .5, .5, fov), lx = proj(c, add(LVreach, [0, 3, 0]))[0];
    if (lx < .6 || lx > 1.15 || Math.abs(a - 0) < 30) continue;   // read pass 2: no friend inside the frame nearer than .7 × the stone
    if (fr.some(p => { const q = proj(c, add(p, [0, 2, 0])); return q[2] > 0 && q[2] < .75 * D && q[0] > -.15 && q[0] < 1.15; })) continue; const clr = Math.min(...fr.map(p => seg(p, C0, S0))); if (!best || clr > best.clr) best = {clr, c, a, D}; }
  return best.c; })();
shot('38', 50.44, {m: 'push', sz: 'insert', see: ['LEO_VR', 'swordStone'], prop: 'prop_sword', look: LK.P, why: 'the sword in the stone (35–60 % of frame, halo) from the far side; LEO_VR\'s hand reaching in',
  cam: C(CAM38, {...CAM38, position: r3v(lerp3(CAM38.position, CAM38.target, .05))})});
shot('39', 52.40, {m: 'push', sz: 'wide', sub: 'BOSS', see: ['BOSS', 'fingerD'], prop: 'prop_fingerD', look: LK.P, why: 'the finger through the crack taps the BOSS head 52.40 / 52.92 / 53.40 (big shake on 53.40)',
  cam: C(CAM39, {...CAM39, position: r3v(add(lerp3(CAM39.position, CAM39.target, .08), [-8, 0, 0]))})});
shot('40', 53.97, {m: 'push', sz: 'wide', sub: 'BOSS', see: ['BOSS', 'fingerD'], prop: 'prop_fingerD', look: LK.P, why: 'the finger flicks the dragon (contact 54.36); BOSS tumbles off the peak, spinning',
  cam: C(CAM40, {...CAM40, position: r3v(lerp3(CAM40.position, CAM40.target, .03))})});
shot('41', 55.42, {m: 'push', sz: 'close', sub: 'BOSS', see: ['BOSS'], look: LK.P, why: 'the dragon cries: BOSS sitting at the bottom, close, a big tear',
  cam: C(CAM41, {...CAM41, position: r3v(lerp3(CAM41.position, CAM41.target, .2))})});
// ---- real: the blade ----
shot('42', 56.73, {m: 'push', sz: 'medium', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'flash → real: LEO yanks the headset off (it leaves his head at 57.28), freeze 2', freeze: [.6, 2],
  cam: C(camAt(LEO_SIT, 115, 9.4, 3.7, 3.6, 40), camAt(LEO_SIT, 115, 8.8, 3.7, 3.6, 40))});
shot('43', 58.25, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: '"WHAT, Nova? I was about to win!": LEO close, standing, shout → angry at 59.24',
  cam: C(camAt(LEO_STAND, 25, 8.2, 4.1, 3.95, 38), camAt(LEO_STAND, 25, 7.6, 4.1, 3.95, 38))});   // E2: NOVA off the line of sight
shot('44', 60.48, {m: 'push', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'NOVA medium, quiet, calm, watering can in hand', cam: C(camAt(NOVA_STAND, -55, 9.6, 3.7, 3.6, 40), camAt(NOVA_STAND, -55, 9.0, 3.7, 3.6, 40))});
shot('45', 61.65, {m: 'tiltUp', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'NOVA points down; the camera tilts down along her arm to the ground',
  cam: C(camAt(NOVA_STAND, -140, 8.4, 4.2, 3.7, 42), {position: camAt(NOVA_STAND, -140, 8.4, 4.1, 3.7, 42).position, target: [2.5, 2.6, 12.6], fov: 42})});   // E3 read pass 2: from her other side (the pointing arm off her face); ends on her hand
shot('46', 63.01, {m: 'push', sz: 'insert', see: ['grass'], prop: 'prop_grass', look: LK.gray, why: 'low macro push across the dirt toward a small green speck',
  cam: C({position: r3v(add(G, [-.4, .55, 6.5])), target: r3v(add(G, [0, .25, 0])), fov: 34}, {position: r3v(add(G, [-.2, .45, 2.05])), target: r3v(add(G, [0, .35, 0])), fov: 34})});
shot('47', 65.02, {m: 'push', sz: 'insert', see: ['grass'], prop: 'prop_grass', look: LK.gray, why: 'HERO INSERT: the blade macro, backlit, dust motes; 35–60 % of frame; the only vivid green',
  cam: C({position: r3v(add(G, [.6, .6, 3.5])), target: r3v(add(G, [0, .5, 0])), fov: 34}, {position: r3v(add(G, [.55, .6, 3.3])), target: r3v(add(G, [0, .5, 0])), fov: 34})});
shot('48', 67.02, {m: 'crane', sz: 'wide', see: ['grass', 'town'], prop: 'prop_grass', look: LK.gray, why: 'scale reveal pull back: the tiny blade in the huge gray town',
  cam: (() => { const T8 = add(G, [0, .5, 0]), d = nrm([.14, .2, 1]); return C({position: r3v(add(T8, mul(d, 3.4))), target: r3v(T8), fov: 34}, {position: r3v(add(T8, mul(d, 21))), target: r3v(T8), fov: 46}); })()});   // E2: pull back along one ray (pan 0)
const CAN49 = [2.2, 1.5, 13.87], CAM49 = aimAt([-.2, 1.55, 14.7], CAN49, .5, .52, 50), LEO49 = (() => { const q = rayAt(CAM49, .9, .1, bisect(d => rayAt(CAM49, .9, .1, d)[1], .5, 30, 3.95)); return r3v([q[0], 0, q[2]]); })();
shot('49', 68.67, {glow: 1.0, m: 'push', sz: 'insert', see: ['NOVA', 'LEO'], prop: 'NOVA_can', look: LK.gray, why: 'insert: the dented can in NOVA\'s hand from the front; LEO\'s head turns into the frame edge',
  cam: C(CAM49, {...CAM49, position: r3v(lerp3(CAM49.position, CAM49.target, .06))})});
shot('50', 70.36, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: '"Every day?": LEO close, small o', cam: C(camAt(LEO_STAND, 40, 8.2, 4.1, 3.95, 38), camAt(LEO_STAND, 40, 7.6, 4.1, 3.95, 38))});
shot('51', 71.39, {m: 'push', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'Nova shrugs. "Somebody had to.": NOVA medium, shrug, content', cam: C(camAt(NOVA_STAND, -45, 9.8, 3.7, 3.6, 40), camAt(NOVA_STAND, -45, 8.5, 3.7, 3.6, 40))});
const L52 = [-.75, 0, 8.9], N52 = [1.2, 0, 8.6], CAM52 = aimAt(add(G, [.2, .5, 3.0]), [.55, 2.25, 8.8], .5, .44, 62);
shot('52', 73.67, {m: 'push', sz: 'wide', sub: 'NOVA', see: ['grass', 'LEO', 'NOVA'], look: LK.gray, why: '"Now touch grass": low wide from grass level, the blade big and sharp in the foreground (25–40 %), LEO + NOVA head to shoe behind; NOVA smiles',
  cam: C(CAM52, {...CAM52, position: r3v(lerp3(CAM52.position, CAM52.target, .02))})});
shot('53', 75.59, {m: 'push', sz: 'medium', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'LEO kneels down, medium side angle', cam: C(camAt(LEO_KNEEL, 55, 9.6, 4.8, 2.3, 40), camAt(LEO_KNEEL, 55, 9.0, 4.7, 2.3, 40))});   // E2: face toward the lens
shot('54', 76.86, {m: 'push', sz: 'insert', see: ['grass', 'leoFinger'], prop: 'prop_grass', look: LK.gray, why: 'macro: LEO\'s fingertip touches the blade (contact 77.32 "it"); mirrors the giant finger',
  cam: (() => { const c = aimAt(add(G, [.1, .45, 3.0]), add(G, [0, .7, 0]), .5, .5, 40); return C(c, {...c, position: r3v(lerp3(c.position, c.target, .06))}); })()});   // E3: ground-level side macro (+z); LEO kneels beside, not between
shot('55', 77.74, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gold, why: '"It\'s... kind of soft": LEO close, blush smile; the sun breaks through (dustGold from 77.74)',
  cam: C(camAt(LEO_KNEEL, 30, 8.0, 4.0, 2.65, 38), camAt(LEO_KNEEL, 30, 7.4, 3.95, 2.65, 38))});
shot('56', 79.69, {m: 'push', sz: 'wide', sub: 'LEO', see: ['LEO', 'TOWN_A', 'TOWN_B', 'TOWN_C'], look: LK.gold, why: 'LEO kneeling foreground, 3 townspeople behind lift their headsets off one after another',
  cam: C({position: r3v(add(LEO_KNEEL, [1.6, 4.2, 8.8])), target: [.4, 2.4, 4], fov: 50}, {position: r3v(add(LEO_KNEEL, [1.5, 4.2, 8.3])), target: [.4, 2.4, 4], fov: 50})});
for (const [k, t, who, P] of [['a', 81.56, 'TOWN_B', TB], ['b', 81.84, 'TOWN_C', TC], ['c', 82.08, 'TOWN_A', TA]])
  shot('57' + k, t, {lift: k === 'a' ? 1.2 : .8, m: 'push', sz: 'close', sub: who, see: [who], look: LK.gold, why: `beat cut ${k}: ${who} lifts the headset off, small o, blinking`, cam: C(camAt(P, 15, 9.0, k === 'a' ? 6.4 : 5.6, 4.7, 36), camAt(P, 15, 8.4, k === 'a' ? 6.3 : 5.5, 4.7, 36))});
shot('58', 82.65, {m: 'crane', sz: 'wide', see: ['town', 'LEO', 'NOVA', 'grass'], look: LK.gold, why: 'crane up, top-down-ish: the whole town standing in a circle around LEO, NOVA and the blade; gold light',
  cam: (() => { const T8 = add(G, [0, .5, 0]), d = nrm([.1, .82, .62]); return C({position: r3v(add(T8, mul(d, 17))), target: r3v(T8), fov: 50}, {position: r3v(add(T8, mul(d, 25))), target: r3v(T8), fov: 50}); })()});   // E2: crane up along one ray (pan 0)
const HS_DIRT = r3v(add(G, [.9, 0, 1.6]));
const SCR = r3v(add(HS_DIRT, [.1, .45, 1.35]));
shot('59', 85.66, {m: 'push', sz: 'insert', see: ['hsDirt'], prop: 'prop_hsDirt', look: LK.gold, why: 'Bzzt: LEO\'s headset on the dirt, the visor screen flickers on',
  cam: C({position: r3v(add(SCR, [.82, 4.8, 3.4])), target: r3v(add(SCR, [0, -.2, -.7])), fov: 36}, {position: r3v(add(SCR, [.79, 4.68, 3.3])), target: r3v(add(SCR, [0, -.2, -.7])), fov: 36})});
shot('60', 86.37, {m: 'push', sz: 'close', see: ['hsDirt'], prop: 'prop_hsDirt', look: LK.gold, why: 'push in on the visor screen: gold trophy + ACHIEVEMENT UNLOCKED (text in the upper half of frame)',
  cam: C(aimAt(add(SCR, [0, 1.8, 3.9]), SCR, .5, .4, 30), aimAt(add(SCR, [0, 1.6, 3.4]), SCR, .5, .4, 30))});
shot('61', 88.62, {m: 'push', sz: 'close', see: ['hsDirt', 'grass'], prop: 'prop_hsDirt', look: LK.gold, why: '"Touched grass.": the screen switches to TOUCHED GRASS; the real blade softly behind the visor; hard cut at 90.10',
  cam: C(aimAt(add(SCR, [.25, 1.65, 3.6]), SCR, .5, .4, 30), aimAt(add(SCR, [.24, 1.6, 3.45]), SCR, .5, .4, 30))});
// ---- timing helpers ----
const startOf = n => +(Math.round(T0[n] * FPS) / FPS - 1e-4).toFixed(4), endOf = n => { const i = S.findIndex(s => s.n === n); return i + 1 < S.length ? startOf(S[i + 1].n) : END; };   // frame-aligned: a shot's first frame is round(cut × fps)
const vis = spans => { const k = [[0, false]]; for (const [a, b] of spans) { k.push([a, true]); k.push([b, false]); } return k.sort((x, y) => x[0] - y[0]); };
// ---- cast ----
const cast = {
  TOWN_A: {style: 'v2', preset: 'TOWN_1', origin: TA, yaw: 15, keys: [[0, 'sit'], [startOf('56') + .9, 'raise'], [startOf('56') + 1.5, 'sit']], faces: [[0, 'flat_meh'], [startOf('56') + 1.4, 'o_small']],
    hs: [[0, 'head'], [startOf('56') + 1.25, 'hand']], visible: vis([[0, startOf('58')]])},
  TOWN_B: {style: 'v2', preset: 'TOWN_2', origin: TB, yaw: 20, keys: [[0, 'sit'], [startOf('56') + .2, 'raise'], [startOf('56') + .8, 'sit']], faces: [[0, 'unimpressed'], [startOf('56') + .7, 'o_small']],
    hs: [[0, 'head'], [startOf('56') + .55, 'hand']], visible: vis([[0, startOf('58')]])},
  TOWN_C: {style: 'v2', preset: 'TOWN_4', origin: TC, yaw: 10, keys: [[0, 'sit'], [startOf('56') + .55, 'raise'], [startOf('56') + 1.15, 'sit']], faces: [[0, 'calm'], [startOf('56') + 1.05, 'o_small']],
    hs: [[0, 'head'], [startOf('56') + .9, 'hand']], visible: vis([[0, startOf('58')]])},
  NOVA: {style: 'v2', preset: 'NOVA', origin: [.5, 0, -16], yaw: 0,
    marks: [[startOf('03'), {origin: [.5, 0, -8.6], yaw: 0, travel: {dir: [0, 1], speed: .67}}],   // E3: the clear aisle stretch (z −8.6 → −7.3)
      [startOf('08'), {origin: NOVA_STEP, yaw: -90}], [startOf('09'), {origin: NOVA_W9, yaw: -110}],
      [startOf('23'), {origin: NOVA_23, yaw: -120}], [startOf('30'), {origin: NOVA_23, yaw: -155}], [startOf('31'), {origin: NOVA_23, yaw: -120}], [startOf('42'), {origin: NOVA_STAND, yaw: -90}], [startOf('52'), {origin: N52, yaw: -15}], [startOf('53'), {origin: NOVA_STAND, yaw: -90}]],
    keys: [[0, 'walk'], [startOf('08'), 'sit'], [startOf('09'), 'point'], [startOf('11'), 'idle'], [startOf('23'), 'point'], [startOf('42'), 'idle'], [startOf('45') + .2, 'point'], [startOf('46'), 'idle'], [startOf('51') + .25, 'shrug'], [startOf('52'), 'idle']],
    faces: [[0, 'calm'], [startOf('30'), 'flat_meh'], [startOf('42'), 'calm'], [startOf('51'), 'content'], [startOf('52'), 'smile']],
    can: [[0, 'none'], ...[['08', 'hand'], ['11', 'none'], ['23', 'hand'], ['24', 'none'], ['42', 'hand'], ['45', 'none'], ['49', 'hand'], ['50', 'none']].map(([n, v]) => [fr(startOf(n)) - .001, v])],   // frame-aligned (cuts sit on round(t × fps))
    canTilt: [[0, 0], [startOf('09'), 0], [startOf('09') + .35, 48, 'ramp', .3], [startOf('10'), 48], [startOf('11'), 0], [startOf('23'), 40], [startOf('42'), 0]],
    visible: vis([[startOf('03'), startOf('04')], [startOf('08'), startOf('11')], [startOf('23'), startOf('24')], [startOf('30'), startOf('31')], [startOf('42'), END]])},
  LEO: {style: 'v2', preset: 'LEO', origin: LEO_SIT, yaw: 90,
    marks: [[startOf('43'), {origin: LEO_STAND, yaw: 90}], [startOf('49'), {origin: LEO49, yaw: Math.atan2(CAN49[0] - LEO49[0], CAN49[2] - LEO49[2]) / R + 70}], [startOf('49') + .9, {origin: LEO49, yaw: Math.atan2(CAN49[0] - LEO49[0], CAN49[2] - LEO49[2]) / R}],
      [startOf('50'), {origin: LEO_STAND, yaw: 95}], [startOf('52'), {origin: L52, yaw: 15}], [startOf('53'), {origin: LEO_KNEEL, yaw: 90}]],
    keys: [[0, 'sit'], [startOf('42'), 'raise', {snap: true}], [startOf('43'), 'idle'], [startOf('43') + .1, 'flail'], [startOf('43') + 1.0, 'idle'], [startOf('53'), 'kneel']],
    faces: [[0, 'unimpressed'], [startOf('13'), 'grin'], [startOf('23'), 'grin'], [startOf('42'), 'angry'], [startOf('43'), 'xd_shout'], [59.24, 'angry'], [startOf('49'), 'o_small'], [startOf('53'), 'calm'], [startOf('55'), 'blush_smile']],
    hs: [[0, 'hand'], [16.23, 'head'], [57.28, 'hand'], [startOf('43'), 'none']], visor: [[0, 'off'], [16.23, 'on']],
    tap: TAPS.a.map(fr), tapVis: [startOf('24'), endOf('24')], tapSide: 'left', visorLight: [[startOf('13'), startOf('14')]], visorLightI: 1.2,
    visible: vis([[startOf('11'), startOf('15')], [startOf('23'), startOf('25')], [startOf('42'), END]])},
  LEO_VR: {style: 'v2', preset: 'LEO_VR', origin: LVZ, yaw: 0,
    marks: [[startOf('18'), {origin: [0, 0, 0], yaw: 0}], [startOf('20'), {origin: at('S', [0, 1.3, 4.6]), yaw: 20}], [startOf('21'), {origin: LVP, yaw: 0}], [startOf('25'), {origin: LVZ, yaw: 0}],
      [startOf('38'), {origin: LVreach, yaw: 180}]],
    keys: [[0, 'heroPose'], [startOf('18'), 'sit'], [startOf('20'), 'pointUp', {snap: true}], [startOf('21'), 'fistPump', {snap: true}], [startOf('25'), 'lookUp'], [startOf('27'), 'idle'], [startOf('29'), 'lookUp'],
      [startOf('31'), 'armsCrossed', {snap: true}], [startOf('38'), 'point']],
    faces: [[0, 'grin'], [startOf('25'), 'shock'], [startOf('27'), 'stare_o'], [startOf('29'), 'side_eye'], [startOf('31'), 'unimpressed'], [startOf('38'), 'grin']],
    visible: vis([[startOf('16'), startOf('17')], [startOf('18'), startOf('22a')], [startOf('27'), startOf('28')], [startOf('29'), startOf('30')], [startOf('31'), startOf('32')], [startOf('38'), startOf('39')]])},
  BRO: {style: 'v2', preset: 'BRO', origin: BROZ, yaw: -25, keys: [[0, 'idle'], [startOf('27') + .2, 'lookUp']], faces: [[0, 'stare_o'], [startOf('28'), 'xd_wince']], visible: vis([[startOf('16'), startOf('17')], [startOf('27'), startOf('30')], [startOf('31'), startOf('32')]])},
  FRIEND_KNIGHT: {style: 'v2', preset: 'FRIEND_KNIGHT', origin: KNIGHT, yaw: -45, keys: [[0, 'cheer']], visible: vis([[startOf('21'), startOf('23')]])},
  FRIEND_ROBOT: {style: 'v2', preset: 'FRIEND_ROBOT', origin: ROBOT, yaw: 43, keys: [[0, 'cheer']], visible: vis([[startOf('21'), startOf('23')]])},
  FRIEND_MAGE: {style: 'v2', preset: 'FRIEND_MAGE', origin: MAGE, yaw: 4, keys: [[0, 'cheer']], visible: vis([[startOf('21'), startOf('23')]])},
};
// flying dragon (17–18): across the peaks, LEO_VR rides it in 18 (his mark follows the dragon's travel)
const DR0 = at('P', [62, 150, -190]), DRdir = [1, 0], DRspeed = 34;   // E3: high over the three right-hand peaks (17 / 18)
cast.DRAGON = {style: 'dragon', scale: 2.5, saddle: true, origin: DR0, yaw: 90, keys: [[0, 'fly']], marks: [[0, {origin: DR0, yaw: 90, travel: {dir: DRdir, speed: DRspeed, delay: startOf('17')}}]], visible: vis([[startOf('17'), startOf('19')]])};
const riderAt = t => add(DR0, [19 + DRspeed * Math.max(0, t - startOf('17')), 27.4, 0]);   // E3: on the neck base   // E2: on the saddle (body y 9 + 3.7 local × 2.5, seat − .88; saddle z 3.4 × 2.5 forward)
cast.LEO_VR.marks[0] = [startOf('18'), {origin: r3v(riderAt(startOf('18'))), yaw: 90, travel: {dir: DRdir, speed: DRspeed}}];
// the boss: perch, roar, flinch on the taps, tumble (keyed per frame), cry at the bottom
const BC = CASTF.BOSS, tum = [];
for (let t = 54.36; t <= startOf('41') + 1e-9; t += 2 / FPS) { const u = Math.min(1, (t - 54.36) / (startOf('41') - 54.36)), p = lerp3(add(BOSS0, [0, 0, 0]), BOSS1, u * u); tum.push([+t.toFixed(4), {origin: r3v([p[0] + 30 * Math.sin(Math.PI * u), p[1] + 40 * Math.sin(Math.PI * u), p[2]]), yaw: Math.round(20 + 720 * u)}]); }
cast.BOSS = {style: 'dragon', scale: BC.scale, colors: {...BC.colors, wing: '#3A2458', wingDk: '#2E1E48', dark: '#3E2660'},   // E2 gate pass 1 (P8): no near-black wings
   origin: BOSS0, yaw: 20,
  keys: [[0, 'perch'], [startOf('37'), 'roar'], [startOf('38'), 'perch'], ...TAPS.c.map(t => [fr(t), 'flinch']), [54.36, 'flee'], [startOf('41'), 'cry']],
  marks: [[0, {origin: BOSS0, yaw: 20}], ...tum, [startOf('41'), {origin: BOSS1, yaw: 20}]], visible: vis([[startOf('36'), startOf('42')]])};
// ---- story props (props7, spec.props set 'props7') ----
const keys = (list, ramp = .12) => list.map(([t, v, r]) => r ? [+t.toFixed(4), r3v(v), 'ramp', r === true ? ramp : r] : [+t.toFixed(4), r3v(v)]);
const tapKeys = (taps, contact, lift, t0, t1) => { const out = [[0, wristFor(add(contact, [0, 160, 0]))], [Math.min(t0, taps[0]) - 8 * F, wristFor(add(contact, [0, lift, 0]))]];   // E2: in place (lifted) when the shot opens
  for (const tp of taps.map(fr)) { out.push([tp - 3 * F, wristFor(add(contact, [0, lift, 0]))]); out.push([tp, wristFor(contact), 3 * F]); out.push([tp + 2 * F, wristFor(contact)]); out.push([tp + 6 * F, wristFor(add(contact, [0, lift, 0])), 4 * F]); }
  if (t1) out.push([t1, wristFor(add(contact, [0, lift, 0]))]); return out; };
const ZPOKE = at('Z', [0, 0, -10]), zTipDown = fr(35.12);
const props = [
  {id: 'tumbleweed', set: 'props7', prop: 'tumbleweed', p: {r: .7}, animAt: startOf('04'), pos: keys([[0, [-14, 0, 15]], [startOf('04'), [-14, 0, 15]], [endOf('04'), [6, 0, 13], endOf('04') - startOf('04')]]), visible: vis([[startOf('04'), endOf('04')]])},
  {id: 'stick', set: 'props7', prop: 'dryStick', pos: [[0, [2, 0, 27]]], rot: [[0, [0, 105, 0]]], visible: vis([[startOf('05'), endOf('05')]])},
  {id: 'birdhouse', set: 'props7', prop: 'birdhouse', pos: [[0, [-2.08, 6.93, 22]]], visible: vis([[0, startOf('15')], [startOf('23'), startOf('25')], [startOf('42'), END]])},
  {id: 'leoCrate', set: 'props7', prop: 'crate', p: {size: 1.2}, pos: [[0, LEO_CRATE]], rot: [[0, [0, 8, 0]]], visible: vis([[0, startOf('15')], [startOf('23'), startOf('25')], [startOf('42'), END]])},
  {id: 'grass', set: 'props7', prop: 'grassBlade', p: {sway: .05}, pos: [[0, G]], visible: vis([[startOf('46'), END]])},
  {id: 'hsDirt', set: 'props7', prop: 'headsetScreen', p: {flicker: [.1, .55]}, animAt: startOf('59'), pos: [[0, r3v(add(HS_DIRT, [0, .3, 0]))]], rot: [[0, [-12, 8, 0]]],
    states: [[0, 'off'], [startOf('59') + .55, 'achievement'], [startOf('61'), 'touched']], visible: vis([[startOf('59'), END]])},   // dropped out of view; shown from 59 (it blocked the blade macros 47 / 54)
  {id: 'leoFinger', set: 'props7', prop: 'giantFinger', p: {skin: '#CFC0B2', sleeve: '#8A8D92', cuffColor: '#77797D'}, scale: .13,
    pos: keys([[0, sub(add(G, [0, 1.0, 0]), mul(TIP, .13).map((v, i) => i === 1 ? v - .5 : v))], [startOf('54'), sub(add(G, [0, 1.0, 0]), mul(TIP, .13).map((v, i) => i === 1 ? v - .5 : v))],
      [fr(77.32), sub(add(G, [0, .98, 0]), mul(TIP, .13)), .35]]), visible: vis([[startOf('54'), endOf('54')]])},
  {id: 'sword', set: 'props7', prop: 'swordStone', pos: [[0, SWORD]], visible: vis([[startOf('21'), startOf('23')], [startOf('36'), startOf('42')]])},
  // giant fingers (scale 9: ~119 tall ≥ 20 × the 5.3 actor); E2: framed per shot (the owner's camera rule), tilted toward the lens in 28
  {id: 'fingerZ', set: 'props7', prop: 'giantFinger', scale: FS, p: {selfLight: .2}, pos: keys([[0, wristFor(add(T25, [0, 160, 0]))], [startOf('25'), wristFor(add(T25, [0, 26, 0]))], [startOf('25') + .65, wristFor(T25), .65],
    [startOf('26'), wristFor(T26s)], [zTipDown, wristFor(ZCON), zTipDown - startOf('26')], [startOf('27'), wristFor(add(ZCON, [0, 40, -20]))], [startOf('28'), wristFor(T28, AX28)], [startOf('31'), wristFor(T31)]]),
    rot: [[0, [0, 0, 0]], [startOf('28'), [AX28, 0, 0]], [startOf('29'), [0, 0, 0]]], visible: vis([[startOf('25'), startOf('27')], [startOf('28'), startOf('29')], [startOf('31'), startOf('32')]])},
  {id: 'fingerS', set: 'props7', prop: 'giantFinger', scale: FS, p: {flickDist: FLICK_S},
    pos: keys(tapKeys(TAPS.b, SC, 4, startOf('33'), startOf('34') + .05)), flick: [[0, 0], [startOf('34'), 0], [fr(45.96), 1, 'ramp', fr(45.96) - startOf('34') - .02]],
    visible: vis([[startOf('33'), startOf('35')]])},
  {id: 'fingerD', set: 'props7', prop: 'giantFinger', scale: FS, p: {flickDist: FLICK_D},
    pos: keys(tapKeys(TAPS.c, HC, 8, startOf('39'), startOf('40') + .05)), flick: [[0, 0], [startOf('40'), 0], [fr(54.36), 1, 'ramp', fr(54.36) - startOf('40') - .02]],
    visible: vis([[startOf('39'), startOf('41')]])},
];
// E2 cracks: one props7 skyCrack per finger shot, centred on the arm where it crosses the frame top, behind it, facing the camera
const CRACKS = {'25': [crackFor(CAM25, T25), startOf('25') + .08], '26': [crackFor(CAM26, ZCON)], '28': [crackFor(CAM28, T28, AX28)], '31': [crackFor(CAM31, T31)],
  '33': [crackFor(CAM33, add(SC, [0, 4, 0]))], '34': [crackFor(CAM34, SC, 0, {dx: FLICK_S * FS})], '39': [crackFor(CAM39, add(HC, [0, 8, 0]))], '40': [crackFor(CAM40, add(HC, [0, 6, 0]), 0, {dx: FLICK_D * FS})]};
for (const [n, [c, t0]] of Object.entries(CRACKS)) props.push({id: 'crack' + n, set: 'props7', prop: 'skyCrack', p: {h: c.h, w: c.w, seed: 4 + +n % 5, jitter: .12, ...(['33', '34'].includes(n) ? {opaque: true} : {sky: true})}, pos: [[0, c.pos]], rot: [[0, [0, c.rotY, 0]]],
  visible: vis([[t0 ?? startOf(n), endOf(n)]])});
// ships: Leo's ship (jolts on the taps, flicked into the sun), two enemies crossing with lasers
const shipJolt = [[0, SHIP], [startOf('32'), add(SHIP, [0, 0, -34])], [startOf('33') - 2 * F, SHIP, startOf('33') - 2 * F - startOf('32')]]; for (const tp of TAPS.b.map(fr)) { shipJolt.push([tp - F, SHIP]); shipJolt.push([tp + F, add(SHIP, [0, -.9, 0]), F * 2]); shipJolt.push([tp + 5 * F, SHIP, 4 * F]); }
const SUNP = at('S', [180, 20, -260]);
shipJolt.push([fr(45.96), SHIP]); shipJolt.push([startOf('35'), SHIP34, startOf('35') - fr(45.96)]); shipJolt.push([48.30, lerp3(SUNP, SHIP34, .25), 48.30 - startOf('35')]);
props.push({id: 'leoShip', set: 'props7', prop: 'spaceship', scale: 2.5, pos: keys(shipJolt.map(([t, v, r]) => [t, v, r])),
  rot: keys([[0, [0, 0, 0]], [fr(45.96), [0, 0, 0]], [48.30, [380, 940, 260], 48.30 - fr(45.96)]]), visible: vis([[startOf('19'), startOf('21')], [startOf('32'), 48.34]])});
props.push({id: 'enemy1', set: 'props7', prop: 'spaceship', scale: 2.5, p: {color: '#8A2A2A', accent: '#2A2A2A'}, pos: keys([[0, at('S', [-60, 8, -40])], [startOf('19'), at('S', [-60, 8, -40])], [startOf('21'), at('S', [40, 14, -70]), startOf('21') - startOf('19')],
  [startOf('32'), at('S', [-14, 5, -60])], [startOf('35'), at('S', [10, 8, -80]), startOf('35') - startOf('32')]]), rot: [[0, [0, 60, 0]]], visible: vis([[startOf('19'), startOf('21')], [startOf('32'), startOf('35')]])});
props.push({id: 'enemy2', set: 'props7', prop: 'spaceship', scale: 2.5, p: {color: '#8A2A2A', accent: '#2A2A2A'}, pos: keys([[0, at('S', [50, -4, -60])], [startOf('19'), at('S', [50, -4, -60])], [startOf('21'), at('S', [-30, 2, -90]), startOf('21') - startOf('19')],
  [startOf('32'), at('S', [16, -1, -55])], [startOf('35'), at('S', [-8, 3, -75]), startOf('35') - startOf('32')]]), rot: [[0, [0, -110, 0]]], visible: vis([[startOf('19'), startOf('21')], [startOf('32'), startOf('35')]])});
// ---- effects ----
const FLASH = '#49D9FF', CUTS = ['15', '23', '25', '30', '31', '42'].map(startOf);   // every real ↔ VR cut
const fx = [];
for (const c of CUTS) fx.push({type: 'flash', at: +(c === startOf('15') ? 18.70 : c - 2 * F).toFixed(4), dur: +(4 * F).toFixed(4), color: FLASH, peak: .9});
fx.push({type: 'flash', at: 48.30, dur: .3, color: '#ffffff', peak: 1});
fx.push({type: 'particles', preset: 'dust', at: 0, origin: r3v(add(faceTA, [Math.sin(15 * R) * 3.2, -.2, Math.cos(15 * R) * 3.2])), scale: .22, dur: 1.2, count: 16, seed: 3, spread: 3.2, life: [.8, 1.4]});
fx.push({type: 'particles', preset: 'sand', at: startOf('07'), origin: [-1, 3, 12], area: [44, 10, 40], dur: endOf('07') - startOf('07') + .1, count: 260, seed: 5, drift: [11, 1]});
fx.push({type: 'particles', preset: 'dust', at: startOf('07') + .1, origin: [-4, 1.5, 16], scale: 2.2, dur: 1.1, count: 60, seed: 6, spread: 4, life: [1, 1.6]});
fx.push({type: 'timeOfDay', at: startOf('08'), dur: endOf('08') - startOf('08'), from: LK.gray, to: {...LK.gray, sunAz: LK.gray.sunAz + 300, sunEl: 30}});
fx.push({type: 'particles', preset: 'rain', at: startOf('09') + .35, origin: [-.05, 1.35, 15.0], area: [.18, 2.7, .18], dur: endOf('10') - startOf('09'), count: 70, seed: 9, fall: 6, drift: [0, 0]});
fx.push({type: 'particles', preset: 'splash', at: startOf('09') + .5, origin: [-.05, .05, 15.0], scale: .35, dur: .8, count: 26, seed: 10, spread: .8, life: [.3, .5]});
fx.push({type: 'particles', preset: 'rain', at: startOf('23'), origin: r3v(add(NOVA_23, [-1.55, .75, -.7])), area: [.18, 1.5, .18], dur: endOf('23') - startOf('23'), count: 60, seed: 11, fall: 6, drift: [0, 0]});
fx.push({type: 'glow', target: 'LEO_headset', at: 16.23, dur: .6, color: FLASH, level: 1.2});
fx.push({type: 'trail', actor: 'DRAGON', mode: 'ribbon', height: 6, at: startOf('18') - .6, dur: endOf('18') - startOf('18') + .6, fade: .5, color: '#ffffff', width: .5});
for (const [id, a, b] of [['e1', at('S', [-50, 8, -45]), at('S', [10, 8, -40])], ['e2', at('S', [40, -2, -66]), at('S', [-10, 2, -60])]]) fx.push({type: 'lightning', at: startOf('19') + (id === 'e1' ? .1 : .45), from: a, to: b, color: '#ff4a4a', width: .25, flash: false, seed: id === 'e1' ? 3 : 5});
fx.push({type: 'particles', preset: 'starfall', at: startOf('20'), origin: at('S', [0, 4, 0]), area: [40, 24, 40], dur: endOf('20') - startOf('20'), count: 160, seed: 12});
fx.push({type: 'particles', preset: 'confetti', at: startOf('21') + .2, origin: r3v(add(LVP, [0, 8, 0])), scale: 2.4, dur: 2.2, count: 80, seed: 13, spread: 2});
const bolt = (n, k) => { const c = CRACKS[n][0]; return {from: r3v(add(c.pos, [0, c.h * .3, 0])), to: r3v(add(c.pos, [0, -c.h * .25, 0])), width: +(c.h * k).toFixed(2)}; };   // E2: the crack's own bolt
fx.push({type: 'lightning', at: startOf('25') + .08, ...bolt('25', .012), color: '#dff8ff', seed: 7, flashPeak: .3});
fx.push({type: 'shockwave', at: zTipDown, origin: r3v([ZCON[0], 0, ZCON[2]]), radius: 22, color: '#d8ffd0', dur: .7});
fx.push({type: 'particles', preset: 'dust', at: zTipDown, origin: r3v([ZCON[0], 0, ZCON[2]]), scale: 3, dur: 1.2, count: 90, seed: 14, spread: 5, life: [1, 1.8]});
fx.push({type: 'shake', at: zTipDown, dur: 2 * F, amp: .35, seed: 2});
fx.push({type: 'lightning', at: startOf('33') + .05, ...bolt('33', .012), color: '#e8fbff', seed: 8, flashPeak: .3});
for (const [k, a, b] of [[.1, [-12, 5, -58], [8, 2, -40]], [.45, [14, -1, -54], [-6, 4, -38]]]) fx.push({type: 'lightning', at: startOf('32') + k, from: at('S', a), to: at('S', b), color: '#ff4a4a', width: .3, flash: false, seed: 60 + k * 10});   // E2: battle lasers behind the ship
fx.push({type: 'lightning', at: startOf('36') + .3, from: r3v(add(BOSS0, [-60, 140, -60])), to: r3v(add(BOSS0, [-20, 10, -40])), color: '#dbe8ff', width: 2, seed: 9, flashPeak: .35});
fx.push({type: 'lightning', at: startOf('39') + .02, ...bolt('39', .012), color: '#e8fbff', seed: 10, flashPeak: .3});
fx.push({type: 'shake', at: startOf('37') + .25, dur: .5, amp: .3, seed: 3});
fx.push({type: 'halo', origin: r3v(add(SWORD, [0, 3.4, 0])), at: startOf('38'), dur: endOf('38') - startOf('38'), color: '#9BEBFF', size: 4});
for (const [k, list, contact] of [['a', TAPS.a, null], ['b', TAPS.b, SC], ['c', TAPS.c, HC]]) list.forEach((tp, i) => {
  const big = k === 'c' && i === 2; fx.push({type: 'shake', at: fr(tp), dur: 2 * F, amp: big ? .6 : .25, seed: 20 + i});
  if (big) fx.push({type: 'shake', at: fr(tp) + 2 * F, dur: 2 * F, amp: .6, seed: 30});
  if (contact) fx.push({type: 'particles', preset: 'rays', at: fr(tp), origin: r3v(contact), scale: k === 'c' ? 4 : 2, dur: .3, count: 22, seed: 40 + i}); });
fx.push({type: 'shockwave', at: fr(45.96), origin: add(SHIP, [0, 0, 0]), radius: 16, color: '#ffffff', dur: .5});
fx.push({type: 'particles', preset: 'rays', at: fr(54.36), origin: r3v(HC), scale: 5, dur: .35, count: 30, seed: 50});
fx.push({type: 'particles', preset: 'rockfall', at: 54.5, origin: r3v(add(BOSS0, [0, -4, 0])), scale: 6, dur: 1, count: 40, seed: 51});
fx.push({type: 'particles', preset: 'steam', at: startOf('47'), origin: r3v(add(G, [0, .6, 0])), scale: .25, dur: 2, count: 30, seed: 52, spread: .6, life: [1.4, 2]});
fx.push({type: 'particles', preset: 'sparkle', at: fr(77.32), origin: r3v(add(G, [0, 1.0, 0])), scale: .25, dur: .4, count: 14, seed: 53});
fx.push({type: 'timeOfDay', at: GOLD, dur: 1.4, from: {...LK.gray, exposure: LK.gold.exposure * .8}, to: LK.gold});
// ---- world state ----
const worldState = {
  townSeated: [[0, 1], [startOf('58'), 0]], townCircle: [[0, 0], [startOf('58'), 1], [startOf('59'), 0]],   // 59–61 tight inserts: the circle (r 5 ring) would stand in the camera
  zombies: [[0, 0], [startOf('25'), 1], [zTipDown, 2]], zombieZ: [[0, 0], [startOf('15'), 0], [startOf('17'), 2.6, 'ramp', startOf('17') - startOf('15')]],
  // E2: the world's fixed cracks stay off (crackZ / crackS / crackD); each finger shot carries its own crack prop
};
// ---- shots → spec ----
const shots = S.map(s => {
  const id = `${s.n}-${s.m}`, o = {id, at: s.t, move: s.m, size: s.sz, why: s.why, see: s.see, look: s.look, shadowRadius: 30};
  if (s.sub) o.subject = s.sub; if (s.prop) o.prop = s.prop;
  if (s.cam) { o.from = s.cam.from; o.to = s.cam.to; }
  if (s.k1) Object.assign(o, s.k1);
  for (const k of ['reveal', 'freeze', 'impact', 'zoomAt', 'snapAt', 'subjectAimY', 'subjectAimOffset', 'follow', 'ground']) if (s[k] !== undefined) o[k] = s[k];
  if (s.m === 'track' && o.from) o.followOffset = [0, 0, 0];
  if (s.sub && cast[s.sub]?.style === 'v2') o.subjectLift = s.lift ?? .3;   // E1 read pass 1 (standsOut); E2: per-shot strength (s.lift); LEO keeps his rim under the lift (world.js)
  if (s.glow) o.propGlow = s.glow;   // E2 read pass: insert props self-light (episode.js opt-in shot.propGlow)   // E1 read pass 1 (check 3 standsOut): the subject's own self-light (opt-in shot.subjectLift)
  return o;
});
const spec = {
  slug: 'touchgrass', fps: OUT_FPS, format: 5, labels: false,   /* no labels (owner rule) via labels: false; season: 1 would switch on the Season-1 template gate (122–150 s, B1–B9), which format 5 cannot meet */ end: END, framing: 'p3',
  note: 'Touch Grass E2 — written by scripts/v2/touchgrass-episode.js from stories/touchgrass/BEATS.md (61 shots; 22 and 57 = 3 beat cuts each). Edit the generator, not this file.',
  world: 'stories/touchgrass/world.js', decorate: true, look: LK.gray, castFile: 'cast/touchgrass.json', captionStyle: 'pop-shorts-v5', keywords: ['Nova', 'Leo', 'Tap', 'TAP', 'grass', 'Touched'],
  tgCastSpots: {dragonPeaks: [KNIGHT, ROBOT, MAGE].map(p => sub(p, OFF.P))}, worldState, effects: fx, cast, props, shots,
};
writeFileSync('stories/touchgrass/episode.json', JSON.stringify(spec, null, 1));
const off = shots.slice(1).filter(o => Math.min(...WORDS.map(w => Math.abs(w - o.at))) * FPS > 1).map(o => o.id);
console.log(JSON.stringify({shots: shots.length, beatsShots: new Set(S.map(s => s.n.slice(0, 2))).size, end: END, avg: +(END / shots.length).toFixed(2), offWord: off, props: props.length, cast: Object.keys(cast).length, effects: fx.length}));
