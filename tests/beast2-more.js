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
