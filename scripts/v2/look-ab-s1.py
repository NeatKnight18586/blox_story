#!/usr/bin/env python3
"""scripts/v2/look-ab-s1.py — Amendment A4 look test sheet: each view built with the old (v2) kit and the new (A4) kit.

  python3 scripts/v2/look-ab-s1.py --views "egg base town (night):renders/v2/look/egg-{kit}/frames/frame-00000.png:.5,.55;ragdoll hill street (day):renders/v2/look/ragdoll-{kit}/frames/frame-00000.png:.5,.6" --out review/season1/look-ab.png

Top row: every view at 390 px wide (phone size), OLD then NEW. Bottom row: native 1:1 crops (390×693) of the same frames at
the given centre (fractions). Prints mean luma / saturation per cell.
"""
import argparse, json
from PIL import Image, ImageDraw, ImageFont, ImageStat
a = argparse.ArgumentParser(); a.add_argument('--views', required=True); a.add_argument('--out', required=True); o = a.parse_args()
views = [v.split(':') for v in o.views.split(';')]; W, H = 390, 693; f = ImageFont.load_default(size=15)
cells = [(lab, kit, Image.open(path.replace('{kit}', kit)).convert('RGB'), tuple(map(float, c.split(',')))) for lab, path, c in views for kit in ('old', 'new')]
sheet = Image.new('RGB', (len(cells) * W, 2 * (H + 22)), '#111'); d = ImageDraw.Draw(sheet)
for i, (lab, kit, im, (cx, cy)) in enumerate(cells):
    small = im.resize((W, H), Image.LANCZOS); x0 = max(0, min(im.width - W, int(cx * im.width - W / 2))); y0 = max(0, min(im.height - H, int(cy * im.height - H / 2)))
    for r, (cell, what) in enumerate(((small, '390 px phone'), (im.crop((x0, y0, x0 + W, y0 + H)), 'native 1:1 crop'))):
        y = r * (H + 22); d.text((i * W + 6, y + 3), f'{kit.upper()} kit — {lab} ({what})', fill='#ffd84a' if kit == 'new' else '#bbbbbb', font=f); sheet.paste(cell, (i * W, y + 22))
    s = im.resize((90, 160)); print(json.dumps({'view': lab, 'kit': kit, 'luma': round(ImageStat.Stat(s.convert('L')).mean[0], 1), 'sat': round(ImageStat.Stat(s.convert('HSV')).mean[1] / 255, 3)}))
sheet.save(o.out); print(o.out, sheet.size)
