// scripts/v2/pose-gates.js — format v5 snappy poses: measured distinctness (geometry, no browser) + the 390 px sheet.
//   Gate: every new pose moves a hand or the head ≥ 0.6 units from idle, and every pair of poses differs by ≥ 0.4 at some
//   hand/head; a {snap: true} key lands in exactly 2 frames at 24 fps. → review/v4/pose-gates.json, review/v4/poses-390.png
//   node scripts/v2/pose-gates.js [--no-sheet]
import * as T from 'three';
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createActor5} from '../../avatar-style/body5.js';
import {SNAPPY, samplePose, applyPoseSample, sampleTimeline, SNAP_FADE_FRAMES} from '../../engine/poses.js';
const a = createActor5({skin: '#FFD542'}), tip = new T.Vector3();
function marks(name) {
  applyPoseSample(a, samplePose(name, .5), {position: [0, 0, 0], yaw: 0}); a.root.updateMatrixWorld(true);
  const p = k => a.pivots[k].localToWorld(tip.set(0, -2, 0)).toArray(), head = a.pivots.head.localToWorld(tip.set(0, .6, .5)).toArray();
  return {R: p('rightShoulder'), L: p('leftShoulder'), H: head};
}
const d = (x, y) => Math.max(...['R', 'L', 'H'].map(k => Math.hypot(...x[k].map((v, i) => v - y[k][i]))));
const idle = marks('idle'), M = Object.fromEntries(SNAPPY.map(n => [n, marks(n)])), fails = [], vsIdle = {}, closest = [];
for (const n of SNAPPY) { vsIdle[n] = +d(M[n], idle).toFixed(3); if (vsIdle[n] < .6) fails.push(`${n}: ${vsIdle[n]} from idle (≥ 0.6)`); }
for (let i = 0; i < SNAPPY.length; i++) for (let j = i + 1; j < SNAPPY.length; j++) { const v = +d(M[SNAPPY[i]], M[SNAPPY[j]]).toFixed(3); closest.push([SNAPPY[i], SNAPPY[j], v]); if (v < .4) fails.push(`${SNAPPY[i]} vs ${SNAPPY[j]}: ${v} (≥ 0.4)`); }
closest.sort((x, y) => x[2] - y[2]);
const k = [[0, 'idle'], [1, 'shrug', {snap: true, fps: 24}]], at = f => sampleTimeline(k, 1 + f / 24).pivots.rightShoulder[2], end = samplePose('shrug', 0).pivots.rightShoulder[2];
const landed = [0, 1, 2, 3].findIndex(f => Math.abs(at(f) - end) < 1e-9); if (landed !== SNAP_FADE_FRAMES) fails.push(`snap lands in ${landed} frames (want ${SNAP_FADE_FRAMES})`);
const rep = {poses: SNAPPY, fromIdle: vsIdle, closestPairs: closest.slice(0, 5), snapLandsInFrames: landed, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/v4', {recursive: true}); writeFileSync('review/v4/pose-gates.json', JSON.stringify(rep, null, 1)); console.log(JSON.stringify({result: rep.result, minFromIdle: Math.min(...Object.values(vsIdle)), closest: closest[0], landed, fails}));
process.exitCode = fails.length ? 1 : 0;
if (!process.argv.includes('--no-sheet')) {
  const {startServer} = await import('./server.js'), {launch} = await import('./browser.js'), {resolveTroupe} = await import('../../engine/troupe.js');
  const raw = 'renders/v4/poses'; await mkdir(raw, {recursive: true});
  const hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO; await writeFile(`${raw}/cast.json`, JSON.stringify({cast: {HERO: resolveTroupe({troupe: 'HERO'}, {troupe: {HERO: hero}})}}));
  const server = await startServer(), browser = await launch(), names = ['idle', ...SNAPPY];
  try {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`); await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
    for (const n of names) { await page.evaluate(([n]) => window.__studio.render({actors: [{id: 'HERO', at: [0, 0, 0], yaw: 20, pose: n, t: .5, face: 'hero_grin'}], camera: {position: [3.2, 3.4, 13], target: [0, 3.0, 0], fov: 34}}, 390, 390), [n]);
      await writeFile(`${raw}/${n}.png`, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); }
    if (errs.length) throw Error(errs.join('; '));
  } finally { await browser.close(); await server.close(); }
  execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
raw, names = sys.argv[1], json.loads(sys.argv[2]); f = ImageFont.load_default(size=15); c = 390
s = Image.new('RGB', (4 * c, 3 * (c + 22)), '#1b1d21'); d = ImageDraw.Draw(s)
for i, n in enumerate(names):
    x, y = (i % 4) * c, (i // 4) * (c + 22); s.paste(Image.open(f'{raw}/{n}.png').convert('RGB'), (x, y + 22)); d.text((x + 4, y + 3), n, fill='#ffd84a', font=f)
s.save('review/v4/poses-390.png'); print(s.size)`, raw, JSON.stringify(names)], {stdio: 'inherit'});
}
