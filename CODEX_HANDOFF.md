# Current handoff — names100 central reveal scene proof

Read AGENTS.md, F1_SPEC.md, F2_SPEC.md, P1_PIPELINE.md, P2A_CASTING.md and stories/names100/{VOICE_CUES,STORYBOARD,CODEX_TASK,SCENE_PROOF}.md. User authorization is only the bounded silent ghost-and-Mara window proof, not the full 54.7s episode or voiceover.

PR #8 was reviewed and all F1/F2/P1/P2A source/recovery/browser tests rerun. All 696 prior PNG hashes and all three encoded films reproduced identically before merge `9fb9654745db8bdf3e2b928d688caca59244ec50`, preserving `3b7f037` and the three new story documents on main. Prerequisite evidence is in evidence/names100/pr8-review/.

The scene proof runs on a new branch from updated main. It uses P2A's same two rigs/appearances/actions, a minimal room/window/closed hinged door, one unrigged pale proxy, cached physical MARA tag, WebGL number/whisper overlays and stateless global-clock effects. No avatar, face, appearance or action engine implementation was replaced. Optional bedroom/reveal paths leave existing shot files unchanged.

The initial 360×640/15fps draft was genuinely rendered and inspected. The primary review copy remains 360×640, but uses 30fps/463 frames to cover exactly global [482,945) with 100→99 at 789. Mara restores within 890–926. Every shared draft/native sample is pixel-identical. Primary input: stories/names100/scene-proof.json; initial draft: scene-proof-15fps.json. See SCENE_PROOF.md for full frame mapping, commands, reuse and limits, and evidence/names100/REPORT.md for executed verification/resources/artifacts.

The original WAV is unavailable in GitHub and was not synthesized or muxed. This is written-timestamp visual alignment, not certified final audio/sample alignment. No full-resolution proof, full episode, later door opening, town/crowd engine, lip sync, editor, generator or next phase. Submit the scene-proof PR and stop for visual review.
