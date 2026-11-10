# Dice Town P4B-4 — Pip's Secret, Family, and Choice Setup (Integrated Middle-Scene Direction)

**Status:** Creative/technical direction only. This branch makes no video, source or asset changes.
**Base:** PR #49 at `codex/dice-town-p4b3-ending-integration`.
**Recommended Codex:** **GPT-6.1 Sol, Medium effort**. Creative work and editorial prioritization are done here; Codex should inspect source and implement the bounded work, not redesign the story.
**Deliverable:** One **new 117.100s silent 38-shot working edit**, exact 3513 output frames, **360×640, 30fps**, with seven specific middle-story proxies replaced by genuine native-source stills or minimal authored movement. Do NOT author another disconnected proof only.

## Story context and continuity invariants

- The complete ElevenLabs Adam narration is privately held, **117.098231s and already 1.25×**. No audio, TTS, voice, script, subtitle or timing changes.
- Current base: `evidence/dice-town-p4b3/working-edit.mp4` + `edit-map.json`; **1434 proxy frames / 40.8198%** remain. All 38 shot boundaries are end-exclusive source-30fps indices and must be preserved.
- Seven proxies addressed here total **650 frames = 21.6667s**. If entirely replaced, remaining proxy would be **784 / 3513 = 22.317%**. D23 remains a verified existing 132-frame handoff, not part of those 650.
- This section establishes: Pip is the child mayor, the town stopped aging thirty years ago, his family outside kept aging, he fears the opened gate, and Leo for the first time lacks an answer. Then D23 hands Pip agency; D24 must visually honor his possession of the same pin.
- **Do not overcomplicate age/time logic:** Pip's old photo depicts his family *then*, whereas the newer mother seen at D35–D37 is *now*. Pip cannot possess a photograph from the future. Any then/now juxtaposition is a cinematic cutaway, not a magical photograph that physically changes in Pip's hand.
- **The end motif matters:** D22 shows Leo speechless/uncertain with his notebook still in hand; do NOT have him permanently close it here. His final, decisive notebook closure belongs to D38. A lowered book or an interrupted page gesture at D22 is appropriate.

## Existing reusable repository assets checked

- `production/dice-town-p3b1/scene.js`: existing chamber/coupled crank, child-scale russet Pip, teal Leo, rigid arm and head pivots, notebook prop, reusable cameras. Existing D23 footage/pin handoff is correct and remains untouched.
- `production/dice-town-p4b1/photo.js`: `makeFamilyPhoto()` already creates a 256×256 flat framed family/photo motif (mother/child, cream V/rust cues). `production/dice-town-p4b1/scene.js` mounts it in chamber for D27/D30. **Reuse or carefully derive from this canonical motif; no independent replacement/photo redesign that breaks D27/D30.** The current motif already uses gray hair — treat color/aging cue conservatively, using later live-action mother comparison and costume/door/chair identity rather than altering existing parent footage.
- P3B2B approved older mother/child performance and `evidence/dice-town-p3b2b/recognition.mp4`, native stills (D35); matching mother close `evidence/dice-town-p4b3/mother-close.png`. D36 preserved chair source image and repeated visible detail.
- `production/dice-town-p3b4/scene.js`: grounded installed **closed gate** and continuing road, reusable camera-visible setup G. No new gate needed; D33 opening action remains unchanged.
- `scripts/dice-town-p4b3-assemble.py` / P4B3 source map and checks: established incremental edit. Reuse this pattern without rewriting base renderer/38-shot pipeline.

## Exact shot directions

| Shot | Frame range (end-exclusive) | Narrative job and low-cost visual direction |
|---|---|---|
| **D17** | [1442,1495), 53f | After mechanism reveal D16, show child Pip at the **existing crank** with at least one block hand genuinely at handle height. Small guilty glance toward Leo/camera and brief frozen realization; no floating explanatory text. The child's proportion must be apparent. |
| **D18** | [1495,1590), 95f | Pip still a child despite decades; hold him with an old photo *below face* and a short downcast glance. One clear visual age-freeze cue through juxtaposition with a well-matched earlier family image. Don't hide him behind photo panels or create a time machine. |
| **D19** | [1590,1710), 120f | **Cinematic then/now**: old family photo with child Pip and mother's consistent identity, then a source-faithful *present-day older mother* image (from P3B2B, optionally framed through the same house doorway/chair motif). Use 2D pans/crops/match cuts across native-quality images, no new 3D mother acting. Present-time picture is an editorial cutaway **outside** Pip's possession. Let the viewer recognize the person in both images; preserve same clothing silhouette or chair detail where plausible without fabricating a new family cast. |
| **D20** | [1710,1768), 58f | Pip gently brings **the original old photograph** closer and studies it. Photograph must not penetrate face/arm or occupy the whole frame. Small prop tilt and head/eyeline action, no finger rig. |
| **D21** | [1768,1905), 137f | Pip's fear of six opening the gate: use the *existing grounded closed-gate native still* as one brief motivated insert (gate/road horizon in correct geography) intercut with restrained worried Pip reaction. No non-existent floating gate panel or new VFX; the gate remains closed. The film is narrating a feared consequence, NOT showing it actually opening yet. |
| **D22** | [1905,1997), 92f | Leo cannot answer. Medium-close Leo, real notebook in hand, glance from Pip toward notebook; his shoulders settle and he **lowers or stops writing**. Keep notebook open or partly open, reserving the distinct final closure for D38. Avoid repeated label card and large sigh gesture. |
| **D23** | [1997,2129), 132f | **Do not change.** Already integrated P3B1 real pin handoff. Check adjacency/cut style only. |
| **D24** | [2129,2224), 95f | Start from D23 **received pin** appearance: child Pip has that **same brass pin** in one hand, recognizably separate from the machine; Leo leaves beyond frame or passes behind foreground as an editorial implication. End on Pip alone with the responsibility, before fair-morning montage begins at D25. No new full-body walking track. |

## Limited-animation direction: visual quality > token or frame count

- Prefer **camera-visible close-ups and inserts**, small head/shoulder/rigid-palm pose-to-pose actions, and subtle native-source still crops; borrow 2D animation methods *only when the screen is still visually alive* (eyelines, focus, gentle zoom, meaningful cut).
- Seven shot slots span ~22 seconds. Do not render hundreds of generic inbetween frames. **Initial unique WebGL motion budget ≤90 captured frames total** (~3 seconds) across D17/D18/D20/D21/D22/D24, shared where possible. D19 may use 2D edits of approved native evidence, 0 new WebGL motion. Source-quality held boards okay only when narration/visual action warrants them; do not make six static near-identical face images.
- Native 720×1280 WebGL **keyframes first**: child at crank, Pip/photo, photo in hand, Pip worried, Leo notebook uncertain, Pip pin after handoff. An original high-resolution *historical photo* can be rendered to an image plane in existing scene if required; no paid media/illustration generation.
- New source media may be grouped into a compact reusable archive. Use FFmpeg for paced still holds, native-source crops, and exact fixed editorial slot construction. Do not increase scope with crowd acting, an age-change shader, lip-sync, hand rig, new family cast, full home remodeling, 30-years animation, or unrelated art enhancement.
- If the photo's existing gray accents create a visible continuity contradiction, **identify it in report and correct only the new D18–D20 cutaway/source** without modifying committed D27/D30 or old source assets. A clear editorial then/now contrast is the goal; don't secretly revise canonical earlier footage.
- **Distinguish old vs current** through image framing, weathered paper vs warm live-action doorway, and matching features; no giant caption `BEFORE / AFTER`, missing-background card, or text-only narrative.

## Technical acceptance and reassembly

1. Create `evidence/dice-town-p4b4/working-edit.mp4`, **3513 decoded frames, 360×640,30fps, H.264/yuv420p, exactly117.100s silent**, preserving all **38 original cut starts/ends**. Keep existing P4B3 movie and all previous evidence intact.
2. Build a new **38-shot source map** with source/hold/motion/old-proxy categories. Mark retained placeholders honestly, quantify remaining proxy and held coverage by frames; **do not equate proxy reduction with finished animation**.
3. Only shot slots **D17–D22 and D24** may change. D23, D25–D38 (including fair six, legal D28, gate, mother and final notebook) must be pixel-preserved when possible; preserve all other shots including D15/D16. For any unavoidable remux differences, explicitly disclose and verify decoded source matches.
4. Phone-width **390px panel** showing D17–D24 narrative continuity in sequence, with real images (no synthetic stand-ins), plus a small contact sheet and concise `REPORT.md` on actual capture/encoding costs and creative limitations.
5. Verify child's scale/identity and hand-crank fit, photo framing/clipping, borrowed older-mother visual identity, gate closed in D21, original pin transfer/source identity D23→D24, Leo's notebook does **not** close decisively at D22, and reverse-seek deterministic key poses.
6. Run focused geometry/frame checks, relevant prior Dice Town regressions, complete FFmpeg decode, actual browser playback at revised cuts, and frame preservation/old source identity checks. Report any visible lip/face limitations rather than overbuilding.
7. Do NOT use the original private Adam WAV (it is already 1.25×). No new audio, captions, soundtrack, 720p full movie, new animation framework, editing 38 scenes, or branch merge.

## Creative acceptance criterion
Muted at390px: **Pip is plainly a child who has endured thirty years in the town; the family outside has aged; Pip's fear of returning is emotionally understandable; Leo has no reassuring answer; after D23, Pip ends with the pin and the decision.** If a viewer cannot distinguish young mother/older mother or see the pin exchange continuity, the result is creative PARTIAL regardless of passing tests.

## Stop condition
Create one **draft implementation PR targeting `codex/dice-town-p4b4-backstory-direction`**. Return the full updated working edit, native/phone review evidence, 38-shot edit map, tests and cost report. Do not merge or start another batch.
