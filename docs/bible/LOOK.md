# Look: stylized Roblox realism (prompt §1g; presets filled in Phase 5)

Owner decisions (2026-11-19): realism wins over render speed (N-REAL-01). Final master native 1440×2560 (N-RES-01).
Superseded: `docs/season1/V4.md` "frame budget 0.69 s/frame" and "not used in v4: bloom, volumetric fog, real-time AO". The only time
limit now is free GitHub Actions limits (standard runners, 6 h per job, 20 concurrent jobs on a public repo): shard more instead.

## What we match (observed in Volze "We Only Move When It Blinks")
- **R-LOOK-01 Worlds:** photoreal PBR (wet cobblestone, cracked plaster, timber framing, clay roof tiles, real grass hills) at real-world
  building scale, characters small against them. Tooling: `parts/location.js` (Phase R, CC0 PBR + HDRI). Every episode builds a new
  world from it (N-WORLD-01).
- **R-LOOK-03 Characters:** classic chunky R6, matte/satin plastic, simple outfits with tiny details (badge, collar, patch). Faces are
  ours (faces v5, N-FACE-01), not classic decals.
- **R-LOOK-04 Crowds:** 6–20 background R6s fill most shots where the story allows (`spec.crowds`). QA warns, doesn't fail.
- **R-LOOK-05 Camera feel:** mostly LOW angle, wide lens, very close to characters; a blocky arm or torso fills the foreground for
  depth; frequent slight Dutch tilts (2–6° roll); light motion blur on whips (`motion5b.blurOffsets`); shallow DOF on emotional close-ups.
- **R-LOOK-06 Creatures:** cute-creepy hybrids (a giant eye with eyelashes, a moss giant), rendered more realistically than the characters.

## Where we differ (brand)
- **R-LOOK-02 Mood lighting:** five mood presets with a directional key light and colour-temperature shifts per act, not one flat
  overcast for everything (Phase 5, data in `engine/moods7.json`):

| Mood | Key light | Sky (HDRI, CC0) | Temp (grade; per-act shift) | Fog (colour near–far) | Extras |
|---|---|---|---|---|---|
| dawn hope (`dawnHope`) | #ffc184 × 2.6 | Poly Haven spruit_sunrise (low warm sun), exp 0.9 | +0.08 (acts +0.00, -0.02, -0.05, +0.06) | #f0c8a0 25–260 | bloom 0.18; light shafts 0.3 |
| overcast dread (`overcastDread`) | #d9e1ea × 0.9 | Poly Haven blouberg_sunrise_2 (diffuse, neutral), exp 0.85 | -0.08 (acts +0.02, +0.00, -0.04, +0.00) | #a8b0b4 12–170 | bloom 0.12; — |
| golden bittersweet (`goldenBittersweet`) | #ffb066 × 3.0 | Poly Haven venice_sunset, exp 0.95 | +0.14 (acts +0.00, +0.03, -0.06, +0.08) | auto 30–230 | bloom 0.45; light shafts 0.45 |
| night mystery (`nightMystery`) | #8fb0ff × 0.55 | Poly Haven moonless_golf, exp 0.85 | -0.12 (acts +0.00, -0.03, -0.05, +0.05) | #1a2433 15–150 | bloom 0.8; practicals ×4.0; lantern light |
| storm action (`stormAction`) | #c7d3e0 × 1.4 | Poly Haven blouberg_sunrise_2 (diffuse, neutral), exp 0.8 | -0.09 (acts +0.00, +0.00, -0.03, +0.02) | #56606a 6–110 | bloom 0.25; rain |

Data: `engine/moods7.json` (presets + `gate` pass lines), pure logic `engine/moods7.js` (`moodLocation`, `postFor`, `wbGains`, `actOf`),
post chain `engine/post7.js`: MSAA 4 HDR target → GTAO ambient occlusion (clipped to 150 units around the camera) → screen-space light
shafts from the sun → Bokeh depth of field (emotion-lens / close shots only, focus = subject) → Unreal bloom → grade (white balance,
saturation, contrast, lift, vignette, rain streaks) + AgX filmic tone map → sRGB. Episodes opt in with `"mood": "<key>"` (+ `"acts": [t2, t3, t4]`);
whips/crash zooms get 2-sub-frame motion blur. "Volumetric fog" = linear aerial fog + screen-space shafts (no ray-marched volume: Decision).
No storm HDRI is reachable here: `stormAction` reuses the diffuse blouberg sky, darker, colder, with fog and rain (Decision).

## Materials (R-LOOK-01) — `assets/look7.json` + `tools/fetch_look_assets.py` → `renders/cache/assets` (gitignored)
| Surface | Source in this session | On the farm with Poly Haven (assets/realism.json) |
|---|---|---|
| stone | brick photo set (walls + brick pavers), bump → normal | + cobblestone, plaster photo-scans |
| wood | hardwood2 photo set (doors, crates) | + planks |
| metal | brushed: roughness + disturb maps, metalness .9 | same |
| water | water normal map, roughness .04, env reflections | same |
| foliage | grass photo (hedges), normal from albedo | same |
| glass | dark, roughness .03, env reflections (no texture) | same |
| snow | procedural relief (`parts/materials.js` snow) | procedural |
Characters stay satin R6 (body5 MeshStandard r .45), lit by the mood (no matcap), so the contrast reads.

- Faces: our 48-face sheet. Caption accent: our own (R-BRAND-06). The recurring hero + signature prop in the first 3 s (R-BRAND-03).

## Render tiers (measured 2026-11-19, 4-core Xeon 2.1 GHz = a free public-repo Actions runner)
| Tier | Size | Settings | s/frame (test world) | s/frame (Toy House set + mood) |
|---|---|---|---|---|
| previz | 270×480, every 2nd frame | no MSAA, no AO, no DOF; bloom, shafts, grade, fog on | 0.13–0.24 | 0.77 |
| final | 1440×2560, every frame | MSAA 4, AO, shafts, DOF (close), bloom, grade, whip blur | 6.6–9.9 (mean 8.2) | 14.1 |
| (before: Phase R lit street, no post) | 1440×2560 | — | 1.6–2.6 | — |

Farm estimate, 2-min episode at 24 fps (2 880 frames), final: mean 8.2 s → 6.5 runner-hours; worst case 14.1 s → 11.3 h.
`render.yml` uses 20 shards for `mood` specs (free-plan concurrency): 34 min of rendering per shard at the worst case + ~6 min setup,
under the 300-min job cap; wall clock ≈ 45–55 min + assemble. Previz (every 2nd frame at 270×480): 1 440 × 0.2–0.8 s ≈ 5–19 min locally.

### Phase 5 stills and gate (`node tools/look_stills.js --before` → `review/look7/look7.json`, sheets `python3 tools/look_sheet.py`)
| Mood | Shot | previz s | final s | mean luma | R/B | clipped | gate |
|---|---|---|---|---|---|---|---|
| dawnHope | R1_lowwide | 0.21 | 7.93 | 0.36 | 1.328 | 0 | PASS |
| dawnHope | R3_face | 0.20 | 9.91 | 0.41 | 1.314 | 0.0002 | PASS |
| overcastDread | R1_lowwide | 0.14 | 6.57 | 0.395 | 1.022 | 0 | PASS |
| overcastDread | R3_face | 0.14 | 8.21 | 0.425 | 1.029 | 0 | FAIL |
| goldenBittersweet | R1_lowwide | 0.18 | 8.02 | 0.458 | 1.224 | 0 | PASS |
| goldenBittersweet | R3_face | 0.20 | 9.93 | 0.457 | 1.395 | 0 | PASS |
| nightMystery | R1_lowwide | 0.14 | 6.71 | 0.222 | 0.683 | 0 | FAIL |
| nightMystery | R3_face | 0.17 | 9.27 | 0.101 | 1.309 | 0 | PASS |
| stormAction | R1_lowwide | 0.13 | 6.89 | 0.329 | 0.978 | 0 | PASS |
| stormAction | R3_face | 0.15 | 8.40 | 0.364 | 0.998 | 0 | FAIL |
| before | R1_lowwide | 0.13 | 1.66 | 0.458 | 1.113 | 0 | baseline |
| before | R3_face | 0.15 | 2.56 | 0.451 | 1.203 | 0 | baseline |
