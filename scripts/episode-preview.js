// Fast low-res look at an episode: one frame per shot (or chosen frames) plus the
// lint report, as a labelled contact sheet. Eyes go only to flagged shots.
// Usage: node scripts/episode-preview.js --ep=shortwick [--width=270] [--at=.5] [--shots=C01,C02] [--frames=0,40]
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './pipeline/server.js';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const ep = arg('ep'), width = Number(arg('width', 270)), atU = arg('at', '.5').split(',').map(Number);
const out = arg('out', `renders/${ep}-preview`); await mkdir(out, {recursive: true});
const executablePath = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const server = await startServer(process.cwd());
const browser = await chromium.launch({executablePath, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const errors = [];
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
  await page.goto(`${server.url}/production/episode/?ep=${ep}`);
  await page.waitForFunction(() => window.__sequence || window.__failed, null, {timeout: 240000}).catch(() => {});
  if (errors.length) throw Error(errors.join('\n'));
  const seq = await page.evaluate(() => ({SHOTS: __sequence.SHOTS, FRAMES: __sequence.FRAMES, timing: __sequence.timingSource}));
  const want = arg('shots', null)?.split(',');
  let frames = arg('frames', null)?.split(',').map(Number).map(f => [f, seq.SHOTS.find(s => f >= s[1] && f < s[2])[0]]);
  frames ??= seq.SHOTS.filter(s => !want || want.includes(s[0])).flatMap(([id, a, b]) => atU.map(u => [Math.min(b - 1, a + Math.round((b - a - 1) * u)), id]));
  const report = [], files = [];
  for (const [f, id] of frames) {
    const lint = await page.evaluate(f => __lint(f), f);
    const r = await page.evaluate(([f, w]) => __sequence.renderFrame(f, w), [f, width]);
    const png = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
    const file = `${out}/${id}-${String(f).padStart(5, '0')}.png`; await writeFile(file, png); files.push(file);
    const flags = [];
    for (const fc of lint.faces) { if (!fc.front) flags.push(`${fc.who} behind camera`); if (fc.inCaptionBand) flags.push(`${fc.who} face in caption band`); if (fc.outsideSafe) flags.push(`${fc.who} outside safe area (${fc.x},${fc.y})`); if (fc.occludedBy) flags.push(`${fc.who} occluded by ${fc.occludedBy}`); }
    if (lint.clipping) flags.push(`camera touching ${lint.clipping}`);
    report.push({id, frame: f, ms: Math.round(r.ms), flags, faces: lint.faces});
  }
  await writeFile(`${out}/lint.json`, JSON.stringify({ep, timing: seq.timing, frames: seq.FRAMES, shots: seq.SHOTS.length, report}, null, 1));
  // Contact sheet with flags drawn in red.
  execFileSync('python3', ['-c', `
import json,sys
from PIL import Image,ImageDraw,ImageFont
r=json.load(open('${out}/lint.json'))['report']; files=${JSON.stringify(files)}
w,h=Image.open(files[0]).size; cols=8; rows=(len(files)+cols-1)//cols
sheet=Image.new('RGB',(cols*w,rows*h),'black'); f=ImageFont.load_default(size=max(11,w//18))
for i,(p,e) in enumerate(zip(files,r)):
    im=Image.open(p).convert('RGB'); d=ImageDraw.Draw(im)
    d.text((4,3),e['id'],fill='white',font=f,stroke_width=2,stroke_fill='black')
    for k,fl in enumerate(e['flags'][:3]): d.text((4,h-16*(k+1)),fl[:40],fill=(255,80,80),font=f,stroke_width=2,stroke_fill='black')
    sheet.paste(im,((i%cols)*w,(i//cols)*h))
sheet.save('${out}/sheet.jpg',quality=85)
`]);
  const flagged = report.filter(r => r.flags.length);
  console.log(JSON.stringify({frames: seq.FRAMES, seconds: +(seq.FRAMES / 30).toFixed(2), shots: seq.SHOTS.length, timing: seq.timing, rendered: report.length,
    msPerFrame: Math.round(report.reduce((a, r) => a + r.ms, 0) / report.length), flagged: flagged.map(r => `${r.id}: ${r.flags.join('; ')}`)}, null, 1));
} finally { await browser.close(); await server.close(); }
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
