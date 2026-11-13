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

## Session 4.5 (Amendment A1): stability and detail — plan
1. Amendment appended to `docs/V2_BRIEF.md`. `scripts/v2/stability.js` (4 mm camera-nudge test, 540×960, > 40/255 changed pixels, fail > 0.30 %); run it first for the before table.
2. `world.js`: `groundY(x, z)` + `LAYER` table; terrain tops below layer surfaces; everything standing takes `groundY`; `B.ribbon` for the field path and main street; organic ground blobs + tufts/flowers near hero anchors (≤ 3k tris/view).
3. Camera near 0.1 → 0.3; shadow box fitted once per shot (target-path midpoint, `shadowRadius` + half path), snapped to shadow texels; cache key check.
4. `materials.js` at 256 px, calm albedo + separate height drawings → wrapped-Sobel normal maps (`heightToNormal`, pure); new rock, dirt, metal, moss.
5. `parts/props.js`: shared `sword`, `ringStone` (3 variants), `heroStone` (3 crack stages, `stoneCracks` in shot data); `tools.js` hammer uses the same builders. Wall accents, moss strips, baked contact gradient.
6. Tests; stability (world + demo); bench within +20 % of S3 (0.29 → ≤ 0.35 s/frame at 720); A/B sheet + rubric (≤ 3 passes); world sheet; demo re-render; D8 286–291 sheet; 10-frame determinism; CLAUDE.md; PR; stop.

## Session 4.5 (Amendment A1): stability and detail — report (2026-11-12)
**Built:** `scripts/v2/stability.js` (`npm run v2:stability`) + `scripts/v2/flicker.js` (pure metric); `renderFrame`/`renderCamera` take a camera `nudge`. Ground model in `stories/nobody/world.js`: exported `TERRAIN`, `groundY(x, z)`, `LAYER` (patch .06, path .12, cobble .12, dirt .11, square .18); everything standing takes `groundY`; cast marks and walkers follow the terrain in `episode.js`. `B.ribbon` (one strip mesh, world UVs, skirts) for the field path (now routed round the hero's stone) and the main street. Organic ground blobs (5–7 sides, clear of terrace steps, path and the dirt disc) + ≤ 110 grass tufts and flower dots near hero anchors. Camera near 0.1 → 0.3. Shadow box fitted once per shot (target-path midpoint, `shadowRadius` + half the path) and texel-snapped (`look.frameFixed`). `parts/materials.js` rewritten: calm 256 px albedo, separate height drawings → blurred wrapped-Sobel normal maps (`blurWrap`, `heightToNormal`), new rock/dirt/metal/moss; 14 albedo + 7 normal textures. `parts/props.js`: shared `sword` (hero 166 tris, ring 40), `ringStone` ×3 variants (66–78 tris, merged per material), `heroStone` (430 tris, carved band, socket, dirt disc, 3 crack stages via shot `stoneCracks`), `instanceGroup` with tone jitter; `avatar-style/tools.js` sword + stone-hammer use the same builders. Walls: ≤ 40 instanced accent blocks per run, moss strip on the shaded base, baked contact gradient (`mergeByDistrict` + `userData.gradient`). `scripts/v2/look-ab.py`. Tests: `tests/v2/a1.test.js`.

**Stability (before → after), gate metric (raw literal metric in brackets):**
| view | before | after |
|---|---|---|
| D8 pull-reveal first / mid / last | 24.8 / 8.8 / 3.4 % | 0.013 / 0.064 / 0.005 % |
| D1 field hook first / mid / last | 5.9 / 4.8 / 4.5 % | 0.045 / 0.059 / 0.064 % |
| @field anchor | 1.76 % | 0.003 % |
| F-field still (worst) | 2.46 % | ≤ 0.10 % |
| D6 whip mid (worst view after) | 2.21 % | 0.287 % |
| D5 tag close (edges only) | 0.05 % (raw 1.4 %) | 0.04 % (raw 1.6 %) |
Story: 25 views, worst 0.167 % PASS. Demo: 34 views, worst 0.287 % PASS. "Before" measured on a worktree at `ebe2904` with the same tool.

**Numbers:** bench (`--story nobody`) PASS: max 35.0k frustum triangles, mean 0.416 s/frame at 720 (0.81 at 1080). Same machine, same hour: Session 4 tree 0.391–0.407 → +4 to +11 % (this container is ~35 % slower than on Session 3's day, when the S3 tree measured 0.289). Demo re-rendered (360 frames, 400 s wall, 3 workers) and re-assembled with the unchanged `demo.json` and captions: 1080×1920, 12.000 s, 9.5 MB, −14.0 LUFS, TP −1.0. 10/10 frames byte-identical (fresh 1-worker process vs 3 workers). `npm test` exit 0; `v2:test` 33 node + 10 python pass. World stills luma: whole 172, field 148, square 116, gate (golden) 111, fire night 80, hero close 113.

**Rubric on `review/nobody/look-fix-ab.png` (2 passes):** (1) carved rock at phone size 4 · (2) blade/guard/grip/pommel + metal highlight 5 · (3) bricks catch the light, no flat hero wall 4 · (4) nothing photographic or noisy 4 · (5) hero and tags first 5 · (6) no tiles, clean path edges, no floating props 5 · (7) day stills luma ≥ 110 5. Pass 1 → 2: brick relief .7 → .5 with mortar raised off black (bevels had picked up green ground light), rock relief .8 → .5 with a narrower facet range (streaky on big chisel faces).

**Decisions:**
- The literal A1 metric (any channel > 40/255) cannot pass close-ups: with the camera ~4 units from the subject a 4 mm move slides every silhouette and tag-text edge ~1 px (difference maps show red only on edges). The gate therefore excuses pixels whose new colour exists in their 5×5 neighbourhood (edges sliding ≤ 2 px); a surface that flips colour is not excused. Validated: the old world still scores 25 % on D8; raw values stay in the JSON.
- The nudge is 4 mm along the camera's right+up+back diagonal: a sideways-only move left ground-plane z-fighting invisible (old D8 read 0.1 %).
- Bench B3 compared on the same machine/hour (old tree re-benched), since the container's speed changed since Session 3. Trims to stay under 0.45: normal-map anisotropy 2, albedo anisotropy 4, ring-stone chips/moss and ring swords cast no shadow, ring-stone parts merged per material.
- Path rerouted round the hero's stone (it ran over it); street anchor camera moved out of the curtain wall.

**Rules for later sessions (A1):** `v2:stability` must pass before any animatic or final reaches the owner — added to the Session 5 and 6 Done-when lists below and to be written into `/new-episode` (Session 6). Every world uses `groundY`, a `LAYER` table and `ribbon` for paths/streets; relief materials on structures, modelled detail only on story props, calm ground.
- Session 5 Done-when + `npm run v2:stability -- --spec stories/nobody/episode.json` exits 0 before the animatic is shown.
- Session 6 Done-when + `v2:stability` on the final spec exits 0; `/new-episode` runs it in E1 and E2.

**Open problems:** the whip shot (D6) sits at 0.287 % — it brushes a walking kid; Session 5 staging should keep cameras ≥ 2 units from actors. Hand-to-hilt contact on the new hero sword is close but not exact (S5 pull staging).

## Session 5: Animatic — plan
1. `scripts/v2/align.py` (§8: ffmpeg 16 kHz → silencedetect −35 dB/0.18 s → sherpa-onnx zipformer-small-en → Needleman–Wunsch to the script → silence snap) → `stories/nobody/build/cues.json`; reference test §8.8 (line starts within 0.15 s of the owner's `cues.json`, never overwritten); `tests/v2/test_align.py`.
2. Engine data features: `engine/timeline.js` (shots cut at `at` seconds, last shot held to max(voice + 2.5, 122.5)); cast `marks`, `visible`, `tools`/`toolsLeft`, `stat`, `bubble` timelines; `worldState` (cracks, heroStone gone, newborn stone rise, pulled swords); directed particles (fire breath); new poses (raise, hammerHold, pullOne, lift, shiver, lookUp).
3. The dragon: `avatar-style/dragon.js`, block parts, ≤ 4k triangles, pure state sampler (perch, fly, roar, breathe, lower, turn, flinch, cry, flee).
4. `scripts/v2/plan.js` + pure `engine/plancheck.js`: §5.2 errors (motion, 1.2–5.0 s, cut ≤ 2 frames from a phrase onset, size repeats, wide first / after a location change, pan ≤ 35 %, subject head box, single openHit, size/see/why present) and warnings.
5. `stories/nobody/episode.json`: one shot per phrase or clause (~54), §11.1 timing, §11.2 visual musts.
6. Animatic: 270×480 at 15 fps → `assemble.py --animatic` (Lanczos ×2 to 540×960, captions, voice, hold, ≤ 10 MB) → `review/nobody/animatic.mp4` + 1-fps sheets.
7. `v2:stability` on episode.json (A1 gate) before showing; §10 animatic checklist and council scorecard recorded; bench; PR; stop at Gate B.

## Session 5: Animatic — report (2026-11-12)
**Built:** `scripts/v2/align.py` (§8 route; sherpa-onnx tokens arrive with a leading space, not `▁`; the phrase's first word = first word whose raw start falls at/after the silence start, snapped to the silence end when within 0.25 s) + `tests/v2/test_align.py`. `engine/timeline.js` (shots cut at `at` seconds; step/ramp keys), `engine/plancheck.js` (pure §5.2 rules) + `scripts/v2/plan.js` (`npm run v2:plan`, measures in the real page via `__episode.inspectFrame`/`shotSpeed`, writes `review/nobody/plan.json`). Cast timelines `marks`, `visible`, `tools`/`toolsLeft` (cached per hand/name), `stat`, `bubble`; `worldState` → `world.setState` (cracks, heroStone gone, newborn stone rise, pulled swords, street walkers); directed particle streams (`dir`/`cone`); poses raise, hammerHold, pullOne, lift, shiver, lookUp; `avatar-style/dragon.js` (block dragon, 1,072 tris at any scale, 9 states, scared/crying eyes + tears). `world.js`: 9 unmerged story stones with anchors. `assemble.py --animatic`. `stories/nobody/episode.json`: 54 shots, 16 wides, 2 gamecams, cut on phrase onsets, size/see/why per shot. Tests: `tests/v2/s5.test.js`.
**Commands:** `npm run v2:align -- --story nobody --ref stories/nobody/cues.json` · `npm run v2:plan -- --story nobody` · `npm run v2:render -- --story nobody --out renders/v2/animatic --width 270 --height 480 --every 2 --aa 0` · `python3 scripts/v2/captions.py --story nobody --spec stories/nobody/episode.json --out stories/nobody/build/captions.ass` · `python3 scripts/v2/assemble.py --story nobody --frames renders/v2/animatic/frames --captions stories/nobody/build/captions.ass --out review/nobody/animatic.mp4 --animatic`.
**Numbers:** align 7 s for 119.7 s of audio; 405/405 script words placed (403 matched, 2 interpolated), 85 silences; §8.8 reference: all 39 line starts identical to the supplied `cues.json` (max diff 0.000 s). Plan: exit 0, 0 errors, 14 warnings (13 "see" items not centred by frame 6, 1 wide without foreground tag: S31); mean shot 2.22 s; end 122.5 s. **Stability (A1 gate) on episode.json: PASS, 169 views, worst S15 0.27 %** (fixed on the way: S10 orbit grazing a story stone 0.49 %, S21 camera 0.6 units from the hero and later inside the gate arch 1.5 %). Animatic: 540×960, 15 fps, 1,838 frames, 122.53 s, 7.98 MB, −14.0 LUFS, true peak −0.5 dB (128k AAC overshoot; finals use 192k), 165 captions. Render 1,838 frames at 270×480 in 225 s (0.11 s/frame). Bench (episode) PASS: max 33.9k frustum tris, 0.449 s/frame at 720, 0.89 at 1080. 10/10 re-rendered frames byte-identical. `npm test` exit 0; `v2:test` 38 node + 17 python pass.
**§10 animatic checklist (on `animatic-1fps*.png`):** (1) frame 0 shows the rule as text and image: PASS (caption + kids with Baker/Knight tags and sparkles; the hero's Nobody tag is small at frame 0). (2) no two adjacent cells alike: NOT MET: ~30 of 122 adjacent pairs repeat inside shots ≥ 2.5 s (tag insert 5–7 s, names 16–18, sleeping 46–48, ending 113–118). (3) hero/key object findable in < 1 s in every cell: 5 cells fail (49–50 crack insert reads as brown planes; 82–83 rock insert is an abstract block; 95 after the bonk the head has left frame). (4) twist cell is the biggest visual change: PASS, marginal (77–78 flash, dust, low angle, stone overhead; the day→night cut at 45–46 is nearly as big). (5) final cell rhymes with frame 0: PASS (same low wide, kids' tags flip to Nobody, lifting whole stones).
**Council scorecard (approved script, recorded only):** Screenwriter 5 · Director 4 · 12-year-old 4 · Originality & safety 5 (no blade raised at a person: kids stow swords before taunting; knights' and King's swords melt; dragon bonked cartoon-style and flies off crying) · Retention mentor 4 (open questions at 3/20/45/70/95 s; longest shot 3.6 s; laughs at 20 s (Pip) and 94–120 s). SERIES_LOG row unchanged (8/8 different).
**Decisions:** final shot's held tail (after the last word) is exempt from the 5 s max (it is mandated by §9); a whip needs one edge on an onset; "location change" = shot `loc` change, and its first shot must be wide. Follow cameras ride the actor's mark (path), not the posed root, so pull strain and walk bob never shake the camera. Orbits use linear ease (an eased 26° orbit peaks at 148 %/s). Relocation marks snap to the cut frame (a 0.1 s-early mark teleported actors at the tail of the previous shot). Dragon at 1.5× behind the terrace ledge, neck over the square. Kids stow their swords before taunting (family-safe). Plan "head" of the dragon = between its eyes. Blank-frame guard scales with frame area (a 270-px close-up is 9.9 KB). episode.json is generated from a layout script kept out of the repo (scratch); the JSON is the source of truth.
**Open problems (for Gate B notes):** the dragon reads as a stacked "totem" when perched/roaring (neck nearly vertical from the front), and "bigger than the church" (60–62 s) is weak; crack insert 1 and the rock insert are hard to read at 270 px; night sleeping shot is dark; repeated adjacent 1-fps cells in long holds. Animatic is a timing/blocking preview: no antialiasing, 15 fps, ×2 upscale (never a final).

## Session 6: Final + production speed — plan (Gate B passed: owner "proceed, i have no concern now")
1. Picture locked at `1a0d6e4`; plan/bench/stability already pass on this exact `episode.json` (re-run plan; spec unchanged).
2. Final: `v2:render --story nobody --out renders/v2/final --workers 3` (1080×1920, 30 fps, AA) → captions → `assemble.py` → `review/nobody/final.mp4` (ffprobe/ebur128 checks) → 10-frame spot check → 1-fps sheets reviewed for caption/face collisions (fix = `captionY` only).
3. Farm: pure `shardShots` (6 balanced contiguous shot ranges) + `scripts/v2/shards.js`; `assemble.py --video`; `.github/workflows/render.yml` (dispatch + `stories/*/render.request`; plan → 6 render shards → assemble + prerelease). YAML-parse checked; untested until first run.
4. `parts/props.js` small-props library (barrel, crate, sack, lantern, torch, bench, fence, cart, sign, tree ×3, bush, rock ×3, cloud, banner) + budget tests; `world.js` untouched (locked final).
5. `.claude/commands/new-episode.md` (E1/E2 with every gate incl. `v2:stability`), `STORY_BACKLOG.md`, CLAUDE.md index; times + slowest step; PR; stop at Gate C.

## Session 6: Final + production speed — report (2026-11-13)
**Built:** `review/nobody/final.mp4` (the locked Gate B picture, no creative changes). `engine/timeline.js` `shardShots` + `scripts/v2/shards.js`; `.github/workflows/render.yml` (dispatch with story/preset or a push to `stories/*/render.request`; plan gate → 6 balanced shards (556–661 frames) rendered and encoded `-crf 10` yuv444 → concat → `assemble.py --video` → artifact + prerelease `<story>-<sha>`); `assemble.py --video` and CRF stepping (finals 18→22 until ≤ 60 MB); `parts/props.js` small props (barrel, crate, sack, lantern, torch, bench, fence, cart, sign, tree ×3, bush, rock ×3, cloud, banner; seeded, merged, ≤ 400 tris, grounded); `.claude/commands/new-episode.md` (E1/E2, `v2:stability` in both); `STORY_BACKLOG.md`; tests `tests/v2/s6.test.js`.
**Commands:** `npm run v2:render -- --story nobody --out renders/v2/final --workers 3` · `python3 scripts/v2/assemble.py --story nobody --frames renders/v2/final/frames --captions stories/nobody/build/captions.ass --out review/nobody/final.mp4` · farm: Actions → render → story `nobody`, preset `final`.
**Numbers:** final 1080×1920, 30 fps, H.264 High, 3,675 frames, 122.5 s, 58.6 MB (CRF 20; CRF 18 gave 76.3 MB), AAC, −14.0 LUFS, true peak −0.7 dB. Render: 3,675 frames with 3 workers ≈ 68 min wall (1.8 s/frame in page per worker; ~1.1 s/frame wall), including one restart after the disk filled; assemble 7.5 min (two encodes). 10/10 frames re-rendered in a fresh 1-worker process byte-identical. Plan exit 0 (0 errors); bench PASS (33.9k tris, 0.449 s/frame) and `v2:stability` PASS (169 views, worst 0.27 %) on this exact `episode.json` (unchanged since Session 5). `npm test` exit 0; `v2:test` 40 node + 17 python pass. `render.yml` YAML-parses (actionlint could not be installed here). 1-fps sheets: no caption over a face (band lands on chests/scarves in every close-up; closest: the King at 66 s, below the chin). Sheet stats: day cells mean luma 104 (golden-hour mornings pull it down), saturation 0.62.
**Times / slowest step (§14.8):** Session 5 build ≈ 4 h (staging the square and dragon by eye took most of it), animatic render 4 min, final render 68 min. Slowest step: final rendering on 4 shared CPUs → the farm (6 shards) is the fix; second: blind camera staging → add a "frame these actors" camera helper next episode.
**Decisions:** no re-run of bench/stability (spec byte-identical to the passing runs). When the disk filled at frame 2,793, scratch outputs (old animatic cache, demo frames, uv/pip caches) were deleted; render cache keys hash `engine/` + `parts/`, so the two files changed after the render started (`timeline.js` shards, `props.js` small props: no rendering effect) were pinned to `1a0d6e4` for the resume; 3 frames truncated by ENOSPC were re-rendered. Final CRF 20 (60 MB cap). `world.js` not refactored onto the small-props library (would invalidate the locked final; Episode 3 uses it from the start). SERIES_LOG row 3 already present.
**Open problems (Gate C):** render farm untested until its first run (compare 10 frames to local, record wall time). True peak −0.7 dB (target ≤ −1) after AAC encoding: lower loudnorm TP to −1.5 next episode. Known look notes carried from Gate B (dragon "totem" neck, small inserts, dark sleeping shot) were accepted as-is by the owner.
