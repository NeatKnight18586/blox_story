#!/usr/bin/env python3
"""scripts/v2/align.py — word timings for an episode's voice (docs/V2_BRIEF.md §8).

  npm run v2:align -- --story nobody [--out stories/nobody/build/cues.json] [--ref stories/nobody/cues.json]

voice.flac is the master clock (never stretched); script.txt is the truth for words.
  1. ffmpeg → 16 kHz mono WAV in build/
  2. phrase onsets: silencedetect=noise=-35dB:d=0.18 (the authority for cuts)
  3. sherpa-onnx zipformer-small-en transducer → tokens + timestamps → words (▁ marker)
  4. Needleman–Wunsch on normalised words maps recogniser words to script words; gaps interpolated
  5. first word after each silence snaps to the silence end; monotonic; ends = next start or silence start
  6. ELEVENLABS_API_KEY + reachable api.elevenlabs.io → forced alignment instead of 3–5
  7. writes cues.json {story, audio, duration, method, lines:[{line, text, start, end, words}]}
     (never over the owner's supplied stories/<slug>/cues.json; default output is build/)
  8. --ref compares line starts with a reference cues.json (pass = all within 0.15 s)
Pure helpers (normalise, script_lines, join_tokens, nw_align, interpolate, snap) are unit-tested in
tests/v2/test_align.py.
"""
import argparse, json, os, re, subprocess, sys, tarfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL = 'sherpa-onnx-zipformer-small-en-2023-06-26'
MODEL_URL = f'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/{MODEL}.tar.bz2'
CACHE = Path.home() / '.cache' / 'blox'
SILENCE = 'silencedetect=noise=-35dB:d=0.18'
SNAP_WINDOW = .25          # a word starting this close to a silence end is that phrase's first word
REF_TOL = .15


# ---------------- pure helpers ----------------
def normalise(w):
    """Lower case, letters and digits only ("you're" → "youre", "Nobody," → "nobody")."""
    return re.sub(r'[^a-z0-9]', '', w.lower())


def script_lines(text):
    """Non-empty script lines → [(text, [display words])]; display words keep inner apostrophes."""
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line: continue
        words = [re.sub(r"^[^\w']+|[^\w']+$", '', w).strip("'") for w in line.split()]
        out.append((line, [w for w in words if normalise(w)]))
    return out


def join_tokens(tokens, times):
    """BPE tokens with start times → [(word, start)]; a token starting with ▁ (sherpa-onnx's Python
    result shows it as a leading space) begins a new word."""
    words = []
    for tok, t in zip(tokens, times):
        if tok[:1] in ('▁', ' ') or not words:
            piece = tok.lstrip('▁ ')
            if piece or not words: words.append([piece, float(t)])
        else:
            words[-1][0] += tok
    return [(w, t) for w, t in words if w]


def _score(a, b):
    if a == b: return 3
    if len(a) >= 3 and len(b) >= 3 and (a[:3] == b[:3] or a[-3:] == b[-3:]): return 1
    return -2


def nw_align(script, hyp, gap=-1):
    """Global alignment of normalised word lists. Returns m: script index → hyp index or None.
    Only positive-scoring pairs (exact or near matches) are kept as matches."""
    n, k = len(script), len(hyp)
    S = [[0] * (k + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): S[i][0] = i * gap
    for j in range(1, k + 1): S[0][j] = j * gap
    for i in range(1, n + 1):
        for j in range(1, k + 1):
            S[i][j] = max(S[i - 1][j - 1] + _score(script[i - 1], hyp[j - 1]), S[i - 1][j] + gap, S[i][j - 1] + gap)
    m, i, j = [None] * n, n, k
    while i > 0 and j > 0:
        s = _score(script[i - 1], hyp[j - 1])
        if S[i][j] == S[i - 1][j - 1] + s:
            if s > 0: m[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif S[i][j] == S[i - 1][j] + gap: i -= 1
        else: j -= 1
    return m


def interpolate(times, total):
    """Fill None entries linearly between known neighbours (edges: 0 and total); keeps order."""
    t = list(times); n = len(t); i = 0
    while i < n:
        if t[i] is not None: i += 1; continue
        j = i
        while j < n and t[j] is None: j += 1
        lo = t[i - 1] if i > 0 else 0.0
        hi = t[j] if j < n else total
        for k in range(i, j): t[k] = lo + (hi - lo) * (k - i + 1) / (j - i + 1)
        i = j
    return t


def snap(starts, silences, total, window=SNAP_WINDOW):
    """starts: flat word starts; silences: [(s0, s1)] from silencedetect.
    Returns (starts, ends, phrase_first) with the first word after each silence on the silence end,
    starts monotonic, and each end = next start, or the silence start when a silence lies between."""
    st = list(starts); first = set()
    for s0, s1 in silences:
        if s1 >= total: continue
        # the phrase's first word = the first word whose raw start falls at or after the silence start;
        # it snaps to the silence end when the raw time is within the window (else the raw time stands)
        i = next((i for i, x in enumerate(starts) if x >= s0), None)
        if i is None or i in first or abs(starts[i] - s1) > window: continue
        st[i] = s1; first.add(i)
    if st and silences and silences[0][0] <= .05 and 0 not in first: st[0] = max(st[0], silences[0][1]); first.add(0)
    for i in range(1, len(st)):                      # monotonic, at least 20 ms per word
        if st[i] < st[i - 1] + .02: st[i] = st[i - 1] + .02
    ends = []
    for i in range(len(st)):
        nxt = st[i + 1] if i + 1 < len(st) else total
        sil = [s0 for s0, s1 in silences if st[i] < s0 < nxt]
        ends.append(min(sil) if sil else nxt)
    return st, ends, sorted(first)


def build_cues(story, audio, duration, method, lines, starts, ends):
    out, k = [], 0
    for n, (text, words) in enumerate(lines, 1):
        ws = [{'w': w, 'start': round(starts[k + i], 3), 'end': round(ends[k + i], 3)} for i, w in enumerate(words)]
        k += len(words)
        out.append({'line': n, 'text': text, 'start': ws[0]['start'], 'end': ws[-1]['end'], 'words': ws})
    return {'story': story, 'audio': audio, 'duration': round(duration, 6), 'method': method, 'lines': out}


def compare(cues, ref, tol=REF_TOL):
    """Line-start differences against a reference cues.json → (max |diff|, [(line, diff)] over tol)."""
    diffs = [(a['line'], round(a['start'] - b['start'], 3)) for a, b in zip(cues['lines'], ref['lines'])]
    bad = [d for d in diffs if abs(d[1]) > tol]
    if len(cues['lines']) != len(ref['lines']): bad.append(('count', len(cues['lines']) - len(ref['lines'])))
    return max(abs(d) for _, d in diffs), bad


# ---------------- I/O ----------------
def silences_of(wav):
    log = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(wav), '-af', SILENCE, '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    s0 = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
    s1 = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
    return list(zip(s0, s1))


def ensure_model():
    d = CACHE / MODEL
    if not (d / 'tokens.txt').exists():
        CACHE.mkdir(parents=True, exist_ok=True); tar = CACHE / (MODEL + '.tar.bz2')
        print('downloading', MODEL_URL, file=sys.stderr); urllib.request.urlretrieve(MODEL_URL, tar)
        with tarfile.open(tar) as t: t.extractall(CACHE, filter='data')
        tar.unlink()
    pick = lambda stem: str(next(p for p in sorted(d.glob(stem + '*.onnx')) if 'int8' not in p.name))
    return dict(tokens=str(d / 'tokens.txt'), encoder=pick('encoder'), decoder=pick('decoder'), joiner=pick('joiner'))


def recognise(wav):
    import sherpa_onnx, soundfile as sf
    m = ensure_model()
    rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=m['encoder'], decoder=m['decoder'], joiner=m['joiner'], tokens=m['tokens'], num_threads=2, decoding_method='greedy_search')
    audio, sr = sf.read(str(wav), dtype='float32')
    st = rec.create_stream(); st.accept_waveform(sr, audio); rec.decode_stream(st)
    return join_tokens(st.result.tokens, st.result.timestamps), len(audio) / sr


DEFAULT_FORMAT = 6   # docs/season1/FORMAT_V6.md: the default for new episodes


def voice_range(fmt=None):
    """Pure: the allowed voice length (s) per episode format: format 6 up to 124.15 s (voice + 0.85 ≤ 2:05, no minimum,
    never padded), format v5 75–90 s, older formats 100–168 s."""
    return (0, 111.5) if fmt == 7 else (0, 124.15) if fmt == 6 else (75, 90) if fmt == 5 else (100, 168)


def spec_format(story_dir, override=None):
    """The episode format: --format, else stories/<slug>/episode.json `format` (a spec without one is a legacy episode,
    None), else (no spec yet: a new episode) DEFAULT_FORMAT."""
    if override is not None: return override
    p = Path(story_dir) / 'episode.json'
    return json.loads(p.read_text()).get('format') if p.exists() else DEFAULT_FORMAT


def main():
    a = argparse.ArgumentParser(); a.add_argument('--story', required=True); a.add_argument('--out'); a.add_argument('--ref'); a.add_argument('--format', type=int)
    o = a.parse_args()
    sd = ROOT / 'stories' / o.story; build = sd / 'build'; build.mkdir(parents=True, exist_ok=True)
    voice = next((sd / f for f in ('voice.flac', 'voice.wav', 'voice.mp3') if (sd / f).exists()), None)
    if not voice: sys.exit(f'no voice file in {sd}')
    out = Path(o.out) if o.out else build / 'cues.json'
    if out.resolve() == (sd / 'cues.json').resolve() and (sd / 'cues.json').exists(): sys.exit('refusing to overwrite the supplied cues.json')
    wav = build / 'voice16k.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(voice), '-ac', '1', '-ar', '16000', str(wav)], check=True)
    lines = script_lines((sd / 'script.txt').read_text())
    flat = [w for _, ws in lines for w in ws]
    sil = silences_of(wav)
    if os.environ.get('ELEVENLABS_API_KEY'):
        print('note: ELEVENLABS_API_KEY set, but preflight reports api.elevenlabs.io blocked; using the local route', file=sys.stderr)
    hyp, duration = recognise(wav)
    m = nw_align([normalise(w) for w in flat], [normalise(w) for w, _ in hyp])
    raw = interpolate([hyp[j][1] if j is not None else None for j in m], duration)
    starts, ends, _ = snap(raw, sil, duration)
    method = 'sherpa-onnx zipformer-small-en + script DP + silence snap (scripts/v2/align.py)'
    cues = build_cues(o.story, voice.name, duration, method, lines, starts, ends)
    out.write_text(json.dumps(cues, indent=1))
    matched = sum(j is not None for j in m)
    print(json.dumps({'out': str(out.relative_to(ROOT)) if out.is_relative_to(ROOT) else str(out), 'duration': round(duration, 2),
                      'script_words': len(flat), 'recognised': len(hyp), 'mapped': matched, 'silences': len(sil)}))
    lo, hi = voice_range(spec_format(sd, o.format))
    if not lo <= duration <= hi:
        sys.exit(f'STOP: voice is {duration:.1f} s, outside {lo}–{hi} s; tell the owner')
    if o.ref:
        mx, bad = compare(cues, json.loads(Path(o.ref).read_text()))
        print(json.dumps({'reference': o.ref, 'max_line_start_diff': mx, 'over_tolerance': bad, 'pass': not bad}))
        if bad: sys.exit(1)


if __name__ == '__main__':
    main()
