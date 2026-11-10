"""Encode + verify the Dice Town film master from native frames.

Usage: python3 scripts/dice-town-film-finish.py [renders/film-1080] [renders/film-check]
Writes evidence/dice-town-film/: silent master MP4, 720p preview (labelled downscale),
38-shot contact sheet, captions.srt (paragraph cues), verification.json, ADD_NARRATION.md.
"""
import glob
import hashlib
import json
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC = sys.argv[1] if len(sys.argv) > 1 else 'renders/film-1080'
CHECK = sys.argv[2] if len(sys.argv) > 2 else 'renders/film-check'
OUT = 'evidence/dice-town-film'
FPS, FRAMES = 30, 3513
SHOTS = json.load(open('stories/dice-town/P3A_SHOT_OPTIMIZATION.json'))['shots']
CUES = json.load(open('stories/dice-town/Dice_Town_117s_Animatic_Plan.json'))['audio_cues']
CUTS = [s['start_frame'] for s in SHOTS][1:]
subprocess.run(['mkdir', '-p', OUT], check=True)


def run(*a):
    return subprocess.run(a, check=True, capture_output=True, text=True).stdout


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


frames = sorted(glob.glob(f'{SRC}/frame-*.png'))
complete = len(frames) == FRAMES and [int(f[-9:-4]) for f in frames] == list(range(FRAMES))
sizes = {Image.open(f).size for f in frames[::50]}
W, H = Image.open(frames[0]).size
master = f'{OUT}/dice-town-{W}x{H}-silent.mp4'
run('ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', f'{SRC}/frame-%05d.png', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', master)
preview = f'{OUT}/dice-town-720x1280-preview.mp4'
run('ffmpeg', '-y', '-v', 'error', '-i', master, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', preview)
probe = json.loads(run('ffprobe', '-v', 'error', '-count_frames', '-show_entries',
                       'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration:format=size,bit_rate', '-of', 'json', master))
decode_errors = subprocess.run(['ffmpeg', '-v', 'error', '-i', master, '-f', 'null', '-'], capture_output=True, text=True).stderr.strip()

# Encode fidelity on one frame per shot.
def decoded(i):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', master, '-vf', f'select=eq(n\\,{i})', '-vframes', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float64)
psnr = {}
for s in SHOTS[::4]:
    i = (s['start_frame'] + s['end_frame']) // 2
    a = np.asarray(Image.open(frames[i]).convert('RGB'), np.float64)
    psnr[s['id']] = round(10 * np.log10(255 ** 2 / ((a - decoded(i)) ** 2).mean()), 2)

# Cut check: the frame difference at every locked boundary vs. inside shots.
small = [np.asarray(Image.open(f).convert('L').resize((54, 96)), np.float64) for f in frames]
diffs = np.array([np.abs(small[i] - small[i - 1]).mean() for i in range(1, FRAMES)])
at_cuts = diffs[np.array(CUTS) - 1]
inside = np.delete(diffs, np.array(CUTS) - 1)
# Frames that jump inside a shot (possible pops) — reported for review.
pops = [int(i + 1) for i in np.argsort(-diffs) if (i + 1) not in CUTS][:5]

check = {int(f[-9:-4]): sha(f) == sha(frames[int(f[-9:-4])]) for f in sorted(glob.glob(f'{CHECK}/frame-*.png'))}

# 38-shot contact sheet (middle frame of each shot).
font = ImageFont.load_default(size=16)
cs = Image.new('RGB', (10 * 162, 4 * 288))
for n, s in enumerate(SHOTS):
    i = (s['start_frame'] + s['end_frame']) // 2
    im = Image.open(frames[i]).convert('RGB').resize((162, 288), Image.LANCZOS)
    ImageDraw.Draw(im).text((4, 3), s['id'], fill='white', font=font, stroke_width=2, stroke_fill='black')
    cs.paste(im, ((n % 10) * 162, (n // 10) * 288))
cs.save(f'{OUT}/contact-sheet-38-shots.jpg', quality=88)

# Paragraph-level captions from the locked narration cues (timing estimated, not word-aligned).
def ts(sec):
    ms = int(round(sec * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
with open(f'{OUT}/captions.srt', 'w') as fh:
    for k, c in enumerate(CUES, 1):
        fh.write(f"{k}\n{ts(c['start_frame'] / FPS)} --> {ts(c['end_frame'] / FPS)}\n{c['transcript']}\n\n")

with open(f'{OUT}/ADD_NARRATION.md', 'w') as fh:
    fh.write(f"""# Adding the private narration

The master is silent and exactly {FRAMES} frames at {FPS} fps ({FRAMES / FPS:.3f} s), matching the locked edit and the
ElevenLabs Adam WAV (117.098 s, already at 1.25×). The WAV is not in Git. On a machine that has it:

```bash
ffmpeg -i {master} -i path/to/dice-town-narration.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart dice-town-final.mp4
```

Optional burned captions (paragraph-level timing from the cue plan, estimated rather than word-aligned):

```bash
ffmpeg -i dice-town-final.mp4 -vf "subtitles={OUT}/captions.srt:force_style='FontName=Montserrat,Bold=1,FontSize=13,Outline=2,MarginV=70'" -c:a copy dice-town-final-captions.mp4
```
""")

s = probe['streams'][0]
report = {
    'status': 'PASS' if complete and not decode_errors and int(s['nb_read_frames']) == FRAMES and all(check.values()) else 'CHECK',
    'source': {'frames': len(frames), 'complete': complete, 'sizes': sorted(sizes), 'native': True},
    'master': {'file': master, 'sha256': sha(master), 'codec': s['codec_name'], 'profile': s['profile'], 'width': s['width'], 'height': s['height'],
               'pix_fmt': s['pix_fmt'], 'fps': s['r_frame_rate'], 'decoded_frames': int(s['nb_read_frames']), 'duration': float(s['duration']),
               'bytes': int(probe['format']['size']), 'audio': 'none (private narration added separately, see ADD_NARRATION.md)'},
    'preview': {'file': preview, 'note': 'Lanczos downscale of the native master for phone review'},
    'full_decode_errors': decode_errors or None,
    'psnr_vs_source_db': psnr,
    'cuts': {'locked_boundaries': len(CUTS), 'min_diff_at_cuts': round(float(at_cuts.min()), 2), 'median_diff_at_cuts': round(float(np.median(at_cuts)), 2),
             'median_diff_inside_shots': round(float(np.median(inside)), 2), 'largest_jumps_inside_shots': pops},
    'determinism_recheck': check,
}
json.dump(report, open(f'{OUT}/verification.json', 'w'), indent=1)
print(json.dumps(report, indent=1))
