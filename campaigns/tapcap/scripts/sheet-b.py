#!/usr/bin/env python3
"""Pass B contact sheet: 6 location stills (3 × 2), labelled, with the measured line under each. 1600 px wide."""
import json
from PIL import Image, ImageDraw, ImageFont
ep = 'campaigns/tapcap/ep01-rarity'; out = f'{ep}/review/pass-b'; d = json.load(open(f'{out}/stills.json'))
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s); FB = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
W, cw = 1600, 1600 // 3; ch = int(cw * 16 / 9); lab = 46
sheet = Image.new('RGB', (W, 40 + 2 * (ch + lab)), 'white'); g = ImageDraw.Draw(sheet)
C = d['checks']; ok = lambda b: '✓' if b else '✗'
g.text((10, 9), f"TapCap EP01 · Pass B · Slime Town · crowd {C['crowdSize']['n']} {ok(C['crowdSize']['pass'])} (rares {C['crowdMix']['rares']}, loops {C['loops']['counts']}) {ok(C['loops']['pass'])}", font=FB(17), fill='black')
for i, r in enumerate(d['res']):
    x, y = (i % 3) * cw, 40 + (i // 3) * (ch + lab)
    sheet.paste(Image.open(f"{out}/panels/{r['cam']}.png").convert('RGB').resize((cw, ch), Image.LANCZOS), (x, y))
    lu = next(l for l in C['luma'] if l['still'] == r['cam']); sg = [s for s in C['signs'] if s['still'] == r['cam']]
    g.rectangle([x, y + ch, x + cw, y + ch + lab], fill=(20, 22, 28)); g.text((x + 6, y + ch + 3), f"{i + 1} · {r['label']} · {r['mood']}", font=FB(14), fill='white')
    g.text((x + 6, y + ch + 23), f"luma {lu['luma']:.2f} gate {lu['gate']} {ok(lu['pass'])} · " + (' '.join(f"{s['text']} {s['capFrac']*100:.1f}% {ok(s['pass'])}" for s in sg if s['featured']) or 'no featured sign'), font=F(12), fill='white')
sheet.save(f'{out}/pass-b-sheet.png'); print(f'{out}/pass-b-sheet.png', sheet.size)
