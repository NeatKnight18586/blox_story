#!/usr/bin/env python3
"""Pass C contact sheets: S1–S20 and S21–S40, 5 columns, 1600 px wide, shot numbers burned in, v6 captions burned into each panel at
its mid-shot time (libass via ffmpeg, from captions.ass)."""
import sys, json, subprocess, os
from PIL import Image, ImageDraw, ImageFont
D, EP = sys.argv[1:3]; Q = json.load(open(f'{EP}/qa/passc.json')); FONTS = 'node_modules/@expo-google-fonts/lilita-one/400Regular'
LIL = f'{FONTS}/LilitaOne_400Regular.ttf'; FB = lambda s: ImageFont.truetype(LIL, s); F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s)
os.makedirs(f'{D}/capd', exist_ok=True)
def burn(s):
    t = s['start'] + s['frames'] / 48; o = f"{D}/capd/{s['id']}.png"
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-i', f"{D}/panels/{s['id']}.png", '-vf', f"scale=1080:1920,setpts=PTS+{t:.3f}/TB,subtitles={D}/captions.ass:fontsdir={FONTS},scale=320:569", '-frames:v', '1', o], check=True)
    return Image.open(o).convert('RGB')
cw, ch, lab = 320, 569, 40; ok = lambda b: '✓' if b else '✗'
for name, lo, hi in [('S1-S20', 1, 20), ('S21-S40', 21, 40)]:
    S = [s for s in Q['shots'] if lo <= int(''.join(c for c in s['id'] if c.isdigit())) <= hi]; rows = (len(S) + 4) // 5
    sheet = Image.new('RGB', (1600, 40 + rows * (ch + lab)), 'white'); g = ImageDraw.Draw(sheet)
    g.text((10, 6), f"TapCap EP01 · Pass C blocking · {name} · 24 fps · captions pop-shorts-v6 #B98CFF · mid-shot frames", font=FB(24), fill='black')
    for i, s in enumerate(S):
        x, y = (i % 5) * cw, 40 + (i // 5) * (ch + lab); sheet.paste(burn(s), (x, y))
        g.rectangle([x, y, x + 74, y + 34], fill=(20, 22, 28)); g.text((x + 6, y + 2), s['id'], font=FB(26), fill='white')
        g.rectangle([x, y + ch, x + cw, y + ch + lab], fill=(20, 22, 28))
        g.text((x + 5, y + ch + 2), f"{s['start']:.2f}s {s['dur']:.2f}s · {s['move']} · {s['size']}", font=F(12), fill='white')
        g.text((x + 5, y + ch + 20), f"{s['mood']} luma {s['luma']:.2f} {ok(s['lumaPass'])}" + (f" · {s['buildings']} bld" if 'buildings' in s else '') + (f" · depth {ok(s['depthPass'])}" if 'depthPass' in s else ''), font=F(12), fill='white')
    sheet.save(f'{D}/pass-c-{name}.png'); print(f'{D}/pass-c-{name}.png', sheet.size)
