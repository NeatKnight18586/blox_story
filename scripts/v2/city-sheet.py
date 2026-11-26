#!/usr/bin/env python3
"""scripts/v2/city-sheet.py — city gate sheet (one image, long side ≤ 1600 px).
Row 1: top-down ortho (district tints + slots) beside the plan outline drawn from parts/city/plan.json, and a numbers block.
Row 2: four phone stills (390 px wide): plazaSouth, bayNorth, suburbStreet, stairBottom, captioned with measured slots + composition.
Text block: bench / composition numbers, the three weakest things, then the verdict (from --notes JSON {weakest:[3], verdict, bench:{id:{tris,s}}}).
  python3 scripts/v2/city-sheet.py [--dir renders/city1a] [--out review/city/1A-fix-sheet.png] [--notes review/city/1A-fix-notes.json]
Phase 1B: python3 scripts/v2/city-sheet.py --phase 1b --dir renders/city1b --out review/city/1B-sheet.png --notes review/city/1B-notes.json
  (text block first: numbers, FIVE WEAKEST, verdict; then the six gate1b phone stills, 2 x 3, captioned with slots / stair % / signs).
"""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('--dir', default='renders/city1a'); ap.add_argument('--out', default='review/city/1A-fix-sheet.png')
ap.add_argument('--notes', default='review/city/1A-fix-notes.json'); ap.add_argument('--phase', default='1a'); ap.add_argument('--sight', default=None); a = ap.parse_args()
if a.phase in ('1b', '1c'):   # Phase 1B/1C: text block first (numbers, FIVE WEAKEST, verdict), then phone stills (1B: 2 x 3 from gate1b; 1C: 4 x 2 from gate1c)
    P1C = a.phase == '1c'; COLS = 4 if P1C else 3
    sl = json.load(open(a.sight or ('review/city/1C-sightlines.json' if P1C else 'review/city/1B-sightlines.json'))); shots_meta = sl['shots']; notes = json.load(open(a.notes)) if os.path.exists(a.notes) else {}
    def F(n):
        try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', n)
        except OSError: return ImageFont.load_default()
    font, small = F(22), F(17)
    keys = [k for k in shots_meta if os.path.exists(f'{a.dir}/{k}.png')]; pw, ph, cap, gap = 390, 693, 52, 14
    lines = notes.get('numbers', []); txtH = 40 + 24 * len(lines) + 34 + 26 * 5 + 50
    rows = (len(keys) + COLS - 1) // COLS; W = COLS * pw + (COLS + 1) * gap; Hh = txtH + rows * (cap + ph + gap)
    sheet = Image.new('RGB', (W, Hh), '#1b1d22'); d = ImageDraw.Draw(sheet); y = 10
    d.text((gap, y), notes.get('title', 'City 1C: Downtown fix-ups + School & Homes (phone 390 x 693)' if P1C else 'City 1B: Downtown + building kit (phone 390 x 693)'), fill='#ffffff', font=font); y += 32
    for line in lines: d.text((gap, y), line, fill='#d6dbe4', font=small); y += 24
    y += 6; d.text((gap, y), 'FIVE WEAKEST', fill='#ffcf5a', font=font); y += 30
    for i, wk in enumerate(notes.get('weakest', [])[:5]): d.text((gap, y), f'{i + 1}. {wk}', fill='#f1f1f1', font=small); y += 26
    v = notes.get('verdict', '(pending)'); d.text((gap, y + 6), 'VERDICT: ' + v, fill='#7CFC9A' if v.startswith('PASS') else '#ff7070', font=font)
    for i, k in enumerate(keys):
        s = shots_meta[k]; x = gap + (i % COLS) * (pw + gap); y0 = txtH + (i // COLS) * (cap + ph + gap)
        im = Image.open(f'{a.dir}/{k}.png').convert('RGB').resize((pw, ph)); sheet.paste(im, (x, y0 + cap))
        extra = f" stair {round(100 * s['stair']['frac'])}%" if s['anchor'] == 'stairBottom' and s.get('stair') else ''
        if s['anchor'] == 'mainSt': extra = f" signs>=3%: {s.get('signsReadable', 0)}"
        M = s.get('measures') or {}
        if s['anchor'] == 'plazaWide' and M.get('statue'): extra = f" clip {100 * (M['statue']['clipFrac'] or 0):.1f}% face {M['statueFace']['luma']:.2f}>=hat {M['statueHat']['luma']:.2f}"
        if s['anchor'] == 'heroHouse' and M.get('heroDoor'): extra = f" door {100 * M['heroDoor']['frac']:.1f}%"
        if M.get('windows') and M['windows'].get('luma') is not None and not extra: extra = f" win {M['windows']['luma']:.2f}"
        d.text((x, y0 + 2), f"({k}) {s['anchor']}: slots {','.join(s['onScreen']) or '-'}", fill='#7CFC9A' if s['pass'] else '#ff7070', font=small)
        b = notes.get('bench', {}).get(s['anchor'], {}); d.text((x, y0 + 26), (f"{b.get('tris', s['triangles']) / 1000:.1f}k tris {b.get('s', '?')} s/f" + extra)[:46], fill='#d6dbe4', font=small)
    k = 1600 / max(sheet.size)
    if k < 1: sheet = sheet.resize((round(sheet.width * k), round(sheet.height * k)), Image.LANCZOS)
    os.makedirs(os.path.dirname(a.out), exist_ok=True); sheet.save(a.out, optimize=True); print(a.out, sheet.size); raise SystemExit(0)
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
