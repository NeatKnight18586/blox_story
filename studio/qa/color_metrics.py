"""Frame colour/brightness metrics used by the studio look gate.

Usage: python3 studio/qa/color_metrics.py label=glob [label=glob ...]
Each frame is resized to 180x320 and the top 25% (caption band in vertical
Shorts) is dropped so captioned references and clean renders compare fairly.
colorfulness: Hasler-Suesstrunk style (opponent rg/yb spread + mean), 0..~150.
"""
import glob
import json
import sys

import numpy as np
from PIL import Image


def frame_metrics(path):
    im = np.asarray(Image.open(path).convert('RGB').resize((180, 320)), dtype=np.float32)[80:]
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mx, mn = im.max(-1), im.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    rg, yb = r - g, .5 * (r + g) - b
    col = np.sqrt(rg.std() ** 2 + yb.std() ** 2) + .3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)
    luma = (.2126 * r + .7152 * g + .0722 * b) / 255
    return {'saturation': round(float(sat.mean()), 3), 'colorfulness': round(float(col), 1),
            'luma': round(float(luma.mean()), 3), 'contrast_p95_p5': round(float(np.percentile(luma, 95) - np.percentile(luma, 5)), 3)}


def group_metrics(paths):
    rows = [frame_metrics(p) for p in paths]
    return {k: round(float(np.mean([r[k] for r in rows])), 3) for k in rows[0]} | {'frames': len(rows)}


if __name__ == '__main__':
    out = {}
    for arg in sys.argv[1:]:
        label, pattern = arg.split('=', 1)
        paths = sorted(glob.glob(pattern))
        if not paths:
            sys.exit(f'no frames for {label}: {pattern}')
        out[label] = group_metrics(paths)
    print(json.dumps(out, indent=1))
