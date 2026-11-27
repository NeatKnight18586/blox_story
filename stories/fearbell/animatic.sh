#!/usr/bin/env bash
# stories/fearbell/animatic.sh — the Fear Bell ANIMATIC stage, one command per step (run from the repo root; stops at the first failure).
# Gates are never loosened: v2:plan exit 0 (subjects + story-prop inserts restored), v2:seek (seek-safe dome) and v2:stability PASS before any render.
set -euo pipefail
S=fearbell; B=stories/$S/build; R=renders/v2/$S-animatic
node scripts/v2/brief2spec.js --story $S                       # BRIEF.md → episode.json base (kept in build/brief2spec.json)
node stories/$S/previs.js                                       # blocking overrides (cameras, marks, creatures, props, clock, gaps, row-53 split)
node scripts/v2/plan.js --story $S                              # plan gate (§5.2): exit 1 on any error
node scripts/v2/fgleak.js --spec stories/$S/episode.json --out review/$S/fgleak.json
node scripts/v2/seekcheck.js --spec engine/fixtures/fearbell/seek-dome.json --frames 30,70,120 --fresh --out review/$S/seek-dome.json   # 3 dome frames cold vs in sequence
node scripts/v2/stability.js --story $S                         # camera-nudge flicker gate (≤ 0.30 %)
python3 scripts/v2/memegap.py --story $S                        # G1–G3 meme gaps → build/cues-gapped.json, voice-gapped.wav, memegap.json
node stories/$S/previs.js --gapped                              # the spec on the gapped timeline (all row times shifted) → build/episode-gapped.json
node scripts/v2/render.js --spec $B/episode-gapped.json --out $R --width 270 --height 480 --every 2 --aa 0
python3 scripts/v2/captions.py --story $S --spec $B/episode-gapped.json --cues $B/cues-gapped.json --style v7 --out $B/captions-v7.ass
python3 scripts/v2/assemble.py --story $S --frames $R/frames --captions $B/captions-v7.ass --out review/$S/animatic.mp4 --animatic --spec $B/episode-gapped.json
python3 stories/$S/phonesheet.py review/$S/animatic.mp4 $B/episode-gapped.json review/$S/phone-390
