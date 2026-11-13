# Dice Town P3B-3 — D03/D04 Baker Contact and Shoe Separation (Production Brief)

**Type:** Documentation-only direction; implementation NOT completed in this branch.
**Base:** PR #37 at `codex/dice-town-p3b2b-recognition-fix`, preserving P3B-1 and P3B-2B.
**Recommended Codex:** GPT-6.1 Sol, **Medium effort**. Budget: one small implementation task, targeted stills and **one** short low-resolution proof. No Astra.

## What was reviewed
- Original PR #31 38-shot contact sheet and 117.098-second narration reference (already 1.25×; do not change).
- `production/dice-town-animatic/scene.js`: `if(n===3||n===4)` currently positions the baker, an isolated block stall, and two separate `shoe proxy` blocks that share crowded depth with legs/ground. Two held animatic boards do not prove any real grip/separation.
- `production/dice-town-p2a/motion.js`: sampleMotion has proven, explicitly sampled levitation shoulder/hip/body offsets; reuse ideas, don't retrofit a general physics or walk rig.
- `stories/dice-town/P3A_SHOT_OPTIMIZATION.md`, D03/D04 and `P3A_FIX_AND_ASSET_PRIORITIES.md` overlap O1 and world-framing W2.

## Locked story / screen time
- **D03** source global frames [169,255) = 5.633–8.500s: A baker reaches and braces against the stall as rule 3 levitates people.
- **D04** source global frames [255,337) = 8.500–11.233s: Shoe/foot insert reveals one or both shoes slipping free during the rise.
- Narration says: `A baker grabbed his stall as his shoes floated away.`
- **Magic continuity:** Rule 3 lifts **people**, not every loose object. Shoes may travel upward as part of the baker's initial movement and briefly continue drifting as they slip; do not turn D03/D04 into a permanent rule-1 objects-float effect. Avoid showing shoes gravitationally glued to the foot after separation. Preserve the narration; no audio generation or script revision.

## Directed action and framing
### D03 / Market medium (setup family B)
1. Baker has a readable specific identity (existing `extras[0]` yellow/rust palette and block rig). Stall has stable, camera-visible counter/edge and a backdrop containing an existing bakery wall or awning.
2. Three acting beats: **brace** (feet near floor, surprise/upper-body anticipates) → **grip** (one or both block hands meet the counter edge and remain anchored) → **arrested rise** (torso/legs lift slightly, shoulders visibly react to the restraint). A slight body tilt/overshoot helps. Eyes and mouth may use existing sparse expressions; no new face system.
3. Hide irrelevant knees/calves behind the stall *only when physically plausible*. The hand/stall contact and at least one body-to-ground separation cue must be visible.
4. Compose a medium shot at 390px phone width. Avoid the empty plaza, edge-of-world horizon, floating-island floor, die occlusion and crowd. Use the nearest bakery facade/wall/awning as depth. Don't build an additional market street.

### D04 / Shoe insert (same stall / actor setup)
1. Close-up of the baker's lower leg and shoe(s), oriented consistently with D03. Show at least one recognizable shoe or sole with **clear air gap** increasing between foot and shoe. Keep leg/sole/stall on separate depth planes so nothing looks fused.
2. The shoe starts worn/attached or in believable proximity, slips as the baker rises, then drifts briefly before gravity/exit is implied. **No hand or arm needs to be visible in D04.**
3. Use up to three intentional pose states: worn → slipping → separated. 2D-style held key poses and strong negative space are welcome; key transitions must remain readable and not teleport.
4. Camera remains inside market setup B. A cut is cheaper and more legible than a complex full-body continuous shoe rig. The cut must preserve geographic direction, ground height and shoe identity.

## Acceptance and high-value tests
- Story understandable **muted** at 390px: person suddenly rising, grabbing stall, loose shoe slipping away.
- No visible hand-through-counter, foot-through-shoe, leg-through-stall or shoe-through-floor at tested contact, peak and separation poses. Use transformed vertices or appropriate local geometry checks, not only root bounding boxes. Report tolerances honestly; do not claim a universal collider.
- No accidental critical limb/prop cropping or overlap. Intentional inserts may omit offscreen limbs.
- Baker/stall/foot orientations and palette consistent between D03 and D04.
- No visible map edge/void. Ground, stall and bakery backdrop appear continuous inside the chosen crops.
- Explicit-time sampling and forward/reverse seeking produce equivalent states; existing source regressions pass.

## Efficient evidence budget
1. **First capture native WebGL stills**: D03 brace, grip, rise; D04 worn, gap, separated. Reframe/repair those before motion export.
2. Then produce **one** genuine 360×640/30fps silent short proof (about **2.5–3.5 seconds total**) containing the market beat and shoe insert with a clear cut. This is a local action proof, **not** the complete editorial intervals or full episode.
3. Produce one 390px per-panel review sheet, small frame contact, and a concise report with evidence links, test results, measured partial render cost and remaining limitations. Verify H.264 decode and playback only once on the final proof. Do not collect redundant full native reverse frame passes.
4. Preserve earlier P3B shots, 38-shot timetable, the 3513-frame final frame plan, audio, P3A docs, engine and original evidence. Open a **draft implementation PR targeting this direction branch**. Do not merge.
5. **Stop** after D03/D04. Do not implement W1 plaza master or W5 gate world grounding yet.

## Hard exclusions
No cloth/rope/footwear simulator, new character rig, new generic animation framework, elaborate bakery or full explorable town, entire levitating crowd, final VFX/post stack, soundtrack, captions, new narration, full 117s export, or D35 polish. Prioritize safe compositional cheats, small reuse and unambiguous movement over fidelity invisible on phone.

**Creative gate:** A technical PASS is not enough. We will review real frames and motion before approving the market scene for integration. If the current limb geometry cannot support the proposed grip/separation economically, report the smallest viable alternative rather than expanding scope.
