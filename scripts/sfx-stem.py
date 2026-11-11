"""Minimal sound-effects stem, synthesised in code (fully owned, no samples).

Usage: python3 scripts/sfx-stem.py <episode> [out.wav]
Reads stories/<ep>/sfx.json (cues anchored to narration words) and word-timings.json and
writes renders/<ep>-final/sfx-stem.wav: 48 kHz stereo, exactly the episode length, peaks
≤ -3 dBFS, for the owner to mix under the voice-over and music (or mute).
"""
import json
import os
import re
import sys
import wave

import numpy as np

EP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else f'renders/{EP}-final/sfx-stem.wav'
SR = 48000
W = json.load(open(f'stories/{EP}/word-timings.json'))
cfg = json.load(open(f'stories/{EP}/sfx.json'))
tail = 1.8
dur = W[-1]['end'] + tail
frames = round(dur * 30); dur = frames / 30
rng = np.random.default_rng(7)
t_ = lambda s: np.arange(int(s * SR)) / SR
env = lambda n, a, r: np.minimum(1, np.arange(n) / max(1, int(a * SR))) * np.exp(-np.arange(n) / (r * SR))

def lp(x, k):  # one-pole low-pass, k in (0,1]
    y = np.empty_like(x); acc = 0.
    for i, v in enumerate(x): acc += k * (v - acc); y[i] = acc
    return y

def whoosh(): t = t_(.55); n = rng.standard_normal(len(t)); sweep = np.sin(np.pi * t / .55) ** 2; return lp(n, .08) * sweep * 1.6
def pop(): t = t_(.18); f = 900 * np.exp(-t * 18) + 220; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .002, .05)
def thud(): t = t_(.4); f = 90 * np.exp(-t * 6) + 45; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .003, .12) * 1.2
def boing(): t = t_(.6); f = 260 + 90 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .005, .22) * .8
def sparkle():
    t = t_(.9); out = np.zeros(len(t))
    for k, f in enumerate([1568, 2093, 2637, 3136, 2349]):
        s0 = int(k * .07 * SR); seg = t[:len(t) - s0]; out[s0:] += np.sin(2 * np.pi * f * seg) * np.exp(-seg * 7) * .35
    return out
def riser(): t = t_(1.2); f = 200 + 700 * (t / 1.2) ** 2; n = lp(rng.standard_normal(len(t)), .2) * .3; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + n) * (t / 1.2) ** 2
def thunder():
    t = t_(2.6); n = lp(lp(rng.standard_normal(len(t)), .03), .05) * 9
    crack = np.zeros(len(t)); crack[:int(.12 * SR)] = rng.standard_normal(int(.12 * SR)) * np.exp(-np.arange(int(.12 * SR)) / (.03 * SR)) * .6
    return (n * np.exp(-t * 1.4) * (1 + .5 * np.sin(2 * np.pi * 3 * t)) + crack)
def chime(): t = t_(1.8); return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in [(784, 2.2), (1175, 2.8), (1568, 3.5)]) * .35

FX = dict(whoosh=whoosh, pop=pop, thud=thud, boing=boing, sparkle=sparkle, riser=riser, thunder=thunder, chime=chime)
norm = lambda w: re.sub(r"[^a-z0-9']", '', w.lower())
def find(phrase, nth):
    p = [norm(x) for x in phrase.split()]; hits = 0
    for i in range(len(W) - len(p) + 1):
        if all(norm(W[i + k]['word']) == p[k] for k in range(len(p))):
            hits += 1
            if hits == nth: return i, i + len(p) - 1
    raise SystemExit(f'cue phrase not found: {phrase!r}')

mix = np.zeros((int(dur * SR), 2))
placed = []
for name, phrase, nth, off in cfg['cues']:
    a, b = find(phrase, nth)
    at = (W[b]['start'] if name in ('pop', 'thud', 'boing', 'sparkle', 'chime') and len(phrase.split()) > 1 else W[a]['start']) + off
    if name == 'riser': at = W[a]['start'] + off
    x = FX[name](); x = x / (np.abs(x).max() + 1e-9) * {'thunder': .8, 'riser': .45, 'whoosh': .5}.get(name, .6)
    s0 = max(0, int(at * SR)); seg = x[:len(mix) - s0]
    pan = .5 + .15 * np.sin(len(placed) * 1.7)
    mix[s0:s0 + len(seg), 0] += seg * (1 - pan) * 1.4; mix[s0:s0 + len(seg), 1] += seg * pan * 1.4
    placed.append({'fx': name, 'word': phrase, 'at': round(at, 2)})
peak = np.abs(mix).max(); mix *= min(1, 10 ** (-3 / 20) / max(peak, 1e-9))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print(json.dumps({'out': OUT, 'seconds': round(len(mix) / SR, 3), 'video_seconds': round(dur, 3), 'cues': len(placed), 'peak_dbfs': round(20 * np.log10(np.abs(mix).max()), 2), 'placed': placed[:4]}))
