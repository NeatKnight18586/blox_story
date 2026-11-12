#!/usr/bin/env python3
"""scripts/v2/look-ab.py — before/after sheet for a look change (Amendment A1).

  python3 scripts/v2/look-ab.py --dir renders/v2/a1/ab --labels "hero stone,sword,gate wall,field wide" --out review/nobody

Expects <dir>/before-<i>.png and <dir>/after-<i>.png (native 1080×1920). Writes
  <out>/look-fix-ab.png         every view at 390 px wide (= phone size), before row over after row
  <out>/look-fix-ab-detail.png  native 1:1 crops (390×693) of the same views, before over after
plus mean luma per view (printed as JSON).
"""
import argparse, json
from PIL import Image, ImageDraw, ImageFont, ImageStat

a = argparse.ArgumentParser(); a.add_argument('--dir', required=True); a.add_argument('--labels', required=True); a.add_argument('--out', required=True)
a.add_argument('--crops', default='', help='per view "x,y" centre of the native crop (fractions), ";"-separated'); o = a.parse_args()
labels = o.labels.split(','); n = len(labels); W, H = 390, 693; f = ImageFont.load_default(size=15)
crops = [tuple(map(float, c.split(','))) for c in o.crops.split(';')] if o.crops else [(.5, .5)] * n
stats = []
for kind in ('phone', 'detail'):
    sheet = Image.new('RGB', (n * W, 2 * (H + 22)), '#111'); d = ImageDraw.Draw(sheet)
    for i, lab in enumerate(labels):
        for r, side in enumerate(('before', 'after')):
            im = Image.open(f'{o.dir}/{side}-{i}.png').convert('RGB')
            if kind == 'phone':
                cell = im.resize((W, H), Image.LANCZOS)
                if side == 'after' or True: stats.append({'view': lab, 'side': side, 'luma': round(ImageStat.Stat(im.resize((90, 160)).convert('L')).mean[0], 1)})
            else:
                cx, cy = crops[i]; x0 = max(0, min(im.width - W, int(cx * im.width - W / 2))); y0 = max(0, min(im.height - H, int(cy * im.height - H / 2)))
                cell = im.crop((x0, y0, x0 + W, y0 + H))
            y = r * (H + 22); d.text((i * W + 6, y + 3), f'{side.upper()} — {lab}' + (' (390 px phone)' if kind == 'phone' else ' (native 1:1 crop)'), fill='#ffd84a' if side == 'after' else '#bbbbbb', font=f)
            sheet.paste(cell, (i * W, y + 22))
    sheet.save(f"{o.out}/look-fix-ab{'' if kind == 'phone' else '-detail'}.png")
for s in stats: print(json.dumps(s))
