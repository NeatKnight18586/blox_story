# P4B-1 — sixth-roll arc in the complete working edit

**Technical PASS for the new material/export. Overall PARTIAL; creative review pending.** D25–D32 integrated into117.100s silent working movie. Existing D28 has a known face-continuity conflict, retained as directed. No merge or next stage.

[Download full working MP4](working-edit.mp4) · [38-shot source map](edit-map.json) · [390px before/after](before-after.jpg) · [native phone review](native-phone-review.jpg) · [five-morning orientations](five-mornings.jpg) · [decoded edit contact](editorial-contact.jpg) · [motion contact](motion-contact.jpg).

## What is implemented

- One opt-in complete6.3-unit ivory die: fixed21 round markings on six durable faces, opposite pairs1/6,2/5,3/4. Same rounded-block/material language; no number swaps during rotation. Flush painted circle meshes avoid underside pip-cap penetration. Only root orientation/position animate. `die.js` is the bounded reusable appearance/orientation/support helper.
- D25/D26: native upright1→2 and4→3→5 hard-cut holds, same die/camera, actual differing orientations. No repeated tosses, crowds or day/night system.
- D27: existing Pip/chamber/pin; approaches the empty sleeve, pauses, glances toward a small faded family photo, then withdraws/lower hand. Pin stays on the same rigid palm support, never installed or duplicated.
- D30: starts from D27's exact withdrawn pin transform. Smaller upward urge followed by a firmer lowering; no forward approach to the sleeve. Distinct gesture, same actor/prop/room.
- Photo: one reusable image-plane prop (`photo.js`), original flat mother gray-sweep/cream-V/purple and child rust motifs, mounted on a small machine-color tray/foot. No text card, family rig or D19 scene. Historical age contrast/photo art is not final.
- D29/D31: authored edge-supported rotation, continuous position/quaternion across the D30 cutaway. Rounded die vertices determine height above the real plinth topY0.02. RootZ follows a rounded-edge rocking path; small damped settle ends with actual six uppermost. No physics engine, randomness or interpolation of video.
- D32: tighter native-source six hold, no new rule board/UI. D28 reuses the exact compiled P3B4 five-up still from P4A. The inherited unattached brass-cover accent is hidden only in new die views. Existing road/seam decorations are flattened below the plinth surface there, so raised curb meshes cannot intersect the underside. No earlier scene source or approved frame changed.

**Inherited conflict:** the mandatory D28 still shows5 adjacent2, which cannot occur with standard opposite pairs. New die shots use correct complete faces; the required old still is preserved, not silently repaired. D29 begins after implied offscreen roll initiation, not a demonstrated continuous transform from that old tableau. This visual continuity remains PARTIAL.

## Exact editorial mapping

All38 original end-exclusive boundaries and3513 output frames are unchanged.

| Shot/global slot | Source inside slot |
|---|---|
| D25[2224,2339) | face1 hold57frames; face2 hold58 |
| D26[2339,2454) | face4 hold38; face3 hold38; face5 hold39 |
| D27[2454,2585) |20first-frame hold +54motion +57endpoint hold |
| D28[2585,2669) |84 existing P4A frames, packet copied |
| D29[2669,2716) |3first-frame hold +36motion +8endpoint hold |
| D30[2716,2787) |8first-frame hold +42motion +21endpoint hold |
| D31[2787,2850) |42motion +21endpoint hold |
| D32[2850,2898) |48native six hold |

Captured source archive `motion-sources.mp4`: D27[0,54),D29[54,90),D30[90,132),D31[132,174). It is a compact reusable input, **not** the delivered stand-alone proof. All motion plays at1×. Outside the arc, the committed P4A movie is packet copied; D28 is copied too. Immediate source ranges/sampling and original provenance are explicit in edit-map; every frame is `proxy`, `still`, `endpoint_hold` or `motion`.

## Updated runtime coverage

| Material | Frames | Seconds | Runtime |
|---|---:|---:|---:|
| Remaining original proxy |1896 |63.2 |**53.971%** |
| Still imagery |753 |25.1 |21.435% |
| Endpoint holds |369 |12.3 |10.504% |
| Existing + new real motion footage |495 |16.5 |14.091% |

Proxy falls70.766→53.971%, a16.795 percentage-point reduction /590 output frames.21 shots still contain proxy. D28 was already still imagery, so eight arc slots are not eight newly completed motion shots. Proxy/held imagery remains85.909%; motion coverage includes settled poses and is not a unique-pose measurement.

## Actual visual and technical verification

Native keyframes **before motion capture**: [1](face-1.png), [2](face-2.png), [4](face-4.png), [3](face-3.png), [5](face-5.png); [near pin](pin-near.png), [photo pause](photo-pause.png), [withdrawn](withdrawn.png); [near six](six-near.png), [D29-out/D31-in](roll-cut.png), [urge](urge.png), [refusal](refusal.png), [six](six-settled.png). Initial crop/support defects were corrected; final images, phone panels and motion contact inspected. Before/after panels compare decoded360px working films at390px; they are labeled accurately, not claimed as native720p frames.

- `npm test`, all prior Dice Town source tests, original P4A map test, new `tests/dice-town-p4b1.js` and `tests/dice-town-p4b1-map.py`: PASS. [Regression log](regressions.log).
- Actual complete die body +21 flush-pip vertices across78 roll frames: support gap[-1.32e-15,9.06e-16] relative toY0.02. Nearby road/edge tops are below0.02. All face counts/upright normals/opposite pairs pass;22 die meshes persist. Rounded support-edge sampling varies at most~0.028units due finite bevel tessellation; no universal rigid-body simulation claimed.
-96 Pip motion states: no tested pin vertices inside the hand/other body-part local bounds (5mm interior tolerance). Minimum conservative arm-to-named-machine gap0.080; shaft/front-sleeve gap0.0985. Critical head/hand/photo/pin and die projected bounds max0.931 (<0.98). This is targeted geometry/framing, not a general triangle collision engine. [Geometry receipt](geometry-qc.json).
- D29 last and D31 first transforms exactly equal; D27 end and D30 start pin transforms exactly equal. Explicit integer frame sampling; no wall clock/random offsets. Native reverse13, selected motion reverse12, and fresh-browser native reverse13 states/pixels PASS. JSON comparisons normalize signed zero serialization. No browser page errors. [Stills](stills-capture.json), [motion](motion-capture.json), [cold](cold-verification.json).
- Full movie: H.264/yuv420p/BT.709,360×640,SAR1:1,30fps,3513 decoded frames,117.100s,one video stream,no audio. Continuous PTS,all38 cut starts keyframes,full FFmpeg decode and real Chromium playback/seeking at37 cuts PASS. [Playback](playback.json).
-153 final decoded source-frame comparisons cover every shot start/middle/end and substitution boundaries; maximum meanRGB error1.961/255 (lossy-encode gate6). [Source checks](source-verification.json). **All2923 unchanged decoded frames are MD5-identical to P4A**, including D28. [Unchanged checks](unchanged-verification.json).
- Fresh empty-temp rebuild from committed parent movie/stills/source archive is byte-identical to the verified full MP4. No dependency on ignored capture caches for editing. [Clean build](clean-build-verification.json).
- All1300 earlier tracked files byte-compared before allowed AGENTS/README/STATUS updates. Earlier P3B proofs/films/source,38-shot plan and private117.098231s audio reference preserved. No WAV read/request/regeneration/muxing. [Preservation](preservation.json).

## Costs and efficiency limitations

Final unique newly captured motion is174frames/**5.8s**. Geometry corrections required two78-frame die-only repeats: **330 forward screenshots /11.0s frame-equivalent actually captured**, plus repeat checks. These retries did not expand the action windows; they are disclosed rather than counted as a single-pass capture. Pip's96 frames were reused throughout. No full-episode3D export or native-resolution movie.

Retained job receipts (wall scopes, may overlap with other work):

| Job | Seconds |
|---|---:|
| Initial174 motion frames/reverse checks |142.439 |
| Flush-pip correction,78die frames |121.334 |
| Final support cleanup,78die frames |48.012 |
| Retained native jobs, before corrections |44.163 +41.739 |
| Final native job/reverse checks |19.536 |
| Final archive/edit encode |6.457 |
| Final source comparisons |9.209 |
| Full decode/browser check |6.124 |
| All unchanged-frame MD5 checks |4.842 |
| Final fresh-browser native checks |22.046 |

Initial archive/edit encode4.341s and intermediate6.533s also retained. Clean rebuild cost is in its receipt. Earlier diagnostic captures/check failures, source work, tests and review are excluded; **not a complete task/token bill**. Child CPU/max-RSS receipts do not measure aggregate Chromium-tree/GPU memory. Real WebGL uses Chromium/SwiftShader. Final die rendering suppresses redundant inherited scene-preparation draws; one draw per frame. No new packages/services installed. Historical receipts are cost provenance; final captures/verification describe the delivered assets.

## Reproduce / stop

Editing from the committed sources needs no WebGL recapture:

```sh
python scripts/dice-town-p4b1-assemble.py
python scripts/dice-town-p4b1-verify.py
node scripts/dice-town-p4b1-playback.js
python scripts/dice-town-p4b1-unchanged.py
python tests/dice-town-p4b1-map.py
```

Native inspection: `node scripts/dice-town-p4b1-capture.js --stills`; motion capture without `--stills`; explicitly use assembler `--rebuild-motion` afterward. Raw PNGs/clips/check images stay ignored under renders/. `scripts/dice-town-p4b1-sheet.py` reproduces comparisons.

Creative limits: five mornings use hard cuts with no independent clock/daylight progression; muted passage-of-days clarity still needs review. Pip's restrained frown/head/rigid-palm gestures and slight body advance can feel mechanical; the photo is simple symbolic artwork, not final D19 age-story imagery. Existing lighting gives weak contact shadows in the roll despite verified support. D28's incompatible side faces remain. D33 is still a static gate change; D05/06,D11/13/16,D19,D34,D38 and other old proxies remain unfinished. No final creative PASS or next-stage authorization implied. Stop for review.
