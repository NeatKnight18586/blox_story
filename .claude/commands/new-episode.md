---
description: Produce a new episode in two sessions (E1 → animatic gate, E2 → final). Usage: /new-episode <slug> [E1|E2]
argument-hint: <slug> [E1|E2]
---
# /new-episode $ARGUMENTS

Source of truth: `docs/V2_BRIEF.md` (§0–§3, §5–§11, §14, Amendment A1) and `PROGRESS.md`. Branch `claude/engine-v2`.
The owner has committed `stories/<slug>/script.txt` and `stories/<slug>/voice.flac`. Session E1 runs when the
second argument is missing or `E1`; E2 runs after the owner's notes on the animatic. Write a ≤ 15-line plan in
`PROGRESS.md` first, a ≤ 40-line report after (built, commands, numbers, decisions, open problems, build/render/total
time and the slowest step). Every check below must actually run and pass; a check that fails twice after two
different attempts → stop and ask. Never read `evidence/`; look only at contact sheets ≤ 1600 px.

## Session E1 (ends at the one owner gate)
1. **Align:** `npm run v2:align -- --story <slug>` → `stories/<slug>/build/cues.json`; copy it to
   `stories/<slug>/cues.json` (commit it). Duration outside 100–168 s → stop and tell the owner.
2. **Council scorecard** (§10, inline, one pass; all ≥ 4 to proceed, else list exact line edits and stop).
   **SERIES_LOG difference check:** new row differs from the previous three in ≥ 5 of 8 columns; no landmark or
   ground plan repeats. Add the row.
3. **World:** a new bespoke `stories/<slug>/world.js` (§7, A1: `groundY` + `LAYER` ≥ 0.05 apart, `B.ribbon` for
   paths/streets, relief materials on structures, modelled detail only on story props, calm ground). Reuse the
   shared library (`parts/*`, `parts/props.js` small props, CLAUDE.md index); never reuse a world or layout.
   **Cast:** `stories/<slug>/cast.json` from the avatar library. Self-score the §12 Session 2 and Session 3 rubrics
   on `node scripts/v2/avatar-sheet.js` / `python3 scripts/v2/world-sheet.py` sheets; max 3 passes; no owner gate.
4. **Episode:** `stories/<slug>/episode.json`: shots cut on phrase onsets (`at`), each with `size`, `see`, `why`,
   `loc`, `subject`; `openHit` on frame 0 only; `end` = max(voice + 2.5, 122.5).
5. **Gates:** `npm run v2:plan -- --story <slug>` exit 0 · `npm run v2:bench -- --story <slug>` PASS ·
   **`npm run v2:stability -- --spec stories/<slug>/episode.json` exit 0 (A1: before anything is shown)** ·
   `sheet.py --stats` luma/saturation thresholds (§12 Session 3 rubric 6).
6. **Animatic:** `npm run v2:render -- --story <slug> --out renders/v2/<slug>-animatic --width 270 --height 480 --every 2 --aa 0`
   → `captions.py` → `assemble.py --animatic` → `review/<slug>/animatic.mp4` (≤ 10 MB) + 1-fps sheets; run the §10
   animatic checklist and record it. Commit, push, update the PR. **Stop for the owner's notes.**

## Session E2 (after the owner's notes)
1. Apply the notes; a note that changes a shot re-renders only that shot (per-shot cache, §14.1).
2. Re-run `v2:plan`, `v2:bench` and **`v2:stability` on the final spec (must exit 0, A1)**.
3. **Render farm:** add or edit `stories/<slug>/render.request` (first line `final`) and push, or dispatch
   `.github/workflows/render.yml` (story, preset final). It plans, renders 6 shards, assembles and attaches
   `final.mp4` to a prerelease `<slug>-<sha>`. Fallback: local `npm run v2:render -- --story <slug> --out renders/v2/<slug>-final --workers 3`
   then `assemble.py --frames …`.
4. **Verify:** `final.mp4` is 1080×1920, 30 fps, 122–170 s, −14 ± 1 LUFS, ≤ 60 MB (ffprobe/ebur128); 10-frame
   re-render spot check byte-identical; 1-fps sheets reviewed for caption/face collisions (fix with per-shot
   `captionY: "high"`).
5. Copy the final to `review/<slug>/final.mp4`, update `SERIES_LOG.md`, CLAUDE.md library index (one line per new
   reusable addition), record times. Commit, push, update the PR. Stop.
