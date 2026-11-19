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
- Pass B: `campaigns/tapcap/world/` (slimetown.js world, crowd.js idle loops, moods.js 3 presets on engine moods7 + post7),
  `node campaigns/tapcap/scripts/pass-b.js` → qa/world.json + review/pass-b/pass-b-sheet.png. Crowd 34 (6 Rares, sway 15/hop 9/tap 10).
## Approved
- Pass A (owner 2026-11-19), Clix face #2 grin.
## Open notes
- Pass B luma gate (engine/moods7 dawnHope .36–.50) still FAILS after 2 fix passes: hill wide .57, plinth close .60 (bright sky);
  not loosened. Owner: darker dawn sky, or accept a brighter toy-world gate?
- Rain-night still: plinth reads as a bloom blob + its wet reflection; lightning not used (optional ×1).
- Tilt-shift and lookdev bloom are post steps (scripts/tiltshift.py, bloom.py); golden preset built, not on the gate sheet.
- Sign fonts: no Lilita One file in the repo, signs use the bold sans fallback.
- Scale: arm end 8.1 H wide · 3 % press overlaps the base rim 0.4 % H (hidden) · base drips still long capsules, ref = short blobs.
## Next step
- Owner: "approve" or notes on Pass B. Then Pass C (blocking previz S1–S40, captions v6, QA, aligner on vo.wav).
