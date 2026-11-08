# Current handoff — F1 integrated, F2 documents prepared

F1 was merged into main through [PR #1](https://github.com/NeatKnight18586/blox_story/pull/1) at `2dff6c6bf488870da8ea5427261edc6d26bc3207`. Source/API and genuine Chromium WebGL browser checks passed again before integration; ten evidence PNGs are committed. The rounded oval cylindrical head requested by the user is the current design.

Read AGENTS.md, F1_SPEC.md, STATUS.md and README.md. For future F2 implementation, read [F2_SPEC.md](F2_SPEC.md) and [F2_HANDOFF.md](F2_HANDOFF.md). F2A PR #3 is merged after regression checks. PR #4 is merged after regression/WebGL verification. The current task is visual calibration only: preserve the original baseline, compare one readable trial with identical cameras and tolerances, submit a separate PR only if demonstrably better, then stop before F2B2. Walking transitions remain deferred. See STATUS.md for verified F2A outcomes. Do not redo the superseded F1 migration or treat walk_demo as an accepted grounded walk.

Previous handoff instructions are preserved in Git history.
