// scripts/v2/city1e-gate.js — Phase 1E city gate (look B = cityDay2 + outline classic): every key-art anchor once at 270 × 480 with the
// hero group posed per the STAGING RULE, the gate rows (plan.json gate1e) at phone 390 + the bench at 720 × 1280, and (--tod) bayNorth in
// each time-of-day look (cityDay2 / cityGoldenHour / cityDusk / cityNight; one page per look: each look bakes its own light).
//   node scripts/v2/city1e-gate.js [--out renders/city1e] [--review review/city] [--rows a,b] [--no-bench] [--no-tod] [--tod-only] [--specs-only]
// Writes engine/fixtures/city/gate1e.json (+ gate1e-<look>.json), <out>/all/<anchor>.png, <out>/phone/<anchor>.png, <out>/tod/<look>.png,
// <review>/1E-measures.json. Sheets: python3 scripts/v2/city1e-sheet.py --dir <out> --measures <review>/1E-measures.json.
// Measures per anchor (mask passes; characters are occluders) — the 1D staging rule (heroH, landmark, kids, sightlines, movers) plus:
//   ground  = pixels of up-facing surfaces (world normal y > .75; water, sky, people excluded) / frame ≤ keyArtStaging.groundMax (.25)
//   fg      = the anchor's own key-art foreground prop: its columns touch a frame EDGE, span 5–15 % of the width, none in the middle third
//   planks  = mean sRGB luma of light-wood plank pixels (harborDock, beach) ≥ .40
//   gold    = statue gold pixels (plazaWide): circular-mean hue in the gold band 35–55°, mean saturation ≥ .45, clipped (max channel ≥ 250) ≤ 2 %
//   sign    = the DINER neon sign's letter cap height (visible plate height × capH / plate height) / frame height ≥ 3 % (diner)
//   beam    = the duck beam is hidden in cityDay2 (and shown in cityDusk / cityNight in the tod pass)
import {mkdirSync, writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {PLAN, keyArt, keyArtGroup, STAGING, ANCHOR_NAMES} from '../../parts/city/plan.js';
import {measure, verdict, GROUND_MAX, FG, castFor, specFor} from './city1e-measure.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'renders/city1e'), REV = arg('review', 'review/city'), GATE = Object.values(PLAN.gate1e);
const ROWS = arg('rows', null)?.split(',') ?? ANCHOR_NAMES, LOOKS = ['cityDay2', 'cityGoldenHour', 'cityDusk', 'cityNight'], TOD_ROW = 'bayNorth';
mkdirSync('engine/fixtures/city', {recursive: true});
writeFileSync('engine/fixtures/city/gate1e.json', JSON.stringify(specFor(ROWS, 'cityDay2'), null, 1) + '\n');
for (const L of LOOKS.slice(1)) writeFileSync(`engine/fixtures/city/gate1e-${L}.json`, JSON.stringify(specFor([TOD_ROW], L), null, 1) + '\n');
if (argv.includes('--specs-only')) process.exit(0);

const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
for (const d of ['all', 'phone', 'bench', 'tod']) mkdirSync(`${OUT}/${d}`, {recursive: true}); mkdirSync(REV, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch();
// raw RGBA (bottom-up rows, as read from a render target) → PNG (top-down), unpremultiplied (the dilated colour under alpha 0 survives)
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const h = Buffer.alloc(8); h.writeUInt32BE(d.length); h.write(t, 4); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([Buffer.from(t), d]))); return Buffer.concat([h, d, c]); };
const png = (w, h, px) => { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, (h - 1 - y) * w * 4, (h - y) * w * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); };
async function cacheImpostors(p) {   // Phase 1E: freshly baked impostor atlases → renders/cache/assets/impostors/ (+ manifest), reused by the next page load
  const at = await p.evaluate(() => { const A = window.__impostorAtlases ?? {}, S = window.__episode.world?.stats?.trees4?.species ?? {}, b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
    return Object.fromEntries(Object.entries(A).filter(([, a]) => a.baked).map(([k, a]) => [k, {w: a.w, h: a.h, views: a.views, half: a.half, height: a.height, source: S[k]?.source, color: b64(a.colorPx), normal: b64(a.normalPx)}])); });
  if (!Object.keys(at).length) return null; const dir = 'renders/cache/assets/impostors'; mkdirSync(dir, {recursive: true}); const man = {};
  for (const [k, a] of Object.entries(at)) { const tag = `${k}-${(a.source ?? 'x').replace(/[^a-z0-9_]+/gi, '_')}`;
    writeFileSync(`${dir}/${tag}-color.png`, png(a.w, a.h, Buffer.from(a.color, 'base64'))); writeFileSync(`${dir}/${tag}-normal.png`, png(a.w, a.h, Buffer.from(a.normal, 'base64')));
    man[k] = {source: a.source, views: a.views, half: a.half, height: a.height, w: a.w, h: a.h, color: `${tag}-color.png`, normal: `${tag}-normal.png`}; }
  writeFileSync(`${dir}/manifest.json`, JSON.stringify(man, null, 1)); return Object.keys(man); }
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = {rule: `staging (1D) + ground ≤ ${GROUND_MAX} of the frame (up-facing surfaces) + fg on a frame edge, ${FG.min * 100}–${FG.max * 100} % of the width, never in the middle third; planks luma ≥ .40 (harborDock, beach); statue gold hue 35–55°, sat ≥ .45, clipped ≤ 2 % (plazaWide); DINER sign ≥ 3 % of the frame height; duck beam hidden in cityDay2; bench (gate rows, 720 × 1280, look B) ≤ 90k tris, ≤ 0.62 s/frame`,
  staging: STAGING, rows: {}, tod: {}};

async function openPage(spec) {
  const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.error('console', m.text().slice(0, 300)); });
  await p.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 900000}); return p;
}
try {
  if (!argv.includes('--tod-only')) {
    const {T0} = castFor(ROWS), p = await openPage('engine/fixtures/city/gate1e.json');
    out.textures = await p.evaluate(() => { const s = new Set(); window.__episode.debug.scene.traverse(o => { if (o.isMesh) for (const m of [o.material].flat()) if (m?.userData?.source) s.add(m.userData.source); }); return [...s].sort(); });
    out.trees = await p.evaluate(() => window.__episode.world?.stats?.trees4 ?? null); out.impostorCache = argv.includes('--cache-impostors') ? await cacheImpostors(p) : null;
    for (const r of ROWS) {
      const k = keyArt(r), gate = GATE.includes(r), res = await measure(p, r, T0[r] + .5, 'cityDay2', {gate, bench: !argv.includes('--no-bench')});
      save(`${OUT}/all/${r}.png`, res.small); if (res.phone) save(`${OUT}/phone/${r}.png`, res.phone); if (res.big) save(`${OUT}/bench/${r}.png`, res.big);
      const row = {gate, ...verdict(r, k, res)};
      if (res.bench) { const b = res.bench, mc = median(b.tm) / 1000; row.bench = {tris: b.tris, calls: b.calls, sPerFrame: +mc.toFixed(3), pass: b.tris <= 90000 && mc <= .62}; }
      out.rows[r] = row; console.log(r, JSON.stringify(row));
    }
    await p.close();
  }
  if (!argv.includes('--no-tod')) for (const L of LOOKS) {
    const p = await openPage(L === 'cityDay2' ? 'engine/fixtures/city/gate1e.json' : `engine/fixtures/city/gate1e-${L}.json`), t = (L === 'cityDay2' ? castFor(ROWS).T0[TOD_ROW] : 0) + .5;
    const res = await measure(p, TOD_ROW, t, L, {gate: true, bench: false, small: false}); save(`${OUT}/tod/${L}.png`, res.phone);
    const night = await p.evaluate(() => { const s = window.__episode.debug.scene; let halos = 0, stars = false; s.traverse(o => { if (o.name === 'lampHalo') halos++; if (o.name === 'stars') stars = true; }); return {halos, stars, blimpLit: !!s.getObjectByName('blimpBulbs')}; });
    out.tod[L] = {beam: res.beam, ...night, ground: +res.ground.toFixed(3)}; console.log('tod', L, JSON.stringify(out.tod[L])); await p.close();
  }
  const R = Object.values(out.rows);
  if (R.length) { out.pass = {staging: R.every(x => x.checks.heroH && x.checks.landmark && x.checks.kids), sightlines: R.every(x => x.checks.sightlines), movers: R.every(x => x.checks.movers),
      ground: R.every(x => x.checks.ground), fg: R.every(x => x.checks.fg), planks: R.every(x => x.checks.planks), gold: R.every(x => x.checks.gold), sign: R.every(x => x.checks.sign), beamDay: R.every(x => x.checks.beam),
      bench: R.filter(x => x.bench).every(x => x.bench.pass)};
    out.fails = Object.entries(out.rows).filter(([, x]) => !x.pass).map(([n, x]) => n + ': ' + Object.entries(x.checks).filter(([, v]) => !v).map(([c]) => c).join('+')); }
  if (Object.keys(out.tod).length) out.pass = {...out.pass, beamTod: out.tod.cityDay2?.beam === false && out.tod.cityDusk?.beam === true && out.tod.cityNight?.beam === true};
  writeFileSync(`${REV}/1E-measures.json`, JSON.stringify(out, null, 1) + '\n'); console.log('PASS', JSON.stringify(out.pass), 'FAILS', JSON.stringify(out.fails));
} finally { await browser.close(); server.close?.(); }
