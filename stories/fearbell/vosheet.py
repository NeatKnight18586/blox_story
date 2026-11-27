#!/usr/bin/env python3
"""stories/fearbell/vosheet.py <frames dir> <cells dir> — captions each vo-sheet frame (row, frame, time, VO, MUST SEE from build/see.json)
and writes build/shots.json labels; then: python3 scripts/v2/sheet.py <cells> --every-sec 0.0001 --fps 1 --labels stories/fearbell/build/shots.json --max 6 --out review/fearbell/vo-sheet.png"""
import json, os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
SEE = sys.argv[3] if len(sys.argv) > 3 else 'stories/fearbell/build/see.json'   # FINAL: build/see-fix.json (3 frames per fixed row)
see = json.load(open(SEE)); files = {int(f[6:11]): f for f in os.listdir(src) if f.startswith('frame-')}
font, fb, cells, labels = ImageFont.load_default(size=20), ImageFont.load_default(size=24), [], []
for i, s in enumerate(see):
    im = Image.open(os.path.join(src, files[s['frame']])).convert('RGB'); w, h = im.size
    vo, ms = textwrap.wrap('VO: ' + s['vo'], 32), textwrap.wrap('MUST SEE: ' + s['see'], 32)[:7]
    c = Image.new('RGB', (w, h + 40 + 24 * (len(vo) + len(ms))), '#111'); c.paste(im, (0, 0)); d = ImageDraw.Draw(c)
    y = h + 4; d.text((6, y), f"ROW {s['row']}{s.get('tag', '')}  f{s['frame']}  {s['t']:.2f}s  [{s['loc']}]", fill='#ffd84a', font=fb); y += 30
    for l in vo: d.text((6, y), l, fill='#ffffff', font=font); y += 24
    for l in ms: d.text((6, y), l, fill='#9fe39f', font=font); y += 24
    cells.append(c); labels.append({'id': f"r{s['row']:02d}", 'start': i, 'frames': 1})
H = max(c.size[1] for c in cells)
for i, c in enumerate(cells): z = Image.new('RGB', (c.size[0], H), '#111'); z.paste(c, (0, 0)); z.save(os.path.join(out, f'frame-{i:05d}.png'))
json.dump(labels, open('stories/fearbell/build/shots.json', 'w'))
