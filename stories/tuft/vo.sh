#!/bin/sh
# vo.sh <part|a-b> [tag]  -> renders the sync frames (270x480, cached) + review/tuft/vo-sheet-<tag>.png
export BLOX_CHROME=${BLOX_CHROME:-/opt/pw-browsers/chromium-1243/chrome-linux64/chrome}
P=$1; T=${2:-$1}; F=$(python3 stories/tuft/lock.py frames $P)
node stories/tuft/frames.js --spec stories/tuft/episode.json --out /tmp/claude-0/s/vo-$T --width 270 --height 480 --aa 0 --frames $F 2>&1 | tail -1
mkdir -p review/tuft && python3 stories/tuft/lock.py sheet $P /tmp/claude-0/s/vo-$T/frames review/tuft/vo-sheet-$T.png
