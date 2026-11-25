---
description: Season 1 daily loop (A4 §I). Reads docs/season1/STATE.md and does the next step. Usage: /season [approve | notes: … | swap]
argument-hint: [approve | notes: … | swap]
---
> **LEGACY** (pre-reset Season 1 loop). The current loop is in `RULEBOOK.md` §1; where this file conflicts, RULEBOOK.md wins. Archived docs it names are in `docs/archive/`.

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
  proxy, suggested title + pinned comment from the card, a row stub in `docs/RESULTS.md`). When the master is
  delivered, log it with exactly `--log "<n> <slug> final delivered"` (the compilation counter reads these lines).
- **compilation-<k>** (after every fifth final): concatenate the last five masters (from their prereleases) with a 1 s title
  card before each (episode title, Lilita One, the season's colours), no re-render, no re-grade; write the chapter list
  (start times, titles) to `review/season1/compilation-<k>.md`; release the file like a master (never in git).
- **No script work, ever** (format v4, `docs/season1/V4.md` D1): `/season` never plans, writes, edits, prints or checks a
  script or beats file. For a new episode it waits for the owner's `stories/<slug>/script.txt`, voice file
  (`stories/<slug>/voice.*`, used exactly as delivered: D3) and beats prompt (`stories/<slug>/beats.md`), and says so with
  the printed `stop` line (it names what is missing). Episodes are built only from those three.
- **swap** actions (`swap-card`, `log-swap`; only while `step: voice`). The owner has seen this premise elsewhere.
  1. Take the first unused backlog line in SEASON_1.md §5.
  2. Write a full card in the nine fields, plus the §2b check.
  3. Replace the current card in §6, keeping its number and lane. This is the only edit `/season` makes to a card.
  4. `set --slug <new> --log "swap: <old> → <new> (backlog: …)"`. Tell the owner the episode waits for their script.txt,
     voice and beats prompt. Stop.
- **season-complete**: report the season totals from `docs/RESULTS.md`; stop.

## 3. Write the new state and stop
`python3 scripts/v2/season_state.py set --episode <n> --slug <slug> --step <step> --log "<what happened>"` with the
`state` printed in step 1. Commit source, `cues.json`, `review/<slug>/` and `STATE.md` (never
`build/`, `renders/` or masters). Push, update the PR, send the owner the review files and a ≤ 15-line report (passes,
numbers, open problems, what the owner does next). Stop.

State after episode 1: `episode: 1 egg`, `step: published-ready`; the next `/season` moves to episode 2 and waits for the
owner's script, voice and beats prompt. Note: `stories/{ragdoll,mountain,mirror}/script.txt` were written before D1; they are
not the owner's scripts and are never printed or proposed. The owner replaces them with their own.
