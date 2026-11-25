"""npm run v2:test (python part) — format 7: scriptcheck --variant word ranges, v7 one-word captions."""
import json, os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'v2'))
import scriptcheck as S  # noqa: E402
import captions as C  # noqa: E402

CARD = {}   # no card: key nouns need none


def script(n, per=8):
    ws = [f'word{i % 7}' for i in range(n)]
    return '\n'.join(' '.join(ws[i:i + per]) + '.' for i in range(0, n, per))   # one-sentence lines of `per` words


class Variants(unittest.TestCase):
    def test_short_200_250(self):
        self.assertEqual(S.VARIANT_WORDS, {'short': (200, 250), 'long': (320, 360)})
        r = S.check(script(250), CARD, 'short'); self.assertFalse([f for f in r['failures'] if 'words (>' in f]); self.assertEqual(r['warnings'], [])
        self.assertTrue(any('251 words (> 250' in f for f in S.check(script(251), CARD, 'short')['failures']))
        self.assertTrue(any('199 words (< 200' in w for w in S.check(script(199), CARD, 'short')['warnings']))
        self.assertEqual(S.check(script(200), CARD, 'short')['warnings'], [])

    def test_long_320_360(self):
        self.assertFalse([f for f in S.check(script(360), CARD, 'long')['failures'] if 'words (>' in f])
        self.assertTrue(any('361 words (> 360' in f for f in S.check(script(361), CARD, 'long')['failures']))
        self.assertTrue(any('319 words (< 320' in w for w in S.check(script(319), CARD, 'long')['warnings']))

    def test_default_unchanged(self):
        self.assertEqual(S.WORDS, (300, 400))
        self.assertTrue(any('401 words (> 400' in f for f in S.check(script(401), CARD)['failures']))
        self.assertEqual([w for w in S.check(script(300), CARD)['warnings'] if 'words' in w], [])
        self.assertTrue(any('< 300' in w for w in S.check(script(251), CARD)['warnings']))

    def test_sentence_and_last_line_checks_stay(self):
        long_s = ' '.join(['alpha'] * 13) + '.'
        self.assertTrue(any('sentence of 13 words' in f for f in S.check(long_s + '\nmore words here.', CARD, 'short')['failures']))
        self.assertTrue(any('repeats the first line' in f for f in S.check('The door is red.\nA cat sat.\nThe door is red.', CARD, 'short')['failures']))


class OneWord(unittest.TestCase):
    CUES = {'lines': [{'line': 1, 'text': 'In this town nobody ever lies.', 'start': 0, 'end': 2, 'words': [{'w': w, 'start': i * .3, 'end': i * .3 + .28} for i, w in enumerate(['In', 'this', 'town', 'nobody', 'ever', 'lies'])]}]}

    def test_style_registered_and_fixed(self):
        st = C.load_style('v7'); self.assertEqual(C.load_style('pop-shorts-v7'), st)
        self.assertEqual((st['name'], st['maxWords'], st['y'], st['yHigh']), ('pop-shorts-v7', 1, 1250, 1250))
        v5 = C.load_style('v5'); self.assertGreaterEqual(st['outline'], 2 * v5['outline']); self.assertEqual(st['primary'], '&H0035E1FF')   # #FFE135

    def test_chunk_one_word(self):
        self.assertEqual(max(len(c['words']) for c in C.chunk(self.CUES, 3)), 3)
        ch = C.chunk(self.CUES, 3, one_word=True); self.assertEqual([c['words'] for c in ch], [[w] for w in ['In', 'this', 'town', 'nobody', 'ever', 'lies']])
        ch = C.make_chunks(self.CUES, C.load_style('v7')); self.assertEqual(len(ch), 6); self.assertTrue(all(len(c['words']) == 1 for c in ch))

    def test_ass_position_never_moves(self):
        st = C.load_style('v7'); t = C.timing(C.make_chunks(self.CUES, st), st['leadSeconds'], st['blankPause'])
        ass = C.to_ass(t, st, (), [{'id': 'a', 'start': 0, 'frames': 90, 'captionY': 'high'}], 30)
        ys = {l.split('\\pos(')[1].split(')')[0] for l in ass.splitlines() if l.startswith('Dialogue')}
        self.assertEqual(ys, {'540,1250'})


if __name__ == '__main__':
    unittest.main()
