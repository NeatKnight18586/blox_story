# S3B — original narration and three performance proofs

**Technical PASS; creative/audio approval PARTIAL.** The supplied original WAV is now verified and used, replacing the earlier missing-file blocker. Twelve paired stills and three bounded motion proofs are complete. Narration timing, decoding and actual browser audio playback are verified; **genuine perceptual listening is unavailable in this interface**. No claim of listening, phoneme alignment, audience engagement or final creative approval. No complete episode or final-resolution render.

## Watch / compare

| Target; native interval | Silent motion / decoded contact sheet | Before/after | Result and limitation |
|---|---|---|---|
| A — shy greeting; [320,482) | [5.4s /81 frames](A-motion.mp4) · [sheet](A-contact.png) | [A](A-comparison.png) | Contact → averted gaze → raised/withdrawn half-wave,100 retained. Clearer social action; rigid straight arm remains a tentative reach rather than an articulated wave. |
| B — reunion; [1296,1490) | [6.4667s /97 frames](B-motion.mp4) · [sheet](B-contact.png) | [B](B-comparison.png) | Existing small resident approaches, reciprocal attention/contact develops, Mara approaches in a reverse, completed wide retains isolated Eli. Child face/contact is small at mobile draft resolution; no new run/hug engine. |
| C — forgotten; [1490,1641) | [5.0667s /76 frames](C-motion.mp4) · [sheet](C-contact.png) | [C](C-comparison.png) | Tentative hand held across zero, Mara turns back to family, hand/head withdraw; ghostlike body and shadow retained. Corrected side composition shows both leads; final turn uses head only, with both legs fixed. Recognition intent remains subtle and needs user/audio creative review. |

254 final frames at180×320/15fps, genuine Three.js/SwiftShader. All254 decoded output frames inspected through local-only labeled sheets, not just selected midposes. All254 inputs reverse pixel/state matched;18 additional out-of-order WebGL seeks match current-source movie inputs, including cast/resident root/part/pivot/geometry/material identities. Final C was rerendered alone after a visible planted-foot swivel was removed; A/B were reused and validated with the corrected runtime.

## Original audio / t=0 review

Input matches the brief exactly: **stereo PCM16,44,100Hz,2,411,520 samples/channel,54.682993197s**,9,646,158 bytes. WAV SHA256 `3d5e0a116971d3d17a7c3adac79423e443d63040b2120be7562a0660f22b4ae4`. Source byte hash is unchanged after all work. Original WAV and every voiced review file stay outside Git and were not uploaded to a public service.

A temporary narrated copy of the **existing** S2 movie was made with video stream copy and AAC audio, both streams starting0. No gain, resampling, tempo or narration-generation filters. The compressed video packets match S2 exactly: this was muxing, not rebuilding the episode. Full821-frame decode/PTS/22 cut keyframes/native playback pass. Browser WebAudio confirms unmuted nonzero audio in all three target windows. AAC decoded PCM has0.999456 zero-lag cosine correlation with the source (lossy codec, not bit-identical audio). Native draft ends54.733333s,50.340ms after the source; native story ends54.700s,17.007ms after it. No audio stretching or tail replacement.

Private task artifacts (transient local paths, not GitHub media):

- Full original narrated S2 review: `/tmp/names100-s3b-audio-review/s2-original-narration.mp4`.
- `/tmp/names100-s3b-audio-review/{A,B,C}-with-original-narration.mp4`.

Excerpt audio uses exact original sample slices, not approximate input seeking: A starts470400, B1905120, C2190300; all streams reset to0 within their clips. C ends at source sample2411520 and retains the same50.340ms video tail. Only `atrim`/timestamp reset is used for excerpts; source WAV unchanged. All three private voiced files pass actual native H.264/AAC playback/full decode/PTS/cuts, with identical video packets to their silent counterparts. [Source/mux verification](audio-verification.json), [unmuted browser signal check](audio-browser.json), [sample offsets/commands](voiced-excerpts.json), [voiced playback](voiced-playback.json).

### Bounded timing review

These are checks against the written phrase windows plus actual sample clock/playback/energy, **not newly heard words or phoneme measurements**. No narration/cuts were retimed.

| Action | Locked timing / specific observation |
|---|---|
| A half-wave |405–472 =13.500–15.733s; rise/hold/retreat spans the supplied13.50–15.69 shy phrase. Do not retime its ending by ear without listening approval. |
| B attention/contact |1371–1396 =45.700–46.533s; shared attention precedes contact within supplied45.91–46.70 reunion phrase. Small acting within a short slot remains the limit, not a reason for a new hug/run system. |
| C intent / withdrawal |Hand rises1493–1517 =49.767–50.567s, held through1529 zero; lowers1580–1622 =52.667–54.067s under the supplied52.69–54.46 final phrase. The first part of the final wide deliberately holds no acknowledgment before withdrawal. |
| Odd-frame events |Protected789/890–926/1529 and countdown1210/1236/1261/1278 unchanged. Even-frame preview first shows zero1530,33.333ms after native1529, never early. B's1371 cut similarly displays at1372. |

Listening remains the only uncompleted audio review capability: measured signal and supported playback cannot establish delivery, emotion or whether the narration makes a pause feel too long. User creative review remains required; overall PARTIAL.

## Validation, preservation and reproduction

PR [#14](https://github.com/NeatKnight18586/blox_story/pull/14) was reviewed, source tests/hash/evidence checked, then merged at `80f592cb4df06693e28b8c41c00195eb66fc9989` preserving its commit and the user's brief. Existing roughcut/S2 inputs, F1 rig/head/appearance, F2A/both gaits and foundational tests remain unchanged. Small opt-in S3B variants/directing helper reuse the same renderer. C's existing fill/HUD were repositioned for the reverse insert; no new assets, lights, expressions, dependency, wardrobe or action engine.

```sh
npm test
node tests/roughcut-framing.js
npm run test:ending -- --motion
npm run test:performance                    #12 paired360×640 stills and boards
node scripts/render-performance.js          #only A/B/C180×320/15fps proofs
node tests/performance-motion.js             #18 actual random browser seeks
# Optional ending-only repair, preserving original full pass receipt:
node scripts/render-performance.js C
```

The bounded coordinator delegates output ownership/locking/atomic writes, H.264 encoding, decode/PTS/cut/native-player verification and contact sheets to existing P1 helpers. It cannot select a full episode or final resolution. For a C-only run, its separate `last-run-C.json` preserves the full-pass receipt; this review's current aggregate reuses A/B and the corrected C. Do not automatically export the complete roughcut to apply these changes.

Source tests compare all223 shy/696 ending cue samples and exact cuts against S2; all non-target scenes unchanged. Actual Three.js seeking checks every target transform in shuffled order; max within-shot scalar delta.084993 (mixed world units/radians, not a perceptual certificate). Scaled child's support error ≤3.34e-16 across all75 approach frames. New strict matrix checks keep both Eli legs fixed for all151 final native frames. Browser still checks include pre-zero eyes/hand, both ending faces inside the frame and final Eli eye sightlines. Selected torso AABB overlap0/body minimumY≥0; full limb-contact realism is not claimed. Three original target S2 PNG golden hashes still match. An additional baseline/S3B bedroom992 comparison matches the saved S2 golden after extending the original bedroom style guard to S3B; this prevents an unrelated look change before the approved windows.

[Original regressions](completion-regressions.log), [final source tests](final-source.log), [selective stills](keyframes.json), [random seeking](motion-random-seeking.json), individual A/B/C motion manifests, [current fingerprints](source-fingerprints.json). Existing WebGL ending motion and cold transparency/eye tests pass. [Preservation receipt](preservation.json): all593 prior evidence files and nine prior films byte-identical. Only new silent proofs/compact evidence are committed; raw frames/cache remain ignored. Earlier provisional stills/costs remain in Git history. No whole821-frame pixel rerender or native iPad/Safari certification. The final global engine fingerprint differs from the export fingerprint only by that bedroom guard: all254 exported inputs are outside the changed branch; current-runtime random seeks still match the film inputs. This is explicitly recorded, rather than relabeling old export fingerprints as new.

## Measured cost / stop point

[Completion measurements](completion-costs.json); [earlier provisional measurements](costs.json) retained separately.

| Completion operation | Wall | Sampled CPU | Peak sampled summed RSS |
|---|---:|---:|---:|
| Two ending-composition still passes, including clearance correction |35.864s|64.85s|662.95MiB |
| Initial three bounded proof exports/verification |78.825s|147.01s|1196.27MiB |
| Ending-only planted-foot correction/export |22.294s|41.32s|1159.19MiB |
| Affected source/WebGL regressions |17.495s|25.40s|674.60MiB |

Original review mux/probe/decode/packet checks2.509s wall. Earlier provisional work cost90.438s still passes +35.116s regressions; not hidden by reporting only final attempts. Targeted payoff still, later random-seek/source checks, voiced mux/playback and sheet assembly were not resource-profiled. Sampling0.2s can miss short processes; summed RSS counts shared pages. These are command measurements, not total assistant time/API cost. No full episode/final-resolution render.

**Stop for PR/user review.** Technically verified original narration and bounded proofs are available. Perceptual listening and emotional acceptance remain incomplete; do not mark final creative PASS, merge automatically or proceed to final episode rendering.
