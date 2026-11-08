# F2 handoff — F2A merged, standalone F2B1 walk
Read AGENTS.md, F1_SPEC.md, F2_SPEC.md, STATUS.md, README.md, then current avatar/appearance/preview/tests before coding. The user authorized F2B1 after merging PR #3. Implement only standalone foundational walking; no walking transitions or F3. Submit a PR and stop for review.

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

## F2A handoff
The current implementation PR adds `avatar/actions.js`, focused API/motion tests and `evidence/f2a/`. Consult STATUS.md for executed results. `npm test` runs both F1 and F2A API tests; `npm run test:motion` captures actual WebGL fixed frames, repeated reverse seeking, contact metrics and vertical views. `python3 tests/contact-sheets.py` arranges every genuine frame into labeled inspection sheets (Pillow is a developer evidence tool, not a runtime dependency). The old F1 walk demo remains explicitly labeled legacy and is not a F2B implementation.

## F2B1 handoff
F2A PR #3 merged with preserved commit `7fbe933` after re-running `npm test`, `npm run test:browser` and `npm run test:motion`. Merge SHA: `bcdf18b892611c2eca3a8106baea2bd4e30df414`.

The standalone walk extends `avatar/actions.js` with one small `avatar/walk.js` helper. Factory exposes neutral pivot positions so temporary swing offsets reset deterministically; anatomy is unchanged. Run `npm test`, existing F1/F2A browser checks, then `npm run test:walk` and `python3 tests/contact-sheets.py evidence/f2b1`. The raw 146 walk PNGs are reproducible and Git-ignored; eight committed labeled sheets contain every captured frame. Selected stills, vertical captures and max/RMS metric manifests are retained. No extra framework/dependency. Review STATUS.md for exact measured outcomes and known stylistic limits before any later expansion.

## Visual calibration review boundary
PR #4 merged at `e956e65a4c4a6938063b9b6f07ebe6dd10422f93`, retaining `c22431d`. A separate branch evaluates only one opt-in readable gait. Baseline action output is SHA-256 checked against pre-calibration samples, and F1/F2A remain unchanged. Run `npm run test:calibration` and `python3 tests/calibration-comparison.py` for side-by-side fixed-camera evidence. See STATUS.md and `evidence/calibration/REPORT.md` for results/recommendation. Do not proceed to F2B2 or walking transitions without a new user task.
