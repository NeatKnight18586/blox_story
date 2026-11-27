#!/usr/bin/env bash
# stories/fearbell/fixsheet.sh <rows,…> [out.png] — FINAL staging-fix sheet: 3 frames per row (a start / b MUST SEE / c end) → review/fearbell/final-fix*.png
set -euo pipefail
B=stories/fearbell/build; OUT=${2:-review/fearbell/final-fix.png}
python3 stories/fearbell/fixsee.py "$1"
rm -rf $B/vofixcells
node stories/fearbell/vorender.js --see $B/see-fix.json --w 360 --h 640 2>&1 | grep -v "^page errors" || true
python3 stories/fearbell/vosheet.py $B/vo $B/vofixcells $B/see-fix.json
python3 scripts/v2/sheet.py $B/vofixcells --every-sec 0.0001 --fps 1 --labels $B/shots.json --max 6 --out "$OUT"
