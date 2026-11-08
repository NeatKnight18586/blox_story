# blox_story — BlockStory V2
**Current target: F1 v3 — one canonical block avatar.**

This repository aims to make original, classic Roblox-like, code-rendered animated Shorts without manual gameplay recording. The **current F1 task is NOT a video**: build and visually validate one neutral, six-part, R6-inspired block avatar; future looks are applied through optional face, color, hair/clothing and accessory recipes. See [F1_SPEC.md](./F1_SPEC.md) for the complete acceptance requirements.

## Current implementation status
**REALIGNMENT SPEC WRITTEN; CODE MIGRATION PENDING.** The existing `character.js` / `presets.js` / `preview.js` and `index.html` are the **legacy Kai/Mira-first prototype**. They have NOT yet been migrated to F1 v3. Do not mistake their API or older tests for successful acceptance of the new base avatar.

Codex should follow [AGENTS.md](./AGENTS.md), [CODEX_HANDOFF.md](./CODEX_HANDOFF.md), [CODEX_FIRST_TASK.txt](./CODEX_FIRST_TASK.txt), and [STATUS.md](./STATUS.md).

## F1 v3 target API (not yet built)
- `createBaseAvatar(options?)`: neutral six-part figure with persistent named pivots.
- `applyPose(avatar, 'neutral'|'walk_demo'|'look_down', t=0)`: deterministic rigid posing.
- `applyFace(avatar, 'blank'|'classic_smile'|'worried')`: independent face layer.
- `applyAppearance(avatar, recipe)`: basic recolor and attach/remove one demo cosmetic.

## Legacy preview and tests
The *old* preview requires an HTTP server, e.g. `python -m http.server 8000`, and a WebGL browser with access to `three@0.187.0` via its CDN. Opening `index.html` via `file://` may fail. Legacy nonvisual checks:
```sh
node --check character.js
node --check presets.js
node --check preview.js
node tests/smoke.cjs
```
These checks **do not prove new F1 compliance**. Read STATUS.md for verified vs. pending work. User is iPad-only, so Codex should perform development and rendering checks without asking the user to install local software.

## Later roadmap — not part of F1
F2 deterministic actions; F3 environments/camera/effects; F4 episode JSON and automated MP4/audio rendering. The same finalized base avatar must remain reusable throughout.
