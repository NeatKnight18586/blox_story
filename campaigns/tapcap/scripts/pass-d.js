// campaigns/tapcap/scripts/pass-d.js — Pass D sequence re-render: only the listed shots (same page, passes and checks as Pass C).
//   node campaigns/tapcap/scripts/pass-d.js --seq D1 --shots S1,S2,…  → <ep>/review/pass-d/<seq>/ + <ep>/qa/pass-<seq>.json + sheet
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from '../../../scripts/v2/server.js';
import {launch} from '../../../scripts/v2/browser.js';
import {shots as mkShots, sampleCam, camTravel, FPS} from '../previz/blocking.js';
const argv = process.argv.slice(2), arg = k => argv[argv.indexOf(k) + 1], SEQ = arg('--seq'), ONLY = arg('--shots').split(',');
const ep = 'campaigns/tapcap/ep01-rarity', slug = 'tapcap-ep01-rarity', out = `${ep}/review/pass-d/${SEQ}`, P = `${out}/panels`, I = `${out}/ids`;
for (const d of [P, I]) mkdirSync(d, {recursive: true});
const cues = JSON.parse(readFileSync(`stories/${slug}/build/cues.json`, 'utf8')), {shots} = mkShots(cues);
const WIDES = ['S1', 'S3', 'S5', 'S8', 'S25', 'S33', 'S36a', 'S40', 'S22'], STREET = ['S1', 'S8', 'S25', 'S40'];
execFileSync('python3', ['scripts/v2/captions.py', '--story', slug, '--cues', `stories/${slug}/build/cues.json`, '--spec', `stories/${slug}/episode.json`, '--style', 'pop-shorts-v6', '--accent', '#B98CFF', '--out', `${out}/captions.ass`], {stdio: 'inherit'});
// 2 — render
const camsFor = s => [0, .5, 1].map(u => ({id: s.id, ...sampleCam(s, u), wide: s.wide})).filter(c => c.pos);
const GRADE = (() => { try { return JSON.parse(readFileSync('campaigns/tapcap/previz/grade.json', 'utf8')); } catch { return {}; } })();
const allCams = shots.flatMap(camsFor), R = {shots: [], timing: {}, WIDES: WIDES.filter(x => ONLY.includes(x)), STREET: STREET.filter(x => ONLY.includes(x))};
const server = await startServer(), browser = await launch();
const dump = (name, r) => { writeFileSync(`${I}/${name}.rgba`, Buffer.from(r.b64, 'base64')); return {file: `${name}.rgba`, w: r.w, h: r.h, horizonY: r.horizonY, ids: r.ids}; };
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/campaigns/tapcap/previz/previz.html`); await page.waitForFunction(() => window.__ready || false, null, {timeout: 120000});
  const call = async (fn, o) => { const r = await page.evaluate(([f, a]) => window.__p[f](a), [fn, o]); if (errs.length) throw Error(errs.join('; ')); return r; };
  for (const mood of ['dawnHope', 'quietNight', 'rainNight', 'golden'].filter(m => shots.some(s => s.mood === m && ONLY.includes(s.id)))) {
    const t0 = Date.now(); await call('setup', {mood, cams: allCams, shots}); R.timing['build_' + mood] = Date.now() - t0;
    for (const s of shots.filter(x => x.mood === mood && ONLY.includes(x.id))) {
      const fr = await call('frame', {id: s.id, u: .5, w: 288, h: 512, ev: GRADE[s.id] ?? 0}); writeFileSync(`${P}/${s.id}.png`, Buffer.from(fr.png.split(',')[1], 'base64'));
      const e = {id: s.id, num: s.num, mood, start: s.start, frames: s.frames, move: s.move, size: s.size, ms: fr.ms, travel: s.cam.clixHead ? {move: 3, turnDeg: 0, zoom: 1} : camTravel(s), ids: {}};
      for (const u of [0, .5, 1]) e.ids['void' + u] = dump(`${s.id}_void${u}`, await call('ids', {id: s.id, u, w: 160, h: 284, kind: 'void'}));
      if (WIDES.includes(s.id)) e.ids.layers = dump(`${s.id}_layers`, await call('ids', {id: s.id, u: .5, w: 270, h: 480, kind: 'layers'}));
      if (STREET.includes(s.id)) e.ids.buildings = dump(`${s.id}_bld`, await call('ids', {id: s.id, u: .5, w: 540, h: 960, kind: 'buildings'}));
      if (['S1', 'S40'].includes(s.id)) e.ids.hill = dump(`${s.id}_hill`, await call('ids', {id: s.id, u: 1, w: 270, h: 480, kind: 'hill'}));
      if (s.id === 'S1') { e.ids.slime0 = dump('S1_slime0', await call('ids', {id: s.id, u: 0, w: 270, h: 480, kind: 'slime'}));
        e.ids.slime1s = dump('S1_slime1s', await call('ids', {id: s.id, u: Math.min(1, FPS / (s.frames - 1)), w: 270, h: 480, kind: 'slime'})); }
      R.shots.push(e);
    }
  }
} finally { await browser.close(); await server.close(); }
const prev = (() => { try { return JSON.parse(readFileSync(`${out}/raw.json`, 'utf8')); } catch { return null; } })();   /* re-render only changed shots: keep the others */
if (prev && argv.includes('--merge')) { for (const p of prev.shots) if (!R.shots.some(s => s.id === p.id)) R.shots.push(p); R.WIDES = [...new Set([...prev.WIDES, ...R.WIDES])]; R.STREET = [...new Set([...prev.STREET, ...R.STREET])]; }
R.shots.sort((a, b) => a.start - b.start);
writeFileSync(`${out}/raw.json`, JSON.stringify(R));
execFileSync('python3', ['campaigns/tapcap/scripts/measure-d.py', out, ep, SEQ], {stdio: 'inherit'});
execFileSync('python3', ['campaigns/tapcap/scripts/sheet-c.py', out, ep, `${ep}/qa/pass-${SEQ}.json`, `${SEQ}:${R.shots.map(s => s.id).join(',')}`], {stdio: 'inherit'});
