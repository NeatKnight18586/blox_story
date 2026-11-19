import copy, sys, tempfile, unittest
from pathlib import Path
import yaml
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from validate_spec import validate, apply_allow, log_allow, read_tier, REQUIRED  # noqa: E402
from variety_matrix import variety_flags, render  # noqa: E402

FIX = Path(__file__).resolve().parent / 'fixtures'
GOOD = yaml.safe_load((FIX / 'specs/good.yml').read_text())
VARIETY = [yaml.safe_load(p.read_text()) for p in sorted((FIX / 'variety').glob('EP*/spec.yml'))]


def ids(errs): return [r for r, _ in errs]


def bad(**kw):
    s = copy.deepcopy(GOOD); s.update(kw); return validate(s)


class Spec(unittest.TestCase):
    def test_good_passes(self):
        self.assertEqual(validate(GOOD), [])

    def test_every_required_field(self):
        for f in REQUIRED:
            s = copy.deepcopy(GOOD); del s[f]
            self.assertIn('MISSING', ids(validate(s)), f)

    def test_sources(self):
        self.assertIn('R-STORY-06', ids(bad(sources=[GOOD['sources'][0]])))
        self.assertIn('R-STORY-06', ids(bad(sources=[GOOD['sources'][0], dict(GOOD['sources'][0])])))   # same title twice
        self.assertIn('R-STORY-06', ids(bad(what_was_transformed={'rule': ''})))

    def test_volze(self):
        src = [{'kind': 'volze', 'title': 'a Volze short'}, GOOD['sources'][1]]
        self.assertIn('R-STORY-07', ids(bad(sources=src, what_was_transformed={'other': 'names'})))
        self.assertEqual(bad(sources=src, what_was_transformed={'twist': 'flipped'}), [])

    def test_roblox_before_5s(self):
        self.assertIn('R-HOOK-02', ids(bad(roblox_context_starts_at_s=3)))
        self.assertEqual(bad(roblox_context_starts_at_s=5), [])

    def test_hook_signs_heroes(self):
        self.assertIn('R-STORY-01', ids(bad(hook_break='and then one two three four five six seven eight nine ten eleven twelve')))
        self.assertIn('R-SIGN-01', ids(bad(signage=['ONE', 'TWO'])))
        self.assertIn('R-SIGN-01', ids(bad(signage=['ONE', 'TWO', 'FOUR WORDS ARE TOO'])))
        self.assertIn('R-HERO-01', ids(bad(hero_shots=[{'role': 'frame1'}, {'role': 'final'}])))
        self.assertIn('R-STORY-02', ids(bad(micro_examples=['a', 'b'])))
        self.assertIn('R-STORY-03', ids(bad(counter={'type': 'number', 'start': 3, 'end': 3})))

    def test_length(self):
        self.assertIn('R-LEN-01', ids(bad(target_length_s=90)))
        self.assertIn('R-LEN-03', ids(bad(target_length_s=180)))
        self.assertEqual(validate({**GOOD, 'target_length_s': 150}, tier=(105, 165)), [])

    def test_allow_and_log(self):
        fails, allowed = apply_allow(bad(target_length_s=90, roblox_context_starts_at_s=None), {'R-LEN-01', 'MISSING'})
        self.assertEqual(ids(allowed), ['R-LEN-01']); self.assertEqual(ids(fails), ['MISSING'])
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'EP90' / 'spec.yml'; p.parent.mkdir(); p.write_text('x')
            log_allow(p, allowed, 'owner: short pilot')
            self.assertIn('--allow R-LEN-01', (p.parent / 'qa/allow.log').read_text())

    def test_world_reuse(self):
        other = {**GOOD, 'id': 'EP80', 'episode': 1, 'hook_type': 'ranking', 'payoff_type': 'reveal', 'twist_category': 'identity',
                 'setting_era': 'x', 'counter': {'type': 'days'}}
        self.assertIn('N-WORLD-01', ids(validate(GOOD, [other])))

    def test_tier_file(self):
        with tempfile.NamedTemporaryFile('w', suffix='.md', delete=False) as f: f.write('# x\n\ntier: 105-165\n')
        self.assertEqual(read_tier(f.name), (105, 165))
        self.assertEqual(read_tier('/nonexistent'), (105, 135))


class Variety(unittest.TestCase):
    def test_deliberate_duplicate(self):
        ep94 = VARIETY[-1]
        flags = variety_flags(ep94, VARIETY[:-1])
        self.assertTrue(any("hook_type 'impossible fact' repeats EP93" in f for f in flags))
        self.assertTrue(any("ending_type 'lateral' repeats EP91" in f for f in flags))
        self.assertIn('R-ALGO-04', ids(validate(ep94, VARIETY)))

    def test_clean_and_window(self):
        for i, s in enumerate(VARIETY[:-1]): self.assertEqual(variety_flags(s, VARIETY[:i]), [], s['id'])
        far = {**VARIETY[0], 'id': 'EP95', 'episode': 95}   # EP91 is 4 back once EP92–94 sit between → outside the window
        self.assertFalse(any('EP91' in f for f in variety_flags(far, VARIETY)))

    def test_render(self):
        text, flagged = render(VARIETY)
        self.assertEqual(flagged, 1); self.assertIn('| EP94 (S9E94)', text)


if __name__ == '__main__':
    unittest.main()
