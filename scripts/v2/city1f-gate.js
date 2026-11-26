// scripts/v2/city1f-gate.js — Phase 1F gate (look B = cityDay2 + outline classic; CC0 on the farm).
//   node scripts/v2/city1f-gate.js [--out renders/city1f] [--review review/city] [--only governor,clock,anchor,tod,bench] [--specs-only]
// governor: THE GOVERNOR posed on his balcony (announce, megaphone up) seen from the plaza (+ scripts/v2/governor-sheet.js cells)
// clock   : 3 s, 270 × 480, 24 fps: bell DONG + shockwave from the belfry + 3 POP-spawns across the plaza (spec `clock`) → 1F-clock.mp4
// anchor  : 3 consecutive shots from 3 different template cameras with spec `anchorLock` on the bell: zone hit per shot
// tod     : bayNorth in cityDay2 / cityGoldenHour / cityDusk / cityNight (phone 390 width) + crops: wildflowers (wildMeadow) + cliff rock (forestTrail, ropeBridge)
// bench   : 720 × 1280 tris + s/frame on the tod rows and the clock camera (PASS ≤ 90k, ≤ 0.62 s)
// Writes engine/fixtures/city/gate1f-*.json, <out>/…, <review>/1F-measures.json. Sheets: python3 scripts/v2/city1f-sheet.py.
import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PLAN, keyArt, landmarkSlots, groundY} from '../../parts/city/plan.js';
import {castFor} from './city1e-measure.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'renders/city1f'), REV = arg('review', 'review/city'), ONLY = arg('only', 'governor,clock,anchor,tod,bench').split(',');
const LOOKS = ['cityDay2', 'cityGoldenHour', 'cityDusk', 'cityNight'];
const hall = landmarkSlots().find(s => s.id === '2'), BAL = [hall.at[0], hall.base + 9.4, hall.at[1] + 17], BAL_DY = +(BAL[1] - groundY(BAL[0], BAL[2])).toFixed(3);
const base = (look, extra = {}) => ({slug: 'city1f', fps: 24, format: 6, labels: false, world: 'parts/city/world.js', look4: look, rig: 'r6', acting: 6, cityLiving: ['flagsHall', 'fountain', 'birds', 'gulls', 'blimp', 'boats', 'ferry'], ...extra});
const gov = (faces, extra = {}) => ({troupe: 'GOVERNOR', style: 'v5', faceStyle: 'v6', at: 'govBalcony', offset: [0, BAL_DY, 0], yaw: 0, keys: [[0, 'idle']], faces, ...extra});
const shot = (id, cam, frames, extra = {}) => ({id, size: 'wide', frames, move: 'static-drift', drift: 0, from: cam, shadowRadius: 30, ...extra});
// cameras: the balcony from the plaza (low, up at him), the clock wide (plaza → hall + bell tower)
const CAM_BAL = {position: [BAL[0] - 9, BAL[1] - 6.5, BAL[2] + 17], target: [BAL[0] + .3, BAL[1] + 2.9, BAL[2]], fov: 40};
const CAM_CLOCK = {position: [-4, 15.8, -6], target: [0, 30.5, -56], fov: 62}, AX = [.09, -.996], RT = [.996, .09];
const POPS = [[12, 0], [16, 3.4], [23, -2.8]].map(([d, l]) => { const x = +(CAM_CLOCK.position[0] + AX[0] * d + RT[0] * l).toFixed(2), z = +(CAM_CLOCK.position[2] + AX[1] * d + RT[1] * l).toFixed(2); return [x, groundY(x, z), z]; });
const SPECS = {
  balcony: base('cityDay2', {note: 'Phase 1F gate: THE GOVERNOR on his balcony, announce (megaphone up), from the plaza.', cast: {gov: gov([[0, 'gov_announce']])},
    shots: [shot('b0', CAM_BAL, 24, {actions: [{actor: 'gov', verb: 'announce', at: .1}]})]}),
  clock: base('cityDay2', {note: 'Phase 1F gate: rule-clock kit — bell DONG + shockwave + 3 POP-spawns across the plaza (3 s).', cast: {gov: gov([[0, 'gov_smug'], [.3, 'gov_announce']])},
    props: [['hyperbox', .8], ['plush', .55], ['gummyBear', .9]].map(([prop, scale], i) => ({id: 'pop' + i, prop, seed: i + 1, scale, pos: [[0, POPS[i]]], rot: [[0, [0, -20 + 25 * i, 0]]]})),
    clock: [{at: .25, fx: 'dong'}, ...POPS.map((p, i) => ({at: 1.0 + .6 * i, fx: 'pop', pos: [p[0], p[1] + 1.2, p[2]], scale: 1.3, show: 'prop_pop' + i}))],
    shots: [shot('c0', CAM_CLOCK, 72, {actions: [{actor: 'gov', verb: 'rope_pull', at: .05}]})]}),
  anchor: base('cityDay2', {note: 'Phase 1F gate: anchor lock — the bell held in one screen zone across 3 consecutive shots from 3 key-art cameras.', cast: {},
    anchorLock: {object: 'bellPivot', zone: [.56, .08, .76, .22]},
    shots: ['plazaWide', 'hallBalcony', 'stairBottom'].map((n, i) => { const k = keyArt(n); return shot('a' + i, {position: k.position, target: k.target, fov: k.fov}, 6); })}),
  ...Object.fromEntries(LOOKS.map(L => ['tod-' + L, base(L, {note: `Phase 1F gate: time of day ${L} (bayNorth + crops).`, cityKeyArt: ['bayNorth', 'forestTrail', 'ropeBridge'], cast: castFor(['bayNorth']).cast,
    shots: ['bayNorth', 'forestTrail', 'ropeBridge', 'campsite'].filter(n => PLAN.anchors[n]).map((n, i) => { const k = keyArt(n); return shot('t' + i, {position: k.position, target: k.target, fov: k.fov}, 6); })})])),
};
mkdirSync('engine/fixtures/city', {recursive: true});
for (const [k, s] of Object.entries(SPECS)) writeFileSync(`engine/fixtures/city/gate1f-${k}.json`, JSON.stringify(s, null, 1) + '\n');
if (argv.includes('--specs-only')) { console.log('specs', Object.keys(SPECS).join(' '), 'balcony dy', BAL_DY); process.exit(0); }

const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
for (const d of ['governor', 'clock', 'anchor', 'tod', 'bench', 'crops']) mkdirSync(`${OUT}/${d}`, {recursive: true}); mkdirSync(REV, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch();
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const M = existsSync(`${REV}/1F-measures.json`) ? JSON.parse((await import('node:fs')).readFileSync(`${REV}/1F-measures.json`, 'utf8')) : {};
async function openPage(name) {
  const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.error('console', m.text().slice(0, 300)); });
  await p.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(`engine/fixtures/city/gate1f-${name}.json`)}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 900000}); return p;
}
const frame = (p, n, w, h) => p.evaluate(([n, w, h]) => { const E = window.__episode, st = E.renderFrame(n, w, h); return {url: E.debug.renderer.domElement.toDataURL('image/png'), st}; }, [n, w, h]);
async function bench(p, n, rows = 5) { const tm = []; let st = null; for (let i = 0; i < rows; i++) { const r = await p.evaluate(([n]) => window.__episode.renderFrame(n, 720, 1280), [n]); tm.push(r.ms); st = r; }
  const s = +(median(tm) / 1000).toFixed(3); return {tris: st.triangles, calls: st.calls, sPerFrame: s, pass: st.triangles <= 90000 && s <= .62}; }
try {
  if (ONLY.includes('governor')) {
    execFileSync('node', ['scripts/v2/governor-sheet.js', '--out', `${OUT}/governor`], {stdio: 'inherit'});
    const p = await openPage('balcony'), r = await frame(p, 18, 720, 1280); save(`${OUT}/governor/balcony.png`, r.url);
    M.governor = {...JSON.parse((await import('node:fs')).readFileSync(`${OUT}/governor/governor.json`, 'utf8')), balconyDy: BAL_DY, balconyTris: r.st.triangles}; await p.close(); console.log('governor', JSON.stringify(M.governor));
  }
  if (ONLY.includes('clock')) {
    const p = await openPage('clock'), N = 72; mkdirSync(`${OUT}/clock/frames`, {recursive: true});
    const ev = await p.evaluate(() => window.__episode.clock.events.map(e => ({fx: e.fx, t: e.t})));
    for (let n = 0; n < N; n++) { const r = await frame(p, n, 270, 480); save(`${OUT}/clock/frames/f${String(n).padStart(3, '0')}.png`, r.url); }
    const probe = await p.evaluate(() => { const E = window.__episode, s = E.debug.scene, vis = t => { E.renderFrame(Math.round(t * 24), 270, 480); return {wave: s.getObjectByName('shockwaveFlat')?.visible, props: [0, 1, 2].map(i => s.getObjectByName('prop_pop' + i)?.visible)}; };
      return {t0: vis(.1), t05: vis(.5), t13: vis(1.3), t29: vis(2.9)}; });
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '24', '-i', `${OUT}/clock/frames/f%03d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', '3', `${REV}/1F-clock.mp4`]);
    M.clock = {events: ev, probe, bench: await bench(p, 12), pass: probe.t05.wave === true && probe.t0.props.every(v => !v) && probe.t29.props.every(Boolean)}; await p.close(); console.log('clock', JSON.stringify(M.clock));
  }
  if (ONLY.includes('anchor')) {
    const p = await openPage('anchor'), shots = await p.evaluate(() => window.__episode.shots.map(s => s.start));
    for (const [i, n] of shots.entries()) { const r = await frame(p, n + 2, 270, 480); save(`${OUT}/anchor/a${i}.png`, r.url); }
    M.anchor = await p.evaluate(() => ({zone: window.__episode.anchorLock.spec.zone, shots: window.__episode.anchorLock.log}));
    M.anchor.pass = Object.values(M.anchor.shots).every(s => s.inZone); await p.close(); console.log('anchor', JSON.stringify(M.anchor));
  }
  if (ONLY.includes('tod') || ONLY.includes('bench')) {
    M.tod = M.tod ?? {}; M.bench = M.bench ?? {};
    for (const L of LOOKS) {
      const p = await openPage('tod-' + L), shots = await p.evaluate(() => window.__episode.shots.map(s => ({id: s.id, start: s.start})));
      if (ONLY.includes('tod')) { const r = await frame(p, shots[0].start + 2, 390, 693); save(`${OUT}/tod/${L}.png`, r.url);
        const lum = await p.evaluate(() => { const c = window.__episode.debug.renderer.domElement, g = new OffscreenCanvas(c.width, c.height).getContext('2d'); g.drawImage(c, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; return s / (d.length / 4); });
        M.tod[L] = {meanLuma: +lum.toFixed(3)};
        if (L === 'cityDay2') for (const s of shots.slice(1)) { const r2 = await frame(p, s.start + 2, 540, 960); save(`${OUT}/crops/${s.id}.png`, r2.url); } }
      if (ONLY.includes('bench')) M.bench[L + ':bayNorth'] = await bench(p, shots[0].start + 2, 3);
      await p.close(); console.log('tod', L, JSON.stringify(M.tod[L]), JSON.stringify(M.bench[L + ':bayNorth'] ?? null));
    }
  }
  M.pass = {clock: M.clock?.pass ?? null, anchor: M.anchor?.pass ?? null, bench: Object.values(M.bench ?? {}).concat(M.clock?.bench ?? []).every(b => b.pass),
    nightDarker: M.tod?.cityNight ? M.tod.cityNight.meanLuma < M.tod.cityDay2.meanLuma * .6 : null};
  writeFileSync(`${REV}/1F-measures.json`, JSON.stringify(M, null, 1) + '\n'); console.log('PASS', JSON.stringify(M.pass));
} finally { await browser.close(); server.close?.(); }
