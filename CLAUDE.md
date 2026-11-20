# CLAUDE.md — blox_story v2 engine

Source of truth: `docs/V2_BRIEF.md` (owner's brief). Progress and decisions: `PROGRESS.md`. **Episode format (length,
end, last line, final shot, hero-first): `docs/season1/FORMAT_V6.md`**; new specs are `"format": 6`.

## Session rules (brief §0)
- One session block from §12 per session, then stop. Read only §0–§3, your block, the sections it names, and `PROGRESS.md`.
- Plan (≤ 15 lines) in `PROGRESS.md` before coding; afterwards append what was built, commands, numbers, decisions, open problems (≤ 40 lines).
- A block is done only when every Done-when check has been run and passes. Uncovered choice → cheaper option, logged under Decisions.
- Review material goes to `review/<slug>/` on the branch + the PR (owner works from an iPad).
- Acceptance (A5 §S): a self-score is never a gate. Every visual gate = (1) a measured check in code with a number and a pass
  line, (2) a before/after sheet at 390 px phone width, (3) a written list of the three weakest things visible in that sheet,
  before any score (empty list → look again). The owner decides the look; report what is weak, never round up. A measured
  check that still fails after two fix passes: stop and report the number; never loosen it.
- **Season 1: no labels** (owner rule, permanent; `docs/season1/SEASON_1.md` §2c): no name/role/AFK tags, chat bubbles, class cards
  or overhead tag/stat/card/icon UI on people or objects. Text only on real in-world objects (scoreboard, clock, note, sign,
  switch) and in captions. Default for `season: 1` (`engine/nolabels.js`); `v2:plan` fails it with `noLabels`.

## Ground rules (brief §2)
- `stories/names100/**`, `production/render.js` and existing module behaviour are frozen; extend through new opt-in options only.
- `npm test` (node-only) stays green. Do not run the legacy `test:*` browser suites.
- Never read `evidence/`. Never open single frame PNGs: look at contact sheets ≤ 1600 px (`scripts/v2/sheet.py`).
- Determinism = unit tests on pure functions + a 10-frame re-render spot check. No SHA receipts or manifests. No new frameworks; tests only for new pure logic.
- Branch `claude/engine-v2`. Commit source, `cues.json`, the voice file and `review/<slug>/` only; never `stories/*/build/` or `renders/`.
- Brand: never draw/show the Roblox logo or wordmark; never imply official. All hair, faces, outfits, accessories are our own.

## Commands
- `npm run v2:preflight`: environment check, one JSON object (~3 s) · `npm run v2:test`: pure-logic tests (`tests/v2/`).
- `npm run v2:bench -- --spec <episode.json>` or `--story <slug>`: triangles, calls, s/frame per shot (PASS ≤ 50k tris, ≤ 0.45 s/frame; Season 1 / v3 worlds ≤ 90k, ≤ 0.62 — owner Decision 4; the real gate is final render + assemble ≤ 3 h on the farm).
- `npm run v2:read -- --story <slug>`: owner readability checks on the rendered frames (face shown, nothing in front, subject stands out, insert object reads, something moves, Kit/building scale, plain-egg shading; static framing ≤ 3 s, moving ≤ 4.5 s) → `review/<slug>/read.json`, ERRORS (`engine/readcheck.js`, `episode.js readMeasure`).
- `npm run v2:stability -- --story <slug>` or `--spec <file>`: camera-nudge flicker gate (4 mm, ≤ 0.30 %) → `review/<slug>/stability*.json`. **Must pass before any animatic/final is shown.**
- `npm run v2:align -- --story <slug> [--ref cues.json]` (voice → `build/cues.json`) · `npm run v2:plan -- --story <slug>` (§5.2 gate, exit 1 on error → `review/<slug>/plan.json`) · `npm run v2:render -- --spec <episode.json> --out <dir> [--final | --width 270 --height 480 --every 2 --aa 0]` (cached frames, `progress.json`; `--final` = native 1440×2560 + AA, the A2 delivery preset).
- `node scripts/v2/avatar-sheet.js` / `python3 scripts/v2/world-sheet.py`: cast sheet + 390 px phone shot / world stills + luma stats → `review/nobody/`. A4: `node scripts/v2/hair-sheet.js` · `troupe-sheet.js` · `python3 scripts/v2/look-ab-s1.py` → `review/season1/`.
- A5 gates: `node scripts/v2/build-gates.js` (adult_f torso, flat ortho 390 px) → `build-gates.json`; `node scripts/v2/hair-gates.js` → `review/season1/hair-gates.json`; `node scripts/v2/look-gates.js --spec <f> [--night ids] [--framing] [--png f]` (night luma on silhouette masks, framing) → `look-gates-*.json`.
- P3 acting v6 (spec `acting: 6`; shot `actions` [{actor, verb, at: s | {word, nth}, intensity, target, facing, hold, face}], spec `talk`): `node scripts/v2/acting6-sheet.js` → `node scripts/v2/acting6-gates.js` → `review/acting6/` (verbs, cycles, demo.mp4, gates.json). Partners of hug / carry / comfort_kneel start ≤ 0.5 studs from their meeting mark or get a walk-in (`action.walkIn: false` → plan FAIL `partnerDistance`); two-actor poses are solved offline with `scripts/v2/acting6-solve.js` and frozen as data in `engine/acting6.js`.
- `python3 scripts/v2/sheet.py <frames dir|video> [--frames a,b] [--labels shots.json] [--stats]`: contact sheets; `look-ab.py`: before/after sheets.
- `python3 scripts/v2/captions.py --story <slug> --spec <episode.json> [--style v3] [--until s] --out <file.ass>`: pop captions from `cues.json` (v2 default for "Nobody"; Season 1 = spec `captionStyle: "pop-shorts-v3"`). `python3 scripts/v2/caption-phone.py` → `caption-v3-phone.png/.json` (cap ≥ 2.6 % on 390 px, inside the 58–74 % band).
- `python3 scripts/v2/assemble.py --story <slug> --frames <dir> | --video <mp4> --captions <ass> --out <master.mp4> [--proxy review/<slug>/final-review.mp4] [--animatic] [--no-hold]`: A2 highlight-only grade, captions after it, −14 LUFS/TP −1.5 voice, hold; uncapped 1440 master (CRF 14, ≥ 16 Mb/s floor) + 1080 proxy ≤ 45 MB (1080 frames = recorded fallback, upscaled before the grade); `--animatic` → 540×960 ≤ 10 MB; `--spec <episode.json>` mixes the auto-placed sfx (A4 §F; off with `"sfx": false`) and `music.mp3` if present.
- `npm run v2:qc -- --story <slug> --video <master>`: final gate (ffprobe/loudness, SSIM/PSNR, grade sharpness, stone ΔE, `qc-crops.png`) → `review/<slug>/qc.json`; **must pass before a final reaches the owner**. Masters never go in git: prerelease or sent directly, linked in `review/<slug>/DELIVERY.md`. Farm: `.github/workflows/render.yml` (dispatch or `stories/<slug>/render.request`). New episode: `/new-episode <slug> [E1|E2]`. **Season 1 loop: `/season [approve | notes: … | swap]`** (state in `docs/season1/STATE.md`; `python3 scripts/v2/season_state.py plan|set`).

## Folder map
- `engine/`: `episode.html` + `episode.js` (data-driven renderer; `__episode.renderFrame/inspectFrame`), `timeline.js` (shots cut at `at` s, step/ramp keys), `plancheck.js` (pure §5.2 rules), `camera.js` (pure `sampleCamera`, moves, `openHit`, speed metric).
- Faces v5 (`avatar-style/faces5.js`, default for body v5, `faceStyle 'v5'`; faces4 opt-in): the owner's 48-cell sheet as vector data (`faces5-data.js`), one preset per cell (`CELL_NAMES`, smile … dots), `ALIAS5` keeps every old name, custom `{brows,eyes,mouth,extras}` = cell names, TALK × .04/.08/.13; gate `node scripts/v2/face5-gates.js`.
- `avatar-style/`: v2 actor (`body.js`), `faces2.js`, `hair.js`, `clothing.js`, `accessories.js`, `tools.js`. `engine/poses.js`, `overhead.js`, `actors.js`, `studio.html` (lookdev). Legacy `avatar/` stays frozen.
- `parts/`: `materials.js` (256 px patterns + normal maps), `parts.js` (primitives, world UVs), `build.js` (placement, instance, `ribbon`, mergeByDistrict + contact gradient, anchors), `ambient.js` (movers), `props.js` (shared story props: sword, ring/hero stones). `engine/look.js` (time-of-day presets, per-shot snapped shadows).
- Worlds (A1): export `groundY(x, z)` + `LAYER` (≥ 0.05 apart) and build paths/streets with `B.ribbon`; everything standing takes `groundY`. A4 worlds also export `LOOK` (v3 sky/fog/env) and get `TR` terrain, `BI` biomes, `V` vegetation, `W` water, `look` in `build()`; examples `engine/fixtures/looktest/{egg,ragdoll}.js`, `engine/fixtures/tools/world.js`.
- A4 (Season 1): `parts/terrain.js`, `biomes.js`, `vegetation.js`, `water.js`, `landform.js`; `engine/crowd.js`, `ruleui.js`, `troupe.js`, `lumagate.js`; `avatar-style/hair4.js` (v4; `hair3.js` unused); `cast/troupe.json`.
- `engine/effects.js` (§5.3 effects, pure in t). `captions/pop-shorts-v2.json` + `CAPTION_STYLE_V2.md`. Docs: `PUBLISHING.md`, `STORY_BIBLE.md`, `SERIES_LOG.md`.
- `scripts/v2/`: `browser.js`, `preflight.js`, `align.py`, `plan.js`, `render.js`, `bench.js`, `stability.js` + `flicker.js`, `sheet.py`, `captions.py`, `assemble.py`; A4 §F/§I: `sfx.py` (set + placement), `audiocues.py` (→ `review/<slug>/audio-cues.md`), `scriptcheck.py --story <slug>` (FORMAT_V6 words, ≤ 12-word sentences, last line ≠ first, FK ≤ 6, card key nouns), `season_state.py`, `layout.js`.
- `stories/<slug>/`: `script.txt`, `voice.flac`, `cues.json`, `episode.json`, `world.js` (`build/` ignored); `review/<slug>/`: gate material for the owner.
- Legacy (frozen or reference only): `avatar/`, `production/`, `stories/names100/`, `studio/` (Dice Town / Shortwick toolkit).

## Library index
Library index: docs/LIBRARY.md (read only the lines a task needs; add one line per new reusable piece there).

## Story & brand (Season 1)
Recurring HERO (cast/hero.json) + re-costumed troupe (docs/season1/BRAND.md). Story rules: docs/season1/STORY_ENGINE.md · brand: BRAND.md · build input: EPISODE_BRIEF.md.
