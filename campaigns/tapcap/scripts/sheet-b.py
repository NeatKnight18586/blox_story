#!/usr/bin/env python3
"""Pass B (revision) contact sheet: 8 stills, 4 columns, 1600 px wide, numbered, measured line under each."""
import json
from PIL import Image, ImageDraw, ImageFont
ep = 'campaigns/tapcap/ep01-rarity'; out = f'{ep}/review/pass-b'; Q = json.load(open(f'{ep}/qa/world.json'))
LIL = 'node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s); FB = lambda s: ImageFont.truetype(LIL, s)
W, cw = 1600, 400; ch = int(cw * 16 / 9); lab = 62; ok = lambda b: '✓' if b else ('–' if b is None else '✗')
S = Q['summary']; sheet = Image.new('RGB', (W, 44 + 2 * (ch + lab)), 'white'); g = ImageDraw.Draw(sheet)
g.text((10, 8), f"TapCap EP01 · Pass B revision · town: {S['counts']['buildings']} buildings · B2 void {ok(S['B2_void']['pass'])} · B3 depth {ok(S['B3_depth']['pass'])} · B4 {ok(S['B4_density']['pass'])} · B6 plinth {ok(S['B6_plinth']['pass'])}", font=FB(24), fill='black')
for i, s in enumerate(Q['stills']):
    x, y = (i % 4) * cw, 44 + (i // 4) * (ch + lab)
    sheet.paste(Image.open(f"{out}/panels/{s['id']}.png").convert('RGB').resize((cw, ch), Image.LANCZOS), (x, y))
    g.rectangle([x, y + ch, x + cw, y + ch + lab], fill=(20, 22, 28)); g.text((x + 6, y + ch + 2), f"{i + 1} · {s['label']}", font=FB(19), fill='white')
    l2 = f"luma {s['luma']:.2f} {s['gate']} {ok(s['lumaPass'])}"
    if s['skyMax'] is not None: l2 += f" · sky {s['skyPct']:.0f}% ≤{s['skyMax']*100:.0f} {ok(s['skyPass'])}"
    if s['feature']: l2 += f" · {s['feature']} {s['featureCap']*100:.1f}% {ok(s['featurePass'])}"
    l3 = (f"buildings {s['buildings']} " if 'buildings' in s else '') + (f"horizon {s['horizonCover']}% " if s['horizonCover'] is not None else '') + (f"plinth ΔL* {s['plinth']['contrast']} refl {s['plinth']['reflection']}" if 'plinth' in s else '')
    g.text((x + 6, y + ch + 25), l2, font=F(12), fill='white'); g.text((x + 6, y + ch + 42), l3, font=F(12), fill='white')
sheet.save(f'{out}/pass-b-sheet.png'); print(f'{out}/pass-b-sheet.png', sheet.size)
