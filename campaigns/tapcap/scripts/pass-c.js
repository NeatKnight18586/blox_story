// campaigns/tapcap/scripts/pass-c.js — Pass C blocking previz + gate. Cuts = aligner word starts (previz/blocking.js).
//   1 episode.json (format 6, for tools/qa_episode.py) + v6 captions (#B98CFF) + previz mix (VO + synthesized clicks)
//   2 every shot: mid frame (post7 look) + void (first/mid/last) + luma; wides: layers; street wides: building ids; S1/S40: hill+plinth;
//     S1 frame 0 / 1.0 s: Slime Guy cover (TC-01); quiet night: bright patch in the bottom 20 %
//   3 three 1080×1920 final-look frames timed (render plan)   4 measure-c.py → qa/passc.json; sheet-c.py → two sheets
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from '../../../scripts/v2/server.js';
import {launch} from '../../../scripts/v2/browser.js';
import {shots as mkShots, sampleCam, camTravel, FPS, END} from '../previz/blocking.js';

const ep = 'campaigns/tapcap/ep01-rarity', slug = 'tapcap-ep01-rarity', out = `${ep}/review/pass-c`, P = `${out}/panels`, I = `${out}/ids`;
for (const d of [P, I]) mkdirSync(d, {recursive: true});
const cues = JSON.parse(readFileSync(`stories/${slug}/build/cues.json`, 'utf8')), {shots, taps, clicks} = mkShots(cues);
const WIDES = ['S1', 'S3', 'S5', 'S8', 'S25', 'S33', 'S36a', 'S40', 'S22'], STREET = ['S1', 'S8', 'S25', 'S40'];
// 1a — engine-format episode for the retention linter (shots at aligner cuts; moves; hero shots; sfx on; v6 captions)
const epj = {slug, format: 6, fps: FPS, end: END, sfx: 'on', labels: false, captionStyle: 'pop-shorts-v6', accent: '#B98CFF',
  signs: [{text: '1 / 102'}, {text: 'TOP SHELF'}, {text: 'CORE ROW'}, {text: 'TRADES'}],
  shots: shots.map(s => ({id: s.id, at: +s.start.toFixed(4), move: s.move, size: s.size, ...(s.hero ? {hero: s.hero} : {}), ...(s.id === 'S1' ? {openHit: true, jolt: true} : {}), ...(s.id === 'S40' ? {loop: 'S1'} : {})}))};
writeFileSync(`stories/${slug}/episode.json`, JSON.stringify(epj, null, 1) + '\n');
execFileSync('python3', ['scripts/v2/captions.py', '--story', slug, '--cues', `stories/${slug}/build/cues.json`, '--spec', `stories/${slug}/episode.json`, '--style', 'pop-shorts-v6', '--accent', '#B98CFF', '--out', `${out}/captions.ass`], {stdio: 'inherit'});
execFileSync('python3', ['campaigns/tapcap/scripts/mix-c.py', `${ep}/vo/vo.wav`, `${out}/previz-mix.wav`, ...clicks.map(String)], {stdio: 'inherit'});
// 2 — render
const camsFor = s => [0, .5, 1].map(u => ({id: s.id, ...sampleCam(s, u), wide: s.wide})).filter(c => c.pos);
const allCams = shots.flatMap(camsFor), R = {shots: [], timing: {}, taps, clicks, WIDES, STREET};
const server = await startServer(), browser = await launch();
const dump = (name, r) => { writeFileSync(`${I}/${name}.rgba`, Buffer.from(r.b64, 'base64')); return {file: `${name}.rgba`, w: r.w, h: r.h, horizonY: r.horizonY, ids: r.ids}; };
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/campaigns/tapcap/previz/previz.html`); await page.waitForFunction(() => window.__ready || false, null, {timeout: 120000});
  const call = async (fn, o) => { const r = await page.evaluate(([f, a]) => window.__p[f](a), [fn, o]); if (errs.length) throw Error(errs.join('; ')); return r; };
  for (const mood of ['dawnHope', 'quietNight', 'rainNight', 'golden']) {
    const t0 = Date.now(); await call('setup', {mood, cams: allCams, shots}); R.timing['build_' + mood] = Date.now() - t0;
    for (const s of shots.filter(x => x.mood === mood)) {
      const fr = await call('frame', {id: s.id, u: .5, w: 288, h: 512}); writeFileSync(`${P}/${s.id}.png`, Buffer.from(fr.png.split(',')[1], 'base64'));
      const e = {id: s.id, num: s.num, mood, start: s.start, frames: s.frames, move: s.move, size: s.size, ms: fr.ms, travel: s.cam.clixHead ? {move: 3, turnDeg: 0, zoom: 1} : camTravel(s), ids: {}};
      for (const u of [0, .5, 1]) e.ids['void' + u] = dump(`${s.id}_void${u}`, await call('ids', {id: s.id, u, w: 160, h: 284, kind: 'void'}));
      if (WIDES.includes(s.id)) e.ids.layers = dump(`${s.id}_layers`, await call('ids', {id: s.id, u: .5, w: 270, h: 480, kind: 'layers'}));
      if (STREET.includes(s.id)) e.ids.buildings = dump(`${s.id}_bld`, await call('ids', {id: s.id, u: .5, w: 540, h: 960, kind: 'buildings'}));
      if (['S1', 'S40'].includes(s.id)) e.ids.hill = dump(`${s.id}_hill`, await call('ids', {id: s.id, u: 1, w: 270, h: 480, kind: 'hill'}));
      if (s.id === 'S1') { e.ids.slime0 = dump('S1_slime0', await call('ids', {id: s.id, u: 0, w: 270, h: 480, kind: 'slime'}));
        e.ids.slime1s = dump('S1_slime1s', await call('ids', {id: s.id, u: Math.min(1, FPS / (s.frames - 1)), w: 270, h: 480, kind: 'slime'})); }
      R.shots.push(e);
    }
    // 3 — render plan timing: one final-look 1080×1920 frame per representative mood
    const rep = {dawnHope: 'S1', rainNight: 'S26', golden: 'S36a'}[mood];
    if (rep) { const r = await call('frame', {id: rep, u: .5, w: 1080, h: 1920}); writeFileSync(`${out}/final-${rep}.png`, Buffer.from(r.png.split(',')[1], 'base64')); R.timing['final1080_' + rep] = r.ms; }
  }
} finally { await browser.close(); await server.close(); }
R.shots.sort((a, b) => a.start - b.start);
// TC-06 (S40 replays S1: last-frame camera transforms) and TC-05 (press bottoms vs click onsets)
const s1 = shots.find(s => s.id === 'S1'), s40 = shots.find(s => s.id === 'S40'), c1 = sampleCam(s1, 1), c40 = sampleCam(s40, 1);
R.tc06 = {s1Last: c1, s40Last: c40, diff: Math.max(...c1.pos.map((v, i) => Math.abs(v - c40.pos[i])), ...c1.look.map((v, i) => Math.abs(v - c40.look[i])), Math.abs(c1.mm - c40.mm))};
R.tc05 = taps.map(t => ({onset: t.onset, onsetFrame: Math.round(t.onset * FPS), pressBottomFrame: t.start + 3, err: t.start + 3 - Math.round(t.onset * FPS)}));
writeFileSync(`${out}/raw.json`, JSON.stringify(R));
execFileSync('python3', ['campaigns/tapcap/scripts/measure-c.py', out, ep, slug], {stdio: 'inherit'});
execFileSync('python3', ['campaigns/tapcap/scripts/sheet-c.py', out, ep], {stdio: 'inherit'});
