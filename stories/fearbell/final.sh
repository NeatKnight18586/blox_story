#!/usr/bin/env bash
# stories/fearbell/final.sh — the Fear Bell FINAL stage, one command per step (run from the repo root; stops at the first failure).
# The farm workflow renders stories/<slug>/episode.json on the raw VO (no meme gaps, no CC0 cache restore), so the final uses the documented
# local fallback (v2:render --final) on the GAPPED spec with the CC0 set (python3 scripts/v2/fetch-assets.py → renders/cache/assets, needs
# api.polyhaven.com + dl.polyhaven.org). Gates are never loosened: plan exit 0, fgleak, v2:seek and v2:stability PASS before the render.
set -euo pipefail
S=fearbell; B=stories/$S/build; R=renders/v2/$S-final; M=renders/v2/$S-master.mp4
node scripts/v2/brief2spec.js --story $S && node stories/$S/previs.js
node scripts/v2/plan.js --story $S
node scripts/v2/fgleak.js --spec stories/$S/episode.json --out review/$S/fgleak.json
node scripts/v2/seekcheck.js --spec engine/fixtures/fearbell/seek-dome.json --frames 30,70,120 --fresh --out review/$S/seek-dome.json
node scripts/v2/stability.js --story $S
python3 scripts/v2/memegap.py --story $S                       # G1–G3 → build/cues-gapped.json, voice-gapped.wav, memegap.json
node stories/$S/previs.js --gapped                             # → build/episode-gapped.json (end = voice + 0.5 s)
test -f renders/cache/assets/manifest.json || python3 scripts/v2/fetch-assets.py   # CC0 (look B)
node scripts/v2/tex4.js; node scripts/v2/matcap4.js
node scripts/v2/render.js --spec $B/episode-gapped.json --out $R --final --workers 3
python3 scripts/v2/captions.py --story $S --spec $B/episode-gapped.json --cues $B/cues-gapped.json --style v7 --out $B/captions-v7.ass
python3 scripts/v2/capcheck.py --story $S --spec $B/episode-gapped.json                # every script word in the .ass, in order, onsets ≤ 80 ms, none during a meme clip
python3 scripts/v2/assemble.py --story $S --frames $R/frames --captions $B/captions-v7.ass --spec $B/episode-gapped.json --out $M --proxy review/$S/final-review.mp4
node scripts/v2/stability.js --story $S
python3 scripts/v2/qc.py --story $S --video $M --frames $R/frames --captions $B/captions-v7.ass --out review/$S/qc.json
python3 stories/$S/gapvol.py $M                                # mean volume inside each meme gap → review/$S/gapvol.json
