#!/usr/bin/env python3
"""Pass A (revision) contact sheet, ONE PNG 1600 px wide:
   ref overlay | 9 colours | Cosmic vs Grape at 120 px | both paints + paint_run 50 % | 5 expressions | Clix turnaround (+ clix_sheet.png)
   + 3 face candidates + tap pose. Embeds sponsor refs → lives under <ep>/review/ (gitignored), sent directly, never committed."""
import argparse, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('--ep', default='campaigns/tapcap/ep01-rarity'); a = ap.parse_args()
OUT = f'{a.ep}/review/pass-a'; P = f'{OUT}/panels'; REFS = 'campaigns/tapcap/refs'; W = 1600
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s)
FB = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
rep = json.load(open(f'{a.ep}/qa/proportions.json')); A = rep['acceptance']; m = rep['measured']; ref = rep['reference']['measured']
rows = []
def label(im, text):
    d = ImageDraw.Draw(im); d.rectangle([0, im.height - 24, im.width, im.height], fill=(20, 22, 28)); d.text((6, im.height - 21), text, font=F(14), fill='white'); return im
def fit(im, w, h, bg=(235, 236, 240)):
    s = min(w / im.width, h / im.height); im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    c = Image.new('RGB', (w, h), bg); c.paste(im, ((w - im.width) // 2, (h - im.height) // 2)); return c
def panel(name, w, h, text, nearest=False):
    im = Image.open(f'{P}/{name}.png').convert('RGB')
    if nearest: im = im.resize((w, int(im.height * w / im.width)), Image.NEAREST); return label(fit(im, w, h), text)
    return label(fit(im, w, h), text)
def title(text, col=(20, 22, 28)):
    im = Image.new('RGB', (W, 32), (242, 243, 246)); ImageDraw.Draw(im).text((10, 6), text, font=FB(17), fill=col); return im
def strip(ims, h=None):
    im = Image.new('RGB', (W, h or max(i.height for i in ims)), 'white'); x = 0
    for i in ims: im.paste(i, (x, 0)); x += i.width
    return im
ok = lambda k: '✓' if A[k]['pass'] else '✗'
rows.append(title(f"TapCap EP01 · Pass A revision · A2 {ok('A2')}  A3 {ok('A3')}  A4 {ok('A4')}  A5 {ok('A5')}  A6 {ok('A6')}"))

# 1. ref overlay: sponsor front view vs our flat-lit front at the same pixel height, 50 % blend
rows.append(title('1 · Reference overlay: sponsor front view | our flat-lit front at the same px height | 50 % overlay (bands: ref vs model)'))
R = Image.open(f'{REFS}/tapcap_turnaround.png').convert('RGB'); k = R.width / 1494
rc = R.crop(tuple(int(v * k) for v in (600, 20, 1010, 770))); ra = np.asarray(rc).astype(float) / 255
rfg = ~(((ra.max(2) - ra.min(2)) / (ra.max(2) + 1e-6) < .10) & (ra.max(2) > .86)); ys, xs = np.nonzero(rfg)
rc = rc.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
meta = json.load(open(f'{OUT}/flat_refscale.json')); fl = np.frombuffer(open(f'{OUT}/flat_refscale.rgba', 'rb').read(), 'uint8').reshape(meta['h'], meta['w'], 4)[::-1, :, :3]
fy, fx = np.nonzero(fl.sum(2) < 765); flat = Image.fromarray(fl[fy.min():fy.max() + 1, fx.min():fx.max() + 1].copy())
H = max(rc.height, flat.height); cw = max(rc.width, flat.width)
def pad(im): c = Image.new('RGB', (cw, H), 'white'); c.paste(im, ((cw - im.width) // 2, H - im.height)); return c   # bottom-centre aligned
ov = Image.blend(pad(rc), pad(flat), .5)
ph = 560; pw = int(cw * ph / H)
blk = [label(fit(pad(rc), pw, ph), 'REF front'), label(fit(pad(flat), pw, ph), 'model flat-lit'), label(fit(ov, pw, ph), '50 % overlay')]
t = Image.new('RGB', (W - 3 * pw, ph), 'white'); d = ImageDraw.Draw(t); y = 10
d.text((12, y), 'A2 bands (front, row majority)', font=FB(16), fill='black'); y += 28
for part in ['head', 'torso', 'switch', 'base']:
    c = rep['checks']['bands'][part]; d.text((12, y), f"{part:7s} ref {ref['bands'][part]*100:5.1f}%   model {c['got']*100:5.1f}%   {'✓' if c['pass'] else '✗'}", font=F(15), fill='black'); y += 24
y += 8; d.text((12, y), 'old spec → new (REF wins > 2 %)', font=FB(15), fill='black'); y += 24
for part, v in rep['specV1']['bands'].items(): d.text((12, y), f"{part:7s} {v*100:.0f}% → {rep['targets']['bands'][part]*100:.1f}%", font=F(15), fill='black'); y += 22
for part, v in rep['specV1']['widths'].items(): d.text((12, y), f"{part} {v:.2f}H → {rep['targets']['widths'][part]:.3f}H", font=F(15), fill='black'); y += 22
y += 8; d.text((12, y), f"tap depth {rep['tap']['depth']*100:.0f}% H: switch at full press {rep['tap']['switchBandPressed']*100:.1f}%", font=F(15), fill='black')
rows.append(strip(blk + [t], ph))

# 2. colours
rows.append(title('2 · Colour presets: Core ×5 · Rare ×3 · Ultra Rare Cosmic'))
cols = ['frozen', 'grape', 'bubblegum', 'midnight', 'banana', 'pumpkin', 'strawberry', 'coffee', 'cosmic']; cw9 = W // 9
rows.append(strip([panel(f'col_{c}', cw9, int(cw9 * 4 / 3), c) for c in cols]))
# 3. Cosmic vs Grape at 120 px (shown 1:1 and ×3 nearest)
c3, g3 = A['A3']['cosmic'], A['A3']['grape']
rows.append(title(f"3 · Cosmic vs Grape at 120 px (1:1 and ×3): Cosmic {c3['sparkles']} sparkles, {c3['hues']} hues {c3['hueCentres']} · Grape {g3['sparkles']} sparkles, {g3['hues']} hue"))
one = Image.new('RGB', (260, 480), 'white'); one.paste(Image.open(f'{P}/small_cosmic.png').convert('RGB'), (5, 160)); one.paste(Image.open(f'{P}/small_grape.png').convert('RGB'), (135, 160)); label(one, '1:1 (120 px)')
rows.append(strip([one, panel('small_cosmic', 360, 480, 'Cosmic ×3', True), panel('small_grape', 360, 480, 'Grape ×3', True)], 480))
# 4. paints
rows.append(title(f"4 · paint_fake_cosmic · paint_fake_banana · paint_run 50 % (both) · flat mask: yellow {A['A4']['yellow']*100:.1f}% (tips/rim {A['A4']['tipsRim']*100:.1f} · arm edges {A['A4']['armEdges']*100:.1f} · gaps {A['A4']['gaps']*100:.1f})"))
pw5 = W // 5
rows.append(strip([panel('paint_fake_cosmic', pw5, int(pw5 * 4 / 3), 'fake_cosmic (Banana)'), panel('paint_fake_banana', pw5, int(pw5 * 4 / 3), 'fake_banana (Sunny)'),
    panel('paint_run_banana', pw5, int(pw5 * 4 / 3), 'paint_run 50% Banana'), panel('paint_run_sunny', pw5, int(pw5 * 4 / 3), 'paint_run 50% Sunny'), panel('mask_fake_cosmic', pw5, int(pw5 * 4 / 3), 'flat mask: magenta paint, yellow peeks')]))
# 5. expressions
rows.append(title(f"5 · Expressions (Banana) · arm bend {A['A5']['deg']}° · front drip max {A['A6']['ratio']*100:.0f}% of longest side drip, none under the mouth"))
ew = W // 5; rows.append(strip([panel(f'face_{f}', ew, int(ew * 260 / 300), f) for f in ['default', 'hopeful', 'gasp', 'sad', 'joy']]))
# 6. Clix
hr = rep['clix']['hair']; tp = rep['clix']['tap']
rows.append(title(f"6 · Clix on R6 (satin) beside clix_sheet.png · hair top +{hr['topRise']*100:.0f}% · fringe {hr['fringeCover']*100:.0f}% · sides {hr['side']:.3f} W · {hr['curls']} curls · tap: arm end {tp['armEndWidthH']} H wide"))
kw = W // 6; kh = int(kw * 1.4)
rows.append(strip([label(fit(Image.open(f'{REFS}/clix_sheet.png').convert('RGB'), kw * 2, kh), 'REF clix_sheet.png')] + [panel(f'clix_{v}', kw, kh, l) for v, l in [('front', 'front'), ('34', '3/4'), ('side', 'side'), ('back', 'back')]]))
from_cands = [('grin', '#2 grin · confident (default)'), ('content', '#5 content · warm'), ('calm', '#32 calm · neutral')]
rows.append(strip([panel(f'clixface_{f}', 400, 400, l) for f, l in from_cands] + [panel('clix_tap', 400, 400, 'tap: blue arm end on head, 3% press')]))
sheet = Image.new('RGB', (W, sum(r.height for r in rows)), 'white'); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height
sheet.save(f'{OUT}/pass-a-sheet.png'); print(f'{OUT}/pass-a-sheet.png', sheet.size)
