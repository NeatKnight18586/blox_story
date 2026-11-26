// stories/fearbell/previs.js — PREVIS staging for the Fear Bell (story-local; built assets only, no look/world polish).
// brief2spec cannot express this episode (city anchors, GOVERNOR slot, creatures, clock — see PROGRESS.md), so this builder turns
// BRIEF.md rows (stories/fearbell/build/lock2brief.json: times, sync words) + the staging table below into stories/fearbell/episode.json
// (format 7, long, pop-shorts-v7, rig r6, look B, spec clock + creatures + audio.gaps), plus one spec per world for the vo-sheet:
// build/previs-city.json (parts/city/world.js), build/previs-cityClassroom.json / build/previs-cityDining.json (parts/city/rooms.js).
//   node stories/fearbell/previs.js        → episode.json, build/previs-*.json, build/shots.json (vo-sheet labels), build/see.json (frame per row)
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {groundY} from '../../parts/city/plan.js';

const D = 'stories/fearbell', F = 24, L2B = JSON.parse(readFileSync(`${D}/build/lock2brief.json`, 'utf8')), CUES = JSON.parse(readFileSync(`${D}/cues.json`, 'utf8'));
const ROWS = L2B.rows, VOICE = CUES.duration, END = +(VOICE + .5).toFixed(3);
const W = CUES.lines.flatMap(l => l.words), nthOf = i => { const n = W[i].w.replace(/[^\w']/g, '').toLowerCase(); return W.slice(0, i + 1).filter(x => x.w.replace(/[^\w']/g, '').toLowerCase() === n).length; };
const R = n => ROWS[n - 1], T = n => R(n).syncT ?? R(n).start, S0 = n => R(n).start;
const wordAt = (n, word) => { for (let i = R(n).w0; i <= R(n).w1; i++) if (W[i].w.replace(/[^\w']/g, '').toLowerCase() === word.toLowerCase()) return {word: W[i].w.replace(/[^\w']/g, ''), nth: nthOf(i)}; throw Error(`row ${n}: no "${word}"`); };
// ---- geometry helpers ----
const G = (x, z, dy = 0) => [x, +(groundY(x, z) + dy).toFixed(3), z], rad = d => d * Math.PI / 180;
const fwd = y => [Math.sin(rad(y)), Math.cos(rad(y))], rgt = y => [Math.cos(rad(y)), -Math.sin(rad(y))];
const add = (p, f, d, r = [0, 0], s = 0, h = 0) => [+(p[0] + f[0] * d + r[0] * s).toFixed(3), +(p[1] + h).toFixed(3), +(p[2] + f[1] * d + r[1] * s).toFixed(3)];
const look = (position, target, fov = 50) => ({position: position.map(v => +v.toFixed(3)), target: target.map(v => +v.toFixed(3)), fov});
// camera on an actor at p facing yaw: d studs in front, `side` to its right, h above its feet, aiming at `aim` above its feet
const camOn = (p, yaw, {d = 7, side = 0, h = 3, aim = 3, fov = 45, tx = 0} = {}) => look(add(p, fwd(yaw), d, rgt(yaw), side, h), add(p, fwd(yaw), 0, rgt(yaw), tx, aim), fov);
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[2] - a[2]) * 180 / Math.PI;
// ---- places (city world) ----
const BELL = [0, 53.15, -60], BAL = [0, 23.45, -38.81];
const BUS = [94.21, 14.42, 3.0];
const DIN = (() => { const y = 37 * Math.PI / 180, c = Math.cos(y), s = Math.sin(y), lx = 6.2, lz = 7.95, x = 254 + lx * c + lz * s, z = 156 - lx * s + lz * c; return {at: [x, groundY(254, 156) + .45, z], f: [s, c], r: [c, -s]}; })();
const DP = (d, s, y) => [+(DIN.at[0] + DIN.f[0] * d + DIN.r[0] * s).toFixed(3), +(DIN.at[1] + y).toFixed(3), +(DIN.at[2] + DIN.f[1] * d + DIN.r[1] * s).toFixed(3)];
const SUB = [-162, 10.7], SUBD = [.87, -.49], PICK = G(SUB[0] + SUBD[0] * 9, SUB[1] + SUBD[1] * 9), MAIL = G(SUB[0] + SUBD[0] * 22, SUB[1] + SUBD[1] * 22), BB = G(-112.5, 89), BWCAM = [-120, 0, 99];
const HERO_P = G(-6, 16), HOUSE = G(-116.4, 18.5), YARD = G(-110, 20);
// ---- cast: one instance per character, re-blocked per row (marks) and hidden outside its rows ----
const CH = {}, rowsOf = {};
const put = (name, base, n0, n1, pos, yaw, extra = {}) => { (CH[name] ??= {...base, apps: []}).apps.push({n0, n1, pos, yaw, ...extra}); };
const P = {hero: {troupe: 'HERO'}, lulu: {troupe: 'LITTLE', costume: 'LULU'}, gov: {troupe: 'GOVERNOR'}, kevin: {troupe: 'SECOND', costume: 'KEVIN'}, pickles: {troupe: 'ELDER', costume: 'PICKLES'},
  mailman: {troupe: 'ELDER', costume: 'MAILMAN'}, bb: {troupe: 'ELDER', costume: 'BODYBUILDER'}, teacher: {troupe: 'ADULT_F', costume: 'TEACHER_FB'}, dad: {troupe: 'ELDER', costume: 'DAD_FB'},
  buslady: {troupe: 'ADULT_F', costume: 'BUSLADY'}, kidA: {troupe: 'SECOND', costume: 'KEVIN'}, kidB: {troupe: 'LITTLE', costume: 'LULU'}};
// classroom / dining coordinates are room-local (parts/city/rooms.js); the vo-sheet renders those rows from the room spec
const CLASS = {desk: [-1, 0, -6.2], shelf: [-12.6, 4.6, -6]}, DINE = {seatFar: [-1.9, 0, -1.3], seatNear: [1.9, 0, 4.3]};
const shots = [], props = [], creatures = [], clock = [], locOf = {};
const shot = (n, cam, {size, to, actions = [], loc = 'city', see = .2, note = ''} = {}) => { locOf[n] = loc; shots.push({n, cam, to, size, actions, loc, see, note}); };
const pr = (id, prop, pos, extra = {}) => props.push({id, set: 'props1g', prop, pos: Array.isArray(pos[0]) && Array.isArray(pos[0][1]) ? pos : [[0, pos]], ...extra});
const hide = [0, -400, 0], during = (t0, t1, p) => [[0, hide], [t0, p], [t1, hide]];
// =========================== rows ===========================
// 1 bell mid-swing under the hat (DONG on "town")
shot(1, look([9, 50.5, -41], [0, 55, -60], 44), {size: 'close', see: .1});
clock.push({at: wordAt(1, 'town'), fx: 'dong'});
// 2 shockwave over the rooftops + pops all over town
shot(2, look([-26, 50, 78], [0, 24, -14], 64), {size: 'wide', see: .35});
for (const [i, [x, z]] of [[-18, 8], [14, 2], [24, 26], [-30, 30], [6, 40], [36, -8], [-40, -6]].entries()) clock.push({at: +(T(2) + .05 * i).toFixed(3), fx: 'pop', pos: G(x, z, 1.6), scale: 2.4});
// 3 ghost next to the bus-stop lady (POP), she freezes mid-donut
const LADY = G(BUS[0] - 1.2, BUS[2] - 1.8), GHOST = G(BUS[0] + 6.2, BUS[2] + .6);
put('buslady', P.buslady, 3, 3, LADY, 75, {faces: [[S0(3), 'smile'], [T(3) + .15, 'gasp']]});
pr('donut', 'donut', during(S0(3), R(3).end, add(LADY, fwd(75), .75, rgt(75), .35, 4.2)), {rot: [[0, [70, 0, 0]]], scale: 1.4});
creatures.push({id: 'ghost', kind: 'ghost', pos: GHOST, yaw: 150, acts: [{act: 'spawn', at: T(3)}, {act: 'boo', at: T(3) + .45}], visible: [[0, false], [S0(3), true], [R(3).end, false]]});
clock.push({at: wordAt(3, 'worst'), fx: 'pop', pos: [GHOST[0], GHOST[1] + 5.5, GHOST[2]], scale: 3.4});
shot(3, look([BUS[0] + 17.5, BUS[1] + 2.2, BUS[2] - 10.5], [BUS[0] + 2.4, BUS[1] + 6.0, BUS[2] + .6], 66), {size: 'close', see: .55});
// 4 Governor yanks the bell rope on the balcony, smug
put('gov', P.gov, 4, 4, BAL, 0, {faces: [[S0(4), 'gov_smug']]});
pr('rope', 'bellRope', during(S0(4), R(4).end, [BAL[0] + .9, BAL[1] + 9.5, BAL[2] + .55]), {p: {length: 6}, animAt: T(4)});
shot(4, look([BAL[0] - 9, BAL[1] - 6.5, BAL[2] + 17], [BAL[0] + .3, BAL[1] + 2.9, BAL[2]], 40), {size: 'medium', actions: [{actor: 'gov', verb: 'rope_pull', at: T(4) - S0(4) - .2}], see: .1});
// 5–6 Mr. Pickles in his yard → a stone pillar shoots him 40 studs up (POP)
put('pickles', P.pickles, 5, 6, PICK, -119, {faces: [[S0(5), 'smile'], [T(6) + .1, 'terrified']]});
shot(5, camOn(PICK, -119, {d: 10, side: 2, h: 2.6, aim: 3.0, fov: 44}), {size: 'medium'});
creatures.push({id: 'pillar', kind: 'pillar', pos: PICK, ride: 'pickles', acts: [{act: 'rise', at: T(6)}], visible: [[0, false], [T(6), true], [R(6).end, false]]});
clock.push({at: wordAt(6, 'Heights'), fx: 'pop', pos: [PICK[0], PICK[1] + 1.2, PICK[2]], scale: 2.6});
shot(6, look(add(PICK, fwd(-119), 30, rgt(-119), 4, 2), add(PICK, fwd(-119), 0, [0, 0], 0, 30), 70), {size: 'medium', see: .5});
// 7–8 the mailman whistling → a T-rex behind him ROARS, the mail explodes (POP)
put('mailman', P.mailman, 7, 8, MAIL, -119, {faces: [[S0(7), 'smile'], [T(8) + .15, 'terrified']]});
shot(7, camOn(MAIL, -119, {d: 9, side: -1.5, h: 2.8, aim: 3.2, fov: 44}), {size: 'medium'});
const TREX = add(MAIL, fwd(-119), -13, [0, 0], 0, 0);
creatures.push({id: 'trex', kind: 'trex', pos: G(TREX[0], TREX[2]), yaw: -119, acts: [{act: 'roar', at: T(8) + .1}], visible: [[0, false], [T(8), true], [R(8).end, false]]});
clock.push({at: wordAt(8, 'dinosaur'), fx: 'pop', pos: [TREX[0], TREX[1] + 7, TREX[2]], scale: 5});
pr('mail', 'mailBurst', during(S0(8), R(8).end, [MAIL[0], MAIL[1] + 3.2, MAIL[2]]), {animAt: T(8) + .15});
shot(8, look(add(MAIL, fwd(-119), 13, rgt(-119), 0, 2.6), add(MAIL, fwd(-119), -6, [0, 0], 0, 8), 66), {size: 'wide', see: .6});
// 9–10 the bodybuilder flexing (heroLow) → a tiny rat (POP); the HERO walks calmly through the background (owner: from row 9 into row 10)
const BBY = yawTo(BB, BWCAM);
put('bb', P.bb, 9, 10, BB, BBY, {faces: [[S0(9), 'grin'], [T(10) + .15, 'terrified']], keys: [[0, 'heroPose'], [T(10) + .1, 'gaspHands']]});
const AWAY = [-Math.sin(rad(BBY)), -Math.cos(rad(BBY))], SIDE = rgt(BBY), HW0 = [BB[0] + AWAY[0] * 5 + SIDE[0] * 4.2, 0, BB[2] + AWAY[1] * 5 + SIDE[1] * 4.2];
put('hero', P.hero, 9, 10, G(HW0[0], HW0[2]), Math.atan2(-SIDE[0], -SIDE[1]) * 180 / Math.PI, {travel: {dir: [-SIDE[0], -SIDE[1]], speed: .9}, faces: [[S0(9), 'smile']], walk: true});
const RAT = add(BB, fwd(BBY), 2.6, rgt(BBY), -1.2, 0);
creatures.push({id: 'rat', kind: 'rat', pos: G(RAT[0], RAT[2]), yaw: BBY + 180, scale: 1.5, acts: [], visible: [[0, false], [T(10), true], [R(10).end, false]]});
clock.push({at: wordAt(10, 'rat'), fx: 'pop', pos: [RAT[0], RAT[1] + 1, RAT[2]], scale: 1.4});
shot(9, look(add(BB, fwd(BBY), 10, rgt(BBY), 1.5, 1.0), add(BB, fwd(BBY), 0, rgt(BBY), -1, 5.2), 62), {size: 'medium', see: .9});
shot(10, look(add(BB, fwd(BBY), 15, rgt(BBY), 3, 3.2), add(BB, fwd(BBY), 0, rgt(BBY), -2, 3.0), 58), {size: 'wide', see: .4});
// 11–12 Kevin at the diner counter → everything STILL: slow push on Kevin trembling before a cheeseburger
const KEV = (q => G(q[0], q[2]))(DP(1.5, -.7, 0)), KEVY = 172;
put('kevin', P.kevin, 11, 12, KEV, KEVY, {faces: [[S0(11), 'neutral'], [S0(12), 'terrified']]});
pr('burger', 'burger', during(S0(11), R(12).end, DP(-.9, -.7, 1.37)), {animAt: 999});
pr('plate', 'plate', during(S0(11), R(12).end, DP(-.95, -.7, 1.3)));
shot(11, look(DP(3.2, 4.0, 3.8), DP(.9, -1.2, 2.8), 54), {size: 'medium'});
shot(12, look(DP(1.6, 3.6, 3.6), DP(.6, -.7, 2.9), 44), {size: 'medium', to: 'push', see: .6, note: 'the single stillness'});
// 13–15 plaza: pops everywhere except an empty spot beside the hero; the hero looks at it; looks up at the bell
put('hero', P.hero, 13, 15, HERO_P, 200, {faces: [[S0(13), 'neutral'], [S0(15), 'thinking']], keys: [[S0(13), 'idle']]});
for (const [i, [x, z]] of [[-16, 6], [4, 10], [-22, 22], [8, 26], [-12, 30], [14, 14], [-2, 4]].entries()) clock.push({at: +(T(13) + .04 * i).toFixed(3), fx: 'pop', pos: G(x, z, 1.4), scale: 1.8});
shot(13, look([-6, 44, 52], [-6, 14, 14], 46), {size: 'wide', see: .3});
shot(14, camOn(HERO_P, 200, {d: 8, side: 1.5, h: 4.4, aim: 4.2, fov: 40, tx: -1.4}), {size: 'close'});
shot(15, look(add(HERO_P, fwd(200), -3.5, rgt(200), 3.2, 1.2), [BELL[0] - 4, BELL[1] - 22, BELL[2]], 70), {size: 'medium', see: .4});
// 16–18 classroom (rooms world): drawer creaks open, a huge fuzzy spider climbs out; teacher on the bookshelf; kids run out
put('teacher', P.teacher, 16, 16, [-4.2, 0, -8.6], 30, {faces: [[S0(16), 'smile'], [T(16) + .3, 'terrified']], room: true});
put('teacher', P.teacher, 17, 18, [13.8, 7.25, -5], -90, {faces: [[S0(17), 'terrified']], keys: [[S0(17), 'kneel']], room: true});
creatures.push({id: 'spider', kind: 'spider', pos: [-1, 0, -4.2], yaw: 180, scale: .55, acts: [{act: 'wave', at: T(17)}], visible: [[0, false], [T(16), true], [R(18).end, false]], room: 'cityClassroom'});
put('kidA', P.kidA, 16, 18, [3.5, 0, 4.4], 180, {faces: [[S0(16), 'smile'], [T(18), 'grin']], room: true});
put('kidB', P.kidB, 16, 18, [5.2, 0, 1.4], 160, {faces: [[S0(16), 'smile'], [T(18), 'laugh']], room: true});
shot(16, look([5.2, 4.2, 1.6], [-1.6, 2.0, -6.4], 48), {size: 'insert', loc: 'cityClassroom', see: .5});
shot(17, look([-9.5, 6.4, 7.5], [6.5, 5.2, -5], 56), {size: 'medium', loc: 'cityClassroom', see: .6});
shot(18, look([-9, 5.2, 8.6], [5, 3.2, -1], 58), {size: 'wide', loc: 'cityClassroom', actions: [{actor: 'kidA', verb: 'cheer', at: .1}, {actor: 'kidB', verb: 'cheer', at: .2}]});
// 19–20 dining (rooms world): a roaring vacuum spawns beside Dad (POP); Dad eats spaghetti standing on his chair
put('dad', P.dad, 19, 19, [-1.9, 0, -1.3], 0, {faces: [[S0(19), 'smile'], [T(19) + .15, 'terrified']], room: true});
put('dad', P.dad, 20, 20, [-1.9, 1.75, -1.3], 0, {faces: [[S0(20), 'nervous_laugh']], room: true, keys: [[S0(20), 'idle']]});
creatures.push({id: 'vacuum', kind: 'vacuum', pos: [3.6, 0, -2.4], yaw: -60, scale: .45, acts: [{act: 'circle', at: S0(20), r: 2.2, dur: 1.4}], visible: [[0, false], [T(19), true], [R(20).end, false]], room: 'cityDining'});
clock.push({at: wordAt(19, 'vacuum'), fx: 'pop', pos: [3.6, 1.6, -2.4], scale: 1.6, room: 'cityDining'});
pr('spag', 'spaghetti', during(S0(19), R(20).end, [-1.2, 2.72, 1.0]), {loc: 'cityDining'});
shot(19, look([6.4, 4.6, 8.4], [-2.6, 2.6, -.6], 54), {size: 'close', loc: 'cityDining', see: .45});
shot(20, look([-9, 3.2, 4.5], [-1.2, 3.4, -1.8], 58), {size: 'wide', loc: 'cityDining'});
// 21–23 Kevin facing his cheeseburger (MCU) → he bites (CU) → the burger shrinks to a slider (insert)
put('kevin', P.kevin, 21, 23, KEV, KEVY, {faces: [[S0(21), 'determined'], [T(22), 'nervous_laugh'], [S0(23), 'awe']]});
pr('burger2', 'burger', during(S0(21), R(23).end, DP(-.9, -.7, 1.37)), {animAt: T(23)});
pr('plate2', 'plate', during(S0(21), R(23).end, DP(-.95, -.7, 1.3)));
shot(21, look(DP(1.6, 3.2, 3.6), DP(.7, -.7, 3.0), 44), {size: 'medium'});
shot(22, look(DP(1.5, 2.8, 3.7), DP(.8, -.7, 3.2), 36), {size: 'close', actions: [{actor: 'kevin', verb: 'reach_for', at: .1}]});
shot(23, look(DP(1.6, -.4, 2.6), DP(-.9, -.7, 1.55), 34), {size: 'insert', see: .7});
// 24 Lulu hugging her plush on the porch, a small shadow puff with big eyes beside her
const PORCH = G(-116.4, 15.2), LULUY = 10;
put('lulu', P.lulu, 24, 24, PORCH, LULUY, {faces: [[S0(24), 'warm']], accessories: ['plushHug']});
creatures.push({id: 'shadow', kind: 'shadowPuff', follow: 'lulu', offset: [1.4, 1.0, .3], acts: [], visible: [[0, false], [S0(24), true], [R(25).end, false]]});
shot(24, camOn(PORCH, LULUY, {d: 6.2, side: 1.2, h: 2.0, aim: 2.0, fov: 44, tx: .7}), {size: 'medium'});
// 25–28 hero house (inside = the built dining/kitchen room): the puff trails her; hero holds the flashlight, puff shrinks back; Lulu beams up; hero looks away
put('lulu', P.lulu, 25, 25, [-6, 0, -5.4], 90, {faces: [[S0(25), 'smile']], room: true, accessories: ['plushHug'], walk: true, travel: {dir: [1, 0], speed: 1.6}});
creatures.push({id: 'shadowIn', kind: 'shadowPuff', follow: 'lulu', offset: [-1.2, 1.0, .3], acts: [], visible: [[0, false], [S0(25), true], [R(27).end, false]], room: 'cityDining'});
shot(25, look([7, 3.6, -4.6], [-3, 2.0, -5.6], 46), {size: 'medium', loc: 'cityDining'});
put('lulu', P.lulu, 26, 28, [6.0, 0, .6], 27, {faces: [[S0(26), 'gasp'], [S0(27), 'grin']], room: true, accessories: ['plushHug']});
put('heroF', P.hero, 26, 28, [7.5, 0, 3.5], 207, {faces: [[S0(26), 'determined'], [S0(27), 'warm'], [S0(28), 'sad_soft']], room: true, tool: 'flashlight', keys: [[S0(26), 'toolHold'], [S0(28), 'idle']]});
shot(26, look([-1.3, 4.2, 6.2], [6.75, 2.8, 2.05], 58), {size: 'medium', loc: 'cityDining'});
shot(27, look([2.6, 3.4, 3.4], [6.6, 3.6, 1.8], 52), {size: 'medium', loc: 'cityDining'});
shot(28, look([6.3, 4.6, 1.3], [7.5, 4.5, 3.5], 40), {size: 'close', loc: 'cityDining'});
// 29–30 the bodybuilder nervously petting the rat in his palm → it is a mouse; he grins
put('bb', P.bb, 29, 30, BB, BBY, {faces: [[S0(29), 'nervous_laugh'], [T(30) + .4, 'grin']], keys: [[S0(29), 'toolHold']]});
creatures.push({id: 'rat2', kind: 'rat', pos: add(BB, fwd(BBY), 1.75 * 1.35, rgt(BBY), 1.51 * 1.35 + .3, 2.75 * 1.35), yaw: BBY, scale: 1.2, acts: [{act: 'shrink', at: T(30)}], visible: [[0, false], [S0(29), true], [R(30).end, false]]});
shot(29, look(add(BB, fwd(BBY), 8, rgt(BBY), -2.5, 5.5), add(BB, fwd(BBY), 1, rgt(BBY), 1, 5.0), 44), {size: 'medium'});
shot(30, look(add(BB, fwd(BBY), 6.2, rgt(BBY), 3.2, 4.6), add(BB, fwd(BBY), 2.4, rgt(BBY), 2.2, 3.8), 28), {size: 'insert', see: .9});
// 31–34 the Governor yanks too hard (both hands) → CRACK (insert ECU, continuity) → "Oops." (panic, monocle) → it rings again at noon
put('gov', P.gov, 31, 33, BAL, 0, {faces: [[S0(31), 'gov_announce'], [S0(33), 'gov_oops'], [T(33), 'gov_panic']]});
pr('rope2', 'bellRope', during(S0(31), R(31).end, [BAL[0] + .9, BAL[1] + 9.5, BAL[2] + .55]), {p: {length: 6}, animAt: T(31)});
shot(31, look([BAL[0] - 7, BAL[1] - 7.5, BAL[2] + 13], [BAL[0] + .3, BAL[1] + 3.4, BAL[2]], 42), {size: 'medium', actions: [{actor: 'gov', verb: 'rope_pull', at: T(31) - S0(31) - .2}], see: .1});
clock.push({at: wordAt(32, 'cracked'), fx: 'crack'});
shot(32, look([3.6, 52.4, -52.5], [0, 52.2, -60], 30), {size: 'ecu', see: .5});
shot(33, look(add(BAL, [0, 1], 6.5, [1, 0], 1.2, 2.8), add(BAL, [0, 1], 0, [1, 0], 0, 5.2), 40), {size: 'close', actions: [{actor: 'gov', verb: 'panic_up', at: T(33) - S0(33)}], see: .5});
clock.push({at: wordAt(34, 'noon'), fx: 'dong'});
shot(34, look([-10, 17, 18], [0, 50, -58], 46), {size: 'insert', see: .3});
// 35 every fear grows GIANT: giant T-rex over the roofs, giant spider, giant vacuum
creatures.push({id: 'trexG', kind: 'trex', pos: G(-30, -24), yaw: 40, scale: 3, acts: [{act: 'roar', at: T(35)}], visible: [[0, false], [S0(35), true], [R(35).end, false]]});
creatures.push({id: 'spiderG', kind: 'spider', pos: G(26, -20, 12), yaw: -40, scale: 2.4, acts: [{act: 'wave', at: S0(35)}], visible: [[0, false], [S0(35), true], [R(35).end, false]]});
creatures.push({id: 'vacuumG', kind: 'vacuum', pos: G(12, 30), yaw: -150, scale: 2.2, acts: [], visible: [[0, false], [S0(35), true], [R(35).end, false]]});
shot(35, look([-8, 46, 88], [0, 24, -10], 62), {size: 'wide', see: .4});
// 36–37 the dark dome rolls over the plaza at noon (wide from the stair foot); Lulu tiny inside it
creatures.push({id: 'dome', kind: 'dome', radius: 24, pos: G(0, 6), acts: [{act: 'roll', at: S0(36), dur: R(36).end - S0(36) - .2, from: G(0, -40), to: G(0, 6)}], visible: [[0, false], [S0(36), true], [R(43).end, false]]});
shot(36, look([0, 1.8, 98], [-1, 18, 40], 60), {size: 'wide', see: .9});
put('lulu', P.lulu, 37, 37, G(0, 12), 0, {faces: [[S0(37), 'terrified']], accessories: ['plushHug']});
creatures.push({id: 'domeLulu', kind: 'dome', pos: G(0, 6), acts: [{act: 'inside', at: S0(37), dur: R(37).end - S0(37)}], visible: [[0, false], [S0(37), true], [R(37).end, false]]});
shot(37, look([0, 18.5, 24], [0, 16, 12], 30), {size: 'medium', see: .5});
// 38 everyone runs away down the Grand Stair
const STAIR = [[-3, 92], [2.5, 90], [-1, 88], [4, 87], [-4.5, 86]];
['pickles', 'mailman', 'buslady', 'dad', 'kevin'].forEach((n, i) => put(n, P[n], 38, 38, G(STAIR[i][0], STAIR[i][1]), 180, {faces: [[S0(38), 'terrified']], walk: 'sprint', travel: {dir: [0, 1], speed: 4.5}}));
shot(38, look([6, 6, 112], [0, 9, 82], 58), {size: 'wide', see: .4});
// 39–42 the hero at the plaza edge before the huge dome: punch, yell, alone, uncertain
const EDGE = G(4, 37), EDY = 180;
put('hero', P.hero, 39, 42, EDGE, EDY, {faces: [[S0(39), 'determined'], [S0(40), 'yell'], [S0(41), 'sad_soft'], [S0(42), 'thinking']]});
shot(39, camOn(EDGE, EDY, {d: 5, side: 3.5, h: 3.8, aim: 3.8, fov: 50, tx: -1.5}), {size: 'medium'});   // punch: no acting verb (UNMAPPED)
shot(40, camOn(EDGE, EDY, {d: 5, side: -3.5, h: 4.0, aim: 4.2, fov: 50, tx: 1.5}), {size: 'medium'});
shot(41, look(add(EDGE, [0, 1], 22, [1, 0], 6, 4), add(EDGE, [0, 1], -14, [1, 0], 0, 14), 62), {size: 'wide'});
shot(42, camOn(EDGE, EDY, {d: 4.4, side: .8, h: 4.4, aim: 4.4, fov: 40}), {size: 'close', actions: [{actor: 'hero', verb: 'idle_alive', at: 0}]});
// 43 he walks in (track behind): screen nearly black
put('hero', P.hero, 43, 43, add(EDGE, [0, 1], -3, [0, 0], 0, 0), EDY, {walk: true, travel: {dir: [0, -1], speed: 2.2}, faces: [[S0(43), 'determined']]});
shot(43, look(add(EDGE, [0, 1], 4.5, [1, 0], .6, 4.6), add(EDGE, [0, 1], -10, [0, 0], 0, 3.6), 50), {size: 'medium', see: .8});
// 44–48 inside the dome: flashlight cone; first scared face; hands meet; two-shot in the torch glow; Lulu looks up; Lulu stands tall
const IN = G(0, 6), HIN = G(1.3, 12.6), LIN = G(-1.3, 12.8);
creatures.push({id: 'domeIn', kind: 'dome', pos: IN, acts: [{act: 'inside', at: S0(44), dur: R(48).end - S0(44), rim: ['heroF', 'lulu']}], visible: [[0, false], [S0(44), true], [R(48).end, false]]});
put('heroF', P.hero, 44, 48, HIN, -35, {tool: 'flashlight', keys: [[S0(44), 'toolHold']], faces: [[S0(44), 'terrified'], [S0(46), 'warm'], [S0(48), 'awe']]});
put('lulu', P.lulu, 44, 48, LIN, 35, {faces: [[S0(44), 'cry'], [S0(46), 'sad_soft'], [S0(47), 'gasp'], [S0(48), 'determined']], accessories: ['plushHug']});
shot(44, camOn(HIN, -35, {d: 3.6, side: .6, h: 4.3, aim: 4.4, fov: 38}), {size: 'close'});
shot(45, look([0, HIN[1] + 2.6, 16.4], [0, HIN[1] + 2.2, 12.7], 34), {size: 'insert', actions: [{actor: 'heroF', verb: 'reach_for', at: .05}, {actor: 'lulu', verb: 'reach_for', at: .1}]});
shot(46, look([0, HIN[1] + 3.6, 20], [0, HIN[1] + 3.0, 12.7], 46), {size: 'medium'});
shot(47, look(add(LIN, [0, 1], 2.4, [1, 0], 1.6, .8), add(LIN, [0, 1], -2, [1, 0], 0, 7), 64), {size: 'medium'});
shot(48, camOn(LIN, 35, {d: 4.0, side: -.6, h: 2.6, aim: 2.6, fov: 42}), {size: 'medium'});
// 49–51 the dark SHRINKS (whoosh) → smaller, smaller → a tiny puff in Lulu's open palm, daylight floods the plaza (PAYOFF)
const LP = G(-3, 14), HP2 = add(LP, fwd(20), -1.5, rgt(20), -5, 0);
put('lulu', P.lulu, 49, 52, LP, 20, {faces: [[S0(49), 'determined'], [S0(51), 'grin']], keys: [[S0(49), 'idle'], [S0(51) - .4, 'toolHold']]});
put('hero', P.hero, 49, 52, HP2, -20, {faces: [[S0(49), 'awe'], [S0(51), 'grin']]});
creatures.push({id: 'domeS', kind: 'dome', pos: G(0, -10), acts: [{act: 'shrink', at: T(49) - .1, toActor: 'lulu', hand: 'right'}], visible: [[0, false], [S0(49), true], [R(51).end, false]]});
shot(49, look([-16, 22, 60], [0, 22, -8], 64), {size: 'wide', see: .6, actions: [{actor: 'lulu', verb: 'idle_alive', at: 0}]});
shot(50, look([-8, 19, 40], [-1, 16, -2], 50), {size: 'close', see: .55});
shot(51, look(add(LP, fwd(20), 1.6, rgt(20), 4.2, 2.6), add(LP, fwd(20), 1.0, rgt(20), .4, 2.3), 44), {size: 'insert', see: .9});
// 52 the plaza recovering: Kevin with a slider, the mouse on the bodybuilder's shoulder
const K52 = G(1, 25), B52 = G(-2.5, 25.5);
put('kevin', P.kevin, 52, 52, K52, 10, {faces: [[S0(52), 'grin']], keys: [[S0(52), 'toolHold']]});
put('bb', P.bb, 52, 52, B52, 10, {faces: [[S0(52), 'grin']]});
pr('slider', 'burger', during(S0(52), R(52).end, add(K52, fwd(10), 1.2 * .82, rgt(10), -1.51 * .82, 3.7 * .82)), {animAt: 0, scale: .8});
creatures.push({id: 'mouse', kind: 'rat', pos: add(B52, fwd(10), 0, rgt(10), 1.25 * 1.35, 4.15 * 1.35), yaw: 10, scale: 1, acts: [{act: 'shrink', at: 0}], visible: [[0, false], [S0(52), true], [R(52).end, false]]});
shot(52, look([-.5, 20.5, 38], [-.5, 18.6, 25], 46), {size: 'wide'});
// 53–55 next morning, the hero's yard: the bell rings (crack visible), a puff beside the hero → a cheeseburger; the hero looks INTO THE LENS
const HY = G(-114, 13), HYY = yawTo(G(-114, 13), BELL);
put('hero', P.hero, 53, 55, HY, HYY, {faces: [[S0(53), 'smile'], [T(53) + .2, 'shock'], [S0(55), 'shock'], [T(55) + .1, 'smirk']]});
clock.push({at: wordAt(53, 'rang'), fx: 'dong'});
const BURG = add(HY, fwd(HYY), .8, rgt(HYY), 2.4, .1);
pr('burgerY', 'burger', [[0, hide], [S0(53), BURG]], {scale: 1.4});
clock.push({at: +(T(53) + .9).toFixed(3), fx: 'pop', pos: [BURG[0], BURG[1] + .8, BURG[2]], scale: 1.6, show: 'prop_burgerY'});
shot(53, look(add(HY, fwd(HYY), -5, rgt(HYY), -2.6, 1.0), add(HY, fwd(HYY), 14, rgt(HYY), 1.5, 9), 62), {size: 'medium', see: .95});
shot(54, look(add(BURG, fwd(HYY), 2.4, rgt(HYY), .6, 1.0), add(BURG, [0, 0], 0, [0, 0], 0, .5), 40), {size: 'close', see: .1});
shot(55, camOn(HY, HYY, {d: 6.5, side: -.4, h: 4.0, aim: 2.8, fov: 52, tx: 1.6}), {size: 'close', see: .6});

// =========================== assemble ===========================
const frameOf = t => Math.round(t * F), lastEnd = END;
const sh = shots.sort((a, b) => a.n - b.n).map((s, i, A) => { const r = R(s.n), f0 = frameOf(r.start), f1 = i + 1 < A.length ? frameOf(R(A[i + 1].n).start) : frameOf(lastEnd);
  const to = s.to === 'push' ? {...s.cam, position: s.cam.position.map((v, j) => +(v + (s.cam.target[j] - v) * .12).toFixed(3))} : undefined;
  return {id: 'r' + String(s.n).padStart(2, '0'), row: s.n, size: s.size === 'ecu' ? 'close' : s.size, ...(s.size === 'ecu' ? {ecu: true} : {}), frames: f1 - f0, move: to ? 'push' : 'static-drift', drift: 0, from: s.cam, ...(to ? {to} : {}),
    loc: s.loc, briefMove: ROWS[s.n - 1].cam, shadowRadius: 30, ...(s.actions.length ? {actions: s.actions} : {}), ...(s.note ? {note: s.note} : {})}; });
const cast = {};
for (const [name, c] of Object.entries(CH)) {
  const apps = c.apps.sort((a, b) => a.n0 - b.n0), vis = [[0, false]], marks = [], keys = [[0, 'idle']], faces = [], acts = [];
  for (const a of apps) { const t0 = S0(a.n0), t1 = R(a.n1).end; vis.push([t0, true], [t1, false]); marks.push([t0, {origin: a.pos, yaw: +a.yaw.toFixed(2), ...(a.travel ? {travel: a.travel} : {})}]);
    for (const k of a.keys ?? []) keys.push(k); for (const f of a.faces ?? []) faces.push(f); if (a.walk) acts.push({n: a.n0, cyc: a.walk === true ? 'walk' : a.walk, t0, t1}); }
  const a0 = apps[0], dedup = v => v.filter((x, i) => i === 0 || x[0] !== v[i - 1][0] || x[1] !== v[i - 1][1]).sort((a, b) => a[0] - b[0]);
  cast[name] = {troupe: c.troupe, ...(c.costume ? {costume: c.costume} : {}), style: 'v5', faceStyle: 'v6', origin: a0.pos, yaw: a0.yaw, marks, visible: dedup(vis), keys: dedup(keys), faces: dedup(faces.length ? faces : [[0, 'smile']]),
    ...(apps.find(a => a.tool) ? {tool: apps.find(a => a.tool).tool} : {}), ...(apps.find(a => a.accessories) ? {accessories: apps.find(a => a.accessories).accessories} : {})};
  for (const w of acts) sh.find(s => s.row === w.n).actions = [...(sh.find(s => s.row === w.n).actions ?? []), {actor: name, cycle: w.cyc, at: 0, until: +(w.t1).toFixed(3)}];
}
const gaps = [{afterWord: 'Heights', nth: 1, clip: 'assets/sfx/memes/g1_scream.wav', pad: .15}, {afterWord: 'cheeseburger', nth: 1, clip: 'assets/sfx/memes/g2_canihave.wav', pad: .15},
  {afterWord: 'fear', nth: 8, clip: 'assets/sfx/memes/g3_mmm.wav', pad: .15}];
const roomOnly = o => o.room ?? o.loc;   // creatures / pops / props addressed to a room world
const spec = {slug: 'fearbell', fps: F, format: 7, lengthVariant: 'long', captionStyle: 'pop-shorts-v7', labels: false, hero: 'hero', rig: 'r6', acting: 6, twos: true,
  world: 'parts/city/world.js', look4: 'cityDay2', locations: ['city', 'cityClassroom', 'cityDining'], cityLiving: ['flagsHall', 'fountain', 'birds', 'gulls', 'blimp'],
  cues: `stories/${'fearbell'}/cues.json`, end: END, note: 'Fear Bell PREVIS (stories/fearbell/previs.js from BRIEF.md rows; built assets only, no look/world polish). Shots are static/push in previs; briefMove keeps the Brief camera for ANIMATIC.',
  audio: {gaps}, clock, cast, creatures, props, shots: sh};
writeFileSync(`${D}/episode.json`, JSON.stringify(spec, null, 1) + '\n');
// per-world previs specs (the vo-sheet renders each row from its own world)
mkdirSync(`${D}/build`, {recursive: true});
const strip = o => { const {room, loc, ...x} = o; return x; };
const worldSpec = loc => { const city = loc === 'city', mine = o => city ? !roomOnly(o) : roomOnly(o) === loc;
  return {...spec, ...(city ? {} : {world: 'parts/city/rooms.js', location: loc, cityLiving: undefined}), locations: undefined, creatures: creatures.filter(mine).map(strip), props: props.filter(mine).map(strip), clock: clock.filter(mine).map(strip)}; };
for (const L of spec.locations) writeFileSync(`${D}/build/previs-${L}.json`, JSON.stringify(worldSpec(L), null, 1) + '\n');
// vo-sheet: one frame per row at its MUST SEE moment (sync word + `see`), labels = row + VO + MUST SEE
const see = sh.map(s => { const r = R(s.row), sp = shots.find(q => q.n === s.row), t = Math.min(r.end - 1 / F, (r.syncT ?? r.start) + sp.see), f0 = frameOf(r.start);
  return {row: s.row, loc: s.loc, frame: Math.max(f0, Math.min(f0 + s.frames - 1, frameOf(t))), t: +t.toFixed(2), vo: r.line, see: r.see}; });
writeFileSync(`${D}/build/see.json`, JSON.stringify(see, null, 1) + '\n');
console.log(JSON.stringify({shots: sh.length, frames: sh.reduce((a, s) => a + s.frames, 0), end: END, cast: Object.keys(cast).length, creatures: creatures.length, props: props.length, clock: clock.length}));
