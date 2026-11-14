#!/usr/bin/env python3
"""scripts/v2/look-ab-s1.py — Season 1 look comparison sheet (A4 look test; A5 §G: three columns per view).

  python3 scripts/v2/look-ab-s1.py --views "egg base town:OLD=a.png|S8=b.png|S8b=c.png:.5,.6;ragdoll hill street:OLD=...:.5,.62" --out review/season1/look-ab.png

For every view, one column per kit: top row at 390 px wide (phone size), bottom row a native 1:1 crop (390×693) around
the given centre (fractions). Prints mean luma / saturation per cell.
"""
import argparse, json
from PIL import Image, ImageDraw, ImageFont, ImageStat
a = argparse.ArgumentParser(); a.add_argument('--views', required=True); a.add_argument('--out', required=True); o = a.parse_args()
W, H = 390, 693; f = ImageFont.load_default(size=15); cells = []
for v in o.views.split(';'):
    lab, cols, c = v.split(':'); cx, cy = map(float, c.split(','))
    for col in cols.split('|'):
        kit, path = col.split('='); cells.append((lab, kit, Image.open(path).convert('RGB'), cx, cy))
sheet = Image.new('RGB', (len(cells) * W, 2 * (H + 22)), '#111'); d = ImageDraw.Draw(sheet)
for i, (lab, kit, im, cx, cy) in enumerate(cells):
    x0 = max(0, min(im.width - W, int(cx * im.width - W / 2))); y0 = max(0, min(im.height - H, int(cy * im.height - H / 2)))
    for r, (cell, what) in enumerate(((im.resize((W, H), Image.LANCZOS), '390 px'), (im.crop((x0, y0, x0 + W, y0 + H)), '1:1 crop'))):
        y = r * (H + 22); d.text((i * W + 6, y + 3), f'{kit} — {lab} ({what})', fill='#ffd84a' if kit.endswith('b') else '#bbbbbb', font=f); sheet.paste(cell, (i * W, y + 22))
    s = im.resize((90, 160)); print(json.dumps({'view': lab, 'kit': kit, 'luma': round(ImageStat.Stat(s.convert('L')).mean[0], 1), 'sat': round(ImageStat.Stat(s.convert('HSV')).mean[1] / 255, 3)}))
sheet.save(o.out); print(o.out, sheet.size)
