# blox_story — F1 v3 Realignment Status
**Current grade: PARTIAL / DESIGN-ONLY. New specification committed; new implementation and visual inspection NOT YET DONE.**

## Source of truth
F1_SPEC.md (v3) supersedes the old Kai/Mira-first spec. AGENTS.md and CODEX_HANDOFF.md describe Codex migration. User's four attached block-avatar images established the new visual direction; actual image files have not been placed in the GitHub repo.

## Completed this update
- Rewrote F1 as one neutral six-part classic R6-like block avatar with optional removable appearances.
- Defined starting proportions, face design, minimal API, preview views, new acceptance gates, future compatibility and explicit non-goals.
- Replaced Codex handoff guidance and current docs.
- Preserved prior source/commits; **NO code change or test rerun was performed during this spec/handoff edit**.

## Prior revision history — DOES NOT validate v3
Old Kai/Mira prototype reportedly passed node syntax checks and lightweight mock-based mesh/pose tests in the prior environment. A physical sole correction was made. Browser/WebGL renders and six old screenshots were NOT verified. Those checks refer only to old source and old requirements. They cannot be counted as v3 PASS.

## Pending — Codex must do
- Migrate legacy character-first source to the new canonical `createBaseAvatar()` rig and appearance interface.
- Update tests to v3 contract, run source/module/identity tests.
- Serve a working browser WebGL preview and capture six authentic screenshot/evidence states from F1_SPEC.md.
- Visually inspect against intended proportions, face, bevels, seams, shadow and mobile legibility.
- Document any lack of actual reference-image access; capture and report genuine browser outputs.
- Update this file with actual commands, screenshots/paths, any fixes and PASS/PARTIAL/FAIL.

**VISUAL PREVIEW NOT VERIFIED.** No claim of video-export capability is justified in F1.

## Next action
Run CODEX_FIRST_TASK.txt against the repo. Do not begin F2 until the new F1 is approved.
