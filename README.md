# BlockStory — shot-based production feasibility
Current milestone: a real **7.2s, three-shot, 720×1280 / 30fps H.264 MP4** rendered from structured shot data. This is a bounded feasibility test; the full production pipeline is not implemented.

[Play/download MP4](evidence/production/feasibility.mp4) · [contact sheet](evidence/production/contact-sheet.png) · [verification manifest](evidence/production/manifest.json) · [commands, limits and proposed next additions](PRODUCTION_FEASIBILITY.md).

Developer reproduction: `npm test`; with `npm run preview` serving port 8000, run `npm run render:feasibility` then `npm run sheet:feasibility`. A codec-capable system Chromium is used for HTML5 MP4 verification if bundled Playwright Chromium lacks H.264 decoding; override its path with `PLAYBACK_CHROMIUM` if necessary. FFmpeg/FFprobe and Pillow are existing developer tools; no browser framework/dependency added. Open `/production/player.html` on the HTTP server for playback. Current artifact is silent; all original F1/F2 code, tests, gaits and evidence are retained below.

## Avatar and action lab reference
One neutral six-part block avatar with a softly rounded oval cylindrical head in vanilla Three.js 0.187.0. **F1 PASS**: real API tests and Chromium WebGL captures completed. See [STATUS.md](STATUS.md) for evidence and limits. F2A adds idle/look-react and transitions; a standalone walk foundation is available on the F2B1 PR; walking transitions remain deferred.

## Preview and verification
Developer reproduction (Codex has already run these; no iPad installation is required):
```sh
npm ci
npm test
npx playwright install chromium
npm run preview
# In another terminal, with server running on port 8000:
npm run test:browser
```
Open `http://localhost:8000` on the machine serving the preview. This is a reproducible HTTP preview, not a public hosted URL. The current task server uses port 8000. Three.js is served locally from the pinned npm dependency, avoiding a runtime CDN requirement.

The responsive preview has front, three-quarter, true side and face views; neutral/walk/look-down poses; blank/smile/worried faces; and a removable cap. Play/Pause animates the walk demonstrator. Walk does not implement foot locking or root motion.

## API
```js
import { createBaseAvatar } from './avatar/baseAvatar.js';
import { applyPose } from './avatar/poses.js';
import { applyFace } from './appearance/faces.js';
import { applyAppearance } from './appearance/appearance.js';
const avatar = createBaseAvatar();
applyFace(avatar, 'classic_smile');
applyPose(avatar, 'walk_demo', 0.25);
applyAppearance(avatar, { color: 0xbfc1c3, pieces: { head: 0xdddddd }, cosmetic: 'cap' });
applyAppearance(avatar, { cosmetic: null }); // remove cap; preserve colors
```
Factory produces the undressed body; face is explicitly applied. Y up, +Z forward, neutral feet at zero. Five durable pivots and six named body meshes remain the same objects across changes. Face and cap objects are cached per avatar. Color recipes patch existing colors; omitted cosmetic means remove. Unknown names throw. Other wardrobe categories are deferred.

`character.js`, `presets.js`, and `tests/smoke.cjs` are legacy Kai/Mira code, retained for history/reference and unused by the canonical preview. The old mock smoke test is not F1 v3 evidence.

## Captures
Actual browser output is committed in [evidence/](evidence/). Start with [front](evidence/01-front.png), [three-quarter](evidence/02-threequarter.png), and [mobile](evidence/09-mobile.png). No AI-generated screenshots or proprietary avatar assets are used.

## F2A actions and inspection
F1 was merged through [PR #1](https://github.com/NeatKnight18586/blox_story/pull/1), preserving both implementation commits. See [F2_SPEC.md](F2_SPEC.md) for the explicit-time idle/walk/look-react contract, grounded transitions and motion acceptance gates, and [F2_HANDOFF.md](F2_HANDOFF.md) for the bounded implementation sequence. The complete three-action F2 gate is still pending walking/F2B.

F2A controls: select Idle or Look/react, choose direction, scrub explicit seconds, step ±1 frame at 30 fps, or play/pause. Selecting an action blends from the displayed action over .25 seconds; scrubbing re-evaluates that explicit transition. Use the inspection API `__blockstory.setAction(name, seconds, options)` for a direct sample with no UI blend, or `setTransition(from, to, elapsed, duration)` for exact transition capture. These helpers pause playback. F1 pose controls remain separate and labeled legacy.

```js
import {sampleAction, sampleTransition, applyActionSample} from './avatar/actions.js';
applyActionSample(avatar, sampleAction('idle', 30 / 30));
const from = {action:'idle', time:0.8};
const to = {action:'look_react', time:0.1, options:{direction:'left'}};
applyActionSample(avatar, sampleTransition(from, to, 0.1, 0.25));
```
Times are finite nonnegative seconds. Sampling is stateless; no clock, random input or integration. Applications overwrite root placement and pivot rotations without touching faces/colors/cosmetics. Optional origin is `{position:[x,y,z], yaw:radians}`; default is identity, never current root position. Both feet stay fixed in F2A. Invalid input throws before mutation; `walk` is supported as a standalone forward action; transitions involving it are deliberately rejected.

Verification: `npm test`, then with HTTP server running `npm run test:browser` and `npm run test:motion`. Run `python3 tests/contact-sheets.py` (Pillow needed only to assemble test evidence). Lossless fixed-time PNGs, labeled sheets, vertical renders and measured contact report are under [evidence/f2a/](evidence/f2a/). No MP4 or new runtime dependency is introduced.

## F2B1 walk foundation
Select **Walk foundation** or call `applyActionSample(avatar, sampleAction('walk', seconds))`. Sampling moves the avatar forward (+Z), with a 1.2s cycle and .40223 units/cycle. Actual beveled sole geometry controls root height; fixed rear/front material-edge anchors control stance drift. A .045-unit maximum swing-hip lift clears the rigid leg while preserving six-part anatomy. Neutral pivot positions are recorded on the avatar and reset on every application/legacy pose.

This is a conservative short shuffle, not a long-stride or physically simulated gait. Standalone walk starts/stops with cuts; no walking transitions are provided. The fixed inspection camera is framed for the first two cycles; a future scene/camera system is not implemented. Use the time slider to inspect that interval.

Run `npm run test:walk` with the preview server running, then `python3 tests/contact-sheets.py evidence/f2b1`. [Walk evidence](evidence/f2b1/) includes actual 30fps side/three-quarter sheets for two cycles, selected stills, 390×693 and 720×1280 renders, and max/RMS contact metrics. Raw sequences are regenerated locally under the Git-ignored frames directory to avoid accumulating hundreds of near-duplicate files in history. The existing F1 and F2A captures remain separate.

## Walk visual calibration
The original short-step walk remains the default and is selectable as **Baseline**. One opt-in **Readable trial** uses clearer leg/arm excursions and slightly larger rise/fall, with the same 1.2s timing. Select it under Walk gait, or use:
```js
sampleAction('walk', seconds, {gait:'readable'});
sampleAction('walk', seconds, {gait:'baseline'}); // original, bit-identical
```
The inspector uses the same fixed framing for either gait; selecting a gait pauses and resets time. No walking blend is added.

[Mobile comparison](evidence/calibration/comparison-mobile.png) · [phase comparison](evidence/calibration/comparison.png) · [side motion](evidence/calibration/comparison-side.gif) · [three-quarter motion](evidence/calibration/comparison-threequarter.gif). Left is baseline; right is readable. GIFs are compact test evidence assembled only from genuine WebGL screenshots; their restart resets the captured interval's world position. No MP4/export system is implemented.

Run `npm test`, `npm run test:calibration` with the HTTP server, then `python3 tests/calibration-comparison.py`. Browser reports and independent geometry metrics are in `evidence/calibration/`; raw PNGs and all-frame review sheets are regenerated into its ignored `raw/` directory. Pillow is an existing developer evidence tool, not a browser dependency. Recommendation: keep Readable as the stronger prototype gait, retaining Baseline for regressions/slow shuffles. It is still a rigid-body stylization; no lateral balance, long-stride certification or native Safari verification is claimed.

## P1 reusable shot pipeline

Render an original shot list through the same deterministic browser/MP4 exporter:

```sh
npm run render:shots -- --shots production/feasibility.json --out renders/feasibility --reference evidence/production/manifest.json
npm run render:shots -- --shots production/not-today.json --out renders/not-today
```

The CLI starts its own server, resumes verified cached frames, repairs damaged frames and publishes only after WebGL repeat-seeking, complete MP4 decode and native playback checks. Output is found through `<out>/latest.json`; temporary frames stay outside Git. No added dependencies. The original 7.2s three-shot scene and a distinct 4s two-shot scene share the renderer.

[P1 commands and JSON contract](P1_PIPELINE.md) · [verified movies, contact sheets and resources](evidence/p1/REPORT.md). Run `npm run test:p1` for actual interrupted-render recovery and MP4 tests. Earlier “no MP4” statements above describe their historical F1/F2 stages; production work is now explicitly authorized within P1. Avatar anatomy, appearance, both gaits and walking-transition restrictions remain unchanged. Stop for review after the P1 PR.
