# Codex task — names100 central reveal proof

## Context
Project: `NeatKnight18586/blox_story`. Read `stories/names100/VOICE_CUES.md` and `stories/names100/STORYBOARD.md`. The ElevenLabs narration is **54.682993 seconds**; it was provided in ChatGPT, not uploaded to GitHub. Story visuals have 1,641 frame slots at 30fps.

## Preflight
Review open **PR #8** (P2A), rerun relevant F1/F2/P1/P2A tests and real browser evidence; if all pass, merge PR #8 into main, preserving its commits and old film hashes. If blocked, stop rather than starting on outdated source.

## Task — a bounded scene proof, not the whole movie
On a new branch implement only a **timed, silent, low-resolution vertical animatic covering the global narration window 16.07–31.50 seconds**. This is the story's central twist: Eli sees ghosts beyond his bedroom window, one holds a readable faded `MARA` tag, Eli leans forward and whispers her name (25.84–26.28s), his counter drops from **100 to 99 no earlier than frame 789 (26.30s)**, and Mara becomes human during 29.63–30.92s.

Use frame-accurate **global** timing. Local prototype frames must map explicitly to global narration frame numbers. Use the existing P1 resumable render, P2A two-character casting, existing canonical classic/tapered bodies, expressions and actions. Add only the minimal reusable set/prop/event parts necessary: small bedroom/wall/window/hinged door, translucent ghost treatment, name tag and readable numerical counter, and constrained lean/reach/reaction cues if current pivots permit. Keep each animation/event stateless at sampled frame t. Do NOT attempt 100 live ghost characters; background silhouettes suffice.

## Verify
- Story-facing quality: name tag and `100→99` legible at mobile size; identity/face/layers intact; eerie → warm transformation visible; ghost must NOT become human before the spoken name; clear shot geography and emotional reveal.
- Technical quality: strict deterministic frame seeks, no state carryover, no severe clipping, six-part avatar unaffected, valid 9:16 preview, intact F1/F2/P1/P2A tests and old movie hashes.
- First use economical **360×640, 15fps** if supported by the existing shot system. Only after inspection is satisfactory, optionally render 720×1280/30fps **for this slice**, NOT the full episode. Record CPU time, peak memory, and disk bytes. Preserve source frames outside Git, keep a compact contact sheet/GIF or MP4 preview.
- Keep narration audio separate; don't create ElevenLabs voice or lip sync or final synchronized soundtrack. This task tests visuals only.

## Deliverable
Document new reusable modules, scene-specific shot data, global-to-local frame mapping, test evidence, before/after visual frames, expected creative limitations and one focused recommendation. Submit PR. State PASS/PARTIAL/FAIL for **this scene proof only**, stop for visual review. Do not develop the entire town/crowd engine, full script-driven scene generator or extra future feature stages.
