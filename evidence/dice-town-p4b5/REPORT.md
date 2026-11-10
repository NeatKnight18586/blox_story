# Dice Town P4B-5 — final nine proxy repairs

**Technical PASS. Creative PARTIAL / human review pending.** Only D02,D05–D10,D12,D14 changed, from `codex/dice-town-p4b5-opening-direction` / `8657887`. The complete working edit now contains **zero original storyboard proxy frames**. That does **not** mean finished animation, approved art direction, or a final-HD master.

[Updated silent working MP4](working-edit.mp4) · [390px story/rule board](phone-storyboard.jpg) · [Before/after](phone-comparison.jpg) · [All195 decoded action frames](action-contact.jpg) · [Backward gait frames](backward-contact.jpg) · [Native D09 camera repair](D09-camera-comparison.jpg) · [38-shot source map](edit-map.json)

## What each repaired shot actually shows

| Shot / locked output frames | Native action and economy |
| --- | --- |
| D02 [66,169),103f | Two existing residents lift at staggered moments over real plaza paving; physical result3 and sky behind them.6f anticipation,42f lift,55f apex hold. Blue/sage identities and six-part rigs retained; modest arm folding keeps full silhouettes in portrait. |
| D05 [337,382),45f | Leo moves upward0.12units, restrained by a constant-length diagonal tether from waist harness to a mounted clocktower ring, while a separate background resident rises.8f hold,15f pull,22f hold. |
| D06 [382,504),122f | Both real attachments and the connecting line in one closer insert, slight tension settle.35f hold,12f movement,75f hold. No neck/head crossing. |
| D07 [504,631),127f | Original small notebook on forearm, kept open; native ink sketch shows gravity loss and an anchored person. Existing eye/head/forearm response:15f hold,12f gesture,100f reading hold. No billboard. |
| D08 [631,693),62f |10f native physical die1 insert, then a cup lifts clear of the existing bakery counter while the baker's feet stay planted:12f anticipation,24f lift,16f hold. |
| D09 [693,742),49f |9f native die2 insert,36f actual backward travel,4f hold. Existing readable gait clock runs forward; rootZ/hip and arm pitch/contact anchors are spatially reflected. **Not reversed footage or a translated neutral mannequin.** |
| D10 [742,793),51f | Reuses D02 source12–35, then27f hold. Different temporal endpoint from D02's41; no extra crowd/camera capture and no risky crop of the silhouettes. Same residents/result3. |
| D12 [886,990),104f | Real open page, tally groups and three six-dot wobble comparisons in a different close camera.18f hold,12f indication,74f reading hold. |
| D14 [1099,1220),121f |12f hold,18f actual hand/clip approach to installed hatch-post ring,16f contact hold; **cut implies stepping into the aperture**,24f lowering,51f final hold. Boots disappear below a real rim; remaining journey is offscreen before D15. |

**Documented capture overage:**195 retained native samples required231 forward captures: the original195 plus one36-frame D09 camera repair,21 above the initial210 ceiling. Final review caught an exposed market-floor horizon; only the camera was changed to frame the existing wall. [Reason recorded before recapture](D09_REPAIR_NOTE.md), [actual native before/after](D09-camera-comparison.jpg). No new geometry or gait was added.

All other29 shots, all38 end-exclusive boundaries, the original117.098231s/1.25× narration reference and every older source film remain unchanged. No private audio was opened, requested, processed or uploaded.

## Actual native sources and visual gate

[Native phone proof](native-phone-proof.jpg) was inspected **before** motion capture. The first two staging passes exposed resident/walker cropping, a hidden tower connection and a rope/forearm crossing. Those were repaired before the initial motion run. The later D09 background-edge failure was caught and corrected in one targeted camera recapture; it is not hidden as a clean first pass. [Initial visual record](native-initial.jpg), [gate receipt](native-review.json).

Main native PNGs: [D02](D02-41.png), [D05](D05-14.png), [D06](D06-11.png), [D07](D07-11.png), [D08 cup](D08-23.png), [die1](one-0.png), [D09](D09-35.png), [die2](two-0.png), [D10 reused native frame35](D10-reuse-35.png), [D12](D12-11.png), [D14 approach](D14-0.png), [contact](D14-17.png), [descent](D14-41.png). Each is720×1280 actual Three.js/WebGL output, or an exact decoded/captured native frame from that output. **No360px storyboard screenshot is a new production source.** Old360px images appear only in clearly labelled BEFORE comparison panels.

- Reuses grounded P3B4 plaza, P2A staggered resident poses, original Leo/appearances/notebook, P3B3 baker/stall/wall, F2 readable walk, complete canonical die and existing sky/lights. No public rig/action API or old scene source changed.
- Added only functional camera-visible props: waist/shoulder webbing, two fixed ring mounts, one persistent clip/tether, two small notebook page drawings, one cup, and a bounded service aperture/rim/lid/well fragment.
- The free end during reclip uses one short **authored slack curve**, updated in a resident rope geometry buffer. It becomes a straight local tether in the descent view. No rope solver/physics framework, finger rig, long tower-to-hatch travel or complete geography claim.
- Hatch uses an actual hole in the opt-in ground geometry; intersecting decorative paving/seams are hidden only in that view. It is not a dark rectangle painted over solid floor. Default scenes and previous movies are untouched.

## Retention and honest coverage

**195 retained native30fps motion frames (6.5s)**; **231 generated forward captures** including the documented36-frame D09 repair. All other159 source frames were retained without recapture. Distribution42/15/12/12/24/36/12/42 for D02/D05/D06/D07/D08/D09/D12/D14. D10 reuses24 of them, with **zero new capture**.

[opening-source.mkv](opening-source.mkv) retains **all195 frames as lossless FFV1/BGR0 at720×1280** (~20.13MiB). All195 decoded RGB frames match captured PNG pixels exactly;20 matching committed native key poses also match exactly. Full source metadata, frame ranges, source hashes and render recipes are retained. [Native-source verification](native-source-verification.json).

Raw PNG sequences/temp encodes stay in ignored `renders/`. The360px MP4 is **only an editorial review copy**. Future1080×1920 production must render from source/recipes after the separate benchmark/audit, not upscale either this rough cut or assume all older shots already have HD sources. No final-HD benchmark/export was started.

| Full117.100s edit category | Frames | Percent |
| --- | --- | --- |
| Storyboard proxy |0|0%|
| Still-source |831|23.655%|
| Endpoint holds |1674|47.652%|
| Actual3D motion, including reuse |1008|28.693%|

Still-source plus holds total**71.307%**. Proxy removal is not a promise of continuous/full-body animation. Earlier still-source editorial moves remain classified as still-source.

## Verification actually executed

- `npm test`, all Dice Town JS/Python tests and new JS syntax checks: **28 commands PASS**. Existing F1/F2/production/casting/story source tests preserved. [Regression receipt](regressions.json).
- Isolated genuine-browser checks for F1 controls/identity/mobile, original die, grounding, pin handoff, mother recognition and baker contact: PASS, with all earlier evidence writes redirected to ignored scratch. [Browser regressions](browser-regressions.json).
-195 authored poses checked: stable body identities, complete resident/walker framing, no resident/body overlap, no occlusion of the three physical top pips, book/body clearance, open covers, planted baker/cup clearance, tether length/endpoints/body avoidance, reclip position and actual below-rim floor clearance. [Geometry](geometry.json).
- Actual D02 foot clearance exceeds0.02 at source11/17 (six-frame stagger); endpoint clearances2.282/1.487units. D05–D12 tether length deviation≤8.9e−16units. Backward gait max/RMS material-point drift**2.22e−16 /7.88e−17units**, contact-height/penetration≤2.23e−16. These are floating-point geometric results, not human gait realism. Reclip endpoint error0; no tested body penetration outside opening. Center ray reaches actual well bottom−3.34; additional floor probes find no solid floor across the opening.
-22 native key-pose states/screenshots reverse-match; all22 also match a separate fresh browser.The original195 forward action frames and the corrected36 D09 captures each passed their repeated-timestamp probes; final195 retained samples pass lossless pixel checks. Same Chromium/SwiftShader backend; no cross-GPU/iPad pixel-equivalence claim.
- Final file: **3513 decoded frames /117.100s /360×640 /30fps /H.264 Main/yuv420p /SAR1 /no audio**. ContinuousPTS and all38 cut keyframes, full FFmpeg decode, real Chromium playback/seek PASS. [Playback](playback.json).
-252 decoded source comparisons at all shot starts/midpoints/ends and span boundaries: max meanRGB error2.172/255 vs tolerance6 for the review encode. [Source checks](source-verification.json).
-**All2729 unchanged decoded frames bit-identical to P4B4**, including every shot from D15 onward and all earlier protected shots. [Pixel preservation](unchanged-verification.json). All1542 prior tracked files hash-preserved before authorized AGENTS/README/STATUS edits. [Source preservation](preservation.json).
- Source-only rebuild from the committed lossless archive/native PNGs reproduces the **exact delivered movieSHA**, without a browser render or raw cache. [Clean rebuild](clean-reassembly.json).
- All9 repaired slots additionally played in real time in H.264-capable Chromium. Final isolated pass completed without media errors; counters include9 dropped **display** frames across seek/play windows. An earlier CPU-loaded pass dropped39; file decode/frame counts remain complete. Perfect real-time display/iPad playback remains unverified. [Final playback](motion-playback.json), [loaded pass](motion-playback-loaded.json).

## Actual costs

| Measured scope | Result |
| --- | --- |
| Native key-pose passes |39.12s (22 captures),38.39s (17 corrected),35.39s (18 corrected); each also reverse-checks22. A final3-keyframe D09-only native check took23.93s and reverse-checked all22; initial staging receipts retained. |
| Original195-frame run +repeat probes |174.19s wall; sampled subtree CPU343.21s / peak summed RSS907.86MiB. |
| Targeted36-frame D09 camera correction +repeat probes |66.67s wall; sampled subtree CPU86.10s / peak summed RSS914.83MiB. Actual forward captures total231; retained bank195. Same0.2s sampling; shared pages counted per process, short-lived work/GPU memory not fully measured. |
| Original lossless source encode/assembly |97.06s wall /117.54 childCPU-s /254.80MiB max individual childRSS, receipt retained. |
| Final corrected lossless source encode/assembly |59.48s wall /115.91 childCPU-s /254.68MiB max individual childRSS;2729 old frames packet-copied. No full3D recapture. |
| Source-media rebuild verification |70.03s wall,110.92 childCPU-s; no WebGL recapture. Initial60.67s rebuild receipt retained. |
| Native fresh-browser / original browser regressions |48.66s /42.55s separately scoped, partially overlapping encode work. |
| Repaired-slot real-time playback |Final26.75s; initial loaded27.59s retained. One additional~27s harness run corrected a renamed playback-counter assertion, with no movie or WebGL recapture. |

[Original capture profile](motion-cost-before-D09.json), [D09 repair profile](motion-cost.json), [assembly commands](assembly-receipt.json). These are command-level measurements, not additive total-session elapsed time. Geometry/staging diagnostics and model-token/complete session costs are not fully profiled. No paid tools, new dependencies, environment or framework.

```sh
# Rebuild from committed native sources; no rendering required:
python3 scripts/dice-town-p4b5-assemble.py
python3 tests/dice-town-p4b5-map.py
python3 scripts/dice-town-p4b5-native.py
python3 scripts/dice-town-p4b5-verify.py
python3 scripts/dice-town-p4b5-unchanged.py
node scripts/dice-town-p4b5-playback.js
node scripts/dice-town-p4b5-motion-playback.js
python3 scripts/dice-town-p4b5-clean.py
# Optional source/QC reproduction, not necessary for an editorial rebuild:
node scripts/dice-town-p4b5-capture.js --stills
node scripts/dice-town-p4b5-qc.js
node scripts/dice-town-p4b5-cold.js
node scripts/dice-town-p4b5-regression.js
python3 scripts/dice-town-p4b5-sheet.py
# Deliberate source-bank regeneration only:
# python3 scripts/dice-town-p4b5-cost.py
# python3 scripts/dice-town-p4b5-assemble.py --rebuild-source
```

## Creative limits and stop

Muted phone review now has physical examples of1/2/3, a visible restraint explaining Leo, a real planning/clue book, and a motivated entry underground. **Human acceptance remains pending.** Rigid elbowless poses, restrained short backward steps, long reading/endpoint holds, stylized ring/clip contact without detailed latch/finger action, and the cut implying the step into the hatch remain visible shortcuts. No full descent/continuous tower-to-chamber rope trace is claimed. The D09 background repair is complete; no remaining raw market-floor edge is presented as acceptable. Existing shallow facades and earlier photo/performance limitations remain unchanged.

This is a source-native repair pass and complete silent working edit, not a release-approved fully animated or final-HD episode. Original narration untouched. No merge, captions/audio/SFX, native full movie,1080p benchmark or next stage. **Stop for review.**
