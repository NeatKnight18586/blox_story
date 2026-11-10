"""Encode + verify the studio sequence master from native PNG frames.

Usage: python3 scripts/studio-sequence-finish.py [renders/studio-sequence-1440] [renders/seq-check]
Writes evidence/studio-sequence/: master MP4, 720p preview MP4 (labelled downscale),
contact sheet, phone sheet, verification.json.
"""
import glob
import hashlib
import json
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, 'studio/qa')
from color_metrics import frame_metrics  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else 'renders/studio-sequence-1440'
CHECK = sys.argv[2] if len(sys.argv) > 2 else 'renders/seq-check'
OUT = 'evidence/studio-sequence'
FPS, FRAMES, CUTS = 30, 360, [0, 135, 240, 360]
subprocess.run(['mkdir', '-p', OUT], check=True)
run = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout
sha = p => hashlib.sha256(open(p, 'rb').read()).hexdigest()

frames = sorted(glob.glob(f'{SRC}/frame-*.png'))
sizes = {Image.open(f).size for f in frames}
complete = len(frames) == FRAMES and [int(f[-9:-4]) for f in frames] == list(range(FRAMES))
W, H = next(iter(sizes))
master = f'{OUT}/sequence-{W}x{H}.mp4'
run('ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', f'{SRC}/frame-%05d.png', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', master)
preview = f'{OUT}/sequence-720x1280-preview.mp4'
run('ffmpeg', '-y', '-v', 'error', '-i', master, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', preview)

probe = json.loads(run('ffprobe', '-v', 'error', '-count_frames', '-show_entries',
                       'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration:format=size,bit_rate', '-of', 'json', master))
decode_errors = subprocess.run(['ffmpeg', '-v', 'error', '-i', master, '-f', 'null', '-'], capture_output=True, text=True).stderr.strip()

# Encode fidelity: decode sample frames from the MP4 and compare with source PNGs (PSNR).
def decoded(i):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', master, '-vf', f'select=eq(n\\,{i})', '-vframes', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float64)
psnr = {}
for i in [0, 67, 134, 135, 200, 239, 240, 300, 359]:
    a = np.asarray(Image.open(frames[i]).convert('RGB'), np.float64); mse = ((a - decoded(i)) ** 2).mean()
    psnr[i] = round(10 * np.log10(255 ** 2 / mse), 2)

# Cut detection: mean absolute difference between consecutive frames (downsampled).
small = [np.asarray(Image.open(f).convert('L').resize((90, 160)), np.float64) for f in frames]
diffs = [float(np.abs(small[i] - small[i - 1]).mean()) for i in range(1, FRAMES)]
spikes = sorted(range(1, FRAMES), key=lambda i: -diffs[i - 1])[:2]

# Determinism: frames re-rendered in a separate browser process must be byte-identical.
check = {}
for f in sorted(glob.glob(f'{CHECK}/frame-*.png')):
    i = int(f[-9:-4]); check[i] = sha(f) == sha(frames[i])

shots = {s: [frame_metrics(frames[i]) for i in range(a, b, 15)] for s, a, b in zip('ABC', CUTS, CUTS[1:])}
shot_metrics = {s: {k: round(float(np.mean([m[k] for m in v])), 3) for k in v[0]} for s, v in shots.items()}

# Contact sheet: every 15th frame, numbered.
font = ImageFont.load_default(size=18)
cs = Image.new('RGB', (6 * 180, 4 * 320))
for n, i in enumerate(range(0, FRAMES, 15)):
    im = Image.open(frames[i]).convert('RGB').resize((180, 320), Image.LANCZOS)
    ImageDraw.Draw(im).text((6, 4), f'{i} {"ABC"[sum(i >= c for c in CUTS[1:3])]}', fill='white', font=font, stroke_width=2, stroke_fill='black')
    cs.paste(im, ((n % 6) * 180, (n // 6) * 320))
cs.save(f'{OUT}/contact-sheet.jpg', quality=88)
# Phone sheet: one held frame per shot at 390px wide (iPhone-width review).
ph = Image.new('RGB', (390 * 3, 693))
for n, i in enumerate([100, 230, 345]):
    ph.paste(Image.open(frames[i]).convert('RGB').resize((390, 693), Image.LANCZOS), (n * 390, 0))
ph.save(f'{OUT}/phone-390.jpg', quality=88)
for i in [100, 230, 345]:
    Image.open(frames[i]).convert('RGB').save(f'{OUT}/still-{i:03d}-{W}x{H}.jpg', quality=92)

s = probe['streams'][0]
report = {
    'status': 'PASS' if complete and not decode_errors and int(s['nb_read_frames']) == FRAMES and all(check.values()) and sorted(spikes) == CUTS[1:3] else 'CHECK',
    'source': {'frames': len(frames), 'complete': complete, 'sizes': sorted(sizes), 'native': True, 'renderer': 'Chromium SwiftShader WebGL, explicit-frame Three.js'},
    'master': {'file': master, 'sha256': sha(master), 'codec': s['codec_name'], 'profile': s['profile'], 'width': s['width'], 'height': s['height'],
               'pix_fmt': s['pix_fmt'], 'fps': s['r_frame_rate'], 'decoded_frames': int(s['nb_read_frames']), 'duration': float(s['duration']),
               'bytes': int(probe['format']['size']), 'bitrate': int(probe['format']['bit_rate'])},
    'preview': {'file': preview, 'note': 'Lanczos downscale of the native master for phone review; not a native render'},
    'full_decode_errors': decode_errors or None,
    'psnr_vs_source_db': psnr,
    'cuts': {'expected': CUTS[1:3], 'detected_largest_diffs': sorted(spikes), 'diff_at_cuts': [round(diffs[c - 1], 2) for c in CUTS[1:3]],
             'max_diff_within_shots': round(max(d for i, d in enumerate(diffs, 1) if i not in CUTS[1:3]), 2)},
    'determinism_recheck': check,
    'shot_metrics': shot_metrics,
}
json.dump(report, open(f'{OUT}/verification.json', 'w'), indent=1)
print(json.dumps({k: report[k] for k in ['status', 'master', 'psnr_vs_source_db', 'cuts', 'determinism_recheck', 'shot_metrics']}, indent=1))
