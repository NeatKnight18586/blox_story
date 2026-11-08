# blox_story — Codex handoff: F1 v3 realignment (2026-11-08)

## Why the direction changed
Earlier F1 created preset-first Kai/Mira figures with baked-in hair, hoodie, pink clothing and shoes. User supplied four new reference images of a very simple *classic R6-like six-block avatar* and explicitly changed the product requirement: ONE neutral body first; later characters arise by adding/removing cosmetics and color/face choices.

**F1_SPEC.md is the NEW canonical spec.** The old source was not a visual PASS and is retained for reference/history, not to dictate the new silhouette. This task includes an intentional, bounded architectural migration.

## What exists at handoff
- Current legacy code: `index.html`, `character.js`, `presets.js`, `preview.js`.
- Existing `tests/smoke.cjs` tests prior Kai/Mira behavior with a fake Three.js module; it must be adapted or replaced for the new contract.
- Prior test notes in `STATUS.md`; F1 visual rendering was never verified.
- Updated `F1_SPEC.md` gives proportions, API, screenshots and acceptance gates.
- `AGENTS.md` sets constraints, `CODEX_FIRST_TASK.txt` contains a pasteable start instruction.

## Implementation order (prioritize quality, avoid unbounded work)
1. Inspect repo and run baseline checks, recording failures transparently.
2. Implement `createBaseAvatar()` with six clean, aligned body meshes and stable pivot refs. First inspect the **unclothed neutral** figure, adjusting proportions to the reference.
3. Add `applyPose` with neutral/walk_demo/look_down, `applyFace` with blank/classic_smile/worried, and `applyAppearance` with palette and one removable demo attachment. Don't create a full asset library.
4. Update preview for one canonical avatar, select pose/face/view/cosmetic. Set clean lighting and ground.
5. Update automated tests for contract and identity invariants. Use actual browser render, capture six required views and assess visuals. If environment cannot render, leave PARTIAL.
6. Update README/STATUS, commit to branch; submit changes for review via Codex workflow. Avoid unnecessary refactors.

## Preservation policy
Do not destroy prior work: Git retains previous commits. If useful, keep a minimal compatibility wrapper, but only if it doesn't complicate F1. Clearly mark Kai/Mira code and notes superseded. Do not pretend rev2 tests validate rev3. Keep future F2/F3/F4 interfaces in mind without implementing them.

## Evidence
New screenshots must be genuine Three.js browser captures, not reference art, AI images or a mock renderer. User images are not yet in repo; ask for them **only if reference comparison cannot be meaningfully approximated from the written spec**. Present exact tested/unverified outcomes.

## Next task
Implement and validate F1 v3. No animation movie, no MP4, no story. User has only iPad and wants the assistant to do all coding and testing.
