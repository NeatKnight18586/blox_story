# blox_story / BlockStory V2 F1 — Verification

**Current inherited grade: PARTIAL.** The following checks refer to the source archive test environment on 2026-11-08, not a new browser verification in GitHub.

## Previously verified
1. `node --check character.js`, `node --check presets.js`, `node --check preview.js`: PASS (syntax only).
2. `node tests/smoke.cjs`: PASS with lightweight mock of Three.js API (not real WebGL).
3. Two IDs and distinct preset colors, five named pivots each, stable mesh identity across pose and expression changes.
4. Kai 32 meshes, Mira 29; same t yields identical pose; neutral resets correctly.
5. Targeted neutral sole position correction to mathematically touch y=0.

## Not yet verified
- Actual Three.js/WebGL rendering, module loading from CDN, iPad Safari behavior, all six visual views, clipping, faces, shadows and visual foot contact.
- Local browser attempt was blocked by ERR_BLOCKED_BY_ADMINISTRATOR; CDN could not be downloaded in the originating environment.
- No authentic browser screenshots or videos were produced.

**VISUAL PREVIEW NOT VERIFIED.** Do not mark PASS until structural checks AND real screenshots/inspection succeed.

## Codex continuation
Read AGENTS.md, F1_SPEC.md and CODEX_HANDOFF.md. Run tests, serve preview in actual WebGL browser, capture Kai and Mira front, three-quarter, worried close-up, inspect and update this document. Preserve F1 scope.
