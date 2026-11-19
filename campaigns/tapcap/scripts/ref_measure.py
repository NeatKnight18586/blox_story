#!/usr/bin/env python3
"""Measure the sponsor turnaround's FRONT view (gradient demo unit): row-majority bands by hue, same rule as measure.js.
   head = cyan/blue (hue 165–245), torso = purple/magenta/red (245–360, 0–12), switch = clear housing (low saturation, not
   background), base = orange/yellow (12–70). Writes JSON to stdout + optional --mask PNG. Never committed with the ref."""
import sys, json, colorsys, argparse
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('--ref', default='campaigns/tapcap/refs/tapcap_turnaround.png'); ap.add_argument('--mask'); a = ap.parse_args()
im = Image.open(a.ref).convert('RGB'); W, H = im.size; k = W / 1494
x0, x1, y0, y1 = [int(v * k) for v in (600, 1010, 20, 770)]   # front view only (excludes the 1.5 in arrow + text)
c = np.asarray(im)[y0:y1, x0:x1].astype(float) / 255
mx, mn = c.max(2), c.min(2); sat = (mx - mn) / (mx + 1e-6)
r, g, b = c[..., 0], c[..., 1], c[..., 2]
hue = (np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) + 360) % 360
bg = (sat < .10) & (mx > .86)
cls = np.full(c.shape[:2], 0)   # 0 bg, 1 head, 2 torso, 3 switch, 4 base
col = ~bg & (sat >= .22)
cls[col & (hue >= 165) & (hue < 245)] = 1
cls[col & ((hue >= 245) | (hue < 12))] = 2
cls[col & (hue >= 12) & (hue < 70)] = 4
cls[~bg & (sat < .22)] = 3
rows = []
for y in range(cls.shape[0]):
    v = cls[y][cls[y] > 0]
    rows.append(int(np.bincount(v, minlength=5)[1:].argmax() + 1) if v.size > 12 else 0)
ys = [y for y, v in enumerate(rows) if v]; top, bot = ys[0], ys[-1]; Hpx = bot - top + 1
# ignore isolated mislabels: a band is the run-length of each class in order head→torso→switch→base
# the clear switch reflects the torso colour: the torso ends at the trapezoid's bottom edge = the last row before the silhouette
# width drops below 75 % of the torso's widest row; everything from there to the first base row is switch
def wpx(y): xs = np.where(cls[y] > 0)[0]; return xs[-1] - xs[0] + 1 if xs.size else 0
tor = [y for y in range(top, bot + 1) if rows[y] == 2]; tmax = max(wpx(y) for y in tor); ymax = max(y for y in tor if wpx(y) >= .98 * tmax)
tend = next(y for y in range(ymax, bot + 1) if wpx(y) < .75 * tmax) - 1   # first width drop below the trapezoid's bottom edge
bw = float(np.median([wpx(y) for y in range(top, bot + 1) if rows[y] == 4]))
base0 = next(y for y in range(tend + 1, bot + 1) if wpx(y) >= .85 * bw)   # base top rim (its rim is red-orange, so width, not hue)
for y in range(tend + 1, base0): rows[y] = 3
for y in range(base0, bot + 1): rows[y] = 4
n = {k: sum(1 for y in range(top, bot + 1) if rows[y] == k) for k in (1, 2, 3, 4)}
names = {1: 'head', 2: 'torso', 3: 'switch', 4: 'base'}
out = {'ref': a.ref, 'view': 'front', 'pxHeight': Hpx, 'bands': {names[k]: round(n[k] / Hpx, 4) for k in n}}
# boundaries (first row of each class after the previous)
seq = [rows[y] for y in range(top, bot + 1)]
def first(kk, after=0):
    for i in range(after, len(seq)):
        if seq[i] == kk: return i
out['starts'] = {names[k]: first(k) for k in (1, 2, 3, 4)}
# widths in H units
def width(y): xs = np.where(cls[y] > 0)[0]; return (xs[-1] - xs[0] + 1) / Hpx if xs.size else 0
hy = [y for y in range(top, bot + 1) if rows[y] == 1]; by = [y for y in range(top, bot + 1) if rows[y] == 4]; ty = [y for y in range(top, bot + 1) if rows[y] == 2]
out['widths'] = {'headTop': round(max(width(y) for y in hy[int(len(hy) * .03):int(len(hy) * .10)]), 4), 'headBottom': round(max(width(y) for y in hy[int(len(hy) * .8):]), 4),
                 'torsoBottom': round(max(width(y) for y in ty[int(len(ty) * .9):]), 4), 'baseTop': round(max(width(y) for y in by[:max(1, int(len(by) * .08))]), 4)}
print(json.dumps(out))
if a.mask:
    pal = np.array([[255, 255, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]], 'uint8')
    Image.fromarray(pal[cls]).save(a.mask)
