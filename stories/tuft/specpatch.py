#!/usr/bin/env python3
"""After `ep --stage spec`: apply stories/tuft/stage.json `_vis` / `_puffs` to episode.json (episode data only).
_vis   {"<beast>": [[firstShot, lastShot], ...]}  beast drawn only in those shot windows (cast `visible` step keys: a beast is
       otherwise drawn in every location at its default mark, e.g. colossal Tuft / the Titan in the school yard)
_puffAt {"<shot>": s}  re-time that shot's puff events (negative = already grown at the cut)
_shot  {"<shot>": {field: value}}  merged into the shot
_puffs {"<shot>": [{"actor","size","at"}]}  extra puff events (at = s after the cut)"""
import json
ST = json.load(open('stories/tuft/stage.json')); sp = json.load(open('stories/tuft/episode.json')); sh = sp['shots']
end = lambda i: sh[i + 1]['at'] if i + 1 < len(sh) else sp['end']
for who, wins in ST.get('_vis', {}).items():
    keys = [[0, False]]
    for a, b in wins:
        keys += [[round(sh[a - 1]['at'] - 0.001, 3), True], [round(end(b - 1) - 0.001, 3), False]]
    sp['cast'][who]['visible'] = keys
for n, ps in ST.get('_puffs', {}).items(): sh[int(n) - 1].setdefault('puffs', []).extend(ps)
for n, a in ST.get('_puffAt', {}).items():
    for q in sh[int(n) - 1].get('puffs', []): q['at'] = a   # a negative cut-relative time: already grown at frame 0
for n, o in ST.get('_shot', {}).items(): sh[int(n) - 1].update(o)   # raw shot fields (e.g. frame:false = the authored camera, no cine re-framing)
for t in ST.get('_dropSfx', []): sp['sfxCues'] = [c for c in sp.get('sfxCues', []) if abs(c[0] - t) > .05 or c[1] != 'squeak']
json.dump(sp, open('stories/tuft/episode.json', 'w'), indent=1)
