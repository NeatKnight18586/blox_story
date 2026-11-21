"""P4: assemble.blur_ranges / blur_chain / final_graph(blur=…): whip, snap, crashZoom blur by default (moods specs only), `blur` overrides, no blur = the old graph."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'v2'))
import assemble as A

SPEC = {'moods': True, 'fps': 30, 'end': 12, 'shots': [{'at': 0, 'move': 'push'}, {'at': 3, 'move': 'whip'}, {'at': 4, 'move': 'snap', 'blur': False}, {'at': 6, 'move': 'crashZoom'}, {'at': 8, 'move': 'push', 'blur': True}]}

class Blur(unittest.TestCase):
    def test_ranges(self):
        self.assertEqual(A.blur_ranges(SPEC), [(3, 4), (6, 8), (8, 12)])
    def test_old_specs_never_blur(self):
        self.assertEqual(A.blur_ranges({**SPEC, 'moods': False}), [])
    def test_graph(self):
        g, _ = A.final_graph((1440, 2560), None, 0, blur=[(1, 2)])
        self.assertIn('tmix=frames=2', g); self.assertIn("between(t,1.0000,1.9999)", g)
        self.assertNotIn('tmix', A.final_graph((1440, 2560), None, 0)[0])

if __name__ == '__main__': unittest.main()
