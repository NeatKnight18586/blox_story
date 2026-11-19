#!/usr/bin/env python3
"""tools/look_sheet.py: Phase 5 before/after sheets at 390 px phone width (A5 §S): per shot, 'before' (Phase R lit street, no mood/post)
+ the 5 moods, 3 × 2 grid, labelled.   python3 tools/look_sheet.py [--stills renders/look7] [--out review/look7] [--shots R1_lowwide,R3_face]"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'
ORDER = ['before', 'dawnHope', 'overcastDread', 'goldenBittersweet', 'nightMystery', 'stormAction']

a = argparse.ArgumentParser(); a.add_argument('--stills', default='renders/look7'); a.add_argument('--out', default='review/look7')
a.add_argument('--shots', default='R1_lowwide,R3_face'); o = a.parse_args()
W, H = 390, 693; font = ImageFont.truetype(str(FONT), 22)
for shot in o.shots.split(','):
    sheet = Image.new('RGB', (3 * W, 2 * H), (15, 15, 15)); d = ImageDraw.Draw(sheet)
    for k, mood in enumerate(ORDER):
        p = Path(o.stills) / f'{mood}-{shot}.png'
        if not p.exists(): continue
        x, y = (k % 3) * W, (k // 3) * H; sheet.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (x, y))
        d.rectangle([x, y, x + W, y + 30], fill=(0, 0, 0)); d.text((x + 6, y + 3), f'{k}. {mood}', fill=(255, 235, 120), font=font)
    out = Path(o.out) / f'moods-{shot}-390.png'; out.parent.mkdir(parents=True, exist_ok=True); sheet.save(out); print(out, sheet.size)
