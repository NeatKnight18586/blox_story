---
description: Season 1 daily loop (A4 §I). Reads docs/season1/STATE.md and does the next step. Usage: /season [approve | notes: … | swap]
argument-hint: [approve | notes: … | swap]
---
# /season $ARGUMENTS

`docs/season1/STATE.md` decides what happens; nothing else does. Sources: `docs/V2_BRIEF.md` §0–§3, `PROGRESS.md`,
`docs/season1/A4_FORMAT_V3.md`, `docs/season1/SEASON_1.md` (the owner's creative source: never rewrite a card except by
`swap`). Branch `claude/engine-v2`. Plan (≤ 15 lines) in `PROGRESS.md` first, report (≤ 40 lines) after.

## 1. Ask the state machine
Run `python3 scripts/v2/season_state.py plan $ARGUMENTS` (pass only the first word: `approve`, `notes` or `swap`; keep the
text after `notes:` for step 3). It prints `now`, `actions`, the new `state` and `stop`. If `actions` is empty: tell the
owner the `stop` line in one sentence and stop. Never skip or reorder actions.

## 2. Actions, in the printed order
- **E1** (state was `step: voice`, a `stories/<slug>/voice.*` exists): first
  `python3 scripts/v2/season_state.py set --step animatic --log "<slug>: E1 started"`, then run `/new-episode <slug> E1`
  in full (its Season 1 section: card + `beats.md`, gates `v2:test`, `v2:plan` with the season gates, `v2:bench`,
  `v2:stability`; deliver the animatic with `review/<slug>/audio-cues.md`, a 1-fps sheet and the frame-0 still at 390 px).
- **revise** (`notes: …`): apply the owner's notes as one revision round (only the shots a note touches re-render), re-run the
  E1 gates, then continue straight on: the notes round counts as the approval.
- **E2**: `set --step final --log "<slug>: E2 started"`, then `/new-episode <slug> E2` in full (1440 final, `v2:qc`, release,
  proxy, suggested title + pinned comment from the card, a row stub in `docs/season1/RESULTS.md`). When the master is
  delivered, log it with exactly `--log "<n> <slug> final delivered"` (the compilation counter reads these lines).
- **compilation-<k>** (after every fifth final): concatenate the last five masters (from their prereleases) with a 1 s title
  card before each (episode title, Lilita One, the season's colours), no re-render, no re-grade; write the chapter list
  (start times, titles) to `review/season1/compilation-<k>.md`; release the file like a master (never in git).
- **print-existing-script**: the next card's script already exists (`egg`, `ragdoll`, `mountain`, `mirror`): print
  `stories/<next>/script.txt` in one code block for the owner to voice. Do not rewrite it or its `beats.md`.
- **originality-check**, **write-script**, **write-beats**, **scriptcheck**, **print-script** (any other next card), per
  SEASON_1.md §5b:
  1. Originality check (§2b): search the web, if a search tool is available, for the card's Rule sentence with the title
     and "roblox story". Report anything close in two lines before the script.
  2. Write `stories/<next>/script.txt` from the card, matching the four model scripts.
  3. Write `stories/<next>/beats.md` in the models' table form with §3's beats and cameras.
  4. `python3 scripts/v2/scriptcheck.py --story <next>` must exit 0. Fix and re-run, at most two passes. If it still
     fails, stop and report the failures.
  5. Run the §10 council scorecard (all ≥ 4, one revision pass).
  6. Print the final script in one code block.
- **swap** actions (`swap-card`, `write-script`, `write-beats`, `scriptcheck`, `print-script`, `log-swap`; only while
  `step: voice`). The owner has seen this premise elsewhere.
  1. Take the first unused backlog line in SEASON_1.md §5.
  2. Write a full card in the nine fields, plus the §2b check.
  3. Replace the current card in §6, keeping its number and lane. This is the only edit `/season` makes to a card.
  4. Write its script and `beats.md` per §5b, run scriptcheck and print the script.
  5. `set --slug <new> --log "swap: <old> → <new> (backlog: …)"`. Stop.
- **season-complete**: report the season totals from `docs/season1/RESULTS.md`; stop.

## 3. Write the new state and stop
`python3 scripts/v2/season_state.py set --episode <n> --slug <slug> --step <step> --log "<what happened>"` with the
`state` printed in step 1. Commit source, `cues.json`, `review/<slug>/`, `STATE.md` and the new script/beats (never
`build/`, `renders/` or masters). Push, update the PR, send the owner the review files and a ≤ 15-line report (passes,
numbers, open problems, what the owner does next). Stop.

Initial state after Session 9: `episode: 1 egg`, `step: voice`. `stories/egg/voice.flac` is already committed, so the
first `/season` runs E1 for egg (straight to the animatic).
