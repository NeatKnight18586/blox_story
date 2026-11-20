#!/usr/bin/env python3
"""Per-shot exposure grade (EV) toward the midpoint of the shot's act luma gate (engine/moods7.json, unchanged), from the last
measured luma (qa/passc.json). Accumulates into previz/grade.json: ev += clamp(1.3 × log2(target / luma), −1.5, +2.5) for shots outside
their gate only. Usage: grade-c.py"""
import json, math, os
Q = json.load(open('campaigns/tapcap/ep01-rarity/qa/passc.json')); G = 'campaigns/tapcap/previz/grade.json'
cur = json.load(open(G)) if os.path.exists(G) else {}
for s in Q['shots']:
    if s['lumaPass']: continue
    lo, hi = s['gate']; t = (lo + hi) / 2; d = max(-2.5, min(2.5, 1.3 * math.log2(t / max(s['luma'], 1e-3))))
    cur[s['id']] = round(cur.get(s['id'], 0) + d, 3)
json.dump(cur, open(G, 'w'), indent=1); print(json.dumps(cur))
