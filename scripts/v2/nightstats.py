# scripts/v2/nightstats.py — tuft P3 night readability numbers for one frame + its subject masks (pure numpy, no three).
#   dark10  darkest-10 % display luma (Rec.709 on sRGB values, as lookstats.py) — must sit in 0.012–0.03 (not crushed, not milky)
#   per mask: separation of the subject from what is around it = max(|mean luma mask − mean luma ring|, |mean chroma mask − ring|)
#             (ring = the mask dilated by R px minus the mask; chroma = (r − g, (r + g) / 2 − b) vector) — must be ≥ 0.06
#             seam = share of mask pixels brighter than the ring mean + 0.25 (VOLT's lightning seams read)
# Usage: python3 scripts/v2/nightstats.py <frame.png> [<name>=<mask.png> ...] [--ring 6] → JSON
import sys, json
import numpy as np
from PIL import Image

def load(f): return np.asarray(Image.open(f).convert('RGB'), dtype=np.float64) / 255.
def luma(a): return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
def dilate(m, r):
    p = np.pad(m, r); o = np.zeros_like(m)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r: o |= p[r + dy: r + dy + m.shape[0], r + dx: r + dx + m.shape[1]]
    return o
def stats(frame, masks, R=6):
    a = load(frame); L = luma(a); out = {'frame': frame, 'dark10': round(float(np.percentile(L, 10)), 4), 'meanL': round(float(L.mean()), 4), 'subjects': {}}
    ch = np.stack([a[..., 0] - a[..., 1], (a[..., 0] + a[..., 1]) / 2 - a[..., 2]], -1)
    for name, f in masks.items():
        m = np.asarray(Image.open(f).convert('L')) > 127
        if m.sum() < 20: out['subjects'][name] = {'px': int(m.sum())}; continue
        ring = dilate(m, R) & ~m
        dl = abs(L[m].mean() - L[ring].mean()); dc = float(np.linalg.norm(ch[m].mean(0) - ch[ring].mean(0)))
        seam = float((L[m] > L[ring].mean() + .25).mean())
        out['subjects'][name] = {'px': int(m.sum()), 'share': round(float(m.mean()), 4), 'dL': round(float(dl), 4), 'dC': round(dc, 4), 'sep': round(max(float(dl), dc), 4), 'seam': round(seam, 4), 'L': round(float(L[m].mean()), 4), 'ringL': round(float(L[ring].mean()), 4)}
    return out
if __name__ == '__main__':
    args = sys.argv[1:]; R = 6
    if '--ring' in args: i = args.index('--ring'); R = int(args[i + 1]); del args[i:i + 2]
    print(json.dumps(stats(args[0], dict(x.split('=', 1) for x in args[1:]), R)))
