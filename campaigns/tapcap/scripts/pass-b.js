// campaigns/tapcap/scripts/pass-b.js — Pass B (revision) gate. Town built for the S1–S40 provisional cameras (shots.yml) + 8 stills.
// Writes <ep>/qa/world.json (committed) and <ep>/review/pass-b/{panels/, ids/, pass-b-sheet.png} (gitignored). Checks B1–B11.
import {writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from '../../../scripts/v2/server.js';
import {launch} from '../../../scripts/v2/browser.js';
import {moodForShot} from '../world/moods.js';

const ep = 'campaigns/tapcap/ep01-rarity', out = `${ep}/review/pass-b`, P = `${out}/panels`, I = `${out}/ids`; for (const d of [P, I]) mkdirSync(d, {recursive: true});
const shots = JSON.parse(execFileSync('python3', ['-c', `import yaml,json;print(json.dumps(yaml.safe_load(open('${ep}/shots.yml'))))`], {encoding: 'utf8'}));
const seed = JSON.parse(execFileSync('python3', ['-c', `import yaml,json;print(json.dumps(yaml.safe_load(open('${ep}/spec.yml'))['town']['seed']))`], {encoding: 'utf8'}));
const SH = shots.map(s => ({id: s.id, ...s.cam, mood: moodForShot(s.id)}));
const PT = [-24, 9.85, -16], TD = [.83205, .5547];
const STILLS = [
  {id: 'st1', label: 'Box street', mood: 'dawnHope', pos: [2.4, 2.7, 14.9], look: [-.3, 2.3, 6.1], mm: 24, feature: 'CORE ROW', wide: true, street: true},
  {id: 'st2', label: 'Core Row (cubby wall, hill window)', mood: 'dawnHope', pos: [3, .9, 4], look: [-5, 1.9, -6], mm: 24},
  {id: 'st3', label: 'Trade Corner · Market Street', mood: 'dawnHope', pos: [5.6, 1.6, 26.8], look: [14, 1.6, 22.4], mm: 24, feature: 'TRADES', wide: true, street: true},
  {id: 'hillWide', label: 'hill wide', mood: 'dawnHope', pos: [-9.5, 7.5, 13.5], look: [-24, 4.5, -16], mm: 28, wide: true, skyMax: .40, tilt: true},
  {id: 'st5', label: 'plinth close', mood: 'dawnHope', pos: [PT[0] + TD[0] * 3.4, PT[1] + 2, PT[2] + TD[1] * 3.4], look: [PT[0], PT[1] - .25, PT[2]], mm: 50, feature: '1 / 102', skyMax: .15, dof: true, skyEV: -.1},
  {id: 'rainHill', label: 'rain-night hill', mood: 'rainNight', pos: [PT[0] - TD[0] * 5.2 + TD[1] * 1.6, PT[1] + .9, PT[2] - TD[1] * 5.2 - TD[0] * 1.6], look: [PT[0] + TD[0] * 7, PT[1] - 2.6, PT[2] + TD[1] * 7], mm: 35, wide: true, plinth: true},
  {id: 'st7', label: 'S5 aerial town reveal', mood: 'dawnHope', ...SH.find(s => s.id === 'S5'), id: 'st7', tilt: true},
  {id: 'st8', label: 'golden S36 sky', mood: 'golden', ...SH.find(s => s.id === 'S36'), id: 'st8', golden: true},
  {id: 'st9', label: 'quiet night (S14 framing)', mood: 'quietNight', ...SH.find(s => s.id === 'S14'), id: 'st9'},
];
const WIDES = ['S1', 'S3', 'S5', 'S8', 'S22', 'S25', 'S33', 'S36', 'S40'], STREET = ['S1', 'S8', 'S25', 'S40'];
const allCams = [...SH, ...STILLS];
const server = await startServer(), browser = await launch(), R = {stills: [], void: [], ids: {}, setup: {}, timing: {}};
const save = (f, d) => writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${server.url}/campaigns/tapcap/world/world.html`); await page.waitForFunction(() => window.__ready, null, {timeout: 120000});
  const call = async (fn, o) => { const r = await page.evaluate(([f, a]) => window.__w[f](a), [fn, o]); if (errs.length) throw Error(errs.join('; ')); return r; };
  const idPass = async (cam, kind, w, h, name) => { const r = await call('ids', {cam, kind, w, h}); writeFileSync(`${I}/${name}.rgba`, Buffer.from(r.b64, 'base64')); return {w, h, horizonY: r.horizonY, ids: r.ids, file: `${name}.rgba`}; };
  for (const mood of ['dawnHope', 'quietNight', 'rainNight', 'golden']) {
    const t0 = Date.now(); const s36 = SH.find(s => s.id === 'S36'), tg = (44 - s36.pos[1]) / (s36.look[1] - s36.pos[1]);   // golden deck parts where S36 looks
    R.setup[mood] = await call('setup', {mood, cams: allCams, seed, cloudGap: [s36.pos[0] + (s36.look[0] - s36.pos[0]) * tg, s36.pos[2] + (s36.look[2] - s36.pos[2]) * tg], skyCam: s36, fillCam: STILLS.find(s => s.id === 'rainHill')}); R.timing['build_' + mood] = Date.now() - t0;
    for (const s of STILLS.filter(x => x.mood === mood)) { const r = await call('still', {cam: s, w: 540, h: 960, dof: !!s.dof, skyEV: s.skyEV ?? 0}); save(`${P}/${s.id}.png`, r.png);
      if (s.tilt) execFileSync('python3', ['campaigns/tapcap/scripts/tiltshift.py', `${P}/${s.id}.png`]);
      R.stills.push({id: s.id, label: s.label, mood, golden: !!s.golden, ms: r.ms, feature: s.feature ?? null, signs: r.signs.filter(x => x.inFrame), skyMax: s.skyMax ?? null, wide: !!s.wide, street: !!s.street});
      R.ids[s.id] = {layers: await idPass(s, 'layers', 270, 480, `${s.id}_layers`), ...(s.street || s.id === 'st7' ? {buildings: await idPass(s, 'buildings', 540, 960, `${s.id}_bld`)} : {}), ...(s.plinth ? {plinth: await idPass(s, 'plinth', 540, 960, `${s.id}_plinth`)} : {})}; }
    for (const s of SH.filter(x => x.mood === mood)) { const r = await call('raw', {cam: s, w: 160, h: 284}); save(`${I}/void_${s.id}.png`, r.png); R.void.push({id: s.id, mood, voidPx: r.voidPx, ms: r.ms});
      if (WIDES.includes(s.id)) R.ids[s.id] = {layers: await idPass(s, 'layers', 270, 480, `${s.id}_layers`), ...(STREET.includes(s.id) || s.id === 'S5' ? {buildings: await idPass(s, 'buildings', 540, 960, `${s.id}_bld`)} : {})}; }
  }
} finally { await browser.close(); await server.close(); }
R.stills.sort((a, b) => STILLS.findIndex(s => s.id === a.id) - STILLS.findIndex(s => s.id === b.id));
writeFileSync(`${out}/raw.json`, JSON.stringify({...R, WIDES, STREET}));
const M = JSON.parse(execFileSync('python3', ['campaigns/tapcap/scripts/measure-b.py', out], {encoding: 'utf8'}));
writeFileSync(`${ep}/qa/world.json`, JSON.stringify(M, null, 1) + '\n'); console.log(JSON.stringify(M.summary));
execFileSync('python3', ['campaigns/tapcap/scripts/sheet-b.py'], {stdio: 'inherit'});
