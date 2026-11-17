"""npm run v2:test (python part) — alignment DP and snapping (scripts/v2/align.py), plus the §8.8 reference test."""
import importlib.util, json, os, subprocess, sys, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('align', ROOT / 'scripts/v2/align.py')
A = importlib.util.module_from_spec(spec); spec.loader.exec_module(A)


class Helpers(unittest.TestCase):
    def test_voice_range_by_format(self):
        self.assertEqual(A.voice_range(5), (75, 90)); self.assertEqual(A.voice_range(None), (100, 168)); self.assertEqual(A.voice_range(3), (100, 168))

    def test_normalise_and_script_words(self):
        self.assertEqual(A.normalise("You're,"), 'youre')
        lines = A.script_lines('Hi, "Hey Nobody, need a hand?"\n\nBonk. Right.\n')
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0][1], ['Hi', 'Hey', 'Nobody', 'need', 'a', 'hand'])
        self.assertEqual(lines[1][1], ['Bonk', 'Right'])

    def test_join_tokens_both_markers(self):
        self.assertEqual(A.join_tokens(['▁IN', '▁K', 'ING', 'DOM'], [0, .1, .2, .3]), [('IN', 0.0), ('KINGDOM', .1)])
        self.assertEqual(A.join_tokens([' YOU', 'RE', ' NO', 'B'], [1, 1.1, 1.2, 1.3]), [('YOURE', 1.0), ('NOB', 1.2)])

    def test_nw_survives_recogniser_errors(self):
        script = 'the dragon blinked whimpered and flew away crying'.split()
        hyp = 'the dragon blink whimper and flu away crying extra'.split()
        m = A.nw_align(script, hyp)
        self.assertEqual(m[0], 0); self.assertEqual(m[1], 1); self.assertEqual(m[2], 2); self.assertEqual(m[7], 7)
        self.assertIsNone(m[5])                        # "flew" vs "flu": no match, interpolated later
        self.assertEqual([j for j in m if j is not None], sorted(j for j in m if j is not None))   # order kept

    def test_interpolate(self):
        self.assertEqual(A.interpolate([0, None, 2, None], 4), [0, 1, 2, 3])
        self.assertEqual(A.interpolate([None, 1], 4), [.5, 1])

    def test_snap_first_word_after_silence(self):
        starts = [0, .3, 1.2, 1.4, 2.0]
        st, ends, first = A.snap(starts, [(.7, 1.3)], 3)
        self.assertEqual(st[2], 1.3); self.assertIn(2, first)      # first word at/after silence start snaps to its end
        self.assertEqual(ends[1], .7)                               # word before the silence ends at the silence start
        self.assertEqual(ends[2], 1.4)
        self.assertTrue(all(b > a for a, b in zip(st, st[1:])))
        st2, _, first2 = A.snap(starts, [(.7, 1.6)], 3)             # raw start .4 s away: not snapped
        self.assertEqual(st2[2], 1.2); self.assertEqual(first2, [])

    def test_compare(self):
        ref = {'lines': [{'line': 1, 'start': 0}, {'line': 2, 'start': 3.48}]}
        self.assertEqual(A.compare({'lines': [{'line': 1, 'start': 0}, {'line': 2, 'start': 3.6}]}, ref)[1], [])
        self.assertEqual(A.compare({'lines': [{'line': 1, 'start': 0}, {'line': 2, 'start': 3.7}]}, ref)[1], [(2, .22)])


@unittest.skipUnless((A.CACHE / A.MODEL / 'tokens.txt').exists() and importlib.util.find_spec('sherpa_onnx'), 'ASR model not cached')
class Reference(unittest.TestCase):
    def test_nobody_line_starts_within_015(self):
        r = subprocess.run([sys.executable, str(ROOT / 'scripts/v2/align.py'), '--story', 'nobody', '--ref', str(ROOT / 'stories/nobody/cues.json')],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        rep = json.loads(r.stdout.strip().splitlines()[-1])
        self.assertTrue(rep['pass']); self.assertLessEqual(rep['max_line_start_diff'], .15)


if __name__ == '__main__':
    unittest.main()
