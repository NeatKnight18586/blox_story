# Bacon Hair — single-asset production study (9 Nov 2026)

**User reference:** `IMG_2313.jpeg` (uploaded in chat, not committed). Classic Roblox Pal/Bacon Hair visual target. This work makes an original stylized video-rendering look, not an extracted or redistributed Roblox accessory.

## Current art verdict
**PROVISIONAL ACCEPT / 7 of 10 for block-story mobile visuals.** 1:1 fidelity to the supplied JPG **NOT verified**. Stronger than previous geometric wig prototypes. The characteristic dark brown + caramel sweeping pattern reads from the front and 3/4 view. Remaining difference: understructure/crown still looks more evenly rounded than the original, and deeper undercut/interlocking swept volumes in the reference are more complex.

## What changed, explicitly
- Added `appearance/v2-bacon-hair.js`: nine dark-brown underlying/broad hair masses, six warm caramel/copper highlight clumps, and one fitted cap understructure.
- Each highlighted section is now a **shallow three-dimensional curved tapered band**, not a flat painted orange line or a disconnected box. Kept asymmetrical front fringe and temple waves; original six-part avatar/face/action system untouched.
- Stable appearance choice: `"hair":"bacon"`. Its two-tone palette is locked for recognizable identity and is not overwritten by `hairColorId`.
- Existing V2 hair IDs remain available; older episode casting defaults remain unchanged.

## Real verification
- [Workflow run 42563715575](https://github.com/NeatKnight18586/blox_story/actions/runs/42563715575): `npm test`, V2 library, original browser galleries, sculpted browser, dedicated bacon browser all PASS.
- Dedicated proof: **8 actual 720×1280 Chromium WebGL images**; front/3-quarter/side/rear at portrait-close and medium-camera distances. GitHub Actions artifact: `v2-bacon-hair-review`.
- Current code **is not** a Roblox Marketplace accessory. Its constituent open loft meshes are not merged/watertight; do not call it compliant even if the total triangles appear acceptable. HairAttachment here is the blox_story head-pivot metadata.

## Professional reasons and next economical steps
Roblox's official rigid accessory workflow is **single modeled mesh + textures + attachment**, fitted on a mannequin; for Marketplace accessories, ≤4,000 triangles and watertight geometry apply: https://create.roblox.com/docs/avatar/rigid-accessories/specifications. Original classic Pal Hair models in Creator Store have been documented at roughly 1,562 triangles, demonstrating that silhouette and art direction matter more than raw polygon count: https://create.roblox.com/store/asset/87276448/Pal-Hair.

1. Do not regenerate a wig in each future episode. Select `hair:"bacon"` in cast config and reuse the cached asset.
2. Before hero close-ups: one optional additional **artist-modelled** crown/undercut polish pass, preferably with Blender custom cross-section curves + an original watertight merged GLB; keep exactly the same hair ID.
3. For today's video's production: **do not force this new hairstyle into Names100** or rerender 1,641 frames without a visual narrative reason. Finish the approved Names100 master independently; use this hairstyle for an appropriate character in subsequent episodes after user signoff.
4. Keep PR #21 as draft pending the user's review of the 8-view image board. Do not change the other hairstyle models now.

## Strict four-council summary
- Roblox character artist: 7/10; signature brown-caramel identity is legible; crown and strand interlock still simplified.
- 3D mesh specialist: 6.5/10; curved lofts improve dimensionality, but the scalp remains rounded and independent surface pieces need authoring for more natural contour.
- Animation TD: 9/10 for supported head attachment and cached explicit hair ID; posed collision/motion still unverified.
- Shorts creator: 7.5/10 for screen-size recognizability; not yet 1:1 for close-ups.

**Technical PASS. Art-direction PARTIAL (user approval pending). Never label source/reference duplication or Marketplace compliance as verified.**
