# BlockStory — F1 v3
One neutral six-part block avatar with a softly rounded oval cylindrical head in vanilla Three.js 0.187.0. **F1 PASS**: real API tests and Chromium WebGL captures completed. See [STATUS.md](STATUS.md) for evidence and limits. F2 specification and handoff are prepared; its animation implementation has not started.

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

## Next phase: documentation only
F1 was merged through [PR #1](https://github.com/NeatKnight18586/blox_story/pull/1), preserving both implementation commits. See [F2_SPEC.md](F2_SPEC.md) for the explicit-time idle/walk/look-react contract, grounded transitions and motion acceptance gates, and [F2_HANDOFF.md](F2_HANDOFF.md) for the bounded implementation sequence. These are plans, not implemented or tested F2 behavior.
