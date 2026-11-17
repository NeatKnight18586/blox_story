#!/usr/bin/env python3
"""scripts/v2/toy-sheets.py — Phase 3b sheets at 390 px: review/toyhouse/set-390.png (one cell per shot of engine/fixtures/toyhouse/set.json)
and cast-390.png. Renders mid-shot frames at 1080×1920 through render.js, then downsizes to 390 px wide.
  python3 scripts/v2/toy-sheets.py [set|cast|both]"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
what = sys.argv[1] if len(sys.argv) > 1 else 'both'; font = ImageFont.load_default(size=15); W, H = 390, 693
def render(spec, out, frames):
    subprocess.run(['rm', '-rf', out]); subprocess.run(['npm', 'run', 'v2:render', '--', '--spec', spec, '--out', out, '--width', '1080', '--height', '1920', '--aa', '1', '--every', '12'], check=True, capture_output=True)
def cells(spec, out, labels, cols, path, pick=lambda s: s['start'] + s['frames'] // 2):
    d = json.load(open(spec)); t = 0; shots = []
    for s in d['shots']: shots.append({**s, 'start': t}); t += s['frames']
    rows = (len(shots) + cols - 1) // cols; sheet = Image.new('RGB', (cols * W, rows * (H + 22)), '#1b1d21'); dr = ImageDraw.Draw(sheet)
    for i, s in enumerate(shots):
        n = pick(s); n -= n % 12; f = f'{out}/frames/frame-{n // 12:05d}.png'
        if s.get('grade'):   # per-shot grade (memory / dawn): the same .cube assemble applies
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lut4; os.makedirs('renders/v5/luts', exist_ok=True); cube = os.path.abspath(f"renders/v5/luts/{s['grade']}.cube"); open(cube, 'w').write(lut4.cube(s['grade']))
            g = f.replace('.png', '-graded.png'); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-vf', f"lut3d=file={cube}", g], check=True); f = g
        x, y = (i % cols) * W, (i // cols) * (H + 22); sheet.paste(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + 22)); dr.text((x + 4, y + 3), labels(s), fill='#ffd84a', font=font)
    os.makedirs('review/toyhouse', exist_ok=True); sheet.save(path); print(path, sheet.size)
if what in ('set', 'both'):
    render('engine/fixtures/toyhouse/set.json', 'renders/v5/toy-set', None)
    cells('engine/fixtures/toyhouse/set.json', 'renders/v5/toy-set', lambda s: f"{s['id']} · {s['move']}", 4, 'review/toyhouse/set-390.png')
if what in ('cast', 'both'):
    render('engine/fixtures/toyhouse/cast.json', 'renders/v5/toy-cast', None)
    cells('engine/fixtures/toyhouse/cast.json', 'renders/v5/toy-cast', lambda s: s['id'], 4, 'review/toyhouse/cast-390.png')
