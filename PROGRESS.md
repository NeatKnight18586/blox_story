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
