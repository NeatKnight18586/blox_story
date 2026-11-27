// stories/fearbell/vorender.js [--rows 5,6,…] [--w 360 --h 640] [--see build/see-fix.json (FINAL: several frames per row)] — renders the vo-sheet frame of every row (build/see.json) from its own world spec
// (build/previs-<loc>.json) into build/vo/frame-NNNNN.png, plus the A2 leak measure and the A1 face-aim headroom of each frame → build/vo/measure.json.
// Then: python3 stories/fearbell/vosheet.py stories/fearbell/build/vo stories/fearbell/build/vocells && python3 scripts/v2/sheet.py … (see vosheet.py).
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {startServer} from '../../scripts/v2/server.js';
import {launch} from '../../scripts/v2/browser.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const D = 'stories/fearbell', OUT = `${D}/build/vo`, w = +arg('w', 360), h = +arg('h', 640), only = arg('rows') ? new Set(arg('rows').split(',').map(Number)) : null;
mkdirSync(OUT, {recursive: true});
const see = JSON.parse(readFileSync(arg('see', `${D}/build/see.json`), 'utf8')).filter(s => !only || only.has(s.row));
const M = existsSync(`${OUT}/measure.json`) ? JSON.parse(readFileSync(`${OUT}/measure.json`, 'utf8')) : {};
const server = await startServer(), browser = await launch();
try {
  for (const loc of [...new Set(see.map(s => s.loc))]) {
    const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(`${D}/build/previs-${loc}.json`)}&aa=1`);
    await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 240000});
    if (!(await page.evaluate(() => !!window.__episode))) throw Error(loc + ': ' + errs.join('; '));
    for (const s of see.filter(q => q.loc === loc)) {
      await page.evaluate(([f, W, H]) => window.__episode.renderFrame(f, W, H), [s.frame, w, h]);
      const fa = await page.evaluate(f => { const E = window.__episode, a = E.faceAimLast(), id = E.shots.findLast(q => f >= q.start).id; return a && a.shot === id ? a : null; }, s.frame);
      const png = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
      writeFileSync(`${OUT}/frame-${String(s.frame).padStart(5, '0')}.png`, png);
      const lk = await page.evaluate(f => window.__episode.leakMeasure(f), s.frame);
      M[s.row] = {row: s.row, frame: s.frame, loc, leak: lk.cover, hits: lk.hits, faceAim: fa && fa.shot ? fa : null};
      console.log(`row ${s.row} f${s.frame} ${loc} leak ${(lk.cover * 100).toFixed(1)} %${lk.hits.length ? ' ' + lk.hits.join(',') : ''}${fa ? ` headroom ${fa.headroom}` : ''}`);
    }
    if (errs.length) console.log('page errors: ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
writeFileSync(`${OUT}/measure.json`, JSON.stringify(M, null, 1));
