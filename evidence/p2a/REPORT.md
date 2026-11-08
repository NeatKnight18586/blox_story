# P2A — genuine casting and acting evidence

**P2A PASS within this small scope.** [Play/download the actual film](movie.mp4) · [decoded contact sheet](contact-sheet.png) · [full render/encode/playback manifest](manifest.json) · [commands and schema](../../P2A_CASTING.md).

## PR #7 prerequisite and integration

Reviewed PR #7 source, P1 contract, both movies and recovery records. Reran `npm test`, `npm run test:p1`, `test:browser`, `test:motion`, `test:walk`, `test:calibration` and regenerated both full-size P1 films. All **336 source PNGs and both complete encoded MP4 files reproduced byte-identically** against committed evidence. Real recovery tests repeated SIGTERM/resume, corrupt-frame repair, cache-only reuse, identical MP4 hash, changed-input invalidation and failed-budget publication protection. No blocking failure, no pending review comments or failing CI (no GitHub CI checks were configured).

Commit-preserving merge `74708b9a02aaefafbc3d8f9cc3d98f291afbe976` retains `e1690a0` and all earlier assets/commits/evidence. P2A branch starts from updated main. [Prerequisite logs and film hash/resource summaries](pr7-review/) are recorded; historical camera/UI captures were restored after comparison, not silently overwritten.

## What the film demonstrates

“A little reassurance” is an original five-shot, **12-second silent visual acting test**. Ren (classic, cap, blue vest) and Sol (optional tapered torso, bob, coral vest) share one workshop. Sol looks worried, checks Ren, receives a reassuring glance, returns a smile, then both settle. Shots are a full two-shot, Sol close-up, over Sol's shoulder onto Ren, a returned Sol close-up, and the final two-shot. It uses only existing idle/look-react actions with independently explicit local times. No extra animation engine or gesture system.

Top-level cast IDs persist; both avatars exist throughout and independently own parts, pivots, materials, faces and caches. Body variant is fixed at construction. Version 3 delegates actor scheduling/sampling to P1 and the existing action API; versions 1/2 remain supported. One removable bob and one torso-matching vest are demonstrations, not a character library. Classic remains default; the original oval head, limbs, pivots and both gaits are preserved. The torso has the same 2×2×1 envelope and approximately 1.5-unit waist, with planar front/back and subtle bevels. No precise additional hourglass reference asset exists in the repository, so this is a restrained interpretation of the direction, not an exact-match claim.

## Verified output and resources

| Measurement | Executed result |
| --- | --- |
| File | `movie.mp4`, 580,939 bytes |
| Format | H.264 Main / level 3.1, yuv420p, BT.709, square pixels, fast-start, no audio |
| Resolution / rate / duration | 720×1280 / 30fps CFR / 12.000s |
| Frames | 360 captured, 360 reverse pixel/state matches, 360 decoded, continuous `i/30` timestamps |
| Cuts | Frames 72 / 144 / 216 / 288; 2.4 / 4.8 / 7.2 / 9.6s; all encoded keyframes |
| Actual native playback | System Chromium 156.0.8078.79; advanced, no media error, seek through all cuts |
| Capture / complete reverse re-render | 128.297s / 131.170s |
| Encode / video verification / total | 3.234s / 1.826s / 265.433s |
| Sampled peak exporter/server/browser/encoder subtree RSS | 967.18 MiB |
| Temporary PNG bytes / total completed cache bytes | 47,641,965 / 47,998,834 |
| MP4 SHA-256 | `074bad369f9a8e08400c6c2512adcb2b96fd2b0b7d0d2900de5b768a38775e1a` |

Rendering is actual Chromium 141.0.7390.37 WebGL 2.0 ANGLE/SwiftShader (software WebGL), two available cores and two FFmpeg threads, no new npm dependency. RSS is sampled each second and sums shared pages per process; it is an estimate, not a hard memory bound. Capture throughput is approximately 2.81 frames/s offline, not real-time 30fps. Bundled Chromium lacks H.264 decoding, so P1's existing capability-tested system-browser fallback performs native playback. iPad/Safari and cross-GPU pixel identity are not certified.

## Geometry, identity and visual review

- [API metrics](api-metrics.json): both independent six-part avatars, five original pivots/rest positions, stable body/geometry identity, classic default, normalized tapered envelope/waist, immutable input, ID/order validation, pure seeking, appearance isolation, every existing face with cap/bob/vest combinations, cached removals/reapplications and sampled actor proximity events. No walking transition added.
- [WebGL manifest](browser-manifest.json): all **360 frames at 180×320**, repeated in reverse with exact pixels; body, pivot, material, geometry and cached hair/vest child references remain identical. Fixed camera signatures hold throughout each shot. All acting frames have minimum actor AABB gap **0.813919 world units**, zero body/attachment penetration below the floor, and complete two-shot silhouettes inside maximum absolute NDC **0.914503** (<.97 test gate). Disjoint actual-geometry actor bounds prove no actor-to-actor intersection in this scene; this is not a general collision solver.
- Five [720×1280 inspection views](view-0.png), including [worried close-up](view-90.png), [OTS](view-165.png), [smiling close-up](view-237.png) and [final two-shot](view-320.png). Intended subjects' eye rays hit their face layers, not hair/clothing or the other actor, in all selected compositions. Caps/hair do not cover the acting faces.
- Genuine **360×640 mobile** [cast](mobile-cast.png), [both undressed bodies](mobile-bodies-undressed.png) and [restored cached layers](mobile-layers-restored.png). Projected dressed silhouette heights at frame 0 are **264.92px / 265.79px**, measured from actual projected mesh vertices ([projection data](mobile-projection.json)). Removing layers keeps the same avatars and shows the optional waist; reattachment restores the same objects.
- Human visual inspection covered all five full-size view captures, mobile captures, decoded MP4 contact sheet and **120 sampled motion frames (every third frame, 10fps)** arranged in five indexed local review sheets. All 360 frames additionally have automated geometry/identity/pixel checks. Readable worried-to-smiling exchange, proper inward head glances, stable foot shadows, recognizable cap/bob and blue/coral silhouettes; no severe actor or attachment clipping observed. Close-ups crop torsos and OTS crops foreground head/shoulder deliberately. The first loose two-shot was tightened before the final export; all checks were rerun on the final staging. Large numbered sequences/local review sheets remain ignored.

Both body variants also passed actual transformed-vertex contact checks with origin yaw/translation over four walking cycles at 30/60fps. Errors below are max / RMS in world units, against unchanged F2 limits .03 drift / .01 penetration / .02 contact. These are numerical roundoff, not weakened tolerances:

| Body / gait | Samples | Foot drift max / RMS | Penetration max / RMS | Contact error max / RMS | Peak swing clearance |
| --- | ---: | ---: | ---: | ---: | ---: |
| classic-baseline | 434 | 4.97e-16 / 1.7e-16 | 2.22e-16 / 1.26e-16 | 4.44e-16 / 1.96e-16 | 0.045 |
| classic-readable | 434 | 9.93e-16 / 2.69e-16 | 2.22e-16 / 8.59e-17 | 4.44e-16 / 1.43e-16 | 0.05 |
| tapered-baseline | 434 | 4.97e-16 / 1.7e-16 | 2.22e-16 / 1.26e-16 | 4.44e-16 / 1.96e-16 | 0.045 |
| tapered-readable | 434 | 9.93e-16 / 2.69e-16 | 2.22e-16 / 8.59e-17 | 4.44e-16 / 1.43e-16 | 0.05 |

The acting film itself uses planted idle/look/react, not walking. Both original gait implementations remain untouched. New garments are not claimed as a full cloth/body collision certification over every possible authored movement.

## Regression and reproduction

```sh
npm test
npm run test:p1
npm run test:casting
npm run render:shots -- --shots production/reassurance.json --out renders/p2a-reassurance
npm run render:shots -- --shots production/feasibility.json --out renders/p2a-regression-feasibility --reference evidence/p1/feasibility/manifest.json
npm run render:shots -- --shots production/not-today.json --out renders/p2a-regression-not-today --reference evidence/p1/not-today/manifest.json
# Existing avatar inspector server on port 8000 for the four legacy browser tests:
npm run test:browser
npm run test:motion
npm run test:walk
npm run test:calibration
```

Executed [source](source-tests.txt), [casting](casting-tests.txt), [recovery](recovery-tests.txt) and [browser regression logs](browser-regressions.txt), plus [post-change P1 film checks](p1-regressions.json), accompany this report. Historical evidence is compared/restored to keep all approved assets intact. The movie/contact sheet/manifest are copied only from a PASS result referenced by `latest.json`; no private temporary frame cache is committed.

## Limits and review boundary

This is a reusable **two-character casting slice**, not a cinematic engine or finished episode. Reactions remain the existing restrained head/shoulder gestures; face changes and action starts use deliberate hard shot cuts. No hand performance, walking transitions, camera movement, cloth/hair physics, audio, editor, story generator or large library. One small original workshop is reused; its simple wall/floor edges remain visible in wide views. Authors must still stage and inspect new scenes: camera presets are fixed at shot start and do not guarantee arbitrary walking stays framed or actors avoid each other. Hair and cap are exclusive; only one bob/vest is provided. Classic default remains available independently of either demonstration look. Stop at the P2A PR for review; no next phase.
