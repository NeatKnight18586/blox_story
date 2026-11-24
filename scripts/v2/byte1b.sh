#!/bin/sh
# scripts/v2/byte1b.sh <baseline dir> — render the 1B fixture (every 30th frame, 270×480, aa 0) and compare PNG bytes with a baseline render
set -e; out=renders/kit2/byte1b; rm -rf $out
node scripts/v2/render.js --spec engine/fixtures/cine/episode.json --out $out --width 270 --height 480 --every 30 --aa 0 > /dev/null
n=0; s=0; for f in "$1"/frames/*.png; do n=$((n+1)); cmp -s "$f" "$out/frames/$(basename $f)" && s=$((s+1)); done; echo "byte-identical 1B fixture: $s/$n"
