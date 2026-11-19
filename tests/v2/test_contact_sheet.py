import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from contact_sheet import parse_range, shot_frames, grid  # noqa: E402


class Sheet(unittest.TestCase):
    def test_range(self):
        self.assertEqual(parse_range('12-14,3', 20), [3, 12, 13, 14])
        self.assertEqual(parse_range('18-25', 20), [18, 19, 20])
        self.assertEqual(parse_range(None, 3), [1, 2, 3])

    def test_frames(self):
        spec = {'fps': 24, 'end': 6.0, 'shots': [{'id': 'B', 'at': 2.0}, {'id': 'A', 'at': 0}]}
        self.assertEqual(shot_frames(spec), [(1, 'A', 0, 23), (2, 'B', 2.0, 95)])
        self.assertEqual([f for *_, f in shot_frames(spec, 'first')], [0, 48])
        self.assertEqual([f for *_, f in shot_frames(spec, 'last')], [47, 143])

    def test_grid(self):
        self.assertEqual(grid(53, 270), (5, 11))       # 5 × 270 = 1350 ≤ 1600
        self.assertEqual(grid(3, 270), (3, 1))


if __name__ == '__main__':
    unittest.main()
