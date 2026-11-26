// node scripts/v2/midshots.js --spec <episode.json> --out <dir> [--shots S01,S19] [--at .5] [--read] [--w 390 --h 693]
// E3b staging loop: one page load, then for each shot renders the frame at `at` of its length (default the middle, the
// frame v2:read judges) and saves <out>/<id>.png. With --read it renders through readMeasure (the same id-mask numbers as
// v2:read: faceShown, nothingInFront, standsOut, objectReads) and writes <out>/read.json; motion is not measured here.
import {readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';
import {faceShown, nothingInFront, standsOut, objectReads} from '../../engine/readcheck.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const specPath = arg('spec'), out = arg('out'), at = +arg('at', .5), W = +arg('w', 390), H = +arg('h', 693), doRead = argv.includes('--read');
const spec = JSON.parse(readFileSync(specPath, 'utf8')), shots = layoutShots(spec), want = arg('shots') ? new Set(arg('shots').split(',')) : null;
const list = shots.filter(s => !want || want.has(s.id)).map(s => ({id: s.id, n: s.start + Math.min(s.frames - 1, Math.floor(s.frames * at)), size: s.size, move: s.move, subject: s.subject ?? null, prop: s.prop ?? null}));
await mkdir(out, {recursive: true});
const server = await startServer(), browser = await launch(), res = {};
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 240000});
  if (errs.length) throw Error(errs.join('; '));
  for (const s of list) {
    const m = await page.evaluate(([s, W, H, rd]) => { const E = window.__episode; const m = rd ? E.readMeasure(s.n, {subject: s.subject, prop: s.prop, w: W, h: H}) : null; E.renderFrame(s.n, W, H); return m; }, [s, W, H, doRead]);
    const png = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
    await writeFile(`${out}/${s.id}.png`, png);
    if (m) { const r = {n: s.n}, who = s.subject;
      if (who && !m.missing) r.faceShown = faceShown(s, m.head);
      if ((who || s.prop) && !m.missing) { r.nothingInFront = nothingInFront(m); r.standsOut = standsOut(m.subj, m.ring); }
      if (s.prop && s.size === 'insert' && !m.missing) r.objectReads = objectReads(m.box);
      if (m.missing) r.missing = m.missing; r.box = m.box; r.head = m.head?.box ?? null; res[s.id] = r;
      const bad = Object.entries(r).filter(([, v]) => v && v.ok === false).map(([k, v]) => `${k}: ${v.msg}`);
      console.log(`${bad.length || r.missing ? 'FAIL' : 'ok  '} ${s.id} ${r.missing ? 'missing ' + r.missing : bad.join(' · ')}`); }
  }
} finally { await browser.close(); await server.close(); }
if (doRead) await writeFile(`${out}/read.json`, JSON.stringify(res, null, 1));
