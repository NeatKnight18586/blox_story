# names100 — central reveal animatic

This is only the global narration window **frames [482,945) at 30fps = 16.0667–31.5000s**, corresponding to the written 16.07–31.50s slice. PR #8 was independently retested and merged with history preserved at `9fb9654745db8bdf3e2b928d688caca59244ec50`. The three instruction documents remain unchanged. No original WAV is present here; timings come from VOICE_CUES.md, not new audio analysis or synthesized speech.

[Review MP4](../../evidence/names100/movie.mp4) · [decoded contact sheet](../../evidence/names100/contact-sheet.png) · [critical before/after frames](../../evidence/names100/critical-beats.png) · [executed results/resources](../../evidence/names100/REPORT.md).

## Run

```sh
npm test
npm run test:reveal
npm run render:names100
# CPU/process measurements around that same existing P1 exporter:
python3 scripts/measure-render.py --shots stories/names100/scene-proof.json --out renders/names100-animatic --report evidence/names100/resource-usage.json
# Once the PASS result/manifest has been copied to evidence, native-frame metrics:
npm run test:reveal -- --native
```

The primary review copy stays **360×640**, but uses **30fps and 463 frames** for exact native timing. The first economical 360×640/15fps draft was rendered, inspected and tested first. Its 232 samples skip odd global frame 789 and require a 33ms last-frame hold; therefore the review copy increases only frame rate. All 232 shared samples reproduce exactly, with the same engine hash. The initial draft remains in `evidence/names100/draft15/`; no 720×1280 proof or full episode was rendered. P1 still owns safe output directories, frame checkpoints, resume/repair, H.264 encoding, full decode/native playback and atomic publication.

To reproduce the initial draft, use the unchanged alternate input:

```sh
npm run render:shots -- --shots stories/names100/scene-proof-15fps.json --out renders/names100-draft15
```

For browser frame inspection, start `npm run preview` and open `/production/?shots=stories/names100/scene-proof.json`; `__production.renderFrame(localFrame)` seeks explicitly. The delivered film requires no user-side modeling, installation or capture.

## Exact clocks and shot data

`scene-proof.json` is the authoritative native-clock input. Primary output frame `f` samples **global frame `482+f`**, with no padding or out-of-slice state. Primary duration is 463/30 = **15.433333s**. Container duration headers may round to milliseconds; decoded timestamps/frame counts are authoritative. Original narration must later remain aligned at global t=0; do not place the original WAV at the start of this extracted slice or resynthesize it.

| Storyboard | Global interval [start,end) | Primary local frames | First draft local frames | Composition |
| --- | --- | --- | --- | --- |
| S07 | 482–573 | 0–91 | 0–46 | Bedroom/window, Eli in foreground, pale figures outside |
| S08 | 573–630 | 91–148 | 46–74 | Moonlit figures and fog through window |
| S09 | 630–719 | 148–237 | 74–119 | Mara raises the faded tag |
| S10 | 719–769 | 237–287 | 119–144 | Restrained lean and a short push toward MARA |
| S11 | 769–823 | 287–341 | 144–171 | Eli's face, silent whisper cue, protected counter boundary |
| S12 | 823–882 | 341–400 | 171–200 | 99 emphasized, ghost still unrecovered |
| S13 | 882–938 | 400–456 | 200–228 | Cold ghost gradually returns to warm solid Mara |
| S14 tail | 938–945 | 456–463 | 228–232 | Continue reveal framing for the slice's final seven native frames |

The short S14 tail shares S13's camera to avoid an unreadable four-frame draft flash. Its timing is retained; the rest of S14 and all later scenes are outside this task. Draft sample `f` maps to `482+2f`; cuts ceil to the first sample at or after the global cut. Draft action offsets compensate for that one-native-frame delay, so shared timestamps match the primary render exactly.

| Cue | Native global frames | Primary local frames | Time |
| --- | --- | --- | --- |
| Tag raise | 662–700 | 180–218 | 22.0667–23.3333s |
| Head/shoulder lean | rise 728–768, hold to 823, recover by 882 | 246–286, hold to 341, recover by 400 | Starts 24.2667s |
| Silent “Mara…” text | [776,789) | [294,307) | 25.8667–26.3000s |
| 100 → 99 | **789** | **307** | **26.3000s**, after written spoken-name window ends near 26.28s |
| Human restoration | **890–926** | **408–444** | **29.6667–30.8667s**, contained in 29.63–30.92s |

Native global frame **788 remains 100**, **789 is 99**. Mara stays a ghost through that counter change. This is written-cue alignment, not certified sample/phoneme alignment with the unavailable WAV. There is no voiceover, soundtrack or lip sync.

## Small reusable additions

- `production/assets/bedroom.js`: one small room, open window frame, closed hinged door, bed, courtyard, moon/fog and one inexpensive unrigged background proxy. Mara is the other pale figure; there are only two live P2A avatars. Door `apply(open)` is absolute, but stays closed throughout this slice; the later door-opening scene is not implemented.
- `production/assets/labels.js`: cached canvas-to-WebGL text for a weathered physical name tag and numerical overlay. Labels are part of the captured WebGL framebuffer, not uncaptured HTML. The tag follows Mara's existing shoulder/hand end; inverse local rotation keeps it upright without a new joint or hand mesh.
- `production/reveal-cues.js`: validates this bounded global clock, cue order, actor roles and one constrained camera push; pure numeric sampling. The optional `reveal` field on version 3 data enables it. Existing version 1/2/3 files without it retain their behavior.
- `production/reveal-effects.js`: applies sampled opacity/color/emission, face choice, warm fill, tag lift, counter and small head/shoulder offsets after the existing action API. No duplicate animation engine. Body/geometry/material identities persist. Mara's additive outward shoulder cue is capped at .85 radians; Eli's lean uses .10 units of head-pivot forward offset and .14 radians pitch. Feet, hips and root placement remain planted. Face/cosmetic/clothing caches stay independent.
- `scripts/measure-render.py`: standard-library wrapper recording wall time, sampled process-tree CPU, exact waited-child CPU and child RSS. The exporter separately records sampled summed process-tree RSS, PNG/cache bytes, video bytes and timings. No new package or service.

Both cast recipes reuse P2A's approved classic/cap/blue and tapered/bob/coral demonstration appearances, named Eli/Mara for this story. The ghost's same meshes and palette regain warmth/opacity instead of swapping rigs. The effect is intentionally tested with fixed per-character color/wardrobe recipes; mid-transformation wardrobe changes are not part of this proof.

## Review boundary and focused recommendation

Review **the clarity of MARA → Eli's 99 → restored Mara** before expanding the scene. This proof does not certify a final performance, full episode or finished audio synchronization. Ghost translucency can reveal overlapping garment surfaces, the rigid arm has no fingers, the lean is restrained head/shoulder acting, and the second figure is a static proxy. Faces and tag/counter readability were prioritized over darkness. No town/crowd engine, extra motions, full script generator, editor or audio system was built. Stop after the PR for visual approval.
