#!/usr/bin/env python3
"""scripts/v2/world-sheet.py — Session 3 world sheet (docs/V2_BRIEF.md §12 Session 3).

  python3 scripts/v2/world-sheet.py [--spec stories/nobody/stills.json] [--out review/nobody] [--width 1080]

Renders the first frame of every still shot natively (default 1080×1920; owner decision: native 1080p),
composes <out>/world-sheet.png (≤ 1600 px wide, labelled) and writes <out>/world-stats.json with mean
luma (0–255) and mean saturation (0–1) per still (brief rubric 6: day ≥ 110, night ≥ 60, sat ≥ 0.30).
"""
import argparse, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageStat

a = argparse.ArgumentParser()
a.add_argument('--spec', default='stories/nobody/stills.json'); a.add_argument('--out', default='review/nobody')
a.add_argument('--width', type=int, default=1080); o = a.parse_args()
spec = json.load(open(o.spec)); shots = spec['shots']; per = shots[0]['frames']
assert all(s['frames'] == per for s in shots), 'stills must all have the same frame count'
raw = 'renders/v2/world-stills'
subprocess.run(['node', 'scripts/v2/render.js', '--spec', o.spec, '--out', raw, '--every', str(per), '--width', str(o.width), '--height', str(round(o.width * 16 / 9))], check=True)
cells, stats = [], []
for k, s in enumerate(shots):
    im = Image.open(f'{raw}/frames/frame-{k:05d}.png').convert('RGB')
    small = im.resize((90, 160))
    l, sat = ImageStat.Stat(small.convert('L')).mean[0], ImageStat.Stat(small.convert('HSV')).mean[1] / 255
    night = s.get('look', 'day') in ('night', 'fireNight')
    ok = (l >= (60 if night else 110)) and sat >= .30
    stats.append({'still': s['id'], 'look': s.get('look', 'day'), 'luma': round(l, 1), 'sat': round(sat, 3), 'pass': ok})
    cells.append((im, f"{s['id']}  luma {l:.0f} sat {sat:.2f} {'PASS' if ok else 'FAIL'}"))
W = 1600; cw = W // 3; ch = round(cw * 16 / 9)
sheet = Image.new('RGB', (W, 2 * (ch + 22)), '#111'); d = ImageDraw.Draw(sheet); f = ImageFont.load_default(size=15)
for k, (im, label) in enumerate(cells):
    x, y = (k % 3) * cw, (k // 3) * (ch + 22)
    d.text((x + 6, y + 3), label, fill='#ffd84a', font=f); sheet.paste(im.resize((cw, ch), Image.LANCZOS), (x, y + 22))
os.makedirs(o.out, exist_ok=True); sheet.save(f'{o.out}/world-sheet.png')
json.dump(stats, open(f'{o.out}/world-stats.json', 'w'), indent=1)
for s in stats: print(json.dumps(s))
print(f'{o.out}/world-sheet.png', sheet.size, file=sys.stderr)
