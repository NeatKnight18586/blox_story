# The Fear Bell: final delivery

- Master (v2, Heights + caption fix): `renders/v2/fearbell-master.mp4` (not in git; rendered locally). 1440×2560, 24 fps, H.264 + AAC,
  90.458 s (2,171 frames), 195.1 MB, 17.0 Mb/s, −14.6 LUFS, true peak −1.6 dB.
- Review proxy: `review/fearbell/final-review.mp4` (1080×1920, 90.458 s, 37.5 MB).
- How it was made: `stories/fearbell/final.sh`. The farm (`render.yml`) renders `episode.json` on the raw VO, with no meme gaps and no CC0
  cache restore, so this final used the documented local fallback (`v2:render --final`) on the gapped spec, with the CC0 set fetched by
  `scripts/v2/fetch-assets.py`. Look B (cityDay2 + outline classic), v7 one-word captions (290), the clock FX, end = voice + 0.5 s.
- QC (`review/fearbell/qc.json`): PASS. Min SSIM 0.9854, min PSNR 43.85, min sharpness 1.402, max ΔE 2.92. No waivers.
- v2:capcheck PASS (`review/fearbell/capcheck.json`): 290/290 script words, 0 missing, 0 out of order, max onset error 45 ms, 234 captions (56 two-word), none during a meme clip, none shorter than a frame.
- v2:stability PASS (203 views, worst S03 0.199 %). Plan gate exit 0, fgleak PASS (max 8.4 %), v2:seek PASS.
- Meme gaps audible in the final mix (`review/fearbell/gapvol.json`; whole-mix mean −15.4 dB):
  G1 "Heights." g1_scream 6.49–7.70 s: mean −12.2 dB · G2 "cheeseburger." g2_canihave 14.50–16.15 s: mean −20.8 dB ·
  G3 "bite of his fear." g3_mmm (the replaced file) 32.96–34.59 s: mean −19.3 dB.

## Upload copy
- **Title:** In this town, your WORST FEAR spawns! 🔔 #shorts #roblox
- **Description:**
  Every morning the Fear Bell rings, and your worst fear spawns right next to you. Mine never has... until today.
  Watch closely: the loophole is hiding in plain sight. #shorts #roblox
- **Pinned comment:** What would spawn next to YOU when the Fear Bell rings? Did you find the loophole before me?

## Continuity
- docs/CONTINUITY.md row confirmed: "the Hall's bronze bell is CRACKED for good", world flag `bellCrack` / spec `clock: [{fx: 'crack'}]`.
  In this episode the crack lands on "cracked" (row 32) and is still visible at the row-53 morning DONG (the 53b crack insert). The row
  still reads "pending" in its episode column: docs/ is outside the episode freeze (ep:check), so that wording is left for the owner.
