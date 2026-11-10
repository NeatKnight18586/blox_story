# P4B-2 — mystery continuity and legal D28 five

**Technical PASS for scoped checks/export. Creative PARTIAL / review pending.** Only D11,D13,D16,D28 replaced. One new45-frame wobble reused in editing; earlier evidence and narration untouched.

[Full silent working edit](working-edit.mp4) · [38-shot source map](edit-map.json) · [phone before/after](before-after.jpg) · [native phone review](native-phone-review.jpg) · [D16 causal cuts](D16-cause-and-effect.jpg) · [all45 source frames](all-45-frames.jpg) · [decoded edit contact](editorial-contact.jpg).

## Visual implementation

D11 approaches six, reverses with a sharp clockwiseZ kick, then settles on legal four. The complete6.3-unit P4B1 die and all21 permanent face markings are reused; no top-number substitution or settled upper six. At its closest, six is32.7degrees from vertical (normalY0.84147), preserving the inherited mechanism's near-six angular basis rather than showing a completed six prematurely.

D13 uses the **same recorded frames**, enlarged around the underside. A brief brass edge appears before the kick; no crank/control system is revealed there. It then cuts to a native wide outcome hold. The new helper contains only the visible edge/stub and a shallow service-slot cue, not another machinery rig. The floor entry is implied, not a modeled excavated cavity. Tip clearance is8.57e-3units for clean rendering; it is not a force simulation.

D16 uses0.6s of existing crank/coupling footage, a short contact pause, then that same recorded exterior contact/deflection. The crop deliberately leaves the inherited far-tip/full-die trajectory offscreen. **Support height, coordinates and complete face basis differ between the inherited chamber proof and exterior; the connecting lever path/force transmission is implied, not verified as one exact3D trajectory.** Both visible die deflections turn clockwiseZ. Original D15 and its proof remain unchanged.

D28 now shows five upright, one/four adjacent and two underneath. All four right-side dots are unobstructed. Sunrise, camera[8,10,21]→[-1,4.6,-3],FOV54,world palette/sky and Leo's identity are reused. Leo is statically staged at[4.3,0.02,0],yaw−π/2,to leave the corrected side visible; no new character performance. Paving decorations sit below theY0.02 support surface. No old P3B4/P4A/P4B1 files were repaired in place.

Native keyframes inspected before motion: [approach0](approach.png), [near-six11](near-six.png), [contact12](brass-contact.png), [kick16](kick.png), [four44](non-six.png), [D13 native close-up12](D13-clue.png), [D28 legal five](D28-five.png). These are actual720×1280 WebGL screenshots. [D16 reference](D16-native-source-crop.png) is accurately a288×512 crop from the existing720×1280 P3B1 contact still,source frame23—not newly rendered machinery. Final edit uses existing motion frames0–17 instead, cutting at contact onset. The stock crop was moved upward after review so the wheel remains fully visible.

## Frame-exact edit

All38 original slots/3513 frames remain identical. Video360×640,30fps,117.100s,silent.

| Slot | Source sequence, lengths in frames |
|---|---|
| D11[793,886) | first-frame hold10; wobble[0,45)45; last-frame hold38 |
| D13[990,1099) | insert first hold14; same wobble crop[0,24)24; native frame44 outcome hold71 |
| D16[1332,1442) | crank first hold8; crank[0,18)18; crank17 hold8; wobble insert[12,24)12; wide[24,45)21; last hold43 |
| D28[2585,2669) | corrected native still84 |

D13 native close-up uses a true camera view offset(168,568,288,512) within720×1280. Its movie counterpart crops(126,426,216,384) from the **single540×960** source, then scales to360×640. D16 crank movie crop is(40,320,144,256) in the old360×640 footage; native reference corresponds to(80,640,288,512) in its720p still. These crops retain aspect ratio; enlargement softness is disclosed. Full media recipes/ranges are in edit-map.

New source archive `wobble-source.mp4` is45frames/1.5s at540×960. `wobble-insert.mp4` and `crank-contact.mp4` are derived editing inputs, not additional WebGL captures. All new motion plays forward at1×. Endpoint holds are explicit; the complete working edit is the principal deliverable.

## Actual coverage

| Kind | Frames | Seconds | Runtime |
|---|---:|---:|---:|
| Original proxy remaining |**1584** |52.8 |**45.090%** |
| Still imagery |753 |25.1 |21.435% |
| Endpoint holds |561 |18.7 |15.969% |
| Motion footage, including reused sources |615 |20.5 |17.506% |

312 proxy frames removed:53.971→45.090%,a8.881percentage-point reduction. D28 was already a still, so its correction does not lower proxy share.18 shots remain proxy. Held/still/proxy imagery still accounts for82.494%; motion footage coverage is not a measurement of newly authored animation or unique moving poses.

## Verified checks

- `npm test`, all prior Dice Town source tests, P4A/P4B1 map tests, new `tests/dice-town-p4b2.js` / `dice-town-p4b2-map.py`: PASS. [Log](regressions.log).
- All actual body/pip support vertices over45 states stay onY0.02 within1.32e-15units. No settled six; final4normalY1. Brass ray/vertex clearance minimum0.008568; visible contact phase12 precedes kick13. Critical projected bounds: wide die0.738,brass insert0.566,D28die/actor0.755 (<0.98). D28die/Leo feet meet the plinth; side4has zero actor-occluded pip centers and face2normalY−1. [Geometry checks](geometry-qc.json). Targeted checks, not a general collision/physics engine; stub intentionally enters the implied slot.
- Native reverse7, source-motion reverse44/16/0, and fresh-browser native reverse7 states/pixels match. JSON comparison normalizes signed-zero serialization. No capture page errors. [Native](stills-capture.json), [motion](motion-capture.json), [cold](cold-verification.json).
- Final H.264/yuv420p/BT.709,360×640,SAR1:1,30fps,3513 decoded frames,117.100s,one video stream,no audio. ContinuousPTS,all38 cut keyframes,full FFmpeg decode and real Chromium playback/seeks across all37 cuts pass. [Playback](playback.json).
-171 final source-pixel samples verify all38 shot starts/middles/ends and replacement span boundaries; max meanRGB error1.886/255 vs lossy-encode gate6. [Source comparisons](source-verification.json).
- **All3117 unchanged decoded frames are MD5-identical to P4B1**, including D15,all earlier acting and the fair-roll finale. [Unchanged checks](unchanged-verification.json).
- Empty-temp rebuild using included source media gives a byte-identical full MP4; ignored frame caches unnecessary for editing. [Clean rebuild](clean-build-verification.json).
- All1365 previous tracked files byte-compared before allowed AGENTS/README/STATUS updates. Prior films/native evidence/source/tests,38-shot timetable and117.098231s private narration reference preserved. No WAV requested, read, regenerated, muxed, trimmed or stretched. [Preservation](preservation.json).

## Actual processing costs / reproduction

Exactly **45 unique new low-res WebGL motion frames**; no second animation/camera capture.35.488s wall includes browser startup,capture and three reverse checks.540×960 source was chosen for both wide and insert from one capture; no native movie. Retained final native/seek job10.442s excludes earlier still/framing diagnostics.

Initial edit build4.046s; final after stock-crop adjustment3.553s; source checks4.159s; full decode/player3.197s; unchanged-frame hashes3.875s; native cold checks9.131s; clean rebuild3.894s. These scoped job walls may overlap; they are **not complete elapsed task time or a token bill**. [Motion resources](motion-resources.json), [initial encode](initial-assembly-receipt.json), [final encode](assembly-receipt.json). CPU/max-child RSS are recorded, not aggregate Chromium/GPU memory. Actual WebGL backend Chromium/SwiftShader. No dependency installations/services.

```sh
python scripts/dice-town-p4b2-assemble.py
python scripts/dice-town-p4b2-verify.py
node scripts/dice-town-p4b2-playback.js
python scripts/dice-town-p4b2-unchanged.py
python tests/dice-town-p4b2-map.py
```

Editing defaults to committed source media. Native inspection: `node scripts/dice-town-p4b2-capture.js --stills`; one motion capture without that flag; assembler `--rebuild-source` afterward only when deliberately rebuilding source. `scripts/dice-town-p4b2-sheet.py` rebuilds review boards. Temporary captures/clips/checks stay ignored under renders/.

## Creative limits / stop

The repeated kick and legal outcome are clearer than proxy cards, and D28's impossible adjacency is fixed. Near-six remains visibly tilted rather than nearly flat; its suspense/readability needs human review. Brass clue is brief and intentionally small. D13/especially inherited D16 crops are softer than native imagery. The control-to-exterior mechanical connection is an editorial implication, not one verified force path. Existing wide-shot margins/contact-shadow style remain. Old D05/06 tether,D19 photo scene,D33 gate animation,D34 route,D38 notebook close and other untouched proxy content remain unfinished. No final creative PASS, merge, new stage or publishing.
