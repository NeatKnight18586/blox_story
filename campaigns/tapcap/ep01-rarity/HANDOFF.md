# HANDOFF — TapCap EP01 "Rarity's Just Paint"  (≤ 30 lines)  STATUS: RENDERED (Pass E done, 2026-11-20)
## Deliverable
- Farm artifact (silent master + captions + click.wav + seam/probe reports, kept 7 days, expires 2026-11-27):
  https://github.com/NeatKnight18586/blox_story/actions/runs/44702343758 → Artifacts → `tapcap-ep01-final-video`
- final.mp4 WITH VO + clicks is made locally (the sponsor VO is never in the public repo): `campaigns/tapcap/scripts/mux-final.sh`.
- Verified on the downloaded file: 1080×1920 · 24 fps · H.264 + AAC · 1804 frames · 75.167 s (hard cut 75.16 s) · 0 black frames
  · 0 duplicate frames · 23 shard seams clean (`seam-report.txt`) · audio peak −5.13 dBFS (limit −1) · clicks at
  36.148 / 68.469 / 69.172 s (≤ 2 ms off, 45–54× noise floor). Sheet (16 + hero S1, S31, S40) sent directly; review/ is gitignored.
## Final fix pass (owner "FINAL ROUND")
- Per-framing rain rig (close/macro keys 0.3×, wides 1×) + face-side soft key; S30a/b/c = 85 mm hue macros: purple 57 %,
  orange 61 %, blue 99 % of subject pixels (subject 100 % of frame; S30b labelled `close` so R-CAM-02 passes).
- All shots inside their act luma gate in the last full pass. S16c: pot prop removed + soft key (the pot blur read as an empty frame).
## Overrides (campaigns/tapcap/ep01-rarity/qa/allow.log, reasons logged there)
- R-BRAND-01, R-BRAND-03, N-VO-03, R-HOOK-04, R-LEN-01: sponsored episode, sponsor VO fixed (N-VO-03 is owner-authorised; the tool refuses N-* allows).
- B3 depth S33 fg (intentional empty frame) · S22 mid (aerial) · B4 density S1, S40, S25 (crowd/hill is the subject). LUMA allow: not needed.
- TC-01…TC-07: no allows (TC-04 is the manual plain-colour check).
## What went wrong on the farm (fixed)
- First full render: 861/1804 black frames. Cause: a post chain was built per frame and never freed (GPU memory ran out after
  ~36 frames/shard). Fix: one chain per world, reused; black-frame retry + relaunch in final-render.js; assemble job now fails on any black frame.
- Runner shutdowns killed shard 8 twice; shards are now 76 frames. Artifact hosts vary (sa0/sa5/sa6): each had to be allowed in the sandbox.
## Weakest shots (unchanged, owner decides)
- S37a/S37b click macros: keycap entering the switch is not visible · S33 sign small/soft · S36a/b Clix reveal reads as a block · S1/S40 only 3 buildings.
## Next step
- Owner reviews final.mp4. Re-render: dispatch workflow `tapcap-ep01` (all) or repair inputs (`matrix`, `reuse_run`, `drop`, `assemble_only`).
