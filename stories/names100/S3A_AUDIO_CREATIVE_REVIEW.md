# names100 — S3A: narration-timed creative audit (review-only)
**Status: scoped execution brief, NOT implemented.** After review/merge of PR #13. This phase diagnoses storytelling; it does not expand the engine or render a new full-resolution video.

## Why
S2 proves 23-shot visual coverage at 180×320/15fps but does not prove engagement, narration pacing or performance. The current contact board shows similar-looking close-ups S04–S06 and similar family tableaux S18–S21. Do not equate 821 deterministic frames with creative approval.

## Source-of-truth
- Repo `NeatKnight18586/blox_story`; branch PR13 `codex/names100-s2-roughcut`.
- Canonical story/sounds: `stories/names100/VOICE_CUES.md`, `STORYBOARD.md`, `roughcut.json`, `LOOK_STYLE.md`. 
- Actual ElevenLabs narration `ADAM 1.WAV` was uploaded in the user's ChatGPT conversation, NOT in the GitHub repository/Codex environment. Treat it as unavailable until explicitly provided to Codex. Do not regenerate or modify the voice.
- Original WAV length approximately **54.682993 s**. Native story clock 1641 frames at 30fps = 54.700s (17ms native pad). Existing rough MP4 has 821 frames/15fps =54.73333s (50ms after WAV), because sampled draft includes last-frame hold. **Retain absolute cuts**, do not retime voice to video.
- Protected events: Eli 100→99 global frame789; Mara recovery890–926; 0 at1529; countdown≥1210/1236/1261/1278. The draft samples at even native frames. Labels must never appear early.

## Task — one bounded review only
1. **Preflight**: review PR13 source/actual rough MP4/board/verification summary. Re-run appropriate targeted tests and merge only if clean; preserve history and eight old film hashes. Start S3A branch from merged main.
2. **Audio if available**: When original `ADAM 1.WAV` is present as a local input, use FFmpeg to make a separate **audio-synchronized REVIEW MP4** from the existing S2 silent film; start voice at t=0, never time-stretch/re-synthesize the WAV. Keep original film and WAV unchanged; exact frame count may contain an extra 50ms silent tail, report this. Use deterministic command/config and validate codec, stream start timestamps, audio/video duration, 23 cuts and playback. Keep original WAV outside Git and outside committed media artifacts if licensing/privacy or repo bloat; optionally store review artifacts as transient task outputs.
3. **Audio if unavailable**: Do NOT claim audio alignment. Produce a text-only editing decision list with the best-effort timestamp cues. Mark audio creative review BLOCKED. Never infer phoneme-accurate timing from the cue document.
4. **Watch/listen with intent** (only if actual audio present) and create a compact **23-shot issue ledger**, ranked HIGH/MEDIUM/LOW. Rank subjective pacing, visual legibility and acting before decorative detail.
   - **S01–03 (0–8.6s):** Does the 100-name hook read immediately? Does anonymous resident counting look like an intuitive rule demonstration, not Eli already spending his own names?
   - **S04–06 (8.6–16.1s):** Similar Eli close-ups—does shyness appear as an action (avoiding names/eye contact), not three near-identical poses?
   - **S07–09 (16.1–24s):** Do ghosts, window geography and MARA name tag stay legible without repetitive framing?
   - **S11–13 (25.6–31.3s):** Keep protected name, count and transformation beats, clear emotional turn.
   - **S16–17 (36.5–43.2s):** Clear evidence Eli's naming restores others; 52/18/3/1 aligned.
   - **S18–21 (43.2–49.7s):** Repetitive reunion tableau is the most obvious emotional weakness—specific shot changes, not a new hug/run engine.
   - **S22–23 (49.7–54.7s):** Eli's identity loss must linger; he remains present while the town ignores him.
5. **Deliverable:** `stories/names100/S3A_ISSUE_LEDGER.md` with per-shot timestamp, impact, exact visual change, priority, reuse/new asset estimate. Recommend **no more than 3 high-value fixes** for the subsequent S3B task. Include simple PASS/PARTIAL/FAIL for technical timing and separate creative verdict. Do not implement S3B or render a new 821-frame film in this task.

## Efficiency / quality boundaries
- Reuse S2 file and existing evidence. No new environments, animations, props, captions, audio generation, sound effects, facial rig, or full-resolution render.
- No re-reading the entire lengthy STATUS/history. Only current files, relevant code, and touched tests.
- Avoid re-running full old movie renders unless an edited dependency necessitates regression.
- Report measured resource cost, brief progress, PR link if documents changed. Stop for user review before changes.
- Production release requires separate S3B targeted correction, an audio-checked creative approval, and one later verified 720×1280/30fps export.
