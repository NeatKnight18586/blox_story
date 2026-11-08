# P2A — Reusable Character Casting

P2A adds a small casting layer to P1, not another animation engine. One or two stable character IDs use the same six-part factory, five pivots, oval head, action sampler and existing gaits. Classic remains the default. The optional torso and removable appearance layers are created/cached on each avatar independently.

## Run and inspect

```sh
npm ci
npx playwright install chromium
npm test
npm run test:p1
npm run test:casting
npm run render:shots -- --shots production/reassurance.json --out renders/reassurance
```

P1 prerequisites/output ownership/resume/budget/publication and codec rules remain in [P1_PIPELINE.md](P1_PIPELINE.md). The renderer starts its own local server and uses the existing FFmpeg H.264/yuv420p/9:16 process, with no added dependency. Find the verified result through `<out>/latest.json`.

For developer browser inspection, `npm run preview`, then open `/production/?shots=reassurance.json`. The page renders frame 0; use `__production.renderFrame(integerFrame)` to seek. `__production.avatars` exposes the stable ID-to-avatar map; legacy `__production.avatar` still refers to the first actor. There is no editor or additional UI. The user receives the actual MP4/contact sheets without needing to install anything on an iPad.

## Version 3 contract

The original version 1 and P1 version 2 files are unchanged and still supported. Version 3 adds `cast` and replaces the single shot action/placement with `actors`:

```json
{
  "version":3,
  "title":"A little reassurance",
  "output":{"width":720,"height":1280,"fps":30},
  "environment":{"kind":"light-workshop"},
  "props":[],"events":[],
  "cast":[
    {"id":"ren","appearance":{"cosmetic":"cap","clothing":"vest","clothingColor":"#216d85"}},
    {"id":"sol","torsoVariant":"tapered","face":"worried",
     "appearance":{"hair":"bob","hairColor":"#40291f","clothing":"vest","clothingColor":"#be5b46"}}
  ],
  "shots":[{
    "id":"pause","start":0,"end":72,
    "camera":{"preset":"two-shot","subjects":["ren","sol"]},
    "actors":[
      {"id":"ren","action":{"name":"idle","timeOffset":0},"origin":{"position":[-1.8,0,0.7],"yaw":1.1}},
      {"id":"sol","action":{"name":"look_react","options":{"direction":"left"}},"origin":{"position":[1.8,0,0.7],"yaw":-1.1}}
    ]
  }]
}
```

- Cast IDs are unique, stable across shots and limited to two. Every shot explicitly includes every cast ID exactly once, independent of array order. Unknown/missing/duplicate IDs fail before rendering. Actors always exist; there is no hidden spawn/despawn state.
- `torsoVariant` is `classic` (default) or `tapered`, fixed at construction. A shot cannot change body geometry. Default face is `classic_smile`; each shot can independently override face and appearance. An appearance override is a **complete recipe**, not a patch on the previous shot; absent override uses that actor's cast recipe. This makes random-access seeking repeatable.
- Action, options, explicit nonnegative `timeOffset`, grounded origin, earlier-shot endpoint reference and integer frame scheduling delegate to P1. `originFromEndOf` resolves that same actor in the named earlier shot. To continue a walk across a camera cut, retain the same explicit origin and advance action `timeOffset`; don't add an inherited endpoint and absolute walk offset twice. Walking transitions remain unsupported.
- P1's color/piece/cap recipe remains valid. New fields are `hair:null|"bob"`, `hairColor`, `clothing:null|"vest"`, `clothingColor`; colors are 24-bit integers or `#rrggbb`. Defaults: no hair/clothing, dark brown hair and teal vest. Bob and cap are deliberately exclusive to avoid an untested attachment combination. This is one example of each layer, not a wardrobe library.
- Direct `applyAppearance(avatar,recipe)` keeps its previous color patch behavior, but omitted cap/hair/clothing means remove those layers. Reattaching reuses cached objects and geometry; recoloring one actor cannot mutate another's materials. Garment geometry is a thin overlay cloned from that actor's fixed torso, so both body variants use the same clothing interface.
- Props/events retain the existing channel contract. With two actors, an event with `proximityRadius` must include `actor:"cast-id"`; the gate checks that actor's explicit sampled position. Version 1/2 event syntax is unchanged. No actor physics or collision solver is added.

## Fixed composition presets

Use an explicit P1 `{position,target,fov}` camera or one of:

| Camera JSON | Purpose |
| --- | --- |
| `{"preset":"two-shot","subjects":["ren","sol"],"side":1}` | Frames the pair from the perpendicular side of their start-position line. A conservative projected width and margin determine distance. |
| `{"preset":"close-up","subject":"sol"}` | Fixed face/upper-torso view from that actor's initial forward heading. |
| `{"preset":"over-the-shoulder","foreground":"sol","subject":"ren","side":-1}` | A fixed shoulder/partial-head foreground with the subject across the shared acting line. |

`side` defaults to 1 and accepts ±1 where shown. Presets resolve **once at the shot's start** using explicit sampled placements, then store ordinary numeric camera data. They do not track actors. Reversing actor ordering reverses the perpendicular; choose side consistently to stay on one side of the acting line. The film does so. Two-shot framing is not a guarantee for arbitrary future root travel: authors still inspect the complete shot. Cropping foreground bodies in OTS and torsos in close-ups is intentional; two-shot inspection includes both full silhouettes and feet.

## Optional body and attachment design

`createBaseAvatar({torsoVariant:'tapered'})` opts into a single original extruded/beveled planar profile: 2-unit shoulders/hips, approximately 1.5-unit waist, 2-unit height and 1-unit depth. Its final bounding box is normalized to the same torso envelope as classic. The silhouette narrows in front view, retaining flat front/back and block-style limbs. Shoulder/hip/head pivots, rest positions, body mesh count, head/face surface and leg geometry remain unchanged. No scaling or mesh replacement occurs during animation. The narrow waist is an optional block profile, not a new skeleton or baked-in gender preset.

This is a restrained interpretation of the user's tapered/hourglass direction. An additional precise hourglass reference asset is not present in the repository, so no exact reference-match claim is made. The original supplied block/oval-head direction remains the default. New body acceptance is separate from F1's unchanged classic baseline.

Bob hair is five small fitted original blocks on the head pivot. The vest is one fitted torso overlay with shallow trim/buttons; arms remain the original meshes. Intentional close surface overlap attaches these layers; it is not a cloth simulation. Layer extents and face sightlines are checked in real renders. Hair follows head rotation, vest follows torso/root placement. Layers can be removed to inspect both undressed bodies on the same instances.

## Acting test and verification

[reassurance.json](production/reassurance.json) is an original 12-second silent test: an awkward pause, Sol's worried glance, Ren's reassuring response over Sol's shoulder, Sol's returned smile, then a relaxed two-shot. Ren uses classic/cap/blue vest; Sol uses tapered/bob/coral vest. Each shot is 72 frames; all actions come from the existing idle/look-react sampler with independent explicit local times. No new gesture or walk engine, audio or story generator. Reactions remain deliberately restrained; this demonstrates reusable casting and coverage rather than a complete dialogue animation system.

`npm test` retains F1/F2/P1 assertions and adds independent casting/appearance/identity/geometry/30–60fps contact tests. `npm run test:casting` executes genuine WebGL: all 360 frames, full reverse pixel seeks, independent bodies/materials/cached layer geometry, fixed cameras, actor clearance, complete two-shot framing, face sightlines and mobile dressed/undressed/restored captures. The full-size P1 export separately repeats every frame and verifies MP4 metadata/count/timestamps/cuts/full decode/native playback/seeking.

Executed results, timings, memory and actual movies/contact sheets are recorded in [evidence/p2a/REPORT.md](evidence/p2a/REPORT.md). Preserve all older evidence; temporary numbered frames and review sheets stay ignored. Native iPad/Safari and cross-GPU pixel identity are not certified. Stop after the P2A PR for review; no automatic next phase.
