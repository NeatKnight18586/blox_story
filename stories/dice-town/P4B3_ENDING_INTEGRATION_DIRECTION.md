# Dice Town P4B-3 — Gate Opening, Pip's Journey, Reunion Continuity and Notebook Close

**Status:** Creative + engineering direction only. No code or media generated on this branch.
**Base:** PR #47 branch `codex/dice-town-p4b2-mystery-continuity`.
**Codex:** **GPT-6.1 Sol, Medium reasoning effort**. Creative direction and source selection are already decided here; implementation should stay narrowly bounded.

## Goal
Finish the **editorial ending**, not a detached proof: replace the static gate change in **D33**, the unfinished travel proxy **D34**, the old-style reunion proxy **D37**, and the static final location shot **D38** in a *new* complete **117.100s silent working edit**. Keep D35's newer approved mother-recognition proof and D36's preserved-chair insert unchanged.

This closes an important storytelling gap: the fair six physically opens the installed gate; small Pip passes through it toward a visible home; mother/child imagery stays consistent through the spoken `We kept your chair` line; Leo actually closes his notebook rather than standing motionless.

## Source facts checked in repo
- Most recent 38-shot base `evidence/dice-town-p4b2/working-edit.mp4` + `edit-map.json`: H.264, 360×640, 30fps, **3513 frames**, 117.100s, no audio. Existing original proxy remains **1584 frames / 45.090%**.
- `production/dice-town-p3b4/scene.js` **exports** `window.__grounding` with `gate`, `leaves` array of `{hinge,sign}`, `home`, `leo`, `pip`, `scene`, `renderer`, `camera`, and a static open/closed render helper. Existing open hinge target `-sign*1.24` radians. This is an opt-in camera-bounded setup; do not rewrite common scene APIs or invent a continuous city map.
- `production/dice-town-animatic/scene.js` provides the child-scale Pip avatar (`pip` root group, russet clothing, scale 0.65) and Leo's existing teal appearance. The original storyboard has notebook proxy geometry; `production/dice-town-p3b1/scene.js` also includes an existing small `notebook` prop on Leo's root; reuse a single book identity and make **only a minimal visible hinged-cover or close gesture**, not a general book rig.
- Existing `evidence/dice-town-p3b2b/recognition.mp4` (105-frame proof) and PR #37's native stills are the **correct** older mother and latest recognition appearance, unlike the original D37 proxy.
- P3A editing decisions: `stories/dice-town/P3A_SHOT_OPTIMIZATION.md`, setup G/H; gate → road → home continuity established in P3B4; reunion performance inherited from P3B2B. Private Adam 117.098231s narration ALREADY contains user's 1.25× speed; not in GitHub. Do not read/request/upload/speed-change it.

## Locked shots (end-exclusive source frames)
| Shot | Frames, length | Directed action |
|---|---|---|
| **D33** | [2898,2985), 87f / 2.90s | Gate starts closed, the **actual two leaves** rotate around existing hinges from 0 to final ±1.24radians, reveal continuous town road and destination facade. Hold open. No single-frame cut from closed to open, no teleport. |
| **D34** | [2985,3090), 105f / 3.50s | Child Pip crosses the **already open** gate and heads along the same road axis toward the visible house. **One short recognizable walk/silhouette**, then a purposeful cut/camera insert of the destination doorway can imply the rest of the journey. No full-street traversal or running simulator. |
| **D37** | [3344,3389), 45f / 1.50s | Replace old proxy mother/room with a **source-consistent mother close-up** from P3B2B, matching her gray-swept hair, cream-V purple garment, doorway palette, and held welcome. You may hold an existing recent mother frame plus a subtle bounded 2D crop/push; **do not generate new WebGL mouth sync**. Narration says `We kept your chair.` |
| **D38** | [3389,3513), 124f / 4.133s | At the *same open gate/street*, Leo looks down and **visibly closes the real small notebook** (hinge/cover and restrained forearm/shoulder response), then holds a small reflective ending pose. Frame Leo's face/book large enough to read at390px, with one background house/gate cue. The book closing, NOT a floating sign, completes the film. |

### Pose/camera direction (2D-inspired within a 3D world)
- D33: establish installed hinge/wall/road; begin leaf movement after a short anticipation hold; eased swing settles open. Avoid leaf-wall/road intersection and ensure Pip has a clear central passage. No new physics, portal effect or exploding bolts. If needed, one close-up insert on latch can be created from existing scene, but only if native wide frames cannot show the gate opening.
- D34: spend short unique motion on clear beginning/ending walking poses and negative space. A *cut* to a camera-visible home/doorway plate communicates travel cheaply and preserves same screen direction. Do not reuse Pip as an adult avatar, crop him through the threshold, or create a separate faraway city. Maintain child scale and rust palette from D35.
- D37: old proxy currently creates a jarring costume/face/set change immediately after D36. Use the exact same P3B2B visual identity and preserve warm household lighting. A native source still/clip is preferred over inventing new character or animation. Only a short recognition continuation, no hug or speech animation.
- D38: book closure is the meaningful physical action. If the original book is a solid block, create a minimal hinged *front cover* around an existing rectangular book shape rather than modeling pages/fingers. Existing Leo head/arm pivots may support a small synchronized gesture. Compose medium/medium-close, not the tiny wide site-proof version; preserve a view of the open gate and same house axis. End on thoughtful/naturally content face, not generic happy grin.

## Physical and continuity checks
- Gate leaf sweep clears wall/posts/road and central opening over the actual sampled transforms; check at least closed, mid and open plus full authored range, not just endpoints.
- D34 Pip starts on the correct side of open gate, passes through clear opening, and walks in an unambiguous direction toward house; his height, shoes/ground contact, shadows and screen placement should remain coherent. No floating island or visible scene edge.
- D33→D34: gate remains **open**, camera/street axes are consistent, and Pip does not teleport to the wrong side. D34→D35: implied arrival at the established matching home doorway. D36→D37: mother costume, hair, chair/kitchen colors and eyelines do not visibly reset. D37→D38: **cut back** to Leo at gate, which stays open.
- D38: notebook cover is unambiguously *open then closes* without clipping the body, rotating through Leo's face or detaching. Book visible at phone size, with face not cut off. Explicit-frame deterministic seeking and stable scene/actor identities across samples.

## Implementation and media cost ceiling
1. **Start with native720×1280 WebGL stills** D33 closed/mid/open, D34 before crossing/after, D38 book open/mid/closed. For D37 choose a source-native close-up/reframing from existing PR37 images/video (report provenance). Fix key-pose framing/geometry *before* any motion export.
2. Capture only three short motion ranges: **D33 hinge up to 0.9s**, **D34 Pip move up to1.0s**, **D38 notebook close up to0.9s**. This is **up to84 newly captured 30fps frames** (unless a specific visible failure warrants a tiny, justified overage documented in report). Fill remaining shot time with source-quality endpoint holds, one or two camera-visible stills and safe short digital crops from overscan. No repeated full-length WebGL capture.
3. D37 should be assembled from existing P3B2B still/clip material at 0 new WebGL frames. No unnecessary source-smoothing optical flow, faux 3D parallax or generic motion library.
4. **Integrate directly** into a fresh `evidence/dice-town-p4b3/working-edit.mp4`; preserve `evidence/dice-town-p4b2/working-edit.mp4` and prior media. Adapt the existing P4B2/P4B1 FFmpeg incremental assembler minimally, reuse packet-copied unchanged frames, and provide a new 38-shot exact frame source map. Full output remains silent, 3513 frames, 360×640/30fps, 117.100s, H.264/yuv420p; all38 shot boundaries unchanged, zero private audio processing.
5. Only D34 (105f) and D37 (45f) are currently **proxy**, so removing both reduces proxy to **1434 frames / 40.82%** (if all replacement frames are classified accordingly). D33 currently counts as **still**; D38 currently **still**. Avoid reporting 4 replaced shots as 4 newly animated scenes.
6. Validate generated keyframes, 390px full-phone montage, cut boundaries, actual gate/actor/book intersections, preserved character/set identities, explicit-time reverse/cold seeking, targeted previous regressions, full H.264 decode and real playback. Include short report of *measured* new WebGL captures and encode costs, creative limits and residual proxy-shot priorities.
7. If existing P3B4 scene's reset behavior causes gate state/actor visibility to jump while sampling, add a **small opt-in wrapper** that sets all explicitly authored state **after** the base layout setup; do not rewrite core rendering or break the P4B1 die. Preserve source evidence/history byte-for-byte.
8. No new music/SFX/captions, audio, face rigs, global animation tools, unneeded facades, further mother/baker/die polish, or full native-resolution master. The D19 family photo remains an acknowledged separate future job.

## Acceptance: cinematic, not just technical
At 390px muted: gate truly opens onto a coherent road, small Pip runs/walks through toward home, mother visually belongs to the same recently seen family scene, and Leo visibly **closes** his notebook with satisfying framing. The viewer should not see static proxy title cards, teleported actors or unfinished world edges in these four replaced shots.

Deliver one updated full-length silent rough cut, exact source map, phone sheet, concise cost/limitations report and a **draft implementation PR targeting `codex/dice-town-p4b3-ending-direction`**. Do not merge or move to another scene. Stop for creative review.
