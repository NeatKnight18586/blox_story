# names100 — Ending look-development brief (NEXT TASK ONLY)
Status: **approved plan, NOT implemented**. Use after review/clean merge of PR #10. Keep V1 as the visual baseline, but change Eli's final 0.6s reaction from premature relief to reflective/astonished if visual comparison confirms this is more truthful to the script.

## Source and boundaries
- Repo: `NeatKnight18586/blox_story`. Read `stories/names100/VOICE_CUES.md`, `STORYBOARD.md`, and `V1_VISUAL_BRIEF.md` plus only scene/face/renderer modules touched. Do not reread all previous PR reports.
- ElevenLabs narration is **54.682993s**, *not* in GitHub; original audio remains outside Codex. Global 30fps native clock is the authoritative editing clock. Do not fabricate sample-accurate audio synchronization or new voiceover.
- Existing polished proof covers global `[482,945)` / 16.0667–31.5000 seconds. This task explores the **ending [945,1641)**, but **does not render this whole 696-frame range**.
- Key story logic: name expenditure is from Eli's 100-use allowance; naming ghosts restores them; when his counter reaches zero he is forgotten but still exists/appears ghostly. Preserve counter monotonicity. No 100 individually rigged ghosts.

## Creative priority: emotional ending over a broader engine
1. **Recognition (31.5–35.1s):** Eli grasps that ghosts are forgotten humans. Hold thoughtfulness, not immediate joy. Keep subdued moonlight and existing character designs.
2. **Decision (35.1–39.9s):** Eli opens existing bedroom door, moves toward waiting forgotten people. A meaningful gesture and camera direction communicate choice. Reuse the closed hinged door asset and minimal existing pivots rather than complex IK.
3. **Sacrifice montage (40.3–43.0s):** Visible counters `52`, `18`, `3`, `1` at approx. global **frames 1210, 1236, 1260, 1277** respectively, grounded by the supplied speech cues. No number should appear before its actual spoken phrase.
4. **Reunion (43.4–49.8s):** Minimal reusable exterior street/courtyard dressing, warm sunrise, restored adult and child proxy silhouettes, ONE well-staged reunion as the emotional anchor. Use camera cuts and preposed extras for the rest; do not model crowds or physics.
5. **Zero / forgetting (49.8–54.7s):** Counter reaches **0 near global frame 1529** (approximate written-phrase alignment; actual WAV needs later confirmation). Eli remains physically present but forgotten, e.g. townspeople no longer acknowledge him and his color subtly fades. Clear lonely final composition, not gratuitous effects. Prior scenes at frame 789 keep original 100→99 and Mara restoration 890–926.
6. **Continuity:** Classic Eli blue cap/vest; tapered Mara coral/bob; same facial vocabulary, head, rig, light direction and approved V1 look. Avoid reassigning established character identities between shots.

## Production gate — LOOKDEV ONLY, no full ending yet
**Gate A:** Re-verify PR #10's affected visual/timing/regression evidence. If clean, merge PR #10 into main preserving history; if blocked stop. New branch from merged main.
**Gate B:** Build only minimum reusable set/prop state and schedule a **six-frame keyframe board** at global approx. `[1040,1090,1210,1370,1529,1600]`. 360×640 genuine WebGL stills, labeled with global times and shot intention. Choose staging that communicates *decision, sacrifice, reunion, forgetting* with minimal objects. If scene/asset requirements exceed current stage, produce a feasible plan and explicitly mark PARTIAL rather than expanding framework.
**Gate C:** If and only if the keyframe board meets creative checks, render a short **3–5 second** 360×640 motion excerpt centered on zero/forgetting (global around 1480–1610), native 30fps if needed for odd frame 1529. Preserve global clock mapping; verify timestamp boundary, deterministic seeking, frame identity, 9:16 readability, MP4 decode/playback, and affected regressions. Output silent visuals. Do not render complete episode or entire ending.
**Gate D:** Submit a PR with a 6-frame phone-readable contact sheet, short verified excerpt if passed Gate B, concise visual findings, render cost and PASS/PARTIAL/FAIL. Stop for review.

## Acceptance criteria
- Zero occurs only in its spoken window; restored humans are recognizable, and the forgotten Eli is distinct from any disappearing/death effect.
- A viewer without dialogue understands: Eli chooses to help → people reunite → Eli is ignored.
- F1/F2/P1/P2A and original six-part body stay intact. Existing scene proof counter and ghost boundaries do not shift.
- One new small reusable exterior/background only if necessary; not a town engine. A few shadow silhouettes are better than dozens of live rigs.
- Review authenticity: actual Three.js stills/clip, no generated stand-ins. Keep cache and raw frames out of Git. No extra npm framework, full wardrobe, voice, captions, final audio mux or 720p export.

## Usage policy
Codex should execute one bounded implementation, one targeted visual correction at most, targeted tests during iteration and full affected regression on final integration. Save detailed logs in repo, deliver short summary. No speculative expansions. The remaining *opening [0,482)* should be planned only after this ending lookdev is approved. A complete low-res 1,641-frame animatic and final 720p export are subsequent distinct milestones.
