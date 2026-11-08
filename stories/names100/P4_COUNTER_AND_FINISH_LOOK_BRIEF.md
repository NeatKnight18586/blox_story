# names100 — P4: counter redesign + production-quality proof
Status: **PLANNING ONLY. NOT IMPLEMENTED OR FINAL-RENDER APPROVED.**
Project: NeatKnight18586/blox_story. Current S3B PR #15 remains draft at writing. User reviewed three narrated/captioned S3B proofs and liked the direction, but explicitly requests production-quality evaluation and a much less generic-looking name counter.

## Creative diagnosis (verified in source and rough frames)
- Current `production/assets/labels.js:createCounterOverlay()` draws a fixed **dark navy rectangle, gold outline, uppercase actor, large number, 'NAMES LEFT'** into a WebGL texture. It is displayed in the original footage and sometimes intrudes into close-up faces. This reads as a game HUD, not a deliberate cinematic graphic. Repainting the counter over existing video is NOT sufficient, since the old panel is baked into the 3D output.
- White captions are separately generated in S3C with FFmpeg and must remain unchanged. Avoid captions colliding with counter, the MARA tag, eyes, gestures, or Shorts UI.
- Current story is still a low-res draft; captioned 720×1280 previews are UPSCALED 180×320 3D, not proof of native high-quality image.

## LOCK ONE COUNTER TREATMENT — "Minimal Editorial"
- One bold neutral/warm-white numeral in an accessible sans serif (reuse the installed/license-safe caption font where possible). Optional small label `NAMES LEFT` only when introducing the rule, otherwise show number alone. **No border, no permanent dark card, no large HUD, no gold trim, glow, glitch, scrolling digits, emoji or bouncing particles.**
- Appear only for a meaningful story beat: rule/anonymous resident (S01–S03), Eli's unchanged 100 when introducing his shyness if useful, Eli 99 after name (S11–S12), relevant counts during helping (S16–S17), and 1→0 sacrifice (S22). For other shots hide the counter unless comprehension fails. No counter during lingering S23 ending after brief fade, leaving Eli isolated.
- Use 1–2 font sizes only; keep numeral dominant and clear at a real iPad/phone display, not a 180×320 rendering. Use a subtle 0.1–0.2s opacity transition only when helpful. No dramatized random-number roll. Counting changes exactly at native thresholds, with no early reveal.
- **Position by story framing**, not just a hardcoded top-left: align to deliberately empty space away from heads/eye lines and white captions; reserve bottom/right UI zones. Prefer upper-left or upper-mid only if clear. A tiny position-override table per shot is acceptable; no computer-vision detector or framework.
- At zero: numeral reads `0` at protected frame1529, remains briefly, fades unobtrusively while Eli stays ghostlike and the town ignores him.

## Engineering — preserve our investment
- Keep existing `createCounterOverlay()` as **legacy default** so archived source tests, original screenshots and movie hashes remain valid.
- Implement opt-in counter-free 3D capture, driven by a tiny metadata/shot flag, and **separate data-driven counter cues + lightweight FFmpeg/libass overlay for new exports**, akin to existing subtitle pipeline. If a simpler compositing route fits the current P1 scripts better, use it; don't add a full editorial framework.
- Existing captions must remain a distinct track. Document overlay order/positions and reuse approved system fonts. Do not install new large dependencies.
- Counter state remains entirely derived from existing absolute 30fps story clock. Never duplicate/invent counters: Eli100 until frame788, 99 at789, Mara restore890–926, countdown52 at1210/18 at1236/3 at1261/1 at1278, zero1529. The anonymous resident demo is NOT Eli. Preserve other 98/97 spends at existing timestamps.
- Editing text, typographic scale, opacity or safe placement should **not** require rerendering the CLEAN 3D frames after this change. The first conversion of old baked counter frames does require a **limited clean WebGL rerender**; do not promise otherwise.

## Two tightly scoped acceptance gates
**A — Counter A/B design board.** Review PR #15 and merge only after valid checks and explicit S3B approval; preserve all prior media. Start new branch. Create **4–6 matched genuine 720×1280 stills** representing anonymous rule, Eli99, countdown, Eli1/0 at frame1528/1529; show old vs new on same underlying framing with clear labeling. Render only selected CLEAN WebGL stills, then overlay proposed graphics using FFmpeg. Inspect character faces, vital text, caption safe regions (if captions active), optical alignment, readable numerals at phone scale. One focused correction maximum. No full film render.
**B — Native quality proof.** Create **three true native 720×1280 3D stills** of bedroom/ghost, sunrise reunion, forgotten Eli (may reuse gate A frames if shots overlap). Assess actual sharpness, skin/cloth/matte materials, shadows/contact, lighting/exposure, hair occlusion, silhouettes and coherent environment depth. Verify they are true native output, not enlarged 180×320. If native 720p WebGL is too costly, record the real blocker and adjust responsibly. Optional **1–2s** native720p/30fps motion test only if stills meet goals and budget permits; never a 54.7s final export here.

## Acceptance
Visual quality: should feel like a clean, deliberately edited Roblox-like mini-film, not a video game debug HUD. Each number reads instantly without obstructing actors. Distinct captions and counters. All text readable against scene background (use W3C contrast as a guide). Frame1528 remains 1, 1529 becomes 0. Story beats and 23 shot boundaries do not move. Historical movies/rig/actions/tests retained. Real WebGL pixels and verifiable output only; cost and blockers documented.

## Deliverables and stop
One compact A/B counter sheet, a 3-scene native-resolution look board, minimal re-usable counter style/cue file, short measured render-cost/test report, one PR. **STOP** for user's art approval. No unnecessary 3D remodelling, elaborate town, giant graphics toolkit, voice replacement, subtitle rework, new model training, paid assets, full final export or auto-publishing.

## Efficiency requirements
Use this brief + `LOOK_STYLE.md`, `CAPTION_STYLE.md`, current PR15 report and relevant overlay/renderer code; don't ingest the entire historical `STATUS.md`. Implement a small opt-in change; preserve old defaults; targeted native sampling and affected tests once. Respond with actual two evidence boards and a short verdict, not massive logs. Human art approval comes before final production.
