# HANDOFF — TapCap EP01 "Rarity's Just Paint"  (≤ 30 lines; read with ../RULES.md, spec.yml, shots.yml)
## Approved
- Pass A (Clix face #2 grin) · Pass B (2026-11-20; B3/B4 moved to Pass C real cameras). Pass C: NOT approved (gate below).
## Done this session (2 fix passes per item; no gate loosened)
- Decisions: S26 = 43.07 s; all shots.yml t = aligner; clearance (a)+(b)+(c) LOS capsule .6 H; plinth close −0.1 EV + dawn bounce 15 %.
- World: quiet night (door lights off, windows ×.5, moon −0.7 EV, Banana rim, box glow); golden S36 prop exclusion; window aimed at summit.
- Pass C: previz/blocking.js (46 cuts on aligner words, avg 1.63 s, all moving), previz/previz.js, scripts/pass-c.js → qa/passc.json,
  review/pass-c/pass-c-S1-S20.png + pass-c-S21-S40.png (captions v6 #B98CFF burned in), previz-mix.wav (VO + 3 clicks, gitignored).
- stories/tapcap-ep01-rarity/ (script.txt = shots.yml VO lines, cues.json = aligner, episode.json for tools/qa_episode.py).
## Gate results (final)
- PASS: B2 void 0/46 · TC-01 23 % · TC-02 · TC-03 · TC-05 clicks 0 frame error · TC-06 diff 0 · TC-07 1.63 s, 0 locked, tail .24 s.
- Retention linter 19 PASS / 5 FAIL / 3 SKIP. FAILs are VO/brand rules the sponsor VO can't meet (R-BRAND-01, N-VO-03, R-HOOK-04)
  or blox_story series rules (R-BRAND-03, R-LEN-01). TC-04 manual.
- FAIL B3: S22 mid .25 % (aerial; fg allowed off). FAIL B4: S1 4 · S25 5 · S40 4 buildings (S8 15 ✓).
- FAIL luma: S30b .235 · S32 .229 (≤ .22) · S40 .329 (≥ .34). FAIL S1/S40 hill+plinth 4.9 % (≥ 8 %).
- World (final): Box street 4 bld · hill wide .535 · plinth close .520 + dark band (L* 7) · Core Row window hill .6 % — all FAIL.
## Weakest shots
- S21/S37a/S37b click macros don't show the keycap entering the switch · S12 OTS camera sits in Sunny's head · S28–S34 rain plinth
  shots are dark and soft; Sunny/Banana barely read · S36a Clix reveal reads as a block, not a person.
## Render plan
- RENDER_PLAN.md: 1080×1920 at 12.3 / 11.3 / 6.5 s per frame → 8.96 h (×1.6 safety) in 4 jobs ≤ 3.4 h on free ubuntu-24.04.
## Next step
- Owner: notes per shot number on the two Pass C sheets, or "approve". Then Pass D1 (S1–S13). Don't start Pass D before approval.
