"""Encode, verify and package an episode (or a proof range) from native frames.

Usage: python3 scripts/episode-finish.py <episode> [--to=N] [--wav=path] [--name=proof]
Inputs: renders/<ep>-1080/seq/frame-%05d.png (scripts/episode-render.js), the lint ranges
(renders/<ep>-preview/lint.json), captions (scripts/episode-captions.py).
Writes renders/<ep>-final/: <name>-silent.mp4 (commit-safe), <name>-review.mp4 (with the
private voice-over + captions: never committed), contact sheet, 390 px phone sheet and
verification.json (ffprobe, full decode, PSNR, cut check, determinism re-render).
"""
import glob
import hashlib
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

EP = sys.argv[1]
opt = {a.split('=')[0][2:]: a.split('=', 1)[1] for a in sys.argv[2:] if a.startswith('--')}
SEQ, OUT, FPS = f'renders/{EP}-1080/seq', f'renders/{EP}-final', 30
NAME = opt.get('name', 'master')
os.makedirs(OUT, exist_ok=True)
run = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()

frames = sorted(glob.glob(f'{SEQ}/frame-*.png'))
TO = int(opt.get('to', len(frames)))
frames = frames[:TO]
complete = [int(f[-9:-4]) for f in frames] == list(range(TO))
W, H = Image.open(frames[0]).size
ranges = [r for r in json.load(open(f'renders/{EP}-preview/lint.json'))['ranges'] if r[1] < TO]
cuts = [r[1] for r in ranges][1:]

silent = f'{OUT}/{NAME}-{W}x{H}-silent.mp4'
run('ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', f'{SEQ}/frame-%05d.png', '-frames:v', str(TO), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silent)
probe = json.loads(run('ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration:format=size', '-of', 'json', silent))
decode_errors = subprocess.run(['ffmpeg', '-v', 'error', '-i', silent, '-f', 'null', '-'], capture_output=True, text=True).stderr.strip()

review = None
if opt.get('wav'):
    review = f'{OUT}/{NAME}-review-with-voice-and-captions.mp4'
    run('ffmpeg', '-y', '-v', 'error', '-i', silent, '-i', opt['wav'], '-map', '0:v', '-map', '1:a', '-t', f'{TO / FPS:.3f}',
        '-vf', f'ass={OUT}/captions.ass:fontsdir=studio/fonts', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', review)

def decoded(i):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', silent, '-vf', f'select=eq(n\\,{i})', '-vframes', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float64)
psnr = {}
for r in ranges[::max(1, len(ranges) // 8)]:
    i = (r[1] + min(r[2], TO)) // 2
    a = np.asarray(Image.open(frames[i]).convert('RGB'), np.float64)
    psnr[r[0]] = round(10 * np.log10(255 ** 2 / ((a - decoded(i)) ** 2).mean()), 2)

small = [np.asarray(Image.open(f).convert('L').resize((54, 96)), np.float64) for f in frames]
diffs = np.array([np.abs(small[i] - small[i - 1]).mean() for i in range(1, TO)])
at_cuts = diffs[np.array(cuts) - 1] if cuts else np.array([0.])
inside = np.delete(diffs, np.array(cuts) - 1) if cuts else diffs

# Determinism: a few frames re-rendered from scratch must match byte for byte.
check_dir = f'{OUT}/recheck'
picks = sorted({0, TO // 3, 2 * TO // 3, TO - 1})
subprocess.run(['node', 'scripts/studio-sequence-render.js', f'--page=production/episode/?ep={EP}', f'--total={TO}', '--width=1080', '--workers=2',
                '--frames=' + ','.join(map(str, picks)), f'--out={check_dir}'], check=True, capture_output=True)
recheck = {p: sha(f'{check_dir}/frame-{p:05d}.png') == sha(frames[p]) for p in picks}

# Contact sheet (one frame per shot) and a 390 px phone sheet of the first frames.
font = ImageFont.load_default(size=16)
cols = 10; tw, th = 162, 288
cs = Image.new('RGB', (cols * tw, ((len(ranges) + cols - 1) // cols) * th))
for n, r in enumerate(ranges):
    im = Image.open(frames[(r[1] + min(r[2], TO)) // 2]).convert('RGB').resize((tw, th), Image.LANCZOS)
    ImageDraw.Draw(im).text((4, 3), r[0], fill='white', font=font, stroke_width=2, stroke_fill='black'); cs.paste(im, ((n % cols) * tw, (n // cols) * th))
cs.save(f'{OUT}/{NAME}-contact-sheet.jpg', quality=88)
ph = Image.new('RGB', (390 * 4, 693), 'black')
for k, r in enumerate(ranges[:4]):
    ph.paste(Image.open(frames[(r[1] + min(r[2], TO)) // 2]).convert('RGB').resize((390, 693), Image.LANCZOS), (k * 390, 0))
ph.save(f'{OUT}/{NAME}-phone-390.jpg', quality=88)

logs = sorted(glob.glob(f'renders/{EP}-1080/render-log-*.json'))
times = [json.load(open(l)) for l in logs]
s = probe['streams'][0]
report = {
    'status': 'PASS' if complete and not decode_errors and int(s['nb_read_frames']) == TO and all(recheck.values()) and (W, H) == (1080, 1920) else 'CHECK',
    'episode': EP, 'name': NAME, 'frames': TO, 'seconds': round(TO / FPS, 3), 'shots': len(ranges), 'native': {'width': W, 'height': H, 'upscaled': False},
    'silent': {'file': silent, 'sha256': sha(silent), 'codec': s['codec_name'], 'pix_fmt': s['pix_fmt'], 'fps': s['r_frame_rate'], 'decoded_frames': int(s['nb_read_frames']),
               'duration': float(s['duration']), 'bytes': int(probe['format']['size'])},
    'review_with_voice': review and {'file': review, 'note': 'contains the private voice-over; never committed'},
    'full_decode_errors': decode_errors or None, 'psnr_vs_source_db': psnr,
    'cuts': {'count': len(cuts), 'median_diff_at_cuts': round(float(np.median(at_cuts)), 2), 'median_diff_inside_shots': round(float(np.median(inside)), 2)},
    'determinism_recheck': recheck,
    'render_time': [{k: t[k] for k in ('rendered', 'wallSeconds', 'secondsPerFrameWall', 'msPerFrameInPage', 'workers', 'restarts')} for t in times],
}
json.dump(report, open(f'{OUT}/{NAME}-verification.json', 'w'), indent=1)
print(json.dumps(report, indent=1))
