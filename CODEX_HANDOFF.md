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
