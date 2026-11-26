// scripts/v2/fearbell1g-gate.js — Phase 1G gate (Fear Bell cast, creatures, props, interiors; look B = cityDay2 + outline classic; CC0 on the farm).
//   node scripts/v2/fearbell1g-gate.js [--out renders/fearbell1g] [--review review/fearbell] [--only stage,react,cast,props,rooms,dome,fx,bench] [--specs-only]
// stage : studio cells (engine/stage1g.html): every creature turntable (front, ¾, side) + its act key + every 1G prop + bus stop + diner counter
// react : one city spec, a phone-size (390 × 693) reaction frame per creature (the creature mid-act + a cast member reacting) + the dome INSIDE view
// cast  : the 1G extras + Lulu + Kevin (+ hero + Governor for scale) lined up on the plaza: one wide + three group frames at phone size
// props : the bus stop (Main St) and the diner's outdoor counter in the world + the hand props in a cast member's hands
// rooms : CLASSROOM + HERO HOME DINING (parts/city/rooms.js), both keyArt anchors each, phone size
// dome  : 4 s, 270 × 480, 24 fps: the dome rolls over the plaza, then the shrink (whoosh → 2 steps → palm puff + blink) → 1G-dome.mp4
// fx    : 3 s, 270 × 480: cartoon POP puffs + the ghost spawn at the bus stop → 1G-fx.mp4
// bench : 720 × 1280 plazaWide key art with the dome + 10 extras: tris + s/frame (PASS ≤ 90k, ≤ 0.62 s)
// Writes engine/fixtures/fearbell/gate1g-*.json, <out>/…, <review>/1G-measures.json. Sheets: python3 scripts/v2/fearbell1g-sheet.py.
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {keyArt, groundY} from '../../parts/city/plan.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'renders/fearbell1g'), REV = arg('review', 'review/fearbell'), ONLY = arg('only', 'stage,react,cast,props,rooms,dome,fx,bench').split(',');
const G = (x, z, dy = 0) => [x, +(groundY(x, z) + dy).toFixed(3), z], F = 24;
const base = (extra = {}) => ({slug: 'fearbell1g', fps: F, format: 6, labels: false, world: 'parts/city/world.js', look4: 'cityDay2', rig: 'r6', acting: 6, cityLiving: ['flagsHall', 'fountain', 'birds', 'gulls', 'blimp'], ...extra});
const who = (slot, costume, at, yaw, extra = {}) => ({troupe: slot, ...(costume ? {costume} : {}), style: 'v5', faceStyle: 'v6', origin: at, yaw, keys: [[0, 'idle']], ...extra});
const look = (pos, tgt, fov = 55) => ({position: pos, target: tgt, fov});
const shot = (id, cam, frames, extra = {}) => ({id, size: 'wide', frames, move: 'static-drift', drift: 0, from: cam, shadowRadius: 34, ...extra});
const vis = (t0, t1) => [[0, false], [t0, true], [t1, false]];
// ---- places ----
const BUS = [94.21, 14.42, 3.0], BUS_F = [Math.sin(-3.099), Math.cos(-3.099)];   // bus stop (plan.json mainStreet dressing busStop s 94 S): front faces the road (−z)
const DIN = (() => { const y = 37 * Math.PI / 180, c = Math.cos(y), s = Math.sin(y), lx = 6.2, lz = 7.95, x = 254 + lx * c + lz * s, z = 156 - lx * s + lz * c; return {at: [x, groundY(254, 156) + .45, z], f: [s, c], r: [c, -s]}; })();
const CAM_BUS = look([BUS[0] + 17.5, BUS[1] + 2.2, BUS[2] - 10.5], [BUS[0] + 2.4, BUS[1] + 6.0, BUS[2] + .6], 66);
// ---- 1. reaction frames: 9 shots of 2 s, creature i visible only in its shot ----
const R = 48, T0 = i => i * R / F;
const REACT = [
  {id: 'ghost', c: {kind: 'ghost', pos: G(BUS[0] + 6.2, BUS[2] + .6), yaw: 150, acts: [{act: 'spawn', at: T0(0) + .1}, {act: 'boo', at: T0(0) + .55}]}, peak: 1.25, cam: CAM_BUS,
    who: who('ADULT_F', 'BUSLADY', G(BUS[0] - 1.2, BUS[2] - 1.8), 75, {faces: [[0, 'gasp']]})},
  {id: 'trex', c: {kind: 'trex', pos: G(14, -15), yaw: 55, acts: [{act: 'roar', at: T0(1) + .15}]}, peak: .78, cam: look([23, 15.4, 17], [13.5, 22, -10], 64),
    who: who('SECOND', 'KEVIN', G(16.9, 8), 30, {faces: [[0, 'terrified']]})},
  {id: 'rat', c: {kind: 'rat', pos: G(1.8, 13), yaw: -90, scale: 1.5, acts: [{act: 'shrink', at: T0(2) + .7}]}, peak: .45, peak2: 1.35, cam: look([-.2, 15.0, 23.5], [-.2, 15.6, 13], 46),
    who: who('LITTLE', 'LULU', G(-1.4, 13), 90, {faces: [[0, 'gasp'], [T0(2) + 1.1, 'smile']]})},
  {id: 'spider', c: {kind: 'spider', pos: G(-24, -2), yaw: 35, acts: [{act: 'wave', at: T0(3) + .1}]}, peak: .75, cam: look([-6, 15.6, 24], [-21, 19.5, -2], 64),
    who: who('ELDER', 'MAILMAN', G(-8.6, 13.5), -25, {faces: [[0, 'terrified']]})},
  {id: 'vacuum', c: {kind: 'vacuum', pos: G(15, 6), yaw: 9, acts: [{act: 'circle', at: T0(4), r: 2.5, dur: 1.0}, {act: 'lunge', at: T0(4) + 1.05, dist: 4}]}, peak: 1.3, cam: look([28, 15.6, 30], [15.5, 17.4, 7], 56),
    who: who('ELDER', 'BODYBUILDER', G(21.5, 14.5), 25, {faces: [[0, 'terrified']]})},
  {id: 'shadowPuff', c: {kind: 'shadowPuff', follow: 'heroP', offset: [1.3, 1.0, .6], acts: []}, peak: .6, cam: look([1.6, 17.4, 21], [-.4, 17.6, 12], 42),
    who: {name: 'heroP', ...who('HERO', null, G(-1, 12), 12, {faces: [[0, 'hero_shock']]})}},
  {id: 'dome', c: {kind: 'dome', pos: G(0, -34), yaw: 0, acts: []}, peak: .5, cam: look([-7, 15.2, 30], [-1, 29, -20], 68),
    who: who('ELDER', 'DAD_FB', G(-5.6, 21), 15, {faces: [[0, 'terrified']]})},
  {id: 'pillar', c: {kind: 'pillar', pos: G(-8, 14), ride: 'pick', acts: [{act: 'rise', at: T0(7) + .3}]}, peak: .37, cam: look([6, 15.5, 30], [-8, 26, 14], 66),
    who: {name: 'pick', ...who('ELDER', 'PICKLES', G(-8, 14), 30, {faces: [[0, 'gasp']]})}},
  {id: 'inside', c: {kind: 'dome', id: 'domeIn', pos: G(0, 2), acts: [{act: 'inside', at: T0(8), dur: 2}]}, peak: .8, cam: look([1.5, 17.2, 25], [-4.5, 15.6, 10.5], 54),
    who: {name: 'heroIn', ...who('HERO', null, G(1.5, 12), 252, {faces: [[0, 'hero_shock']], tool: 'flashlight', keys: [[0, 'toolHold']]})}},
];
const reactSpec = () => { const cast = {}, creatures = [], shots = [];
  REACT.forEach((r, i) => { const t0 = T0(i), name = r.who.name ?? 'r' + i, {name: _n, ...w} = r.who; cast[name] = {...w, visible: vis(t0, t0 + R / F)};
    creatures.push({id: r.c.id ?? r.id, ...r.c, visible: vis(t0, t0 + R / F)}); shots.push(shot('r' + i, r.cam, R)); });
  return base({note: 'Phase 1G gate: one reaction frame per creature (creature mid-act + a cast member reacting) + the dome inside view.', cast, creatures, shots}); };
// ---- 2. cast lineup on the plaza ----
const LINE = [['LITTLE', 'LULU'], ['SECOND', 'KEVIN'], ['ELDER', 'PICKLES'], ['ELDER', 'MAILMAN'], ['ELDER', 'BODYBUILDER'], ['ADULT_F', 'TEACHER_FB'], ['ELDER', 'DAD_FB'], ['ADULT_F', 'BUSLADY'], ['HERO', null], ['GOVERNOR', null]];
const LX = i => -11.7 + i * 2.6, LZ = 21;
const castSpec = () => { const cast = {}; LINE.forEach(([s, c], i) => { cast[(c ?? s).toLowerCase()] = who(s, c, G(LX(i), LZ), 0, {faces: [[0, s === 'GOVERNOR' ? 'gov_smug' : s === 'HERO' ? 'hero_grin' : 'smile']]}); });
  const y = groundY(0, LZ), cam = (i0, i1, d, fov) => look([(LX(i0) + LX(i1)) / 2, y + 3.0, LZ + d], [(LX(i0) + LX(i1)) / 2, y + 2.7, LZ], fov);
  return base({note: 'Phase 1G gate: the Fear Bell extras + Lulu + Kevin (+ hero, Governor) on the plaza.', cast,
    shots: [shot('all', cam(0, 9, 21, 64), 4), shot('g1', cam(0, 2, 13.5, 50), 4), shot('g2', cam(3, 5, 13.5, 50), 4), shot('g3', cam(6, 8, 13.5, 50), 4), shot('g4', cam(8, 9, 10.5, 50), 4)]}); };
// ---- 3. props in the world ----
const propsSpec = () => { const dc = DIN.at, f = DIN.f, r = DIN.r, P = (d, s, y) => [dc[0] + f[0] * d + r[0] * s, dc[1] + y, dc[2] + f[1] * d + r[1] * s];
  const cast = {kev: who('SECOND', 'KEVIN', (q => G(q[0], q[2]))(P(.4, -3.6, 0)), 180 + 37 - 60, {faces: [[0, 'smile']]}), lady: who('ADULT_F', 'BUSLADY', G(BUS[0] - 1.2, BUS[2] - 1.6), -170, {faces: [[0, 'smile']]}),
    gov: who('GOVERNOR', null, G(-3.4, 8), 20, {faces: [[0, 'gov_announce']], keys: [[0, 'idle']]}), heroF: who('HERO', null, G(2.3, 9), -40, {faces: [[0, 'hero_grin']], tool: 'flashlight'})};
  const props = [{id: 'burger', set: 'props1g', prop: 'burger', pos: [[0, P(-.9, -.7, 1.37)]], animAt: 99}, {id: 'slider', set: 'props1g', prop: 'burger', pos: [[0, P(-.9, .5, 1.37)]], animAt: 0},
    {id: 'plate', set: 'props1g', prop: 'plate', pos: [[0, P(-.95, -2.0, 1.3)]]}, {id: 'spag', set: 'props1g', prop: 'spaghetti', pos: [[0, P(-.95, 1.7, 1.3)]], scale: .9},
    {id: 'rope', set: 'props1g', prop: 'bellRope', p: {length: 6}, pos: [[0, [-2.6, 23, 8.6]]]}, {id: 'mail', set: 'props1g', prop: 'mailBurst', pos: [[0, [0, 14.2, 8]]], animAt: 0}];
  return base({note: 'Phase 1G gate: props in the world — diner outdoor counter (burger, slider, plate, spaghetti), the bus stop (lady + donut), flashlight cone, bell rope, mail burst.', cast, props,
    shots: [shot('diner', look(P(7.2, 1.2, 2.9), P(-.9, -.6, 1.9), 56), 4), shot('bus', look([BUS[0] - 2.2, BUS[1] + 2.4, BUS[2] - 10.5], [BUS[0] + .3, BUS[1] + 2.6, BUS[2] - .4], 58), 4),
      shot('hand', look([-.2, 16.8, 20], [-.2, 17.6, 8], 64), 30)]}); };
// ---- 4. rooms ----
const roomSpec = loc => ({slug: 'fearbell1g', fps: F, format: 6, labels: false, world: 'parts/city/rooms.js', location: loc, look4: 'cityDay2', rig: 'r6', acting: 6,
  note: `Phase 1G gate: interior ${loc} (city look B), both keyArt anchors.`, cast: loc === 'cityClassroom'
    ? {teach: {...who('ADULT_F', 'TEACHER_FB', [-1, 0, -8.6], 0), faces: [[0, 'smile']]}, hero: who('HERO', null, [-3.4, 0, 6.0], 160, {faces: [[0, 'hero_grin']]}), lulu: who('LITTLE', 'LULU', [-10.6, 0, 1.0], 120)}
    : {dad: who('ELDER', 'DAD_FB', [-1.9, 0, -2.6], 10, {faces: [[0, 'smile']]}), lulu: who('LITTLE', 'LULU', [1.9, 0, 5.6], 200), hero: who('HERO', null, [3.6, 0, -4.4], 230, {faces: [[0, 'hero_grin']]})},
  props: loc === 'cityDining' ? [{id: 'spag', set: 'props1g', prop: 'spaghetti', pos: [[0, [-1.2, 2.72, 1.0]]]}, {id: 'plate', set: 'props1g', prop: 'plate', pos: [[0, [1.6, 2.72, 2.4]]]}, {id: 'burger', set: 'props1g', prop: 'burger', pos: [[0, [1.6, 2.86, 2.4]]], scale: .8}] : [],
  shots: Object.entries(JSON.parse(readFileSync(`parts/locations/${loc}.json`, 'utf8')).anchors).filter(([, a]) => a.keyArt).map(([n, a]) => shot(n, a.camera, 4))});
// ---- 5. dome clip: roll over the plaza (0–1.9 s, wide), then the shrink to the palm puff (2.0–4.0 s, on the hero) ----
const HERO_D = G(-6, 16), PALM = [HERO_D[0] - .6, HERO_D[1] + 3.3, HERO_D[2] + 1.3];
const domeSpec = (extras = 0) => base({note: 'Phase 1G gate: the GIANT DARK DOME rolls over the plaza, then the SHRINK sequence (whoosh collapse → 2 quick steps → palm-sized puff + cute blink).',
  cast: {hero: who('HERO', null, HERO_D, 15, {faces: [[0, 'hero_shock'], [3.3, 'hero_grin']], keys: [[0, 'idle'], [.9, 'recoil'], [2.6, 'idle'], [3.0, 'point']]}), ...Object.fromEntries(LINE.slice(0, extras).map(([s, c], i) => [('x' + i), who(s, c, G(-22 + i * 4.2, 22 - (i % 3) * 2.5), 150 - i * 6, {faces: [[0, s === 'GOVERNOR' ? 'gov_panic' : s === 'HERO' ? 'hero_shock' : 'terrified']]})]))},
  creatures: [{id: 'dome', kind: 'dome', pos: G(0, -30), faceYaw: 0, acts: [{act: 'roll', at: .1, dur: 1.8, from: G(0, -70), to: G(2, -12)}, {act: 'shrink', at: 2.05, to: PALM}]}],
  shots: [shot('roll', look([-12, 15.8, 46], [0, 25, -12], 66), 48), shot('shrink', look([-2.0, 18.6, 31], [-5.6, 19.6, 15.2], 50), 48)]});
// ---- 6. fx clip: cartoon pops at the bus stop + the ghost spawn ----
const fxSpec = () => { const p = (d, s, y = 1.4) => [BUS[0] + s, BUS[1] + y, BUS[2] - d];
  return base({note: 'Phase 1G gate: cartoon POP puffs (3–4 frame pop, ink outline) at the bus stop + the ghost spawn (pop + boo).',
    cast: {lady: who('ADULT_F', 'BUSLADY', G(BUS[0] - 1.6, BUS[2] - .9), -160, {faces: [[0, 'smile'], [1.55, 'gasp']]}), kev: who('SECOND', 'KEVIN', G(BUS[0] - 3.3, BUS[2] - 1.6), -150, {faces: [[0, 'smile'], [1.6, 'terrified']]})},
    props: [{id: 'b1', set: 'props1g', prop: 'burger', pos: [[0, p(3.2, -2.2, .6)]], scale: 1.6}, {id: 'b2', set: 'props1g', prop: 'plush', pos: [[0, p(2.6, .4, 0)]], rot: [[0, [0, 180, 0]]]}, {id: 'b3', set: 'props1g', prop: 'donut', pos: [[0, p(3.6, 2.4, .9)]], rot: [[0, [70, 0, 0]]], scale: 1.6}],
    clock: [{at: .25, fx: 'pop', pos: p(3.2, -2.2, 1.0), scale: 1.2, show: 'prop_b1'}, {at: .7, fx: 'pop', pos: p(2.6, .4, .9), scale: 1.1, show: 'prop_b2'}, {at: 1.1, fx: 'pop', pos: p(3.6, 2.4, 1.2), scale: 1.1, show: 'prop_b3'}, {at: 1.45, fx: 'pop', pos: [BUS[0] + 6.2, BUS[1] + 5.5, BUS[2] + .6], scale: 3.4}],
    creatures: [{id: 'ghost', kind: 'ghost', pos: G(BUS[0] + 6.2, BUS[2] + .6), yaw: 150, acts: [{act: 'spawn', at: 1.5}, {act: 'boo', at: 2.0}]}],
    shots: [shot('fx', CAM_BUS, 72)]}); };
const SPECS = {react: reactSpec(), cast: castSpec(), props: propsSpec(), classroom: roomSpec('cityClassroom'), dining: roomSpec('cityDining'), dome: domeSpec(0), fx: fxSpec(),
  bench: (s => ({...s, note: 'Phase 1G bench: plazaWide key art + the dome over the plaza + 10 extras.', creatures: [{id: 'dome', kind: 'dome', pos: G(4, -20), acts: []}],
    shots: [(k => shot('bench', look(k.position, k.target, k.fov), 4))(keyArt('plazaWide'))]}))(domeSpec(10))};
mkdirSync('engine/fixtures/fearbell', {recursive: true});
for (const [k, s] of Object.entries(SPECS)) writeFileSync(`engine/fixtures/fearbell/gate1g-${k}.json`, JSON.stringify(s, null, 1) + '\n');
if (argv.includes('--specs-only')) { console.log('specs', Object.keys(SPECS).join(' ')); process.exit(0); }

const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
for (const d of ['stage', 'react', 'cast', 'props', 'rooms', 'dome', 'fx']) mkdirSync(`${OUT}/${d}`, {recursive: true}); mkdirSync(REV, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch();
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const M = existsSync(`${REV}/1G-measures.json`) ? JSON.parse(readFileSync(`${REV}/1G-measures.json`, 'utf8')) : {};
async function openPage(name) {
  const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.error('console', m.text().slice(0, 300)); });
  await p.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(`engine/fixtures/fearbell/gate1g-${name}.json`)}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 900000}); return p;
}
const frame = (p, n, w, h) => p.evaluate(([n, w, h]) => { const E = window.__episode, st = E.renderFrame(n, w, h); return {url: E.debug.renderer.domElement.toDataURL('image/png'), st}; }, [n, w, h]);
const PH = [390, 693];
async function bench(p, n, rows = 5) { const tm = []; let st = null; for (let i = 0; i < rows; i++) { const r = await p.evaluate(([n]) => window.__episode.renderFrame(n, 720, 1280), [n]); tm.push(r.ms); st = r; }
  const s = +(median(tm) / 1000).toFixed(3); return {tris: st.triangles, calls: st.calls, sPerFrame: s, pass: st.triangles <= 90000 && s <= .62}; }
const clip = async (name, N, mp4) => { const p = await openPage(name); mkdirSync(`${OUT}/${name}/frames`, {recursive: true});
  for (let n = 0; n < N; n++) { const r = await frame(p, n, 270, 480); save(`${OUT}/${name}/frames/f${String(n).padStart(3, '0')}.png`, r.url); }
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(F), '-i', `${OUT}/${name}/frames/f%03d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', String(N / F), mp4]); return p; };
try {
  if (ONLY.includes('stage')) {
    const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); await p.goto(`${server.url}/engine/stage1g.html`); await p.waitForFunction(() => window.__s1g, null, {timeout: 120000});
    const ACT = {ghost: [{act: 'boo', at: 0}, .9], trex: [{act: 'roar', at: 0}, .8], rat: [{act: 'shrink', at: 0}, 1.0], spider: [{act: 'wave', at: 0}, .9], vacuum: [{act: 'lunge', at: 0}, .3], shadowPuff: [null, 2.0], dome: [{act: 'shrink', at: 0}, .55], pillar: [{act: 'rise', at: 0}, 1.2]};
    M.creatures = {}; for (const [kind, [a, t]] of Object.entries(ACT)) { const tr = await p.evaluate(o => window.__s1g.show(o), {creature: kind}); const rest = kind === 'pillar' ? {acts: [{act: 'rise', at: 0}], t: 2} : {t: 1.0};
      for (const [v, yaw] of [['front', 0], ['3q', 40], ['side', 90]]) save(`${OUT}/stage/${kind}-${v}.png`, await p.evaluate(o => window.__s1g.render(o), {yaw, w: 360, h: 360, ...rest}));
      save(`${OUT}/stage/${kind}-act.png`, await p.evaluate(o => window.__s1g.render(o), {yaw: 25, w: 360, h: 360, acts: a ? [a] : [], t}));
      M.creatures[kind] = {tris: tr, pass: tr <= 8000}; }
    M.props = {}; for (const [n, sh, ro] of [['burger', {prop: 'burger'}, {}], ['slider', {prop: 'burger'}, {u: 1, restFrame: true}], ['plate', {prop: 'plate'}, {}], ['spaghetti', {prop: 'spaghetti'}, {}], ['plush', {prop: 'plush'}, {}],
      ['flashlight', {prop: 'flashlight', p: {length: 6}}, {yaw: 70}], ['mailBurst', {prop: 'mailBurst'}, {u: .45, pad: 1.0}], ['bellRope', {prop: 'bellRope', p: {length: 6}}, {}], ['donut', {prop: 'donut'}, {elev: 40}], ['busStop', {kit: 'busStop'}, {yaw: 20}], ['dinerCounter', {kit: 'dinerCounter'}, {yaw: 25, elev: 18}]]) {
      M.props[n] = {tris: await p.evaluate(o => window.__s1g.show(o), sh)}; save(`${OUT}/stage/prop-${n}.png`, await p.evaluate(o => window.__s1g.render(o), {yaw: 30, w: 300, h: 300, ...ro})); }
    await p.goto(`${server.url}/engine/governor.html`); await p.waitForFunction(() => window.__gov, null, {timeout: 120000});   // A fix: the megaphone on his mouth
    save(`${OUT}/stage/governor-announce.png`, await p.evaluate(() => window.__gov.render({act: 'announce', t: .8, yaw: 35, face: 'gov_announce', w: 540, h: 960})));
    M.governor = await p.evaluate(() => { const a = window.__gov.actor, T = window.__gov.T; window.__gov.render({act: 'announce', t: .8, w: 32, h: 32}); a.root.updateMatrixWorld(true); const mp = a.tool.children.find(c => c.geometry?.parameters?.height === .22);
      const m = a.pivots.head.localToWorld(new T.Vector3(0, .45, .64)), q = mp.localToWorld(new T.Vector3(0, .11, 0)); return {mouthGap: +m.distanceTo(q).toFixed(3), aim: +a.tool.userData.aimMouth(a).toFixed(3)}; });
    M.governor.pass = M.governor.mouthGap <= .15;
    await p.close(); console.log('stage', JSON.stringify(M.creatures), JSON.stringify(M.props), JSON.stringify(M.governor));
  }
  if (ONLY.includes('react')) {
    const p = await openPage('react'); M.react = {};
    for (const [i, r] of REACT.entries()) { const n = Math.round(T0(i) * F + r.peak * F), x = await frame(p, n, ...PH); save(`${OUT}/react/${r.id}.png`, x.url);
      if (r.peak2) save(`${OUT}/react/${r.id}-2.png`, (await frame(p, Math.round(T0(i) * F + r.peak2 * F), ...PH)).url); M.react[r.id] = {frame: n, tris: x.st.triangles}; }
    await p.close(); console.log('react', JSON.stringify(M.react));
  }
  if (ONLY.includes('cast')) { const p = await openPage('cast'), sh = await p.evaluate(() => window.__episode.shots.map(s => ({id: s.id, start: s.start})));
    for (const s of sh) save(`${OUT}/cast/${s.id}.png`, (await frame(p, s.start + 2, ...PH)).url); await p.close(); }
  if (ONLY.includes('props')) { const p = await openPage('props'), sh = await p.evaluate(() => window.__episode.shots.map(s => ({id: s.id, start: s.start})));
    for (const s of sh) save(`${OUT}/props/${s.id}.png`, (await frame(p, s.start + (s.id === 'hand' ? 10 : 2), ...PH)).url); await p.close(); }
  if (ONLY.includes('rooms')) { M.rooms = {}; for (const r of ['classroom', 'dining']) { const p = await openPage(r), sh = await p.evaluate(() => window.__episode.shots.map(s => ({id: s.id, start: s.start})));
    for (const s of sh) { const x = await frame(p, s.start + 2, ...PH); save(`${OUT}/rooms/${r}-${s.id}.png`, x.url); M.rooms[`${r}:${s.id}`] = {tris: x.st.triangles}; }
    M.rooms[r + ':bench'] = await bench(p, sh[0].start + 2, 3); await p.close(); } console.log('rooms', JSON.stringify(M.rooms)); }
  if (ONLY.includes('dome')) { const p = await clip('dome', 96, `${REV}/1G-dome.mp4`);
    M.dome = await p.evaluate(() => { const E = window.__episode, d = E.creatures.items.dome, r = []; for (const t of [0, 1, 2.0, 2.4, 2.8, 3.1, 3.6, 3.95]) { E.renderFrame(Math.round(t * 24), 64, 64); const b = E.creatures.liveAt('dome', t); r.push({t, size: b.size.map(v => +v.toFixed(2))}); } return r; });
    await p.close(); console.log('dome', JSON.stringify(M.dome)); }
  if (ONLY.includes('fx')) { const p = await clip('fx', 72, `${REV}/1G-fx.mp4`); M.fx = {events: await p.evaluate(() => window.__episode.clock.events.map(e => ({fx: e.fx, t: e.t, style: e.style ?? 'cartoon'})))}; await p.close(); }
  if (ONLY.includes('bench')) { const p = await openPage('bench'); M.bench = {plazaWide: await bench(p, 2, 5), extras: 10, dome: true}; await p.close(); console.log('bench', JSON.stringify(M.bench)); }
  M.pass = {creatures: M.creatures ? Object.values(M.creatures).every(c => c.pass) : null, bench: M.bench?.plazaWide?.pass ?? null};
  writeFileSync(`${REV}/1G-measures.json`, JSON.stringify(M, null, 1) + '\n'); console.log('PASS', JSON.stringify(M.pass));
} finally { await browser.close(); server.close?.(); }
