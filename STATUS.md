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
