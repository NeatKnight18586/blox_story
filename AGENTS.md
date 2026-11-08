# AGENTS.md — blox_story / BlockStory V2

## Scope and intent
This repository preserves the existing F1 rigid-pivot Three.js character factory. Respect F1_SPEC.md as acceptance criteria, STATUS.md as evidence, and CODEX_HANDOFF.md as the current task. User uses an iPad and does not want manual coding, recording, or local setup.

## Invariants
- Do not regenerate, replace, or refactor away existing Kai and Mira. Maintain character.js, presets.js, stable IDs kai and mira, and exported createCharacter, applyPose, applyExpression signatures.
- Stay in F1. No full videos, MP4, stories, voice, Remotion, Blender, React, npm rewrite, or F2/F3/F4 systems.
- Keep Three.js 0.187.0 pinned unless an explicit, tested reason requires a change.
- All poses must be deterministic with time t passed as input. This is a rigid-pivot hierarchy, not a skinned rig.
- Report exact tests run. Do not call visual inspection PASS without real Three.js browser captures.

## Current Codex task
1. Read source, tests, F1_SPEC.md, README.md and STATUS.md. Run node --check and node tests/smoke.cjs.
2. Serve index.html over HTTP with real Three.js and WebGL. If CDN is unavailable, attempt one minimal dependency fix, preserving the API.
3. Capture six genuine views: Kai and Mira front, three-quarter, worried close-up; inspect shadows, soles, clipping, silhouette, faces and controls.
4. Make at most one targeted repair if required, rerun checks, and update STATUS.md accurately.
5. Commit your work and give a concise PASS/PARTIAL/FAIL with links to actual captures if supported.

Preserve the existing character factory for future F2–F4 phases. Do not progress to F2 without genuine visual inspection.
