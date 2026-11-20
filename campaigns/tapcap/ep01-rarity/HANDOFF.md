# HANDOFF — TapCap EP01 "Rarity's Just Paint"  (≤ 30 lines; read with ../RULES.md, spec.yml, shots.yml)
## Done (2026-11-19) — Setup, Pass A (+ revision) APPROVED; Pass B built, NOT approved yet
- Refs + VO placed (gitignored). Phase 0–6 merged (359c8f5; plan.js + LIBRARY.md conflicts resolved, both sides kept).
- REF wins (§4), measured on tapcap_turnaround.png front (scripts/ref_measure.py), old spec → new:
  head 33 → 35.7 % · torso 29 → 26.8 % · switch 4 → 2.6 % · base 34 → 35.0 % · head top .38 → .351 H · head bottom .45 → .446 H ·
  torso bottom .48 → .442 H. Model now: 35.7 / 26.3 / 2.3 / 35.7 % (all within 0.7 of the ref).
- Model: Cosmic fresnel ramp + 3 % view-dependent flakes; bloom .85/.25 (display-referred post step, scripts/bloom.py);
  fake-paint peeks at drip tips, head rim, arm edges; arms bend 43°; front drips ≤ 43 % of the longest side drip, none under the mouth.
- Clix rebuilt on the R6 rig (body5 satin): hair (+25 % top, 30 % fringe, .08 W sides, 8 curls), coat/tee/chain, blue 30 % arm ends,
  cuff line, left wrist band, black legs + pockets, white sneakers, 40 × H. Old human bust + hand sheet deleted.
- Spec: tap 3 % H, 24 fps, synthesized click (40 ms, −6 dBFS, sfx.py `click`), Clix shots S18–21 arm / S36 reveal / S37 macros / S38 close-up,
  TC-06 = S40 replays S1's move (diff 0). Gate: `node campaigns/tapcap/scripts/pass-a.js` → qa/proportions.json + review sheet.
- Pass B revision: seeded town (`world/town.js` plan, seed 1102 in spec.yml; `townmesh.js` instanced 4 archetypes; `slimetown.js`),
  provisional S1–S40 cams in shots.yml (town built for their frustums), 2-tier plinth, hill 1:2.2 + S-path 24.5°, Lilita One signs.
  `node campaigns/tapcap/scripts/pass-b.js` → qa/world.json + review/pass-b/pass-b-sheet.png (8 stills, 4 columns).
## Approved
- Pass A (owner 2026-11-19), Clix face #2 grin.
## Open notes (Pass B revision, after 2 fix passes; nothing loosened)
- B1 FAIL: plinth close luma .510 (gate ≤ .50), golden S36 .511 (≤ .48). B3 FAIL: S1/S40 bg .79 %, S22 fg 0 / mid .23 %, S36 bg .29 %.
- B4 FAIL: S5 77 ✓, street wides S1 11 · S25 5 · S40 11 · Box street 1 (clearance rule removes lane houses beside the lens) · Market 13 · S8 19 ✓.
- B6 FAIL: rain plinth ΔL* 15.2 (≥ 20), reflection .75 (≤ .40). Earlier PASS (33.8) was invalid: tier 2 was missing (comment bug).
- Plinth: teal rim line not visible (inside the bevel); tier-2 side reads as a dark band. Golden still: clouds parted but no rooftops read.
- S14–S17 say "night" but sit in the 0:00–0:38 dawn act; Pass C needs a call. Cams in shots.yml are provisional (Pass C replaces).
## Next step
- Owner: notes or "approve" on the Pass B revision (fails above). Do NOT start Pass C before approval.
