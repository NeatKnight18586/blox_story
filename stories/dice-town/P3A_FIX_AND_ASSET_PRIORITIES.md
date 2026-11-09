# P3A — priorities, overlap fixes and world grounding

All items are proposed work, not implemented fixes. Evidence: PR31 decoded held boards and storyboard adapter. Preserve source intervals and narration. “Must fix” means before the affected final shot, not permission to implement now.

## Prioritized production needs

| Priority / dependency | Smallest deliverable | Shots unlocked | Acceptance before final |
|---|---|---|---|
| P0 contact / silhouette | Baker/stall/shoe and actor staging corrections using existing rig | D01–06/08–10 | Full action envelope inside frame except deliberate portrait crops; feet/soles/stall do not interpenetrate; result and faces unobstructed |
| P0 die/mechanism | Six consistent physical faces on existing6.3 die; one corner-rock/contact action; compact hinge/paddle/crank/removable pin under support | D11/13/15–17/23/25–32 | Opposite faces consistent, upper result correct at settle; pin actually disables paddle; crank → contact → wobble visible on a single established axis |
| P0 pin agency | One pin with matching receiving sleeve, two clear block-hand contact poses | D23/24/27/30 | Pin leaves sleeve, reaches Pip, stays with him through refusal; no teleport/duplication/intersection |
| P0 emotional identification | Two related family stills, mother appearance on shared rig, child-sized Pip and recognition poses | D18–21/27/35/37 | Same mother/photo/door/chair motif readable at390px; time difference visible without oversized BEFORE/AFTER cards |
| P0 world continuity | Camera-bounded plaza continuation and gate-to-door street connection | D01/02/05/10/21/28/33–35/38 | No exposed slab perimeter or empty void; gate opens onto a plausible walkable route, not the backdrop wall |
| P1 anchor transition | Harness indication, one tower ring, long-enough line, hatch ring and single-angle rim/step fragment | D05/06/14 | Tension runs to a real anchor; reclip shown before descent; no line through neck/face or impossible reach |
| P1 notebook | One reusable closed shell/hinge and2 native-readable page stills | D07/12/22/38 | Page in hands/below chin; tally/wobble evidence, closing action and final unplanned hold read without text billboard |
| P1 home vignette | Existing facade doorway, skirting/floor/table edge, one childhood chair | D35–38 | Adult/child/chair proportions and occlusion hierarchy correct; no gate leaves clipping into interior |
| P1 final screen performance | Short die, lift, pin, gate hinge and facial windows; contact-safe backward walk/root direction adaptation | Relevant shots in per-shot table | Explicit-frame forward/reverse samples repeat; all final frames inspected for contact/crop; no inherited test PASS substitutes for new motion checks |
| P2 optional, only if an approved camera exposes it | One foreground occluder, small roof/hill silhouette or street prop | A/G setup crops only | Adds depth or hides a set edge without obscuring story information; omit otherwise |

No new asset is necessary merely because an item is called P0. First try the existing mesh/pivot/material/appearance within an improved crop. Prop/face details invisible at output size get no production budget.

## Specific overlap / intersection correction list

| ID / affected shots | Observed or source-supported problem | Minimal correction and check |
|---|---|---|
| O1 D03/04 | Separate shoe boxes, inherited animated legs and stall occupy similar depths; apparent detached-shoe/foot intersection | Fix hand grip before lift; position feet/shoes against contrasting negative space. Hide calf behind stall in D03; expose just one foot/sole in D04. Scrub start, separation, peak and settle with actual transformed vertices/contact distances, not a whole-root bounding box |
| O2 D01/02/05/10 | Resident arms/body, die rim and Leo/extra silhouettes crowd one another | Reserve independent screen lanes; keep result top and at least one full leg-to-ground gap visible. Check entire motion envelope; resize/crop camera before adding crowd |
| O3 D06/14 | Tether crosses hero area; giant proxy card explains an attachment not clearly staged | Move line behind shoulder to harness/anchor, never through face/neck. Insert shows ring contact and reclip. Confirm rope path/length on a simple plan-view before drawing curves |
| O4 D07/12/22/38 | Floating text plane replaces notebook and obscures chest/face; final close is only a card swap | Reuse attached book below chin; crop to page where needed. Match hinge and hand space at both extremes; no giant upright sign in final |
| O5 D08/09 | Foreground block body hides cups/second walker | Cup insert with one planted foot; single side-profile walker plus optional distant silhouette. Check object/foot separation and reverse travel against fixed background |
| O6 D15/16/23 | Gold plank/pin proxies do not establish real contact or clearance | One visible hinge/contact normal, pin/sleeve spacing and two handoff poses. No pin through palm or paddle through die; derive the kick from the same contact direction each time |
| O7 D18–20/27 | Photo cards cover Pip's eyes/face; cards collide visually with one another | Single held photograph below chin; use separate full-image insert for aging. Reframe eye/photo glance in D27 instead of raising a billboard |
| O8 D17/21/24/30 | Handle, pin, hands and child face compete in a small crop | One dominant prop per insert; keep it on a plane separate from face. Preserve scale/ownership across cuts; hands can be held but intentional contact cannot be hidden |
| O9 D29/31/32 | Upper-pip swapping stands in for a roll; pip/support contact is unqualified | Real face orientation on the shared die, vertex-based support check through the motion, large dark pips, no actor/board across upper face. Hide unseen sides by framing, not contradictory numbering |
| O10 D33–35 | Gate leaves, jamb and actor path share a narrow passage; animatic hides gate geometry in reunion | Clear an actual threshold and leaf swing envelope. Pip passes through opening; gate is off-camera in doorway shot. Visibility masks must not conceal an intersection visible during the same shot |
| O11 D35–37 | Chair/table/mother/child share foreground; chair insert required hiding actors | Position chair in open floor lane and mother beyond its back. Chair-only crop may exclude actors, but keep consistent locations and natural eyelines in adjacent shot |

Do not weaken ground-contact tolerances to support bigger gestures. Existing P2A vertex tests and persistent identity are reusable; fresh per-shot visibility/contacts must be verified. Portrait shoulder cropping is an intentional composition choice, not a blanket exemption for an unseen hand crossing a prop.

## Specific world-grounding fix list

| ID / shots | Why current image feels unfinished | Restricted fix / framing contract |
|---|---|---|
| W1 D01/02/10/28 | Isolated circular paving, sparse horizon and empty foreground suggest floating island | Treat dais as an inset in continuous town paving. Frame two facade returns around one road gap; let road/paving continue behind dais toward gate. Use shallow roofline/hill silhouette at far horizon, below story silhouettes. Do not expose ground-mesh side/perimeter in the approved camera |
| W2 D03–09/12 | Wide context reused for inserts exposes unused floor and incomplete surroundings | Stall/awning/wall or tower base fills crop; show a ground/contact strip only when it explains grounded vs lifted. One shoulder/post may frame the edge, but not mask shoe/anchor contact |
| W3 D11/13/25/26/29/31/32 | Repeated die angle lacks grounded support cues; number swap replaces contact | Keep a small support edge and contact shadow for rotation shots; tighter pip result crops need no town extension. Maintain same sun direction/exposure across reused angle; dawn changes subtle and storyboard-planned |
| W4 D14–24/27/30 | Single wall and floating-looking mockup offer no chamber containment | Finish only floor-to-wall seam, one dark return, hatch rim and visible mechanism mounts. A dark recess implies unbuilt space. Match hatch anchor to plaza position; do not build a cellar or conceal essential crank linkage in darkness |
| W5 D21/33/34/38 | Gate is two detached leaves in a bare wall; destination and Leo's final location unestablished | Embed posts in wall returns; road crosses threshold; two shallow structures and same house-door landmark behind. Preserve travel direction and gate open state. Final Leo uses this gate axis, not the copied home vignette |
| W6 D35–37 | Blank floor/wall and proxy chair do not yet read as an inhabited home | Door jamb, continuous floor/skirting, table edge and worn child-chair silhouette suffice. Repeat chair/door detail in family stills. Frame out unbuilt ceiling/room corners; no kitchen asset library |
| W7 All exterior shots | Screen-space sky would detach from camera moves; current P2A world sky is already available | Retain world-oriented sky/cloud/sun arrangement, sensible horizon and existing palette. Check both endpoints of any future camera move. No new sky system, full terrain, fog/bloom stack or extra weather preset |

Accept W1/W5 only with a native keyframe at the approved widest camera and motion endpoints; an insert cannot certify a later wide. Review at390px phone width as well. Ground-plane extension or a skyline strip is enough only when the actual camera shows no seam; no claim that it has been implemented now.

## Can cheat safely

- Freeze unimportant residents after staggered reactions; reuse explicit-frame loops and modest pose offsets.
- Use static native family imagery for the past/aging, not multiple age-specific animated parent rigs. A held photo can remain flat if edge/hand contacts are credible.
- Hide unseen joints behind stall/shoulder/door jamb; cut from departure to arrival. Keep the tether reclip and pin choice visible.
- Hold non-six montage outcomes; change the physical settled die state and crop, not a texture pretending to rotate mid-roll. Reuse A/D lighting and camera families.
- Use a one-axis crank/paddle hinge, short gate hinge and book hinge. No simulation required, but causal linkage/contact must remain believable.
- A modest2D crop over an authored native still is valid for D19/32/36. No proxy upscale or pseudo-parallax through layered people.
- Narrated dialogue can use facial holds/head nods rather than lip sync. Do not animate mouths continuously under third-person narration.
- Deliberately hold silhouettes or facial poses on output-frame pairs; camera/die and contact events remain smoothly sampled at30fps.

## Must fix before affected final exports

O1–O11 and W1/W5/W6 where their cameras expose them; true die-face orientation and shared kick direction; pin removal/refusal ownership; photo/mother identity and recognition; tether reach/reclip; first/second/fifth/sixth morning readability; exact source frame ranges; no final explanatory proxy labels; no unwanted actor/prop crop through any critical gesture. Review the shoe-under-rule3 interpretation in the lock document. These are acceptance gates, not implementation claims.

## Do not spend time on this

Full explorable town or terrain,40-person animated crowd, additional family rigs/age morph system, new character library/head redesign, cloth/rope solver, general physics/portal system, smear framework, facial catalog/lip-sync engine, weather/post stack, giant environment kit, generic shot editor, render deduplication framework, or animation of offscreen interiors. No new narration, audio processing or captions. Do not animate a full die toss for every morning, a tower-to-hatch walk, a whole cellar descent or a long gate-to-house run. Do not render the complete episode to discover a contact bug that an insert test exposes.
