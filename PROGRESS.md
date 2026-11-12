# PROGRESS — blox_story v2 engine (`docs/V2_BRIEF.md` is the source of truth)

## Session 1: Foundations — plan
1. Save the brief verbatim to `docs/V2_BRIEF.md`; add `CLAUDE.md` (rules §0+§2, commands, folder map); `.gitignore` for `stories/*/build/` and caches.
2. Folder skeleton: `engine/ avatar-style/ parts/ scripts/v2/ review/` (+ `.gitkeep` where empty).
3. `scripts/v2/browser.js`: `$BLOX_CHROME` → `google-chrome`/`chromium` on PATH → Playwright bundled; SwiftShader args.
4. `scripts/v2/preflight.js`: browser + WebGL, ffmpeg filters, Python modules, network reachability, CPU/RAM → one JSON (~10 s).
5. `engine/camera.js`: pure `sampleCamera(shot, localT, actorPositions)`; moves push/pull/orbit/track/crane/whip/gamecam/static-drift, easing, seeded drift, `openHit` (frames 0–8 of episode frame 0 only), speed-cap metric. Tests in `tests/v2/` (`npm run v2:test`).
6. `engine/episode.html` + `episode.js`: data-driven page, one legacy avatar on a ground plate; `renderFrame(n)` pure, returns triangles/calls.
7. `scripts/v2/render.js` (per-shot cache + `build/progress.json`), `scripts/v2/bench.js` (8 frames/shot, triangles, calls, s/frame), `scripts/v2/sheet.py` (1-fps sheets ≤ 60 cells, ≤ 1600 px, `--stats`).
8. Fixture: 3 s / 8-move test clip; render through system Chrome, 1-fps + per-shot sheets, look at them.
9. Checks: `npm test`, `npm run v2:test`, `npm run v2:preflight`; open the PR (base `claude/lucid-brahmagupta-jg9ad9`, where the studio work lives; `main` is 65 commits behind).

## Session 1: Foundations — report (2026-11-12)
**Built:** `docs/V2_BRIEF.md` (verbatim), `CLAUDE.md` (36 lines), this file, `.gitignore` (`stories/*/build/`, `.cache/`), skeleton `engine/ avatar-style/ parts/ review/`;
`scripts/v2/browser.js`, `preflight.js`, `render.js`, `bench.js`, `sheet.py`; `engine/camera.js`, `engine/episode.html` + `episode.js`, `engine/fixtures/eight-moves.json`; `tests/v2/camera.test.js`.
`stories/nobody/{script.txt, voice.flac, cues.json}` committed first (owner's files; FLAC 44.1 kHz/16-bit, 119.722086 s, identical to `cues.json` duration).

**Run:** `npm run v2:preflight` · `npm run v2:test` · `npm run v2:render -- --spec engine/fixtures/eight-moves.json --out renders/v2/eight-moves` · `npm run v2:bench -- --spec engine/fixtures/eight-moves.json` · `python3 scripts/v2/sheet.py renders/v2/eight-moves/frames --labels <shots.json> --stats`

**Numbers:**
- Preflight: ok in 2.1 s. Browser = system Chrome for Testing 153 (`/usr/bin/google-chrome`), WebGL2 on SwiftShader/Vulkan. FFmpeg 6.1.1 with ass/gblur/blend/loudnorm. Python: numpy, PIL yes; soundfile, sherpa_onnx not yet installed (Session 5). Blocked: huggingface.co, api.elevenlabs.io. Reachable: npm, PyPI, github.com, raw.githubusercontent.com, fonts.gstatic.com (brief said blocked; harmless, fonts still come from npm). Machine: 4 CPUs, 15.7 GB.
- Test clip: 90 frames (3 s, 8 shots, one per move) at 720×1280 in 8.9 s wall, 65–100 ms/frame in page. Bench PASS: max 20,340 triangles, max 33 calls, mean 0.069 s/frame.
- The legacy avatar alone is ~19k triangles (4-segment rounded boxes): Session 2's 2-segment avatars are required to fit a cast inside 50k.
- Per-shot cache: changing S8 re-rendered 13 frames, 77 reused. Determinism: 10 frames re-rendered in a fresh process, 10/10 byte-identical.
- Tests: `npm test` exit 0; `npm run v2:test` 8/8 pass (every move, push/pull/crane/orbit geometry, easing endpoints + monotonic, default 5.5 % push, determinism + seeded drift, speed cap, openHit).

**Decisions:**
- Speed gate = how fast the look direction turns (pan vs frame width, tilt vs frame height, per second), not raw target travel: a camera tracking a walker does not pan. At 35 % an eased orbit can sweep ~8° in 3.5 s and a crane must raise its target with the camera; the 3 s demo clip deliberately exceeds this (8 moves in 0.17–0.43 s each); real shots are gated by `plan.js` (S5).
- `openHit` applies only to a shot starting at episode frame 0; its offsets are multiplied by a cosine taper so they are exactly zero from frame 8 (pure `e^-14t` is still 2.4 % there).
- Timing in page forces completion with a 1-px `readPixels` (ANGLE does not block on `gl.finish`).
- PR base is `claude/lucid-brahmagupta-jg9ad9` (studio work lives there; `main` is 65 commits behind), so the PR shows only v2 changes.
- Preflight probes reachability with curl (honours the HTTPS proxy; Node's fetch does not).

**Open problems / notes for later sessions:**
- §5.4 output (render 720×1280, Lanczos-upscale to 1080×1920) contradicts the old AGENTS.md rule "native resolution only"; the brief supersedes it, and captions/grade stay native 1080 in FFmpeg. Flagged for the owner.
- Review sheets: `review/engine-test/` (1-fps sheet, one cell per move, 3 s MP4).

## Session 2: Avatars — plan (owner answers in chat 2026-11-12: native 1080p finals; avatar choice delegated)
1. Legacy `avatar/baseAvatar.js` stays frozen (names100). New opt-in v2 actor with the same pivot names/rest positions so `avatar/actions.js` (idle, look_react, walk) still drives it.
2. `avatar-style/body.js`: hero tier = 2-segment rounded blocks + low-poly head lathe (≤ 2.5k tris with hair/face/accessory); background tier = plain boxes (≤ 300 tris). Phong plastic, toy palette.
3. `faces2.js` (10 faces, cached canvas decals), `hair.js` (10 faceted presets, hero ≤ 300 / bg ≤ 60 tris, vertex colours), `clothing.js` (tunic/armor/robe/apron/royal/peasant), `accessories.js`, `tools.js`.
4. `engine/poses.js` (pure samplers + cross-fade), `engine/overhead.js` (name tag pop, stat, chat bubble), `engine/actors.js` (cast from data); `episode.js` uses actors for `style: 'v2'` cast.
5. `stories/nobody/cast.json` (§11.3 cast); `scripts/v2/avatar-sheet.js` → `review/nobody/avatar-sheet.png` + phone crop; score the 8-item rubric (max 3 passes).
6. Native 1080p: render default 1080×1920, bench reports 720 gates + 1080 timing. Tests for poses/budgets/caches; npm test, v2:test, bench, 10-frame re-render; push, update PR #54, stop.

## Session 2: Avatars — report (2026-11-12)
**Built:** `avatar-style/` body.js (v2 actor: same pivots/rest positions as the frozen legacy avatar), faces2.js (10 faces, cached 512 px decals), hair.js (10 faceted presets, vertex-colour shading), clothing.js (tunic/armor/robe/apron/royal/peasant, hero 512 px torso faces, bg 128 px), accessories.js (crown, helmet, hood, straw hat, scarf, cape, backpack), tools.js (sword, stone-hammer, torch, bread); `engine/poses.js` (17 poses, cross-fade 0.18 s, seeded background life), `engine/overhead.js` (name tag pop, stat, chat bubble, per-frame screen-size cap), `engine/actors.js`, `engine/studio.html/.js` (lookdev stage); `episode.js` runs `style: 'v2'` cast (`castFile`, timed `keys`/`faces`, `travel`, `town` seeds, `ambient`). `stories/nobody/cast.json` (§11.3 cast). `scripts/v2/avatar-sheet.js`, `scripts/v2/server.js`. Fixture `engine/fixtures/v2-cast.json` (10 heroes + 4 background). Font: Lilita One from npm (tags now, captions in S4).

**Run:** `node scripts/v2/avatar-sheet.js` → `review/nobody/avatar-sheet.png`, `phone-390.png` · `npm run v2:bench -- --spec engine/fixtures/v2-cast.json` · `npm run v2:render -- --spec engine/fixtures/v2-cast.json --out renders/v2/v2-cast`

**Numbers:** hero actors 2,006–2,174 triangles with hair, accessories, tool and face (budget 2.5k); background 220 (budget 300); hair hero 168–288, bg 56–60. Legacy avatar for comparison: 10,044 in frame (the "19k" in Session 1 included the shadow pass; corrected). Whole 14-person cast in one wide: 18.9k frustum triangles. Bench v2-cast PASS: 0.124 s/frame at 720, **0.199 s/frame at native 1080**; render 90 frames 1080×1920 in 25.9 s wall. 10/10 frames byte-identical on re-render. `npm test` exit 0, `v2:test` 16/16.

**Rubric (final scores after 3 passes; 1–5):** 1 silhouette at 160 px **5** · 2 expression at 160 px **4** (clear in medium/close; at lineup size eyes+mouth still read) · 3 faceted hair, eyes uncovered **5** (test enforces hairline ≥ 0.24) · 4 clothing differs per character **5** · 5 plastic highlight, nothing muddy **4** (brighter yellow after pass 2; highlight subtle by design) · 6 hero by scarf < 1 s **5** · 7 tag legible at phone size **5** (names; role line small but readable) · 8 tool-hold reads **4** (sword and hammer clear; torch/bread not on the sheet).
Fixed during passes: face shading seam (lathe wrap moved to the back), sword blade edge-on (flat now faces sideways), pull hands not on the hilt (pose solved numerically: fists at 3.0 high, 0.8 ahead), lineup/tool/pull framing, ponytail view, mustard skin (lights), soft clothing at 1080 (256 → 512 px), giant tags in close-ups (screen-size cap 6 % of frame height, hidden < 3.2 units), overlapping tags in the phone shot.

**Decisions:**
- Native 1080×1920 finals (owner, 2026-11-12): `render.js` default 1080×1920, no upscale anywhere; bench keeps the brief's 720 gates and also reports 1080 timing (target ≤ 1.0 s/frame; measured 0.2).
- Legacy avatar frozen; v2 actor is a separate opt-in with the same pivot contract (legacy walk/idle/look_react samplers reused).
- Bench gate = triangles of visible meshes intersecting the camera frustum (brief wording); `withShadowPass` reported alongside.
- Classic tool grip: sword/hammer continue the arm (point ahead in toolHold); torch upright; bread across the fist.
- Name tags cap at 6 % of frame height and hide inside 3.2 units, so close-ups never carry a banner.
- PR base stays `claude/lucid-brahmagupta-jg9ad9`.

**Open problems:** ~1,000 draw calls for 14 clothed actors (6 painted faces × 6 parts each); fine at 0.2 s/frame, but if Session 3's world pushes calls up, atlas each actor's clothing into one texture. The pull stone is a placeholder; the real Field of Stones stone, hilt height and anchor come in Session 3. Gate A follows Session 3.

## Session 3: World — plan
1. `parts/materials.js`: our own 128 px tiling canvas textures (plastic, studs, grass, brick, woodPlanks, cobble, slate, sand, thatch, water, glass, neon), tinted Phong materials cached per (pattern, colour), world-space UV scale.
2. `parts/parts.js`: block, wedge, cylinder, cone, sphere, arch, truss, stairs(n), gableRoof, plate (all with world-scaled UVs). `parts/build.js`: row, grid, ringOf, along(curve), scatter (seeded, avoid), stack, mirror, instance → InstancedMesh, mergeByDistrict, anchor. `parts/ambient.js`: flag, smoke, birds, flame, spinner, walkers, floaters (pure in frame).
3. `engine/look.js`: day, goldenHour, night, storm (+ fireNight for the dragon): gradient sky dome, block clouds, horizon fog, matched ambient, sun with a 2048 shadow fitted per shot, night rim light.
4. `stories/nobody/world.js` (≤ 450 lines): Field of Stones (~80 stones in loose rings, hero's big stone), curtain wall + towers + gatehouse, curved main street of timber-frame houses, market square (well, stalls, chapel tower), terraced castle mound with the dragon's wall; hero/mid/far tiers, district merge, ≥ 3 ambient movers per wide.
5. `episode.js`: loads the world, per-shot look, anchor-relative cameras; bench anchor mode (8 frames per anchor's establishing camera).
6. `review/nobody/world-sheet.png`: the six §12 stills (rendered native 1080×1920), `sheet.py --stats`; 8-item rubric, max 3 passes; tests for parts helpers; npm test, v2:test, bench; push; **stop at Gate A**.

## Session 3: World — report (2026-11-12)
**Built:** `parts/materials.js` (12 hand-drawn 128 px tiling patterns, tinted Phong, world tile sizes), `parts/parts.js` (block, plate, wedge, cylinder, cone, sphere, arch, truss, stairs, gableRoof, gableEnd; box-projected world UVs), `parts/build.js` (rng, row, grid, ringOf, along, scatter, stack, mirror, instance, mergeByDistrict, anchor), `parts/ambient.js` (flag, smoke, birds, flame, spinner, walkers, floaters; pure in t), `engine/look.js` (day, goldenHour, night, storm, fireNight; gradient sky dome, block clouds, horizon fog, sun shadow fitted per shot, night rim light, blendPreset), `stories/nobody/world.js` (259 lines; 10 local prefabs), `stories/nobody/stills.json`, `scripts/v2/world-sheet.py`. `episode.js`: loads `world.js`, per-shot `look`, anchor cameras/cast marks, `renderCamera`/`renderAnchor`. Bench: anchor mode (8 frames per establishing camera) + `--story` falls back to `stills.json` until `episode.json` exists (S5).

**Run:** `python3 scripts/v2/world-sheet.py` → `review/nobody/world-sheet.png`, `world-stats.json` · `npm run v2:bench -- --story nobody`

**Numbers:** bench PASS: max 31.5k frustum triangles (field wide), mean 0.29 s/frame at 720×1280, **0.56 s/frame at native 1080×1920** (all 7 anchors + 6 stills; draw calls ≤ 1,181). World build ~3 s in page. 10/10 frames byte-identical on a fresh re-render. `npm test` exit 0, `v2:test` 22/22.

**Rubric (pass 3 of 3, all PASS):**
1. Landmark (Field of Stones) visible in 4 of 6 stills (whole, field, gate, hero close) — PASS.
2. No untrimmed flat wall > 8×8 in the hero tier — PASS after pass 3 (house gable sides got beam + framed window; gatehouse got plinth, quoins, string course, framed slits; chapel tower got pilasters, belfry arches, string course; curtain wall has plinth, pilasters, string course, merlons).
3. Three depth planes in every wide — PASS (whole: trees / town / castle; field: stones / kids / gate+castle; square: well+stall / terrace / castle; gate: stones / gatehouse / roofs+smoke; night: well+stall / terrace / castle).
4. ≤ 5 hues + accent — PASS: timber brown, cream (+ thatch), grey-blue (stone, slate), meadow green, sky blue (glass, banners, awnings); accent #ff2e63 only on the hero's scarf. Small gold on hilts.
5. Doors 7 high = 1.35× the 5.2 avatar — PASS.
6. Stats — PASS: whole 166/0.31, field 144/0.36, square 111/0.36, gate (golden) 111/0.44, fire night 78/0.63, hero close 113/0.37.
7. ≥ 3 ambient movers per wide — PASS: whole (4 flags, chimney smoke ×3, 2 bird flocks, street + square walkers, clouds), field (gate flags, smoke, birds, clouds, kids acting), square (keep flag, walkers, smoke, clouds), gate (2 flags, smoke, clouds), night (keep flag, walkers, smoke).
8. Built from parts with visible material variety — PASS (brick, slate, planks, cobble, grass, sand, thatch, glass, water).
Fixed across passes: sky shader compile (include mid-line), cameras inside houses/behind stalls (added a top-down layout render to place cameras from a map), sun azimuth convention (golden hour lit the wrong side), crowded square → square moved 10 units north with terraces/castle, chapel tower moved off the castle sightline, street houses placed explicitly (curve offset collapsed them), ring stones cleared around the hero's stone and the path, fire-night too dark/oversaturated, white albedo kept off.

**Decisions:** stills rendered at native 1080×1920 (owner) instead of the brief's 720×1280; bench gates still measured at 720. Frustum triangles count merged districts whole when any part is in view (conservative). Hero's stone is its own mesh (`keep`) so Session 5 can rip it free. Golden hour counts as "day" for the luma gate.

**Open problems:** square establishing shot favours the castle over the stalls (fine as a re-hook wide; a lower market shot can be added per shot in S5). The pull pose fits the hero's stone hilt (3.4 high) only roughly; Session 5 staging tunes the anchor offset. Draw calls ~1.2k in the busiest wide (fine at 0.56 s/frame).

**→ GATE A: stop for the owner's review of `review/nobody/avatar-sheet.png` + `review/nobody/world-sheet.png`.**

## Session 4: Captions, effects, demo — plan
1. `engine/effects.js` (fadeColor, flash, ghost, glow, particles ×6 presets, melt, squash, shake, timeOfDay; pure in t) wired into `episode.js`; tag timelines in `actors.js`.
2. `captions/pop-shorts-v2.json`, `scripts/v2/captions.py` (chunk / timing / emphasis / escaping), `CAPTION_STYLE_V2.md`.
3. `scripts/v2/assemble.py` (grade, captions, two-pass loudnorm −14 LUFS, hold rule, native 1080 only, no SFX).
4. `stories/nobody/demo.json`: 12 s, every camera move, openHit, cuts on word onsets; render native 1080, assemble with the real voice.
5. `PUBLISHING.md`, `STORY_BIBLE.md`, `SERIES_LOG.md`; tests; sheets; push; PR.

## Session 4: Captions, effects, demo — report (2026-11-12)
**Built:** `engine/effects.js` (all §5.3 effects; overlay pass for fade/flash; effect targets get their own material copies so shared cached materials never leak), `driveActor` tag timelines (`tags: [[t, name, role]]`, pop on change), per-shot `tagMaxFrac` (a shot about the tag lets it read big). `captions/pop-shorts-v2.json`, `scripts/v2/captions.py`, `scripts/v2/assemble.py`, `stories/nobody/demo.json`, `PUBLISHING.md`, `STORY_BIBLE.md`, `SERIES_LOG.md`, `CAPTION_STYLE_V2.md`. Tests: `tests/v2/effects.test.js`, `tests/v2/test_captions.py` (now part of `npm run v2:test`).

**Run:** `npm run v2:render -- --spec stories/nobody/demo.json --out renders/v2/demo --workers 3` · `python3 scripts/v2/captions.py --story nobody --spec stories/nobody/demo.json --until 12 --out renders/v2/demo/captions.ass` · `python3 scripts/v2/assemble.py --story nobody --frames renders/v2/demo/frames --captions renders/v2/demo/captions.ass --out review/nobody/demo.mp4 --voice-dur 12 --no-hold`

**Numbers:** `review/nobody/demo.mp4`: 1080×1920 native, 30 fps, H.264 High, 360 frames, 12.000 s, 9.6 MB, AAC, −14.0 LUFS, true peak −1.0 dB. Render 360 frames at 1080 in 276 s wall with 3 workers (0.77 s/frame wall, 2.1 s/frame in page per worker). Bench (demo) PASS: max 30.8k frustum triangles, 0.34 s/frame at 720, 0.69 s at 1080. 10 frames (every 36th) re-rendered in a fresh single-worker process: 10/10 byte-identical to the 3-worker render. 16 captions for 0–12 s. `npm test` exit 0; `v2:test` 27 node + 10 python pass.

**Checks by eye:** `review/nobody/demo-1fps.png` + `demo-shots.png`: 9 shots, every move once (push+openHit, track, orbit, crane, static-drift, whip, gamecam, pull, push), cuts on word onsets (1.80, 3.48, 4.92, 6.21, 7.28–7.44, 8.80, 10.59), captions in the band and never over a face, emphasis yellow on nobody/sword/stone. `openhit-30fps.png` (frames 0–12): punch-in + micro-shake visible, subject never leaves frame or blurs → amplitude kept (not halved).

**Decisions:** Grade fix: the brief's chain screen-blends in YUV, which tinted the whole demo magenta; the bloom now screens luma only (chroma passes through) — first assemble showed a lilac sky, fixed one pass later. No SFX: `open.wav`/`sfx.json` not implemented (owner decision); optional `music.mp3` at −20 dB only if present. Finals are native 1080 (assemble refuses other sizes). Demo cuts use word onsets (plan.js will gate phrase onsets in S5). Particles are camera-facing instanced quads (star/soft/square textures), additive for sparkle/embers/fire/stars. SERIES_LOG includes the two pre-v2 episodes (Dice Town row summarised from its production docs).

**Open problems:** caption band brushes the top of the hero's hair in the crane-to-tag shot (S5 `plan.js` reports face/band overlap → `captionY: "high"` per shot). The hook shot's foreground kid is cut by the left edge (fine for a hook; S5 staging). Render in page slows ~3× with 3 workers on 4 CPUs (wall time still 2.7× faster than one worker).
