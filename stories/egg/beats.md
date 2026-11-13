# 01 `egg` — scene plan (targets; real cut times come from `cues.json` word onsets)

Cast (troupe): SECOND = Kit · RIVAL = Dax (her big brother, number one) · ELDER = the mayor (ski mask over a top hat) ·
LEAD = the kid who steals from Kit's base / a nest kid · LITTLE = smallest nest kid · crowd ≤ 40 · AFK ×2.
The mother = `avatar-style/dragon.js` at 3× scale (never roars at people; `lower`, `turn`, `fly`). Hatchlings = the same
rig at 0.2 scale, `perch`/`cry`/sleep curl. New props: `egg` (smallProp, emissive rim, `warm` 0–1 = glow from cold blue to
gold), `nest` (thatch ring), base pads with a 60-second lock ring (rule UI `plate` + countdown `stat` on the door).
World: suburb biome at night, 12 colour-coded bases around a square with a clock tower and town hall; cloudtop nest.

| # | Target | Line(s) | Shot | Camera | Notes |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | In this town, everybody steals eggs. | wide, `spectacle` | `openHit`; `drone` low over the square: kids sprinting between glowing bases with eggs | the mother's shadow crosses the moon in the first 20 frames; clock reads 11:59. Clue 1: the town-hall weathervane is a dragon |
| 2 | 0:03–0:05 | And there's only one rule. | close | `snap` to Kit's face in the crowd, empty-handed, watching | hero face ≥ 20 % by 5.0 s |
| 3 | 0:05–0:08 | Never hold one at midnight. | insert | clock hands at 11:59; a kid tosses an egg away like it burns | rule UI: a red "00:01:00" countdown over every held egg |
| 4 | 0:08–0:14 | Every kid has a base… Lock your door for sixty seconds. | 3 `beat` shots | hard cuts on "base", "run", "lock" | lock ring fills on a door; `gamecam` behind a runner once |
| 5 | 0:14–0:19 | Then somebody steals it right back. …Most eggs wins. | medium → tilt | LEAD lifts the egg through a window; `tiltUp` to the scoreboard | scoreboard: DAX 200 at the top, KIT 0 at the bottom |
| 6 | 0:19–0:22 | Grandmas play. Mailmen play. The mayor plays in a ski mask. | 3 quick mediums | cuts on each "play" | laugh 1: top hat over the ski mask |
| 7 | 0:22–0:26 | …the whole town plays hot potato. …gone by morning. | wide | `crane` over the square: eggs flying hand to hand, clock at 11:59 | Clue 2: claw marks on the clock-tower roof, lit by the moon |
| 8 | 0:26–0:33 | Then there's Kit… With a sorry note. | medium | orbit, eye level; she sets an egg back in a nest with a folded note | note reads SORRY (no first person on screen) |
| 9 | 0:33–0:43 | Her score is zero… She just keeps saying excuse me. | wide + close | Dax vaults a fence with four eggs; Kit waits politely behind a queue of thieves | laugh 2; `stat` "0" over Kit, "200" over Dax |
| 10 | 0:43–0:49 | But Kit notices things… nobody has ever seen a bird. | wide | slow push over rooftops: nests everywhere, an empty sky | AFK cameo 1: frozen mid-step behind a base wall, opacity 0.4 |
| 11 | 0:49–0:56 | And the eggs are cold… long enough to know. | close, hold | static-drift on Kit's hands; the egg's `warm` rises from blue to gold | Clue 3 (spoken). Blurred runners streak past behind her |
| 12 | 0:56–1:02 | One night, Dax got greedy. One more egg… | medium | `track` with Dax, arms full, grinning; clock behind him at 11:59:50 | |
| 13 | 1:02–1:05 | The clock struck twelve. A shadow covered the moon. | wide, low | `heroLow` FOV 66; the shadow sweeps the street; `shake` once | he is never shown being taken |
| 14 | 1:05–1:08 | In the morning… It was bigger than Kit. | medium | empty bed; a feather longer than Kit lying across it | |
| 15 | 1:08–1:14 | So that night… She apologized to the nest. | medium | Kit tiptoes, takes one egg, bows to the nest | small laugh |
| 16 | 1:14–1:21 | Then she walked to the middle of town… Kit, drop it! | wide | `crane` down: Kit alone in the square, the crowd in a ring, everyone pointing | chat bubbles "DROP IT" ×6 around the ring |
| 17 | 1:21–1:25 | Kit held on. She tucked the egg under her chin… | close, hold | static-drift; egg glow lights her face gold; narration slows | low point; music drops out |
| 18 | 1:25–1:30 | The bell rang twelve times. The shadow came down… | wide, low | `heroLow`; wings fill the frame edge to edge; dust and leaves blow outward | `flash` on the twelfth bell |
| 19 | 1:30–1:35 | It wasn't a bird. It was a dragon. …into the clouds. | medium → `tiltUp` | the mother `lower`s her head to Kit, then lifts her; the crowd's faces go `gasp` | the reversal |
| 20 | 1:35–1:44 | Up there was a nest… asleep in their lap. | wide → medium | `drone` across a cloudtop nest the size of the town; `snap` to Dax with a hatchling on his head | **money shot**; golden light, slow |
| 21 | 1:44–1:51 | Because eggs only hatch… Not one had ever hatched. | inserts | match cuts: an egg flying hand to hand (cold blue) vs an egg in still hands (gold) | the proof |
| 22 | 1:51–1:57 | Kit's egg cracked… She was taking babysitters. | close → wide | hatchling sneezes a spark on Kit; pull back to the mother curled around all of them | second surprise; laugh 3 |
| 23 | 1:57–2:04 | Dax came home… Kit is number one. | wide + insert | dragons landing in the square at sunrise; scoreboard flips: STOLEN → HATCHED, KIT 1 | AFK cameo 2: still frozen by the same wall, now with a hatchling asleep on his head |
| 24 | 2:04–2:09 | In this town, everybody steals eggs. And at midnight, everybody holds on. | same as shot 1 | same `drone` path, same clock at 11:59: the whole town sitting still, eggs glowing gold in every lap | final frame rhymes with frame 0; hold to end |

Audio cue sheet for the owner's music: playful heist 0:00–0:43 · curious, lighter 0:43–0:56 · tension 0:56–1:21 · near
silence 1:21–1:25 · twelve bell hits 1:25 · wonder from 1:35 · warm and bright from 1:57 to end.
