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
- Pass A (Clix face #2 grin) · Pass B (owner 2026-11-20, with §1 world fixes; B3/B4 move to Pass C real cameras).
## §1 world fixes (2 passes each; nothing loosened)
- 1a FAIL: clearance (bbox in central 50 % AND nearer than subject) applied literally removes the lane houses for the S5 aerial
  (subject 50 H away) → Box street 0 buildings, S25 0. Fix proposal: also require the bbox to cross the camera→subject line.
- 1b PASS: rain plinth ΔL* 34.8 (≥ 20), reflection .326 (≤ .40); teal band .03 H on the tier side; front-left fill; no lit lamp ≤ 6 H.
- 1c PASS: 6 cloud masses, 0 % below the top 45 %, rooftops 96.8 % of the bottom 25 %, fill 8 % of key, luma .443 (.44–.48).
- 1d FAIL by spec: plinth close .524; it has 0 % sky, so a sky-only −0.1 EV cannot move it (alternative: −0.1 EV shot exposure).
- 1e built: 3-row cubby wall, string lights, left-wall window + open flap (the hill does not read through it yet).
- 1f built: quietNight (no rain/wet, key #9DB8FF, warm windows) but S14 still luma .368 > .22 (night gate). Hill wide drifted .514 (> .50).
## Pass C status: STOPPED at 2a (aligner wins; S26 phrase off > 0.6 s)
- stories/tapcap-ep01-rarity/ (script.txt = shots.yml VO lines, voice → vo.wav, gitignored); build/cues.json from scripts/v2/align.py.
- S26 "Yellow," starts 43.07 (table 43.75, −0.68 s: silence table skipped the word). S36 −0.28. All others ≤ 0.01 s.
- Clicks 36.148 / 68.471 / 69.172; last word ends 74.92 (cut 75.16 = 0.24 s tail).
## Next step
- Owner: confirm S26 = 43.07 s (aligner) or say otherwise; then Pass C 2b–2i (blocking, QA, sheets, render plan).
