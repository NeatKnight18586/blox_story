#!/usr/bin/env python3
"""scripts/v2/city-sheet.py — Phase 1A city sheet (one image, long side ≤ 1600 px).
Row 1: (a) top-down ortho (district tints + slots) beside the plan outline drawn from parts/city/plan.json.
Row 2: (b) plazaSouth, (c) bayNorth, (d) suburbStreet phone stills (390 px wide), captioned with the measured slots on screen.
  python3 scripts/v2/city-sheet.py [--dir renders/city1a] [--out review/city/1A-sheet.png]
"""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('--dir', default='renders/city1a'); ap.add_argument('--out', default='review/city/1A-sheet.png'); a = ap.parse_args()
sl = json.load(open('review/city/1A-sightlines.json'))['shots']
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except OSError: font = ImageFont.load_default()
top, plan = Image.open(f'{a.dir}/overview.png').convert('RGB'), Image.open(f'{a.dir}/plan.png').convert('RGB')
S = 520; top, plan = top.resize((S, S)), plan.resize((S, S))
shots = [Image.open(f'{a.dir}/{k}.png').convert('RGB') for k in 'bcd']
pw = 390; ph = round(shots[0].height * pw / shots[0].width); shots = [s.resize((pw, ph)) for s in shots]
cap = 30; W = max(2 * S + 30, 3 * pw + 40); Hh = S + cap + 20 + ph + cap + 10
sheet = Image.new('RGB', (W, Hh), '#1b1d22'); d = ImageDraw.Draw(sheet)
x0 = (W - 2 * S - 10) // 2
sheet.paste(top, (x0, cap)); sheet.paste(plan, (x0 + S + 10, cap))
d.text((x0, 5), '(a) top-down ortho: district tints + landmark slots', fill='#fff', font=font); d.text((x0 + S + 10, 5), 'plan outline (plan.json)', fill='#fff', font=font)
y = S + cap + 20; x0 = (W - 3 * pw - 20) // 2
for i, (k, im) in enumerate(zip('bcd', shots)):
    x = x0 + i * (pw + 10); sheet.paste(im, (x, y + cap)); s = sl[k]
    d.text((x, y + 4), f"({k}) {s['anchor']}: slots {','.join(s['onScreen']) or '-'}", fill='#7CFC9A' if s['pass'] else '#ff7070', font=font)
k = 1600 / max(sheet.size)
if k < 1: sheet = sheet.resize((round(sheet.width * k), round(sheet.height * k)), Image.LANCZOS)
os.makedirs(os.path.dirname(a.out), exist_ok=True); sheet.save(a.out, optimize=True); print(a.out, sheet.size)
