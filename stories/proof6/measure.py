#!/usr/bin/env python3
"""stories/proof6/measure.py <frames dir> <episode.json> <out.json>: per shot mean luma, saturation, mean RGB, motion energy (mean |frame diff|, 0–255, 270×480)."""
import json, sys, numpy as np
from PIL import Image
d, spec, out = sys.argv[1:4]; only = sys.argv[4].split(',') if len(sys.argv) > 4 else None; sp = json.load(open(spec)); fps = sp.get('fps', 30)
st = [s['at'] for s in sp['shots']] + [sp['end']]
img = lambda n: np.asarray(Image.open(f'{d}/frame-{n:05d}.png').convert('RGB')).astype(float)
res = {}
for i, s in enumerate(sp['shots']):
    if only and s['id'] not in only: continue
    a, b = round(st[i] * fps), round(st[i + 1] * fps); L, S, C, M = [], [], [], []; prev = None
    for n in range(a, b):
        x = img(n); L.append((0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]).mean())
        mx, mn = x.max(2), x.min(2); S.append(((mx - mn) / (mx + 1e-6)).mean()); C.append(x.reshape(-1, 3).mean(0))
        if prev is not None: M.append(np.abs(x - prev).mean())
        prev = x
    res[s['id']] = {'mood': s['mood'], 'luma': round(float(np.mean(L)), 2), 'sat': round(float(np.mean(S)), 4), 'rgb': [round(float(v), 1) for v in np.mean(C, 0)], 'motion': round(float(np.mean(M)), 3)}
json.dump(res, open(out, 'w'), indent=1); print(json.dumps({k: (v['luma'], v['motion']) for k, v in res.items()}))
