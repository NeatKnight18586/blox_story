#!/usr/bin/env python3
"""Previz mix: the VO (never trimmed or stretched) + the synthesized click (sfx.py, 40 ms, peak −6 dBFS) at each "Click" onset.
Usage: mix-c.py <vo.wav> <out.wav> <onset s>…  Prints where each click's first sample landed (frames at 24 fps)."""
import sys, subprocess, json
import numpy as np
sys.path.insert(0, 'scripts/v2'); import sfx as S
vo_path, out, onsets = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3:]]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', vo_path, '-f', 'f32le', '-ac', '1', '-ar', str(S.SR), '-'], capture_output=True, check=True).stdout
vo = np.frombuffer(raw, np.float32).copy(); mix = vo.copy(); click = S.synth('click') * 10 ** (S.CLICK_PEAK_DBFS / 20)
for t in onsets: i = int(round(t * S.SR)); mix[i:i + len(click)] += click[:len(mix) - i]
S.write_wav(out, np.clip(mix, -1, 1)); d = np.abs(mix - vo); hits = []
for t in onsets: i0 = int(round((t - .1) * S.SR)); i = i0 + int(np.argmax(d[i0:i0 + int(.2 * S.SR)] > 1e-4)); hits.append({'onset': t, 'clickStart': round(i / S.SR, 4), 'frameErr': round(i / S.SR * 24) - round(t * 24)})
print(json.dumps({'mix': out, 'durationS': round(len(mix) / S.SR, 3), 'voDurationS': round(len(vo) / S.SR, 3), 'clicks': hits, 'clickMs': float(len(click) / S.SR * 1000), 'clickPeakDbfs': round(float(20 * np.log10(np.abs(click).max())), 2)}))
