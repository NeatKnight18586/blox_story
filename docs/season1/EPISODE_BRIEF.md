# EPISODE BRIEF: the exact template Claude chat sends for every episode

Fill every field. Rules: [STORY_ENGINE.md](STORY_ENGINE.md). Brand: [BRAND.md](BRAND.md). Format: [FORMAT_V6.md](FORMAT_V6.md).

## META
- slug:
- title: (rule + one capitalised emotional word + one emoji + #shorts #roblox)
- pinned comment: (comment question + "Did you find the loophole before me?")
- comment question:
- length target: (s; script 300–400 words, hard max 125 s)

## PREMISE
- feeling:
- rule line: "In this world, …" (≤ 9 words after the comma)
- hero weakness: (the one flaw that also saves the day)
- loved one: name · troupe slot
- loophole: (the rule's exact wording that allows the rescue)
- clue plants: cue times, first (s) · second, slightly wider (s)
- twist line:
- last line: (≠ first line)

## CAST
- HERO (fixed, `cast/hero.json`): outfit unchanged
- <role> → troupe slot (LEAD | SECOND | LITTLE | RIVAL | ELDER) · outfit change
- (one line per role)

## WORLD
- setting:
- locations: (from the set library where possible)
- palette:
- COLOUR SCRIPT: act 1 · act 2 · act 3 (one colour/light mood each)

## BEATS
One row per shot.

| # | cue start–end (s) | VO words | mood | size | move | subject | action verb | expression + word it lands on | effect | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.0–0.0 | | fun\|comedy\|tension\|emotion\|awe\|payoff | wide\|medium\|close\|insert\|ecu | `engine/camera.js` MOVES name | | | | impact\|freeze\|crash\|none | |

## PAYOFF SHOT
- shows:
- hold length: (s)
- light:

## CHECKS
- [ ] hero on screen by 0:05
- [ ] loved one named and on screen by 0:40
- [ ] clue shown twice (second wider)
- [ ] final shot not wide
- [ ] last line ≠ first line

## Markers `brief2spec.js` reads (exact text; `node scripts/v2/brief2spec.js --story <slug>`)
- **VO words:** `*word*` marks an emphasised word → a check-c entry at the word's time in `cues.json`; the row's verb key (or, with no verb, the first word) lands on it.
- **mood:** `fun | comedy | tension | emotion | awe | payoff` (`engine/mood6.json`). **size:** `wide | medium | close | insert | ecu` (`ecu` = a close with `ecu: true`).
- **subject:** a CAST role (`hero`, `friend`), `a+b` for a two-shot (first = subject), or `prop:<name>` for an insert on a library prop.
- **action verb:** a verb of `engine/acting6.js` (`flinch`, `point`, …), or `role:verb`; `-` for none. **expression + word:** `face @ word`, several with `;` (`warm @ whole; cry @ honesty`); `face` alone lands on the cut.
- **effect:** `impact` (hit on the emphasised word) · `freeze` (4-frame hold there) · `crash` (needs `move` crashZoom) · `none`.
- **notes** (comma or `;` separated): `twist` (the fair twist shot) · `payoff` (mood must be payoff) · `gag 1` / `gag 2` / `gag 3` · `loopOpen: name` / `loopClose: name` · `cross` (the camera may cross the 180° line) · `blur` · `loc: <library location>`. Anything else stays a free note.
- Cue times snap to the nearest word onset in `cues.json` (≤ 0.5 s, else an error naming the row). Unknown mood / size / move / subject / verb / face / effect, a word not spoken in the row's cue range, or a location / prop not in the set library (`parts/sets4/anchors.json`, `parts/locations/*.json`, `parts/library6.json`) are errors; missing library items are listed, never invented.
- **blocking notes (P5):** `place: hero 0 3 yaw 0` · `place: kid 40 -40` (park an actor out of frame) · `cycle: sprint 0 1` · `stand: 40` · `aim: 2.7` · `aimx: 1.6` · `fit: .36` · `push: .9` · `look: storm`; CAST line `· at x z · yaw d`; verb column `hero:idle_alive; little:idle_alive` (i-th verb on i-th `*word*`); effect `crash+freeze`.
