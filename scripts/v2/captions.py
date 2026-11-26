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
STYLES = {'v2': 'captions/pop-shorts-v2.json', 'pop-shorts-v2': 'captions/pop-shorts-v2.json', 'v3': 'captions/pop-shorts-v3.json', 'pop-shorts-v3': 'captions/pop-shorts-v3.json', 'v5': 'captions/pop-shorts-v5.json', 'pop-shorts-v5': 'captions/pop-shorts-v5.json', 'v7': 'captions/pop-shorts-v7.json', 'pop-shorts-v7': 'captions/pop-shorts-v7.json'}


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
    commas/periods but keeping ? and ! (sentence case kept as written); *emphasis* asterisks stripped."""
    toks = line['text'].split()
    if len(toks) != len(line['words']):
        toks = [w['w'] for w in line['words']]
    out = []
    for t in toks:
        brk = bool(PUNCT_BREAK.search(t))
        clean = t.replace('*', '').strip('"“”\'').rstrip('"“”')   # tuft 4C: *emphasis* marks never reach the screen (they stay emphasis cues: script_marks / keyword colour)
        clean = re.sub(r'[.,;:…]+$', '', clean)
        out.append((clean, brk))
    return out


def letters(w):
    return sum(ch.isalpha() for ch in w)


def chunk_cap(words, max_words=3, max_long=None, long_letters=7):
    """Most words a chunk holding `words` may have: max_long (v3: 2) when any word has long_letters+ letters, else max_words."""
    if max_long is not None and any(letters(w) >= long_letters for w in words): return max_long
    return max_words


def chunk(cues, max_words=3, blank_pause=.35, max_long=None, long_letters=7, one_word=False):
    """→ [{words: [str], start, end, onset, first_line: bool, line: n}] (times = word times, before lead).
    max_long (v3): a chunk never holds more than max_long words when one of them has long_letters+ letters."""
    if one_word: max_words, max_long = 1, None   # style v7: one word per caption
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


# ---- owner caption grouping (Season 1, style "grouping": "v3") -----------------------------------------------------------
# A new sentence always starts a new caption; breaks prefer punctuation (and voice pauses); a caption never ends on a
# NO_END word; 1–3 words, and only as many as fit: its rendered width at the episode size (body 111, opener 130) must be
# ≤ maxWidthFrac (86 %) of the frame width, measured with the real font (rendered_width); a one-word caption only for a
# 7+ letter word or a one-word sentence. Each sentence is split by a small dynamic programme: the fewest captions, then
# the most natural breaks; when no split obeys every rule, the least bad one, keeping noun phrases ("the town hall") whole.
NO_END = {'a', 'an', 'the', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'his', 'her',
          'its', 'their', 'my', 'your', 'is', 'was', 'are', 'were'}
DETS = {'a', 'an', 'the', 'his', 'her', 'its', 'their', 'my', 'your', 'our', 'this', 'that', 'these', 'those', 'every', 'each',
        'one', 'two', 'no', 'some', 'any', 'whole'}
FUNCTION = NO_END | DETS | {'he', 'she', 'it', 'they', 'we', 'you', 'i', 'him', 'them', 'not', 'if', 'then', 'there', "there's",
                            'just', 'very', 'than', 'as', 'by', 'up', 'down', 'into', 'onto', 'over', 'under', 'out', 'off'}
SENT_END = re.compile(r'[.!?…]["\'”’)]*$')
BAD_END, BAD_ONE, BAD_NP = 60.0, 40.0, 70.0   # rule breaks (only when unavoidable); a split noun phrase costs most (owner: keep "the town hall" whole)


def rendered_width(words, size, style, emph_range=None):
    """Width (px, in the 1080 frame) of a caption as libass draws it: libass sets \\fs as ascent + descent, so the PIL
    advance at `size` is scaled by size / (ascent + descent); emphasis words at emphasisScale; + outline and shadow."""
    from PIL import ImageFont
    ff = style['fontFile']; f = ImageFont.truetype(ff, size); a, d = f.getmetrics(); k = size / (a + d); e = style['emphasisScale'] / 100
    w = sum(text_width(t, size, ff) * (e if emph_range and emph_range[0] <= i < emph_range[1] else 1) for i, t in enumerate(words)) + text_width(' ', size, ff) * (len(words) - 1)
    return w * k + 2 * style['outline'] + style.get('shadow', 0)


def fits(words, size, style, emph=()):
    """1–3 words whose rendered width ≤ maxWidthFrac of the frame width."""
    return 1 <= len(words) <= style['maxWords'] and rendered_width(words, size, style, emphasis(words, emph)) <= style['maxWidthFrac'] * style['playRes'][0]


ADJ = {'big', 'small', 'tiny', 'little', 'whole', 'sorry', 'old', 'new', 'baby', 'giant', 'huge', 'empty', 'cold', 'warm', 'golden',
       'only', 'last', 'first', 'next', 'same', 'other', 'every', 'slowest', 'missing'}


def np_split(g, nxt, nxt_closes=False):
    """Does ending caption g before word nxt cut a noun phrase? Yes when g ends on a determiner or a common adjective
    ("In this" | "town", "a sorry" | "note"), or when g holds a determiner followed only by content words and nxt is a
    content word that closes the phrase (nxt_closes: punctuation or the sentence end right after it: "on the town" | "hall."). "The clock" | "struck twelve" is not a split (struck does not close a phrase)."""
    if nxt is None or norm(nxt) in FUNCTION or not g: return False
    ws = [norm(w) for w in g]
    if ws[-1] in DETS or ws[-1] in ADJ: return True
    if not nxt_closes: return False
    for k in range(len(ws) - 1, -1, -1):
        if ws[k] in DETS: return k < len(ws) - 1 and all(w not in FUNCTION for w in ws[k + 1:])
    return False


def split_sentence(words, ok, punct, pause, long_letters=7):
    """Owner order: a split that obeys every rule wins (noun phrases only a soft preference among those); only when none
    exists, the least bad split, where keeping a noun phrase whole outranks the other breaks."""
    strict = _split(words, ok, punct, pause, long_letters, bad_end=1000.0, bad_one=1000.0, bad_np=5.0)
    if strict[1] < 1000: return strict[0]
    return _split(words, ok, punct, pause, long_letters)[0]


def _split(words, ok, punct, pause, long_letters=7, bad_end=BAD_END, bad_one=BAD_ONE, bad_np=BAD_NP):
    """Pure. words: display words of one sentence; ok(group) → may this group be one caption (count + width);
    punct[i]/pause[i]: a comma-type mark / a voice pause after word i. → list of (i, j) word ranges. Cost per caption 1,
    + BAD_END for a NO_END ending, + BAD_ONE for a short one-word caption in a longer sentence, + BAD_NP for a split noun
    phrase, + 0.4 for a break that is neither punctuation nor a pause (0.1 just before a NO_END word: a phrase boundary)."""
    n = len(words); best = [0.0] + [float('inf')] * n; back = [0] * (n + 1)
    for i in range(1, n + 1):
        for j in range(max(0, i - 3), i):
            g = words[j:i]
            if not ok(g) and len(g) > 1: continue   # a single word is always placeable (never dropped)
            c = 1.0
            if i < n and norm(g[-1]) in NO_END: c += bad_end
            if len(g) == 1 and n > 1 and letters(g[0]) < long_letters: c += bad_one
            if i < n and np_split(g, words[i], punct[i] or i + 1 == n): c += bad_np
            if i < n and not punct[i - 1] and not pause[i - 1]: c += .1 if norm(words[i]) in NO_END else .4   # before a preposition/conjunction: a phrase boundary
            if best[j] + c < best[i]: best[i], back[i] = best[j] + c, j
    out, i = [], n
    while i > 0: out.append((back[i], i)); i = back[i]
    return out[::-1], best[n]


def group(cues, style, emph=()):
    """Owner grouping → chunks like chunk(): [{words, start, end, onset, line, sentenceEnd, sentenceLen, size}]."""
    bp, out, first = style['blankPause'], [], cues['lines'][0]['line'] if cues['lines'] else None
    for line in cues['lines']:
        words, toks, raw = line['words'], display_words(line), line['text'].split()
        if len(raw) != len(words): raw = [w['w'] for w in words]
        size = style['openerSize'] if line['line'] == first else style['size']
        onsets, onset = [], line['start']
        for i, w in enumerate(words):
            if i and w['start'] - words[i - 1]['end'] > bp: onset = w['start']
            onsets.append(onset)
        s0 = 0
        for k in range(len(words)):
            if k < len(words) - 1 and not SENT_END.search(raw[k]): continue
            idx = list(range(s0, k + 1)); ws = [toks[i][0] for i in idx]
            punct = [toks[i][1] for i in idx]
            pause = [i + 1 < len(words) and words[i + 1]['start'] - words[i]['end'] > bp for i in idx]
            parts = split_sentence(ws, lambda g: fits(g, size, style, emph), punct, pause, style.get('longLetters', 7))
            for a, b in parts:
                i0, i1 = idx[a], idx[b - 1]
                out.append({'words': ws[a:b], 'start': words[i0]['start'], 'end': words[i1]['end'], 'onset': onsets[i0], 'line': line['line'],
                            'sentenceEnd': b == len(ws), 'sentenceLen': len(ws), 'size': size, 'next': ws[b] if b < len(ws) else None,
                            'npSplit': b < len(ws) and np_split(ws[a:b], ws[b], punct[b] or b + 1 == len(ws))})
            s0 = k + 1
    return out


def grouping_issues(chunks, style, emph=()):
    """Pure check of the owner rules on finished groups → [str]."""
    out = []
    for c in chunks:
        w = c['words']; size = c.get('size', style['size'])
        if len(w) > 1 and not fits(w, size, style, emph): out.append(f'too wide or too long: {w}')
        if norm(w[-1]) in NO_END and not c.get('sentenceEnd'): out.append(f'ends on "{w[-1]}": {w}')
        if len(w) == 1 and letters(w[0]) < style.get('longLetters', 7) and c.get('sentenceLen', 1) > 1: out.append(f'short one-word caption: {w}')
    return out


def make_chunks(cues, style, emph=()):
    """The style's grouping: "v3" (owner rules) or the original chunker (v2, "Nobody")."""
    if style.get('grouping') == 'v3': return group(cues, style, emph)
    return chunk(cues, style['maxWords'], style['blankPause'], style.get('maxWordsLong'), style.get('longLetters', 7), bool(style.get('oneWord')))


def episode_sizes(timed, style, emph=()):
    """oneSize styles: one body size and one opener size for the whole episode, each the largest that fits the widest group
    at that size (emphasis words at emphasisScale). → (opener, body)."""
    if not timed or style.get('maxWidthFrac'): return style['openerSize'], style['size']   # width-rule styles: the sizes are fixed
    first = timed[0]['line']; op = [c for c in timed if c['line'] == first]; body = [c for c in timed if c['line'] != first] or op
    fit = lambda cs, sz: min(fit_size(c['words'], sz, style, emphasis(c['words'], emph)) for c in cs)
    return fit(op, style['openerSize']), fit(body, style['size'])


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


# ---- format v5 keywords: the owner marks *word* in script.txt; those words show in style['keywordColour'] -------------------
def script_marks(text):
    """Pure: the marked words of a script, in order, as (normalised word, occurrence) — occurrence counts every appearance
    of that word in the script (marked or not), so it lines up with the cue words, which follow the script."""
    seen, marks = {}, []
    for tok in re.findall(r"\*?[\w'’-]+\*?", text):
        w = norm(tok.strip('*'))
        if not w: continue
        k = seen.get(w, 0); seen[w] = k + 1
        if tok.startswith('*') and tok.endswith('*') and len(tok) > 2: marks.append((w, k))
    return marks


def keyword_slots(timed, marks):
    """Pure: {(chunk index, word index)} of the marked words, walking the captions in order."""
    want, seen, out = set(marks), {}, set()
    for ci, c in enumerate(timed):
        for wi, w in enumerate(c['words']):
            n = norm(w); k = seen.get(n, 0); seen[n] = k + 1
            if (n, k) in want: out.add((ci, wi))
    return out


def spec_keyword_slots(timed, phrases):
    """Pure: {(chunk index, word index)} of every occurrence of the spec's keyword phrases (format v5, opt-in spec `keywords`,
    for scripts without *word* marks). A phrase of several words marks a run of consecutive words; a possessive counts ("Mo's")."""
    words = [(ci, wi, norm(w)) for ci, c in enumerate(timed) for wi, w in enumerate(c['words'])]
    out = set()
    for ph in phrases:
        ks = [norm(t) for t in ph.split() if norm(t)]
        for i in range(len(words) - len(ks) + 1):
            if all(words[i + j][2] in (k, k + "'s") for j, k in enumerate(ks)):
                out.update((words[i + j][0], words[i + j][1]) for j in range(len(ks)))
    return out


def to_ass(timed, style, emph=(), shots=None, fps=30, until=None, keywords=()):
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
    one = episode_sizes(timed, st, emph) if st.get('oneSize') else None   # owner rule: one size per episode, no per-caption shrinking
    for ci, c in enumerate(timed):
        if until is not None and c['start'] >= until: break
        end = min(c['end'], until) if until is not None else c['end']
        sh = shot_at(shots, c['start'], fps)
        y = st['yHigh'] if sh and sh.get('captionY') == 'high' else st['y']
        size = st['openerSize'] if c['line'] == first_line else st['size']
        e = emphasis(c['words'], emph)
        size = (one[0] if c['line'] == first_line else one[1]) if one else fit_size(c['words'], size, st, e)
        parts = []
        for i, w in enumerate(c['words']):
            txt = ass_escape(w)
            if e and e[0] <= i < e[1]:
                if i == e[0]: txt = f"{{\\c{st['emphasisColour']}\\fscx{st['emphasisScale']}\\fscy{st['emphasisScale']}}}" + txt
                if i == e[1] - 1: txt += '{\\c' + st['primary'] + '\\fscx100\\fscy100}'
            if st.get('keywordColour') and (ci, i) in keywords: txt = f"{{\\c{st['keywordColour']}}}" + txt + f"{{\\c{st['primary']}}}"   # v5 keyword
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
    style = load_style(o.style or spec.get('captionStyle') or ('v7' if spec.get('format', 0) >= 7 else None))   # format 7 specs default to pop-shorts-v7
    timed = timing(make_chunks(cues, style, spec.get('emphasis', [])), style['leadSeconds'], style['blankPause'])
    kw = set()
    if style.get('keywordColour'):   # format v5: *word* marks in the owner's script (read only)
        import os; sp = f'stories/{o.story}/script.txt'
        if os.path.exists(sp): kw = keyword_slots(timed, script_marks(open(sp).read()))
        if spec.get('keywords'): kw |= spec_keyword_slots(timed, spec['keywords'])   # opt-in: keywords listed in the spec
    ass = to_ass(timed, style, spec.get('emphasis', []), spec.get('shots'), spec.get('fps', 30), o.until, keywords=kw)
    out = o.out or f'stories/{o.story}/build/captions.ass'
    import os; os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'w').write(ass)
    n = ass.count('Dialogue:'); print(json.dumps({'out': out, 'style': style['name'], 'captions': n, 'words': sum(len(c['words']) for c in timed), 'maxChunk': max(len(c['words']) for c in timed)}))


if __name__ == '__main__':
    main()
