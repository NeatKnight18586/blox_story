# CLAUDE.md: blox_story production system (Retention Engine)

**Read first, every session: `docs/bible/RULES_CARD.md`** (all rule IDs, one line each). Then only `episodes/EPxx/spec.yml` and
`episodes/EPxx/HANDOFF.md` for the episode in hand (R-FLOW-02). Long docs in `docs/bible/` are read only when a rule needs detail.
Do not explore the repo. `docs/V2_BRIEF.md`, `docs/season1/*` and `PROGRESS.md` are engine history: read a line range only when a task names it.

## Non-negotiables (owner; details in the card)
- **N-VO-01** You never write, rewrite or "fix" narration, scripts or beats. The owner writes them in chat. **N-VO-02** The VO the owner
  sends (ElevenLabs mp3 at 1.20×) is final: never trimmed, stretched or re-timed; visuals adapt to it, pauses included.
  **N-VO-03** Third person; opener family "In this town…" / "In this world…".
- **N-AUD-01** No BGM from us; SFX only with `sfx: on` (default off). **N-FACE-01** Faces v5 (the owner's 48-face sheet) only.
  **N-CHAR-01** R6 proportions, satin bodies, modern hair, modest adult builds, age-appropriate elders/kids. **N-WORLD-01** A new
  world every episode (code is reusable, maps are not). **N-JOLT-01** One subtle shake at 0:00 only.
- **N-REPO-01** No licence file; nothing that can cost money on GitHub. **N-TOK-01** Small reads, presets, scripts; no micro-motion.
  **N-RES-01** Final master native 1440×2560. **N-REAL-01** Realism beats render speed; stay inside free Actions limits (shard more).
- Superseded by these (kept as history): `docs/season1/V4.md` D1 (first person), D4 (reused set library), the 0.69 s/frame budget
  and its "not used" list; `docs/season1/SEASON_1.md` §5b (Claude Code writing scripts) and the 30-card slate.

## How an episode is built (R-FLOW-01 … R-FLOW-07)
Thinking happens in chat; Claude Code executes. Each episode prompt is a directed spec with exact values and acceptance checks: follow
it literally; if a value is impossible, say so instead of improvising (R-FLOW-07). Episode folder: `episodes/EPxx/` (`spec.yml`,
`HANDOFF.md`, `qa/`) with `slug:` pointing at `stories/<slug>/` (engine data: `episode.json`, `world.js`, voice, `cues.json`).
1. **Set pass** (1 session): build the world + lighting preset → 4–6 location stills as ONE contact sheet. Stop for approval.
2. **Blocking pass** (1 session): whole-episode previz at low res: positions, camera presets, cuts from VO timestamps, signage,
   captions. Run QA. One contact sheet, 1 frame per shot, numbered. Stop for the owner's notes per shot number.
3. **Sequence passes** (1 session each, 4–8 per episode): fix and polish one sequence (one location/beat group, ~4–12 cuts) from the
   shot-numbered notes; that sequence's sheet only. The 3 hero shots (R-HERO-01) get their bespoke work here.
4. **Final render** (1 farm job) only after every sequence is approved, and only with QA at zero FAIL (R-FLOW-06).
- **Approve gate:** at the end of each pass (and each build phase): stop, run the acceptance checks, write a harsh self-review (asked vs
  delivered, every shortfall), wait for "approve" or notes. Never start the next pass without approval; fix shortfalls before asking.
- **QA before "done":** an episode is never called done until `tools/qa_episode.py` (Phase 3; until then `v2:plan`/`v2:read`/
  `v2:stability`/`v2:qc`) passes. Override only `--allow RULE_ID`, written to `episodes/EPxx/qa/allow.log`.
- **Token rules:** contact sheets only (`tools/contact_sheet.py`; ≤ 1600 px, shot numbers burned in;
  R-FLOW-03), never single frames or video. Touch only the pass's files; re-render only changed shots (R-FLOW-04). End every session
  by updating `episodes/EPxx/HANDOFF.md`, ≤ 30 lines: done, approved, open notes by shot number, exact next step (R-FLOW-05).
- **Acceptance discipline (A5 §S, still in force):** a self-score is never a gate. A visual gate = a measured check with a number and a
  pass line + a before/after sheet at 390 px phone width + the three weakest things visible in it. A measured check still failing after
  two fix passes: stop and report the number; never loosen it. The owner decides the look; report what is weak, never round up.
- Engine/tooling work (not an episode) still logs a ≤ 15-line plan and a ≤ 40-line result in `PROGRESS.md`.
- `tools/rule_ids.py` must pass after any edit to the bible, this file or a QA rule (IDs defined only in the card).
- **No labels (R-LABEL-01, owner, permanent):** no name/role/AFK tags, chat bubbles, class cards or overhead tag/stat/card/icon UI on
  people or objects. Text only on real in-world objects (sign, scoreboard, clock, note, switch) and in captions. New specs set
  `labels: false` (`engine/nolabels.js`); `v2:plan` fails it with `noLabels`.
- Legacy commands `/new-episode` and `/season` are the old Season 1 flow; use them only if the owner asks.

## Ground rules (brief §2)
- `stories/names100/**`, `production/render.js` and existing module behaviour are frozen; extend through new opt-in options only.
- `npm test` (node-only) stays green. Do not run the legacy `test:*` browser suites.
- Never read `evidence/`. Never open single frame PNGs: look at contact sheets ≤ 1600 px (`scripts/v2/sheet.py`).
- Determinism = unit tests on pure functions + a 10-frame re-render spot check. No SHA receipts or manifests. No new frameworks; tests only for new pure logic.
- Branch: the one the session names (default `claude/engine-v2`). Commit source, `cues.json`, the voice file and `review/<slug>/` only; never `stories/*/build/` or `renders/`.
- Brand: never draw/show the Roblox logo or wordmark; never imply official. All hair, faces, outfits, accessories are our own.

## Commands
- `python3 tools/validate_spec.py episodes/EPnn/spec.yml [--allow ID --reason …]` / `--all`: spec gate (fields, origin ledger, hook, signs, hero shots, length tier, world reuse, variety) → PASS/FAIL per rule ID, exit 1; allows logged to `episodes/EPnn/qa/allow.log`. Template `episodes/_TEMPLATE/spec.yml`.
- `python3 tools/variety_matrix.py [--check]` → `docs/VARIETY_MATRIX.md` (R-ALGO-04, previous 3 episodes). Story ideas: `docs/STORY_BANK.md` (owner fills). Series numbers: `series.yml`. Length tier: `docs/LENGTH_TIER.md` (`tier:` line).
- `python3 tools/qa_episode.py --story <slug> [--spec f] [--final] [--allow ID --reason …]`: retention QA (PASS/FAIL/SKIP per rule ID with timestamps) → `episodes/EPnn/qa/qa.json` or `review/<slug>/qa-retention.json`; exit 1 on FAIL (`--final`: also on SKIP). Format 6 finals are gated by it in `render.js --final` and the farm plan job; only allows already in the committed allow log count there. `assemble.py` format 6: no hold, sfx only if `"sfx": "on"`, no music mix.
- `node tools/plan_cuts.js --story <slug> --beats <BEATS.md|beats.json> --base <episode.json> --out <episode.json> [--places <world.js with ANCHORS> | --targets-from <episode.json>] [--reversal s] [--subjectH n] [--loop] [--plan-out f]`: cut planner → format-6 shots (presets, hero shots, jolt, alternation, every VO pause cut).
- `python3 tools/contact_sheet.py --spec <episode.json> --out <png> [--shots 12-19] [--frame mid|first|last|loop] [--load-timeout s]`: 1 frame per shot, ≤ 1600 px, numbered; only changed shots re-render (per-shot cache; `render.js --frames`).
- Look (Phase 5): `python3 tools/fetch_look_assets.py` (CC0 HDRIs + photo sets → `renders/cache/assets`, run before any `mood` render) · spec `"mood": "dawnHope|overcastDread|goldenBittersweet|nightMystery|stormAction"` (+ `"acts": [t2, t3, t4]`) = post chain `engine/post7.js` + `engine/moods7.json` · `node tools/look_stills.js [--moods a,b] [--before]` (mood stills 1440 + timing + gate) · `python3 tools/look_sheet.py` (390 px sheets). Local renders of Toy House-era sets also need `node scripts/v2/tex4.js`, `matcap4.js`, `envelope.js --story <slug>` (the farm runs them).
- `python3 tools/rule_ids.py`: rule-ID check (unique, defined in the card, explained in a long doc; card ≤ 120 lines) → JSON, exit 1 on error.
- `npm run v2:preflight`: environment check, one JSON object (~3 s) · `npm run v2:test`: pure-logic tests (`tests/v2/`).
- `npm run v2:bench -- --spec <episode.json>` or `--story <slug>`: triangles, calls, s/frame per shot (PASS ≤ 50k tris, ≤ 0.45 s/frame; Season 1 / v3 worlds ≤ 90k, ≤ 0.62 — owner Decision 4; the real gate is final render + assemble ≤ 3 h on the farm).
- `npm run v2:read -- --story <slug>`: owner readability checks on the rendered frames (face shown, nothing in front, subject stands out, insert object reads, something moves, Kit/building scale, plain-egg shading; static framing ≤ 3 s, moving ≤ 4.5 s) → `review/<slug>/read.json`, ERRORS (`engine/readcheck.js`, `episode.js readMeasure`).
- `npm run v2:stability -- --story <slug>` or `--spec <file>`: camera-nudge flicker gate (4 mm, ≤ 0.30 %) → `review/<slug>/stability*.json`. **Must pass before any animatic/final is shown.**
- `npm run v2:align -- --story <slug> [--ref cues.json]` (voice → `build/cues.json`) · `npm run v2:plan -- --story <slug>` (§5.2 gate, exit 1 on error → `review/<slug>/plan.json`) · `npm run v2:render -- --spec <episode.json> --out <dir> [--final | --width 270 --height 480 --every 2 --aa 0]` (cached frames, `progress.json`; `--final` = native 1440×2560 + AA, the A2 delivery preset).
- `node scripts/v2/avatar-sheet.js` / `python3 scripts/v2/world-sheet.py`: cast sheet + 390 px phone shot / world stills + luma stats → `review/nobody/`. A4: `node scripts/v2/hair-sheet.js` · `troupe-sheet.js` · `python3 scripts/v2/look-ab-s1.py` → `review/season1/`.
- A5 gates: `node scripts/v2/build-gates.js` (adult_f torso, flat ortho 390 px) → `build-gates.json`; `node scripts/v2/hair-gates.js` → `review/season1/hair-gates.json`; `node scripts/v2/look-gates.js --spec <f> [--night ids] [--framing] [--png f]` (night luma on silhouette masks, framing) → `look-gates-*.json`.
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
- `scripts/v2/`: `browser.js`, `preflight.js`, `align.py`, `plan.js`, `render.js`, `bench.js`, `stability.js` + `flicker.js`, `sheet.py`, `captions.py`, `assemble.py`; A4 §F/§I: `sfx.py` (set + placement), `audiocues.py` (→ `review/<slug>/audio-cues.md`), `scriptcheck.py --story <slug>` (410–440 words, ≤ 12-word sentences, card first/last line, ≤ 6 first-person sentences, FK ≤ 6, card key nouns), `season_state.py`, `layout.js`.
- `stories/<slug>/`: `script.txt`, `voice.flac`, `cues.json`, `episode.json`, `world.js` (`build/` ignored); `review/<slug>/`: gate material for the owner.
- Legacy (frozen or reference only): `avatar/`, `production/`, `stories/names100/`, `studio/` (Dice Town / Shortwick toolkit).

## Library index
Library index: docs/LIBRARY.md (read only the lines a task needs; add one line per new reusable piece there).
