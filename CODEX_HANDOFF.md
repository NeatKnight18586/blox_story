# Current handoff — bounded production feasibility

PR #5 is merged at `35b38cbd0d7bc3f25248968ce40f0eeeb00ba319`, retaining `6464c7a`, after the complete API/F1/F2A/F2B1/calibration regression suite passed. Baseline and Readable remain available and all historical evidence is preserved.

The user explicitly changed direction to a small shot-based Shorts production feasibility test, overriding earlier no-MP4/no-environment task restrictions. Read AGENTS.md, F1_SPEC.md, F2_SPEC.md, STATUS.md, README.md and [PRODUCTION_FEASIBILITY.md](PRODUCTION_FEASIBILITY.md). The current task is one three-shot, 6–8-second real vertical MP4, with one simple environment and interactive prop. Existing avatar/actions are reused without alteration. Use explicit frame sampling, actual WebGL, FFmpeg, metadata/decode/playback checks and resource evidence. Stop after the PR; do not automatically build the full pipeline or optional torso geometry.

Earlier animation handoffs remain in F2_HANDOFF.md and Git history; their historical stage restrictions do not cancel the current user-authorized test.
