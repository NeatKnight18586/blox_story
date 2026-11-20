#!/usr/bin/env python3
"""Before / after sheet of the P3b fix pass at 390 px phone width → review/acting6/before-after-390.png.
Usage: python3 scripts/v2/acting6-ba.py [--before-rev ccde553]
Before = the KEY cell of review/acting6/verbs.png at that git revision (P3); after = the KEY cell of the current review/acting6/verbs.png.
Row layout of verbs.png (scripts/v2/acting6-sheet.js): header 26, left label 150, rows of 304, cells 240 × 300; key = the middle cell."""
import subprocess, sys, io, json
from PIL import Image, ImageDraw
rev = sys.argv[sys.argv.index('--before-rev') + 1] if '--before-rev' in sys.argv else 'ccde553'
OLD = ['idle_alive', 'look_around', 'flinch', 'gasp_step_back', 'point', 'cheer', 'facepalm', 'shrug', 'arms_cross', 'hug', 'grab', 'tug_pull', 'push', 'throw', 'catch', 'carry', 'jump', 'land', 'trip_fall', 'slip', 'bonk_dizzy', 'knees_collapse', 'reach_for', 'comfort_kneel', 'tumble']
NEW = OLD[:24] + ['hug_s', 'hug_l', 'carry_hip', 'tumble']
SHOW = ['idle_alive', 'look_around', 'gasp_step_back', 'arms_cross', 'hug', 'carry']
old = Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'{rev}:review/acting6/verbs.png']))).convert('RGB'); new = Image.open('review/acting6/verbs.png').convert('RGB')
def cell(im, names, n):
    r = names.index(n); y = 26 + r * 304; return im.crop((150 + 240, y, 150 + 480, y + 300))
W = 195; H = round(W * 300 / 240); BG = '#1b1d21'; Y = '#ffd84a'
S = Image.new('RGB', (2 * W, len(SHOW) * (H + 18) + 2), BG); d = ImageDraw.Draw(S)
for i, n in enumerate(SHOW):
    y = i * (H + 18); d.text((4, y + 2), f'{n.replace("_", " ")} · before (P3)', fill=Y); d.text((W + 4, y + 2), 'after (P3b)', fill=Y)
    S.paste(cell(old, OLD, n).resize((W, H), Image.LANCZOS), (0, y + 16)); S.paste(cell(new, NEW, n).resize((W, H), Image.LANCZOS), (W, y + 16))
S.save('review/acting6/before-after-390.png'); print(S.size)
