# Dice Town P3B-4 — Grounded Plaza and Gate World (Directed Visual Proof)

**Status:** Direction/specification only. No code or rendered assets produced by this document.
**Base:** PR #39 branch `codex/dice-town-p3b3-baker-proof`. Continue on an implementation branch from `codex/dice-town-p3b4-world-direction`. Do not merge historical PRs in this task.
**Recommended model:** GPT-6.1 Sol. **Reasoning effort:** Medium.
**Objective:** Eliminate the "floating island / unfinished background" impression in the **widest approved exterior compositions**, without building an explorable town or rendering the 117-second film.

## Repository findings and approved constraints
- `production/dice-town-animatic/scene.js` already has a 60×70 foundation, concentric 8-unit dais, shops, sky/fog, plus a **separate storyboarding gate vignette** built for D21/D33/D34/D38 with two detached leaves on a short backdrop. The gate has no authored convincing onward road; proxy labels and absent street are not final production visuals.
- `production/dice-town-p2a/sky.js` provides the world-oriented sky/distance assets. Preserve the style, sun and clouds rather than rebuilding them.
- P3A strategy: `stories/dice-town/P3A_PRODUCTION_LOCK.md` setup A (plaza) and setup G (gate), and W1/W5 in `P3A_FIX_AND_ASSET_PRIORITIES.md`. Eight setup families remain the cap; don't add a ninth environment system.
- Current opening shot D01 source [0,66) / 0–2.20s; D02 [66,169) / 2.20–5.633s; sixth-sunrise D28 [2585,2669) / 86.17–88.97s; gate D33 [2898,2985) / 96.60–99.50s; D34 [2985,3090) / 99.50–103.00s; final D38 [3389,3513) / 112.97–117.10s. Preserve original 3513-frame/30fps timeline and 117.098231s private narration, already at 1.25×.
- Existing P3B mechanism, mother/child, baker proofs must remain identical; no editing them or adding new stories.

## Two camera-visible sets to prove

### A. Plaza world grounding — D01/D02/D28 composition
1. Retain the approved **6.3-unit** ivory die, small characters, clock tower and existing three-shop palette. Dais is **inset into or seamlessly joined** to continuous town paving, not an isolated round slab suspended in empty ground.
2. Show one plausible street outlet between the visible existing facades, with paving/path perspective continuing toward the distant town horizon. Add only shallow camera-facing facade returns and 2–3 sparse depth silhouettes if needed for scale. Ground should extend seamlessly beyond every visible frame edge. Use existing fog/sky to hide distant geometry, not a new procedural terrain or giant city.
3. Keep the sun, two/simple cloud clumps and roof horizon meaningful. The world sky must stay stable in **both** the widest opening camera and the sixth-sunrise camera.
4. Stage the die result 3 and at least one readable floating resident without crowd/die overlap. The first frame must communicate the rule immediately. If an original camera must shift to hide the old stage perimeter, preserve scale/subject and document that change.
5. Remove distractions in wide compositions: excessive empty foreground, raw mesh edge, cut-off floor, abrupt road termination, duplicated roof rhythm that dominates the result. Do not add random street furniture just to fill space.

### G. Town gate continuity — D33/D34/D38 composition
1. Reuse the original two-leaf gate idea but **embed it in continuous wall returns/posts/threshold**; hinge the leaves toward believable open positions with actual clear space for Pip.
2. Road/paving must **continue through the gate** to at least two shallow exterior facades. Include a consistent identifiable destination doorway/house marker that can plausibly match the D35 entrance (not a fully rendered house); maintain one travel direction from town → gate → home.
3. Provide closed and open stills from the actual **widest needed shot camera**, and a D38 Leo-at-gate still with the gate held open and that same onward road/house relationship preserved. No duplicated kitchen backdrop or floating standalone panels.
4. The gate shall look installed in the town, not a portal appearing within an empty stage. Geometry may be shallow beyond camera, but no cut/back wall may be visible through the gate. Any gate swing/actor walk implementation is **not** in scope in this task.

## Efficiency and creativity constraints
- Implement the smallest **opt-in world-layout extension** using existing Three.js primitives/materials, shared sky, camera and renderer. Prefer reusable camera-bounded setup data for A/G, not a full city map. If a strict single-coordinate street connection is disproportionately costly, use matching visual continuity (road alignment, colors, landmarks, travel direction) and state the limitation honestly.
- **No new general terrain generator, procedural city, road editor, new weather/post processing, large foliage packs, or additional characters.** Existing character appearances, die scale, P3B actions and previous evidence unchanged.
- The **deliverable is still imagery**, not motion. Capture about **five native 720×1280 actual WebGL stills**: D01 grounded master, D28 sunrise alternate, D33 gate closed, D33 gate open, D38 same open gate with Leo. If one D02 medium is necessary to validate a revealed edge/occlusion, at most one additional still. If any moving camera is already in the chosen setup, inspect endpoints; no new camera animation.
- Provide phone-size **390px side-by-side before/after** for both setup families, clearly labeled outside actual imagery, and a compact site/axis diagram or 2D plan if useful; no synthetic image stand-ins.
- **Visual acceptance:** At phone size the town appears built on continuous walkable land with coherent streets and reachable gate/house; sky is not blank; no visible horizon/ground discontinuity, facade floating, exposed slab side, disconnected gate or obvious crucial overlap. Die, protagonist and gate remain legible and not absurdly scaled. Do not claim the entire 38-shot film has been fixed.
- Do targeted screenshot/camera-frustum checks and existing source regressions; repeat keyframes across forward/reverse seeks if relevant. Report exact before/after frame/camera inputs, any new geometry size, rendering cost and residual ungrounded shots in a short `REPORT.md`.
- **No 117s film, new motion proof, audio, captions, new rig, facial edits, global appearance rewrite or external art assets.** The still-only scope is deliberate. If views pass we will integrate them and tackle the remaining necessary actions in a later authorized stage.

## Stop condition
Open one **draft implementation PR targeting `codex/dice-town-p3b4-world-direction`**, link actual native evidence and report, and stop for creative review. Technical PASS is not automatic visual approval.
