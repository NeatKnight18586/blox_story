# Current handoff — S1 creative review

Authority: stories/names100/STYLE_LOCK_BRIEF.md. PR #11 verified and merged at `755a872084a560d8f8868906884733583fad5908`, retaining `efa1d76` and user brief `5bbd2fb`. S1 branch: `codex/names100-s1-style-lock`. Stop at its PR for creative approval; no complete episode/animatic/audio authorization.

Four genuine360×640 stills:35 NEW town,700 bedroom,1370 reunion,1600 forgotten Eli. One focused readability correction; optional720 still skipped. LOOK_STYLE.md is the concise palette/material/light/camera/asset reference. `npm run test:style` reproduces four review frames and bounded checks. Source data opt into`look:"s1"`; default rendering and all previous sources/films remain intact. One courtyard extension, same bedroom props, six geometry-sharing depth-only helpers for Mara; no rig/action engine/backend/dependency change. All1159 original actor/cue samples,789 counter,890–926 restore,1529 zero preserved.

Affected source/browser/recovery/gold checks pass; eight old movies byte-identical. Final still verification10.102s, sampled CPU18.32s/peak summed tree750.05MiB. See evidence/names100-s1/REPORT.md for comparisons, native bounds, costs and limitations. Still-only certification; no S1 motion/full-sequence continuity, native Safari/cross-GPU identity or original-WAV sample alignment claim.

Historical handoffs follow:

# Current handoff — names100 ending lookdev review

Authority: stories/names100/ENDING_LOOKDEV_BRIEF.md. PR #10 verified and merged at `c3c6da6aa02dd8d089a9ac2c5f093bc19cfaa02a`, preserving `405c82c` and brief commit `5b6f869`. New branch `codex/names100-ending-lookdev` implements this bounded lookdev only. Stop at its PR for visual approval.

Six approved-internally actual WebGL frames:1040,1090,1210,1370,1529,1600. One focused staging correction clarified the door and parent/child silhouettes. New optional ending cues/factory reuse approved avatars, cached expressions, readable walk, bedroom door, P1 export/recovery; no action engine/rig change. Two preposed residents and a small courtyard only. `scene-ending.json` starts945, ends1641; do not render all696 frames. The verified excerpt is source-local[535,665), global[1480,1610),130frames/4.333333s. Zero1529, counter monotone99/52/18/3/1/0. Written speech starts round UP to native frames1210,1236,1261,1278; last two differ by+1 from approximate brief markers to avoid early numbers. Eli remains opaque/grounded and loses color while Mara turns away.

`scene-reflection.json` preserves original reveal cues while offering a thoughtful final18-frame Eli reaction instead of relief. It does not replace original V1 source/evidence. Use after visual approval if integrating the two slices. All affected regressions and source/artifact integrity checks pass; see evidence/names100-ending/REPORT.md, board, motion, logs and resource receipts. Final export+verification49.155s, sampled summed peakRSS685.09MiB. No full ending/episode/720p export, opening implementation, audio/captions or new dependency. External WAV alignment and native Safari remain unverified. Reunion is a preposed hand/shoulder contact, with minor final-frame edge cropping; not a polished full ending production claim.

Historical handoffs follow:

# Current handoff — names100 V1 visual review

The authoritative task is [stories/names100/V1_VISUAL_BRIEF.md](stories/names100/V1_VISUAL_BRIEF.md). V1 is implemented and verified within its three review gates. Stop at the PR for user review; no episode, full-slice V1 render, audio or next phase is authorized.

PR #9 was merged at `6322b1c480083101d5bc9c0f3eb095430d43128b`, retaining `5c7f978` and the user brief. Source/timing checks, selected authentic WebGL reference hashes, and the existing movie's full decode/native playback/seek passed before merge. New branch: `codex/names100-v1-visual-polish`.

V1 opts into four cached facial expressions, three bedroom prop assemblies, deeper window structure and restrained lighting. Same cast, six-part rigs, pivots, body geometry, wardrobes and action engine. Original proof files and evidence are unchanged. Counter 100 through 788 / 99 at 789; ghost through 889; restoration 890–926; source timeline [482,945). The sole cut adjustment is 938→927 to show Eli realizing after fully restored Mara at 926. See evidence report for camera justifications and the single focused lining-clearance correction.

[Evidence report](evidence/names100-v1/REPORT.md), paired stills, decoded contact sheet, source/range/recovery/browser logs and verified H.264 movie are committed. The movie is **360×640, 30fps, 120 frames / four seconds**, global [825,945). New `--range START:END` selects local source frames without restarting the source clock; resumable job identity includes the range. `npm run render:names100:v1` reproduces only that excerpt. Do not replace it with `render:names100`, which renders the old full proof.

Full affected source/browser regressions and P1 recovery/range integration passed; tests/tolerances and old artifacts were preserved. Software-WebGL determinism is backend-specific; native Safari and final WAV sample alignment are unverified. Transparent ghost garment layering and the short .6s Eli reaction tail remain visible limitations, not hidden failures. No new engine, dependency, rig, wardrobe system or captions.

Previous milestone handoff, retained for history:

# Current handoff — names100 central reveal scene proof

Read AGENTS.md, F1_SPEC.md, F2_SPEC.md, P1_PIPELINE.md, P2A_CASTING.md and stories/names100/{VOICE_CUES,STORYBOARD,CODEX_TASK,SCENE_PROOF}.md. User authorization is only the bounded silent ghost-and-Mara window proof, not the full 54.7s episode or voiceover.

PR #8 was reviewed and all F1/F2/P1/P2A source/recovery/browser tests rerun. All 696 prior PNG hashes and all three encoded films reproduced identically before merge `9fb9654745db8bdf3e2b928d688caca59244ec50`, preserving `3b7f037` and the three new story documents on main. Prerequisite evidence is in evidence/names100/pr8-review/.

The scene proof runs on a new branch from updated main. It uses P2A's same two rigs/appearances/actions, a minimal room/window/closed hinged door, one unrigged pale proxy, cached physical MARA tag, WebGL number/whisper overlays and stateless global-clock effects. No avatar, face, appearance or action engine implementation was replaced. Optional bedroom/reveal paths leave existing shot files unchanged.

The initial 360×640/15fps draft was genuinely rendered and inspected. The primary review copy remains 360×640, but uses 30fps/463 frames to cover exactly global [482,945) with 100→99 at 789. Mara restores within 890–926. Every shared draft/native sample is pixel-identical. Primary input: stories/names100/scene-proof.json; initial draft: scene-proof-15fps.json. See SCENE_PROOF.md for full frame mapping, commands, reuse and limits, and evidence/names100/REPORT.md for executed verification/resources/artifacts.

The original WAV is unavailable in GitHub and was not synthesized or muxed. This is written-timestamp visual alignment, not certified final audio/sample alignment. No full-resolution proof, full episode, later door opening, town/crowd engine, lip sync, editor, generator or next phase. Submit the scene-proof PR and stop for visual review.
