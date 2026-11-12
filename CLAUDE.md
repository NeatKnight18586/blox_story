# CLAUDE.md — blox_story v2 engine

Source of truth: `docs/V2_BRIEF.md` (owner's brief). Progress and decisions: `PROGRESS.md`.

## Session rules (brief §0)
- One session block from §12 per session, then stop. Read only §0–§3, your block, the sections it names, and `PROGRESS.md`.
- Plan (≤ 15 lines) in `PROGRESS.md` before coding; afterwards append what was built, commands, numbers, decisions, open problems (≤ 40 lines).
- A block is done only when every Done-when check has been run and passes. Uncovered choice → cheaper option, logged under Decisions.
- Review material goes to `review/<slug>/` on the branch + the PR (owner works from an iPad).

## Ground rules (brief §2)
- `stories/names100/**`, `production/render.js` and existing module behaviour are frozen; extend through new opt-in options only.
- `npm test` (node-only) stays green. Do not run the legacy `test:*` browser suites.
- Never read `evidence/`. Never open single frame PNGs: look at contact sheets ≤ 1600 px (`scripts/v2/sheet.py`).
- Determinism = unit tests on pure functions + a 10-frame re-render spot check. No SHA receipts or manifests.
- Branch `claude/engine-v2`. Commit source, `cues.json`, the voice file and `review/<slug>/` only; never `stories/*/build/` or `renders/`.
- No new frameworks. Tests only for new pure logic.
- Brand: never draw/show the Roblox logo or wordmark; never imply official. All hair, faces, outfits, accessories are our own.

## Commands
- `npm run v2:preflight`: environment check, one JSON object (~3 s).
- `npm run v2:test`: pure-logic tests (`tests/v2/`).
- `npm run v2:bench -- --spec <episode.json>` or `--story <slug>`: triangles, calls, s/frame per shot (PASS ≤ 50k tris, ≤ 0.45 s/frame).
- `npm run v2:render -- --spec <episode.json> --out <dir>` or `--story <slug>`: frames with per-shot cache, `progress.json`.
- `python3 scripts/v2/sheet.py <frames dir|video> [--frames a,b] [--labels shots.json] [--stats]`: contact sheets.

## Folder map
- `engine/`: `episode.html` + `episode.js` (data-driven renderer; `window.__episode.renderFrame(n, w, h)`), `camera.js` (pure `sampleCamera`, moves, easing, `openHit`, speed metric), `fixtures/` (test clips).
- `avatar-style/` (S2), `parts/` (S3), `captions/pop-shorts-v2.json` (S4): v2 libraries, opt-in.
- `scripts/v2/`: `browser.js` (BLOX_CHROME → PATH chrome → Playwright), `preflight.js`, `render.js`, `bench.js`, `sheet.py`.
- `stories/<slug>/`: `script.txt`, `voice.flac`, `cues.json`, `episode.json`, `world.js` (`build/` ignored).
- `review/<slug>/`: gate material for the owner.
- Legacy (frozen or reference only): `avatar/`, `production/`, `stories/names100/`, `studio/` (Dice Town / Shortwick toolkit).

## Library index (one line per reusable addition; grows every episode)
- camera moves: push, pull, orbit, track, crane, whip, gamecam, static-drift; eases: linear, inCubic, outCubic, inOutCubic, inOutSine, outBack.
