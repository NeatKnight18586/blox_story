# 01 `egg` — scene plan (times measured from the owner's final voice, `stories/egg/voice.flac`, 2:23.5;
# exact cuts still come from `cues.json` word onsets)

Cast (troupe): SECOND = Kit · RIVAL = Dax (her big brother, number one) · ELDER = the mayor (ski mask over a top hat) ·
LEAD = the kid who steals from Kit's base / a nest kid · LITTLE = smallest nest kid · crowd ≤ 40 · AFK ×2.
The mother = `avatar-style/dragon.js` at 3× scale (never roars at people; `lower`, `turn`, `fly`). Hatchlings = the same
rig at 0.2 scale, `perch`/`cry`/sleep curl. New props: `egg` (smallProp, emissive rim, `warm` 0–1 = glow from cold blue to
gold), `nest` (thatch ring), base pads with a 60-second lock ring on the door (a glowing ring that fills; no numbers, no text).
World: suburb biome at night, 12 colour-coded bases around a square with a clock tower and town hall; cloudtop nest.

## The eggs (owner request: every base has its own egg, like egg-collecting games, in our own designs)

Nine original egg designs. Every base is a small themed pad (its own mini terrain) and keeps only its own kind of egg.
Rarity shows only as colour, never as text: a coloured rim glow plus a thin light beam above the nest:
COMMON white · RARE blue · EPIC purple · LEGENDARY gold. Eggs are ≤ 300 triangles each, one shared shape with per-design vertex colour, emissive
details and one small extra part; they are the night's light sources (A5 §E: ≤ 4 real lights, the rest emissive).
Do not copy any game's egg names, designs or UI; these are ours.

| Egg | Rarity | Base (themed pad) | Shell | Moving detail |
|---|---|---|---|---|
| Ember | RARE | lava rocks, a little vent | black with glowing orange cracks | heat shimmer, a few embers |
| Frost | RARE | snowy pad, icicles on the fence | pale blue, faceted like ice | cold breath puffs |
| Moss | COMMON+ | tiny forest, mushrooms | green with soft moss patches | a sprout on top that sways |
| Tide | RARE | sand and a tide pool | sea-glass teal with wave stripes | bubbles rising |
| Geode | EPIC | cave mouth, crystals | rough grey, one cracked window of purple crystal | crystal glints |
| Storm | EPIC | rooftop with a weather vane | navy with a yellow zigzag | tiny sparks crawl along the zigzag |
| Sprinkle | RARE | candy-striped pad, lollipop lamps | pink with sprinkles | sprinkles twinkle |
| Cosmic | LEGENDARY | the mayor's observatory dome | deep violet with drifting stars | stars move across the shell; only one in town |
| Plain | COMMON | Kit's empty base: a mat and a sorry note | cream with brown speckles | none (until midnight) |

**Story use (no script change):** everyone chases the Cosmic and Epic eggs; the one Kit steals and holds at midnight
is the **Plain** egg nobody wanted (she took the one she would not feel bad about). In the nest, every hatchling matches
its egg (ember dragon with glowing spines, frost dragon with crystal horns, …: `dragon.js` at 0.2 scale, recoloured,
one extra part each). Kit's Plain egg hatches the only **gold** dragon in the nest: the commonest egg, the rarest
hatchling.

| # | Target | Line(s) | Shot | Camera | Notes |
|---|---|---|---|---|---|
| 1 | 0:00.0–0:02.5 | In this town, everybody steals eggs. | wide, `spectacle` | `openHit`; `drone` low over the square: kids sprinting between glowing bases with eggs | every base glows its own egg colour (lava orange, ice blue, crystal purple, the gold Cosmic dome); the mother's shadow crosses the moon in the first 20 frames; clock reads 11:59. Clue 1: the town-hall weathervane is a dragon |
| 2 | 0:02.5–0:04.0 | And there's only one rule. | close | `snap` to Kit's face in the crowd, empty-handed, watching | hero face ≥ 20 % by 5.0 s |
| 3 | 0:04.0–0:06.2 | Never hold one at midnight. | insert | clock hands at 11:59; a kid tosses an egg away like it burns | no text: every held egg pulses red, faster and faster as the clock nears twelve |
| 4 | 0:06.2–0:12.2 | Every kid has a base… Lock your door for sixty seconds. | 3 `beat` shots | hard cuts on "base", "run", "lock" | three different themed bases (Ember, Frost, Sprinkle), each cut lands on a different egg; lock ring fills on a door; `gamecam` behind a runner once |
| 5 | 0:12.2–0:17.3 | Then somebody steals it right back. …Most eggs wins. | medium → tilt | LEAD lifts the egg through a window; `tiltUp` to the scoreboard | scoreboard: DAX 200 at the top, KIT 0 at the bottom |
| 6 | 0:17.3–0:21.1 | Grandmas play. Mailmen play. The mayor plays in a ski mask. | 3 quick mediums | cuts on each "play" | laugh 1: top hat over the ski mask |
| 7 | 0:21.1–0:28.3 | …the whole town plays hot potato. …gone by morning. | wide | `crane` over the square: eggs flying hand to hand, clock at 11:59 | Clue 2: claw marks on the clock-tower roof, lit by the moon |
| 8 | 0:28.3–0:36.3 | Then there's Kit… With a sorry note. | medium + insert | orbit, eye level; she sets an egg back in a nest; cut to the folded note on "sorry note" | note reads SORRY (no first person on screen) |
| 9 | 0:36.3–0:48.4 | Her score is zero… She just keeps saying excuse me. | 2 shots | 36.3–42.9 scoreboard tilt + Dax vaults a fence with four eggs; 42.9–48.4 Kit waits politely behind a queue of thieves | laugh 2; the scoreboard in the background is the only place the numbers appear |
| 10 | 0:48.4–0:54.9 | But Kit notices things… nobody has ever seen a bird. | wide | slow push over rooftops: nests everywhere, an empty sky | AFK cameo 1: frozen mid-step behind a base wall, opacity 0.4 |
| 11 | 0:54.9–1:03.0 | And the eggs are cold… long enough to know. | close → wide | 54.9–60.4 static-drift on Kit's hands, the egg's `warm` rises from blue to gold; 60.4–63.0 wide: runners streak past the one still girl | Clue 3 (spoken). It is the Plain egg; blurred runners streak past behind her holding glowing rare eggs |
| 12 | 1:03.0–1:07.7 | One night, Dax got greedy. One more egg… | medium | `track` with Dax, arms full, grinning; clock behind him at 11:59:50 | |
| 13 | 1:07.7–1:11.0 | The clock struck twelve. A shadow covered the moon. | wide, low | `heroLow` FOV 66; the shadow sweeps the street; `shake` once | he is never shown being taken |
| 14 | 1:11.0–1:16.3 | In the morning… It was bigger than Kit. | medium | empty bed; a feather longer than Kit lying across it | |
| 15 | 1:16.3–1:23.5 | So that night… She apologized to the nest. | medium | Kit tiptoes, takes one egg, bows to the nest | small laugh |
| 16 | 1:23.5–1:31.2 | Then she walked to the middle of town… Kit, drop it! | wide | `crane` down: Kit alone in the square, the crowd in a ring, everyone pointing | no bubbles: mouths open, arms waving, everyone pointing at her |
| 17 | 1:31.2–1:35.2 | Kit held on. She tucked the egg under her chin… | close, hold | static-drift; egg glow lights her face gold; narration slows | low point; music drops out |
| 18 | 1:35.2–1:40.4 | The bell rang twelve times. The shadow came down… | wide, low | `heroLow`; wings fill the frame edge to edge; dust and leaves blow outward | `flash` on the twelfth bell |
| 19 | 1:40.4–1:46.6 | It wasn't a bird. It was a dragon. …into the clouds. | medium → `tiltUp` | the mother `lower`s her head to Kit, then lifts her; the crowd's faces go `gasp` | the reversal |
| 20 | 1:46.6–1:54.5 | Up there was a nest… asleep in their lap. | wide → medium | `drone` across a cloudtop nest the size of the town; `snap` to Dax with a hatchling on his head | **money shot**; golden light, slow; hatchlings of every egg type (ember, frost, moss, tide, geode, storm, sprinkle, cosmic) asleep in laps |
| 21 | 1:54.5–2:02.4 | Because eggs only hatch… Not one had ever hatched. | inserts | match cuts: an egg flying hand to hand (cold blue) vs an egg in still hands (gold) | the proof |
| 22 | 2:02.4–2:08.9 | Kit's egg cracked… She was taking babysitters. | close → wide | Kit's Plain egg hatches the only gold dragon; it sneezes a spark on her; pull back to the mother curled around all of them | second surprise; laugh 3 |
| 23 | 2:08.9–2:18.9 | Dax came home… Kit is number one. | 3 shots | 128.9–132.1 dragons landing in the square at sunrise; 132.1–134.5 an abandoned egg on a bench, nobody tossing it; 134.5–138.9 scoreboard flips: STOLEN → HATCHED, KIT 1 | AFK cameo 2: still frozen by the same wall, now with a hatchling asleep on his head |
| 24 | 2:18.9–2:23.5 | In this town, everybody steals eggs. And at midnight, everybody holds on. | same as shot 1 | same `drone` path, same clock at 11:59: the whole town sitting still, eggs glowing gold in every lap | final frame rhymes with frame 0; hold to end |

Audio cue sheet for the owner's music: playful heist 0:00–0:48 · curious, lighter 0:48–1:03 · tension 1:03–1:31 · near
silence 1:31–1:35 · twelve bell hits from 1:35 · wonder from 1:42 · warm and bright from 2:09 to end (voice ends 2:23.3).
