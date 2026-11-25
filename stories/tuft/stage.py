#!/usr/bin/env python3
"""Apply stories/tuft/stage.json (world-coordinate staging) to BRIEF.md notes as place:/cam:/fov: tokens; then ep --stage spec.
stage.json: {"<shot>": {"p": {"actor": [worldX, worldZ, yawDeg]}, "c": [px,py,pz, tx,ty,tz], "fov": N, "x": "extra tokens"}}
place: offsets are relative to each location's `street` anchor (converted here); cam: is world coordinates."""
import json, re, sys
ST = {'beastYard': -4, 'beastClass': 2, 'homeDining': 3, 'homeBedroom': -1, 'villageStreet': 10, 'festivalPlaza': 6, 'titanCave': 150}
STAGE = json.load(open('stories/tuft/stage.json'))
rows = open('stories/tuft/BRIEF.md').read().split('\n'); loc = None; out = []
KEEP = re.compile(r'^(place|cam|fov|camy|fit|stand)\s*:')
for ln in rows:
    m = re.match(r'^\| (\d+) \|', ln)
    if m:
        cells = ln.split(' | '); notes = cells[-1].rstrip(' |')
        toks = [t.strip() for t in re.split(r'[;]', notes)]
        l = re.search(r'loc:\s*(\w+)', notes)
        if l: loc = l.group(1)
        n = m.group(1); toks = [t for t in toks if t and not KEEP.match(t)]
        e = STAGE.get(n)
        if e:
            z0 = ST[loc]; add = []
            for who, (x, z, yaw) in e.get('p', {}).items(): add.append(f'place: {who} {x:g} {z - z0:g} yaw {yaw:g}')
            if 'c' in e: add.append('cam: ' + ' '.join(f'{v:g}' for v in e['c'][:3]) + ' at ' + ' '.join(f'{v:g}' for v in e['c'][3:]))
            if 'fov' in e: add.append(f'fov: {e["fov"]:g}')
            if e.get('x'): add.append(e['x'])
            # put staging tokens first (descriptions after), keep order of markers
            toks = [t for t in toks]
            desc = [t for t in toks if not re.match(r'^[a-zA-Z]+\s*:', t) and ' @ ' not in t and not re.match(r'^(twist|payoff|blur|cross|gag \d|still|clear)$', t)]
            toks = [t for t in toks if t not in desc]
            toks = toks + add + desc
        cells[-1] = '; '.join(toks) + ' |'
        ln = ' | '.join(cells)
    out.append(ln)
open('stories/tuft/BRIEF.md', 'w').write('\n'.join(out))
