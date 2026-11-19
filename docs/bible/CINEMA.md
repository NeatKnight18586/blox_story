# Cinema grammar: the production-team feel (prompt §1f)

Every shot uses preset grammar except the 3 hero shots (R-HERO-01). That keeps quality high and tokens low.
Tooling (Phase 4): `engine/presets6.js` presets push, pull, orbit, tiltDown, craneUp, track, whipZoom, snapZoom, macroInsert, aerialReveal
take only target + duration + intensity (+ size, lens, azimuth) and compile to the `engine/camera.js` moves; shot `dutch` (deg) adds a
roll. `engine/cutplan.js` + `tools/plan_cuts.js` plan the cuts from VO word timestamps + the beats prompt; `engine/signs6.js` sizes signs;
`presets6.loopify` is the loop helper; `tools/contact_sheet.py` is the only way to look at shots.

## Cadence and cuts
- **R-CUT-01:** on average one cut or major camera event every 1.5–2.2 s (QA: runtime / (cuts + events)). Cuts are derived from VO
  word timestamps, never from fixed intervals: a cut frame is within 2 frames of a word start.
- **R-CUT-02:** nearly every VO clause gets its own visual beat. The cut planner scores every word start (line start +3, after
  clause punctuation +2, after a ≥ 0.18 s pause +2, stressed +2: the owner's `*word*` marks + caption keywords; no prosody model),
  pulls a cut onto every beat start (bonus), forces a cut into every VO pause > 0.4 s (R-LEAK-01), and solves for shot lengths
  0.9–2.4 s around 1.85 s; if the average leaves 1.5–2.2 s it relaxes (longer minimum, weaker beat pull) until it fits.
- Beat intent → first shot of the beat: clue → whipZoom, reveal → snapZoom, emotion → push on the emotion lens (close), scale →
  aerialReveal, action → track, insert → macroInsert, info → push. Later shots in a beat cycle sizes, never wide-wide or macro-macro.
  Intent = an `[intent]` tag in the beat's shot text, else keywords.

## Camera
- **R-CAM-01:** zero locked-off shots. Every shot has a push, pull, orbit, tilt, crane, track or whip. QA fails `static-drift`, `static: true`
  or a shot whose camera moves < 2 % of frame width over its length.
- **R-CAM-02:** scale contrast. Alternate macro inserts (a coin, a ring on a blocky hand, a tear, a marble) with aerial/crane wides that
  reveal scale. Shot classes: macro = `insert`, wide = `wide`/aerial. Two same-class neighbours (wide-wide or macro-macro) may occur
  at most twice per episode.
- **R-CAM-03:** intent → move. A clue gets a whip-zoom (`whip`/`crashZoom`), a reveal a snap-zoom (`snap`), an emotional line a slow
  push-in (`push`, ≤ 6 % over the shot, emotion lens).
- **R-JOLT-01:** one quick, subtle shake at 0:00 only: `openHit` on shot 1 (8 frames, punch 7 %, amplitude .05, `camera.js OPEN_HIT`).
  No other camera shake anywhere: not at scene starts, not on impacts (use `freeze`, `impact` flash, snap instead). Decision
  (2026-11-19): the strict reading, so the jolt stays a signature.

## Lenses (R-LENS-01)
Camera fov in the engine is vertical. "mm" = full-frame equivalent on the frame's long (vertical) side, 36 mm: fov = 2·atan(18 / mm).

| Preset | mm | vertical fov | Use |
|---|---|---|---|
| `wide` | 18–24 | 90°–74° | scale wides, aerial reveals |
| `action` | 35 | 54° | action, walking, two-shots |
| `emotion` | 85–135 | 24°–15° | emotional close-ups, shallow DOF (Phase 5) |

(Reference: 50 mm = 40°. Toy House used fov 54–56, i.e. ~35 mm almost everywhere.)

## Signage (R-SIGN-01)
Diegetic signs and props carry the lore on mute ("DAY 19", "NEVER MEET", a countdown on a tower). 3–6 per episode, ≤ 3 words each.
Readable in ≤ 1 s on a phone: cap height ≥ 3 % of frame height (the rule-UI plate minimum already used by `engine/ruleui.js`), on screen
≥ 1.0 s. Helper: `sign(text, {at, face, readFrom, fov})` (`engine/signs6.js`) sizes the plate for its reading distance (+ 15 %
margin) → episode.json `signs` (episode.js draws them, opt-in); QA measures cap height from each shot's camera that `see`s the sign.

## Animation (R-ANIM-01)
Crisp R6 key poses (`engine/poses.js`, `snap: true` = 2 frames), snappy head tilts, hard freezes (`freeze: [t, frames]`), instant face
swaps from the 48-face sheet. Environment FX (shatter, ripples, arcs) are tweened smoothly (`engine/effects.js`) for contrast. No
micro-motion (breathing, idle sway) unless a beat needs it (N-TOK-01).

## Hero shots and the loop
- **R-HERO-01:** exactly 3 hero shots: frame 1, the reversal, the final loop frame. Spec `hero_shots[3]`. They get bespoke work in the
  sequence passes; everything else is preset grammar.
- **R-LOOP-01:** the final frame's composition matches or leads into frame 1 so the restart feels seamless. Metric (QA): the last
  frame's camera position and target each within 0.15 × frame 1's camera–target distance of frame 1's, fov within 5°. Helper:
  `loopify(shots)` ends the last shot on shot 1's opening pose; it only looks right when the last beat is in the same place as the
  first (a beats-prompt decision), so the planner never flies the camera across the world to fake it. Visual check:
  `tools/contact_sheet.py --frame loop`.

## Labels (R-LABEL-01)
No name, role or AFK tags, chat bubbles, class cards or overhead tag/stat/icon UI on people or objects (`engine/nolabels.js`,
`noLabels` gate in `v2:plan`). Text only on real in-world objects (signs, scoreboards, clocks, notes, switches) and in captions.
Default for every new spec (`labels: false`).
