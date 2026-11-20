---
description: Produce a new episode in two sessions (E1 → animatic gate, E2 → final). Usage: /new-episode <slug> [E1|E2]
argument-hint: <slug> [E1|E2]
---
# /new-episode $ARGUMENTS

Source of truth: `docs/V2_BRIEF.md` (§0–§3, §5–§11, §14, Amendment A1) and `PROGRESS.md`; length, end, last line, final shot
and hero-first: **`docs/season1/FORMAT_V6.md`** (new episodes are `"format": 6`). Branch `claude/engine-v2`.
The owner has committed `stories/<slug>/script.txt` and `stories/<slug>/voice.flac`. Session E1 runs when the
second argument is missing or `E1`; E2 runs after the owner's notes on the animatic. Write a ≤ 15-line plan in
`PROGRESS.md` first, a ≤ 40-line report after (built, commands, numbers, decisions, open problems, build/render/total
time and the slowest step). Every check below must actually run and pass; a check that fails twice after two
different attempts → stop and ask. Never read `evidence/`; look only at contact sheets ≤ 1600 px.

## Season 1 episodes (Amendment A4 §H; `/season` calls this; the steps below apply with these changes)
- **Shot plan:** read the episode's card in `docs/season1/SEASON_1.md` §6 and `stories/<slug>/beats.md`. The beats' target
  times are replaced by `cues.json` word onsets. Format v4 (`docs/season1/V4.md` D1): `beats.md` is the owner's beats
  prompt; if it (or `script.txt`, or the voice file) is missing, stop and ask the owner for it. Never write, edit or
  "fix" a script or beats file; `scriptcheck.py` results are reported to the owner, never acted on by rewriting.
- **No labels (owner rule, SEASON_1.md §2c):** no name/role/AFK tags, bubbles, class cards or overhead UI; characters are
  introduced by narration and camera; text only on real objects (world-facing `plate`/`stat` on a scoreboard, clock, note,
  sign, switch) and in captions. `v2:plan`'s `noLabels` gate fails anything else.
- **World:** terrain + biome + bespoke set pieces (`world.js` ≤ 320 lines, exports `LOOK`); see the CLAUDE.md library.
  **Cast:** troupe slots (`cast/troupe.json`: `{style: 'v2', troupe: SLOT, role, outfit, accessories}`), AFK ×2.
- **episode.json fields:**
  - `"season": 1`, `"hero"`, `"captionStyle": "pop-shorts-v3"`;
  - `beats` {B1…B9: [firstShot, lastShot]}, `clues` (3 shot ids, each shot naming its `clueObject`), `twist`, `afk`
    (2 shot ids), `moneyShot`, `ruleLines` (default 2);
  - `"format": 6`; shot 1 tagged `spectacle` or `ruleImage`; the hero on screen by 5.0 s; the last shot a close-up or
    two-shot on the payoff, never a wide (FORMAT_V6.md);
  - `sfx` (default on); `moods` (optional, for `audio-cues.md`).
- **Gates before the owner sees anything:** `npm run v2:test` · `npm run v2:plan -- --story <slug>`, which now also runs the
  season gates (B1, B2, clues, AFK, faces out of the 58–74 % caption band; format 6: length, hero-by-5 s, final shot) plus A5 framing and uiSize ·
  `npm run v2:bench` (Season 1 limits) · `npm run v2:stability`. Then `sheet.py <animatic> --stats --labels <shots> --spec
  <episode.json>`: a WARN if the twist / money shot is not the largest colour change.
- **Captions** `python3 scripts/v2/captions.py --story <slug> --spec stories/<slug>/episode.json` (v3 via `captionStyle`).
  **Sound:** `assemble.py … --spec stories/<slug>/episode.json` mixes the auto-placed sfx (−16 dB under the voice, riser +
  8 silent frames before the reversal) and `stories/<slug>/music.mp3` if the owner added one.
- **Deliver with the animatic:**
  - `python3 scripts/v2/audiocues.py --story <slug>` → `review/<slug>/audio-cues.md`;
  - a 1-fps sheet;
  - the frame-0 still at 390 px ("mute test"): `sheet.py <animatic> --frames 0 --long 390`.
- **E2** is unchanged (1440 final, `v2:qc`, release, proxy), plus a suggested title (3–6 words + one emoji, §3) and a pinned
  comment (one either/or question) from the card in `review/<slug>/DELIVERY.md`. Append a row stub (`| n | slug | lane |
  title | | | | | | | | |`) to `docs/season1/RESULTS.md`.

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
   `loc`, `subject`; `openHit` on frame 0 only; `"format": 6` and `end` = voice + 0.85 (`endFor` in `engine/timeline.js`; FORMAT_V6.md).
5. **Gates:** `npm run v2:plan -- --story <slug>` exit 0 · `npm run v2:bench -- --story <slug>` PASS ·
   **`npm run v2:stability -- --spec stories/<slug>/episode.json` exit 0 (A1: before anything is shown)** ·
   `sheet.py --stats` luma/saturation thresholds (§12 Session 3 rubric 6).
6. **Animatic:** `npm run v2:render -- --story <slug> --out renders/v2/<slug>-animatic --width 270 --height 480 --every 2 --aa 0`
   → `captions.py` → `assemble.py --animatic` → `review/<slug>/animatic.mp4` (≤ 10 MB) + 1-fps sheets; run the §10
   animatic checklist and record it. Commit, push, update the PR. **Stop for the owner's notes.**

## Session E2 (after the owner's notes)
1. Apply the notes; a note that changes a shot re-renders only that shot (per-shot cache, §14.1).
2. Re-run `v2:plan`, `v2:bench` and **`v2:stability` on the final spec (must exit 0, A1)**.
3. **Render at 1440 (A2):** add or edit `stories/<slug>/render.request` (first line `final`) and push, or dispatch
   `.github/workflows/render.yml` (story, preset final). It plans, renders 6 shards at native 1440×2560, assembles the
   master + 1080 review proxy, runs `v2:qc`, and only on a QC pass attaches the master to a prerelease `<slug>-<sha>`.
   Fallback: local `npm run v2:render -- --story <slug> --out renders/v2/<slug>-final1440 --final --workers 3`; if that
   would exceed 2.5 h, render 1080×1920 and let `assemble.py` upscale before the grade (record the path).
4. **Assemble + verify:** `python3 scripts/v2/assemble.py --story <slug> --frames <dir> --captions <ass> --out <master.mp4>
   --proxy review/<slug>/final-review.mp4` → **`v2:stability` (A1) and `npm run v2:qc -- --story <slug> --video <master>`
   must exit 0** (1440×2560, ≥ 16 Mb/s, BT.709, −14 ± 1 LUFS, TP ≤ −1, SSIM/PSNR, grade sharpness, stone ΔE,
   `qc-crops.png` scored); 10-frame re-render spot check byte-identical; 1-fps sheets reviewed for caption/face
   collisions (fix with per-shot `captionY: "high"`).
5. **Deliver:** the master is never committed: prerelease asset (farm) or sent directly, linked from
   `review/<slug>/DELIVERY.md` with its ffprobe summary; commit `final-review.mp4` (≤ 45 MB), `qc.json`, `qc-crops.png`. Update `SERIES_LOG.md`, CLAUDE.md library index (one line per new
   reusable addition), record times. Commit, push, update the PR. Stop.
