# Hair reference study — four supplied Roblox-like hair designs

**Status: exploratory sculpted mesh proofs PASS technically, close-match visual approval FAIL/PARTIAL.** Do not merge PR #21 on the strength of the tests. Main and Names100 PR #20 remain unaffected.

## Reference pairing (the user supplied 8 images privately in chat; do NOT commit them)
1. Boy reference A: `IMG_2301(1).webp` hair and `IMG_2309(1).jpeg` worn example → opt-in ID `sculpt_swept`.
2. Boy reference B: `IMG_2305(1).webp` hair and `IMG_2308(1).jpeg` worn example → opt-in ID `sculpt_shag`.
3. Girl reference A: `IMG_2306.webp` hair and `IMG_2307(1).jpeg` worn example → opt-in ID `sculpt_bob`.
4. Girl reference B: `IMG_2311.webp` hair and `IMG_2310.webp` worn example → opt-in ID `sculpt_long`.

Gender labels describe these four references, not rig limitations. All hair IDs work on one shared avatar. The images show limited viewpoints; **exact source topology or a true 1:1 recreation cannot be proven without source meshes or front/side/back references**.

## Why prior V2 hair fell short
The initial 9-style starter catalog used rounded boxes; silhouettes looked like isolated geometric chunks. Reference Roblox/UGC hairstyles use contiguous **rounded crown plus broad curved, flattened, layered, tapered sculpted locks**. Strand direction, irregular length, weight and a believable hairline are more important than random procedural spikes. Simple materials/lighting cannot hide incorrect hair geometry.

## Current proof
- Introduced `appearance/v2-sculpted-hair.js`: original solid interpolated 3D elliptical lock lofts fitted around existing square-ish head; head pivot, cached wardrobe and skin IDs unchanged. Source produces 4 opt-in styles `sculpt_swept`, `sculpt_shag`, `sculpt_bob`, `sculpt_long`.
- Tests: old repo regression + V2 component + genuine Chromium WebGL 720×1280 proof. 12 additional front/three-quarter/side stills saved in **Actions artifact `v2-sculpted-hair-multiview`** for manual visual evaluation.
- **NO claim of 1:1 likeness or production-ready asset quality**. Visual inspection shows better volumetric coverage but locks remain too rope-like/round, with insufficient broad sweeping planar sections, naturally tapered tips and deliberate parting. Profile/texture variation and back silhouette require refinement.

## Professional next approach — asset authoring, not a larger generator
- Prefer **one carefully shaped original mesh per hairstyle**, modeled once in Blender with a head mannequin matching our coordinates; e.g. bezier curve paths with asymmetric/custom cross-section and radius taper, mesh editing/sculpting, corrective sculpt of fringe, side masses and crown. Follow Blender curve geometry tools: https://docs.blender.org/manual/en/dev/modeling/curves/properties/geometry.html
- Preserve the reference hairstyle's overall primary silhouette. Use fewer **broad layered masses** rather than ten same-thickness round tubes; tune the forehead split and front lock overlap, directional broad highlight edges, hair-to-face fit, and clean rear volume.
- Test three-quarter + front + true side + **rear** and at least one look-down/arm-reaching pose; check zero scalp gaps, forehead/eyes visibility, hair not hitting collars/shoulders, readable shape at native720×1280 and 180×320.
- For an asset actually to be uploaded to Roblox Studio, export a single merged, watertight accessory mesh, fit with **HairAttachment** and use the Accessory Fitting Tool. Roblox rigid-accessory spec calls for **one mesh and ≤4,000 triangles**; our current grouped WebGL prototypes are **not validated Roblox Marketplace accessories**. Sources: https://create.roblox.com/docs/art/accessories/specifications and https://create.roblox.com/docs/art/accessories/accessory-fitting-tool
- For blox_story-only use, export final reusable `.glb` meshes (not a paid Marketplace upload), preserve material and attachment metadata, load once per actor and cache. Ensure deterministic ID assignment in cast JSON; no new Codex sculpt prompt per episode.
- Match material stylization to the 2–3-tone baseline, without forced cel shading or heavy outlines. At phone-size, silhouette > microstrand count.

## Strict four-viewpoint gate
1. **Character/UGC modeler**: head conform, smooth volume, correct parting and realistic sculpted primary locks, no detached tubing.
2. **Animation TD**: stable head parenting, 4-view fit, no clipping through face, arms, clothing in pose switches; performance/memory.
3. **Cinematographer**: face visibility, coherent matte highlights and contrast under moonlight/sunrise, no dark flat mass.
4. **Roblox Short viewer**: obvious Roblox-like hair rather than generic cylinders, different identity from four meters away at mobile size.

**STOP RULE:** Keep PR #21 draft and don't modify Names100. One curated polish pass to these 4 assets only; do not expand to 20 styles, introduce physics, paid assets or a new shader engine. Review snapshots before integrating anything into a full episode. This repo is an original Roblox-like 3D video renderer, not a Roblox Marketplace pipeline.
