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

## Phase 0B — format 7, one-word captions, pace, /new-episode (branch claude/pipeline-v7-phase-0b-dxbr12)
Built: `format: 7` (+ `lengthVariant`): `endFor` voice + 0.5, max end 77 / 102 s; plancheck hero ≤ 10 s, final-shot rule, length; plancheck6 dead-stretch
window 1.0 s (< 12 s) / 1.5 s, `voiceGap` WARN (> 0.4 s, check `v`); `scriptcheck.py --variant short|long`; brief2spec `SPEC FLAGS`; captions
`pop-shorts-v7` (one word, #FFE135, outline 20, fixed y 1250, default for format 7); `/new-episode` rewritten (44 lines, old flow in docs/archive/new-episode-v6.md).
format 6 `>=`-gates in episode.js / render.js / seasoncheck.js / plan.js now include 7; format 6 behaviour untouched.
Numbers: `npm run v2:test` 277 JS + 74 py green, `npm test` green; `_fixture6_pass` plan.json byte-identical before/after; `_fixture7_pass` plan PASS
(0 errors, 7 warnings: escalation ×2, pacing ×2, moodSeparation, voiceGap ×2); caption-v7-phone cap 4.04 % (≥ 3.2), band 61.9–68.4 % (58–74): PASS.
Decisions: RULEBOOK.md, `npm run ep` and `ep:check` do not exist on this branch: new-episode.md references them as specified; RULEBOOK §9 not edited.
Branch name from the session setup (claude/pipeline-v7-phase-0b-dxbr12), not claude/pipeline-v7. Brief flag syntax: `- spec flags: format: 7, lengthVariant: short`.
Open: the phone sheet uses the demo video, whose old white captions are burnt in under the v7 ones (overlap in the sheet only).

## Phase LOOK SIGNATURE — engine slot (branch claude/phase-look-signature-opus-ao82s9; farm run 45751719604)
Built: looks4 `cityDay2` (opt-in; cityDay unchanged) + look4 opt-ins skyMid/clouds2/sunRays/grade/haze; `engine/outline.js` (off|classic|classicPlus, default off);
plan.json keyArt on all 17 anchors (4 hand-tuned, 13 `auto`, unmeasured) + `keyArt()` rule; `parts/city/living.js` (9 movers + Governor blimp 1.8k tris);
docs/CONTINUITY.md + RULEBOOK §2 line; scripts/v2/look-gate.js + look-sheet.py; assets.yml `looksig`. Review: review/city/LOOK-{sheet,crops}.png, LOOK-motion.mp4, LOOK-measures.json.
Farm numbers (720×1280, look C): bayNorth 89.3k / 0.503 s, plazaWide 81.8k / 0.445, mainSt 88.3k / 0.677 (FAIL > 0.62; off 0.577), heroHouse 47.5k / 0.562.
Outline cost farm: classic +0.082…0.101 s, classicPlus +0.084…0.100 s — FAIL (≤ 0.06) after two fix passes (local: 0.03–0.06). Key-art: near 16–37 %, third Δ 1.1–7.1 %: PASS ×4.
Living: ≤ 2.5k tris and ≤ 3 movers in frame: PASS. Open: MRT (id/normal in the main pass) would remove the 2nd geometry pass, the likely fix for the outline cost.
