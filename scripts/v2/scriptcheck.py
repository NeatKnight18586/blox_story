#!/usr/bin/env python3
"""scripts/v2/scriptcheck.py — the Season 1 script checker (Amendment A4 §I). Exit 1 on any failure.

  python3 scripts/v2/scriptcheck.py --story <slug> [--card-file docs/season1/SEASON_1.md] [--json]

Checks `stories/<slug>/script.txt` (FORMAT v6, docs/season1/FORMAT_V6.md) against its card in SEASON_1.md §6:
  1. 300–400 words;  2. no sentence over 12 words;  3. first line ≤ 9 words;  4. the last line does NOT repeat or paraphrase
  the first line (FAIL when the normalized lines are equal or share ≥ 60 % of the words of the shorter line);
  5. Flesch–Kincaid grade ≤ 6;  6. every key noun of the card's Rule, Hero, Expansion and Crisis fields appears.
First-person narration is the format (decision D1): no cap. The card's first/last lines are not required word for word.
Key nouns (6) are the content words of those four fields: words of 3+ letters minus function words, numbers, common verbs,
adjectives and adverbs (STOP), and minus generic person / place words that a script names another way (GENERIC: "person",
"kid", "edge", "square", …). A key noun counts as present when any inflection matches (eggs/egg, whispering/whispers,
sleepwalks/sleepwalking, handshakes/handshake, snaps/snapped). Clues, Frame 0, Money shot and World are pictures, not words.
"""
import argparse, json, re, sys

WORDS = (300, 400)   # FORMAT_V6.md rule 1
MAX_SENTENCE, FIRST_LINE, MAX_GRADE, MAX_OVERLAP = 12, 9, 6.0, .60
FIRST_PERSON = {'i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours', 'ourselves', "i'm", "i'll", "i've", "i'd", "we're", "we'll", "we've", "we'd", "let's"}
STOP = set('''a an the and or but if then so to of in on at by for with from into onto up down out over under about as is are was were be been being has
have had do does did not no nor never ever only just too very one two three four five six seven eight nine ten eleven twelve hundred thousand first
last every each all some any this that these those his her its their our my your he she it they them him who whom whose which what when where while
how why than there here also still even again once yet more most less least other another same such own off back away can could would should will
may might must shall cannot along toward towards across around through instead unless half plainly perfectly gently finally anyway
everybody everyone nobody somebody someone anyone anything nothing something everything
plays play holds hold steals steal returns return lifts lift stands stand wakes wake screams scream fail fails gives give puts put sees see shows show
turns turn runs run walks walk sits sit fires fire takes take makes make done gone get gets got says said tells tell keeps keep finds find knows know
wants want lives live comes come goes go pushes push checks check enters enter waves wave yells yell steps step reads read ends end carries carry
loud loudest alive honest giant tiny huge big small whole perfect missing hatched sleeping buried reflected floppy stiff straight steep black glowing
green white sized stuffed wrapped'''.split())
GENERIC = {'person', 'people', 'kid', 'kids', 'boy', 'girl', 'man', 'woman', 'thing', 'things', 'edge', 'middle', 'side', 'top', 'bottom', 'centre',
           'center', 'square', 'corner', 'front', 'way', 'time', 'day'}
KEY_FIELDS = ('Rule', 'Hero', 'Expansion', 'Crisis')


# ---------------- pure helpers ----------------
def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('’', "'"))).strip()


def tokens(s):
    return [w.lower().replace('’', "'").strip("'") for w in re.findall(r"[A-Za-z0-9][A-Za-z0-9'’]*", s.replace('-', ' '))]


def lines(text):
    return [l.strip() for l in text.splitlines() if l.strip()]


def sentences(text):
    """Sentences: split on . ! ? … (runs) and at line ends."""
    out = []
    for l in lines(text):
        out += [s.strip(' "“”') for s in re.split(r'(?<=[.!?…])["”]?\s+', l) if s.strip(' "“”')]
    return out


def syllables(w):
    w = re.sub(r'[^a-z]', '', w.lower())
    if not w: return 0
    if len(w) <= 3: return 1
    w = re.sub(r'(?:[^laeiouy]es|ed|[^laeiouy]e)$', '', w); w = re.sub(r'^y', '', w)
    return max(1, len(re.findall(r'[aeiouy]{1,2}', w)))


def fk_grade(text):
    ss = sentences(text); ws = [w for s in ss for w in tokens(s)]
    if not ss or not ws: return 0.0
    return 0.39 * len(ws) / len(ss) + 11.8 * sum(syllables(w) for w in ws) / len(ws) - 15.59


def forms(w):
    """Inflection variants of a word (plural/verb endings, doubled consonants)."""
    w = re.sub(r"'s$", '', w); f = {w}
    for suf, rep in (('ies', 'y'), ('es', ''), ('s', ''), ('ied', 'y'), ('ed', ''), ('ed', 'e'), ('ing', ''), ('ing', 'e')):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            b = w[:-len(suf)] + rep; f.add(b)
            if len(b) > 3 and b[-1] == b[-2] and b[-1] not in 'aeiouls': f.add(b[:-1])
    return f


def key_nouns(card):
    out = []
    for k, v in card.items():
        if k.split()[0].rstrip(':') not in KEY_FIELDS: continue
        for w in tokens(v):
            if len(w) < 3 or w.isdigit() or w in STOP or w in GENERIC: continue
            if not any(forms(w) & forms(x) for x in out): out.append(w)
    return out


def missing_nouns(card, script):
    have = set().union(*(forms(w) for w in tokens(script)))
    return [w for w in key_nouns(card) if not forms(w) & have]


def card_last_line(card):
    f = next((v for k, v in card.items() if k.startswith('Second surprise')), '')
    m = re.search(r'/\s*["“](.+?)["”]\s*$', f)
    return m.group(1) if m else ''


def rule_opening(card):
    r = card.get('Rule', ''); m = re.match(r'(.+?[.!?])(\s|$)', r)
    return m.group(1) if m else r


def overlap(a, b):
    """Share of the shorter line's distinct words that the other line also has (0–1, pure)."""
    A, B = set(tokens(a)), set(tokens(b))
    return len(A & B) / min(len(A), len(B)) if A and B else 0.0


def repeats_first(first, last):
    """FORMAT_V6 rule 3 (pure): the last line repeats/paraphrases the first: equal after normalizing, or ≥ 60 % word overlap."""
    return bool(first and last) and (norm(first) == norm(last) or overlap(first, last) >= MAX_OVERLAP)


def check(script, card):
    """→ {'pass', 'failures': [...], 'numbers': {...}} (pure)."""
    F, ls, ss = [], lines(script), sentences(script)
    nw = len(tokens(script)); long = [s for s in ss if len(tokens(s)) > MAX_SENTENCE]
    grade = fk_grade(script)
    first, last = ls[0] if ls else '', ls[-1] if ls else ''
    if not WORDS[0] <= nw <= WORDS[1]: F.append(f'{nw} words (want {WORDS[0]}–{WORDS[1]})')
    for s in long: F.append(f'sentence of {len(tokens(s))} words (> {MAX_SENTENCE}): "{s}"')
    if len(tokens(first)) > FIRST_LINE: F.append(f'first line has {len(tokens(first))} words (> {FIRST_LINE})')
    if len(ls) > 1 and repeats_first(first, last): F.append(f'last line "{last}" repeats the first line "{first}" ({overlap(first, last) * 100:.0f} % word overlap; twist the rule or land the laugh instead)')
    if grade > MAX_GRADE: F.append(f'Flesch–Kincaid grade {grade:.2f} (> {MAX_GRADE})')
    miss = missing_nouns(card, script)
    if miss: F.append('key nouns missing: ' + ', '.join(miss))
    return {'pass': not F, 'failures': F, 'numbers': {'words': nw, 'sentences': len(ss), 'longest': max((len(tokens(s)) for s in ss), default=0),
            'firstLineWords': len(tokens(first)), 'lastLineOverlap': round(overlap(first, last), 2), 'grade': round(grade, 2), 'keyNouns': len(key_nouns(card)), 'missing': miss}}


# ---------------- card file ----------------
def card_for(slug, md):
    m = re.search(r'^### \d+ · \S+ · `' + re.escape(slug) + r'` · .*?$(.*?)(?=^### |^## |\Z)', md, re.S | re.M)
    if not m: raise SystemExit(f'no card for `{slug}` in SEASON_1.md §6')
    out = {}
    for l in m.group(1).splitlines():
        mm = re.match(r'- \*\*(.+?):\*\*\s*(.*)', l)
        if mm: out[mm.group(1)] = mm.group(2)
    return out


def main():
    a = argparse.ArgumentParser(); a.add_argument('--story', required=True); a.add_argument('--card-file', default='docs/season1/SEASON_1.md'); a.add_argument('--json', action='store_true'); o = a.parse_args()
    r = check(open(f'stories/{o.story}/script.txt').read(), card_for(o.story, open(o.card_file).read()))
    if o.json: print(json.dumps(r, ensure_ascii=False))
    else:
        print(json.dumps(r['numbers'], ensure_ascii=False))
        for f in r['failures']: print('FAIL', f)
        print(('PASS' if r['pass'] else 'FAIL') + f' scriptcheck {o.story}')
    sys.exit(0 if r['pass'] else 1)


if __name__ == '__main__':
    main()
