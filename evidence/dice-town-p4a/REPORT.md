# P4A — complete silent working edit

**Technical PASS. Creative PARTIAL / review pending.** One delivered117.100s working edit, not final animation or a native master. Isolated from direction `ae536aa`; no merge.

[Download silent working MP4](working-edit.mp4) · [editorial contact sheet](editorial-contact.jpg) · [38-shot source/hold map](edit-map.json) · [remaining placeholders](REMAINING_PLACEHOLDERS.md) · [verification summary](verification-summary.json).

## Editorial integration

All38 shots retain their original end-exclusive source30fps boundaries, total3513 frames. No screenplay, narration reference or pacing changes. Output is360×640,30fps,H.264/yuv420p,BT.709,square pixels,117.100000s,one video stream and no audio.117.100−117.098231=1.769ms difference from the protected private recording. No WAV was opened, regenerated, stretched or uploaded; listening/audio sync review remains separate.

Existing P3B footage plays unretimed. Real first/last frames fill the slots; no interpolation, synthetic movement or new WebGL export. Slots:

| Shot/global slot | Existing source frames (end-exclusive) | Prehold / motion / posthold frames |
|---|---|---|
| D03[169,255) | baker[0,57) |6 /57 /23 |
| D04[255,337) | baker[57,96) |0 /39 /43 |
| D15[1220,1332) | mechanism[0,48) |16 /48 /48 |
| D23[1997,2129) | handoff[0,72) |18 /72 /42 |
| D35[3090,3230) | **P3B2B** recognition[0,105) |10 /105 /25 |

Endpoint choices finish at settled rise, released shoes, mechanism rest, Pip receipt and recognition invitation, rather than freezing mid-gesture. Baker source split57 cuts at global255 exactly. Native stills fill D01,D28,D36,D38. D33 holds closed[2898,2928), then open[2928,2985): a hard static-state cut, **not** produced gate animation. D38 still establishes place; actual notebook closing remains absent. D02/D34 remain original labeled proxy.

## Honest runtime coverage

| Material | Frames | Seconds | Runtime |
|---|---:|---:|---:|
| Original unfinished15fps proxy, resampled |2486 |82.867 |70.766% |
| Native still holds |475 |15.833 |13.521% |
| Proof endpoint holds |231 |7.700 |6.576% |
| Unretimed proof footage |321 |10.700 |9.137% |

Proxy + native stills84.287%; including endpoint holds,90.863% remains proxy/held imagery.321 proof frames are footage coverage, not a measurement of unique moving poses. Ten replaced shots represent29.234% of runtime;28 shots remain proxy. Do not infer finished production from replacement counts.

## Inherited proxy timing and verification corrections

The old manifest records `ceil(frame30/2)` boundaries. Actual decoded proxy headers switch **one15fps frame earlier** at almost every cut (first start and final end excepted). Existing old cut-start checks did not catch this because their samples already landed inside the correct new shot. A naive source range can therefore include its neighbor at the end.

The bounded preprocessing script classifies all1757 existing frames using only the rendered Dxx header pixels, against the38 known cut-start references. It verifies38 contiguous monotonic runs and binds the receipt to the original source hash. No OCR package, story rewrite or new images. [Measured ranges](proxy-boundaries.json); max header-match meanRGB error1.490. Per-shot source offsets can be−2 or−1 source30fps frames relative to global editorial origin, and are explicitly recorded. **Output shot clocks never move.**

Fallbacks trim the measured shot run, duplicate its15fps frames at30fps, then trim or hold the endpoint to the exact locked slot. One cloned input endpoint prevents FFmpeg's FPS EOF behavior from discarding the last intended frame. Every span in edit-map includes source range, declared range, formula, boundary shift and tail adjustment. This is transparent held-proxy resampling, not recovery of missing original30fps animation.

Initial validation found the inherited neighbor-frame range error. A proxy-only correction reused the10 substitution segments. Subsequent source-pixel verification exposed inconsistent color interpretation between untagged still/proxy material and BT.709 proof clips. Final segments explicitly convert/tag BT.709 throughout. Three encode passes are costed below; only the final verified film is delivered. No source footage or3D scene was changed.

## Verification performed

- `python tests/dice-town-p4a.py`, `npm test`, and all existing Dice Town source tests PASS. Map checks cover38 contiguous slots,3513 frames, baker255/source57 split, newest mother source, declared static/proxy placeholders, unchanged audio reference and source hashes. [Tests](regressions.log).
-134 decoded output samples compared to normalized **original source pixels**: every shot start/middle/end, plus substitution span boundaries. All38 cut starts and ends match intended source identity. Max meanRGB error2.443/255, gate6/255 allows expected lossy re-encoding. [Source verification](source-verification.json). Contact sheet uses actual final decoded beginning/middle/end frames of all10 substitutions; labels outside imagery. Inspected visually.
- Existing `scripts/pipeline/video.js` verifies FFprobe3513 decoded frames,continuous30fps PTS,117.100s,9:16,SAR1:1,H.264/yuv420p and all38 shot starts encoded as keyframes. Full FFmpeg decode clean. Actual Chromium playback advances and seeks at all37 cuts plus midpoint; no player error. This is real decode/playback/seek verification, not a claim of a human real-time watch/listening review. [Playback receipt](playback.json).
- All1275 earlier tracked files compared byte-for-byte before allowed AGENTS/README/STATUS updates; earlier scenes, proofs, stills, films, tests and3513-frame plan preserved. [Preservation](preservation.json). No audio or native-resolution movie produced.

## Cost and reproducibility

Assembly uses38 low-res temporary shot encodes, then lossless packet concatenation with exact durations and fast-start; only one encode generation in the final film. All temporary clips/decoded checks remain ignored in `renders/dice-town-p4a/`.

Measured assembly passes: initial15.242s, proxy-only repair10.157s, final normalized16.118s =**41.517s** assembly wall including discarded attempts. Combined collected FFmpeg child CPU58.560s user/8.411s system; largest child RSS191408KiB (~186.9MiB), not a summed concurrent-tree peak. Final source-pixel verification3.996s and existing decode/playback check3.491s. These receipts exclude some failed checks, header classification, tests, source work and review; they are **scoped costs, not a complete task/token bill**. Final MP4 1,604,458bytes (~1.53MiB).

[Initial](initial-assembly-receipt.json), [repair](proxy-repair-receipt.json), [final](assembly-receipt.json) receipts preserve commands/timings; initial pixel failures retained as logs. No dependency installations or WebGL rendering.

Reproduce:

```sh
python scripts/dice-town-p4a-proxy-boundaries.py
python scripts/dice-town-p4a-assemble.py
python scripts/dice-town-p4a-verify.py
node scripts/dice-town-p4a-playback.js
python tests/dice-town-p4a.py
npm test
```

## Remaining creative limitations

See the38-shot ledger. Major unfinished work: D05/06 tether; D11/13/16 wobble continuity; D19 family photo; D27/30 Pip's choice; D29/31 valid six roll; D33 moving gate; D34 route; D38 notebook close. Labeled proxy ↔ clean proof changes remain visually abrupt. D02 returns to older plaza framing and D37 to the older reunion proxy. D28 is an environment view, not a final performance cut. A/G are separate camera-bounded footprints; editing cues do not establish a connected navigable map. Existing local proof limitations remain inherited.

Stop for full working-edit review with private narration afterward. No listed fix, merge, final render or next phase performed.
