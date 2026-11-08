# blox_story — F1 revision 2 Codex handoff

This is a continuation of a previously created project, **not a greenfield rebuild**.

## Existing implementation
- index.html: Three.js import map pinned to 0.187.0 and browser preview controls.
- presets.js: stable appearance presets kai and mira.
- character.js: shared rigid-pivot character factory and deterministic neutral, walk_demo, look_down poses; neutral and worried expressions.
- preview.js: two-character scene, lights, shadows, cameras and inspection hooks.
- tests/smoke.cjs: nonvisual structural API smoke tests.
- README.md: usage. STATUS.md: exact verification evidence. F1_SPEC.md: contractual requirements.

## Inherited verification (2026-11-08)
- Syntax checks and lightweight Three.js-stub smoke tests passed in previous environment.
- Kai and Mira had distinct IDs/colors with 32 and 29 meshes; posing didn't replace meshes.
- Walk pose at t=.25 was repeatable, and neutral reset correctly.
- One targeted correction raised sole geometry to mathematical ground contact.
- REAL Three.js runtime/browser inspection was blocked by unavailable CDN/DNS and local Playwright navigation ERR_BLOCKED_BY_ADMINISTRATOR.
- The correct inherited grade remains **PARTIAL**. No authentic screenshots or MP4 exist.

## One focused task now
Use a real WebGL/browser environment to serve and inspect the existing preview. Capture six authentic views (per F1_SPEC.md). Verify visual quality, controls, ground, silhouette, expression and shadows; make one focused fix only if necessary. Update STATUS.md with exact evidence. Do not generate imagery as a substitute for rendering. No F2 or MP4 yet.

User wants Codex to perform the work end-to-end without device setup; keep replies concise. Repository canonical name: NeatKnight18586/blox_story.
