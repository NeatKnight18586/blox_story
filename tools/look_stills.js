#!/usr/bin/env node
// tools/look_stills.js — Phase 5 acceptance: one still per mood (engine/moods7.json) in the look7 test world at final quality
// (1440×2560, MSAA 4, AO, rays, DOF on close shots, bloom, grade) + a timing table per tier (previz 270×480 / final 1440×2560).
//   node tools/look_stills.js [--moods a,b] [--shots 0,2] [--n 2] [--out renders/look7] [--report review/look7/look7.json] [--before]
// --before also renders the same shots without the mood/post chain (Phase R lit CC0 street = today's realism baseline).
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
const MOODS7 = JSON.parse(readFileSync('engine/moods7.json', 'utf8'));
import {launch} from '../scripts/v2/browser.js';
import {startServer} from '../scripts/v2/server.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MOODS = arg('--moods', 'dawnHope,overcastDread,goldenBittersweet,nightMystery,stormAction').split(','), SHOTS = arg('--shots', '0,2').split(',').map(Number);
const N = +arg('--n', 2), OUT = arg('--out', 'renders/look7'), REPORT = arg('--report', 'review/look7/look7.json');
mkdirSync(OUT, {recursive: true}); mkdirSync(REPORT.replace(/\/[^/]+$/, ''), {recursive: true});
const server = await startServer(process.cwd()), browser = await launch(), rep = {tiers: {previz: [270, 480], final: [1440, 2560]}, moods: {}};
const runs = [...MOODS.map(m => [m, '']), ...(process.argv.includes('--before') ? [['goldenBittersweet', '&post=0']] : [])];
try {
  for (const [mood, extra] of runs) {
    const key = extra ? 'before' : mood, page = await browser.newPage({viewport: {width: 360, height: 640}}), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    const t0 = Date.now();
    await page.goto(`${server.url}/engine/fixtures/look7/index.html?mood=${mood}${extra}`); await page.waitForFunction(() => window.__look7 || null, null, {timeout: 600000}).catch(e => { throw Error(`${key}: ${errors.join(' | ') || e.message}`); });
    const loadS = (Date.now() - t0) / 1000, info = await page.evaluate(() => ({stats: window.__look7.stats, shots: window.__look7.shots.map(s => s.id)}));
    const rows = [];
    for (const i of SHOTS) {
      const t = await page.evaluate(([i, n]) => { const R = window.__look7, out = {};
        for (const [tier, w, h] of [['previz', 270, 480], ['final', 1440, 2560]]) { R.render(i, w, h, {tier}); const ms = []; for (let k = 0; k < n; k++) ms.push(R.render(i, w, h, {tier})); out[tier] = ms.reduce((a, b) => a + b, 0) / ms.length / 1000; }
        return out; }, [i, N]);
      const png = await page.evaluate(i => window.__look7.png(i, 1440, 2560, {tier: 'final'}), i);
      const ls = await page.evaluate(() => window.__look7.lumaStats(1440, 2560));
      writeFileSync(`${OUT}/${key}-${info.shots[i]}.png`, Buffer.from(png.split(',')[1], 'base64'));
      const G = extra ? null : MOODS7[mood].gate, pass = G ? {luma: ls.meanLuma >= G.luma[0] && ls.meanLuma <= G.luma[1], rb: (G.rbWideOnly && !/wide/i.test(info.shots[i])) ? true : G.rbMin ? ls.rOverB >= G.rbMin : ls.rOverB <= G.rbMax, clip: ls.clip <= G.clipMax} : null;
      rows.push({shot: info.shots[i], previzS: +t.previz.toFixed(3), finalS: +t.final.toFixed(3), ...ls, ...(pass ? {pass, ok: Object.values(pass).every(Boolean)} : {})});
    }
    rep.moods[key] = {loadSeconds: loadS, fallbacks: info.stats.fallbacks, textureMB: +(info.stats.textureBytes / 2 ** 20).toFixed(1), bakeMs: info.stats.bake?.ms, shots: rows, errors: errors.slice(0, 4)};
    console.log(JSON.stringify({key, loadS, rows: rows.map(r => [r.shot, r.previzS, r.finalS, r.meanLuma, r.rOverB, r.clip, r.ok]), fallbacks: info.stats.fallbacks.length, errors: errors.length}));
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
writeFileSync(REPORT, JSON.stringify(rep, null, 1));
