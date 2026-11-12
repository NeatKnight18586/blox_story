# AGENTS.md — blox_story studio rules (Studio V2)

## Source of truth
Read in order: `docs/CLAUDE_START_HERE.md` (handoff branch), `studio/STYLE_BIBLE.md`, `studio/HIGGSFIELD.md`, then STATUS.md (top entry) and the code. F1_SPEC.md still governs the six-part avatar contract. STATUS.md controls what has actually been verified. Older names100/S5 and per-stage Dice Town task boundaries are historical.

## Goal
A durable, original, Roblox-inspired 3D Shorts studio: one modular master rig with a new cast of presets every episode, a small modular town kit, reusable actions/camera presets, and native 1080×1920/30fps rendering, all reproducible from a clean checkout with no paid service. Episode 1: Dice Town / The Sixth Roll (done). Episode 2 in production: Shortwick (`stories/shortwick/SCRIPT.md`).

## Current stage
Dice Town: finished; the owner handles its final mix. Episode 2 **Shortwick** is in production on the Studio V3 director toolkit (`studio/director/`, `production/episode/?ep=shortwick`, `stories/shortwick/episode.js`). Workflow is **voice-over first**: the owner sends the ElevenLabs WAV, `scripts/episode-align.py` writes `stories/<ep>/word-timings.json`, and shots are anchored to spoken phrases. Tools: `scripts/episode-preview.js` (low-res sheet + lint), `scripts/episode-render.js` (per-shot cache, self-healing workers, `--max-minutes`), `scripts/episode-audit.js` (every-frame physical QA: must report 0 issues before a full render), `scripts/episode-captions.py` (Montserrat ExtraBold 68 px), `scripts/episode-finish.py` (encode + verify; review file with voice never committed). No sound effects (owner decision 2026-11-12). Studio V3 look is opt-in per preset (`body`, `hd`, `hairLocks`) and per episode (`look.ao`, `setSurfaceDetail('hd')`); keep render workers inside GPU memory (~1.5 GB textures/worker on this 15 GB box). New cast every episode. Episodes 2:00–2:30, always native 1080×1920. Commit only master, contact sheet, verification and spec per episode.

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
