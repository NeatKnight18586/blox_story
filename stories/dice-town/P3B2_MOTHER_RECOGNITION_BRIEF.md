# P3B-2 — D35 Mother Recognition: Directed Implementation Brief

**Status:** Art-direction specification only. No assets, animations, MP4s or merges are authorized by this document alone.
**Base:** PR #33 / `codex/dice-town-p3b1-mechanism-pin`. Work on a new implementation branch from `codex/dice-town-p3b2-direction`.
**Model / effort when implementing:** GPT-6.1 Sol, Medium.
**Source timeline:** D35 global source frames [3090,3230) at 30 fps = 103.000–107.667s. D36 [3230,3344) = 107.667–111.467s. D37 [3344,3389). Preserve these boundaries and the existing 1.25× narration. The initial proof may be a shorter local motion window, not a retimed final film.

## Actual capabilities already inspected
- `production/dice-town-animatic/scene.js` already has a child-size Pip (`scale=.65`, rust torso), an adult-size mother (`scale=1`, purple torso and `low_bun` hair) and a rudimentary doorway/chair setup. Those boards are intentionally placeholders, not final acting.
- `avatar/baseAvatar.js` has the six-part avatar with `head`, `leftShoulder`, `rightShoulder`, `leftHip`, `rightHip` pivots. No elbow, fingers or full facial rig.
- `appearance/faces.js` and `appearance/expressions.js` expose reusable `nervous`, `startled`, `thoughtful`, `relieved`, etc. These are static cached expression assets, not proof of a smooth interpolation engine.
- `production/dice-town-p3b1/` is an isolated D15/D23 proof; leave mechanism/pin implementation and evidence intact.

## The one scene to direct
Viewer sees **young Pip returning to an older mother who recognizes him**. Narration communicates the story; the muted pictures must make recognition intuitively legible. The mood is warmth and relief, not slapstick, broad arm-flailing or a generic permanent smile.

### Camera and staging
1. Start with one over-Pip-shoulder composition. Pip's smaller head/shoulder creates foreground scale, mother fills the open doorway beyond. Establish a tangible jamb, wall return, continuous floor and threshold; no bare floating platform, visible cut edges, detached door panel or giant explanatory label.
2. Use a medium-close framing where both mother's eyes and Pip's silhouette read at roughly 390px phone width. Keep both actors' positions and the door axis consistent throughout; use a tighter crop if necessary, not a larger house.
3. Mother's head/eyes must aim at Pip's actual eye level. Show different scales without changing the original rig. Avoid one body obscuring another or the jamb cutting through the gesture.

### Pose-to-pose acting (within approximately 3–4s of local proof)
- **Anticipation:** mother notices a small child at the threshold; resting/uncertain expression. Her reach begins *after* recognition, not before.
- **Recognition:** a small, unmistakable eye/head focus change; a slight breath/head pause; expression softens into relief. Don't swap from neutral to a broad grin in one visible pop.
- **Response:** slight step/lean or shoulder release and one restrained reaching-arm motion to invite Pip forward. The arm stays clear of her head, door and Pip, and may stop short: don't build a hug.
- Include a held emotional beat, but keep micro-actions and lighting consistent; no blink/lip-sync system or redundant animation loops.
- Choose exact durations after inspecting poses. Favor animation from `frame/30` with smooth easing and repeatable reverse seeks.

### Age/identity and environment
- Keep Pip child-scale with the established rust palette.
- Reuse mother's adult-scale rig and `low_bun` rather than generating new characters. Add only a restrained age cue **if visually necessary at phone size** (e.g., a subtle graying section of hair) and ensure her look is compatible with the younger family photograph in D19. Avoid heavy wrinkles, exaggeration or a new hair/skin system.
- Use existing material and lighting language, with gentle warm interior light contrasted against the doorway. Do not overexpose faces or add post-processing frameworks.
- D36 **one native still only:** same household orientation, recognizable small yellow childhood chair beside a table edge, repainted wall with a modest visible old-color patch behind the chair, skirting/floor continuous. The chair must look intentionally preserved, not like a loose object on an empty floor. Don't animate the whole kitchen or implement D37.

## Production economy and acceptance
- First inspect a **few native keyframes**: anticipation, recognition, response and the D36 chair. Correct composition and silhouette before capturing a motion clip.
- Deliver **one 360×640, 30fps silent WebGL motion proof of about 3–4 seconds** for D35, and native 720×1280 keyframes/still(s). Keep it a local proof; no need to render all D35/D36 editorial frames or the full episode.
- Provide a 390px comparison/review sheet and a concise `REPORT.md`: what changed, source reuse, sample frame times, model/render cost if measured, limitations, relevant regression results.
- Verify actual decoded output, frame containment of faces and intentional reaching hand, no visible intersections in key poses, persistent avatar/face geometry when practical, explicit-time reverse seek determinism, and preservation of earlier source/evidence.
- **Creative pass only if:** (a) small child versus older mother clear, (b) uncertainty → recognition → welcoming gesture legible muted at phone width, (c) doorway/home looks grounded, (d) chair cues match shot continuity, (e) no new conspicuous intersections, or overly broad smile.
- If existing expressions cannot communicate the change: perform **one limited, local appearance/pose change** compatible with the current facial system. Do not rebuild the avatar or create a global face framework.

## Hard scope boundaries
No full episode, audio, captions, speech generation, lip-sync, mother/child hug, second adult, new family character library, detailed house interior, generic shot editor, broad renderer refactor or history merge. Keep eight-setup P3A plan, 38-shot timing, the 117.098s narration, and original P3B-1 work unchanged. Build **only D35 motion plus D36 native reference still**. New PR should target this specification branch; stop after evidence review.
