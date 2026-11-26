#!/usr/bin/env python3
"""scripts/v2/look-sheet.py — Look Signature sheets from scripts/v2/look-gate.js frames (<dir>/<row>_<A|B|C>.png, 720 × 1280).
  --out <sheet.png>   3 × 4 grid (columns A = cityDay2 outline off · B = classic · C = classicPlus; rows = key-art anchors), ≤ 1600 px
  --crops <png>       the same grid as 1:1 crops (300 × 380) centred on the hero group, so 1 px lines can be judged (≤ 1600 px)
Header text names the columns / rows only (no labels on people or objects)."""
import argparse, json
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--dir', required=True); ap.add_argument('--measures', required=True); ap.add_argument('--out', required=True); ap.add_argument('--crops')
a = ap.parse_args()
M = json.load(open(a.measures)); rows = list(M['rows'].keys()); cols = ['A', 'B', 'C']
NAMES = {'A': 'A  cityDay v2 · outline off', 'B': 'B  classic', 'C': 'C  classicPlus'}
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
except OSError: F = FS = ImageFont.load_default()

def grid(cell, top, left, crop):
    cw, ch = cell; W, H = left + cw * 3 + 8, top + ch * len(rows) + 4
    assert W <= 1600 and H <= 1600, (W, H)
    S = Image.new('RGB', (W, H), (24, 26, 30)); d = ImageDraw.Draw(S)
    for j, c in enumerate(cols): d.text((left + j * cw + 6, 8), NAMES[c], fill=(240, 240, 240), font=F)
    for i, r in enumerate(rows):
        m = M['rows'][r]; y = top + i * ch
        d.text((6, y + 6), r, fill=(240, 240, 240), font=F)
        for k, line in enumerate([f"near {m['nearFrac']*100:.0f}%", f"third Δ {m['thirdErr']*100:.1f}%", f"{m['triangles']/1000:.0f}k tris", f"fg {m['keyArt']['fg']}"]):
            d.text((6, y + 30 + k * 16), line, fill=(190, 196, 204), font=FS)
        for j, c in enumerate(cols):
            im = Image.open(f"{a.dir}/{r}_{c}.png").convert('RGB')
            if crop:
                b = m.get('groupBox') or [.3, .3, .6, .6]; cx = (b[0] + b[2]) / 2 * im.width; cy = (b[1] + b[3]) / 2 * im.height
                x0 = int(min(max(0, cx - cw / 2 + 2), im.width - cw + 4)); y0 = int(min(max(0, cy - ch / 2 + 2), im.height - ch + 4))
                im = im.crop((x0, y0, x0 + cw - 4, y0 + ch - 4))
            else: im = im.resize((cw - 4, ch - 4), Image.LANCZOS)
            S.paste(im, (left + j * cw, y))
    return S

grid((380 * 9 // 16 + 4, 380), 32, 110, False).save(a.out)
if a.crops: grid((330, 388), 32, 110, True).save(a.crops)
print('sheet', a.out, a.crops or '')
