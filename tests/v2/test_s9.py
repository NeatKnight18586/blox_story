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
    def test_style_numbers(self):
        self.assertEqual((V3['size'], V3['openerSize'], V3['emphasisScale'], V3['outline'], V3['y'], V3['yHigh'], V3['maxWidthFrac']), (111, 130, 120, 9, 1250, 560, .86))
        self.assertEqual(json.load(open(os.path.join(ROOT, 'captions/pop-shorts-v2.json')))['size'], 96, 'v2 untouched')

    def test_v2_chunking_unchanged(self):
        v2 = [c['words'] for c in C.chunk({'lines': [seq('the whole town plays hot potato every single midnight')]})]
        self.assertEqual(v2, [['the', 'whole', 'town'], ['plays', 'hot', 'potato'], ['every', 'single', 'midnight']])
        self.assertEqual(C.make_chunks({'lines': [seq('a b c d')]}, json.load(open(os.path.join(ROOT, 'captions/pop-shorts-v2.json'))))[0]['words'], ['a', 'b', 'c'])

    def test_rendered_width_matches_libass(self):
        # measured: libass draws "There's a scoreboard" at \fs111 with a fill 851 px and ink (outline + shadow) 873 px wide
        w = C.rendered_width(["There's", 'a', 'scoreboard'], 111, V3); self.assertTrue(851 <= w <= 885, w)
        self.assertTrue(C.fits(["There's", 'a', 'scoreboard'], 111, V3)); self.assertFalse(C.fits(['everybody', 'steals', 'eggs'], 111, V3), 'too wide at 111')
        self.assertFalse(C.fits(['a', 'b', 'c', 'd'], 111, V3), 'never 4 words')
        self.assertTrue(C.rendered_width(['steals'], 111, V3, (0, 1)) > C.rendered_width(['steals'], 111, V3), 'emphasis at 120 %')


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

    def test_the_four_existing_scripts_fail_only_on_v6_length(self):
        # written for format v3 (410–440 words): under FORMAT_V6 (300–400) the word count is their only failure
        for slug in ('egg', 'ragdoll', 'mountain', 'mirror'):
            r = self.run_one(slug); self.assertEqual(len(r['failures']), 1, f"{slug}: {r['failures']}")
            self.assertRegex(r['failures'][0], r'^4\d\d words \(> 400; target 300–400\)$'); self.assertGreaterEqual(r['numbers']['keyNouns'], 10, slug)

    def test_each_rule_fails_when_broken(self):
        def cut(t):   # the egg script cut to its first 380–400 words, whole lines (scriptcheck's own word count)
            out = []
            for l in t.splitlines():
                if len(self.SC.tokens('\n'.join(out + [l]))) > 400: break
                out.append(l)
            return '\n'.join(out) + '\n'
        f = lambda m: self.run_one('egg', lambda t: m(cut(t)))['failures']
        self.assertFalse(any(re.match(r'\d+ words \(', x) for x in f(lambda t: t)))
        self.assertTrue(any('words (> 400' in x for x in f(lambda t: t + ' extra' * 10)))
        short = self.run_one('egg', lambda t: ' '.join(self.SC.tokens(cut(t))[:290]) + '.')   # Decision 1: < 300 warns, does not fail
        self.assertFalse(any(re.match(r'\d+ words \(', x) for x in short['failures'])); self.assertEqual(short['warnings'], ['290 words (< 300; target 300–400, never padded)'])
        self.assertTrue(any('sentence of 14 words' in x for x in f(lambda t: t.replace('Kit held on.', 'Kit held on to the egg with both hands and did not let go.'))))
        self.assertTrue(any("first line has" in x for x in f(lambda t: t.replace('In this town, everybody steals eggs.', 'In this town, everybody steals all the shiny eggs every day.', 1))))
        self.assertTrue(any("repeats the first line" in x for x in f(lambda t: t + '\nIn this town, everybody steals eggs.')))
        self.assertTrue(any("repeats the first line" in x for x in f(lambda t: t + '\nIn this town, everybody still steals eggs!')))
        self.assertFalse(any("repeats the first line" in x for x in f(lambda t: t + '\nAnd at midnight, everybody holds on.')))
        self.assertFalse(any('first-person' in x for x in f(lambda t: t.replace('Kit held on.', 'I held on. We held on. My egg. Our egg. Me too. Us too. I said so.'))))
        self.assertTrue(any('key nouns missing: scoreboard' in x for x in f(lambda t: t.replace('scoreboard', 'board'))))
        self.assertTrue(any('Flesch' in x for x in f(lambda t: t.replace('.\n', ', and ').replace('. ', ', and '))))
        self.assertGreater(self.SC.fk_grade('Unquestionably, extraordinary institutional responsibilities overwhelmed the committee.'), 6)

    def test_helpers(self):
        self.assertTrue(self.SC.repeats_first('Whatever you hold at eight, you keep.', 'whatever you hold at eight you keep'))
        self.assertFalse(self.SC.repeats_first('Once a year, every kid in town gets locked in the Toy House.', "Whoever you're holding at eight, you keep forever."))   # Toy House
        self.assertAlmostEqual(self.SC.overlap('a b c d e', 'a b c x y'), .6); self.assertTrue(self.SC.repeats_first('a b c d e', 'a b c x y'))
        self.assertFalse(self.SC.repeats_first('a b c d e', 'a b x y z'))
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
        self.assertIn(st['step'], self.SS.STEPS); self.assertEqual(st['slug'], dict(self.cards)[st['episode']], 'state names a real card')
        self.assertTrue(any('init (Session 9): episode 1 egg, step voice' in l for l in st['log']), 'initialised at episode 1 egg, step voice')
        self.assertEqual(self.SS.parse(self.SS.fmt(st)), st, 'format round-trips')

    def test_paused(self):
        r = self.SS.transition({'episode': 2, 'slug': 'ragdoll', 'step': 'voice', 'paused': True}, 'approve', voice=True, script=True, beats=True, cards_list=self.cards)
        self.assertEqual(r['actions'], []); self.assertIn('paused', r['stop'])
        st = self.SS.parse(open(os.path.join(ROOT, 'docs/season1/STATE.md')).read()); self.assertTrue(st.get('paused'))

    def test_published_ready_moves_on(self):
        r = self.t(1, 'egg', 'published-ready'); self.assertEqual(r['state'], {'episode': 2, 'slug': 'ragdoll', 'step': 'voice'}); self.assertEqual(r['actions'], [], 'v4 D1: no script writing')

    def test_voice_step(self):
        r = self.t(1, 'egg', 'voice', voice=False); self.assertEqual(r['actions'], []); self.assertIn('voice', r['stop']); self.assertEqual(r['state']['step'], 'voice')
        r = self.t(1, 'egg', 'voice', voice=True, script=True); self.assertEqual(r['actions'], [], 'v4: waits for the beats prompt too'); self.assertIn('beats prompt', r['stop']); self.assertIn('never writes', r['stop'])
        r = self.t(1, 'egg', 'voice', voice=True, script=True, beats=True); self.assertEqual(r['actions'], ['E1']); self.assertEqual(r['state']['step'], 'review')
        self.assertEqual(self.t(1, 'egg', 'voice', 'approve', voice=True)['actions'], [], 'approve before an animatic does nothing')

    def test_review_approve_notes_and_next_card(self):
        self.assertEqual(self.t(1, 'egg', 'review')['actions'], [], 'review waits for the owner')
        r = self.t(1, 'egg', 'review', 'approve'); self.assertEqual(r['state'], {'episode': 2, 'slug': 'ragdoll', 'step': 'voice'})
        self.assertEqual(r['actions'], ['E2'], 'v4 D1: no script planned, printed or written'); self.assertIn("owner's script.txt", r['stop'])
        r = self.t(2, 'ragdoll', 'review', 'notes'); self.assertEqual(r['actions'], ['revise', 'E2']); self.assertEqual(r['state']['slug'], 'eight')
        BAN = ('write-script', 'write-beats', 'scriptcheck', 'print-script', 'print-existing-script', 'originality-check')
        for n, slug in self.cards: 
            for st in ('voice', 'review', 'published-ready', 'final'):
                for cmd in (None, 'approve', 'notes', 'swap'): self.assertFalse(set(self.t(n, slug, st, cmd, voice=True, script=True, beats=True, finals_done=n - 1)['actions']) & set(BAN), f'{slug} {st} {cmd}')

    def test_compilation_every_fifth_final_and_swap(self):
        self.assertIn('compilation-1', self.t(5, 'oneword', 'review', 'approve', finals_done=4)['actions'])
        self.assertNotIn('compilation-1', ' '.join(self.t(4, 'duel', 'review', 'approve', finals_done=3)['actions']))
        self.assertIn('compilation-2', self.t(10, 'levelone', 'review', 'approve', finals_done=9)['actions'])
        r = self.t(3, 'eight', 'voice', 'swap'); self.assertEqual(r['actions'], ['swap-card', 'log-swap']); self.assertEqual(r['state']['episode'], 3)
        self.assertEqual(self.t(3, 'eight', 'review', 'swap')['actions'], [], 'swap only while step is voice')
        r = self.t(30, 'afk', 'review', 'approve', finals_done=29); self.assertIn('season-complete', r['actions']); self.assertIn('compilation-6', r['actions'])


class OwnerGrouping(unittest.TestCase):
    """Owner caption rules on stories/egg (cues aligned to stories/egg/script.txt): width rule (≤ 86 % at 111 / opener 130)."""
    def setUp(self):
        self.cues = json.load(open(os.path.join(ROOT, 'stories/egg/cues.json'))); self.g = C.group(self.cues, V3)

    def test_every_word_once_sentences_start_captions_and_everything_fits(self):
        self.assertEqual([w for c in self.g for w in c['words']], [t for l in self.cues['lines'] for t, _ in C.display_words(l)])
        script = open(os.path.join(ROOT, 'stories/egg/script.txt')).read()
        n_sent = len([s for l in script.splitlines() if l.strip() for s in re.split(r'(?<=[.!?])\s+', l.strip()) if s])
        self.assertEqual(sum(c['sentenceEnd'] for c in self.g), n_sent, 'every sentence ends a caption (and so the next starts one)')
        for c in self.g:
            self.assertLessEqual(len(c['words']), 3); self.assertLessEqual(C.rendered_width(c['words'], c['size'], V3), .86 * 1080 + 1e-6, c['words'])
        self.assertEqual({c['size'] for c in self.g if c['line'] == 1}, {130}); self.assertEqual({c['size'] for c in self.g if c['line'] != 1}, {111})
        self.assertIn(['for', 'sixty', 'seconds'], [c['words'] for c in self.g], '3 words with a long word when they fit')

    def test_rule_breaks_only_where_no_split_exists_and_noun_phrases_kept(self):
        import itertools
        def valid(parts, n, size):
            for k, g in enumerate(parts):
                if not C.fits(g, size, V3): return False
                if k < len(parts) - 1 and C.norm(g[-1]) in C.NO_END: return False
                if len(g) == 1 and n > 1 and C.letters(g[0]) < 7: return False
            return True
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
                    self.assertFalse(valid(parts, len(ws), sent[0]['size']), f'a valid split exists for {ws}: {parts}')
        self.assertEqual(broken, 7); self.assertEqual(len(C.grouping_issues(self.g, V3)), 9)
        groups = [c['words'] for c in self.g]
        for np in (['There\'s', 'a', 'scoreboard'], ['the', 'town', 'hall'], ['a', 'ski', 'mask'], ['a', 'sorry', 'note']): self.assertIn(np, groups)

    def test_split_prefers_punctuation_and_phrase_boundaries(self):
        ws = 'And at one minute to midnight the whole town plays hot potato'.split()
        punct = [w == 'midnight' for w in ws]; parts = C.split_sentence(ws, lambda g: C.fits(g, 111, V3), punct, [False] * len(ws))
        groups = [ws[a:b] for a, b in parts]
        self.assertTrue(all(C.norm(g[-1]) not in C.NO_END for g in groups[:-1]), groups)
        self.assertIn(['the', 'whole', 'town'], groups); self.assertIn(['minute', 'to', 'midnight'], groups); self.assertFalse(C.np_split(['The', 'clock'], 'struck'), 'a verb does not continue the phrase')
        self.assertTrue(C.np_split(['on', 'the', 'town'], 'hall', True)); self.assertTrue(C.np_split(['In', 'this'], 'town'))

    def test_fixed_sizes(self):
        ass = C.to_ass(C.timing(self.g, .04, .35), V3)
        sizes = sorted({int(x) for x in re.findall(r'\\fs(\d+)\\fsc', ass)}); self.assertEqual(sizes, [111, 130])

if __name__ == '__main__':
    unittest.main()


class Lut4(unittest.TestCase):
    """Format v4 Phase 2 grade LUTs (scripts/v2/lut4.py): pure, fixed numbers per preset."""
    def setUp(self):
        sys.path.insert(0, os.path.join(ROOT, 'scripts/v2')); import lut4; self.L = lut4

    def test_cube_shape_and_direction(self):
        txt = self.L.cube('comedy', 5).splitlines(); self.assertEqual(txt[1], 'LUT_3D_SIZE 5'); self.assertEqual(len(txt), 2 + 125)
        sat = lambda c: max(c) - min(c)
        self.assertGreater(sat(self.L.grade('comedy', (.6, .4, .3))), sat((.6, .4, .3)), 'comedy saturates')
        self.assertLess(sat(self.L.grade('mystery', (.6, .4, .3))), sat((.6, .4, .3)), 'mystery desaturates')
        lo = self.L.grade('mystery', (.1, .1, .1)); self.assertGreater(lo[2], lo[0], 'mystery shadows cool')
        hi = self.L.grade('mystery', (.85, .85, .85)); self.assertGreater(hi[0], hi[2], 'mystery highlights warm')
        self.assertEqual(self.L.cube('mystery', 3), self.L.cube('mystery', 3))
        for p in self.L.PRESETS:
            for c in [(0, 0, 0), (1, 1, 1), (.5, .2, .9)]: self.assertTrue(all(0 <= v <= 1 for v in self.L.grade(p, c)))


class CaptionsV5(unittest.TestCase):
    """Format v5 keywords: *word* marks in script.txt → yellow #FFD542 on that occurrence only."""
    def test_marks_and_slots(self):
        m = C.script_marks("I saw the *egg*. The egg was mine. The *egg* cracked! *Gone*.")
        self.assertEqual(m, [('egg', 0), ('egg', 2), ('gone', 0)])
        timed = [{'words': ['I', 'saw', 'the', 'egg.']}, {'words': ['The', 'egg', 'was', 'mine.']}, {'words': ['The', 'egg', 'cracked!']}, {'words': ['Gone.']}]
        self.assertEqual(C.keyword_slots(timed, m), {(0, 3), (2, 1), (3, 0)})
        st = C.load_style('v5'); self.assertEqual(st['keywordColour'], '&H0042D5FF')
        ass = C.to_ass([{'words': ['the', 'egg'], 'start': 0, 'end': 1, 'line': 0}], st, keywords={(0, 1)})
        self.assertIn('{\\c&H0042D5FF}egg{\\c' + st['primary'] + '}', ass)
        self.assertNotIn('&H0042D5FF}the', ass)

    def test_shot_grades_and_fps(self):
        sys.path.insert(0, os.path.join(ROOT, 'scripts/v2')); import lut4, assemble as A
        for p in ('memory', 'dawn'): self.assertTrue(lut4.cube(p, 3).startswith('TITLE'))
        r, g, b = lut4.grade('memory', (.2, .5, .8)); self.assertGreater(r, b, 'memory is warm sepia')
        g2, _ = A.final_graph((1080, 1920), None, 0, fps=24, outputs=('graded',), shot_luts=[('/x/m.cube', 2.0, 4.0)])
        self.assertIn("lut3d=file='/x/m.cube':enable='between(t,2.0000,3.9999)'", g2)
        g0, _ = A.final_graph((1080, 1920), None, 0, outputs=('graded',)); self.assertNotIn('lut3d', g0, 'older specs: no LUT')


class BeatsIntake(unittest.TestCase):
    """Phase 3b scripts/v2/beats.py: the owner's timestamp list → spec shots (no script, no voice)."""
    def setUp(self):
        sys.path.insert(0, os.path.join(ROOT, 'scripts/v2')); import beats; self.B = beats

    def test_parse(self):
        rows = self.B.parse_list("# c\n0:00 crash zoom street\n0:02.5 top down hall\n1:05  wide hall\n")
        self.assertEqual([r[0] for r in rows], [0, 2.5, 65.0])
        for bad, msg in (("0:01 push hall", 'first beat'), ("0:00 push hall\n0:00 pull hall", 'does not follow'), ("0:00 push hall\nhello", 'no timestamp')):
            with self.assertRaises(ValueError) as e: self.B.parse_list(bad)
            self.assertIn(msg, str(e.exception))

    def test_build(self):
        rows = self.B.parse_list("0:00 crash zoom on the shutter\n0:02 top down hall, lights cascade\n0:04.5 low angle HERO at the counter, impact\n0:07 medium PIP, freeze 8f, on twos\n0:09 split counter | track\n0:11 wide hall memory")
        r = self.B.build(rows, 'toyhouse', 24, end=14)
        s = {x['move']: x for x in r['shots']}; self.assertEqual(sum(x['frames'] for x in r['shots']), 14 * 24)
        self.assertEqual(s['crashZoom']['to'], {'fov': 12}); self.assertTrue(s['crashZoom']['reveal']); self.assertEqual(s['topDown']['anchor'], 'hall'); self.assertTrue(s['topDown']['static'])
        self.assertEqual(s['lowAuthority']['subject'], 'hero'); self.assertEqual(s['lowAuthority']['impact'], round(s['lowAuthority']['frames'] / 24 * .5, 2))
        self.assertEqual(r['shots'][3]['freeze'][1], 8); self.assertEqual(r['shots'][3]['subject'], 'pip')
        self.assertEqual(s['splitScreen']['a'], {'anchor': 'counter'}); self.assertEqual(s['splitScreen']['b'], {'anchor': 'track'}); self.assertNotIn('anchor', s['splitScreen'])
        self.assertEqual(r['shots'][-1]['grade'], 'memory'); self.assertEqual(len(r['effects']), 1); self.assertEqual(len(r['effects'][0]['points']), 24); self.assertEqual(r['effects'][0]['at'], 2.0)
        self.assertEqual(r['shots'][3]['step'], 2); self.assertTrue(any('length 14' in w for w in r['summary']['warnings']), 'a 14 s list is outside 75–90 s')

    def test_errors_and_limits(self):
        with self.assertRaises(ValueError): self.B.build(self.B.parse_list("0:00 push the thing"), 'toyhouse')
        with self.assertRaises(ValueError): self.B.build(self.B.parse_list("0:00 push hall\n0:02 split counter"), 'toyhouse')
        rows = [(i * 1.7, 'push hall', i) for i in range(48)]; r = self.B.build(rows, 'toyhouse', 24, end=82)
        self.assertEqual(r['summary']['warnings'], [], '48 shots in 82 s: inside every limit')
        long = self.B.build(self.B.parse_list("0:00 top down hall\n0:04 push hall"), 'toyhouse', 24, end=80)
        self.assertTrue(any('static shot 4.00' in w for w in long['summary']['warnings']))
