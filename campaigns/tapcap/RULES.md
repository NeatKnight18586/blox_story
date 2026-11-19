# TapCap campaign rules (sponsor; a violation = no payout). Loaded by the QA linter for any spec under campaigns/tapcap/.
Read this, the episode's spec.yml, shots.yml and HANDOFF.md only. Never reuse blox_story character rules (R6, 48 faces, "In this town", lantern hero).

## Hard rules
1. A TapCap is clearly on screen by 1.0 s (sponsor ≤ 5 s; we go stricter).
2. TapCap plays the key role and is never shown negatively (never broken, cheap, dirty, or unwanted at the end).
3. Product shape and proportions are physically accurate (model spec). Scale may be fantasy; proportions may not.
4. Characters: TapCap Slime Guys + Clix only. No other real people, no celebrities.
5. No logos or brand marks except TapCap's. Clix's watch, shoes and clothes are fully unbranded.
6. Family friendly: no violence, no fear beyond a gasp, nobody hurt.
7. No end cards, no follow/subscribe text, no outro. The video ends on the last word (≤ 0.3 s after).

## Model invariants (master asset campaigns/tapcap/assets/slimeguy)
- Default face in ≥ 70 % of shots. Variants only: hopeful, gasp, sad, joy (same pill eyes + thin arc mouth; no brows, no teeth).
- Bands of H = the sponsor ref (front): head 35.7 · torso 26.8 · switch 2.6 · base 35.0 % (± 2 %; REF wins). Eyes = flat black pill decals.
- Tap: keycap (head + torso) down 3 % H over 3 frames, hold 2, back over 4 with a small overshoot; click SFX at the bottom
  (synthesized `click`: 40 ms, sharp transient + short plastic body, peak −6 dBFS). 24 fps.
- Clix = repo R6 rig (satin), 40 × Slime Guy height, taps with the flat blue arm end. S18–S21 blue arm only · S36 full reveal ·
  S37 two click macros · S38 close-up. Nothing on him carries a mark.

## Campaign QA (FAIL blocks the final render). Params in backticks are read by the linter.
- TC-01 a Slime Guy covers ≥ 15 % of frame 1 and stays on screen through 1.0 s. `{"cover":0.15,"until":1.0}`
- TC-02 proportion check passes on the master asset (report qa/proportions.json). `{"tol":0.02}`
- TC-03 no text in frame except the 4 approved signs + captions. `{"signs":["1 / 102","TOP SHELF","CORE ROW","TRADES"]}`
- TC-04 Clix's watch, coat and gloves carry no marks (manual checklist item in every review). `{"manual":true}`
- TC-05 both "Click" presses land within ± 1 frame of their VO onsets. `{"frames":1,"word":"click"}`
- TC-06 S40 replays S1's camera move exactly; their last frames match (camera transform diff = 0). `{"first":"S1","last":"S40"}`
- TC-07 retention: average shot 1.5–2.2 s, no locked-off shots, no dead air, end ≤ 0.3 s after the last word. `{"avg":[1.5,2.2],"tail":0.3}`
