# BlockStory — F1 v3
One neutral six-part block avatar with a softly rounded oval cylindrical head in vanilla Three.js 0.187.0. **F1 PASS**: real API tests and Chromium WebGL captures completed. See [STATUS.md](STATUS.md) for evidence and limits. F2A adds idle/look-react and transitions; walking/F2B remains deferred.

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
Times are finite nonnegative seconds. Sampling is stateless; no clock, random input or integration. Applications overwrite root placement and pivot rotations without touching faces/colors/cosmetics. Optional origin is `{position:[x,y,z], yaw:radians}`; default is identity, never current root position. Both feet stay fixed in F2A. Invalid input throws before mutation; `walk` is deliberately rejected.

Verification: `npm test`, then with HTTP server running `npm run test:browser` and `npm run test:motion`. Run `python3 tests/contact-sheets.py` (Pillow needed only to assemble test evidence). Lossless fixed-time PNGs, labeled sheets, vertical renders and measured contact report are under [evidence/f2a/](evidence/f2a/). No MP4 or new runtime dependency is introduced.
