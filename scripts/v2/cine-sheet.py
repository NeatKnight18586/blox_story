# scripts/v2/cine-sheet.py — tuft 1B (+ fix) review sheets from rendered frames (540×960): review/cine/ab.png (12 frames — 2 per shot —
# × before / after-1B / after-FIX rows, 1596 px wide), review/cine/ab-390.png (390 px phone width: the same 12 frames, before | 1B | fix),
# review/cine/edge-390.png (the --final hero head crop at native pixels, 390 px each: MSAA 4× + edge AA | no AA; from cine-gates.js)
# and review/cine/demo.mp4 (the after animatic, 540×960, ≤ 5 MB).
# Frames: scripts/v2/render.js --spec engine/fixtures/cine/{before,episode}.json --width 540 --height 960 --aa 0.
# Usage: python3 scripts/v2/cine-sheet.py --before <dir> --after1b <dir> --after <dir>
import argparse, glob, json, os, subprocess
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(); ap.add_argument('--before', required=True); ap.add_argument('--after1b', required=True); ap.add_argument('--after', required=True); ap.add_argument('--out', default='review/cine')
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
spec = json.load(open('engine/fixtures/cine/episode.json')); start = 0; picks = []
for s in spec['shots']:
    n = s['frames']; picks += [(s['id'], start + round(n * .3)), (s['id'], start + round(n * .82))]; start += n
def frame(d, f):
    p = os.path.join(d, 'frames', f'frame-{f:05d}.png')
    if not os.path.exists(p): raise SystemExit(f'no frame {f} in {d}')
    return Image.open(p).convert('RGB')
def label(im, t):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 6 + 6 * len(t), 12], fill=(0, 0, 0)); d.text((3, 1), t, fill=(255, 255, 255)); return im
ROWS = [(a.before, 'before'), (a.after1b, '1B'), (a.after, 'FIX')]
CW = 133; CH = round(CW * 16 / 9)
sheet = Image.new('RGB', (12 * CW, 3 * CH), (16, 18, 22))
for i, (sid, f) in enumerate(picks):
    for r, (d, tag) in enumerate(ROWS): sheet.paste(label(frame(d, f).resize((CW, CH), Image.LANCZOS), f'{sid[:1]} {tag} {f}'), (i * CW, r * CH))
sheet.save(os.path.join(a.out, 'ab.png'))
W = 130; H = round(W * 16 / 9); ph = Image.new('RGB', (3 * W, 12 * H), (16, 18, 22))
for i, (sid, f) in enumerate(picks):
    for j, (d, tag) in enumerate(ROWS): ph.paste(label(frame(d, f).resize((W, H), Image.LANCZOS), f'{sid[:1]} {tag}'), (j * W, i * H))
ph.save(os.path.join(a.out, 'ab-390.png'))
edge = None
g = [x for x in json.load(open(os.path.join(a.out, 'gates.json'))) if x['name'].startswith('edges')] if os.path.exists(os.path.join(a.out, 'gates.json')) else []
if g and os.path.exists('renders/cine/edge-aa1.png'):
    x0, y0, x1, y1 = g[0]['edge']['box']; cx = x0 + 10; cy = y0 + 10; e = Image.new('RGB', (780, 390), (16, 18, 22))
    for j, k in enumerate(['aa1', 'aa0']): e.paste(label(Image.open(f'renders/cine/edge-{k}.png').convert('RGB').crop((cx, cy, cx + 390, cy + 390)), 'MSAA 4x + edge AA' if k == 'aa1' else 'no AA'), (j * 390, 0))
    e.save(os.path.join(a.out, 'edge-390.png')); edge = e.size
mp4 = os.path.join(a.out, 'demo.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(spec['fps']), '-i', os.path.join(a.after, 'frames', 'frame-%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], check=True)
print(json.dumps({'ab': sheet.size, 'ab390': ph.size, 'edge390': edge, 'demoMB': round(os.path.getsize(mp4) / 1e6, 2), 'picks': picks}))
