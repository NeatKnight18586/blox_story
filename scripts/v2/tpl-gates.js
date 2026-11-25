// scripts/v2/tpl-gates.js — tuft 4C render gate for camera TEMPLATES (engine/camtpl.js) → review/tuft/tpl-gates.json.
// A 10-shot test spec across 4 locations (beastYard, homeBedroom = tight interior, homeDining, festivalPlaza): stories/tuft/episode.json with
// `tpl` set on 10 shots (written to stories/tuft/build/tpl10.json, never committed). Every 3rd frame of each of those shots is rendered
// (270×480, aa 0) and measured on the POSED scene (episode.js tplMeasure): each checked head inside the frame and unoccluded (double-sided
// ray, head → camera), the camera inside no mesh (≥ 4 of 6 axis rays hit a back face, or a surface < .05 studs), both heads in frame on
// two / ots, beastHero beast height share 0.6–0.8 with the camera ≤ 1.6 studs above the ground.
// Usage: node scripts/v2/tpl-gates.js [--every 3]
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';
import {segmentPlan} from './segments.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; }, every = +arg('every', 3);
export const TEN = {S03: {kind: 'beastHero', beast: 'nightfang'}, S04: {kind: 'ms'}, S27: {kind: 'cu'}, S28: {kind: 'ots', partner: 'juni'}, S30: {kind: 'wide'},
  S33: {kind: 'mcu'}, S40: {kind: 'beastFace', beast: 'titan'}, S48: {kind: 'ms'}, S60: {kind: 'two', a: 'juni', b: 'hero'}, S61: {kind: 'ecu'}};
const base = JSON.parse(readFileSync('stories/tuft/episode.json', 'utf8'));
for (const s of base.shots) if (TEN[s.id]) { s.tpl = TEN[s.id]; if (s.id === 'S28') s.subject = 'hero'; }
mkdirSync('stories/tuft/build', {recursive: true}); const P = 'stories/tuft/build/tpl10.json'; writeFileSync(P, JSON.stringify(base));
const shots = layoutShots(base), pick = shots.filter(s => TEN[s.id]), locs = [...new Set(pick.map(s => s.loc))];
console.log(`10-shot template spec: ${pick.map(s => `${s.id}:${s.tpl?.kind ?? TEN[s.id].kind}@${s.loc}`).join(' ')} (${locs.length} locations)`);
const server = await startServer(process.cwd()), browser = await launch(), rows = [], perShot = {};
const {segments} = segmentPlan(P);
for (const seg of segments) {
  const mine = pick.filter(s => seg.shotIds?.has(s.id)); if (!mine.length) continue;
  const page = await browser.newPage({viewport: {width: 360, height: 640}}); page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(seg.specPath)}&aa=0`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
  for (const s of mine) {
    const t0 = Date.now(), fr = []; for (let f = s.start; f < s.start + s.frames; f += every) fr.push(f);
    for (const f of fr) { const m = await page.evaluate(([f, id]) => { const E = window.__episode; E.renderFrame(f, 270, 480); return E.tpl.measure(id); }, [f, s.id]); m.frame = f; m.loc = seg.loc; rows.push(m); }
    perShot[s.id] = {loc: seg.loc, kind: TEN[s.id].kind, frames: fr.length, sPerFrame: +((Date.now() - t0) / 1000 / fr.length).toFixed(2), swing: rows.at(-1).solver?.swing, pull: rows.at(-1).solver?.pull};
  }
  await page.close();
}
await browser.close(); server.close?.();
const gates = [], gate = (name, pass, line) => { gates.push({name, pass, line}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const headRows = rows.flatMap(r => Object.entries(r.heads).map(([n, h]) => ({...h, n, id: r.id, frame: r.frame, kind: r.kind})));
const main = headRows.filter(h => h.occluded !== null), okMain = main.filter(h => h.inFrame && !h.occluded && !h.missing);
gate('heads', okMain.length === main.length, `subject head fully in frame and unoccluded on ${okMain.length}/${main.length} sampled head-frames (${(100 * okMain.length / Math.max(1, main.length)).toFixed(1)} %; 100 %)` +
  (okMain.length < main.length ? ' — worst: ' + [...new Set(main.filter(h => !(h.inFrame && !h.occluded && !h.missing)).map(h => `${h.id} ${h.n}${h.missing ? ' missing' : !h.inFrame ? ' out' : ' blocked by ' + h.by}`))].slice(0, 6).join(', ') : ''));
const ins = rows.filter(r => r.inside); gate('inside', ins.length === 0, `camera inside a mesh on ${ins.length}/${rows.length} frames (0)${ins.length ? ' — ' + [...new Set(ins.map(r => r.id))].join(' ') : ''}`);
const both = rows.filter(r => r.kind === 'two' || r.kind === 'ots'), bothOk = both.filter(r => Object.values(r.heads).every(h => h.inFrame)); gate('two/ots', bothOk.length === both.length && both.length > 0, `both heads in frame on ${bothOk.length}/${both.length} two/ots frames`);
const bh = rows.filter(r => r.kind === 'beastHero'), sh = bh.map(r => r.share), lowOk = bh.every(r => r.camAboveGround <= 1.6 + 1e-3);
gate('beastHero', bh.length > 0 && sh.every(v => v >= .6 && v <= .8) && lowOk, `beast height share ${Math.min(...sh).toFixed(3)}–${Math.max(...sh).toFixed(3)} (0.6–0.8), camera ≤ ${Math.max(...bh.map(r => r.camAboveGround)).toFixed(2)} studs above the ground (≤ 1.6)`);
gate('locations', locs.length >= 4 && locs.includes('homeBedroom'), `${locs.length} locations: ${locs.join(', ')}`);
for (const [id, p] of Object.entries(perShot)) console.log(`  ${id} ${p.kind}@${p.loc}: swing ${p.swing}° pull ${p.pull}, ${p.sPerFrame} s/frame (incl. render)`);
writeFileSync('review/tuft/tpl-gates.json', JSON.stringify({spec: P, every, gates, perShot, rows}, null, 1) + '\n');
console.log(`→ review/tuft/tpl-gates.json: ${gates.filter(g => g.pass).length}/${gates.length} PASS`);
process.exit(0);
