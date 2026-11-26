#!/usr/bin/env python3
"""scripts/v2/fearbell1g-sheet.py — Phase 1G review sheets (≤ 1600 px wide) from scripts/v2/fearbell1g-gate.js output.
  python3 scripts/v2/fearbell1g-sheet.py --dir renders/fearbell1g --measures review/fearbell/1G-measures.json --out review/fearbell
Writes 1G-creatures.png (turntable front / ¾ / side + act key + the phone-size reaction frame per creature, + the dome inside view),
1G-cast.png, 1G-props.png, 1G-interiors.png. Captions are sheet annotations only (nothing is drawn into the renders)."""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('--dir', required=True); ap.add_argument('--measures'); ap.add_argument('--out', required=True); a = ap.parse_args()
M = json.load(open(a.measures)) if a.measures and os.path.exists(a.measures) else {}
os.makedirs(a.out, exist_ok=True)
try: FONT = ImageFont.truetype('DejaVuSans.ttf', 13)
except OSError: FONT = ImageFont.load_default()
BG, FG = (24, 26, 31), (236, 238, 242)
def cell(path, w, h):
    if not os.path.exists(path): im = Image.new('RGB', (w, h), (60, 20, 20)); ImageDraw.Draw(im).text((6, 6), 'missing', fill=FG, font=FONT); return im
    im = Image.open(path).convert('RGB'); im.thumbnail((w, h)); c = Image.new('RGB', (w, h), BG); c.paste(im, ((w - im.width) // 2, (h - im.height) // 2)); return c
def sheet(rows, out, title):
    """rows = [[(path, w, h, caption), …], …] → stacked rows with captions."""
    W = max(sum(c[1] for c in r) + 8 * (len(r) + 1) for r in rows); H = 30 + sum(max(c[2] for c in r) + 26 for r in rows)
    assert W <= 1600, (out, W)
    S = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(S); d.text((8, 8), title, fill=FG, font=FONT); y = 30
    for r in rows:
        x = 8
        for (p, w, h, cap) in r: S.paste(cell(p, w, h), (x, y)); d.text((x + 2, y + h + 4), cap, fill=FG, font=FONT); x += w + 8
        y += max(c[2] for c in r) + 26
    S.save(out); print(out, S.size)
D = a.dir; st = lambda n: f'{D}/stage/{n}.png'
KINDS = ['ghost', 'trex', 'rat', 'spider', 'vacuum', 'shadowPuff', 'dome', 'pillar']
cr = M.get('creatures', {}); rows = []
for i in range(0, 8, 2):
    r = []
    for k in KINDS[i:i + 2]:
        t = cr.get(k, {}).get('tris', '?')
        r += [(st(f'{k}-front'), 160, 160, f'{k} {t} tris'), (st(f'{k}-3q'), 160, 160, '3/4'), (st(f'{k}-side'), 160, 160, 'side'), (st(f'{k}-act'), 160, 160, 'act'), (f'{D}/react/{k}.png', 90, 160, 'phone')]
    rows.append(r)
rows.append([(f'{D}/react/rat-2.png', 160, 284, 'rat → mouse (after)'), (f'{D}/react/inside.png', 160, 284, 'dome: inside (flashlight only)'), (f'{D}/react/dome.png', 160, 284, 'dome over the plaza'), (f'{D}/react/pillar.png', 160, 284, 'pillar rise'), (f'{D}/react/ghost.png', 160, 284, 'ghost boo (bus stop)'), (f'{D}/react/trex.png', 160, 284, 't-rex roar')])
sheet(rows, f'{a.out}/1G-creatures.png', 'Phase 1G creatures — studio turntable (front, 3/4, side) + act key + phone reaction frame (city look B)')
sheet([[(f'{D}/cast/all.png', 300, 533, 'all (plaza, phone)'), (f'{D}/cast/g1.png', 300, 533, 'Lulu · Kevin · Mr. Pickles'), (f'{D}/cast/g2.png', 300, 533, 'Mailman · Bodybuilder · Teacher'),
        (f'{D}/cast/g3.png', 300, 533, 'Dad · Bus-stop lady · hero'), (f'{D}/cast/g4.png', 240, 533, 'hero · Governor (scale)')]], f'{a.out}/1G-cast.png', 'Phase 1G cast — extras + Lulu + Kevin at phone size (390 × 693), city look B')
pr = M.get('props', {}); P = ['burger', 'slider', 'plate', 'spaghetti', 'plush', 'flashlight', 'mailBurst', 'bellRope', 'donut', 'busStop', 'dinerCounter']
sheet([[(st(f'prop-{n}'), 190, 190, f"{n} {pr.get(n, {}).get('tris', '?')}") for n in P[:6]], [(st(f'prop-{n}'), 190, 190, f"{n} {pr.get(n, {}).get('tris', '?')}") for n in P[6:]],
       [(f'{D}/props/diner.png', 240, 427, 'diner outdoor counter'), (f'{D}/props/bus.png', 240, 427, 'bus stop (Main St) + donut'), (f'{D}/props/hand.png', 240, 427, 'flashlight cone · rope · mail burst'), (f'{D}/stage/governor-announce.png', 240, 427, 'Governor announce (fix)')]],
      f'{a.out}/1G-props.png', 'Phase 1G props — studio cells + in the world (city look B)')
rm = sorted(f for f in os.listdir(f'{D}/rooms')) if os.path.isdir(f'{D}/rooms') else []
if rm: sheet([[(f'{D}/rooms/{f}', 380, 676, f[:-4].replace('-', ': ')) for f in rm]], f'{a.out}/1G-interiors.png', 'Phase 1G interiors — CLASSROOM + HERO HOME DINING, 2 key-art anchors each (city look B, phone 390 × 693)')
