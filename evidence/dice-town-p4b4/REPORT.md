# Dice Town P4B-4 — native-source backstory repair

**Technical PASS. Creative PARTIAL / human review pending.** The seven requested scenes are repaired with scene-specific native sources; this is not a claim of approved release quality. Isolated branch from `codex/dice-town-p4b4-backstory-direction` / `dba5337`. No merge, audio access, other-scene changes or final-resolution film.

[Updated117.100s silent film](working-edit.mp4) · [390px narrative continuity](phone-continuity.jpg) · [Before/after](phone-comparison.jpg) · [All90 decoded motion frames](motion-contact.jpg) · [38-shot source map](edit-map.json)

## Comprehension gate before full implementation

[Initial proof](comprehension-initial.jpg) and [corrected preflight](comprehension-proof.jpg) were genuine native WebGL/P3B2B-source images, reviewed **before** implementing D20/D21/D22 and before motion capture. The first proof caught a cropped photo and pin/eye overlap; camera changes corrected both. The child, original crank, historical mother/child relationship and same received pin read at390px. Literal **thirty years cannot be inferred from these images alone**; that number depends on the unchanged narration.

[Gate receipt](comprehension-review.json), [native pose review](native-review.json). This was an executed self-review, not human creative approval. Main native-keyframe review caught and corrected a cropped D22 book. Final continuity review also rejected the full reunion still as a D19 cutaway because it showed Pip home too early: the **final edit uses a new native older-mother-only close-up**, her existing anticipation pose/frame0, same room/rig/costume. No new mother acting. The initial tight mother camera was widened before final integration to retain her hair silhouette.

## Source and action decisions

| Locked output frames | Actual replacement |
| --- | --- |
| D17 [1442,1495),53f | Original0.65-scale Pip on existing work step with palm under the actual crank.8f hold,15f guilty glance,30f realization hold. Original pin still in the coupling. |
| D18 [1495,1590),95f | Same child holds the old family photo below his face;15f hold,15f downcast glance,65f hold. Photo never transforms into an older mother. |
| D19 [1590,1710),120f |54f historical photograph insert →66f **older mother alone now**. Gentle2% editorial moves over native PNGs; no new3D mother motion or future photograph in Pip's hand. |
| D20 [1710,1768),58f | Tightened native photo/face composition,8f hold,15f small lift/tilt and eyeline,35f hold. Same physical photo. |
| D21 [1768,1905),137f |18f worried hold +15f glance +19f pause →45f native installed **closed** gate →40f worried return. Gate opening is not prematurely shown. |
| D22 [1905,1997),92f |22f uncertain pause +15f restrained notebook/shoulder lowering +55f held silence. Original notebook remains **open at−2 radians**; D38's final closure is unchanged. |
| D24 [2129,2224),95f |15f received-pin hold +15f arm/pin lowering +65f responsibility hold. Same P3B1 pin and receiving palm; initial pin world pose matches D23 to9.5e−16 units. Leo's departure is implied offscreen, not a new walk. |

**D23 is unchanged**, as are all D25–D38, D15/D16 and every other slot. No unrelated story frames replace the new scenes. The gate insert is the directed geography/fear cue; the older mother is the directed age cutaway. **No360px screenshots feed any new shot**. The full edit remains360×640 as specified; native sources are downsampled for this working copy, never presented as an upscaled master.

### Native images / photograph provenance

- [D17 crank](D17-14.png), [D18 child/photo](D18-14.png), [D20 photo insert](D20-14.png), [D21 worry](D21-14.png), [D21 closed gate](D21-gate.png), [D22 open notebook](D22-14.png), [D24 same pin](D24-14.png): actual720×1280 WebGL screenshots. Beginning/intermediate/end keyframes are alongside these files.
- [Historical portrait](historical-portrait.png): actual1024×1024 WebGL render of the **existing mother and Pip rigs**, same room/lighting/cream-V/rust clothing, mother-left/child-right. Only this historical version's hair is darkened. It becomes the texture on the existing `makeFamilyPhoto()` plane with a small paper backing; [photo macro](D19-history.png) is genuinely rendered720×1280, not an enlarged proxy or generated illustration.
- [Present-day mother](D19-present.png): actual720×1280 WebGL still using the unmodified P3B2B asset, hair, appearance, existing anticipation pose and room. New close-up camera; child hidden so there is no premature reunion. [Receipt](mother-still.json).
- Canonical old photo was a256px symbolic motif with gray accents. The new D18–D20 derivation keeps its arrangement/colors but replaces the texture with a native portrait for meaningful age contrast. **D27/D30 remain their original symbolic gray-haired artwork** under the preservation constraint; physical-photo graphic consistency across that later cut remains an inherited limitation, disclosed rather than silently changing approved footage. No external assets/licenses/dependencies introduced.

## Coverage — not equivalent to finished animation

650 proxy frames removed. Remaining **784/3513 =22.3171% (26.1333s)**, down from1434/40.8198%.

| Category | Frames | Percentage |
| --- | --- | --- |
| Original proxy |784|22.317%|
| Still-source, including120f D19 editorial image moves |812|23.114%|
| Endpoint holds |1128|32.109%|
| Actual3D motion |789|22.459%|

Still-source plus holds total1940frames/55.223%; this remains a limited-animation working edit. New capture was **exactly90 motion frames**, six15f clips at native720×1280. D19/gate use stills. Remaining proxies: D02,D05,D06,D07,D08,D09,D10,D12,D14. No next batch begun.

## Executed verification

- `npm test`; all Dice Town JS/Python regression tests; new90-state/map tests; new JS syntax checks pass. [Source checks](regressions.json).
- Existing real-browser F1 controls/identity/mobile, P4B2 die, P3B4 grounding, P3B1 pin/handoff and P3B2B mother checks pass. Test outputs redirected to ignored scratch; earlier evidence untouched. [Browser regressions](browser-regressions.json).
- All90 authored poses: child identity/0.65 scale, actual hand/crank fit, photo/face separation and framing, book/body clearance, open cover throughout D22, pin/frame/body clearance and source ownership. Palm/handle vertical gap0.008units; stationary feet/step error8.6e−9; no photo/pin raycast obstruction of eyes or mouth; projected D22 book≥111.5px at390px width. D21 actual hinge angles[0,0]. [Geometry](geometry.json). Conservative OBB/actual vertices, not universal physics certification.
-16 native key-pose hashes/state checks match reverse seeking and a separate fresh browser.90 forward motion captures plus7 reverse probes match. Final mother still independently reset from recognition pose back to anticipation, with exact screenshot equality. No wall-clock animation/random poses.
- Complete H.264 decode: **3513 frames /117.100s /360×640 /30fps /yuv420p /SAR1 /no audio**, continuousPTS and all38 cut keyframes. Real Chromium playback and midpoint/all37 cut seeks pass. [Playback](playback.json).
- Native720×1280/90-frame source archive independently checked against15 committed native WebGL screenshots and capture hashes; all pass H.264 pixel tolerance. [Native source verification](native-source-verification.json).
-213 decoded source-frame checks across shot start/mid/end and substitution boundaries; maximum meanRGB error1.565/255, tolerance6 for H.264 conversion. [Source verification](source-verification.json).
- **2863 unchanged decoded frames bit-identical** to P4B3, including D23 and D25–D38. [Preservation by frame](unchanged-verification.json). All1465 pre-existing tracked files hash-identical before authorized AGENTS/README/STATUS updates. [Prior file hashes](preservation.json).
- Source-media-only reassembly reproduces the **exact delivered movieSHA**, without browser capture or raw frame sequence. [Rebuild](clean-reassembly.json). Original117.098231s narration reference unchanged; private WAV not opened, requested, processed or uploaded.

## Actual costs / commands

- Native comprehension passes:7.77s +7.90s;4 forward stills each. Main keyframe batch16 stills plus6 targeted camera-correction stills; final correction/reverse-check run14.83s. Earlier full-batch wall not retained. Closed gate1 still. Mother-only camera check3.25s, final3.31s (one still each). Historical texture renders once per scene initialization; no moving family sequence captured.
- **Single90-frame native action capture:54.76s wall**, sampled process-tree CPU106.97s, peak summed RSS724.0MiB at0.2s intervals. Shared memory counted per process; CPU sampling can miss short-lived work; not GPU/unique-memory accounting. [Cost receipt](motion-cost.json).
- Initial source encoding/full incremental assembly9.71s; final mother-cutaway correction/reassembly5.82s (reused90-frame archive), final8.77 childCPU-s and136.6MiB maximum individual child RSS. Initial and final receipts retained. No repeated3D motion capture or full native episode render.
- Full source/browser verification and rebuild timings retained separately in receipts. Total session/model-token usage unavailable. Temporary PNGs and encodes remain in ignored `renders/`; compact native stills, source archive and working movie are committed.

```sh
# Rebuild the working edit from committed native-source media, without rendering:
python3 scripts/dice-town-p4b4-assemble.py
python3 tests/dice-town-p4b4-map.py
python3 scripts/dice-town-p4b4-native.py
python3 scripts/dice-town-p4b4-verify.py
python3 scripts/dice-town-p4b4-unchanged.py
node scripts/dice-town-p4b4-playback.js
python3 scripts/dice-town-p4b4-clean.py
# Optional source/QC reproduction:
node scripts/dice-town-p4b4-capture.js --stills
node scripts/dice-town-p4b4-qc.js
node scripts/dice-town-p4b4-cold.js
node scripts/dice-town-p4b4-regression.js
node scripts/dice-town-p4b4-mother-still.js
python3 scripts/dice-town-p4b4-sheet.py
# Only if deliberately replacing the bounded source archive:
# python3 scripts/dice-town-p4b4-cost.py
# python3 scripts/dice-town-p4b4-assemble.py --rebuild-source
```

## Creative limits / review decision

The scene-specific images communicate child Pip's involvement, family attachment, older mother, fear, Leo's uncertainty and received responsibility. **I do not certify the requested release-quality creative standard.** Age differentiation remains mostly hair/paper/framing; the exact30years needs narration. Rigid wrists/elbowless gestures, short eased motions and long holds remain visible. The later D27/D30 symbolic photo is not an exact texture match. No new dialogue mouth acting, fingers, new family or broad environment polish was built to conceal those limits.

Muted390px source and decoded motion boards were actually inspected. Human story/acting approval and iPad playback/listening remain pending. No1440p/4K or native full-length export, audio, merge, publication or automatic continuation.
