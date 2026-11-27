// stories/fearbell/previs.js — PREVIS blocking OVERRIDES for the Fear Bell (story-local; built assets only, no look/world polish).
// Pass 2 (owner A4): the spec is built FROM BRIEF.md by scripts/v2/brief2spec.js (exit 0: shots, cuts, cast slots, emphasis, format 7 flags);
// this file only overrides the blocking brief2spec cannot know: cameras, marks, creatures, props, the clock, audio gaps, per-world specs.
//   node scripts/v2/brief2spec.js --story fearbell && node stories/fearbell/previs.js
//   → episode.json (brief2spec base + overrides; the base is kept in build/brief2spec.json), build/previs-*.json, build/see.json (frame per row)
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {groundY} from '../../parts/city/plan.js';
import {parseBrief} from '../../scripts/v2/brief2spec.js';

// --gapped (ANIMATIC): build the spec on the MEME-GAP timeline (after `python3 scripts/v2/memegap.py --story fearbell`): every row time is shifted by
// the gaps before it, words come from build/cues-gapped.json → build/episode-gapped.json (frames, creatures, props, marks, clock all on the gapped VO).
// Without it nothing changes (episode.json on the raw VO: plan / stability gates).
const GAPPED = process.argv.includes('--gapped');
const D = 'stories/fearbell', F = 24, CUES = JSON.parse(readFileSync(GAPPED ? `${D}/build/cues-gapped.json` : `${D}/cues.json`, 'utf8'));
const GAPS = GAPPED ? JSON.parse(readFileSync(`${D}/build/memegap.json`, 'utf8')).gaps : [], shiftT = t => +(t + GAPS.filter(g => g.cut < t - 1e-6).reduce((a, g) => a + g.dur, 0)).toFixed(4);
mkdirSync(`${D}/build`, {recursive: true});
const cur = JSON.parse(readFileSync(`${D}/episode.json`, 'utf8'));
if (!GAPPED && /^Written by scripts\/v2\/brief2spec\.js/.test(cur.note ?? '')) writeFileSync(`${D}/build/brief2spec.json`, JSON.stringify(cur, null, 1) + '\n');
else if (!existsSync(`${D}/build/brief2spec.json`)) throw Error('run node scripts/v2/brief2spec.js --story fearbell first (episode.json is not its output)');
const BASE = JSON.parse(readFileSync(`${D}/build/brief2spec.json`, 'utf8')), BRIEF = parseBrief(readFileSync(`${D}/BRIEF.md`, 'utf8'));
const VOICE = CUES.duration, END = +(VOICE + .5).toFixed(3), W = CUES.lines.flatMap(l => l.words);
// rows from BRIEF.md: cut = the brief2spec shot's word-anchored start, end = the next cut; sync word time and MUST SEE from the notes
const ROWS = BRIEF.rows.map((r, i) => { const sh = BASE.shots[i], nx = BASE.shots[i + 1], start = shiftT(sh.at), end = shiftT(nx ? nx.at : +r.cue.split(/[–-]/)[1]);
  const sync = /sync:\s*(.+?)\s*@\s*([\d.]+)/.exec(r.notes), see = /MUST SEE:\s*(.*?)(?:\s+·\s+lock notes:|$)/.exec(r.notes)?.[1] ?? '';
  const idx = W.map((w, k) => [w, k]).filter(([w]) => w.start >= start - .02 && w.start < end - .02).map(([, k]) => k);
  return {n: +r['#'], start, end, syncT: sync ? shiftT(+sync[2]) : null, line: r.vo.replace(/\*/g, ''), see, cam: r.move, w0: idx[0], w1: idx.at(-1)}; });
const nthOf = i => { const n = W[i].w.replace(/[^\w']/g, '').toLowerCase(); return W.slice(0, i + 1).filter(x => x.w.replace(/[^\w']/g, '').toLowerCase() === n).length; };
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
const SUB = [-162, 10.7], SUBD = [.87, -.49], PICK = G(SUB[0] + SUBD[0] * 9, SUB[1] + SUBD[1] * 9), MAIL = G(SUB[0] + SUBD[0] * 22, SUB[1] + SUBD[1] * 22);
const HERO_P = G(-6, 16), HOUSE = G(-116.4, 18.5), YARD = G(-110, 20);
// ---- cast: one instance per character, re-blocked per row (marks) and hidden outside its rows ----
const CH = {}, rowsOf = {};
const put = (name, base, n0, n1, pos, yaw, extra = {}) => { (CH[name] ??= {...base, apps: []}).apps.push({n0, n1, pos, yaw, ...extra}); };
const BC = BASE.cast, slot = n => ({troupe: BC[n].troupe ?? 'HERO', ...(BC[n].costume ? {costume: BC[n].costume} : {})});
const P = {hero: {troupe: 'HERO'}, lulu: slot('lulu'), gov: slot('governor'), kevin: slot('kevin'), pickles: slot('pickles'), mailman: slot('mailman'), bb: slot('bodybuilder'), teacher: slot('teacher'),
  dad: slot('dad'), buslady: slot('buslady'), kidA: {troupe: 'SECOND', costume: 'KEVIN'}, kidB: {troupe: 'LITTLE', costume: 'LULU'}};   // kidA / kidB: the classroom extras (blocking)
// classroom / dining coordinates are room-local (parts/city/rooms.js); the vo-sheet renders those rows from the room spec
const CLASS = {desk: [-1, 0, -6.2], shelf: [-12.6, 4.6, -6]}, DINE = {seatFar: [-1.9, 0, -1.3], seatNear: [1.9, 0, 4.3]};
const shots = [], props = [], creatures = [], clock = [], locOf = {}, worldState = {};
const shot = (n, cam, {size, to, actions = [], loc = 'city', see = .2, note = '', faceAim = null, leakOk = null, pushK = .12, x = null} = {}) => { locOf[n] = loc; shots.push({n, cam, to, size, actions, loc, see, note, faceAim, leakOk, pushK, x}); };   // FINAL: pushK = how far a push travels (fraction of camera→target); x = extra camera fields (follow, followOffset, ease)   // pass 2: faceAim = the engine A1 face framing (cu / mcu / two / ots rows)
const pr = (id, prop, pos, extra = {}) => props.push({id, set: 'props1g', prop, pos: Array.isArray(pos[0]) && Array.isArray(pos[0][1]) ? pos : [[0, pos]], ...extra});   // attach + during(): hidden outside its window (the pos key y −400)
const hide = [0, -400, 0], during = (t0, t1, p) => [[0, hide], [t0, p], [t1, hide]];
// =========================== rows ===========================
// 1 bell mid-swing under the hat (DONG on "town")
shot(1, look([14, 51.5, -22], [0, 55, -60], 26), {size: 'close', to: 'push', see: .1, leakOk: ['slot:2']});   // the subject is the bell in its tower (slot 2)
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
shot(3, look([BUS[0] + 17.5, BUS[1] + 2.2, BUS[2] - 10.5], [BUS[0] + 2.4, BUS[1] + 6.0, BUS[2] + .6], 66), {size: 'close', see: .1});
// 4 Governor yanks the bell rope on the balcony, smug
put('gov', P.gov, 4, 4, BAL, 0, {faces: [[S0(4), 'gov_smug']]});
pr('rope', 'bellRope', during(S0(4), R(4).end, [BAL[0] + .9, BAL[1] + 9.5, BAL[2] + .55]), {p: {length: 6}, animAt: T(4)});
shot(4, look([BAL[0] - 9, BAL[1] - 6.5, BAL[2] + 17], [BAL[0] + .3, BAL[1] + 2.9, BAL[2]], 40), {size: 'medium', actions: [{actor: 'gov', verb: 'rope_pull', at: T(4) - S0(4) - .2}], see: .1, leakOk: ['slot:2']});
// 5–6 Mr. Pickles happily watering flowers (pass 2: the can rides his hand and pours) → a stone pillar shoots him 40 studs up (POP), he is ON TOP of it
put('pickles', P.pickles, 5, 6, PICK, -119, {faces: [[S0(5), 'smile'], [T(6) + .05, 'scream']]});   // FINAL: screaming (yell mouth) on top
pr('can', 'wateringCan', during(S0(5), R(5).end, PICK), {attach: {actor: 'pickles', part: 'rightArm', offset: [0, -1.05, .15], orient: true}, rot: [[0, [90, 0, 0]]], animAt: S0(5) + .25});
shot(5, camOn(PICK, -119, {d: 11.5, side: 2.5, h: 2.4, aim: 2.7, fov: 44, tx: .6}), {size: 'medium', actions: [{actor: 'pickles', verb: 'water', at: .05}]});
creatures.push({id: 'pillar', kind: 'pillar', pos: PICK, ride: 'pickles', acts: [{act: 'rise', at: T(6)}], visible: [[0, false], [T(6), true], [R(6).end, false]]});
clock.push({at: wordAt(6, 'Heights'), fx: 'pop', pos: [PICK[0], PICK[1] + 1.2, PICK[2]], scale: 2.6});
// FINAL row 6: the camera FOLLOWS him up (follow = the actor + ride height; from/to are offsets from his head): 9.5 studs out, a little above, looking
// down past him so the ground falls away below; it eases back to 13 studs as the pillar tops out (face ≥ 12 % of the frame height)
const R6CAM = (d, h, fov) => ({position: add([0, 0, 0], fwd(-119), d, rgt(-119), -2.2, h), target: [0, -.6, 0], fov});
shot(6, R6CAM(8.0, 1.4, 48), {size: 'medium', see: .5, to: R6CAM(11.5, 4.0, 52), x: {follow: 'pickles', followOffset: [0, 4.7, 0], ease: 'outCubic', move: 'whip'}});   // the lock's "whip-tilt up": a whip (exempt from the pan-speed cap by design)
const H6 = {d: 5.2, s: 6.0, h: 6.4, td: 0, ts: 0, th: 1.2, fov: 68};   // row 6b camera (relative to the pillar top, along his facing): tuned by eye in final-fix-heights.png
// 7–8 the mailman whistling → a T-rex behind him ROARS, the mail explodes (POP); pass 2 (owner, row 8): the HERO strolls calmly through the background sipping juice
put('mailman', P.mailman, 7, 8, MAIL, 61, {faces: [[S0(7), 'smile'], [T(8) + .15, 'terrified']]});
shot(7, camOn(MAIL, 61, {d: 11, side: -1.5, h: 2.2, aim: 2.9, fov: 44}), {size: 'medium'});
const TREX = add(MAIL, fwd(61), -13, [0, 0], 0, 0);
creatures.push({id: 'trex', kind: 'trex', pos: G(TREX[0], TREX[2]), yaw: 61, acts: [{act: 'roar', at: T(8) + .1}], visible: [[0, false], [T(8), true], [R(8).end, false]]});
clock.push({at: wordAt(8, 'dinosaur'), fx: 'pop', pos: [TREX[0], TREX[1] + 7, TREX[2]], scale: 5});
pr('mail', 'mailBurst', during(S0(8), R(8).end, [MAIL[0], MAIL[1] + 3.2, MAIL[2]]), {animAt: T(8) + .15});
const CAM0 = rgt(61), HC0 = add(MAIL, fwd(61), -3.5, CAM0, 3.2, 0);   // hero cameo: 5.5 studs behind the mailman, strolling right → left across the frame
put('hero', P.hero, 8, 8, G(HC0[0], HC0[2]), Math.atan2(-CAM0[0], -CAM0[1]) * 180 / Math.PI, {travel: {dir: [-CAM0[0], -CAM0[1]], speed: .5}, faces: [[S0(8), 'warm']], walk: true});
pr('juice', 'juiceCup', during(S0(8), R(8).end, HC0), {attach: {actor: 'hero', part: 'rightArm', offset: [0, -1.0, .1], orient: true}, rot: [[0, [90, 0, 0]]]});
shot(8, look(add(MAIL, fwd(61), 15, rgt(61), 0, 3.0), add(MAIL, fwd(61), -6, [0, 0], 0, 7), 66), {size: 'wide', see: .6, actions: [{actor: 'hero', verb: 'sip', at: .1}]});
// 9–10 the bodybuilder flexing by the beach ice-cream cart (heroLow) → a tiny rat (POP); he screams and LEAPS into the cart (pass 2: on the beach, beside the world's cart)
const CART = [229, 0, 290.5], BBYW = 200;   // parts/city/plan.json harbor beach props iceCart (world x, z)
const BB = G(CART[0] - 4.2, CART[2] + 1.5), BWCAM = add(BB, fwd(BBYW), 12, [0, 0], 0, 0), BBY = yawTo(BB, BWCAM), INCART = (q => add(q, fwd(BBY - 60), -1.3, [0, 0], 0, 0))(G(CART[0], CART[2], -1.3));   // FINAL: the held leap pose rides 2.2 studs up: the mark sits below the cart floor so his legs are IN the box; minus the leap's forward drift
put('bb', P.bb, 9, 10, BB, BBY, {faces: [[S0(9), 'grin'], [T(10) + .1, 'scream']], keys: [[0, 'heroPose'], [T(10) + .06, 'gaspHands']], marks2: [[T(10) + .12, INCART, BBY - 60]]});   // FINAL: the rat is seen first, then the scream + leap; the leap lands him in the cart
const RAT = add(BB, fwd(BBY), 2.6, rgt(BBY), -1.2, 0);
creatures.push({id: 'rat', kind: 'rat', pos: G(RAT[0], RAT[2]), yaw: BBY + 180, scale: 1.5, acts: [], visible: [[0, false], [S0(10), true], [R(10).end, false]]});   // FINAL (owner): NO POP — already sitting on the sand when row 10 starts
shot(9, look(add(BB, fwd(BBY), 13, rgt(BBY), 1.5, .9), add(BB, fwd(BBY), 0, rgt(BBY), -.6, 5.0), 64), {size: 'medium', see: .9});
// FINAL row 10: a PULL-BACK on a fixed aim point (pan speed ≈ 0): close on him by the cart (the rat below the frame) → wide (in-out ease: the rat enters on "rat"), him, the cart
const R10MID = add(RAT, [0, 0], 0, [0, 0], 0, 0).map((v, i) => +((v + INCART[i]) / 2).toFixed(3));
const T10 = add(R10MID, [0, 0], 0, rgt(BBY), -.6, 2.9);
shot(10, look(add(T10, fwd(BBY), 5.5, [0, 0], 0, 1.0), T10, 52), {size: 'wide', see: .4, to: look(add(T10, fwd(BBY), 14, [0, 0], 0, 1.4), T10, 60),
  actions: [{actor: 'bb', verb: 'leap', at: +(T(10) - S0(10) + .02).toFixed(3)}, {actor: 'bb', verb: 'land', at: +(T(10) - S0(10) + .2).toFixed(3)}]});   // he LANDS in the cart before the cut
// 11–12 Kevin at the diner counter → everything STILL: slow push on Kevin trembling before a cheeseburger (pass 2, row 11: the camera off the patio pole)
const KEV = (q => G(q[0], q[2]))(DP(.75, 0, 0)), KEVY = 217, BUN = DP(-.72, 0, 1.37), PLT = DP(-.72, 0, 1.3);   // FINAL: up at the counter between two stools, FACING the burger (217 = −DIN.f); the burger centred on its plate near the counter's front edge
put('kevin', P.kevin, 11, 12, KEV, KEVY, {faces: [[S0(11), 'neutral'], [S0(12), 'terrified']]});
pr('burger', 'burger', during(S0(11), R(12).end, BUN), {animAt: 999});
pr('plate', 'plate', during(S0(11), R(12).end, PLT));   // FINAL: the burger centred on the plate
// FINAL 11: Kevin in profile at the counter, the burger on its plate in front of him (from his side); 12: three-quarter on his face over the burger,
// a visible slow push (35 % of the way in) — the one stillness
// (camera angles measured off his facing −DIN.f: 11 ≈ 55° — profile-ish, wider; 12 ≈ 35° — three-quarter over the burger)
shot(11, look(DP(-1.7, 3.4, 2.7), DP(0, 0, 2.6), 54), {size: 'medium'});
shot(12, look(DP(-1.7, 2.5, 2.8), DP(.15, 0, 2.85), 58), {size: 'medium', to: 'push', pushK: .3, see: .6, note: 'the single stillness', x: {ease: 'inOutSine'}});
// 13–15 plaza: pops everywhere except an empty spot beside the hero; the hero looks at it (a leaf blows past); looks up at the bell (clear frame)
put('hero', P.hero, 13, 13, HERO_P, 200, {faces: [[S0(13), 'neutral']], keys: [[S0(13), 'idle']]});
const EMPTY = add(HERO_P, rgt(200), -1.5, [0, 0], 0, 0);   // the empty spot beside him, on screen-left of the CU
put('hero', P.hero, 14, 14, HERO_P, 178, {faces: [[S0(14), 'sad_soft']], keys: [[S0(14), 'idle']]});   // FINAL: three-quarter to the lens, glancing at the empty side (no chin-hand)
for (const [i, [x, z]] of [[-16, 6], [4, 10], [-22, 22], [8, 26], [-12, 30], [14, 14], [-2, 4]].entries()) clock.push({at: +(T(13) + .04 * i).toFixed(3), fx: 'pop', pos: G(x, z, 1.4), scale: 1.8});
shot(13, look([-6, 44, 52], [-6, 14, 14], 46), {size: 'wide', see: .3});
pr('leaf', 'leaf', [[0, hide], [S0(14), add(HERO_P, rgt(200), -3.4, fwd(200), 1.6, 5.6)], [R(14).end, add(HERO_P, rgt(200), -1.0, fwd(200), 1.8, 3.9), 'ramp']], {animAt: S0(14), p: {size: .6}});
shot(14, camOn(HERO_P, 200, {d: 8.5, side: .2, h: 4.4, aim: 3.9, fov: 44, tx: -.9}), {size: 'close', see: .35});   // FINAL: head and shoulders screen-right, the empty space + leaf screen-left   // head and shoulders on one side, the empty space he looks at (and the leaf) on the other
const H15 = G(-17, 12); put('hero', P.hero, 15, 15, H15, yawTo(H15, BELL), {faces: [[S0(15), 'thinking']]});   // off the statue's line to the tower: a clear frame up to the bell
shot(15, look(add(H15, fwd(yawTo(H15, BELL)), -9.0, rgt(yawTo(H15, BELL)), .3, 1.2), [BELL[0], BELL[1] - 16, BELL[2]], 62), {size: 'medium', see: .4, leakOk: ['slot:2']});   // the bell's own tower + hall below it
// 16–18 classroom (rooms world): the DRAWER creaks open (worldState drawer), a huge fuzzy spider climbs out; teacher on the bookshelf; kids run out of the DOOR
put('teacher', P.teacher, 16, 16, [-4.2, 0, -8.6], 30, {faces: [[S0(16), 'smile'], [T(16) + .3, 'terrified']], room: true});
put('teacher', P.teacher, 17, 18, [13.8, 7.25, -5], -90, {faces: [[S0(17), 'terrified']], keys: [[S0(17), 'kneel']], room: true});
worldState.drawer = [[0, 0], [S0(16), 0], [T(16) - .1, 1, 'ramp', .5], [R(18).end, 1], [R(18).end + .01, 0]];   // parts/city/rooms.js teacherDrawer (classroom only)
creatures.push({id: 'spider', kind: 'spider', pos: [[0, [-.3, 0, -4.4]], [T(16) + .2, [-.3, 0, -4.4]], [T(17), [-.3, 0, -3.4]]], yaw: 200, scale: .36, acts: [{act: 'wave', at: T(17)}], visible: [[0, false], [T(16) + .1, true], [S0(18), false]], room: 'cityClassroom'});   // pass 2: gone from row 18 (the kids' run is the MUST SEE)
const DOOR = [14.2, 0, 7.5];   // cityClassroom.json door: right wall, x 7.5
put('kidA', P.kidA, 16, 17, [3.5, 0, 4.4], 180, {faces: [[S0(16), 'smile']], room: true});
put('kidB', P.kidB, 16, 17, [5.2, 0, 1.4], 160, {faces: [[S0(16), 'smile']], room: true});
put('kidA', P.kidA, 18, 18, [8.4, 0, 6.6], 82, {faces: [[S0(18), 'grin']], room: true, walk: 'sprint', travel: {dir: [.99, .14], speed: 4.0}});
put('kidB', P.kidB, 18, 18, [6.2, 0, 5.2], 70, {faces: [[S0(18), 'laugh']], room: true, walk: 'sprint', travel: {dir: [.94, .34], speed: 4.0}});
shot(16, look([5.6, 5.2, .6], [.4, 2.1, -5.0], 40), {size: 'insert', to: 'push', loc: 'cityClassroom', see: .55, leakOk: ['roomMerged', 'teacherDrawer']});   // the subject is the teacher's desk (merged room mesh)
shot(17, look([-9.5, 6.4, 7.5], [6.5, 5.2, -5], 56), {size: 'medium', loc: 'cityClassroom', see: .6});
shot(18, look([-4, 4.6, -4], [12, 3.0, 6.6], 56), {size: 'wide', loc: 'cityClassroom', see: .6, actions: [{actor: 'kidA', verb: 'cheer', at: .05}, {actor: 'kidB', verb: 'cheer', at: .1}]});
// 19–20 dining (rooms world): a roaring VACUUM spawns beside Dad at the table (POP; both in frame); Dad eats spaghetti standing on his chair
put('dad', P.dad, 19, 19, [-1.9, 0, -1.3], 0, {faces: [[S0(19), 'smile'], [T(19) + .15, 'terrified']], room: true});
put('dad', P.dad, 20, 20, [-1.9, 1.75, -1.3], 0, {faces: [[S0(20), 'nervous_laugh']], room: true, keys: [[S0(20), 'idle']]});
creatures.push({id: 'vacuum', kind: 'vacuum', pos: [.4, 0, -.9], yaw: -150, scale: .45, acts: [{act: 'circle', at: S0(20), r: 2.2, dur: 1.4}], visible: [[0, false], [T(19), true], [R(20).end, false]], room: 'cityDining'});
clock.push({at: wordAt(19, 'vacuum'), fx: 'pop', pos: [.9, 1.6, -.7], scale: 1.6, room: 'cityDining'});
pr('spag', 'spaghetti', during(S0(19), R(20).end, [-1.2, 2.72, 1.0]), {loc: 'cityDining'});
shot(19, look([-.4, 6.4, 6.6], [-.5, 2.4, -.9], 54), {size: 'close', loc: 'cityDining', see: .9, leakOk: ['roomMerged']});   // high over the dinner table (the set): Dad + the vacuum beside him
shot(20, look([-10.6, 4.6, 4.2], [-1.4, 3.4, -1.0], 62), {size: 'wide', loc: 'cityDining'});
// 21–23 Kevin facing his cheeseburger (MCU, face + burger) → he BITES it (CU, the burger at his mouth) → the burger shrinks to a slider (insert)
const CAM22 = DP(4.2, 1.6, 3.9), Y22 = yawTo(KEV, CAM22) - 28;   // FINAL row 22: burger in hand, he turns from the counter to the open patio (three-quarter to the lens): no counter, awning or window post in frame
put('kevin', P.kevin, 21, 23, KEV, KEVY, {marks2: [[S0(22), KEV, Y22], [S0(23), KEV, KEVY]], faces: [[S0(21), 'determined'], [T(22) - .2, 'cry'], [S0(23), 'awe']]});
pr('burger2', 'burger', during(S0(21), R(21).end, BUN), {animAt: 999});
pr('burgerBite', 'burger', during(S0(22), R(22).end, KEV), {attach: {actor: 'kevin', part: 'rightArm', offset: [0, -1.15, .1], orient: true}, rot: [[0, [90, 0, 0]]], scale: .85});
pr('burger3', 'burger', during(S0(23), R(23).end, BUN), {animAt: T(23)});
pr('plate2', 'plate', during(S0(21), R(23).end, PLT));
shot(21, look(DP(-1.7, 2.5, 2.8), DP(.15, 0, 2.8), 54), {size: 'medium'});   // FINAL: the row-12 position (clear of the counter), wider lens: his face + the burger below it   // FINAL: three-quarter (≈ 35° off his facing), clear of the patio pole: his face + the burger
shot(22, look(CAM22, [KEV[0] + .5, KEV[1] + 3.35, KEV[2] + .55], 48), {size: 'close',   /* aim between his face and the burger in his hand (measured: hand 1.1 studs ahead at chest height) */   /* FINAL: customer side, front three-quarter: face, bite, burger; the bite lands ON "bite" */ actions: [{actor: 'kevin', verb: 'sip', at: +(T(22) - S0(22) - .18).toFixed(3)}], see: .15});   // FINAL: front three-quarter, no pole: his face, the bite, the burger
shot(23, look(DP(-.52, -2.5, 2.4), DP(-.72, 0, 1.55), 34),   /* FINAL: the same insert, moved with the burger */ {size: 'insert', see: .7, leakOk: ['slot:6']});   // the burger sits on the diner counter (slot 6)
// 24 Lulu hugging her plush on the porch, a small shadow puff with big eyes BESIDE her (pass 2: at her shoulder, never over her head)
const PORCH = G(-116.4, 15.2), LULUY = 10;
put('lulu', P.lulu, 24, 24, PORCH, LULUY, {faces: [[S0(24), 'warm']], accessories: ['plushHug']});
creatures.push({id: 'shadow', kind: 'shadowPuff', follow: 'lulu', offset: [1.7, -1.5, .2], acts: [], visible: [[0, false], [S0(24), true], [R(24).end, false]]});
shot(24, camOn(PORCH, LULUY, {d: 7.2, side: 1.6, h: 1.8, aim: 1.8, fov: 44, tx: 1.0}), {size: 'medium'});
// 25–28 hero house (inside = the built dining/kitchen room): the puff trails her (beside, not on her); hero holds the flashlight, puff shrinks back; Lulu beams up; hero looks away
put('lulu', P.lulu, 25, 25, [-6, 0, -5.4], 90, {faces: [[S0(25), 'smile']], room: true, accessories: ['plushHug'], walk: true, travel: {dir: [1, 0], speed: 1.6}});
creatures.push({id: 'shadowIn', kind: 'shadowPuff', follow: 'lulu', offset: [-1.9, -1.4, .4], acts: [], visible: [[0, false], [S0(25), true], [S0(26), false], [S0(27), true], [R(27).end, false]], room: 'cityDining'});
// ANIMATIC B row 26: the puff sits IN the beam ahead of the pair and recoils back along it on "flashlight" (Lulu stands beside the hero, never in front)
creatures.push({id: 'shadow26', kind: 'shadowPuff', pos: [[0, [4.5, 2.5, 1.2]], [T(26), [4.5, 2.5, 1.2]], [+(T(26) + .5).toFixed(3), [5.2, 2.0, .8]]], yaw: 30, acts: [], visible: [[0, false], [S0(26), true], [S0(27), false]], room: 'cityDining'});
shot(25, look([1.5, 3.6, -1.0], [-3.8, 2.0, -5.6], 52), {size: 'medium', loc: 'cityDining'});
put('lulu', P.lulu, 26, 28, [6.0, 0, .6], 27, {marks2: [[S0(26), [6.44, 0, 4.93], 207], [S0(27), [6.0, 0, .6], 27]], faces: [[S0(26), 'gasp'], [S0(27), 'grin']], room: true, accessories: ['plushHug']});
put('heroF', P.hero, 26, 27, [7.5, 0, 3.5], 207, {faces: [[S0(26), 'determined'], [S0(27), 'warm'], [S0(28), 'sad_soft']], room: true, tool: 'flashlight', keys: [[S0(26), 'toolHold'], [S0(28), 'idle']]});
shot(26, look([2.0, 5.6, -.6], [6.2, 3.0, 2.6], 56), {size: 'medium', loc: 'cityDining', see: .5});   // FINAL: closer — the hero ≥ 25 % of the frame, his beam + the puff recoiling
shot(27, look([10.6, 6.8, 4.7], [6.0, 3.3, .7], 50), {size: 'medium', loc: 'cityDining'});   // FINAL: OTS from behind his far shoulder — his head + shoulder on the frame edge (≥ 25 % of the height), Lulu's beaming face clear beside it
put('heroF', P.hero, 28, 28, [7.5, 0, 3.5], 262, {faces: [[S0(28), 'sad_soft']], room: true, tool: 'flashlight', keys: [[S0(28), 'idle']]});   // he looks away
shot(28, look([6.0, 4.6, 1.0], [7.5, 4.5, 3.5], 40), {size: 'close', loc: 'cityDining', faceAim: ['heroF']});
// 29–30 the bodybuilder nervously petting the rat in his palm → it is a mouse; he grins (pass 2: by the beach cart, as rows 9–10)
put('bb', P.bb, 29, 30, BB, BBY, {faces: [[S0(29), 'nervous_laugh'], [T(30) + .4, 'grin']], keys: [[S0(29), 'toolHold']]});
creatures.push({id: 'rat2', kind: 'rat', pos: add(BB, fwd(BBY), 1.75 * 1.35, rgt(BBY), 1.51 * 1.35 + .3, 2.75 * 1.35), yaw: BBY, scale: 1.2, acts: [{act: 'shrink', at: T(30)}], visible: [[0, false], [S0(29), true], [R(30).end, false]]});
shot(29, look(add(BB, fwd(BBY), 14, rgt(BBY), -3.0, 5.0), add(BB, fwd(BBY), 1, rgt(BBY), 1, 5.6), 50), {size: 'medium', actions: [{actor: 'bb', verb: 'idle_alive', at: 0}]});   // head + the rat in his palm (landed after the leap)
shot(30, look(add(BB, fwd(BBY), 7.0, rgt(BBY), 5.6, 5.2), add(BB, fwd(BBY), 2.36, rgt(BBY), 2.34, 3.85), 30), {size: 'insert', see: .9});   // FINAL: three-quarter from above, further out — the whole mouse (face, ears, body, tail) in his palm
// 31–34 the Governor yanks too hard (both hands) → CRACK (insert ECU, continuity) → "Oops." (panic, monocle) → it rings again at noon
put('gov', P.gov, 31, 33, BAL, 0, {faces: [[S0(31), 'gov_announce'], [S0(33), 'gov_oops'], [T(33), 'gov_panic']]});
pr('rope2', 'bellRope', during(S0(31), R(31).end, [BAL[0] + .9, BAL[1] + 9.5, BAL[2] + .55]), {p: {length: 6}, animAt: T(31)});
shot(31, look([BAL[0] - 7, BAL[1] - 7.5, BAL[2] + 13], [BAL[0] + .3, BAL[1] + 3.4, BAL[2]], 42), {size: 'medium', actions: [{actor: 'gov', verb: 'rope_pull', at: T(31) - S0(31) - .2}], see: .1, leakOk: ['slot:2']});
clock.push({at: wordAt(32, 'cracked'), fx: 'crack'});
shot(32, look([3.6, 52.4, -52.5], [0, 52.2, -60], 30), {size: 'ecu', see: .5, leakOk: ['slot:2']});
shot(33, look(add(BAL, [0, 1], 6.5, [1, 0], 1.2, 2.8), add(BAL, [0, 1], 0, [1, 0], 0, 4.5), 40), {size: 'close', actions: [{actor: 'gov', verb: 'panic_up', at: T(33) - S0(33)}], see: .5});
clock.push({at: wordAt(34, 'noon'), fx: 'dong'});
worldState.clockTime = [[0, null], [S0(34), '12:00'], [S0(53), null]];   // pass 2 (engine A3): the backwards clock tower stops at NOON (row 34) until the next morning
shot(34, look([57.5, 33.6, -18.5], [61.1, 37.6, -35.7], 30), {size: 'insert', see: .3, leakOk: ['slot:3']});   // the clock tower (slot 3) at noon, the swinging bell beyond
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
shot(38, look([9, 7, 113], [0, 7.4, 82], 58), {size: 'wide', see: .4});
// 39–42 the hero at the plaza edge before the huge dome: PUNCH (the fist passes into the dark), yell, alone, uncertain
const EDGE = G(4, 31.6), EDY = 180;   // the dome (r 24 at z 6) surface is ~1.6 studs ahead: the jab ends inside it
put('hero', P.hero, 39, 42, EDGE, EDY, {faces: [[S0(39), 'determined'], [S0(40), 'yell'], [S0(41), 'sad_soft'], [S0(42), 'thinking']]});
shot(39, look(add(EDGE, [0, 0], 0, [0, 0], 0, 4.4).map((v, i) => v + [6.5, 0, -1.2][i]), add(EDGE, [0, 0], 0, [0, 0], 0, 3.9).map((v, i) => v + [0, 0, -1.6][i]), 52), {size: 'medium', actions: [{actor: 'hero', verb: 'punch', at: T(39) - S0(39)}], see: .2});
shot(40, look(add(EDGE, [0, 0], 0, [0, 0], 0, 4.6).map((v, i) => v + [-3.4, 0, -4.8][i]), add(EDGE, [0, 0], 0, [0, 0], 0, 4.4), 50), {size: 'medium', faceAim: ['hero']});   // profile: the yell and the dome wall beside him
shot(41, look(add(EDGE, [0, 1], 22, [1, 0], 6, 4), add(EDGE, [0, 1], -14, [1, 0], 0, 8.3), 62), {size: 'wide'});
shot(42, camOn(EDGE, EDY, {d: 5.5, side: .8, h: 4.0, aim: 4.4, fov: 40}), {size: 'close', faceAim: ['hero'], actions: [{actor: 'hero', verb: 'idle_alive', at: 0}]});
// 43 he walks in (track behind): screen nearly black
put('hero', P.hero, 43, 43, add(EDGE, [0, 1], -.4, [0, 0], 0, 0), EDY, {walk: true, travel: {dir: [0, -1], speed: 2.2}, faces: [[S0(43), 'determined']]});   // FINAL: starts 1.5 studs from the wall: he is half inside by the cut
shot(43, look(add(EDGE, [0, 1], 19, [1, 0], 2.4, 3.2), add(EDGE, [0, 1], -6, [0, 0], 0, 6.6), 58), {size: 'medium', to: 'push', pushK: .1, see: .8});   // FINAL: low behind him, far enough back for the dome wall + its edge on the sky
// 44–48 inside the dome: flashlight cone; first scared face; hands meet; two-shot in the torch glow; Lulu looks up at HUGE EYES in the dark above; Lulu stands tall
const IN = G(0, 6), HIN = G(1.05, 12.6), LIN = G(-1.05, 12.7);
creatures.push({id: 'domeIn', kind: 'dome', pos: IN, acts: [{act: 'inside', at: S0(44), dur: R(48).end - S0(44), rim: ['heroF', 'lulu']}], visible: [[0, false], [S0(44), true], [R(48).end, false]]});
creatures.push({id: 'eyesAbove', kind: 'shadowPuff', pos: add(LIN, [0, 1], -6, [1, 0], 0, 11), scale: 6, acts: [], visible: [[0, false], [S0(47), true], [R(47).end, false]]});   // the giant dark's eyes (a huge puff face, kept on inside the dome)
put('heroF', P.hero, 44, 48, HIN, -35, {tool: 'flashlight', keys: [[S0(44), 'toolHold']], faces: [[S0(44), 'terrified'], [S0(46), 'warm'], [S0(48), 'awe']]});
const L45 = G(1.89, 16.56, .46), HAND45 = [1.25, HIN[1] + 3.75, 15.15];   // FINAL: Lulu 0.75 studs nearer so her reaching hand meets his torch hand (measured: arms 0.9 studs apart before)   // ANIMATIC B: row 45 Lulu steps INTO the beam, her raised hand meets his flashlight hand just ahead of the lens
put('lulu', P.lulu, 44, 48, LIN, 35, {marks2: [[S0(45), L45, 145], [S0(46), LIN, 35]], faces: [[S0(44), 'cry'], [S0(46), 'sad_soft'], [S0(47), 'gasp'], [S0(48), 'determined']], accessories: ['plushHug']});
shot(44, camOn(HIN, -35, {d: 3.6, side: .6, h: 4.3, aim: 4.4, fov: 38}), {size: 'close', faceAim: ['heroF']});
shot(45, look([HAND45[0] + 4.03, HAND45[1] - .3, HAND45[2] - 1.22], HAND45, 36), {size: 'insert', actions: [{actor: 'lulu', verb: 'reach_for', at: .1}]});   // FINAL: from the side, square to the hero→Lulu axis: the two hands meet mid-frame, his torch beam along it
// FINAL row 45: his torch beam ON the hands (a props1g flashlight just above the frame, aimed down the lens axis at HAND45; its SpotLight is a `keep` light)
{ const o = [1.9, 1.0, 1.3], d = o.map(v => -v), l = Math.hypot(...d), b = Math.asin(d[0] / l) * 180 / Math.PI, a = Math.atan2(-d[1] / l, d[2] / l) * 180 / Math.PI;   // narrow: the hands, not the floor
  pr('beam45', 'flashlight', during(S0(45), R(45).end, HAND45.map((v, i) => +(v + o[i]).toFixed(3))), {rot: [[0, [+a.toFixed(2), +b.toFixed(2), 0]]], p: {length: +(l + .4).toFixed(2), angle: 11, intensity: 240}}); }
shot(46, look([0, HIN[1] + 3.6, 20], [0, HIN[1] + 3.0, 12.7], 46), {size: 'medium', faceAim: ['heroF', 'lulu']});
shot(47, look(add(LIN, [0, 1], 5, [1, 0], 1.2, 1.0), add(LIN, [0, 1], -5, [1, 0], 0, 5.6), 70), {size: 'medium', see: .4});
shot(48, camOn(LIN, 35, {d: 4.5, side: -.6, h: 2.2, aim: 2.4, fov: 42}), {size: 'medium', faceAim: ['lulu']});
// 49–51 the dark SHRINKS: a wide WHOOSH collapse → smaller, smaller (two steps) → a tiny puff in Lulu's open palm, both faces, daylight floods the plaza (PAYOFF)
const LP = G(-3, 14), HP2 = add(LP, fwd(20), -1.2, rgt(20), -1.9, 0);
put('lulu', P.lulu, 49, 52, LP, 20, {faces: [[S0(49), 'determined'], [S0(51), 'grin']], keys: [[S0(49), 'idle'], [S0(51) - .4, 'toolHold']]});
put('hero', P.hero, 49, 52, HP2, 20, {faces: [[S0(49), 'awe'], [S0(51), 'grin']]});
creatures.push({id: 'domeS', kind: 'dome', pos: G(0, -10), acts: [{act: 'shrink', at: +(T(49) - .1).toFixed(3), toActor: 'lulu', hand: 'right'}], visible: [[0, false], [S0(49), true], [R(51).end, false]]});
shot(49, look([-34, 33, 104], [0, 14, -8], 56), {size: 'wide', see: .35});   // mid-collapse from the stair foot: the whole dome caving in over the plaza
shot(50, look(G(1, 24, 5.0), G(-2.5, 11, 2.4), 46), {size: 'close', see: .1});   // the second step (S2: u .74–.86) above the kids
shot(51, look(add(LP, fwd(20), 6.0, rgt(20), 1.6, 3.0), add(LP, fwd(20), 0, rgt(20), .4, 2.8), 50), {size: 'insert', faceAim: ['lulu', 'hero'], see: .9, actions: [{actor: 'lulu', verb: 'water', at: 0}]});   // her open palm held out (the puff lands on it)
// 52 the plaza recovering: Kevin with a slider, the mouse on the bodybuilder's shoulder (both big in frame)
const K52 = G(1, 25), B52 = G(-2.6, 25.5);
put('kevin', P.kevin, 52, 52, K52, 10, {faces: [[S0(52), 'grin']], keys: [[S0(52), 'toolHold']]});
put('bb', P.bb, 52, 52, B52, 10, {faces: [[S0(52), 'grin']]});
pr('slider', 'burger', during(S0(52), R(52).end, K52), {attach: {actor: 'kevin', part: 'rightArm', offset: [0, -1.15, .25], orient: true}, rot: [[0, [90, 0, 0]]], scale: .5});
pr('mouse', 'mouse', during(S0(52), R(52).end, B52), {attach: {actor: 'bb', part: 'torso', offset: [.62, 1.0, 0]}, scale: 1.4});
shot(52, look(G(-.8, 40, 5.0), G(-.8, 25, 4.2), 52), {size: 'wide', actions: [{actor: 'bb', verb: 'idle_alive', at: 0}]});   // back on the ground after the row-10 leap
// 53–55 next morning, the hero's yard: the bell rings (crack readable: long lens over his shoulder), a puff appears BESIDE him → it clears: a FULL cheeseburger
// on the GRASS → he turns and looks INTO THE LENS, deadpan (head and shoulders; the burger in the foreground)
const HY = G(-112, 19.5), HYY = yawTo(HY, BELL), FY = HYY + 180, Y55 = FY;   // ANIMATIC staging: he stands FRONT-ON to the lens (camera on the side away from the bell, the tower + bell behind/above him)
put('hero', P.hero, 53, 55, HY, FY, {faces: [[S0(53), 'smile'], [T(53) + .2, 'shock'], [S0(55), 'shock'], [T(55) - .05, 'deadpan']]});
clock.push({at: wordAt(53, 'rang'), fx: 'dong'});
const BURG = add(HY, fwd(FY), -2.2, rgt(FY), -3.7, 0);   // FINAL: towering just behind him, over one shoulder (never over his face): a head-and-shoulders frame is ~3.7 studs wide at his depth, so the 6.4-stud burger reads only as the wall of layers behind him   // GIANT (scale 3.4 ≈ 6.5 studs tall): beside him and a step nearer the lens, so his head and shoulders clear its top
pr('burgerY', 'cheeseburger', [[0, hide], [S0(54) + .15, BURG]], {scale: 3.4, rot: [[0, [0, 20, 0]]]});
clock.push({at: +(S0(54) + .1).toFixed(3), fx: 'pop', pos: [BURG[0], BURG[1] + 3, BURG[2]], scale: 4});
const PUFF = add(HY, fwd(FY), .8, rgt(FY), 2.7, 2.6);
clock.push({at: +(T(53) + .75).toFixed(3), fx: 'pop', pos: PUFF, scale: 1.6});
creatures.push({id: 'puffY', kind: 'shadowPuff', pos: PUFF, yaw: FY, scale: 1.1, acts: [], visible: [[0, false], [+(T(53) + .8).toFixed(3), true], [+(S0(54) + .1).toFixed(3), false]]});   // the puff beside him (row 53) until it clears
shot(53, look(add(HY, fwd(FY), 12, rgt(FY), 4.2, .8), add(HY, fwd(HYY), 30, rgt(FY), -4.5, 12), 58), {size: 'medium', to: 'push', see: .95});   // front-on, low: the puff beside him, the tower + bell behind and above
shot(54, look(add(HY, fwd(FY), 6.0, rgt(FY), 0, 3.6), add(HY, [0, 0], 0, rgt(FY), -.85, 4.2), 46), {size: 'close', see: .9});   /* FINAL: re-aimed with the moved burger — its edge looms behind his shoulder */   // held back: his shocked face, only the shape's edge looming at the frame side
shot(55, look(add(HY, fwd(FY), 7.5, rgt(FY), -.9, 4.4), add(HY, [0, 0], 0, rgt(FY), -.85, 3.9), 52), {size: 'close', actions: [{actor: 'hero', verb: 'lookAtLens', at: .3}], see: .5});   // FINAL: eye-level, head and shoulders + the burger's layers beside him   // low lens: the burger's layers in the lower frame, his head and shoulders above it, deadpan into the lens

// =========================== assemble ===========================
const frameOf = t => Math.round(t * F), lastEnd = END;
const sh = shots.sort((a, b) => a.n - b.n).map((s, i, A) => { const r = R(s.n), f0 = frameOf(r.start), f1 = i + 1 < A.length ? frameOf(R(A[i + 1].n).start) : frameOf(lastEnd);
  const to = s.to === 'push' ? {...s.cam, position: s.cam.position.map((v, j) => +(v + (s.cam.target[j] - v) * s.pushK).toFixed(3))} : s.to && typeof s.to === 'object' ? s.to : undefined;   // FINAL: `to` may be an explicit pose (a reveal / ride)
  const b = BASE.shots[s.n - 1], {from: _f, to: _t, at: _a, cityAnchor: _c, ...keep} = b;   // brief2spec's shot (id, mood, vo, why, see, cue, tplKind) under the blocking override
  return {...keep, row: s.n, size: s.size === 'ecu' ? 'close' : s.size, ...(s.size === 'ecu' ? {ecu: true} : {}), frames: f1 - f0, move: to ? 'push' : 'static-drift', drift: 0, from: s.cam, ...(to ? {to} : {}),
    loc: s.loc, ...(s.faceAim ? {faceAim: s.faceAim} : {}), ...(s.leakOk ? {leakOk: s.leakOk} : {}), briefMove: ROWS[s.n - 1].cam, shadowRadius: 30, ...(s.actions.length ? {actions: s.actions} : {}), ...(s.note ? {note: s.note} : {}), ...(s.x ?? {})}; });
// ANIMATIC plan gate: the cast-name subject for actors; since the fearbell ENGINE fix A2 the gate also measures NON-ACTOR subjects by their projected
// box (creature ids, actor parts `actor:part`, story props `prop_<id>`, named world objects), so every row names its real subject and the three
// story-prop inserts their prop again (16 the teacher's drawer, 23 the shrinking burger, 34 the clock tower = slot:3)
const SUBJ = {4: 'gov', 9: 'bb', 29: 'bb', 31: 'gov', 33: 'gov', 26: 'heroF', 28: 'heroF', 44: 'heroF', 46: 'heroF',
  2: 'hall', 3: 'ghost', 8: 'trex', 10: 'rat', 13: 'hero', 17: 'spider', 18: 'kidA', 19: 'dad', 25: 'shadowIn', 30: 'rat2', 35: 'trexG', 36: 'dome',
  38: 'mailman', 45: 'heroF:rightArm', 49: 'domeS', 50: 'domeS', 52: 'kevin', 54: 'hero'}, PROP = {16: 'teacherDrawer', 23: 'prop_burger3', 34: 'slot:3:dial#2'};
// ANIMATIC B row 53 SPLIT (owner): front-on hero (morning) → the DONG on "rang" as a quick ECU insert of the CRACK (≈ 0.6 s, the row-32 lens) → front-on hero + puff
{ const i = sh.findIndex(o => o.row === 53), A = sh[i], f0 = frameOf(S0(53)), fB = frameOf(T(53)), fC = fB + Math.round(.6 * F), total = A.frames;
  const B = {...A, id: A.id + 'b', size: 'close', ecu: true, frames: fC - fB, move: 'static-drift', from: look([3.6, 52.4, -52.5], [0, 52.2, -60], 30), leakOk: ['slot:2'], subject: 'bellCrack', see: ['bell']}; delete B.to; delete B.actions;
  const C = {...A, id: A.id + 'c', frames: f0 + total - fC}; delete C.actions;
  A.frames = fB - f0; sh.splice(i + 1, 0, B, C); }
// HEIGHTS FIX (owner): row 6 SPLIT at 31 % of the row (≈ the end of the 0.6 s rise = the start of the G1 scream clip on the gapped timeline; ≤ 40 %):
// 6 = the follow-camera ride-up (kept), 6b = a HIGH, steep look DOWN past the clinging Mr. Pickles to the tiny town 40 studs below (the drop is the subject)
{ const i = sh.findIndex(o => o.row === 6), A = sh[i], f0 = frameOf(S0(6)), fB = f0 + Math.max(3, Math.round(.31 * A.frames)), total = A.frames;
  const TOP = [PICK[0], PICK[1] + 40, PICK[2]], F6 = fwd(-119), R6 = rgt(-119);
  const B = {...A, id: A.id + 'b', frames: f0 + total - fB, move: 'static-drift', from: look(add(TOP, F6, H6.d, R6, H6.s, H6.h), add(TOP, F6, H6.td, R6, H6.ts, H6.th), H6.fov), actions: [{actor: 'pickles', verb: 'gasp_step_back', at: 0}, {actor: 'pickles', verb: 'gasp_step_back', at: .55}]};
  delete B.to; delete B.follow; delete B.followOffset; delete B.ease; B.subject = 'pickles'; B.size = 'medium';
  A.frames = fB - f0; sh.splice(i + 1, 0, B); }
for (const o of sh) { if (SUBJ[o.row] && !o.ecu) o.subject = SUBJ[o.row]; if (PROP[o.row]) o.prop = PROP[o.row]; if (o.row === 8) o.see = [...new Set([...(o.see ?? []), 'hero'])]; }
const cast = {};
for (const [name, c] of Object.entries(CH)) {
  const apps = c.apps.sort((a, b) => a.n0 - b.n0), vis = [[0, false]], marks = [], keys = [[0, 'idle']], faces = [], acts = [];
  for (const a of apps) { const t0 = S0(a.n0), t1 = a.n1 === ROWS.length ? END : R(a.n1).end;   /* FINAL: the last row holds to END */ vis.push([t0, true], [t1, false]); marks.push([t0, {origin: a.pos, yaw: +a.yaw.toFixed(2), ...(a.travel ? {travel: a.travel} : {})}]); for (const m of a.marks2 ?? []) marks.push([m[0], {origin: m[1], yaw: +m[2].toFixed(2)}]);
    for (const k of a.keys ?? []) keys.push(k); for (const f of a.faces ?? []) faces.push(f); if (a.walk) acts.push({n: a.n0, cyc: a.walk === true ? 'walk' : a.walk, t0, t1}); }
  const a0 = apps[0], dedup = v => v.filter((x, i) => i === 0 || x[0] !== v[i - 1][0] || x[1] !== v[i - 1][1]).sort((a, b) => a[0] - b[0]);
  cast[name] = {troupe: c.troupe, ...(c.costume ? {costume: c.costume} : {}), style: 'v5', faceStyle: 'v6', origin: a0.pos, yaw: a0.yaw, marks, visible: dedup(vis), keys: dedup(keys), faces: dedup(faces.length ? faces : [[0, 'smile']]),
    ...(apps.find(a => a.tool) ? {tool: apps.find(a => a.tool).tool} : {}), ...(apps.find(a => a.accessories) ? {accessories: apps.find(a => a.accessories).accessories} : {})};
  for (const w of acts) sh.find(s => s.row === w.n).actions = [...(sh.find(s => s.row === w.n).actions ?? []), {actor: name, cycle: w.cyc, at: 0, until: +(w.t1).toFixed(3)}];
}
const gaps = [{afterWord: 'Heights', nth: 1, clip: 'assets/sfx/memes/g1_scream.wav', pad: .15}, {afterWord: 'cheeseburger', nth: 1, clip: 'assets/sfx/memes/g2_canihave.wav', pad: .15},
  {afterWord: 'fear', nth: 8, clip: 'assets/sfx/memes/g3_mmm.wav', pad: .15}];
const roomOnly = o => o.room ?? o.loc;   // creatures / pops / props addressed to a room world
const {shots: _s, cast: _c, props: _p, note: _n, location: _l, moods: _m, body: _b, look: _lk, effects: _e, ...baseRest} = BASE;   // the city look B (look4) owns the light: no format 6 mood lighting / v6 body
const spec = {...baseRest, fps: F, rig: 'r6', twos: true, world: 'parts/city/world.js', look4: 'cityDay2', locations: ['city', 'cityClassroom', 'cityDining'], cityLiving: ['flagsHall', 'fountain', 'birds', 'gulls', 'blimp'],
  end: END, note: 'Fear Bell PREVIS pass 2: scripts/v2/brief2spec.js from BRIEF.md (shots, cuts, cast slots, emphasis, flags) + stories/fearbell/previs.js blocking overrides (cameras, marks, creatures, props, clock, gaps). Shots are static/push in previs; briefMove keeps the Brief camera for ANIMATIC.',
  audio: {gaps}, clock, cast, creatures, props, ...(worldState ? {worldState} : {}), shots: sh};
if (GAPPED) { for (const e of spec.emphasis6 ?? []) if (typeof e.t === 'number') e.t = shiftT(e.t); for (const x of spec.shots) if (Array.isArray(x.cue)) x.cue = x.cue.map(shiftT); spec.cues = `${D}/build/cues-gapped.json`; spec.audio = {...spec.audio, voice: `${D}/build/voice-gapped.wav`, gapsApplied: true};
  writeFileSync(`${D}/build/episode-gapped.json`, JSON.stringify(spec, null, 1) + '\n'); console.log(JSON.stringify({gapped: true, shots: spec.shots.length, frames: spec.shots.reduce((a, x) => a + x.frames, 0), end: END})); process.exit(0); }
writeFileSync(`${D}/episode.json`, JSON.stringify(spec, null, 1) + '\n');
// per-world previs specs (the vo-sheet renders each row from its own world)
const strip = o => { const {room, loc, ...x} = o; return x; };
const worldSpec = loc => { const city = loc === 'city', mine = o => city ? !roomOnly(o) : roomOnly(o) === loc;
  return {...spec, ...(city ? {} : {world: 'parts/city/rooms.js', location: loc, cityLiving: undefined}), locations: undefined, creatures: creatures.filter(mine).map(strip), props: props.filter(mine).map(strip), clock: clock.filter(mine).map(strip)}; };
for (const L of spec.locations) writeFileSync(`${D}/build/previs-${L}.json`, JSON.stringify(worldSpec(L), null, 1) + '\n');
// vo-sheet: one frame per row at its MUST SEE moment (sync word + `see`), labels = row + VO + MUST SEE
const see = sh.map(s => { const r = R(s.row), sp = shots.find(q => q.n === s.row), t = Math.min(r.end - 1 / F, (r.syncT ?? r.start) + sp.see), f0 = frameOf(r.start);
  return {row: s.row, loc: s.loc, frame: Math.max(f0, Math.min(f0 + s.frames - 1, frameOf(t))), t: +t.toFixed(2), vo: r.line, see: r.see}; });
writeFileSync(`${D}/build/see.json`, JSON.stringify(see, null, 1) + '\n');
console.log(JSON.stringify({shots: sh.length, frames: sh.reduce((a, s) => a + s.frames, 0), end: END, cast: Object.keys(cast).length, creatures: creatures.length, props: props.length, clock: clock.length}));
