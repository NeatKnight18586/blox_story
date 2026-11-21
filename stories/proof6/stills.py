#!/usr/bin/env python3
"""stories/proof6/stills.py <outdir> [ID[:frame] ...]: 1080×1920 stills (aa 1) of shots' middle frames (or the given global frame) → <outdir>/<ID>.png. Default: all shots."""
import json, os, subprocess, sys, glob, shutil
sp = json.load(open('stories/proof6/episode.json')); fps = sp.get('fps', 30)
st = [s['at'] for s in sp['shots']] + [sp['end']]; ids = [s['id'] for s in sp['shots']]
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
want = sys.argv[2:] or ids
for w in want:
    sid, _, f = w.partition(':'); i = ids.index(sid); a, b = round(st[i] * fps), round(st[i + 1] * fps); n = int(f) if f else (a + b - 1) // 2
    subprocess.run(['node', 'scripts/v2/render.js', '--story', 'proof6', '--out', 'stories/proof6/build/r1080', '--width', '1080', '--height', '1920', '--aa', '1', '--from', str(n), '--to', str(n + 1)], check=True, stdout=subprocess.DEVNULL)
    c = sorted(glob.glob(f'stories/proof6/build/r1080/cache/{sid}-*/{n - a:04d}.png'), key=os.path.getmtime)[-1]; shutil.copy(c, f'{out}/{sid}.png')
print('stills', len(want), '→', out)
