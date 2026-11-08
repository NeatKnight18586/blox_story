# S1 — PASS for four stills; pending creative review

[Four-panel style board](style-board.png) · [approved PR10/11 comparison](comparison.png) · [phone-size frames](phone-board.png) · [one-page style rules](../../LOOK_STYLE.md). Authority: [STYLE_LOCK_BRIEF.md](../../stories/names100/STYLE_LOCK_BRIEF.md). All pictured scenes are genuine 360×640 Three.js/WebGL captures. The new opening is explicitly NEW, with no invented before render.

## Gates and findings

- **A PASS:** PR11 source, six keyframes, excerpt/source seeking, V1 compatibility and real P1 recovery tests passed. Original keyframe/seek records reproduced; existing movie SHA/full decode/PTS/cuts/native playback/seek passed. Merged preserving `efa1d76` and brief `5bbd2fb` at `755a872084a560d8f8868906884733583fad5908`. Receipts: `pr11-*`.
- **B/C PASS:** inspected only relevant art/shot/renderer modules and current instructions. Built one opt-in `look: "s1"`, three data files and a minimal courtyard extension. Reviewed four stills, then one focused readability correction; no episode, opening sequence, new motion,720p video or high-resolution still rendered.
- **D PASS:** affected source/browser/recovery checks pass; no previous test/tolerance weakened. All eight prior tracked films remain byte-identical. Old baseline images reproduce exactly with S1 disabled. [Source/pixel integrity](integrity.json), [native metrics](stills.json), [regressions](regressions.log), [archive restoration](regression-comparison.json).

| Frame | Intent / observed improvement |
| --- | --- |
| **35 NEW** | Cobalt town and amber practical introduce100. Reuses courtyard/home with two staggered facade masses; full Eli silhouette grounds the rule in a place. No old opening render exists. |
| **700** | MARA remains dominant/readable in moonlit cyan. A warm lamp pool and notebook give the room personal context. Six shared-geometry, depth-only body helpers reduce internal ghost back-surface overlap without changing visible alpha or restoration timing. |
| **1370** | Lower family-height framing brings the child forward; porch/door, layered facades and cool shadows separate foreground/middle/background. Gold/green residents and coral Mara retain their identities. No embrace/walk system added. |
| **1600** | All four bodies now fit the native frame, fixing the old child's edge crop. Cold, opaque Eli remains isolated against a warm town; Mara's existing turn-away acting stays intact. |

Objective checklist **PASS**: intended eyes visible; meaningful heads and MARA tag inside98% NDC margins; all final-wide body vertices inside those margins; feet grounded; fixed key direction(-3,9,5); unchanged outfits/pivots/geometry; no decorative text or clutter. Night remains subdued; apricot dawn uses cool fill rather than washing every surface amber. The courtyard has only three new detail assemblies (porch, sidewalk boundary, distant lamp) plus two facade masses. Bedroom reuses curtain/lamp/notebook.

**One targeted correction:** initial opening cropped Eli, lamp sat outside the bedroom view, and final wide had inadequate Eli margin. Repositioned the new opening actor, brought the two sill props into view, widened safe framing and added the six depth-only helpers for clearer Mara features. [Initial→corrected comparison](targeted-correction.png). Two initial test alarms were instrumentation errors, not art failures: hidden bedroom geometry intercepted ray tests, and legacy worried eyes have no names. Checks now respect ancestor visibility and identify both legacy/new eyes; criteria were retained.

## Verification, cost and limits

```sh
npm test
npm run test:style
npm run test:v1 -- --motion
npm run test:ending -- --motion
npm run test:p1
npm run test:casting
```

All1159 original reveal/ending cue and actor samples compare identically; cuts/casts/recipes preserved. Browser checks verify actual eye/tag/body bounds, unchanged cached object identity, repeated pixel/state equality after seeking through restoration and forgetting, and three old gold images. S1 counter100 through788 /99 at789; ghost alpha.58 through889 /human at926; zero1529 remains unchanged. Depth helpers turn off at926 and reset correctly on seeking back. Chromium141/ANGLE/SwiftShader/WebGL2; original PR11 MP4 was independently decoded/played/seeked with systemChromium156 before merge.

[Final measured browser pass](resource-usage.json): **10.102s wall,18.32 sampled CPU-seconds,750.05MiB sampled summed subtree RSS**, seven observed processes/two cores. Four final PNGs total302,582bytes. This includes four still captures/repeats, boundary seeks and three original gold checks; costs exclude earlier development passes. CPU/RSS sampled every.2s are lower bounds; RSS counts shared pages per process. No new dependency. Raw first-pass files ignored; existing resume caches untouched. Previous full-film/F1/F2 preview sweeps were not repeated because those modules are unchanged; all source tests and the affected production/casting/recovery/old-excerpt browser checks ran once after the art changes.

**Recommendation:** retain S1 as the coherent style candidate for creative approval. Remaining limits: simple facades and preposed reunion; restrained facial vocabulary; ghost garment layers still stylized rather than volumetric; night intentionally dark. Only the four representative S1 frames are visually certified, not whole-sequence transitions or a full episode. Native Safari/cross-GPU identity and final external-WAV alignment remain unverified. Stop at this PR; no complete opening/ending/episode or audio work.
