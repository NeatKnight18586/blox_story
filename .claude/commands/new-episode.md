---
description: Produce a new episode through one stage. Usage: /new-episode <slug> <PREVIS|ANIMATIC|FINAL>
argument-hint: <slug> <PREVIS|ANIMATIC|FINAL>
---
# /new-episode $ARGUMENTS

Source of truth: `RULEBOOK.md` (read it first, then only the files a stage names). Every spec is `"format": 7` with
`lengthVariant` (`short` | `long`) taken from the Brief's SPEC FLAGS line, and `captionStyle: "pop-shorts-v7"`.
Never read `evidence/`; look only at contact sheets ≤ 1600 px. Season 1: no labels (`noLabels` gate).
Never write, edit or "fix" `script.txt`, the voice file, `PICTURE_LOCK.md` or `BRIEF.md`; report problems to the owner.

## Inputs the owner commits first
`stories/<slug>/script.txt`, the voice file (`voice.flac|wav|mp3`), `stories/<slug>/PICTURE_LOCK.md`, `stories/<slug>/BRIEF.md`.
Any of them missing → stop and ask. No second argument or an unknown stage → ask which of the three to run.
Run `python3 scripts/v2/scriptcheck.py --story <slug> --variant <short|long>` once and report its result (never act on it by rewriting).

## Stage PREVIS (staging only; no look or world polish)
1. Write `stories/<slug>/BASE` (the base commit/branch this episode builds on).
2. `npm run v2:align -- --story <slug>`, copy `build/cues.json` to `stories/<slug>/cues.json`; `node scripts/v2/brief2spec.js --story <slug>`.
3. Build the **vo-sheet**: one frame per Brief row, from existing assets only. Each cell shows frame + row number + VO + MUST SEE
   (`sheet.py <frames> --frames … --labels shots.json`, ≤ 1600 px wide) → `review/<slug>/vo-sheet.png`.
4. Fix staging (cameras, positions, actions) only until every row shows its MUST SEE; a row that cannot is reported, not faked.

## Stage ANIMATIC
1. `npm run ep -- --stage plan --slug <slug>` (v2:plan gate, exit 0), then `npm run ep -- --stage animatic --slug <slug>`
   (bench, `v2:stability`, 270×480 render, v7 captions, `assemble.py --animatic` → `review/<slug>/animatic.mp4` ≤ 10 MB).
2. Phone sheet: `sheet.py <animatic> --stats --labels <shots> --spec stories/<slug>/episode.json` at 390 px; list the three weakest
   things visible in it. Report the plan summary (errors / warnings, voiceGap times, hero first-on-screen time).

## Stage FINAL
1. Farm render at 1440×2560: `stories/<slug>/render.request` (first line `final`) or dispatch `.github/workflows/render.yml`
   (local fallback `npm run v2:render -- --spec stories/<slug>/episode.json --out renders/v2/<slug>-final --final`).
2. `python3 scripts/v2/captions.py --story <slug> --spec stories/<slug>/episode.json` (v7 by default for format 7), then
   `python3 scripts/v2/assemble.py --story <slug> --frames <dir> --captions <ass> --spec stories/<slug>/episode.json --out <master.mp4> --proxy review/<slug>/final-review.mp4`.
3. `npm run v2:stability` and `npm run v2:qc -- --story <slug> --video <master>` must PASS.
4. `review/<slug>/DELIVERY.md`: master link + ffprobe summary, a suggested title (3–6 words + one emoji) and the pinned
   self-question, both copied from the Brief (`title`, `pinned comment`). Masters never go in git.

## Every stage
- Before coding: a ≤ 15-line plan in `PROGRESS.md`. After: `npm run ep:check` must pass (plus `npm run v2:test`); a check that
  fails after two fix passes → stop and report the number, never loosen it.
- Append what was built, commands, numbers, decisions and open problems (≤ 40 lines) to `PROGRESS.md`; commit source,
  `cues.json`, the voice file and `review/<slug>/`; push the branch.
- Report to the owner in ≤ 20 lines. **STOP**: one stage per session.
