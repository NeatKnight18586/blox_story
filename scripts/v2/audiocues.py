#!/usr/bin/env python3
"""scripts/v2/audiocues.py — the owner's music cue sheet (Amendment A4 §F) → review/<slug>/audio-cues.md

  python3 scripts/v2/audiocues.py --story <slug> [--spec stories/<slug>/episode.json] [--out review/<slug>/audio-cues.md]

Exact times from cues.json (each beat boundary snaps to the word onset nearest its cut): B1 end, every beat cut (B2–B9 and
every A3 `beat` shot), the low point (B6), the reversal (B7), the second surprise (B8) and the end (last word, and the
picture end), with a one-word mood per section (spec.moods overrides MOODS).
"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))

BEATS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']
NAMES = {'B1': 'rule', 'B2': 'expansion', 'B3': 'defect', 'B4': 'crack', 'B5': 'crisis', 'B6': 'low point', 'B7': 'reversal', 'B8': 'second surprise', 'B9': 'flip'}
MOODS = {'B1': 'bold', 'B2': 'playful', 'B3': 'warm', 'B4': 'curious', 'B5': 'tense', 'B6': 'hush', 'B7': 'wonder', 'B8': 'bright', 'B9': 'warm'}


def onsets(cues): return sorted(w['start'] for l in cues['lines'] for w in l['words'])


def snap(t, ons, tol=.2):
    """Nearest word onset to t within tol seconds, else t."""
    best = min(ons, key=lambda o: abs(o - t)) if ons else t
    return best if abs(best - t) <= tol else t


def mmss(t): m, s = divmod(t, 60); return f'{int(m)}:{s:06.3f}'


def audio_cues(spec, shots, cues, fps=30):
    """→ {'sections': [{beat, name, start, end, mood}], 'marks': [(t, label)]} (pure)."""
    ons, by = onsets(cues), {s['id']: s for s in shots}
    end_pic = (shots[-1]['start'] + shots[-1]['frames']) / fps; last_word = cues['lines'][-1]['words'][-1]['end']
    starts = {}
    for b in BEATS:
        r = (spec.get('beats') or {}).get(b)
        if not r or r[0] not in by: raise ValueError(f'beats.{b} missing or unknown shot')
        starts[b] = 0.0 if b == 'B1' else snap(by[r[0]]['start'] / fps, ons)
    moods = {**MOODS, **(spec.get('moods') or {})}
    secs = [{'beat': b, 'name': NAMES[b], 'start': round(starts[b], 3), 'end': round(starts[BEATS[i + 1]] if i + 1 < len(BEATS) else end_pic, 3), 'mood': moods[b]} for i, b in enumerate(BEATS)]
    marks = [(starts['B2'], 'B1 end (rule stated)')]
    marks += [(starts[b], f'{b} cut: {NAMES[b]}') for b in BEATS[1:]]
    marks += [(snap(s['start'] / fps, ons), f"beat cut {s['id']}") for s in shots if s.get('beat')]
    marks += [(starts['B6'], 'LOW POINT'), (starts['B7'], 'REVERSAL'), (starts['B8'], 'SECOND SURPRISE'), (last_word, 'last word'), (end_pic, 'END (picture)')]
    return {'sections': secs, 'marks': sorted(((round(t, 3), l) for t, l in marks), key=lambda m: m[0])}


def to_md(slug, r):
    out = [f'# {slug}: audio cues (A4 §F; times from cues.json, seconds and m:ss.sss)', '', '| Section | From | To | Mood |', '|---|---|---|---|']
    out += [f"| {s['beat']} {s['name']} | {s['start']:.3f} ({mmss(s['start'])}) | {s['end']:.3f} ({mmss(s['end'])}) | {s['mood']} |" for s in r['sections']]
    out += ['', '| Time | Mark |', '|---|---|'] + [f'| {t:.3f} ({mmss(t)}) | {l} |' for t, l in r['marks']]
    out += ['', 'Music is the owner\'s: put it at `stories/' + slug + '/music.mp3` and `assemble.py` mixes it at −20 dB; sfx sit 16 dB under the voice,',
            'and music + sfx drop out for the 8 frames before the reversal.']
    return '\n'.join(out) + '\n'


def main():
    a = argparse.ArgumentParser(); a.add_argument('--story', required=True); a.add_argument('--spec'); a.add_argument('--out'); a.add_argument('--cues'); o = a.parse_args()
    import sfx as SFX
    sp = o.spec or f'stories/{o.story}/episode.json'; spec = json.load(open(sp)); cues = json.load(open(o.cues or f'stories/{o.story}/cues.json'))
    r = audio_cues(spec, SFX.layout(sp), cues, spec.get('fps', 30)); out = o.out or f'review/{o.story}/audio-cues.md'
    os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'w').write(to_md(o.story, r)); print(json.dumps({'out': out, 'sections': len(r['sections']), 'marks': len(r['marks'])}))


if __name__ == '__main__':
    main()
