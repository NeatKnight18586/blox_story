# HANDOFF — TapCap EP01 "Rarity's Just Paint"  (≤ 30 lines; read with ../RULES.md, spec.yml, shots.yml)
## Done (2026-11-19, Setup + Pass A + Pass A revision) — NOT approved yet
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
## Approved
- nothing yet
## Open notes
- Clix face: pick one of #2 grin (default) · #5 content · #32 calm.
- Scale: at 40 × H the blue arm end is 8.1 H wide (≈ 20 × a Slime Guy head); one tap covers the whole Slime Guy and its neighbours.
- 3 % press > the ref's visible switch (2.6 %): at full press the keycap skirt overlaps the base rim by 0.4 % H (hidden inside the skirt).
- Base drips: the ref shows short raised drip blobs; the model still has long vertical drips (not in this revision's scope).
- Bloom is a post step on lookdev panels; the episode renderer's post7 bloom must be set to the same .85/.25 in Pass C.
- Black legs/tee read mid-grey under the lookdev light; check under the Pass B moods.
## Next step
- Owner: pick the Clix face, then "approve" or notes on Pass A. Then Pass B (world + lighting, 6-still sheet).
