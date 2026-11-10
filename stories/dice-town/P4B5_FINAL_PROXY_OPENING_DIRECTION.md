# Dice Town P4B-5 — Finish the Nine Opening/Investigation Proxy Shots

**Status:** Docs-only director brief, not an implementation. **Base:** PR #51 branch `codex/dice-town-p4b4-backstory-repair`. **Recommended Codex:** GPT-6.1 Sol, **Medium** effort. **Goal:** one final targeted proxy-replacement pass before native-HD planning, not more research/prototype loops.

## Why this is the next and final proxy batch
The latest source-verified `evidence/dice-town-p4b4/working-edit.mp4` is a complete **117.100s / 3513-frame / 360×640 / 30fps silent working edit**, with **784 original storyboard proxy frames / 22.317%**, all concentrated in exactly **nine shots**. Everything else is existing native-derived footage/held images. Existing PR #51 replaced D17–D22 and D24 with genuine **720×1280** sources; preserve those.

**Priority is correctness and continuity, not just lower proxy percentage.** The previous rushed 360p→1440p export with unrelated shot substitution was a release failure. Every new shot here must depict *its actual narration action*, with no giant schematic cards, borrowed ending shots or exposed world edges. No 1440p or 4K upscale.

## Locked timeline; nine end-exclusive source ranges

| Shot | Frames / duration | Directed story beat and visual |
|---|---|---|
| **D02** | [66,169) / 3.433s | Rule 3: levitation spreads across the plaza. Two distinct residents rise at staggered moments, shoes/legs clearly leaving paved ground; match D01 world color, die result=3 and sky. Frame mid-close with enough readable ground and silhouette, not the entire sparse street. |
| **D05** | [337,382) / 1.500s | Leo is pulled upward but **remains anchored** while a resident rises behind him. The rope line runs diagonally to a visible fixed tower post; don't imply Leo is magically exempt. No floating card. |
| **D06** | [382,504) / 4.067s | One crisp close-up explains the harness→taut rope→tower-ring physical connection; minor tension/settle in rope or torso, strong negative space. No rope through neck/head/face, no unattached endpoint. |
| **D07** | [504,631) / 4.233s | Leo's real paper notebook has a small visual contingency sketch for loss of gravity. Show hand/book relation and one eye or finger reaction, not a giant billboard. The notebook is kept **open**: D22 later lowers it and D38 closes it decisively. |
| **D08** | [631,693) / 2.067s | Rule 1 flashback: a cup or two **loose objects** rise while human feet remain planted. Existing baker stall/wall, angle tight. Die/result one is a native brief inset if physically visible, not a floating title. |
| **D09** | [693,742) / 1.633s | Rule 2 flashback: an actual short **backward walk** (feet and body translate backward with readable gait), one primary walker and optional second depth silhouette. Reuse explicit-time walk sampling; avoid a sliding mannequin. |
| **D10** | [742,793) / 1.700s | Rule 3 again: reuse a **different crop/endpoint** of the D02 lift motion and die=3, not new crowd animation. Confirm same characters and physical rule. |
| **D12** | [886,990) / 3.467s | Leo's notebook investigation: genuine page in a natural low close-up, tally marks and three nearly-six wobble sketches compared. Brief indication gesture/eyeline; no text-only board and no repeated whole-body pose. |
| **D14** | [1099,1220) / 4.033s | Leo locates a plausible service hatch under the established dais: reclip the existing tether to a hatch ring (visible), then one boot/shoulder vanishes below a properly grounded rim. The remaining descent occurs **offscreen** through the cut to D15. No full underground trip or rope simulation. |

## Production-source reuse already verified
- `production/dice-town-p2a/motion.js`: `sampleMotion` with staggered lift poses for multiple residents, explicit frame sampling. The existing 4s P2A proof and P3B4 world layouts provide the ground/die/sky language.
- `production/dice-town-p3b4/scene.js`: camera-bounded grounded **plaza A**, preserved sun/clouds, continuous pavement and consistent die scale. Reuse this as the D02/D05/D10 spatial look, or opt-in scene extension with the same camera and lighting. Don't refactor P3B4 source or rebuild a town.
- `production/dice-town-p3b3/scene.js`: camera-bounded baker market/stall, existing grounded wall/floor and ordinary cup-like small prop concepts. D08 is an independent flashback; don't change D03/D04 shoe evidence.
- `avatar/actions.js`: deterministic `sampleAction('walk',t, ...)` and `sampleWalk` are available. For D09 use a reversed **root travel direction**, not backwards playback with unplanned sliding; sample 30fps and check planted foot movement.
- `production/dice-town-animatic/scene.js`: current Leo teal jacket/hair/strap/notebook, plaza/tower layout, and skeletal mock tether; the old `buildStage` produces bogus tether/photo cards and must not become final image. `production/dice-town-p3b1/scene.js` provides another authentic small notebook asset and chamber/hatch ring reference.
- `stories/dice-town/P3A_SHOT_OPTIMIZATION.md` provides exact D02/D05–D10/D12/D14 strategy, and `P3A_FIX_AND_ASSET_PRIORITIES.md` specifies rope, notebook, world, collisions/overlap fixes.
- `evidence/dice-town-p4b4/edit-map.json`, current P4B4 incremental assembly scripts and `evidence/dice-town-p4b4/working-edit.mp4` are the authoritative source. Keep all 38 original frame boundaries and preserve all other shot pixels where possible.

## Camera, limited animation and visual language
- Camera-visible **only**: one or two real-world strips (plaza, market, clocktower/ring, notebook insert, hatch rim), not new large neighborhoods. Stay consistent with existing Roblox-inspired six-part rig, defined light and sky, foreground/background separation, no raw floor perimeter.
- Use 2D-inspired pose-to-pose, purposeful held poses, slight controlled push over genuine **native-source** overscan, close-up inserts, and short motion reuse. Every fixed shot must visually agree with narration and adjacent shots.
- **First do native 720×1280 WebGL keyframes** across all nine shots (critical initial/end states, contact and page readability). Then capture only meaningful motion, with initial **≤180–210 newly generated unique 30fps frames** distributed mainly across D02, D05, D06, D08, D09, and D14. D10 MUST reuse D02's animation; page/harness inserts can largely hold. If fewer frames genuinely achieve readable motion, don't exhaust the budget. If more are required for comprehension, document reason before expanding.
- No new general solver, animation framework, asset marketplace, full city, physics simulation, new parent/child character rig, new audio, crowd library, generic caption system, music or facials. This task should **finish the nine story shots**, not optimize everything else.

## Quality gates before integrated export
1. At ~390px phone width **with narration muted**, visual cause/effect must show: other people rise; Leo is restrained by a credible anchored tether; Leo plans it; rolls 1/2/3 differ; tally/near-six evidence is the clue; Leo reaches underground by a service hatch. No action should require storyboard card labels to make sense.
2. All line endpoints are affixed correctly. No tether through neck or face; no overlapping main limb/prop silhouettes, visible set seam, shoe-through-ground, notebook-through-torso, cup-through-stall, or hatch/floor penetration at examined key poses.
3. D14 rope reclip and descent visually connect the plaza A world and existing D15 chamber; no impossible long-rope physical continuity claims. D08 people stay planted while cup(s) float; D09 walker actually walks backward; D10 result 3 matches D02; D12 notebook contrasts D07 without closing.
4. Preserve native actor/prop identities, cold browser and reverse explicit-time repeatability, scripted geometry checks and existing regressions.
5. **Export one new COMPLETE 117.100s/3513-frame/360×640/30fps silent rough edit** (H.264/yuv420p) and a fresh 38-shot exact source/hold/proxy/motion map. If all nine proxies are fully replaced, `proxy=0`; still and holds remain honestly classified. All 2729 old unchanged frames preserved pixel-for-pixel where feasible. If not, explain exact differences.
6. Genuine source images and motion clips must be retained for later **native HD assembly**; never consider the new 360p assembled movie a source for final HD. Retain uncompressed/source-quality poses, videos, render recipes and source metadata. The final HD task is separate.
7. Deliver a concise D02/D05–D14 phone storyboard, 720p native keyframes, key action contact sheet, targeted geometry and deterministic tests, full edit decode/playback and measured capture/encoding costs. Label creative partial issues; do not equate `proxy=0` with artistic completion.

## Stop / PR contract
Open **one draft implementation PR targeting `codex/dice-town-p4b5-opening-direction`**, with new source media and `evidence/dice-town-p4b5/working-edit.mp4` plus edit-map, coverage and report. **Do not merge**, use the private ElevenLabs WAV (already sped **1.25×**), generate captions/SFX, or create another final-resolution export yet. Stop for human creative review.

**Next production gate after P4B5 (not authorized here):** a small actual-native 1080×1920 render benchmark for representative shots (opening levitation, mechanism, mother/home), and an audit of source-resolution availability for all 38 shots. Only then assemble the **real native-HD** episode from original Three.js renders/high-quality source stills with matching narration/captions/sound. Never upscale the committed 360p rough edit and label it native HD.
