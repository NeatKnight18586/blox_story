# names100 — S3B targeted performance and audio-timed review
**Plan only — implementation NOT started.** Follow the approved S3A issue ledger from PR #14. All relevant code is already in blox_story; this is a small directing/acting pass, NOT a new framework.

## Audio handoff prerequisite
- The original **ADAM 1.WAV** is preserved in the user's ChatGPT conversation but is **NOT automatically visible in Codex**. User should attach it to the Codex task once, as an input-only asset. Do not commit original WAV to Git history, replace the narration, synthesize voice, upload to public services, or time-stretch it.
- Verified original WAV: stereo, 44,100Hz, **2,411,520 samples = 54.6829932 seconds**.
- Use existing S2 film `evidence/names100-s2/movie.mp4` for a cheap **temporary voiced review MP4** with audio starting at t=0. Existing silent S2 remains unchanged. Keep temporary review and audio artifacts outside Git. Verify streams/durations and sample it with audio; report if genuine listening not possible.
- S2 rough video=54.733333s (821 frames /15fps), ~50.34ms longer than WAV. Native schedule [0,1641) /30fps =54.700s, ~17.01ms longer. Preserve exact story clock/cuts; do not stretch audio to cover a trailing hold.
- If the WAV is NOT attached/accessible to Codex, report **AUDIO REVIEW BLOCKED**, use written cues only for provisional keyframes, and STOP before approving final timing or claiming final creative PASS.

## Preflight
Verify PR #14 contains review-only edits and has no regressions; merge into main if clean. Read the 23-shot ledger `stories/names100/S3A_ISSUE_LEDGER.md`, `VOICE_CUES.md`, `roughcut.json`, `LOOK_STYLE.md`. Inspect only source for the three targeted scenes; do not load the full historical STATUS or unrelated specs. Create a new branch. Preserve existing films, hashes, actors and timing tests.

## Three changes and exact scene windows
**A — Shyness, S05–S06 native [320,482), 10.667–16.067s.** S05 retains close nervous Eli / receptive neighbor; gesture is look toward neighbor, glance away. S06 widens enough to see a small half-wave that rises then retreats. Eli **never says a name** or spends a count here; 100 remains until frame789. Existing pivots/head/shoulder; no new rig.

**B — Reunion, S18–S21 native [1296,1490), 43.200–49.667s.** S18 should have visible separation/approach, S19 first shared eye contact and restrained hand/shoulder touch, S20 a reverse angle showing Mara recognizing/approaching, S21 completed family connection with Eli clearly outside it. Reuse existing actors, doorway, sunrise, readable walk, pivot gestures and camera positions; no crowd system, run/hug simulation or new characters.

**C — Forgotten Eli, S22–S23 native [1490,1641), 49.667–54.700s.** Before exact **global frame 1529** Eli directs his attention toward Mara and raises a tentative hand; at frame 1529 counter goes to 0; afterwards Mara's gaze passes him without recognition, his hand lowers, his partly ghostlike body and ground shadow remain in frame. Visually echo the aborted greeting in S06. No new speech or counter changes; keep zero at1529.

## Fast quality gates — ordered
1. **Audio/pacing review, no render:** mux existing S2 video + supplied WAV into a disposable file; listen/check the target scene timing at t=0, produce only specific timing issues, preserve exact cue events.
2. **Selective keyframe review:** genuine Three.js stills at 360×640 for start/action/payoff frames for each target (around 9–12 total). Side-by-side with approved S2 images/cameras. Correct obvious cropping, eye direction, counter continuity or pose ambiguity once.
3. **Small motion proof:** only after stills pass, render one short excerpt per target at economical 180×320/15fps or 360×640/15fps. Keep absolute 30fps cue clock and separately verify protected odd-frame boundaries. Clip lengths should stay bounded to the corresponding scenes, not the full 54.7s. Optional temp voiced excerpt if original WAV was supplied; use correct global audio offset (not audio t=0 for a sliced scene).
4. **Validation/PR:** test deterministic random seeking, body/pivot identity, face readability, continuous motion within shots, scene cuts, existing PR13 films/old hashes and protected 789/890–926/1529 events. Verify each new excerpt H.264 playback/decode. Keep raw frames/cache out of Git. Commit a short report, before/after board, and issue ledger update; one PR; stop.

## Creative acceptance
A viewer should understand without narration (1) Eli tries to greet but withdraws, (2) reunion develops through approach→recognition→connection, (3) Eli's attempt at renewed connection fails **because Mara no longer recognizes him**. Confirm that these movements do not break the same Roblox-like visual identity, small-screen compositions, and existing color script. This is visual acting, not a demand for complex fingers or new character skeletons.

## Explicit non-goals
No new generic animation engine, full episode rerender, final720×1280/30fps render, expensive town, outfits, crowd, voice synthesis, lip sync, automatic subtitle suite, physics, expanded actor packs or new framework. One focused repair per failing sequence; don't weaken tests. The following stage after S3B approval is final timing QC, then final export and audio assembly.

## Reporting efficiency
Use this file as the only S3B execution brief plus the S3A ledger. Report PASS/PARTIAL/FAIL separately for technical and creative evidence; include actual runtime/cost, missing audio if any, concise PR/evidence links. Do not claim better retention or trending until published audience testing.
