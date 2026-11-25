#!/usr/bin/env python3
"""4E tools: parse PICTURE_LOCK.md, find each row's frames from episode.json + cues.json, build vo-sheets.
  lock.py frames A|B|C|D|<a-b>     -> prints comma list of sync frames (stdout)
  lock.py sheet <part|a-b> <framesdir> <out.png> [--dt s]"""
import json, re, sys
from PIL import Image, ImageDraw, ImageFont
PARTS = {'A': (1, 20), 'B': (21, 36), 'C': (37, 50), 'D': (51, 61)}
LABELS = [re.match(r'^\| (\d+[ab]?) \|', l).group(1) for l in open('stories/tuft/PICTURE_LOCK.md') if re.match(r'^\| \d+[ab]? \|', l)]
def rows():
    R = {}
    for ln in open('stories/tuft/PICTURE_LOCK.md'):
        m = re.match(r'^\| (\d+[ab]?) \| (.*) \| (.*) \| (.*) \| (.*) \| (.*) \|$', ln.rstrip())
        if m: R[m.group(1)] = dict(vo=m.group(2), must=m.group(3), sync=m.group(4), cam=m.group(5), tuft=m.group(6))
    return R
def num(k): return int(re.match(r'\d+', k).group())
def sel(arg):
    lo, hi = PARTS.get(arg) or tuple(int(x) for x in arg.split('-'))
    return [k for k in rows() if lo <= num(k) <= hi]
def times():
    sp = json.load(open('stories/tuft/episode.json')); cu = json.load(open('stories/tuft/cues.json'))
    words = [(re.sub(r"[^a-z']", '', w['w'].lower()), w['start']) for l in cu['lines'] for w in l['words']]
    sh = sp['shots']; at = {s['id'][1:].lower(): s['at'] for s in sh}; ks = [s['id'][1:].lower() for s in sh]
    end = {k: (at[ks[i + 1]] if i + 1 < len(ks) else sp['end']) for i, k in enumerate(ks)}
    return at, end, words
def kk(k): return '%02d' % (LABELS.index(k) + 1)
def sync_t(k, r, at, end, words):
    k0 = k; k = kk(k)
    m = re.search(r'@\s*([A-Za-z\']+)', r['sync'])
    if k0 == '1' and 'frame 0' in r['sync']: return 0.0
    if m:
        w = m.group(1).lower()
        for t in (x for x in words if x[0] == re.sub(r"[^a-z']", '', w)):
            if at[k] - .05 <= t[1] < end[k]: return t[1]
    return (at[k] + end[k]) / 2
if __name__ == '__main__':
    cmd = sys.argv[1]; R = rows(); at, end, words = times()
    if cmd == 'frames':
        dt = float(sys.argv[3]) if len(sys.argv) > 3 else .1
        print(','.join(str(min(round((sync_t(k, R[k], at, end, words) + (0 if k == '1' else dt)) * 30), round(end[kk(k)] * 30) - 1)) for k in sel(sys.argv[2])))
    elif cmd == 'sheet':
        ks = sel(sys.argv[2]); fdir = sys.argv[3]; out = sys.argv[4]; dt = .1
        fr = [min(round((sync_t(k, R[k], at, end, words) + (0 if k == '1' else dt)) * 30), round(end[kk(k)] * 30) - 1) for k in ks]
        W, H, cols = 270, 480, 5; TH = 74; f = ImageFont.load_default()
        rws = (len(ks) + cols - 1) // cols; sheet = Image.new('RGB', (cols * (W + 4), rws * (H + TH + 4)), (16, 16, 20)); d = ImageDraw.Draw(sheet)
        def wrap(t, n): 
            o, c = [], ''
            for w in t.split():
                if len(c) + len(w) + 1 > n: o.append(c); c = w
                else: c = (c + ' ' + w).strip()
            return o + [c]
        for i, (k, fr_) in enumerate(zip(ks, fr)):
            x, y = (i % cols) * (W + 4), (i // cols) * (H + TH + 4)
            try: im = Image.open(f'{fdir}/f{fr_:05d}.png').convert('RGB').resize((W, H))
            except Exception: im = Image.new('RGB', (W, H), (90, 0, 0))
            sheet.paste(im, (x, y)); r = R[k]
            lines = [f'#{k} f{fr_} {fr_/30:.2f}s [{r["cam"][:14]}] T:{r["tuft"]}'] + wrap('VO ' + r['vo'], 44)[:1] + wrap('SEE ' + r['must'], 44)[:4]
            for j, t in enumerate(lines): d.text((x + 2, y + H + 2 + j * 11), t, fill=(255, 255, 255) if j == 0 else (200, 210, 230), font=f)
        sheet.save(out); print(out, sheet.size)
