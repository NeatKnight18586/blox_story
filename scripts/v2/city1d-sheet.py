#!/usr/bin/env python3
"""Phase 1D contact sheets (≤ 1600 px): python3 scripts/v2/city1d-sheet.py --dir renders/city1d --measures review/city/1D-measures.json
   → review/city/1D-keyart-all.png (every key-art anchor, 270 × 480 tiles scaled) + review/city/1D-sheet.png (gate rows, phone 390).
Captions sit UNDER each tile (anchor name, PASS/FAIL + failing checks); nothing is drawn on people or objects."""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--dir', default='renders/city1d'); ap.add_argument('--measures', default='review/city/1D-measures.json')
ap.add_argument('--out-all', default='review/city/1D-keyart-all.png'); ap.add_argument('--out', default='review/city/1D-sheet.png')
a = ap.parse_args()
M = json.load(open(a.measures)); rows = M['rows']
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except OSError: F = ImageFont.load_default()

def cap(r):
    x = rows[r]; bad = [k for k, v in x['checks'].items() if not v]
    s = f"{r}  {'PASS' if x['pass'] else 'FAIL ' + '+'.join(bad)}"
    if x.get('bench'): s2 = f"{x['bench']['tris'] // 1000}k  {x['bench']['sPerFrame']:.2f}s  ol {x['bench']['outlineCost']:+.3f}"
    else: s2 = f"hero {x['heroH']:.2f}  lm {x['landmarkVisible'] if x['landmarkVisible'] is not None else '-'}"
    return s, s2, x['pass']

def sheet(names, sub, tw, th, cols, out):
    names = [n for n in names if os.path.exists(f'{a.dir}/{sub}/{n}.png')]
    n = len(names); rws = (n + cols - 1) // cols; ch = 40
    S = Image.new('RGB', (cols * tw, rws * (th + ch)), (24, 26, 30)); d = ImageDraw.Draw(S)
    for i, r in enumerate(names):
        im = Image.open(f'{a.dir}/{sub}/{r}.png').convert('RGB').resize((tw, th), Image.LANCZOS); x, y = (i % cols) * tw, (i // cols) * (th + ch); S.paste(im, (x, y))
        s, s2, ok = cap(r); d.text((x + 6, y + th + 3), s, fill=(120, 230, 140) if ok else (255, 110, 100), font=F); d.text((x + 6, y + th + 21), s2, fill=(220, 220, 220), font=F)
    assert S.width <= 1600 and S.height <= 1600, S.size
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True); S.save(out, optimize=True); print(out, S.size)

sheet(list(rows), 'all', 220, 391, 7, a.out_all)
sheet([r for r in rows if rows[r].get('gate')], 'phone', 390, 693, 4, a.out)
