# P5 — three-issue finish gate

**PASS for the bounded still gate: A shadow finish, B ghost clarity, C ending counter contrast. Human creative approval remains pending.** All three improve; end look-development here. No motion/full-episode export or audio work.

[Five matched before/after comparisons](before-after.png) · [Phone-reduced three-scene overview](phone-overview.png).

## Native originals

| Absolute frame | Actual720×1280 finished frame | Before source |
|---|---|---|
|700|[Ghost Mara](after-700.png)|[P4 clean700](../names100-p4/clean-700.png)|
|1392|[Sunrise reunion](after-1392.png)|[P4 clean1392](../names100-p4/clean-1392.png)|
|1528|[Ending1](after-1528.png)|[P4 editorial1528](../names100-p4/editorial-1528.png)|
|1529|[Ending0](after-1529.png)|[P4 editorial1529](../names100-p4/editorial-1529.png)|
|1628|[Forgotten Eli](after-1628.png)|[P4 clean1628](../names100-p4/clean-1628.png)|

The comparison boards apply **identical, unchanged approved B/C captions** to both sides where those tracks exist. P4 clean before originals above do not contain captions. No new caption timing or typography. Actual native WebGL canvas/drawing buffer720×1280, pixelRatio1; no upscale. Raw new clean plates and temporary composited baselines stay under ignored `renders/names100-p5-stills/`; only five selected finished originals and two reduced boards enter Git. [Capture receipt](native-captures.json), [source/image hashes](provenance.json).

## Prerequisite integration

Reviewed PR16 at `cc62312`, reran `npm test`, `npm run test:counter`, `python3 tests/captions.py`, `node tests/performance-motion.js`; all passed. Viewed its genuine boards and inspected framebuffer/repeat evidence. P4 explicitly recorded these three finish limitations; P5 accepts its counter direction, not a previously unclaimed production art lock. Merged with history preserved at `d10f1217d5fec44819c39ac7a5da29e413c9cdd9`. [Integration receipt](integration.json).

## One controlled solution per issue

**A — PASS, modest shadow improvement.** Source inspection: courtyard1024² map covers24×24 world units; bedroom2048² covers18×19. Installed Three0.187.0 has removed `PCFSoftShadowMap` and already falls back to PCF. P5 explicitly uses that existing hardware PCF path, no upgrade/shader/postprocess. Opt-in shadow-only settings: courtyard2048² with18×18 coverage; existing bedroom coverage retained; radius4, bias−0.00008, normalBias0.012, shadow intensity0.9. Directions and lights' colors/intensities stay unchanged. Courtyard texel pitch falls0.02344→0.00879 world units (2.67× denser). Compare1392/1628: smoother face/ground boundaries with feet/shadows still connected and no newly visible frustum cut.

Initial radius6 softened more but introduced distracting face grain. **One targeted shadow revision** narrowed it to4; no further experiments. Fixed ground-edge scan at1392,x415,y980–995:10–90% transition3→5pixels; largest adjacent RGB-mean step15.33→11.00. This is a declared local measure, not a universal image-quality score. Contact edges remain appropriately firmer; small PCF grain remains at native size. No claim of path-traced soft lighting.

**B — PASS, coherent outer ghost silhouette.** Existing `ghostFrontDepth` is constructed before removable wardrobe is applied: it covers the original body, omitting hair/cap/vest. The new opt-in finish synchronizes cached depth helpers **after** appearance/actions/effects each frame. One shared depth-only material and shared original geometry cover all current non-face/non-tag surfaces. Existing incomplete depth helpers are disabled only in P5; no material/body replacement. Compare700: doubled hair and inner vest/body edges disappear; eyes/MARA tag stay legible. Compare1628: cap/torso layers form a clearer outer contour, with intentional translucency and body/shadow presence. Opacity remains exactly the source's0.58→1 restoration and forgotten Eli's1→0.78. Fully human frames disable the prepass. Background set/room objects remain visible through the ghost; internal body layers no longer stack. This is stylized nearest-surface transparency, not physically correct volumetric transmission.

**C — PASS, charcoal only on S22.** New separate `p5-editorial.json` overrides only numeral fill/keyline on S22: charcoal RGB24/32/40 with existing restrained warm-white edge. P4 positions/font/size/spacing/visibility/fade are unchanged. Night numerals remain warm white. No panel, border, roll or decorative animation. Actual rendered fill/wall contrast:1528 minimum/median7.51:1;1529 minimum7.33:1, median7.51:1, versus P4 warm-white fill≈1.91:1. Counter ink remains within x93–148,y165–233 in these two frames, safely above the head/caption. [Local measurements](finish-metrics.json). This checks opaque glyph interiors on these actual wall pixels, not every antialiased edge/background in the story.

## Verification and limitations

One affected regression batch, [complete log](regressions.log):

```sh
npm test
npm run test:counter
npm run test:finish
python3 tests/captions.py
node tests/performance-motion.js
```

All PASS: F1/F2A/both gaits/P1/P2A/story source tests;1641 unchanged explicit-time actor/camera/appearance/counter samples; original P4 ASS regenerates byte-identically; new ASS differs only by S22 color tags, retaining all boundaries/values/fades. Eight actual archived legacy WebGL golden matches and18 existing S3B movie-input random seeks still match. New13 boundary samples test real WebGL restoration889/890/891/910/925/926 and ending1528/1529/1530, human/ghost states, cold renderer and reverse pixels, body/pivot/material identities and exact world-matrix/contact equivalence with legacy. Forgotten ramp is still zero at its start1529 and grows at1530; numeric0 is fully visible at1529. An initial test assumed an already-positive ghost ramp at1529; corrected the test to use the authoritative sampled state, without changing the engine/timing. [Seeking receipt](seeking.json).

Each native selection also repeats pixels/state after seeking from restored926 or final1640. Five native target frames per batch; target/from/repeat draws plus two initialization frames=17 native draws per batch,34 total for the initial attempt plus single shadow revision. No motion proof was exported: stills await human approval, and the excerpt is optional. No MP4 decode/playback result is claimed for a nonexistent P5 video.

[Preservation receipt](preservation.json): all prior evidence,12 films,original WAV,approved white captions,rigs,appearance,actions,camera/shot inputs and exact cuts remain byte-identical. No audio processing, new dependencies or geometry redesign.

## Reproduce / reuse

```sh
# Existing v3 S1 story JSON: add finish:"p5" and counterMode:"clean".
# Bounded proof (only the same five selected frames):
npm run proof:finish
# Graphics-only regeneration from retained clean plates; no WebGL:
python3 scripts/p5-sheet.py
npm run test:finish
```

No original input files are rewritten. `production/finish.js` is the small opt-in finish; omit `finish` to reproduce all old looks. Counter color lives independently in `stories/names100/counter/p5-editorial.json`; generated `p5-editorial.ass` is separate from3D/captions. Continue using existing P1 renderer for any separately authorized future export.

## Measured costs

| Command scope | Wall | Sampled tree CPU | Peak summed RSS |
|---|---:|---:|---:|
|Initial five native stills + seek repeats|10.377s|19.04s|732.13MiB|
|Single shadow revision, five stills + repeats|9.698s|17.74s|732.94MiB|
|Affected regression batch|31.324s|49.17s|1165.87MiB|

[Cost receipts](costs.json):0.2s Linux process-tree sampling; shared RSS counted per process, short-process/CPU tails may be missed. Native batches total20.074s. Compositing, PR16 preflight and preliminary diagnostic checks were not profiled; these are not total model/billing costs. Seven new PNGs total about1MiB; no temporary sequence or new MP4 committed.

**Stop for creative approval.** If accepted, finish look-development. Next work is a separately authorized complete low-resolution narrated/captioned/counter QC, then a separately authorized final clean720p export and composition. No further general polish or final export begins automatically.

## Premerge regression correction

S4 preflight found the counter-only difference mask also included cap-shadow pixels below y250. Restricted that assertion to the typography band y120–249, retaining full glyph bounds/contrast checks. The shadow/body images and runtime are unchanged. Fixed the recorded ground-scan source path to the retained finished1392 evidence. Reran all required source/counter/finish/caption/S3B WebGL checks successfully before merge; this corrects a test error, not a visual regression.
