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

## names100 central reveal scene proof — PASS for this slice only

### PR #8 integration and authoritative input
Read stories/names100/VOICE_CUES.md, STORYBOARD.md and CODEX_TASK.md; preserved those three user documents unchanged. Reviewed PR #8 and reran all F1/F2/P1/P2A source/recovery/browser tests plus all three prior exports. **696 original frame hashes and all three MP4 files reproduced identically** before commit-preserving merge `9fb9654745db8bdf3e2b928d688caca59244ec50` (retains `3b7f037` and story-document commits on main). No blocker. New branch `codex/names100-window-reveal` starts from updated main. Prerequisite logs: `evidence/names100/pr8-review/`.

### Bounded implementation and timing
- Only the silent window/ghost/Mara reveal: global **[482,945) at 30fps**, corresponding to 16.07–31.50s. No full episode, original WAV access, voiceover, lip sync, later door opening or town/crowd engine.
- Existing two P2A avatars/looks (classic cap/blue for Eli; tapered bob/coral for Mara), same six body parts/head/pivots/material/geometry identities, existing idle/look-react and untouched walk engine/gaits. New optional version-3 `reveal` cues use the native global clock; ordinary shot lists retain their previous behavior.
- Minimal reusable bedroom/wall/window, closed hinged door, bed, moon/fog and one unrigged distant silhouette; cached held weathered MARA tag and captured WebGL counter/whisper overlays. Absolute ghost opacity/color/emission/warmth, restrained head/shoulder lean/reach and one camera push; no extra joints or animation framework. The tag follows the original shoulder/hand end and stays upright.
- First used and visually inspected a **360×640/15fps, 232-frame** draft. Its odd-frame counter sampling and 33ms terminal hold prompted a frame-rate-only upgrade: primary review copy remains low resolution at **360×640/30fps, 463 frames, 15.433333s**, no padding. All 232 shared samples are pixel-identical. Both small input files are retained; no 720×1280 story proof was rendered.
- Primary local frame f maps exactly to global **482+f**. Global **788 still displays 100**, **789 displays 99** (26.3000s), after the written name interval. Mara remains a ghost through that change, restoring during **890–926 / 29.6667–30.8667s**, inside the required window. Final seven native frames share reveal framing to avoid an unreadable brief draft cut. SCENE_PROOF.md records every shot/cue/global-to-local mapping.

### Executed verification and artifacts
- `npm test`, `npm run test:p1`, `npm run test:casting`, all four existing F1/F2 browser regression commands, and all three old-film reference exports passed on this branch. All **696 old frame hashes and all three old MP4 bytes still match**, with the same engine hash as the new proof. No avatar/appearance/action implementation or existing test/tolerance was changed. Regenerated historical camera/UI captures were compared/restored; metrics match decoded originals, pose stills match preflight.
- `npm run test:reveal`: 232 draft frames, complete reverse/random pixel and state equality; protected cue boundaries, same six-part/pivot/geometry/material/attachment/tag identities, grounded feet, readable face sightlines. `npm run test:reveal -- --native`: actual geometry/state checks on all **463 native frames**, with selected native PNG hashes matching the primary export (including 788/789). Full native reverse pixel/state comparison is performed by the P1 exporter rather than redundantly repeated by the metrics pass.
- Native maximum foot drift, penetration and contact-height error **0**; minimum actor AABB gap **.252812 units**. No severe actor/attachment clipping observed. Visually reviewed 155 native samples at 10fps, critical 360×640 stills, before/after strip and decoded contact sheet. Initial wall-obscured camera and dark Eli face were corrected before final export; final night→warm restoration, tag, numbers and expressions remain mobile-readable.
- Real H.264 Main 3.1/yuv420p/BT.709/square-pixel/fast-start MP4: **463 frames, 360×640, 30fps, 15.433333s, 413,268 bytes**, one video stream/no audio. All decoded PTS i/30, cut keyframes, full decode, native HTML5 playback and seeking pass; no page errors/missing frames. Artifacts: `evidence/names100/movie.mp4`, `contact-sheet.png`, `critical-beats.png`, selected global-frame PNGs, manifests and executed logs. Large raw sequences/review sheets stay ignored.

### Measured resources, limitations and recommendation
Primary export: capture **99.832s**, complete reverse **99.192s**, encoding **1.696s**, video verification **1.293s**, exporter total **203.121s** (measured wrapper wall **203.631s**). Sampled renderer-tree CPU **375.56s user + 20.81s system = 396.37 CPU-seconds** across two available cores; .25s cumulative per-process sampling is a lower bound. Peak 1s-sampled summed subtree RSS **784.12 MiB** (shared pages counted per process). PNGs **39,599,422 bytes**; completed cache **60,274,967 bytes** including the draft. No new dependency; FFmpeg limited to two threads; genuine software WebGL. Exact CPU/disk/version/codec records and caveats are in [evidence/names100/REPORT.md](evidence/names100/REPORT.md); commands and mapping in [SCENE_PROOF.md](stories/names100/SCENE_PROOF.md).

This is a silent written-cue visual proof, not final original-WAV sample alignment. Ghost layering can expose garment overlap; no volumetric ghosts, fingers or full-body bend. Lean keeps modest collar contact; the background figure is a static proxy. Fixed cast palettes are used during restoration. Native iPad/Safari and cross-GPU/font pixel identity are unverified. Focused recommendation for a later approved continuation: hold restored Mara into the realization pause before cutting away. Submit this scene-proof PR and stop for visual approval; do not build the rest of the episode automatically.


## names100 V1 visual polish — PASS within the bounded review brief

PR #9 passed source/timing checks, exact reference-pixel checks at seven approval frames, and its original 463-frame film's SHA/decode/PTS/cuts/native playback/seek checks before commit-preserving merge `6322b1c480083101d5bc9c0f3eb095430d43128b`. No blocking preflight failure. All previous work remains on main; V1 is on `codex/names100-v1-visual-polish` for a separate review PR.

- **Gate 1 PASS:** genuine paired 360×640 stills at global 592,700,762,788,789,908,926 plus944; visually reviewed at phone size. Four sparse cached expressions make Eli nervous→startled→thoughtful→relieved and Mara uncertain→relieved. Same avatars/looks/parts/pivots; both eye/brow sightlines unobstructed. Three narrative props only: drawn curtain, unlit lamp, personal notebook/pencil. One documented focused correction moved new window liners outward to clear Eli's arm.
- **Timing PASS:** source [482,945), counter100 through788 /99 at789, ghost through889, restoration890–926 remain exact. S08 is widened for room geography; S10 now shows Eli's hesitation instead of repeating the name tag. The only cut adjustment,938→927, gives Eli .6s of visible realization after fully human Mara at926. Other cuts remain unchanged.
- **Gate 2 PASS:** actual WebGL/FFmpeg H.264 Main/yuv420p silent **360×640,30fps,120frames,4.000s** excerpt, global[825,945). All120 forward/reverse pixels/state match, random source/clip seeks match, full decode/PTS/cuts/native HTML playback/seek pass. No missing frames or captions. No full463-frame V1 slice or episode rendered.
- **Gate 3 PASS:** all affected F1/F2/P1/P2A source, WebGL and P1 recovery/range checks pass. Original proof selected frames still match PR9 gold pixels; all six existing tracked MP4s are byte-identical. Historical browser-generated captures were compared before restoring their archived versions. Old tests and tolerances were not weakened.
- **Cost:** capture26.153s, reverse25.692s, encode.517s, verify1.115s; exporter total54.224s (wrapper54.697s). Two cores/two encoder threads; sampled CPU99.07s user+5.55s system; peak summed subtree RSS904.86MiB (shared pages counted per process). PNGs9,718,825 bytes, MP4 127,719 bytes; temporary/cache frames ignored, original resume caches preserved. No dependencies added.

[Paired phone review](evidence/names100-v1/paired-phone.png), [4-second preview](evidence/names100-v1/movie.mp4), [decoded sheet](evidence/names100-v1/contact-sheet.png), [full compact evidence/checklist](evidence/names100-v1/REPORT.md). Limits: ghost transparency exposes overlapping garment surfaces; relief is a cached expression change, not facial interpolation; Eli's final reaction lasts .6s because the authorized slice ends at945. No native Safari/cross-GPU certification or external-WAV sample alignment. Stop for user visual review; no automatic continuation.


## names100 ending lookdev — PASS for bounded gates, pending user visual review

PR #10 passed source/timing, authentic still/excerpt seek, P1 recovery and original movie SHA/decode/PTS/cuts/native playback/seek checks before commit-preserving merge `c3c6da6aa02dd8d089a9ac2c5f093bc19cfaa02a` (retains405c82c and ending brief5b6f869). Branch `codex/names100-ending-lookdev` follows ENDING_LOOKDEV_BRIEF.md.

Six real360×640 keyframes at global1040,1090,1210,1370,1529,1600 were inspected first; one focused composition/spacing correction clarified the open door and child. Reviewed continuity comparison favors thoughtful Eli in a separate reflection variant; original V1 files/evidence remain intact. Existing avatars/pivots/styles/actions and both gaits preserved. One small courtyard and two preposed parent/child residents only. Eli stays fully opaque/grounded after zero; restrained color loss and Mara's turn communicate forgetting.

Only after Gate B passed, exported global[1480,1610): **130frames,30fps,360×640,4.333333s,H.264 Main/yuv420p,silent**. All130 forward/reverse pixels/states match; shuffled source/clip seeks, exact1528=1/1529=0 boundary, identities, face sightlines, full decode/PTS/cut keyframes/native HTML playback/seek pass. All696 pure ending samples maintain the absolute clock and monotone99→52→18→3→1→0; speech starts rounded up to1210,1236,1261,1278,zero1529. Original789 spend and890–926 restoration unchanged. No whole696-frame ending or1641-frame episode rendered.

All affected F1/F2/P1/P2A source/browser, V1 gold-frame/excerpt and P1 recovery/range regressions passed; prior movies unchanged and generated archives compared/restored. No old tolerance/test weakened. Final excerpt capture22.799s, reverse24.203s, encode.465s, verification1.046s, total49.155s(wrapper49.659s); sampled CPU86.98s user+7.53s system, peak summed subtreeRSS685.09MiB; PNG7,394,637bytes/movie91,046bytes. Two cores/two FFmpeg threads, no dependencies added, raw/cache ignored. Final still verification6.053s; costs exclude uninstrumented development and are sampled with caveats.

[Phone board](evidence/names100-ending/keyframe-board.png), [MP4](evidence/names100-ending/movie.mp4), [report/commands/resources](evidence/names100-ending/REPORT.md). Limits: preposed hand/shoulder reunion rather than animated embrace; minor child's outer-forearm crop in final wide; symbolic door gesture; only selected frames/excerpt visually verified. External WAV sample alignment and native Safari/cross-GPU identity unverified. No full ending/episode, opening build, voice/captions or720p export. Submit PR and stop for review.


## S1 three-set style candidate — PASS for four stills, pending creative review

PR #11 source/visual/seek/recovery checks and existing movie SHA/decode/PTS/cuts/native playback passed before history-preserving merge `755a872084a560d8f8868906884733583fad5908`(retains efa1d76 and style brief5bbd2fb). New branch `codex/names100-s1-style-lock` follows STYLE_LOCK_BRIEF.md.

Produced only four360×640 S1 review stills:35 NEW opening town,700 bedroom/MARA,1370 reunion,1600 forgotten Eli. One focused readability correction fixed initial opening/final-wide margins, brought the lamp/notebook into view and reduced ghost back-surface overlap with six shared-geometry depth helpers. Existing canonical bodies/pivots/appearances/actions remain unchanged. Minimal courtyard facades/porch/sidewalk/lamp; no city framework. LOOK_STYLE.md contains concise art rules; original footage/shot data remain intact behind an opt-in look.

PASS: all1159 original actor/cue samples/cuts,789 spend,890–926 restoration,1529 zero; actual WebGL eye/tag/head/final-body bounds,grounded feet,cached identity,repeat pixels after boundary seeking,three old gold images; all source and affected V1/ending/P1 recovery/P2A browser tests. Eight original film files byte-identical; old reports compared/restored. No tests/tolerances weakened. Final focused browser pass10.102s,18.32 sampled CPU-seconds,750.05MiB summed sampled subtree RSS; four PNGs302,582bytes,no dependencies added. Sampling shared-page/lower-bound caveats and exact commands in evidence report.

[Four-panel comparison](evidence/names100-s1/comparison.png), [phone review](evidence/names100-s1/phone-board.png), [style rules](LOOK_STYLE.md), [evidence/resources](evidence/names100-s1/REPORT.md). Limits: sparse stylized architecture/preposed reunion; only four S1 stills visually certified, not whole-sequence motion/continuity; native Safari/cross-GPU and external-WAV sample alignment unverified. No new story motion,full opening/ending/episode,720p video/high-res still or audio rendered. Submit PR and stop for creative review.


## S2 first complete visual rough cut — PASS for coverage/verification; creative review pending

PR #12 passed source/WebGL/reference checks and merged preserving history at584bad2026f648d5f2759abde06290eba03370ae(retains17db24f and fee7074). Branch codex/names100-s2-roughcut implements all23 exact storyboard slots using four isolated native scene blocks. Anonymous rule and shy-Eli opening are new; approved rigs/faces/actions/style/sets reused. Eli keeps100 through788;789 spend,Mara890–926,zero1529 preserved. New98/97 spends1120/1168 match early restorations; countdown1210/1236/1261/1278. Older source/evidence files remain intact.

All23 genuine180×320 keyframes,16 protected native frames/cut endpoints reviewed before full rough export. Focused framing corrections, then a countdown-facing repair after motion review. Cold-cache verification exposed a real transparent/OPAQUE shader mismatch; setting material.needsUpdate on transparency transitions fixes cold/random seeking. Shader/eye checks and old visual references pass. No test/tolerance weakened.

Final silent MP4:180×320,15fps,821frames,54.733333s,H.264 Main/yuv420p. Native1641/30 clock remains54.7s; documented33.3ms tail hold,odd-cue visual delay≤1/30s. All821 current-source pixels/states verified in reverse; decode/PTS/22 cut keyframes/native playback/seek pass. Final run reused686 checksum-validated frames and regenerated135; eight previous films unchanged. Source/affected S1/V1/ending/P1/P2A regressions pass. Reviewed whole-draft274 decoded samples plus50 corrected-region samples.

Final export/cache73.961s,reverse131.000s,encode.935s,video verification1.265s,total208.536s(wrapper209.146s),350.25 sampled CPU-seconds,1219.93MiB sampled summed subtree RSS. Measured render attempts including first draft/rejected resume total574.624s; final keyframe check27.554s. PNG23,785,501bytes/movie464,105bytes. Shared-page/sampling caveats and attempt ledger in report; no dependency added, raw/cache ignored.

[MP4](evidence/names100-s2/movie.mp4), [23-shot board](evidence/names100-s2/storyboard.png), [coverage/costs/limits](evidence/names100-s2/REPORT.md). Outstanding: restrained symbolic acting, small sets, low-res fine detail, pacing/WAV sample alignment and final-resolution creative approval. No final720×1280/30fps render,audio or next phase. Submit PR and stop for review.


## S3A — visual review completed; overall PARTIAL

PR #13 merged at `bf0f895f0c6e922460d2d49a298239de4efa8efe` after `npm test`, `node tests/roughcut-framing.js`, genuine WebGL `npm run test:ending -- --motion`, and existing S2 MP4 decode/PTS/22 cut keyframes/native playback/all-cut seek verification passed. Source/engine fingerprints,39 native PNGs and eight earlier movie hashes match;821-frame mapping confirmed. Recorded whole-film reverse pixel/state evidence checked, not rerendered. All history retained.

S3A is review-only: [23-shot ledger](stories/names100/S3A_ISSUE_LEDGER.md), at most three proposed S3B staging changes (reunion, shyness, last-use/failed recognition), no runtime or story input changes. Inspected existing-film continuous2fps decode sheets and saved native evidence. Original ElevenLabs WAV absent from workspace/repository: **audio creative review BLOCKED**, no mux/listening/alignment claim; written cues provisional. Technical timing PASS, visual creative PARTIAL pending corrections/user approval, overall PARTIAL. No episode rebuild/render or fixes implemented.

Successful preflight19.255s wall/28.06s sampled CPU/908.05MiB sampled summed RSS; temporary decode0.216s/.328sCPU/49.90MiB max child RSS. [Receipts and limitations](evidence/names100-s3a/REPORT.md). Stop for review before S3B/final export.


## S3B provisional performance — PARTIAL; AUDIO REVIEW BLOCKED

PR #14 passed review-only diff/regressions and actual S2 hash/evidence validation, merged preserving history at `80f592cb4df06693e28b8c41c00195eb66fc9989`. New `codex/names100-s3b-performance` adds only opt-in S3B shy/reunion/forgotten scene variants and small directing helper. Original roughcut/S2 JSON, rigs, appearances, both gaits, old tests,593 previous evidence files and nine films unchanged.

No accessible original WAV or attachment reference in this task: no narration mux/listening, final timing approval or motion gate. Used brief's explicit provisional-keyframe fallback.12 actual360×640 stills and three paired mobile boards; one focused framing/contact repair included camera/occlusion/HUD fixes. Technical source/still checks PASS; creative PARTIAL (S23's failed recognition is not conclusively established by the wide still), overall PARTIAL. No new MP4/full episode/final-resolution render.

`npm test`, `node tests/roughcut-framing.js`, `npm run test:ending -- --motion`, source performance test and genuine performance-browser still test pass. Original cue samples/cuts retained, random seeking/part/pivot identity preserved, pre-zero eyes and hand visible, three baseline S2 golden PNGs unchanged. Scaled child support error ≤3.34e-16 over75 native approach frames; within-shot max scalar transform delta.084993. New motion clipping/acting not certified. Five measured still attempts90.438s wall/164.62s sampled CPU/664.61MiB sampled summed RSS; two affected regression passes35.116s wall. [Full results and limitations](evidence/names100-s3b/REPORT.md). Stop for original-audio and creative review before bounded previews/final production.


## S3B original WAV follow-up — technical PASS; creative/audio PARTIAL

WAV is now accessible and verified: stereoPCM16/44,100Hz/2,411,520 samples/54.682993197s, SHA256 `3d5e0a116971d3d17a7c3adac79423e443d63040b2120be7562a0660f22b4ae4`. Earlier missing-file blocker resolved. Input unchanged/outside Git. Existing S2 t=0 temporary narration mux keeps identical compressed video packets; full821-frame decode/PTS/22 cuts/native unmuted audio playback pass. No genuine perceptual listening available; no final emotional/audio approval claim. Original-voice sliced reviews use exact PCM offsets and remain private transient files.

Three final180×320/15fps silent proofs A81/B97/C76 frames (254 total), all reverse pixels/states,18 additional real WebGL random seeks and native H.264 playback/PTS/cuts/full decode pass. Reviewed all254 decoded output frames. One ending-only repair replaced the foot swivel with head-only withdrawal; strict fixed-leg matrices over all151 final native frames and child support ≤3.34e-16 pass. Original593 evidence files/nine films, original story clocks/inputs and F1/F2 foundation preserved. No full/final-resolution episode render.

Completion costs: two still passes35.864s wall; three proof pass78.825s plus ending-only repair22.294s; affected regressions17.495s. Peak sampled summed renderRSS1196.27MiB. Earlier provisional costs retained separately. [Report and receipts](evidence/names100-s3b/REPORT.md). PR15 remains for review; overall PARTIAL solely reflects uncompleted listening/user creative acceptance and subtle final recognition, not missing technical artifacts. Stop before final production.


## S3C white-caption pilot — PARTIAL (private delivery blocked)

Read/merged only the user's new caption/listening-gate documents from main into the review branch; PR15 remains DRAFT,not merged. Original S3B footage/WAV reused: three720×1280/15fps typography proofs,81/97/76 frames,zero new3D renders. Canonical text JSON→separate style/ASS/SRT; white DejaVu Sans Bold52px,charcoal4px outline,1.5px shadow. Stable per-shot anchors; S18 uses empty upper area to preserve approaching child, S19 shifts beside contact, S23 below lowering hand.

Six caption semantic tests and all254 actual libass frame masks/safe regions/blank pauses pass. Original frame/HUD mapping SSIM>.98, native H.264/yuv420p/AAC playback/PTS/cuts/decode/unmuted audio pass. Audio packet hashes unchanged; all12 prior movies,renderer/rig/action code,source clocks and WAV byte hash preserved. Internal phrase splits explicitly provisional; no perceptual listening claim. Encoding attempts13.375s wall,14.39s sampled CPU,302.93MiB peak summed RSS;0 new3D rendering cost.

**Not delivered:** genuine private MP4 download links. Private GitHub release asset upload returns401 at uploads.github.com despite working repository auth; API-host alternate404. Empty test drafts removed; no voiced files published/committed. Contact sheet verified through private GitHub access. [Report,receipt,approval checklist and supported shared-browser manual export](evidence/names100-s3c/REPORT.md). Do not present internal paths as links or proceed to full episode/PR15 merge. Stop for accessible-media and user listening/style approval.


## P4 counter/native quality proof — PARTIAL overall

PR15 source/caption/actual WebGL/video checks passed atadd5d4f; current user/P4 brief records approved preview direction. Merged preserving history at `277ef9460b60f5065fc088493be6a6a7952a0f0e`. New branch `codex/names100-p4-counter-look` implements only opt-in counter-free capture plus a separate existing-clock/FFmpeg Minimal Editorial counter. Original legacy factory/default,approved caption files,rigs/actions,all prior evidence and12 films/WAV remain unchanged.

Five matched native comparisons145/850/1248/1528/1529; three true-native720×1280 clean scene stills700/1392/1628. Real framebuffer dimensions/pixelRatio1 and repeat pixels/states checked. One graphics-only refinement for optical position/2px glyph edge; no3D redo. Exact0 at1529,1 through1528;0.2s terminal fade,no counter inS23. All1641 source/ASS samples,unknown-mode rejection,8 legacy default/explicit golden matches,existing18 S3B WebGL seeks and all affected source/caption tests PASS.

Counter/native implementation PASS; production finish PARTIAL: warm-wall white fill1.91:1 relies on glyph edge,hard/stepped shadow edges and ghost internal layers remain. [Two boards,native originals,tests,costs and tradeoffs](evidence/names100-p4/REPORT.md). One native batch11.505s wall/21.12s sampled CPU/710.12MiB summed peakRSS; final graphics1.507s; affected regressions18.472s. No full episode,audio regeneration,asset redesign or optional motion export. Stop at one PR for user's creative approval.


## P5 three-issue finish gate — PASS for bounded stills; creative approval pending

PR16 reviewed atcc62312 and merged preserving history at `d10f1217d5fec44819c39ac7a5da29e413c9cdd9` after source/counter/caption/actual WebGL tests and evidence review. New branch `codex/names100-p5-finish-gate` adds only opt-in S1 finish shadows/ghost depth coverage and separate S22 charcoal numeral. Legacy/default looks, every prior protected file,686 evidence files,12 films,WAV,caption/character/action/story inputs unchanged.

Five actual native720×1280 selected stills700/1392/1528/1529/1628,paired board and phone3-up. A PASS: radius4 PCF/tighter2048 courtyard coverage,local ground transition3→5pixels,max adjacent step15.33→11.00. One targeted shadow correction from initialradius6; no other design revisions. B PASS: appearance-aware shared front-depth helpers remove ghost hair/vest internal layering; source opacity/face/tag/identities preserved. C PASS: S22 charcoal fill minimum7.33:1 against actual wall,night warm white and all native timing/layout unchanged.

`npm test`, `npm run test:counter`, `npm run test:finish`, `python3 tests/captions.py`, `node tests/performance-motion.js` PASS. All1641 source samples,original ASS bytes/8 legacy WebGL golden matches/18 original motion seeks/new13 boundary samples plus cold/reverse pixels and exact body matrices pass. Tests use source forgotten ramp (zero at1529,positive1530),not an altered schedule. Native pixels repeat after restored/final seeking. [Report,evidence,receipts](evidence/names100-p5/REPORT.md).

Initial native batch10.377s,one shadow revision9.698s/732.94MiB sampled summed RSS; combined20.074s. Affected regression batch31.324s/1165.87MiB. Unprofiled compositing/preflight/diagnostics explicitly excluded. Small PCF grain and stylized single-surface transmission remain; no physically accurate lighting claim. No motion/full episode/audio operation. Stop for review. If accepted,end look-development; complete low-res combined QC and final clean720p export require separate authorization.


## S4 revised full-assembly QC — technical PASS; overall PARTIAL

PR17 preflight found a counter-test mask including changed cap-shadow pixels; fixed test/receipt at e6d7046,reran all required checks and verified genuine visual/film hashes,then merged preserving history at5f6975a. New branch codex/names100-s4-assembly-qc implements revised S4 only.

Native720x1280 paired30/1392/1628/700 environment gate PASS after one focused correction. Three town assemblies/two home cues14primitive meshes; only opening camera changes. Bedroom raw pixels identical. Design frozen. Composite manifest uses original23-cut authority,S3B shy/ending offsets,P5 clean finish/counter; all1641 actor/appearance/action/count clocks preserved,938–945 seam explicit.20 actual protected/seam probes and47 caption midpoint zones pass.

Single forward capture821 frames; reverse exposed stale resident child shoulder at1202. S4-only authored-transform reset repaired it. Preserved original cache and verified all821 pixels/states freshly in reverse against corrected source before encode; no second forward capture. Native1392/1628 also match retained images exactly. Full clean source and silent+counter+caption review encoded/verified,23-shot board decoded from new film.821continuousPTS/22cut keyframes/H.264/yuv420p/native playback PASS. Separate full captionJSON/ASS/SRT:38exact transcript phrases/47events,all821 actual mask checks clear.1ms text-filter timestamp guard prevents exact-time rounding delays,encodedPTS restored unchanged.

Original WAV SHA unchanged,t=0,54.682993s. Private narrated copyAAC/stream-copied video packets verified; full54.7456s unmuted playback/no error,442audible windows,coarsePCM correlation0.999545/zero lag. Review video54.733333s leaves50.340ms trailing video. Human listening/creative review and secure narrated delivery remain incomplete; no task-artifact publisher exposed and prior failed upload not retried. Only silent film committed,not WAV/voiced file. User may share branchZIP in ChatGPT for private audio-mux fallback.

Actual costs: two native batches13.379/13.295s; capture+failed partial verification258.297s; cache recovery/all821 verification+encode208.816s; affected regression67.842s; assembly/contact/audio/full playback77.452s. Max sampled summed RSS1222.76MiB. Concurrent walls not task total; unprofiled diagnostics explicitly excluded; model-token usage unavailable.848 prior files/704 evidence files/12 old films unchanged. [Report,film,boards,tests,costs,limitations](evidence/names100-s4/REPORT.md). No native-resolution full movie,new narration,sound effects or next phase. Stop for creative review; later licensed sound/release QA is plan-only.


## S5 speech/visible finish — PASS for bounded proof; creative/listening approval pending

PR18 passed affected source/counter/finish/caption/S4 mask checks,genuine full-film hash/decode/821PTS/22cuts/native playback and cold/reverse resident/ghost verification; merged preserving history at097c9e7. Positive full narrated S4 review recorded by user. New S5 branch only.

Optional compile/sample/apply/clear speaking layer uses three persistent mouth meshes/material,curved head front and existing face caches. Whisper keys776–788; three irregular naming bursts1204–1209/1228–1235/1253–1259. No narrated numbers/shyness/final mouth opening. S5-only sealed startled stroke retains eyes/brows and original O cache; default/off mode unchanged. One targeted timing correction removed camera-hidden S16 speech;1232 existing close-up demonstrates it,1248 “Eighteen” stays closed. No camera/environment changes or new dependencies.

Seven true native720x1280 pairs30/780/1115/1232/1248/1392/1600; one comparison sheet with1:1 mouth crops. Changes only in mouth pixels at780/1232;5 controls identical toS4. Exactly two native720x1280/30fps clips:38frames/1.266667s and57frames/1.9s. All95 raw reverse pixels/states match; decode/PTS/cuts/native playback pass. All95 actual decoded frames inspected at phone scale. All1641 source story/body/action/counter/camera samples unchanged;44 new real-WebGL boundary samples/cold/reverse/material/geometry/ghost-depth/face-cache tests pass. All affected F1/F2/bothgaits/P1/P2A/story/overlay tests remain passing.

Original WAV unchanged; private audio clips sample-trimmed at exact global offset,no stretch/regeneration. Both fully played unmuted;AAC/sourcePCM correlations0.999630/0.998952 at zero coarse lag. Human listening/creative approval still needed; silent preview files committed,voiced files/WAV ignored,no downloadable voiced link claimed.899 prior files/734 evidence files/13 films/private full S4 review unchanged.

Measured native proof16.988s,two native motion captures+all-frame checks/encode133.366s (1652.46MiB peak sampled summed RSS),affected regression54.305s. Unprofiled diagnostics/overlaps and unavailable model-token counts explicit in report. [Evidence,previews,tests,costs,limits](evidence/names100-s5/REPORT.md). No whole episode/sound pass/final production or next stage. Stop for user review.


# S6 — native final candidate awaiting iPad review

Native720×1280/30fps master **PASS**:1641 frames/54.700s,clean3D separate from captions/counters/narration. [Silent final candidate](evidence/names100-s6/silent-master.mp4) · [Clean master](evidence/names100-s6/clean-master.mp4) · [Native contact sheet](evidence/names100-s6/23-shot-contact.png) · [Report,tests,costs,limits](evidence/names100-s6/REPORT.md).

PR19 merged after verification. Approved S4+S5 unchanged; no upscale/art changes. Checkpointed capture resumed from1155 verified frames after usage interruption; only486 remaining captured,20 protected reverse checks pass. All15 prior movies/code/tests preserved. Original narration muxed at t=0 and technically verified privately; narrated delivery PARTIAL,real iPad approval PENDING. No publishing. Model-token/total interrupted-run costs unavailable; measured scopes explicitly reported.

New native exporter uses g=i with1GiB cache; complete nativePTS/22cuts/decode/playback verified. Original WAV54.682993s leaves17.0068ms pad; zero coarse audio lag. All1641 overlay masks pass. Middle interrupted timing unavailable; final resume390.776s and assembly87.551s are partial scopes,not task totals. Stop for full iPad review.

## 2026-11-09 — Dice Town P0–P1

Isolated branch `codex/dice-town-p1` from inspected S6 c4dbd75; no S6/S7/V2 merge. Added only an opt-in plaza/Leo path, isolated V2 hair factory, three proposal documents and verification evidence. Existing avatar/animation/appearance/pilot source and films are byte-preserved (preservation.json). Native720×1280 A/B WebGL captures, reverse-order and cold-reload pixel equality, focused source checks and full npm regression suite PASS. Creative verdict PARTIAL: improved identity/depth but repeated shop vocabulary, partly obscured plaque and ambiguous annoyed mouth remain. See evidence/dice-town-p1/REPORT.md for actual images, browser results and capture cost. No creative approval claimed, video/audio created, pilot outputs overwritten, merge or P2 progression.

## 2026-11-09 — Dice Town P1B bounded quality experiment

Isolated codex/dice-town-p1b from aac0a5f; no merges. Two native revised WebGL stills, P1 phone comparison and a real Kenney character-a comparison delivered. Nine-unit die, higher suspended staging, clock/bakery/archive detail, opt-in tapered/side-part Leo and corrected annoyed mouth. Technical PASS: full source regressions, focused asset/identity tests and native reverse/cold-reload hashes. Creative PARTIAL: simple architecture, chunky hair and background clutter remain; human approval required. Kenney CC0 candidate rejected for Leo; no drop-in action/face compatibility claimed. Previous source/films/P1 evidence byte-preserved; existing safe server adds GLB MIME only. Costs and limits: evidence/dice-town-p1b/REPORT.md. No motion proof, video, audio, merge or P2.

## 2026-11-09 — Dice Town P1C still-frame polish

Isolated codex/dice-town-p1c from055d585. Two native720×1280 WebGL stills plus P1/P1B/P1C390px comparison. Die reduced9→6.3, plaque restaged, gradient sky/sun/two cloud clumps/distant roofs, small bench/planters and bakery correction, triangular collar/strap clearance/portrait separation. Existing engine/APIs, pilot films and P1/P1B source/evidence byte-preserved. Source regressions and native reverse/cold-reload pixel checks PASS. Creative PARTIAL: more coherent world, but plain facades, chunky hair, repeated extras, large foreground and minor crowd/frame-edge tangencies remain. See evidence/dice-town-p1c/REPORT.md for measured cost and limits. No animation, video, audio, merge or P2. Stop for visual review.

## 2026-11-09 — Dice Town P2A first motion proof

Isolated codex/dice-town-p2a from3711b7c. One native4.000s silent H.264720×1280/30fps film,120 decoded frames, all-frame contact sheet, deterministic die settle/three distinct lifts/Leo face reaction and world-oriented sky. Existing exporter reused via bounded opt-in entry; recovery/source regressions PASS. Vertex contact, persistent identity and all120 reverse pixel/state samples PASS. Overall technical PARTIAL: raised arm clips wide-shot right edge; conservative border warnings disclosed. Creative review PENDING. Evidence/report at evidence/dice-town-p2a/. No merge, full episode or next phase.
