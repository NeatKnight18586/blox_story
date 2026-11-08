# S2 — PASS for full-story rough coverage, pending creative review

[23-shot native board](storyboard.png) · [phone board](phone-storyboard.png) · [continuous silent MP4](movie.mp4) · [native timing boundaries](native-boundaries.png) · [Mara/Eli ghost echo](ghost-echo.png). Authority: [S2_ROUGHCUT_BRIEF.md](../../stories/names100/S2_ROUGHCUT_BRIEF.md). Actual WebGL footage; not a final-resolution or audio-aligned film.

## Executed gates

- **A PASS:** PR12 source/WebGL/native-boundary/old-excerpt checks passed; all four S1 stills and archived metrics reproduced. Merged preserving `17db24f` and user brief `fee7074` at `584bad2026f648d5f2759abde06290eba03370ae`. Receipts: `pr12-*`.
- **B/C PASS:** all23 authoritative storyboard slots compiled on the1641-frame/30fps clock. Four isolated native scene blocks reuse S1 town/courtyard, bedroom, approved Eli/Mara, cached faces and actions. New anonymous rule and shy-Eli blocks cover only the missing opening. One genuine180×320 keyframe per shot,16 protected native frames, all cut/endpoints, repeat pixels/states, six-part identity/grounding and eye visibility checked. [Keyframe receipt](keyframes.json), [creative review](creative-review.json).
- **D PASS:** verified **180×320,15fps,821frames,H.264 Main/yuv420p/BT.709,54.733333s**, silent. All821 current-source pixels/states re-rendered in reverse, all decoded PTS i/15,22 cut keyframes, full decode and native HTML5 playback/seek pass. [Manifest](manifest.json).
- **E PASS:** affected regressions and source/artifact fingerprints pass. All eight old films are byte-identical; F1/F2/appearance modules and old tests/tolerances unchanged. [Integrity](integrity.json), [regressions](regressions.log), [archive restoration](regression-comparison.json). Stop at the PR.

## Coverage — no missing shots

| Slot | Native frames [start,end) | Story fact | Status |
| --- | --- | --- | --- |
| S01 | 0–94 | Rule / town | WORKING |
| S02 | 94–169 | Cost / count | WORKING |
| S03 | 169–259 | Zero / consequence | WORKING |
| S04 | 259–320 | Eli / unused | WORKING |
| S05 | 320–398 | Not brave or smart | WORKING |
| S06 | 398–482 | Too shy to speak | WORKING |
| S07 | 482–573 | Night / pale figures | WORKING |
| S08 | 573–630 | Ghosts / rumor | WORKING |
| S09 | 630–719 | Faded nametag | WORKING |
| S10 | 719–769 | Eli leans closer | WORKING |
| S11 | 769–823 | Mara whispered | WORKING |
| S12 | 823–882 | 99 appears | WORKING |
| S13 | 882–938 | Ghost becomes human | WORKING |
| S14 | 938–1046 | They weren't dead | WORKING |
| S15 | 1046–1096 | Eli opens the door | WORKING |
| S16 | 1096–1203 | Start saying names | WORKING |
| S17 | 1203–1296 | Countdown montage | WORKING |
| S18 | 1296–1371 | Sunrise returns | WORKING |
| S19 | 1371–1406 | Mothers cried | WORKING |
| S20 | 1406–1450 | Friends ran together | WORKING |
| S21 | 1450–1490 | Families whole | WORKING |
| S22 | 1490–1546 | Eli hits zero | WORKING |
| S23 | 1546–1641 | Nobody remembers Eli | WORKING |

The anonymous resident's100→99→0 example is explicitly separate from cap/blue Eli. Eli keeps100 through788. New98/97 spends at1120/1168 visibly restore two waiting people, before the52/18/3/1 montage. Parent/child head/shoulder reaches and an existing readable-walk approach stage reunion; no new hug/run engine. Final Eli shares Mara's cyan vocabulary, dark eyes and bounded.78 opacity, retaining silhouette and grounded shadow while people turn away.

## Visual corrections and rendering reliability

Initial board failures were addressed locally: opening neighbor framing, anonymous-zero panel covering the head, shy introduction context, S12 face cropping, S16 cap framing and S20 group margin. [Initial→corrected board details](targeted-correction.png). S07 intentionally crops a foreground back/shoulder as an over-the-shoulder view; the ghost subject is complete.

Full motion review then caught a walk-placement bridge carrying its facing direction into the countdown insert. Restored that insert's approved.35 facing, preserving the walk endpoint/camera/clock. [Actual S17 before/after](countdown-correction.png). Added an actual two-eye sightline test at six expressive close-ups.

Reusing frames exposed a **real cold-seek failure**, and publication stopped. Three.js retained an `OPAQUE` shader after `transparent` changed; material flags/opacity alone did not refresh its compiled program. A small `material.needsUpdate` fix on transparency transitions now produces identical pixels for cold and shuffled seeks. [Before-fix observation](transparency-before-fix.json), [cold-path/shader regression](transparency-seeking.json), [eye checks](face-framing.json). No tolerance or final-verification contract was weakened.

The final run regenerated135 affected frames and reused686 checksum-validated frames; **every one of the821** was then checked against fresh current-source rendering in reverse. [Cache lineage](cache-lineage.json). Reviewed274 decoded5fps samples across the first whole draft, then50 decoded samples of the corrected regions and the current native board. No unresolved severe torso clipping in sampled keyframes/cuts; maximum sampled torso AABB overlap0, minimum bodyY0. Native944→945 scene seam retains camera/origin and has mean channel difference.152/255, with normal idle movement.

## Exact clock and draft sampling

Native timeline is **[0,1641)/30 =54.700s**. Rough output i samples global **2i**, ending at1640. 821 frames/15fps yields **54.733333s**, a documented **+33.3ms final hold**, within one draft frame. No source clock is retimed. Cuts use ceil(nativeStart/2), so odd cuts/cues appear at most1/30s late, never early. Native789 and1529 are separately verified in genuine PNGs even though the15fps draft first displays them at790/1530.

Protected events:100 through788→99 at789; Mara ghost through889, restore890–926; zero1529. Countdown starts1210/1236/1261/1278: last two round UP from42.01/42.57s instead of showing numbers early at approximate1260/1277. S2 restores the storyboard S13/S14 cut at938; original lookdev's927 cut and all prior source/evidence remain intact in their own files. S14 crosses the945 block seam continuously. Original WAV is external; written cue alignment only, no sample-level audio claim.

## Reproduce and actual cost

```sh
npm test
npm run test:roughcut
node tests/roughcut-framing.js
npm run render:roughcut
# A current matching creative-review.json is required before export.
# Existing affected suites also executed:
npm run test:style
npm run test:v1 -- --motion
npm run test:ending -- --motion
npm run test:p1
npm run test:casting
```

`scripts/render-names100.js` is a bounded four-block coordinator, not a generic multi-environment engine. It reuses P1 ownership/lock/atomic file/cache helpers and unchanged FFmpeg encoder/video verifier. The original `render-shot-list.js` final exporter is unchanged. No fast-verification mode was introduced: full reverse verification was retained. Cache/raw frame sequences are ignored, old resume caches retained. A3-frame budget-paused checkpoint was successfully reused before the first full draft.

| Measurement | Final corrected run |
| --- | --- |
| Capture/cache / full reverse | 73.961s / 131.000s |
| Encode / video verification | 0.935s / 1.265s |
| Exporter / measured wrapper wall | **208.536s / 209.146s** |
| Sampled CPU / summed subtree RSS peak | 350.25 CPU-seconds / **1219.93MiB** |
| PNG / MP4 bytes | 23,785,501 / 464,105 |
| Final measured keyframe check | 27.554s wall,660.07MiB sampled tree RSS |

Costs include failures rather than hiding them: first draft309.549s, rejected cold-cache attempt55.930s, final run209.146s; **574.624s measured render-attempt wall total**. [Attempt ledger](render-attempts.json), [resource receipt](resource-usage.json). The second attempt published no MP4. Sampling every.2s is a lower bound; RSS sums shared pages per process, not exact physical peak. Two CPU cores, software WebGL; FFmpeg two threads. Costs exclude earlier uninstrumented development/regression activity. No dependency added.

## Outstanding creative limits

This is **complete rough visual coverage**, not final movie approval. Small sets, restrained six-part acting, symbolic naming/greeting/crying and existing walking instead of a run remain visible limitations. Some holds need pacing review against the unavailable original WAV. At180×320, fine lettering/gestures are deliberately draft quality; digits, MARA, identities and primary reactions remain readable. Native Safari/cross-GPU rendering, original-audio sample alignment and final720×1280/30fps output are unverified. No audio generated/muxed, subtitle burn-in, final-resolution render or next phase. Recommend reviewing this continuous film before authorizing focused shot fixes or final production.
