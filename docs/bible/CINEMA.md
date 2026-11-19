# Cinema grammar: the production-team feel (prompt §1f)

Every shot uses preset grammar except the 3 hero shots (R-HERO-01). That keeps quality high and tokens low.
Engine today: `engine/camera.js` moves (push, pull, orbit, track, crane, whip, snap, tiltUp, heroLow, crashZoom, topDown, lowAuthority,
aisleTrack, drone), `openHit`, `fit` framing; Phase 4 wraps them as presets that take only target + duration + intensity.

## Cadence and cuts
- **R-CUT-01:** on average one cut or major camera event every 1.5–2.2 s (QA: runtime / (cuts + events)). Cuts are derived from VO
  word timestamps, never from fixed intervals: a cut frame is within 2 frames of a word start.
- **R-CUT-02:** nearly every VO clause gets its own visual beat. The Phase 4 cut planner splits at clause boundaries (punctuation +
  pauses in `cues.json`) and at stressed words (the owner's `*word*` marks + the beats prompt; no prosody model).

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
≥ 1.0 s, facing the camera within 35°. Phase 4 builds a one-call helper that auto-scales to this.

## Animation (R-ANIM-01)
Crisp R6 key poses (`engine/poses.js`, `snap: true` = 2 frames), snappy head tilts, hard freezes (`freeze: [t, frames]`), instant face
swaps from the 48-face sheet. Environment FX (shatter, ripples, arcs) are tweened smoothly (`engine/effects.js`) for contrast. No
micro-motion (breathing, idle sway) unless a beat needs it (N-TOK-01).

## Hero shots and the loop
- **R-HERO-01:** exactly 3 hero shots: frame 1, the reversal, the final loop frame. Spec `hero_shots[3]`. They get bespoke work in the
  sequence passes; everything else is preset grammar.
- **R-LOOP-01:** the final frame's composition matches or leads into frame 1 so the restart feels seamless (same subject screen
  position and size class, or a camera move that continues into shot 1). Phase 4 sets the metric and the loop helper.

## Labels (R-LABEL-01)
No name, role or AFK tags, chat bubbles, class cards or overhead tag/stat/icon UI on people or objects (`engine/nolabels.js`,
`noLabels` gate in `v2:plan`). Text only on real in-world objects (signs, scoreboards, clocks, notes, switches) and in captions.
Default for every new spec (`labels: false`).
