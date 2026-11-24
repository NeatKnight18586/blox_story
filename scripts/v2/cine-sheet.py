# scripts/v2/cine-sheet.py — tuft 1B review sheets from rendered frames (540×960): review/cine/ab.png (6 shots × 2 frames, before /
# after, ≤ 1600 px), review/cine/ab-390.png (390 px phone width: one frame per shot, before | after) and review/cine/demo.mp4
# (the after animatic, 540×960, ≤ 5 MB). Frames: scripts/v2/render.js --spec engine/fixtures/cine/{before,episode}.json --width 540 --height 960.
# Usage: python3 scripts/v2/cine-sheet.py --before <render out dir> --after <render out dir>
import argparse, glob, json, os, subprocess
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(); ap.add_argument('--before', required=True); ap.add_argument('--after', required=True); ap.add_argument('--out', default='review/cine')
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
spec = json.load(open('engine/fixtures/cine/episode.json')); start = 0; picks = []
for s in spec['shots']:
    n = s['frames']; picks.append((s['id'], [start + round(n * .3), start + round(n * .82)])); start += n
def frame(d, f):
    p = os.path.join(d, 'frames', f'frame-{f:05d}.png')
    if os.path.exists(p): return Image.open(p).convert('RGB')
    m = [x for x in glob.glob(os.path.join(d, 'cache', '*', '*.png'))]   # single-frame renders: find the cached file by shot + offset
    st = 0
    for s in spec['shots']:
        if st <= f < st + s['frames']:
            c = [x for x in m if os.path.basename(os.path.dirname(x)).startswith(s['id'] + '-') and os.path.basename(x) == f'{f - st:04d}.png']
            return Image.open(c[0]).convert('RGB')
        st += s['frames']
    raise SystemExit(f'no frame {f} in {d}')
def label(im, t):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 8 + 6 * len(t), 14], fill=(0, 0, 0)); d.text((4, 2), t, fill=(255, 255, 255)); return im
CW, CH = 220, 391
sheet = Image.new('RGB', (6 * CW, 4 * CH), (16, 18, 22))
for i, (sid, fr) in enumerate(picks):
    col = (i % 3) * 2; band = (i // 3) * 2
    for j, f in enumerate(fr):
        for r, (d, tag) in enumerate([(a.before, 'before'), (a.after, 'after')]):
            sheet.paste(label(frame(d, f).resize((CW, CH), Image.LANCZOS), f'{sid} {tag} f{f}'), ((col + j) * CW, (band + r) * CH))
sheet.save(os.path.join(a.out, 'ab.png'))
W = 195; H = round(W * 16 / 9); ph = Image.new('RGB', (2 * W, 6 * H), (16, 18, 22))
for i, (sid, fr) in enumerate(picks):
    for j, d in enumerate([a.before, a.after]): ph.paste(label(frame(d, fr[1]).resize((W, H), Image.LANCZOS), f"{sid[:1]} {'before' if j == 0 else 'after'}"), (j * W, i * H))
ph.save(os.path.join(a.out, 'ab-390.png'))
mp4 = os.path.join(a.out, 'demo.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(spec['fps']), '-i', os.path.join(a.after, 'frames', 'frame-%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], check=True)
print(json.dumps({'ab': sheet.size, 'ab390': ph.size, 'demoMB': round(os.path.getsize(mp4) / 1e6, 2), 'picks': picks}))
