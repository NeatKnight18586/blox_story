# F2B1 visual calibration — PASS, submitted for review

Recommendation: retain the **Readable** variation for the next storytelling prototype, and keep **Baseline** as the unchanged slow shuffle/regression reference. The trial visibly improves the alternating leg silhouette and opposing arm motion without changing anatomy or loosening contact gates. It is an improvement within the rigid-body style, not a claim of a fully polished general-purpose walk.

[Mobile side-by-side](comparison-mobile.png) · [phase comparison](comparison.png) · [side motion](comparison-side.gif) · [three-quarter motion](comparison-threequarter.gif). Left = Baseline, right = Readable. GIF playback restarts the captured world interval; that reset is not an in-action discontinuity. These are labeled/resized genuine WebGL frames, with no generated/interpolated avatar images.

## The one trial

| Property | Baseline | Readable |
| --- | ---: | ---: |
| Cycle duration | 1.2s | 1.2s |
| Hip angle | ±.05 rad (2.9°) | ±.10 rad (5.7°) |
| Opposing arm angle | ±.07 rad (4.0°) | ±.18 rad (10.3°) |
| Maximum foot-center fore/aft separation | .1999 | .3993 |
| Maximum arm-tip fore/aft separation | .2784 | .7125 |
| Root rise/fall | .02149 | .03793 |
| Swing lift/clearance | .045 | .050 |
| Travel per cycle | .40223 | .80826 |
| Maximum measured local hip overlap | .0250 | .03021 |

One amplitude change set, same phase curves and cadence: legs are about twice as distinguishable, arms about 2.56× more distinguishable, and the fore/aft/vertical weight cue is stronger. Forward speed also doubles (about .335 to .674 units/s); this comparison does not pretend speed is held constant. No lateral pelvis sway or physical balance solver is added.

## Measured contact results
Genuine WebGL: Chromium 141.0.7390.37, WebGL 2.0 ANGLE/SwiftShader. Both side and three-quarter runs produced the same contact statistics. Maximum/RMS values below are world units; their scale is numerical roundoff. Original spec limits are unchanged.

| Measurement | Baseline max / RMS | Readable max / RMS | Limit |
| --- | ---: | ---: | ---: |
| Fixed material-point drift | 1.11e-16 / 3.01e-17 | 2.22e-16 / 5.37e-17 | .03 max |
| Actual lowest-vertex contact-locus drift | 3.33e-16 / 1.32e-16 | 4.44e-16 / 1.76e-16 | .03 max |
| Ground penetration | 2.22e-16 / 1.27e-16 | 2.22e-16 / 6.73e-17 | .01 max |
| Support height error | 2.22e-16 / 1.96e-16 | 2.22e-16 / 1.08e-16 | .02 max |

Actual mesh vertices determine minima and clearance. Fixed material anchors remain constant over declared intervals; rear-to-front handoffs are explicit and tested. The independent actual contact-locus measurement checks that perfect nominal anchoring is not concealing sliding on the bevel. At the exactly flat sole, both edges contact: the declared edge is used rather than averaging heel and toe into a false moving anchor.

`api-metrics.json` contains independent four-cycle 30/60fps measurements, including the joint check. Joint intrusion is measured using leg vertices contained in the torso's rounded-box volume, as height above its lower boundary; this is a conservative local check supplemented by visual inspection, not a general collision engine. Both the .05 lift/correction and .05 joint-region target remain satisfied.

## Tests and review performed
- Reviewed PR #4 against F2_SPEC.md; re-ran `npm test`, `npm run test:browser`, `npm run test:motion`, `npm run test:walk` before merging. No blocking failure. Its commit `c22431d` is retained by merge `e956e65a4c4a6938063b9b6f07ebe6dd10422f93`.
- `npm test` includes all existing F1/F2A/F2B1 assertions and new calibration tests: a SHA-256 fixture captured from merged baseline before edits, both gaits at shared 30/60fps times, shuffled seeks, loop/handoff velocity joins, appearance/object identity, collision/contact limits, unsupported options and continued rejection of walking transitions. Default baseline remains bit-identical across 145 explicit samples.
- `npm run test:calibration`: 292 actual 30fps captures (73 timestamps × 2 views × 2 gaits), 872 geometry samples at 30/60fps, identical pixels at shared timestamps and reverse seeking. Camera position, orientation and projection are asserted unchanged for every frame. Both gaits use exactly the same 5.8-unit framing, target z=.8, ground, light, gray material, smile, timestamps and 216×384 (9:16) canvas. Separate paired 390×693 renders check mobile presentation. Every body vertex stays inside the image bounds.
- Inspected all 292 captured frames in eight local paired review sheets, including support swaps and flattened feet. Trial has clearer movement, stable contact/shadows, small hinge seams confined to the joint region, and no visible severe clipping, hovering or obvious foot sliding. Both mobile renders inspected. No motion assertion is based solely on a still image.
- Re-ran F1/F2A/F2B1 WebGL tests on the calibration implementation. The preview now uses the same wider fixed framing for both walk options; original foundation screenshots remain archived rather than being replaced by differently framed renders. Pure action output and original numerical baseline tests are unchanged. Switching gait pauses playback/resets explicit time, preventing a clock-induced seek jump.

Reproduce with the HTTP preview running:
```sh
npm test
npm run test:browser
npm run test:motion
npm run test:walk
npm run test:calibration
python3 tests/calibration-comparison.py
```

Lossless PNGs and all-frame review sheets regenerate under ignored `raw/`. The two compact GIFs show the 72 playback frames of each two-cycle interval; its exact terminal frame is also captured/tested and included in local review sheets. Browser metrics list every captured timestamp/file. This avoids committing another 292 near-duplicate PNGs. GIF palette/resize is for convenient review; measurements and pixel equality use the original WebGL PNG data.

## Limits and next boundary
The Readable gait still has an upright torso and brief smooth zero-speed instants at rigid-foot handoffs. It does not add lateral balance, knee/ankle motion, natural long-stride dynamics, walking transitions, or an unbounded camera-follow system. No constraint has been relaxed. Native iPad/Safari GPU behavior remains untested. Subjective user preference remains a review decision; the professional recommendation is based on visible alternating movement plus the measured safety margin. No F2B2, F3, story, audio or production MP4 system was implemented.
