# S3B — provisional performance stills

**PARTIAL overall. Technical source/still checks PASS. Audio review BLOCKED; final creative/timing approval and new motion previews NOT completed.** The WAV mentioned in the request is not accessible in this task. Per the [brief's missing-audio fallback](../../stories/names100/S3B_PERFORMANCE_BRIEF.md), this branch stops at provisional written-cue keyframes. No replacement voice, narrated review copy, new MP4 or episode render.

## Integration and scope

PR [#14](https://github.com/NeatKnight18586/blox_story/pull/14) contained only review documentation/evidence. Reviewed its diff, reran `npm test`, checked the actual S2 movie hash against its recorded821-frame/22-cut/native-playback verification, and merged with commit `80f592cb4df06693e28b8c41c00195eb66fc9989`, preserving `8d20670` and the user's brief `d23557e`. [Review receipt](pr14-review.json), [premerge test log](pr14-regressions.log). The video verification itself was not redundantly rerun for documentation-only changes.

Branch `codex/names100-s3b-performance` adds only opt-in `visuals: "s3b"` scene variants and a small story-specific directing helper. Existing `roughcut.json`, S2 scene files, source animation APIs, gaits, rigs, expressions, appearances and previous tests are unchanged. The helper uses the original pivots and existing explicit-time readable gait; it is not a second action engine. The original rough cut still uses the original S2 variants.

| Target | Provisional change | Actual evidence / remaining judgment |
|---|---|---|
| A, S05–06 [320,482) | Turn toward receptive neighbor, avert gaze, widen for a raised/withdrawn half-wave; counter100 retained. | [Before/after A](A-comparison.png), native stills334/427/474. Gesture now visible; rigid straight arm reads more as a tentative reach than an articulated wave. Vocal pacing and motion readability pending. |
| B, S18–21 [1296,1490) | Existing small resident approaches with scaled readable walk; adult/child look and restrained arm contact develop at reunion. Reverse angle isolates coral Mara's recognition/approach, then retain completed wide with Eli outside the group. | [Before/after B](B-comparison.png),1300/1366/1388/1420/1470. Separation and shot variety clearer. Child's face is small and partly in profile; strength of emotional connection requires motion/user review. |
| C, S22–23 [1490,1641) | Eli faces Mara, holds a tentative hand across exact zero, then lowers it while she turns toward family; final Eli remains ghostlike and grounded. | [Before/after C](C-comparison.png),1490/1528/1562/1628. Hand and counter are visible before zero; final gesture echoes A. Early S23 shows Eli's back/side, and this wide alone does not conclusively prove failed recognition. Creative acceptance remains PARTIAL. |

C's reverse insert uses the existing fill light from the camera side and moves its existing enlarged counter above the eyes; otherwise that overlay covered the new camera's face. No new light, exposure stack, prop, expression, character, outfit, environment, rig or dependency. All choices are provisional, not a claim of better retention or final cinematic approval.

## Gates and verification

| Gate | Result |
|---|---|
| Narrated existing S2 review at t=0 | **BLOCKED.** No accessible local WAV/audio attachment reference; no genuine listening or sync claim. [Availability receipt](audio-availability.json). Brief's2,411,520 samples/44,100Hz/54.6829932s remain supplied expectations, not newly measured audio. |
| Selective stills | **Technical PASS, creative PARTIAL.**12 genuine360×640 Three.js/SwiftShader stills, same-time baseline comparisons at180×320 mobile size, reverse pixel/state/transform checks and persistent six-part identity. Provisional fallback only; does not bypass audio approval. |
| Short motion previews, three bounded scenes | **NOT RUN.** Narration gate blocked and creative still review not fully approved. No new H.264 clip or full-episode export. |
| Regression and preservation | **PASS within executed scope.** Commands/logs below, original evidence preserved, three actual baseline PNG golden matches. Whole821-frame pixel rerender deliberately not performed. |

```sh
npm test
node tests/roughcut-framing.js
npm run test:ending -- --motion
npm run test:performance  # source tests + 12 paired WebGL stills + boards; no video
```

[Actual regression log](regressions.log), [keyframe verification](keyframes.json), [keyframe command log](keyframes.log). Source tests compare all223 shy and696 ending samples against S2: original cuts, counter/clock/restoration/forgetting values unchanged, non-target scenes unchanged. Actual Three.js transform tests seek every target frame in shuffled order with unchanged part/pivot references. Maximum adjacent scalar transform delta within shots0.084993 (world units or radians depending on component), not a perceptual-motion certificate. All75 child approach frames retain actual-vertex support error ≤3.34e-16 world units after scale-aware root travel. No new walking transitions.

Browser checks: twelve final candidate frames and their baseline pairs; repeat pixels/states/head/hand transforms in reverse order, explicit1528→1529 counter boundary, original six-part bodies, body minimum Y≥0, torso AABB overlap0 in selected candidate stills, Eli opacity≥.78 and shadow casting retained. Both pre-zero eyes have clear 3D sightlines and raised hand fits the frame. Actual images also reviewed for HUD overlap, which 3D ray tests alone do not detect. Baseline S05 g359, S19 g1392 and S23 g1600 hashes still exactly match saved S2 images. Existing WebGL ending motion and S2 cold transparency/eye tests pass. No claim of full new-motion clipping/acting certification or native iPad/Safari testing.

[Preservation receipt](preservation.json): all593 previous evidence files and all nine MP4s byte-identical; avatar/appearance source, original tests, original S2 inputs and lockfile unchanged. The old motion-seek test rewrites one decoded-equivalent report; its original bytes were restored. No raw comparison frames/cache committed; baseline stills stay under ignored `renders/`. Only12 candidate stills and three compact boards retained.

## Actual costs and remaining limits

[All measured attempts](costs.json), not just the final pass:

| Operation | Wall | Sampled CPU | Sampled peak summed RSS |
|---|---:|---:|---:|
| Five bounded keyframe passes, including camera/occlusion/HUD repairs |90.438s total|164.62s total|664.61MiB peak |
| Final keyframe pass alone |17.441s|31.69s|661.27MiB |
| Two affected regression passes |35.116s total|51.11s total|662.98MiB peak |

The initial pass revealed edge cropping and an obscured reverse. Repairs also exposed camera collisions with foreground avatars and the HUD covering Eli's eyes; those failed compositions were corrected rather than accepted on numeric checks. These iterations cost more than a single still pass; no motion rendering was used to explore them. Sampling0.2s may miss short processes; summed RSS counts shared pages per process. PR14 preflight, separate source-only runs, board assembly and assistant time were not resource-profiled; these are command costs, not a total bill. No new MP4 encode/full-film render cost incurred.

**Next blocker:** make the original WAV accessible to this task, verify its actual sample count/hash, mux the unchanged existing S2 video with narration at t=0 outside Git, and genuinely review it with audio (report listening limitations). Then confirm these three provisional performances and only if approved make their bounded previews with global audio offsets. Do not retime narration/cuts or export the full episode here. Current final creative status remains PARTIAL, especially S23's recognition read; stop for review rather than assert PASS.
