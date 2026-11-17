#!/usr/bin/env python3
"""scripts/v2/motion-demo.py — format v5 Phase 3a demo: measured checks on the rendered frames, the graded 24 fps MP4 and the
390 px sheet (one cell per shot, middle frame, graded).
  npm run v2:render -- --spec engine/fixtures/v5demo/motion-demo.json --out renders/v5/demo --width 540 --height 960
  python3 scripts/v2/motion-demo.py [--frames renders/v5/demo/frames]
Checks: output 24 fps · freeze = 12 identical frames, then motion again · impact = a 2-frame hold, then the camera shakes ·
splitScreen = a dark divider across the middle · lightsCascade = the upper frame brightens as the lamps come on."""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lut4

a = argparse.ArgumentParser(); a.add_argument('--frames', default='renders/v5/demo/frames'); a.add_argument('--spec', default='engine/fixtures/v5demo/motion-demo.json'); o = a.parse_args()
spec = json.load(open(o.spec)); fps = spec['fps']; shots, t = [], 0
for s in spec['shots']: shots.append({**s, 'start': t}); t += s['frames']
F = lambda n: np.asarray(Image.open(f"{o.frames}/frame-{n:05d}.png").convert('RGB')).astype(np.int16)
S = {s['id']: s for s in shots}; checks, fails = {}, []
fz = S['S6-freeze']; f0 = fz['start'] + round(fz['freeze'][0] * fps); same = [int(np.abs(F(f0 + k) - F(f0)).max()) for k in range(fz['freeze'][1])]
after = float(np.abs(F(f0 + fz['freeze'][1] + 1) - F(f0)).mean())
checks['freeze'] = {'frames': fz['freeze'][1], 'maxDiffDuring': max(same), 'meanDiffAfter': round(after, 2)}
if max(same) != 0 or after < .5: fails.append(f"freeze: diff during {max(same)}, after {after:.2f}")
im = S['S2-authority']; i0 = im['start'] + round(im['impact'] * fps); hold = int(np.abs(F(i0 + 1) - F(i0)).max()); shake = float(np.abs(F(i0 + 4) - F(i0 + 3)).mean())
checks['impact'] = {'holdMaxDiff': hold, 'shakeMeanDiff': round(shake, 2)}
if hold != 0 or shake < .5: fails.append(f"impact: hold diff {hold}, shake {shake:.2f}")
sp = S['S5-split']; m = F(sp['start'] + sp['frames'] // 2); h = m.shape[0]; band = float(m[h // 2 - 2:h // 2 + 2].mean() / 255)
checks['split'] = {'dividerLuma': round(band, 3)}
if band > .12: fails.append(f"split divider luma {band:.3f}")
ai = S['S3-aisle']; top = lambda n: float(F(n)[: F(n).shape[0] // 2].mean() / 255); lum = [round(top(ai['start'] + k), 4) for k in (0, ai['frames'] // 2, ai['frames'] - 1)]
warm = lambda x: int(((x[..., 0] > 200) & (x[..., 1] > 150) & (x[..., 0] - x[..., 2] > 40)).sum()); lit = [warm(F(ai['start'] + k)) for k in (0, ai['frames'] - 1)]   # warm-bright lamp pixels
checks['lightsCascade'] = {'upperLuma': lum, 'brightPixelsStartEnd': lit}
if lit[1] <= lit[0] * 1.5 + 50: fails.append(f"cascade: bright pixels {lit}")
# graded MP4: the preset LUT (look4) + per-shot memory / dawn over their time ranges + a light vignette, 24 fps
os.makedirs('renders/v5/luts', exist_ok=True); chain = []
base = f"renders/v5/luts/{spec['look4']}.cube"; open(base, 'w').write(lut4.cube(spec['look4'])); chain.append(f"lut3d=file={base}")
for s in shots:
    if s.get('grade') in lut4.PRESETS:
        f = f"renders/v5/luts/{s['id']}-{s['grade']}.cube"; open(f, 'w').write(lut4.cube(s['grade'])); a0, a1 = s['start'] / fps, (s['start'] + s['frames']) / fps
        chain.append(f"lut3d=file={f}:enable='between(t,{a0:.4f},{a1 - 1e-4:.4f})'")
chain.append(lut4.VIGNETTE)
out = 'review/v4/motion-demo.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', f'{o.frames}/frame-%05d.png', '-vf', ','.join(chain) + ',format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow',
                '-r', str(fps), '-movflags', '+faststart', out], check=True)
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,nb_frames,width,height', '-of', 'json', out], capture_output=True, text=True).stdout)['streams'][0]
checks['output'] = {**pr, 'MB': round(os.path.getsize(out) / 1e6, 2)}
if pr['r_frame_rate'] != '24/1' or int(pr['nb_frames']) != t: fails.append(f"output {pr}")
# sheet: the middle frame of every shot from the graded MP4, 390 px wide
font = ImageFont.load_default(size=15); W = 390; H = round(W * 960 / 540); sheet = Image.new('RGB', (4 * W, 2 * (H + 22)), '#1b1d21'); d = ImageDraw.Draw(sheet)
for i, s in enumerate(shots):
    n = s['start'] + s['frames'] // 2 + (round(s['freeze'][0] * fps) - s['frames'] // 2 + 3 if s.get('freeze') else 0)
    png = f'renders/v5/sheet-{i}.png'; subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-vf', f"select=eq(n\\,{n})", '-frames:v', '1', png], check=True)
    x, y = (i % 4) * W, (i // 4) * (H + 22); sheet.paste(Image.open(png).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + 22))
    d.text((x + 4, y + 3), f"{s['id']} · {s['move']}" + (f" · {s['grade']}" if s.get('grade') else ''), fill='#ffd84a', font=font)
sheet.save('review/v4/motion-demo-390.png')
rep = {'checks': checks, 'failures': fails, 'result': 'FAIL' if fails else 'PASS'}; json.dump(rep, open('review/v4/motion-demo.json', 'w'), indent=1); print(json.dumps(rep))
sys.exit(1 if fails else 0)
