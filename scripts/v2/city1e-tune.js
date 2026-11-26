// scripts/v2/city1e-tune.js — Phase 1E data tuner (writes plan.json key-art DATA only, never code): for every key-art anchor
//   1. foreground/edge element distance `d` so its column coverage lands at ~10 % of the frame width (rule: 5–15 %, on an edge, never in
//      the middle third) — lamps, pickets, fences, pilings, signposts (perspective: width ∝ 1/d, a few reload passes);
//   2. pitch (+ up) so the up-facing ground ≤ target (default .22 < the .25 rule) while the hero stays ≤ maxHeroH, the landmark visible and
//      both kids beside + unoccluded (in-page camera only: the cast and props do not depend on pitch).
//   node scripts/v2/city1e-tune.js [--rows a,b] [--passes 3] [--ground .22] [--no-fg] [--no-pitch] [--dry]
import {readFileSync, writeFileSync} from 'node:fs';
import {PLAN, keyArt, ANCHOR_NAMES, STAGING} from '../../parts/city/plan.js';
import {measure, verdict, specFor, castFor} from './city1e-measure.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ROWS = arg('rows', null)?.split(',') ?? ANCHOR_NAMES, PASSES = +arg('passes', 3), GT = +arg('ground', .22), DRY = argv.includes('--dry');
const SPEC = 'engine/fixtures/city/tune1e.json', PJ = 'parts/city/plan.json';
// JSON like Python's json.dumps (", " and ": " separators, unicode kept): plan.json lines stay in the file's own style
const pyDumps = v => Array.isArray(v) ? '[' + v.map(pyDumps).join(', ') + ']' : v && typeof v === 'object' ? '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pyDumps(x)).join(', ') + '}' : typeof v === 'number' && Number.isInteger(v) && String(v).indexOf('.') < 0 && /\.0$/.test(String(v)) ? String(v) : JSON.stringify(v);
// rewrite one anchor's keyArt in plan.json (one line per anchor in the file; everything else byte-identical)
const saveKA = names => { if (DRY) return; let s = readFileSync(PJ, 'utf8');
  const i0 = s.indexOf('\n  "anchors": {'); if (i0 < 0) throw Error('no anchors block'); const head = s.slice(0, i0); let body = s.slice(i0);   // only inside the anchors block (a road shares a name)
  for (const n of names) { const a = PLAN.anchors[n], re = new RegExp(`(\\n    "${n}": )\\{.*\\}(,?\\n)`); if (!re.test(body)) throw Error('anchor line not found ' + n); body = body.replace(re, (m, p1, p2) => p1 + pyDumps(a) + p2); }
  s = head + body; JSON.parse(s); writeFileSync(PJ, s); };
const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
const server = await startServer(process.cwd()), browser = await launch(), log = {};
const open = async () => { writeFileSync(SPEC, JSON.stringify(specFor(ROWS, 'cityDay2'), null, 1) + '\n'); const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(SPEC)}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 900000}); return p; };
const DMAX = r => ['bayNorth', 'plazaWide', 'mainSt', 'heroHouse'].includes(r) ? 5.95 : 12;   // looksig test: the 4 Look Signature cameras keep their foreground ≤ 6 studs from the lens
const {T0} = castFor(ROWS), FGK = ['lamp', 'picket', 'fence', 'piling', 'signpost'];
try {
  if (!argv.includes('--no-fg')) for (let pass = 0; pass < PASSES; pass++) {
    const p = await open(); const changed = [];
    for (const r of ROWS) { const K = PLAN.anchors[r].keyArt, el = K.edge ?? (FGK.includes(K.fg?.kind) ? K.fg : null); if (!el) continue;
      const res = await measure(p, r, T0[r] + .5, 'cityDay2', {gate: false, bench: false, small: false}), f = res.fg; if (!f) continue;
      const ok = !f.middle && (f.x0 <= .01 || f.x1 >= .99) && f.width >= .07 && f.width <= .13; (log[r] ??= {}).fg = {pass, width: f.width, d: el.d, x: el.x}; if (ok) continue;
      // slide toward the edge first (screen x, NDC: 2 per frame width), keep d ≤ 6 (Look Signature: the foreground is close to the lens); only then move it away
      const sg = Math.sign(el.x ?? -.9), ax = Math.abs(el.x ?? .9);
      if (f.width > .13 || f.middle) { const nx = Math.min(1.1, ax + (f.width - .1) * 1.6); if (nx > ax + .005) el.x = +(sg * nx).toFixed(3); else el.d = +Math.min(DMAX(r), (el.d ?? 5) * 1.25).toFixed(2); }
      else if (f.width < .07) el.x = +(sg * Math.max(.6, ax - (.1 - f.width) * 1.6)).toFixed(3);
      if (!(f.x0 <= .01 || f.x1 >= .99)) el.x = +(sg * Math.min(1.1, Math.abs(el.x) + .05)).toFixed(3);
      changed.push(r); console.log('fg', pass, r, JSON.stringify(f), '→ d', el.d, 'x', el.x); }
    await p.close(); if (!changed.length) break; saveKA(changed);
  }
  if (!argv.includes('--no-pitch')) {
    const p = await open(), changed = [];
    for (const r of ROWS) { const K = PLAN.anchors[r].keyArt, p0 = K.pitch ?? 8; let best = null;
      for (let dp = 0; dp <= 16; dp += 2) { K.pitch = p0 + dp; const k = keyArt(r), res = await measure(p, r, T0[r] + .5, 'cityDay2', {gate: false, bench: false, small: false, cam: {position: k.position, target: k.target, fov: k.fov, shadowRadius: 30}}), v = verdict(r, k, res);
        const keep = v.checks.heroH && v.checks.landmark && v.checks.kids; if (dp === 0) (log[r] ??= {}).pitch0 = {pitch: p0, ground: v.ground, keep};
        if (v.ground <= GT && keep) { best = {pitch: p0 + dp, ground: v.ground}; break; } if (!keep && dp > 0) break; }
      K.pitch = best ? best.pitch : p0; log[r].pitch = best ?? {pitch: p0, ground: log[r].pitch0.ground, unresolved: true}; if (best && best.pitch !== p0) changed.push(r); console.log('pitch', r, JSON.stringify(log[r])); }
    await p.close(); saveKA(changed);
  }
  writeFileSync('/tmp/city1e-tune.json', JSON.stringify(log, null, 1)); console.log('done', JSON.stringify(Object.fromEntries(Object.entries(log).map(([k, v]) => [k, {fg: v.fg?.width, pitch: v.pitch?.pitch, ground: v.pitch?.ground, un: v.pitch?.unresolved}]))));
} finally { await browser.close(); server.close?.(); }
void STAGING;
