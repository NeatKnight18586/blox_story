"""npm run v2:test (python part) — caption generator: chunking, timing lead, pause blanking, emphasis, escaping."""
import json, os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'v2'))
import captions as C  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CUES = json.load(open(os.path.join(ROOT, 'stories/nobody/cues.json')))
STYLE = json.load(open(os.path.join(ROOT, 'captions/pop-shorts-v2.json')))


def line(words, text=None, n=1):
    ws = [{'w': w, 'start': s, 'end': e} for w, s, e in words]
    return {'line': n, 'text': text or ' '.join(w for w, _, _ in words), 'start': ws[0]['start'], 'end': ws[-1]['end'], 'words': ws}


class Chunking(unittest.TestCase):
    def test_one_to_three_words_and_every_word_once(self):
        ch = C.chunk(CUES)
        self.assertTrue(all(1 <= len(c['words']) <= 3 for c in ch))
        self.assertEqual(sum(len(c['words']) for c in ch), sum(len(l['words']) for l in CUES['lines']))

    def test_breaks_at_punctuation_and_pauses(self):
        cues = {'lines': [line([('Baker.', 0, .4), ('Knight.', .5, .9), ('Even', 1.4, 1.6), ('King.', 1.6, 2.0)], 'Baker. Knight. Even King.')]}
        self.assertEqual([c['words'] for c in C.chunk(cues)], [['Baker'], ['Knight'], ['Even', 'King']])

    def test_display_strips_quotes_and_commas_keeps_question_marks(self):
        l = line([('Hey', 0, .1), ('Nobody', .1, .5), ('need', .5, .7), ('a', .7, .8), ('hand', .8, 1)], '"Hey Nobody, need a hand?"')
        self.assertEqual([t for t, _ in C.display_words(l)], ['Hey', 'Nobody', 'need', 'a', 'hand?'])


class Timing(unittest.TestCase):
    def test_lead_is_40ms_but_never_before_the_phrase_onset(self):
        cues = {'lines': [line([('a', 1.0, 1.2), ('b', 1.2, 1.4), ('c', 1.4, 1.6), ('d', 1.62, 1.8)])]}
        t = C.timing(C.chunk(cues))
        self.assertEqual(t[0]['start'], 0.0)                 # the hook starts at frame 0
        cues = {'lines': [line([('x', 0, .2)]), line([('a', 2.0, 2.2), ('b', 2.2, 2.4), ('c', 2.4, 2.6), ('d', 2.62, 2.8)], n=2)]}
        t = C.timing(C.chunk(cues))
        self.assertAlmostEqual(t[1]['start'], 2.0)            # clamped to its phrase onset (no lead before 2.0)
        self.assertAlmostEqual(t[2]['start'], 2.58)           # mid-phrase chunk: 40 ms early

    def test_blank_in_pauses_and_no_overlap(self):
        t = C.timing(C.chunk(CUES))
        for a, b in zip(t, t[1:]):
            self.assertLessEqual(a['end'], b['start'] + 1e-9)
            if b['start'] - a['end'] > .35: self.assertLess(a['end'], b['start'])
        stone = next(c for c in t if c['words'] == ['stone'])  # "…from your stone." then a 0.36 s pause
        nxt = t[t.index(stone) + 1]
        self.assertGreater(nxt['start'] - stone['end'], .2)


class Emphasis(unittest.TestCase):
    def test_single_and_multiword_one_per_chunk(self):
        self.assertEqual(C.emphasis(['over', 'two', 'thousand'], ['two thousand', 'nobody']), (1, 3))
        self.assertEqual(C.emphasis(['still', 'says', 'Nobody'], ['nobody', 'sword']), (2, 3))
        self.assertIsNone(C.emphasis(['the', 'boy'], ['nobody']))

    def test_ass_has_accent_and_resets(self):
        t = [{'words': ['your', 'sword', 'from'], 'start': 0, 'end': 1, 'line': 1}]
        ass = C.to_ass(t, STYLE, ['sword'])
        self.assertEqual(ass.count('\\c' + STYLE['emphasisColour']), 1)     # one accent per chunk, then reset
        self.assertIn('\\c' + STYLE['primary'], ass)
        self.assertIn('\\fscx115', ass)


class SpecKeywords(unittest.TestCase):
    def test_phrases_and_possessive(self):
        timed = [{'words': ['in', 'the', 'Toy', 'House.']}, {'words': ["Mo's", 'hand', 'Mom']}, {'words': ['Toy', 'car']}]
        self.assertEqual(C.spec_keyword_slots(timed, ['Toy House', 'Mo', 'hand']), {(0, 2), (0, 3), (1, 0), (1, 1)})


class Asterisks(unittest.TestCase):
    def test_emphasis_marks_stripped(self):   # tuft 4C
        line = {'text': "Vance's dragon breathes *cyan fire*, so", 'words': [{'w': w} for w in "Vance's dragon breathes cyan fire so".split()]}
        self.assertEqual([w for w, _ in C.display_words(line)], ["Vance's", 'dragon', 'breathes', 'cyan', 'fire', 'so'])
        self.assertTrue(C.display_words(line)[4][1])   # the comma after fire* still breaks


class Escaping(unittest.TestCase):
    def test_braces_backslashes_newlines(self):
        self.assertEqual(C.ass_escape('a{b}c\\d\ne'), 'a(b)c/d\\Ne')
        self.assertNotIn('{', C.ass_escape('{\\fs99}hack'))

    def test_times(self):
        self.assertEqual(C.ass_time(0), '0:00:00.00'); self.assertEqual(C.ass_time(61.234), '0:01:01.23'); self.assertEqual(C.ass_time(3725.5), '1:02:05.50')

    def test_caption_y_constant_within_a_shot_and_high_option(self):
        shots = [{'frames': 60}, {'frames': 60, 'captionY': 'high'}]
        t = [{'words': ['a'], 'start': .5, 'end': 1, 'line': 1}, {'words': ['b'], 'start': 2.5, 'end': 3, 'line': 2}]
        ass = C.to_ass(t, STYLE, shots=shots)
        self.assertIn('\\pos(540,1267)', ass); self.assertIn('\\pos(540,580)', ass)


if __name__ == '__main__':
    unittest.main()
