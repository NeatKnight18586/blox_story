# FORMAT v6: the single source of truth for episode format

Owner decision, 2026-11-20, from the YouTube analytics of Toy House, Nobody and Egg (`docs/season1/RESULTS.md`).
Every other guide, check and default points here instead of repeating these numbers. New episodes are `format: 6`.
Older specs (no `format`, or `format: 5`) keep their old behaviour in the code; their old rules are history, not live rules.

1. **Length.** About 2:00 or less, never padded. The voice sets the length. Hard max **2:05 (125 s)**.
   Script target **300–400 words**: above 400 is a FAIL, below 300 only a WARNING (owner Decision 1, 2026-11-20). (Replaces 2:02–2:50, 2:02–2:15, 2:00–2:30 and v5's 75–90 s.)
2. **End.** The video ends **0.85 s after the last word** (v5 rule kept). No held final shot. A new spec never uses
   max(voice + 2.5, 122.5).
3. **Last line.** It must **not** repeat or paraphrase the opening line. It twists the rule (Toy House: "Whatever…" →
   "Whoever…") or lands the final laugh or feeling. There is no "last line reframes the first" or "final frame rhymes
   with frame 0" rule.
4. **Final shot.** A close-up or two-shot on the payoff. Never a pull-back wide. (Both drop-offs played over wides.)
5. **Hero first.** The hero is on screen by **0:05**. At most 2 lines of rule-setting before the hero. The rule demos
   happen to or around the hero.
6. **Narration.** First person, as decision D1 says (`docs/season1/V4.md`). No cap on first-person sentences.
7. **Unchanged.** The middle structure (escalation, midpoint turn, fair twist), no labels (`SEASON_1.md` §2c), faces v5,
   the voice file untouched (D3), the owner writes every script.

Story rules: STORY_ENGINE.md. Brand: BRAND.md. Build input: EPISODE_BRIEF.md.

## Where the code enforces it (format 6 only)
- `engine/timeline.js`: `DEFAULT_FORMAT = 6`, `endFor(voice, 6)` = voice + 0.85, `MAX_END6` = 125.
- `engine/plancheck.js` (`v2:plan`): end = voice + 0.85 (±1.5 frames), length ≤ 125 s; FAIL if the hero's first shot
  (`subject`, `fit.actor` or `see`; hero = `spec.hero` or the cast entry with troupe HERO) starts after 5.0 s; FAIL if the
  final shot is `size: "wide"` or `move: "pull"`. `engine/seasoncheck.js` skips the frame-0 rhyme and 122–150 s gates.
- `scripts/v2/assemble.py`: the master ends at voice + 0.85 (a longer picture is cut, never held); > 125 s stops.
- `scripts/v2/align.py`: voice ≤ 124.15 s; a story with no `episode.json` yet is format 6.
- `scripts/v2/scriptcheck.py`: > 400 words FAIL, < 300 WARN; FAIL if the last line repeats the first (normalized text equal, or ≥ 60 %
  of the shorter line's words shared); no card first/last-line match, no first-person cap.
- Not machine-checked: "at most 2 rule lines before the hero" and "the last line twists or lands the laugh" (owner's read).

## Moods and pacing (P4, opt-in `moods: true` in a format 6 spec; other specs unchanged)
Data: `engine/mood6.json` (six moods: length, moves, fov, light). A shot's `mood` sets default move / fov / light; the shot overrides any of them.
The renderer applies the light as per-shot uniforms (exposure, saturation, temperature, haze, rim, camera noise): no re-bake, no extra pass.
`v2:plan` prints PASS / WARN / FAIL per check with the shot ids (`engine/plancheck6.js`), and writes `review/<slug>/pacing.png`:
- **a. Mood + length.** Every shot has a mood. Length outside the mood's range by > 20 % = WARN, > 50 % = FAIL. (Also WARN: a move, fov or size outside the mood's list; FAIL: an awe shot that is the last shot and pulls.)
- **b. No dead stretch.** Every 1.5 s window (3.0 s inside emotion / awe shots) holds a novelty event: a cut, a camera move start or change, an expression change, a verb key frame, or an effect. Missing = FAIL.
- **c. Emphasis.** Every word the Brief marks `*like this*` gets a punch-in, crashZoom, expression change or verb key frame within ±3 frames. Missing = FAIL.
- **d. The breath.** The shot before the `twist` shot is tension or emotion and ≥ 1.5 s; the `payoff` shot is held ≥ 1.5 s and has the highest key light (EV) of the episode. Missing = FAIL.
- **e. Escalation.** Shots marked `gag 1`, `gag 2`, `gag 3` grow in size, camera move or effects. Not growing = WARN.
- **f. 180° rule.** Consecutive shots of the same two actors keep the same screen order (one side of the line) unless the shot says `cross`. = WARN.
- **g. Open loops.** `loopOpen` / `loopClose` beats; more than 20 s with no loop open = WARN (a loop never closed = WARN).
- **h. Pacing curve.** Cuts per 10 s against the target: opening (0–25 s) 5–7 · middle 4–6 · emotion beats 2–4 · climax (10 s before the twist up to the payoff) 6–8 · payoff 2–3. Outside = WARN.
- Not built: depth of field for emotion (the renderer has no DoF pass; the mood is data-ready: `dof: true`). Blur: `blur: true` per shot (default on for whip, snap, crashZoom) blends each frame with its neighbour in `assemble.py` (ffmpeg tmix, 2 frames).
- Brief → spec: `node scripts/v2/brief2spec.js --story <slug>` (stories/<slug>/BRIEF.md + cues.json → episode.json).
