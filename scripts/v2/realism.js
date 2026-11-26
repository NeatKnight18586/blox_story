// scripts/v2/realism.js — Phase R spike measure: for each location (street-procedural, street-cc0) renders the 3 test shots,
// s/frame at 1080×1920 and native 1440×2560 (AA, 4 timed frames per shot after a warm-up; budget 0.69), texture memory,
// Laplacian detail bg/actor (≥ 3) and subject/background local contrast (≥ 0.35), and saves 1080 stills for the A/B sheet.
//   node scripts/v2/realism.js [--out review/realism] [--locs street-procedural,street-cc0] [--n 4]
import {writeFileSync, mkdirSync} from 'node:fs';
import {launch} from './browser.js';
import {startServer} from './server.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', 'review/realism'), LOCS = arg('--locs', 'street-procedural,street-cc0').split(','), N = +arg('--n', 4), STILLS = arg('--stills', 'renders/realism'), EXTRA = arg('--q', '');
mkdirSync(OUT, {recursive: true}); mkdirSync(STILLS, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch(), report = {budget: .69, locations: {}};
try {
  for (const loc of LOCS) {
    const page = await browser.newPage({viewport: {width: 360, height: 640}}), errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    const tLoad = Date.now();
    await page.goto(`${server.url}/engine/fixtures/realism/index.html?loc=${loc}.json${EXTRA}`); await page.waitForFunction(() => window.__realism, null, {timeout: 1200000});
    const info = await page.evaluate(() => ({stats: window.__realism.stats, shots: window.__realism.shots.map(s => s.id), tex: window.__realism.texMemory(), tris: window.__realism.triangles()}));
    const rows = [];
    for (let i = 0; i < info.shots.length; i++) {
      const timed = await page.evaluate(([i, n]) => { const R = window.__realism, t = {}; for (const [w, h] of [[1080, 1920], [1440, 2560]]) { R.render(i, w, h); const ms = []; for (let k = 0; k < n; k++) ms.push(R.render(i, w, h, k * .004)); t[`${w}`] = ms.reduce((a, b) => a + b, 0) / n / 1000; } return t; }, [i, N]);
      const m = await page.evaluate(i => window.__realism.measure(i, 540, 960), i);
      const png = await page.evaluate(i => window.__realism.png(i, 1080, 1920), i);
      writeFileSync(`${STILLS}/${loc}-${info.shots[i]}.png`, Buffer.from(png.split(',')[1], 'base64'));
      rows.push({shot: info.shots[i], s1080: +timed['1080'].toFixed(3), s1440: +timed['1440'].toFixed(3), lap: m.lap && +m.lap.toFixed(2), lapBg: m.lapBg && +m.lapBg.toFixed(5), lapActor: m.lapActor && +m.lapActor.toFixed(5),
        contrast: m.contrast && +m.contrast.toFixed(3), subjL: +m.subjL.toFixed(3), localBg: m.localBg && +m.localBg.toFixed(3), subjectFrac: m.subjectFrac,
        pass: {time1440: timed['1440'] <= .69, lap: m.lap >= 3, contrast: m.contrast >= .35}});
    }
    const mean = k => +(rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(3);
    report.locations[loc] = {loadSeconds: (Date.now() - tLoad) / 1000, build: info.stats, triangles: info.tris, textureMemoryMB: +(info.tex.bytes / 2 ** 20).toFixed(1), textures: info.tex.textures,
      mean1080: mean('s1080'), mean1440: mean('s1440'), shots: rows, errors: errors.slice(0, 5)};
    console.log(JSON.stringify({loc, mean1080: mean('s1080'), mean1440: mean('s1440'), texMB: report.locations[loc].textureMemoryMB, rows: rows.map(r => [r.shot, r.s1440, r.lap, r.contrast]), fallbacks: info.stats.fallbacks.length, errors: errors.length}));
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
writeFileSync(`${OUT}/realism.json`, JSON.stringify(report, null, 1));
