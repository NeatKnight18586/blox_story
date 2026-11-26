# scripts/v2/lookstats.py — tuft 2B look gates on PNG pairs (grain on / off): grain luma std (%), mean HSV saturation, darkest-10 % luma.
# Usage: python3 scripts/v2/lookstats.py <png> [<png-ng>] ... → JSON lines {file, grainStd, sat, dark10}
import sys, json
import numpy as np
from PIL import Image
def load(f): return np.asarray(Image.open(f).convert('RGB'), dtype=np.float64) / 255.
def luma(a): return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
def stats(f, ng=None):
    a = load(f); mx, mn = a.max(-1), a.min(-1); sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
    L = luma(a); dark = np.sort(L.ravel())[: max(1, L.size // 10)].mean()
    out = {'file': f, 'sat': round(float(sat.mean()), 4), 'dark10': round(float(dark), 4), 'meanL': round(float(L.mean()), 4)}
    if ng: out['grainStd'] = round(float((L - luma(load(ng))).std() * 100), 3)
    return out
if __name__ == '__main__':
    fs = sys.argv[1:]
    for f in fs:
        if f.endswith('-ng.png'): continue
        g = f[:-4] + '-ng.png'
        print(json.dumps(stats(f, g if g in fs else None)))
