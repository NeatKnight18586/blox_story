"""Retime the Dice Town picture edit to the narration's real word timings.

Usage: python3 scripts/dice-town-retime.py
Reads evidence/dice-town-film/word-timings.json (forced alignment) and the locked
cue/shot plan; writes production/dice-town-film/edit-timing.json with new shot
boundaries. Each narration paragraph's shots now start LEAD frames before its first
spoken word; shots inside a paragraph keep their relative proportions (piecewise-
linear warp), and the film length stays 3513 frames.
"""
import json

FPS, FRAMES, LEAD = 30, 3513, 3
W = json.load(open('evidence/dice-town-film/word-timings.json'))
CUES = json.load(open('stories/dice-town/Dice_Town_117s_Animatic_Plan.json'))['audio_cues']
SHOTS = json.load(open('stories/dice-town/P3A_SHOT_OPTIMIZATION.json'))['shots']

# Knots: old paragraph start frame -> new frame (first word, minus a small lead).
knots_old, knots_new, i = [], [], 0
for c in CUES:
    n = len(c['transcript'].split()); first = W[i]['start']; i += n
    knots_old.append(c['start_frame'])
    knots_new.append(0 if c['start_frame'] == 0 else max(0, round(first * FPS) - LEAD))
knots_old.append(FRAMES); knots_new.append(FRAMES)
assert all(a < b for a, b in zip(knots_new, knots_new[1:])), 'paragraph order broken'

def warp(f):
    for k in range(len(knots_old) - 1):
        a, b = knots_old[k], knots_old[k + 1]
        if a <= f <= b:
            A, B = knots_new[k], knots_new[k + 1]
            return round(A + (f - a) * (B - A) / (b - a))
    raise ValueError(f)

out = []
for s in SHOTS:
    A, B = warp(s['start_frame']), warp(s['end_frame'])
    out.append({'id': s['id'], 'old': [s['start_frame'], s['end_frame']], 'new': [A, B], 'speed': round((s['end_frame'] - s['start_frame']) / (B - A), 3)})
assert out[0]['new'][0] == 0 and out[-1]['new'][1] == FRAMES
assert all(x['new'][1] == y['new'][0] for x, y in zip(out, out[1:])) and all(x['new'][1] - x['new'][0] >= 12 for x in out)
json.dump({'fps': FPS, 'frames': FRAMES, 'lead_frames': LEAD, 'source': 'forced alignment of the narration (scripts/dice-town-align.py)', 'shots': out},
          open('production/dice-town-film/edit-timing.json', 'w'), indent=1)
changed = [x for x in out if x['new'] != x['old']]
print(json.dumps({'shots_changed': len(changed), 'frames_in_changed_shots': sum(x['new'][1] - x['new'][0] for x in changed),
                  'speed_range': [min(x['speed'] for x in out), max(x['speed'] for x in out)],
                  'changes': [(x['id'], x['old'], x['new']) for x in changed]}, indent=0))
