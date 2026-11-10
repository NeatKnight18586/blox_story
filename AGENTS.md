# AGENTS.md — blox_story studio rules (Studio V2)

## Source of truth
Read in order: `docs/CLAUDE_START_HERE.md` (handoff branch), `studio/STYLE_BIBLE.md`, `studio/HIGGSFIELD.md`, then STATUS.md (top entry) and the code. F1_SPEC.md still governs the six-part avatar contract. STATUS.md controls what has actually been verified. Older names100/S5 and per-stage Dice Town task boundaries are historical.

## Goal
A durable, original, Roblox-inspired 3D Shorts studio: one modular master character (Leo, Pip, Mother presets), a small modular town kit, reusable actions/camera presets, and native 1080×1920/30fps rendering, all reproducible from a clean checkout with no paid service. Story in production: Dice Town / The Sixth Roll (38 shots, 117.100s locked narration timing).

## Current stage
Studio V2 stages 1 (look), 2 (classic Roblox-style cast, hair options) and 3 (town kit v1, `studio/town/`) are done and awaiting the owner's visual review. Next stage after approval: the 8–15s native 1080p animated sequence. Stop after each stage for review.

## Hard rules
- Opt-in only: new looks/assets layer over existing scenes; legacy renders must stay pixel-identical with them off. Never rewrite the engine or merge the stacked PR branches blindly.
- Keep deterministic `applyPose(avatar,poseName,t)`, persistent root, named pivots, cached faces/cosmetics; no mesh regeneration on pose/face/cosmetic switch.
- Native resolution only: never upscale 360p/720p output and call it 1080p. Never substitute unrelated footage for a missing shot.
- Characters stay code-built six-part rigs. Generated meshes may be used only for static props, each approved by the owner, downloaded, validated in Three.js, and recorded with source, licence and hash.
- Higgsfield: no credit spend without the owner's explicit approval of the exact model and cost. The repo must never depend on it.
- Private narration (ElevenLabs Adam WAV, already 1.25×) stays outside Git; never re-time or regenerate it.
- Owner is iPad-first: no manual modelling, recording or installs on their side.

## Test before calling it done
- `npm test` (existing suite) passes; new code has a real browser capture, not mocks.
- Visual evidence: native PNGs, an old-vs-new sheet, and a 390px phone sheet, reviewed by eye. Numeric gates (`studio/qa/color_metrics.py`) support but never replace review.
- Report PASS only for genuinely completed checks; otherwise PARTIAL/FAIL with the reason and the next blocker. Record render times per frame.

## Tooling notes
- Browser: repo pins Playwright 1.56.1; studio scripts use `/opt/pw-browsers/chromium` when present (override with `PW_CHROMIUM`).
- Rebuild all studio evidence: `npm run proof:studio && npm run proof:town`; tests: `npm run test:studio`.
