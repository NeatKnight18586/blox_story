#!/usr/bin/env python3
"""cand.py <row> [<dt>] "px,py,pz,tx,ty,tz,fov" ...  -> renders the row's sync frame for each candidate camera (authored, frame:false)
-> /tmp/claude-0/s/cand-<row>.png (270x480 each). Winner goes into stage.json "c"/"fov"."""
import json, subprocess, sys, os, re
sys.path.insert(0, 'stories/tuft'); import lock
from PIL import Image, ImageDraw
row = sys.argv[1]; cands = [c for c in sys.argv[2:]]
R = lock.rows(); at, end, words = lock.times(); sp = json.load(open('stories/tuft/episode.json'))
i = lock.LABELS.index(row); sh = sp['shots'][i]
t = lock.sync_t(row, R[row], at, end, words) + .1; f = min(round(t * 30), round(end[lock.kk(row)] * 30) - 1)
ims = []
for n, c in enumerate(cands):
    v = [float(x) for x in c.split(',')]
    sh2 = {'position': v[:3], 'target': v[3:6], 'fov': v[6]}
    sp2 = json.loads(json.dumps(sp)); s2 = sp2['shots'][i]
    s2.pop('tpl', None); s2['from'] = sh2; s2['to'] = sh2; s2['frame'] = False
    for k in ('move', 'zoomAt', 'impact'): pass
    s2['move'] = 'static-drift'
    json.dump(sp2, open('stories/tuft/cand.json', 'w'))
    out = f'/tmp/claude-0/s/cand-{row}-{n}'
    subprocess.run(['rm', '-rf', out])
    subprocess.run(['node', 'stories/tuft/frames.js', '--spec', 'stories/tuft/cand.json', '--out', out, '--width', '270', '--height', '480', '--aa', '0', '--frames', str(f)], capture_output=True)
    try: ims.append(Image.open(f'{out}/frames/f{f:05d}.png').convert('RGB'))
    except Exception: ims.append(Image.new('RGB', (270, 480), (90, 0, 0)))
sheet = Image.new('RGB', (len(ims) * 274, 496), (16, 16, 20)); d = ImageDraw.Draw(sheet)
for n, im in enumerate(ims): sheet.paste(im, (n * 274, 0)); d.text((n * 274 + 2, 482), f'{n}: {cands[n]}'[:48], fill=(255, 255, 255))
sheet.save(f'/tmp/claude-0/s/cand-{row}.png'); print(f'/tmp/claude-0/s/cand-{row}.png', f, 'rm stories/tuft/cand.json when done')
