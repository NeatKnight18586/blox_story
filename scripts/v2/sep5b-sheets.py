#!/usr/bin/env python3
"""scripts/v2/sep5b-sheets.py — Look 5b sheets at 390 px (middle frame of a shot, rendered at 1080×1920 then downsized).
  python3 scripts/v2/sep5b-sheets.py ba      → review/toyhouse/sep-before-after-390.png: 07d3fa3 (set5.json in a worktree) vs now
                                               (set5b.json): counter close, candy medium, track, aisle wide, street; pairs side by side
  python3 scripts/v2/sep5b-sheets.py motion  → review/toyhouse/motion-demo2-390.png: 8 frames of renders/v5/motion5b (the demo)"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
what = sys.argv[1] if len(sys.argv) > 1 else 'ba'; font = ImageFont.load_default(size=15); W, H = 390, 693
def render(spec, out, cwd=ROOT):
    subprocess.run(['rm', '-rf', out]); subprocess.run(['npm', 'run', 'v2:render', '--', '--spec', spec, '--out', out, '--width', '1080', '--height', '1920', '--aa', '1', '--every', '12'], check=True, capture_output=True, cwd=cwd)
def shots_of(spec):
    d = json.load(open(spec)); t = 0; out = {}
    for s in d['shots']: out[s['id']] = {**s, 'start': t}; t += s['frames']
    return out
def frame(out, s, every=12):
    n = s['start'] + s['frames'] // 2; n -= n % every; return Image.open(f'{out}/frames/frame-{n // every:05d}.png').convert('RGB').resize((W, H), Image.LANCZOS)
def sheet(cells, cols, path, title):
    rows = (len(cells) + cols - 1) // cols; top = 26; im = Image.new('RGB', (cols * W, top + rows * (H + 22)), '#1b1d21'); dr = ImageDraw.Draw(im); dr.text((6, 5), title, fill='#ffffff', font=font)
    for i, (img, label) in enumerate(cells):
        x, y = (i % cols) * W, top + (i // cols) * (H + 22); im.paste(img, (x, y + 22)); dr.text((x + 4, y + 3), label, fill='#ffd84a', font=font)
    os.makedirs(os.path.join(ROOT, 'review/toyhouse'), exist_ok=True); im.save(os.path.join(ROOT, path)); print(path, im.size)
if what == 'ba':
    wt = os.path.join(ROOT, 'renders/v5/sep-before-wt')
    if not os.path.exists(wt):
        subprocess.run(['git', 'worktree', 'add', '--detach', wt, '07d3fa3'], check=True, cwd=ROOT, capture_output=True)
        subprocess.run(['cp', '-r', os.path.join(ROOT, 'node_modules'), os.path.join(wt, 'node_modules')], check=True); os.makedirs(os.path.join(wt, 'renders'), exist_ok=True); subprocess.run(['cp', '-r', os.path.join(ROOT, 'renders/cache'), os.path.join(wt, 'renders/cache')], check=True)   # copies: the dev server does not follow symlinks out of the tree
    bo, ao = os.path.join(wt, 'renders/v5/before'), os.path.join(ROOT, 'renders/v5/sep5b')
    render('engine/fixtures/toyhouse/set5.json', bo, cwd=wt); render('engine/fixtures/toyhouse/set5b.json', ao)
    B, A = shots_of(os.path.join(wt, 'engine/fixtures/toyhouse/set5.json')), shots_of(os.path.join(ROOT, 'engine/fixtures/toyhouse/set5b.json'))
    cells = []
    for k, label in [('S3-counter', 'counter close'), ('S4-candy', 'candy medium'), ('S8-track', 'track'), ('S2-aisle', 'aisle wide'), ('S5-street', 'street (dawn)')]:
        cells += [(frame(bo, B[k]), f'BEFORE 07d3fa3 · {label}'), (frame(ao, A[k]), f'NOW Look 5b · {label}')]
    sheet(cells, 4, 'review/toyhouse/sep-before-after-390.png', 'Look 5b: before (07d3fa3) | now, pairs side by side')
if what == 'motion':
    d = os.path.join(ROOT, 'renders/v5/motion5b/frames'); ns = [12, 26, 34, 60, 84, 110, 130, 178]
    cells = [(Image.open(f'{d}/frame-{n:05d}.png').convert('RGB').resize((W, H), Image.LANCZOS), f'f{n} · {n / 24:.2f} s') for n in ns]
    sheet(cells, 4, 'review/toyhouse/motion-demo2-390.png', 'Look 5b motion demo: point 1.0 s (overshoot), shrug 2.1, jump 3.4, crashZoom 7.25 (blur)')
