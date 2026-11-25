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
// 4C-2 story checks on the tuft spec itself: S01 frame 0 (beastFace: eye span, eye value, highlights, blue-gold tips), S03 (beastHero: head +
// fire), S21 (Juni's face + torso unobstructed), S59 (no pole across either actor's head or torso); every 3rd frame of S03 / S21 / S59
const story = {}, SP = segmentPlan('stories/tuft/episode.json'), sshots = layoutShots(JSON.parse(readFileSync('stories/tuft/episode.json', 'utf8')));
for (const id of ['S01', 'S03', 'S21', 'S59']) {
  const s = sshots.find(x => x.id === id), seg = SP.segments.find(g => g.shotIds?.has(id)), page = await browser.newPage({viewport: {width: 360, height: 640}}); page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(seg.specPath)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
  const fr = id === 'S01' ? [s.start] : Array.from({length: Math.ceil(s.frames / every)}, (_, k) => s.start + k * every);
  story[id] = []; for (const f of fr) story[id].push(await page.evaluate(([f, id, px]) => { const E = window.__episode, W = 540, H = 960; E.renderFrame(f, W, H); const m = E.tpl.measure(id); m.frame = f;
    if (px) { const gl = E.debug.renderer.getContext(), b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
      const hsv = i => { const r = b[i] / 255, g = b[i + 1] / 255, bl = b[i + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; };
      m.eyes = (E.tpl.eyes('tuft') ?? []).map(e => { const cx = (e.x + 1) / 2 * W, cy = (e.y + 1) / 2 * H, R = e.r / 2 * W, V = []; for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) { if (x < 0 || y < 0 || x >= W || y >= H || (x - cx) ** 2 + (y - cy) ** 2 > R * R) continue; V.push(hsv((y * W + x) * 4)); }
        const vs = V.map(v => v[2]).sort((p, q) => p - q), hi = V.filter(v => v[2] >= .85 && v[1] <= .25).length; return {n: V.length, value: vs[Math.floor(vs.length * .5)] ?? 1, highlight: hi}; });
      let blue = 0, gold = 0; for (let i = 0; i < W * H * 4; i += 4) { const [h, sa, v] = hsv(i); if (sa >= .35 && v >= .45 && h >= 195 && h <= 235) blue++; if (sa >= .35 && v >= .55 && h >= 35 && h <= 60) gold++; } m.tips = {blue: blue / (W * H), gold: gold / (W * H)}; }
    return m; }, [f, id, id === 'S01']));
  await page.close();
}
await browser.close(); server.close?.();
const gates = [], gate = (name, pass, line) => { gates.push({name, pass, line}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const headRows = rows.flatMap(r => Object.entries(r.heads).map(([n, h]) => ({...h, n, id: r.id, frame: r.frame, kind: r.kind})));
const main = headRows.filter(h => h.occluded !== null), okMain = main.filter(h => (h.inFrame || h.kind === 'beastFace') && !h.occluded && !h.bodyOccluded && !h.missing);   // 4C-2: + torso / shoulders; beastFace = the eyes fill (own gate)
gate('heads', okMain.length === main.length, `subject head fully in frame, head (5 rays) + torso + shoulders unoccluded on ${okMain.length}/${main.length} sampled head-frames (${(100 * okMain.length / Math.max(1, main.length)).toFixed(1)} %; 100 %)` +
  (okMain.length < main.length ? ' — worst: ' + [...new Set(main.filter(h => !((h.inFrame || h.kind === 'beastFace') && !h.occluded && !h.bodyOccluded && !h.missing)).map(h => `${h.id} ${h.n}${h.missing ? ' missing' : !h.inFrame && h.kind !== 'beastFace' ? ' out' : ' blocked by ' + h.by}`))].slice(0, 6).join(', ') : ''));
const ins = rows.filter(r => r.inside); gate('inside', ins.length === 0, `camera inside a mesh on ${ins.length}/${rows.length} frames (0)${ins.length ? ' — ' + [...new Set(ins.map(r => r.id))].join(' ') : ''}`);
const both = rows.filter(r => r.kind === 'two' || r.kind === 'ots'), bothOk = both.filter(r => Object.values(r.heads).every(h => h.inFrame)); gate('two/ots', bothOk.length === both.length && both.length > 0, `both heads in frame on ${bothOk.length}/${both.length} two/ots frames`);
const bh = rows.filter(r => r.kind === 'beastHero' && r.hero), sh = bh.map(r => r.hero.share), lowOk = bh.every(r => r.camAboveGround <= 1.6 + 1e-3), jets = bh.filter(r => r.hero.jet);
gate('beastHero', bh.length > 0 && sh.every(v => v >= .45 && v <= .65) && bh.every(r => r.hero.silhouetteIn && r.hero.headIn) && lowOk && jets.every(r => r.hero.jet.mouthIn && r.hero.jet.jet40In),
  `silhouette share ${Math.min(...sh).toFixed(3)}–${Math.max(...sh).toFixed(3)} (0.45–0.65), silhouette + head box in frame ${bh.filter(r => r.hero.silhouetteIn && r.hero.headIn).length}/${bh.length}, head in the upper third ${bh.filter(r => r.hero.headY >= 1 / 3).length}/${bh.length}, mouth + 40 % jet in frame ${jets.filter(r => r.hero.jet.mouthIn && r.hero.jet.jet40In).length}/${jets.length} breathing frames, camera ≤ ${Math.max(...bh.map(r => r.camAboveGround)).toFixed(2)} studs (≤ 1.6)`);
const bf = rows.filter(r => r.kind === 'beastFace' && r.face); gate('beastFace', bf.length > 0 && bf.every(r => r.face.span >= .45 && r.face.central), `eye span ${Math.min(...bf.map(r => r.face.span)).toFixed(2)}–${Math.max(...bf.map(r => r.face.span)).toFixed(2)} of the width (≥ .45), both eyes in the central 70 % ${bf.filter(r => r.face.central).length}/${bf.length}`);
gate('locations', locs.length >= 4 && locs.includes('homeBedroom'), `${locs.length} locations: ${locs.join(', ')}`);
for (const [id, p] of Object.entries(perShot)) console.log(`  ${id} ${p.kind}@${p.loc}: swing ${p.swing}° pull ${p.pull}, ${p.sPerFrame} s/frame (incl. render)`);
{ const f0 = story.S01[0], E2 = f0.eyes ?? [], fc = f0.face ?? {}; gate('S01 face', fc.span >= .45 && fc.central && E2.length === 2 && E2.every(e => e.value <= .12 && e.highlight >= 3) && f0.tips.blue >= .003 && f0.tips.gold >= .003,
    `frame 0: eye span ${(fc.span ?? 0).toFixed(2)} (≥ .45), central 70 % ${!!fc.central}, eye value ${E2.map(e => e.value.toFixed(3)).join(' / ')} (≤ .12), highlight px ${E2.map(e => e.highlight).join(' / ')} (≥ 3 each), tips blue ${(100 * f0.tips.blue).toFixed(2)} % gold ${(100 * f0.tips.gold).toFixed(2)} % (≥ 0.3 % each)`); }
{ const r = story.S03.filter(x => x.hero), j = r.filter(x => x.hero.jet); gate('S03 head + fire', r.length > 0 && r.every(x => x.hero.headIn) && j.length > 0 && j.every(x => x.hero.jet.mouthIn && x.hero.jet.jet40In),
    `Nightfang head in frame ${r.filter(x => x.hero.headIn).length}/${r.length}, mouth + 40 % of the jet in frame ${j.filter(x => x.hero.jet.mouthIn && x.hero.jet.jet40In).length}/${j.length} breathing frames, share ${Math.min(...r.map(x => x.hero.share)).toFixed(2)}–${Math.max(...r.map(x => x.hero.share)).toFixed(2)}`); }
for (const [id, who] of [['S21', ['juni']], ['S59', ['juni', 'hero']]]) { const hs = story[id].flatMap(x => who.map(n => ({...x.heads[n], f: x.frame, n}))), ok = hs.filter(h => h.inFrame && h.occluded === false && h.bodyOccluded === false);
  gate(`${id} unobstructed`, ok.length === hs.length, `${who.join(' + ')}: head (5 rays) + torso + shoulders clear and the head in frame on ${ok.length}/${hs.length} sampled head-frames${ok.length < hs.length ? ' — ' + [...new Set(hs.filter(h => !ok.includes(h)).map(h => `${h.n} ${h.by ?? (h.inFrame ? '' : 'out')}`))].slice(0, 4).join(', ') : ''}`); }
writeFileSync('review/tuft/tpl-gates.json', JSON.stringify({spec: P, every, gates, perShot, rows, story}, null, 1) + '\n');
console.log(`→ review/tuft/tpl-gates.json: ${gates.filter(g => g.pass).length}/${gates.length} PASS`);
process.exit(0);
