# Dice Town P1C — technical PASS; creative PARTIAL / awaiting review

## Actual stills and comparison

- [A.png — revised plaza](A.png), native720×1280.
- [B.png — Leo hero frame](B.png), native720×1280.
- [comparison.jpg](comparison.jpg), P1 / P1B / P1C columns, plaza and portrait rows;390px phone width per panel. Actual preserved native sources, not matched camera/lighting-only experiments.

All are genuine Three.js WebGL2 screenshots, Chromium141 / ANGLE SwiftShader, DPR1. No AI illustration, upscale, video, audio or caption pass. No creative approval is inferred from tests.

## Changes and visual reasoning

- Die scaled uniformly from9 to6.3 world units: about1.2× the canonical5.19-unit body height instead of1.7×. Base remains on its plinth; visible top/front/right faces retain3/1/2. The reduced mass leaves more room for the town while remaining the plaza focus. Dark unlit pip material deliberately protects upper-three readability against lighting variation.
- Physical rule plaque moved forward and turned toward the camera, with a larger relative lettering area. Leo and the nearest lifted resident flank it. Wider plaza framing prioritizes the die, plaque, clock tower and suspended figures together.
- Added a blue-to-warm gradient background, visible sun disc with a small alpha-texture glow, two simple cloud clumps and three shallow distant roof profiles. These use stock geometry/materials, no bloom/DOF or shader framework. The background gradient is screen-space for these fixed still cameras; disc and clouds are actual world objects. Disc/key share azimuth but use art-directed elevations, not an astronomical sunlight model. This is not a validated moving-camera sky system.
- Reused the clock/bakery/archive set. Low bakery no longer has upper windows projecting through its roof. Existing tree/poles were moved away from the portrait silhouette. One slatted bench and two planted entrances add signs of everyday use without building a town grid.
- Leo keeps P1B's cached annoyed face and unchanged oval head/pivots. Slightly lower hair silhouette, warmer brown material, triangular lapels replacing rectangular bars, and a forward strap layer improve shape/clearance. New portrait staging keeps the die out of the face background and uses sky/cool facade contrast. Key/fill and shadow bias were adjusted for readable face and cleaner clothing.

## Visual review / quality question

Reviewed native A/B and the390px comparison. The sky is no longer blank, die scale is more credible, upper three and plaque are unobstructed by Leo, and annoyance remains clearly downturned. Hair clears eyebrows/eyes; notebook stays below the face; collar, strap and notebook have distinct silhouettes. Floating residents show air gaps and floor projections; this is still staging, not a levitation simulation.

**Does this feel like a real Roblox-style story world rather than a prototype? Closer, but not fully.** Sun/sky, landmarks, everyday props and improved hierarchy make the town more coherent. Broad plain facades, chunky hair, bald/repeated supporting figures and a large plain foreground still reveal the procedural prototype. Pip remains close behind Leo in A, and a side arm meets the frame edge; crowd staging could be cleaner. B retains some partial shop lettering/clock crop, and subtle shadow-map grain can remain at native size. The plaque's wording is small at390px even though the result three is clear. These are explicit remaining creative limitations, not hidden automated PASS conditions.

No severe face/hair intersections observed in the reviewed frames. Moving-camera, clothing-motion, crowd collision, die physics and full episode quality are outside this proof and unverified. Stop for the user's image review; do not automatically polish again or begin P2.

## Technical validation

- `npm test`: existing source regression suites PASS (regressions.log). No character API, animation, story or pipeline source changed.
- `node --check production/dice-town-p1c/scene.js` and `sky.js`: PASS. Existing P1B source/asset/identity test PASS (source-tests.log); no new external asset adoption.
- `node scripts/dice-town-p1c-proof.js`: PASS actual WebGL,720×1280 framebuffer, six-part body identity, frame0/30 reverse-order exact PNG hashes and cold-reload equality, frame60 focus sample, no page exceptions (checks.json). Frame numbers choose still compositions, not a new animation timeline.
- preservation.json verifies prior avatar/appearance/production, pipeline server, original story, S6 and P1/P1B evidence byte-identical to055d585. Existing public controls and P1B assets remain intact. Full old motion/MP4 browser suites were not rerun for this isolated still-only path.

## Measured cost and reproduction

Final capture/verification: **8.87s wall, 16.00s sampled process-tree CPU, 816.1MiB sampled summed RSS**, shared pages counted per process, .2s sampling. Four bounded capture/review passes; only final resource receipt is retained, so it is not a task-total or model-token measurement. Two retained native screenshots and one compact board; no raw sequence, new dependency, new asset pack or paid tool.

```sh
npm test
node --check production/dice-town-p1c/scene.js
node --check production/dice-town-p1c/sky.js
node tests/dice-town-p1b.js
python3 scripts/dice-town-p1c-cost.py
python3 scripts/dice-town-p1c-board.py
```

For capture without profiling: `node scripts/dice-town-p1c-proof.js`. Preview with `npm run preview`, `/production/dice-town-p1c/`; `__dice.renderFrame(0)` plaza, `30` portrait, `60` retained focus inspection sample. Static explicit frame selection only.

## Changed files

New production/dice-town-p1c/{index.html,scene.js,sky.js}; scripts/dice-town-p1c-{proof.js,cost.py,board.py}; evidence/dice-town-p1c/ images, report and verification receipts. AGENTS current boundary and README/STATUS notes only. No existing renderer/character/face factory edits, asset-system rewrite, merges or P2 work.
