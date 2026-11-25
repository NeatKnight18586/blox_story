# PROGRESS — current phase log
Older log (sessions 1 → tuft E5): docs/archive/PROGRESS.md. Rules: RULEBOOK.md.

## Phase 0A — merge + one rulebook + archive (Sonnet 5.5)
Plan: merge claude/tuft-e5 → main; branch claude/pipeline-v7; write RULEBOOK.md; archive superseded docs; shrink CLAUDE.md; no engine/render change.
Built:
- unranked-e4 ⊂ tuft-e5 (0 missing commits). PR #57 tuft-e5 → main merged (merge commit 4407b32).
- RULEBOOK.md (70 lines), CLAUDE.md (14 lines), PROGRESS.md reset; docs/RESULTS.md (+ "length variant" column).
- Archived to docs/archive/: V2_BRIEF, A4_FORMAT_V3, A5_LOOK_FIX, V4, STORY_ENGINE, EPISODE_BRIEF, BRAND, PIPELINE, FORMAT_V6, STORY_BIBLE, CODEX_HANDOFF, STATUS, PROGRESS.
- Kept in place: docs/season1/SEASON_1.md (read by tests/v2/test_s9.py), STATE.md (season_state.py), refs/ (face gates).
- new-episode.md / season.md now point to RULEBOOK.md (season.md marked legacy). Only code mentions of archived docs are comments/notes.
Decisions: PROGRESS.md stays at root (scripts/freeze-check.js allows it). Rulebook §9 omits P3/A5 gate scripts (not part of the new loop).
Open: engine code comments still cite old doc paths (cosmetic; not touched per "no engine change").
