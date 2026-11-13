# Bounded motion polish — technical PASS; creative review pending

[Actual four-second MP4](movie.mp4) · [comparison](comparison.jpg) · [all120 frames](all-120-frames.jpg) · [larger motion sheet](motion-sheet.jpg).

## Review of PR28

Three highest-impact weaknesses: clipped/crowded wide-shot silhouettes; nearly uniform floating with weak anticipation and recovery; Leo's surprise-to-irritation lacked a held thought. Reviewed original native frames, complete sheet, motion source and report. Its encoding/contact PASS did not resolve the documented arm crop.

## One bounded correction

Reframed the wide camera, moved the two right-hand residents inward and redirected the blue actor's raised arm forward. Strengthened staggered preparation, leg counterposes, torso lean and a small vertical overshoot. The die remains6.3 units and settles at the same time; lift preparation still follows its settle. Leo now holds surprise longer, then makes a stronger head/shoulder release into irritation. Environment, characters, face geometry, wardrobe and renderer are reused. No new decorative assets or frameworks.

## Actual verification

Existing source suite and targeted motion tests PASS. Low-resolution full motion preflight preceded native export; selected native0/55/74/82/119 frames inspected after staging correction. Independent real-browser actual-vertex checks over120 states: **zero wide-shot frame-edge violations**, max foot error8.88e-16, minimum clearance0, die contact error1.11e-16. Portrait shoulder crops remain intentional. Persistent geometry and world sky checks PASS. Final native export verifies all120 forward/reverse pixel hashes, H.264/yuv420p720×1280/30fps,4.000s,120 decoded frames, continuous timestamps, cut75, full decode and actual browser playback. No audio. See export-manifest.json and geometry-qc.json.

Final native job191.34s wall, sampled CPU357.50s, summed process-tree peak1402.5MiB; shared pages counted per process. Low-res preflight/native sample/QC costs additional. One revised native film export. Raw frames stay in ignored renders/. Previous PR28 evidence is unchanged.

## Honest creative assessment

The crop is corrected and movement has clearer pose changes and settling. This is an improvement in readability, not a claim of finished cinematic quality. The rigid six-part rig still limits weight shifts and joint articulation; floating remains stylized, shadows are hard, and the foreground resident partly overlaps the die/plaque silhouette. Leo's eyes use existing simple oval features rather than articulated pupils. Shot-specific visibility still removes floating extras from the close-up to avoid foreground occlusion. Human creative approval is pending.

Reproduce with `python3 scripts/dice-town-p2a-polish-cost.py`; the existing exporter/checkpoints are reused. Review/QC/sheet scripts share that prefix. Source changes are limited to existing P2A motion, placements, camera JSON and validation/documentation; no prior history is rewritten. Stop here: no merge or next phase.
