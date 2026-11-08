# F2 — deterministic reusable actions
Status: F2A MERGED; F2B1 FOUNDATIONAL WALK AUTHORIZED. WALKING TRANSITIONS DEFERRED.
Current authorized scope: F2B1 standalone walk implementation, contact tests, genuine WebGL evidence and a PR; no walking transitions. F1 was integrated by PR #1 (merge commit `2dff6c6bf488870da8ea5427261edc6d26bc3207`). See STATUS.md for executed F2A results; the complete three-action F2 gate remains pending F2B.

## Goal and boundaries
Add just three actions to the existing canonical avatar: `idle`, `walk`, and `look_react`. Reuse the six original body meshes, rounded oval head, durable five named pivots, face caches and appearance attachment interface. Preserve the F1 silhouette, materials and neutral assembly. Keep vanilla Three.js 0.187.0; small ES modules, no animation framework or physics engine.

F1_SPEC.md controls anatomy and appearance; this document controls future F2 motion. F1 `applyPose` remains available as a compatibility/demo API. The F1 `walk_demo` is not a completed F2 walk. No environments, episodes, stories, audio, MP4, export pipeline, camera-track system, wardrobe expansion or full skeletal rig. One flat test ground and inspection camera are sufficient.

## Time and action contract
Use seconds, Y up, +Z forward. Time must be explicit, finite and nonnegative. Invalid action/time/options throw before mutating the avatar. No Date.now, random calls, accumulated delta time, or requestAnimationFrame dependence inside action evaluation. Interactive playback may derive time from a clock, but renders must also support exact `frameIndex / fps` sampling and seeking in any order.

Proposed minimal API (design, not existing exports):
- `sampleAction(actionName, timeSeconds, options?)` returns numeric transforms for the existing pivots, root displacement relative to a caller-provided origin, and contact metadata. No Three.js object creation per sample is necessary.
- `sampleTransition(fromRequest, toRequest, elapsedSeconds, durationSeconds)` samples both explicit requests, blends and resolves ground contacts. Each request includes its action name, action-local time and options. No hidden “last action” dependency. The caller supplies progressing source/target times; elapsed controls the blend only.
- `applyActionSample(avatar, sample, origin?)` applies all action-owned transforms from a neutral baseline, including root position/yaw, so previous calls cannot leave residual motion. Default origin is identity; never accumulate root displacement onto the current root. Preserve face/cosmetic/color state and object identity.

A small combined convenience wrapper is acceptable if these deterministic sampling semantics remain testable. Keep the interface small; no general timeline/editor. Own only pivot rotations and the required root motion/ground correction. If tiny local pivot translation is required for contact, document it, keep it bounded, preserve connected joints visually, and reset it explicitly. Do not silently stretch meshes, add joints, or rotate the floor.

## Three actions
- `idle`: subtle periodic head/shoulder motion, calm upright stance, both feet grounded. No torso scaling or vertical bob that lifts both feet. Loop must match pose and first derivative at its seam. Start with a 3-second period.
- `walk`: forward +Z travel on a flat ground, modest rigid-leg stride, alternating stance and swing, opposite arm swing, gentle upper-body motion. Start with a 1.2-second full cycle and approximately 0.4 world units of travel per cycle; tune conservatively against the actual block geometry. Root displacement must be continuous across cycles; local pose/contact phases must loop. Ground-contact points remain fixed during declared stance; swing clears the floor. Do not use an in-place sliding walk as acceptance evidence. One default speed and straight path suffice; turning, variable speed and navigation are deferred.
- `look_react`: a reusable restrained head turn/downward glance and small shoulder response, with anticipation, smooth ease-in, brief hold and recovery. Start with a 1.6-second non-looping clip; clamp beyond duration to the recovered neutral pose. Optional left/right direction is enough. Do not change face automatically: the caller independently chooses blank/smile/worried. Feet stay grounded.

Durations and stride are initial tuning values, not excuses to miss the contact gates. Final constants must be documented. Loops must also accept large time inputs without unbounded allocations or numerical drift.

## Ground contact and clipping
The canonical legs are rigid beveled blocks, without ankles/knees. Treat contact as a rocking bottom edge or sole patch, not an imaginary articulated shoe. Use the actual transformed geometry (including bevels), not only the leg center, to calculate support height. Prefer a short stride and conservative angles to adding rig complexity.

Recommended bounded approach: define stance/swing phases and explicit world-space contact anchors; derive root travel and vertical correction analytically from cycle/phase and the support leg, with a brief double-support handoff. Lift the swing leg only as much as needed. Evaluate whether root correction alone is sufficient before allowing small joint offsets. Naively rotating hips with a sine and clamping root height is not sufficient evidence of planted feet. Never reduce floor penetration by making the whole body visibly hover.

Each sample exposes support foot/edge, stance intervals, expected anchor and actual contact position so tests can measure slip. During a rocking phase measure the selected contact edge; report edge handoffs separately instead of relabeling contacts each frame to hide sliding. Root translation and limb motion must agree. Idle and look/react use both feet in support.

Initial acceptance tolerances in body world units (avatar height about 5.2):
- Lowest body point no more than .01 below the floor in any tested frame.
- Active support contact height within .02 of floor; no unsupported floating frames.
- A stance anchor drifts no more than .03 horizontally over its complete stance interval, including handoff checks. Report maximum and RMS drift; averages alone cannot hide spikes.
- No visible limb/torso interpenetration outside the intended small joint region. AABB overlap alone is not proof of collision; inspect actual geometry. Joint correction/overlap must not visibly open seams or bury limbs; target no more than .05 local correction, justify any larger change explicitly before claiming PASS.
- Human review must also find no obvious foot sliding, floating, harsh joint snaps or severe clipping. Numerical passes do not override visible failures.

If these gates cannot be met on the rigid rig, report PARTIAL and a focused constraint/solution proposal; do not silently add a full skeleton or loosen tolerances.

## Transitions
Cover all six directed pairs between idle, walk and look/react, plus switching to the same action without a pop. Default transition duration .25 seconds; zero duration is an explicit immediate cut, not a smooth transition. Reject negative/nonfinite duration; clamp blend weight before/after bounds. Use a smoothstep-type weight with zero endpoint slope and shortest-path rotation interpolation (quaternions where needed).

Align target root origin and walk phase deterministically so switching does not teleport. Blend contact-aware samples and perform support correction after blending; plain angle interpolation can push a foot through the floor. Enter/exit walk through a predictable support phase or a short settling interval, and document that timing. Keep at least one supported foot. Any required contact state must be part of explicit transition inputs or analytically derivable from them, so a random-access sample matches sequential playback.

Test endpoints against their aligned source/target samples, bounded velocities and neighboring frames. Interrupted transitions may use an explicit sampled source snapshot; no hidden previous-frame state. General action scheduling is deferred.

## Acceptance and evidence
A — Real-module tests: same time/request produces equal transforms after shuffled seeking and after sampling another avatar; validate all three actions, loop seams (pose and velocity), non-loop clamp, root continuity over multiple walk cycles, contact metrics, transition endpoints and all action pairs. Compare 30/60 fps samples at shared timestamps. Repeat with all faces and cap on/off; root, six mesh and five pivot references remain unchanged. Keep F1 tests passing.

B — Real-browser motion: serve the actual preview and use genuine WebGL. Add only action selection, play/pause, explicit time scrub/frame stepping and repeatable views needed for inspection. Run each action and transitions in Chromium; sample fixed times independently of the playback loop. Require no page errors and verify that frames actually change.

Capture 30 fps lossless PNG sequences for at least two walk cycles, one idle cycle and a full look/react; capture every frame of each directed transition plus .25 seconds before/after it. Side and three-quarter views are required for walk/contact review; front and face view cover silhouette/reaction. Generate indexed contact sheets with action/time/frame labels, and a JSON contact report. Inspect every sampled frame for ground gaps, penetration, seams, slip, silhouette and discontinuities, particularly wraparound and support handoffs. Test forward playback, reverse seeking and a second identical capture run. Optional browser recording is supplemental; no video/MP4 production required.

C — Practicality: responsive controls and real-browser vertical 9:16 inspection at 390×693 (plus a 720×1280 render if supported). Keep the avatar and contact shadows in frame over the tested walk distance; fixed camera or a simple explicitly sampled follow offset is sufficient. Preserve mobile readability at about 160px avatar height. No iPad installations or manual user capture tasks. Report native Safari testing honestly if unavailable.

Evidence goes under `evidence/f2/` with a manifest of commands, browser/WebGL version, sampling fps/times, views, tuning constants and contact maxima. Store enough indexed frame evidence to reproduce review without uncontrolled repository growth; lossless sequences may be linked artifacts, but a manifest and reviewed contact sheets must be committed. No fake canvas or generated concept images. F1 still captures remain separate.

## Completion rule
F2 is PASS only after A, B and C are executed successfully and frame review/contact metrics are documented. Otherwise PARTIAL with exact blockers or FAIL for broken behavior. A specification, sine-wave demo or static screenshot is not motion acceptance. Commit source, tests and documentation in a future implementation PR. F2A may be graded separately for idle/look-react and their transitions; a F2A PASS must not be reported as complete F2 or walking acceptance.

## F2A implementation choices
`avatar/actions.js` provides the three sampling/application functions above for idle and look_react only. Idle uses a 3-second period. Reaction uses 0–.2s anticipation, .2–.65s turn, .65–1s hold and 1–1.6s recovery, then neutral. Peak head turn .3 rad, downward glance .06 rad; small shoulder motion. No root, hip or local pivot translation is required: both support feet remain exactly fixed, including blends. Contact anchors are sole-center references at x=±.5, y=z=0 (the actual beveled sole has flat geometry there). Contact reports measure transformed body geometry and fixed leg centers.

Transitions use a .25s smoothstep weight and shortest-path bounded XYZ angle interpolation; this range avoids Euler singularities. Source and target action-local times are explicit. Snapshot sources support interrupted blends; these preserve pose continuity but do not promise velocity matching at interruption. Regular progressing-source blends match endpoint velocities. Ground resolution is the invariant zero hip/root motion in F2A, not a walk solver. Placement origin translates/yaws the whole avatar; floor guarantees assume origin.y=0 and a level parent. External origin motion is caller-owned.

## F2B1 bounded implementation
`sampleAction('walk', seconds)` extends the existing API. `sampleTransition` rejects either walk endpoint (including explicit walk snapshots); preview selection to/from walk is an intentional cut. This PR does not provide starting/stopping blends.

Canonical geometry is unchanged. Each half-cycle lasts .6 seconds; hip rotation is limited to ±.05 radians. Per full 1.2s cycle, travel is approximately .40223 world units. Opposite arms swing at 1.4× the leg angle. Root motion is derived from a fixed bottom-edge material point. Its height is solved against a cached YZ profile extracted from the actual canonical RoundedBoxGeometry, not an assumed point-foot. No per-frame mesh creation or full skeleton.

The support foot rocks from its rear edge to its front edge at the flat-foot midpoint. Each edge has a fixed world anchor over its half-stance interval, exposed with local contact point, interval and support-foot ID. Rear-to-front handoff spans the real .96-unit flat sole depth: that is a change of supporting material edge while the entire sole is level, not a reset of an anchor to conceal drift. The support foot changes every .6s, with both feet touching at the instant of handoff. Frame evidence/metrics include those boundary samples.

Pure mirrored rigid-leg rotations leave both bottoms at the same height. The smallest employed correction is a smooth vertical offset of the existing swing hip (max .045 < .05 target), providing .045 maximum measured clearance. It causes only a small overlap at the hip joint, without a new mesh, changing leg length or opening the joint. All pivot positions reset from recorded neutral positions on the next action or legacy pose. Origin yaw rotates root displacement; origin.y=0 and a level parent are required for ground guarantees.

The gait is intentionally a short shuffle, with smooth zero-velocity instants at flat-foot and support handoffs, rather than a natural long stride. It is not physically simulated. Longer strides and continuous-speed gait refinement are not certified by this foundation. All original drift (.03), penetration (.01), contact (.02) tolerances remain unchanged. Full F2 acceptance remains pending walking transitions in a separately authorized task.
