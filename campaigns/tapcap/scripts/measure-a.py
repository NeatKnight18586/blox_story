#!/usr/bin/env python3
"""Pass A revision pixel checks (§3). Prints JSON.
  cosmic/grape at 120 px wide: sparkles = bright near-white local maxima standing ≥ .15 above their 7×7 median, ≥ 3 px apart;
  hues = peaks of the hue histogram of saturated figure pixels (10° bins, smoothed), each ≥ 5 % of them, ≥ 30° apart.
  fake-paint mask (flat-lit front ortho): yellow share of visible paint+yellow pixels, by reason (tips/rim, arm edges, gaps)."""
import argparse, json
import numpy as np
from PIL import Image
from numpy.lib.stride_tricks import sliding_window_view as win
def filt(x, k, fn): p = k // 2; return fn(win(np.pad(x, p, mode='edge'), (k, k)), axis=(-2, -1))
ap = argparse.ArgumentParser(); ap.add_argument('--panels'); a = ap.parse_args()
BG = np.array([0xE6, 0xE9, 0xF0]) / 255

def small(name):
    c = np.asarray(Image.open(f'{a.panels}/{name}.png').convert('RGB')).astype(float) / 255
    bg = np.median(np.r_[c[:4].reshape(-1, 3), c[-4:].reshape(-1, 3)], axis=0); fig = np.abs(c - bg).sum(2) > .06
    mx, mn = c.max(2), c.min(2); sat = (mx - mn) / (mx + 1e-6); lum = c @ np.array([.2126, .7152, .0722])
    med = filt(lum, 7, np.median); peak = (lum == filt(lum, 5, np.max)) & (lum > .80) & (lum - med > .15) & (sat < .35) & fig
    pts = []
    for y, x in sorted(zip(*np.nonzero(peak)), key=lambda q: -lum[q]):
        if all((y - py) ** 2 + (x - px) ** 2 >= 9 for py, px in pts): pts.append((y, x))
    n = len(pts)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]; hue = (np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) + 360) % 360
    hs = hue[fig & (sat > .25) & (mx > .2)]
    h, _ = np.histogram(hs, bins=36, range=(0, 360)); hsm = np.convolve(np.r_[h[-1], h, h[0]], [1, 2, 1], 'same')[1:-1] / 4
    tot = max(1, hs.size); peaks = []
    for i in np.argsort(-hsm):
        share = sum(h[(i + d) % 36] for d in (-1, 0, 1)) / tot
        if share < .05: break
        if all(min(abs(i - p), 36 - abs(i - p)) * 10 >= 30 for p in peaks): peaks.append(int(i))
    return {'sparkles': int(n), 'hues': len(peaks), 'hueCentres': sorted(p * 10 + 5 for p in peaks), 'figurePx': int(fig.sum())}

m = np.asarray(Image.open(f'{a.panels}/mask_fake_cosmic.png').convert('RGB')).astype(int)
def cnt(rgb, tol=40): return int((np.abs(m - np.array(rgb)).sum(2) < tol).sum())
paint, tip, arm, gap = cnt([255, 0, 255]), cnt([255, 255, 0]), cnt([255, 204, 0]), cnt([255, 255, 128])
vis = paint + tip + arm + gap; yel = tip + arm + gap
print(json.dumps({'cosmic': small('small_cosmic'), 'grape': small('small_grape'),
  'mask': {'yellow': round(yel / vis, 4), 'tipsRim': round(tip / vis, 4), 'armEdges': round(arm / vis, 4), 'gaps': round(gap / vis, 4), 'concentrated': round((tip + arm) / max(1, yel), 4), 'visiblePx': vis}}))
