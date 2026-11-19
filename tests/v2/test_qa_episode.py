import copy, sys, tempfile, unittest
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'tools')); sys.path.insert(0, str(HERE))
from qa_episode import check, apply_allow, logged_allows, runtime_of, locked, gaps, cue_words, loop_score, sign_legibility  # noqa: E402
from qa_fixtures import clean, broken  # noqa: E402


def st(res):
    return {r['id']: r['status'] for r in res}


class QA(unittest.TestCase):
    def setUp(self):
        self.ep, self.cues, self.script, self.spec = clean()

    def run_(self, ep=None, cues=None, script=None, spec='same'):
        return st(check(ep or self.ep, cues or self.cues, self.script if script is None else script, self.spec if spec == 'same' else spec))

    def test_clean_has_no_fail(self):
        s = self.run_()
        self.assertNotIn('FAIL', s.values(), s)
        self.assertEqual(sorted(k for k, v in s.items() if v == 'SKIP'), ['R-CAP-01', 'R-CAP-02', 'R-LOOP-01'])

    def test_broken_fails_at_least_five(self):
        ep, cues, script, spec = broken()
        s = st(check(ep, cues, script, spec))
        fails = [k for k, v in s.items() if v == 'FAIL']
        self.assertGreaterEqual(len(fails), 5)
        for rid in ('R-BRAND-01', 'N-VO-03', 'R-HOOK-03', 'R-HOOK-04', 'R-JOLT-01', 'R-CAM-01', 'R-LEAK-01', 'R-END-01', 'R-END-02', 'R-LABEL-01', 'N-FACE-01'):
            self.assertEqual(s[rid], 'FAIL', rid)

    def test_end_tail(self):
        ep = copy.deepcopy(self.ep); ep['end'] += .5
        self.assertEqual(self.run_(ep)['R-END-01'], 'FAIL')
        ep['end'] -= 1.0   # ends before the last word
        self.assertEqual(self.run_(ep)['R-END-01'], 'FAIL')

    def test_dead_air(self):
        cues, ep = copy.deepcopy(self.cues), copy.deepcopy(self.ep)
        t0 = cues['lines'][3]['words'][0]['start']                       # open a 0.6 s pause before line 4
        for l in cues['lines'][3:]:
            for w in l['words']: w['start'] += .6; w['end'] += .6
        a = cues['lines'][2]['words'][-1]['end']; b = a + (t0 - a) + .6
        self.assertEqual(len([g for g in gaps(cue_words(cues)) if g[0] == a]), 1)
        ep['end'] += .6
        for sh in ep['shots']:
            if sh['at'] > a + 1e-9: sh['at'] = round(sh['at'] + .6, 3)
            sh.pop('impact', None)
        inside = [sh for sh in ep['shots'] if a <= sh['at'] <= b]
        for sh in inside: sh['at'] = round(b + .01, 3)                    # no cut inside the pause either
        self.assertEqual(st(check(ep, cues, self.script, self.spec))['R-LEAK-01'], 'FAIL')
        host = max((sh for sh in ep['shots'] if sh['at'] <= a), key=lambda sh: sh['at'])
        host['impact'] = round((a + b) / 2 - host['at'], 3)                # a camera event inside the pause fixes it
        self.assertEqual(st(check(ep, cues, self.script, self.spec))['R-LEAK-01'], 'PASS')

    def test_alternation_and_lock(self):
        ep = copy.deepcopy(self.ep)
        for s in ep['shots'][:8]: s['size'] = 'wide'
        self.assertEqual(self.run_(ep)['R-CAM-02'], 'FAIL')
        self.assertFalse(locked({'move': 'topDown', 'static': True, 'degrees': 25}))
        self.assertTrue(locked({'move': 'topDown', 'degrees': 0}))
        self.assertTrue(locked({'move': 'push', 'from': {'fov': 40}, 'to': {'fov': 40}}))

    def test_jolt(self):
        ep = copy.deepcopy(self.ep); ep['shots'][5]['openHit'] = True
        self.assertEqual(self.run_(ep)['R-JOLT-01'], 'FAIL')
        ep = copy.deepcopy(self.ep); ep['effects'] = [{'type': 'shake', 'at': 30}]
        self.assertEqual(self.run_(ep)['R-JOLT-01'], 'FAIL')

    def test_spec_rules(self):
        sp = dict(self.spec, reversal_at_s=self.ep['end'] * .4)
        self.assertEqual(self.run_(spec=sp)['R-MID-03'], 'FAIL')
        sp = dict(self.spec, roblox_context_starts_at_s=2)
        self.assertEqual(self.run_(spec=sp)['R-HOOK-02'], 'FAIL')
        s = self.run_(spec=None)
        for rid in ('R-HOOK-02', 'R-MID-02', 'R-MID-03'): self.assertEqual(s[rid], 'SKIP', rid)
        self.assertEqual(s['R-SIGN-01'], 'PASS')   # placed signs are measured without a spec

    def test_runtime_model(self):
        self.assertEqual(runtime_of({'format': 6, 'end': 100}, {'duration': 99}), 100)
        self.assertAlmostEqual(runtime_of({'format': 5, 'end': 80}, {'duration': 80}), 80.85)

    def test_loop_and_signs(self):
        a = {'from': {'position': [0, 2, 10], 'target': [0, 2, 0], 'fov': 50}}
        self.assertEqual(loop_score(a, {'from': {'position': [9, 9, 9], 'target': [0, 0, 0], 'fov': 30}, 'to': {'position': [0, 2.5, 10], 'target': [0, 2, 0], 'fov': 52}}),
                         {'pos': .05, 'target': 0.0, 'fov': 2.0})
        ep = copy.deepcopy(self.ep)
        ep['shots'][0]['from'] = a['from']; ep['shots'][-1]['from'] = {'position': [40, 2, 0], 'target': [30, 2, 0], 'fov': 20}
        self.assertEqual(self.run_(ep)['R-LOOP-01'], 'FAIL')
        ep['shots'][-1]['to'] = dict(a['from']); self.assertEqual(self.run_(ep)['R-LOOP-01'], 'PASS')
        cam = {'from': {'position': [0, 2, 10], 'target': [0, 2, 0], 'fov': 54}, 'see': ['day19']}
        g = [{'id': 'day19', 'text': 'DAY 19', 'at': [0, 2, 0], 'capH': .3}]   # frame height at 10 = 10.19 → 2.9 % < 3 %
        self.assertEqual(sign_legibility(g, [cam], [2.0]), {'day19': 0.0})
        g[0]['capH'] = .35; self.assertEqual(sign_legibility(g, [cam], [2.0]), {'day19': 2.0})

    def test_allow(self):
        res = check(*broken())
        apply_allow(res, {'R-END-01', 'N-VO-03', 'R-LOOP-01'})
        s = st(res)
        self.assertEqual(s['R-END-01'], 'ALLOWED'); self.assertEqual(s['R-LOOP-01'], 'ALLOWED'); self.assertEqual(s['N-VO-03'], 'FAIL')
        with tempfile.NamedTemporaryFile('w', delete=False) as f: f.write('2026 qa_episode --allow R-LEN-01 (FAIL: x) | reason: y\n')
        self.assertEqual(logged_allows(f.name), {'R-LEN-01'})


if __name__ == '__main__':
    unittest.main()
