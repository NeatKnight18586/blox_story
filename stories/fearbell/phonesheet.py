#!/usr/bin/env python3
"""stories/fearbell/phonesheet.py <animatic.mp4> <episode-gapped.json> <out prefix> — the 390-px PHONE SHEET: one cell per shot (its middle
frame, read from the captioned animatic), each scaled to the 390×693 phone frame, labelled with the shot id; 4 × 2 cells per page
(1560 × ≤ 1450 px, ≤ 1600 px) → <out prefix>.png, <out prefix>-2.png …"""
import json, subprocess, sys, tempfile, os
from PIL import Image, ImageDraw, ImageFont
video, spec, out = sys.argv[1:4]
S = json.load(open(spec)); fps = S.get('fps', 24); t = 0; mids = []
for s in S['shots']:
    mids.append((s['id'], (t + s['frames'] / 2) / fps)); t += s['frames']
W, H, COLS, ROWS, LAB = 390, 693, 4, 2, 26
font = ImageFont.load_default(size=20); tmp = tempfile.mkdtemp(); cells = []
for sid, sec in mids:
    f = os.path.join(tmp, sid + '.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{sec:.3f}', '-i', video, '-frames:v', '1', '-vf', f'scale={W}:{H}:flags=lanczos', f], check=True)
    c = Image.new('RGB', (W, H + LAB), '#111'); c.paste(Image.open(f).convert('RGB'), (0, LAB)); ImageDraw.Draw(c).text((6, 2), f'{sid}  {sec:.2f}s', fill='#ffd84a', font=font); cells.append(c)
per = COLS * ROWS
for p in range(0, len(cells), per):
    page = cells[p:p + per]; rows = (len(page) + COLS - 1) // COLS; sheet = Image.new('RGB', (COLS * W, rows * (H + LAB)), '#000')
    for i, c in enumerate(page): sheet.paste(c, ((i % COLS) * W, (i // COLS) * (H + LAB)))
    name = out + ('' if p == 0 else f'-{p // per + 1}') + '.png'; sheet.save(name); print(name, sheet.size)
