#!/usr/bin/env python3
"""scripts/v2/toy5-sheets.py — Phase 3b-R sheets at 390 px (one mid-shot frame per cell, rendered at 1080×1920 then downsized).
  python3 scripts/v2/toy5-sheets.py look   → review/toyhouse/look5-390.png   (every shot of engine/fixtures/toyhouse/set5.json)
  python3 scripts/v2/toy5-sheets.py ba     → review/toyhouse/before-after-390.png (old fb42e88 vs new: top, wide aisle, counter close, candy medium, street)
  python3 scripts/v2/toy5-sheets.py scale  → review/toyhouse/scale-390.png  (hero in the hall: scale, aisle, overlook)
The "before" column is rendered from a git worktree of fb42e88 (renders/v5/before-wt) with an equivalent 5-shot spec."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
what = sys.argv[1] if len(sys.argv) > 1 else 'look'; font = ImageFont.load_default(size=15); W, H = 390, 693
SPEC = 'engine/fixtures/toyhouse/set5.json'
def render(spec, out, cwd=ROOT):
    subprocess.run(['rm', '-rf', out]); subprocess.run(['npm', 'run', 'v2:render', '--', '--spec', spec, '--out', out, '--width', '1080', '--height', '1920', '--aa', '1', '--every', '12'], check=True, capture_output=True, cwd=cwd)
def shots_of(spec):
    d = json.load(open(spec)); t = 0; out = []
    for s in d['shots']: out.append({**s, 'start': t}); t += s['frames']
    return out
def frame(out, s):
    n = s['start'] + s['frames'] // 2; n -= n % 12; return Image.open(f'{out}/frames/frame-{n // 12:05d}.png').convert('RGB').resize((W, H), Image.LANCZOS)
def sheet(cells, cols, path, title=None):
    rows = (len(cells) + cols - 1) // cols; top = 26 if title else 0; im = Image.new('RGB', (cols * W, top + rows * (H + 22)), '#1b1d21'); dr = ImageDraw.Draw(im)
    if title: dr.text((6, 5), title, fill='#ffffff', font=font)
    for i, (img, label) in enumerate(cells):
        x, y = (i % cols) * W, top + (i // cols) * (H + 22); im.paste(img, (x, y + 22)); dr.text((x + 4, y + 3), label, fill='#ffd84a', font=font)
    os.makedirs(os.path.join(ROOT, 'review/toyhouse'), exist_ok=True); im.save(os.path.join(ROOT, path)); print(path, im.size)
def new_frames():
    out = os.path.join(ROOT, 'renders/v5/toy5'); render(SPEC, out); return out, {s['id']: s for s in shots_of(os.path.join(ROOT, SPEC))}
if what == 'look':
    out, S = new_frames(); sheet([(frame(out, s), s['id']) for s in S.values()], 5, 'review/toyhouse/look5-390.png')
if what == 'scale':
    out, S = new_frames(); sheet([(frame(out, S[k]), l) for k, l in [('S6-scale', 'hero in the hall (scale)'), ('S2-aisle', 'aisle: 14-tall gondolas, far half hazes'), ('S12-overlook', 'from the top mezzanine (24)')]], 3, 'review/toyhouse/scale-390.png', 'Toy House 3b-R: scale (hero 5.3 tall · gondolas 14 · ceiling 36 · hall 150 × 210)')
if what == 'ba':
    wt = os.path.join(ROOT, 'renders/v5/before-wt')
    if not os.path.exists(wt):
        subprocess.run(['git', 'worktree', 'add', '--detach', wt, 'fb42e88'], check=True, cwd=ROOT, capture_output=True)
        os.symlink(os.path.join(ROOT, 'node_modules'), os.path.join(wt, 'node_modules')); os.makedirs(os.path.join(wt, 'renders'), exist_ok=True); os.symlink(os.path.join(ROOT, 'renders/cache'), os.path.join(wt, 'renders/cache'))
    old = json.load(open(os.path.join(wt, 'engine/fixtures/toyhouse/set.json'))); keep = {'T1-top': 'top', 'T2-hall': 'wide', 'T3-counter': 'counter', 'T8-street': 'street'}
    shots = [s for s in old['shots'] if s['id'] in keep]; shots.insert(3, {'id': 'T-candy', 'frames': 24, 'move': 'push', 'size': 'medium', 'anchor': 'candy', 'shadowRadius': 16})
    old['shots'] = shots; old['slug'] = 'toyhouse-before'; json.dump(old, open(os.path.join(wt, 'engine/fixtures/toyhouse/before.json'), 'w'), indent=1)
    bo = os.path.join(wt, 'renders/v5/before'); render('engine/fixtures/toyhouse/before.json', bo, cwd=wt); B = shots_of(os.path.join(wt, 'engine/fixtures/toyhouse/before.json'))
    out, S = new_frames(); pairs = [('top-down', B[0], 'S1-top'), ('wide aisle', B[1], 'S2-aisle'), ('counter close', B[2], 'S3-counter'), ('candy medium', B[3], 'S4-candy'), ('street (dawn)', B[4], 'S5-street')]
    cells = []
    for label, b, k in pairs: cells += [(frame(bo, b), f'BEFORE fb42e88 · {label}'), (frame(out, S[k]), f'AFTER 3b-R · {label}')]
    # two rows of five: befores on top, afters below
    cells = [c for i, c in enumerate(cells) if i % 2 == 0] + [c for i, c in enumerate(cells) if i % 2 == 1]
    sheet(cells, 5, 'review/toyhouse/before-after-390.png', 'Toy House: before (fb42e88, top row) vs after (Phase 3b-R, bottom row)')
