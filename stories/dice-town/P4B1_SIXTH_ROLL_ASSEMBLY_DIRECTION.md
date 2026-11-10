# Dice Town P4B-1 — Six-Morning Choice and Fair Six Roll (Editorial Integration Brief)

**Type:** Docs-only production direction. **Base:** `codex/dice-town-p4a-working-edit` (PR #43). No implementation in this branch.
**Recommended Codex:** GPT-6.1 Sol, **Medium reasoning effort**; no Astra.
**Goal:** Replace the largest high-stakes proxy cluster **D25–D32** inside the existing **117.100-second silent working edit**, using small reusable motion/held-frame assets. Stop producing disconnected proof reels. This is a working-edit upgrade, NOT final movie approval.

## Source of truth / constraints verified
- Existing working movie: `evidence/dice-town-p4a/working-edit.mp4` — 3513 frames, 30fps, 360×640 H.264, silent, exactly 117.100s.
- Authoritative shot boundaries: `evidence/dice-town-p4a/edit-map.json` and `evidence/dice-town-animatic/shot-timing-manifest.json`; 38 shots must remain identical.
- Relevant assets: P3B-1 `production/dice-town-p3b1/` and pin/handoff proof, P3B-4 `production/dice-town-p3b4/` plaza/sunrise still, P3A `stories/dice-town/P3A_SHOT_OPTIMIZATION.md`, original P4A assembler/verification scripts.
- Private Adam narration is **117.098231 seconds, already 1.25×**; DO NOT touch, request, regenerate, upload, speed-shift or trim it. Deliver silent edit. Audio sync review happens separately.
- Exactly **eight** original slots in this contiguous arc, **674 frames (22.4667 seconds)**. D28 is already an approved *environment still*, not final acting.
- The base contains a **staged static result-5 at D28**. Ensure the fifth fair-roll result in the montage is 5, so the sixth dawn begins with die displaying yesterday's five until it rolls again.

## Locked shot/visual plan (all end-exclusive source frames)
| Shot | Frames / time | Production direction |
|---|---|---|
| **D25** | [2224,2339) / 74.133–77.967s | Two mornings without six. Hold actual 3D die close-up with faces **1 then 2** upright in separate clean shots/match cuts. No repeated full toss. |
| **D26** | [2339,2454) / 77.967–81.800s | Three more mornings, upright **4 then 3 then 5**. Same die/angle; subtle dawn color/clock change or 2D-style hard cuts, not crowds. One frame of Pip or his pin silhouette can establish watching, but never hide the face. |
| **D27** | [2454,2585) / 81.800–86.167s | Child Pip *almost* reinserts the same brass pin; his hand pauses next to empty sleeve, then he notices his faded family photograph and withdraws. Show **clear decision** rather than static posed thinking. Use one camera-visible chamber insert/close-up; the photo must not occlude face or pin. |
| **D28** | [2585,2669) / 86.167–88.967s | **Reuse existing P3B-4 grounded sixth-sunrise plaza still**, still showing prior-day 5. It resets geography; no expensive new skyline or film. Optional small in-editor crop only if high-quality, not upscaled proxy. |
| **D29** | [2669,2716) / 88.967–90.533s | The die makes an **actual authored 3D rotation** from a physically plausible near-six orientation. The six-bearing face approaches upper position. Clear center of action, support edge and consistent light. |
| **D30** | [2716,2787) / 90.533–92.900s | Cutaway: Pip reaches for pin/empty coupling, then decisively **lowers his hand** rather than interfering. Keep the same still-uninstalled pin, head/eye cue, and sleeve position as D27; no teleport/reinstallation. The die's motion may be held at the D29 cutaway boundary. |
| **D31** | [2787,2850) / 92.900–95.000s | Resume **same die pose/orientation** where D29 paused; finish edge-supported, eased settling to **real six on the upper face**, with no mesh-ground penetration, fake instantaneous pip swaps, or die scale increase. |
| **D32** | [2850,2898) / 95.000–96.600s | Hold clear upper six in a tighter native-source insert. No giant artificial rule card, UI or magic typography. This is the earned payoff before the existing D33 gate stills. |

### Physical, visual and character continuity
1. Reuse die dimensions, ivory material, rounded bevels, pip design and 6.3-unit scale of previous Dice Town proofs. If the earlier die has incomplete faces, create **one bounded opt-in complete-faced die appearance** (standard opposite pairs 1–6, 2–5, 3–4), with actual pips bound to faces and an authored edge/pivot rocking path. Don't rewrite the global avatar or renderer; expose only the reusable die-orientation helper needed here.
2. D25/D26 montage uses *different orientations of the same die* not a pasted-on top-number replacement; camera may stay fixed. Previous day's 5 persists into D28. When needed, use the photo/pin from the existing P3B-1 chamber and the identifiable Pip appearance.
3. Die motion D29→D31 must be **mathematically continuous across the D30 edit** (same transform at outgoing/incoming cut frames), and must contact the plinth without penetration or impossible free-floating. Use deterministic explicit-frame animation, no physics engine/randomness.
4. D27 and D30 are not identical gestures: D27 is momentary doubt motivated by the photo; D30 is the decisive *non-interference* as six approaches. Keep body language readable muted at 390px and avoid rigid protruding arms passing through the machine.
5. The photo is **one small reusable 2D/image-plane prop**; if adding it here, use existing Pip/mother visual motifs from P3B-2B, allowing its future reuse for D19. It must look like a photo, not another big placeholder text card. No fully modeled family or expensive procedural portrait generator.
6. Don't change story times, voice, text, destination gate, existing P3B clips or earlier evidence. D33 remains a documented static gate placeholder until a later stage; do not misrepresent it as fully animated.

## Efficient execution — native stills first, then real motion only where it matters
- Draw scene once from existing setup D/E/A; inspect native 720×1280 WebGL keyframes for actual face identities (including 1,2,3,4,5,6), pin near sleeve, refusal pose, six near/six settled, and cut framing. No extra vanity stills.
- For D25/D26/D32 and possibly D28 use source-quality held frames; **do not render hundreds of nearly identical 3D frames.**
- Capture only bounded **short motion windows** for D27, D29, D30 and D31 (approximately <=6 seconds TOTAL of genuine newly captured motion, no whole-episode WebGL recapture). Use FFmpeg endpoint holds/match cuts within each fixed slot.
- **Integrate directly** into a fresh `evidence/dice-town-p4b1/working-edit.mp4` via a narrowly adapted P4A assembly script. Do not mutate/archive/overwrite `evidence/dice-town-p4a/working-edit.mp4`. Use the committed P4A film as the source for unchanged shot material where practical; never depend on untracked ignored render caches. Re-encode only the necessary small segments when possible. The final rough video stays360×640/30fps, 3513 decoded frames, exactly117.100s, silent.
- All 38 shot boundaries unchanged. The exact D25..D32 spans must appear as documented in a new 38-shot machine-readable edit map; explicit `proxy/still/endpoint_hold/motion` category for every frame. Do not claim seven substituted shots = finished episode.
- Source regressions, targeted die face/orientation/support tests, pin/sleeve and actor/hand framing checks, cold and reverse deterministic states, full FFmpeg decode and cut-boundary playback must pass.
- Produce one 390px visual-contact sheet for D25–D32, 2–3 native stills per critical moving state where necessary, brief report of actual rendering/encoding costs, resulting **proxy percentage**, and honest creative gaps.
- No external services, paid assets, new sound, narration, subtitles, new framework, full 720p master, 38-scene new render, new camera system or further polish of baker/mother.

## Creative acceptance gate
A muted-phone viewer should understand **five fair mornings pass**, Pip has an actual chance to interfere, he consciously refuses, and **six physically lands on top**. Adjacent shots should appear to share the same world/style. A bland static montage or ambiguous number swap is NOT creative PASS despite code tests.

**Stop and open one draft implementation PR based on `codex/dice-town-p4b1-finale-direction`** with evidence and source map. Do not merge or proceed to gate animation, D19 photo scene, or another batch automatically.
