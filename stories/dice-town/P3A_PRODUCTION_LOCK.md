# P3A — proposed production lock and shot strategy

**Status: documentation complete; production strategy awaiting user review. No final animation authorized or produced.** Based on PR31 /58f7a13, not main. The user accepts the story as an animatic; this document does not reapprove the unfinished assets or claim audio alignment.

## Decision

Keep all38 editorial shots and their exact3513-frame/30fps intervals (117.100s). Keep the117.098231s narration untouched, already at1.25×. The previous15fps proxy lasts117.133333s; its rounded boundaries are reference only, not the final timeline. No dialogue rewriting, retiming, new shots or merging proposed. Subbeats below fit inside each existing cut. Private listening review remains necessary before expensive production; it is not part of this task.

Use eight setup families and three small environment zones. Concentrate authored motion on contact, decision and recognition. Use native still holds, inserts and facial acting for explanatory passages. Preserve original six-part pivots, Leo/Pip identities,6.3-unit die, materials and deterministic explicit-frame sampling. The current storyboard adapter is a preproduction tool, not the final asset/event contract.

## Evidence reviewed

Read the existing MP4's metadata/report, full timing manifest, missing-asset report, contact sheet, existing P2A-polish motion/scene and complete storyboard adapter. Decoded both held states for all38 shots (76 samples) directly from the existing silent MP4 into temporary review sheets; no new WebGL render or video. Review is of held-storyboard imagery, not finished acting or audio performance. Source point: `production/dice-town-animatic/scene.js` (`buildStage`, `actorAt`, `setDie`), `production/dice-town-p2a/motion.js`, existing export verification. The proxy's `placeholder:false` flag does not certify production readiness: D04, D20, D24 and others still use schematic staging.

Highest-impact changes:

1. Make contact and agency readable: baker/stall/shoes, paddle/die, pin withdrawal/transfer/refusal. An insert is cheaper and clearer than hiding uncertain mechanics in a wide.
2. Establish a continuous street world once, then crop intelligently. The circular dais and empty surround read as a stage, even without proof of a physical floor gap.
3. Protect emotional faces and pauses. Replace oversized text/photo cards with held prop inserts; spend performance effort on Pip's choice and mother/child recognition.

## Eight reusable setup families

| ID | Framing / shared source | Camera-visible extent to finish | Reuse |
|---|---|---|---|
| A | Grounded plaza master plus medium/side crops of it | Dais-to-street paving connection; one street exit between existing facades; shallow skyline at horizon | D01/02/09/10/28 |
| B | Market medium and lower/prop inserts | Stall top/edge, grip contact, shoes/cups; wall/awning behind; frame out unused street | D03/04/08 |
| C | Leo/tower-anchor and notebook OTS/inserts | One credible anchor, tether path, shoulder/page; existing facade behind | D05/06/07/12 |
| D | Die corner/result insert, fixed side of plinth | Valid adjacent pip faces, support edge/contact point, small brass clue | D11/13/25/26/29/31/32 |
| E | One under-plinth cutaway with action inserts | Rim/steps fragment, dark wall return, hinge/crank/pin and die underside; no cellar beyond crop | D14/15/16/17/23/27/30 |
| F | Child/Leo reaction close-ups and photo/pin OTS | Same chamber wall, photo, small gate-view axis; no new room | D18/19/20/21/22/24 |
| G | Gate threshold and short street axis | Gate wall returns, continuous road, two shallow street facade silhouettes, house destination landmark | D33/34/38 |
| H | Doorway reaction and chair insert | Door jamb, short wall/skirting/floor, table edge and chair; no whole house | D35/36/37 |

Setup family means a reusable framing/material/lighting footprint, not one immutable camera transform. Allow a local crop or reverse for readability; do not manufacture38 independent sets. Maintain scene axes: tower → plinth/hatch → gate → home. D14's reclip insert must show how the tether can reach the hatch. D21 establishes the same gate opened in D33. D34 travels through that gate toward the doorway used in D35. D38 returns to the gate looking along the established street, not a copied kitchen backdrop.

## Authoring and render economy

The per-shot JSON/table budgets total **20.6 seconds of unique pose evolution** as an initial authoring ceiling, with simultaneous actions counted as shot time. This is a planning estimate, not verified finished performance or a promise to render only618 frames. Preserve the complete3513-frame final30fps timeline in a future authorized export. A moving camera, shadow, light or die can require a new frame even when a pose holds. Do not build generic image-deduplication infrastructure now.

| Technique | Shots | Safe application / limit |
|---|---|---|
| Held pose / limited animation | D07/12/18–22/24–26/28/32/36–38 | Keep a readable silhouette, eye/prop emphasis; no accidental dead pose during a crucial choice |
| Pose-to-pose blocking | D01–06/14–17/23/27/29–31/33/35 | Anticipation → contact/decision → settle. Hold between beats; articulate only visible parts |
| Camera move over a still | D19/32/36 | Small crop/push over a sufficiently large native source; no parallax through silhouettes or upscaling a proxy |
| Insert substitution | D04/06–08/11–16/20/23/27/29–32/36 | Show the contact/result, imply the complex travel outside the crop |
| Facial-only acting | D18/21/22/35/37 | Persistent eye/brow/mouth layers plus restrained head/shoulders, no full lip-sync catalog |
| Staggered loop reuse | D02/09/10/26 | Reuse proven lift/walk poses with explicit global-frame offsets; no wall-clock phase or identical synchronized crowd |
| Silhouette acting | D09/34 | Side/back travel against contrasting wall/road; eyes/fingers need not be animated |
| Impact cheat / fast transition | D11/13/16 | Optional2–3 output-frame angular accent between readable pre/post-contact poses; keep paddle contact visible. No smear system or motion blur required |
| Off-screen action implication | D14/24/34 | Reclip then descend out of crop; Leo leaves OTS; Pip crosses gate then doorway cut. Never imply the pin choice offscreen |

Cameras/die/contact mechanics stay smooth at30fps. Intentional held facial/body poses can update on explicit output-frame pairs; do not run the camera or die on twos or introduce random phases. Static camera/plate holds are valid only if shot lighting/shadows match. Reuse the existing exporter/checkpoints and keep overlays editable later. Do not generate narration, audio or final captions here.

## Final-production first batch recommendation

**D03, D15, D23 and D35** —15.667s of existing editorial intervals, ordered by risk rather than story chronology. Together they test the baker contact problem, mechanical explanation, transfer of agency and emotional payoff. They require only market, chamber and doorway footprints. Begin with selected native contact/face keyframes and short local motion windows within those four shots when production is separately authorized; do not export15.667s or a full episode automatically.

1. D03: stall grip/feet proof; include D04's shoe-clearance reference in its contact test.
2. D15: hinge/paddle/pin/underside proof; establish D16/D11 shared kick axis before implementing derivatives.
3. D23: pin extraction and handoff proof; reference D27/D30 sleeve alignment so the later refusal reads correctly.
4. D35: mother/child eyelines and recognition pause; test D36 chair silhouette as the payoff reference.

Advance only when contact is clean at native and390px review, the mechanism works without explanatory labels, pin ownership is unmistakable, and both faces read. Then finish cheap derivatives D04/16/17/20/27/30/36/37, followed by plaza/anchor and gate travel. This prevents spending on a polished opening while the central cause/effect or ending remains unresolved.

## Lock boundaries / unresolved approvals

Story and source intervals retained. Framing, asset priorities and technique choices in this package are proposed, not silently approved. No quantitative collision clearance or final frame tests have been run for the revised strategy, since it has not been implemented.

- Audio contains “shoes floated away” during rule3. Stage a brief slip/separation with upward momentum; do not silently invent persistent rule1-style loose-object levitation under3. This interpretation needs creative confirmation during the D03/D04 proof.
- Die outcome sequence for mornings1–5 must be approved as fair non-six visual examples, not a countdown mechanism guaranteeing six. Preserve existing narrated outcome; Pip's choice is not a probability engine.
- Mother and photo imagery must share identity/age cues; inspect existing references before adding any new family rigs. Private narration listening/precise quote alignment is still pending and must not be inferred from the silent proxy.

See P3A_SHOT_OPTIMIZATION.md/JSON/CSV and P3A_FIX_AND_ASSET_PRIORITIES.md for every shot and specific blockers. Stop after documentation; no merge, new assets or production render.

## Documentation verification

All38 revised entries were checked against the existing timing manifest: IDs, start/end frames,3513 total frames, classification vocabulary and eight setup keys match. The20.6s planning estimates sum correctly. `node tests/dice-town-animatic.js` PASS. All tracked production/rig/appearance/scripts/tests/evidence files were compared byte-for-byte against58f7a13 and are unchanged. Only this documentation package, README/STATUS and current AGENTS task boundary change. No new test suite or production code was added for a planning-only task.

Existing MP4 reviewed: SHA256 `03403b1629ecff7d8828c735b3f52f38aa5c00b5d9af766776b653e18c506a02`. Temporary decoded review sheets remain outside Git; no new film or WebGL render.
