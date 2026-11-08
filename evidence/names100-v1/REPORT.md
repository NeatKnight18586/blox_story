# names100 V1 — PASS for the bounded visual review

Authority: [V1_VISUAL_BRIEF.md](../../stories/names100/V1_VISUAL_BRIEF.md). Review the [paired phone sheet](paired-phone.png) (left PR9 / right V1), [overview](paired-overview.png), [four-second silent movie](movie.mp4) and [decoded contact sheet](contact-sheet.png). These are actual Three.js/WebGL captures, not generated concept images. User aesthetic approval remains the next gate; stop at this PR.

## Executed gates

| Gate | Result | Evidence |
| --- | --- | --- |
| 0: review/merge PR9 | PASS | [source](pr9-source.log), [reference pixels + original film verification](pr9-verification.json); merged `6322b1c480083101d5bc9c0f3eb095430d43128b`, retaining `5c7f978` and brief commit `995f6e7` |
| 1: selected stills | PASS, visibly clearer emotions/geography | [gate1.json](gate1.json), eight genuine before/after pairs including every required global frame; reverse seeks, cached geometry/body identity, unobstructed eyes/brows, three props and no caption |
| 2: short motion only | PASS | [manifest](manifest.json), [direct-source random seeks](gate2-seeks.json), [integrity](integrity.json); all 120 output frames re-rendered in reverse and pixel/state identical, native H.264 playback/seek/full decode/PTS/cuts verified |
| 3: affected regressions | PASS | [source](source.log), [P1 recovery/range integration](recovery-range.log), [browser log](regressions.log), [archive comparison](regression-comparison.json) |

Gate 1 used one focused revision: the deeper window lining initially entered Eli's arm core. Only the two structural liners moved from z=+.35 to -.35, outside the window; the sill, props and performances stayed fixed. [Clearance diagnostic](revision-clearance.json) records the failed/passing transformed point. Gate 1 was recaptured after that correction and visually reviewed before Gate 2. No second art revision or full-slice V1 render.

## What changed and why

Four spare curved-surface faces (`nervous`, `startled`, `thoughtful`, `relieved`) reuse the existing per-avatar face cache. Legacy `blank`, `classic_smile`, `worried` are unchanged. Small brows fit below both cap and bob; two oval eyes and a simple mouth remain readable at phone size. Eli reads nervous before the name, visibly startled at 789, then thoughtful, then relieved. Mara stays uncertain while ghostly and changes expression only during restoration, with relief at the existing .65 recognition threshold. No recognition before the supernatural restoration window.

Same independent cast, body/head meshes, pivots, wardrobes and action engine. Exactly three narrative prop assemblies: tied-back curtain, unlit lamp and personal notebook with pencil. Deeper window structure separates the interior from the ghost. The old warm room point light is disabled for V1; restoration warmth is reduced from 12 to 8. The cold portrait fill keeps the eyes readable. No decorative captions: V1 omits even the original whisper subtitle while preserving its source cue times. Prior proof assets and runtime behavior remain available.

| Global frame | Reviewed improvement / remaining issue |
| --- | --- |
| 592 | Wider room/window geography, notebook/lamp/curtain establish a personal room; eerie cold ghost remains readable. S08 camera changes intentionally to show that geography. |
| 700 | MARA tag remains readable; uncertain eyes/brows visible below bob; no caption competes. |
| 762 | S10 now shows Eli hesitating instead of staying on the tag after it was established. Reuses S11 fixed camera; redundant tag push is held at that camera rather than introducing new motion. |
| 788 / 789 | Counter is exactly 100 / 99, nervous mouth changes to clear startled O; same boundary framing as PR9. |
| 908 / 926 | Uncertain half-restored Mara becomes clearly human and relieved; coral/skin regain warm color without washing out the face/tag. |
| 944 | Eli's relieved realization is finally visible, rather than repeating Mara's restoration shot. |

Source timeline remains **[482,945)**, at 30fps. Counter 100 through788, 99 at789; ghost through889; restoration890–926. The **only cut change is938→927**: PR9's tail still faced Mara, hiding Eli's realization. V1 waits until Mara is fully human at926, then gives Eli18frames/.6s. All other cuts, cast placements, action sampling and cue intervals are unchanged. `tests/expressions.js` compares every one of the463 pure cue samples against PR9. Original scene-proof JSON files are untouched.

## Motion, export and reproduction

Only source-local **[343,463)** / global **[825,945)** was exported. Output frame i maps to source343+i/global825+i; action/cue time is not restarted. New minimal `--range START:END` keeps the source plan, trims export shot intervals, records sourceFrame/outputTime, isolates resume keys and rejects bad ranges before publication. Existing safe files, budget, ownership/locking, verification and encoding remain in use. Integration tests cover complete/corrupt/interrupted resume, invalid input/budget publication protection and isolated six-frame range/cache reuse.

```sh
npm test
npm run test:p1
npm run test:v1
python3 scripts/measure-render.py --shots stories/names100/scene-v1.json \
  --range 343:463 --out renders/names100-v1-excerpt \
  --report evidence/names100-v1/resource-usage.json
# Equivalent unmeasured export: npm run render:names100:v1
npm run test:v1 -- --motion
# F1/F2 browser suites need npm run preview on port8000:
npm run test:browser
npm run test:motion
npm run test:walk
npm run test:calibration
npm run test:casting
```

Export: **360×640,30fps,120frames,4.000s,H.264 Main3.1,yuv420p,BT.709,square pixels,fast-start**, video-only,127,719bytes. FFprobe/all120 decoded PTS i/30/native HTML5 playback and seeks pass; cuts at output57(global882) and102(global927) are keyframes. No page errors/missing frames. Chromium141 ANGLE/SwiftShader renders WebGL2; systemChromium156 verifies native H.264 because bundled Chromium lacks decoding. All120 forward/reverse frames and seven shuffled source/clip seeks match. Visually inspected all120 source frames in consecutive-frame sheets and the decoded contact sheet; relief/restore and both cuts read at mobile size. Large raw sheets/PNGs/cache are ignored. Existing P1 resume caches were preserved.

| Measured export cost | Value |
| --- | --- |
| Capture / full reverse check | 26.153s /25.692s |
| Encode / video verification | .517s /1.115s |
| Exporter total / measured wrapper wall | 54.224s /54.697s |
| Sampled renderer-tree CPU | 99.07s user +5.55s system |
| Peak sampled summed subtree RSS | 904.86MiB |
| Temporary PNG / completed cache bytes | 9,718,825 /9,863,912 |
| Available cores / FFmpeg threads | 2 /2 |

CPU is a .25s `/proc` cumulative sample lower bound, potentially missing short-lived/final process fractions. RSS is a one-second sum with shared pages counted per process; not exact physical peak. [Resource receipt](resource-usage.json) and manifest retain method/details. No dependency added.

## Regression scope and limits

All affected F1/F2/P1/P2A source tests, real browser suites and actual P1 recovery/range MP4 integration passed. The original reveal's selected gold images still match after opt-in V1 changes. All six tracked previous movies remain byte-identical; archived browser output differences match the already recorded PR9 rerun hashes (metrics JSON is decoded-equivalent) before restoring those archives. No old test or tolerance was weakened. Old full-film exporters and the full-slice reveal browser sweeps were deliberately not repeated: this brief caps V1 at selected stills and a3–5s excerpt. Source checks cover the entire cue timeline; visual claims cover the selected stills and120-frame excerpt, not all463 new frames.

Quick reviewed checklist: readable eyes/brows and counter/name; stable wardrobe/silhouette; grounded feet; no severe actor or new-prop clipping; cold-to-warm continuity; no ghost recognition before restoration; exact timing; no captions/audio. New liner collision was corrected once and documented.

Remaining limitations: overlapping transparent ghost garment surfaces remain visible, especially mid-restore; the rigid rig has no fingers/body bend, and expressions switch between cached shapes instead of interpolating. Eli's final reaction is only.6s within this fixed slice. Props are intentionally quiet background context. Native iPad/Safari and cross-GPU/font pixel identity are unverified. External WAV is unavailable, so final audio sample alignment is not certified. No full episode, full-slice V1 movie,720×1280 story export or voiceover was created. Stop for user visual review.
