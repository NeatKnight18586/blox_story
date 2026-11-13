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
- Determinism = unit tests on pure functions + a 10-frame re-render spot check. No SHA receipts or manifests. No new frameworks; tests only for new pure logic.
- Branch `claude/engine-v2`. Commit source, `cues.json`, the voice file and `review/<slug>/` only; never `stories/*/build/` or `renders/`.
- Brand: never draw/show the Roblox logo or wordmark; never imply official. All hair, faces, outfits, accessories are our own.

## Commands
- `npm run v2:preflight`: environment check, one JSON object (~3 s) · `npm run v2:test`: pure-logic tests (`tests/v2/`).
- `npm run v2:bench -- --spec <episode.json>` or `--story <slug>`: triangles, calls, s/frame per shot (PASS ≤ 50k tris, ≤ 0.45 s/frame).
- `npm run v2:stability -- --story <slug>` or `--spec <file>`: camera-nudge flicker gate (4 mm, ≤ 0.30 %) → `review/<slug>/stability*.json`. **Must pass before any animatic/final is shown.**
- `npm run v2:align -- --story <slug> [--ref cues.json]` (voice → `build/cues.json`) · `npm run v2:plan -- --story <slug>` (§5.2 gate, exit 1 on error → `review/<slug>/plan.json`) · `npm run v2:render -- --spec <episode.json> --out <dir> [--final | --width 270 --height 480 --every 2 --aa 0]` (cached frames, `progress.json`; `--final` = native 1440×2560 + AA, the A2 delivery preset).
- `node scripts/v2/avatar-sheet.js` / `python3 scripts/v2/world-sheet.py`: cast sheet + 390 px phone shot / world stills + luma stats → `review/nobody/`.
- `python3 scripts/v2/sheet.py <frames dir|video> [--frames a,b] [--labels shots.json] [--stats]`: contact sheets; `look-ab.py`: before/after sheets.
- `python3 scripts/v2/captions.py --story <slug> --spec <episode.json> [--until s] --out <file.ass>`: pop captions from `cues.json`.
- `python3 scripts/v2/assemble.py --story <slug> --frames <dir> | --video <mp4> --captions <ass> --out <master.mp4> [--proxy review/<slug>/final-review.mp4] [--animatic] [--no-hold]`: A2 highlight-only grade, captions after it, −14 LUFS/TP −1.5 voice, hold; uncapped 1440 master (CRF 14, ≥ 16 Mb/s floor) + 1080 proxy ≤ 45 MB (1080 frames = recorded fallback, upscaled before the grade); `--animatic` → 540×960 ≤ 10 MB; no SFX.
- `npm run v2:qc -- --story <slug> --video <master>`: final gate (ffprobe/loudness, SSIM/PSNR, grade sharpness, stone ΔE, `qc-crops.png`) → `review/<slug>/qc.json`; **must pass before a final reaches the owner**. Masters never go in git: prerelease or sent directly, linked in `review/<slug>/DELIVERY.md`. Farm: `.github/workflows/render.yml` (dispatch or `stories/<slug>/render.request`). New episode: `/new-episode <slug> [E1|E2]`.

## Folder map
- `engine/`: `episode.html` + `episode.js` (data-driven renderer; `__episode.renderFrame/inspectFrame`), `timeline.js` (shots cut at `at` s, step/ramp keys), `plancheck.js` (pure §5.2 rules), `camera.js` (pure `sampleCamera`, moves, `openHit`, speed metric).
- `avatar-style/`: v2 actor (`body.js`), `faces2.js`, `hair.js`, `clothing.js`, `accessories.js`, `tools.js`. `engine/poses.js`, `overhead.js`, `actors.js`, `studio.html` (lookdev). Legacy `avatar/` stays frozen.
- `parts/`: `materials.js` (256 px patterns + normal maps), `parts.js` (primitives, world UVs), `build.js` (placement, instance, `ribbon`, mergeByDistrict + contact gradient, anchors), `ambient.js` (movers), `props.js` (shared story props: sword, ring/hero stones). `engine/look.js` (time-of-day presets, per-shot snapped shadows).
- Worlds (A1): export `groundY(x, z)` + `LAYER` (≥ 0.05 apart) and build paths/streets with `B.ribbon`; everything standing takes `groundY`.
- `engine/effects.js` (§5.3 effects, pure in t). `captions/pop-shorts-v2.json` + `CAPTION_STYLE_V2.md`. Docs: `PUBLISHING.md`, `STORY_BIBLE.md`, `SERIES_LOG.md`.
- `scripts/v2/`: `browser.js`, `preflight.js`, `align.py`, `plan.js`, `render.js`, `bench.js`, `stability.js` + `flicker.js`, `sheet.py`, `captions.py`, `assemble.py`.
- `stories/<slug>/`: `script.txt`, `voice.flac`, `cues.json`, `episode.json`, `world.js` (`build/` ignored); `review/<slug>/`: gate material for the owner.
- Legacy (frozen or reference only): `avatar/`, `production/`, `stories/names100/`, `studio/` (Dice Town / Shortwick toolkit).

## Library index (one line per reusable addition; grows every episode)
- camera moves: push, pull, orbit, track, crane, whip, gamecam, static-drift; eases: linear, inCubic, outCubic, inOutCubic, inOutSine, outBack.
- faces: smile, neutral, determined, terrified, smug, sad, crying, shout, gasp, sleep.
- hair: short_messy, side_swept, spiky, bowl, long_straight, ponytail, twin_buns, braids, curly_blocks, bald.
- outfits: tunic, armor, robe, apron, royal, peasant. accessories: crown, helmet, hood, strawHat, scarf, cape, backpack. tools: sword, hammer (stone), torch, bread.
- poses: idle, look_react, walk, run, jump, fall, climb, toolHold, toolSwing, pull, pullOne, lift, raise, hammerHold, point, cheer, recoil, trip, shiver, lookUp, sit, sleep, wave; ambientPose(seed). dragon (`avatar-style/dragon.js`, ≤ 4k tris): perch, fly, roar, breathe, lower, turn, flinch, cry, flee.
- overlays: name tag (pop, screen cap), stat (number/bar/tile), chat bubble (≤ 4 words). cast timelines: `marks`, `visible`, `tools`/`toolsLeft`, `stat`, `bubble`, `tags`, `faces`, `keys`; `worldState` keys → `world.setState`.
- patterns: plastic, studs, grass, sand, water, glass, neon, metal, moss (flat); brick, cobble, slate, woodPlanks, thatch, rock, dirt (relief, normal-mapped). looks: day, goldenHour, night, storm, fireNight.
- props: sword (hero/ring), ringStone ×3 (+moss), heroStone (3 crack stages), instanceGroup, mergeParts; small props (`smallProp(name, seed)`, ≤ 400 tris): barrel, crate, sack, lantern, torch, bench, fence, cart, sign, tree ×3, bush, rock ×3, cloud, banner. ground: ribbon, groundY/LAYER, blobs, tufts.
- movers: flag, smoke, birds, flame, spinner, walkers, floaters.
- effects: fadeColor, flash, ghost, glow, particles (sparkle, dust, embers, confetti, fire, stars; directed `dir`/`cone` streams), melt, squash, shake, timeOfDay; per-shot `tagMaxFrac`, `captionY`.
