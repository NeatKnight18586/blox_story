"""Synthetic timelines for tools/qa_episode.py tests. clean() passes every checkable rule; broken() fails ≥ 5 on purpose.
python3 tests/v2/qa_fixtures.py writes broken() to tests/v2/fixtures/qa/broken/ (committed for the CLI demo)."""
import json
from pathlib import Path


def cues_from(sentences, t0=0.1, step=0.36, pause=0.3, gaps=None):
    """Words every `step` s; `pause` after each sentence; gaps {sentence index: extra pause after it}."""
    lines, t = [], t0
    for i, s in enumerate(sentences):
        ws = []
        for w in s.split():
            ws.append({'w': w.strip('.,!?'), 'start': round(t, 3), 'end': round(t + step - .02, 3)}); t += step
        lines.append({'line': i + 1, 'text': s, 'start': ws[0]['start'], 'end': ws[-1]['end'], 'words': ws})
        t += pause + (gaps or {}).get(i, 0)
    return {'story': 'fixture', 'duration': round(t, 3), 'method': 'synthetic', 'lines': lines}


HOOK = ['In this town, every lantern holds one memory.', 'Tonight, one lantern is empty.']
BODY = ['Weddings take two lanterns and a long breath.', 'Liars carry lanterns that flicker blue.', 'The baker keeps forty on one shelf.',
        'His little sister keeps only one.', 'It glows the colour of their mother.', 'Twelve lanterns still burn on the tower.']


def clean():
    sents = HOOK + BODY * 7 + ['The town forgot nothing that night.', 'In this town, every lantern holds one memory.']
    cues = cues_from(sents, step=0.34)
    words = [w for l in cues['lines'] for w in l['words']]
    last = words[-1]['end']; end = round(last + .2, 3)
    starts = [w['start'] for w in words]
    shots, t, i, sizes = [], 0.0, 0, ['medium', 'wide', 'close', 'insert']
    while t < end - 1.0:
        k = min(range(len(starts)), key=lambda j: abs(starts[j] - (t + 1.8))) if shots else 0
        at = 0.0 if not shots else starts[k]
        if shots and at <= shots[-1]['at'] + .5: break
        shots.append({'id': f'S{len(shots) + 1:02d}', 'at': at, 'move': 'push', 'size': sizes[len(shots) % 4], 'see': [], 'to': {'fov': 40}}); t = at
    shots[0].update(openHit=True, reveal=True, see=['hero', 'lantern_hook'])
    # every VO gap gets a camera event (an impact) so R-LEAK-01 holds wherever a sentence pause falls mid-shot
    gp = [(a['end'], b['start']) for a, b in zip(words, words[1:]) if b['start'] - a['end'] > .4]
    for a, b in gp:
        sh = max((s for s in shots if s['at'] <= a), key=lambda s: s['at']); sh.setdefault('impact', round((a + b) / 2 - sh['at'], 3))
    rev = round(end * .65, 2)
    ri = max(i for i, s in enumerate(shots) if s['at'] <= rev)
    for j in (0, ri, len(shots) - 1): shots[j]['hero'] = True
    for s in shots:
        if 30 < s['at'] < rev and len([x for x in shots if 'tower' in x['see']]) < 4: s['see'] = s['see'] + ['tower']
    ep = {'slug': 'fixture', 'fps': 24, 'format': 6, 'end': end, 'labels': False, 'sfx': False, 'captionStyle': 'pop-shorts-v6',
          'signature': {'prop': 'lantern_hook'}, 'cast': {'hero': {'style': 'v5', 'preset': 'HERO'}}, 'effects': [], 'shots': shots}
    spec = {'hook_rule': HOOK[0], 'hook_break': HOOK[1], 'roblox_context_starts_at_s': 8, 'reversal_at_s': rev,
            'counter': {'type': 'lanterns', 'start': 12, 'end': 0, 'object': 'tower'},
            'signage': ['DAY 19', 'NEVER BLOW', '12 LEFT'],
            'beats': [{'at_s': l['start'], 'type': 'info'} for l in cues['lines']]}
    return ep, cues, '\n'.join(sents) + '\n', spec


def broken():
    sents = ['Hello guys, welcome back to my channel.', 'I want to tell you about my town.', 'Everyone sleeps at nine.',
             'We never wake up.', 'Thanks for watching and subscribe for part 2.']
    cues = cues_from(sents, t0=0.6, gaps={1: 1.2})
    words = [w for l in cues['lines'] for w in l['words']]
    end = round(words[-1]['end'] + 2.0, 3)
    shots = [{'id': 'B01', 'at': 0.0, 'move': 'static-drift', 'size': 'wide', 'see': []},
             {'id': 'B02', 'at': 4.0, 'move': 'push', 'size': 'wide', 'see': [], 'from': {'position': [0, 1, 5], 'target': [0, 1, 0], 'fov': 50},
              'to': {'position': [0, 1, 5], 'target': [0, 1, 0], 'fov': 50}},
             {'id': 'B03', 'at': 9.0, 'move': 'orbit', 'size': 'wide', 'see': []}, {'id': 'B04', 'at': 9.9, 'move': 'push', 'size': 'wide', 'see': [], 'openHit': True}]
    ep = {'slug': 'broken', 'fps': 24, 'format': 6, 'end': end, 'captionStyle': 'pop-shorts-v5',
          'cast': {'hero': {'style': 'v2', 'faceStyle': 'v3', 'tags': [[0, 'HERO', 'baker']]}},
          'effects': [{'type': 'shake', 'at': 5.0}, {'type': 'fadeColor', 'at': end - 1.0}], 'shots': shots}
    return ep, cues, '\n'.join(sents) + '\n', None


if __name__ == '__main__':
    ep, cues, script, _ = broken()
    d = Path(__file__).resolve().parent / 'fixtures/qa/broken'; d.mkdir(parents=True, exist_ok=True)
    (d / 'episode.json').write_text(json.dumps(ep, indent=1)); (d / 'cues.json').write_text(json.dumps(cues, indent=1))
    (d / 'script.txt').write_text(script); print('wrote', d)
