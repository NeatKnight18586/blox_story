// scripts/v2/look-gates.js — measured look gates (Amendment A5 §E night brightness, §F framing). Exit 1 on failure.
//   node scripts/v2/look-gates.js --spec <episode.json> [--night <shot ids>] [--framing] [--out <file.json>]
// Renders each tested shot's middle frame at 390×693 (phone width) and measures, on the sRGB pixels (luma 0–1, Rec. 709):
//   night (§E + owner Decision 1): every night shot: frame mean 0.24–0.42. Only medium/close shots framed with `fit` (actor
//     ≥ 30 % of frame height) are also checked on the fit actor: mean inside its box ≥ 0.40 · box − surrounding ring ≥ 0.12
//     (ring = the box grown by 50 % of its size on every side, minus the box). Plus the night palette rule (engine/troupe.js).
//   framing (§F, shots with `fit`): subject height (head & shoulders for part 'head', else the full actor) ≥ 45 % close,
//     ≥ 30 % medium/heroLow; empty ground below the feet ≤ 28 % unless the shot is `spectacle`.
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {framingCheck} from '../../engine/camera.js';
import {nightPaletteCheck} from '../../engine/troupe.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const spec = arg('spec'), out = arg('out', `review/season1/look-gates-${path.basename(spec, '.json')}.json`), nightIds = (arg('night', '') || '').split(',').filter(Boolean), doFraming = argv.includes('--framing');
const S = JSON.parse(readFileSync(spec, 'utf8')), W = 390, H = 693, LIM = {frame: [.24, .42], actor: .40, contrast: .12};
const server = await startServer(), browser = await launch(), report = {spec, limits: {night: LIM, framing: {close: .45, medium: .30, heroLow: .30, groundMax: .28}}, night: [], framing: [], failures: []};
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 180000});
  const shots = await page.evaluate(() => window.__episode.shots);
  for (const sh of shots) {
    const isNight = nightIds.includes(sh.id), isFit = doFraming && sh.fit; if (!isNight && !isFit) continue;
    const n = sh.start + Math.floor(sh.frames / 2);
    const m = await page.evaluate(([n, W, H]) => {
      const E = window.__episode; E.renderFrame(n, W, H); const meas = E.measureFrame(), gl = E.debug.renderer.getContext(), px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const L = (x, y) => { const i = ((H - 1 - y) * W + x) * 4; return (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; };
      const mean = (x0, x1, y0, y1, skip) => { let s = 0, k = 0; for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) { if (skip && skip(x, y)) continue; s += L(x, y); k++; } return k ? s / k : null; };
      const frame = mean(0, W, 0, H), actors = {};
      for (const [name, a] of Object.entries(meas)) { const b = a.box, X0 = Math.round(b.x0 * W), X1 = Math.round(b.x1 * W), Y0 = Math.round(b.y0 * H), Y1 = Math.round(b.y1 * H), gw = Math.round((X1 - X0) * .5), gh = Math.round((Y1 - Y0) * .5);
        const inBox = mean(X0, X1, Y0, Y1), ring = mean(X0 - gw, X1 + gw, Y0 - gh, Y1 + gh, (x, y) => x >= X0 && x < X1 && y >= Y0 && y < Y1);
        actors[name] = {...a, luma: inBox, ring}; }
      return {frame, actors};
    }, [n, W, H]);
    if (isNight) {
      const actorShot = ['medium', 'close'].includes(sh.size) && sh.fit && !sh.spectacle;   // Decision 1
      const heroes = actorShot ? Object.entries(m.actors).filter(([k, a]) => k === sh.fit.actor && a.front) : [];
      const row = {shot: sh.id, frame: n, look: sh.look, frameLuma: +m.frame.toFixed(3), actors: Object.fromEntries(heroes.map(([k, a]) => [k, {luma: +a.luma.toFixed(3), ring: +a.ring.toFixed(3), contrast: +(a.luma - a.ring).toFixed(3)}]))};
      report.night.push(row);
      if (m.frame < LIM.frame[0] || m.frame > LIM.frame[1]) report.failures.push(`${sh.id}: frame luma ${m.frame.toFixed(3)} outside ${LIM.frame}`);
      if (actorShot && !heroes.length) report.failures.push(`${sh.id}: fit actor not in frame`);
      if (actorShot) { const a = m.actors[sh.fit.actor], f = a ? a.feet - a.top : 0; row.fitFrac = +f.toFixed(3); if (f < .3) report.failures.push(`${sh.id}: fit actor only ${(f * 100).toFixed(1)} % of frame height (< 30 %)`); }
      for (const [k, a] of heroes) { if (a.luma < LIM.actor) report.failures.push(`${sh.id}/${k}: actor luma ${a.luma.toFixed(3)} < ${LIM.actor}`); if (a.luma - a.ring < LIM.contrast) report.failures.push(`${sh.id}/${k}: box − ring ${(a.luma - a.ring).toFixed(3)} < ${LIM.contrast}`); }
    }
    if (isFit) {
      const a = m.actors[sh.fit.actor]; if (!a) { report.failures.push(`${sh.id}: fit actor ${sh.fit.actor} not visible`); continue; }
      const part = sh.fit.part ?? 'full', subjectFrac = part === 'head' ? a.shoulder - a.top : a.feet - a.top, groundGap = part === 'head' || a.feet > 1 ? 0 : Math.max(0, 1 - a.feet);
      const chk = framingCheck({size: sh.size, move: sh.move, subjectFrac, groundGap, spectacle: sh.spectacle});
      report.framing.push({shot: sh.id, frame: n, size: sh.size, move: sh.move, part, subjectFrac: +subjectFrac.toFixed(3), groundGap: +groundGap.toFixed(3), need: chk.need, ok: chk.ok});
      for (const i of chk.issues) report.failures.push(`${sh.id}: ${i}`);
    }
  }
  if (nightIds.length) { const troupe = JSON.parse(readFileSync('cast/troupe.json', 'utf8')); report.palette = nightPaletteCheck(S, troupe); for (const p of report.palette) report.failures.push(`night palette: ${p.actor}.${p.key} ${p.color} lightness ${p.l} < 0.32`); }
  if (errors.length) report.failures.push(...errors);
  report.result = report.failures.length ? 'FAIL' : 'PASS';
  await mkdir(path.dirname(out), {recursive: true}); await writeFile(out, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({result: report.result, night: report.night, framing: report.framing, failures: report.failures}, null, 1));
  process.exitCode = report.failures.length ? 1 : 0;
} finally { await browser.close(); await server.close(); }
