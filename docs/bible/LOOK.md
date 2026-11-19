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
  overcast for everything. Phase 5 fills this table (data in `engine/looks4.json`):

| Mood | Key | Sky/HDRI | Temp | Fog | Notes |
|---|---|---|---|---|---|
| dawn hope | (Phase 5) | | | | |
| overcast dread | | | | | |
| golden bittersweet | | | | | |
| night mystery | | | | | |
| storm action | | | | | |

- Faces: our 48-face sheet. Caption accent: our own (R-BRAND-06). The recurring hero + signature prop in the first 3 s (R-BRAND-03).

## Phase 5 open items (from AUDIT.md)
Filmic tonemapping (AgX exists), volumetric fog, bloom, AO, depth of field, light motion blur; render tiers `previz` (low-res, fast) and
`final` (1440×2560, full effects) with measured s/frame and the farm wall clock per tier.
