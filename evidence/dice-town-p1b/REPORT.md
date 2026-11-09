# P1B — technical PASS; creative PARTIAL / pending user review

## Actual rendered evidence

- [A.png](A.png): native720×1280 plaza; nine-unit die vs5.19-unit canonical body (P1 die3.5 units), upper face three, front one/right two, four posed levitating inhabitants, grounded Leo.
- [B.png](B.png): native720×1280 Leo; enlarged oval-head attachment, narrower arms, existing tapered torso, side-part hair, collar/cuffs/brass fasteners and downturned annoyed mouth. Original global factory unchanged.
- [comparison.jpg](comparison.jpg): actual preserved P1 A/B beside P1B at390px phone width. Framing and staging differ; not a pixel-matched A/B lighting study.
- [candidate.png](candidate.png): real native WebGL asset test, **LEFT existing procedural avatar with side-part hair; RIGHT Kenney character-a**, equalized body height and common camera/light. This is a neutral factory comparison, not a claim that the import is Leo.

All are actual Three.js WebGL2 / Chromium141 ANGLE SwiftShader renders. No generated illustrations, upscale, post-processing stack or video.

## Visual judgment

The die now dominates and has a readable upper three; the unobscured physical rule plaque repeats the result. Raised figures have splayed arms, hanging offset legs and visible separation from floor projections. The still demonstrates suspended staging, not a simulated lift or impact. Leo is grounded in A; supporting actors are staged2.3–4.2 world units above ground before scaled leg rotation. The large die hides some town detail by design.

Clock face/pilasters, low bakery/chimney/display, archive columns and one low-poly tree add different camera-visible landmarks. Leo's raised-brow smirk is replaced by inward/downward brows and a clearly downturned mouth. Larger head, side-part hair and tailored teal silhouette distinguish him from the basic P1 figure.

Inspected native A/B, candidate and390px board. Remaining defects: buildings still have plain large walls and share a roof/window language; giant die obscures much of the authored market/colonnade; hair still reads as chunky sculpted clumps; B has a dark canopy corner and some sign/awning clutter; supporting actors remain bald and use one worried face; A's plaque words are small at phone width even though the three pips read. Mild self-shadow grain/aliasing remains. No severe hair/face or outfit intersections observed in these fixed views; no animated clipping/contact guarantee. Creative improvement and final suitability require human review, not test approval.

## External-asset decision

**Do not adopt the Kenney candidate for Leo.** Its hard cuboid head, texture-painted beard/clothes and proportions do not establish a stronger original Roblox-inspired design. It loads cheaply without new dependencies but needs adaptation to our controls. See [asset decision](../../stories/dice-town/P1B_ASSET_DECISION.md), bundled CC0 license, SOURCE.json and pinned mirror inspection record. Official Kenney page was HTTP403; mirrored provenance and hashes are documented rather than concealed.

## Verified checks

- `npm test`: all existing source regressions PASS, including F1/F2, casting, production/P1, story and speaking checks (regressions.log).
- `node tests/dice-town-p1b.js`: external GLB/texture hashes match pinned mirror manifest, CC0 record, six rigid meshes/no skin, cached expressions and tapered-base action identity PASS (source-tests.log).
- `node scripts/dice-town-p1b-proof.js`: native framebuffer, actual WebGL, six-part identity, A/B reverse-order/cold-reload exact screenshot hashes and focus seeking PASS. Candidate loads its external texture, retains all six mesh identities, static clip reverse seeking repeats pixels; no page exceptions (checks.json).
- preservation.json: previous production/avatar/appearance/story, S6 films and P1 evidence byte-unchanged. Only shared engine edit is one additive GLB MIME entry in the existing safe HTTP server; no public character/casting/action API changes.

Source tests are distinct from native browser evidence. Full old browser motion/MP4 suites were not rerun: no animation/export engine changes or new video were needed. Existing animation compatibility is preserved; imported-model retargeting and styled-Leo motion quality remain unverified.

## Cost / reproduction

Final complete proof pass: **9.81s wall, 17.72s sampled process-tree CPU, 819.8MiB sampled summed RSS**. Shared pages counted per process; sample interval.2s. This is final verification cost, not total task/model-token cost. Three complete measured proof passes plus one initial incomplete capture and one loader diagnostic were used; only final outputs retained. No paid service, new package, video or raw sequence. Candidate folder about156KiB.

```sh
npm test
node tests/dice-town-p1b.js
python3 scripts/dice-town-p1b-cost.py
python3 scripts/dice-town-p1b-board.py
# or native capture only:
node scripts/dice-town-p1b-proof.js
```

Interactive inspection: `npm run preview`; `/production/dice-town-p1b/` exposes `__dice.renderFrame(0/30/60)`; `/production/dice-town-p1b/candidate.html` exposes `__candidate.renderFrame(frame)`. These are fixed staged stills; Leo/support visibility differ per composition, not a motion timeline.

## Changed source

New isolated production/dice-town-p1b/ demo, face variant and licensed candidate; scripts/dice-town-p1b-{proof.js,board.py,cost.py}, tests/dice-town-p1b.js, story asset-decision document, evidence folder. AGENTS task boundary, README/STATUS notes and HTTP GLB MIME only. Existing P1 source/screenshots remain intact. No merge, P2, full town, new facial catalog, audio or episode work. Stop for visual review.
