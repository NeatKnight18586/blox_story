"""npm run v2:test (python part) — Phase 1F meme-gap audio: plan, shifts, no overlap, VO intact, clip −3 dB."""
import os, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'v2'))
import memegap as G  # noqa: E402

CUES = {'duration': 3.0, 'lines': [{'line': 1, 'start': 0.1, 'end': 2.6, 'words': [
    {'w': 'Welcome', 'start': 0.1, 'end': 0.5}, {'w': 'to', 'start': 0.6, 'end': 0.7}, {'w': 'Heights,', 'start': 0.8, 'end': 1.2},
    {'w': 'the', 'start': 1.4, 'end': 1.5}, {'w': 'heights', 'start': 1.6, 'end': 2.0}, {'w': 'ring', 'start': 2.2, 'end': 2.6}]}]}
GAPS = [{'afterWord': 'Heights', 'nth': 2, 'clip': 'b', 'pad': 0.2}, {'afterWord': 'Heights', 'nth': 1, 'clip': 'a', 'pad': 0.15}]
LEN = {'a': 0.85, 'b': 0.5}


class Plan(unittest.TestCase):
    def plan(self): return G.plan_gaps(CUES, GAPS, LEN.get)

    def test_word_lookup_nth_and_punctuation(self):
        i, w, nx = G.find_word(CUES, 'heights', 2); self.assertEqual((i, w['start'], nx['w']), (4, 1.6, 'ring'))
        with self.assertRaises(ValueError): G.find_word(CUES, 'Heights', 3)

    def test_cut_in_the_pause_sorted_and_durations(self):
        p = self.plan(); self.assertEqual([x['clip'] for x in p], ['a', 'b'])
        self.assertTrue(1.2 + G.FADE <= p[0]['cut'] <= 1.4 - G.FADE); self.assertEqual(p[0]['dur'], 1.0); self.assertEqual(p[1]['dur'], 0.7)
        self.assertAlmostEqual(p[1]['newCut'], p[1]['cut'] + 1.0, 4); self.assertAlmostEqual(p[0]['clipAt'], p[0]['cut'] + 0.075, 4)

    def test_shift_cues_and_spec(self):
        p = self.plan(); c = G.shift_cues(CUES, p); ws = G.words_of(c)
        self.assertEqual([w['start'] for w in ws], [0.1, 0.6, 0.8, 2.4, 2.6, 3.9]); self.assertAlmostEqual(c['duration'], 4.7, 4)
        s = G.shift_spec({'end': 3.5, 'shots': [{'at': 0, 'cue': [0, 1.25]}, {'at': 1.3, 'cue': [1.3, 2.1], 'actions': [{'at': {'word': 'ring', 'nth': 1}}, {'at': 1.6}]}],
                          'clock': [{'at': 2.2, 'fx': 'dong'}, {'at': {'word': 'ring'}, 'fx': 'pop'}]}, p)
        self.assertEqual(s['shots'][0]['cue'], [0, 1.25]); self.assertEqual(s['shots'][1]['at'], 2.3); self.assertEqual(s['shots'][1]['cue'], [2.3, 3.8])
        self.assertEqual(s['shots'][1]['actions'][0]['at'], {'word': 'ring', 'nth': 1}); self.assertEqual(s['shots'][1]['actions'][1]['at'], 2.6)
        self.assertEqual(s['clock'][0]['at'], 3.9); self.assertAlmostEqual(s['end'], 5.2, 4)

    def test_no_word_inside_a_clip_window(self):
        p = self.plan(); self.assertEqual(G.overlap_report(p, G.shift_cues(CUES, p))['wordOverlaps'], 0)


class Audio(unittest.TestCase):
    def test_fixture_vo_intact_no_overlap_clip_minus_3db(self):
        r = G.fixture(tempfile.mkdtemp())
        self.assertTrue(r['pass']); self.assertEqual(r['voWordMaxDiff'], 0.0); self.assertEqual(r['sampleOverlaps'], 0); self.assertAlmostEqual(r['clipBelowVoDb'], -3.0, delta=0.5)
        self.assertAlmostEqual(r['durationAfter'] - r['durationBefore'], sum(g['dur'] for g in r['gaps']), delta=0.002)


if __name__ == '__main__':
    unittest.main()
