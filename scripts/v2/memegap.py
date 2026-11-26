#!/usr/bin/env python3
"""scripts/v2/memegap.py — MEME-GAP AUDIO (Phase 1F, owner rule: the VO and the meme sounds both stay intact).

Spec form (opt-in): "audio": {"gaps": [{"afterWord": "Heights", "nth": 1, "clip": "assets/sfx/memes/g1.wav", "pad": 0.15}, …]}
At the boundary after the nth spoken "Heights" (cues.json), the VO is opened by a silence of clip length + pad (20 ms fades at
the cut edges, placed in the inter-word pause, never inside a word); every later cue, shot time and spec end shifts by that
amount; the clip sits inside the gap (pad / 2 before and after). VO words are never cut, sped up, overlapped or ducked.
Clip peak = VO peak − 3 dB (CLIP_DB).

  python3 scripts/v2/memegap.py --story <slug> [--spec stories/<slug>/episode.json]
      → stories/<slug>/build/voice-gapped.wav, cues-gapped.json, episode-gapped.json (audio.voice set; assemble.py uses it), memegap.json
  python3 scripts/v2/memegap.py --fixture --out review/city   (synthetic VO + 2 clips → 1F-audio.json + 1F-audio-wave.png)
Pure helpers (tests/v2/test_memegap.py): norm, find_word, plan_gaps, shift_t, shift_cues, shift_spec, overlap_report.
"""
import argparse, copy, json, os, re, subprocess, sys

SR = 48000
FADE = 0.020        # s, at each cut edge
CLIP_DB = -3.0      # clip peak relative to the VO peak
MIN_PAUSE = 0.010   # s: the cut sits at least this far after the word's end


def norm(w):
    return re.sub(r"[^\w']", '', str(w)).lower()


def words_of(cues):
    out = []
    for ln in cues.get('lines', []):
        for w in ln.get('words', []): out.append({'w': w['w'], 'n': norm(w['w']), 'start': float(w['start']), 'end': float(w['end']), 'line': ln.get('line')})
    out.sort(key=lambda x: x['start'])
    return out


def find_word(cues, word, nth=1):
    """(index, word, next word or None) of the nth (1-based, whole episode) spoken occurrence of `word`."""
    ws, k = words_of(cues), 0
    for i, w in enumerate(ws):
        if w['n'] == norm(word):
            k += 1
            if k == nth: return i, w, (ws[i + 1] if i + 1 < len(ws) else None)
    raise ValueError(f'word "{word}" #{nth} is not spoken in cues.json')


def plan_gaps(cues, gaps, clip_len):
    """Pure. gaps = spec audio.gaps; clip_len(path) → seconds. → list sorted by cut time of
    {afterWord, nth, clip, cut (original s), dur, pad, clipAt (new timeline s), clipLen}. The cut is the middle of the pause after the
    word (but ≥ MIN_PAUSE + FADE after its end and ≥ FADE before the next word), so the fades only touch silence."""
    plan = []
    for g in gaps:
        _, w, nx = find_word(cues, g['afterWord'], g.get('nth', 1))
        lo = w['end'] + MIN_PAUSE + FADE
        hi = (nx['start'] - FADE) if nx else w['end'] + 1.0
        if not nx: cut = lo
        elif hi >= lo: cut = min(hi, max(lo, (w['end'] + nx['start']) / 2))
        else: cut = (w['end'] + nx['start']) / 2   # pause < 2 fades + MIN_PAUSE: the middle of what there is
        L, pad = float(clip_len(g['clip'])), float(g.get('pad', .15))
        plan.append({'afterWord': g['afterWord'], 'nth': g.get('nth', 1), 'clip': g['clip'], 'cut': round(cut, 4), 'dur': round(L + pad, 4), 'pad': pad, 'clipLen': round(L, 4)})
    plan.sort(key=lambda p: p['cut'])
    for i, p in enumerate(plan):
        if i and p['cut'] <= plan[i - 1]['cut'] + 1e-6: raise ValueError(f'two gaps at one boundary: {p["afterWord"]}')
        before = sum(q['dur'] for q in plan[:i])
        p['newCut'] = round(p['cut'] + before, 4); p['clipAt'] = round(p['newCut'] + p['pad'] / 2, 4)
    return plan


def shift_t(t, plan):
    """Pure: an original time → the gapped timeline (a time at or after a cut moves by that gap and every earlier one)."""
    if t is None: return t
    return round(t + sum(p['dur'] for p in plan if t >= p['cut'] - 1e-9), 4)


def shift_cues(cues, plan):
    c = copy.deepcopy(cues)
    for ln in c.get('lines', []):
        for w in ln.get('words', []): w['start'], w['end'] = shift_t(w['start'], plan), shift_t(w['end'], plan)
        if 'start' in ln: ln['start'] = shift_t(ln['start'], plan)
        if 'end' in ln: ln['end'] = shift_t(ln['end'], plan)
    if 'duration' in c: c['duration'] = round(c['duration'] + sum(p['dur'] for p in plan), 4)
    c['memeGaps'] = [{k: p[k] for k in ('afterWord', 'nth', 'cut', 'dur', 'clipAt', 'clipLen')} for p in plan]
    return c


def _shift_at(v, plan):
    return shift_t(v, plan) if isinstance(v, (int, float)) and not isinstance(v, bool) else v


def shift_spec(spec, plan):
    """Pure: numeric shot times (at, cue [a, b]), spec end, emphasis6 t, clock / action numeric `at` move with the VO. Word refs
    ({word, nth}) need nothing: they resolve against the shifted cues."""
    s = copy.deepcopy(spec)
    for sh in s.get('shots', []):
        if 'at' in sh: sh['at'] = _shift_at(sh['at'], plan)
        if isinstance(sh.get('cue'), list): sh['cue'] = [_shift_at(x, plan) for x in sh['cue']]
        for a in sh.get('actions', []) or []:
            if 'at' in a: a['at'] = _shift_at(a['at'], plan)
    for k in ('emphasis6',):
        for e in s.get(k, []) or []:
            if 't' in e: e['t'] = _shift_at(e['t'], plan)
    for c in s.get('clock', []) or []:
        if 'at' in c: c['at'] = _shift_at(c['at'], plan)
    if isinstance(s.get('end'), (int, float)): s['end'] = round(s['end'] + sum(p['dur'] for p in plan), 4)
    return s


def overlap_report(plan, cues_new, vo_env=None, clip_env=None, sr=SR, thr=1e-3):
    """Pure. Word-level: no shifted word overlaps any clip window [clipAt, clipAt + clipLen]. Sample-level (optional envelopes,
    abs amplitude per sample): samples where both the VO and the clips exceed `thr`."""
    ws = words_of(cues_new)
    bad = [(w['w'], p['afterWord']) for p in plan for w in ws if w['start'] < p['clipAt'] + p['clipLen'] and w['end'] > p['clipAt']]
    rep = {'wordOverlaps': len(bad), 'wordOverlapList': bad[:10]}
    if vo_env is not None and clip_env is not None:
        import numpy as np
        n = min(len(vo_env), len(clip_env)); both = (np.abs(vo_env[:n]) > thr) & (np.abs(clip_env[:n]) > thr)
        rep['sampleOverlaps'] = int(both.sum()); rep['sampleOverlapMs'] = round(both.sum() / sr * 1000, 2)
    return rep


# ---------------- audio (numpy + ffmpeg decode) ----------------
def read_audio(path):
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def write_wav(path, x):
    import numpy as np, wave
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def splice(vo, plan, clips):
    """→ (mix, vo_track, clip_track) at SR. VO samples are copied unchanged except FADE-long ramps at each cut edge (in the pause)."""
    import numpy as np
    total = len(vo) + sum(int(round(p['dur'] * SR)) for p in plan)
    vt, ct = np.zeros(total, np.float32), np.zeros(total, np.float32)
    peak = float(np.max(np.abs(vo))) or 1.0
    src, dst, F = 0, 0, int(FADE * SR)
    for p in plan:
        c = int(round(p['cut'] * SR)); seg = vo[src:c].copy()
        if len(seg) >= F: seg[-F:] *= np.linspace(1, 0, F, dtype=np.float32)
        if src > 0 and len(seg) >= F: seg[:F] *= np.linspace(0, 1, F, dtype=np.float32)
        vt[dst:dst + len(seg)] = seg; dst += len(seg); src = c
        g = int(round(p['dur'] * SR)); clip = clips[p['clip']]; cp = float(np.max(np.abs(clip))) or 1.0
        clip = clip * (peak * 10 ** (CLIP_DB / 20) / cp); at = dst + int(round(p['pad'] / 2 * SR)); clip = clip[:max(0, g - int(round(p['pad'] / 2 * SR)))]
        ct[at:at + len(clip)] = clip; dst += g
    seg = vo[src:].copy()
    if src > 0 and len(seg) >= F: seg[:F] *= np.linspace(0, 1, F, dtype=np.float32)
    vt[dst:dst + len(seg)] = seg
    return vt + ct, vt, ct


def waveform_png(path, vt, ct, plan, title=''):
    """Two-lane waveform (VO blue on top, clips orange below), gap windows shaded; ≤ 1600 px."""
    import numpy as np
    from PIL import Image, ImageDraw
    W, H, lane = 1560, 300, 120; img = Image.new('RGB', (W, H), (250, 250, 248)); d = ImageDraw.Draw(img)
    n = len(vt); per = max(1, n // W); dur = n / SR
    for p in plan:
        x0, x1 = int(p['newCut'] / dur * W), int((p['newCut'] + p['dur']) / dur * W); d.rectangle([x0, 20, x1, H - 20], fill=(255, 236, 200))
    for k, (tr, y0, col) in enumerate([(vt, 30 + lane // 2, (40, 90, 200)), (ct, 30 + lane + 20 + lane // 2, (230, 120, 20))]):
        m = np.abs(tr[:per * W]).reshape(W, per).max(axis=1); top = float(max(np.abs(vt).max(), 1e-6))
        for x in range(W):
            h = int(m[x] / top * (lane // 2 - 2))
            if h: d.line([x, y0 - h, x, y0 + h], fill=col)
    for s in range(int(dur) + 1): x = int(s / dur * W); d.line([x, H - 18, x, H - 12], fill=(90, 90, 90)); d.text((x + 2, H - 14), f'{s}s', fill=(90, 90, 90))
    d.text((6, 4), title or 'VO (blue) / meme clips (orange) / gap windows (shaded)', fill=(20, 20, 20))
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True); img.save(path, optimize=True)


def apply(cues, spec, vo, clips):
    gaps = (spec.get('audio') or {}).get('gaps') or []
    plan = plan_gaps(cues, gaps, lambda c: len(clips[c]) / SR)
    mix, vt, ct = splice(vo, plan, clips)
    cn = shift_cues(cues, plan); sn = shift_spec(spec, plan)
    return plan, cn, sn, mix, vt, ct


def report(plan, cues, cn, vt, ct, vo):
    import numpy as np
    ws0, ws1 = words_of(cues), words_of(cn)
    shift = [{'w': a['w'], 'before': a['start'], 'after': b['start'], 'shift': round(b['start'] - a['start'], 4)} for a, b in zip(ws0, ws1)]
    moved = [s for s in shift if s['shift'] > 0]
    # VO integrity: every word's samples (outside the fade ramps) are bit-identical before / after
    worst = 0.0
    for a, b in zip(ws0, ws1):
        i0, i1 = int(a['start'] * SR), int(a['end'] * SR); j0 = i0 + sum(int(round(p['dur'] * SR)) for p in plan if a['start'] >= p['cut'] - 1e-9)
        if i1 > i0: worst = max(worst, float(np.max(np.abs(vo[i0:i1] - vt[j0:j0 + (i1 - i0)]))) if j0 + (i1 - i0) <= len(vt) else 1.0)
    vp, cp = float(np.max(np.abs(vt))), float(np.max(np.abs(ct))) if len(ct) else 0
    rep = {'gaps': plan, 'words': len(ws0), 'wordsShifted': len(moved), 'firstShifted': moved[:3], 'lastWord': shift[-1] if shift else None,
           'durationBefore': round(len(vo) / SR, 3), 'durationAfter': round(len(vt) / SR, 3), 'voWordMaxDiff': worst,
           'voPeakDb': round(20 * np.log10(vp + 1e-12), 2), 'clipPeakDb': round(20 * np.log10(cp + 1e-12), 2), 'clipBelowVoDb': round(20 * np.log10((cp + 1e-12) / (vp + 1e-12)), 2),
           **overlap_report(plan, cn, vt, ct)}
    rep['pass'] = bool(rep['wordOverlaps'] == 0 and rep['sampleOverlaps'] == 0 and worst == 0.0 and abs(rep['clipBelowVoDb'] - CLIP_DB) <= .5)
    return rep


def fixture(out):
    """Synthetic VO (a voiced tone burst per word of a fake cue list) + 2 synthetic meme clips; proves the shift + no overlap."""
    import numpy as np
    text = 'Welcome to Governor Heights where the bell rings every hour and nobody is late ever'.split()
    t, lines = 0.2, []
    words = []
    for w in text:
        d = .18 + .03 * len(w); words.append({'w': w, 'start': round(t, 3), 'end': round(t + d, 3)}); t += d + .07
    cues = {'story': '_memegap', 'note': 'synthetic fixture (Phase 1F)', 'duration': round(t + .3, 3), 'lines': [{'line': 1, 'text': ' '.join(text), 'start': words[0]['start'], 'end': words[-1]['end'], 'words': words}]}
    n = int(cues['duration'] * SR); vo = np.zeros(n, np.float32); tt = np.arange(n) / SR
    for i, w in enumerate(words):
        a, b = int(w['start'] * SR), int(w['end'] * SR); env = np.sin(np.linspace(0, np.pi, b - a)) ** .5
        vo[a:b] = (.6 * np.sin(2 * np.pi * (140 + 9 * i) * tt[a:b]) + .25 * np.sin(2 * np.pi * 410 * tt[a:b])) * env * .8
    clips = {}
    for k, (L, f0) in enumerate([(.9, 600), (1.3, 300)]):
        m = int(L * SR); c = np.sin(2 * np.pi * (f0 + 500 * np.linspace(0, 1, m)) * np.arange(m) / SR).astype(np.float32) * np.hanning(m).astype(np.float32) ** .3
        clips[f'fixture/g{k + 1}.wav'] = c
    spec = {'slug': '_memegap', 'end': round(cues['duration'] + .5, 3), 'shots': [{'id': 'S1', 'at': 0, 'cue': [0, 1.5]}, {'id': 'S2', 'at': 1.8, 'cue': [1.8, 3.2]}, {'id': 'S3', 'at': 3.4, 'cue': [3.4, 5]}],
            'audio': {'gaps': [{'afterWord': 'Heights', 'nth': 1, 'clip': 'fixture/g1.wav', 'pad': .15}, {'afterWord': 'rings', 'nth': 1, 'clip': 'fixture/g2.wav', 'pad': .15}]}}
    plan, cn, sn, mix, vt, ct = apply(cues, spec, vo, clips)
    rep = report(plan, cues, cn, vt, ct, vo)
    rep['shots'] = [{'id': a['id'], 'before': a['at'], 'after': b['at'], 'cueAfter': b['cue']} for a, b in zip(spec['shots'], sn['shots'])]
    rep['endBefore'], rep['endAfter'] = spec['end'], sn['end']
    os.makedirs(out, exist_ok=True)
    waveform_png(f'{out}/1F-audio-wave.png', vt, ct, plan, f"meme-gap fixture: VO (blue) + 2 clips (orange) in shaded gaps; sample overlap {rep['sampleOverlaps']}, word overlaps {rep['wordOverlaps']}, clip {rep['clipBelowVoDb']} dB vs VO")
    json.dump(rep, open(f'{out}/1F-audio.json', 'w'), indent=1); print(json.dumps({k: rep[k] for k in ('pass', 'wordsShifted', 'durationBefore', 'durationAfter', 'sampleOverlaps', 'wordOverlaps', 'clipBelowVoDb', 'voWordMaxDiff')}))
    return rep


def main():
    a = argparse.ArgumentParser(); a.add_argument('--story'); a.add_argument('--spec'); a.add_argument('--fixture', action='store_true'); a.add_argument('--out', default='review/city')
    o = a.parse_args()
    if o.fixture: sys.exit(0 if fixture(o.out)['pass'] else 1)
    if not o.story: sys.exit('--story or --fixture')
    spec_p = o.spec or f'stories/{o.story}/episode.json'; spec = json.load(open(spec_p)); cues = json.load(open(f'stories/{o.story}/cues.json'))
    voice = next(p for p in [f'stories/{o.story}/voice.flac', f'stories/{o.story}/voice.wav', f'stories/{o.story}/voice.mp3'] if os.path.exists(p))
    vo = read_audio(voice); clips = {g['clip']: read_audio(g['clip']) for g in (spec.get('audio') or {}).get('gaps', [])}
    plan, cn, sn, mix, vt, ct = apply(cues, spec, vo, clips)
    b = f'stories/{o.story}/build'; os.makedirs(b, exist_ok=True)
    write_wav(f'{b}/voice-gapped.wav', mix); json.dump(cn, open(f'{b}/cues-gapped.json', 'w'), indent=1)
    sn['cues'] = f'{b}/cues-gapped.json'; sn.setdefault('audio', {})['voice'] = f'{b}/voice-gapped.wav'; sn['audio']['gapsApplied'] = True
    json.dump(sn, open(f'{b}/episode-gapped.json', 'w'), indent=1)
    rep = report(plan, cues, cn, vt, ct, vo); json.dump(rep, open(f'{b}/memegap.json', 'w'), indent=1)
    waveform_png(f'{b}/memegap-wave.png', vt, ct, plan)
    print(json.dumps({k: rep[k] for k in ('pass', 'wordsShifted', 'durationAfter', 'sampleOverlaps', 'clipBelowVoDb')})); sys.exit(0 if rep['pass'] else 1)


if __name__ == '__main__':
    main()
