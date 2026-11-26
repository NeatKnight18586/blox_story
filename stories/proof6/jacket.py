#!/usr/bin/env python3
"""stories/proof6/jacket.py still.png: mean colour of the dark desaturated (jacket) pixels vs #2B2D33, CIE76 ΔE."""
import sys, numpy as np
from PIL import Image
x = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float) / 255
def lab(rgb):
    c = np.where(rgb > .04045, ((rgb + .055) / 1.055) ** 2.4, rgb / 12.92); M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])
    xyz = c @ M.T / np.array([.95047, 1, 1.08883]); f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116); return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
mx, mn = x.max(2), x.min(2); m = (0.2126 * x[..., 0] + .7152 * x[..., 1] + .0722 * x[..., 2] < .30) & ((mx - mn) < .12)
print('jacket px', int(m.sum()), 'mean rgb', (x[m].mean(0) * 255).round(1), 'dE76', round(float(np.linalg.norm(lab(x[m].mean(0)) - lab(np.array([0x2B, 0x2D, 0x33]) / 255.))), 2))
# second reading: only the torso region (below the yellow head, within 1.6 head widths of its centre), same colour test
d = mx - mn + 1e-9
h = np.where(mx == x[..., 0], ((x[..., 1] - x[..., 2]) / d) % 6, np.where(mx == x[..., 1], (x[..., 2] - x[..., 0]) / d + 2, (x[..., 0] - x[..., 1]) / d + 4)) * 60
ys, xs = np.where((h >= 36) & (h <= 64) & ((d / (mx + 1e-9)) >= .40) & (mx >= .22)); cx, w, y1 = xs.mean(), np.percentile(xs, 98) - np.percentile(xs, 2), np.percentile(ys, 98)
reg = np.zeros_like(m); reg[int(y1):, max(int(cx - 1.6 * w), 0):int(cx + 1.6 * w)] = True; t = m & reg
print('torso  px', int(t.sum()), 'mean rgb', (x[t].mean(0) * 255).round(1), 'dE76', round(float(np.linalg.norm(lab(x[t].mean(0)) - lab(np.array([0x2B, 0x2D, 0x33]) / 255.))), 2))
