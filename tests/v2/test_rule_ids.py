import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from rule_ids import card_ids, used_ids, check

CARD = '| ID | Rule |\n|---|---|\n| R-HOOK-01 | a |\n| N-VO-01 | b |\n'


class RuleIds(unittest.TestCase):
    def test_card_and_uses(self):
        self.assertEqual(card_ids(CARD), ['R-HOOK-01', 'N-VO-01'])
        self.assertEqual(used_ids('see R-HOOK-01 and R-STORY-* and N-VO-01.'), {'R-HOOK-01', 'N-VO-01'})

    def test_clean(self):
        errs, stats = check(CARD, {'a.md': 'R-HOOK-01'}, {'x.md': 'R-HOOK-01 N-VO-01'})
        self.assertEqual(errs, []); self.assertEqual(stats['ids'], 2)

    def test_errors(self):
        errs, _ = check(CARD + '| R-HOOK-01 | dup |\n| R-CAM-1 | bad |\n', {'a.md': 'R-MID-09'}, {'x.md': 'R-HOOK-01'})
        joined = '\n'.join(errs)
        for want in ('duplicate ID R-HOOK-01', 'malformed ID R-CAM-1', 'uses undefined ID R-MID-09', 'N-VO-01: defined in the card but explained'):
            self.assertIn(want, joined)

    def test_card_length(self):
        errs, _ = check(CARD + '\n' * 130, {}, {'x.md': 'R-HOOK-01 N-VO-01'})
        self.assertTrue(any('lines (> 120)' in e for e in errs))


if __name__ == '__main__':
    unittest.main()
