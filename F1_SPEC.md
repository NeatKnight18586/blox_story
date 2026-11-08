# blox_story — F1 v3: Canonical Block Avatar (Source of Truth)
Status: **SPECIFICATION APPROVED FOR IMPLEMENTATION, NOT YET IMPLEMENTED OR VISUALLY VERIFIED**.
Supersedes the former F1 Kai/Mira-first design. Date: 2026-11-08.

## Head correction — user-approved revision (2026-11-08)
The latest user reference overrides the earlier rounded-cuboid head requirement: use an original softly rounded cylindrical/oval head, with straight cheeks, rounded top/bottom rims and flat caps. Keep the existing dimensions and six-part body. Facial features must follow its curved front surface. This correction remains F1; F2 is on hold.

## Purpose and locked direction
Produce **one** reusable, neutral, instantly recognizable, classic R6-like *block figure* in vanilla Three.js. The supplied four user images are the creative reference: plain gray/white avatar with rectangular torso/arms/legs, modestly rounded box head, faint bevels and optional minimal smile. One body rig drives all future characters. Hair, clothing, facial choices, accessories and colors are **swappable appearance layers**; they must never define the underlying anatomy. Characterization is a later demonstration, not the F1 acceptance subject.

Do not promise exact Roblox mesh/rig compatibility. The visual direction is "original classic block-game avatar," closely matching the submitted silhouettes, not copying proprietary Roblox assets or logos.

User constraints: iPad-only, no manual modeling, gameplay capture, editing or coding; free/minimal external infrastructure, and actual exported MP4s only in a future phase. Codex should execute implementation and verification autonomously where tools permit. Keep chat explanations concise.

## Reference-image priority
1. Reference 1: front orthographic neutral assembly, large square torso, rectangular arms/legs, head proportion and small gaps.
2. Reference 2: 3D bevels, rounded-square head, clean joints and subtle edge lighting.
3. Reference 3: tiny black oval eyes and a simple curved smile, uncluttered presentation.
4. Reference 4: check the same silhouette at small/mobile scale; dark background is optional.

The images are visual references supplied in the ChatGPT conversation and **may not be automatically accessible to Codex**. Do not say they are in the repository unless uploaded. This specification gives an implementable approximation; actual comparisons require the images or user review.

## Visual contract: the *undressed* master
- **One six-part block silhouette:** head, torso, left/right arms, left/right legs. No separated hands, sculpted shoes, chest anatomy, visible neck tube, fingers, elbows, knees or clothes on the base.
- Geometry: subtly beveled rectangular prisms, **not cylinders or spheres for limbs**; head is a softly rounded oval cylinder per the user correction, NOT a sphere. Blocks visually nearly touch with tiny intentional joint seams, no detached "floating cubes."
- Proportion **starting targets** (arbitrary world units; tune against reference renders):
  - torso **2.00 W × 2.00 H × 1.00 D**;
  - head **1.20–1.30 W × 1.12–1.20 H × 1.05–1.15 D**;
  - each arm **0.95–1.00 W × 1.95–2.00 H × 1.00 D**;
  - each leg **0.95–1.00 W × 1.95–2.00 H × 1.00 D**.
  - head centered above torso; arms straight at sides and top-aligned with torso; legs start at torso bottom; symmetric centered stance. Body height about 5.1 units, feet on y=0.
  - bevel radius on torso/limbs about **1–3%** of the smallest dimension, head rim **about 19% of head height**; adjust for image match, not decorative smoothness.
- Base material: neutral light-gray matte plastic on all parts; mild AO-like contact shading through lights/shadows if available. No realistic skin, fabric texture, gradients painted onto mesh, or reflective chrome.
- Face: separate replaceable layer attached to the head; default **classic_smile** (two small oval dark eyes, one thin curved dark smile); also **blank** and **worried**. Keep facial features on the frontal (+Z) head surface; smile should be a true curved stroke/mesh (not a straight bar). No facial features built into the body/head geometry.
- Clean readable silhouette at ~160 px avatar height. Avoid dramatic perspective, very narrow shoulders, excessive bevels, overlong legs, huge eyes or heavy eyebrows.

## Architecture and small F1 scope
Keep Three.js ES modules (currently pinned at 0.187.0); no Blender, Roblox Studio, React, Remotion or full animation engine. A tiny build/HTTP server is acceptable **only if needed** for a testable browser. No MP4/video/audio, scenes or storytelling in F1.

Suggested separation, not a license to build a sprawling framework:
- `avatar/baseAvatar.js`: `createBaseAvatar(options?)` returns `{root, pivots, parts, ...}`.
- `avatar/poses.js`: `applyPose(avatar, poseName, t=0)` using the same named pivots.
- `appearance/faces.js`: `applyFace(avatar, faceName)`.
- `appearance/appearance.js`: `applyAppearance(avatar, recipe)` for lightweight color and optional attachment changes.
- `preview.js`, `index.html`, `README.md`, `STATUS.md`; put small configs in existing or minimal extra files.

If existing source is simpler to adapt in place, choose that instead of gratuitous file churn. Do not keep Kai/Mira as required base identifiers. Preserve old implementation in Git history and migrate only once the canonical baseline is verified.

### Minimum stable API
- `createBaseAvatar(options = {})` returns a root THREE.Group, durable named pivot references `head`, `leftShoulder`, `rightShoulder`, `leftHip`, `rightHip`, and named body meshes.
- `applyPose(avatar,'neutral'|'walk_demo'|'look_down', t=0)`: deterministic, resetting all affected joints on every call, no rebuild of base meshes.
- `applyFace(avatar,'blank'|'classic_smile'|'worried')`: replaces or updates **face layer only**, not head or rig. Reuse/cache facial meshes where practical.
- `applyAppearance(avatar, recipe)`: one clear minimal recipe API; supports body/piece color and at least **one removable cosmetic demonstration** (e.g. cap or hair) without modifying base mesh topology or rig pivots. Optional future outfit/accessory categories documented but NOT fully built.
- `createCharacter(preset)` may remain a backwards-compatible wrapper or legacy file only if economical. F1 public contract is the new base-avatar API.

Position/rotation conventions: Y up, feet y=0 in neutral, face forward +Z, phase t explicitly supplied. Rigid parent-child pivots, **not** a skeletal skinned mesh. Walking is a *pose demonstrator* only; foot locking/root motion belongs to F2. No unsupported claim that current walk gait has physically planted feet.

## Preview and acceptance assets
Single master avatar shown first in neutral gray, with a minimalist selector for neutral/blank/smile/worried, poses and views. Optional cosmetic toggle should visibly add/remove an attachment on **the same avatar instance**, not create a new one. Neutral background (light or mid gray), ground plane and soft key/fill/hemisphere lighting with grounded shadows. Three-quarter and orthographic front/side camera positions should be repeatable; no extensive editor UI. iPad-friendly responsive canvas; no compulsory local tool use by the user.

Produce genuine browser/WebGL captures:
1. full-body front neutral gray + classic smile;
2. full-body three-quarter same rig;
3. full-body true side profile;
4. face close-up;
5. blank-face same body; and
6. same body with one cosmetic attachment, then removed (screenshots before/after or scripted assertion and one capture).

Capture at a mobile-readable size and inspect block proportions, head shape, seams, face readability, contact with ground, and shadow placement. These are REAL screenshots from the coded Three.js runtime, not AI generated concept art or mock/stub canvas output.

## Acceptance gates
**A — Source/API:** syntax/import in the actual environment; factory returns expected meshes and pivots; base has only six silhouette parts; explicit pose timeline; neutral resets; face switch and attachment removal; same rig object and body meshes retain identity; no detached limbs in neutral.

**B — Visual:** real-browser renders and six evidence views above; check reference likeness and mobile silhouette. If reference source images are inaccessible to Codex, record that fidelity comparison was limited rather than claiming exact match. Bevels/head/arm joints/face must clearly resemble reference direction.

**C — User practicality:** one working hosted browser preview or documented reproducible HTTP preview, no iPad local setup requirement for Codex task. Test that canvas initializes and controls work. Hosted public link is optional; do not invent one.

Mark **PASS** only if A + B were actually performed successfully; otherwise **PARTIAL** with blockers, or **FAIL** on broken implementation. STATUS must separate executed tests, unverified claims, screenshots, and known imperfections. A fake Three.js mock test is supplementary and cannot establish rendering. Targeted fixes allowed as necessary, but don't roam into F2.

## Explicit non-goals
- No Kai/Mira final appearance requirement; no gendered base, no hoodie/pink top/hair presets as a prerequisite.
- No Roblox-owned meshes, logos, downloaded paid assets, user gameplay recording, or exact official R6 skeleton certification.
- No full outfit library, complex face rig, character pack, navigation, walk cycles with IK, environments, story, music, captions, audio, MP4 or frame render system.
- No source deletion without safe replacement / test evidence; no claim of visual PASS based only on syntax or stub tests.

## Later stages — compatibility promise only
F2: deterministic reusable action clips and basic foot/ground management around the same avatar.
F3: set pieces, camera tracks, shadows/effects.
F4: episode JSON scheduling and automated frame-to-MP4/audio pipeline.
These phases **must reuse the locked base-avatar rig and appearance attachment interface**. They are NOT part of F1.
