"""Forced-align an episode's narration script to the owner's voice-over WAV (offline).

Usage (needs `pip install pocketsphinx`; it bundles the en-us model, no network):
  python3 scripts/episode-align.py <episode> path/to/narration.wav
Reads stories/<episode>/SCRIPT.md (spoken text = everything after the first '---', minus
[beat] lines) and optional stories/<episode>/pronounce.json ({"word": "ARPABET"}), writes
stories/<episode>/word-timings.json: one {"word", "start", "end"} per spoken word. Only
timings are written; the audio never leaves the machine or enters Git. The episode runner
picks the file up automatically and every shot snaps to the real words.
"""
import json
import os
import re
import subprocess
import sys

from pocketsphinx import Decoder

EP, WAV = sys.argv[1], sys.argv[2]
base = f'stories/{EP}'
md = open(f'{base}/SCRIPT.md').read()
body = '\n'.join(re.split(r'^---\s*$', md, flags=re.M)[1:])
spoken = '\n'.join(l for l in body.split('\n') if not re.match(r'^\s*\[', l))
script_words = spoken.split()
norm = [re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'")).strip("'") for w in script_words]

dec = Decoder(samprate=16000, bestpath=False, loglevel='ERROR', beam=1e-80, wbeam=1e-60, pbeam=1e-80)
extra = json.load(open(f'{base}/pronounce.json')) if os.path.exists(f'{base}/pronounce.json') else {}
for w, phones in extra.items():
    if dec.lookup_word(w) is None: dec.add_word(w, phones, True)
missing = [w for w in sorted(set(norm)) if w and dec.lookup_word(w) is None]
if missing: sys.exit(f'not in dictionary (add to {base}/pronounce.json): {missing}')
if len(sys.argv) > 3 and sys.argv[3] == '--check': print('dictionary OK'); sys.exit()

pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', WAV, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
dec.set_align_text(' '.join(w for w in norm if w))
dec.start_utt(); dec.process_raw(pcm, full_utt=True); dec.end_utt()
words = [(re.sub(r'\(\d+\)$', '', s.word), s.start_frame / 100, (s.end_frame + 1) / 100) for s in dec.seg() if s.word not in ('<s>', '</s>', '<sil>', '[NOISE]')]
aligned = [w for w in norm if w]
if [w for w, *_ in words] != aligned:
    sys.exit(f'alignment mismatch: got {len(words)} words for {len(aligned)} (does the recording follow SCRIPT.md word for word?)')
out = [{'word': d, 'start': round(st, 2), 'end': round(en, 2)} for d, (_, st, en) in zip([d for d, n in zip(script_words, norm) if n], words)]
assert all(a['start'] <= b['start'] for a, b in zip(out, out[1:])), 'non-monotonic'
json.dump(out, open(f'{base}/word-timings.json', 'w'), indent=0)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', WAV], capture_output=True, text=True).stdout)
print(json.dumps({'words': len(out), 'audio_seconds': round(dur, 3), 'first': out[0], 'last': out[-1], 'out': f'{base}/word-timings.json'}))
