#!/usr/bin/env python3
"""Pass A contact sheet (one PNG, 1600 px wide): sponsor refs (if present) beside our renders, proportion overlay + table.
   python3 campaigns/tapcap/scripts/sheet-a.py --ep campaigns/tapcap/ep01-rarity
The sheet can embed sponsor refs, so it lives under <ep>/review/ (gitignored) and is sent directly, never committed."""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('--ep', default='campaigns/tapcap/ep01-rarity'); a = ap.parse_args()
OUT = f'{a.ep}/review/pass-a'; P = f'{OUT}/panels'; REFS = 'campaigns/tapcap/refs'; W = 1600
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s)
FB = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
rep = json.load(open(f'{a.ep}/qa/proportions.json')); m = rep['measured']
rows = []

def label(im, text, sub=None):
    d = ImageDraw.Draw(im); d.rectangle([0, im.height - 26, im.width, im.height], fill=(20, 22, 28)); d.text((6, im.height - 22), text, font=F(15), fill='white')
    return im
def panel(name, w, h, text):
    p = f'{P}/{name}.png'
    im = Image.open(p).convert('RGB').resize((w, h), Image.LANCZOS) if os.path.exists(p) else Image.new('RGB', (w, h), (60, 0, 0))
    return label(im, text)
def ref(name, w, h):
    p = f'{REFS}/{name}'
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); s = min(w / im.width, h / im.height); im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
        c = Image.new('RGB', (w, h), (235, 235, 235)); c.paste(im, ((w - im.width) // 2, (h - im.height) // 2)); return label(c, f'REF {name}')
    c = Image.new('RGB', (w, h), (250, 236, 236)); d = ImageDraw.Draw(c)
    d.rectangle([2, 2, w - 3, h - 3], outline=(200, 40, 40), width=3); d.text((14, h // 2 - 30), f'REF MISSING\n{REFS}/{name}\n(not dropped yet: no side-by-side)', font=F(15), fill=(160, 20, 20), spacing=6)
    return c
def title(text, col=(20, 22, 28)):
    im = Image.new('RGB', (W, 34), (242, 243, 246)); ImageDraw.Draw(im).text((10, 7), text, font=FB(18), fill=col); return im
def strip(ims):
    im = Image.new('RGB', (W, max(i.height for i in ims)), 'white'); x = 0
    for i in ims: im.paste(i, (x, 0)); x += i.width
    return im

ok = rep['pass']
rows.append(title(f"TapCap EP01 · Pass A gate · master Slime Guy · proportion check {'PASS' if ok else 'FAIL'}", (0, 120, 40) if ok else (190, 20, 20)))
# 1. reference turnaround + our turnaround (ortho, same scale for all six)
rows.append(title('1 · Turnaround: sponsor reference (top) vs gradient demo unit, orthographic, one scale for all six views'))
rows.append(ref('tapcap_turnaround.png', W, 300))
views = ['front', 'back', 'left', 'right', 'top', 'bottom']; tw, th = W // 6, int(W // 6 * 420 / 300)
turn = [panel(f'turn_{v}', tw, th, v) for v in views]
# proportion overlay on the front view: spec band lines (dashed cyan) vs measured (solid magenta); span 1.12 H over the panel height
d = ImageDraw.Draw(turn[0]); pxH = th / 1.12; row = lambda y: th / 2 - (y - .5) * pxH
spec = [.34, .38, .67]; b = m['bands']; H = m['heightH']; meas = [b['base'] * H, (b['base'] + b['switch']) * H, (b['base'] + b['switch'] + b['torso']) * H]
for y in spec:
    for x in range(0, tw, 12): d.line([x, row(y), x + 6, row(y)], fill=(0, 200, 255), width=2)
for y in meas: d.line([0, row(y), tw, row(y)], fill=(255, 0, 200), width=1)
rows.append(strip(turn))
# proportion table
t = Image.new('RGB', (W, 150), 'white'); d = ImageDraw.Draw(t); c = rep['checks']; y = 8
d.text((10, y), 'Measured vs spec (front ortho flat-ID, 1000 px/H). Overlay on FRONT: dashed cyan = spec band lines, solid magenta = measured.', font=F(15), fill='black'); y += 24
line = '   '.join(f"{k} {v['got']*100:.1f}% (spec {v['want']*100:.0f}±{v['tol']*100:.0f}) {'✓' if v['pass'] else '✗'}" for k, v in c['bands'].items()); d.text((10, y), 'BANDS  ' + line, font=FB(15), fill='black'); y += 24
line = '   '.join(f"{k} {v['got']:.3f}H (spec {v['want']:.2f}±{v['tol']}) {'✓' if v['pass'] else '✗'}" for k, v in c['widths'].items()); d.text((10, y), 'WIDTHS ' + line, font=F(15), fill='black'); y += 22
e = c['eye']; n = c['notch']
d.text((10, y), f"EYES  h/head {e['hOfHead']['got']} (.22)  w/h {e['wOverH']['got']} (.333)  sep/headW {e['sepOfHeadW']['got']} (.50)  above mid {m['eye']['aboveMid']}    NOTCH w/base {n['wOfBase']['got']} (.30)  h/base {n['hOfBase']['got']} (.12)", font=F(15), fill='black'); y += 22
d.text((10, y), f"TAP full press −{rep['tap']['depth']*100:.0f}% H: switch band {rep['tap']['switchBandPressed']*100:.1f}% (fully covered by the keycap).  Failures: {'; '.join(rep['failures']) or 'none'}", font=F(15), fill=(190, 20, 20) if rep['failures'] else 'black')
rows.append(t)
# 2. lineup: 9 colours
rows.append(title('2 · Colour presets: Core ×5 · Rare ×3 · Ultra Rare Cosmic (same master asset, 3/4 view)'))
cols = ['frozen', 'grape', 'bubblegum', 'midnight', 'banana', 'pumpkin', 'strawberry', 'coffee', 'cosmic']; cw = W // 9
rows.append(strip([panel(f'col_{k}', cw, int(cw * 4 / 3), k) for k in cols]))
rows.append(strip([ref('tapcap_rarities.png', W // 2, 220), ref('tapcap_lineup.jpg', W // 2, 220)]))
# 3. paints + tap
rows.append(title('3 · Story materials: paint_fake_cosmic · paint_fake_banana (+ S12 fleck, back) · paint_run at 50 % · tap at full press'))
pw = W // 6
rows.append(strip([panel(n, pw, int(pw * 4 / 3), l) for n, l in [('paint_fake_cosmic', 'fake_cosmic (Banana)'), ('paint_fake_banana', 'fake_banana (Sunny)'), ('paint_fleck_back', 'S12 fleck: back drip tip'),
    ('paint_run_banana', 'paint_run 50% Banana'), ('paint_run_sunny', 'paint_run 50% Sunny'), ('tap_pressed', 'tap: full press')]]))
# 4. expressions
rows.append(title('4 · Expressions (Banana): default · hopeful · gasp · sad · joy'))
ew = W // 5; rows.append(strip([panel(f'face_{f}', ew, int(ew * 260 / 300), f) for f in ['default', 'hopeful', 'gasp', 'sad', 'joy']]))
# 5. Clix
rows.append(title('5 · Clix: reference · stylized bust · gloved hand poses (reach, index tap, two-finger double tap)'))
kw = W // 5; kh = int(kw * 1.4)
rows.append(strip([ref('clix_sheet.png', kw, kh), panel('clix_bust', kw, kh, 'bust (3/4)'), panel('hand_reach', kw, kh, 'reach'), panel('hand_tap', kw, kh, 'index tap'), panel('hand_doubleTap', kw, kh, 'two-finger double tap')]))
sheet = Image.new('RGB', (W, sum(r.height for r in rows)), 'white'); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height
sheet.save(f'{OUT}/pass-a-sheet.png'); print(f'{OUT}/pass-a-sheet.png', sheet.size)
