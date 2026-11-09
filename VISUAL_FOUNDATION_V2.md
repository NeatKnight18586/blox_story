# Visual Foundation V2 — Original block-cinema lookdev library

**Status:** opt-in R&D branch. It does **not** change any approved names100 scene, PR #20 master, audio, counters or captions. Visual acceptance requires real WebGL proof; source edits alone are not a style PASS.

## Reuse, not regeneration

Roblox-like appearance should be modular: **one canonical body + skin tone + hair + clothing + facial expression + shot/camera**. The IDs below let Codex or any new episode choose from existing pieces, not re-model them.

Example **cast appearance** (optional keys; same six-part body, head/shoulder/hip pivots):

```json
{
  "skinToneId": "warm",
  "hair": "messy_fringe",
  "hairColorId": "espresso",
  "pieces": {
    "torso": "#35719b", "leftArm": "#35719b", "rightArm": "#35719b",
    "leftLeg": "#324056", "rightLeg": "#324056"
  }
}
```

### Available assets

- **Skin IDs (8):** `porcelain`, `fair`, `peach`, `warm`, `tan`, `caramel`, `umber`, `deep`. Curated colors, no random choices or gender/race assumptions; optionally show small hands below sleeve cuffs.
- **Hair IDs (9 new):** `side_swept`, `spiky`, `messy_fringe`, `curtains`, `long_straight`, `ponytail`, `twin_buns`, `curly_crop`, `low_bun`. The original `bob` stays available. All are wearable by any character.
- **Hair colors (8):** `black`, `espresso`, `brown`, `chestnut`, `blonde`, `platinum`, `auburn`, `blue_black`.
- **Bodies:** existing `classic` and `tapered`. **Hat and hair remain exclusive** to avoid overlapping accessories. Hair is cached by ID/actor and retinted without building a new geometry each frame.

The *actor cast JSON* pins these IDs. Do not synthesize meshes or colors via prompts for each episode.

## Optional visuals (new episodes only)

```js
import {applyToonV2} from './appearance/v2-toon.js';
import {createV2Backlot} from './production/assets/v2-backlot.js';
createV2Backlot(scene,{palette:'moonlit',layout:'street_depth'});
const look=applyToonV2(scene);  // opt-in; use only after assets are instantiated
look.restore();                // reverses material experiment
```

- Toon is **three-band MeshToonMaterial with nearest filtered gradient**. Transparent ghosts and already-flat facial strokes are excluded from conversion. **Not** automatically added to the existing names100 renderer.
- Backlot is a **simple 2.5D street/homecoming set**: a few depth-layered facades and warm windows behind the actors. Available `moonlit/sunrise` palettes and `street_depth/homecoming` layouts. Never build invisible modules.
- Keep strong facial/skin separation, flat simple geometry and warm/cool color contrast. Avoid thick black outlines or heavy post effects unless phone-size A/B proves improvement.

## FREE quality proof using GitHub Actions (zero Codex credits)

A workflow (`.github/workflows/visual-v2-proof.yml`) runs source/geometry tests and Chromium WebGL screenshots at **real 720×1280**, for **9 skin/hair combinations × standard/toon = 18 frames**. Once the PR opens, use **PR → Checks → Visual V2 Opt-in Proof → Artifacts → v2-mobile-look-tests** to download images on iPad, provided Actions is enabled and the job passes.

For a local laptop (not iPad-only): `npm ci`, `npx playwright install chromium`, `node tests/v2-library.js`, `node tests/v2-browser.js`. Or `npm run preview` and visit `http://localhost:8000/production/v2-preview.html?hair=spiky&skin=tan&toon=1`.

**Approval is visual, not test count:** hair from front/side, eyes/brows unobstructed, flesh matches hands, clean silhouette, ghost transparency not damaged, readable 9:16, toon not excessively harsh. If tests fail, fix the specific defect **before** any broad redesign.

## Professional limited-animation playbook

1. Pose and frame first. Design a readable main action and one emotional emphasis per shot.
2. Reuse 3–5 approved poses plus gaze/anticipation/held reactions, not endless arm flapping.
3. Layer imagery: clear foreground hero, midground home/props, distant cheap facades; move camera or a small background element for parallax when needed.
4. Render storyboard stills cheaply; only render 1–2 seconds to assess acting/shader flicker after stills pass.
5. Script the episode against approved IDs and shot windows, then render once with deterministic/resumable exports; overlay counters, captions and audio afterward.

## Current verification limits & publishing

Only source structure and Node parsing can be checked in the local ChatGPT container; its runtime has no `node_modules` or network access for `npm ci`. The GitHub Actions workflow is the real rendering/test gate. **Do not merge until Checks PASS and screenshots are visually inspected.** Do not alter or replace PR #20 before final native iPad approval.

## Research sources

- Roblox Creator Hub (geometry/rig/cosmetics/attachments): https://create.roblox.com/docs/avatar
- Roblox character body attachment locations: https://create.roblox.com/docs/avatar/character-bodies/specifications
- Three.js native toon materials: https://threejs.org/docs/#api/en/materials/MeshToonMaterial
- Blender toon shading limitations (supports careful nonphotorealistic look development): https://docs.blender.org/manual/en/dev/render/shader_nodes/color/shader_to_rgb.html
- YouTube Shorts viewer metrics (visual quality alone is not proof of virality): https://support.google.com/youtube/answer/11914225
