# Episode 1 "egg": delivery

- **Master (upload this):** https://github.com/NeatKnight18586/blox_story/releases/tag/egg-5d6b439, file `egg-master.mp4`
  - 1440×2560, 30 fps, 4381 frames, 146.03 s, 405.06 MB, 21.97 Mb/s (CRF 14), AAC 214 kb/s, −14.8 LUFS, true peak −1.6 dB
  - sha256 `396519210c9f76d284639a30bf65d71855f3fbe5ed1a0a9e50aaf23ddc4b5834`
- **Review proxy:** `review/egg/final-review.mp4`, 1080×1920, 41.4 MB, −14.8 LUFS / −1.6 dB.
  - The farm's proxy came out at 45.6 MB, over the 45 MB cap: the CRF steps 18/20/22 ran out.
  - It was re-encoded from the verified master: lanczos scale to 1080, `proxy_encode_args` CRF 23.
- **QC (`qc.json` in the release):** PASS. min SSIM 0.9877 (≥ 0.985), min PSNR 45.98 (≥ 40), min graded sharpness 1.577× raw (≥ 0.95), loudness and peak in range.
  - Waived by the owner (2026-11-14) and recorded under `waived`: the stone/wall tint check. Only 3 frames had enough stone (need 4); max ΔE 5.63 (limit 4.0).
- **Accepted by the owner:** two one-frame flashes from the stability gate ("render as is").
- **Sound:** 12 sfx (whoosh 3, thud 2, rumble, riser, sparkle, crack, bell 3), no music.mp3; music cues in `review/egg/audio-cues.md`.
- **Farm time:**
  - Run 43597647473: render + assemble 4 h 37 min. Shards ≈ 1 h 3 min to 1 h 56 min in parallel; assemble 2 h 35 min.
  - Run 43645715262: assemble-only re-run from the same segments, 2 h 31 min.
- **Animatic:** skipped for egg only (owner, token budget).
