# tuft E5 — final 1080p delivery

Master (not in git): `tuft-1080.mp4`, 1080×1920 H.264 CRF 16, 30 fps, 103.2 s, 89 MB, -13.9 LUFS / TP -2.0, pop-shorts-v3 captions, squeak sfx on row 58 only (94.48 s).
Render: 3096 frames, 1080×1920 + AA, 4 workers, 1105 s wall (1.3 s/frame; estimate was ~35 min).

**Release link: NOT CREATED.** `gh release create tuft-e5-1080` returned HTTP 403 ("Creating, editing, or deleting releases is not permitted for this session type"). The file is on the session container only (/tmp/tuft1080/out/tuft-1080.mp4); attach it to a prerelease `tuft-e5-1080` from a session that may create releases.

QC (run on the 1440 master of the same picture, qc.py cannot decode 1080 files): see qc.json. Failures: size (expected 1080, file was 1440), tint (3 stone frames, need 4), SSIM/PSNR at frames 1421, 2322, 2833, 2838. Loudness, duration, captions pass.
Sheet: final-sheet.png.
