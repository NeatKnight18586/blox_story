# CLAUDE.md — blox_story engine
Read RULEBOOK.md first, then only the files your prompt names. Old briefs/specs are in docs/archive/ (reference only).

- Find code via CODEMAP.md (`npm run codemap`) + `grep -n`; reusable pieces: docs/LIBRARY.md (add one line per new piece).
- Frozen: `stories/names100/**`, `production/render.js`, existing module behaviour; extend via new opt-in options. `npm test` stays green.
- Never read `evidence/`; look only at contact sheets ≤ 1600 px (`scripts/v2/sheet.py`). No labels on people/objects (Season 1).
- Commit source, `cues.json`, the voice file and `review/<slug>/`; never `stories/*/build/` or `renders/`. Brand: no Roblox logo.

## Folder map
- `engine/`: episode.html/.js renderer, timeline.js, plancheck*.js, camera.js, camtpl.js (camera templates), r6.js (R6 rig), look.js.
- `avatar-style/` actors, faces, hair, clothing; `parts/` primitives, materials, terrain, vegetation, props, `parts/locations/` saved sets.
- `cast/` hero + troupe data; `beasts/` creature specs; `scripts/v2/` pipeline tools; `tests/v2/` pure-logic tests.
- `stories/<slug>/`: script.txt, voice.flac, cues.json, episode.json, world.js (`build/` ignored); `review/<slug>/` owner review material.
- Legacy/frozen: `avatar/`, `production/`, `studio/`, `stories/names100/`. State: PROGRESS.md (this phase), docs/RESULTS.md, docs/season1/STATE.md.
