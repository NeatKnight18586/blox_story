# P4 — Minimal Editorial counter and native finishing proof

**Overall PARTIAL: implementation/timing/legacy/native-capture PASS; final art/production finish not locked.** Recommend the Minimal Editorial direction. Native720p is feasible and much sharper than the upscaled draft, but hard/stepped shadow edges and layered ghost transparency remain visible. No final episode or motion export was made.

[Five matched counter comparisons](counter-comparison.png) · [Three-scene native look board](native-look-board.png). Boards reduce the images for mobile comparison; the linked originals below are actual720×1280 pixels.

## Integration

PR [#15](https://github.com/NeatKnight18586/blox_story/pull/15) was reviewed at `add5d4f`, with the current request/P4 brief recording approval of the preview direction and prior provisional caption-style approval. Source/F1/F2/gaits/P1/story tests, six caption tests, actual254-frame caption masks,18 real WebGL random seeks, cold shader/face regression and three existing S3B MP4 hash/decode/PTS/cut/native playback checks passed. Then merged with history retained as `277ef9460b60f5065fc088493be6a6a7952a0f0e`. [Integration receipt](integration.json), [premerge test log](pr15-regressions.log), [actual video checks](pr15-video.json). No configured GitHub status checks/reviews were substituted for these runs. Historical delivery/listening limits remain documented, not reclassified as completed.

New branch: `codex/names100-p4-counter-look`. No old media was replaced.

## Counter treatment and matched comparisons

| Native frame | Intent / actual value | Same-frame evidence |
|---|---|---|
|145|Anonymous resident rule/cost,99; small `NAMES LEFT` label|[Before](before-145.png) · [Clean plate](clean-145.png) · [Editorial](editorial-145.png) |
|850|Eli post-name99; numeral placed in upper-right empty space|[Before](before-850.png) · [Clean](clean-850.png) · [Editorial](editorial-850.png) |
|1248|Countdown18; optical center above the face|[Before](before-1248.png) · [Clean](clean-1248.png) · [Editorial](editorial-1248.png) |
|1528|Eli remains1|[Before](before-1528.png) · [Clean](clean-1528.png) · [Editorial](editorial-1528.png) |
|1529|Exactly0; no early value or random-number roll|[Before](before-1529.png) · [Clean](clean-1529.png) · [Editorial](editorial-1529.png) |

One treatment: DejaVu Sans Bold,96px warm-white numeral, optional26px introductory label, no actor name/card/enclosing frame/gold trim. A2px charcoal glyph keyline and0.75px shadow protect white digits on the bright final wall. This is a typographic edge, not a surrounding panel. Centers are directed by shot: rule/intro160, post-name500, countdown360, sacrifice120; all at y152. Anchors remain fixed inside each shot and keep the bottom/right UI bands and faces clear.

Only S01–04,S11–12,S16–17,S22 display numbers. Shyness close-ups, ghost/tag/restoration, reunions and the lingering final shot stay uncluttered. At1529 zero is fully visible; its last six native frames before1546 fade for0.2s. **No counter anywhere in S23.** Count values/actor identities come directly from the existing source sampler, not a new numeric schedule. Source100 through788,99 at789, restoration890–926,98/97 at1120/1168,52/18/3/1 at1210/1236/1261/1278,zero1529 and all23 cuts remain unchanged.

The five legacy overlays were drawn by the unchanged original WebGL factory onto the **same freshly rendered clean framebuffer**. They were not old low-res images enlarged or painted over. Approved C captions are applied identically to both sides at1528/1529; all caption source/style files are byte-identical. Other selected comparisons have no approved caption excerpt and do not invent one.

One focused graphics refinement followed the first board: center digits optically by framing and strengthen the glyph keyline from1.25 to2px for the bright wall. **No second3D pass.** [Contrast measurements](contrast.json): dark backgrounds give median fill ratios15–17:1. Warm-wall raw fill remains1.91:1; dark glyph-edge samples reach≈8.6:1. The outline supplies shape separation, but this is **not a WCAG certification**, nor a claim the raw white fill meets3:1 there. Real-device/art approval of this bright-background treatment remains necessary.

## Native production-quality assessment

| Actual native source | What reads well | Remaining visible finishing issue |
|---|---|---|
|[Bedroom/ghost700](clean-700.png)|Eyes and physical MARA tag are sharp; moonlit cyan/warm practical contrast and layered window depth read clearly.|Transparent hair/sleeve/garment surfaces create doubled internal edges. Matte flat colors are stylistically coherent, but the ghost treatment needs a focused transparency decision before calling it finished. |
|[Sunrise reunion1392](clean-1392.png)|Distinct gold/green silhouettes, reciprocal face direction and restrained contact are readable. Native bevels and tiny facial strokes hold up.|Hair/chin/contact shadow edges look hard and locally stepped. Left-body crop is the existing approved close-up, not a new wider composition. Skin/cloth stay deliberately simple and matte, with no invented texture detail. |
|[Forgotten Eli1628](clean-1628.png)|Face/hand withdrawal, body/shadow and foreground-to-family depth survive the clean frame. Absence of a HUD helps isolation.|Shadow edges remain hard; overlapping translucent torso/leg/cosmetic layers and distant family acting are still stylized. This still does not certify motion/recognition strength. |

Keep the current characters/sets. If a further finish pass is approved, the smallest useful work is existing shadow-parameter refinement and ghost layer consistency—not new models, wardrobes or a new renderer. **Native sampling PASS; production finish PARTIAL.** Optional1–2s native motion proof was skipped because the still finishing decision should come first.

## Small reusable implementation

- [Legacy `createCounterOverlay()`](../../production/assets/labels.js) is byte-identical and remains the default. Default and explicit `counterMode:"legacy"` reproduce archived pixels.
- An optional top-level **`"counterMode":"clean"`** on existing v3 shot JSON hides only the counter panel. It changes no sampled pose,camera,count or cue. Physical tags and unrelated existing story effects remain. Existing P1 loading/encoding/caching works; the changed input flag gets its own job fingerprint.
- [Counter style/visibility/position file](../../stories/names100/counter/minimal-editorial.json) and [generated global ASS](../../stories/names100/counter/generated/minimal-editorial.ass) are separate from the3D renderer. [Native-clock exporter](../../scripts/counter-clock.js) samples the existing story; [FFmpeg compositor](../../scripts/counter-overlay.py) reads the resulting metadata. No copied counter-value table or new dependency/framework.
- For new exports: **clean3D → global-clock counter → unchanged captions**. Keep source clip clocks absolute while compositing the number, then use the existing local caption clock. For a video excerpt, the FFmpeg timestamp pattern is `setpts=PTS+START_FRAME/(30*TB),ass=counter.ass,setpts=PTS-START_FRAME/(30*TB),ass=approved-local-caption.ass`. Still proof inputs explicitly use1/30 timebase and integer native-frame offsets, avoiding off-by-one rounding.
- Text/size/opacity/position edits recompose the retained clean plates without WebGL. Existing baked-HUD movies cannot be repaired by this overlay alone: converting those requires a later **authorized clean rerender**, not a false erasure claim. No full clean episode was rendered here.

```sh
# Reuse clean plates; change only counter typography/cues:
python3 scripts/counter-overlay.py
# Regenerate only text/ASS data:
node scripts/counter-clock.js > evidence/names100-p4/counter-clock.json
python3 scripts/counter-overlay.py --ass-only
# Bounded native reproduction (8 selections only):
npm run proof:counter
# Affected checks:
npm test
npm run test:counter
python3 tests/captions.py
node tests/performance-motion.js
```

Original comparison plates are retained; intermediate legacy overlay PNGs stay under ignored `renders/`. Editing the counter needs no new3D capture. To repeat the comparison from source, the bounded proof command recreates only these same selected frames.

## Evidence, tests and measured cost

[Native capture receipt](native-captures.json) records real Three.js/Chromium141/ANGLE SwiftShader, canvas/drawing buffer720×1280,pixel ratio1 and same-frame pixel/state repetition. Eight unique scene selections;16 selected3D draws for capture/repetition plus3 renderer warm-ups=19 native3D draws. Five legacy overlays are extra2D draws, not five new scene renders. PNG IHDR and actual framebuffer dimensions both checked. Boards alone are resized; retained originals are not upscaled.

`npm test` and [affected log](regressions.log) pass. Every one of1641 source samples is identical with clean mode and default mode; unknown flags rejected. [ASS verification](counter-verification.json) tests all1641 native timestamps, actor separation/role-independent typography, exact1→0, fade and hidden S23. [Eight real legacy golden matches](legacy-regression.json) cover four archived frames in default/explicit modes. Existing S3B18 random WebGL seeks still match the approved inputs. [Preservation](preservation.json): all prior evidence,12 movies,WAV,captions,rigs,appearance,actions and original shot inputs unchanged. Only capture metadata/panel visibility and supporting offline counter tooling were added.

| Measured command | Wall | Sampled CPU | Peak summed RSS |
|---|---:|---:|---:|
|Eight unique native selections / clean+legacy comparison capture |11.505s|21.12s|710.12MiB |
|Final graphics-only refinement/compositing and boards |1.507s|0.45s sampled|54.63MiB sampled |
|Affected regression commands |18.472s|26.06s|679.46MiB |

[Measurements](costs.json). Sampling0.2s can miss short processes; shared RSS pages counted per process,CPU lower bounds. Premerge tests,initial graphics composition,contrast/metadata-only checks were not resource-profiled; no total usage/billing claim. Exactly one native capture batch; no new audio/video, full episode,3D remodelling or extra motion proof. Source/style hashes and selective native evidence are reviewable in this PR.

**Stop for creative approval.** Recommend the minimal counter; ask the user to approve placements/keyline and decide whether the two native finishing limitations need a small follow-up before final production. No automatic merge or episode export.
