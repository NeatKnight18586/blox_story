// scripts/v2/toyhouse-episode.js — writes stories/toyhouse/episode.json from stories/toyhouse/BEATS.md (owner shot list, 53 shots).
// Each shot is data: cut time (= the BEATS word time, a cues.json word start), move, size, subject, where the actors stand,
// and the camera (computed from the subject's mark: az = the camera's direction seen from the subject, dist, fov).
// The narration, voice and cues are owner files: only read. Light states (Look 5b + Look 6) and clock times follow BEATS.md.
//   node scripts/v2/toyhouse-episode.js
import {readFileSync, writeFileSync} from 'node:fs';
import {ANCHORS, PRACTICALS, groundY as hallY} from '../../parts/sets4/toyhouse.js';
import {ANCHORS as STREET} from '../../parts/sets4/toyhouse_street.js';
import {corridorClear} from '../../parts/sets4/look5.js';

const FPS = 24, END = 81.75;   // voice 80.9 s + a 0.85 s hold on the last shot (shot 53 ≤ 3.5 s)
const cues = JSON.parse(readFileSync('stories/toyhouse/cues.json', 'utf8')), WORDS = cues.lines.flatMap(l => l.words.map(w => w.start));
const castData = JSON.parse(readFileSync('cast/toyhouse.json', 'utf8')).cast;
const R = Math.PI / 180, add = (a, b) => a.map((v, i) => v + (b[i] ?? 0)), r2 = v => +v.toFixed(2), r2v = a => a.map(r2);
const gy = (x, z) => (z > 35 ? 0 : hallY(x, z));
const HEAD = {kid: 3.95, adult: 4.8};
// camera on a subject standing at P (ground point): az = direction from the subject to the camera (deg, 0 = +z), dist, fov, h (camera
// height above the ground), aim (target height above the ground), push (fraction toward the target over the shot)
function cam(P, {az = 0, dist = 4, fov = 40, h, aim, push = .06, slide = null}) {
  const g = gy(P[0], P[2]), pos = [P[0] + Math.sin(az * R) * dist, g + h, P[2] + Math.cos(az * R) * dist], tgt = [P[0], g + aim, P[2]];
  const to = slide ? add(pos, slide) : pos.map((v, i) => v + (tgt[i] - v) * push);
  return {from: {position: r2v(pos), target: r2v(tgt), fov}, to: {position: r2v(to), target: r2v(tgt), fov}};
}
const SIZE = {   // kid framings (adults: + .85 on h/aim)
  close: {dist: 3.0, fov: 38, h: 3.9, aim: 3.62}, medium: {dist: 4.8, fov: 40, h: 3.6, aim: 3.05}, wide: {dist: 11, fov: 45, h: 4.2, aim: 2.5}};
const frame = (P, size, o = {}, adult = false) => { const s = SIZE[size], k = adult ? .85 : 0; return cam(P, {...s, h: s.h + k, aim: s.aim + k, ...o}); };
const azTo = (P, Q) => Math.atan2(Q[0] - P[0], Q[2] - P[2]) / R;   // yaw (deg) for an actor at P to face Q

// ---- places (ground points) ---------------------------------------------------------------------------------------------------
const CLOCK = [1.4, 8.4, 31.3], KEY = [-2.0, 5.05, 30.95], PHOTO = [2.5, 5.6, 31.25], HYPER = [-66, 1.42, -27], GUMS = [-44, 5, 26], FOUNT = [-52, 0, 14];
// E1 fix places: T02 kart, T11 kart run, T12 duel yaws, T13 fountain, T14/T15 grab spots, T49 hands
const K2 = [7, 0, 6], K11 = {x: -12.6, z0: -10, z1: -29}, FT = [-52, 0, 14], G14 = [-25, 0, -30], G15 = [-47, 0, -46], H49 = [.9, 0, 24.5];
const P = {
  front: [0, 0, 14], heroFront: [-2.2, 0, 16], moFront: [2.2, 0, 16], plushKid: [-14, 0, 6], fountKid: [-49.2, 0, 11.4], tramp: [56, 0, 22],
  aisleA: [-12, 0, -16], aisleB: [-12, 0, -52], arenaA: [-55, 0, -60], arenaB: [-50, 0, -68], moStill: [-4, 0, 4], hero18: [-3, 0, 0],
  gadget: [-62.5, 0, -27], gumHero: [-38.5, 0, 22], tapeSpot: [-58, 0, -18], pit: [51.5, .8, -20.5], pitEdge: [51.5, 0, -10.5],
  counterHero: [-2.4, 0, 24.6], pip: [0.6, 0, 29.6], counterMo: [1.4, 0, 24.6], waddle: [12, 0, -14], moCry: [6, 0, 6],
  street: [0, 0, 50], truckBack: [-14.6, 0, 52.5], dadStreet: [-11.5, 0, 50.5], walkOut: [0, 0, 40],
};

const YA = azTo(P.arenaA, P.arenaB), YB = azTo(P.arenaB, P.arenaA);
const seat = (K, yaw) => [K[0] - .35 * Math.sin(yaw * R), -.32, K[2] - .35 * Math.cos(yaw * R)];
const K2yaw = 75, K11yaw = 205;
// ---- the 53 shots (BEATS.md) ------------------------------------------------------------------------------------------------------
// t: cut time (cues word start) · m: move · sz: size · sub: subject · cam: {from, to} · plus look, grade, freeze, impact, reveal, clock, why
const S = [];
const add5 = (n, t, o) => S.push({n, t, ...o});
const top = (c, h, fov, deg = 30) => ({cam: {from: {position: [c[0], h, c[2] + .01], target: c, fov}}, degrees: deg, height: h});
// 01 god's-eye over the full hall, slow spiral down (a moving crane straight down, 3° off vertical: counts as camera motion)
add5(1, 0.0, {m: 'push', sz: 'wide', look: 'toyPartyTop', reveal: true, why: "god's-eye over the full hall, slow spiral down",
  cam: {from: {position: [6, 230, -64], target: [0, 0, -70], fov: 50}, to: {position: [-5.2, 150, -66], target: [0, 0, -72], fov: 46}}, ease: 'inOutSine'});
add5(2, 1.16, {m: 'crashZoom', sz: 'close', sub: 'kidc', look: 'toyParty', impact: .64, why: 'crashZoom into the chaos: ends on a grinning kid in a kart firing a foam blaster; dart hit 1.80',
  cam: {from: {position: add(K2, [7.5, 6.2, 9.0]), target: add(seat(K2, K2yaw), [0, 3.55, 0]), fov: 62}, to: {fov: 13}}, zoomAt: .1, subjectAimY: 3.55});
add5(3, 2.04, {m: 'push', sz: 'wide', look: 'toyPartyWide', freeze: [.12, 2], why: 'the shutter slams shut, seen from inside; kids cheering in front',
  cam: {from: {position: [0, 3.2, 15.5], target: [0, 3.9, 35], fov: 48}, to: {position: [0, 3.2, 16.6], target: [0, 3.9, 35], fov: 48}}, see: ['shutter', 'kida', 'kidb']});
add5(4, 2.56, {m: 'push', sz: 'wide', look: 'toyPartyWide', why: 'wide hall reveal, lights finishing; HERO + MO small in the foreground', spectacle: true,
  cam: {from: {position: [0, 9, 26], target: [0, 3, -10], fov: 58}, to: {position: [0, 8.6, 23.5], target: [0, 3.4, -10], fov: 58}}, see: ['hero', 'mo']});
add5(5, 3.556, {m: 'crashZoom', sz: 'insert', clock: true, why: 'crashZoom to the wall clock, 9:00', prop: 'clock',
  cam: {from: {position: [0.4, 6.2, 18], target: CLOCK, fov: 42}, to: {fov: 12}}, zoomAt: .12});
add5(6, 4.56, {m: 'push', sz: 'medium', sub: 'kida', why: 'kid hugging a giant plush, push in', cam: frame(P.plushKid, 'medium', {az: 20, dist: 6.4, push: .12})});
add5(7, 6.08, {m: 'push', sz: 'close', sub: 'kida', why: 'same kid, snap to close, face starry', cam: frame(P.plushKid, 'close', {az: 20, dist: 3.5})});
add5(8, 7.41, {m: 'topDown', sz: 'wide', look: 'toyNightTop', static: true, why: 'top-down timelapse, kids flooding the zones', ...top([0, 0, -30], 150, 52, 25)});
add5(9, 8.54, {m: 'push', sz: 'insert', clock: true, prop: 'clock', why: 'clock hands spin (insert)', cam: {from: {position: [1.32, 8.32, 28.0], target: CLOCK, fov: 46}, to: {position: [1.34, 8.34, 28.2], target: CLOCK, fov: 46}}});
add5(10, 8.96, {m: 'heroLow', sz: 'wide', sub: 'kidb', freeze: [.9, 3], why: 'trampoline kid at the top of a jump, freeze 3 frames',
  cam: {from: {position: [49.5, 1.0, 13.2], target: [56, 6.5, 22], fov: 64}, to: {position: [51.2, 1.0, 15.6], target: [56, 8.0, 22], fov: 64}}, ground: 0});
add5(11, 10.95, {m: 'aisleTrack', sz: 'wide', sub: 'kidc', prop: 'prop_kart', why: 'aisle track: the kart drifts past right beside the camera, tyre smoke',
  cam: {from: {position: [-8.4, 2.6, K11.z0 + 2.5], target: [-12, 2.2, K11.z0 - 6], fov: 52}, to: {position: [-8.4, 2.6, K11.z1 + 4.0], target: [-12, 2.2, K11.z1 - 6], fov: 52}}, follow: 'kidc', followOffset: [0, 1.4, 0], subjectLift: .35});
add5(12, 12.30, {m: 'splitScreen', sz: 'wide', impact: .74, why: 'foam blaster duel; split screen, darts mid-air, a hit at 13.04',
  a: frame(P.arenaA, 'medium', {az: YA - 55, dist: 6.0, aim: 2.9}), b: frame(P.arenaB, 'medium', {az: YB + 55, dist: 6.0, aim: 2.9}), see: ['kidb', 'kidc']});
add5(13, 13.61, {m: 'push', sz: 'medium', prop: 'prop_fountain', see: ['kida'], why: 'candy zone push: a kid face-first in the flowing chocolate fountain',
  cam: {from: {position: add(FT, [5.6, 4.4, 8.6]), target: add(FT, [.9, 3.1, 0]), fov: 44}, to: {position: add(FT, [5.1, 4.3, 7.8]), target: add(FT, [.9, 3.1, 0]), fov: 44}}});
add5(14, 15.92, {m: 'push', sz: 'insert', prop: 'prop_grabPlush', see: ['kidc'], why: 'a hand grabs a plush off the shelf (beat cut)',
  cam: {from: {position: add(G14, [2.4, 3.6, 4.4]), target: add(G14, [0, 3.0, 0]), fov: 46}, to: {position: add(G14, [2.1, 3.6, 3.8]), target: add(G14, [0, 3.1, 0]), fov: 46}}});
add5(15, 16.64, {m: 'push', sz: 'insert', prop: 'prop_grabBlaster', see: ['kidb'], why: 'two hands snatch a foam blaster (beat cut)',
  cam: {from: {position: add(G15, [-4.4, 4.9, 7.4]), target: add(G15, [-.9, 3.5, 0]), fov: 50}, to: {position: add(G15, [-4.1, 5.0, 6.8]), target: add(G15, [-.9, 3.8, 0]), fov: 50}}});
add5(16, 17.60, {m: 'push', sz: 'medium', sub: 'mo', why: 'MO standing still, empty hands, chaos blurred past', cam: frame(P.moStill, 'medium', {az: 10, dist: 5.6})});
add5(17, 18.92, {m: 'push', sz: 'medium', sub: 'mo', clock: true, why: "over MO's shoulder to the clock 9:xx (back view: Mo faces the clock)", back: true,
  cam: {from: {position: [-1.8, 1.6, 16.8], target: CLOCK, fov: 46}, to: {position: [-1.76, 1.62, 17.1], target: CLOCK, fov: 46}}});
add5(18, 20.91, {m: 'heroLow', sz: 'medium', sub: 'hero', why: 'HERO heroLow, smug → beam on "all"', cam: frame(P.hero18, 'medium', {az: 0, dist: 4.6, h: 1.0, aim: 3.3, fov: 62}), ground: 0});
add5(19, 22.94, {m: 'tiltUp', sz: 'wide', why: 'tilt up the gadget wall to HYPERBOX 9', see: ['hyperbox'],
  cam: {from: {position: [-55, 3.2, -19], target: [-66, 1.4, -27], fov: 46}, to: {position: [-55.2, 3.5, -19.2], target: [-66.4, 3.4, -27], fov: 46}}});
add5(20, 24.80, {m: 'push', sz: 'medium', sub: 'hero', why: 'HERO hugs it, the box covers his face', cam: frame(P.gadget, 'medium', {az: 60, dist: 6.0, aim: 2.9})});
add5(21, 26.33, {m: 'snap', sz: 'close', sub: 'hero', freeze: [.3, 2], why: 'snap close HERO worried, freeze 2', snapAt: .08,
  cam: {from: frame(P.gadget, 'medium', {az: 60, dist: 6.0, aim: 3.3}).from, to: frame(P.gadget, 'close', {az: 60, dist: 3.7, h: 4.5}).from}});
add5(22, 27.07, {m: 'push', sz: 'wide', why: 'HERO POV to the gumball tower, push', see: ['gumballs'],
  cam: {from: {position: [-37, 3.6, 15.5], target: [-44, 6, 26], fov: 50}, to: {position: [-39.4, 3.9, 19.0], target: [-44, 6.2, 26], fov: 46}}});
add5(23, 29.58, {m: 'push', sz: 'insert', prop: 'prop_tape', why: 'tape roll spins, wrap montage (cut 1)', cam: {from: {position: [-57.2, 2.6, -14.6], target: [-58, 2.4, -17.6], fov: 52}, to: {position: [-57.3, 2.6, -14.9], target: [-58, 2.4, -17.6], fov: 52}}});
add5(24, 31.40, {m: 'push', sz: 'medium', sub: 'taped', why: 'a drone taped to his back', cam: frame(P.tapeSpot, 'medium', {az: 170, dist: 5.2}), back: true});
add5(25, 32.48, {m: 'snap', sz: 'close', sub: 'taped', why: 'a headset slapped on', snapAt: .04,
  cam: {from: frame(P.tapeSpot, 'medium', {az: 20, dist: 5.4}).from, to: frame(P.tapeSpot, 'close', {az: 20, dist: 3.2}).from}});
add5(26, 32.92, {m: 'pull', sz: 'medium', sub: 'taped', why: 'pull back: a giant gummy bear on his chest', cam: (c => ({from: c.to, to: c.from}))(frame(P.tapeSpot, 'medium', {az: 50, dist: 4.0, push: -.6, aim: 2.9}))});
add5(27, 34.67, {m: 'push', sz: 'wide', sub: 'taped', why: 'HERO_TAPED full body, empty tape rolls around him', cam: frame(P.tapeSpot, 'wide', {az: 30, dist: 9, fov: 42, aim: 2.2})});
add5(28, 36.09, {m: 'push', sz: 'wide', sub: 'taped', impact: 1.83, why: 'one waddle step, falls backward into the ball pit; impact 37.92, ball splash', cam: frame(P.pitEdge, 'wide', {az: -35, dist: 9.5, aim: 1.8, fov: 48})});
add5(29, 38.61, {m: 'splitScreen', sz: 'wide', look: 'toyLate', clock: true, why: 'clock 4:00 (toyLate), then HERO in the pit, side_eye',
  a: {from: {position: [1.36, 8.36, 26.6], target: CLOCK, fov: 24}, to: {position: [1.37, 8.37, 27.0], target: CLOCK, fov: 24}}, b: {from: {position: [51.5, 4.8, -11], target: [51.5, 2.8, -20.5], fov: 30}, to: {position: [51.5, 4.7, -11.6], target: [51.5, 2.8, -20.5], fov: 30}}, see: ['taped']});
add5(30, 40.77, {m: 'crashZoom', sz: 'insert', prop: 'prop_key', why: 'crashZoom to the key on its hook (insert ≥ 40 %)',
  cam: {from: {position: [-1.2, 4.8, 20], target: KEY, fov: 40}, to: {fov: 12}}, zoomAt: .78});
add5(31, 42.81, {m: 'push', sz: 'medium', sub: 'taped', back: true, see: ['taped', 'key'], why: "HERO's taped hand reaching for the key (back view: he faces the key)", cam: {from: {position: [-5.4, 3.2, 21.0], target: [-2.3, 4.6, 29], fov: 50}, to: {position: [-5.1, 3.25, 21.6], target: [-2.3, 4.6, 29], fov: 50}}});
add5(32, 44.32, {m: 'topDown', sz: 'wide', look: 'toyLateTop', static: true, why: 'top-down of the whole hall (dim, toyLate)', ...top([0, 0, -70], 300, 50, 20)});
add5(33, 45.39, {m: 'push', sz: 'insert', prop: 'photoFrame', why: 'push to the framed photo next to the hook',
  cam: {from: {position: [2.3, 5.6, 22.2], target: [2.5, 5.6, 31.25], fov: 38}, to: {position: [2.35, 5.6, 22.6], target: [2.5, 5.6, 31.25], fov: 38}}});
add5(34, 46.71, {m: 'push', sz: 'medium', sub: 'youngpip', grade: 'memory', why: 'the photo comes alive: YOUNG PIP holding the key (sepia)', cam: frame([0, 0, -2], 'medium', {az: 0, dist: 5.4})});
add5(35, 49.81, {m: 'push', sz: 'medium', sub: 'pip', why: 'PIP reveal behind the counter in the dark, one lamp', cam: frame(P.pip, 'medium', {az: 172, dist: 4.2, fov: 40, h: 4.9, aim: 4.6})});
add5(36, 51.27, {m: 'lowAuthority', sz: 'wide', sub: 'pip', why: 'slow pull back: PIP tiny and alone in the huge hall',
  cam: {from: {position: [-3, .7, 4], target: [0.6, 5.2, 29.6], fov: 36}, to: {position: [-4, .7, -8], target: [0.6, 6.2, 29.6], fov: 40}}});
add5(37, 54.20, {m: 'push', sz: 'insert', prop: 'prop_key', why: 'HERO hangs the key back, close insert', cam: {from: {position: [-2.6, 5.0, 27.4], target: [-2.0, 5.2, 30.95], fov: 34}, to: {position: [-2.5, 5.0, 27.8], target: [-2.0, 5.2, 30.95], fov: 34}}});
add5(38, 55.66, {m: 'crashZoom', sz: 'insert', clock: true, prop: 'clock', why: 'clock 7:58 crashZoom', cam: {from: {position: [3, 6.0, 19], target: CLOCK, fov: 44}, to: {fov: 13}}, zoomAt: .1});
add5(39, 56.70, {m: 'aisleTrack', sz: 'wide', sub: 'taped', why: 'HERO_TAPED waddles back with everything, aisle track (comedic)',
  cam: {from: {position: [12.6, 3.6, -6], target: [12, 2.6, -16], fov: 48}, to: {position: [12.6, 3.6, -4.6], target: [12, 2.6, -14], fov: 48}}, follow: 'taped'});
add5(40, 58.90, {m: 'push', sz: 'close', sub: 'mo', why: 'MO close, crying', cam: frame(P.moCry, 'close', {az: -15, dist: 3.1})});
add5(41, 60.03, {m: 'push', sz: 'wide', sub: 'mo', look: 'dawn', grade: 'dawn', why: "memory: MO's house, the moving truck", cam: frame([-12, 0, 47], 'wide', {az: 60, dist: 13, aim: 3.0, fov: 50})});
add5(42, 61.94, {m: 'push', sz: 'medium', look: 'dawn', grade: 'dawn', prop: 'prop_box1', why: 'truck doors close on the boxes',
  cam: {from: {position: [-5.8, 3.4, 53.8], target: [-14.5, 2.6, 52.5], fov: 44}, to: {position: [-7.6, 3.4, 53.3], target: [-14.5, 2.6, 52.5], fov: 44}}});
add5(43, 63.47, {m: 'push', sz: 'insert', see: ['mo'], why: "MO's empty hands, insert", cam: frame(P.moCry, 'close', {az: -15, dist: 4.6, h: 2.8, aim: 2.2, fov: 40, push: .2})});
add5(44, 65.22, {m: 'push', sz: 'medium', sub: 'mo', why: 'push on MO looking at HERO, sad', cam: frame(P.moCry, 'medium', {az: 35, dist: 5.2, push: .1})});
add5(45, 66.86, {m: 'crashZoom', sz: 'insert', clock: true, prop: 'clock', look: 'toyDawn', why: 'clock 7:59, crashZoom, dawn slats glowing', cam: {from: {position: [-2, 5.4, 18], target: CLOCK, fov: 50}, to: {fov: 12}}, zoomAt: .42});
add5(46, 68.19, {m: 'push', sz: 'insert', look: 'toyDawn', prop: 'prop_hyper', freeze: [.4, 2], impact: .55, why: 'HYPERBOX 9 falls; freeze 2 + impact', cam: {from: {position: [4.2, 1.8, 12.2], target: [6.8, 1.3, 6.6], fov: 52}, to: {position: [4.3, 1.8, 12.0], target: [6.8, 1.2, 6.6], fov: 52}}});
add5(47, 69.33, {m: 'push', sz: 'insert', look: 'toyDawn', prop: 'prop_drone', why: 'the drone drops', cam: {from: {position: [14.2, 3.0, 16.0], target: [8.6, 1.0, 6.0], fov: 42}, to: {position: [14.0, 3.0, 15.6], target: [8.6, .9, 6.0], fov: 42}}});
add5(48, 70.40, {m: 'push', sz: 'wide', look: 'toyDawn', sub: 'taped', why: 'tape tears, everything falls off, high angle', cam: frame([7.4, 0, 6], 'wide', {az: 20, dist: 6, h: 12, aim: 1.4, fov: 46}), subjectLift: .4});
add5(49, 71.54, {m: 'push', sz: 'insert', look: 'toyDawn', clock: true, why: 'close insert of the two hands holding; the clock 8:00 behind', see: ['hero', 'mo', 'clock'],
  cam: {from: {position: [H49[0], 2.6, H49[2] - 9.0], target: [H49[0], 4.6, 31.3], fov: 40}, to: {position: [H49[0], 2.6, H49[2] - 8.2], target: [H49[0], 4.6, 31.3], fov: 40}}});
add5(50, 73.08, {m: 'lowAuthority', sz: 'wide', look: 'dawn', why: 'the shutter rolls up, gold dawn floods in (low, from outside)', see: ['shutter'],
  cam: {from: {position: [0, .7, 62], target: [0, 7, 35], fov: 38}, to: {position: [0, .7, 59], target: [0, 7, 35], fov: 38}}});
add5(51, 74.19, {m: 'push', sz: 'wide', look: 'dawn', sub: 'dad', why: "street dawn: MO'S DAD carrying a box OUT of the truck", cam: frame(P.dadStreet, 'wide', {az: 120, dist: 12, aim: 3.2, fov: 46}, true), subjectLift: .4});
add5(52, 76.87, {m: 'push', sz: 'close', look: 'dawn', sub: 'dad', why: 'DAD close, confused', cam: frame(P.dadStreet, 'close', {az: 120, dist: 5.0, aim: 3.8}, true), subjectLift: .5});
add5(53, 78.30, {m: 'crane', sz: 'medium', sub: 'mo', look: 'dawn', ease: 'inOutSine', why: 'HERO + MO walk out hand in hand, faces readable (medium); then crane up to the TOY HOUSE sign; hold to end', see: ['hero', 'mo'], subjectLift: .5,
  cam: {from: {position: [6.3, 3.3, 47.4], target: [0, 2.7, 38.4], fov: 50}, to: {position: [9, 7.5, 61], target: [0, 6.5, 37], fov: 50}}});

// ---- cast: marks, poses, faces, visibility per shot ---------------------------------------------------------------------------
const T0 = Object.fromEntries(S.map(s => [s.n, s.t])), on = new Map();   // actor → shot numbers it is visible in
const C = {};
const actor = (name, preset, o = {}) => { C[name] = {style: 'v5', preset, marks: [], keys: [], faces: [], ...o}; return C[name]; };
const at = (name, n, place, {yaw = 0, pose = 'idle', face, travel, snap = false, opt} = {}) => {
  const c = C[name], t = T0[n], p = Array.isArray(place) ? place : P[place];
  c.marks.push([t, {origin: [p[0], r2(gy(p[0], p[2]) + (p[1] ?? 0)), p[2]], yaw: r2(yaw), ...(travel ? {travel} : {})}]); c.keys.push([t, pose, ...(snap || opt ? [{...(snap ? {snap: true} : {}), ...(opt ?? {})}] : [])]); if (face) c.faces.push([t, face]);
  if (!on.has(name)) on.set(name, new Set()); on.get(name).add(n); };
const kidWith = (base, skin, main, hair) => { const b = castData[base]; return {...b, skin, hair, accessories: [], regions: {...b.regions, torso: {main}, arms: {upper: main, lower: skin, split: .3}}}; };
actor('hero', 'HERO'); actor('taped', 'HERO_TAPED', {kit: [[0, ['headset', 'droneBack', 'gummyChest']], [69.33, ['headset', 'gummyChest']], [70.9, []]]}); actor('mo', 'MO'); actor('pip', 'PIP'); actor('youngpip', 'YOUNG_PIP'); actor('dad', 'MO_DAD');
actor('kida', 'MO', {with: kidWith('MO', '#e8b48f', '#ff5a5f', {style: 'space_buns', color: '#3b2416', v: 4})});
actor('kidb', 'MO', {with: kidWith('MO', '#8d5a3b', '#7bd850', {style: 'spiky_crop', color: '#1d1410', v: 4})});
actor('kidc', 'MO', {with: kidWith('MO', '#f1c9a5', '#ffd542', {style: 'wavy_bob', color: '#c2702f', v: 4})});
const face = (P0, Q) => azTo(P0, Q);
C.kidc.tools = [[0, null], [T0[2], 'blaster:1'], [T0[3], null], [T0[12], 'blaster:1'], [T0[13], null]]; C.kidb.tools = [[0, null], [T0[12], 'blaster:0'], [T0[13], null]];
const camPos = n => { const s = S.find(x => x.n === n); return s.cam?.from?.position ?? s.a?.from?.position; };
// 04 spectacle: HERO + MO small in the foreground, backs to camera, facing the hall
at('hero', 4, 'heroFront', {yaw: 180, pose: 'lookUp', face: 'wonder'}); at('mo', 4, 'moFront', {yaw: 180, pose: 'lookUp', face: 'grin'});
at('kida', 6, 'plushKid', {yaw: 20, pose: 'idle', face: 'love'}); at('kida', 7, 'plushKid', {yaw: 20, pose: 'idle', face: 'starry'});
at('kidb', 10, [56, 3.4, 22], {yaw: face(P.tramp, [50, 0, 14]), pose: 'jump', face: 'laugh', travel: {dir: [0, 0], speed: 1, climb: 1.4, max: 1.1}});
// E1 fix: kart kids ride their kart (same path; the kid sits KART_SEAT back from the kart origin, rotated with its yaw)
at('kidc', 2, seat(K2, K2yaw), {yaw: K2yaw, pose: 'drive', face: 'laugh', opt: {aim: true, fire0: .05}});   // a burnout on the spot: smoke + lean, no travel (the crash zoom stays locked on the face)
at('kida', 3, [-2.4, 0, 23.5], {yaw: 175, pose: 'cheer', face: 'laugh'}); at('kidb', 3, [2.6, 0, 24.5], {yaw: 185, pose: 'cheer', face: 'shout'});
at('kidc', 11, seat([K11.x, 0, K11.z0], K11yaw), {yaw: K11yaw, pose: 'drive', face: 'laugh', travel: {dir: [0, -1], speed: r2((K11.z0 - K11.z1) / (T0[12] - T0[11]))}});
at('kidb', 12, 'arenaA', {yaw: YA, pose: 'blasterAim', face: 'shout', opt: {fire0: -.21}}); at('kidc', 12, 'arenaB', {yaw: YB, pose: 'blasterAim', face: 'laugh', opt: {fire0: -.10}});
at('kida', 13, add(FT, [4.04, 0, -.71]), {yaw: -80, pose: 'bow', face: 'love'});
at('kidc', 14, add(G14, [-1.25 * Math.cos(-90 * R) - 1.6 * Math.sin(-90 * R), 0, 1.25 * Math.sin(-90 * R) - 1.6 * Math.cos(-90 * R)]), {yaw: -90, pose: 'point', face: 'grin'});
at('kidb', 15, add(G15, [0, 0, -1.45]), {yaw: 0, pose: 'hammerHold', face: 'shout'});
at('mo', 16, 'moStill', {yaw: 10, pose: 'idle', face: 'neutral'});
at('mo', 17, [-0.14, 0, 21.52], {yaw: 8, pose: 'idle', face: 'neutral'});
at('hero', 18, 'hero18', {yaw: 0, pose: 'heroPose', face: 'smug', snap: true}); C.hero.faces.push([22.2, 'beam']); C.hero.keys.push([22.2, 'fistPump', {snap: true}]);
at('hero', 20, 'gadget', {yaw: 60, pose: 'lift', face: 'beam', opt: {effort: .4}}); at('hero', 21, 'gadget', {yaw: 60, pose: 'gaspHands', face: 'worried'});
at('hero', 23, 'tapeSpot', {yaw: 20, pose: 'raise', face: 'determined'});
at('taped', 24, 'tapeSpot', {yaw: -30, pose: 'waddle', face: 'grin'}); at('taped', 25, 'tapeSpot', {yaw: 20, pose: 'idle', face: 'smug'}); at('taped', 26, 'tapeSpot', {yaw: 50, pose: 'idle', face: 'beam'});
at('taped', 27, 'tapeSpot', {yaw: 30, pose: 'heroPose', face: 'beam', snap: true});
at('taped', 28, 'pitEdge', {yaw: -20, pose: 'waddle', face: 'grin', travel: {dir: [0, -1], speed: .5}}); C.taped.keys.push([37.6, 'fall'], [37.9, 'fall']); C.taped.faces.push([37.4, 'shock']);
C.taped.marks.push([37.6, {origin: [51.5, .8, -16.5], yaw: 0}]);
at('taped', 29, [51.5, 0, -20.5], {yaw: 0, pose: 'sit', face: 'side_eye'});
at('taped', 31, [-2.6, 0, 25.8], {yaw: 7, pose: 'point', face: 'determined'});
at('youngpip', 34, [0, 0, -2], {yaw: 0, pose: 'toolHold', face: 'polite'});
at('pip', 35, 'pip', {yaw: 180, pose: 'idle', face: 'sad'}); at('pip', 36, 'pip', {yaw: 180, pose: 'idle', face: 'sad'});
at('taped', 39, [12, 0, -16], {yaw: 0, pose: 'waddle', face: 'grin', travel: {dir: [0, 1], speed: 1.0}});
at('mo', 40, 'moCry', {yaw: -15, pose: 'idle', face: 'cry'});
at('mo', 41, [-12, 0, 47], {yaw: 60, pose: 'idle', face: 'sad'}); at('dad', 41, [-15.8, 0, 50], {yaw: 120, pose: 'lift', face: 'neutral'});
at('mo', 43, 'moCry', {yaw: -15, pose: 'shrug', face: 'cry'}); at('mo', 44, 'moCry', {yaw: 60, pose: 'idle', face: 'sad'});
at('taped', 44, [10.5, 0, 7.0], {yaw: -100, pose: 'idle', face: 'worried'});
at('taped', 48, [7.4, 0, 6], {yaw: 20, pose: 'flail', face: 'shock'});
at('hero', 49, add(H49, [-1.7, 0, 0]), {yaw: 180, pose: 'holdHands', face: 'smile', opt: {side: 'left', still: true}}); at('mo', 49, add(H49, [1.7, 0, 0]), {yaw: 180, pose: 'holdHands', face: 'smile', opt: {side: 'right', still: true}});
at('dad', 51, 'dadStreet', {yaw: 90, pose: 'lift', face: 'smile', travel: {dir: [1, 0], speed: .56}}); at('dad', 52, 'dadStreet', {yaw: 120, pose: 'shrug', face: 'confused'});
at('hero', 53, [-1.7, 0, 37.5], {yaw: 0, pose: 'holdHands', face: 'smile', opt: {side: 'right'}, travel: {dir: [0, 1], speed: .67}}); at('mo', 53, [1.7, 0, 37.5], {yaw: 0, pose: 'holdHands', face: 'smile', opt: {side: 'left'}, travel: {dir: [0, 1], speed: .67}});
// hands held (E1 fix, pose holdHands): 3.4 apart, the inner arms angled out until the fists meet
// visibility: each actor shows only in its shots
const order = S.map(s => s.n);
for (const [name, c] of Object.entries(C)) { const set = on.get(name) ?? new Set(), vis = [[0, false]];
  for (const n of order) { const v = set.has(n); if (v !== vis.at(-1)[1]) vis.push([T0[n], v]); } c.visible = vis;
  c.origin = c.marks[0]?.[1].origin ?? [0, 0, 0]; c.yaw = c.marks[0]?.[1].yaw ?? 0;
  c.keys.sort((a, b) => a[0] - b[0]); c.faces.sort((a, b) => a[0] - b[0]); c.marks.sort((a, b) => a[0] - b[0]); if (!c.faces.length) delete c.faces; }

// E1 fix darts: tip of a kid's foam blaster (kid at P, yaw Y, blasterAim) → a target point; times are spec seconds
const blasterTip = (P0, Y) => [P0[0] + Math.sin(Y * R) * 3.45 + Math.cos(Y * R) * 1.2, 3.5, P0[2] + Math.cos(Y * R) * 3.45 - Math.sin(Y * R) * 1.2];
function duelDarts() {
  const A = blasterTip(P.arenaA, YA), B = blasterTip(P.arenaB, YB), chestB = add(P.arenaB, [0, 2.7, 0]), past = (Q, Y, dx) => [Q[0] + Math.cos(Y * R) * dx, 4.6, Q[2] - Math.sin(Y * R) * dx];
  return [{from: A, to: past(P.arenaB, YB, -2.2), t0: 12.09, dur: .5}, {from: A, to: chestB, t0: 12.59, dur: .45, arc: .3}, {from: A, to: past(P.arenaB, YB, 2.0), t0: 13.09, dur: .5},
    {from: B, to: past(P.arenaA, YA, 2.2), t0: 12.20, dur: .5}, {from: B, to: past(P.arenaA, YA, -2.0), t0: 12.70, dur: .5}, {from: B, to: past(P.arenaA, YA, 1.4), t0: 13.20, dur: .5}];
}
function partyDarts() {   // 0–3.6 s: foam darts criss-crossing the front zone, the shutter shot and the hall reveal
  const r = (a, b, k) => a + (b - a) * ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1, out = [];
  for (let i = 0; i < 12; i++) { const t0 = 1.1 + i * .2, side = i % 2 ? 1 : -1; out.push({from: [side * r(6, 12, i), r(3, 6, i + 40), r(10, 24, i + 80)], to: [-side * r(4, 10, i + 120), r(1, 4, i + 160), r(8, 24, i + 200)], t0, dur: .7, arc: 1.2}); }
  out.push({from: add(K2, [-6, 3.5, 4]), to: add(K2, [-.6, 2.0, .6]), t0: 1.80 - .4, dur: .4, arc: .3});   // the 1.80 hit on the kart
  return out;
}
// ---- story props (spec.props) ----------------------------------------------------------------------------------------------------
const props = [
  {id: 'plush', prop: 'plush', scale: .85, pos: [[0, [-15.1, 0, 5.0]]], rot: [[0, [0, 20, 0]]], visible: [[0, false], [T0[6], true], [T0[8], false]]},
  {id: 'key', prop: 'key', scale: 1.2, pos: [[0, add(KEY, [0, 0, -.12])]], rot: [[0, [0, 180, 0]]], visible: [[0, false], [T0[30], true], [T0[32], false], [T0[37], true], [T0[38], false]]},
  // E1 fix: karts (kart2, a kid seated), blaster duel darts, party darts, fountain, grab toys, ball splash
  {id: 'kart', prop: 'kart2', seed: 3, smoke: true, pos: [[0, [K11.x, 0, K11.z0]], [T0[11], [K11.x, 0, K11.z0]], [T0[12], [K11.x, 0, K11.z1], 'ramp', T0[12] - T0[11]]], rot: [[0, [0, K11yaw, -8]]], visible: [[0, false], [T0[11], true], [T0[12], false]]},
  {id: 'kart02', prop: 'kart2', seed: 1, smoke: true, pos: [[0, K2]], rot: [[0, [0, K2yaw, 6]]], visible: [[0, false], [T0[2], true], [T0[3], false]]},
  {id: 'duelDarts', prop: 'dartVolley', animAt: 0, darts: duelDarts(), pos: [[0, [0, 0, 0]]], visible: [[0, false], [T0[12], true], [T0[13], false]]},
  {id: 'partyDarts', prop: 'dartVolley', animAt: 0, darts: partyDarts(), pos: [[0, [0, 0, 0]]], visible: [[0, false], [T0[2], true], [T0[5], false]]},
  {id: 'fountain', prop: 'fountain', scale: 1.5, pos: [[0, FT]], visible: [[0, false], [T0[13], true], [T0[14], false]]},
  {id: 'ped14', prop: 'foamBlock', seed: 2, scale: 1.22, pos: [[0, G14]], visible: [[0, false], [T0[14], true], [T0[15], false]]},
  {id: 'grabPlush', prop: 'plush', seed: 2, scale: .4, pos: [[0, add(G14, [0, 1.95, 0])], [T0[14] + .25, add(G14, [0, 1.95, 0])], [T0[14] + .6, add(G14, [.5, 2.25, -.2]), 'ramp', .35]], rot: [[0, [0, 30, 0]]], visible: [[0, false], [T0[14], true], [T0[15], false]]},
  {id: 'ped15', prop: 'foamBlock', seed: 5, scale: 1.25, pos: [[0, G15]], visible: [[0, false], [T0[15], true], [T0[16], false]]},
  {id: 'grabBlaster', prop: 'foamBlaster', seed: 2, pos: [[0, add(G15, [-.9, 2.65, 0])], [T0[15] + .3, add(G15, [-.9, 2.65, 0])], [T0[15] + .7, add(G15, [-.9, 3.35, -.3]), 'ramp', .4]], rot: [[0, [0, 0, 0]], [T0[15] + .3, [0, 0, 0]], [T0[15] + .7, [0, 0, 12], 'ramp', .4]], visible: [[0, false], [T0[15], true], [T0[16], false]]},
  {id: 'splash', prop: 'ballSplash', animAt: 37.92, pos: [[0, [51.5, .6, -17.5]]], visible: [[0, false], [37.92, true], [T0[29], false]]},
  {id: 'hyper', prop: 'hyperbox', scale: .6, pos: [[0, [-61.6, 1.0, -26.55]], [T0[46], [6.8, 3.0, 7.0]], [T0[46] + .5, [6.8, .02, 7.0], 'ramp', .45]], rot: [[0, [0, 150, 0]], [T0[46], [12, 30, 8]], [T0[46] + .5, [0, 38, 0], 'ramp', .45]],
    visible: [[0, false], [T0[20], true], [T0[22], false], [T0[46], true], [T0[49], false]]},
  {id: 'tape', prop: 'tapeRoll', pos: [[0, [-57.9, 2.3, -17.4]]], rot: [[T0[23], [80, 0, 0]], [T0[23] + .9, [80, 720, 0], 'ramp', .9]], visible: [[0, false], [T0[23], true], [T0[24], false]]},
  ...[[-60.5, -15.6], [-55.6, -16.4], [-59.4, -21.6], [-56, -20.8], [-61, -19], [-54.8, -18.6]].map(([x, z], i) => ({id: 'roll' + i, prop: 'tapeRoll', pos: [[0, [x, 0, z]]], rot: [[0, [0, i * 40, 0]]], visible: [[0, false], [T0[27], true], [T0[28], false]]})),
  {id: 'drone', prop: 'drone', pos: [[0, [8.6, 2.6, 6.0]], [T0[47] + .55, [8.6, .2, 6.0], 'ramp', .5]], rot: [[0, [10, 30, -8]], [T0[47] + .55, [0, 40, 0], 'ramp', .5]], visible: [[0, false], [T0[47], true], [T0[49], false]]},
  {id: 'gummy', prop: 'gummyBear', scale: .9, pos: [[0, [6.2, .02, 5.2]]], rot: [[0, [0, 20, 0]]], visible: [[0, false], [T0[48] + .5, true], [T0[49], false]]},
  {id: 'box1', prop: 'moveBox', seed: 1, pos: [[0, [-14.0, 1.4, 52.5]]], rot: [[0, [0, 90, 0]]], visible: [[0, false], [T0[41], true], [T0[43], false], [T0[51], true]]},
  {id: 'box2', prop: 'moveBox', seed: 2, pos: [[0, [-14.2, 3.0, 51.0]]], rot: [[0, [0, 80, 0]]], visible: [[0, false], [T0[41], true], [T0[43], false]]},
  {id: 'boxDad', prop: 'moveBox', seed: 0, scale: .6, pos: [[0, [-10.6, 2.0, 50.5]], [T0[51] + 2.68, [-9.1, 2.0, 50.5], 'ramp', 2.68]], rot: [[0, [0, 90, 0]]], visible: [[0, false], [T0[51], true], [T0[53], false]]},
];

// ---- shots → spec -------------------------------------------------------------------------------------------------------------
const lookAt = t => (t >= 73.08 ? 'dawn' : t >= 66.86 ? 'toyDawn' : t >= 38.61 ? 'toyLate' : 'toyNight');
const shots = S.map((s, i) => {
  const id = `T${String(s.n).padStart(2, '0')}-${s.m}`;
  const o = {id, at: s.t, move: s.m, size: s.sz, why: s.why, see: s.see ?? (s.sub ? [s.sub] : s.prop ? [s.prop] : ['hall']), shadowRadius: 16, look: s.look ?? lookAt(s.t)};
  if (s.look === 'toyNightTop' && s.t >= 38.61) o.look = 'toyLate';
  if (s.cam) { o.from = s.cam.from; if (s.cam.to) o.to = s.cam.to; }
  for (const k of ['a', 'b']) if (s[k]) o[k] = {from: s[k].from, to: s[k].to};
  if (s.sub) o.subject = s.sub;
  for (const k of ['prop', 'grade', 'freeze', 'impact', 'reveal', 'clock', 'static', 'degrees', 'height', 'zoomAt', 'snapAt', 'follow', 'ground', 'ease', 'spectacle', 'back', 'subjectLift', 'subjectAimY', 'followOffset']) if (s[k] !== undefined) o[k] = s[k];
  if (['heroLow', 'tiltUp', 'crane', 'aisleTrack', 'lowAuthority'].includes(s.m) && o.to === undefined && s.m !== 'lowAuthority') o.to = o.from;
  return o;
});
// crowd clear corridors (camera → subject) for every eye-level shot, as the fixtures do
const clear = shots.flatMap(o => { const c = o.from?.position ?? o.a?.from?.position, tg = o.from?.target ?? o.a?.from?.target; if (!c || c[1] > 40 || c[2] > 35) return []; return corridorClear([c[0], c[2]], [tg[0], tg[2]], 4.5, 2.5); });
const base = JSON.parse(readFileSync('engine/fixtures/toyhouse/set6.json', 'utf8'));
const crowds = base.crowds.map(c => ({...c, clear: [...clear, ...(c.id === 'aisles' ? c.clear.filter(x => x[2] < 3) : [])]}));
const clock = [[0, 540], [T0[9], 540], [T0[9] + .38, 1200, 'ramp', .38], [T0[10], 545], [T0[17], 560], [T0[29], 240], [T0[38], 478], [T0[45], 479], [T0[49], 480]];
const spec = {
  slug: 'toyhouse', fps: FPS, format: 5, end: END, note: 'Toy House E1 — written by scripts/v2/toyhouse-episode.js from stories/toyhouse/BEATS.md. Edit the generator, not this file.',
  world: 'parts/sets4/toyhouse_all.js', look4: 'toyNight', look: 'toyNight', look5b: true, look6: true, labels: false, castFile: 'cast/toyhouse.json', budget: 'v3', crowdCull: true,
  captionStyle: 'pop-shorts-v5', keywords: ['Toy House', 'eight', 'forever', 'key', 'Mo', 'hand'], lipFlap: {narrator: 'hero'},
  worldState: {clock, shutter: [[0, 1], [T0[3], 1], [T0[3] + .25, 0, 'ramp', .25], [T0[50], 0], [T0[50] + .9, 1, 'ramp', .9]], truck: [[0, 1]]},
  effects: [{type: 'lightsCascade', at: 0, step: .0001, points: PRACTICALS, color: '#ffd68a', size: 2.6},   // E1 fix: every light on from frame 0 (the party)
    ...[[0, [0, 70, -68], 7, 2.4], [1.2, add(K2, [-1, 6, 2]), 1.2, 1.6], [1.7, add(K2, [3, 7, -2]), 1.2, 1.6], [2.04, [0, 7, 26], 1.4, 1.6], [2.56, [0, 9, 8], 2.2, 1.8], [3.0, [-6, 9, 4], 2.2, 1.6]].map(([at, origin, scale, dur], i) =>
      ({type: 'particles', preset: 'confetti', at, origin, scale, dur, count: 60, seed: 11 + i, spread: 1.6, life: [1.6, 2.4]}))],
  hide: ['chocolateFountain'],   // E1 fix (opt-in): the story fountain prop replaces the set's static one
  cast: Object.fromEntries(Object.entries(C).map(([k, c]) => { const o = {...c}; return [k, o]; })),
  props, crowds, fill: base.fill, shots,
};
writeFileSync('stories/toyhouse/episode.json', JSON.stringify(spec, null, 1));
// cut check: every cut sits on a cues.json word start (± 1 frame)
const off = shots.slice(1).filter(o => Math.min(...WORDS.map(w => Math.abs(w - o.at))) * FPS > 1).map(o => o.id);
console.log(JSON.stringify({shots: shots.length, end: END, avg: +(END / shots.length).toFixed(2), offWord: off, props: props.length, cast: Object.keys(C).length, clear: clear.length}));
