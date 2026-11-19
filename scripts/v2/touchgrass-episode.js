// scripts/v2/touchgrass-episode.js — writes stories/touchgrass/episode.json from stories/touchgrass/BEATS.md (owner shot list, 61 shots;
// shots 22 and 57 carry their 3 beat cuts as sub-shots a/b/c → 65 spec shots). toyhouse-episode.js pattern: every shot is data
// (cut = the BEATS word start in cues.json, move, size, subject, see/prop, faces, poses, effects, contact frames).
// World: stories/touchgrass/world.js (the 4 E0 locations side by side on x; OFF). Looks: per-world look presets built from the
// location JSONs (fog, sun direction for the shadow catcher, exposure); the location's own key/hemi lights do the lighting.
// The narration, voice, cues and BEATS are owner files: only read.
//   node scripts/v2/touchgrass-episode.js
import {readFileSync, writeFileSync} from 'node:fs';

const FPS = 24, END = 90.10, F = 1 / FPS;
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
  cam: C(camAt(TA, 15, 9, 4.8, 4.6, 34), {position: r3v(add(TA, [6, 10, 22])), target: r3v(add(TA, [-.5, 3.8, -2])), fov: 46})});
shot('03', 3.21, {m: 'lowWide', sz: 'wide', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'lowWide: NOVA in yellow walks between the rows toward camera, the only colour', k1: {actor: 'NOVA', h: KH * 1.2, dir: [0, -1], side: 'right'}});
shot('04', 5.18, {m: 'push', sz: 'wide', see: ['tumbleweed', 'deadTree'], look: LK.gray, why: 'wide establishing: cracked ground, dead tree, tumbleweed rolling across, shacks, haze',
  cam: C({position: [3, 3.2, 34], target: [-3, 2.4, 6], fov: 50}, {position: [2.6, 3.1, 32.6], target: [-3, 2.4, 6], fov: 50})});
shot('05', 7.21, {m: 'push', sz: 'insert', see: ['dryStick'], prop: 'prop_stick', look: LK.gray, why: 'insert: cracked dry dirt, one dry stick, slow slide',
  cam: C({position: [2.0, 1.75, 28.6], target: [2, .05, 27], fov: 40}, {position: [2.2, 1.72, 28.55], target: [2.15, .05, 27], fov: 40})});
shot('06', 7.92, {m: 'push', sz: 'insert', see: ['birdhouse', 'powerLine'], prop: 'prop_birdhouse', look: LK.gray, why: 'empty power line + broken birdhouse swinging',
  cam: C({position: [-.1, 5.0, 28.0], target: [-2.08, 5.75, 22], fov: 40}, {position: [-.2, 5.0, 27.7], target: [-2.08, 5.8, 22], fov: 40})});
shot('07', 8.93, {m: 'push', sz: 'wide', see: ['town'], look: LK.gray, why: 'wide, a dust gust crosses the whole frame',
  cam: C({position: [-6, 7.5, 30], target: [1, 2, -10], fov: 48}, {position: [-5.2, 7.2, 28.4], target: [1, 2, -10], fov: 48})});
shot('08', 10.14, {m: 'push', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'NOVA sits outside every day: porch step, medium; timelapse shadows sweep (days passing)',
  cam: C(camAt(NOVA_STEP, -70, 9.2, 3.0, 2.9, 40), camAt(NOVA_STEP, -70, 8.6, 3.0, 2.9, 40))});
shot('09', 12.52, {m: 'push', sz: 'insert', see: ['NOVA'], prop: 'NOVA_can', look: LK.gray, why: 'insert: the watering can pouring onto dry dirt; can + stream 35–60 % of frame',
  cam: C({position: [-2.0, 3.4, 16.5], target: [.5, 3.0, 15.2], fov: 40}, {position: [-1.85, 3.38, 16.42], target: [.5, 3.0, 15.2], fov: 40})});
shot('10', 13.82, {m: 'push', sz: 'wide', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'over the shoulder of a seated headset person (soft, foreground); NOVA small, watering in the background',
  cam: C({position: r3v(add(TB, [.9, 6.4, -5.2])), target: [2.0, 2.6, 14.4], fov: 32}, {position: r3v(add(TB, [.95, 6.35, -4.8])), target: [2.0, 2.6, 14.4], fov: 32})});
shot('11', 15.08, {m: 'push', sz: 'medium', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'LEO slumped on his porch chair, headset in his hand, unimpressed',
  cam: C(camAt(LEO_SIT, 70, 9.4, 3.7, 3.6, 40), camAt(LEO_SIT, 70, 8.8, 3.7, 3.6, 40))});
shot('12', 16.23, {m: 'push', sz: 'insert', see: ['LEO'], prop: 'LEO_headset', look: LK.gray, why: 'insert: the headset clicks ON on his head, the visor ignites', impact: 0,
  cam: C({position: [.05, 8.75, 11.37], target: [-3.1, 4.05, 10.5], fov: 34}, {position: [-.1, 8.55, 11.32], target: [-3.1, 4.05, 10.5], fov: 34})});
shot('13', 16.85, {m: 'snap', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'snap close LEO, blue glow on his face, freeze 2 frames, grin', freeze: [.12, 2], snapAt: 0,
  cam: C(camAt(LEO_SIT, 90, 14, 3.9, 3.85, 38), camAt(LEO_SIT, 90, 7.6, 3.9, 3.85, 38))});
shot('14', 17.74, {m: 'crashZoom', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'crash zoom INTO the visor; blue flash at 18.70', zoomAt: .25, subjectAimY: 3.75,
  cam: C(camAt(LEO_SIT, 100, 7.4, 3.8, 3.75, 40), {...camAt(LEO_SIT, 100, 7.4, 3.8, 3.75, 40), fov: 26})});
// ---- VR 1 ----
shot('15', 18.84, {m: 'push', sz: 'wide', see: ['zombies'], look: LK.Z, why: 'zombieCity wide, green fog, 8 zombies shuffling toward camera',
  cam: C({position: at('Z', [1.5, 3.6, 7]), target: at('Z', [0, 2.6, -14]), fov: 46}, {position: at('Z', [1.4, 3.5, 5.8]), target: at('Z', [0, 2.6, -14]), fov: 46})});
shot('16', 20.21, {m: 'heroLow', sz: 'medium', sub: 'LEO_VR', see: ['LEO_VR', 'zombies'], look: LK.Z, why: 'heroLow LEO_VR, glowing sword, heroPose, zombies behind, grin',
  cam: C({position: r3v(add(LVZ, [1.4, .8, 6.4])), target: r3v(add(LVZ, [0, 3.0, 0])), fov: 64}, {position: r3v(add(LVZ, [1.2, .8, 5.8])), target: r3v(add(LVZ, [0, 3.1, 0])), fov: 64})});
shot('17', 21.17, {m: 'track', sz: 'wide', sub: 'DRAGON', see: ['DRAGON'], look: LK.P, why: 'dragonPeaks wide: a dragon flies across the sunset peaks', follow: 'DRAGON',
  cam: C({position: [-30, 8, 110], target: [6, 10, 0], fov: 50}, {position: [-26, 8, 104], target: [6, 10, 0], fov: 50})});
shot('18', 22.17, {m: 'track', sz: 'wide', sub: 'LEO_VR', see: ['LEO_VR', 'DRAGON'], look: LK.P, why: 'drone track: LEO_VR riding the dragon, wind trails', follow: 'DRAGON',
  cam: C({position: [70, 30, 95], target: [0, 8, 0], fov: 44}, {position: [67, 29, 91], target: [0, 8, 0], fov: 44})});
shot('19', 23.04, {m: 'push', sz: 'wide', see: ['ships'], look: LK.S, why: 'space wide: ships crossing, laser trails, big sun',
  cam: C({position: at('S', [-30, 10, 44]), target: at('S', [30, 6, -60]), fov: 50}, {position: at('S', [-25, 9, 37]), target: at('S', [30, 6, -60]), fov: 50})});
shot('20', 23.98, {m: 'push', sz: 'medium', sub: 'LEO_VR', see: ['LEO_VR', 'leoShip'], look: LK.S, why: 'LEO_VR standing on his ship\'s nose, pointUp, stars streaking',
  cam: C({position: at('S', [6.5, 3.8, 13.5]), target: at('S', [0, 4.6, 4.6]), fov: 40}, {position: at('S', [6.0, 3.8, 12.6]), target: at('S', [0, 4.6, 4.6]), fov: 40})});
shot('21', 25.16, {m: 'crane', sz: 'wide', sub: 'LEO_VR', see: ['LEO_VR', 'friends'], look: LK.P, why: 'dragonPeaks plateau: crane up over 100 armored friends cheering around LEO_VR',
  cam: C({position: r3v(add(LVP, [3, 4, 13])), target: r3v(add(LVP, [0, 2.6, 0])), fov: 46}, {position: r3v(add(LVP, [4, 9, 18])), target: r3v(add(LVP, [0, 2.5, -.2])), fov: 46})});
for (const [k, t, who, P] of [['a', 27.27, 'FRIEND_KNIGHT', KNIGHT], ['b', 27.88, 'FRIEND_ROBOT', ROBOT], ['c', 28.60, 'FRIEND_MAGE', MAGE]])
  shot('22' + k, t, {m: 'push', sz: 'close', sub: who, see: [who], look: LK.P, why: `beat cut ${k}: close of ${who.slice(7).toLowerCase()}, cheering`, cam: C(camAt(P, Math.atan2(P[0] - OFF.P[0], P[2]) / R, 8.2, 3.7, 3.55, 38), camAt(P, Math.atan2(P[0] - OFF.P[0], P[2]) / R, 7.5, 3.7, 3.55, 38))});
// ---- real: the taps ----
shot('23', 29.27, {m: 'push', sz: 'wide', sub: 'LEO', see: ['LEO', 'NOVA'], look: LK.gray, why: 'flash → DUST TOWN wide two-shot: LEO frozen on his chair (headset on), NOVA beside him watering; cold',
  cam: C(camAt(add(LEO_SIT, [1.4, 0, .8]), 80, 17, 4.2, 2.4, 42), camAt(add(LEO_SIT, [1.4, 0, .8]), 80, 16, 4.1, 2.4, 42))});
shot('24', 31.08, {m: 'push', sz: 'insert', see: ['LEO'], prop: 'LEO_headset', look: LK.gray, why: 'insert: NOVA\'s finger taps LEO\'s headset at 31.08 / 31.66 / 32.23 (contact frames); headset 35–60 % of frame',
  cam: C({position: [-.55, 9.1, 13.85], target: [-3.1, 4.05, 10.7], fov: 34}, {position: [-.65, 8.9, 13.7], target: [-3.1, 4.05, 10.7], fov: 34})});
// ---- VR 2: the finger ----
shot('25', 32.98, {m: 'lowAuthority', sz: 'wide', see: ['zombies', 'crackZ'], look: LK.Z, why: 'flash → zombieCity low angle up: the sky splits (CRACK), zombies look up in shock',
  cam: C({position: at('Z', [2, .7, 8]), target: at('Z', [0, 40, -40]), fov: 40}, {position: at('Z', [2, .7, 7.4]), target: at('Z', [0, 40, -40]), fov: 40})});
shot('26', 34.34, {m: 'push', sz: 'wide', see: ['fingerZ', 'zombies'], prop: 'prop_fingerZ', look: LK.Z, why: 'scale reveal: the giant finger comes down through the crack; poke contact 35.12 → zombies knocked flat, shockwave dust',
  cam: C({position: at('Z', [14, 3, 24]), target: at('Z', [0, 20, -14]), fov: 58}, {position: at('Z', [18, 6, 40]), target: at('Z', [0, 30, -14]), fov: 58})});
shot('27', 36.37, {m: 'push', sz: 'medium', sub: 'BRO', see: ['LEO_VR', 'BRO'], look: LK.Z, why: '"Bro," his friend whispers: two-shot LEO_VR + BRO, BRO leans in',
  cam: C(camAt(add(LVZ, [1.2, 0, -.2]), 10, 12.8, 3.4, 3.2, 40), camAt(add(LVZ, [1.2, 0, -.2]), 10, 12.2, 3.4, 3.2, 40))});
shot('28', 37.98, {m: 'push', sz: 'close', sub: 'BRO', see: ['BRO', 'fingerZ'], prop: 'prop_fingerZ', look: LK.Z, why: 'MEME SHOT: BRO close, wince, the finger looming in the cracked sky behind him',
  cam: C({position: r3v(add(BROZ, [1.3, 2.6, 8.4])), target: r3v(add(BROZ, [0, 4.3, 0])), fov: 50}, {position: r3v(add(BROZ, [1.2, 2.6, 7.9])), target: r3v(add(BROZ, [0, 4.35, 0])), fov: 50})});
shot('29', 39.80, {m: 'push', sz: 'close', sub: 'LEO_VR', see: ['LEO_VR'], look: LK.Z, why: 'LEO_VR close, looks up, side eye', cam: C(camAt(LVZ, -10, 8.0, 3.2, 3.5, 38), camAt(LVZ, -10, 7.4, 3.2, 3.5, 38))});
shot('30', 41.08, {m: 'push', sz: 'close', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'flash → real: NOVA close, tapping, flat meh', cam: C(camAt(NOVA_23, -160, 7.2, 4.05, 4.0, 38), camAt(NOVA_23, -160, 6.7, 4.05, 4.0, 38))});
shot('31', 41.50, {m: 'push', sz: 'medium', sub: 'LEO_VR', see: ['LEO_VR', 'fingerZ'], look: LK.Z, why: 'flash → LEO_VR turns his back on the finger, arms crossed, unimpressed; finger behind him',
  cam: C({position: r3v(add(LVZ, [.8, 1.6, 10])), target: r3v(add(LVZ, [0, 4.2, 0])), fov: 48}, {position: r3v(add(LVZ, [.7, 1.6, 9.4])), target: r3v(add(LVZ, [0, 4.25, 0])), fov: 48})});
shot('32', 42.89, {m: 'push', sz: 'medium', see: ['leoShip'], prop: 'prop_leoShip', look: LK.S, why: 'space: LEO\'s ship flying toward camera, battle behind',
  cam: C({position: at('S', [3, 4, 30]), target: at('S', [0, 1, 0]), fov: 40}, {position: at('S', [2.7, 3.9, 28]), target: at('S', [0, 1, 0]), fov: 40})});
shot('33', 43.96, {m: 'push', sz: 'wide', see: ['leoShip', 'fingerS'], prop: 'prop_fingerS', look: LK.S, why: 'space wide: a crack opens in space, the finger taps the ship 43.96 / 44.49 / 45.00 (the ship jolts)',
  cam: C({position: at('S', [34, 14, 58]), target: at('S', [0, 34, 0]), fov: 60}, {position: at('S', [33, 14, 56]), target: at('S', [0, 34, 0]), fov: 60})});
shot('34', 45.62, {m: 'push', sz: 'wide', see: ['leoShip', 'fingerS'], look: LK.S, why: 'the finger flicks (contact 45.96 "boops"); the ship spins away tumbling',
  cam: C({position: at('S', [-30, 16, 60]), target: at('S', [10, 22, -10]), fov: 58}, {position: at('S', [-29, 16, 58]), target: at('S', [20, 20, -30]), fov: 58})});
shot('35', 47.12, {m: 'push', sz: 'wide', see: ['leoShip', 'sun'], look: LK.S, why: 'straight into the sun: the ship shrinks into it; white flash 48.30',
  cam: C({position: at('S', [-10, 6, 40]), target: at('S', [180, 20, -260]), fov: 44}, {position: at('S', [-6, 6, 36]), target: at('S', [180, 20, -260]), fov: 40})});
// ---- VR 3: the boss ----
shot('36', 48.48, {m: 'push', sz: 'wide', sub: 'BOSS', see: ['BOSS'], look: LK.P, why: 'dragonPeaks wide: BOSS on the highest peak, dark clouds, lightning',
  cam: C({position: r3v(add(BOSS0, [70, -30, 150])), target: r3v(add(BOSS0, [0, 20, 0])), fov: 44}, {position: r3v(add(BOSS0, [66, -30, 142])), target: r3v(add(BOSS0, [0, 20, 0])), fov: 44})});
shot('37', 49.44, {m: 'lowAuthority', sz: 'medium', sub: 'BOSS', see: ['BOSS'], look: LK.P, why: 'final boss: low authority, roars, shake', ground: BOSS0[1],
  cam: C({position: r3v(add(BOSS0, [30, .6, 120])), target: r3v(add(BOSS0, [0, 50, 0])), fov: 40}, {position: r3v(add(BOSS0, [29, .6, 117])), target: r3v(add(BOSS0, [0, 50, 0])), fov: 40})});
shot('38', 50.44, {m: 'push', sz: 'insert', see: ['LEO_VR', 'swordStone'], prop: 'prop_sword', look: LK.P, why: 'LEO_VR reaching for the glowing sword in the stone (halo); sword 35–60 % of frame',
  cam: C({position: r3v(add(SWORD, [6, 4.5, -13])), target: r3v(add(SWORD, [0, 2.2, 0])), fov: 40}, {position: r3v(add(SWORD, [5.7, 4.4, -12.4])), target: r3v(add(SWORD, [0, 2.2, 0])), fov: 40})});
shot('39', 52.40, {m: 'push', sz: 'wide', sub: 'BOSS', see: ['BOSS', 'fingerD'], prop: 'prop_fingerD', look: LK.P, why: 'wide: the finger behind the BOSS taps its head 52.40 / 52.92 / 53.40 (big shake on 53.40)',
  cam: C({position: r3v(add(BOSS0, [30, 10, 120])), target: r3v(add(BOSS0, [0, 45, 0])), fov: 56}, {position: r3v(add(BOSS0, [29, 10, 116])), target: r3v(add(BOSS0, [0, 45, 0])), fov: 56})});
shot('40', 53.97, {m: 'push', sz: 'wide', sub: 'BOSS', see: ['BOSS', 'fingerD'], look: LK.P, why: 'the finger flicks the dragon (contact 54.36); BOSS tumbles off the peak, spinning',
  cam: C({position: r3v(add(BOSS0, [380, -60, 420])), target: r3v(add(BOSS0, [27, -64, 70])), fov: 56}, {position: r3v(add(BOSS0, [372, -60, 412])), target: r3v(add(BOSS0, [27, -64, 70])), fov: 56})});
shot('41', 55.42, {m: 'push', sz: 'close', sub: 'BOSS', see: ['BOSS'], look: LK.P, why: 'the dragon cries: BOSS sitting at the bottom, close, a big tear',
  cam: C({position: r3v(add(BOSS1, [40, 35, 130])), target: r3v(add(BOSS1, [0, 36, 0])), fov: 40}, {position: r3v(add(BOSS1, [38, 35, 125])), target: r3v(add(BOSS1, [0, 36, 0])), fov: 40})});
// ---- real: the blade ----
shot('42', 56.73, {m: 'push', sz: 'medium', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'flash → real: LEO yanks the headset off (it leaves his head at 57.28), freeze 2', freeze: [.6, 2],
  cam: C(camAt(LEO_SIT, 115, 9.4, 3.7, 3.6, 40), camAt(LEO_SIT, 115, 8.8, 3.7, 3.6, 40))});
shot('43', 58.25, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: '"WHAT, Nova? I was about to win!": LEO close, standing, shout → angry at 59.24',
  cam: C(camAt(LEO_STAND, 70, 8.2, 4.1, 3.95, 38), camAt(LEO_STAND, 70, 7.6, 4.1, 3.95, 38))});
shot('44', 60.48, {m: 'push', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'NOVA medium, quiet, calm, watering can in hand', cam: C(camAt(NOVA_STAND, -55, 9.6, 3.7, 3.6, 40), camAt(NOVA_STAND, -55, 9.0, 3.7, 3.6, 40))});
shot('45', 61.65, {m: 'tiltUp', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'NOVA points down; the camera tilts down along her arm to the ground',
  cam: C(camAt(NOVA_STAND, -50, 9.6, 3.9, 3.6, 42), {...camAt(NOVA_STAND, -50, 9.6, 3.7, 2.6, 42)})});
shot('46', 63.01, {m: 'push', sz: 'insert', see: ['grass'], prop: 'prop_grass', look: LK.gray, why: 'low macro push across the dirt toward a small green speck',
  cam: C({position: r3v(add(G, [-.4, .55, 6.5])), target: r3v(add(G, [0, .25, 0])), fov: 34}, {position: r3v(add(G, [-.2, .45, 2.05])), target: r3v(add(G, [0, .35, 0])), fov: 34})});
shot('47', 65.02, {m: 'push', sz: 'insert', see: ['grass'], prop: 'prop_grass', look: LK.gray, why: 'HERO INSERT: the blade macro, backlit, dust motes; 35–60 % of frame; the only vivid green',
  cam: C({position: r3v(add(G, [.6, .6, 3.5])), target: r3v(add(G, [0, .5, 0])), fov: 34}, {position: r3v(add(G, [.55, .6, 3.3])), target: r3v(add(G, [0, .5, 0])), fov: 34})});
shot('48', 67.02, {m: 'crane', sz: 'wide', see: ['grass', 'town'], prop: 'prop_grass', look: LK.gray, why: 'scale reveal pull back: the tiny blade in the huge gray town',
  cam: C({position: r3v(add(G, [.5, .7, 3.6])), target: r3v(add(G, [0, .5, 0])), fov: 34}, {position: r3v(add(G, [2.5, 9, 18])), target: r3v(add(G, [0, .5, 0])), fov: 46})});
shot('49', 68.67, {m: 'push', sz: 'insert', see: ['NOVA', 'LEO'], prop: 'NOVA_can', look: LK.gray, why: 'insert: the dented can in NOVA\'s hand; LEO\'s head turns into the frame edge',
  cam: C({position: [.75, 2.15, 16.7], target: [2.18, 1.5, 13.87], fov: 40}, {position: [.85, 2.12, 16.5], target: [2.18, 1.5, 13.87], fov: 40})});
shot('50', 70.36, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gray, why: '"Every day?": LEO close, small o', cam: C(camAt(LEO_STAND, 75, 8.2, 4.1, 3.95, 38), camAt(LEO_STAND, 75, 7.6, 4.1, 3.95, 38))});
shot('51', 71.39, {m: 'push', sz: 'medium', sub: 'NOVA', see: ['NOVA'], look: LK.gray, why: 'Nova shrugs. "Somebody had to.": NOVA medium, shrug, content', cam: C(camAt(NOVA_STAND, -45, 9.8, 3.7, 3.6, 40), camAt(NOVA_STAND, -45, 8.5, 3.7, 3.6, 40))});
shot('52', 73.67, {m: 'push', sz: 'wide', sub: 'NOVA', see: ['grass', 'LEO', 'NOVA'], look: LK.gray, why: '"Now touch grass": low wide from grass level, the blade big in the foreground, LEO + NOVA behind; NOVA smiles',
  cam: C({position: r3v(add(G, [.6, .6, 7.8])), target: r3v(add(G, [.9, 2.4, 0])), fov: 62}, {position: r3v(add(G, [.58, .6, 7.5])), target: r3v(add(G, [.9, 2.4, 0])), fov: 62})});
shot('53', 75.59, {m: 'push', sz: 'medium', sub: 'LEO', see: ['LEO'], look: LK.gray, why: 'LEO kneels down, medium side angle', cam: C(camAt(LEO_KNEEL, 0, 9.6, 2.6, 2.3, 40), camAt(LEO_KNEEL, 0, 9.0, 2.6, 2.3, 40))});
shot('54', 76.86, {m: 'push', sz: 'insert', see: ['grass', 'leoFinger'], prop: 'prop_grass', look: LK.gray, why: 'macro: LEO\'s fingertip touches the blade (contact 77.32 "it"); mirrors the giant finger',
  cam: C({position: r3v(add(G, [.6, .8, 3.5])), target: r3v(add(G, [0, .55, 0])), fov: 34}, {position: r3v(add(G, [.55, .8, 3.3])), target: r3v(add(G, [0, .55, 0])), fov: 34})});
shot('55', 77.74, {m: 'push', sz: 'close', sub: 'LEO', see: ['LEO'], look: LK.gold, why: '"It\'s... kind of soft": LEO close, blush smile; the sun breaks through (dustGold from 77.74)',
  cam: C(camAt(LEO_KNEEL, 30, 8.0, 2.75, 2.65, 38), camAt(LEO_KNEEL, 30, 7.4, 2.75, 2.65, 38))});
shot('56', 79.69, {m: 'push', sz: 'wide', sub: 'LEO', see: ['LEO', 'TOWN_A', 'TOWN_B', 'TOWN_C'], look: LK.gold, why: 'LEO kneeling foreground, 3 townspeople behind lift their headsets off one after another',
  cam: C({position: r3v(add(LEO_KNEEL, [3.0, 2.8, 8.5])), target: [-.95, 2.4, 6], fov: 46}, {position: r3v(add(LEO_KNEEL, [2.8, 2.8, 8.0])), target: [-.95, 2.4, 6], fov: 46})});
for (const [k, t, who, P] of [['a', 81.56, 'TOWN_B', TB], ['b', 81.84, 'TOWN_C', TC], ['c', 82.08, 'TOWN_A', TA]])
  shot('57' + k, t, {m: 'push', sz: 'close', sub: who, see: [who], look: LK.gold, why: `beat cut ${k}: ${who} lifts the headset off, small o, blinking`, cam: C(camAt(P, 15, 9.0, 4.8, 4.7, 36), camAt(P, 15, 8.4, 4.8, 4.7, 36))});
shot('58', 82.65, {m: 'crane', sz: 'wide', see: ['town', 'LEO', 'NOVA', 'grass'], look: LK.gold, why: 'crane up, top-down-ish: the whole town standing in a circle around LEO, NOVA and the blade; gold light',
  cam: C({position: r3v(add(G, [2, 9, 18])), target: r3v(add(G, [0, .5, 0])), fov: 50}, {position: r3v(add(G, [1.6, 22, 13])), target: r3v(add(G, [0, .5, 0])), fov: 50})});
const HS_DIRT = r3v(add(G, [.9, 0, 1.6]));
const SCR = r3v(add(HS_DIRT, [.1, .45, 1.35]));
shot('59', 85.66, {m: 'push', sz: 'insert', see: ['hsDirt'], prop: 'prop_hsDirt', look: LK.gold, why: 'Bzzt: LEO\'s headset on the dirt, the visor screen flickers on',
  cam: C({position: r3v(add(SCR, [.7, 4.1, 2.9])), target: r3v(add(SCR, [0, -.2, -.7])), fov: 36}, {position: r3v(add(SCR, [.66, 3.95, 2.8])), target: r3v(add(SCR, [0, -.2, -.7])), fov: 36})});
shot('60', 86.37, {m: 'push', sz: 'close', see: ['hsDirt'], prop: 'prop_hsDirt', look: LK.gold, why: 'push in on the visor screen: gold trophy + ACHIEVEMENT UNLOCKED (text in the upper half of frame)',
  cam: C({position: r3v(add(SCR, [0, .45, 4.2])), target: r3v(add(SCR, [0, -.55, 0])), fov: 30}, {position: r3v(add(SCR, [0, .4, 3.6])), target: r3v(add(SCR, [0, -.5, 0])), fov: 30})});
shot('61', 88.62, {m: 'push', sz: 'close', see: ['hsDirt', 'grass'], prop: 'prop_hsDirt', look: LK.gold, why: '"Touched grass.": the screen switches to TOUCHED GRASS; the real blade softly behind the visor; hard cut at 90.10',
  cam: C({position: r3v(add(SCR, [.25, .4, 3.7])), target: r3v(add(SCR, [-.05, -.5, 0])), fov: 30}, {position: r3v(add(SCR, [.24, .38, 3.55])), target: r3v(add(SCR, [-.05, -.5, 0])), fov: 30})});
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
    marks: [[startOf('03'), {origin: [.5, 0, -14.5], yaw: 0, travel: {dir: [0, 1], speed: .67}}], [startOf('08'), {origin: NOVA_STEP, yaw: -90}], [startOf('09'), {origin: NOVA_W9, yaw: -110}],
      [startOf('23'), {origin: NOVA_23, yaw: -120}], [startOf('42'), {origin: NOVA_STAND, yaw: -90}]],
    keys: [[0, 'walk'], [startOf('08'), 'sit'], [startOf('09'), 'point'], [startOf('11'), 'idle'], [startOf('23'), 'point'], [startOf('42'), 'idle'], [startOf('45') + .2, 'point'], [startOf('46'), 'idle'], [startOf('51') + .25, 'shrug'], [startOf('52'), 'idle']],
    faces: [[0, 'calm'], [startOf('30'), 'flat_meh'], [startOf('42'), 'calm'], [startOf('51'), 'content'], [startOf('52'), 'smile']],
    can: [[0, 'none'], ...[['08', 'hand'], ['11', 'none'], ['23', 'hand'], ['24', 'none'], ['42', 'hand'], ['45', 'none'], ['49', 'hand'], ['50', 'none']].map(([n, v]) => [fr(startOf(n)) - .001, v])],   // frame-aligned (cuts sit on round(t × fps))
    canTilt: [[0, 0], [startOf('09'), 0], [startOf('09') + .35, 48, 'ramp', .3], [startOf('10'), 48], [startOf('11'), 0], [startOf('23'), 40], [startOf('42'), 0]],
    visible: vis([[startOf('03'), startOf('04')], [startOf('08'), startOf('11')], [startOf('23'), startOf('24')], [startOf('30'), startOf('31')], [startOf('42'), END]])},
  LEO: {style: 'v2', preset: 'LEO', origin: LEO_SIT, yaw: 90,
    marks: [[startOf('43'), {origin: LEO_STAND, yaw: 90}], [startOf('49'), {origin: LEO_STAND, yaw: 60}], [startOf('49') + .9, {origin: LEO_STAND, yaw: 95}], [startOf('53'), {origin: LEO_KNEEL, yaw: 90}]],
    keys: [[0, 'sit'], [startOf('42'), 'raise', {snap: true}], [startOf('43'), 'idle'], [startOf('43') + .1, 'flail'], [startOf('43') + 1.0, 'idle'], [startOf('53'), 'kneel']],
    faces: [[0, 'unimpressed'], [startOf('13'), 'grin'], [startOf('23'), 'grin'], [startOf('42'), 'angry'], [startOf('43'), 'xd_shout'], [59.24, 'angry'], [startOf('49'), 'o_small'], [startOf('53'), 'calm'], [startOf('55'), 'blush_smile']],
    hs: [[0, 'hand'], [16.23, 'head'], [57.28, 'hand'], [startOf('43'), 'none']], visor: [[0, 'off'], [16.23, 'on']],
    tap: TAPS.a.map(fr), tapVis: [startOf('24'), endOf('24')],
    visible: vis([[startOf('11'), startOf('15')], [startOf('23'), startOf('25')], [startOf('42'), END]])},
  LEO_VR: {style: 'v2', preset: 'LEO_VR', origin: LVZ, yaw: 0,
    marks: [[startOf('18'), {origin: [0, 0, 0], yaw: 0}], [startOf('20'), {origin: at('S', [0, 1.3, 4.6]), yaw: 20}], [startOf('21'), {origin: LVP, yaw: 0}], [startOf('25'), {origin: LVZ, yaw: 0}],
      [startOf('38'), {origin: LVreach, yaw: 180}]],
    keys: [[0, 'heroPose'], [startOf('18'), 'sit'], [startOf('20'), 'pointUp', {snap: true}], [startOf('21'), 'fistPump', {snap: true}], [startOf('25'), 'lookUp'], [startOf('27'), 'idle'], [startOf('29'), 'lookUp'],
      [startOf('31'), 'armsCrossed', {snap: true}], [startOf('38'), 'point']],
    faces: [[0, 'grin'], [startOf('25'), 'shock'], [startOf('27'), 'stare_o'], [startOf('29'), 'side_eye'], [startOf('31'), 'unimpressed'], [startOf('38'), 'grin']],
    visible: vis([[startOf('16'), startOf('17')], [startOf('18'), startOf('22a')], [startOf('25'), startOf('30')], [startOf('31'), startOf('32')], [startOf('38'), startOf('39')]])},
  BRO: {style: 'v2', preset: 'BRO', origin: BROZ, yaw: -25, keys: [[0, 'idle'], [startOf('27') + .2, 'lookUp']], faces: [[0, 'stare_o'], [startOf('28'), 'xd_wince']], visible: vis([[startOf('16'), startOf('17')], [startOf('25'), startOf('30')], [startOf('31'), startOf('32')]])},
  FRIEND_KNIGHT: {style: 'v2', preset: 'FRIEND_KNIGHT', origin: KNIGHT, yaw: -45, keys: [[0, 'cheer']], visible: vis([[startOf('21'), startOf('23')]])},
  FRIEND_ROBOT: {style: 'v2', preset: 'FRIEND_ROBOT', origin: ROBOT, yaw: 43, keys: [[0, 'cheer']], visible: vis([[startOf('21'), startOf('23')]])},
  FRIEND_MAGE: {style: 'v2', preset: 'FRIEND_MAGE', origin: MAGE, yaw: 4, keys: [[0, 'cheer']], visible: vis([[startOf('21'), startOf('23')]])},
};
// flying dragon (17–18): across the peaks, LEO_VR rides it in 18 (his mark follows the dragon's travel)
const DR0 = at('P', [-32, 40, 20]), DRdir = [1, 0], DRspeed = 34;
cast.DRAGON = {style: 'dragon', scale: 2.5, saddle: true, origin: DR0, yaw: 90, keys: [[0, 'fly']], marks: [[0, {origin: DR0, yaw: 90, travel: {dir: DRdir, speed: DRspeed, delay: startOf('17')}}]], visible: vis([[startOf('17'), startOf('19')]])};
const riderAt = t => add(DR0, [DRspeed * Math.max(0, t - startOf('17')), 5.2, 0]);
cast.LEO_VR.marks[0] = [startOf('18'), {origin: r3v(riderAt(startOf('18'))), yaw: 90, travel: {dir: DRdir, speed: DRspeed}}];
// the boss: perch, roar, flinch on the taps, tumble (keyed per frame), cry at the bottom
const BC = CASTF.BOSS, tum = [];
for (let t = 54.36; t <= startOf('41') + 1e-9; t += 2 / FPS) { const u = Math.min(1, (t - 54.36) / (startOf('41') - 54.36)), p = lerp3(add(BOSS0, [0, 0, 0]), BOSS1, u * u); tum.push([+t.toFixed(4), {origin: r3v([p[0] + 30 * Math.sin(Math.PI * u), p[1] + 40 * Math.sin(Math.PI * u), p[2]]), yaw: Math.round(20 + 720 * u)}]); }
cast.BOSS = {style: 'dragon', scale: BC.scale, colors: BC.colors, origin: BOSS0, yaw: 20,
  keys: [[0, 'perch'], [startOf('37'), 'roar'], [startOf('38'), 'perch'], ...TAPS.c.map(t => [fr(t), 'flinch']), [54.36, 'flee'], [startOf('41'), 'cry']],
  marks: [[0, {origin: BOSS0, yaw: 20}], ...tum, [startOf('41'), {origin: BOSS1, yaw: 20}]], visible: vis([[startOf('36'), startOf('42')]])};
// ---- story props (props7, spec.props set 'props7') ----
const keys = (list, ramp = .12) => list.map(([t, v, r]) => r ? [+t.toFixed(4), r3v(v), 'ramp', r === true ? ramp : r] : [+t.toFixed(4), r3v(v)]);
// giant finger tip (local, unflicked): knuckle (-.55, -1.95) + joint -1.7 + tip -1.58 → (-.55, -5.23, -.05) × scale; pointing down
const TIP = [-.55, -5.23, -.05], FS = 9, wristFor = tip => sub(tip, mul(TIP, FS));
const tapKeys = (taps, contact, lift, t0, t1) => { const out = [[0, wristFor(add(contact, [0, 160, 0]))], [t0, wristFor(add(contact, [0, 70, 0]))], [taps[0] - 8 * F, wristFor(add(contact, [0, lift, 0])), .5]];
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
  // giant fingers (scale 9: ~119 tall ≥ 20 × the 5.3 actor)
  {id: 'fingerZ', set: 'props7', prop: 'giantFinger', scale: FS, pos: keys([[0, wristFor(add(ZPOKE, [0, 160, 0]))], [startOf('26'), wristFor(add(ZPOKE, [0, 70, 0]))], [zTipDown, wristFor(ZPOKE), zTipDown - startOf('26')],
    [zTipDown + 6 * F, wristFor(ZPOKE)], [startOf('27'), wristFor(add(ZPOKE, [0, 34, -18]))], [startOf('28'), wristFor(add(ZPOKE, [0, 26, -22]))], [startOf('31'), wristFor(add(ZPOKE, [-6, 30, -22]))]]),
    visible: vis([[startOf('26'), startOf('29')], [startOf('31'), startOf('32')]])},
  {id: 'fingerS', set: 'props7', prop: 'giantFinger', scale: FS, flickDist: 7, p: {flickDist: 7},
    pos: keys(tapKeys(TAPS.b, add(SHIP, [0, 1.4, 0]), 4, startOf('33'), startOf('34') + .05)), flick: [[0, 0], [startOf('34'), 0], [fr(45.96), 1, 'ramp', fr(45.96) - startOf('34') - .02]],
    visible: vis([[startOf('33'), startOf('35')]])},
  {id: 'fingerD', set: 'props7', prop: 'giantFinger', scale: FS, p: {flickDist: 7},
    pos: keys(tapKeys(TAPS.c, add(BOSS0, [0, 13, 4]), 6, startOf('39'), startOf('40') + .05)), flick: [[0, 0], [startOf('40'), 0], [fr(54.36), 1, 'ramp', fr(54.36) - startOf('40') - .02]],
    visible: vis([[startOf('39'), startOf('41')]])},
];
// ships: Leo's ship (jolts on the taps, flicked into the sun), two enemies crossing with lasers
const shipJolt = [[0, SHIP]]; for (const tp of TAPS.b.map(fr)) { shipJolt.push([tp - F, SHIP]); shipJolt.push([tp + F, add(SHIP, [0, -.9, 0]), F * 2]); shipJolt.push([tp + 5 * F, SHIP, 4 * F]); }
const SUNP = at('S', [180, 20, -260]);
shipJolt.push([fr(45.96), SHIP]); shipJolt.push([startOf('35'), add(SHIP, [60, 10, -70]), startOf('35') - fr(45.96)]); shipJolt.push([48.30, lerp3(SUNP, add(SHIP, [60, 10, -70]), .25), 48.30 - startOf('35')]);
props.push({id: 'leoShip', set: 'props7', prop: 'spaceship', scale: 2.5, pos: keys(shipJolt.map(([t, v, r]) => [t, v, r])),
  rot: keys([[0, [0, 0, 0]], [fr(45.96), [0, 0, 0]], [48.30, [380, 940, 260], 48.30 - fr(45.96)]]), visible: vis([[startOf('19'), startOf('21')], [startOf('32'), 48.34]])});
props.push({id: 'enemy1', set: 'props7', prop: 'spaceship', scale: 2.5, p: {color: '#8A2A2A', accent: '#2A2A2A'}, pos: keys([[0, at('S', [-60, 8, -40])], [startOf('19'), at('S', [-60, 8, -40])], [startOf('21'), at('S', [40, 14, -70]), startOf('21') - startOf('19')],
  [startOf('32'), at('S', [-40, 6, -50])], [startOf('35'), at('S', [30, 10, -80]), startOf('35') - startOf('32')]]), rot: [[0, [0, 60, 0]]], visible: vis([[startOf('19'), startOf('21')], [startOf('32'), startOf('35')]])});
props.push({id: 'enemy2', set: 'props7', prop: 'spaceship', scale: 2.5, p: {color: '#8A2A2A', accent: '#2A2A2A'}, pos: keys([[0, at('S', [50, -4, -60])], [startOf('19'), at('S', [50, -4, -60])], [startOf('21'), at('S', [-30, 2, -90]), startOf('21') - startOf('19')],
  [startOf('32'), at('S', [44, -2, -40])], [startOf('35'), at('S', [-30, 4, -70]), startOf('35') - startOf('32')]]), rot: [[0, [0, -110, 0]]], visible: vis([[startOf('19'), startOf('21')], [startOf('32'), startOf('35')]])});
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
fx.push({type: 'lightning', at: startOf('25') + .08, from: at('Z', [-6, 95, -30]), to: at('Z', [6, 30, -30]), color: '#dff8ff', width: .8, seed: 7, flashPeak: .3});
fx.push({type: 'shockwave', at: zTipDown, origin: ZPOKE, radius: 22, color: '#d8ffd0', dur: .7});
fx.push({type: 'particles', preset: 'dust', at: zTipDown, origin: ZPOKE, scale: 3, dur: 1.2, count: 90, seed: 14, spread: 5, life: [1, 1.8]});
fx.push({type: 'shake', at: zTipDown, dur: 2 * F, amp: .35, seed: 2});
fx.push({type: 'lightning', at: startOf('33') + .05, from: at('S', [-8, 70, -110]), to: at('S', [8, 10, -110]), color: '#e8fbff', width: 1, seed: 8, flashPeak: .3});
fx.push({type: 'lightning', at: startOf('36') + .3, from: r3v(add(BOSS0, [-60, 140, -60])), to: r3v(add(BOSS0, [-20, 10, -40])), color: '#dbe8ff', width: 2, seed: 9, flashPeak: .35});
fx.push({type: 'lightning', at: startOf('39') + .02, from: r3v(add(BOSS0, [0, 300, -90])), to: r3v(add(BOSS0, [0, 60, -90])), color: '#e8fbff', width: 2.2, seed: 10, flashPeak: .3});
fx.push({type: 'shake', at: startOf('37') + .25, dur: .5, amp: .3, seed: 3});
fx.push({type: 'halo', origin: r3v(add(SWORD, [0, 3.4, 0])), at: startOf('38'), dur: endOf('38') - startOf('38'), color: '#9BEBFF', size: 4});
for (const [k, list, contact] of [['a', TAPS.a, null], ['b', TAPS.b, add(SHIP, [0, 1.4, 0])], ['c', TAPS.c, add(BOSS0, [0, 13, 4])]]) list.forEach((tp, i) => {
  const big = k === 'c' && i === 2; fx.push({type: 'shake', at: fr(tp), dur: 2 * F, amp: big ? .6 : .25, seed: 20 + i});
  if (big) fx.push({type: 'shake', at: fr(tp) + 2 * F, dur: 2 * F, amp: .6, seed: 30});
  if (contact) fx.push({type: 'particles', preset: 'rays', at: fr(tp), origin: r3v(contact), scale: k === 'c' ? 4 : 2, dur: .3, count: 22, seed: 40 + i}); });
fx.push({type: 'shockwave', at: fr(45.96), origin: add(SHIP, [0, 0, 0]), radius: 16, color: '#ffffff', dur: .5});
fx.push({type: 'particles', preset: 'rays', at: fr(54.36), origin: r3v(add(BOSS0, [0, 13, 4])), scale: 5, dur: .35, count: 30, seed: 50});
fx.push({type: 'particles', preset: 'rockfall', at: 54.5, origin: r3v(add(BOSS0, [0, -4, 0])), scale: 6, dur: 1, count: 40, seed: 51});
fx.push({type: 'particles', preset: 'steam', at: startOf('47'), origin: r3v(add(G, [0, .6, 0])), scale: .25, dur: 2, count: 30, seed: 52, spread: .6, life: [1.4, 2]});
fx.push({type: 'particles', preset: 'sparkle', at: fr(77.32), origin: r3v(add(G, [0, 1.0, 0])), scale: .25, dur: .4, count: 14, seed: 53});
fx.push({type: 'timeOfDay', at: GOLD, dur: 1.4, from: {...LK.gray, exposure: LK.gold.exposure * .8}, to: LK.gold});
// ---- world state ----
const worldState = {
  townSeated: [[0, 1], [startOf('58'), 0]], townCircle: [[0, 0], [startOf('58'), 1], [startOf('59'), 0]],   // 59–61 tight inserts: the circle (r 5 ring) would stand in the camera
  zombies: [[0, 0], [startOf('25'), 1], [zTipDown, 2]], zombieZ: [[0, 0], [startOf('15'), 0], [startOf('17'), 2.6, 'ramp', startOf('17') - startOf('15')]],
  crackZ: [[0, 0], [startOf('25') + .08, 1], [startOf('29'), 0], [startOf('31'), 1], [startOf('32'), 0]], crackS: [[0, 0], [startOf('33') + .05, 1], [startOf('35'), 0]], crackD: [[0, 0], [startOf('39') + .02, 1], [startOf('41'), 0]],
};
// ---- shots → spec ----
const shots = S.map(s => {
  const id = `${s.n}-${s.m}`, o = {id, at: s.t, move: s.m, size: s.sz, why: s.why, see: s.see, look: s.look, shadowRadius: 30};
  if (s.sub) o.subject = s.sub; if (s.prop) o.prop = s.prop;
  if (s.cam) { o.from = s.cam.from; o.to = s.cam.to; }
  if (s.k1) Object.assign(o, s.k1);
  for (const k of ['reveal', 'freeze', 'impact', 'zoomAt', 'snapAt', 'subjectAimY', 'follow', 'ground']) if (s[k] !== undefined) o[k] = s[k];
  if (s.m === 'track' && o.from) o.followOffset = [0, 0, 0];
  if (s.sub && cast[s.sub]?.style === 'v2') o.subjectLift = .3;   // E1 read pass 1 (check 3 standsOut): the subject's own self-light (opt-in shot.subjectLift)
  return o;
});
const spec = {
  slug: 'touchgrass', fps: FPS, format: 5, labels: false,   /* no labels (owner rule) via labels: false; season: 1 would switch on the Season-1 template gate (122–150 s, B1–B9), which format 5 cannot meet */ end: END, framing: 'p3',
  note: 'Touch Grass E1 — written by scripts/v2/touchgrass-episode.js from stories/touchgrass/BEATS.md (61 shots; 22 and 57 = 3 beat cuts each). Edit the generator, not this file.',
  world: 'stories/touchgrass/world.js', decorate: true, look: LK.gray, castFile: 'cast/touchgrass.json', captionStyle: 'pop-shorts-v5', keywords: ['Nova', 'Leo', 'Tap', 'TAP', 'grass', 'Touched'],
  tgCastSpots: {dragonPeaks: [KNIGHT, ROBOT, MAGE].map(p => sub(p, OFF.P))}, worldState, effects: fx, cast, props, shots,
};
writeFileSync('stories/touchgrass/episode.json', JSON.stringify(spec, null, 1));
const off = shots.slice(1).filter(o => Math.min(...WORDS.map(w => Math.abs(w - o.at))) * FPS > 1).map(o => o.id);
console.log(JSON.stringify({shots: shots.length, beatsShots: new Set(S.map(s => s.n.slice(0, 2))).size, end: END, avg: +(END / shots.length).toFixed(2), offWord: off, props: props.length, cast: Object.keys(cast).length, effects: fx.length}));
