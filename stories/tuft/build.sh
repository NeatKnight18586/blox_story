#!/bin/sh
# stage.json -> BRIEF notes -> spec -> patch  (episode tool)
set -e
python3 stories/tuft/stage.py && npm run ep -- --story tuft --stage spec 2>&1 | tail -2 && python3 stories/tuft/specpatch.py
