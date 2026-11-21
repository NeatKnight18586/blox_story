# Season 1 results (owner fills the numbers; see SEASON_1.md §7)

Retention columns (from YouTube's audience-retention curve, % of starting viewers): ret@0:10, ret@0:30, at the start of
the last line (ret@last line) and at the final frame (ret@end). These rows drove FORMAT v6 (`FORMAT_V6.md`).

| # | slug | lane | title | length | posted | views 48h | stayed % | avg % viewed | ret@0:10 | ret@0:30 | ret@last line | ret@end | shares /1k | subs /1k | top country | dips |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|  | toyhouse |  | Toy House | 1:22 |  | 31,197 |  | 79.9 | 102 | 82 | 65 | 62 |  |  |  |  |
|  | nobody |  | Nobody | 2:03 |  |  | 83.0 | 85.0 | 101 | 90 | 73 | 45 |  |  |  |  |
| 1 | egg |  | Egg | 2:26 |  |  | 87.2 | 74.3 | 106 | 82 | 61 | 38 |  |  |  |  |

## lastcolor — build lessons (for episode 2)

1. Time the BRIEF from the real voice (v2:align cues), not from word-count estimates. The estimated cue column was off by up to 3 s and caused mood-length, dead-stretch and punch-in FAILs.
2. Write the BRIEF in strict parser syntax from the start: markers as `;`-separated items before prose; no `prop:` subjects unless the object exists in the world and has a `cam:`; sub-lists never in WORLD `locations:`; CAST notes in their own section.
3. Staging first: give each act a clear zone and keep the crowd out of close-up shots (the `clear` note, `crowdArea`, `crowdAvoid`). Write `cam:` notes for every close, insert and ECU shot. Cameras must never sit inside geometry.
4. White-on-white fails `standsOut` (58 read items). For the next white-cast story: give the world a darker or saturated ground, or rim light the dummies. Do not rely on a pale concrete plaza.
5. Each plant needs a face-forward close-up with ≥ 35 % of frame (S19 cheeks, S27 blush were too small). The payoff's colour must be fully back at the shot's MID-frame, not at its end (S62: "back" landed 0.1 s late).
6. Glove and pinch: keep the thing being grabbed fully visible (S31: fingers hid Bitsy). A pile needs a side or 3/4 view, not topDown (S51).
7. Known flaws shipped in lastcolor (owner accepted): standsOut weak in dummy shots; S26/S50 busy crowd frames; S31 glove covers Bitsy; S51 mound reads flat from above; S21 uses a plain punch because the library has no boxing glove.
