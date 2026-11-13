# Amendment A4 (2026-11-13): Format v3, Season 1 system — Session 8

Owner-ordered. All `docs/V2_BRIEF.md` §0 and §2 rules apply: plan first in `PROGRESS.md`, run every Done-when check, stop
at the gate. First, append this file to `docs/V2_BRIEF.md` under `## Amendment A4`. Creative source for all episodes is
`docs/season1/SEASON_1.md`; do not rewrite its stories. "Nobody" stays as published; nothing in `stories/nobody/` changes.

**Why:** the owner's study of the niche's four leading channels shows the top tier adds world-scale, picture-first
spectacle and richer custom environments on top of the shared rule → defect → crisis → reversal shape. Our engine is
tuned for a small town and plain materials. This session upgrades the look, adds the scale and rule-UI tools the season
needs, enlarges captions, and wires the season's gates into `plan.js` and `/new-episode`.

Build in this order. Measure before and after each of A–C with `v2:bench`; keep a change only if its budget line holds.

## A. Richer, more realistic environments (avatars stay blocky plastic)

The target is a detailed "showcase" world with toy-block characters standing in it. Characters must remain the
highest-contrast things in frame.

1. **Terrain** (`parts/terrain.js`): heightfield mesh from a seeded control list (hills, ridges, valleys, plateaus, river
   cut, cliff bands), `groundY(x,z)` derived from it, slope/height-based material blend (grass → rock → snow, or sand →
   stone), skirts so no edge shows. LOD: full density within 60 units of the shot region, quarter density beyond.
2. **Biomes** (`parts/biomes.js`): `alpine`, `meadow`, `coast`, `desert`, `cave`, `cloudtop`, `suburb`, `downtown`,
   `nightfield`. Each = palette, terrain materials, vegetation set, sky preset, fog. A world file picks one or two and
   adds its story set pieces. Worlds stay bespoke (§7.1): different seed, landmark, layout and palette every episode.
3. **Materials:** 512 px albedo + normal for hero-tier surfaces (256 elsewhere); add `bark`, `leaves`, `cliff`, `snow`,
   `mud`, `concrete`, `asphalt`, `roofTile`, `plaster`, `crystal`, `ice`. Height drawings only, as in A1. Use
   `MeshStandardMaterial` with a small generated environment map on hero-tier **environment** only; avatars keep Phong.
4. **Vegetation and clutter:** instanced trees (4 species, trunk + leaf clusters, ≤ 220 triangles), bushes, grass cards
   near the camera only, rocks, flowers. Wind sway as a pure function of frame.
5. **Water** (`parts/water.js`): one plane, animated normal scroll, fresnel tint toward the sky colour, soft shoreline
   foam band, optional river flow direction.
6. **Sky and air** (`engine/look.js`): sun disc and glow, two cloud layers with parallax, height fog plus distance haze,
   night sky with stars and moon, optional light-shaft sprites through trees or clouds.
7. **Budget for finals (farm):** ≤ 80,000 triangles in frustum and mean ≤ 0.60 s/frame at 720×1280. Animatics keep the old
   budget by dropping vegetation density. If the mean exceeds 0.60, cut vegetation and far tier first; never the hero tier.

## B. Scale and spectacle tools

1. **Camera** (`engine/camera.js`): `drone` (spline fly-over with banking, 3–5 s), `heroLow` preset (camera 0.6–1.2 above
   ground, FOV 60–70, subject from below), `snap` (2-frame punch from wide to close on the same axis), `tiltUp` (reveal
   scale from feet to sky). Unit tests for each; speed cap still enforced except inside `snap` and `whip`.
2. **Landform rigs** (`parts/landform.js`): a way to make part of the terrain a character (the mountain giant in 01):
   named pivots for a ridge-shoulder, an eyelid, a leg with a foot, a hand; same materials as the terrain so it reads as
   rock and grass. ≤ 12,000 triangles.
3. **Crowds:** up to 60 background actors per shot from instanced low-detail bodies with `ambientPose`, panic `run`, and
   `lookUp`.
4. **Particles and weather** (`engine/effects.js`): presets `rain`, `snow`, `ash`, `sand`, `fog`, `steam`, `mud`,
   `splash`, `lightning` (branching bolt + flash), `starfall`, `leaves`, `rockfall`, `shockwave`. Screen-space weather
   overlay layer for heavy rain/snow/sand so density is cheap.
5. **Trails:** `trail` effect: a glowing ribbon or decal strip following an actor's path, with fade time.

## C. Rule UI anywhere

`engine/overhead.js`: attach any tag, stat, bar, icon or card to **any pivot or object** (wrist, back, a prop, a mirror
frame), not only above heads; world-space or screen-facing; pop on change. Add `checklist` (numbered items that tick) and
`plate` (a small label fixed to an object).

## D. Captions (bigger; owner request)

`captions/pop-shorts-v3.json` (v2 stays for "Nobody"): size 128, opener 150, emphasis 120 %, outline 9, at most 2 words
per chunk when either word has 7+ letters (else 3), baseline y 1250 with the high slot at 560. `plan.js` caption band
becomes 58–74 %; faces and key objects must stay out of it. Check on a 390 px phone crop that the smallest caption cap
height is ≥ 2.6 % of frame height.

## E. Season gates in `plan.js` (errors, exit 1)

Episode data gains: `beats` (B1–B9 shot ranges), `clues` (exactly three shot ids), `twist` (shot id), `afk` (exactly two
shot ids), `moneyShot` (shot id).
- B1: first narration line ≤ 9 words; the rule lines end ≤ 8.5 s; shot 1 is tagged `spectacle`; a shot starting ≤ 5.0 s
  shows the hero's face at ≥ 20 % of frame height.
- B2 holds at least three shots, each ≤ 2.5 s.
- All three `clues` shots start before the `twist` shot. Each clue object's projected size ≥ 3 % of frame height.
- Both `afk` shots exist; the actor's opacity is 0.35–0.5; he is not the subject; one is before the twist.
- The final shot's camera matches shot 1's within 10 % (position and FOV).
- Episode length 122–150 s.
- `sheet.py --stats`: the `twist` or `moneyShot` cell has the largest frame-to-frame colour change of the episode (warning).

## F. Sound

Music is the owner's: `stories/<slug>/music.mp3` is mixed if present (existing ducking); nothing else is assumed.
- Write `review/<slug>/audio-cues.md` for every episode: exact times (from `cues.json`) of B1 end, each `beat` cut, the
  low point, the reversal, the second surprise and the end, with a one-word mood per section.
- `scripts/v2/sfx.py`: a small synthesized, royalty-free effects set (numpy → 48 kHz WAV): `whoosh`, `pop`, `thud`,
  `rumble`, `riser`, `sparkle`, `crack`, `bell`, `splash`, `zap`. Auto-placed from shot data (`whip`/`snap` → whoosh, tag
  or card pop → pop, `shake` → thud, B5 → rumble, 1.0 s before the reversal → riser, then 8 frames of silence).
  Mixed at −16 dB under the voice. Off with `"sfx": false` in the episode file. Drop-in overrides: `assets/sfx/<name>.wav`.

## G. The Troupe, AFK and real avatars

1. `cast/troupe.json`: five recurring **original** actors with fixed faces, hair and skin, re-costumed per episode: `LEAD`
   (boy, short messy hair), `SECOND` (girl, ponytail), `LITTLE` (0.62 scale, twin buns), `RIVAL` (tall, spiky),
   `ELDER` (grey, side-swept). Episode casts reference them by slot and give the role name and outfit.
   `AFK`: plain grey classic outfit, neutral face, opacity 0.4, frozen mid-step, tag `AFK`.
   `review/season1/troupe-sheet.png`: all six, front and three-quarter, three expressions each.
2. **Owner-supplied official avatars** (`avatar-style/imported.js`): if `assets/avatars/<slot>.glb` exists, load it with
   three's `GLTFLoader`, group its meshes into our six rigid parts by node name (R6 names directly; R15 by merging
   upper/lower/hand or foot parts per limb), map them to our pivots, keep its textures, and use it for that troupe slot.
   Faces from our face system are applied only if the file has no face texture. Unit-test with a synthetic six-box GLB.
   Rules: only files the owner exported from their own Roblox Studio session, wearing items published by Roblox itself
   (not community-made items); never the Roblox logo or wordmark; record each file and its source in `PUBLISHING.md`.
   Do not hand-model copies of official hair, faces or accessories; without a file, the original troupe design is used.

## H. `/new-episode` update

- E1 reads the episode's card in `docs/season1/SEASON_1.md` and `stories/<slug>/beats.md` (when present) as the shot
  plan; beats' target times are replaced by `cues.json` onsets. Where no `beats.md` exists, write one from the card and
  the script using §3's table, then build from it.
- World = terrain + biome + bespoke set pieces (`world.js` ≤ 320 lines). Cast = troupe slots.
- Gates before the owner sees anything: `v2:test`, `v2:plan` (with E), `v2:bench` (A7), `v2:stability`.
- Deliver with the animatic: `review/<slug>/audio-cues.md`, a 1-fps sheet, and the frame-0 still at 390 px ("mute test").
- E2 unchanged (1440 final, `v2:qc`, release, proxy) plus a suggested title and pinned comment from the card.
- Append a row stub to `docs/season1/RESULTS.md`.

## Done when (Session 8)

- `npm test`, `npm run v2:test` pass with new tests for: camera moves, terrain `groundY`, biome tables, plan gates E,
  caption chunking v3, sfx placement, GLB part grouping.
- `review/season1/look-ab.png`: the same alpine valley view built with the old kit and the new one, plus a 390 px crop.
  Self-score 1–5, fix under 4, max 3 passes: (1) reads as a rich, believable place; (2) avatars still pop; (3) nothing
  noisy or photographic next to the plastic characters; (4) depth: foreground, subject, haze, sky; (5) water and
  vegetation move.
- `review/season1/tools-demo.mp4` (≤ 20 s, 1080 proxy, v3 captions with placeholder text): `drone` → `snap` → `heroLow` →
  `tiltUp` on the landform test rig, one weather preset, one trail, a wrist-attached stat, 40 crowd actors, sfx on.
- `review/season1/troupe-sheet.png` and `review/season1/caption-v3-phone.png` committed.
- `v2:bench` on the demo passes A7; numbers recorded. `v2:stability` passes on the demo.
- `.claude/commands/new-episode.md` and `CLAUDE.md` updated (commands, folder map, library index).
- PR updated. **Stop for the owner's review of the look, troupe and captions.**
