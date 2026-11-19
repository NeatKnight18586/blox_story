import sys, unittest
from pathlib import Path
import numpy as np
R = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(R / 'scripts/v2'), str(R / 'tools')]
import captions as C  # noqa: E402
import sfx as S  # noqa: E402
from caption_samples import color_checks, cap_frac  # noqa: E402
from caption_sync import detect_onsets, frame_errors  # noqa: E402

ST = C.load_style('v6')


def cues(words, text=None):
    ws = [{'w': w, 'start': s, 'end': e} for w, s, e in words]
    return {'lines': [{'line': 1, 'start': ws[0]['start'], 'text': text or ' '.join(w for w, *_ in words), 'words': ws}]}


class V6(unittest.TestCase):
    def test_grouping(self):
        g = C.group6(cues([('Never', 0, .3), ('hold', .4, .6), ('one', .7, .9), ('at', 1.0, 1.1), ('midnight.', 1.2, 1.7)]), ST, 24)
        self.assertEqual([c['words'] for c in g], [['Never'], ['hold'], ['one'], ['at', 'midnight']])   # never "one at"
        self.assertTrue(all(len(c['words']) <= 2 for c in g))

    def test_flash_word_rides_with_next(self):
        g = C.group6(cues([('And', 2.521, 2.541), ("there's", 2.541, 2.8), ('only', 2.9, 3.2)]), ST, 24)
        self.assertEqual(g[0]['words'], ['And', "there's"])

    def test_timing_frame_sync_and_min_frames(self):
        ch = [{'words': ['a'], 'start': .21, 'end': .3, 'onset': .21}, {'words': ['b'], 'start': .25, 'end': .5, 'onset': .25}, {'words': ['c'], 'start': 1.0, 'end': 1.2, 'onset': 1.0}]
        t = C.timing6(ch, 24, .35)
        self.assertEqual(t[0]['start'], 5 / 24)                       # floor(0.21 × 24) = frame 5
        self.assertEqual(t[1]['start'], 7 / 24)                       # frame 6 would show 'a' for 1 frame → frame 7 (+0.94 frame)
        self.assertLessEqual(t[1]['start'] * 24 - .25 * 24, 1)
        self.assertTrue(all((c['end'] - c['start']) * 24 >= 2 - 1e-9 for c in t[:-1]))

    def test_ass_helpers(self):
        self.assertEqual(C.hex_to_ass('#2EE6D0'), '&H00D0E62E')
        self.assertEqual(C.ass_time(5 / 24, floor=True), '0:00:00.20')   # 0.2083 → floor to 20 cs (visible on frame 5)
        self.assertEqual(C.ass_time(5 / 24), '0:00:00.21')

    def test_style_and_colours(self):
        self.assertGreaterEqual(cap_frac(ST), ST['minCap'])
        for name, o in ST['accentOptions'].items(): self.assertTrue(color_checks(o['hex'])['pass'], name)
        self.assertFalse(color_checks('#FFD700')['pass'])               # Volze gold fails the hue rule
        self.assertFalse(color_checks('#FFFFFF')['pass'])               # white is not an accent

    def test_sync_detector(self):
        m = lambda on: np.array([[on]])
        self.assertEqual(detect_onsets([m(0), m(1), m(1), m(0), m(1)]), [1, 4])
        a = np.zeros((4, 4), bool); a[:2] = True; b = np.zeros((4, 4), bool); b[2:] = True
        self.assertEqual(detect_onsets([a, a, b]), [0, 2])
        self.assertEqual(frame_errors([3.84, 10.0], [3, 10]), [-0.8399999999999999, 0.0])


class Sfx6(unittest.TestCase):
    def test_new_sounds(self):
        for n in ('plink', 'knock'):
            x = S.synth(n); self.assertGreater(len(x), 1000); self.assertAlmostEqual(float(np.abs(x).max()), 1.0, places=4)
        self.assertTrue(np.array_equal(S.synth('plink'), S.synth('plink')))   # deterministic

    def test_place6(self):
        spec = {'shots': [{'id': 'A', 'openHit': True, 'move': 'crane'}, {'id': 'B', 'move': 'crashZoom', 'zoomAt': .1, 'intent': 'clue'},
                          {'id': 'C', 'move': 'snap', 'snapAt': .2, 'preset': 'snapZoom'}, {'id': 'D', 'move': 'whip', 'impact': .5},
                          {'id': 'E', 'move': 'crashZoom', 'zoomAt': 0, 'intent': 'info'}]}
        shots = [{'id': k, 'start': f} for k, f in zip('ABCDE', [0, 24, 72, 120, 125])]
        h = S.place6(spec, shots, 24)['hits']
        self.assertEqual([x[1] for x in h], ['thud', 'plink', 'crack', 'whoosh', 'knock'])   # E (0.21 s after D's whoosh) is thinned
        self.assertTrue(all(b[0] - a[0] >= S.MIN_GAP6 for a, b in zip(h, h[1:])))


if __name__ == '__main__':
    unittest.main()
