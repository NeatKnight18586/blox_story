"""npm run v2:test (python part) — Session 9 (Amendment A4 D, F, I): caption chunking v3, sfx placement, scriptcheck,
the /season state transitions."""
import json, os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'v2'))
import captions as C  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
V3 = json.load(open(os.path.join(ROOT, 'captions/pop-shorts-v3.json')))


def line(words, text=None, n=1):
    ws = [{'w': w, 'start': s, 'end': e} for w, s, e in words]
    return {'line': n, 'text': text or ' '.join(w for w, _, _ in words), 'start': ws[0]['start'], 'end': ws[-1]['end'], 'words': ws}


def seq(text, t0=0, step=.3, n=1):
    return line([(w, t0 + i * step, t0 + i * step + step) for i, w in enumerate(text.split())], text, n)


class CaptionsV3(unittest.TestCase):
    def ch(self, cues): return C.chunk(cues, V3['maxWords'], V3['blankPause'], V3['maxWordsLong'], V3['longLetters'])

    def test_style_numbers(self):
        self.assertEqual((V3['size'], V3['openerSize'], V3['emphasisScale'], V3['outline'], V3['y'], V3['yHigh']), (128, 150, 120, 9, 1250, 560))
        self.assertEqual(json.load(open(os.path.join(ROOT, 'captions/pop-shorts-v2.json')))['size'], 96, 'v2 untouched')

    def test_two_words_when_one_is_long(self):
        out = [c['words'] for c in self.ch({'lines': [seq('the whole town plays hot potato every single midnight')]})]
        self.assertEqual(out, [['the', 'whole', 'town'], ['plays', 'hot', 'potato'], ['every', 'single'], ['midnight']])
        for c in self.ch({'lines': [seq('everybody steals eggs and nobody remembers anything at all')]}):
            cap = 2 if any(C.letters(w) >= 7 for w in c['words']) else 3
            self.assertLessEqual(len(c['words']), cap, c['words'])

    def test_cap_function_and_v2_default(self):
        self.assertEqual(C.chunk_cap(['for', 'sixty']), 3); self.assertEqual(C.chunk_cap(['for', 'seconds'], 3, 2), 2)
        self.assertEqual(C.chunk_cap(["there's", 'a'], 3, 2), 3, 'apostrophes are not letters: there\'s has 6')
        self.assertEqual(C.chunk_cap(['scoreboard'], 3, 2), 2)
        v2 = [c['words'] for c in C.chunk({'lines': [seq('the whole town plays hot potato every single midnight')]})]
        self.assertEqual(v2, [['the', 'whole', 'town'], ['plays', 'hot', 'potato'], ['every', 'single', 'midnight']], 'v2 chunking unchanged')

    def test_every_word_once_on_egg(self):
        cues = json.load(open(os.path.join(ROOT, 'stories/egg/cues.json')))
        ch = self.ch(cues); self.assertEqual(sum(len(c['words']) for c in ch), sum(len(l['words']) for l in cues['lines']))
        self.assertTrue(all(len(c['words']) <= (2 if any(C.letters(w) >= 7 for w in c['words']) else 3) for c in ch))

    def test_width_fit(self):
        self.assertEqual(C.fit_size(['In', 'this', 'town'], 150, V3), 150)
        s = C.fit_size(['remembered', 'everything'], 128, V3); self.assertLess(s, 128)
        self.assertLessEqual(C.text_width('remembered everything', s, V3['fontFile']), V3['fitWidth'] + 1)


class SheetStats(unittest.TestCase):
    def test_largest_change_in_twist_or_money_shot(self):
        import sheet as S
        shots = [{'id': 'S1', 'start': 0, 'frames': 30}, {'id': 'TW', 'start': 30, 'frames': 30}, {'id': 'S3', 'start': 60, 'frames': 30}]
        self.assertEqual(S.biggest_change_check([(0, 0), (30, 40.0), (60, 12.0)], shots, ['TW']), (True, 30, 'TW'))
        self.assertEqual(S.biggest_change_check([(0, 0), (30, 4.0), (60, 12.0)], shots, ['TW'])[0], False)


if __name__ == '__main__':
    unittest.main()
