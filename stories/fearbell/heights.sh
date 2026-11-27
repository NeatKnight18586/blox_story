#!/usr/bin/env bash
# stories/fearbell/heights.sh [frames=145,153,161,170,185] [out.png] — HEIGHTS FIX sheet: row 6 on the GAPPED timeline (the final's), 5 frames → review/fearbell/final-fix-heights.png
set -euo pipefail
S=fearbell; B=stories/$S/build; F=${1:-145,153,161,170,185}; OUT=${2:-review/$S/final-fix-heights.png}; R=$B/heights
node stories/$S/previs.js >/dev/null && node stories/$S/previs.js --gapped >/dev/null
rm -rf $R; for f in ${F//,/ }; do node scripts/v2/render.js --spec $B/episode-gapped.json --out $R/$f --width 360 --height 640 --from $f --to $((f+1)) >/dev/null; done
python3 - "$F" "$R" "$OUT" <<'PY'
import sys, os
from PIL import Image, ImageDraw
F = [int(x) for x in sys.argv[1].split(',')]; R, OUT = sys.argv[2], sys.argv[3]
tags = ['launch', 'ride-up', 'cling', 'scream peak', 'end of row']
W, H = 360, 640; im = Image.new('RGB', (W * len(F), H + 28), '#111'); d = ImageDraw.Draw(im)
for i, f in enumerate(F):
    im.paste(Image.open(f'{R}/{f}/frames/frame-{f:05d}.png').convert('RGB'), (i * W, 28)); d.text((i * W + 6, 6), f"{tags[i] if i < len(tags) else ''}  f{f}  {f / 24:.2f}s", fill='#ffd84a')
im = im.resize((1500, int(im.size[1] * 1500 / im.size[0]))); im.save(OUT); print(OUT, im.size)
PY
