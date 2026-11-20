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
const MIN_PNG = +(process.env.MIN_PNG ?? 200000);   /* a real 1080×1920 frame is ≥ ~0.9 MB as PNG; an all-black canvas is ~6 KB (farm runs produced black canvases intermittently) */
const server = await startServer(); let lastMem = null, browser = null, page = null, errs = [], mood = null, done = 0, retries = 0; const t0 = Date.now();
const open = async () => {
  if (browser) { try { await browser.close(); } catch {} }
  browser = await launch(); page = await browser.newPage(); errs = []; mood = null;
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type()) && /lost|context|webgl/i.test(m.text())) console.log('page ' + m.type() + ': ' + m.text().slice(0, 160)); });
  await page.goto(`${server.url}/campaigns/tapcap/previz/previz.html`); await page.waitForFunction(() => window.__ready || false, null, {timeout: 120000});
};
const call = async (fn, o) => { const r = await page.evaluate(([f, a]) => window.__p[f](a), [fn, o]); if (errs.length) throw Error(errs.join('; ')); return r; };
const grab = async (s, f) => {
  const u = s.frames > 1 ? (f - s.f0) / (s.frames - 1) : 0;
  if (s.mood !== mood) { await call('setup', {mood: s.mood, cams: allCams, shots}); mood = s.mood; }
  const r = await call('frame', {id: s.id, u, w: W, h: H, ev: GRADE[s.id] ?? 0}); lastMem = r.mem; return Buffer.from(r.png.split(',')[1], 'base64');
};
try {
  await open();
  for (let f = from; f <= to; f++) {
    const s = shotOf(f); if (!s) throw Error('no shot for frame ' + f); let buf = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try { buf = await grab(s, f); if (buf.length >= MIN_PNG) break; console.log(`frame ${f} (${s.id}) attempt ${attempt + 1}: ${buf.length} bytes, treated as black`); } catch (e) { console.log(`frame ${f} (${s.id}) attempt ${attempt + 1}: ${String(e.message).slice(0, 160)}`); buf = null; }
      retries++;
      if (attempt >= 1) await open();                                  /* second retry on: fresh browser + page + world */
      else { mood = null; await new Promise(r => setTimeout(r, 1500)); }   /* first retry: rebuild the world on the same page */
    }
    if (!buf || buf.length < MIN_PNG) throw Error(`frame ${f}: still black after 5 attempts`);
    writeFileSync(`${out}/frame-${String(f).padStart(5, '0')}.png`, buf); done++;
    if (done % 10 === 0) console.log(`frame ${f} (${s.id}) ${done}/${to - from + 1}, ${((Date.now() - t0) / 1000 / done).toFixed(1)} s/frame, retries so far ${retries}, gpu textures ${lastMem?.tex}`);
  }
} finally { try { await browser?.close(); } catch {} await server.close(); }
console.log(`shard done: ${done} frames ${from}–${to}, ${retries} retries`);
