#!/usr/bin/env python3
"""scripts/v2/look6-sheets.py — Look 6 sheets at 390 px (middle frame of a shot, rendered at 1080×1920 then downsized).
  python3 scripts/v2/look6-sheets.py ba      → review/toyhouse/look6-before-after-390.png: 8159612 (set5b.json in a worktree) vs now
                                               (set6.json): top-down, counter close, candy medium, track, aisle wide, street; pairs side by side
  python3 scripts/v2/look6-sheets.py states  → review/toyhouse/lightstates-390.png: the aisle in toyNight / toyLate / toyDawn
  python3 scripts/v2/look6-sheets.py all [out.png] [--w 540]  → every set6 shot (working sheet, not committed)"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
what = sys.argv[1] if len(sys.argv) > 1 else 'ba'; font = ImageFont.load_default(size=15); W, H = 390, 693
RW = int(sys.argv[sys.argv.index('--w') + 1]) if '--w' in sys.argv else 1080; RH = RW * 16 // 9
def render(spec, out, cwd=ROOT):
    subprocess.run(['rm', '-rf', out]); subprocess.run(['npm', 'run', 'v2:render', '--', '--spec', spec, '--out', out, '--width', str(RW), '--height', str(RH), '--aa', '1', '--every', '12'], check=True, capture_output=True, cwd=cwd)
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
    os.makedirs(os.path.dirname(os.path.join(ROOT, path)), exist_ok=True); im.save(os.path.join(ROOT, path)); print(path, im.size)
SET6 = os.path.join(ROOT, 'engine/fixtures/toyhouse/set6.json')
if what == 'ba':
    wt = os.path.join(ROOT, 'renders/v5/look6-before-wt')
    if not os.path.exists(wt):
        subprocess.run(['git', 'worktree', 'add', '--detach', wt, '8159612'], check=True, cwd=ROOT, capture_output=True)
        subprocess.run(['cp', '-r', os.path.join(ROOT, 'node_modules'), os.path.join(wt, 'node_modules')], check=True)   # copies: the dev server does not follow symlinks out of the tree
    bo, ao = os.path.join(wt, 'renders/v5/before'), os.path.join(ROOT, 'renders/v5/look6')
    render('engine/fixtures/toyhouse/set5b.json', bo, cwd=wt); render('engine/fixtures/toyhouse/set6.json', ao)
    B, A = shots_of(os.path.join(wt, 'engine/fixtures/toyhouse/set5b.json')), shots_of(SET6)
    cells = []
    for k, label in [('S1-top', 'top-down'), ('S3-counter', 'counter close'), ('S4-candy', 'candy medium'), ('S8-track', 'track'), ('S2-aisle', 'aisle wide'), ('S5-street', 'street (dawn)')]:
        cells += [(frame(bo, B[k]), f'BEFORE 8159612 · {label}'), (frame(ao, A[k]), f'NOW Look 6 · {label}')]
    sheet(cells, 4, 'review/toyhouse/look6-before-after-390.png', 'Look 6 after hours: before (8159612, Look 5b) | now (toyNight), pairs side by side')
if what == 'states':
    spec = os.path.join(ROOT, 'engine/fixtures/toyhouse/lightstates6.json'), ; out = os.path.join(ROOT, 'renders/v5/lightstates6'); render('engine/fixtures/toyhouse/lightstates6.json', out)
    S = shots_of(spec[0]); cells = [(frame(out, S['aisle-' + l]), f'aisle · {l}') for l in ['toyNight', 'toyLate', 'toyDawn']]
    sheet(cells, 3, 'review/toyhouse/lightstates-390.png', 'Look 6 light states: the same aisle in toyNight / toyLate (half the pendants off) / toyDawn (gold through the shutter)')
if what == 'all':
    out = os.path.join(ROOT, 'renders/v5/look6'); render('engine/fixtures/toyhouse/set6.json', out); S = shots_of(SET6)
    sheet([(frame(out, s), k) for k, s in S.items()], 5, sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else 'renders/v5/look6-all.png', 'Look 6 working sheet (set6)')
