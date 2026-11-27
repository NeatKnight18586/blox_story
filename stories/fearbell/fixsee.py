#!/usr/bin/env python3
"""stories/fearbell/fixsee.py <rows,…> — FINAL staging fixes: 3 frames per row (a = start, b = the MUST SEE frame from build/see.json, c = end)
→ build/see-fix.json for vorender.js --see / vosheet.py (third arg). Run after node stories/fearbell/previs.js."""
import json, sys
rows = [int(r) for r in sys.argv[1].split(',')]
LOCK = {int(c[1]): c[4] for c in (l.split('|') for l in open('stories/fearbell/PICTURE_LOCK.md') if l.startswith('| ') and l.split('|')[1].strip().isdigit())}   # MUST SEE from the lock (the truth)
see, spec = json.load(open('stories/fearbell/build/see.json')), json.load(open('stories/fearbell/episode.json'))
f0, out = 0, []
for s in spec['shots']:
    s['_f0'] = f0; f0 += s['frames']
for r in rows:
    sh = [s for s in spec['shots'] if s['row'] == r]; a, b = sh[0]['_f0'], sh[-1]['_f0'] + sh[-1]['frames'] - 1
    m = next(x for x in see if x['row'] == r)
    for tag, f in (('a', a + 2), ('b', m['frame']), ('c', b - 2)):
        out.append({**m, 'frame': f, 't': round(f / 24, 2), 'tag': tag, 'see': LOCK[r].strip()})
json.dump(out, open('stories/fearbell/build/see-fix.json', 'w'), indent=1)
print(len(out), 'frames')
