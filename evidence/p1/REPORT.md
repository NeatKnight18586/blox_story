# P1 verified evidence

**PASS within the small P1 scope.** PR #6 was reviewed against PRODUCTION_FEASIBILITY.md and rerun successfully before commit-preserving merge `717dbfcc0ab8d0afdbc100db7d46a7734ce90d27` (retains `cdf87d1`). Original feasibility assets/evidence and all earlier commits are preserved. P1 is a separate branch/PR; stop for review.

## Actual exports

| Result | The light chest (original regression) | Not today (new data file) |
| --- | --- | --- |
| Artifacts | [MP4](feasibility/movie.mp4) · [contact sheet](feasibility/contact-sheet.png) · [manifest](feasibility/manifest.json) | [MP4](not-today/movie.mp4) · [contact sheet](not-today/contact-sheet.png) · [manifest](not-today/manifest.json) |
| Shot count / frames / duration | 3 / 216 / 7.200s | 2 / 120 / 4.000s |
| Output | 720×1280, 30fps, H.264 Main 3.1, yuv420p, square pixels, BT.709, fast-start | Same |
| Cuts (frame / seconds) | 60 / 2.0; 132 / 4.4 | 60 / 2.0 |
| Frame verification | 216/216 reverse-order pixel/state matches; **216/216 match approved feasibility PNG hashes** | 120/120 reverse-order pixel/state matches |
| Full decode / continuous timestamps / cut keyframes / HTML5 play and seek | PASS | PASS |
| Capture / reverse verification | 76.395s / 76.702s | 45.182s / 45.360s |
| Encode / video verification / total | 2.085s / 1.443s / 157.227s | 1.569s / 1.291s / 93.972s |
| Peak sampled subtree RSS | 968.53 MiB | 963.07 MiB |
| Temporary PNG bytes | 35,175,794 | 21,806,644 |
| Cache bytes at completion | 35,841,001 | 22,037,468 |
| MP4 bytes | 341,412 | 304,647 |

Both use Chromium 141.0.7390.37, genuine WebGL 2.0 ANGLE/SwiftShader, the same engine SHA-256 `ffb45fa4036651d3efcb3b99c6df1ab5a2bc93bf66522907aff99275ae2cb2ab`, and two available CPU cores. FFmpeg uses two threads. Resource sampling is summed exporter/server/browser/encoder process-tree RSS at 1s intervals; shared pages count per process and brief peaks can be missed. Capture throughput is offline (~2.8 frames/s), not real-time 30fps. Timings include verification and server startup; initial planned pause is separate. Cache totals include small previous debug fingerprints. The MP4 byte change from historical feasibility output reflects square-pixel normalization; all source PNGs are pixel-identical.

Bundled Chromium lacks H.264 playback; the verifier detects that and uses already-installed system Chromium 156.0.8078.79 for native HTML5 decoding, playback advancement and seeking. Each manifest records the actual version. No native iPad/Safari execution or cross-GPU pixel equality is claimed.

## Reuse and visual inspection

The unchanged version 1 feasibility scene covers idle, Readable walk, look/react, continuity placement and chest reveal. Version 2 `production/not-today.json` has different shot count/duration, cameras, actor/prop/plinth placement, warm palette, worried/smiling face, cap/color and Baseline walk. Its events open and close the same chest through the extracted factory. The same CLI/browser source renders both; only input JSON/output path differ. Complete frame lists/hashes, actual world actor positions and prop states are in the manifests.

Reviewed the original contact sheet again, with all 216 frames additionally checked against approved hashes. Inspected all 120 new raw frames using five indexed 24-frame sheets, plus the decoded MP4 contact sheet: stable oval head and six-part silhouette, prop opening, intact face/cap, deliberate hard cut and modest grounded walk, no missing geometry or severe clipping. Shot 1 is an intentional medium composition; shot 2 includes the feet. The chest closes behind the actor/off camera in shot 2; its state is verified numerically and by independent factory/event tests, not claimed as an on-screen beat. Faces/heading change deliberately at the cut; this is an input choice, not a supported walking transition. Full-size movies are the viewing artifacts; thumbnails demonstrate framing, not motion certification by themselves. Local review sheets/raw frames remain ignored.

## Recovery and safety evidence

- [Planned pause manifest](feasibility-paused.json): five completed full-size frames. Deliberately corrupted frame 0 and deleted frame 1, then resumed using the same command. Final manifest records **3 reused, 213 captured, 2 repaired**; every repaired/final frame matches its approved hash.
- [Real recovery tests](recovery-tests.txt): a temporary 12-frame genuine WebGL fixture receives **SIGTERM after first capture**, exits 130 with PAUSED checkpoint, repairs an intentionally corrupt PNG, resumes to verified H.264, then reuses 12/12 frames with identical MP4 SHA-256. A tiny disk budget fails without replacing the verified latest pointer; changed JSON gets a new fingerprint and no stale reuse. Fixture/cache are removed only from their test-owned temporary directory.
- [Source tests](source-tests.txt): preserved F1/F2A/Baseline/Readable/contact/legacy production assertions plus version 2 schema/events/seeking/appearance reset/placement reference/factory identity and ownership/locks/linked-path/atomic-write guards.
- [Browser regression log](browser-tests.txt): original F1, F2A motion, F2B1 walk and Baseline/Readable comparison commands. Historical evidence is preserved; regenerated files are compared before restoring equivalent archived reports. No avatar/action/test tolerances are changed.
- Full-size exports reject page errors, missing frames, hash/state mismatch, invalid metadata/PTS, decode errors and playback/seek failure before publishing `latest.json`. Results are immutable; failures cannot replace a verified result pointer. `git diff --check` and JS syntax checks are run before commit.

## Commands

PR #6 prerequisite: `npm test`, `npm run render:feasibility`, `npm run sheet:feasibility`, with the existing port-8000 server. Its generated timing-only manifest change was restored so historical evidence remains untouched.

```sh
npm test
npm run test:p1
npm run render:shots -- --shots production/feasibility.json --out renders/p1-feasibility --reference evidence/production/manifest.json --stop-after 5
# Recovery experiment: corrupt cached frame 0, remove cached frame 1; never edit approved evidence.
npm run render:shots -- --shots production/feasibility.json --out renders/p1-feasibility --reference evidence/production/manifest.json
npm run render:shots -- --shots production/not-today.json --out renders/p1-not-today
# With npm run preview serving the existing avatar inspector:
npm run test:browser
npm run test:motion
npm run test:walk
npm run test:calibration
```

Copy only `movie.mp4`, `contact-sheet.png` and `manifest.json` from the verified result directory referenced by each `latest.json` into evidence. Numbered PNG caches are never committed. Full command/schema/safe-output guidance: [P1_PIPELINE.md](../../P1_PIPELINE.md).

## Limits / recommendation

Retain this small pipeline as the production foundation: one actor, two named assets, existing actions, fixed cameras and explicit events. No collision/navigation system, camera tracks, multi-character choreography, editor, audio, generator, torso change or walking transition. New scenes must stay inside the small workshop and be visually checked; validated JSON does not guarantee good composition or collision-free authoring. Soft-body/contact constraints are unchanged from F2.

The cache budget is checked rather than an OS quota; FFmpeg can transiently exceed it and then fail before publication. Cached frames and old results are intentionally retained, with explicit manual cleanup of dedicated stopped output directories. Safety assumes a cooperative local filesystem. Native Safari remains unverified. Future feature additions should follow actual story needs after P1 review; the optional tapered torso proposal remains deferred and must preserve the default avatar/tests.
