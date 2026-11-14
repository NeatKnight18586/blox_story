#!/usr/bin/env python3
"""scripts/v2/captions.py — pop captions from cues.json (docs/V2_BRIEF.md §9, CAPTION_STYLE_V2.md).

  python3 scripts/v2/captions.py --story nobody [--spec stories/nobody/episode.json] [--until 12] [--out build/captions.ass]

Chunks of 1–3 words from the aligned words; each chunk starts 40 ms before its first word but never
before its phrase onset; captions blank in pauses > 0.35 s; emphasis words (spec.emphasis) take the accent
colour at +15 %, at most one per chunk; position is constant within a shot (shot.captionY: "high" → y 580);
the opening line is on screen from frame 0 at the opener size. No emoji, per-letter effects or karaoke.

v3 (Amendment A4 §D, `--style v3` or spec "captionStyle": "pop-shorts-v3"; v2 stays the default for "Nobody"): size 128,
opener 150, emphasis 120 %, outline 9, y 1250 / high 560; a chunk holds at most 2 words when either has 7+ letters, else 3
(`chunk_cap`); a chunk wider than `fitWidth` px is set at a smaller \\fs (never below the 2.6 % phone cap height).
"""
import argparse, json, re, sys

STYLE_FILE = 'captions/pop-shorts-v2.json'
STYLES = {'v2': 'captions/pop-shorts-v2.json', 'pop-shorts-v2': 'captions/pop-shorts-v2.json', 'v3': 'captions/pop-shorts-v3.json', 'pop-shorts-v3': 'captions/pop-shorts-v3.json'}


def load_style(name=None):
    return json.load(open(STYLES.get(name or 'v2', name or STYLE_FILE)))


_FONT = {}
def text_width(text, size, font_file):
    """Advance width (px) of `text` at `size` in the caption font (PIL; libass agrees to within a few px)."""
    from PIL import ImageFont
    k = (font_file, size)
    if k not in _FONT: _FONT[k] = ImageFont.truetype(font_file, size)
    return _FONT[k].getlength(text)


def fit_size(words, size, style, emph_range=None):
    """v3: the largest \\fs ≤ size at which the chunk (emphasis words at emphasisScale) fits in style['fitWidth'] px."""
    if not style.get('fitWidth'): return size
    ff, k = style['fontFile'], style['emphasisScale'] / 100
    def width(sz):
        w = 0
        for i, t in enumerate(words): w += text_width(t, sz, ff) * (k if emph_range and emph_range[0] <= i < emph_range[1] else 1)
        return w + text_width(' ', sz, ff) * (len(words) - 1)
    if width(size) <= style['fitWidth']: return size
    return max(1, int(size * style['fitWidth'] / width(size)))
PUNCT_BREAK = re.compile(r'[.,!?;:…]["\')]*$')


def display_words(line):
    """Script tokens for a cue line (same count as its aligned words), stripped of quotes and trailing
    commas/periods but keeping ? and ! (sentence case kept as written)."""
    toks = line['text'].split()
    if len(toks) != len(line['words']):
        toks = [w['w'] for w in line['words']]
    out = []
    for t in toks:
        brk = bool(PUNCT_BREAK.search(t))
        clean = t.strip('"“”\'').rstrip('"“”')
        clean = re.sub(r'[.,;:…]+$', '', clean)
        out.append((clean, brk))
    return out


def letters(w):
    return sum(ch.isalpha() for ch in w)


def chunk_cap(words, max_words=3, max_long=None, long_letters=7):
    """Most words a chunk holding `words` may have: max_long (v3: 2) when any word has long_letters+ letters, else max_words."""
    if max_long is not None and any(letters(w) >= long_letters for w in words): return max_long
    return max_words


def chunk(cues, max_words=3, blank_pause=.35, max_long=None, long_letters=7):
    """→ [{words: [str], start, end, onset, first_line: bool, line: n}] (times = word times, before lead).
    max_long (v3): a chunk never holds more than max_long words when one of them has long_letters+ letters."""
    chunks = []
    for line in cues['lines']:
        words, toks = line['words'], display_words(line)
        cur, onset, chunk_onset = [], line['start'], line['start']
        for i, (w, (txt, brk)) in enumerate(zip(words, toks)):
            if i and w['start'] - words[i - 1]['end'] > blank_pause:
                onset = w['start']                     # a pause inside the line starts a new phrase
            if cur and len(cur) + 1 > chunk_cap(cur + [txt], max_words, max_long, long_letters):   # v3: the long word starts a new chunk
                first = words[i - len(cur)]
                chunks.append({'words': cur, 'start': first['start'], 'end': words[i - 1]['end'], 'onset': chunk_onset, 'line': line['line']})
                cur = []
            if not cur: chunk_onset = onset
            cur.append(txt)
            nxt_gap = words[i + 1]['start'] - w['end'] if i + 1 < len(words) else 9
            if len(cur) >= chunk_cap(cur, max_words, max_long, long_letters) or brk or nxt_gap > blank_pause or i == len(words) - 1:
                first = words[i - len(cur) + 1]
                chunks.append({'words': cur, 'start': first['start'], 'end': w['end'], 'onset': chunk_onset, 'line': line['line']})
                cur = []
    return chunks


def timing(chunks, lead=.04, blank_pause=.35):
    """Apply the 40 ms lead (clamped to the phrase onset) and hold each chunk until the next one starts,
    unless the gap is a pause > blank_pause (then the screen goes blank after the last word)."""
    out = []
    for i, c in enumerate(chunks):
        start = max(c['start'] - lead, c['onset'])
        if i == 0: start = 0.0                            # the hook is on screen from frame 0
        nxt = chunks[i + 1]['start'] - lead if i + 1 < len(chunks) else None
        end = c['end'] + .08 if nxt is None or chunks[i + 1]['start'] - c['end'] > blank_pause else max(c['end'], nxt)
        out.append({**c, 'start': round(start, 3), 'end': round(end, 3)})
    for a, b in zip(out, out[1:]):                       # never overlap
        if a['end'] > b['start']: a['end'] = b['start']
    return out


def norm(w):
    return re.sub(r"[^a-z0-9']", '', w.lower())


def emphasis(words, emph):
    """Index range (i, j) of the first emphasis phrase inside this chunk, or None. Multi-word phrases
    ("two thousand", "whole stone") match consecutive words. At most one per chunk."""
    ws = [norm(w) for w in words]
    for phrase in sorted(emph, key=lambda p: -len(p.split())):
        ps = [norm(p) for p in phrase.split()]
        for i in range(len(ws) - len(ps) + 1):
            if ws[i:i + len(ps)] == ps:
                return (i, i + len(ps))
    return None


def ass_escape(text):
    """Make plain text safe inside an ASS Dialogue line: braces start override blocks, backslashes start
    tags, and real newlines must become \\N."""
    return text.replace('\\', '/').replace('{', '(').replace('}', ')').replace('\r', '').replace('\n', '\\N')


def ass_time(t):
    cs = max(0, round(t * 100)); h, cs = divmod(cs, 360000); m, cs = divmod(cs, 6000); s, cs = divmod(cs, 100)
    return f'{h}:{m:02d}:{s:02d}.{cs:02d}'


def shot_at(shots, t, fps=30):
    if shots and 'at' in shots[0]:   # timed shots (engine/timeline.js): each runs from its cut to the next cut
        cur = None
        for s in shots:
            if round(s['at'] * fps) / fps <= t: cur = s
        return cur
    start = 0
    for s in shots or []:
        if start / fps <= t < (start + s['frames']) / fps: return s
        start += s['frames']
    return None


def to_ass(timed, style, emph=(), shots=None, fps=30, until=None):
    st = style
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {st['playRes'][0]}
PlayResY: {st['playRes'][1]}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Pop,{st['font']},{st['size']},{st['primary']},&H000000FF,{st['outlineColour']},&H80000000,0,0,0,0,100,100,0,0,1,{st['outline']},{st['shadow']},5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    first_line = timed[0]['line'] if timed else None
    rows = []
    for c in timed:
        if until is not None and c['start'] >= until: break
        end = min(c['end'], until) if until is not None else c['end']
        sh = shot_at(shots, c['start'], fps)
        y = st['yHigh'] if sh and sh.get('captionY') == 'high' else st['y']
        size = st['openerSize'] if c['line'] == first_line else st['size']
        e = emphasis(c['words'], emph)
        size = fit_size(c['words'], size, st, e)
        parts = []
        for i, w in enumerate(c['words']):
            txt = ass_escape(w)
            if e and e[0] <= i < e[1]:
                if i == e[0]: txt = f"{{\\c{st['emphasisColour']}\\fscx{st['emphasisScale']}\\fscy{st['emphasisScale']}}}" + txt
                if i == e[1] - 1: txt += '{\\c' + st['primary'] + '\\fscx100\\fscy100}'
            parts.append(txt)
        tag = f"{{\\an5\\pos({st['x']},{y})\\fs{size}{st['pop']}}}"
        rows.append(f"Dialogue: 0,{ass_time(c['start'])},{ass_time(end)},Pop,,0,0,0,,{tag}{' '.join(parts)}")
    return head + '\n'.join(rows) + '\n'


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--story', required=True); a.add_argument('--spec'); a.add_argument('--until', type=float)
    a.add_argument('--out'); a.add_argument('--style', help='v2 (default) | v3; or spec "captionStyle"'); a.add_argument('--cues'); o = a.parse_args()
    cues = json.load(open(o.cues or f'stories/{o.story}/cues.json'))
    spec = json.load(open(o.spec)) if o.spec else {}
    style = load_style(o.style or spec.get('captionStyle'))
    timed = timing(chunk(cues, style['maxWords'], style['blankPause'], style.get('maxWordsLong'), style.get('longLetters', 7)), style['leadSeconds'], style['blankPause'])
    ass = to_ass(timed, style, spec.get('emphasis', []), spec.get('shots'), spec.get('fps', 30), o.until)
    out = o.out or f'stories/{o.story}/build/captions.ass'
    import os; os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'w').write(ass)
    n = ass.count('Dialogue:'); print(json.dumps({'out': out, 'style': style['name'], 'captions': n, 'words': sum(len(c['words']) for c in timed), 'maxChunk': max(len(c['words']) for c in timed)}))


if __name__ == '__main__':
    main()
