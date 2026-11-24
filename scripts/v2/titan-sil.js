// scripts/v2/titan-sil.js — tuft P3: TITAN silhouettes (front / side, horn pixels outside the body in orange) before vs after → review/village/titan-sil.png.
//   Usage: node scripts/v2/titan-sil.js [--before <old TITAN.json>]
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hornShare} from '../../tests/beast2.js';
const a = process.argv, bf = a.includes('--before') ? a[a.indexOf('--before') + 1] : null, T = f => JSON.parse(readFileSync(f, 'utf8'));
const sets = [...(bf ? [['before', T(bf)]] : []), ['after', T('beasts/TITAN.json')]], out = [];
for (const [k, P] of sets) for (const v of ['front', 'side']) { const r = hornShare(P, v); out.push({label: `${k} ${v} horn ${(100 * r.share).toFixed(1)} %`, W: r.W, H: r.H, A: Array.from(r.A).join(''), Hn: Array.from(r.Hn).join('')}); }
writeFileSync('renders/titan-sil.json', JSON.stringify(out));
execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw
T = json.load(open('renders/titan-sil.json')); s = Image.new('RGB', (330 * len(T), 340), '#101216'); d = ImageDraw.Draw(s)
for i, t in enumerate(T):
    im = Image.new('RGB', (t['W'], t['H']), '#101216'); px = im.load()
    for q in range(t['W'] * t['H']):
        x, y = q % t['W'], q // t['W']
        if t['A'][q] == '1': px[x, y] = (210, 210, 215)
        if t['Hn'][q] == '1': px[x, y] = (255, 120, 30) if t['A'][q] == '1' else px[x, y]
    s.paste(im, (i * 330 + 15, 30)); d.text((i * 330 + 15, 8), t['label'], fill='#ffffff')
s.save('review/village/titan-sil.png'); print('review/village/titan-sil.png', s.size)`], {stdio: 'inherit'});
