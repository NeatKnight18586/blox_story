// tests/beast2-more.js — tuft 2B pure gates, loaded by tests/beast2.js (one function per section; `ok(name, pass, line)`).
//   TUFT tris ≤ 4k · puff sizes ± 5 % of target per state (whole height incl. quills, settled) · deflate settles in 0.6 s ± 2 frames with
//   3 undershoots · `puff:` / `glow:` vocab (parse + brief2spec → shot.puffs / shot.glows / spec.sfxCues squeak). Task 3/4 append below.
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import * as PF from '../engine/puff.js';

export const GATES = [];
// TUFT tris + puff sizes + deflate
GATES.push(async (ok, {P, B}) => {
  const T = P('TUFT'), g = B.buildGeometry(T), tris = g.tris; ok('TUFT tris ≤ 4k', tris <= 4000, `${tris} tris (hero tier)`);
  const h = k => { const s = B.sampleBeast(T, [{t: 0, state: 'idle'}], 0, {geo: g, scale: k}), v = B.worldVerts(s, g); let y0 = 1e9, y1 = -1e9; for (let i = 1; i < v.length; i += 3) { y0 = Math.min(y0, v[i]); y1 = Math.max(y1, v[i]); } return y1 - y0; };
  const rows = ['ball', 'room', 'colossal'].map(sz => { const ev = [{t: 0, size: sz}], k = PF.puffAt(ev, PF.GROW.dur + .6, PF.TUFT_H, 'tuft', T.puffK).k, H = h(k), tgt = PF.SIZES.tuft[sz]; return {sz, k, H, tgt, err: H / tgt - 1}; });
  const hero = ['ball', 'room', 'colossal'].map(sz => { const rest = 2 * .82, k = PF.puffAt([{t: 0, size: sz}], PF.GROW.dur + .6, rest, 'hero').k, D = k * rest, tgt = PF.SIZES.hero[sz]; return {sz, D, tgt, err: D / tgt - 1}; });
  const rest = h(PF.puffAt([{t: 0, size: 'room'}, {t: 2, size: 'deflate'}], 3, PF.TUFT_H, 'tuft', T.puffK).k) / h(1) - 1, worst = Math.max(...[...rows, ...hero].map(r => Math.abs(r.err)), Math.abs(rest));
  ok('puff sizes within ± 5 % of target', worst <= .05, `tuft ${rows.map(r => `${r.sz} ${r.H.toFixed(2)}/${r.tgt.toFixed(2)} (${(100 * r.err).toFixed(1)} %)`).join(', ')} · hero ball Ø ${hero.map(r => `${r.sz} ${r.D.toFixed(2)}/${r.tgt.toFixed(2)}`).join(', ')} · deflate back to rest ${(100 * rest).toFixed(1)} %`);
  const ds = [[PF.SIZES.tuft.colossal / PF.TUFT_H, 1], [T.puffK.room, 1], [PF.SIZES.hero.ball / 1.64, 1]].map(([a, b]) => PF.deflateStats(a, b, 24)), bad = ds.filter(d => Math.abs(d.settle - PF.DEFLATE.dur) > 2 / 24 || d.undershoots !== 3);
  ok('deflate settles in 0.6 s ± 2 frames (3 wobble undershoots)', !bad.length, ds.map(d => `settle ${d.settle.toFixed(3)} s, ${d.undershoots} undershoots`).join(' · '));
  const rr = []; for (const f of [0, 7, 13, 24]) rr.push(JSON.stringify(B.segRows(B.sampleBeast(T, [{t: 0, state: 'idle'}, {t: .2, state: 'sneeze'}, {t: 1.4, state: 'tremble'}], f / 24, {geo: g, scale: 2}))));
  const rr2 = [24, 13, 7, 0].map(f => JSON.stringify(B.segRows(B.sampleBeast(T, [{t: 0, state: 'idle'}, {t: .2, state: 'sneeze'}, {t: 1.4, state: 'tremble'}], f / 24, {geo: g, scale: 2})))).reverse();
  ok('TUFT states deterministic', rr.every((x, i) => x === rr2[i]), `${rr.filter((x, i) => x === rr2[i]).length}/4 samples identical in any order`); });
// vocab
GATES.push(async (ok) => {
  let e = 0; const want = [['tuft colossal', {actor: 'tuft', size: 'colossal'}], ['hero deflate', {actor: 'hero', size: 'deflate'}]];
  for (const [s, w] of want) if (JSON.stringify(PF.parsePuff(s)) !== JSON.stringify(w)) e++;
  for (const s of ['tuft huge', 'tuft', '9 ball']) { try { PF.parsePuff(s); e++; } catch { /* expected */ } }
  if (PF.parseGlow('tuft .8').level !== .8) e++; for (const s of ['tuft 2', 'tuft']) { try { PF.parseGlow(s); e++; } catch { /* expected */ } }
  const {execFileSync} = await import('node:child_process'), {tmpdir} = await import('node:os'), dir = mkdtempSync(tmpdir() + '/puff-');
  const br = readFileSync('stories/_fixture_e2/BRIEF.md', 'utf8').replace('- dummyB → DUMMY · at -6 -4 · yaw 20', '- dummyB → DUMMY · at -6 -4 · yaw 20\n- tuft: beast TUFT · at 2 4 · yaw 180')
    .replace('spawn: bitsy @ spawned;', 'spawn: bitsy @ spawned; puff: tuft room @ pink; glow: tuft 1 @ pink;').replace('crowd: dummies 40 run to towerBase @ ran;', 'crowd: dummies 40 run to towerBase @ ran; puff: tuft deflate @ ran;');
  writeFileSync(dir + '/BRIEF.md', br); let spec = null, err = '';
  try { execFileSync('node', ['scripts/v2/brief2spec.js', '--story', '_fixture_e2', '--brief', dir + '/BRIEF.md', '--out', dir + '/spec.json'], {stdio: 'pipe'}); spec = JSON.parse(readFileSync(dir + '/spec.json', 'utf8')); } catch (x) { err = String(x.stderr ?? x).slice(0, 200); }
  const pu = spec ? spec.shots.flatMap(s => s.puffs ?? []) : [], gl = spec ? spec.shots.flatMap(s => s.glows ?? []) : [], sq = (spec?.sfxCues ?? []).filter(c => c[1] === 'squeak');
  const good = pu.length === 2 && pu[0].size === 'room' && pu[1].size === 'deflate' && gl.length === 1 && gl[0].level === 1 && sq.length === 1;
  ok('`puff:` / `glow:` vocab → shot.puffs / shot.glows / sfx squeak', !e && good, spec ? `${e} parse errors; puffs ${JSON.stringify(pu)}; glows ${JSON.stringify(gl)}; sfxCues ${JSON.stringify(sq)}` : 'brief2spec failed: ' + err); });
// TITAN (Task 3): tris, ×12 kid height, chains drop after the snap, stomp footfalls → shake, ignite eyes fade up from 0
GATES.push(async (ok, {P, B}) => {
  const T = P('TITAN'), g = B.buildGeometry(T), sup = B.supportPoints(g), top = s => { const v = B.worldVerts(s, g); let y = 0; for (let i = 1; i < v.length; i += 3) y = Math.max(y, v[i]); return y; };
  const h = top(B.sampleBeast(T, [{t: 0, state: 'idle'}], 0, {geo: g, support: sup})) / B.KID_H; ok('TITAN tris ≤ 6k, ×12 kid height', g.tris <= 6000 && Math.abs(h - 12) <= .6, `${g.tris} tris; height ${h.toFixed(2)} × kid (12 ± .6)`);
  const ci = g.segNames.map((n, i) => /^chain/.test(n) ? i : -1).filter(i => i >= 0), spread = s => { const v = B.worldVerts(s, g); let m = 0; for (let i = 0; i < v.length / 3; i++) if (ci.includes(g.seg[i])) m = Math.max(m, Math.hypot(v[3 * i] - s.root.p[0], v[3 * i + 2] - s.root.p[2])); return m; };
  const tr = [{t: 0, state: 'caged'}, {t: 1, state: 'break'}], before = spread(B.sampleBeast(T, tr, 1 + B.BREAK_AT - .05, {geo: g, support: sup})), after = B.worldVerts(B.sampleBeast(T, tr, 1 + B.BREAK_AT + .05, {geo: g, support: sup}), g);
  let collapsed = true; { const s = B.sampleBeast(T, tr, 1 + B.BREAK_AT + .05, {geo: g, support: sup}); for (const n of g.segNames.filter(n => /^chain/.test(n))) if (s.segs[n].R.some(v => v !== 0)) collapsed = false; } void after;
  ok('TITAN chains snap (gone after τ = 0.6 s of break)', before > 0 && collapsed, `chain links ${before.toFixed(1)} studs out before the snap; all 4 chain segments collapsed after`);
  const ff = B.footfalls(T, 'stomp', 0, 6), sh = B.stompShake(ff, ff[0] + .03), quiet = B.stompShake(ff, ff[0] - .2);
  ok('TITAN stomp footfalls → camera shake hook', ff.length >= 4 && Math.abs(sh[1]) > .05 && Math.hypot(...quiet) < 1e-9, `${ff.length} footfalls in 6 s (${ff.slice(0, 4).map(x => x.toFixed(2)).join(', ')} …); shake ${sh[1].toFixed(3)} studs 30 ms after a fall, 0 before`);
  const e = [0, .2, .8, 1.4].map(t => B.sampleBeast(T, [{t: 0, state: 'ignite'}], t, {geo: g, support: sup}).glow.eye);
  ok('titanCave: eyes ignite (fade up in darkness)', e[0] === 0 && e[1] === 0 && e[3] > 1.5 && e[2] > 0 && e[2] < e[3], `eye glow ${e.map(x => x.toFixed(2)).join(' → ')} at 0 / .2 / .8 / 1.4 s`); });
// POWERS (Task 4): FX maths deterministic in any order + vocab (power / fizzle / cage / chains → brief2spec)
GATES.push(async (ok) => {
  const PW = await import('../engine/powers.js'), f = t => JSON.stringify([PW.fireCards(0, t, 3), PW.embers(0, t, 3), PW.bolts(0, t, 7), PW.flyRibbon(0, t, 5), PW.chainPieces(0, t, [[0, 2, 0]], 13), PW.lanternAt(7, t)]);
  const ts = [.1, .5, .9, 1.4], A = ts.map(f), Bv = [...ts].reverse().map(f).reverse(); ok('powers FX maths deterministic', A.every((x, i) => x === Bv[i]), `${A.filter((x, i) => x === Bv[i]).length}/4 samples identical in any order`);
  const rest = PW.chainPieces(0, 3, [[0, 2, 0]], 13), low = Math.min(...PW.chainPieces(0, .6, [[0, 2, 0]], 13).map(p => p.p[1])); ok('chain pieces fall and bounce to rest on the ground', rest.every(p => p.p[1] < .02) && low >= 0 && rest.some(p => p.bounces >= 1), `after 3 s: max y ${Math.max(...rest.map(p => p.p[1])).toFixed(3)}, bounces ${Math.min(...rest.map(p => p.bounces))}–${Math.max(...rest.map(p => p.bounces))}`);
  let e = 0; if (PW.parsePower('hero cyanFire').kind !== 'cyanFire') e++; for (const s of ['hero fireball', 'hero']) { try { PW.parsePower(s); e++; } catch { /* expected */ } }
  if (PW.parseFizzle('hero').actor !== 'hero') e++; if (PW.parseCage('reveal').kind !== 'reveal') e++; if (PW.parseChains('snap').kind !== 'snap') e++; try { PW.parseCage('open'); e++; } catch { /* expected */ }
  const {execFileSync} = await import('node:child_process'), {tmpdir} = await import('node:os'), dir = mkdtempSync(tmpdir() + '/pw-');
  const br = readFileSync('stories/_fixture_e2/BRIEF.md', 'utf8').replace('spawn: bitsy @ spawned;', 'spawn: bitsy @ spawned; power: hero cyanFire @ pink; fizzle: hero @ pink; cage: reveal @ pink;').replace('crowd: dummies 40 run to towerBase @ ran;', 'crowd: dummies 40 run to towerBase @ ran; chains: snap @ ran; power: hero fly @ ran;');
  writeFileSync(dir + '/BRIEF.md', br); let spec = null, err = '';
  try { execFileSync('node', ['scripts/v2/brief2spec.js', '--story', '_fixture_e2', '--brief', dir + '/BRIEF.md', '--out', dir + '/spec.json'], {stdio: 'pipe'}); spec = JSON.parse(readFileSync(dir + '/spec.json', 'utf8')); } catch (x) { err = String(x.stderr ?? x).slice(0, 200); }
  const pw = spec ? spec.shots.flatMap(s => s.powers ?? []) : [], fz = spec ? spec.shots.flatMap(s => s.fizzles ?? []) : [], cg = spec ? spec.shots.filter(s => s.cage).length : 0, ch = spec ? spec.shots.filter(s => s.chains).length : 0;
  ok('`power:` / `fizzle:` / `cage:` / `chains:` vocab', !e && pw.length === 2 && pw[0].kind === 'cyanFire' && pw[1].kind === 'fly' && fz.length === 1 && cg === 1 && ch === 1, spec ? `${e} parse errors; powers ${JSON.stringify(pw)}; fizzles ${fz.length}; cage ${cg}; chains ${ch}` : 'brief2spec failed: ' + err); });
