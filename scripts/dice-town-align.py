"""Forced-align the Dice Town narration script to the narration WAV (offline).

Usage (needs `pip install pocketsphinx`, which bundles its en-us model; no network):
  python3 scripts/dice-town-align.py path/to/narration.wav [evidence/dice-town-film/word-timings.json]
Writes one entry per script word: {"word", "start", "end"} in seconds. Only timings
are written; the audio itself never leaves the machine or enters Git.
"""
import json
import re
import subprocess
import sys

from pocketsphinx import Decoder

WAV = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'evidence/dice-town-film/word-timings.json'
CUES = json.load(open('stories/dice-town/Dice_Town_117s_Animatic_Plan.json'))['audio_cues']
script_words = ' '.join(c['transcript'] for c in CUES).split()          # as displayed
norm = [re.sub(r"[^a-z']", '', w.lower().replace('’', "'")).strip("'") for w in script_words]

dec = Decoder(samprate=16000, bestpath=False, loglevel='ERROR', beam=1e-80, wbeam=1e-60, pbeam=1e-80)
# Story names/forms missing from the stock dictionary (ARPAbet).
for w, phones in {"pip's": 'P IH P S'}.items():
    if dec.lookup_word(w) is None: dec.add_word(w, phones, True)
missing = [w for w in sorted(set(norm)) if w and dec.lookup_word(w) is None]
if missing:
    sys.exit(f'not in dictionary: {missing}')

pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', WAV, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
dec.set_align_text(' '.join(w for w in norm if w))
dec.start_utt(); dec.process_raw(pcm, full_utt=True); dec.end_utt()
# Word segmentation of the forced alignment (10 ms frames).
words = [(re.sub(r'\(\d+\)$', '', s.word), s.start_frame / 100, (s.end_frame + 1) / 100) for s in dec.seg() if s.word not in ('<s>', '</s>', '<sil>', '[NOISE]')]
aligned = [w for w in norm if w]
if [w for w, *_ in words] != aligned:
    sys.exit(f'alignment mismatch: got {len(words)} words for {len(aligned)}')
out = []
for disp, (name, st, en) in zip([d for d, n in zip(script_words, norm) if n], words):
    out.append({'word': disp, 'start': round(st, 2), 'end': round(en, 2)})
assert all(a['start'] <= b['start'] for a, b in zip(out, out[1:])), 'non-monotonic'
json.dump(out, open(OUT, 'w'), indent=0)
print(json.dumps({'words': len(out), 'first': out[0], 'last': out[-1], 'out': OUT}))
