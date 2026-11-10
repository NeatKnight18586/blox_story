# Dice Town P4B-3 — ending integration

**Technical: PASS. Creative: awaiting human review.** Only D33, D34, D37 and D38 changed, on an isolated branch based on `codex/dice-town-p4b3-ending-direction` / `97686e6`. No merge, narration processing or work on another scene.

[Complete silent working edit](working-edit.mp4) · [390px before/after](phone-comparison.jpg) · [Phone review](phone-review.jpg) · [All 84 decoded motion frames](motion-contact.jpg) · [38-shot source map](edit-map.json)

## What changed

| Shot / fixed output frames | New material and editorial economy |
| --- | --- |
| D33 / [2898,2985) | 10f closed anticipation + 27f eased installed-leaf opening + 50f open hold. Pip waits on the town side. Existing hinge identities and final ±1.24-radian angles retained. |
| D34 / [2985,3090) | 6f anticipation + 30f child threshold crossing + 9f endpoint + 60f destination doorway plate. The same road/green house axis links to D35; arrival inside is implied by the cut. |
| D37 / [3344,3389) | 45f held crop of **P3B2B `response.png`**, recognition frame95. Original gray-swept hair, cream-V purple garment and warm household light. Crop x120/y240/w450/h800. **Zero new WebGL frames**, no mouth sync or invented mother. |
| D38 / [3389,3513) | 16f open-book hold + 27f actual front-cover closure + 81f reflective hold. Reuses Leo's original small notebook mesh, existing left shoulder/head pivots and cached thoughtful face; adds only pages, spine and one cover hinge. |

D33 and D38 were previously **stills**, not proxies. Only D34/D37 remove proxy material. Remaining proxy: **1,434/3,513 frames = 47.8s / 40.8198%**, down from1,584/45.090%. Full edit classifications:647 still,733 endpoint-hold,699 motion,1434 proxy. This is a working edit, not a fully animated film.

## Native-keyframe gate and visible assessment

Actual720×1280 screenshots were inspected before motion: [closed](gate-closed.png), [mid](gate-mid.png), [open](gate-open.png); [Pip before](Pip-before.png), [after](Pip-after.png), [home plate](home.png); [book open](book-open.png), [mid](book-mid.png), [closed](book-closed.png). [Mother close-up](mother-close.png) is explicitly a crop from the earlier native source, not a newly rendered native image.

The gate now opens visibly instead of changing state across a cut. Pip crosses in the same direction toward the established doorway. Mother's costume/hair no longer reset after D36. A tighter final camera makes Leo's face and physical notebook closure legible at phone width. The open gate/post and destination facade remain in the ending background. Existing sky, road, materials and characters retained; no new facade/library.

One bounded staging correction widened D38 FOV42→44 before motion to give the open cover more frame margin. Native poses were recaptured; no motion recapture. The original installation had a real leaf/post overlap, confirmed with browser geometry. In this **opt-in wrapper only**, leaf width is reduced5% and hinge centers inset0.15 units; four small front hinge straps maintain attachment. Threshold top is flush with road at0.025 instead of0.08. Original grounded-world source and prior images remain untouched.

## Verification

- `npm test` plus all `tests/dice-town*.js` and `tests/dice-town*.py`: PASS. New action/map tests and new JS syntax checks included;22 commands recorded in [regressions.json](regressions.json).
- Existing F1 genuine-WebGL control/identity/cosmetic/mobile test, P4B2 mystery geometry and P3B4 grounded-world checks: PASS. Original test outputs isolated into ignored scratch directories; no earlier evidence overwritten. [Browser regression receipt](browser-regressions.json).
- **261-position actual gate sweep**, including closed/mid/open, uses transformed mesh bounding OBBs against posts, wall, road, threshold and land; no collisions. Gate floor clearance0.07499995 units. Intended closed seam/hinge attachments excluded from volume-overlap claims.
- All30 child-walk frames: original six meshes,0.65 scale, readable gait sampled at an explicit3×clock; opposite limbs and root travel stay coordinated. Entire body starts at z≥0.15082 and ends at z≤−0.06424 across gate planeZ=0. No leaf/post/wall intersection. Max/RMS material-point foot drift **2.29e−16 / 9.50e−17 units**; max contact-height error1.32e−16, penetration2.02e−16; swing clearance0 at handoff, maximum0.03240. These are geometric floating-point results, not a claim about pixel-perfect shadow contact or realistic running.
- All27 book poses: no book/body/head or palm-volume intersections. At390px, minimum projected book width65.23px; head144.34px. Cover/face remain framed. Conservative mesh OBB/actual-vertex checks, not a general collision engine. [Geometry receipt](geometry.json).
- Native reverse seeking:9 screenshots/state hashes exact; separate fresh-browser reverse run:all9 exact. Motion source:84 forward captures,4 reverse probes exact. Construction UUIDs are intentionally random between browser lifetimes; logical state/pixels compare exactly and identities remain stable within each scene. [Capture](motion-capture.json), [cold run](cold-verification.json).
- FFprobe/full decode: **3513 frames,117.100s,360×640,30/1fps,H.264 Main,yuv420p,SAR1:1,no audio**. Continuous PTS and all38 cut keyframes verified. Real system Chromium H.264 playback advanced and sought through all37 cuts plus midpoint. [Playback receipt](playback.json).
-183 decoded source-frame comparisons:all shot starts/midpoints/ends and substitution boundaries; max mean RGB error1.401/255 against tolerance6 (H.264 conversion). [Source verification](source-verification.json).
- **All3152 untouched decoded frames bit-identical** to P4B2, including all D35/D36 frames. [Pixel preservation](unchanged-verification.json). All1417 pre-existing tracked files were hash-checked unchanged before authorized AGENTS/README/STATUS edits. [Preservation receipt](preservation.json).
- Reassembled in empty scratch/output directories from the committed84-frame source archive and PNG plates, without raw frame caches or another browser render: **exact delivered MP4 SHA256**. [Clean reassembly](clean-reassembly.json).

## Measured cost and reproduction

| Scope | Measured wall / resources |
| --- | --- |
| Final native still pass:9 forward +9 reverse +3 fresh-page probes |30.65s; Node child accounting1.58CPU-s,93.3MiB max individual RSS. An earlier9-pose FOV42 staging pass was also captured; its whole-process timing was not retained. |
| Motion:27 gate +30 child +27 book, plus4 reverse checks |56.98s; Node child accounting2.98CPU-s,90.4MiB max individual RSS. **84 new motion frames total**, no second capture. |
| FFmpeg source encoding + incremental assembly |3.25s wall,8.80 childCPU-s,188.1MiB max individual child RSS.3152 unchanged frames packet-copied. |
| Decoded source verification |7.85s wall; exact receipt includes child CPU/RSS. |
| Independent cold browser / final geometry |10.83s / ~5s wall, separately scoped. |

Browser/GPU aggregate memory and CPU were not collected; Node process-accounting values exclude unreported browser grandchildren. These are bounded-command measurements, not total session/model costs. Extra test-harness retries are outside the table: floating-point/UUID comparison and scratch-directory setup corrections required **no new motion capture**. No paid services, dependencies or private audio used. Raw84 PNGs and temporary encodes stay in ignored `renders/`; committed source archive is~220KiB and full edit~2MiB.

```sh
# Reassemble directly from committed source media; no WebGL required:
python3 scripts/dice-town-p4b3-assemble.py
python3 tests/dice-town-p4b3-map.py
python3 scripts/dice-town-p4b3-verify.py
python3 scripts/dice-town-p4b3-unchanged.py
node scripts/dice-town-p4b3-playback.js
# Optional reproduction, not required for normal edit rebuild:
node scripts/dice-town-p4b3-capture.js --stills
node scripts/dice-town-p4b3-geometry.js
node scripts/dice-town-p4b3-cold.js
node scripts/dice-town-p4b3-regression.js
python3 scripts/dice-town-p4b3-sheet.py
# Recreate the bounded source only if deliberately requested:
# node scripts/dice-town-p4b3-capture.js
# python3 scripts/dice-town-p4b3-assemble.py --rebuild-source
```

## Honest limits / stop

- Pip's existing rigid short-stride gait is sped up3×, so this is a brief brisk crossing, not newly authored natural running. The long journey is deliberately omitted via the doorway insert. No full-body arrival/hug is implied as captured motion.
- Small block hands support the book without articulated fingers or a second-hand grip. Cover closure is clear; performance remains restrained and the reflective endpoint is held.
- D37 is a static welcome, not spoken lip-sync. Destination facade stays simple and closed; the subsequent interior cut implies entry. Native stills are sharper than the economical360px working movie.
- D02,D05–D10,D12,D14,D17–D22,D24 retain original proxies. D19 family photo remains a separate future task. Prior mechanism/die/other-shot limits remain unchanged.
- Original117.098231s narration reference and1.25× history preserved; private WAV not accessed or processed. Film is silent, so actual narration sync/listening and iPad/Safari creative approval remain untested.

**Stop here: draft PR for review, no merge or next-scene work. Technical PASS is not creative approval.**
