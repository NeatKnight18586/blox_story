# names100 ending lookdev — PASS within this bounded review

Authority: [ENDING_LOOKDEV_BRIEF.md](../../stories/names100/ENDING_LOOKDEV_BRIEF.md). Review [six native phone-size keyframes](keyframe-board.png), [compact overview](keyframe-overview.png), [4.33s silent MP4](movie.mp4) and [decoded motion sheet](contact-sheet.png). Actual Three.js/WebGL captures; no generated stand-ins. Stop for user visual approval, not a finished ending/episode claim.

| Gate | Verified result |
| --- | --- |
| A — PR10 | Source/timing, original still hashes, random source/clip seeking, P1 recovery/range tests and original H.264 SHA/decode/PTS/cuts/native playback/seek passed. Merged preserving history at `c3c6da6aa02dd8d089a9ac2c5f093bc19cfaa02a`, retaining `405c82c` and ending brief `5b6f869`. Logs: `pr10-*`. |
| B — six stills | PASS after one focused staging correction. All six 360×640 views reviewed before motion. Same bodies/pivots/wardrobes/cached expressions; grounded feet, unobstructed intended Eli eye sightlines, reverse pixels/identity match. [Keyframe receipt](keyframes.json). |
| C — short excerpt | PASS: global `[1480,1610)`, 130 native frames/4.333333s, H.264 Main/yuv420p/BT.709/360×640/30fps. All130 forward/reverse pixels/states match; seven shuffled seeks match source; full decode, continuous PTS, cuts and native HTML playback/seek pass. [Manifest](manifest.json), [seek receipt](motion-seeks.json). |
| D — regression/evidence | PASS: affected source, F1/F2/P1/P2A WebGL, P1 recovery and V1 gold-frame/excerpt checks. [Logs](regressions.log), [preserved archives](regression-comparison.json), [submitted-source/artifact integrity](integrity.json). |

## Six-frame visual findings

| Global / seconds | Story intention and review |
| --- | --- |
| 1040 /34.667 | Eli understands: thoughtful asymmetric brows, restrained mouth, cold familiar cap/blue vest. |
| 1090 /36.333 | Choice: opened door exposes waiting pale people; Eli turns toward the threshold. Existing hinged door reused, with ending-only aperture and doubled leaf width so the six-part body fits. |
| 1210 /40.333 | Sacrifice: nervous Eli and clear52, without an early count change. |
| 1370 /45.667 | Home: warm parent/child reunion tableau at a domestic threshold, downward/upward gaze and hand/shoulder contact. Mara retains her coral/bob identity behind them. |
| 1529 /50.967 | Zero: shocked Eli, exact1→0 boundary, still fully present. |
| 1600 /53.333 | Ignored: Eli stays solid, cold/desaturated and sad in the foreground while Mara turns toward the reunited people. Shadow/feet remain; no death/disappearance effect. |

Initial door framing was too tight and overlapping reunion arms/Mara obscured the child. The single art correction widened the door view, reduced arm angles and separated the family/Mara in depth. [Genuine correction comparison](staging-correction.png). Flush paving was then checked at floor height; the final six frames were verified again. No second art redesign. [Reflection comparison](reflection-comparison.png) supports replacing premature relief with thoughtfulness in Eli's last18 V1 frames, via separate `scene-reflection.json`; original approved V1 source/movie/evidence remain immutable.

## Timing, scope and reuse

`scene-ending.json` schedules source global `[945,1641)` with the existing structured cast/cameras/actions. Only six keyframe locations and the short excerpt were rendered, **not all696 ending frames or the1641-frame episode**. Existing readable walk is reused in the unexported names shot; no animation engine/rig change. Two canonical six-part residents are preposed extras, not separately simulated crowd actors. One small courtyard/home facade, existing bedroom/door, cached counter textures and explicit-time story cues are the only additions. No framework/dependency, captions, audio, physics or opening implementation.

| Counter | First legal global frame |
| --- | --- |
| 99 | 945 (continues original789 spend) |
| 52 | 1210 |
| 18 | 1236 |
| 3 | **1261** |
| 1 | **1278** |
| 0 | **1529** |

Written42.01s/42.57s cues fall between native frames. Rounding **up** gives1261/1278, rather than displaying numbers10ms/3ms before their phrases at the brief's approximate1260/1277. Zero1529 lies inside49.80–51.28s; no fading or disengagement begins earlier. All696 pure cue samples are tested for monotonic counts and absolute clocks. Original100→99 at789 and Mara restoration890–926 are unchanged, including every cue sample in the reflection variant. WAV remains external: these are written-window timings, not certified sample-level audio alignment.

## Reproduce and measured cost

```sh
npm test
npm run test:p1
npm run test:ending
python3 scripts/measure-render.py --shots stories/names100/scene-ending.json \
  --range 535:665 --out renders/names100-ending-excerpt \
  --report evidence/names100-ending/resource-usage.json
# Equivalent export: npm run render:names100:ending
npm run test:ending -- --motion
```

The existing P1 range maps output i→source535+i→global1480+i without restarting action time. Cut keyframes are output10(global1490) and66(global1546); zero is output49(global1529). ANGLE/SwiftShader WebGL2/Chromium141 rendered; systemChromium156 verified native H.264 playback/seek. Reviewed every130 consecutive source frames and decoded sheet. Raw frames/cache remain ignored and older resume caches retained.

| Measurement | Result |
| --- | --- |
| Final six-keyframe verification wall | 6.053s; child rusage receipt is not total browser CPU/tree memory |
| Capture / full reverse check | 22.799s /24.203s |
| Encode / movie verification | .465s /1.046s |
| Exporter total / wrapper wall | **49.155s /49.659s** |
| Sampled renderer-tree CPU | 86.98s user +7.53s system |
| Peak sampled summed subtree RSS | **685.09MiB** |
| PNG / movie bytes | 7,394,637 /91,046 |
| Cores / encoder threads | 2 /2 |

[Resource receipt](resource-usage.json): CPU sampled every.25s is a lower bound; one-second RSS sums count shared pages per process. Costs cover the final measured pass/export, not all development activity. All older tracked films remain byte-identical. Browser-generated historical differences were compared against prior known reruns/decoded reports before restoring their archives. No old tests/tolerances weakened. Full old-film exports/full-slice reveal sweeps were not rerun; affected source, recovery, casting and selected original gold pixels provide bounded regression coverage.

Remaining visual limits: the reunion is an economical hand/shoulder-contact tableau, not a fully animated embrace; the final wide trims the child's outer forearm at the right edge while keeping its face/body readable. Door acting is symbolic rather than handle IK. Background architecture is deliberately sparse; opaque color loss suggests ghostliness without volumetrics. Only the selected stills and130-frame excerpt have visual certification; the rest is scheduled/pure-tested. Native Safari/cross-GPU identity, full ending continuity and final WAV alignment await later approval. No whole ending/episode,720p export or voiceover produced. Stop at this PR.
