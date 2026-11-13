# Season 1: the 30-story slate, format and rules

Owner-approved creative source for every episode in the season. Claude Code executes this; it does not rewrite stories,
titles, rules or twists. A card that cannot be staged as written → say so in one paragraph and stop.

## 1. What separates thousands, millions and tens of millions

Read from the owner's study of four leading channels (their top-5 lists, view counts as the owner collected them):

| Tier | What those videos have | Example pattern |
|---|---|---|
| Thousands | The idea needs explaining. Frame 0 is ordinary. Looks like every other upload. | a rule you must hear to understand |
| Millions (5–10M) | One-sentence rule shown as a visible mechanic, an underdog with a defect, a crisis, the defect wins. | glowing UI on bodies, quirky custom material, survival-rule horror |
| Tens of millions (13–21M) | All of the above **plus** a premise you understand from one muted picture, built on primal forces at world scale, with a 3–5 word forbidden-command title. | two kingdoms of opposite elements, an ocean that retreats, a line you must not cross |
| Hundreds of millions | No single video in the study reaches it. It is a **channel total**: dozens of strong episodes plus long compilations. | library depth |

So the season is weighted toward world-scale, picture-first stories, and every episode must pass the **mute test**: frame 0
and the next three seconds explain the rule with no sound and no caption.

## 2. Steal like an artist: what we take, what we add

| From | We take the principle | We never take |
|---|---|---|
| Epic elemental channels | world-scale spectacle; drone establishing shot then a low heroic angle; command titles | their elements, kingdoms, plots |
| Rule/sci-fi channels | the rule as glowing UI attached to bodies; three rapid examples with hard cuts | their mechanics (battery, two lives, moving streets, glowing steps) |
| Quirky art channels | one custom material or creature per episode; tilt-up scale shots | drawings that come alive, paper worlds |
| Horror-lore channels | strict survival rules; slow push-ins; a loved one in doubt | their monsters and tests |

**Our own five signatures (every episode):**
1. **The Troupe.** The same five original actors play a new role in every world (A4 §G). Viewers learn their faces.
2. **Three clues.** Three visible clues to the twist are on screen before it happens. Rewatching pays off.
3. **AFK.** A hidden, faintly transparent, frozen player tagged `AFK` appears in exactly two shots of every episode. The finale is his story.
4. **Two full minutes with a second surprise** after the reversal (why the rule existed, or what it cost).
5. **The last line flips the first line**, and the final frame rhymes with frame 0, so the loop feels designed.

## 3. Format v3 (target 2:02–2:15, 410–440 words, third-person narration)

| Beat | Target time | What happens | Camera | Must be on screen |
|---|---|---|---|---|
| B1 Rule | 0:00–0:08 | "In this world/town, …" + the one rule, two sentences | `openHit`, `drone` over the spectacle, snap to hero face by 0:05 | the rule as a picture; hero face ≥ 20 % of frame height |
| B2 Expansion | 0:08–0:25 | three rapid, funny or eerie examples of life under the rule; first laugh | hard cuts on words, up to three `beat` shots, inserts | one new image per example |
| B3 Defect | 0:25–0:42 | the hero, the flaw, who laughs at it, what they want | medium orbit, eye level; `gamecam` once | clue 1 |
| B4 Crack | 0:42–1:00 | something does not add up; the hero bends the rule | slow push, over-shoulder | clue 2; AFK cameo 1 |
| B5 Crisis | 1:00–1:25 | a world-scale threat; the rule-followers fail | wide `crane`, then `heroLow` (low angle, FOV 60–70), `shake` on impacts | clue 3; deadline |
| B6 Low point | 1:25–1:35 | the hero alone; narration slows | static-drift close-up, 3–5 s hold allowed | face only |
| B7 Reversal | 1:35–1:50 | the defect solves it; biggest picture of the episode | `heroLow` → `orbit`; `flash` once | the largest visual change in the episode |
| B8 Second surprise | 1:50–2:05 | the truth about the rule | insert on the proof, then wide | the proof object |
| B9 Flip | 2:05–2:12 | first line again, flipped | same framing as frame 0, changed world | AFK cameo 2 |

Rules: sentences ≤ 12 words; ~5th-grade vocabulary; American English; no stretch > 4 s without new information; no first
person; family-safe (peril resolves, no on-screen harm, no weapons used on people, no romance).

**Titles:** 3–6 words + one emoji. Either a forbidden command or the rule itself. No hashtags in the title.
**Pinned comment:** one either/or question about the hero's choice.

## 4. Lanes and rotation

`E` Epic (world-scale, primal) · `M` Mechanic (rule as UI) · `L` Lore (eerie survival rule) · `Q` Quirky (custom material or scale).
Never two episodes of the same lane in a row. Never the same twist type twice within five episodes. After every five uploads,
`docs/season1/RESULTS.md` decides whether lane weights shift (§7).

## 5. Calendar: one episode per day, in card order

| Day | Work | Owner's part |
|---|---|---|
| 0 | Sessions 8 and 9 (A4 build). Scripts 01 and 02 already exist. | review the look, hair, troupe and captions; voice 01 |
| 1–30 | The daily loop below, cards 01 → 30 in order. | voice the next script; say approve, continue, or give notes |
| every 5th episode | Long compilation of the last five finals with chapters (assembled from existing masters, no re-render). | upload |

**Daily loop (`/season`, state kept in `docs/season1/STATE.md`):**
1. `animatic`: the voice for episode N is committed → align, world, cast, shots, gates, animatic. Stop.
2. Owner: "approve" or notes (one revision round).
3. `final`: 1440 final, QC, release, proxy, title and pinned comment. **In the same session, write the script and scene
   plan for episode N+1** (§5b), show the script in the report, and stop. The owner voices it for the next day.

A day slips only when a gate fails; nothing is skipped to keep the date, and the order never changes.
Time budget per episode: animatic session ≤ 1 session; final render + assemble ≤ 3 h wall. If that is exceeded two
episodes running, cut vegetation density and far-tier detail (never hero tier, never resolution) and record it.
Backlog after 30 (already outlined with the owner): the spy who narrates, the talking van, the piggy-bank parade, the red
string, doors to other yous, the paint-duel arena, one wish and you are forgotten, you may own one thing, kids are the bosses.

## 5b. How scripts 03–30 are written (by Claude Code, from the card; the owner approves before voicing)

Models: `stories/mountain/script.txt` and `stories/mirror/script.txt`. Match their rhythm and plainness.
- B1 uses the card's **Rule** sentence(s) word for word; the ending uses the card's **last line** word for word, after
  repeating the first sentence of the Rule.
- Everything on the card appears: the three expansion examples, the defect, the crisis, the reversal, the second surprise.
  Clues are shown, and at most one of the three is spoken. Nothing on the card is changed or "improved".
- 410–440 words. Sentences ≤ 12 words. Third person only: the narrator never says "I", "me", "my" or "we".
  One tense per script. ~5th-grade words. Characters' spoken lines: ≤ 6 words each, at most six per script, no quotation
  marks; first-person words may appear only inside those lines.
- One laugh inside B2, one inside B3–B4. A full stop of silence (a blank line) before the reversal line.
- No brand names, no real games' names, no on-screen harm, no romance.
- Then write `stories/<slug>/beats.md` in the same table form as the two models, using §3's beats and cameras.
- Run `python3 scripts/v2/scriptcheck.py --story <slug>` (A4 §I) and the §10 council scorecard (all ≥ 4, one revision
  pass). Print the final script in the session report inside one code block so the owner can copy it.

## 6. The 30 cards

Card fields: **Rule** (spoken in B1) · **Frame 0** · **Hero / defect** · **Expansion** (three examples) · **Crisis → reversal**
· **Second surprise / last line** · **Clues** (three) · **Money shot** (the frame people screenshot) · **World**.

### 01 · E · `mountain` · Don't Wake The Mountain ⛰️
- **Rule:** In this world, the mountains are sleeping giants. One rule: never wake them.
- **Frame 0:** drone over a green valley; the mountain's ridge is plainly a shoulder and a sleeping face; a tiny village below.
- **Hero / defect:** Bo, 11, the loudest kid alive; lives in a pillow-stuffed house at the valley's edge.
- **Expansion:** bells wrapped in wool · dogs in socks · a man who waves instead of a school bell.
- **Crisis → reversal:** the giant sleepwalks toward the village; whispering elders fail; Bo screams and wakes it; it steps back and sits.
- **Second surprise / last line:** the buried half of the stone sign reads "Unless it walks." / "…every night, one loud boy tells them goodnight."
- **Clues:** half-buried sign at the village gate (B1) · a lake shaped like a footprint (B2 wide) · the shadow reaching the bridge (B4).
- **Money shot:** one enormous eye opening in the clouds above a block-kid in the road. **World:** alpine valley, river, bridge, mill, school.
- Script: `stories/mountain/script.txt` · beats: `stories/mountain/beats.md`.

### 02 · M · `mirror` · Every Mirror Shows Tomorrow 🪞
- **Rule:** In this town, every mirror shows tomorrow. This morning, Max wasn't in his.
- **Frame 0:** close on Max facing his mirror; the reflection shows the room, a perfectly made bed, no Max.
- **Hero / defect:** Max, 12, a "later" kid who puts everything off.
- **Expansion:** see a bruise, wear a helmet · the whole town checks before school · Mrs. Park sees a trophy and enters the pie contest.
- **Crisis → reversal:** he lives one perfect last day (the list), gives his room to his sister, wakes up alive; the mirror showed *her* room.
- **Second surprise / last line:** hallway mirror: mud on his face and a team jersey. / "They just never tell you why."
- **Clues:** the made bed (he never makes it) · a stuffed rabbit on the reflected pillow (never mentioned) · Dad "saw it in the mirror" (mirrors show what, not why).
- **Money shot:** boy waving at a mirror that does not wave back. **World:** suburb house, school field, street. Mirrors = a mirrored duplicate room behind a frame, staged for "tomorrow".
- Script: `stories/mirror/script.txt` · beats: `stories/mirror/beats.md`.

### 03 · E · `digup` · Never Dig Up ⛏️
- **Rule:** In this world, everyone lives underground. One rule: never dig up.
- **Frame 0:** drone through a vast glowing cave city; crystals on the ceiling like stars; a girl flat against a wall, breathing hard.
- **Hero / defect:** Juno, 12, afraid of small spaces in a world made of tunnels.
- **Expansion:** the ceiling is painted blue and called "sky" · kites fly on fans · the "sun" is a lamp a man switches off at eight.
- **Crisis → reversal:** the lower caves flood, level by level; every tunnel leads down; Juno has secretly dug a breathing shaft upward for years and leads the town up it.
- **Second surprise / last line:** night, real stars, then the first sunrise; the rule was carved after an eruption a thousand years ago and the date was on the sign. / "One girl couldn't stand the walls."
- **Clues:** the dated sign · a root hanging through the ceiling · dirt under her fingernails.
- **Money shot:** hundreds of tiny block people on a hill facing their first sunrise. **World:** tiered cave city + surface meadow.

### 04 · L · `eight` · It Comes At Eight 🔔
- **Rule:** In this town, a monster comes every night at eight. It's always one of us.
- **Frame 0:** clock tower at 7:59; shutters slamming down a street; hero's face in a doorway.
- **Hero / defect:** Eli, 12, slowest runner, "always caught first", remembers nothing by morning.
- **Expansion:** five locks on every door · dinner at five · hiding drills at school.
- **Crisis → reversal:** he sets a camera to learn who it is; the footage shows the monster leaving *his* house with his untied shoelace.
- **Second surprise / last line:** it only comes when he is alone; a friend holds his hand at 7:59 and the bell rings on an empty street. / "It just didn't want to be alone."
- **Clues:** mud on his shoes each morning · neighbours never meet his eyes · the monster's untied lace.
- **Money shot:** two kids holding hands under a clock striking eight. **World:** the suburb at dusk, fog, single streetlights. "Caught" = frozen until morning, never harm.

### 05 · M · `price` · Everyone Has A Price 🏷️
- **Rule:** In this town, everyone has a price floating over their head.
- **Frame 0:** crowded street of glowing price tags; push in on one that reads $0.03.
- **Hero / defect:** Sam, 13, gives everything away; cheapest person in town.
- **Expansion:** babies start at one dollar · the mayor's tag has a bodyguard · a dog outranks Sam.
- **Crisis → reversal:** the richest man may outbid anyone "worth less" for their home; Sam notices two people reading different prices on the same dog: you see what someone is worth *to you*. He has only read his own tag in mirrors.
- **Second surprise / last line:** he asks the crowd what the rich man's tag says to them: zero. / "Nobody ever asked who was reading it."
- **Clues:** the dog argument · Sam's tag only ever shown in reflections · his sister never looks up at tags.
- **Money shot:** little sister's view of Sam: a tag that reads NOT FOR SALE. **World:** downtown market street.

### 06 · E · `gravity` · Gravity Turns Off At 9 🌙
- **Rule:** In this world, gravity turns off at nine. Be tied down, or float away.
- **Frame 0:** dusk town, every house chained to the ground, a bed drifting past a window with a kid asleep in it.
- **Hero / defect:** Tavi, 10, forgets everything, including his rope; floats off most nights and gets netted by Dad.
- **Expansion:** beds with seat belts · cats on leashes tied to mailboxes · the night patrol with butterfly nets.
- **Crisis → reversal:** a quake snaps the town's chains at midnight; every strapped-in sleeper drifts skyward; Tavi, the only one who knows how to move without gravity, swims the air and ties the town to the mountain.
- **Second surprise / last line:** from up there he sees why the rule exists: the chains hold the whole island down. / "Everyone else slept through it. He had practice."
- **Clues:** chains under the town run toward the mountain · his rope burns · water in a glass bulging upward at 8:59.
- **Money shot:** a whole town floating over the moon with one kid towing it. **World:** hill town, night sky.

### 07 · Q · `eraser` · The Eraser ✏️
- **Rule:** In this world, everything is black and white. Everyone is born with one color.
- **Frame 0:** a grey town with streaks of single colors; kids painting; one boy whose handprints leave blank white holes.
- **Hero / defect:** Pim, 11, born with no color; whatever he touches erases.
- **Expansion:** red kids paint apples and fire trucks · blue kids do "sky duty" at dawn · yellow kids are rare and work the sun.
- **Crisis → reversal:** an ink storm floods the town black; paint will not cover it; Pim erases it.
- **Second surprise / last line:** under the grey he rubs through to old colors; the world was painted over long ago. / "He was born with the one thing that fixes mistakes."
- **Clues:** a chip of color under flaking grey · his gloves · the blank handprint on his own door.
- **Money shot:** a boy wiping a black sky clean with his palm. **World:** hand-painted town; custom "paint" shader look for this episode only.

### 08 · E · `sunset` · The First Sunset 🌅
- **Rule:** In this world, someone has to carry the sun. Drop it, and the day ends.
- **Frame 0:** a figure hauling a blazing orb up giant sky stairs above the clouds.
- **Hero / defect:** Mira, 12, drops everything; banned from the Sky Stairs.
- **Expansion:** noon is when the Carrier reaches the top · the day shuts off like a switch at the end · kids practice with pumpkins.
- **Crisis → reversal:** the Carrier stumbles at noon; the sun rolls off the stairs toward the sea; Mira, who has spent her life catching what she drops, dives and catches it.
- **Second surprise / last line:** it is too heavy to carry back up, so she rolls it slowly along the horizon, and the sky turns colors nobody has seen. / "Before her, the day just switched off. She invented the sunset."
- **Clues:** her quick catches in B3 · the sun's scorch marks only on the stairs · a painting of a "pink sky" called impossible.
- **Money shot:** a girl rolling the sun along the sea, sky on fire. **World:** cloud stairs, coast town.

### 09 · M · `dice` · The Dice Above Your Head 🎲
- **Rule:** In this town, a dice rolls over your head every morning. It decides your day.
- **Frame 0:** bedroom, a glowing dice spinning above a just-woken girl; it lands on 1.
- **Hero / defect:** Nia, 12, has rolled a one for 400 days.
- **Expansion:** sixes get free ice cream · threes stay home · ones carry umbrellas indoors.
- **Crisis → reversal:** Snake-Eyes Day: the whole town rolls one at once and falls apart; Nia has 400 days of practice at everything going wrong and runs the town.
- **Second surprise / last line:** next morning her dice finally changes; she covers it and never looks. / "She stopped looking."
- **Clues:** her backpack of spare everything · she catches a falling cup without looking · the dice has pips worn off five faces.
- **Money shot:** one calm girl walking through a town of chaos. **World:** suburb + school.

### 10 · L · `zombies` · Midnight Turns Everyone Zombie 🧟
- **Rule:** In this town, midnight turns everyone zombie. Everyone except Ivy.
- **Frame 0:** clock strikes twelve; green hands on a window; a girl under her bed with a flashlight.
- **Hero / defect:** Ivy, 13, never fits in: wrong shoes, wrong laugh, and now she did not "turn".
- **Expansion:** green skin, arms up, groaning · even the dog · nobody mentions it at breakfast.
- **Crisis → reversal:** she fakes it with green paint and joins zombie night (card games, a bake sale); then it rains and the paint runs off *everyone*.
- **Second surprise / last line:** forty years ago one man faked it to skip work and nobody dared be the only human. / "Nobody ever checked."
- **Clues:** a zombie checking his watch · the dog in a green sweater · a paint can in the mayor's shed.
- **Money shot:** a whole town in the rain, half green, staring at each other. **World:** the suburb at night.

### 11 · E · `lightning` · Lightning Never Hits Me ⚡
- **Rule:** In this valley, lightning gives you a power. Everyone gets struck once.
- **Frame 0:** a storm field of kids on metal poles, arms out; bolts hit them and they light up with powers; one kid stays dark.
- **Hero / defect:** Kai, 12, has stood in forty storms; lightning bends around him.
- **Expansion:** Strike Day is a holiday · a baker with heat hands · a mailman who teleports to the wrong house.
- **Crisis → reversal:** the Great Storm hunts everyone who holds a charge; powers overload; Kai takes their hands in a chain and the lightning drains through him into the earth.
- **Second surprise / last line:** it never avoided him; he was the ground it was looking for. / "He was never unlucky. He was the ground."
- **Clues:** static never shocks him · grass grows greener where he stands · birds sit on him in storms.
- **Money shot:** a chain of glowing people ending in one calm kid with his palm on the earth. **World:** storm valley, pole field.

### 12 · M · `sentence` · One Sentence 🐶
- **Rule:** In this town, every pet can talk. Exactly one sentence, once, ever.
- **Frame 0:** a parrot, a cat and a goldfish each with a "1" badge; a girl nose-to-nose with an old silent dog.
- **Hero / defect:** Bea, 11, impatient; her dog Biscuit has never spoken.
- **Expansion:** a cat spent hers on "No." · a hamster said "I know what you did" · families throw Sentence Parties.
- **Crisis → reversal:** she tries everything to make him talk; she finds an old photo of a house fire and her parents' faces.
- **Second surprise / last line:** Biscuit used his sentence when she was a baby: "The baby's upstairs." / "Mine used his before I could talk."
- **Clues:** his scorched ear · the "1" badge on his collar is already crossed out · the burnt corner of the photo on the fridge.
- **Money shot:** girl hugging a very old dog, both badges visible. **World:** suburb house, park. No pet is harmed or dies.

### 13 · Q · `oneword` · One Word A Day 📝
- **Rule:** In this town, one person a day writes one word. And it comes true.
- **Frame 0:** town board, a kid chalks PIZZA, a house-sized pizza lands in the square.
- **Hero / defect:** Rio, 10, the worst speller in school.
- **Expansion:** RAIN on a hot day · PUPPIES (too many) · someone wrote NAP and the town slept till Tuesday.
- **Crisis → reversal:** Rio is picked, wants DESSERT, writes DESERT; then a bully writes MONSTER; Rio is picked to fix it, tries PEACE, writes PIECE, and the monster falls into pieces.
- **Second surprise / last line:** the town changes the rule so he writes every day; first word: FREND. A new kid appears: Frend. / "He still can't spell. Nobody wants him to."
- **Clues:** his spelling test (2/10) · sand in his shoe · the board's eraser is missing.
- **Money shot:** a town half buried in dunes with a pizza slice sticking out. **World:** town square, becomes desert.

### 14 · E · `clouds` · Don't Feed The Clouds ☁️
- **Rule:** In this world, clouds are animals. One rule: never feed them.
- **Frame 0:** shepherds herding small fluffy clouds across a hillside with crooks; a girl hiding one behind her back.
- **Hero / defect:** Lumi, 11, soft-hearted; feeds a runt cloud named Puddle in secret.
- **Expansion:** fed clouds grow into storms · cloud shearing day makes snow · strays get chased with fans.
- **Crisis → reversal:** a wildfire races at the village; the thin, starved herd cannot rain; Puddle, now enormous, puts it out.
- **Second surprise / last line:** the rule came from one flood long ago; the herd was never dangerous, only hungry. / "She fed one. It fed everybody."
- **Clues:** Puddle's growing shadow · wet footprints from the barn · cracked dry fields in every wide.
- **Money shot:** a mountain-sized cloud with a tiny happy face raining on a fire. **World:** high pasture, village, barn.

### 15 · M · `fivestars` · Five Stars ⭐
- **Rule:** In this city, break a rule and you get a star. Five stars, and everyone comes for you.
- **Frame 0:** city street; stars pop over a jaywalker's head; push to a kid with five gold stars and a horrified face.
- **Hero / defect:** Jax, 12, has never broken a rule in his life.
- **Expansion:** one star for running indoors · two for double-dipping · his little brother has had three since breakfast.
- **Crisis → reversal:** he wakes with five and runs; helicopters, cars, the whole city chase him through traffic (the season's chase sequence).
- **Second surprise / last line:** gold stars are not red stars: five years without one earns five gold; the "chase" was a parade trying to give him the key to the city. / "Five stars means everyone's coming for you. With cake."
- **Clues:** his stars are gold, everyone else's red · the helicopter drops confetti · balloons tied to a police bumper.
- **Money shot:** a kid cornered on a rooftop by a marching band. **World:** downtown grid, original cars (no real brands).

### 16 · L · `echo` · The Echo 🗣️
- **Rule:** In this valley, your echo comes back one day late. Never answer it.
- **Frame 0:** a boy on a cliff edge at dusk; a glowing ripple of sound returns across the valley.
- **Hero / defect:** Finn, 12, lonely; talks to his echo every evening like a friend.
- **Expansion:** people shout tomorrow's shopping list · a man's argument has lasted years · kids save jokes for later.
- **Crisis → reversal:** one night the echo says something he never said: "Don't walk to school tomorrow." He stays; a landslide takes the road.
- **Second surprise / last line:** it was never his echo; a lonely girl across the valley learned his voice to talk to him and could see the cliff cracking from her side. / "It wasn't an echo. It was an answer."
- **Clues:** the echo once laughed at the wrong time · a light on the far cliff every evening · the echo is slightly higher than his voice.
- **Money shot:** two kids on opposite cliffs waving. **World:** twin-cliff valley, rope bridge at the end.

### 17 · E · `spring` · The Boy Who Melted Winter 🌸
- **Rule:** In this world, there are three kingdoms: Winter, Summer and Fall. Never carry a season across the wall.
- **Frame 0:** drone over three walled lands side by side, white, gold and orange, split by straight walls.
- **Hero / defect:** Oskar, 11, a Winter kid with warm hands; every snowman he builds melts.
- **Expansion:** Summer kids have never seen ice · Fall sweeps leaves forever · a guard confiscates one snowflake.
- **Crisis → reversal:** Winter's wall cracks and the frost spreads across all three lands; Oskar's hands melt a path, and where the snow melts, flowers come up.
- **Second surprise / last line:** nobody had a word for it; the walls come down around a fourth season. / "There were three kingdoms. He was the fourth."
- **Clues:** green under his melted snowman · a bee following him · an old map with a torn fourth corner.
- **Money shot:** a line of flowers cutting through a frozen kingdom behind a walking boy. **World:** three biomes and walls.

### 18 · M · `egg` · Never Hold The Egg At Midnight 🥚
- **Rule:** In this town, you steal one egg a day. Just don't be holding one at midnight.
- **Frame 0:** kids sprinting between bases with glowing eggs; a huge bird-shaped shadow crosses the moon.
- **Hero / defect:** Kit, 11, too honest to steal; returns everything.
- **Expansion:** bases lock for sixty seconds · a scoreboard of eggs · at 11:59 everyone plays hot potato.
- **Crisis → reversal:** her brother was holding one at midnight and vanished; Kit steals for the first time, on purpose, and stands still at midnight.
- **Second surprise / last line:** the Mother takes her to a nest in the clouds where the "vanished" kids are raising hatchlings; nobody down there has ever seen an egg hatch because stolen eggs never do. / "Stealing an egg is the worst thing you can do. Unless you want a dragon."
- **Clues:** no creature anywhere in town, only eggs · a feather on her brother's pillow · eggs warm only when held still.
- **Money shot:** a cloud nest full of kids and baby dragons. **World:** base arena + cloud nest. Original creatures only.

### 19 · Q · `ragdoll` · Ragdoll Town 🪆
- **Rule:** In this town, nobody can stand up. Everyone is a ragdoll.
- **Frame 0:** a street of floppy people tumbling downhill, being launched by fans and catapults; one kid standing stiff.
- **Hero / defect:** Stan, 12, the only person who can stand; "too stiff", cannot relax.
- **Expansion:** the morning cannon fires people to work · stairs are slides · handshakes take three tries.
- **Crisis → reversal:** the whole town is slowly sliding downhill toward the cliff, and only something at the hilltop can stop it; only Stan can climb.
- **Second surprise / last line:** at the top is a giant settings panel: RAGDOLL: ON. He switches it off, everyone stands, then they vote to turn it back on for fun, and Stan flops for the first time. / "He taught them to stand. They taught him to fall."
- **Clues:** a cable running uphill · everyone's "falls" restart at the same spot · a glowing cog icon on the summit.
- **Money shot:** a block-kid at a giant floating toggle switch. **World:** steep hill town. Uses physics-style flop poses.

### 20 · E · `stars` · The Night The Stars Ran Out 🌠
- **Rule:** In this world, stars fall every Friday. Catch one, and you get a wish.
- **Frame 0:** a hillside at night, stars drifting down like snow, kids with nets.
- **Hero / defect:** Omar, 11, never spends anything; keeps 300 dull stars in jars under his bed.
- **Expansion:** small wishes only (new shoes, no homework) · a star goes dark once used · the sky has fewer every week.
- **Crisis → reversal:** the last Friday: the sky is nearly black and the town panics; Omar opens his jars and the stars float home and relight.
- **Second surprise / last line:** then everyone lets theirs go; wishes were loans. / "A wish isn't something you keep. It's something you send back."
- **Clues:** his jars glow faintly at the window side · used stars lean toward the sky · an old photo with a crowded sky.
- **Money shot:** a river of stars rising from one bedroom window. **World:** hill town at night.

### 21 · M · `headset` · Nobody Takes The Headset Off 🥽
- **Rule:** In this town, nobody takes the headset off. Ever.
- **Frame 0:** a neon dream-city; hard cut to a grey room of people in chairs wearing headsets.
- **Hero / defect:** Theo, 12, clumsy; breaks everything he owns.
- **Expansion:** school is a dragon ride · dinner tastes like anything you pick · nobody has seen their own shoes in years.
- **Crisis → reversal:** his headset cracks; the "real" town is grey and crumbling, so everyone begs him to put it back on; he trips on the main cable and the grey flickers too.
- **Second surprise / last line:** the grey world was a second layer built to send you back in; outside is a meadow at sunrise. / "They thought they already had."
- **Clues:** one stuck pixel in the grey sky · his hand passes through a grey cup · a real leaf on his real shoe.
- **Money shot:** a row of people lifting headsets in tall grass. **World:** neon city, grey town, meadow.

### 22 · L · `underbed` · The Monster Under The Bed 🛏️
- **Rule:** In this town, every kid gets a monster under the bed. It leaves when you turn thirteen.
- **Frame 0:** a friendly lumpy shape under a bed passing a sock up to a boy.
- **Hero / defect:** Leo, 12 and 364 days; still sleeps with a night-light.
- **Expansion:** monsters eat lost socks · they sign report cards · the rule: never say goodbye, it makes it worse.
- **Crisis → reversal:** on his birthday the space under the bed looks empty; he refuses to believe it and leaves a sock; it moves.
- **Second surprise / last line:** monsters never leave; people stop being able to see them. He leads his dad to his own bed, and the blanket tugs. / "That's what the grown-ups think."
- **Clues:** Dad's socks vanish too · a second night-light in the parents' room · a huge old claw mark on Dad's bed frame.
- **Money shot:** a father sitting on the floor by his bed, blanket pulled by nothing. **World:** house interiors.

### 23 · E · `forest` · Don't Blink At The Forest 🌲
- **Rule:** In this world, the forest takes one step closer every night. Someone must always be watching.
- **Frame 0:** a wall of dark pines right at the edge of a village; one tree visibly a step ahead of the line.
- **Hero / defect:** Nell, 11, cannot stay awake.
- **Expansion:** the Watch never blinks together · chalk marks measure the gap · children sleep facing the trees.
- **Crisis → reversal:** on her watch she sleeps; by dawn the forest surrounds the village; the town lights torches; Nell notices every tree leans the same way.
- **Second surprise / last line:** they were running from a sandstorm behind them and close around the village like a wall as it hits. / "They weren't coming for us. They were running."
- **Clues:** all branches point one way · sand in the pine needles · birds nesting on the village side only.
- **Money shot:** a ring of giant trees shielding a tiny village from a wall of sand. **World:** plain, village, walking forest.

### 24 · M · `race` · The Race Never Ends 🏁
- **Rule:** In this city, the race never stops. Last place disappears.
- **Frame 0:** night circuit, original supercars streaking past neon; a scoreboard with LAST PLACE flashing.
- **Hero / defect:** Nova, 13, fastest driver, terrified of slowing down.
- **Expansion:** pit stops at full speed · kids learn to drive before they walk · her mom "disappeared" in last place years ago.
- **Crisis → reversal:** her engine fails and she drops to last; the tow truck takes her off the loop.
- **Second surprise / last line:** there is no finish line; last place is the exit, and everyone who "disappeared" lives in a quiet town outside the track. / "The only way to win was to park."
- **Clues:** the lap counter has no total · the tow driver waves kindly · headlights on a hill outside the track.
- **Money shot:** one car parked at a picnic while the race roars past below. **World:** loop circuit + hill town. Cars are original designs.

### 25 · L · `alien` · Every Family Gets An Alien 👽
- **Rule:** In this town, every family hosts an alien. Never ask why they came.
- **Frame 0:** dinner table: mom, dad, kid and a polite three-eyed alien passing the peas.
- **Hero / defect:** Zoe, 10, asks "why" about everything.
- **Expansion:** hers mows the lawn at night · they all love taxes · at nine every alien goes outside and looks up.
- **Crisis → reversal:** she asks; hers flinches, and a hole opens in a shimmer nobody knew was overhead; something huge looks in.
- **Second surprise / last line:** they came to hold a shield over a world that did not know it needed one; the families join hands with them and it holds better. / "They never came to invade. They came to stand guard."
- **Clues:** a faint shimmer in every night sky · aliens stand in a perfect circle around town · burnt-out stars above them.
- **Money shot:** a whole town holding hands with aliens under a glowing dome. **World:** suburb at night.

### 26 · M · `wish` · The Wish Machine 🪙
- **Rule:** In this town, everyone gets one wish. One coin, one wish, one time.
- **Frame 0:** an old gumball machine glowing in a corner store; a line of kids; an old shopkeeper watching.
- **Hero / defect:** Lena, 12, cannot decide anything; has saved her wish for years.
- **Expansion:** Dad wished for a sandwich · a kid wished to be tall and cannot fit indoors · the shopkeeper never wishes: "owner's rule."
- **Crisis → reversal:** the town pressures her to wish for them; she studies the shopkeeper instead.
- **Second surprise / last line:** he is the genie; genies cannot wish. She spends hers: "I wish you had one." He wishes to close the shop and walk outside for the first time in three hundred years. / "He just needed someone to waste theirs on him."
- **Clues:** he is in every old town photo, same age · coins glow in his pocket · he never steps over the doorway.
- **Money shot:** an old man stepping onto a sunny sidewalk, closed sign swinging. **World:** corner store, street.

### 27 · Q · `table` · The Giant's Table 🍽️
- **Rule:** In this town, everyone is tiny. When the Fork comes, hide.
- **Frame 0:** a village of crumb-sized houses among salt shakers and a plate rim; a fork the size of a tower slams down.
- **Hero / defect:** Gus, 11, the tallest tiny person; cannot fit in any hiding spot.
- **Expansion:** a spoon is a lake · crumbs are farms · the napkin is the weather.
- **Crisis → reversal:** cleaning day: a sponge the size of a storm sweeps the table; Gus, the only one tall enough to be seen, climbs the pepper mill and waves.
- **Second surprise / last line:** the giant is a lonely kid; a dollhouse appears on the table the next morning. / "Everyone told him to hide. He was the only one tall enough to say hi."
- **Clues:** a giant crayon drawing on the far wall · tiny gifts left near the village · the Fork always misses.
- **Money shot:** a block-kid waving up at a child's enormous eye. **World:** tabletop; extreme tilt-ups.

### 28 · L · `door` · The Door At The End Of The Street 🚪
- **Rule:** In this town, everyone has a door. Your worst fear is behind it. So is your biggest wish.
- **Frame 0:** a long hallway building at the end of a street, hundreds of numbered doors; a girl holding a night-light.
- **Hero / defect:** Maya, 11, afraid of the dark; still carries a night-light.
- **Expansion:** most adults have never opened theirs · the mayor's door has cobwebs · kids dare each other to knock.
- **Crisis → reversal:** her mom goes in and does not come out; Maya follows into her own door: only darkness.
- **Second surprise / last line:** the dark is full of people who walked in years ago and stopped halfway; she leads them out with a night-light. / "The door doesn't grant the wish. Walking through does."
- **Clues:** shoes outside many doors · a faint knocking from inside · her mom's door has fresh fingerprints.
- **Money shot:** one tiny light leading a long line of people out of the dark. **World:** door hall, street.

### 29 · M · `levelone` · Level 1 🎮
- **Rule:** In this town, everyone has a level over their head. At 100, you leave.
- **Frame 0:** a street of floating level numbers, 40s and 80s; a teen with a plain "1".
- **Hero / defect:** Ash, 15, stuck on Level 1 no matter what he does.
- **Expansion:** XP for chores · Level 100s walk into a bright gate and wave · his little sister is already 12.
- **Crisis → reversal:** he finds a tin of nine notes in his own handwriting: "Don't level up. She needs you."
- **Second surprise / last line:** he has hit 100 nine times and reset himself each time, forgetting, to stay with her; she hands him a tenth note she wrote: "Go. I'm level 13 now." / "He was never stuck. He kept choosing."
- **Clues:** nine tiny stars beside his "1" · grandpa's tally marks · his handwriting on the tin.
- **Money shot:** a wall of nine notes and a kid holding the tenth. **World:** suburb + the gate.

### 30 · FINALE · `afk` · AFK 💤
- **Rule:** In this world, one player never logged off.
- **Frame 0:** an empty, half-loaded classic game world; one frozen figure at the spawn pad, tag `AFK`.
- **Hero / defect:** the hidden character from every episode; he waits.
- **Expansion:** he waters the plants daily · rebuilds the obstacle course each morning · keeps a leaderboard with two names.
- **Crisis → reversal:** a notice: this server closes at midnight; flashbacks show him standing in the background of every earlier world, looking for someone.
- **Second surprise / last line:** nine years ago his best friend typed "brb". At 11:59 a join message: the friend, grown, logging in to show their own kid the old game. / "One player never logged off. Somebody finally came back."
- **Clues:** two names on the board · a second, dusty spawn pad · a chat log with one line.
- **Money shot:** two avatars and a tiny third on the spawn pad as the sky loads in. **World:** classic baseplate world; reuse a shot from each of five earlier episodes.

## 7. Results loop (`docs/season1/RESULTS.md`, one row per upload, owner supplies the numbers)

Columns: episode · lane · title · posted · views at 48 h · stayed % · average % viewed · shares per 1,000 views · subscribers per
1,000 views · top country · the two biggest dips on the retention graph (timestamps).
After every fifth row: move the next slot's lane toward the lane with the best `stayed % × average % viewed`; write one
sentence on what the two best hooks share; apply it to the next three B1 stagings. Never change a posted episode.
