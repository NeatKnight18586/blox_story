# Four-Hair Final-Selection Review

**Status:** Four production-direction assets implemented and native WebGL proof technically passed. **Visual acceptance: provisional** until shot-level motion/collar checks. The user rejected bacon hair and 1:1 Roblox imitation; those prototype source files and public casting IDs have been removed from the active V2 branch. Existing legacy `bob` remains for archived movies. Names100 PR #20 untouched.

## Locked small catalog

| ID | Visual role | Purpose |
|---|---|---|
| `neat_side_part` | short cut A | tidy diagonally swept fringe and temples; no overlong strands |
| `soft_textured_crop` | short cut B | controlled irregular texture; differs from A without tall spikes |
| `low_bun` | hair-up | low nape bun visibly joined to swept scalp, face clear |
| `shoulder_length` | hair-down | relaxed lob, mild face frame, stable back silhouette |

IDs don't enforce gender; any avatar can use any hair. Color variations provided by existing `hairColorId`, with controlled per-piece tonal change. No procedural regeneration per episode.

## Verified technical gate

[GitHub Actions run 42565271892](https://github.com/NeatKnight18586/blox_story/actions/runs/42565271892) reports **PASS** for npm tests, V2 catalog tests, eight standard/toon proof renders, and twenty head close-ups (front, 3/4, side, rear, head-turn) at genuine **720×1280**.

Hair stays in original head pivot; cached cast style is reused, six body parts preserved. No new dependency, no audio/video output, no modification to Names100 scripts or S6 artifacts. Archived films were not rerendered, so old hash equivalence was not independently retested by this task.

## Four expert-perspective council (qualitative; one assistant, not four independent specialists)

| Lens | Score | Harsh findings |
|---|---:|---|
| Character design / stylized art | 7/10 | compact silhouettes and color system are cleaner; crown still slightly too geometrically smooth for close-up hero work |
| 3D technical animation | 8/10 | explicit stable head attachment and head-turn stills; continuous head/shoulder motion and coat/collar occlusion require a short targeted check |
| Shorts editing / mobile readability | 8/10 | readable identities in 9:16; texture crop and side part are similar enough that wardrobe color should distinguish them |
| Solo producer / engineering | 9/10 | only four stable IDs, reusable cache, old films protected, no per-episode token burn; no value in growing asset count yet |

## Five simulated player lenses — NOT real player feedback

| Perspective | Rating | Likely hard criticism |
|---|---:|---|
| Roblox-savvy teen viewer | 7/10 | 'Clearly game-like, but not a recognizable branded Roblox hair item' — acceptable because this is original creator cinema |
| Avatar-fashion enthusiast | 6.5/10 | 'Bun could benefit from slightly richer parting; down hairstyle is simple, not salon-quality' |
| Casual Shorts viewer on phone | 8/10 | 'I can tell characters apart; hair won't distract me from the plot, which is more important' |
| Mobile viewer under fast cuts | 8/10 | 'No giant spikes or weird swinging hair; silhouettes read at small size' |
| Skeptical animation viewer | 6.5/10 | 'Still procedural and somewhat generic in an extreme close-up; consistent clothes and lighting matter' |

These ratings are **illustrative critical assessments**, not surveys, measured viewer opinions, or a promise of trending performance.

## Acceptance decision / stop rule

**ACCEPT as the small reusable starter library for subsequent episodes**, with standard matte materials the default and optional toon mode only after episode-level A/B. **Do not certify a finished production hero asset** until one 1-second head-look/walk excerpt at real 720×1280 shows no hair/face/collar intersections. Fix only if that narrow test catches a severe defect; otherwise freeze all four.

Do not add more hairs, new facial rigs, texture packs, paid Blender plugins, or reconstruct copyrighted UGC meshes. Complete Names100 first; the existing complete native master is the release priority. Future characters select one of these four hair IDs rather than spending model tokens to generate each hairstyle anew.

## Research

- Roblox rigid accessories and HairAttachment head fitting: https://create.roblox.com/docs/avatar/rigid-accessories/specifications
- Roblox Accessory Fitting Tool tests different avatar bodies/animations: https://create.roblox.com/docs/art/accessories/accessory-fitting-tool
- Three.js indexed geometry and normals: https://threejs.org/docs/pages/BufferGeometry.html
- Blender hair curve bevel/taper principles: https://docs.blender.org/manual/en/4.5/modeling/curves/properties/geometry.html
