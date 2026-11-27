#!/usr/bin/env python3
"""stories/fearbell/gapvol.py <master.mp4> — mean/max volume of the final mix inside each meme gap (build/memegap.json windows) and of the
whole file (ffmpeg volumedetect) → review/fearbell/gapvol.json. A gap is AUDIBLE when its mean is within 25 dB of the whole-mix mean."""
import json, re, subprocess, sys
src = sys.argv[1]; gaps = json.load(open('stories/fearbell/build/memegap.json'))['gaps']
def vol(a=None, d=None):
    cmd = ['ffmpeg', '-hide_banner', '-nostats'] + (['-ss', f'{a:.3f}', '-t', f'{d:.3f}'] if a is not None else []) + ['-i', src, '-vn', '-af', 'volumedetect', '-f', 'null', '-']
    e = subprocess.run(cmd, capture_output=True, text=True).stderr
    return {k: float(re.search(k + r': (-?[\d.]+|-inf) dB', e).group(1).replace('-inf', '-200')) for k in ('mean_volume', 'max_volume')}
allv, out = vol(), []
for g in gaps:
    t0 = g['newCut']   # gap window on the gapped (final) timeline
    v = vol(t0, g['dur']); out.append({**{k: g[k] for k in g if k in ('afterWord', 'clip', 'dur')}, 'start': t0, **v, 'audible': v['mean_volume'] > allv['mean_volume'] - 25})
r = {'master': src, 'whole': allv, 'gaps': out, 'pass': all(o['audible'] for o in out)}
json.dump(r, open('review/fearbell/gapvol.json', 'w'), indent=1); print(json.dumps(r))
sys.exit(0 if r['pass'] else 1)
