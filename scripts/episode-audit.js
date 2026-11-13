// Harsh physical QA over EVERY frame of an episode (staging only, no pixels, so it is fast),
// then a labelled low-res sheet of each flagged moment for eyes-on review.
//  • hair over face, body through body/prop, feet floating/sunk (runner.audit)
//  • pops: a joint turning > 1.2 rad or a character jumping > 1.2 units between two frames
//    inside a shot, or a character appearing/vanishing mid-shot
// Usage: node scripts/episode-audit.js --ep=shortwick [--every=1] [--width=270] [--shots=A,B]
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './pipeline/server.js';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ep = arg('ep'), every = Number(arg('every', 1)), width = Number(arg('width', 270)), only = arg('shots')?.split(',');
const out = arg('out', `renders/${ep}-audit`); await mkdir(out, {recursive: true});
const executablePath = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const server = await startServer(process.cwd());
const browser = await chromium.launch({executablePath, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const qd = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)); };
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/production/episode/?ep=${ep}`);
  await page.waitForFunction(() => window.__sequence, null, {timeout: 600000});
  const seq = await page.evaluate(() => ({SHOTS: __sequence.SHOTS, ignore: __sequence.lintIgnore}));
  const flags = new Map();   // "shot|issue" → [frames]
  const add = (shot, issue, f) => { const k = shot + '|' + issue; if (!flags.has(k)) flags.set(k, []); flags.get(k).push(f); };
  const t0 = Date.now();
  for (const [id, start, end] of seq.SHOTS) {
    if (only && !only.includes(id)) continue;
    const frames = []; for (let f = start; f < end; f += every) frames.push(f);
    const res = await page.evaluate(fs => fs.map(f => __audit(f)), frames);
    let prev = null;
    for (const r of res) {
      for (const i of r.issues) add(id, i.replace(/ -?\d+\.\d+/g, '').replace(/ \(\d\/3\)/, ''), r.frame);
      if (prev && every === 1) {
        const pa = new Map(prev.avatars.map(a => [a.who, a])), ca = new Map(r.avatars.map(a => [a.who, a]));
        for (const [who, a] of ca) {
          const b = pa.get(who);
          if (!b) { if (r.frame - start > 2) add(id, `appears mid-shot: ${who}`, r.frame); continue; }
          const jump = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
          if (jump > 1.2) add(id, `position pop: ${who}`, r.frame);
          for (const [j, q] of Object.entries(a.q)) if (b.q[j] && qd(q, b.q[j]) > 1.2) add(id, `joint pop: ${who}.${j}`, r.frame);
        }
        for (const who of pa.keys()) if (!ca.has(who) && end - r.frame > 2) add(id, `vanishes mid-shot: ${who}`, r.frame);
      }
      prev = r;
    }
    process.stdout.write(`${id} `);
  }
  console.log(`\naudited in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  // Group into ranges; drop issues a shot explicitly accepts (lintIgnore).
  const report = [];
  for (const [k, fs] of flags) {
    const [shot, issue] = k.split('|');
    if ((seq.ignore[shot] ?? []).some(x => issue.startsWith(x))) continue;
    const ranges = []; for (const f of fs) { const l = ranges.at(-1); if (l && f - l[1] <= every * 2) l[1] = f; else ranges.push([f, f]); }
    report.push({shot, issue, frames: fs.length, ranges});
  }
  report.sort((a, b) => a.ranges[0][0] - b.ranges[0][0]);
  // One low-res still per flagged issue (its worst-covered moment = middle of its first range).
  const shots = [...new Set(report.map(r => `${r.shot}|${Math.round((r.ranges[0][0] + r.ranges[0][1]) / 2)}`))];
  const stills = [];
  // Warm-up: the first composite on a page that has only been staged can come out blank; discard it.
  if (shots.length) await page.evaluate(([f, w]) => __sequence.renderFrame(f, w), [Number(shots[0].split('|')[1]), width]);
  for (const k of shots.slice(0, 60)) {
    const [shot, f] = k.split('|'); const fr = Number(f);
    await page.evaluate(([f, w]) => __sequence.renderFrame(f, w), [fr, width]);
    const png = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
    const file = `${out}/${shot}-${String(fr).padStart(5, '0')}.png`; await writeFile(file, png);
    stills.push({file, label: `${shot}@${fr}: ` + report.filter(r => r.shot === shot && fr >= r.ranges[0][0] - 2 && fr <= r.ranges[0][1] + 2).map(r => r.issue).join('; ')});
  }
  await writeFile(`${out}/audit.json`, JSON.stringify({ep, every, issues: report, errors}, null, 1));
  if (stills.length) execFileSync('python3', ['-c', `
import json,sys
from PIL import Image, ImageDraw, ImageFont
S=json.loads(sys.argv[1]); tw,th=270,480; cols=6
f=ImageFont.load_default(size=13)
cs=Image.new('RGB',(cols*tw,((len(S)+cols-1)//cols)*th),'black')
for n,s in enumerate(S):
    im=Image.open(s['file']).convert('RGB').resize((tw,th)); d=ImageDraw.Draw(im)
    y=3
    for line in [s['label'][i:i+40] for i in range(0,len(s['label']),40)][:8]: d.text((3,y),line,fill='yellow',font=f,stroke_width=2,stroke_fill='black'); y+=15
    cs.paste(im,((n%cols)*tw,(n//cols)*th))
cs.save(sys.argv[2],quality=85)`, JSON.stringify(stills), `${out}/sheet.jpg`]);
  console.log(JSON.stringify({issues: report.length, flaggedFrames: report.reduce((a, r) => a + r.frames, 0), sheet: stills.length ? `${out}/sheet.jpg` : null, errors}, null, 1));
  for (const r of report) console.log(`${r.shot}  ${r.issue}  ×${r.frames}  ${r.ranges.map(x => x.join('-')).join(',')}`);
} finally { await browser.close(); await server.close(); }
