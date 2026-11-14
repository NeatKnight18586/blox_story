"""npm run v2:test (python part) — Session 9 (Amendment A4 D, F, I): caption chunking v3, sfx placement, scriptcheck,
the /season state transitions."""
import json, os, re, sys, unittest
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


class Sfx(unittest.TestCase):
    def setUp(self):
        import sfx; self.S = sfx

    def test_set_is_deterministic_finite_and_short(self):
        import numpy as np
        for n in self.S.NAMES:
            a, b = self.S.synth(n), self.S.synth(n)
            self.assertTrue(np.array_equal(a, b), n); self.assertTrue(np.isfinite(a).all(), n)
            self.assertAlmostEqual(float(np.max(np.abs(a))), 1.0, places=4); self.assertLess(len(a) / self.S.SR, 3, n)
        x = self.S.level(self.S.synth('pop')); act = x[np.abs(x) > .01 * np.max(np.abs(x))]
        rms_db = 20 * np.log10(np.sqrt(np.mean(act ** 2))); self.assertLessEqual(rms_db, -30 + .01); self.assertLessEqual(20 * np.log10(np.max(np.abs(x))), -6 + .01)

    def test_placement_from_shot_data(self):
        shots = [{'id': 'A', 'start': 0, 'frames': 60, 'move': 'drone'}, {'id': 'B', 'start': 60, 'frames': 30, 'move': 'snap'}, {'id': 'C', 'start': 90, 'frames': 6, 'move': 'whip'},
                 {'id': 'D', 'start': 96, 'frames': 300, 'move': 'crane'}, {'id': 'E', 'start': 396, 'frames': 300, 'move': 'heroLow'}]
        spec = {'cast': {'kit': {'tags': [[1.5, 'Kit'], [4.0, None]]}}, 'ui': [{'id': 'clock', 'keys': [[2, '11:59'], [2.5, '11:59'], [3, '12:00'], [4, None]]}],
                'shots': [{'classReveal': {'actor': 'kit', 'cls': 'baker', 'at': 5}}], 'effects': [{'type': 'shake', 'at': 7.25}, {'type': 'flash', 'at': 8}],
                'beats': {'B5': ['D', 'D'], 'B7': ['E', 'E']}, 'sfxCues': [[9, 'bell']]}
        p = self.S.place(spec, shots, 30); got = [(h[0], h[1]) for h in p['hits']]
        self.assertEqual(sorted(got), [(1.5, 'pop'), (2.0, 'pop'), (2.0, 'whoosh'), (3.0, 'pop'), (3.0, 'whoosh'), (3.2, 'rumble'), (5.55, 'pop'), (7.25, 'thud'), (9.0, 'bell'), (12.2, 'riser')])
        riser = next(h for h in p['hits'] if h[1] == 'riser'); self.assertAlmostEqual(riser[3], 1 - 8 / 30, places=6)
        self.assertEqual(p['silence'], [[round(13.2 - 8 / 30, 4), 13.2]])
        tr = self.S.render_track(p, 14); i0, i1 = int((13.2 - 8 / 30) * self.S.SR), int(13.2 * self.S.SR)
        self.assertEqual(float(abs(tr[i0:i1]).max()), 0.0, '8 frames of silence before the reversal'); self.assertGreater(float(abs(tr[int(12.5 * self.S.SR):i0]).max()), 0)

    def test_season1_has_no_tag_or_card_pops(self):
        spec = {'season': 1, 'cast': {'kit': {'tags': [[1.5, 'Kit']]}}, 'shots': [{'classReveal': {'actor': 'kit', 'cls': 'baker', 'at': 5}}],
                'ui': [{'id': 'wrist', 'to': 'kit.rightArm', 'kind': 'stat', 'keys': [[2, '99']]}, {'id': 'board', 'to': 'scoreboard', 'kind': 'plate', 'facing': 'world', 'keys': [[3, 'DAX 200'], [4, 'KIT 1']]}]}
        p = self.S.place(spec, [], 30); self.assertEqual([(h[0], h[1], h[2]) for h in p['hits']], [(3.0, 'pop', 'ui board'), (4.0, 'pop', 'ui board')])
        p2 = self.S.place({**spec, 'season': None}, [], 30); self.assertEqual(len(p2['hits']), 5, 'older specs keep tag, card and UI pops')

    def test_unknown_name_and_off_switch(self):
        with self.assertRaises(ValueError): self.S.place({'sfxCues': [[1, 'kazoo']]}, [], 30)


class AudioGraph(unittest.TestCase):
    def test_voice_music_sfx_and_silence(self):
        import assemble as A
        self.assertEqual(A.audio_graph('X'), '[1:a]X[vo];[vo]anull[a]', 'no music, no sfx: unchanged voice path')
        g = A.audio_graph('X', music=True, sfx=True, silence=[[12.9333, 13.2]])
        self.assertIn("[2:a]volume=-20dB,aresample=48000,volume=enable='between(t,12.9333,13.2000)':volume=0[mu]", g)
        self.assertIn("[3:a]aresample=48000,volume=enable='between(t,12.9333,13.2000)':volume=0[sx]", g)
        self.assertTrue(g.endswith('[vo][mu][sx]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.7943:attack=1:release=40:level=disabled[a]'))
        self.assertIsNone(A.prelimit_db(-16.0, -5.0), 'gain 2 dB fits under −1.5 TP: no limiter')
        self.assertEqual(A.prelimit_db(-17.5, -1.0), -6.0, 'gain 3.5 dB: peaks limited to −1.5 − 3.5 − 1.0 margin')
        self.assertEqual(A.audio_graph('X', sfx=True), '[1:a]X[vo];[2:a]aresample=48000[sx];[vo][sx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.7943:attack=1:release=40:level=disabled[a]')


class AudioCues(unittest.TestCase):
    def test_sections_and_marks_snap_to_word_onsets(self):
        import audiocues as AC
        shots = [{'id': f'S{i}', 'start': i * 300, 'frames': 300, 'beat': i == 2} for i in range(10)]
        spec = {'beats': {f'B{i}': [f'S{i}', f'S{i}'] for i in range(1, 10)}, 'moods': {'B7': 'awe'}}
        spec['beats']['B1'] = ['S0', 'S1']
        cues = {'lines': [{'words': [{'w': 'x', 'start': t, 'end': t + .3} for t in [0, 10.1, 19.95, 30.4, 60.05, 89.9]]}]}
        r = AC.audio_cues(spec, shots, cues, 30)
        self.assertEqual([s['beat'] for s in r['sections']], AC.BEATS); self.assertEqual(r['sections'][0]['start'], 0)
        self.assertEqual(r['sections'][1]['start'], 19.95, 'B2 cut at 20.0 s snaps to the word at 19.95')
        self.assertEqual(r['sections'][5]['start'], 60.05); self.assertEqual(r['sections'][6]['mood'], 'awe')
        labels = dict((l, t) for t, l in r['marks']); self.assertEqual(labels['REVERSAL'], 70.0, 'no word near 70.0: kept'); self.assertEqual(labels['END (picture)'], 100.0)
        self.assertEqual(labels['beat cut S2'], 19.95); self.assertIn('| B6 low point |', AC.to_md('t', r))


class ScriptCheck(unittest.TestCase):
    def setUp(self):
        import scriptcheck as SC; self.SC = SC; self.md = open(os.path.join(ROOT, 'docs/season1/SEASON_1.md')).read()

    def run_one(self, slug, mutate=None):
        txt = open(os.path.join(ROOT, f'stories/{slug}/script.txt')).read()
        return self.SC.check(mutate(txt) if mutate else txt, self.SC.card_for(slug, self.md))

    def test_the_four_existing_scripts_pass(self):
        for slug in ('egg', 'ragdoll', 'mountain', 'mirror'):
            r = self.run_one(slug); self.assertTrue(r['pass'], f"{slug}: {r['failures']}")
            self.assertGreaterEqual(r['numbers']['keyNouns'], 10, slug)

    def test_each_rule_fails_when_broken(self):
        f = lambda m: self.run_one('egg', m)['failures']
        self.assertTrue(any('words (want 410' in x for x in f(lambda t: t + ' extra' * 10)))
        self.assertTrue(any('sentence of 14 words' in x for x in f(lambda t: t.replace('Kit held on.', 'Kit held on to the egg with both hands and did not let go.'))))
        self.assertTrue(any("first line" in x for x in f(lambda t: t.replace('In this town, everybody steals eggs.', 'In this town, everybody steals all the shiny eggs.', 1))))
        self.assertTrue(any("last line" in x for x in f(lambda t: t.rstrip().rsplit('\n', 1)[0] + '\nAnd at midnight, everybody sleeps.')))
        self.assertTrue(any('first-person' in x for x in f(lambda t: t.replace('Kit is number one.', 'I win. We win. My egg. Our egg. Me too. Us too. I said so.'))))
        self.assertTrue(any('key nouns missing: scoreboard' in x for x in f(lambda t: t.replace('scoreboard', 'board'))))
        self.assertTrue(any('Flesch' in x for x in f(lambda t: t.replace('.\n', ', and ').replace('. ', ', and '))))
        self.assertGreater(self.SC.fk_grade('Unquestionably, extraordinary institutional responsibilities overwhelmed the committee.'), 6)

    def test_helpers(self):
        self.assertTrue(self.SC.forms('whispering') & self.SC.forms('whispers')); self.assertTrue(self.SC.forms('snaps') & self.SC.forms('snapped'))
        self.assertTrue(self.SC.forms('bases') & self.SC.forms('base')); self.assertFalse(self.SC.forms('egg') & self.SC.forms('edge'))
        self.assertEqual(self.SC.card_last_line({'Second surprise / last line': 'x / "…every night, one loud boy tells them goodnight."'}), '…every night, one loud boy tells them goodnight.')
        self.assertEqual(self.SC.rule_opening({'Rule': 'In this town, everybody steals eggs. One rule: never hold one at midnight.'}), 'In this town, everybody steals eggs.')


class SeasonState(unittest.TestCase):
    def setUp(self):
        import season_state as SS; self.SS = SS
        self.cards = SS.cards(open(os.path.join(ROOT, 'docs/season1/SEASON_1.md')).read())

    def t(self, ep, slug, step, cmd=None, **kw):
        return self.SS.transition({'episode': ep, 'slug': slug, 'step': step}, cmd, cards_list=self.cards, **kw)

    def test_cards_and_state_file(self):
        self.assertEqual(self.cards[:2], [(1, 'egg'), (2, 'ragdoll')]); self.assertEqual(len(self.cards), 30); self.assertEqual(self.cards[10], (11, 'mountain'))
        st = self.SS.parse(open(os.path.join(ROOT, 'docs/season1/STATE.md')).read())
        self.assertEqual((st['episode'], st['slug'], st['step']), (1, 'egg', 'voice'), 'initial state after Session 9')
        self.assertEqual(self.SS.parse(self.SS.fmt(st)), st, 'format round-trips')

    def test_voice_step(self):
        r = self.t(1, 'egg', 'voice', voice=False); self.assertEqual(r['actions'], []); self.assertIn('voice', r['stop']); self.assertEqual(r['state']['step'], 'voice')
        r = self.t(1, 'egg', 'voice', voice=True); self.assertEqual(r['actions'], ['E1']); self.assertEqual(r['state']['step'], 'review')
        self.assertEqual(self.t(1, 'egg', 'voice', 'approve', voice=True)['actions'], [], 'approve before an animatic does nothing')

    def test_review_approve_notes_and_next_card(self):
        self.assertEqual(self.t(1, 'egg', 'review')['actions'], [], 'review waits for the owner')
        r = self.t(1, 'egg', 'review', 'approve'); self.assertEqual(r['state'], {'episode': 2, 'slug': 'ragdoll', 'step': 'voice'})
        self.assertEqual(r['actions'], ['E2', 'print-existing-script'], 'ragdoll exists: printed, never rewritten')
        r = self.t(2, 'ragdoll', 'review', 'notes'); self.assertEqual(r['actions'][:2], ['revise', 'E2']); self.assertIn('write-script', r['actions']); self.assertEqual(r['state']['slug'], 'eight')
        self.assertEqual(self.t(10, 'levelone', 'review', 'approve')['actions'][-1], 'print-existing-script', 'card 11 mountain exists')

    def test_compilation_every_fifth_final_and_swap(self):
        self.assertIn('compilation-1', self.t(5, 'oneword', 'review', 'approve', finals_done=4)['actions'])
        self.assertNotIn('compilation-1', ' '.join(self.t(4, 'duel', 'review', 'approve', finals_done=3)['actions']))
        self.assertIn('compilation-2', self.t(10, 'levelone', 'review', 'approve', finals_done=9)['actions'])
        r = self.t(3, 'eight', 'voice', 'swap'); self.assertEqual(r['actions'][0], 'swap-card'); self.assertEqual(r['state']['episode'], 3)
        self.assertEqual(self.t(3, 'eight', 'review', 'swap')['actions'], [], 'swap only while step is voice')
        r = self.t(30, 'afk', 'review', 'approve', finals_done=29); self.assertIn('season-complete', r['actions']); self.assertIn('compilation-6', r['actions'])


class OwnerGrouping(unittest.TestCase):
    """Owner caption rules on stories/egg (cues aligned to stories/egg/script.txt)."""
    def setUp(self):
        self.cues = json.load(open(os.path.join(ROOT, 'stories/egg/cues.json'))); self.g = C.group(self.cues, V3)

    def test_every_word_once_and_sentences_start_captions(self):
        self.assertEqual([w for c in self.g for w in c['words']], [t for l in self.cues['lines'] for t, _ in C.display_words(l)])
        script = open(os.path.join(ROOT, 'stories/egg/script.txt')).read()
        n_sent = len([s for l in script.splitlines() if l.strip() for s in re.split(r'(?<=[.!?])\s+', l.strip()) if s])
        self.assertEqual(sum(c['sentenceEnd'] for c in self.g), n_sent, 'every sentence ends a caption (and so the next starts one)')
        self.assertEqual(self.g[0]['words'], ['In', 'this', 'town']); self.assertEqual(self.g[12]['words'], ['Run'], 'a one-word sentence stands alone')

    def test_caps_hold_and_rule_breaks_only_where_no_split_exists(self):
        import itertools
        def ok(ws):
            if len(ws) > C.chunk_cap(ws, 3, 2): return False
            return True
        def valid(parts, n):
            for k, g in enumerate(parts):
                if not ok(g): return False
                if k < len(parts) - 1 and C.norm(g[-1]) in C.NO_END: return False
                if len(g) == 1 and n > 1 and C.letters(g[0]) < 7: return False
            return True
        for c in self.g: self.assertLessEqual(len(c['words']), C.chunk_cap(c['words'], 3, 2), c['words'])
        sents, cur = [], []
        for c in self.g:
            cur.append(c)
            if c['sentenceEnd']: sents.append(cur); cur = []
        broken = 0
        for sent in sents:
            ws = [w for c in sent for w in c['words']]
            if C.grouping_issues(sent, V3):
                broken += 1
                for cuts in itertools.chain.from_iterable(itertools.combinations(range(1, len(ws)), k) for k in range(len(ws))):
                    b = (0, *cuts, len(ws)); parts = [ws[b[i]:b[i + 1]] for i in range(len(b) - 1)]
                    self.assertFalse(valid(parts, len(ws)), f'a valid split exists for {ws}: {parts}')
        self.assertEqual(broken, 16, 'sentences with no valid split under the owner rules (17 captions)')
        self.assertEqual(len(C.grouping_issues(self.g, V3)), 17)

    def test_split_prefers_punctuation_and_never_ends_on_no_end_words(self):
        ws = 'And at one minute to midnight the whole town plays hot potato'.split()
        punct = [w == 'midnight' for w in ws]; parts = C.split_sentence(ws, None, punct, [False] * len(ws), 3, 2, 7)
        groups = [ws[a:b] for a, b in parts]
        self.assertTrue(all(C.norm(g[-1]) not in C.NO_END for g in groups[:-1]), groups)
        self.assertIn(['to', 'midnight'], groups, 'the comma after midnight is a break')

    def test_one_size_per_episode(self):
        ass = C.to_ass(C.timing(self.g, .04, .35), V3)
        sizes = sorted({int(x) for x in re.findall(r'\\fs(\d+)\\fsc', ass)})
        self.assertEqual(len(sizes), 2, f'one opener size + one body size: {sizes}'); self.assertEqual(sizes, [111, 150])


if __name__ == '__main__':
    unittest.main()
