# blox_story — BlockStory V2 / F1 Character Lab

Original Roblox-like blocky 3D Kai and Mira characters built from **one reusable rigid-pivot factory**. Scope is F1 only, NOT an episode or MP4.

## How to preview
Serve files over HTTP using `python -m http.server 8000`, then open `http://localhost:8000/` in a WebGL-capable browser. The import map in `index.html` loads pinned `three@0.187.0` from jsDelivr; internet access is required. Opening `index.html` using `file://` is not guaranteed to work.

On an iPad, use an accessible HTTPS hosted preview. The user has asked Codex to run the verification, so do not require user-side coding.

## Source API
- `presets.js`: appearance presets with stable IDs `kai`, `mira`.
- `character.js`: `createCharacter('kai'|'mira')`, `applyPose(character, 'neutral'|'walk_demo'|'look_down', t=0)`, `applyExpression(character, 'neutral'|'worried')`.
- `preview.js`: camera, lights, ground, controls and browser inspection hooks.
- `index.html`: preview UI and pinned Three.js import map.
- `tests/smoke.cjs`: self-contained structural test using a fake Three.js API. **Not** proof of visual rendering.

`createCharacter` returns `{root,id,preset,pivots,parts}`, where root is a Three.js Group and pivots include `head`, `leftShoulder`, `rightShoulder`, `leftHip` and `rightHip`. Poses reuse meshes and are deterministic based on t.

## Checks
```sh
node --check character.js
node --check presets.js
node --check preview.js
node tests/smoke.cjs
```
See `STATUS.md` for exact verification, `F1_SPEC.md` for requirements, `AGENTS.md` and `CODEX_HANDOFF.md` for Codex instructions.

Current inherited status: **PARTIAL**, pending genuine browser/WebGL screenshots. Do not proceed to F2 until accepted.

## Future scope only
F2 deterministic animation clips; F3 environments/camera tracks/future-shadow; F4 episode JSON and automated rendering/audio. Reuse and version the F1 cast, never recreate it.
