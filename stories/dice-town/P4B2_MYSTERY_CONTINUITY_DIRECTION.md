# Dice Town P4B-2 — Mystery Continuity + D28 Fair-Die Repair

**Status:** Directed implementation brief only; no code or media generated in this documentation PR.
**Base:** PR #45 / `codex/dice-town-p4b1-sixth-roll`.
**Recommended Codex:** **GPT-6.1 Sol · Medium effort**. Avoid Astra and High; the art/mechanics and edit decisions below are already specified.

## The purpose, not a new prototype
Upgrade **three high-value remaining proxy shots D11, D13, D16** in the *existing full 117.100s rough edit* and correct **D28's known impossible adjacent die faces**. This proves the central mystery: the die tends toward six, something mechanically knocks it aside, and Leo later discovers the culprit.

Existing P4B1 is technically validated, but its old D28 shows **5 on top with 2 adjacent**, impossible because the newly built standard die has opposite pairs **1/6, 2/5, 3/4**. Fix this in the same batch. Do not edit history or overwrite previous evidence.

### Exact authoritative source frames and story function
| Shot | End-exclusive frames | Purpose |
|---|---|---|
| **D11** | [793,886) (26.433–29.533s) | A six-bearing face almost reaches the top, but a suspicious sideways wobble deflects the die. Viewer sees something unnatural, **not the hidden mechanism yet**. |
| **D13** | [990,1099) (33.000–36.633s) | Repeat exactly the same deflection signature, now from an intentional tighter camera/insert. Brief brass tip near the support implies the hidden cause; preserve mystery. |
| **D16** | [1332,1442) (44.400–48.067s) | Cause-and-effect payoff: crank turns -> coupled paddle taps die -> identical deflection seen earlier. The existing adjacent D15 mechanism reveal [1220,1332) remains unchanged. |
| **D28** | [2585,2669) (86.167–88.967s) | Single **corrected** sixth-sunrise native still: previous morning's result **5** upright, but adjacent faces must obey the complete fair die. Preserve sunrise, camera-visible world, approximate framing, and Leo as appropriate. |

Original narration **117.098231 seconds**, already sped to 1.25×; PRIVATE and not in GitHub. DO NOT request, regenerate, mux, stretch or modify. All **38** original shot boundaries and final **3513 frames / 30fps / 360×640 / 117.100s** unchanged; final output silent.

## Existing implementation to reuse, confirmed in code
- `production/dice-town-p4b1/die.js`: `makeDie`, `FACE_NORMALS`, `topQuaternion`, `supportY`, `rollingTransform`. Reuse *actual all-faced die* with pips bound to mesh surfaces, same approved **6.3-unit** die, ivory material and top support; no fake top-face text or pip swaps.
- `production/dice-town-p4b1/scene.js`: imports P3B4 grounded plaza, exposes actual complete die and rendering camera. May add a **small opt-in mystery-shot helper**; no shared renderer rewrite.
- `production/dice-town-p3b1/scene.js`: actual coupled brass paddle/crank/pin, with prior 48-frame mechanism proof `evidence/dice-town-p3b1/mechanism.mp4`. D15 already uses this proof. D16 may repurpose selected frames/native stills and a **tighter causal crop** of the existing proof; avoid recapturing identical full machinery from scratch.
- `scripts/dice-town-p4b1-assemble.py`, `evidence/dice-town-p4b1/edit-map.json`, and existing P4A verification are already available for incremental editing. Edit new source selection only for D11, D13, D16, D28; preserve all other 3513-frame slots from committed P4B1.
- `stories/dice-town/P3A_SHOT_OPTIMIZATION.md`: established direction for D11/D13/D16, tight die/underside/mechanism inserts, consistent deflection axis, no generic physics or expensive full toss.

## Directing: exactly what must appear
**D11:** Three readable phases: near-six *approach*, sharply recognizable **unexpected kick**, then die finishes on a legal **non-six** face. The die remains supported, no levitating cube or instant pip substitution. Near-six is a tilted six-bearing face; do not show a settled upper six before the finale. Camera sees a die corner/support and enough of the surrounding plaza to read scale; no empty island or giant label. Use one brief authored motion (about 1–1.5s) with strong pose-to-pose timing and endpoint holds to fill the locked slot.

**D13:** Reuse the **same underlying wobble** rather than creating a second unrelated animation. Change editorial attention with a close insert of the side/support; a brief realistic brass tip or paddle-edge highlight is visible where the kick begins, but the control system is not revealed until D15–D16. A short native still plus repositioned/cropped portion of the already recorded wobble is acceptable if the matching die orientation and contact direction remain understandable. Prefer an edit/crop to a second unique 3D animation.

**D16:** D15 has already introduced the coupled paddle. Use a tighter view on the existing **crank -> paddle -> die** movement, with a deliberate cut on contact and the matching direction of die deflection. May reuse existing `mechanism.mp4` or its native proof assets when visually sufficient. No need to animate a new mechanism, change the pin or simulate forces. If these inherited angles physically contradict the D11/D13 shot, use only a *tiny, bounded cutaway* and explicitly document what is implied offscreen; do not pretend they share an exact verified 3D trajectory.

**D28:** Render one original **720×1280 native WebGL still** with the P4B1 canonical complete die oriented to **5 upright** and correctly showing adjacent non-2 side faces; reuse the P3B4 grounded plaza and sunrise camera. Do not modify the old P3B4 source or previous P4A/P4B1 files. Add an opt-in composition where needed. No new clock/weather system or extra character performance. This should cut naturally after D26's fifth-morning 5 and before the implied beginning of D29's fair roll.

## Efficiency: bounded actual work
1. First inspect native WebGL **key poses**: D11 approach/kick/non-six outcome; D13 brass clue; D16 visible linkage/contact crop if reused; D28 legal 5-up. Check phone-width 390px panels for readable hierarchy before recording motion.
2. New WebGL animation budget **at most 45–60 unique low-res frames total** (1.5–2s). Reuse that one wobble motion for both mystery shots; existing D15 proof supplies the machinery. If this budget proves technically inadequate, state the smallest necessary overage and why before expanding scope.
3. Use FFmpeg still holds, source-quality crops and packet-copy of unchanged footage. No full 117s WebGL recapture, no full 720p movie, no new generic compositor framework and no paid software. Prefer partial repair of current `scripts/dice-town-p4b1-assemble.py` pattern; don't replan the 38-shot film.
4. Deliver one **new full-length silent** `evidence/dice-town-p4b2/working-edit.mp4` with 3513 verified frames and all 38 unchanged cut boundaries, plus a complete updated 38-shot source map/coverage by frame and a small phone contact sheet for D11/D13/D16/D28.
5. Required checks: physical face orientations and support under actual rotated die, no critical geometry penetration in new poses, brass kick/deflection order, native and low-res deterministic reverse seeking, legible D28 5-up adjacency, FFprobe/full decode/browser playback, original source regressions and preservation of all prior evidence.
6. Report **remaining original proxy percentage**, real newly authored WebGL frames, actual measured render/FFmpeg costs, and honest creative issues. Do not declare final creative PASS based only on test success.

## Expected measurable reduction
P4B1 currently has **1896 proxy frames / 53.971%**. Replacing D11(93)+D13(109)+D16(110) removes **312 proxy frames**, leaving **1584/3513 = 45.090%** *if all three are fully replaced*. D28 already counts as a still; correcting it does not lower proxy share. Held/still content remains non-final motion. Do not claim more progress than the final edit map proves.

## Out of scope; stop condition
Do NOT touch D01–D10, D12, D14–D15, D17–D27, D29–D38, prior P3B scene evidence, private audio, soundtrack, subtitles, global rig, new weather, full cinematic village, giant final render or release packaging. No auto-merge.

Create a **draft implementation PR targeting `codex/dice-town-p4b2-wobble-direction`**; provide actual native/phone evidence and updated working edit, then stop for review.
