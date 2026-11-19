# Production feasibility — bounded test
The user has explicitly authorized this single MP4 test, overriding the former animation-R&D-only scope. F1_SPEC.md remains authoritative for the canonical avatar; F2_SPEC.md remains authoritative for the existing actions and contact constraints. Neither is weakened by this test.

## Deliverable
One silent original 7.2-second, three-shot vertical MP4: **The light chest**. A canonical avatar notices a chest, approaches, and reacts as its light is revealed. This is a small production feasibility scene, not a complete episode or polished story package.

- Shot 1, frames 0–59 (0–2s): elevated wide establishing composition; existing idle.
- Shot 2, frames 60–131 (2–4.4s): side full-body approach; existing Readable walk.
- Shot 3, frames 132–215 (4.4–7.2s): opposite-angle close composition; existing look/react, then its neutral recovery.
- One original workshop alcove (floor, two walls, wall marks and plinth), one chest prop. Its scripted opening cue at frame 136 is gated by actual actor proximity; distance must be ≤1.5 units or compilation rejects the shot list. It is not hand-contact IK or gameplay physics.
- Cuts at frames 60 and 132 are deliberate. The final placement references the endpoint of the approach. Foot pose/root height may change across that camera cut; no walking transition is invented or implemented.

## Small reusable separation
- `production/feasibility.json`: structured shot data, integer ranges, cameras, actions/options, placement reference and interaction cue.
- `production/timeline.js`: validate/compile contiguous shots, resolve a prior-shot endpoint, sample all state from explicit frame index. No RAF, random state or accumulated simulation.
- `production/render.js`: one scene/prop builder and one persistent canonical avatar; camera/action/prop state overwrite on every sample. Existing character lab and F1/F2 source stay unchanged.
- `scripts/render-feasibility.js`: Playwright WebGL frame capture, complete reverse rerender/hash check, FFmpeg encode, FFprobe/full-decode/cut/playback checks and resource report.
- `scripts/production-sheet.py`: small decoded-MP4 contact sheet; larger all-frame review sheets remain local.

The schema intentionally accepts this bounded three-shot, 720×1280/30fps test only. It is not a general scene engine. Duration/shot timing remain data-driven within 6–8 seconds.

## Reproduce
Already installed developer tools: Node/npm, Python/Pillow, Playwright Chromium, FFmpeg/FFprobe with libx264, and a codec-capable system Chromium for HTML5 playback verification. No runtime framework or paid service added. From repository root:
```sh
npm ci
npx playwright install chromium
npm test
npm run preview
# A separate terminal, with HTTP server running on port 8000:
npm run render:feasibility
npm run sheet:feasibility
```
Open `/production/player.html` on that HTTP server to play/download the MP4; `/production/` is an exact-frame render inspection page (initial frame only). Bundled Chromium 141 in this environment cannot decode H.264. The exporter detects that capability and verifies playback with the already-installed `/usr/bin/chromium` (156), leaving the H.264 output unchanged. Set `PLAYBACK_CHROMIUM` to another installed codec-capable browser path if needed. A missing decoder is reported precisely, not mistaken for a successful playback test.

Browser inspection API: `__production.renderFrame(integerFrame)`.

`evidence/production/feasibility.mp4`, `contact-sheet.png`, and `manifest.json` are retained. Raw numbered PNGs and local review sheets go in Git-ignored `evidence/production/raw/`. Reproduction overwrites only exporter-owned numbered temporary frames. Metadata records exact encode arguments, browser/FFmpeg versions, PNG hashes, cut frames, resource samples and timing. The manifest also contains failure evidence if any stage fails; an attempted export is not automatically PASS.

## Required verification
216 contiguous 720×1280 PNGs, each fully repeated in reverse order with identical hashes; stable canonical mesh/pivot identities; action/prop state deterministic across seeking. Encode H.264 Main level 3.1, yuv420p, 30fps CFR, BT.709 limited-range metadata and fast-start MP4, with keyframes at shot cuts. FFprobe must confirm dimensions, duration, codec/pixel format, 216 decoded frames and continuous 1/30-second timestamps. Fully decode without errors; measure independent decoded scene scores at cuts; test actual HTML5 playback and seeking where supported. Review contact sheet and every captured frame for framing, prop opening, grounding and missing geometry. Record measured wall time, peak sampled process-tree RSS (shared-page caveat), temporary bytes and final MP4 size. Native iPad/Safari is not certified by desktop Chromium.

## Minimum additions after this test — proposal only
1. **Shot contract and continuity:** generalize the small schema to accept a file/output path and a validated list of actor/action/camera/event tracks, with named placements and consistent cut behavior. Add a simple scrub/shot selector; keep integer-frame scheduling. Do not build a full editor.
2. **Reusable assets/events:** extract this one environment and chest into tiny named factories; add an explicit prop-event track with a few stateful-looking but stateless sampled responses. Introduce only the next assets needed by actual scripts. Keep physics optional and bounded.
3. **Reliable render jobs:** CLI shot-list/output/resolution flags, content hashes and resumable numbered-frame capture, bounded disk/memory use, encode presets and automated validation/contact sheets. Keep generation separate from rendering; FFmpeg remains the final encoder.
4. **Motion and editorial handoffs:** decide where cuts suffice and where a supported action transition is required. Implement walking transitions only as a separate contact-aware task; no invisible transition debt hidden in shot scheduling. Captions/audio can be separate future tracks after silent visual sequencing is approved.
5. **Optional tapered/hourglass torso:** add a future opt-in torso geometry factory with shoulder/waist/hip profile widths guided by an approved reference. Preserve the canonical classic block as default; do not alter its six-part contract or weaken tests. Keep the same head, named pivots, mesh count and appearance attachment interface. Add silhouette, joint clearance and action/appearance regression checks specifically for the new variant. A fitted torso is an anatomy option, not a baked-in wardrobe or gender preset. Reference-specific measurements/visual approval should precede implementation; this test makes no exact-match claim and implements no torso change.

Stop after the feasibility PR for review. This proposal is not authorization to build the complete production pipeline.

## Executed result
**PASS.** Final manifest records: 216/216 deterministic PNG hashes, 216 decoded H.264 frames, 720×1280, 30/1 fps, 7.200 seconds, Main profile/level 3.1, yuv420p. Full decode had no errors; HTML5 playback advanced and successfully sought through both cuts in system Chromium 156. Encoded scene scores at the two cut frames are .307926 (frame 60 / 2.0s) and .569344 (frame 132 / 4.4s); both are keyframes. Native iPad/Safari playback was not directly tested.

This is offline rendering: capture throughput was about 2.85 frames/s on software WebGL; 30fps is the encoded playback rate, not a real-time rendering claim.

Measured on two available CPU cores, FFmpeg limited to two threads: render 75.81s, complete reverse re-render 77.54s, encode 2.02s, full decode .20s; total 157.84s. Peak sampled exporter/browser/encoder subtree RSS: 942.55 MiB (shared pages counted per process; 1s sampling, HTTP server excluded). Numbered PNGs: 35,175,794 bytes (temporary); MP4: 341,395 bytes. Small contact sheet/MP4/manifest are committed; large raw frames/local all-frame review sheets are ignored.

All 216 source frames were inspected using eight local review sheets, plus the compact nine-frame contact sheet. Cameras were adjusted before export to keep the prop visible in the side/close compositions. The first encode/FFmpeg decode succeeded but bundled-browser playback failed with `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`; a capability check and already-installed system Chromium resolved this, followed by a full successful export rerun. This is recorded as a tooling limitation/fix rather than concealed.

Limitations: one fixed original scene/prop and single actor, simple lighting/shadows, restrained existing reaction, no hand interaction/IK, silent track, hard shot cuts, and a planned static hold after reaction recovery. The proximity-gated event is a scripted cinematic interaction, not gameplay physics. Determinism was verified within the tested software WebGL backend, not promised across different GPUs. The movie proves a small script-to-frames-to-MP4 path; it does not prove a complete automated storytelling pipeline.
