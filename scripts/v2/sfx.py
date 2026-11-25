#!/usr/bin/env python3
"""scripts/v2/sfx.py — the Season 1 sound-effects set and its automatic placement (Amendment A4 §F).

  python3 scripts/v2/sfx.py --write <dir>                       # the ten synthesized WAVs (48 kHz, 16-bit mono)
  python3 scripts/v2/sfx.py --spec <episode.json> --out <track.wav> [--duration s] [--json placements.json]

Set (numpy, seeded, royalty-free, ours): whoosh, pop, thud, rumble, riser, sparkle, crack, bell, splash, zap.
A drop-in `assets/sfx/<name>.wav` (any format ffmpeg reads) replaces the synthesized one.
Placement (pure, `place`): whip/snap shot → whoosh at the cut · tag pop (cast `tags`), rule-UI change (`ui` keys) and class
card (`classReveal`, card at +0.55 s) → pop (Season 1 / labels off: no tag or card pops; only in-world text UI pops) · `shake` effect → thud · B5's first shot → rumble · 1.0 s before the reversal
(B7's first shot) → riser, ending 8 frames early, then 8 frames of silence (the sfx track and the music are muted) ·
explicit `spec.sfxCues: [[t, name], …]` are added as written. Off with `"sfx": false` in the episode file.
Level: every hit is set to −30 dB RMS (16 dB under the voice's −14 LUFS), peaks capped at −6 dBFS.
"""
import argparse, json, os, subprocess, sys, wave
import numpy as np

SR = 48000
NAMES = ['whoosh', 'pop', 'thud', 'rumble', 'riser', 'sparkle', 'crack', 'bell', 'splash', 'zap', 'squeak']   # tuft 4C: + squeak (a small toy squeak)
UNDER_VOICE_DB, VOICE_LUFS, PEAK_CAP_DB = 16, -14, -6
POP_DELAY_CARD, RISER_LEAD, SILENCE_FRAMES = .55, 1.0, 8


# ---------------- synthesis (pure, deterministic) ----------------
def _t(d): return np.arange(int(d * SR)) / SR
def _env(n, a, r):   # attack / release fractions, linear in, exponential out
    e = np.ones(n); na = max(1, int(n * a)); e[:na] = np.linspace(0, 1, na); nr = max(1, int(n * r)); e[-nr:] *= np.exp(-np.linspace(0, 5, nr)); return e
def _lp(x, cut):     # one-pole low-pass; cut (Hz) may be an array
    cut = np.broadcast_to(np.asarray(cut, float), x.shape); a = 1 - np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a[i] * (x[i] - s); y[i] = s
    return y
def _hp(x, cut): return x - _lp(x, cut)
def _norm(x): m = np.max(np.abs(x)) or 1; return (x / m).astype(np.float32)


def synth(name, seed=7, dur=None):
    r = np.random.default_rng(sum(map(ord, name)) * 31 + seed)   # stable across processes (str hash is salted)
    if name == 'whoosh':
        t = _t(.45); n = r.standard_normal(len(t)); sweep = 300 + 2600 * np.sin(np.pi * t / t[-1]) ** 2
        return _norm(_hp(_lp(n, sweep), 150) * np.sin(np.pi * t / t[-1]) ** 1.5)
    if name == 'pop':
        t = _t(.09); f = 620 * np.exp(-t * 28) + 180; ph = 2 * np.pi * np.cumsum(f) / SR
        return _norm(np.sin(ph) * np.exp(-t * 55) + .3 * r.standard_normal(len(t)) * np.exp(-t * 400))
    if name == 'thud':
        t = _t(.45); ph = 2 * np.pi * np.cumsum(70 * np.exp(-t * 6) + 38) / SR
        return _norm(np.sin(ph) * np.exp(-t * 9) + .5 * _lp(r.standard_normal(len(t)), 220) * np.exp(-t * 30))
    if name == 'rumble':
        t = _t(dur or 2.6); n = _lp(_lp(np.cumsum(r.standard_normal(len(t))) * .02, 90), 60); n -= n.mean()
        return _norm(n * (1 + .35 * np.sin(2 * np.pi * 3.1 * t)) * _env(len(t), .25, .35))
    if name == 'riser':
        t = _t(dur or 1.0); f = 180 * (6.5 ** (t / t[-1])); ph = 2 * np.pi * np.cumsum(f) / SR; ramp = (t / t[-1]) ** 2.2
        return _norm((.55 * np.sin(ph) + .25 * np.sin(2 * ph) + .45 * _hp(r.standard_normal(len(t)), 900 + 4000 * t / t[-1])) * ramp)
    if name == 'sparkle':
        t = _t(.7); x = np.zeros(len(t))
        for k in range(9):
            s = int(r.uniform(0, .45) * SR); f = r.uniform(2400, 6200); tt = t[:len(t) - s]; x[s:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * r.uniform(18, 30)) * r.uniform(.5, 1)
        return _norm(x * _env(len(t), .01, .4))
    if name == 'crack':
        t = _t(.3); n = r.standard_normal(len(t)); return _norm(_hp(n, 1200) * np.exp(-t * 26) + .6 * _lp(n, 400) * np.exp(-t * 60))
    if name == 'bell':
        t = _t(dur or 2.2); x = sum(a * np.sin(2 * np.pi * 660 * p * t) * np.exp(-t * d) for p, a, d in [(1, 1, 1.6), (2.76, .5, 2.4), (5.4, .3, 3.8), (8.93, .18, 5.5)])
        return _norm(x * _env(len(t), .002, .1))
    if name == 'splash':
        t = _t(.8); n = r.standard_normal(len(t)); x = _lp(n, 2600) * np.exp(-t * 6)
        for k in range(7):
            s = int(r.uniform(.05, .6) * SR); tt = t[:len(t) - s]; x[s:] += .4 * np.sin(2 * np.pi * r.uniform(900, 2200) * tt * (1 + tt * 4)) * np.exp(-tt * 40)
        return _norm(x * _env(len(t), .01, .3))
    if name == 'zap':
        t = _t(.32); f = 1800 * np.exp(-t * 7) + 160; ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
        return _norm(_lp(saw, 5000) * (1 + .5 * np.sign(np.sin(2 * np.pi * 42 * t))) * np.exp(-t * 7))
    if name == 'squeak':   # tuft 4C: a rubber-toy squeak: a fast up-down pitch chirp (1.1 → 2.3 → 1.6 kHz) with a nasal 2nd/3rd harmonic
        t = _t(.22); u = t / t[-1]; f = 1100 + 1200 * np.sin(np.pi * np.minimum(1, u * 1.4)) ** 2 + 500 * u; ph = 2 * np.pi * np.cumsum(f) / SR
        return _norm((np.sin(ph) + .45 * np.sin(2 * ph) + .2 * np.sin(3 * ph)) * _env(len(t), .04, .35) + .02 * _hp(r.standard_normal(len(t)), 3000) * np.exp(-t * 40))
    raise ValueError(f'unknown sfx {name}')


def load(name, assets='assets/sfx', dur=None):
    """The override in assets/sfx/<name>.wav if present (decoded by ffmpeg to 48 kHz mono), else the synthesized one."""
    p = os.path.join(assets, f'{name}.wav')
    if os.path.exists(p):
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        return _norm(np.frombuffer(raw, np.float32).copy())
    return synth(name, dur=dur)


def write_wav(path, x):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


# ---------------- placement (pure) ----------------
def shot_start(shots, sid, fps):
    s = next((s for s in shots if s['id'] == sid), None); return None if s is None else s['start'] / fps


WORLD_TEXT_KINDS = ('plate', 'stat', 'bar', 'checklist')


def labels_off(spec):
    """Owner rule §2c (engine/nolabels.js labelsOff): Season 1 or labels: false."""
    return spec.get('labels') is False or spec.get('season') == 1


def ui_allowed(u, cast_names):
    return u.get('facing', 'screen') == 'world' and u.get('kind') in WORLD_TEXT_KINDS and str(u.get('to', '')).split('.')[0] not in cast_names


def place(spec, shots, fps=30):
    """→ {'hits': [[t, name, why]], 'silence': [[t0, t1]]} sorted by time. shots: laid out ({id, start, frames, move}).
    With labels off (Season 1) there are no name-tag or card pops, and only in-world text UI (a scoreboard flip) pops."""
    hits, silence, off = [], [], labels_off(spec); names = list((spec.get('cast') or {}).keys())
    for s in shots:
        if s.get('move') in ('whip', 'snap'): hits.append([s['start'] / fps, 'whoosh', f"{s['id']} {s['move']}"])
    for name, c in ({} if off else (spec.get('cast') or {})).items():
        for k in c.get('tags') or []:
            if isinstance(k, list) and len(k) > 1 and k[1]: hits.append([float(k[0]), 'pop', f'{name} tag'])
    for u in spec.get('ui') or []:
        if off and not ui_allowed(u, names): continue
        prev = None
        for k in u.get('keys') or []:
            v = k[1:] if isinstance(k, list) else None
            if v and v[0] is not None and v != prev: hits.append([float(k[0]), 'pop', f"ui {u.get('id')}"])
            prev = v
    reveals = list(spec.get('classReveals') or []) + [s['classReveal'] for s in spec.get('shots') or [] if s.get('classReveal')]
    for r in reveals:
        for rv in r if isinstance(r, list) else [r]:
            if rv.get('card', True) is not False and not off: hits.append([float(rv['at']) + POP_DELAY_CARD, 'pop', f"{rv.get('cls')} card"])
    for e in spec.get('effects') or []:
        if e.get('type') == 'shake': hits.append([float(e['at']), 'thud', 'shake'])
    beats = spec.get('beats') or {}
    if beats.get('B5'):
        t = shot_start(shots, beats['B5'][0], fps)
        if t is not None: hits.append([t, 'rumble', 'B5 crisis'])
    if beats.get('B7'):
        rev = shot_start(shots, beats['B7'][0], fps)
        if rev is not None:
            gap = SILENCE_FRAMES / fps; hits.append([max(0.0, rev - RISER_LEAD), 'riser', f'reversal {beats["B7"][0]}', RISER_LEAD - gap]); silence.append([round(rev - gap, 4), round(rev, 4)])
    for k in spec.get('sfxCues') or []: hits.append([float(k[0]), k[1], 'sfxCues'])
    hits = [[round(h[0], 4), *h[1:]] for h in sorted(hits, key=lambda h: h[0])]
    for h in hits:
        if h[1] not in NAMES: raise ValueError(f'unknown sfx {h[1]} at {h[0]}')
    return {'hits': hits, 'silence': silence}


def level(x, db=VOICE_LUFS - UNDER_VOICE_DB, cap=PEAK_CAP_DB):
    """Scale a hit so its RMS (over samples above 1 % of peak) is `db` dBFS, peak ≤ cap dBFS."""
    act = x[np.abs(x) > .01 * (np.max(np.abs(x)) or 1)]; rms = np.sqrt(np.mean(act ** 2)) if len(act) else 1
    g = min(10 ** (db / 20) / rms, 10 ** (cap / 20) / (np.max(np.abs(x)) or 1)); return x * g


def render_track(placed, duration, fps=30, assets='assets/sfx'):
    """The mixed sfx track (float32 mono, 48 kHz) for `placed` (from place()); silence windows are zeroed."""
    out = np.zeros(int(duration * SR) + 1, np.float32); cache = {}
    for h in placed['hits']:
        t, name = h[0], h[1]; dur = h[3] if len(h) > 3 else None
        k = (name, dur)
        if k not in cache: cache[k] = level(load(name, assets, dur))
        x = cache[k]; s = int(t * SR); e = min(len(out), s + len(x))
        if s < len(out): out[s:e] += x[:e - s]
    for t0, t1 in placed['silence']: out[int(t0 * SR):int(t1 * SR)] = 0
    return out


def layout(spec_path):
    return json.loads(subprocess.run(['node', 'scripts/v2/layout.js', spec_path], capture_output=True, text=True, check=True).stdout)


def main():
    a = argparse.ArgumentParser(); a.add_argument('--write'); a.add_argument('--spec'); a.add_argument('--out'); a.add_argument('--duration', type=float)
    a.add_argument('--json'); a.add_argument('--assets', default='assets/sfx'); o = a.parse_args()
    if o.write:
        for n in NAMES: write_wav(os.path.join(o.write, f'{n}.wav'), level(load(n, o.assets)) / 10 ** (PEAK_CAP_DB / 20) * .9)
        print(json.dumps({'written': o.write, 'sfx': NAMES})); return
    spec = json.load(open(o.spec))
    if spec.get('sfx') is False: print(json.dumps({'sfx': False})); return
    shots = layout(o.spec); fps = spec.get('fps', 30); end = (shots[-1]['start'] + shots[-1]['frames']) / fps
    placed = place(spec, shots, fps); track = render_track(placed, o.duration or end, fps, o.assets)
    if o.out: write_wav(o.out, track)
    if o.json: json.dump(placed, open(o.json, 'w'), indent=1)
    print(json.dumps({'out': o.out, 'hits': len(placed['hits']), 'silence': placed['silence'], 'byName': {n: sum(h[1] == n for h in placed['hits']) for n in NAMES if any(h[1] == n for h in placed['hits'])}}))


if __name__ == '__main__':
    main()
