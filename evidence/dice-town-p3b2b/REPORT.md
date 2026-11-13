# P3B-2B — recognition readability correction

**Technical PASS. Creative PARTIAL, awaiting human review.** One directed pass from `60a544a`; PR35 motion and all previous evidence retained. No other scene implemented or merge performed.

## Evidence and visual assessment

[PR35 → correction, 390px panels](comparison.jpg) · [phone review](phone-review.jpg) · [single silent motion proof](recognition.mp4) · [all 105 frames](all-105-frames.jpg).
Native actual WebGL: [anticipation 0](anticipation.png), [recognition 40](recognition.png), [response 95](response.png), [D36 chair](chair.png).

The four native stills and comparison were produced and inspected first. Only then was one 360×640 motion export made. The native response and full 105-frame sheet were inspected as well. No native motion export, audio or repeated polishing loop.

- Existing low-bun crown lowered slightly, swept pieces made asymmetric, restrained gray highlights and bun offset. This breaks the prior circular-cap silhouette without changing the shared asset.
- One cream V-shaped shawl edge attached to the existing torso. Muted purple outfit and skin unchanged. Reserve these appearance details for future D19 continuity; no D19 implementation.
- OTS camera shifts slightly and narrows 46→42 degrees. Actual projected head width at 390px grows from 101.31→112.74px (frame0), 103.73→115.25px (40), 103.32→114.79px (95). Gains 11.10–11.28%; not a claim of proportion redesign. Pip remains in foreground; reaching hand and jamb/floor context remain visible.
- One uneven faded cream paint bar on the chair back, repeatable in a future photo. Chair stays at (-1.6,0,-5), rotation zero. Wall paint patch/table untouched.
- Explicit-time motion, cached face blend, expressions, timing and blocked reach are unchanged. No broad grin or asymmetric smirk added.

## Verification

`npm test` and `node tests/dice-town-p3b2.js` PASS; full output in [regressions.log](regressions.log). Source parsing passes.

`node scripts/dice-town-p3b2b-qc.js` PASS: all105 frames, stable six-part/face geometry identities, recognition before reach, actual head/distal-arm vertices inside frame. Max absolute projected face/hand coordinate0.477/0.849 (<0.98 gate). Conservative bounding-box minimum gaps: arm/jamb0.11378, arm/Pip2.07686, arm/head0.33506 world units. Maximum gaze-to-Pip angle after frame30 is5.144degrees. These checks cover named critical interfaces, not a universal mesh collision solver. [Geometry receipt](geometry-qc.json).

`node scripts/dice-town-p3b2b-composition.js` PASS: actual projected head vertices under old/new cameras at identical poses, unchanged chair transform, chair/table X-gap0.5000, sampled shawl/head bounds gap0.01313. [Metrics](composition.json).

Native reverse screenshot/state equality includes chair→95→40→0; motion reverse equality104→40→0 on same browser/backend. No browser page errors. [Native receipt](stills-verification.json), [motion receipt](motion-verification.json). FFprobe/full FFmpeg decode: H.264/yuv420p,360×640,30fps,105 frames, continuous PTS,3.500s, silent. Actual Chromium playback advances and seeks without error (system Chromium codec fallback). Native PNGs720×1280, no upscale.

[Preservation receipt](preservation.json): all tracked prior evidence/films, tests, avatar/appearance source, shared hair and PR35 motion compared byte-for-byte with brief base. Scene.js is the only existing rendering source edited. No engine or dependency change.

## Cost and reproduction

Native capture + reverse checks4.581s; single motion capture + encode/decode/playback34.348s. Combined38.929s is scoped job wall time, excludes review, tests, source work and Git operations. CPU/RSS, GPU time and token costs were not sampled; no estimates presented as measurements. SwiftShader WebGL, local Three.js/Playwright/FFmpeg reused. Raw105 motion PNGs remain ignored under `renders/dice-town-p3b2b/`.

Commands: `node scripts/dice-town-p3b2b-proof.js --stills`; review; `node scripts/dice-town-p3b2b-proof.js`; QC/composition scripts above; `python scripts/dice-town-p3b2b-comparison.py`; `python scripts/dice-town-p3b2b-sheet.py`. Browser preview remains `/production/dice-town-p3b2/` on this branch.

## Remaining creative limitations

Mother identity is improved by gray sweep and clothing, but older-family recognition is still subtle and not established as unmistakable. Hair remains chunky and has a strong brow shadow. Face is larger but simple; the inherited elbowless reach may still read as a generic greeting. Pip is intentionally partially cropped as an OTS silhouette. The chair has a distinctive small mark, not convincing comprehensive age wear. D19 matching/photo context remains unavailable. Technical success does not establish creative acceptance; no further pass or scene is authorized here.
