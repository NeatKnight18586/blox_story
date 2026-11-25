// node scripts/v2/e3b-gates.js --spec stories/lastcolor/episode.json [--payoff-t 114.6] [--out review/lastcolor/g2a.json]
// E3b owner decision D4 (G2a): the hero's head-region luma per shot, measured ONLY where his head is in frame (head box ≥ 70 % inside,
// in front of the lens) and only on the head's own yellow pixels inside that box (yellow props such as the tower slide never count).
// The payoff is measured at --payoff-t (after its full-colour bloom); it must be the brightest hero-head frame (> every other shot's
// middle frame). Also the payoff jacket: mean colour of the hero's dark torso pixels, CIE76 ΔE to #2B2D33 (≤ 12).
import {readFileSync, writeFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';
import {deltaE76} from '../../engine/plancheck6.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const specPath = arg('spec'), spec = JSON.parse(readFileSync(specPath, 'utf8')), shots = layoutShots(spec), fps = spec.fps ?? 30, W = 270, H = 480;
const payoff = shots.find(s => s.mood === 'payoff'), payN = Math.min(payoff.start + payoff.frames - 1, Math.round(+arg('payoff-t', (payoff.start + payoff.frames) / fps - .7) * fps));
const JACKET = [0x2B, 0x2D, 0x33];
const server = await startServer(), browser = await launch(), per = {};
let pay = null;
try {
  const page = await browser.newPage(); await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
  const measure = (n, jacket) => page.evaluate(([n, W, H, jacket]) => { const E = window.__episode, m = E.readMeasure(n, {subject: 'hero', w: W, h: H});
    if (m.missing || !m.head) return null; const b = m.head.box, inside = (Math.max(0, Math.min(1, b.x1) - Math.max(0, b.x0)) * Math.max(0, Math.min(1, b.y1) - Math.max(0, b.y0))) / Math.max(1e-9, (b.x1 - b.x0) * (b.y1 - b.y0));
    E.renderFrame(n, W, H); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(document.querySelector('canvas'), 0, 0, W, H); const px = g.getImageData(0, 0, W, H).data;
    const yel = (r, gg, bb) => { const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb); if (mx < 60 || (mx - mn) / mx < .35) return false; const h = mx === r ? ((gg - bb) / (mx - mn)) * 60 : mx === gg ? (2 + (bb - r) / (mx - mn)) * 60 : (4 + (r - gg) / (mx - mn)) * 60; return h >= 30 && h <= 70; };
    let s = 0, k = 0; const X0 = Math.max(0, Math.floor(b.x0 * W)), X1 = Math.min(W, Math.ceil(b.x1 * W)), Y0 = Math.max(0, Math.floor(b.y0 * H)), Y1 = Math.min(H, Math.ceil(b.y1 * H));
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) { const i = (y * W + x) * 4; if (yel(px[i], px[i + 1], px[i + 2])) { s += .2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]; k++; } }
    let jk = null; if (jacket) { const bx = m.box, J = [0, 0, 0]; let q = 0; const jx0 = Math.max(0, Math.floor(bx.x0 * W)), jx1 = Math.min(W, Math.ceil(bx.x1 * W)), jy0 = Math.max(0, Math.ceil(b.y1 * H)), jy1 = Math.min(H, Math.ceil(bx.y1 * H));
      for (let y = jy0; y < jy1; y++) for (let x = jx0; x < jx1; x++) { const i = (y * W + x) * 4, l = .2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]; if (l < 90 && Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) < 40) { J[0] += px[i]; J[1] += px[i + 1]; J[2] += px[i + 2]; q++; } }
      jk = q ? {rgb: J.map(v => +(v / q).toFixed(1)), px: q} : null; }
    return {inside: +inside.toFixed(3), front: m.head.front, px: k, luma: k ? +(s / k).toFixed(2) : null, jacket: jk}; }, [n, W, H, jacket]);
  for (const s of shots) { const n = s.start + Math.floor(s.frames / 2), r = await measure(n, false); const inFrame = !!r && r.front && r.inside >= .7 && r.px >= 20; per[s.id] = inFrame ? r.luma : null; }
  pay = await measure(payN, true);
} finally { await browser.close(); await server.close(); }
const others = Object.entries(per).filter(([id, v]) => id !== payoff.id && v !== null).sort((a, b) => b[1] - a[1]);
const jdE = pay?.jacket ? +deltaE76(pay.jacket.rgb, JACKET).toFixed(2) : null;
const out = {rule: 'D4: hero head-region luma (yellow head pixels in the head box), shots with the head in frame only; payoff measured after its bloom',
  payoff: {shot: payoff.id, frame: payN, t: +(payN / fps).toFixed(2), luma: pay?.luma ?? null, jacketRGB: pay?.jacket?.rgb ?? null, jacketDeltaE: jdE},
  maxOther: others[0] ?? null, pass: !!(pay?.luma && (!others.length || pay.luma > others[0][1])), jacketPass: jdE !== null && jdE <= 12, perShot: per};
writeFileSync(arg('out', `review/${spec.slug}/g2a.json`), JSON.stringify(out, null, 1));
console.log(`G2a payoff ${out.payoff.luma} vs max other ${others[0]?.[0]} ${others[0]?.[1]} → ${out.pass ? 'PASS' : 'FAIL'}; jacket ΔE ${jdE} (≤ 12) → ${out.jacketPass ? 'PASS' : 'FAIL'}`);
