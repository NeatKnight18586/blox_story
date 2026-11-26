#!/usr/bin/env python3
"""Phase 1E contact sheets (≤ 1600 px): python3 scripts/v2/city1e-sheet.py --dir renders/city1e --measures review/city/1E-measures.json
   → review/city/1E-keyart-all.png (every key-art anchor, 270 × 480 tiles), review/city/1E-sheet.png (gate rows, phone 390),
     review/city/1E-tod.png (bayNorth in cityDay2 / cityGoldenHour / cityDusk / cityNight).
Captions sit UNDER each tile (anchor, PASS/FAIL + failing checks, a number line); nothing is drawn on people or objects."""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--dir', default='renders/city1e'); ap.add_argument('--measures', default='review/city/1E-measures.json')
ap.add_argument('--out-all', default='review/city/1E-keyart-all.png'); ap.add_argument('--out', default='review/city/1E-sheet.png'); ap.add_argument('--out-tod', default='review/city/1E-tod.png')
a = ap.parse_args()
M = json.load(open(a.measures)); rows = M.get('rows', {})
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
except OSError: F = ImageFont.load_default()

def cap(r):
    x = rows[r]; bad = [k for k, v in x['checks'].items() if not v]
    s = f"{r}  {'PASS' if x['pass'] else 'FAIL ' + '+'.join(bad)}"
    g = f"gnd {x['ground']:.2f}" + (f" fg {x['fg']['width']:.2f}" if x.get('fg') else '')
    if x.get('bench'): s2 = f"{x['bench']['tris'] // 1000}k {x['bench']['sPerFrame']:.2f}s {g}"
    else: s2 = f"hero {x['heroH']:.2f} {g}" if x.get('heroH') is not None else g
    return s, s2, x['pass']

def sheet(names, sub, tw, th, cols, out, capf=cap):
    names = [n for n in names if os.path.exists(f'{a.dir}/{sub}/{n}.png')]
    if not names: return
    n = len(names); rws = (n + cols - 1) // cols; ch = 38
    S = Image.new('RGB', (cols * tw, rws * (th + ch)), (24, 26, 30)); d = ImageDraw.Draw(S)
    for i, r in enumerate(names):
        im = Image.open(f'{a.dir}/{sub}/{r}.png').convert('RGB').resize((tw, th), Image.LANCZOS); x, y = (i % cols) * tw, (i // cols) * (th + ch); S.paste(im, (x, y))
        s, s2, ok = capf(r); d.text((x + 5, y + th + 3), s, fill=(120, 230, 140) if ok else (255, 110, 100), font=F); d.text((x + 5, y + th + 20), s2, fill=(220, 220, 220), font=F)
    assert S.width <= 1600 and S.height <= 1600, S.size
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True); S.save(out, optimize=True); print(out, S.size)

if rows:
    sheet(list(rows), 'all', 160, 284, 9, a.out_all)
    sheet([r for r in rows if rows[r].get('gate')], 'phone', 390, 693, 4, a.out)
tod = M.get('tod', {})
def tcap(L):
    t = tod.get(L, {}); return L, f"beam {'on' if t.get('beam') else 'off'}  lamps {t.get('halos', 0)}  stars {'yes' if t.get('stars') else 'no'}", True
sheet(['cityDay2', 'cityGoldenHour', 'cityDusk', 'cityNight'], 'tod', 390, 693, 4, a.out_tod, tcap)
