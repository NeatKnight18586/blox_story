# S3C — white caption proofs; private MP4 delivery blocked

**Overall PARTIAL.** Three narrated/captioned files are built and technically verified. Visual/style checks PASS; exact internal phrase splits need human listening. **Private MP4 download links could not be delivered:** the existing GitHub connection authenticates repository operations but binary upload to `uploads.github.com` returns **401 Bad credentials**. The API-host alternative returns404. No task-artifact publishing tool is exposed. No public substitute or internal-path download links are claimed. PR #15 remains DRAFT/unmerged.

[Actual3-up contact sheet](caption-style-contact.png): dark Eli close-up, warm reunion/approach, and zero. [Private GitHub sheet](https://github.com/NeatKnight18586/blox_story/blob/codex/names100-s3b-performance/evidence/names100-s3c/caption-style-contact.png) requires repository access. Its bytes were checked through authenticated GitHub retrieval. Only the sheet and text/code/verification files are committed, never voiced media or original WAV.

## What is complete

| File ready in ignored workspace output | Duration / frames | Audio / video |
|---|---:|---|
| `renders/names100-s3c/A-narrated-captioned.mp4` |5.400s /81|720×1280,15fps,H.264 Main3.1/yuv420p,AAC stereo44,100Hz |
| `renders/names100-s3c/B-narrated-captioned.mp4` |6.467s /97|Same |
| `renders/names100-s3c/C-narrated-captioned.mp4` |5.067s /76|Same; original50.340ms terminal video hold after narration |

These are **internal export locations, not download links**. The720×1280 files upscale the existing180×320 S3B images before adding sharp captions. **Zero new3D renders**, acting changes or full-episode exports. Original WAV SHA256 `3d5e0a116971d3d17a7c3adac79423e443d63040b2120be7562a0660f22b4ae4` and all12 prior films remain unchanged. Existing sample-aligned S3B AAC narration packets are copied bit-for-bit into the captioned copies, with audio/video starting0. Source slices remain A470400, B1905120, C2190300 samples on the original clock. No generation, normalization or stretching.

## Caption candidate and timing

- Reusable [style JSON](../../captions/white-shorts-v1.json): DejaVu Sans Bold,52px at720×1280, opaque white,4px charcoal outline,1.5px subtle shadow, no backing or animation. Actual libass font resolution checked against installed `DejaVuSans-Bold.ttf`.
- Small [timing/text JSON](../../stories/names100/captions/s3c.json) → deterministic [ASS/SRT tracks](../../stories/names100/captions/generated). Independent of Three.js.14 cues,2–5 words,one/two lines. Text concatenations are checked verbatim against the selected canonical `VOICE_CUES.md` sentences, including **Eli's**. No Mara speech is invented in these excerpts.
- Default anchor(324,832),45% horizontal/65% height. S19 uses(270,730),left of the hand contact; S23 uses(324,852),below the lowering hand. Each anchor is fixed within its shot.
- **S18 deliberately uses upper empty space(324,320)** rather than the preferred lower-middle candidate: lower text covered the approaching child's silhouette. It stays below the counter and above all faces, leaving feet/approach visible. This exception specifically needs user style approval; no existing framing was altered to accommodate captions.
- Phrase windows come from the supplied timing document, not an unheard word transcript. Internal A3/A4,C1/C2,C4/C5 boundaries are explicitly **provisional**. No equal per-word timing or forced alignment claim. No new listening/large transcription model was installed. The actual WAV is available, but genuine listening/word alignment is not available through the offered interfaces.
- Caption frame quantization never starts before its declared onset; at15fps on/off may be ≤66.667ms late. Intentional phrase pauses are blank. `hit zero.` first appears at source1530/51.000s, simultaneous with the draft's first visible0, never before protected native1529. Native scene clocks and all cuts are unchanged.

## Verified evidence

`python3 tests/captions.py`: six tests PASS, including canonical wording, name typo rejection, early-zero rejection, safe line widths, real blank pauses and repeatable ASS/SRT generation.

`python3 tests/caption-video.py`: actual libass masks at **all254 frames** match expected cue presence and pauses. Every mask stays within the declared mobile margins and avoids manually annotated conservative face/counter/greeting/reunion-contact/approach-foot regions. Original top/HUD region retains >.98 SSIM frame-for-frame against upscaled S3B, checking source clock/zero mapping. Decoded frames for all14 groups were visually inspected; final placement repair checked in the3-up sheet and all-frame masks. This is not automatic scene understanding or native Shorts UI certification.

[Native browser verification](browser-verification.json): full H.264/AAC decode, all254 continuous PTS, original cut keyframes, duration/resolution, playback/seeking, mobile390×844 viewport and **unmuted nonzero audio** for each file. This is Chromium playback, not native iPad/Safari testing or perceptual listening. [Encoding/AAC packet verification](encode-verification.json), [caption masks](caption-mask-verification.json), [tests](tests.log), [preservation](preservation.json). No regression WebGL rendering was invoked because the animation/renderer/source films were untouched.

Measured encoder attempts: **13.375s wall,14.39s sampled CPU,302.93MiB peak summed RSS**, including initial placement, one rejected preflight and the final placement/cut-keyframe pass. [All attempts](costs.json). Mask/SSIM, browser checks, screenshot assembly and upload diagnosis were not resource-profiled; these are not total assistant/billing figures. No3D rendering cost.

## Delivery failure and supported manual export

The repository is confirmed **private**. Attempted private GitHub release assets, which would keep voiced files out of Git history. A short target SHA was initially rejected before any upload; the full-SHA retry reached `uploads.github.com` and failed401. An alternate API upload of the non-audio sheet returned404. Empty drafts created during these attempts were removed; no voiced release was published. [Exact receipt](delivery.json). Repository read/write access works, so this is specifically the binary-upload authentication route, not evidence that the user denied authorization. The upload host needs working authentication before automated private links can be supplied.

**Manual route, without installing anything on the iPad or rendering again:**

1. If this Codex client offers it, open the right-side **+ → Desktop**, take control and sign into GitHub in the shared browser. The cloud desktop is enabled, but no desktop-control/open-viewer tool is offered to this agent. If Desktop is absent in this client, the environment operator must repair the upload-host credential binding; there is no verified task-artifact transfer tool here.
2. In private `NeatKnight18586/blox_story`, open **Releases → Draft a new release**. Use tag `names100-s3c-review-v1`, target the review branch `codex/names100-s3b-performance`, and mark it as a prerelease. This does not merge PR15.
3. Use the shared browser's file chooser location field to select the three `*-narrated-captioned.mp4` files in **`/workspace/blox_story/renders/names100-s3c/`**. Add the sheet from **`/workspace/blox_story/evidence/names100-s3c/caption-style-contact.png`**. These paths refer to the shared Linux chooser, not the iPad Files app. Do not select/upload the original WAV.
4. Publish the prerelease **inside the private repository**, then open its MP4 asset downloads in iPad Safari while signed into a GitHub account with repository access. This web-authenticated upload route is a supported manual alternative, **not a claim that it has already succeeded in this task**.

After upload authentication is fixed, the automated equivalent is `gh release create names100-s3c-review-v1 renders/names100-s3c/{A,B,C}-narrated-captioned.mp4 evidence/names100-s3c/caption-style-contact.png --target <FULL_REVIEW_COMMIT_SHA> --prerelease --latest=false`, followed by authenticated download/hash verification. Do not label resulting links verified until that check succeeds.

Rebuild only if caption text/style changes:

```sh
python3 scripts/caption-previews.py --wav '<path to original ADAM 1.WAV>'
python3 tests/captions.py
python3 tests/caption-video.py
```

## Approval gate — still pending

- A: is the hesitation/withdrawn greeting obvious with narration?
- B: does the reunion progress; is the upper-space S18 caption acceptable?
- C: is Mara's failed recognition clear?
- Captions: readable on iPad, correctly timed/spelled, safely placed and unobtrusive? Pay particular attention to the flagged internal splits.

Only the style sheet is currently delivered through a verified private URL. **Do not request/claim completed scene/audio approval before the user can actually access the MP4s.** Stop here: no merge of PR15, complete episode, final export or extra animation work.
