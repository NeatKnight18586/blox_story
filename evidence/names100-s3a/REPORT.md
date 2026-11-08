# S3A — review-only evidence

**PARTIAL overall: technical PASS, visual creative PARTIAL, audio BLOCKED.** [Issue ledger / three selected proposals](../../stories/names100/S3A_ISSUE_LEDGER.md). No runtime, story JSON, rig, appearance, animation, camera, event timestamp or movie changes.

## PR13 verification and integration

Reviewed PR13 head `decc53f8b4dbb047a4c979160caa2c268f65e149`, including anonymous rule/shy scene logic, bounded story coordination and transparency correction. Before merging, reran:

```sh
npm test
node tests/roughcut-framing.js
npm run test:ending -- --motion
```

[Actual regression log](regressions.log): F1 canonical anatomy/appearance, F2A explicit-time actions, both F2B gaits/contact metrics, production/P1/P2A source regressions, reveal/V1/ending/style/S2 timings and deterministic seeking passed. Genuine WebGL ending motion seeks confirmed pixel/state repetition, persistent six-part cast, faces, ground contact and zero event. This targeted browser test did render its bounded regression samples; **the episode was not rebuilt or rendered**.

Also ran existing `verifyVideo()` against the saved S2 film: all821 frame timestamps, full FFmpeg decode,22 scheduled cut keyframes, native Chromium playback and seeking at every cut passed. H.264 Main/yuv420p,180×320,15fps,821 frames,54.733333s,one video stream,no audio. System Chromium156 handled native playback via existing fallback; WebGL regression used the installed renderer browser. [Full results](pr13-video-verification.json), [reproducible preflight command](preflight-command.txt). Run the command file from this repository using `bash evidence/names100-s3a/preflight-command.txt`; it writes fresh receipts to `/tmp`, not over saved evidence.

Source/engine fingerprints match the S2 manifest;39 saved native PNG hashes and all eight previous movie hashes match. The original S2 reverse-pixel/state verification is recorded and fingerprint-matched; **821 frames were not newly rendered to repeat that test**. S2 MP4 SHA256: `3fe9b34c46ad16e41452d0d0b7ea28a91facf4a824eb6bd41a2474416c8ac6e3`.

Merged PR [#13](https://github.com/NeatKnight18586/blox_story/pull/13) with a merge commit `bf0f895f0c6e922460d2d49a298239de4efa8efe`, retaining `fe77fca`, `decc53f` and the user's S3A brief commit `c5c0ce7`. No history rewrite. The WebGL regression rewrote one historical JSON report with equivalent decoded content; that formatting-only change was restored before integration ([receipt](preflight-preservation.json)). [Final preservation receipt](preservation.json) compares runtime/assets/tests/story inputs and every prior evidence file against merged main.

## Visual audit and audio availability

Inspected the existing native board/event images and five continuous decoded-film sheets (2fps throughout54.733s), at90×160 thumbnail size. Compared source camera data: S05/S06 match exactly; S04 is a different medium two-shot. S18/S19 match; S20/S21 widen. S21/S23 share a camera, with the final appearance/attention change. This is subjective visual assessment of authentic existing WebGL footage, not a claim of audience testing or audio listening. See the23-shot ledger for impacts and only three selected changes.

Decoding command (temporary directory, no new video and no engine invocation):

```sh
mkdir -p /tmp/s3a-review
ffmpeg -v error -i evidence/names100-s2/movie.mp4 \
  -vf 'fps=2,scale=90:160,tile=6x4:padding=3:margin=3:color=0x202020' \
  -fps_mode vfr /tmp/s3a-review/sheet-%02d.png
```

No new media committed. Reuse [S2 board](../names100-s2/storyboard.png) and [original film](../names100-s2/movie.mp4) for review. The generated sheets are temporary derivatives of that film, not additional visual work.

[Audio scan](audio-availability.json): no local WAV/FLAC/MP3/M4A/AAC files under `/workspace` (excluding `.git`/dependencies), no tracked audio, no newly attached original input. The brief explicitly identifies the original WAV as outside Codex. **No audio review copy could be made.** No replacement voice, altered narration or inferred phoneme alignment. Supplied nominal54.682993s duration is not a fresh audio measurement. Final creative approval remains pending original-audio review and user review of the three proposed fixes.

## Measured cost and limits

| Operation | Wall | CPU | Memory | Scope |
|---|---:|---:|---:|---|
| Successful PR13 preflight |19.255s|28.06s sampled|908.05MiB sampled summed process RSS|Source tests, bounded WebGL seek regression, existing-film verification |
| Existing-film review-sheet decode |0.216s|0.328s|49.90MiB maximum child RSS|One FFmpeg decode; no WebGL render/MP4 encode |

[Preflight measurement](preflight-cost.json), [decode measurement](decode-cost.json). Sampling at0.2s can miss short processes; summed RSS counts shared pages per process. CPU is a sampled lower bound. These are command costs, not total assistant/human review time or an API/token bill. An initial attempt to use unavailable `/usr/bin/time` failed before running FFmpeg; Python/resource then measured the successful decode. No episode render, audio generation or final-resolution export cost was incurred.

Remaining limits: missing original narration; subjective silent pacing; tiny draft tag/HUD text; symbolic six-part acting; no fresh full-episode pixel rerender (deliberately prohibited), no native iPad/Safari or audience test. Technical verification does not certify engagement. Stop before implementing S3B or rendering final production.
