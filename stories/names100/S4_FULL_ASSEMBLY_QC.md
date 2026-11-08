# names100 — S4: one continuous integrated rough cut (QC ONLY)
**Status: PLANNED, not implemented.** Authorize AFTER clean review/merge of PR #17. No new animation/lighting/counter redesign and **no final-resolution episode** in this milestone.

## Decision
The P5 visual finish (softened existing shadows, stable front-surface ghosts, dark final numerals) is the **approved working look for the pilot**. Minor grain acceptable. P4/P5 new counter is approved; original game HUD is retained for legacy regression only. S3B approved shy/reunion/forgotten gestures; white captions use the approved `CAPTION_STYLE.md` / S3C style. Maintain scripts, 23 shot boundaries, original audio and visual continuity.

## Why this gate
Each individual part passes, but the full 54.7s film has never been watched in **one cut with all S3B, P5, counters, white captions and real narration together**. End-to-end shot continuity, caption overlap and timing remain the highest-risk unknowns. Resolve those before any native 720×1280 full render.

## Preflight
- Verify PR17 source/regression/stills/byte-preservation summary, merge it into main if clean. Preserve all previous films and tests. New S4 branch from merged main.
- Read only `roughcut.json`, `VOICE_CUES.md`, `CAPTION_STYLE.md`, `LOOK_STYLE.md`, P5 report and current S2/S3B render/overlay modules. Don't load the 44k+ historical STATUS or prior 17 PR reports.
- Audio `ADAM 1.WAV` is private; use only if present in the Codex workspace, or keep S4 silent and report AUDIO BLOCKED. Do not use a substitute voice. Never commit original WAV or narrated MP4 into Git history.

## One consistent source-of-truth plan
Absolute native clock: 30fps, 1,641 frames `[0,1641)` = 54.700s, original WAV 54.682993s. Retain 23 shots and scene cuts from `roughcut.json` (do not duplicate/edit their timestamps). Scene sources by window:
- `[0,259)` original S2 anonymous rule (counter belongs to anonymous resident).
- `[259,482)` S3B shy (Eli aborted greeting).
- `[482,945)` S2/V1 reveal with S1 approved look / P5 ghost fix (MARA and 100→99).
- `[945,1641)` S3B ending (approach/reunion, 1→0, failed recognition), with P5 finish where applicable.
Use opt-in `counterMode:'clean'` and `finish:'p5'` through existing shot parsing; never silently mutate legacy JSON inputs or old evidence. Maintain absolute native frame sampling when stitching scenes. Explicitly handle the `[938,945)` seam and the S3B scene-source offsets. All 23 shots continuous and correct.

Counter authority: derive values from sampled global story states, not a duplicate hand-written counter table. Eli 100 through788, 99 at789; 98/97 at1120/1168; 52/18/3/1 at1210/1236/1261/1278; zero at1529. Ghost restore890–926. P5 editorial typography: no HUD at all, charcoal ending 1/0 only on S22, no counter in S23. Respect captions/counter/face safe zones and foreground story facts.

## Build and test in three stages only
**A — Lightweight integration probe.** Build a small versioned composite story manifest and capture **a handful of frames at seams and protected events**, including 788/789, 889/890/926, 944/945, 1296/1371/1406/1450/1490, 1528/1529, 1546/1640. Catch wrong cast, broken scenes, HUD residues, mismatched source offsets, lighting/shader regressions and early counter values BEFORE long rendering. All previews must be genuine WebGL.
**B — Exactly one complete low-res clean 3D draft.** 180×320/15fps, native frame mapping `g=2i`, existing resumable/atomic P1 tools and deterministic seek tests. Keep previously authored old movies byte-identical. Affects 821 frames and retains first odd event displayed at next 15fps frame; independently verify native 30fps cue frames. Store raw frames outside Git. If a failing integration frame is found, fix it BEFORE rendering the whole rough cut; avoid full rerender loops.
**C — Compose for listening/review WITHOUT more WebGL.** Upscale draft to 720×1280 only to composite crisp full-story **P5 counter + approved white captions**. Generate a small reusable full-story SRT/ASS/JSON from the exact provided transcript and `VOICE_CUES.md`; timing within phrases is provisional unless the source WAV can be genuinely listened/aligned. No machine-generated invented words, no early spoilers or extraneous overlays; leave intentional pauses blank. If original WAV available, add it from t=0, no time-stretch; AAC encodes fine. The 15fps rough film is ~54.733s, audio ~54.683s, report trailing difference and output timing. If WAV inaccessible, provide silent+captioned rough plus report audio unverified, not PASS.
Keep full clean/overlay sources separate so final720p compositing is cheap.

## Quality gates
- 23 shots correct and in order; camera/cast discontinuities only where intentional cuts occur. No accidental repeated arm poses across scene seams, floating supports, transparent ghost popping, persistent HUD rectangles or counter over faces.
- Frame identity for 789/1529 and 890–926; accurate caption words/names `Eli`, `Mara`. Detect white-caption/counter collisions in opening/countdown/ending. Check at phone scale over night/day.
- Inspect/verify 23-shot contact board **from the newly integrated movie**, not just old S2; verify H.264/yuv420p, decode/playback, real frame counts and cuts, plus representative cold/reverse seeking and protected events. Use the existing full verifier when practical; do not claim all-frame deterministic checks unless run. Perform affected regressions at final candidate.
- **Audio availability:** If WAV available, privately produce a user-accessible narrated review copy through task artifacts if supported. GitHub uploads previously failed; do not promise such links or commit private narrated MP4s. As fallback, commit only silent rough and caption source and have user share the branch ZIP in ChatGPT for audio mux/approval (as successfully used before).
- A **human listening/visual review is still required** before final720×1280/30fps render; avoid calling creative quality PASS based only on test logs.

## Output and stopping rule
One PR: small source/config changes for integration, numbered contact sheet, protected-event screenshots, silent rough MP4 if policy/size permits, caption cue files, concise report with timing, cost and objective failures. User-accessible review only if verified; no fake `/tmp` links. PASS/PARTIAL/FAIL separately for technical and creative/audio. STOP. Do not start final render, sound effects, publishing, new environments, new rig, new shaders or a next S5 phase automatically.

## Usage constraints
One brief, no redundant explorations, targeted preflight, one 821-frame capture only after seam checks, reuse cached helpers, preserve raw frame cache, one focused repair on an observed blocker. Full-run rerender only for an actual verified broken scene, not cosmetic doubt. Make a reusable integrated manifest, not an oversized production framework. Model tokens and CPU time are distinct costs; report them separately when measurable.
