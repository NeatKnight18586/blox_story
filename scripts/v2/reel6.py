#!/usr/bin/env python3
"""scripts/v2/reel6.py — a silent review reel from rendered frames (P5 proof reel; no voice, no captions, no grade).
  python3 scripts/v2/reel6.py --frames <dir> --spec <episode.json> --out <reel.mp4> [--scale 2] [--max-mb 10]
Frames → motion blur inside the spec's blur ranges (assemble.blur_ranges / blur_chain, ffmpeg tmix) → Lanczos ×scale → x264 (CRF stepped until ≤ max-mb)."""
import argparse, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from assemble import blur_ranges, blur_chain

def graph(ranges, scale):
    g = blur_chain(ranges) if ranges else 'null'
    return g + f',scale=iw*{scale}:ih*{scale}:flags=lanczos,format=yuv420p'

if __name__ == '__main__':
    a = argparse.ArgumentParser(); a.add_argument('--frames', required=True); a.add_argument('--spec', required=True); a.add_argument('--out', required=True)
    a.add_argument('--scale', type=int, default=2); a.add_argument('--max-mb', type=float, default=10); a.add_argument('--fps', type=int, default=30); o = a.parse_args()
    spec = json.load(open(o.spec)); rng = blur_ranges(spec, o.fps)
    for crf in (20, 23, 26, 29, 32):
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(o.fps), '-i', os.path.join(o.frames, 'frame-%05d.png'), '-vf', graph(rng, o.scale),
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', o.out], check=True)
        mb = os.path.getsize(o.out) / 1e6
        if mb <= o.max_mb: break
    print(json.dumps({'out': o.out, 'blurRanges': rng, 'crf': crf, 'mb': round(mb, 2)}))
