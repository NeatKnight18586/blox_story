"""Short white captions for the Dice Town film, timed from the narration audio.

Usage: python3 scripts/dice-town-captions.py path/to/narration.wav [out.ass]
No speech-recognition model is used (none reachable offline): each locked paragraph
cue is split into 2–5-word phrases at punctuation, and phrases are laid onto the
*spoken* stretches of that paragraph (silence excluded) in proportion to their
length, with phrase changes snapped to real pauses when one is close.
Style: white bold sans, thin dark outline, one line, lower-middle safe area
(clear of the Shorts UI at the bottom and of faces in the upper half).
"""
import json
import re
import subprocess
import sys

import numpy as np

WAV = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'evidence/dice-town-film/captions.ass'
FPS = 30
CUES = json.load(open('stories/dice-town/Dice_Town_117s_Animatic_Plan.json'))['audio_cues']

# ---- Speech activity (10 ms hops) --------------------------------------------------
SR = 16000
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', WAV, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
hop = SR // 100
rms = np.sqrt(np.convolve(x ** 2, np.ones(hop * 3) / (hop * 3), 'same'))[::hop]
db = 20 * np.log10(rms + 1e-9)
speech = db > max(-45.0, np.percentile(db, 95) - 32)
# Close tiny gaps (inside words) and drop tiny blips.
def runs(mask):
    edges = np.flatnonzero(np.diff(np.r_[0, mask.astype(int), 0]))
    return list(zip(edges[::2], edges[1::2]))
for a, b in runs(~speech):
    if b - a < 12 and a > 0: speech[a:b] = True
for a, b in runs(speech):
    if b - a < 5: speech[a:b] = False
pauses = [((a + b) / 2 / 100, (b - a) / 100) for a, b in runs(~speech) if b - a >= 14]  # (centre s, length s)

# ---- Phrase chunking ----------------------------------------------------------------
WEAK = {'a', 'an', 'the', 'to', 'of', 'in', 'on', 'into', 'if', 'every', 'and', 'but', 'his', 'her', 'their', 'from', 'for', 'at', 'by', 'what', 'that', 'he', 'she', 'it', 'was', 'had', 'with', 'until', 'past', 'without'}

def split_clause(words, limit=28):
    """Split a clause into balanced pieces <= limit chars, never ending a piece on a weak word."""
    text = ' '.join(words)
    if len(text) <= limit or len(words) < 4: return [text]
    best = None
    for i in range(2, len(words) - 1):
        if words[i - 1].lower().strip('“"') in WEAK: continue
        l, r = ' '.join(words[:i]), ' '.join(words[i:])
        score = abs(len(l) - len(r))
        if best is None or score < best[0]: best = (score, i)
    i = best[1] if best else len(words) // 2
    return split_clause(words[:i], limit) + split_clause(words[i:], limit)

def chunks(text):
    clauses = re.findall(r'[^.,?!:;]+[.,?!:;]*["”]?\s*', text)
    out = []
    for c in clauses:
        w = c.split()
        if w: out += split_clause(w)
    # Merge a dangling 1-word piece into a neighbour, never across a sentence end.
    merged, carry = [], ''
    for piece in out:
        piece = (carry + ' ' + piece).strip() if carry else piece; carry = ''
        ends = lambda t: bool(re.search(r'[.?!]["”]?$', t))
        if len(piece.split()) == 1 and merged and not ends(merged[-1]) and len(merged[-1] + ' ' + piece) <= 30: merged[-1] += ' ' + piece
        elif len(piece.split()) == 1 and not ends(piece): carry = piece
        else: merged.append(piece)
    if carry: merged.append(carry)
    return merged

def ts(t):
    cs = int(round(t * 100)); return f'{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}'

events = []
# Word-accurate timing from forced alignment (scripts/dice-town-align.py) when available.
import os
WT = 'evidence/dice-town-film/word-timings.json'
if os.path.exists(WT):
    WORDS, k = json.load(open(WT)), 0
    for ci, cue in enumerate(CUES):
        n = len(cue['transcript'].split()); ws = WORDS[k:k + n]; k += n
        parts = chunks(re.sub(r'"([^"]*)"', r'“\1”', cue['transcript']))
        j, spans = 0, []
        for p in parts:
            m = len(p.split()); spans.append((ws[j]['start'], ws[j + m - 1]['end'], p)); j += m
        assert j == n, (cue['transcript'], parts)
        nxt = WORDS[k]['start'] if k < len(WORDS) else 117.1
        for i, (st, en, p) in enumerate(spans):
            follow = spans[i + 1][0] if i + 1 < len(spans) else nxt
            end = follow - .02 if follow - en < .5 else en + .3   # hold to the next phrase, or briefly past a pause
            events.append((max(0, st - .05), min(end, follow - .02), p))
else:
    for cue in CUES:
        s0, s1 = cue['start_frame'] / FPS, cue['end_frame'] / FPS
        a, b = int(s0 * 100), int(s1 * 100)
        active = np.flatnonzero(speech[a:b]) + a
        if len(active) == 0: continue
        t_on, t_off = active[0] / 100, (active[-1] + 1) / 100
        cum = np.cumsum(speech[a:b])  # spoken time (10 ms units) up to each hop
        total = cum[-1]
        def at(frac):  # time where `frac` of this paragraph's speech has elapsed
            k = int(np.searchsorted(cum, frac * total)); return (a + min(k, len(cum) - 1)) / 100
        parts = chunks(re.sub(r'"([^"]*)"', r'“\1”', cue['transcript']))  # curly quotes throughout
        weights = np.array([len(p) + 3 for p in parts], float); edges = np.r_[0, np.cumsum(weights) / weights.sum()]
        times = [at(e) for e in edges[:-1]] + [t_off]
        times[0] = t_on
        # Snap inner boundaries to a real pause within 0.3 s.
        for i in range(1, len(times) - 1):
            near = [c for c, L in pauses if abs(c - times[i]) < .3 and s0 < c < s1]
            if near: times[i] = min(near, key=lambda c: abs(c - times[i]))
        for i, p in enumerate(parts):
            st, en = times[i], max(times[i + 1], times[i] + .45)
            events.append((st, min(en, s1), p))

header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Narr,DejaVu Sans,56,&H00FFFFFF,&H00FFFFFF,&H00141414,&H8C000000,-1,0,0,0,100,100,0.5,0,1,4.2,2.2,2,90,90,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
# No overlaps: each caption ends no later than the next one starts.
events.sort()
for i in range(len(events) - 1):
    if events[i][1] > events[i + 1][0]: events[i] = (events[i][0], events[i + 1][0], events[i][2])
with open(OUT, 'w') as fh:
    fh.write(header)
    for st, en, p in events:
        fh.write(f'Dialogue: 0,{ts(st)},{ts(en)},Narr,,0,0,0,,{{\\fad(60,60)}}{p}\n')
# Coverage check: fraction of spoken time with a caption on screen.
on = np.zeros_like(speech)
for st, en, _ in events: on[int(st * 100):int(en * 100)] = True
cov = float((on & speech).sum() / max(1, speech.sum()))
print(json.dumps({'captions': len(events), 'speech_coverage': round(cov, 3), 'pauses_detected': len(pauses), 'max_chars': max(len(p) for *_, p in events), 'out': OUT}))
