# Amendment A5 — Session 8b: look fix before Session 9

The owner reviewed Session 8 (`tools-demo.mp4`, `look-ab.png`, `hair-sheet.png`, `troupe-sheet.png`).
**Accepted as built:** camera moves, weather, lightning, trail, crowd instancing, rule-UI attachment, the troupe's
bodies, faces and outfits, budgets, stability. **Not accepted:** the items below. Session 8 scored itself 4/5 on every
rubric line while the sheets showed these problems, so the acceptance method changes too (§S).

Do A–G in order, then every check in "Done when", then stop. Nothing here changes "Nobody"; everything stays opt-in.

## S. Acceptance method (applies to this and every later session; add it to `CLAUDE.md` Session rules)

A self-score is never a gate. Every visual gate is three things, in this order:
1. a **measured check** in code with a number and a pass line;
2. a **before/after sheet at 390 px phone width** (the size it is watched at);
3. a written list of the **three weakest things visible in that sheet**, before any score. If the list is empty, look again.
The owner decides the look. Report what is weak; do not round up.

## A. Hair v4: sculpted volumes (replaces v3 for the troupe, crowds and all Season 1 casts)

**What was wrong with v3:** many thin, flat-shaded, rectangular shards. At phone size every style reads as the same
spiky tangle, with see-through gaps from behind. The cause was the spec (600 triangles, "tapered locks"), not the code.
**Target:** the catalogue-avatar look: a few big, smooth, chunky volumes with a clear silhouette. Our own designs.

A working prototype is in `avatar-style/hair4.js` (three styles: `messy_fringe`, `long_layered`, `space_buns`), with
proof in `review/season1/hair4-proto-sheet.png` and `hair4-proto-phone.png` (v3 left, v4 right). Finish it:

1. Build all 20 styles from **only** these blocks: `mass` (the smooth hair body over the skull), `clump` (a thick
   swept lock), `bun` (smooth ball), plus two you add from the same parts: `braid` (a chain of 5–8 overlapping smooth
   beads, shrinking) and `curls` (a cluster of 6–12 small buns). No flat shards, no `flatShading`, no double-sided hacks.
2. Hard construction rules (unit-tested on the style tables):
   - 5–14 volumes per style. Every `clump`: width ≥ 0.26 and thickness ≥ 0.16 head units; fringe clumps ≥ 0.40 wide.
   - Indexed geometry, shared vertices, smooth normals. Colour = the vertex gradient already in the prototype
     (darker root → lighter tip, ±6 % tone per clump). One Phong material, single-sided.
   - Nothing in front of the face (|x| < 0.45, z > 0) hangs below `EYE_LINE` (0.26).
   - Triangles: hero ≤ 2,400 · `mid` ≤ 700 (fewer rings and sides) · `crowd` ≤ 140 (the `mass` alone at 10 × 2).
3. The 20 styles (same names as v3 so casts keep working). One line each; make each one a different outline:
   - Boys: `messy_fringe` fluffy top, four fat swept fringe locks · `side_part` one big sweep across, short other
     side · `quiff` tall rolled front, tight sides · `curtains` centre part, two thick drapes to the cheekbones ·
     `fade_textured` low tight sides, short chunky top · `spiky_crop` six to eight fat upward spikes ·
     `curly_top` `curls` on top, short sides · `shaggy_mop` heavy bowl of thick locks to the ears.
   - Girls: `long_layered` (prototype) · `high_ponytail` one thick tail from the crown, face strands ·
     `space_buns` (prototype) · `low_twintails` two fat tails over the shoulders, full fringe · `wavy_bob` chin
     length, clumps bending in an S · `sleek_long` one smooth sheet to the waist, side-swept front · `messy_bun` one
     big bun, loose strands · `long_braids` two `braid`s, full fringe · `curly_puffs` two `curls` puffs ·
     `wolf_cut` layered thick tips flicking out at the neck.
   - Neutral: `buzz` (thin `mass`) · `bald`.
4. Wire-up: `hair: {style, color, v: 4}`; `mid` and `crowd` tiers; `cast/troupe.json` and the crowd use v4. Remove v3
   from the `CLAUDE.md` library line (file stays; nothing in Season 1 uses it). v2 hair is untouched.
5. Measured checks, `node scripts/v2/hair-gates.js` → `review/season1/hair-gates.json` (exit 1 on failure):
   - **Scalp leak:** head drawn magenta, hair black, from azimuth 120–240° every 30° and from above: magenta pixels in
     the upper half of the head = 0 (all styles except `buzz` < 2 %, `bald` skipped).
   - **Distinct outlines:** 128 px silhouettes, front and side; for every pair of styles the overlap (IoU) on at least
     one of the two views ≤ 0.86.
   - **No thin bits:** silhouette at phone scale (head 56 px tall), eroded 1 px then dilated 1 px: area lost ≤ 6 %.
   - Triangle budgets and `EYE_LINE` for all tiers.
6. Sheets: `hair-sheet.png` (20 styles × front, three-quarter, back), `hair-phone-390.png` (six styles on bodies at
   medium-shot size), `troupe-sheet.png` and `troupe-phone-390.png` re-rendered with v4.

## B. Crowds
- Crowd instances wear the `crowd` hair tier in six colours (no bare box heads).
- In any shot sized close or medium, crowd members nearer than 9 units to the camera are replaced by `mid`-tier actors
  with faces and hair (≤ 8 per shot, chosen deterministically). Test the selection as a pure function.

## C. Rule UI and name tags must be readable and inside the frame
In `engine/ruleui.js` / `overhead.js`, as pure, tested functions:
- Minimum on-screen text cap height: name tags 2.4 % of frame height, stats and plates 3.0 %; a UI element a shot lists
  in `focusUi` 4.5 %. If the 3D attachment would draw it smaller, scale it up around its anchor.
- Safe area: nothing may cross 5 % from the sides, 8 % from the top, or enter the caption band; clamp, never clip.
  (Session 8: "GRIP 99" was cut by the frame edge in the close-up and ~1 % tall in the medium shot.)

## D. Surroundings: smooth, not faceted
- **Terrain and landform:** indexed, smooth normals. Ground layers (grass, rock, dirt, snow) blend **per pixel** with a
  world-space noise on the boundary; no per-triangle colour patches (the green/grey checker around the giant). Cells
  ≤ 1.5 units wherever a shot's camera comes within 60 units.
- **Trees and bushes:** canopies are 3–7 welded, smooth-shaded rounded blobs with the `leaves` pattern and a vertex
  gradient (darker underneath); trunks use `bark`. No flat-shaded diamonds. Tree ≤ 260 triangles, far LOD kept.
- **Water:** a darker wet band and a foam line where it meets land, a depth gradient (light shallows → deep centre),
  ripples that follow the flow. It must not read as a flat ribbon.
- **Sky in `storm`:** visible layered cloud shapes, not a flat grey card.

## E. Night must be bright enough for a phone (episode 1 is entirely at night)
New look `nightBright` (or retune the v3 night): strong cool moon key, teal-blue ambient, warm practical lights,
`actorLift` on by default, glowing story props (eggs) as light sources (≤ 4 real point lights; the rest emissive).
Measured on the `egg` look-test view at 390 px (`world-sheet.py` luma stats, extend it for actor boxes):
frame mean luma 0.24–0.42 · mean luma inside each hero actor's box ≥ 0.40 · actor box minus its surrounding ring ≥ 0.12.

**Decision 1 (owner, 2026-11-14, after Session 8b stopped at §E with the numbers in `PROGRESS.md`):**
1. Measure the actor numbers (actor luma ≥ 0.40, box − ring ≥ 0.12) only on shots sized medium or close, framed with §F
   `fit` (actor ≥ 30 % of frame height). Wide/spectacle shots are checked on frame luma only (0.24–0.42). The egg look-test
   views become a medium on Kit and a medium on Dax + a wide of the square.
2. Night palette rule (pure function + test): in any shot whose look is night/nightBright, every hero and troupe outfit
   colour has HSL lightness ≥ 0.32. Dax's hoodie becomes a deep red (#9a2f2f or close), not near-black. Crowds may stay darker.
3. Keep lamp pools small and the plaza darker away from them, so the cast is brighter than the ground around them.
If the medium shots still fail after one pass, stop and report the numbers. Do not loosen.

**Decision 2 (owner, 2026-11-14, after Decision 1 still failed on the mediums):**
1. Measure the character, not a box: render a silhouette mask of each hero (actor-only pass, same camera). Actor luma =
   mean over the mask pixels. Ring = a band 6–14 px outside the mask at 390 px width. Same limits: actor ≥ 0.40,
   actor − ring ≥ 0.12, frame 0.24–0.42. Pure helpers + a unit test on a synthetic image.
2. Apply both routes: one spotlight per hero in medium/close night shots (narrow cone, soft edge, aimed from the camera
   side, lights only the cast's layer; stay within the 4 real lights), and a darker night ground (grass, cobbles and walls
   away from lamp pools drop to about 60 % of their current brightness; sky and moon unchanged).
3. Bring the frame mean back down to 0.24–0.42.
One pass. Then, pass or fail, commit `review/season1/night-egg-390.png` (the three views side by side at 390 px, numbers
printed under each) and continue Session 8b. If it still fails, mark §E "owner review" in `PROGRESS.md` and do not stop.

**Decision 3 (owner, 2026-11-14) — §E night: ACCEPTED** by owner review of `night-egg-390.png`; §E is PASS (owner). Two fixes for
`nightBright`: the sky one step deeper blue (moon and clouds kept), and the egg prop gets an emissive gold rim + a soft halo so it reads
as glowing at 390 px.

**Decision 4 (owner, 2026-11-14) — speed budget.** Do not lower final resolution. Fine terrain cells (≤ 1.5) only within 30 units of
a shot camera; coarser beyond. Ragdoll look test: instance repeated houses/fences/lamps and use far LOD so it is ≤ 90k triangles.
Limit for Season 1 worlds: ≤ 90k triangles and ≤ 0.62 s/frame at 720. One pass; if still over, report the numbers and continue (the
real gate, decided at episode 1 from farm time: a final render + assemble ≤ 3 h).

**Decision 5 (owner, 2026-11-14) — body builds** (opt-in `build` on actors and troupe/cast presets): `adult_f` = subtle hourglass in
the classic blocky style (torso ≈ 1.9 wide at the shoulders, waist ≈ 1.6 at about 55 % of torso height, hips ≈ 1.85; same depth and
bevels; no chest geometry; arms and legs re-attached to fit), for adult women only (moms, teachers, shopkeepers, ≈ half of adult
crowds) · `youth` = anyone under 18, boys and girls: straight torso, 0.9 torso height, head unchanged; never `adult_f` under 18 ·
`elder_f` = grandmas: straight, slightly wider waist, slight forward stoop in idle · `adult_m` = the current torso. Pure torso-shape
function + tests (widths; a cast entry with an age under 18 cannot get `adult_f`). Review: `review/season1/builds-390.png`.

## F. Framing: the subject fills the phone
Pure function in `engine/camera.js` + tests, and a `fit: {actor, height}` option on `heroLow`, `snap`, `push`, `orbit`
that sets the distance so the actor's on-screen height hits the target.
- Shot size `close`: head and shoulders ≥ 45 % of frame height. `medium` and `heroLow`: full actor ≥ 30 %.
- Empty ground at the bottom of the frame ≤ 28 % unless the shot is tagged `spectacle`.
  (Session 8's `heroLow`: hero ≈ 18 % tall, 45 % of the frame was plain grass.)

## G. Re-shoot the proof
- `tools-demo.mp4` (≤ 20 s, 1080 proxy): same tool list as Session 8, in the fixed look; add one `nightBright` shot
  with the troupe LEAD and SECOND at medium size, and one close-up with crowd behind (shows B and C).
- `look-ab.png`: three columns per view (old kit · Session 8 · Session 8b), `egg` and `ragdoll`, with the 390 px row.

**Out of scope here:** the landform giant's face (it reads as a boulder; fix it in episode 11's first session, noted
on card 11) · per-episode buildings and set dressing · captions, plan gates, sound, the daily loop (Session 9).

## Done when (Session 8b)
- `npm test`, `npm run v2:test` pass, with new tests for: hair v4 construction rules and budgets, crowd promotion,
  UI minimum size and safe area, `fit` framing.
- `hair-gates.json` PASS for all 20 styles; luma numbers for E recorded and inside the ranges.
- `v2:bench` on the new demo and both look tests passes A7 (≤ 80k triangles, ≤ 0.60 s/frame at 720); `v2:stability`
  passes; 11-frame "Nobody" re-render still byte-identical.
- Review files committed: the four hair/troupe sheets, `hair-gates.json`, `look-ab.png`, `tools-demo.mp4`, its 1 fps
  sheet. For each sheet, `PROGRESS.md` lists the three weakest things you can see in it (§S). No rubric scores.
- `CLAUDE.md` updated (§S rule, library lines). PR updated. **Stop for the owner's review. Do not start Session 9.**
