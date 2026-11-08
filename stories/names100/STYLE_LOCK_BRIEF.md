# names100 — S1: three-set visual style lock
Status: **planning brief only**. Next task AFTER review/clean merge of PR #11. Objective: establish a distinctive, reusable **Roblox-like block-cinema** appearance before rendering the full 54.683s story.

## Intent
We now have working F1/P2 characters, deterministic scenes, the night bedroom (PR10) and dawn reunion/forgotten courtyard (PR11). Visuals still read as prototypes. Improve **composition, set depth, materials, purposeful props and lighting**, not engine complexity. Eli/Mara silhouettes, head, body pivots, timings, established expressions, outfits and approved evidence must survive. Zero stays at **global frame 1529**; Mara restoration **890–926**; counter 100→99 at **789**.

## Style rules (art direction)
- **Recognizably original block-game cinema:** broad rectangular limbs, simple curved face, practical stylized clothing; do not chase photorealism or download proprietary Roblox meshes.
- **Color script:** town/rule = muted cobalt and amber points; bedroom/ghost = moonlit blue-cyan with one clear warm personal accent; reunion/sunrise = warm apricot against cool shadows; Eli forgotten = selectively desaturated while the town stays warm. Preserve consistent material roughness, scale, outlines and exposure across sets.
- **Visual hierarchy:** one important story fact per shot. Visible eyes and facial expressions, foreground/midground/background separation, no busy props or high-contrast areas drawing the eye away from Eli, MARA or the counter.
- **Set dressing:** 2–4 story-relevant details per set, not random clutter. Bedroom reuse curtain/lamp/notebook. Town: reuse courtyard plus at most a few small modular façades, road/sidewalk, one distant lamp/sign if needed; not a whole generated city. Reunion: purposeful doorway, porch/stoop, silhouettes and sunrise light. Add depth by staging/camera before adding geometry.
- **Quality at phone size:** actual 360×640 keyframes must read with captions off, no illegible vital signage, cropped meaningful faces, exposed clipping, inconsistent shadow direction, flat ungrounded feet, or visual jump between shots.
- **No false upgrades:** avoid generic bloom, excessive fog, glossy materials, textures, lens effects or piles of props. Effects must support the mystery and readability.

## Three locations, four representative keyframes
1. **Opening town/rule**: a NEW small establishing still around global frame **35** (0–3.13s opening, not yet implemented); create minimum viable data-driven scene using existing courtyard or a few repeated façade modules. Showcase readable town depth and one on-screen motif of the 100-name rule. No full opening animation required.
2. **Bedroom/ghost**: existing V1 **global frame 700** (MARA tag / moonlit room). Keep timing, shot intent and tag.
3. **Reunion**: PR11 **global frame 1370** (warm courtyard, reunited people). Improve emotional framing and set depth; no new walking/embrace system.
4. **Forgotten Eli**: PR11 **global frame 1600** (lonely figure amid warm town); preserve contrast and meaning.

Review these as one **4-panel side-by-side contact sheet** against approved PR10/11 where existing comparable frames exist, plus optional one full-size 720×1280 STILL after 360×640 approval. The new opening has no old render, so label it NEW, not a fabricated before/after. Render genuine Three.js/WebGL only.

## Budget and technical gates
A. Inspect PR #11 tests, keyframes and changed source; merge only if clean. Create new branch from updated main.
B. Inspect only relevant art/set/camera/shot data, plus agent instructions. `STATUS.md` is lengthy historical evidence: don't dump/read entire file unless diagnosing a specific issue. Prefer the current PR reports and relevant test commands.
C. Build the **smallest reusable visual changes**, render four phone-size stills, review with one objective checklist: framing, atmosphere, emotional focus, identity, continuity, safe cropping. Allow one targeted correction if necessary. If stills cannot achieve a coherent look without major engine additions, mark PARTIAL and report design tradeoff.
D. Keep `LOOK_STYLE.md` to ~1 page with palette, material/lighting/camera rules, the approved comparison and stable asset references. Avoid a new visual framework or several sprawling docs. Run focused source/browser tests and affected regressions after changes; preserve established film hashes and exact counters.
E. Submit one PR with authentic contact sheet, brief evidence and cost; STOP before any episode-wide render or audio work.

## Explicit non-goals
No full opening/ending/54.7s film, town engine, asset marketplace, crowd physics, wardrobe expansion, voice/lip sync, subtitle burn-in, new render backend, complex shader stack or 720p VIDEO. Keep original 30fps global timeline; audio is user-supplied external WAV, so never claim sample-accurate sync without access. Avoid repeating dozens of historical verification runs unless changed code actually touches them.

## Next after style lock
1) prepare a **cheap complete 54.7s storyboard/low-res animatic**, using approved looks and existing shots; 2) inspect pacing/cuts against original WAV; 3) fix only failed shots; 4) one verified final-resolution render and separate audio mux/edit. Each is a later distinct task, not authorized here.
