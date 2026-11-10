# Dice Town P3B-3 — baker contact / shoe release

**Technical PASS for scoped checks. Creative PARTIAL / awaiting review.** Isolated from direction branch `5664d5f`; no merge, editorial integration, audio or other scene.

## Review evidence

[390px native-source review sheet](phone-review.jpg) · [single silent3.2s proof](baker.mp4) · [all96 frames](all-96-frames.jpg).
Native720×1280 WebGL: D03 [brace0](brace.png), [grip18](grip.png), [rise53](rise.png); D04 [worn57](worn.png), [gap75](gap.png), [separated95](separated.png).

First native stills exposed a support obscuring the insert and an insufficiently safe body path behind the slab. Before motion export, the insert was reframed, existing pivots given a small lean with counter-rotated hips, the bakery backdrop extended inside the crop, and bread moved away from hand silhouettes. A further native check widened the insert to retain the complete hero shoe. Final native stills and390px board were inspected, then exactly one low-resolution motion export made. Full96-frame sheet inspected afterward. No native video or whole editorial interval rendered.

## Implementation

One opt-in `production/dice-town-p3b3/` scene, using the canonical six-part avatar, yellow baker shirt/rust accent and original leg palette, existing appearance/face/block factories, Three.js lighting, and existing P2A easing. A small camera-visible bakery fragment reuses the existing terracotta/stone/window/striped-awning vocabulary, rather than importing the complete plaza. Open stall underside exposes floor separation. No global source/rig/API change or new dependency.

D03: short anticipation, arms reach, both distal arm support vertices meet the same fixed countertop points, then root and shoulders react as the baker rises. The contact solve uses actual transformed rounded-arm vertices; no bone scaling, hand replacement or physics engine. Small forward tilt and hip counter-rotation keep the torso/legs behind the slab. Head pitch gives a sparse upward reaction using the existing startled face.

D04: same actor, stall, orientation, shoes and global placement; camera cut only. Lightweight persistent sole/toe attachments start worn, initially rise with the person, then slip forward and descend. Hero sole gap0→0.440units; toe top is0.14units higher, leaving approximately0.30units of clear air under the foot at the final pose. Final hero sole bottom0.0038 above floor. The other shoe is delayed and intentionally partly offscreen. No perpetual loose-object float effect. Smooth authored descent implies gravity, not a physical shoe simulation.

Local96-frame proof: D03[0,57), D04[57,96),30fps,3.2s. Locked editorial D03[169,255), D04[255,337),38 cuts and3513-frame plan unchanged; this proof is not inserted into the episode.

## Validation

- `npm test`; all existing Dice Town source tests (`dice-town`, `p1b`, `p2a`, `animatic`, `p3b1`, `p3b2`) and new `node tests/dice-town-p3b3.js`: PASS. [Full output](regressions.log).
- `node scripts/dice-town-p3b3-qc.js`: PASS,96 sampled frames. Actual transformed body vertices checked against named slab/support/front-rail bounds and foot vertices against actual shoe-component bounds, with0.005unit interior tolerance; zero sampled penetration vertices. This is a targeted vertex/bounds check, not a complete triangle/continuous collision solver.
- Contact support intentionally stays0.015unit above slab for clean rendering. Max error from that target3.58e-9, max anchored-Z drift2.22e-16; both hands share identical rigid path except X. Do not interpret the intentional clearance as zero physical contact error.
- Minimum sole/foot gap approximately0; minimum shoe/floor0.00378. Critical head/arm vertices in D03 and left lower-leg/hero-shoe vertices in D04 have max absolute projected coordinate0.880 (<0.98). Upper legs and second shoe intentionally omitted from D04 containment. [Geometry receipt](geometry-qc.json).
- Baker six-part and cached face UUID identity stable; forward/reverse explicit states and same-backend PNG hashes match at native poses95/75/57/53/18/0 and low-res95/40/0. No browser page errors. [Native receipt](stills-verification.json), [motion receipt](motion-verification.json).
- Existing encoder/verifier reused: H.264/yuv420p360×640,30fps,96 decoded frames,3.200s,continuous PTS, silent. Cut57/1.9s is encoded keyframe. Full FFmpeg decode clean. Actual system Chromium playback advances and seeks across the cut; system browser used because bundled browser lacks H.264 codec support.
- [Preservation receipt](preservation.json): all1223 previous tracked files compared byte-for-byte before AGENTS/README/STATUS updates. Previous rendering source, tests, story clocks, films and evidence untouched.

## Cost / commands

Final native six-still job5.683s including reverse samples; earlier diagnostic still batches are excluded from this receipt, so not a total task cost. One final motion/encode/decode/playback job23.201s internally /23.544s wrapper wall. [Resource receipt](motion-resource.json): collected child user/system CPU2.974/0.641s and max-child RSS137432KiB (~134.2MiB), **not** summed Chromium-tree CPU or memory peak. Browser/GPU aggregate resources and token costs unmeasured. `/usr/bin/time` was unavailable; failed wrapper attempt did not launch a render. No dependencies installed.

Reproduce: `node scripts/dice-town-p3b3-proof.js --stills`; inspect; `node scripts/dice-town-p3b3-proof.js` (single final proof); `node scripts/dice-town-p3b3-qc.js`; `python scripts/dice-town-p3b3-sheet.py`. Serve repo and open `/production/dice-town-p3b3/` for browser inspection. Raw96 PNGs stay ignored in `renders/dice-town-p3b3/`.

## Honest visual limitations / stop

The rise, restrained hands and separated shoe are legible in the staged views. Rigid hands brace on corner support rather than wrapping fingers, so the grasp remains simplified. Expression stays startled; no sophisticated strain performance or secondary cloth response. Shoes are simple sole/toe blocks with eased release, not realistic footwear or ballistic dynamics. Hard shadows and sparse bakery detail retain the prototype style. Hero shoe is complete in the insert; second shoe and upper body are intentionally cropped. Creative acceptance is not established by passing tests. No W1/W5, crowd, episode render, D35 changes or next scene. Stop for human creative review.
