#!/usr/bin/env bash
# Mux the private VO + synthesized clicks (no music) into the silent master from the tapcap-ep01 farm run. Never committed: vo.wav and the output stay local.
# Usage: mux-final.sh <final-video-silent.mp4> <out final.mp4>
set -euo pipefail
V=$1; O=$2; VO=campaigns/tapcap/ep01-rarity/vo/vo.wav; MIX=$(mktemp --suffix=.wav)
python3 campaigns/tapcap/scripts/mix-c.py "$VO" "$MIX" 36.148 68.471 69.172
ffmpeg -v error -y -i "$V" -i "$MIX" -map 0:v -map 1:a -c:v copy -af volume=-1.5dB -c:a aac -b:a 256k -ar 48000 -ac 2 -t 75.16 -movflags +faststart "$O"
