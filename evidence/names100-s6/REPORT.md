# S6 — The Boy Who Never Said a Name: native master candidate

**Native video PASS · overlays PASS · available audio/sync PASS · playback PASS · private voiced delivery PARTIAL · final iPad approval PENDING.** Stop before publishing.

- [Complete silent final candidate](silent-master.mp4): genuine720×1280/30fps,1641frames,54.700s; white captions/P5 counters.
- [Separate clean3D master](clean-master.mp4): same native footage without text/audio; reuse for cheap composition edits.
- [23-shot contact sheet from the new final candidate](23-shot-contact.png).
- [True native versus old upscale,1:1 sharpness comparison](sharpness-comparison.png).
- [Native preflight phone board](preflight-board.png). Ten full-resolution decoded protected PNGs `native-g*.png` accompany this report, including whisper780, all three names1206/1232/1255, restoration925, reunion1392,zero1529 and ending1600/1640.

## Baseline and bounded changes

PR19's native evidence hashes were verified and the sheet reviewed. Existing `npm test`, counter, finish, speaking and S4 overlay checks reran successfully before history-preserving merge at173b4d7. [Regression log](pr19-regressions.log). The user's S4/S5 creative baseline is retained. No character,expression,environment,camera,acting,counter,caption,voice or event-time changes. No new dependencies/art/sound assets. Narration-only mix; no cleared sound assets were supplied.

The new narrowly scoped `scripts/render-native-story.js` uses `loadSpeechStory()`—S4 plus S5, not the old draft. Legacy exporter/defaults and all existing runtime/test files remain unchanged. Native mapping is **g=i**,every integer0–1640,with actual720×1280 PNG dimension checks. All seven accepted S5 native keyframe hashes match the new full capture exactly. All23 cuts come directly from original roughcut authority, without15fps rounding.

## Preflight / safe capture

[Twenty genuine native WebGL preflight/reverse checks](probes.json):0,259,482,776,780,788,789,889,890,925,926,945,1202,1232,1248,1392,1528,1529,1600,1640. Reviewed phone board: correct joins/cast/ghost/mouth, no HUD, no stale resident pose. [Gate](preflight.json).

One native capture, resumed without discarding or redrawing verified samples. A deliberate checkpoint pause after131 frames proved clean pause/resume. Usage interruption later left1155 saved frames and a zombie-process lock; process state was verified and only that orphan lock removed. [Receipt](interruption.json). Final run hash/dimension-validated and reused all1155,then captured remaining486. Total separately captured inputs1641,not repeated whole renders. Original checkpoint/cache retained.

Existing P1 ownership/atomic-write/path/lock helpers reused unchanged. Cache is bounded at1GiB,not the old256MiB draft ceiling; actual final cache347,792,698bytes. Job fingerprint includes effective S5 inputs,source engine/browser/backend/platform,720×1280,30fps and1641frames. Resume validates each PNG/hash/state/index before reuse. No result published until complete encode/verification.

After capture, selected20 protected frames were freshly sampled in reverse and matched pixels/state. **Not a full1641-frame reverse test.** [Full frame digests/state-clock verification](render-verification.json). Every source index is present exactly once; native789=99 and1529=0,with preceding frames100/1. Counts98/97/52/18/3/1 and restoration890–926 verified. Pixel-identical static poses are legitimate samples,not dropped frames.

## Separate compositing / final verification

`scripts/assemble-s6.py` reads the clean master: **no scale filter**. Existing P5 ASS then existing S4 white ASS evaluated on guarded integer-millisecond native30 clock; outputPTS restored toN/30. Approved source/style files unchanged. [All1641 actual libass masks](overlay-verification.json): safe bounds,on/off timing,no caption/counter collision,no counter throughoutS23. Text/voice edits need only FFmpeg,not WebGL.

Clean,silent composite and private voiced candidate: H.264/yuv420p/720×1280/30fps/9:16,1641 decoded frames,continuousPTS,all22 exact native cut keyframes,complete decode,first/last frames and real browser playback. [Assembly/playback receipt](assembly.json). Voiced video packets are identical to silent composite. Full narrated playback ran unmuted to completion with audible decoded signal/no errors. Native contact sheet/selected full-size frames reviewed: opening,bedroom,whisper,restoration,naming,reunion,zero and forgotten ending remain legible. Native eyebrow/eye edges are visibly sharper than the previous180p upscale; no new rendering/art intervention.

Original `ADAM 1.WAV` was present and SHA-verified. Muxed unchanged fromt=0,AAC only,no trim/stretch/replacement. Audio54.682993s,video54.700s:17.0068ms trailing visual pad. [Audio receipt](audio-verification.json): stream starts0,coarsePCM correlation0.999545 at zero lag (10ms diagnostic resolution). Not perceptual listening or phoneme certification. Source gain unchanged; iPad loudness/intelligibility/Shorts UI remain human review tasks.

**Private delivery limitation:** available tools expose no generic task-file publisher. Prior failed GitHub release upload was not retried. Narrated final/WAV remain ignored under workspace renders/outside Git; no local path is called downloadable. Clean/silent masters are committed for authenticated download. Approved fallback: share this branch ZIP in ChatGPT for original-audio mux/review. No publishing or credential request.

## Preservation / actual measured costs

[Preservation](preservation.json) verifies932 prior protected files and all15 prior tracked movies—including13 archives and the two S5 proofs—unchanged. Original code/tests/scenes/overlays preserved; new export/verification scripts only. Raw PNGs/cache/private audio not committed.

| Measured scope | Wall | Sampled CPU | Peak summed RSS |
|---|---:|---:|---:|
|Initial131-frame checkpoint test|70.163s|133.56s|696.77MiB|
|Final resume:1155 reused/486 captured,selected reverse,encode/verify|390.776s|649.77s|1392.64MiB|
|FFmpeg assembly,full playback,contact/audio QC|87.551s|53.94s|1024.36MiB|

[Pause](pause-cost.json), [final-resume](native-cost.json), [assembly](assembly-cost.json) receipts. **Interrupted middle1024-frame capture CPU/wall profiling did not finish and is unavailable; these numbers are not total render cost.** Preflight,diagnostics/mask tests/final extraction/file checks unprofiled.0.2s process-tree sampling counts shared RSS per process and may miss CPU tails. Model-token/billing usage unavailable and not inferred from CPU. No cost total or complete timing claim.

## Reproduce / review stop

```sh
node scripts/s6-preflight.js
# Review its real native board; matching engine gate must pass before export.
node scripts/render-native-story.js --out renders/names100-s6
# --stop-after N safely checkpoints; rerun same command to resume.
python3 tests/s6-overlays.py
python3 scripts/assemble-s6.py --wav "$NAMES100_WAV"
node scripts/s6-video-qc.js
python3 scripts/s6-contact.py
python3 scripts/s6-audio-check.py --wav "$NAMES100_WAV"
```

No real iPad/phone approval or audience-retention claim. Existing stylized rigid motion,minor PCF grain and approved provisional internal caption splits remain. Final candidate awaits the user's complete iPad watch—especially voice level,first-second comprehension,final emotional hold and actual Shorts safe zones. Stop before publishing; no automatic further polish or production run.
