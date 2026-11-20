// campaigns/tapcap/scripts/final-render.js — EP01 final frames (Pass E): 1080×1920, 24 fps, final look (same page, post chain and per-shot grade as the approved passes).
//   node campaigns/tapcap/scripts/final-render.js --from 0 --to 149 --out shard   → <out>/frame-00000.png …   (global frame numbers, inclusive)
//   node campaigns/tapcap/scripts/final-render.js --plan N                          → prints the shard matrix JSON for N contiguous shards
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {startServer} from '../../../scripts/v2/server.js';
import {launch} from '../../../scripts/v2/browser.js';
import {shots as mkShots, sampleCam, FPS, END} from '../previz/blocking.js';
const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const slug = 'tapcap-ep01-rarity', cues = JSON.parse(readFileSync(`stories/${slug}/cues.json`, 'utf8')), {shots} = mkShots(cues), TOTAL = Math.round(END * FPS);
if (argv.includes('--plan')) { const n = +arg('--plan'), per = Math.ceil(TOTAL / n); console.log(JSON.stringify({include: Array.from({length: n}, (_, i) => ({index: i, name: String(i).padStart(2, '0'), from: i * per, to: Math.min(TOTAL - 1, (i + 1) * per - 1)})).filter(m => m.from < TOTAL)})); process.exit(0); }
const from = +arg('--from', 0), to = +arg('--to', TOTAL - 1), out = arg('--out', 'shard') + '/frames', W = 1080, H = 1920; mkdirSync(out, {recursive: true});
const GRADE = JSON.parse(readFileSync('campaigns/tapcap/previz/grade.json', 'utf8'));
const camsFor = s => [0, .5, 1].map(u => ({id: s.id, ...sampleCam(s, u), wide: s.wide})).filter(c => c.pos), allCams = shots.flatMap(camsFor);
const shotOf = f => shots.find(s => f >= s.f0 && f < s.f0 + s.frames);
const server = await startServer(), browser = await launch(); let done = 0; const t0 = Date.now();
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/campaigns/tapcap/previz/previz.html`); await page.waitForFunction(() => window.__ready || false, null, {timeout: 120000});
  const call = async (fn, o) => { const r = await page.evaluate(([f, a]) => window.__p[f](a), [fn, o]); if (errs.length) throw Error(errs.join('; ')); return r; };
  let mood = null;
  for (let f = from; f <= to; f++) {
    const s = shotOf(f); if (!s) throw Error('no shot for frame ' + f);
    if (s.mood !== mood) { mood = s.mood; await call('setup', {mood, cams: allCams, shots}); }
    const u = s.frames > 1 ? (f - s.f0) / (s.frames - 1) : 0, fr = await call('frame', {id: s.id, u, w: W, h: H, ev: GRADE[s.id] ?? 0});
    writeFileSync(`${out}/frame-${String(f).padStart(5, '0')}.png`, Buffer.from(fr.png.split(',')[1], 'base64')); done++;
    if (done % 10 === 0) console.log(`frame ${f} (${s.id}) ${done}/${to - from + 1}, ${((Date.now() - t0) / 1000 / done).toFixed(1)} s/frame`);
  }
} finally { await browser.close(); await server.close(); }
console.log(`shard done: ${done} frames ${from}–${to}`);
