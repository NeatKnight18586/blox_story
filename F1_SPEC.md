# blox_story — F1 Character Foundation Specification

## Purpose
Build a small inspectable reusable 3D character system, NOT an episode or video. One shared blocky rigid humanoid pivot system; two appearance presets: kai and mira. Original Roblox-like game-cinema readability, no Roblox branded meshes. User has iPad, wants automated work, no manual animation or recording.

## F1 non-goals
No story, full animation, voice, captions, music, school environment, Remotion, Blender, MP4 or giant generic engine. A web preview does NOT prove video rendering.

## Visual acceptance
- Recognizable toy-like 3D block figures with beveled edges, square-ish heads, sturdy torsos, proportioned arms and legs, hands and shoes, ground contact.
- Strong mobile-scale silhouette. Readable eyebrows and mouth communicating neutral and worried. Dimensional sculpted hair.
- Kai: short brown sculpted hair; cobalt-blue hoodie, hood and cuffs; dark trousers and shoes.
- Mira: blonde bob; muted pink sleeves/top; dark trousers and shoes.
- Matte clothing, softer skin, key/fill/ambient lighting, contact shadows; efficient geometry. No copied branded assets, logos or paid models.

## Technical contract
- Vanilla Three.js ES modules pinned to 0.187.0 with import map/CDN or minimal local setup, no unnecessary React/npm. State HTTP server requirement.
- Separate index.html, character.js, presets.js, preview.js, README.md and STATUS.md.
- createCharacter(preset) returns character with root THREE.Group, pivot references head, leftShoulder, rightShoulder, leftHip, rightHip. Uses rigid hierarchy, not skeletal skinning.
- applyPose(character, poseName, t=0): neutral, walk_demo, look_down. applyExpression(character, expressionName): neutral, worried. Reuse same mesh identity. Deterministic from explicit t.
- Presets use stable IDs kai and mira with shared API.
- Two characters side-by-side on ground, three-quarter camera, key/fill/ambient lights, cast/receive shadows and lightweight pose/expression UI.
- Sensible joint limits, no detached limbs, severe clipping, floating feet or mismatched shadows.

## Acceptance gate
1. Test parse/import and report exact checks.
2. Test shared factory, distinct IDs and colors.
3. Test neutral -> walk_demo -> look_down (no new meshes), neutral -> worried expression.
4. In real browser, capture six genuine views: each character front, three-quarter, worried close-up; check clipping, lighting, silhouettes, feet and controls.
5. Make at most one targeted repair for this gate. Only PASS if source AND visual inspections actually ran; otherwise PARTIAL or FAIL. If browser capture blocked, write VISUAL PREVIEW NOT VERIFIED.

## Output
Keep source and tests versioned, report concise STATUS, evidence and next action. Do not paste giant code in chat.

## Future interfaces (NOT F1 implementation)
F2 deterministic movement clips reusing factory; F3 named environments, camera tracks, future-shadow effects; F4 episode JSON (characterId, actionId, start, end, cameraId, effectId) and automated rendering/audio. Main cast never regenerated per video.
