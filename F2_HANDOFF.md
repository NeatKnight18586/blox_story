# F2 implementation handoff — prepared only
Read AGENTS.md, F1_SPEC.md, F2_SPEC.md, STATUS.md, README.md, then current avatar/appearance/preview/tests before coding. This handoff does not authorize implementation in the current documentation task.

## Starting point
F1 PR #1 is merged into main at `2dff6c6bf488870da8ea5427261edc6d26bc3207`, preserving commits `28fc47c` and `45180f0`. Existing canonical API and ten screenshots are present. Real API and Chromium WebGL checks were re-run successfully before integration. `character.js`, `presets.js`, `tests/smoke.cjs` are unused legacy code, not a motion foundation. The current `walk_demo` lacks F2 contact management.

## Small implementation sequence (future task)
1. Create a branch from current main; run `npm ci`, `npm test`, and the HTTP preview/browser checks. Preserve the rounded head, six meshes and existing F1 evidence.
2. Implement explicit-time sampling/application for idle and look/react using the same pivots; verify random seeking, reset and face/cap compatibility.
3. Solve a conservative short-stride walk using actual support geometry, root travel, stance anchors and swing clearance. Establish numeric contact tests before polishing motion. Do not expand the rig to hide an unresolved constraint.
4. Add deterministic, contact-aware transitions and aligned origins; test every action pair, endpoints, loop boundaries and interruption snapshots.
5. Add minimal scrub/step controls and real-browser fixed-time frame capture, contact sheets and JSON metrics. Review each frame, including side-view support swaps, and verify 9:16/mobile framing. Tune only against measured/rendered failures.
6. Keep F1 regression checks green, document exact commands/limits/evidence, and submit an F2 implementation PR. Mark PASS only against F2_SPEC.md gates; stop before F3.

## Intended files, not a framework
Prefer one small `avatar/actions.js` for sampling/application and a small contact helper only if needed. Extend existing preview and add focused real-module and browser motion tests. Reuse current dependencies. Do not introduce an episode engine, physics package, asset library or export pipeline.

## Baseline commands
```sh
npm ci
npm test
npx playwright install chromium
npm run preview
# Another terminal, server running at localhost:8000:
npm run test:browser
```
Future motion test commands do not exist yet; add and document them during implementation. Existing browser tests regenerate F1 screenshots; inspect any Git changes before committing them. Current browser capture uses software WebGL in Chromium; native Safari remains unverified.
