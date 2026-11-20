#!/usr/bin/env python3
"""Pass E video check (runs in the farm assemble job and locally). Usage: verify-video.py <video.mp4> <frames per shard> [report.txt]
Fails (exit 1) on any black frame; reports exact-duplicate steps and the step size at every shard seam vs its neighbours."""
import sys, subprocess, numpy as np
v, per = sys.argv[1], int(sys.argv[2]); rep = sys.argv[3] if len(sys.argv) > 3 else 'seam-report.txt'; W, H = 108, 192
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-vf', f'scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
n = len(raw) // (W * H); f = np.frombuffer(raw[:n * W * H], np.uint8).reshape(n, W * H).astype(np.int16)
rows = np.r_[0:int(H * .55), int(H * .76):H]                # everything outside the caption band (58–74 % of the height)
pix = f.reshape(n, H, W)[:, rows, :].reshape(n, -1)
p99 = np.percentile(pix, 99, axis=1)                         # a black canvas has p99 ≈ 0 (captions excluded); a dark night shot still has lit objects
black = [int(i) for i in np.where(p99 < 8)[0]]; d = np.abs(np.diff(f, axis=0)).mean(1); dup = [int(i) for i in np.where(d == 0)[0]]
L = [f'frames {n}', f'black frames {len(black)}' + (f': first {black[:12]}' if black else ''), f'exact-duplicate steps {len(dup)}' + (f': first {dup[:12]}' if dup else ''),
     f'median step {np.median(d):.3f}, p99 {np.percentile(d, 99):.2f}']
for s in range(per, n, per):
    nb = np.r_[d[max(0, s - 4):s - 1], d[s + 1:s + 4]]
    L.append(f'seam {s - 1}->{s} ({s / 24:.3f} s): step {d[s - 1]:.2f}, neighbours median {np.median(nb):.2f}, duplicate {"YES" if d[s - 1] == 0 else "no"}')
open(rep, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); sys.exit(1 if black else 0)
