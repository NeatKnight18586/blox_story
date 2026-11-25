#!/usr/bin/env python3
"""After `ep --stage spec`: apply stories/tuft/stage.json `_vis` / `_puffs` / `_shot` ... to episode.json (episode data only).
Keys are ROW labels ("9", "42a"); windows [firstRow, lastRow] are inclusive in row order.
_vis   {"<beast>": [[firstRow, lastRow], ...]}  beast drawn only in those rows (cast `visible` step keys)
_puffAt {"<row>": s}  re-time that row's puff events (negative = already grown at the cut)
_shot  {"<row>": {field: value}}  merged into the shot (frame:false = the authored camera, no cine re-framing)
_puffs {"<row>": [{"actor","size","at"}]}  extra puff events (at = s after the cut)
_dropSfx [t]  drop auto squeak at t"""
import json, re
ST = json.load(open('stories/tuft/stage.json')); sp = json.load(open('stories/tuft/episode.json')); sh = sp['shots']
LABELS = [re.match(r'^\| (\d+[ab]?) \|', l).group(1) for l in open('stories/tuft/PICTURE_LOCK.md') if re.match(r'^\| \d+[ab]? \|', l)]
def ix(r): return LABELS.index(str(r))   # Brief rows are numbered in lock order (42a = shot 42, 42b = 43, ...)
end = lambda i: sh[i + 1]['at'] if i + 1 < len(sh) else sp['end']
for who, wins in ST.get('_vis', {}).items():
    keys = [[0, False]]
    for a, b in wins:
        keys += [[round(sh[ix(a)]['at'] - 0.001, 3), True], [round(end(ix(b)) - 0.001, 3), False]]
    sp['cast'][who]['visible'] = keys
for who, (a, b, at, car) in ST.get('_ride', {}).items(): sp['cast'][who]['ride'] = {'actor': car, 'at': at, 'from': round(sh[ix(a)]['at'] - .001, 3), 'until': round(end(ix(b)), 3)}   # _ride {beast: [firstRow, lastRow, hands|hood, carrier]}
for n, ps in ST.get('_puffs', {}).items(): sh[ix(n)].setdefault('puffs', []).extend(ps)
for n, a in ST.get('_puffAt', {}).items():
    for q in sh[ix(n)].get('puffs', []): q['at'] = a
for n, o in ST.get('_shot', {}).items(): sh[ix(n)].update(o)
for t in ST.get('_dropSfx', []): sp['sfxCues'] = [c for c in sp.get('sfxCues', []) if abs(c[0] - t) > .05 or c[1] != 'squeak']
json.dump(sp, open('stories/tuft/episode.json', 'w'), indent=1)
