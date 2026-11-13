# Dice Town P4A — Complete 117s Rough Assembly from Approved Evidence

**Status:** Editorial implementation direction only; no video or production code changed in this documentation branch.
**Base:** PR #41 at `codex/dice-town-p3b4-grounded-world`.
**Recommended Codex model:** GPT-6.1 Sol; **reasoning effort Medium**. This is a bounded FFmpeg/compositing integration task, NOT a new animation/design task.

## Goal and hard invariant
Prove that the separate P3B assets can actually coexist inside the original **38-shot, 3513-frame, 30fps, 360×640, 117.100-second SILENT** Dice Town timeline. Preserve the private ElevenLabs Adam recording (**117.098231s, ALREADY 1.25×**); it is not in the repository and must not be re-generated or uploaded. We will mux and review private audio separately.

This is a **full-length rough editorial assembly**, not the final quality video. The user has already accepted the original narrated animatic. Do not waste implementation tokens on another speculative screenplay or isolated scene polish. Reuse already rendered evidence where possible; no new WebGL frame export is necessary for this task.

## Source of truth and available material

- Timeline/shot IDs: `stories/dice-town/Dice_Town_117s_Animatic_Plan.json` and `evidence/dice-town-animatic/shot-timing-manifest.json`; exact end-exclusive 30fps frame boundaries (0..3513). The existing 15fps source proxy `evidence/dice-town-animatic/dice-town-animatic.mp4` is the fallback for all unimplemented shots, including its proxy labels; mark them in the edit manifest as NOT FINAL.
- Baker **D03 [169,255), D04 [255,337)**: `evidence/dice-town-p3b3/baker.mp4` (96 frames/3.2s, local D03 proof frames 0–56 then D04 57–95).
- Mechanism **D15 [1220,1332)**: `evidence/dice-town-p3b1/mechanism.mp4` (48 frames/1.6s).
- Pin handoff **D23 [1997,2129)**: `evidence/dice-town-p3b1/handoff.mp4` (72 frames/2.4s).
- Recognition **D35 [3090,3230)**: use the **newest** `evidence/dice-town-p3b2b/recognition.mp4` (105 frames/3.5s) rather than PR35's older cut.
- Chair **D36 [3230,3344)**: `evidence/dice-town-p3b2b/chair.png`.
- World setup A **D01 [0,66)**, **D28 [2585,2669)**: `evidence/dice-town-p3b4/after-D01.png` and `after-D28.png`.
- World setup G **D33 [2898,2985)**: `after-closed.png` and `after-open.png`; **D38 [3389,3513)** `after-D38.png`.
- D02 and D34 have no approved finished motion: keep the source proxy and mark it. D38 source still is location continuity only and **does not depict final notebook closing**. D28 is an environment view and may need a tighter cut for final visual storytelling. No scene shown here is implicitly granted final creative PASS.

## Editing strategy (not a new general editor)
1. Use existing Python/FFmpeg tools and installed dependencies, adapting a narrowly scoped script from `scripts/dice-town-animatic-assemble.py`. **No new framework, external packages or broad source refactor.**
2. Build a 30fps master based on **original source frame indices**, never cumulative floating-point segment durations. Every shot's output frame count equals its declared `end_frame-start_frame`. Total must equal3513 frames, no gaps or duplicate boundaries. Preserve narration timing by not altering the source clocks.
3. For motion proofs shorter than their original editorial slots, place the *real unaltered motion* at an appropriate beat and hold a real endpoint frame for remaining seconds, or use the original proxy at the start/end only if necessary for comprehension. Do not manufacture additional motion, do not speed the narration, and avoid freezing mid-gesture. Clearly record a per-shot source selection and held-frame spans.
4. D03→D04 **must cut at frame255**, preserving consistent shoe and baker identity. The original proof cuts at local frame57; preserve its split and only extend/stage the result holds.
5. D33 use closed/open static images as two states within [2898,2985), with an honest placeholder transition; do **not** imply that a real gate-hinge animation has been produced. D38 world still is a placeholder for Leo's notebook-closing action.
6. For the original proxy fallback (15fps, 117.133s), re-sample to 30fps with a well-documented source time mapping. At some cut starts, 15fps proxy boundaries differ from the authoritative 30fps source by ≤1/30s; don't silently pretend that original editorial frames existed in the proxy. Trimming each fallback shot to its locked output-frame count and using endpoint hold is acceptable. Favor transparent mapping over visual cleverness.
7. All sources normalized to 360×640, square pixels, 30fps/H.264/yuv420p; no letterboxing, mixed timing or unplanned crops. No sound track in deliverable.

## Deliverables, checks and limit
- ONE **117.100s silent rough assembly MP4** (360×640, 30fps, exactly3513 decoded video frames), with all38 original shots in exact sequence.
- One machine-readable **38-shot edit map**: per source, frame ranges, motion vs still vs proxy; placeholders, hold-frame spans, and any mismatched shot intent. **Report which fraction of total runtime remains proxy/stills**; do not claim completion based solely on replaced shot counts.
- One compact editorial contact sheet showing beginning/middle/end of proof substitutions; one short report with playback/FFprobe/full decode, original shot-boundary checks, missing content priorities and actual scoped rendering/encoding cost.
- Regession: `npm test` or appropriate targeted prior tests; preserve all preexisting scenes, audio reference, code and evidence. Generate no 720×1280 master, no new WebGL acting, no full-scene recapture. Do not upload any private narration or music.
- Explicit **creative limitations**: unresolved major roles include D05/06 tether, D11/13/16 wobble continuity, D19 family photo, D27/D30 Pip refusing pin, D29/31 physically valid six roll, D33 moving gate, D34 route, and D38 actual notebook close. These become future scoped jobs *after* we watch this rough assembly with private narration.
- Open a new draft implementation PR targeting **`codex/dice-town-p4a-edit-direction`**; DO NOT merge. Stop after one verified assembly and report. Do not automatically tackle any listed missing shots.

**Important:** The P3B-4 source explicitly states setup A and G are separate camera-bounded footprints; the assembly should preserve matched editing continuity, not pretend a geometrically unified navigable map was built.
