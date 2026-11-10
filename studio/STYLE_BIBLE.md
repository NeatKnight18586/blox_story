# blox_story studio style bible (v0, look gate)

One page. Code is the source of truth: `studio/lookdev/look.js` (`LOOK`).

## Target
Bright, saturated, toy-plastic block world: original Roblox-inspired, never official assets.
Reference (private Short, 22 frames): saturation .47, colorfulness 98, luma .67.

## Colour and light
- Sky: vertical gradient, zenith `#1f74e0` → horizon `#b8e6ff`; fog matches horizon `#bfe6ff`, starts at 70 units.
- Grade on every standard material: saturation ×1.4 (+.05), dark colours (L<.3) only ×1.1 so brown hair stays brown.
- Big surfaces get authored colours, not a grade: warm sand paving `#d9b27a`, pale inlay `#efd8ac`, road `#f3ddb0`.
- Light: sky/ground hemisphere `#bfe8ff`/`#d9b27e` at 1.0; existing warm key ×1.12; cool rim `#9fd4ff` from back-left.
- Material: roughness ≤.5 (characters ≤.42) plus a soft studio environment at .22 for the smooth plastic sheen. No textures needed.
- Tone: Neutral tone mapping, exposure 1.0. Bloom only on true highlights (threshold 1.2, strength .1).

## Lens and framing (9:16, 1080×1920)
- Wides stay sharp (no depth of field).
- Close-ups: depth of field focused on the head, aperture .025.
- Medium close-up: head plus upper torso, eyes in the upper third, camera slightly off-axis to the character's left.

## Movement (for later stages)
- Characters: held, snappy poses (about 12 pose changes per second), quick expression swaps on story beats.
- Camera: always moving smoothly at 30fps (push, drift, orbit). Never a frozen frame held over narration.

## Known gaps (not solved by the look)
- Wide plaza frames are mostly bare paving: needs environment-kit density (crowd, props, tiles, greenery).
- Characters wear dark trousers/jackets that dominate close-ups: needs character-preset colour work.
- Extras are bald; hair and wardrobe belong to the character stage.
