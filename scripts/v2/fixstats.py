# scripts/v2/fixstats.py — tuft P3B measured checks on one frame (pure numpy). Modes:
#   tuft  <frame> <tuftMask>          clipped share of Tuft's pixels (luma ≥ .98) · dark eye blobs (components of luma < .2 inside the
#                                     mask's filled area, ≥ 0.15 % of the mask each, the two largest of similar size) · blue / gold tip
#                                     pixel shares (blue hue 190–230°, gold 35–60°, S ≥ .35, V ≥ .55)
#   lantern <frame> <lanternMask> [faceMask ...]   lantern pixel share of the frame · lantern px over each face / eye mask
#   hue   <frame> [x0 y0 x1 y1]       mean hue (circular, deg), mean saturation (HSV), mean value; roof-slate share (hue 195–235°,
#                                     S .12–.6, V .18–.75) of the region (fractions of W / H)
# Usage: python3 scripts/v2/fixstats.py <mode> ... → JSON
import sys, json, colorsys
import numpy as np
from PIL import Image

def load(f): return np.asarray(Image.open(f).convert('RGB'), dtype=np.float64) / 255.
def mask(f): return np.asarray(Image.open(f).convert('L')) > 127
def luma(a): return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
def hsv(a):
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-9; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0), mx
def comps(m):
    lab = np.zeros(m.shape, np.int32); n = 0; out = []; H, W = m.shape
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]: continue
        n += 1; st = [(y0, x0)]; lab[y0, x0] = n; px = []
        while st:
            y, x = st.pop(); px.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                Y, X = y + dy, x + dx
                if 0 <= Y < H and 0 <= X < W and m[Y, X] and not lab[Y, X]: lab[Y, X] = n; st.append((Y, X))
        ys = [p[0] for p in px]; xs = [p[1] for p in px]; out.append({'n': len(px), 'cx': float(np.mean(xs)), 'cy': float(np.mean(ys))})
    return sorted(out, key=lambda c: -c['n'])
def fill_rows(m):   # fill each row between the first and last mask pixel (eyes are holes / dark inside the silhouette)
    o = m.copy()
    for y in range(m.shape[0]):
        xs = np.nonzero(m[y])[0]
        if len(xs): o[y, xs[0]:xs[-1] + 1] = True
    return o
def tuft(frame, mf):
    a = load(frame); m = mask(mf); L = luma(a); n = int(m.sum()); h, s, v = hsv(a)
    if n < 50: return {'px': n}
    clip = float((L[m] >= .98).mean()); F = fill_rows(m); dark = F & (L < .2)
    cs = [c for c in comps(dark) if c['n'] >= .0015 * n]
    eyes = cs[:2]; pair = len(eyes) == 2 and min(e['n'] for e in eyes) / max(e['n'] for e in eyes) >= .4
    blue = float((m & (h >= 190) & (h <= 230) & (s >= .35) & (v >= .55)).sum() / n); gold = float((m & (h >= 35) & (h <= 60) & (s >= .35) & (v >= .55)).sum() / n)
    return {'px': n, 'share': round(float(m.mean()), 4), 'clip': round(clip, 4), 'eyes': [{'px': e['n'], 'x': round(e['cx']), 'y': round(e['cy'])} for e in eyes], 'eyePair': bool(pair), 'blue': round(blue, 4), 'gold': round(gold, 4), 'meanL': round(float(L[m].mean()), 3)}
def lantern(frame, lf, faces):
    lm = mask(lf); out = {'share': round(float(lm.mean()), 4), 'faces': {}}
    for f in faces:
        k, p = f.split('=', 1); fm = mask(p); out['faces'][k] = {'px': int(fm.sum()), 'over': int((fm & lm).sum())}
    return out
def hue(frame, box):
    a = load(frame); H, W = a.shape[:2]
    if box: x0, y0, x1, y1 = [float(v) for v in box]; a = a[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
    h, s, v = hsv(a); w = s * v + 1e-6; mh = np.degrees(np.arctan2((np.sin(np.radians(h)) * w).sum(), (np.cos(np.radians(h)) * w).sum())) % 360
    slate = (h >= 195) & (h <= 235) & (s >= .12) & (s <= .6) & (v >= .18) & (v <= .75)
    return {'hue': round(float(mh), 1), 'sat': round(float(s.mean()), 4), 'val': round(float(v.mean()), 4), 'slate': round(float(slate.mean()), 4)}
if __name__ == '__main__':
    m, *r = sys.argv[1:]
    print(json.dumps(tuft(r[0], r[1]) if m == 'tuft' else lantern(r[0], r[1], r[2:]) if m == 'lantern' else hue(r[0], r[1:5])))
