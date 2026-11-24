// tests/cine.js — tuft 1B gates for the cinematic camera (engine/cine.js, pure) + R6 props in the hands (node-only; the
// stability gate spawns `npm run v2:stability` once on engine/fixtures/cine/episode.json):  node tests/cine.js [--no-render]
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as C from '../engine/cine.js';
import {MOVES} from '../engine/camera.js';
import * as A from '../engine/acting6.js';
import * as R from '../engine/r6.js';

const gates = [], gate = (name, pass, line) => { gates.push({name, pass, line}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const FPS = 24, ASPECT = 9 / 16, MOODS = ['tension', 'emotion', 'awe', 'comedy', 'fun', 'payoff', null];
const walker = tt => ({hero: [-3 + 1.5 * tt, 0, 0], kid: [2, 0, 1]});
const ctxOf = (key, extra = {}) => ({fps: FPS, aspect: ASPECT, actorsAt: walker, eyesAt: tt => { const p = walker(tt).hero; return [p[0], 4.55, p[2]]; }, faceAt: () => [1, 0], headH: 1.2, cacheKey: key, ...extra});
const base = {from: {position: [0, 4, 14], target: [0, 3, 0], fov: 40}, to: {position: [2, 5, 10], target: [0, 3, 0], fov: 40}, duration: 2.5, size: 'ms', subject: 'hero'};
const shotFor = move => ({...base, move, id: 'T-' + move,
  ...(move === 'track' || move === 'gamecam' ? {follow: 'hero', from: {position: [0, 3, 10], target: [0, 3, 0], fov: 40}, to: {position: [1, 3.5, 9], target: [0, 3, 0], fov: 40}} : {}),
  ...(move === 'whip' ? {to: {position: [0, 4, 14], target: [14, 3, 4], fov: 40}} : {}),
  ...(move === 'drone' ? {path: [[-20, 18, 30], [0, 22, 20], [20, 18, 30]], targets: [[0, 2, 0], [0, 2, 0]], duration: 4} : {}),
  ...(move === 'snap' ? {snapAt: 1, to: {position: [0, 4, 6], target: [0, 3, 0], fov: 40}} : {}),
  ...(move === 'crashZoom' ? {zoomAt: 1, to: {fov: 20}} : {}),
  ...(move === 'splitScreen' ? {a: {from: base.from}, b: {from: base.to}} : {}),
  ...(move === 'heroLow' ? {from: {position: [0, .8, 8], target: [0, 4, 0], fov: 64}, to: {position: [0, .9, 7], target: [0, 4, 0], fov: 64}} : {}),
  ...(['lowWide', 'scaleReveal', 'povScope'].includes(move) ? {actor: 'hero'} : {}),
  ...(move === 'dollyZoom' ? {from: {position: [0, 4.4, 9], target: [0, 4.4, 0], fov: 50}, to: {position: [0, 4.4, 4.5]}, duration: 2.5, size: 'cu'} : {})});

// 1. determinism: same input = same output, with and without the resume cache, across two runs
{ const s = {...shotFor('push'), mood: 'tension', ramp: [{at: .5, speed: .4}], fg: 'lantern'}; const a = [], b = [], c = [];
  for (let f = 0; f < 60; f++) { a.push(JSON.stringify(C.sampleCine(s, f / FPS, ctxOf('det')))); }
  C.clearCache(); for (let f = 59; f >= 0; f--) b.unshift(JSON.stringify(C.sampleCine(s, f / FPS, ctxOf(null))));
  for (let f = 0; f < 60; f++) c.push(JSON.stringify(C.sampleCine(s, f / FPS, ctxOf('det2'))));
  const same = a.every((x, i) => x === b[i] && x === c[i]);
  gate('determinism (same input = same output; cached = uncached)', same, `${a.filter((x, i) => x === b[i] && x === c[i]).length}/60 frames identical`); }

// 2. caps over all MOVES × moods: jerk, acceleration, speed, angular speed
{ let worst = {jerk: 0, accel: 0, speed: 0, angSpeed: 0, angSpeedHandheld: 0}, at = {}, n = 0; const skipped = [];
  for (const mv of MOVES) for (const md of MOODS) { const s = {...shotFor(mv), mood: md ?? undefined}, st = C.motionStats(s, (s.duration ?? 2.5) + 1, ctxOf(`cap-${mv}-${md}`), FPS);
    if (!st) { if (!skipped.includes(mv)) skipped.push(mv); continue; } n++;
    for (const k of Object.keys(worst)) if (st[k] > worst[k]) { worst[k] = st[k]; at[k] = `${mv}/${md ?? '-'}`; } }
  gate(`caps over ${n} MOVES × moods (jerk ≤ ${C.CAPS.jerk}, accel ≤ ${C.CAPS.accel}, speed ≤ ${C.CAPS.speed} u/s, view ≤ ${C.CAPS.angSpeed}°/s)`,
    [['jerk', 'jerk'], ['accel', 'accel'], ['speed', 'speed'], ['angSpeed', 'angSpeed']].every(([k, c]) => worst[k] <= C.CAPS[c] * (1 + 1e-9)),
    `jerk ${worst.jerk.toFixed(1)} (${at.jerk}), accel ${worst.accel.toFixed(2)} (${at.accel}), speed ${worst.speed.toFixed(2)} (${at.speed}), aim ${worst.angSpeed.toFixed(1)}°/s (${at.angSpeed}), with handheld ${worst.angSpeedHandheld.toFixed(1)}°/s; n/a: ${skipped.join(', ') || 'none'} (two cameras)`); }

// 3. dolly zoom: the subject's projected height stays within ± 3 % over the whole move (handheld included: rotation only)
{ const s = {...shotFor('dollyZoom'), mood: 'tension'}, H = 1.2, P = [0, 4.4, 0]; const fr = [];
  for (let f = 0; f <= 3 * FPS; f++) fr.push(C.sizeFrac(C.sampleCine(s, f / FPS, ctxOf('dz')), P, H));
  const dev = Math.max(...fr.map(x => Math.abs(x / fr[0] - 1))), f0 = C.sampleCine(s, 0, ctxOf('dz')).fov, f1 = C.sampleCine(s, 3, ctxOf('dz')).fov;
  gate('dollyZoom: subject size ± 3 %', dev <= .03, `max deviation ${(dev * 100).toFixed(2)} %, fov ${f0.toFixed(1)}° → ${f1.toFixed(1)}° (background ×${(Math.tan(f1 * Math.PI / 360) / Math.tan(f0 * Math.PI / 360)).toFixed(2)})`); }

// 4. pre-roll: frame 0 is settled (velocity state and the frame 0→1 step) for every move × mood
{ const SETTLE = .05; let worst = 0, at = '', offMax = 0, stepMax = 0;
  for (const mv of MOVES) for (const md of MOODS) { const s = {...shotFor(mv), mood: md ?? undefined}, a = C.sampleCine(s, 0, ctxOf(null)), b = C.sampleCine(s, 1 / FPS, ctxOf(null)); if (a.split) continue;
    const v = Math.hypot(...a.velocity), g = C.idealAt(s, 0, ctxOf(null)), off = Math.hypot(...a.position.map((x, i) => x - g.position[i])), step = Math.hypot(...b.position.map((x, i) => x - a.position[i])) * FPS;
    if (v > worst) { worst = v; at = `${mv}/${md ?? '-'}`; } offMax = Math.max(offMax, off); stepMax = Math.max(stepMax, step); }
  gate(`pre-roll: frame-0 velocity ≤ ${SETTLE} u/s, frame 0 on its ideal pose`, worst <= SETTLE && offMax <= 1e-3, `velocity at frame 0 max ${worst.toFixed(4)} u/s (${at}); frame-0 offset from the ideal ${(offMax * 1000).toFixed(2)} mm; first-frame step ≤ ${stepMax.toFixed(3)} u/s (the move itself starting)`); }

// 5. framing: CU / MCU test shots — eyes within ± 4 % of the upper-third line, faces never inside the caption band (58–74 %)
{ let eyeErr = 0, faceIn = 0, n = 0, rows = [];
  for (const size of ['mcu', 'cu', 'ecu']) for (const [i, from] of [[0, [0, 4.6, 7]], [1, [3, 3.2, 6]], [2, [-2, 6.5, 5]], [3, [1, 4.6, 3.2]]]) {
    const s = {id: `F-${size}-${i}`, move: 'static-drift', size, subject: 'hero', from: {position: from, target: [0, 4.2, 0], fov: 40}, duration: 2, mood: 'emotion'};
    const ctx = {fps: FPS, aspect: ASPECT, actorsAt: () => ({hero: [0, 0, 0]}), eyesAt: () => [0, 4.55, 0], faceAt: () => [i % 2 ? -1 : 1, 0], headH: 1.2, cacheKey: s.id};
    for (const t of [0, .5, 1, 1.5, 2]) { const c = C.sampleCine(s, t, ctx), noNoise = C.project(c, [0, 4.55, 0], ASPECT), top = (1 - noNoise.y) / 2, hf = 1.2 / (2 * noNoise.z * Math.tan(c.fov * Math.PI / 360));
      const headTop = top - .48 * hf, chin = top + .52 * hf; n++;
      if (size !== 'ecu') eyeErr = Math.max(eyeErr, Math.abs(top - 1 / 3));
      if (chin > C.FRAME.capTop && headTop < C.FRAME.capBottom) faceIn++; if (t === 1) rows.push(`${size}${i} eyes ${(top * 100).toFixed(1)} % chin ${(chin * 100).toFixed(1)} %`); } }
  gate('framing: CU/MCU eyes ± 4 % of the upper third; faces clear of the caption band', eyeErr <= .04 && faceIn === 0, `max eye error ${(eyeErr * 100).toFixed(2)} % of the height, faces in band ${faceIn}/${n} (${rows.slice(0, 4).join('; ')})`); }

// 6. handheld per mood: peak within the mood's band, rotation only, frequencies 0.3–1.5 Hz
{ const band = {tension: [.6, 1.0], emotion: [.2, .4], awe: [.2, .4], comedy: [.25, .35], payoff: [0, 0]}; const out = []; let ok = true;
  for (const [md, [lo, hi]] of Object.entries(band)) { let pk = 0; for (let i = 0; i < 30 * FPS; i++) { const n = C.handheld({mood: md}, i / FPS, 3); pk = Math.max(pk, Math.abs(n[0]), Math.abs(n[1])); }
    const deg = pk * 180 / Math.PI, amp = C.MOOD_CAM[md].hand; ok = ok && amp >= lo && amp <= hi && deg <= amp + 1e-9; out.push(`${md} ${amp}° (peak ${deg.toFixed(2)}°)`); }
  const fOk = C.HAND_BANDS.every(([lo, hi]) => lo >= .3 && hi <= 1.5);
  const s = {...shotFor('static-drift'), mood: 'tension'}, a = C.sampleCine(s, 1, ctxOf(null)), b = C.sampleCine({...s, handheld: 0}, 1, ctxOf(null)), posSame = JSON.stringify(a.position) === JSON.stringify(b.position);
  gate('handheld by mood (rotation only, 0.3–1.5 Hz)', ok && fOk && posSame, `${out.join(', ')}; bands ${C.HAND_BANDS.map(b => b.slice(0, 2).join('–')).join(', ')} Hz; position untouched ${posSame}`); }

// 7. speed ramp: camera only (the follow actor is read at real time), slows the move
{ const s = {...shotFor('track'), ramp: [{at: .4, speed: .25}, {at: 1.6, speed: 1}]}, seen = []; const ctx = {...ctxOf(null), actorsAt: tt => { seen.push(tt); return walker(tt); }};
  C.idealAt(s, 1.2, ctx); const tau = C.rampTime(s.ramp, 1.2);
  gate('ramp: camera clock slowed, actors on real time', seen.at(-1) === 1.2 && tau < 1.2 * .8, `τ(1.2 s) = ${tau.toFixed(3)} s, actors sampled at ${seen.at(-1)} s`); }

// 8. anticipation: a moving shot's first frames move against the move direction (then the spring settles it)
{ const s = {...shotFor('push'), from: {position: [0, 4, 14], target: [0, 3, 0], fov: 40}, to: {position: [0, 4, 8], target: [0, 3, 0], fov: 40}, mood: 'comedy', size: 'ws'};
  const p = f => C.sampleCine(s, f / FPS, ctxOf('an')).position, dir = [0, 0, -1]; let back = 0; for (let f = 1; f <= 6; f++) back = Math.min(back, (p(f)[2] - p(0)[2]) * dir[2] * -1 * -1);
  const ideal = C.anticipation(s, 1.5 / FPS, {fps: FPS, actorsAt: walker});
  gate('anticipation: counter-move before the push (2–4 frames)', ideal[2] > 0 && C.ANTIC.frames >= 2 && C.ANTIC.frames <= 4, `goal counter-move ${(ideal[2] * 100).toFixed(1)} cm over ${C.ANTIC.frames} frames; after the spring ${(Math.max(0, ...[1, 2, 3, 4].map(f => p(f)[2] - p(0)[2])) * 1000).toFixed(2)} mm back`); }

// 9. lens → fov (9:16, 24 mm-wide frame) and size defaults
{ const f = C.LENSES.map(l => C.lensFov(l).toFixed(1)), d = ['ews', 'ws', 'ms', 'mcu', 'cu', 'ecu'].map(z => C.shotLens({size: z}));
  gate('lens: 24/35/50/85 mm → fov; defaults by size', d.join() === '24,24,35,50,85,85' && C.lensFov(85) < C.lensFov(24), `fov ${f.join('/')}°, ews ws ms mcu cu ecu → ${d.join(' ')} mm`); }

// 10. R6 props: grab / catch keys and throw release sit in the R6 hand (r6Fk tip + handAt offsets), ≤ 0.1
{ const tr = A.compileActing([{actor: 'k', verb: 'grab', at: 1, hold: 'p1'}, {actor: 'k', verb: 'throw', at: 3, hold: 'p2'}, {actor: 'k', verb: 'catch', at: 5, hold: 'p3'}], {}).k;
  let worst = 0, old = 0; const rows = [];
  for (const build of ['adult_m', 'youth']) for (const pr of tr.props) { const o = R.sampleActingR6(tr, pr.key, {build}), side = pr.item.facing < 0 ? 'left' : 'right', h = R.r6Hand(o.sample, side, build), q = o.props[pr.id];
    const d = Math.hypot(...q.p.map((x, i) => x - h.p[i])), d15 = Math.hypot(...A.sampleActing(tr, pr.key, {build}).props[pr.id].p.map((x, i) => x - h.p[i])); worst = Math.max(worst, d); old = Math.max(old, d15); rows.push(`${pr.verb}/${build} ${d.toFixed(3)}`); }
  gate('R6 props: prop to R6 hand ≤ 0.1 at grab/catch keys and throw release', worst <= .1, `max ${worst.toFixed(3)} (${rows.join(', ')}); R15 hand before: up to ${old.toFixed(3)}`); }

// 12. (1B fix) the lens never overrides an authored fov; it applies when the shot sets `lens` or has no from.fov
{ const ctx = {fps: FPS, aspect: ASPECT, actorsAt: () => ({}), cacheKey: null}, s = {id: 'L', move: 'static-drift', size: 'cu', duration: 1, from: {position: [0, 4, 10], target: [0, 4, 0], fov: 40}};
  const a = C.idealAt(s, 0, ctx).fov, b = C.idealAt({...s, lens: 85}, 0, ctx).fov, c = C.idealAt({...s, from: {position: [0, 4, 10], target: [0, 4, 0]}}, 0, ctx).fov;
  gate('lens: authored fov kept; lens only when set or no fov', Math.abs(a - 40) < 1e-9 && Math.abs(b - C.lensFov(85)) < 1e-6 && Math.abs(c - C.lensFov(85)) < 1e-6, `authored 40° → ${a.toFixed(1)}°; lens 85 set → ${b.toFixed(1)}°; no fov (cu) → ${c.toFixed(1)}°`); }
// 13. (1B fix) size band + all subjects' heads: a framed shot lands its subject's v in the band centre; a two-subject shot keeps both heads
//     inside the frame and clear of the caption band (the solver's own head box), the ots actor excluded from the list
{ const heads = {hero: {eyes: [0, 4.85, 0], headH: 1.2, H: 5.3}, kid: {eyes: [2.4, 3.0, 1], headH: .74, H: 3.3}};
  const ctx = k => ({fps: FPS, aspect: ASPECT, actorsAt: () => ({hero: [0, 0, 0], kid: [2.4, 0, 1]}), headsAt: () => heads, faceAt: () => [1, 0], headH: 1.2, cacheKey: null, k});
  const rows = []; let ok = true;
  for (const size of ['ms', 'mcu', 'cu']) { const s = {id: 'S' + size, move: 'static-drift', size, subject: 'hero', duration: 1, from: {position: [3, 4, 14], target: [0, 4, 0], fov: 40}}, c = C.idealAt(s, .5, ctx()), v = C.sizeV(c, heads.hero.eyes, 5.3), b = C.SIZE_BAND[size];
    ok = ok && v >= b[0] && v <= b[1]; rows.push(`${size} v ${v.toFixed(2)} (${b.join('–')})`); }
  const two = {id: 'two', move: 'static-drift', size: 'mcu', subject: 'hero', subjects: ['hero', 'kid'], duration: 1, from: {position: [1, 4, 7], target: [0, 4, 0], fov: 40}}, c2 = C.idealAt(two, .5, ctx()), sh = C.fitShift(['hero', 'kid'].map(n => C.headBox(c2, heads[n].eyes, heads[n].headH, ASPECT)));
  const ots = C.subjectsOf({subject: 'hero', ots: 'kid', rack: {from: 'kid', to: 'hero'}});
  ok = ok && sh.ok && Math.abs(sh.x) < 1e-3 && Math.abs(sh.y) < 1e-3 && ots.join() === 'hero';
  gate('size bands + every subject\'s head in frame (solver)', ok, `${rows.join(', ')}; hero + kid MCU residual shift ${sh.x.toFixed(4)}, ${sh.y.toFixed(4)} (fits ${sh.ok}); ots subjects [${ots}]`); }
// 14. (1B fix) dolly zoom 28° → 70°: the background (20 studs behind the subject) frame width ≥ 2× at the end, subject ± 3 %
{ const k = .72 * 5.3 / 2, d0 = k / Math.tan(14 * Math.PI / 180), d1 = k / Math.tan(35 * Math.PI / 180), s = {id: 'dz2', move: 'dollyZoom', size: 'cu', duration: 2, from: {position: [0, 4.4, d0], target: [0, 4.4, 0], fov: 28}, to: {position: [0, 4.4, d1]}};
  const a = C.sampleCine(s, 0, ctxOf(null)), b = C.sampleCine(s, 2.4, ctxOf(null)), w = c => 2 * (Math.hypot(...c.position.map((x, i) => x - [0, 4.4, 0][i])) + 20) * Math.tan(Math.atan(Math.tan(c.fov * Math.PI / 360) * ASPECT));
  const sz = C.sizeFrac(b, [0, 4.4, 0], 1.2) / C.sizeFrac(a, [0, 4.4, 0], 1.2) - 1;
  gate('dollyZoom 28° → 70°: background stretch ≥ 2×, size ± 3 %', w(b) / w(a) >= 2 && Math.abs(sz) <= .03 && b.fov >= 69.5, `fov ${a.fov.toFixed(1)}° → ${b.fov.toFixed(1)}°, background width ×${(w(b) / w(a)).toFixed(2)}, size ${(sz * 100).toFixed(2)} %`); }
// 15. (1B fix) grade S-curve: black point ~2 %, monotone, contrast > 1 at the pivot
{ const {sCurve, CURVE} = await import('../engine/cinelook.js'); const ys = Array.from({length: 101}, (_, i) => sCurve(i / 100)), mono = ys.every((y, i) => !i || y >= ys[i - 1]);
  const slope = (sCurve(CURVE.pivot + CURVE.inBlack * (1 - CURVE.pivot) + .01) - sCurve(CURVE.pivot + CURVE.inBlack * (1 - CURVE.pivot) - .01)) / .02;
  gate('grade S-curve: black point 2 %, monotone, pivot slope > 1', Math.abs(ys[0] - .02) < 1e-9 && mono && slope > 1 && ys[100] === 1, `out(0) ${ys[0].toFixed(3)}, out(.1) ${ys[10].toFixed(3)}, out(.5) ${ys[50].toFixed(3)}, out(1) ${ys[100].toFixed(3)}, pivot slope ${slope.toFixed(2)}`); }

// 11. v2:stability on the fixture with camera: 'cine' + post: 'cine'
if (!process.argv.includes('--no-render')) {
  let line = 'not run', pass = false;
  try { const out = execFileSync('node', ['scripts/v2/stability.js', '--spec', 'engine/fixtures/cine/episode.json'], {encoding: 'utf8', stdio: 'pipe', timeout: 1200000});
    const j = JSON.parse(readFileSync('review/cine/stability-episode.json', 'utf8')); pass = j.result === 'PASS'; line = `worst ${j.worst?.view ?? ''} ${(j.worst?.pct ?? j.worst?.flicker ?? JSON.stringify(j.worst))} % over ${j.views} views (limit ${j.limit} %)`; void out; }
  catch (e) { try { const j = JSON.parse(readFileSync('review/cine/stability-episode.json', 'utf8')); line = `FAIL worst ${JSON.stringify(j.worst)}`; } catch { line = 'stability run failed: ' + String(e.message).slice(0, 120); } }
  gate('v2:stability on engine/fixtures/cine (camera + post cine)', pass, line);
}
mkdirSync('review/cine', {recursive: true}); writeFileSync('review/cine/cine-tests.json', JSON.stringify(gates, null, 1));
console.log(`\n${gates.filter(g => !g.pass).length ? 'FAIL' : 'PASS'}: ${gates.filter(g => g.pass).length}/${gates.length} gates`);
process.exit(gates.every(g => g.pass) ? 0 : 1);
