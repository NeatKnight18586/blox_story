# The Sixth Roll — full storyboard animatic

**Technical PASS; creative/audio synchronization review PENDING.**

[Silent MP4](dice-town-animatic.mp4) · [38-shot contact sheet](storyboard.jpg) · [timing manifest](shot-timing-manifest.json) · [missing assets](MISSING_ASSETS.md).

Started from codex/dice-town-117s-animatic-plan / ea87785 (PR30), not main. Both complete planning files were read and byte-preserved. P2A-polish rig, environment, motion poses, hair/materials, Three.js/Playwright server and FFmpeg tools reused through an isolated storyboard adapter. Existing production schemas/engine code are unchanged.

## What was produced

All38 editorial shots D01–D38, two actual WebGL boards each: **76 final storyboard images**, composed as held frames.360×640 was selected from the plan's allowed proxy sizes for clearer faces and inserts. Temporary shot IDs/camera labels and a proxy warning are added outside WebGL during assembly. Sketch props indicate shoes/cups, rope/anchor, notebook, under-plinth paddle/crank/pin, gate, photo cards, mother and chair. No final action system, full town, final asset pack or audio was built.

Initial76 captures plus6 homecoming corrections and22 targeted rope/rules/chair corrections:104 storyboard captures in total, with five reverse checks per pass. Only final contact sheet, six representative images and compact receipts are in Git. Raw76-image set remains in ignored renders/. The last correction pass timing is recorded in capture.json; it is not total task render time. Existing scene initialization also renders base poses before boards; no claim of76 total GPU draw calls.

## Timing

Original3513-frame/30fps shot boundaries remain authoritative and unmodified. Proxy boundaries use ceil(source frame/2), preserving contiguous38 shots and moving any cut by at most1/30s. The prescribed1757-frame/15fps proxy lasts **117.133333s**, not117.100s (which would require half a proxy frame). Difference from the supplied audio reference117.098231s is **35.102ms**. This is recorded explicitly, not hidden by stretching audio. The WAV was not accessed, regenerated, modified or requested. No audio stream exists. Estimated paragraph alignment still requires later private listening review.

D25/D26 use two held die results for mornings1–4, D27 covers morning5, D28–D32 the sixth sunrise/decision/six. The six is an editorial outcome, not a claim of a forced physical result. The existing-looking gate, not a die portal, leads to the mother/chair ending. Rope-reclip, aging photos and emotional performances remain schematic as documented.

## Actual verification

- `npm test`: prior source regression suites PASS (regressions.log).
- `node tests/dice-town-animatic.js`:38 unique contiguous shots,3513 authoritative frames,1757 gap-free proxy frames and protected narration-reference hash PASS.
- Capture: actual WebGL2,76 final boards, no page exceptions; five reverse-order image hashes verified per pass. No generated illustrations substitute for renderer output.
- FFprobe: H.264/yuv420p,360×640,square pixels,15fps,1757 decoded frames,117.133s. Full FFmpeg decode and continuous-frame timestamp checks PASS.
- Actual browser playback and seek PASS through existing pipeline video verification (playback.json). The first assembly exposed missing square-pixel metadata; setsar=1 corrected it before final verification.
- **All38 decoded cut-start images match their expected held boards** within a mean RGB compression error below5/255 (cut-verification.json). FFconcat uses explicit15fps image timebase to avoid25fps image-duration rounding.
- Contact sheet and representative shots inspected. Obstructing gate leaves were removed from homecoming boards; rope/chair inserts reframed and rule displays corrected before final delivery.
- preservation.json proves original plan, P2A source, rig/appearance and prior polish evidence unchanged. No branch merged or history rewritten.

## Costs / limits

76 final boards instead of1757 WebGL frame captures; no native720×1280 episode output. FFmpeg assembly plus decode measured **4.70s** for the final assembly pass. Final correction capture wall **27.74s** is only that pass; earlier full-capture/verification and whole-task CPU/memory totals were not profiled and are unavailable. MP4632857 bytes. No new dependency, paid tool, voice service or audio cache. A prior cheap assembly was corrected; no full episode animation render occurred.

Creative limitations: this is a held-frame editing proof. Some framing is cramped, proxy text can be small, family photos are cards, the mechanism is schematic and gestures lack continuity. Audio synchronization has intentionally not been reviewed. See MISSING_ASSETS.md before treating any prop or action as approved. The complete story has visual coverage, but causal/emotional readability still needs human review with narration.

## Reproduce

```sh
node tests/dice-town-animatic.js
node scripts/dice-town-animatic-capture.js
python3 scripts/dice-town-animatic-assemble.py
node scripts/dice-town-animatic-verify.js
python3 scripts/dice-town-animatic-cuts.py
```

`--home-fix` on the capture script refreshes the selected correction shots while retaining previous hashed image entries. It requires an existing complete capture receipt; this is a bounded helper, not a new general renderer/checkpoint system. Further source changes require recapturing affected boards. No full-resolution export, merge or next production phase is authorized. Stop for review.
