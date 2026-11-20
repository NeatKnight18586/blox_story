# HANDOFF — TapCap EP01 "Rarity's Just Paint"  (≤ 30 lines; read with ../RULES.md, spec.yml, shots.yml)
## Approved
- Pass A (Clix face #2 grin) · Pass B · Pass C · Pass D1 · Pass D2 · Pass D3 · Pass D4 (all 2026-11-20). Pass E: blocked (R-FLOW-06, QA FAILs).
## Standing state (from Pass C, unchanged)
- 46 cuts on aligner words (avg 1.63 s), void 0, nothing locked off, clicks 0-frame error. Retention linter 19 PASS / 5 FAIL
  (VO/brand-exempt: R-BRAND-01, N-VO-03, R-HOOK-04, R-BRAND-03, R-LEN-01). Render plan 8.96 h in 4 jobs ≤ 3.4 h (RENDER_PLAN.md).
- Tool: `node campaigns/tapcap/scripts/pass-d.js --seq Dn --shots … --merge` → review/pass-d/Dn/pass-c-Dn.png, qa/pass-Dn.json;
  grades per shot in previz/grade.json (`scripts/grade-c.py qa/pass-Dn.json`). Sheets embed refs → gitignored, sent directly.
## Pass D1/D2 (approved) — open items carried: S1 + S40 buildings 3 (B4) · S16c luma .727 · S22 mid .59 % (B3).
## Pass D3 (S23–S31) — 2 fix passes used, gate NOT met
- Done: rain key light (3) + rim, S25 crowd at hill base + lens clearance, S29 zoomAt 1.4 punch, S30b medium, S31 rack 2.2→2.75.
- PASS: void 0 · S25 depth (4 layers) · S26 .21 · S27 .19 luma.
- FAIL luma (gate .10–.22): S23 .28 · S24 .35 · S25 .06 · S28 .26 · S29 .28 · S30a .37 · S30b .32 · S30c .25 · S31 .27.
  Grades swing ±4 EV between passes: the rain spot key dominates close shots; exposure alone can't fix it (needs key per framing).
- FAIL B4: S25 density 4 buildings.
## Pass D4 (S32–S40) — 2 fix passes used, gate NOT met
- Done: regrade S32–S37b, S36 split (S36a crane reveal / S36b arms over plinth), S37a/b press macros re-aimed, S33 fg lamp.
- PASS: void 0 · S36a depth · S40 depth (fg 23 %) · luma S32 S34 S35 S36a S36b S37a S38 S39 S40.
- FAIL: S33 luma .27 (fix-2 lamp lit the frame; was in gate) + fg .95 % (≥ 1 %) · S37b luma .51 (≥ .48) · S40 buildings 3 (B4).
## Weakest shots (harsh)
- S30a/S30c "purple/blue" inserts read as flat yellow walls: no colour, no paint, no subject — the worst frames in the cut.
- S24/S26/S35 extreme close-ups are anonymous yellow surfaces; Sunny's face is never readable in the rain act.
- S25 whip: near-black (.06), crowd invisible. S28/S31 plinth: Banana a dark block, rain streaks only thing moving.
- S37a/S37b clicks: lens flare blob, keycap never visible entering the switch (same gap as S21).
- S36a Clix reveal still reads as a block-figure on a deck, not a person; S36b frame mostly sky + a dark wedge.
- S33 sign "TOP SHELF" small and soft; rain streaks too dense, lamp halo is the subject.
## Next step
- Owner: decide each open FAIL: fix (per-framing rain key, close = .3×; paint inserts S30a–c) or a logged --allow.
  Then Pass E (1 farm job, 4 shards ≤ 3.4 h) once QA is at zero FAIL.
