// scripts/ep.js — one command per episode stage: npm run ep -- --story <slug> --stage <align|spec|plan|animatic|final>. Chains existing commands, logs to stories/<slug>/logs/, prints ≤ 20 lines, stops at the first FAIL.
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const slug = arg('story'), stage = arg('stage');
const STAGES = ['align', 'spec', 'plan', 'animatic', 'final'];
if (!slug || !STAGES.includes(stage)) { console.error('usage: npm run ep -- --story <slug> --stage <align|spec|plan|animatic|final>'); process.exit(2); }
const spec = `stories/${slug}/episode.json`, rev = `review/${slug}`, anim = `renders/v2/${slug}-animatic`, fin = `renders/v2/${slug}-final`, logs = `stories/${slug}/logs`;
mkdirSync(logs, {recursive: true});
const J = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
// A step = {name, cmd, args, ok?(result) -> {pass, note}}; default pass = exit code 0.
const S = {
  align: [{name: 'v2:align', cmd: 'python3', args: ['scripts/v2/align.py', '--story', slug], note: () => J(`stories/${slug}/build/cues.json`)?.lines ? `${J(`stories/${slug}/build/cues.json`).lines.length} lines` : ''}],
  spec: [{name: 'brief2spec', cmd: 'node', args: ['scripts/v2/brief2spec.js', '--story', slug], note: () => { const e = J(spec); return e ? `${e.shots?.length ?? '?'} shots, format ${e.format}` : ''; }}],
  plan: [{name: 'v2:plan', cmd: 'node', args: ['scripts/v2/plan.js', '--story', slug], note: () => { const p = J(`${rev}/plan.json`); return p ? `${p.errors?.length ?? 0} errors, ${p.warnings?.length ?? 0} warnings` : ''; }},
    {name: 'v2:fgleak', cmd: 'node', args: ['scripts/v2/fgleak.js', '--spec', spec, '--out', `${rev}/fgleak.json`], skip: () => (J(spec)?.format ?? 0) < 7, note: () => { const r = J(`${rev}/fgleak.json`); return r ? `max cover ${Math.max(0, ...r.rows.map(x => x.cover)).toFixed(3)} (≤ 0.10)` : ''; }}],
  animatic: [
    {name: 'v2:stability', cmd: 'node', args: ['scripts/v2/stability.js', '--story', slug], note: () => { const r = J(`${rev}/stability.json`); return r ? `flicker ${r.worst ?? r.maxPct ?? r.pct ?? '?'}` : ''; }},
    {name: 'v2:read', cmd: 'node', args: ['scripts/v2/read.js', '--story', slug], note: () => { const r = J(`${rev}/read.json`); return r ? `${r.errors?.length ?? 0} read errors` : ''; }},
    {name: 'render 270x480', cmd: 'node', args: ['scripts/v2/render.js', '--story', slug, '--out', anim, '--width', '270', '--height', '480', '--every', '2', '--aa', '0'], note: () => { const p = J(`${anim}/progress.json`); return p ? `${p.rendered ?? p.done ?? '?'} frames, ${p.msPerFrame ?? '?'} ms/frame` : ''; }},
    {name: 'sheet', cmd: 'python3', args: ['scripts/v2/sheet.py', `${anim}/frames`, '--out', `${rev}/animatic-sheet.png`, '--fps', '15', '--stats', '--long', '1600'], note: () => `${rev}/animatic-sheet.png`},
    {name: 'pacing.png', cmd: 'python3', args: ['scripts/v2/pacing.py', `${rev}/pacing.json`, `${rev}/pacing.png`], skip: () => !existsSync(`${rev}/pacing.json`), note: () => `${rev}/pacing.png`},
    {name: 'phone-390', cmd: 'python3', args: ['scripts/v2/sheet.py', `${anim}/frames`, '--frames', '0', '--long', '390', '--out', `${rev}/phone-390.png`], note: () => `${rev}/phone-390.png`},
  ],
  final: [{name: 'render --final', cmd: 'node', args: ['scripts/v2/render.js', '--story', slug, '--out', fin, '--final'], note: () => { const p = J(`${fin}/progress.json`); return p ? `${p.rendered ?? p.done ?? '?'} frames, ${p.msPerFrame ?? '?'} ms/frame` : ''; }}],
};
const lines = [`ep ${slug} · stage ${stage}`]; let fail = false;
for (const st of S[stage]) {
  if (st.skip?.()) { lines.push(`SKIP  ${st.name} (no input)`); continue; }
  const r = spawnSync(st.cmd, st.args, {encoding: 'utf8', maxBuffer: 1 << 28});
  writeFileSync(`${logs}/${stage}-${st.name.replace(/[^a-z0-9]+/gi, '_')}.log`, `$ ${st.cmd} ${st.args.join(' ')}\n${r.stdout ?? ''}\n${r.stderr ?? ''}\nexit ${r.status}\n`);
  const pass = r.status === 0; lines.push(`${pass ? 'PASS' : 'FAIL'}  ${st.name}${st.note ? ' — ' + (st.note() || '') : ''}${pass ? '' : ` (exit ${r.status}, see ${logs}/)`}`);
  if (!pass) { fail = true; break; }
}
console.log(lines.slice(0, 20).join('\n')); process.exit(fail ? 1 : 0);
