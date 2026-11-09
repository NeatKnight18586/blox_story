# S5 — restrained speaking proof

**PASS for bounded technical + visible-acting checks; human creative/listening approval pending.** No full episode or final production render.

[One before/after comparison sheet](comparison.png) · [Native whisper preview](whisper.mp4) · [Native naming preview](naming.mp4).

The committed previews are **silent720×1280/30fps** WebGL footage with unchanged editorial counters/white captions. They are genuinely native, not S4 upscales. Private versions use exact original-narration sample offsets; WAV/voiced MP4s remain outside Git. No user-accessible narrated download is claimed.

## Integration / preservation

PR18 reviewed at `6e3b84b`, relevant tests rerun and genuine54.733s film hashes/full decode/821PTS/22cuts/native playback verified. Also cold/reverse tested resident1202 and ghost restoration. Its positive narrated creative review is recorded by the user's S5 brief. Merged preserving all commits at `097c9e7ee621a02e52b2012a13929fe82760dc50`. [Preflight](pr18-preflight.log), [film checks](pr18-video.log), [merge receipt](pr18-integration.json).

[Preservation](preservation.json):899 protected prior files,734 prior evidence files,13 old films and private full narrated S4 movie unchanged. Original WAV SHA unchanged. All original face/expression/appearance/body/action/environment/shot/caption/counter files remain byte-identical. Only optional speaking metadata/render hook added to core files; no new dependency.

## Small implementation / directed timing

[Speaking layer](../../appearance/speaking.js): compile authored keys, sample explicit absolute frame, apply to three persistent meshes. Closed curved stroke, narrow oval, open oval; one shared material per avatar. No jaw/teeth, skinning, per-frame mesh creation, sine loop, waveform driver or phoneme claim. Sparse keys use asymmetric holds and smooth interpolation.

[Opt-in cue JSON](../../stories/names100/s5-speech.json), injected into copied S4 inputs by [small loader](../../scripts/s5-story.js). Existing1641-frame clock/23cuts/cameras/actors/actions/appearance/counters/voice/captions untouched. No whole-story manifest rewrite or duplicated animation engine.

| Performance | Authored keys / visible frames | Intent |
|---|---|---|
|Mara whisper|keys776–788; slight visible opening777–787|One low-amplitude utterance, nervous eyes/brows retained, no smile; lips seal before99 at789.|
|Name A|keys1204–1209; visible1205–1208|Short narrow syllable before52.|
|Name B|keys1228–1235; visible1229–1234|Slightly broader held syllable before18.|
|Name C|keys1253–1259; visible1254–1258|Narrower, shorter release before3.|

Only these openings occur. Shy introduction, ghost-watching, all narrated numerical windows, reunion, zero and failed greeting stay sealed. Numbers52/18/3/1 remain narrator speech, not mouthed names. Naming is **implied character speech in pauses**, not invented audible dialogue.

One targeted cue correction after the first native proof: S16 at1115 shows Eli's back, so removed hidden early naming pulses. Existing S17 close-up at1232 demonstrates the visible name instead;1248 remains a closed-mouth “Eighteen” control. No camera change to expose lips. Three varied visible bursts replace the initial four hidden/visible candidates; no further design iteration.

Face compatibility: cached original mouth is hidden only when the new mouth is drawn; eyes/brows unchanged. Layer stays inside current face hierarchy, excluded from P5 ghost-depth helpers. Every frame restores cached original mouths before choosing a shape; `clear()` restores legacy expression exactly. To honor the explicit **closed during silent/narrated surprise** request, S5 reversibly replaces the old static startled O with a sealed stroke while retaining its wide eyes/brows. Original O geometry/material remains cached and unchanged. Default/no-speaking mode retains the original look.

## Native / mobile review

Seven matched native720×1280 pairs:30,780,1115,1232,1248,1392,1600. [Framebuffer/camera/hash receipt](native-keyframes.json). All camera matrices unchanged. Sheet scenes reduced to180×320; bottom four crops are1:1 native pixels, clearly labeled. Full-resolution source plates stay ignored under `renders/names100-s5-stills/`, not accumulated in Git.

[Full-image pixel checks](pixel-checks.json): only mouth bounds change at780 `[172,736,375,781]` and1232 `[319,571,432,610]`. All five other controls are pixel-identical to S4. This preserves eyes/brows, clothing and sets. Current preview PNGs780/1232 also match these native hashes exactly. Corrected1115 was genuinely rechecked and remains pixel-identical/closed.

**No environmental additions.** Opening person/100-rule clue and existing lit windows read; reunion doorway/window already conveys home; ending's warm connected group and negative space isolate Eli. No camera-visible problem justified more geometry. Bedroom/environment/light factories unchanged.

Both actual MP4s decoded frame-by-frame:95/95 mouth crops inspected at phone scale. Whisper opens once and releases; names have narrow/open/narrow bursts with different holds and pauses, no continuous flapping. Raw decoded strip stays temporary. [Motion receipt](motion.json) includes every frame digest, exact offset, codec/decode/playback checks. No double mouth, visible z-fighting, loose jaw or new body clipping observed. Existing stylized rigid acting and small PCF grain remain.

## Motion / narration checks

| Clip | Global range | Native frames | Duration |
|---|---|---:|---:|
|Whisper|`[760,798)`|38|1.266667s|
|Naming|`[1203,1260)`|57|1.900000s|

Exactly two bounded captures through existing P1 resumable/atomic exporter. All95 reverse PNG/state comparisons pass; H.264/main/yuv420p/9:16/30fps, full decode, continuousPTS, original cut where present and native playback verified. [Final source fingerprints](source-binding.json) match both completed previews. No repeated motion render.

Separate FFmpeg stage evaluates unchanged global ASS/counter timing, then restores local videoPTS. Private audio trims use original44.1kHz sample indices760×1470→798×1470 and1203×1470→1260×1470, resetting only excerpt timestamps; no stretch/regeneration. Source PCM segment hashes and AAC-decode correlation0.999630/0.998952 both peak at zero lag (3.33ms diagnostic resolution). [Sync receipt](audio-sync.json). Both private clips played fully unmuted, audible decoded signal/no media errors. [Playback](audio-playback.json). Not certified phoneme alignment or human listening; private narrated copies are not committed/published.

## Tests / costs / reproduce

Final affected batch PASS: `npm test`, `npm run test:counter`, `npm run test:finish`, `npm run test:speaking`, `python3 tests/captions.py`, `node tests/performance-motion.js`. [Log](regressions.log). Existing F1/F2/both gaits/P1/P2A/story tests preserved. All1641 source samples unchanged; new44 real WebGL speech/silence/count/ghost/resident boundaries pass cold/reverse pixel/state checks, persistent mouth geometry/material/body identity and no mouth in ghost depth pass. [Seeking](seeking.json). A supplemental test lookup was adjusted for legacy worried faces' unnamed mouth stroke; face factory stayed unchanged.

| Profiled operation | Wall | Sampled CPU | Peak summed RSS |
|---|---:|---:|---:|
|Initial native paired stills|16.988s|31.59s|1054.13MiB|
|Two native clips, all95 reverse checks, encode/mux/playback|133.366s|217.43s|1652.46MiB|
|Affected regression batch|54.305s|90.70s|1162.77MiB|

[Cost receipts](costs.json).0.2s Linux process-tree samples; shared RSS counted per process, short CPU tails may be missed. Some tests overlapped rendering; wall sums are not task duration. Premerge, initial diagnostics, single corrected-keyframe check, compositing/decoded strip/PCM/full-audio checks/final file verification unprofiled. Model-token/billing counts unavailable; CPU is reported separately. Only one sheet/two short silent previews plus compact receipts/logs committed; raw frames/caches/private narration stay ignored.

```sh
npm test
npm run test:speaking
# Same bounded native still proof only:
npm run proof:speaking
# After reviewing and marking its native-keyframes receipt PASS:
node scripts/s5-previews.js "$NAMES100_WAV"
python3 scripts/s5-review.py
```

**Stop for user review.** Recommend retaining this restrained mouth layer and current environments. No realistic lip-sync, new character/background system, sound pass, full native episode or automatic next phase. Original narration remains authoritative; human audiovisual approval is still needed before the separately authorized final production gate.
