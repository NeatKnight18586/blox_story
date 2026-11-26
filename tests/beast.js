// tests/beast.js — tuft 2A BEAST KIT pure gates (node; engine/beast.js + beasts/*.json + engine/fixtures/beasts/flee.json).
//   tris per tier (hero ≤ 6k, low ≤ 800) · glow colours clear of Tuft's blue-gold · states deterministic (any sample order) ·
//   feet planted (ground states: lowest vertex ≤ 0.02 above the ground; every state and transition ≥ 0) · flee leaves the frame
//   within FLEE_DUR along the exit direction · silhouettes distinct at phone size (pairwise IoU of normalised silhouettes ≤ 0.6) ·
//   scale vs an R6 kid · `beast:` vocab · crowd determinism. Writes review/beasts/tests.json.
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync} from 'node:fs';
import * as B from '../engine/beast.js';
import {layoutShots} from '../engine/timeline.js';

const res = [], ok = (name, pass, line, data = {}) => { res.push({name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const L = n => JSON.parse(readFileSync(`beasts/${n}.json`, 'utf8'));
const HERO = ['NIGHTFANG', 'VOLT', 'CINDER', 'BOULDER'], LOW = ['FOX', 'DEER', 'BOAR'], ALL = [...HERO, ...LOW], P = Object.fromEntries([...ALL, 'BLINK'].map(n => [n, L(n)]));
const G = Object.fromEntries(ALL.map(n => [n, B.buildGeometry(P[n], 'hero')]));

// 1. tris per tier
{ const t = Object.fromEntries(ALL.map(n => [n, {hero: B.beastTris(P[n], 'hero'), low: B.beastTris(P[n], 'low')}]));
  const mh = Math.max(...ALL.map(n => t[n].hero)), ml = Math.max(...ALL.map(n => t[n].low));
  ok('tris per tier', mh <= B.TIER_MAX.hero && ml <= B.TIER_MAX.low, `hero max ${mh} ≤ 6000, low max ${ml} ≤ 800 (${ALL.map(n => `${n} ${t[n].hero}/${t[n].low}`).join(', ')})`, {tris: t}); }
// 2. preset rules
{ const e = [...ALL, 'BLINK'].flatMap(n => B.presetErrors(P[n])), cols = [...ALL, 'BLINK'].map(n => P[n].glow), uniq = new Set(cols).size === cols.length;
  const dmin = Math.min(...[...ALL, 'BLINK'].flatMap(n => B.RESERVED_GLOW.map(r => B.rgbDist(P[n].glow, r))));
  ok('one own glow colour per beast, none on Tuft blue-gold', !e.length && uniq, `${e.length} errors; ${new Set(cols).size}/${cols.length} distinct; min RGB distance to #7FB8FF/#FFD36B ${dmin.toFixed(0)} ≥ 60`); }
// 3. determinism (same t → same bytes, independent of sample order)
{ const tr = [{t: 0, state: 'idle'}, {t: 1, state: 'run', to: [0, 9]}, {t: 2.4, state: 'roar'}, {t: 3.6, state: 'flinch'}, {t: 4.3, state: 'flee', exit: [1, 0]}];
  let bad = 0, n = 0; for (const name of HERO) { const ts = Array.from({length: 60}, (_, i) => i * .1), a = ts.map(t => JSON.stringify(B.segRows(B.sampleBeast(P[name], tr, t, {geo: G[name], seed: 5}))));
    const b = [...ts].reverse().map(t => JSON.stringify(B.segRows(B.sampleBeast(P[name], tr, t, {geo: G[name], seed: 5})))).reverse(); a.forEach((x, i) => { n++; if (x !== b[i]) bad++; }); }
  ok('states deterministic', bad === 0, `${n - bad}/${n} samples identical in forward / reverse order`); }
// 4. feet planted
{ let worst = 0, minLow = Infinity, nG = 0; const per = {};
  for (const name of [...HERO, ...LOW]) { const Pn = P[name], sup = B.supportPoints(G[name]);
    for (const st of B.STATES) { const air = st === 'fly' || (Pn.rig === 'bird' && st === 'flee');
      for (let t = 0; t <= 4; t += 1 / 24) { const s = B.sampleBeast(Pn, [{t: 0, state: 'idle'}, {t: .5, state: st}], t, {geo: G[name], support: sup, seed: 3});
        minLow = Math.min(minLow, s.lowest); if (!air && t >= .5 + 1.0) { nG++; worst = Math.max(worst, s.lowest); per[name] = Math.max(per[name] ?? 0, s.lowest); } } } }
  // every state after every other (transitions incl. landing), lowest ≥ 0
  for (const name of HERO) for (const a of B.STATES) for (const b of B.STATES) for (const t of [.55, .7, 1.0, 1.4]) minLow = Math.min(minLow, B.sampleBeast(P[name], [{t: 0, state: a}, {t: .5, state: b}], t, {geo: G[name]}).lowest);
  ok('feet planted', worst <= .02 && minLow >= -1e-6, `ground states: lowest vertex max ${worst.toFixed(4)} ≤ 0.02 above ground (${nG} samples); all states + transitions min ${minLow.toFixed(4)} ≥ 0`, {perPreset: per}); }
// 5. flee leaves the frame within its state duration, along the exit direction
{ const spec = JSON.parse(readFileSync('engine/fixtures/beasts/flee.json', 'utf8')), shots = layoutShots(spec), FPS = spec.fps, D = Math.PI / 180, rows = [];
  for (const sh of shots) { const e = sh.beasts[0], c = spec.cast[e.actor], Pn = P[c.preset], cam = sh.from, dir = B.exitDir(sh.exit, cam), t0 = sh.start / FPS + e.at, start = {p: [c.offset[0], c.offset[2]], yaw: c.yaw * D};
    const tr = [{t: 0, state: 'idle'}, {t: t0, state: 'flee', exit: dir}], proj = projector(cam, 9 / 16);
    let leftAt = null; for (let t = t0; t <= t0 + B.FLEE_DUR + 1e-9; t += 1 / FPS) { const s = B.sampleBeast(Pn, tr, t, {geo: G[c.preset], start}), v = B.worldVerts(s, G[c.preset]);
      let inside = false; for (let i = 0; i < v.length && !inside; i += 3) { const p = proj([v[i], v[i + 1], v[i + 2]]); if (p && Math.abs(p[0]) <= 1 && Math.abs(p[1]) <= 1) inside = true; }
      if (!inside) { leftAt = t - t0; break; } }
    const a = B.sampleBeast(Pn, tr, t0, {geo: G[c.preset], start}).root.p, b = B.sampleBeast(Pn, tr, t0 + B.FLEE_DUR, {geo: G[c.preset], start}).root.p, dx = b[0] - a[0], dz = b[2] - a[2], al = (dx * dir[0] + dz * dir[1]) / Math.hypot(dx, dz);
    rows.push({beast: c.preset, leftAt, along: +al.toFixed(3)}); }
  ok('flee leaves the frame along the exit', rows.every(r => r.leftAt !== null && r.leftAt <= B.FLEE_DUR && r.along >= .9), rows.map(r => `${r.beast} out at ${r.leftAt === null ? 'never' : r.leftAt.toFixed(2) + ' s'} (≤ ${B.FLEE_DUR}), cos ${r.along}`).join('; '), {rows}); }
function projector(cam, aspect) { const f = norm(sub3(cam.target, cam.position)), r = norm(cross3(f, [0, 1, 0])), u = cross3(r, f), k = 1 / Math.tan(cam.fov * Math.PI / 360);
  return p => { const d = sub3(p, cam.position), z = dot3(d, f); if (z <= .05) return null; return [dot3(d, r) / z * k / aspect, dot3(d, u) / z * k]; }; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; } function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; } function norm(a) { const l = Math.hypot(...a); return a.map(v => v / l); }
// 6. silhouettes at phone size: idle, side ¾ view (60° off the nose, orthographic), rasterised with the beast's long side = 300 px
//    (its size in a 390 px phone frame), then normalised (bbox → 96 × 96, aspect kept, centred); pairwise IoU ≤ 0.6
{ const N = 96, sil = {}, a = -60 * Math.PI / 180, rx = [Math.cos(a), 0, -Math.sin(a)];
  for (const name of HERO) { const s = B.sampleBeast(P[name], [{t: 0, state: P[name].rig === 'bird' ? 'perch' : 'idle'}], 1, {geo: G[name]}), v = B.worldVerts(s, G[name]), pts = [];
    for (let i = 0; i < v.length; i += 3) pts.push([v[i] * rx[0] + v[i + 2] * rx[2], v[i + 1]]);
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1])), S = 300 / Math.max(x1 - x0, y1 - y0);
    const W = Math.ceil((x1 - x0) * S) + 1, H = Math.ceil((y1 - y0) * S) + 1, img = new Uint8Array(W * H), px = pts.map(([x, y]) => [(x - x0) * S, (y1 - y) * S]);
    for (let i = 0; i < px.length; i += 3) raster(img, W, H, px[i], px[i + 1], px[i + 2]);
    const m = new Float32Array(N * N), k = N / Math.max(W, H), ox = (N - W * k) / 2, oy = (N - H * k) / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img[y * W + x]) { const X = Math.floor(ox + x * k), Y = Math.floor(oy + y * k); m[Y * N + X] += 1; }
    const cell = 1 / (k * k); sil[name] = Uint8Array.from(m, c => c >= cell * .5 ? 1 : 0); }
  const pairs = []; for (let i = 0; i < HERO.length; i++) for (let j = i + 1; j < HERO.length; j++) { const A = sil[HERO[i]], Bm = sil[HERO[j]]; let I = 0, U = 0; for (let q = 0; q < A.length; q++) { I += A[q] & Bm[q]; U += A[q] | Bm[q]; } pairs.push([HERO[i], HERO[j], +(I / U).toFixed(3)]); }
  const mx = Math.max(...pairs.map(p => p[2])); ok('silhouettes distinct at phone width', mx <= .6, `max pairwise IoU ${mx.toFixed(3)} ≤ 0.6 (${pairs.map(p => `${p[0][0]}${p[1][0]} ${p[2]}`).join(', ')})`, {pairs}); }
function raster(img, W, H, a, b, c) { const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
  const e = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]), ar = e(a, b, c[0], c[1]); if (Math.abs(ar) < 1e-9) return;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const X = x + .5, Y = y + .5, w0 = e(b, c, X, Y) / ar, w1 = e(c, a, X, Y) / ar, w2 = e(a, b, X, Y) / ar; if (w0 >= 0 && w1 >= 0 && w2 >= 0) img[y * W + x] = 1; } }
// 7. scale against an R6 kid (LEAD .82 = 4.35 studs; shoulder .755 of the height)
{ const sh = (name, st, t) => { const Pn = P[name], k = Pn.scale ?? 1, s = B.sampleBeast(Pn, [{t: 0, state: st}], t, {geo: G[name]}); return {s, wither: B.worldOf(s, 'body', [0, Pn.dims.bodyH / 2 * k, Pn.dims.bodyL * .3 * k])[1]}; };
  const top = (name, st) => { const s = sh(name, st, 1).s, v = B.worldVerts(s, G[name]); let y = 0; for (let i = 1; i < v.length; i += 3) y = Math.max(y, v[i]); return y; };
  let span = 0; for (let t = 1; t < 2; t += 1 / 48) { const v = B.worldVerts(B.sampleBeast(P.CINDER, [{t: 0, state: 'fly'}], t, {geo: G.CINDER}), G.CINDER); let a = 1e9, b = -1e9; for (let i = 0; i < v.length; i += 3) { a = Math.min(a, v[i]); b = Math.max(b, v[i]); } span = Math.max(span, b - a); }
  const nf = sh('NIGHTFANG', 'roar', 2).wither / B.KID_H, vo = sh('VOLT', 'idle', 1).wither / (B.KID_H * .755), ci = span / B.KID_H, bo = top('BOULDER', 'idle') / B.ADULT_H;
  ok('scale vs the R6 kid', nf >= 2.0 && nf <= 2.4 && vo >= .85 && vo <= 1.15 && ci >= 2.25 && ci <= 2.75 && bo > 1, `NIGHTFANG reared shoulder ${nf.toFixed(2)}× kid height (2.0–2.4) · VOLT shoulder ${vo.toFixed(2)}× kid shoulder (.85–1.15) · CINDER wingspan ${ci.toFixed(2)} kids (2.25–2.75) · BOULDER top ${bo.toFixed(2)}× adult (> 1)`, {nf, vo, ci, bo}); }
// 8. vocab + exits
{ let e = 0; const good = [['nightfang roar', {actor: 'nightfang', state: 'roar'}], ['volt run to gate', {actor: 'volt', state: 'run', to: 'gate'}], ['cinder fly to roof', {actor: 'cinder', state: 'fly', to: 'roof'}]];
  for (const [s, want] of good) if (JSON.stringify(B.parseBeast(s)) !== JSON.stringify(want)) e++;
  for (const s of ['nightfang dance', 'volt run gate', '9x roar', 'volt run to']) { try { B.parseBeast(s); e++; } catch { /* expected */ } }
  const cam = {position: [0, 2, 10], target: [0, 2, 0]}, r = B.exitDir('right', cam), l = B.exitDir('left', cam), aw = B.exitDir('away', cam);
  if (!(r[0] > .99 && l[0] < -.99 && aw[1] < -.99)) e++;
  ok('`beast:` vocab + exit directions', e === 0, `${3 + 4} parse cases + right/left/away on a camera looking −z: ${e} wrong`); }
// 9. crowd determinism + ground
{ const cfg = {presets: LOW, n: 40, at: [0, 0], dir: [0, 1], length: 70, width: 6, state: 'walk', seed: 11}, ms = B.crowdMembers(cfg), ms2 = B.crowdMembers(cfg); let same = JSON.stringify(ms) === JSON.stringify(ms2), lo = 0;
  const g = Object.fromEntries(LOW.map(n => [n, B.buildGeometry(P[n], 'low')])), sp = Object.fromEntries(LOW.map(n => [n, B.supportPoints(g[n])]));
  for (const m of ms) for (const t of [0, 1.3, 2.7]) { const a = B.sampleCrowdMember(P[m.preset], g[m.preset], sp[m.preset], cfg, m, t), b = B.sampleCrowdMember(P[m.preset], g[m.preset], sp[m.preset], cfg, m, t); if (JSON.stringify(B.segRows(a)) !== JSON.stringify(B.segRows(b))) same = false;
    const v = B.worldVerts(a, g[m.preset]); let y = 1e9; for (let i = 1; i < v.length; i += 3) y = Math.min(y, v[i]); lo = Math.max(lo, Math.abs(y)); }
  ok('low-tier crowd deterministic + planted', same && lo <= .02, `40 members × 3 t identical; |lowest − ground| max ${lo.toFixed(4)}; presets ${[...new Set(ms.map(m => m.preset))].join('/')}`); }

// 10. brief2spec: CAST `- volt: beast VOLT` + notes `beast: volt roar @ pink` / `beast: volt run to towerBase @ help` → shot.beasts
{ const {execFileSync} = await import('node:child_process'), {tmpdir} = await import('node:os'), dir = mkdtempSync(tmpdir() + '/beast-'), br = readFileSync('stories/_fixture_e2/BRIEF.md', 'utf8')
    .replace('- dummyB → DUMMY · at -6 -4 · yaw 20', '- dummyB → DUMMY · at -6 -4 · yaw 20\n- volt: beast VOLT · at 6 10 · yaw 180').replace('spawn: bitsy @ spawned;', 'spawn: bitsy @ spawned; beast: volt roar @ pink;').replace('crowd: dummies 40 run to towerBase @ ran;', 'crowd: dummies 40 run to towerBase @ ran; beast: volt run to towerBase @ help;');
  writeFileSync(dir + '/BRIEF.md', br); let spec = null, err = '';
  try { execFileSync('node', ['scripts/v2/brief2spec.js', '--story', '_fixture_e2', '--brief', dir + '/BRIEF.md', '--out', dir + '/spec.json'], {stdio: 'pipe'}); spec = JSON.parse(readFileSync(dir + '/spec.json', 'utf8')); } catch (e) { err = String(e.stderr ?? e).slice(0, 200); }
  const bs = spec ? spec.shots.flatMap(s => s.beasts ?? []) : [], good = spec?.cast?.volt?.style === 'beast' && spec.cast.volt.preset === 'VOLT' && bs.length === 2 && bs[0].state === 'roar' && bs[1].state === 'run' && bs[1].to === 'towerBase' && bs.every(b => b.at > 0);
  ok('brief2spec `beast:` → shot.beasts', good, spec ? `cast volt ${JSON.stringify(spec.cast.volt)}; beasts ${JSON.stringify(bs)}` : 'brief2spec failed: ' + err); }

mkdirSync('review/beasts', {recursive: true}); writeFileSync('review/beasts/tests.json', JSON.stringify(res, null, 1));
const fails = res.filter(r => !r.pass).length; console.log(`${res.length - fails}/${res.length} pass`); process.exit(fails ? 1 : 0);
