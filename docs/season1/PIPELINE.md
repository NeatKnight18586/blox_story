# PIPELINE — build habits (permanent, owner 2026-11-24)
Read this first in every session. Find code via `CODEMAP.md` + `grep -n`; never explore the repo.

1. **One phase per session.** Do the block, report, STOP.
2. **Paste-only prompts name the model**: Opus only for new reusable kits/rigs; Sonnet for mechanical work.
3. **Prompts name exact files/functions.** No exploration, no whole large files.
4. **Reuse before build** (`docs/LIBRARY.md`). New things are DATA presets on existing kits.
5. **Every reusable piece gets one LIBRARY.md line in the same session.**
6. **Look-dev on ONE sheet** before any episode render.
7. **One contact sheet per phase.**
8. **Reports ≤ 20 lines**: numbers + PASS/FAIL + the five weakest items, then STOP.
9. **Low-res animatic before final.** Spend render-farm minutes, not tokens, on quality.
10. **Worlds = build only what the camera sees**: hero zones full detail; instanced seeded midground kit; terrain/silhouette/fog
    background; night windows/lanterns carry the detail.
11. **Numbers before pictures** (measured gate first, then the sheet).

## Commands
- `npm run codemap` → `CODEMAP.md` (one line per file, from its first comment line; regenerate after adding files).
- `npm run ep -- --story <slug> --stage <align|spec|plan|animatic|final>` chains the existing commands of that stage, logs to
  `stories/<slug>/logs/`, prints ≤ 20 lines (each gate PASS/FAIL + key numbers), stops at the first FAIL.
  align = v2:align · spec = brief2spec · plan = v2:plan · animatic = stability + read + 270×480 render + sheet + pacing.png + phone-390.png · final = `--final` render.
- `npm run ep:check -- --story <slug>` (engine freeze): fails if the branch diff touches anything outside `stories/<slug>/`,
  `beasts/*.json`, `parts/locations/*.json`, `cast/*.json`. **Episode sessions must pass it; engine work only in engine phases.** The diff base is the commit in `stories/<slug>/BASE` (else `origin/main`): **each episode's first commit writes `stories/<slug>/BASE`** (the commit it branches from; tuft = 630b258; since 4C = 92c14ca).

## Rig (owner 2026-11-24)
Episodes may use `rig: 'r6'` (classic rigid R6, no bends, `engine/r6.js`, `cast/troupe-r6.json`) and `twos: true` (characters on
twos at 24 fps; camera, FX and light on ones).

## Multi-location episodes, SPEC FLAGS (tuft 4A)
- A Brief whose shots use more than one `loc:` gets spec `locations: [..]`: render / stability / read / bench open ONE page per location (`scripts/v2/segments.js`; spec.location = L, own baked light) and render only the shots with `shot.loc === L` into the shared frames dir (same names, same cache). Shots without `loc:` inherit the previous shot's location. Marks are anchored to each location's `street` anchor.
- The Brief's `SPEC FLAGS` line (`` `format: 6`, `rig: 'r6'`, … ``, ``night look `moonlit` ``) is written into the spec. `look:` also takes moonlit | dusk | dawn (village worlds map `look:` to looks4 names via the location's `lookMap`).
- `prop:<spider|toaster|spaghettiPlates|giantCage|chains|lanternSea>` and the `cage:` / `chains:` vocab emit spec `props2b`; `prop:<location>` / `prop:dinnerTable` frame the location view / the dining table.

## Lessons from E5 "tuft" (owner, 2026-11-25) — apply to every episode
1. Target look = ROBLOX STUDIO, not film: crisp, bright, saturated plastic, glow only on Neon-like seams. No film grain, no chromatic fringe, no haze near camera, depth blur only on CU inserts. Grain/blur/moody grade read as "CCTV footage".
2. Never stage cameras by hand-typed coordinates: shots use named camera TEMPLATES (establish, wide, ms, mcu, cu, ecu, ots, two, insert, beastHero) solved from where the subject stands, with an occlusion check. Blind coordinate staging burned whole sessions and still missed.
3. Every narrated sentence's picture is checked against its words BEFORE any look work (a picture-matches-VO pass on a 1-frame-per-shot sheet).
4. Scope a new-world episode at ≤ 4 locations and ≤ 45 shots; reuse sets before building new ones.
5. Verify the engine can render the Brief (locations, flags, props, looks) with a 1-frame-per-shot smoke render BEFORE writing the build prompt; prompts never assume an engine feature exists.
6. Ship the minimum that proves the idea, measure the 48-hour numbers, then invest.
