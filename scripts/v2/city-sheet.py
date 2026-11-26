#!/usr/bin/env python3
"""scripts/v2/city-sheet.py — city gate sheet (one image, long side ≤ 1600 px).
Row 1: top-down ortho (district tints + slots) beside the plan outline drawn from parts/city/plan.json, and a numbers block.
Row 2: four phone stills (390 px wide): plazaSouth, bayNorth, suburbStreet, stairBottom, captioned with measured slots + composition.
Text block: bench / composition numbers, the three weakest things, then the verdict (from --notes JSON {weakest:[3], verdict, bench:{id:{tris,s}}}).
  python3 scripts/v2/city-sheet.py [--dir renders/city1a] [--out review/city/1A-fix-sheet.png] [--notes review/city/1A-fix-notes.json]
"""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('--dir', default='renders/city1a'); ap.add_argument('--out', default='review/city/1A-fix-sheet.png')
ap.add_argument('--notes', default='review/city/1A-fix-notes.json'); a = ap.parse_args()
sl = json.load(open('review/city/1A-sightlines.json'))['shots']
notes = json.load(open(a.notes)) if os.path.exists(a.notes) else {}
def F(n):
    try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', n)
    except OSError: return ImageFont.load_default()
font, small = F(16), F(14)
top, plan = Image.open(f'{a.dir}/overview.png').convert('RGB'), Image.open(f'{a.dir}/plan.png').convert('RGB')
S = 470; top, plan = top.resize((S, S)), plan.resize((S, S))
keys = [k for k in 'bcde' if os.path.exists(f'{a.dir}/{k}.png')]
shots = [Image.open(f'{a.dir}/{k}.png').convert('RGB') for k in keys]
pw = 390; ph = round(shots[0].height * pw / shots[0].width); shots = [s.resize((pw, ph)) for s in shots]
cap = 46; W = 4 * pw + 50; txtH = 190; Hh = S + 40 + txtH + cap + ph + 10
sheet = Image.new('RGB', (W, Hh), '#1b1d22'); d = ImageDraw.Draw(sheet)
x0 = 10
sheet.paste(top, (x0, 28)); sheet.paste(plan, (x0 + S + 10, 28))
d.text((x0, 5), '(a) ortho: district tints + slots (1-8)', fill='#fff', font=font); d.text((x0 + S + 10, 5), 'plan outline (plan.json)', fill='#fff', font=font)
tx = x0 + 2 * S + 30; y = 6
for line in notes.get('numbers', []):
    d.text((tx, y), line, fill='#d6dbe4', font=small); y += 19
y = S + 40; d.text((x0, y), 'THREE WEAKEST', fill='#ffcf5a', font=font); y += 22
for i, wk in enumerate(notes.get('weakest', [])):
    d.text((x0, y), f'{i + 1}. {wk}', fill='#f1f1f1', font=small); y += 20
d.text((x0, y + 4), 'VERDICT: ' + notes.get('verdict', '(pending)'), fill='#7CFC9A' if 'PASS' in notes.get('verdict', '') else '#ff7070', font=font)
y0 = S + 40 + txtH
for i, (k, im) in enumerate(zip(keys, shots)):
    x = 10 + i * (pw + 10); sheet.paste(im, (x, y0 + cap)); s = sl[k]; c = s.get('comp', {})
    d.text((x, y0 + 2), f"({k}) {s['anchor']}: slots {','.join(s['onScreen']) or '-'}", fill='#7CFC9A' if s['pass'] else '#ff7070', font=small)
    d.text((x, y0 + 24), f"sky {c.get('skyPct', '?')}% water {c.get('waterPct', '?')}% hills+{c.get('hillsAboveRoofLots', '?')}%", fill='#d6dbe4', font=small)
k = 1600 / max(sheet.size)
if k < 1: sheet = sheet.resize((round(sheet.width * k), round(sheet.height * k)), Image.LANCZOS)
os.makedirs(os.path.dirname(a.out), exist_ok=True); sheet.save(a.out, optimize=True); print(a.out, sheet.size)
