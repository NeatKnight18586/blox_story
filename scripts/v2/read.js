// npm run v2:read -- --story <slug> [--spec <episode.json>] [--out <json>]   (owner readability checks, egg preview pass 2)
// Judges the rendered frames (engine/episode.js readMeasure: projected boxes + id-mask renders) with the pure rules in
// engine/readcheck.js. Season 1 / v3 episodes. One line per shot and check; every failure is an ERROR (exit 1).
// Per shot: the middle frame (checks 1–4, 6 and the egg shading) and two frames 0.5 s apart around it (check 5).
// Hold rule (owner, pass 2): a static framing (fails check 5) may run ≤ 3.0 s, a moving one ≤ 4.5 s (low point, money shot
// and the final shot's held tail exempt).
import {readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';
import {faceShown, nothingInFront, standsOut, objectReads, moves, sameScale, backIssues, eggShaded, READ} from '../../engine/readcheck.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const story = arg('story'), specPath = arg('spec') ?? `stories/${story}/episode.json`;
const spec = JSON.parse(readFileSync(specPath, 'utf8')), fps = spec.fps ?? 30, shots = layoutShots(spec);
const slug = story ?? spec.slug, outPath = arg('out') ?? `review/${slug}/read.json`;
const cues = JSON.parse(readFileSync(arg('cues') ?? `stories/${slug}/cues.json`, 'utf8'));
const server = await startServer(), browser = await launch();
let meas;
try {
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 180000});
  if (errs.length) throw Error(errs.join('; '));
  meas = await page.evaluate(list => list.map(s => {
    const E = window.__episode, mid = s.start + Math.floor(s.frames / 2), a = Math.max(s.start, mid - 7), b = Math.min(s.start + s.frames - 1, a + 15);
    const r = E.readMeasure(mid, {subject: s.subject, prop: s.prop});
    const la = E.lumaAt(a), lb = E.lumaAt(b); let d = 0; for (let i = 0; i < la.length; i++) d += Math.abs(la[i] - lb[i]);
    return {...r, motion: d / la.length};
  }), shots.map(s => ({start: s.start, frames: s.frames, subject: s.subject ?? s.fit?.actor ?? null, prop: s.prop ?? null})));
} finally { await browser.close(); await server.close(); }

const threshold = READ.motion, errors = [...backIssues(shots)], rows = [];
const B6 = spec.beats?.B6 ?? [], exempt = new Set([spec.moneyShot, ...B6]);
shots.forEach((s, i) => {
  const m = meas[i], row = {id: s.id, size: s.size, t: +(s.start / fps).toFixed(2), dur: +(s.frames / fps).toFixed(2), subject: s.subject ?? s.fit?.actor ?? s.prop ?? null}, E = (k, r) => { row[k] = r; if (r && !r.ok) errors.push(`${s.id}: ${k} FAIL ${r.msg}`); };
  const who = s.subject ?? s.fit?.actor ?? null;
  if (m.missing) E('subject', {ok: false, msg: `subject ${m.missing} not visible`});
  if ((['medium', 'close'].includes(s.size) || s.move === 'heroLow') && !who && !s.prop) E('faceShown', {ok: false, msg: 'no subject named'});
  else if (who && !m.missing) E('faceShown', faceShown(s, m.head));
  if ((who || s.prop) && !m.missing) { E('nothingInFront', nothingInFront(m)); E('standsOut', standsOut(m.subj, m.ring)); }
  if (s.prop && s.size === 'insert' && !m.missing) E('objectReads', objectReads(m.box));   // check 4: inserts only
  const mv = moves(m.motion, threshold); E('moves', mv);
  if (m.scale) for (const b of m.scale.blds) { const r = sameScale(m.scale.kitH, b.h, m.scale.kitWorldH / b.worldH); if (!r.ok) { E('sameScale', {...r, msg: `${b.name}: ${r.msg}`}); break; } row.sameScale = r; }
  if (m.eggRange !== undefined) E('eggShaded', eggShaded(m.eggRange));
  const voiced = (Math.min(s.start + s.frames, i === shots.length - 1 ? Math.ceil(cues.duration * fps) : Infinity) - s.start) / fps, lim = mv.ok ? 4.5 : 3.0;
  if (!exempt.has(s.id)) E('hold', {held: +voiced.toFixed(2), max: lim, ok: voiced <= lim + 1e-6, msg: `${mv.ok ? 'moving' : 'static'} framing held ${voiced.toFixed(2)} s (≤ ${lim})`});
  rows.push(row);
});
for (const r of rows) { const fails = Object.entries(r).filter(([, v]) => v && typeof v === 'object' && v.ok === false).map(([k]) => k); console.log(`${fails.length ? 'FAIL' : 'PASS'} ${r.id.padEnd(14)} ${fails.join(', ')}`); }
await mkdir(`review/${slug}`, {recursive: true});
await writeFile(outPath, JSON.stringify({spec: specPath, motionThreshold: threshold, shots: rows, errors}, null, 1));
console.log(JSON.stringify({shots: rows.length, errors: errors.length, result: errors.length ? 'FAIL' : 'PASS'}));
process.exitCode = errors.length ? 1 : 0;
