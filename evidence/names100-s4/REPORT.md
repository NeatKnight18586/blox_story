# S4 — integrated pilot rough-cut QC

**Technical PASS. Overall PARTIAL: human creative/listening review and private narrated-file delivery remain incomplete.** Background design is frozen; no next polishing phase or final-resolution export.

- [Complete silent captioned/counter review film](silent-review.mp4) —54.733s,720×1280/15fps container, **180×320 scene footage upscaled**, crisp independent text; no audio in this committed file.
- [Four native environment before/after comparisons](environment-comparison.png).
- [23-shot contact sheet decoded from this new film](23-shot-contact.png).
- [20 protected-event/seam frames](probe-board.png) —180×320 WebGL previews, displayed with text; not native720p scene captures.

## Prerequisite / preserved foundation

PR17's initial rerun found a test defect: counter-only comparison included the intentionally changed cap shadow. Restricted the mask to the actual typography band; no runtime/image change. Corrected test/receipt committed as `e6d7046`, reran all required checks successfully, then merged preserving both commits at `5f6975a67124347aceb6f6f87bfabe8523bf192f` (full SHA in preservation receipt). [Actual premerge log](pr17-preflight.log). Its genuine P5 PNG hashes and12 prior film hashes were verified; approved working look is retained.

S4 branch `codex/names100-s4-assembly-qc`. [Preservation](preservation.json):848 protected prior files,704 prior evidence files,12 films,all original scene/caption/rig/appearance/animation inputs unchanged. Original ElevenLabs WAV SHA unchanged and outside Git. No dependency/asset downloads, new rig, framework, lighting redesign or sound generation.

## S4A background gate — PASS, then frozen

Four **true720×1280 framebuffer** pairs at30/1392/1628/700; pixelRatio1, no upscale. [Receipt](environment-gate.json). Native finished originals: [opening30](after-30.png), [reunion1392](after-1392.png), [ending1628](after-1628.png), [bedroom700](after-700.png). Only text is composed afterward. Before clean captures remain ignored; their actual hashes/cameras are recorded. Both sides use identical counter/caption treatments. Only frame30 changes camera.

- Opening: one modest first-shot reframe keeps both existing people readable, with a100-name clue already visible in the first second. Three economical town assemblies: stepped distant roofline, selective warm window patches, one grounded doorway step; existing lamp/porch reused.
- Homecoming: exactly two small home cues—door trim and a subdued warm divided window. Faces/contact and the approved S3B approach remain the focus.
- Ending: two staggered masses in the same roofline assembly provide depth behind Eli; warm connected people remain to his side and empty ground separates him. No extra actors/props around his failed greeting.
- Bedroom: **same-frame clean pixel hash identical at700**. No redressing, camera or lighting changes.

Fourteen small new primitive meshes total, grouped into these five assemblies/cues. Initial attempt cropped the neighbor and misplaced/overemphasized background details. One focused background correction widened the opening and corrected window/roofline placement/brightness. Reviewed final native frames and phone board before any complete capture; no further environment design. Post-integration reset repair also reproduces native1392/1628 pixels exactly.

## Integration and the actual verified blocker

[Versioned manifest](../../stories/names100/s4-assembly.json) references `roughcut.json` for all23 cuts/windows; no copied timestamp table. Existing S2 rule→S3B shy→S2 reveal→S3B ending, correct local offsets, clean counter capture/P5 finish/S4 dressing. All1641 native samples preserve actors/actions/appearance/counters. Only the first camera changes. `[938,945)` stays in reveal; ending starts at945 inside the same authoritative S14, with matched framing. [Gate](integration-gate.json), [20 real probes](probes.json).

The single forward draft captured821 frames, then mandatory reverse validation **failed at global1202**. Later child-walk shoulder state leaked backward into the reused resident, which is outside the main cast's ordinary pose reset. [Failure log](first-render-failure.log). Nothing was published from that failed candidate.

Small opt-in S4 correction: cache the existing residents' authored rest transforms once, reset them before the existing S3B cues. No new animation or legacy behavior change. Added1202 to the cold/reverse probe. It now matches the original forward PNG exactly.

Preserved the original cache; hash-checked/copied its821 inputs into a candidate keyed to corrected source. This was an explicit one-time compatibility recovery, **not a general cross-engine cache bypass**. Existing renderer then freshly rendered **all821 frames in reverse** and compared every pixel hash/state against those inputs before encoding. All match; zero second forward captures. [Recovery receipt](cache-recovery.json), [complete verification/digests](render-verification.json), [actual render log](render.log). Original cache remains intact. A fresh reproduction needs no recovery procedure.

## Captions, counters and narration

Separate reusable [caption JSON](../../stories/names100/captions/s4-full.json), [ASS](../../stories/names100/captions/generated/S4.ass), [SRT](../../stories/names100/captions/generated/S4.srt). All38 transcript phrases/47 events match `VOICE_CUES.md` exactly after normalizing line breaks. Existing S3C words, timing and justified placements retained. Font/outline/spacing/style file unchanged. New phrase splits are explicitly provisional, not forced word alignment; intentional pauses stay blank.

One integrated placement correction: S09 uses an upper empty band to clear the moving MARA tag/hair; S10–S14 use a fixed lower band to clear large close-up heads/tag. Actual libass masks retain all approved S3C clear zones. [47 projected midpoint head/tag checks](caption-zones.json) supplement visual review; not an all-frame occlusion proof.

[All821 actual text masks](overlay-verification.json): expected on/off/blank pauses, safe bounds, no caption/counter intersections, no number in S23. An exact-time libass rounding delay was caught on the7.40s event before composition. Text filters now evaluate on integer milliseconds with a1ms guard, then reset encoded PTS to `N/15`. This changes neither delivered video timing nor audio. Native source boundaries remain exact; the15fps film displays odd events on the next even sample:99 at790,0 at1530; native789/1529 verified separately. P5 charcoal S22/white night treatment unchanged.

Original WAV is available, verified54.682993s/stereo44.1kHz. [Source receipt](audio-source.json). A private narrated review was produced under ignored `renders/names100-s4-review/`, original narration fromt=0, AAC encoding only—no substitute, trim or stretch. [Audio diagnostics](audio-verification.json): both stream starts0; coarse10ms-resolution PCM correlation0.999545 peaks at zero lag. Video54.733333s minus original narration54.682993s leaves **50.340ms trailing video**, not an altered voice duration.

[Assembly/playback verification](assembly.json): silent and voiced821 frames/H.264/yuv420p, continuous PTS,22 cut keyframes, full decode, native browser seeks. Voiced video packets are identical to silent video after mux. Full unmuted54.7456s real-time playback reached the end with442 audible100ms windows, no media error. This verifies audio decoding/presence, **not perceptual speech/acting approval**.

**Delivery PARTIAL:** tool discovery exposes no generic task-artifact publisher; prior failed GitHub binary upload is not retried. No narrated film/WAV committed or published. Only silent review is in this PR. Fallback per brief: user can share this branch ZIP in ChatGPT for private original-audio mux/review; no iPad Desktop step or credential request. Do not call a local path a download link.

## Review findings / limits

The new23-shot board shows correct order, distinct rule resident/Eli, retained bedroom/MARA reveal, homecoming and failed greeting. Counter/name/caption story facts read at phone size. Existing S3B acting stays stylized; S20 conveys reunion through approved staging rather than a new literal running animation. Minor PCF grain/simplified materials remain accepted working-look limits. The rough3D is deliberately soft/upscaled, not final native sharpness. Human review must judge phrase splits, emotional pacing and final-hold strength with narration; no creative/virality claim from logs.

## Commands / measurements

```sh
npm test
npm run test:counter
npm run test:finish
python3 tests/captions.py
node tests/performance-motion.js
python3 tests/s4-overlay.py
# Bounded still/probe reproduction (do not run to rebuild the full film):
npm run proof:s4
node scripts/s4-probes.js
node scripts/s4-caption-zones.js
python3 scripts/s4-probe-sheet.py
# The existing renderer requires a matching successful integration-gate receipt:
npm run render:s4
# FFmpeg only; omit --wav for the silent fallback:
python3 scripts/assemble-s4.py --wav "$NAMES100_WAV"
python3 scripts/s4-contact.py
python3 scripts/s4-audio-check.py --wav "$NAMES100_WAV"
node scripts/s4-video-qc.js
```

All affected checks PASS; [log](regressions.log). Final S09 graphics-only refinement additionally reran exact transcript/821-mask checks, no3D. Core/legacy pixels, F1/F2A/both gaits/P1/P2A/story tests remain passing. Raw PNG/checkpoint cache retained and ignored; no repeated whole-scene forward capture.

| Profiled operation | Wall | Sampled CPU | Peak summed RSS |
|---|---:|---:|---:|
|Initial four native pairs|13.379s|23.56s|721.18MiB|
|One focused background correction, four pairs|13.295s|23.94s|739.23MiB|
|Single821-frame capture + partial verification that caught1202|258.297s|462.17s|820.20MiB|
|Recovered cache, all821 fresh reverse checks + clean encode/verification|208.816s|324.68s|1222.76MiB|
|Affected regression batch|67.842s|50.60s|1162.71MiB|
|FFmpeg assembly/contact/audio checks + full playback QC|77.452s|35.73s|1027.96MiB|

[Receipts](costs.json).0.2s sampled process trees count shared RSS per process; CPU short-process tails can be missed. Some tests/validation ran concurrently; **do not sum wall times as task elapsed time**. Premerge/probes/diagnostics/graphics refinements/final file checks not profiled. Model-token/billing usage unavailable; CPU is not a substitute for that figure. New committed silent film2,760,875bytes; raw cache retained outside Git. No native-resolution full film or sound effects produced.

## Stop / planned release layer only

Stop for user creative/listening review. After approval, a separate low-cost sound edit may add licensed/original night ambience, door/soft restoration/approach cues, restrained reunion transition and deliberate final near-silence under intelligible narration. Keep stems/timings separate; no audio-system implementation now.

Later final720×1280/30fps release QA: three random native screenshots per location, shot-end continuity/sharpness, actual Shorts UI safe zones, original narration/loudness/sync, first-second comprehension/final hold, rights/attribution and iPad playback. No publishing or next-phase work without separate authorization.
