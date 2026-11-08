# names100 V1 — visual direction & bounded execution brief
Status: **approved planning brief for Codex, NOT implemented**. Current source-of-truth proof is PR #9 (`codex/names100-window-reveal`); review and merge it only if existing checks/evidence remain clean. The original scene-proof files and global time cues are authoritative for timing.

## Creative outcome
Polish *the existing 16.0667–31.5000s Mara reveal slice only* so it feels thoughtfully directed, emotionally clear, and recognizably **original classic block-game cinema**, not generic plastic figures on a bare stage. Retain classic Roblox-like geometry, oval head, P2A independent cast and deterministic WebGL renderer. **Do not invent a different art style, rework the story, or change the narration clock.**

### Design targets, by priority
1. **Emotion first:** Eli reads as shy/nervous before the name, startled and then realizing what happened; ghost Mara shifts from eerie/uncertain into recognition and relief when human. New facial states should be stylized, spare and readable at 360×640: small eye/brow position or tilt, simple mouth curvature, restrained gaze. Reuse cached facial geometry and existing pivots. Preserve `blank`, `classic_smile`, `worried` and every prior API.
2. **Silhouette/identity:** same Eli cap/blue layers, same Mara bob/tapered torso/coral layer, same body meshes and pivot identity throughout. No accidental wardrobe changes, face occlusion, hair clipping or gender baked into the rig.
3. **Purposeful bedroom details:** add at most 2–3 economical narrative props, such as an unlit desk lamp, plain curtain, and personal notebook/school object. Improve window depth and character-to-window spatial clarity. Do not clutter or build a reusable town yet.
4. **Lighting as storytelling:** cold readable moonlight before revelation, restrained warm accent while Mara restores; don't wash out faces, make ghosts look opaque too early or hide the MARA label. Consistent shadow direction, atmosphere and color.
5. **Clear editorial hierarchy:** each shot must direct attention to only one dominant story fact: ghosts outside, MARA tag, Eli hesitating, counter 100→99, or restored Mara. No decorative text/camera movement just because it's possible.

## Immutable story/timing gates (30fps GLOBAL clock)
- Keep scene slice `[482,945)`, exact global-to-local mapping and all existing shot cuts unless a *specific* visual failure warrants a justified change.
- Eli's counter MUST remain 100 through global **frame 788**, become 99 at **frame 789**, never earlier. Script name cue at ~25.84–26.28s.
- Ghost MUST remain ghost through frame 889; restoration occurs within **[890,926]**, visibly human by frame 926. Do not introduce earlier recognition that changes the supernatural rule.
- WAV stays external; don't generate voice, captions, music or change timestamps.

## Approval views — compare exact same global frames/camera/framing when possible
- **592**: eerie window / clear room geography
- **700**: Mara's MARA name tag legibility
- **762**: Eli's hesitant close-up / expressive eyes
- **788 + 789**: exact before/after counter at the critical boundary
- **908 + 926**: halfway human and fully restored Mara
Generate a paired **before/after review sheet** from genuine WebGL renders at these same frames. If changing camera framing, explain the reason and ensure both images remain comprehensible. Include a phone-size contact sheet and a quick visual issue checklist.

## Efficient execution gates
**Gate 0 — preflight:** Inspect PR #9 and relevant source, run source/timing checks appropriate for merging; merge PR #9 if clean and preserve history/evidence. If blocked, stop.
**Gate 1 — art-direction stills:** Create a new branch; implement only the minimum reusable face, lighting and prop changes. Render the selected still frames at **360×640** only. Compare with the actual PR #9 frames. Stop if worse; allow one focused revision based on documented failed visual criteria.
**Gate 2 — motion proof:** Only if stills clearly improve, render a **short 3–5-second low-res excerpt** around the most revealing transformation/action and verify global time mapping and random seeks. Do NOT render the full 463-frame slice or 1,641-frame episode in this task.
**Gate 3 — PR & evidence:** Run targeted face/reveal tests during iteration; run full *affected* regressions once before proposing PR, and only rerun everything if a code change or failure justifies it. Record before/after art, excerpt, measured cost, acceptance results and limitations. Submit PR, don't auto-merge.

## Stop conditions / non-goals
Stop at an evidence-backed V1 PR with PASS/PARTIAL/FAIL; visual PASS requires actual reviewed comparisons, not just passing rendering tests. No new general animation engine, town/crowd library, new skeleton, lip sync, audio processing, comprehensive wardrobe, full episode or 720×1280 export. Do not weaken F1/F2/P1/P2A or previously accepted movie hashes. Keep intermediate frames out of Git and preserve the existing P1 resume cache. Prefer one small implementation and one targeted correction over broad experimentation.

## Token and usage policy
- Open only source files relevant to the changed faces, bedroom, reveal cues/effects, scene data and required tests; avoid dumping all old reports/handoffs into model context.
- Use this document as the sole V1 creative/technical contract, not another multi-page generated plan.
- Respond with a concise summary, paired review evidence and PASS/PARTIAL/FAIL. Avoid verbose logs in chat; store evidence in the PR.
- Use the current source APIs and minimal modules; no speculative general-purpose abstractions. Codex may solve routine implementation details autonomously while retaining these invariants.
