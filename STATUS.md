# F1 v3 — verification status
**Final F1 grade: PASS (A source/API + B real visual review + C reproducible HTTP preview).**
Verified 2026-11-08. Current F2A implementation results appear below; F2B remains deferred. F1_SPEC.md remains authoritative.

## Executed checks
- Baseline: `node tests/smoke.cjs` passed the old mocked Kai/Mira tests; this is not v3 evidence.
- `npm install` installed Three.js 0.187.0 and Playwright 1.56.1; lockfile committed.
- `npm test` passed using actual Three.js modules: six meshes, five named pivots, ground/assembly bounds, deterministic pose/reset, cached independent faces, removable cached cap, palette changes and persistent body identity; invalid names rejected.
- `for f in avatar/*.js appearance/*.js preview.js tests/*.js; do node --check "$f" || exit; done` passed.
- `python3 -m http.server 8000` / `npm run preview` serves the preview.
- `npx playwright install chromium`; `npm run test:browser` passed in Chromium with WebGL 2.0 using ANGLE/SwiftShader. Actual Three.js WebGLRenderer, not a mock. No page errors. Dropdowns, play/pause, same body identity and cosmetic removal tested. Screenshots captured at 768×920 viewport and 390×844 mobile viewport, plus an approximately 160px-tall avatar.

## Genuine browser evidence, visually inspected
- `evidence/01-front.png`: full neutral gray body, classic curved smile.
- `evidence/02-threequarter.png`: depth, subtle bevels, six-part silhouette and grounded cast shadow.
- `evidence/03-side.png`: true orthographic side profile, rectangular limbs, rounded oval cylindrical head.
- `evidence/04-face.png`: small oval eyes and curved stroke, separate from head.
- `evidence/05-blank.png`: unchanged body with blank face.
- `evidence/06-cap.png`: cap attached to same head pivot.
- `evidence/07-removed.png`: cap removed from same body.
- `evidence/08-worried.png`: independent curved frown.
- `evidence/09-mobile.png`: phone-size layout and complete silhouette.
- `evidence/10-small.png`: readable silhouette at about 160px avatar height.

Review: square 2×2 torso, straight aligned arms, equal-length block legs, tiny seams, no extra neck/hands/shoes; head is a softly rounded oval cylinder rather than a box or sphere. Neutral feet touch ground numerically and visually. Three-quarter view exposes the shadow; orthographic front/side intentionally compress the ground plane. Matte gray material and broad neutral lighting preserve simple forms. Compared visually with the four reference images visible in this task conversation; reference files are not in the repository and no pixel-exact match is claimed.

Targeted fixes: API bounds check now updates the ancestor world transforms before measuring child meshes. Initial phone framing clipped the arms; aspect-aware camera fitting fixed it and browser captures were rerun successfully.

## Limits / remaining issues
No blocking F1 issues found. Lighting uses inexpensive directional shadow maps, with a fairly defined shadow edge rather than offline-render contact shading. The facial strokes slightly protrude in true side view. These are deliberate lightweight preview tradeoffs. Walk is a deterministic pose demo only, without planted feet, IK or root motion. Native iPad/Safari GPU execution was not tested; responsive Chromium was. No public deployment was created; the documented HTTP preview satisfies gate C. Legacy source remains unused and preserved, alongside its existing Git history. No video, audio, story, or F2 implementation is claimed.

## User head correction (2026-11-08)
The user rejected the original box-like head. Replaced the rounded box with an original 96-segment lathed oval cylinder, 1.25 × 1.16 × 1.10, with .22-unit rounded rims. This removes square horizontal corners instead of merely increasing a box bevel. Eyes and mouth now follow the curved surface. Updated the authoritative spec and operating rules to prevent reverting to the superseded head design.

Re-ran `npm test` (including head geometry/dimension and curved-face checks), `npm run test:browser`, and source syntax checks. All passed. Regenerated and visually inspected all ten evidence images, including cap fit, blank face, true side and mobile views. Six body meshes, pivots and attachment identity remain stable. F1 remains PASS; user aesthetic approval is separate from executed technical checks. F2 remains on hold. No exact proprietary mesh match is claimed.

## Integration and next-phase documentation
- Compared `origin/main` with `origin/codex/f1-v3-canonical-avatar`: zero commits behind, two ahead; 26 changed files. `git diff --check` passed. Ten committed PNG evidence files verified present; front/three-quarter face/mobile evidence reviewed again.
- Re-ran `npm test` and `npm run test:browser` successfully before merging; real Three.js and WebGL 2.0, no page errors. Regenerated captures introduced no Git changes.
- Created and merged [F1 PR #1](https://github.com/NeatKnight18586/blox_story/pull/1). GitHub confirmed merged at `2dff6c6bf488870da8ea5427261edc6d26bc3207`. Main had no protection/review gate; PR was clean and mergeable with no configured checks. Used a merge commit, retaining both `28fc47c` and `45180f0`; no force push or deletion of legacy work.
- F2_SPEC.md and F2_HANDOFF.md now define the future three-action system, deterministic times, contact-aware transitions, measured support/slip limits, real-browser fixed-frame inspection and vertical/mobile acceptance.
- Documentation preparation changes no runtime, dependencies, tests or evidence assets. F2 remains NOT IMPLEMENTED / NOT TESTED, not PASS. No F2/F3 system or production pipeline was added.

## F2A implementation — PASS for idle/look-react scope only
User authorized implementation after the documentation-only task. F1 anatomy/appearance requirements are unchanged. F2B walking is NOT IMPLEMENTED and must not start automatically. The complete three-action F2 phase remains incomplete.

Implemented in `avatar/actions.js`: pure explicit-second idle (3s loop), look_react (1.6s anticipation/turn/hold/recovery, then neutral), smooth .25s transitions and explicit absolute application. Source and target local times are supplied independently; interruption may use an explicit pose snapshot. No clock, random values, integration, new framework or runtime dependency in the action layer. Preview adds action/direction, scrub, ±1 frame at 30fps and play/pause. Legacy F1 pose API/controls remain available, with walk clearly labeled a demo.

### Executed verification
- `npm test`: existing F1 real-Three.js tests plus F2A tests passed. Includes shuffled seeking, independent avatars, shared 30/60fps timestamps, idle loop pose/velocity continuity, reaction segment boundaries/recovery clamp, both directed transitions and same-action pairs, endpoint velocities, interruption snapshot continuity, invalid inputs before mutation, reset from legacy poses, explicit origins, all three faces and cap on/off, six mesh/five pivot/root identities.
- `npm run test:browser`: original F1 WebGL test passed with no page errors; all ten F1 evidence captures retained unchanged.
- `npm run test:motion`: genuine Chromium 141.0.7390.37 WebGL 2.0 (ANGLE/SwiftShader). 285 lossless PNG frames at 30fps: one idle loop, full front and side reaction clips, and all four idle/look-react transition pairs with .25s lead-in/out. Every timestamp re-sampled in reverse order and pixel-identical to its forward capture. Nonidentical frames within each clip prove visible rendering changes. Real controls, frame steps, play/pause, action transition start, face/cap/direction combinations and responsive overflow tested.
- Per-frame transformed body geometry: minimum body Y=0; maximum active support height error=0; maximum/RMS horizontal drift=0. Both hips/root remain stationary, so no walking solver is claimed. Floor guarantees assume level parent and origin.y=0.
- 9:16 canvas captures at 390×693 and 720×1280, full mobile controls capture, and approximately 160px silhouette capture. No user installations or manual recording needed.
- `python3 tests/contact-sheets.py` assembled all 285 actual screenshots into 14 indexed frame sheets. Pillow is used only for arranging evidence; not shipped to browser. Source syntax checks and `git diff --check` passed.

### Evidence and visual review
`evidence/f2a/manifest.json` lists browser/version, fps, frame timestamps/files, repeat-seek results and contact extrema. All raw PNGs are in `evidence/f2a/frames/`. `sheet-idle-*`, `sheet-react-*`, `sheet-react-side-*` and `sheet-*-to-*-00.png` cover every sampled frame. Vertical views, all faces with/without cap, mobile controls and small silhouette are separate PNGs in the same folder.

Reviewed the 14 sheets frame by frame: subtle idle motion, clear restrained turn/glance, smooth anticipation/recovery and blend changes, no visible floating or severe clipping, stable feet/shadows and unchanged block silhouette. Rounded head and independent face remain intact. Small shoulder/head overlaps are confined to the existing joint region. Close-up cap framing was widened after inspection; browser tests/captures were rerun. F1 stills are separate from F2A evidence.

### Limits
This is F2A PASS, not full F2 acceptance: no walk/root travel/stance solver. Legacy walk_demo is unchanged. Native iPad/Safari GPU execution is not verified; vertical responsive Chromium is. Pixel determinism was verified within the tested browser/GPU backend, not promised across GPU vendors. Interrupted snapshot blends preserve pose continuity but do not promise matched incoming velocity; ordinary progressing-source transitions match endpoint velocity. The lightweight F1 directional-shadow style remains. No MP4, audio, environment or story system was added. Submit the implementation PR for review; do not auto-merge or start F2B.

## F2A integration / F2B1 standalone walk — PASS within this scope
PR #3 was reviewed against main and its F1/F2A tests re-run successfully: `npm test`, `npm run test:browser`, `npm run test:motion`. Confirmed all 310 F2A evidence files, genuine frame/manifest content and clean regeneration before merging; inspected representative reaction/transition/mobile evidence again. GitHub reported clean/mergeable. Merged with commit preservation at `bcdf18b892611c2eca3a8106baea2bd4e30df414`, retaining `7fbe933`. F2B1 branch was created from that updated main. No force push or loss of F1/F2A work.

### Foundation implemented
Standalone `sampleAction('walk', t)` reuses the sampling/application API. Period 1.2s, forward travel .4022328542 units/cycle, hip swings ±.05 rad with opposite arm swings. Root height is computed from a cached profile of the actual beveled leg geometry; horizontal travel locks a fixed material point on each support edge. Contact metadata exposes support leg, fixed anchor, edge, interval, swing leg/clearance and handoff rules.

Mirrored rigid legs alone have identical bottom heights and cannot provide swing clearance. The smallest used correction is .045 units of vertical lift at the existing swing hip (within the unchanged .05 target). No new joint/body mesh, leg stretching or new dependency. Factory records neutral pivot positions; action application and legacy poses reset the offsets. Origin yaw rotates displacement rather than accumulating it on the previous frame.

Rear-to-front support-edge handoff occurs at a fully flat sole; its two anchors differ by the actual .96 sole depth. This is explicitly logged, not presented as one contact magically moving .96 units. Support leg swaps every .6s with both soles touching at the handoff instant. Stance drift is measured against the fixed material point over each complete edge interval, including boundary frames. Actual transformed mesh vertices independently check penetration, contact height and swing clearance.

### Executed tests and measurements
- `npm test`: F1 and F2A tests plus new real-geometry walk tests PASS. 434 samples across four cycles at 30/60fps; fixed anchors, clearance, root/pose continuity, monotonic forward travel, endpoint velocity joins, deterministic shuffled seeking (including t=1e6), origin yaw, all faces/cap variants, object identity and full offset reset tested. Unsupported walking transitions throw. The single old F2A invalid-name assertion changed from `walk` to `run` because `walk` is now supported; all other existing F1/F2A assertions remain intact.
- `npm run test:browser` and `npm run test:motion`: PASS again on the completed branch. Genuine F1 and F2A WebGL rendering, 285 deterministic F2A frames and control tests preserved; no page errors. F1 stills and F2A motion/face/vertical assets regenerate identically. Only the UI screenshot text/options changed; the new tested UI is retained under F2B1 and the original F2A UI archive is preserved.
- `npm run test:walk`: PASS in Chromium 141.0.7390.37 / WebGL 2.0 ANGLE/SwiftShader. Two cycles, side and three-quarter views: 146 captured frames, reverse-order pixel-exact re-sampling, plus 436 actual-geometry measurements over 30/60fps and matching pixels at shared timestamps. Root/pivot/mesh references retained. Controls and reset back to idle tested. 390×693 and 720×1280 genuine vertical canvas captures completed.

Browser measurements (world units; errors here are floating-point roundoff):

| Measure | Maximum | RMS | Spec maximum |
| --- | ---: | ---: | ---: |
| Stance material-point horizontal drift | 1.11e-16 | 3.01e-17 | .03 |
| Body penetration below ground | 2.22e-16 | 1.27e-16 | .01 |
| Support contact/sole-height error | 2.22e-16 | 1.96e-16 | .02 |

Measured swing clearance: 0 at touchdown/liftoff, maximum .045. Hip correction maximum .045. Independent four-cycle real-module tests found maximum drift/penetration/contact errors no larger than 4.45e-16; full precision in `api-metrics.json`.

### Genuine visual evidence and review
`evidence/f2b1/manifest.json`: commands/browser sampling context, every captured timestamp, fixed edge/anchor/interval metadata and browser max/RMS metrics. `api-metrics.json`: independent real-module 30/60fps metrics. Eight `sheet-side-*` / `sheet-threequarter-*` PNG sheets contain every captured frame, labeled by index/time, assembled with `python3 tests/contact-sheets.py evidence/f2b1`. Selected stance/swing/handoff stills, both vertical captures and current mobile controls are committed. Raw 146 PNG sequences regenerate into a Git-ignored frames directory; they are not duplicated in Git, limiting screenshot accumulation.

Inspected all eight sheets frame by frame and both vertical views: stable grounded support, small visible swing lift, coordinated opposite limbs, no obvious sliding, hovering or severe clipping; six-part silhouette and oval head remain intact. Hip overlap stays within the joint region. Initial fixed framing clipped an arm near the end of travel; camera width/center was corrected and both walk views/captures re-run and reviewed. Source syntax and `git diff --check` passed.

### Limits / next review boundary
F2B1 PASS is for the conservative standalone foundation, not full F2. It intentionally resembles short shuffling steps, with smooth zero-velocity instants at flat-foot/foot-swap boundaries; it is not a natural long stride, continuous-speed gait or physics simulation. Appearance remains compatible, but native iPad/Safari is unverified. Fixed inspector framing covers the first two cycles; unbounded root travel is supported by the sampler, not an automatic camera-follow system. Walk selection/exit uses a cut and `sampleTransition` rejects walk; no walking transitions were implemented. No tolerances were loosened, anatomical redesign, framework, F3, story, audio or MP4. Submit the F2B1 PR and stop for review.

## F2B1 visual calibration — PASS, separate PR for review
Reviewed PR #4 against F2_SPEC.md, re-ran all four regression commands (`npm test`, `npm run test:browser`, `npm run test:motion`, `npm run test:walk`) and confirmed genuine evidence before merging. No blocker found. Commit-preserving merge `e956e65a4c4a6938063b9b6f07ebe6dd10422f93` retains `c22431d`; calibration branch starts from updated main. Regenerated manifest key ordering and the UI screenshot differed as expected; measurements/stills were otherwise unchanged at review.

Tested exactly one modest opt-in gait, `sampleAction('walk', t, {gait:'readable'})`: hip ±.10 rad, opposing arm ±.18 rad, swing lift capped at .05, same 1.2s cycle. Baseline default remains untouched and SHA-256 checked against 145 samples captured before edits. Geometry, six-part anatomy, head, pivots, face/appearance modules and F2A actions remain unchanged. The selector permits reproducible comparison; it pauses/resets time on changes. Both walk options share wider fixed inspector framing, with no tracking or variant-specific zoom.

All API and WebGL checks passed, including 30/60fps shared timestamps, reverse pixel-identical seeks, fixed camera assertions, geometry bounds/contact checks, appearance identity and handoff timing. New comparison captured 292 frames and measured 872 WebGL samples. Independent API checks cover four cycles per gait. Visual review of every paired frame and mobile 9:16 renders finds the variation demonstrably clearer, without obvious sliding/hovering or severe clipping. Hip-region overlap increases modestly from .025 to .03021 units, below .05; clearance from .045 to .05. Contact drift/penetration/error maxima remain under 5e-16 in browser tests (roundoff), against unchanged .03/.01/.02 limits. Full max/RMS statistics, actual support-locus checks and tradeoffs: [calibration report](evidence/calibration/REPORT.md).

Professional recommendation: retain **Readable** for the next storytelling prototype while keeping **Baseline** for slow shuffles/regression. Leg motion is ~2× clearer and arm excursion ~2.56× larger, with stronger vertical/fore-aft weight cues. Cadence is unchanged; forward travel doubles from .40223 to .80826 units/cycle. This remains stylized and upright, not a complete general-purpose gait. Default remains baseline pending review; the trial is opt-in.

Evidence: compact paired PNGs and complete side/three-quarter motion GIFs in `evidence/calibration/`, original lossless raw PNGs/review sheets regenerated into ignored `raw/`, browser/API JSON metrics, and the baseline SHA fixture. Original F1/F2A/F2B1 evidence is preserved as an archive; the changed preview framing/UI is documented rather than silently replacing old captures. Reproduction commands in REPORT.md. Syntax/whitespace checks passed. No dependency, walking transition, F2B2, F3, story, audio or MP4 export was added. Submit the calibration PR and stop for review.

## Production feasibility — PASS, separate PR for review
The user explicitly changed direction to a bounded shot-based Shorts feasibility test, overriding previous no-MP4/no-environment task restrictions for this test. F1/F2 requirements and source remain unchanged.

### PR #5 integration
Reviewed/reran `npm test`, `npm run test:browser`, `npm run test:motion`, `npm run test:walk`, and `npm run test:calibration`; all passed before integration. Preserved both gaits and all evidence. Merge `35b38cbd0d7bc3f25248968ce40f0eeeb00ba319` retains PR #5 commit `6464c7a`. The production-feasibility branch starts from updated main. Regenerated legacy camera/UI evidence was restored to its historical archive; no user work was removed.

### Real output and tests
- Actual artifact: `evidence/production/feasibility.mp4`, 341,395 bytes. Silent H.264 Main/level 3.1, yuv420p, fast-start MP4, 720×1280, 30fps CFR, duration 7.200s, 216 decoded frames.
- One original workshop alcove and one proximity-gated light chest. Three compositions: elevated wide idle (0–2s), side readable walk (2–4.4s), opposite-angle close look/react/reveal (4.4–7.2s). Shot data is `production/feasibility.json`; timeline/compiler and renderer are separate small modules beside the unchanged character lab.
- Prop opening is a frame-136 scripted cue requiring actor/prop horizontal distance 1.38348 ≤ radius 1.5. The final placement resolves the prior walk endpoint; no walking transition or hand-contact physics is claimed.
- `npm test` passed all retained F1/F2A/F2B1/calibration tests plus new production timeline tests for contiguous frame intervals, exact cuts, pure seeking, actual action-end placement continuity, proximity gating, source immutability and invalid-input rejection.
- `npm run render:feasibility` passed. Captured all 216 numbered lossless PNGs at 720×1280; no missing/extra frame indices. Re-rendered every frame in reverse and compared PNG SHA-256 hashes: 216 identical. Canonical object/mesh/pivot identity retained; no page errors. No old animation or avatar module was changed.
- FFprobe verified codec/profile/pixel format, resolution, 30/1 frame rate, 7.200s duration and 216 frames. Decoded timestamps cover every i/30 without a gap; full FFmpeg decode has no errors. Cuts at frames 60/132 (2.0/4.4s) are encoded keyframes; independently decoded scene scores .307926/.569344 confirm distinct visual cuts.
- Actual H.264 HTML5 playback/seek passed in already-installed system Chromium 156.0.8078.79: 720×1280, duration 7.2, playback advanced, seek through 2.1/4.6/7.0s, no media error. Bundled rendering Chromium 141.0.7390.37 omits H.264 decoding and initially timed out (`DEMUXER_ERROR_NO_SUPPORTED_STREAMS`). Exporter now capability-checks and uses system Chromium for this verification; a full rerun passed. No decoder was installed and MP4 format was not downgraded. Native iPad/Safari unverified.
- `npm run sheet:feasibility` creates the committed compact nine-frame contact sheet from the actual decoded MP4, plus ignored all-source-frame review sheets. Visually inspected every source frame: three deliberate compositions, clear prop opening, no missing geometry or severe collision, stable grounding. Side/close camera clipping was corrected before final export. Close-shot arm/leg cropping is deliberate composition. Final recovery includes a planned hold, not dropped frames.

### Measured resources and evidence
Final run on two available cores (FFmpeg threads=2): capture 75.81s, full repeat 77.54s, encoding 2.02s, full decode .20s, total 157.84s. Peak sampled summed subtree RSS 942.55 MiB (1s ps samples; shared pages counted per process, HTTP server excluded). Temporary numbered PNG bytes 35,175,794; final MP4 341,395 bytes. Manifest stores exact arguments, versions, every frame hash/state and timings. Large raw sequence/local review sheets live in Git-ignored `evidence/production/raw/`; only MP4, contact sheet and manifest are retained.

### Scope and next proposal
PASS is for the production feasibility test, not the full pipeline. No wardrobe library, large environment framework, elaborate physics, audio, full episode or torso redesign was built. `PRODUCTION_FEASIBILITY.md` documents reproduction, tooling limits and the minimum later additions: generalize shot schema/CLI and continuity rules, small reusable asset/prop-event factories, resumable bounded render jobs/validation, and separately authorized motion/editorial handoffs. It also proposes an optional reference-guided tapered/hourglass torso factory with classic default, same six parts/pivots/appearance interface and separate silhouette/joint/action tests; it is not implemented. Submit this PR and stop for review.

## P1 — Reusable Shot Pipeline — PASS within scope

### PR #6 integration
Reviewed PR #6 against PRODUCTION_FEASIBILITY.md, reran `npm test`, `npm run render:feasibility` and `npm run sheet:feasibility`, confirmed actual 216-frame WebGL/reverse determinism, H.264 metadata/full decode/native playback and original visual evidence. No blocker. Commit-preserving merge `717dbfcc0ab8d0afdbc100db7d46a7734ce90d27` retains `cdf87d1` and all earlier commits, assets and evidence. New branch `codex/p1-reusable-shot-pipeline` starts from updated main.

### Implemented and verified
- Version 2 JSON supports 1–32 variable-duration shots, fixed cameras, all existing actions/options, explicit time offsets, grounded placements/endpoint references, independent face/complete appearance, palette and prop placement. Strict validation; stateless seeking. Original version 1 feasibility JSON/tests remain unchanged.
- Extracted just the existing workshop/chest factories. Explicit open-channel events support deterministic open/close, smooth endpoints, conflict rejection and optional sampled proximity gates. All existing avatar/actions/pivots/head/gaits are unchanged.
- CLI `npm run render:shots -- --shots FILE --out DIR` owns server/browser, hashes source/input/backend, checkpoints completed PNG/state/hash atomically, repairs missing/corrupt frames and resumes. Owned output directories, linked-path rejection, exclusive live/stale locks, bounded checked cache, immutable results and atomic verified `latest.json` pointer. No destructive cleanup or new dependencies.
- Two actual full-size exports through the identical engine hash: original 216-frame/7.2s/three-shot scene and distinct 120-frame/4s/two-shot scene. Both 720×1280, 30fps, H.264 Main 3.1/yuv420p/BT.709/square pixels/fast-start. Every frame pixel/state-identical when resampled in reverse; **all 216 original frames match approved feasibility hashes**. FFprobe checks exact frame count/duration/PTS/cut keyframes; full FFmpeg decode, native Chromium H.264 playback/seek and decoded contact sheets pass. No missing frames/page errors.
- Full-size pause/repair experiment: five checkpointed frames; deliberately damaged frame 0 and removed frame 1; final run reused three, captured 213, repaired two, then matched every approved hash. Real automated 12-frame WebGL/MP4 test covers SIGTERM, resume/repair, 12/12 reuse, identical encoded hash, input invalidation, failed budget and unchanged verified pointer.
- All existing API tests and new P1 unit/recovery tests pass. F1/F2A/F2B1/Baseline/Readable browser regressions rerun; full logs and comparison details in evidence/p1. Historical reports/captures remain archived. No tolerances were weakened.

### Evidence, resources and limits
Movies, decoded contact sheets, full per-frame/hash/resource manifests and executed logs: [P1 evidence report](evidence/p1/REPORT.md). Original 216-frame export: 157.227s including reverse re-render, peak sampled summed subtree RSS 968.53 MiB, 35,175,794 temporary PNG bytes, 341,412-byte MP4. New 120-frame export: 93.972s, 963.07 MiB, 21,806,644 temporary PNG bytes, 304,647-byte MP4. Two CPU cores, two FFmpeg threads, software WebGL; RSS counts shared pages per process and is sampled, not a hard memory bound. Full-size caches and all-frame local inspection sheets stay ignored. Inspected all 120 new frames plus original contact sheet/hash regression: stable avatar/face/cap, chest reveal, deliberate composition/cut and grounded modest walk. New closing event is off camera; state/factory tests verify it, not an on-screen interaction claim.

[P1_PIPELINE.md](P1_PIPELINE.md) gives reproducible commands, exact JSON semantics, storage/safety behavior and boundaries. Native H.264 verification uses existing system Chromium when bundled Chromium lacks its codec; native iPad/Safari and cross-GPU pixel identity remain unverified. Checked cache budget is not an OS quota; encoding can transiently exceed it but cannot publish afterward. Authoring still needs framing/collision review; no scene physics, multi-actor tracks, editor, story generator, audio, walking transition or torso redesign. Optional tapered torso remains a separate deferred proposal. Submit the P1 PR and stop for review; no next-phase implementation is authorized automatically.

## P2A — Reusable Character Casting — PASS within scope

### PR #7 integration
Reviewed PR #7 against P1_PIPELINE.md and its genuine film/recovery evidence. Reran all source, real recovery and F1/F2/P1 browser tests; both P1 films regenerated with **all 336 PNG hashes and both complete MP4 hashes identical** to committed evidence. No blocker. Merge `74708b9a02aaefafbc3d8f9cc3d98f291afbe976` preserves `e1690a0` and every prior commit/asset/evidence file. P2A branch `codex/p2a-reusable-character-casting` starts from updated main. Executed prerequisite logs/resources: `evidence/p2a/pr7-review/`.

### Implemented and verified
- Version 3 shot data supports two stable cast IDs, independent complete appearances/faces, placements and explicit-time actions in every shot. Delegates to P1 compiler/samplers and the existing F2 action engine; no duplicate animation system. Earlier shot versions remain supported. Proximity events explicitly identify an actor when two are present.
- Optional `createBaseAvatar({torsoVariant:'tapered'})`: approximately 1.5-unit waist in the same 2×2×1 torso envelope. Classic remains default. Six body meshes, five named pivots/rest positions, oval head, leg geometry and both gait implementations are preserved; variant geometry is chosen only at creation.
- One independent cached removable bob and fitted vest work through the existing appearance API. Vest geometry follows either torso; colors/materials/face/attachments are isolated per avatar. Cap and bob are mutually exclusive. Same body/geometry and cached attachment child identities persist during animation; removing/reapplying layers restores the same objects.
- Three fixed composition presets (two-shot, close-up, over-the-shoulder) resolve numeric cameras once from sampled shot-start placements. No camera tracking/editor or general engine.
- Original `production/reassurance.json`: 12-second, five-shot silent two-character acting test using existing idle/look/react actions in the reused workshop. Actual `evidence/p2a/movie.mp4`: **720×1280, 30fps, 360 frames, H.264 Main 3.1/yuv420p/BT.709/square pixels/fast-start**, 580,939 bytes. All 360 full-size frames reverse-repeat pixel/state-identically; full decode, exact count/duration/PTS, cut keyframes at 2.4/4.8/7.2/9.6s and native browser playback/seeking passed. Decoded contact sheet is committed.
- P2A genuine WebGL tests independently cover all 360 frames at 180×320, reverse exact pixels, independent actor/geometry/material/layer identities, fixed camera signatures and whole-scene separation. Minimum actor AABB gap .813919 units, zero ground penetration; full two-shot silhouettes within max absolute NDC .914503. Intended subject eye rays hit face layers in selected compositions. 360×640 mobile cast/undressed/restored evidence shows both silhouettes at ~265px height. Five full-size views plus 120 sampled frames (every third frame) were visually inspected: clear face exchange, no severe actor/attachment clipping or floating; foreground/torso cropping is deliberate composition.
- Both body variants pass actual-vertex 30/60fps contact checks for Baseline and Readable, 434 samples each across four cycles. Worst max/RMS drift <1e-15/<3e-16, max penetration <3e-16, max contact error <5e-16; swing clearance .045/.05. Original tolerances unchanged. API tests also cover all existing faces with the demonstrated cap/bob/vest recipes, layer removal/isolation, invalid recipes, actor ordering, endpoint placement and shuffled seeking.
- All F1/F2/P1 regression commands rerun on the completed implementation. Both P1 scenes still reproduce **byte-identical movies and all original frame hashes** using the same engine as P2A. Historical generated camera/UI archive differences are compared/restored, preserving approved evidence. No old tests/tolerances were weakened.

### Resources, commands and limitations
Full P2A export: capture 128.297s, complete reverse verification 131.170s, encode 3.234s, MP4 verification 1.826s, total **265.433s**. Peak sampled summed exporter/server/browser/encoder subtree RSS **967.18 MiB**, two CPU cores/two FFmpeg threads/software WebGL; shared pages count per process. Temporary PNG bytes 47,641,965; complete cache 47,998,834 bytes. No new dependency; large raw caches/review sheets ignored. [P2A_CASTING.md](P2A_CASTING.md) documents reproducible commands/schema; [evidence report](evidence/p2a/REPORT.md) links exact manifests, movies/contact sheets, API/browser metrics and executed logs.

PASS is for this casting slice. The acting film uses restrained existing head/shoulder gestures and hard cuts; no new gesture engine, walking transitions, audio, generator, physics, editor or character library. The reused small stage's edges can remain visible. New torso is a restrained reference-direction interpretation, without a precise additional hourglass asset/exact-match certification. Native iPad/Safari and cross-GPU pixel identity remain unverified; existing system Chromium performs native H.264 verification when bundled Chromium lacks decoding. No full cloth/body collision certification across arbitrary movement; authors must inspect new staging/paths and fixed-camera framing. Submit the P2A PR and stop for review; do not begin the next phase automatically.
