"""Captions v2 for an episode, timed from the forced-aligned words.

Usage: python3 scripts/episode-captions.py <episode> [out.ass]
Reads stories/<episode>/word-timings.json (scripts/episode-align.py). Writes an ASS file
(default renders/<episode>-final/captions.ass): white Montserrat ExtraBold 72 px on 1080,
dark outline, 1–4 words per caption, never across a sentence end, sitting in the
caption band (60–76% down the frame) that the camera solver keeps faces out of.
Burn in with: -vf "ass=<file>:fontsdir=studio/fonts"
"""
import json
import os
import re
import sys

EP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else f'renders/{EP}-final/captions.ass'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
W = json.load(open(f'stories/{EP}/word-timings.json'))
WEAK = {'a', 'an', 'the', 'to', 'of', 'in', 'on', 'into', 'if', 'every', 'and', 'but', 'his', 'her', 'their', 'from', 'for', 'at', 'by',
        'that', 'he', 'she', 'it', 'was', 'had', 'with', 'as', 'so', 'for', 'is', 'are', 'be', 'i', 'am', 'who', 'which', 'could'}
MAX_WORDS, MAX_CHARS = 4, 20
clean = lambda w: re.sub(r'"', '', w)
bare = lambda w: re.sub(r"[^a-z']", '', w.lower())

# 1) Clauses: break after , . ? ! ; : … and before an opening quote.
clauses, cur = [], []
for i, w in enumerate(W):
    if cur and w['word'].startswith('"'): clauses.append(cur); cur = []
    cur.append(i)
    if re.search(r'[.,?!;:…]["”]?$', w['word']) or w['word'].endswith('...'): clauses.append(cur); cur = []
if cur: clauses.append(cur)

# 2) Split clauses into balanced pieces of ≤4 words / ≤20 chars, never ending on a weak word.
def split(ix):
    text = ' '.join(clean(W[i]['word']) for i in ix)
    if len(ix) <= MAX_WORDS and len(text) <= MAX_CHARS or len(ix) == 1: return [ix]
    best = None
    for k in range(1, len(ix)):
        if bare(W[ix[k - 1]]['word']) in WEAK and k > 1: continue
        l, r = ' '.join(clean(W[i]['word']) for i in ix[:k]), ' '.join(clean(W[i]['word']) for i in ix[k:])
        score = abs(len(l) - len(r))
        if best is None or score < best[0]: best = (score, k)
    k = best[1] if best else len(ix) // 2
    return split(ix[:k]) + split(ix[k:])
pieces = [p for c in clauses for p in split(c)]

# 3) Times: on with the first word (−0.05 s), hold to the next caption across short gaps.
def curly(t):
    t = re.sub(r'"(\w)', r'“\1', t); t = re.sub(r'"', '”', t); return t.replace("'", '’')
events, karaoke = [], []
HL = '&H0036D8FF&'   # the spoken word turns warm yellow (ASS colours are BGR)
for n, p in enumerate(pieces):
    st, en = W[p[0]]['start'] - .05, W[p[-1]]['end']
    nxt = W[pieces[n + 1][0]]['start'] - .05 if n + 1 < len(pieces) else en + .6
    end = nxt - .02 if nxt - en < .6 else en + .35
    events.append((max(0, st), end, curly(' '.join(W[i]['word'] for i in p))))
    words = [curly(W[i]['word']) for i in p]
    for k, i in enumerate(p):
        a = max(0, st) if k == 0 else W[i]['start'] - .03
        b = (W[p[k + 1]]['start'] - .03) if k + 1 < len(p) else end
        text = ' '.join(f'{{\\c{HL}}}{w}{{\\c&H00FFFFFF&}}' if j == k else w for j, w in enumerate(words))
        karaoke.append((a, b, text, k == 0))

def ts(t):
    cs = int(round(t * 100)); return f'{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}'
header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Montserrat ExtraBold,72,&H00FFFFFF,&H00FFFFFF,&H00141414,&H96000000,0,0,0,0,100,100,0.5,0,1,5,2.5,2,80,80,500,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open(OUT, 'w') as fh:
    fh.write(header)
    for st, en, text, first in karaoke:
        # Each phrase pops in (scale 92→100 % over 120 ms); then the spoken word stays highlighted.
        tag = '{\\fad(40,0)\\fscx92\\fscy92\\t(0,120,\\fscx100\\fscy100)}' if first else ''
        fh.write(f'Dialogue: 0,{ts(st)},{ts(en)},Cap,,0,0,0,,{tag}{text}\n')
spoken = sum(w['end'] - w['start'] for w in W)
covered = sum(min(en, w['end']) - max(st, w['start']) for st, en, _ in events for w in W if st < w['end'] and en > w['start'])
print(json.dumps({'captions': len(events), 'max_words': max(len(t.split()) for *_, t in events), 'max_chars': max(len(t) for *_, t in events),
                  'speech_coverage': round(covered / spoken, 3), 'out': OUT}))
