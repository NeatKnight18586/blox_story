#!/usr/bin/env python3
"""npm run v2:capcheck -- --story <slug> [--ass <file.ass>] [--cues <cues.json>] [--spec <episode.json>] [--out <json>]
Caption chunks vs the owner's script.txt: every word present, in order, each chunk starting within 80 ms of its first word's aligned onset on the
(gapped) timeline, no caption on screen during a meme clip. Reads the finished .ass (what the master burns in), so it checks the real output.
Exit 1 on any missing / out-of-order word, onset error > 80 ms or clip overlap. Reports the max onset error and the shortest caption."""
import argparse, json, os, re, sys

TOL = .08

def norm(w): return re.sub(r"[^a-z0-9']", '', w.lower())

def ass_time(t):
    h, m, s = t.split(':'); return int(h) * 3600 + int(m) * 60 + float(s)

def read_ass(path):
    out = []
    for l in open(path, encoding='utf8'):
        if not l.startswith('Dialogue:'): continue
        f = l.split(',', 9); txt = re.sub(r'\{[^}]*\}', '', f[9]).strip().replace('\\N', ' ')
        out.append({'start': ass_time(f[1]), 'end': ass_time(f[2]), 'words': txt.split()})
    return out

def check(chunks, script_words, cue_words, gaps=(), tol=TOL, fps=24):
    """Pure: chunks [{start, end, words}], script words [str], aligned cue words [{w, start, end}], meme-clip windows [(t0, t1)] → report dict."""
    seq = [(norm(w), ci) for ci, c in enumerate(chunks) for w in c['words'] if norm(w)]
    want = [norm(w) for w in script_words if norm(w)]
    missing, order, i = [], [], 0
    got = [w for w, _ in seq]
    # in-order alignment of the script against the captions: a script word not found at the cursor is "missing" (or out of order when it appears later)
    j = 0
    for k, w in enumerate(want):
        if j < len(got) and got[j] == w: j += 1; continue
        if w in got[j:j + 6]: order.append(w); j = got.index(w, j) + 1
        else: missing.append((k, w))
    extra = len(got) - j
    errs, pos = [], 0
    for c in chunks:
        n = len([w for w in c['words'] if norm(w)])
        if pos < len(cue_words): errs.append((abs(c['start'] - cue_words[pos]['start']), c['words'], round(c['start'], 3), cue_words[pos]['start']))
        pos += n
    clip = [{'at': round(c['start'], 3), 'words': c['words'], 'gap': g} for c in chunks for g in gaps if c['start'] < g[1] - 1e-6 and c['end'] > g[0] + 1e-6]
    dur = min((c['end'] - c['start'], c['words']) for c in chunks)
    invisible = [(c['words'], round(c['start'], 3), round(c['end'] - c['start'], 3)) for c in chunks if c['end'] - c['start'] < 1 / fps]   # shorter than one frame: libass shows nothing
    mx = max(errs, key=lambda e: e[0])
    return {'scriptWords': len(want), 'captionWords': len(got), 'chunks': len(chunks), 'twoWordChunks': sum(len(c['words']) > 1 for c in chunks),
            'missing': len(missing), 'missingWords': missing[:10], 'outOfOrder': len(order), 'extraWords': extra,
            'maxOnsetErrMs': round(mx[0] * 1000, 1), 'maxOnsetAt': mx[1:], 'onsetOver80': sum(e[0] > tol + 1e-9 for e in errs),
            'invisible': len(invisible), 'invisibleCaptions': invisible[:10], 'under2Frames': sum(c['end'] - c['start'] < 2 / fps for c in chunks), 'shortestCaptionMs': round(dur[0] * 1000, 1), 'shortestCaption': dur[1], 'duringMemeClip': clip,
            'result': 'PASS' if not (missing or order or extra or clip or invisible or any(e[0] > tol + 1e-9 for e in errs)) else 'FAIL'}

def main():
    a = argparse.ArgumentParser(); a.add_argument('--story', required=True); a.add_argument('--ass'); a.add_argument('--cues'); a.add_argument('--spec'); a.add_argument('--out'); o = a.parse_args()
    D = f'stories/{o.story}'; ass = o.ass or f'{D}/build/captions-v7.ass'
    cues_p = o.cues or (f'{D}/build/cues-gapped.json' if os.path.exists(f'{D}/build/cues-gapped.json') else f'{D}/cues.json')
    cues = json.load(open(cues_p)); words = [w for l in cues['lines'] for w in l['words']]
    gaps = [(g['clipAt'], g['clipAt'] + g['clipLen']) for g in json.load(open(f'{D}/build/memegap.json'))['gaps']] if 'gapped' in cues_p and os.path.exists(f'{D}/build/memegap.json') else []
    fps = (json.load(open(o.spec)).get('fps', 24) if o.spec else 24)
    rep = check(read_ass(ass), open(f'{D}/script.txt', encoding='utf8').read().split(), words, gaps, fps=fps)
    rep.update({'story': o.story, 'ass': ass, 'cues': cues_p, 'memeClips': gaps})
    out = o.out or f'review/{o.story}/capcheck.json'; os.makedirs(os.path.dirname(out), exist_ok=True); json.dump(rep, open(out, 'w'), indent=1)
    print(json.dumps({k: rep[k] for k in ('scriptWords', 'captionWords', 'chunks', 'twoWordChunks', 'missing', 'outOfOrder', 'extraWords', 'maxOnsetErrMs', 'onsetOver80', 'invisible', 'under2Frames', 'shortestCaptionMs', 'duringMemeClip', 'result')}))
    sys.exit(0 if rep['result'] == 'PASS' else 1)

if __name__ == '__main__': main()
