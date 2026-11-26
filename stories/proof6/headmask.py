#!/usr/bin/env python3
"""stories/proof6/headmask.py out.json id=path.png ...: yellow-head mask (#FFD542 ± lit / shadow / gold range: hue 36–64°, sat ≥ .40, value ≥ .22) per still;
a head counts when the mask has a horizontal run ≥ 10 px (and ≥ 100 px in all). Mean luma (Rec.709, 0–255) of the masked pixels."""
import json, sys, numpy as np
from PIL import Image
res = {}
for a in sys.argv[2:]:
    k, p = a.split('=', 1); x = np.asarray(Image.open(p).convert('RGB')).astype(float) / 255
    mx, mn = x.max(2), x.min(2); d = mx - mn + 1e-9
    h = np.where(mx == x[..., 0], ((x[..., 1] - x[..., 2]) / d) % 6, np.where(mx == x[..., 1], (x[..., 2] - x[..., 0]) / d + 2, (x[..., 0] - x[..., 1]) / d + 4)) * 60
    m = (h >= 36) & (h <= 64) & ((d / (mx + 1e-9)) >= .40) & (mx >= .22)
    def run(row):
        r = np.diff(np.concatenate([[0], row.astype(int), [0]])); a, b = np.where(r == 1)[0], np.where(r == -1)[0]; return (b - a).max() if len(a) else 0
    keep = m if m.sum() >= 100 and max(run(r) for r in m[m.any(1)]) >= 10 else np.zeros_like(m)
    L = (0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]) * 255
    res[k] = {'px': int(keep.sum()), 'luma': round(float(L[keep].mean()), 2) if keep.sum() else None}
json.dump(res, open(sys.argv[1], 'w'), indent=1); print(json.dumps(res))
