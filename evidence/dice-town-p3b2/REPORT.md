# P3B-2 — mother recognition / chair reference

**Technical PASS; creative approval PENDING.** Isolated implementation from codex/dice-town-p3b2-direction /100e496, targeting that branch. Entire directed brief was read; only D35 motion and D36 reference implemented.

## Actual evidence

- [D35 silent motion proof](recognition.mp4):360×640/30fps,H.264/yuv420p,105 decoded frames,3.500s.
- Native720×1280: [anticipation0](anticipation.png), [recognition40](recognition.png), [response95](response.png), [D36 chair reference](chair.png).
- [390px-per-panel review sheet](phone-review.jpg) and [all105 frames](all-105-frames.jpg).

No labels/captions/UI/audio in the film or source stills. Review-sheet labels are outside the imagery. No native motion export, final episode or D37 work.

## Directed performance

One fixed over-Pip-shoulder camera. Pip stays at(-.3,0,1.5), scale.65, rust palette, facing his mother. Mother stays adult-scale at(0,0,-2.7) in the same purple appearance and low-bun geometry. No character or camera translation across the motion. Child's head/shoulder is intentional foreground framing, not a second face to keep inside frame.

- 0–.25s: uncertain/resting pose, hands down.
- .25–.80s: head/eye-line focus settles toward Pip's actual eye level, followed by a pause.
- .95–1.80s: brows/eyes/mouth soften continuously into relief. Head moves forward.07 world units; subtle tilt supports the release.
- 1.65–2.50s: after recognition, one shoulder-led reaching arm invites Pip forward and stops short. Tiny damped settling, then an emotional hold through3.5s. No hug, blink loop, speech or idle mouth opening.

A small smile replaces the default relieved mouth: width.36, corner-rise.04 rather than a broad grin. Cached nervous/relieved geometry is interpolated into one persistent local face buffer; global facial catalog and rig untouched. Existing low-bun materials get restrained gray/brown tint, with lighter temple areas. Skin/head/proportions retain the original appearance. D19 currently contains text/photo placeholders, so exact younger-photo matching cannot be verified; the same bun/face/skin assets can represent the younger mother later. No new age/skin/hair system.

## Technical conflict and minimal solution

Existing expressions are static and the rig has no elbow, iris or fingers. Direct expression swaps would pop; a long reach would require unapproved rig work. This proof uses a single local geometry blend and a short shoulder rotation. Gaze verification uses head-forward direction toward actual eye-center positions, not a claim of pupil tracking. The reach is an invitation, not contact with Pip. No new framework or shared renderer change was needed.

## Home / D36 continuity

One shared floor, rear/return wall, doorway walls/jamb/lintel/threshold, warm interior/cool exterior lighting. The fixed adult/child staging avoids a floating platform and keeps the doorway axis unchanged. The visible right jamb was brought into the crop after native keyframe review; its clearance remains tested.

Chair is at(-1.6,0,-5), table edge at(1.3,2.05,-5.4), rear wall atz=-7.5. The same objects exist in D35 and the D36 still. Yellow child chair, old sage paint patch behind it, repainted warm wall, skirting and continuous floor provide the preserved-chair cue. D36 only changes the camera and hides actors for an unobstructed insert; no kitchen animation or D37 implementation.

## Verification

- `node tests/dice-town-p3b2.js`: explicit0–104 frame range, recognition before reach, normalized easing, held end and repeatable seeking PASS.
- `npm test`: all existing source regression suites PASS. Original avatar/appearance, previous production scenes, P3B-1 implementation/evidence, timelines and directed brief byte-preserved (preservation.json).
- Native reverse-order hash/state equality and motion selected reverse samples104/40/0 PASS. Body identities and mother face geometry identities persist at all sampled frames; no page exceptions.
- Independent actual-vertex projection over105 states: mother head max normalized screen coordinate0.418, distal reaching hand0.848; both remain inside frame. Conservative arm clearance from jamb **0.114**, Pip **2.077**, mother's head **0.335** world units. These are targeted collision checks, not a full body/house collision certificate.
- After focus, head-forward versus actual child eye-center target deviates at most **5.14 degrees**. Oval eyes do not have articulated pupils; this measures the pose's aim.
- Existing FFmpeg encoder/verifier:105 decoded frames,3.500s,360×640,30fps,H.264,yuv420p,one video stream/no audio, continuous PTS, full decode and actual browser playback/seek PASS. Native720×1280 still dimensions verified during sheet creation.
- Reviewed native keyframes before recording the **one** low-resolution motion clip, then full105-frame contact sheet and phone review. Initial framing clipped the reach; wider composition/jamb adjustment corrected it before motion capture.

## Cost and limitations

Final four-still/reverse-check pass **5.37s wall**; motion capture/encode/reverse samples/playback verification **29.76s wall**. Three native staging passes were used; only the last pass is timed here. These are scoped metrics, not total task CPU/GPU/model cost. CPU/memory/model-token totals were not profiled.105 raw low-res frames remain under ignored renders/. D36 retains one static view, no motion. No new dependency or paid tool.

Creative assessment: uncertainty → softened recognition → held welcoming reach is visible in the reviewed poses, with a clear child/adult scale relationship and restrained gray-hair cue. Human muted-phone review is still required before creative PASS. Remaining limits: elbowless block-arm reach, simple facial features, modest rather than realistic age cues, a plain bounded room and some inherited shadow-map grain around joints. Head/neck seam uses the existing pivot construction; no redesigned anatomy or general intersection guarantee. Exact D19 photographic continuity is pending a finished photo, not silently approved. No final production-quality claim.

## Timeline / reproduction / scope

D35 source[3090,3230), D36[3230,3344), D37[3344,3389) and the117.098s1.25× narration are unchanged. Local0–105 proof can occupy D35[3090,3195) with remaining hold/edit work deferred; this is not a retimed episode.

```sh
node tests/dice-town-p3b2.js
npm test
node scripts/dice-town-p3b2-qc.js
node scripts/dice-town-p3b2-proof.js --stills
node scripts/dice-town-p3b2-proof.js
python3 scripts/dice-town-p3b2-sheet.py
```

New isolated production/dice-town-p3b2/, three proof/QC/sheet scripts, targeted test and evidence. Existing Three.js modules, base rig, expression factory, hair asset, safe HTTP server, FFmpeg encoder and playback verifier reused unchanged. Only current AGENTS task boundary, README and STATUS additionally updated. No merge, other shots, audio or next phase. Stop for creative review.
