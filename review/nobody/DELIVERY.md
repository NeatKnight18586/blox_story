# Nobody: delivery (Amendment A2, 2026-11-13)

**Upload this file to YouTube:** `nobody-master.mp4` (1440×2560). Never upload `final-review.mp4`, which is the 1080 review copy.

## Where the master is
- **Sent directly** to the owner in the Claude Code session (2026-11-13).
- **GitHub prerelease** [`nobody-66fd10c`](https://github.com/NeatKnight18586/blox_story/releases/tag/nobody-66fd10c), made by the render farm (run 3: assemble 84.5 min, `v2:qc` PASS). Assets: `nobody-master.mp4`, `final-review.mp4`, `report.json`, `qc.json`.
  - The farm master: CRF 14, 16.29 Mb/s, 253.6 MB, −14.0 LUFS, TP −1.5 dB; QC SSIM ≥ 0.990, PSNR ≥ 47.0 dB.
  - It is graded from near-lossless segments, so CRF 14 already met the 16 Mb/s floor.
  - Either master is fine to upload. The one sent directly (below) has the higher bitrate.

## Master (local render, the file that was sent)
| | |
|---|---|
| Render path | **native 1440×2560** (local, 3 workers, 63.8 min; no upscale) |
| Video | H.264 High, 1440×2560, 30 fps, yuv420p, BT.709 (primaries, transfer, matrix), limited range, closed 15-frame GOP |
| Encode | preset slow, tune animation, **CRF 12** (CRF 14 gave 15.8 Mb/s, under the 16 Mb/s floor), **22.35 Mb/s** video |
| Audio | AAC-LC 48 kHz 320k, −14.0 LUFS, true peak −1.5 dB |
| Length / size | 122.500 s, 346.3 MB (sha256 `20d82ab76e1830aa…`) |
| QC | `npm run v2:qc` **PASS** (`qc.json`, `qc-crops.png`) |

## Review copy in git
`review/nobody/final-review.mp4`: 1080×1920, downscaled from the same graded 1440 frames, CRF 22, 39.8 MB.

## Before upload (PUBLISHING.md)
1. Upload the master and set it to **Unlisted**.
2. Wait until **1440p** appears in YouTube's quality menu (YouTube processes 1440p+ separately; it can take a while).
3. Check it on a phone, then make it **Public**.
4. The description must include: "Original fan-made animation. Not affiliated with, sponsored or endorsed by Roblox Corporation."
