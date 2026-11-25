// scripts/v2/titan-sil.js — tuft P3 (P3B): TITAN flat-shaded ortho views FRONT / SIDE / ¾ (tests/titan.js `shade`: base colours + one key light,
//   emissive cracks / eyes in their glow colour, a red line at the hump's top) before vs after → review/village/titan-sil.png.
//   Usage: node scripts/v2/titan-sil.js [--before <old TITAN.json>] [--out <png>] [--state roar --t 1.2]
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {shade} from '../../tests/titan.js';
const a = process.argv, arg = (k, d) => a.includes(k) ? a[a.indexOf(k) + 1] : d, bf = arg('--before', null), T = f => JSON.parse(readFileSync(f, 'utf8'));
const st = arg('--state', 'idle'), t = +arg('--t', 0), out = arg('--out', 'review/village/titan-sil.png');
const sets = [...(bf ? [['before', T(bf)]] : []), ['after', T('beasts/TITAN.json')]], rows = [];
mkdirSync('renders/fix3b', {recursive: true});
for (const [k, P] of sets) for (const v of ['front', 'side', 'q34']) { const r = shade(P, v, 360, st, t); const f = `renders/fix3b/sil-${k}-${v}.rgb`; writeFileSync(f, r.rgb); rows.push({label: `${k} ${v === 'q34' ? '3/4' : v}`, f, W: r.W, H: r.H}); }
writeFileSync('renders/fix3b/sil.json', JSON.stringify(rows));
execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw
R = json.load(open('renders/fix3b/sil.json')); n = 3; rows = len(R) // n
s = Image.new('RGB', (380 * n + 10, 400 * rows), '#14161b'); d = ImageDraw.Draw(s)
for i, r in enumerate(R):
    im = Image.frombytes('RGB', (r['W'], r['H']), open(r['f'], 'rb').read())
    bg = Image.new('RGB', im.size, '#14161b'); m = im.convert('L').point(lambda v: 255 if v > 0 else 0); bg.paste(im, (0, 0), m)
    x, y = (i % n) * 380 + 10, (i // n) * 400 + 28; s.paste(bg, (x, y)); d.text((x, y - 20), r['label'], fill='#ffffff')
s.save('${out}'); print('${out}', s.size)`], {stdio: 'inherit'});
