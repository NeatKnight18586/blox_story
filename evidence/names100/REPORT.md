# names100 — central reveal proof

**PASS for this bounded silent scene proof only.** [Review MP4](movie.mp4) · [decoded contact sheet](contact-sheet.png) · [critical before/after strip](critical-beats.png) · [frame map/reproduction](../../stories/names100/SCENE_PROOF.md).

## Verified story-facing result

The proof covers **native global frames [482,945), 16.0667–31.5000s**, using two existing P2A avatars in a small cold bedroom/window scene. One unrigged distant silhouette joins live ghost Mara; no crowd engine. The weathered MARA tag rises, Eli's restrained lean and silent “Mara…” cue lead to **100 → 99**, and the same translucent Mara regains opaque warm skin/hair/clothing and her existing smile.

The initial economical **360×640/15fps draft** was rendered and inspected first. It skips odd global frame 789 and needs a 33ms terminal hold, so the primary review movie keeps the low resolution and increases only frame rate to **30fps**. All 232 shared draft/native samples match pixel for pixel with the same engine hash ([comparison](sampling-comparison.json)). The [initial draft](draft15/movie.mp4) and its full manifest remain available; **no 720×1280 story proof or full episode was rendered**.

Native output frame f maps to global **482+f**. There are exactly **463 frames**, duration **15.433333s**, no padding. Global **788 = 100**, **789 = 99** (local 306/307); the change is after the written name window near 25.84–26.28s. Mara remains a ghost through that change and restores during **890–926 = 29.6667–30.8667s**, inside the specified 29.63–30.92 window. [Before 100](global-788.png) · [after 99](global-789.png) · [MARA insert](global-762.png) · [ghost before restoration](global-888.png) · [human](global-926.png).

The WAV is not present in GitHub and was neither accessed, generated nor muxed. Timing follows VOICE_CUES.md; no claim of phoneme/sample alignment with the original recording. The on-screen whisper is a silent text cue, not lip sync. All later story scenes, door opening, countdown, town, sunrise and reunions remain unimplemented.

## Preflight / PR #8 integration

Reviewed PR #8 and all three story instruction files. Reran `npm test`, `test:p1`, `test:casting`, `test:browser`, `test:motion`, `test:walk`, `test:calibration`, then regenerated the three prior films. All **696 original PNG hashes and all three MP4 files reproduced identically**; recovery/casting/visual evidence is authentic. No blocking failure or outstanding review comment. Merge **`9fb9654745db8bdf3e2b928d688caca59244ec50`** preserves `3b7f037`, all earlier assets/evidence and the three story-document commits already on main. [Prerequisite logs and film resources](pr8-review/).

The scene branch starts from that updated main. The original VOICE_CUES.md, STORYBOARD.md and CODEX_TASK.md are unchanged. No avatar, head, appearance or action-engine source was changed, and no old tests or contact tolerances were weakened.

## Actual rendering, playback and resources

| Measurement | Primary executed result |
| --- | --- |
| File | `movie.mp4`, **413,268 bytes** |
| Video | 360×640, 9:16, 30fps CFR, H.264 Main level 3.1, yuv420p, BT.709, square pixels, fast-start |
| Duration / frames | 15.433333s / 463 captured and decoded; one video stream, no audio |
| Frame integrity | Every presentation timestamp i/30; every source frame pixel/state-identical on reverse re-render; no missing frames or page errors |
| Cuts | Local frames 91/148/237/287/341/400/456, all encoded keyframes; final short S14 tail retains reveal camera |
| Native playback | Chromium 156.0.8078.79, advanced without errors and sought through all cuts |
| Capture / complete reverse re-render | 99.832s / 99.192s |
| Encode / video verification / exporter total | 1.696s / 1.293s / **203.121s** |
| Whole measured wrapper elapsed | 203.631s |
| Sampled renderer-tree CPU | **375.56s user + 20.81s system = 396.37 CPU-seconds**, across two available cores |
| Peak sampled summed tree RSS | **784.12 MiB** |
| Temporary PNG bytes | 39,599,422 |
| Total completed cache bytes | 60,274,967, including initial draft cache |
| MP4 SHA-256 | `3e3c9fb9b55960e06caee4669163a7132c98cfaabd85c86494a376050d38befe` |

[Full P1 render/encode/decode/playback manifest](manifest.json) · [process-resource measurements](resource-usage.json). Genuine Chromium 141.0.7390.37 WebGL 2.0 / ANGLE SwiftShader rendered the frames; no fake canvas, AI concept image or new dependency. This is offline software rendering, not real-time 30fps. FFmpeg uses two threads. Bundled Chromium omits H.264 decoding; P1's existing capability check selects installed system Chromium for native playback.

CPU is read from cumulative /proc process counters every .25s, keyed by PID/start time over 25 observed descendant processes and retained after exit. It is a lower bound: last fractions and very short-lived processes can be missed. Separate exact waited-child rusage values can exclude adopted browser workers and must not be added to the sampled totals. The initial draft's rusage-only report undercounts those workers; the final report adds tree sampling. RSS is summed at 1s intervals and counts shared pages per process, not a hard memory guarantee. No large raw frame sequence is committed. Committed frame arrays are losslessly formatted one JSON record per line for compact review; decoded values match the immutable P1 results and all hashes are retained.

## Technical and visual checks

- [Source/timing tests](source-tests.txt) and [clock report](timing-tests.json): all 463 native global cue samples checked, exact 788/789 boundary, no restoration before the spoken name, contained transformation window, whisper/tag/lean/push order, strict input/role validation, random seeking, closed hinged-door reset and alternate sample-rate mapping. Frame 945 and later are outside the proof.
- [Draft WebGL test](draft15-browser-tests.txt), [manifest](browser-manifest.json): all 232 frames, complete reverse and shuffled seeks pixel-identical; same body/geometry/material/pivot/layer/tag references, six parts per live avatar, independent cached appearances, fixed planted contacts and readable intended faces.
- [Native WebGL metrics](native30-metrics.json) / [executed log](native30-browser-tests.txt): all **463 native frames** checked for clock, protected counter and material states, identities, geometry/contact and actor separation. Selected native browser PNG hashes (including global 788/789 and 888) match the primary export. Full native reverse pixel/state equality is independently performed by the P1 exporter; the native metrics pass does not redundantly recapture every PNG in reverse.
- Native measured maxima: **foot drift 0, contact-height error 0, floor penetration 0**. Minimum actual-geometry actor AABB separation **0.252812 world units**. This proves the two actors remain separated in this authored scene, not a general collision/physics system. Body/geometry/material and cached layer identities persist, including through ghost restoration. The closed door remains closed at every sample.
- Human inspection: the decoded contact sheet, all selected 360×640 critical stills and **155 native motion samples at 10fps** in six local indexed sheets. MARA is clearly readable during the push/insert; count change and expressions remain readable on the mobile canvas; cold ghost/warm human contrast is visible, geometry stays intact and the held tag tracks the arm. No severe actor/cosmetic clipping or visible floating observed. Every native frame additionally has automated checks; this is not a claim of manual inspection of every single frame.
- First-draft issues were corrected before the review export: opening camera through a wall and an underlit Eli face. A soft exterior face fill preserves expression readability while retaining blue night lighting. The final seven native frames retain the reveal composition instead of a four-frame draft flash. These are deliberate staging choices, not dropped frames.

## Preserved regressions

All F1/F2/P1/P2A API/recovery and browser commands passed on the completed branch. [Recovery log](recovery-tests.txt), [casting log](casting-regressions.txt), [legacy browser log](browser-regressions.txt). All three old films were again rendered with the **same engine hash as this proof** and matched their original 696 source hashes and encoded MP4 bytes ([results/resources](old-film-regressions.json)). Archived historical camera/UI captures are compared and restored rather than overwritten ([comparison](regression-comparison.json)); decoded legacy metrics remain identical and regenerated static captures match preflight. Both gaits, classic default, tapered option, head, faces and appearance library remain intact.

## Reproduce and review boundary

Commands and native/draft frame map are in [SCENE_PROOF.md](../../stories/names100/SCENE_PROOF.md). `npm run render:names100` uses the existing owned/resumable P1 output path and publishes only after real verification. The CPU wrapper invokes that same exporter, not another rendering implementation. Captured clips/stills are copied only from its PASS result; temporary sequences and local inspection sheets stay under ignored cache/raw directories.

Limits: layered ghost transparency can show overlapping garment surfaces; no volumetric simulation, fingers or full-body bend. Lean is restrained head/shoulder acting with intentional collar contact. The second figure is an unrigged static proxy. This scene keeps each character's color/wardrobe recipe fixed; arbitrary wardrobe changes mid-restoration are not certified. Native iPad/Safari and cross-GPU/font pixel identity are unverified. There is no original-audio sync certification, voiceover, editor, story generator, complete town/crowd, later door opening, full episode or high-resolution story export.

**Focused recommendation:** in a later approved continuation, hold the restored-Mara composition into the realization pause before cutting away, so viewers can read her as human. For now, stop at this PR for visual approval of MARA → 99 → human; do not expand the story automatically.
