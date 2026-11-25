# EPISODE BRIEF: tuft ("Scaredy Beast"; RIGID CLASSIC R6: hero = cast/hero.json (faceStyle v6), troupe = cast/troupe-r6.json, acting v6 timing on authored R6 keys; moods on; world = the beast village built in phases 3/3B)

SPEC FLAGS (all opt-in, set on this episode): `format: 6`, `season: 1`, `acting: 6`, `rig: 'r6'`, `twos: true` (R6 humanoids only; beasts + FX on ones), `post: 'cine'`, `camera: 'cine'`, `grade: 'clear'`, night look `moonlit`, dusk = the festivalPlaza dusk LOOK.

## META
- slug: tuft
- title: You Get Your Beast's Power… Mine Was EMBARRASSING 😳 #shorts #roblox
- alt titles: You Get Your Beast's Power… But I'm SCARED of Everything 😰 #shorts #roblox · You Get Your Beast's Power… Mine Is a TINY Puffball 😭 #shorts #roblox
- pinned comment: What beast would you get, and what power would it give you? 👇 Did you find the loophole before me?
- comment question: What beast would you get, and what power would it give you?
- clear: close insert ecu medium
- crowd: at most 12 kids on screen in any shot, all full detail (owner cap from E4). "Every beast in the village" is sold by the BEAST PARADE (kit presets) and the LANTERN SEA, not by bodies
- length target: voice 102.35 s → end 103.20 s (voice + 0.85). Script 391 words. Voice: stories/tuft/voice.wav (owner's ElevenLabs take, never altered, D3)
- bloom: via `post: 'cine'` (selective, HDR > 1 only). Only glow seams, Tuft's quill tips, fire, lightning, eyes, windows and lanterns may bloom

## PREMISE
- feeling: being the scaredy kid
- rule line: "In this world, you get whatever power your *beast* has." (7 words after the comma)
- hero weakness: scared of everything; his beast Tuft (muffin-sized puffball) only "puffs up when scared", and so does he
- loved one: Juni · LITTLE (little sister, believes in Tuft)
- loophole: "*whatever* power": Tuft's puff grows with how scared you are, and beasts run from anything bigger. The most scared kid alive holds the biggest power alive. Side loophole: the rule says "*your* beast", so Vance gets nothing from the stolen Titan
- clue plants: ≈24.2–26.4 (Nightfang backs away from beach-ball me, through the classroom window) · ≈48.9–51.0 (every beast on our street flees my room-sized puff: wider)
- payoff promise (cold-audience loop): ≈14.6–17.6 "But by tomorrow night, a *Titan* will run from us." Closes at ≈92.9
- twist line: "The rule said *whatever* power." (realisation) → "He needed the *most scared* one."
- last line: "Just in case." (≠ first line; lands the last laugh). The final frame is Tuft's glow starting to fill the frame, so the auto-replay joins frame 0 (the giant glowing eye) seamlessly

## CAST
- HERO (fixed, `cast/hero.json`, rigid R6): outfit unchanged. Tuft rides in his jacket HOOD (the script's "hoodie" = his hood)
- juni → LITTLE · costume JUNI (NEW): lavender raincoat-hoodie, mint leggings, two low buns; her beast BLINK = a firefly (glow sprite + 2 wing cards) that orbits her head
- vance → RIVAL · costume VANCE (NEW): midnight-navy jacket with cyan piping, white tee, swept quiff; palms glow cyan when he uses fire
- kira → SECOND · costume KIRA (NEW): yellow-and-grey track jacket, high ponytail; never named in VO ("this girl")
- rocco → LEAD · costume ROCCO (NEW): orange flight vest, goggles accessory; never named in VO ("this kid")
- dad → ELDER · costume DAD_V (NEW): rolled-sleeve olive shirt, brown beard block
- teacher → ADULT_F · costume TEACHER (NEW): teal cardigan, glasses (modest Roblox hourglass per owner rule)
- crowd: up to 12 DUMMY · costume STUDENT (reuse E4 `studentLook(seed)`, NO hand symbols)
- beasts (Beast Kit, built in phases 2A/2B/3B; cast `style: 'beast'`, `preset`, `tier`):
  - tuft → TUFT (hero's): palm-sized moon-white puffball, big glossy eyes, quills tipped blue-gold. States: idle, tremble, sneeze, hide, run, puff (ball | room | colossal | deflate)
  - nightfang → NIGHTFANG (Vance's dragon): obsidian-navy facets, CYAN glow seams, bone horns/claws, purple-glow mouth, cyan fire breath
  - volt → VOLT (Kira's storm wolf): silver-white facets, ELECTRIC-YELLOW seams, lightning trail
  - cinder → CINDER (Rocco's sky hawk): charcoal facets, ORANGE flame edges on the wings
  - boulder → BOULDER (Dad's stone ox): granite facets, AMBER crack seams, mossy back
  - titan → TITAN (caged, from the mountain): the heavy rig at ×12, stone + moss facets, MOLTEN-ORANGE seams, two great curled horns, chains on legs
  - parade → FOX, DEER, BOAR (Beast Kit seeded background presets, low tier) for the festival and the flee shot

## WORLD
- setting: a hillside BEAST VILLAGE (our own design): timber-frame houses, slate-blue roofs, mossy stone walls, lantern strings, a school with tall windows; the TITAN'S MOUNTAIN with a dark cave mouth looms over every exterior (landmark; story plant)
- build rule (PIPELINE.md): build only what the camera sees. Hero zones at full detail; midground = instanced modular HOUSE KIT placed by seed (4 wall × 3 roof × 3 door variants); background = dragonPeaks terrain + silhouette cards + height fog. At night, ~300 instanced lit windows + the LANTERN SEA carry the detail
- locations (NEW, register in the set library):
  - beastYard (school yard, kids in a line with their beasts; mountain in the back)
  - beastClass (classroom, tall windows looking onto the yard; Nightfang visible outside a window)
  - homeDining (warm timber dining room, long table, 3 chairs, a hatch window; Boulder fits through the big barn-door side)
  - homeBedroom (small attic room, round window, bed with space under it)
  - villageStreet (night, cobbles, our house exterior with the attic round window, neighbours' beasts in yards)
  - festivalPlaza (dusk → night; lantern strings, stage with the giant CAGE, rooftops ringing the plaza, the mountain behind)
  - titanCave (insert only: cave mouth on the mountain; two eyes ignite)
- props (NEW): spider (tiny, on a thread) · toaster · spaghettiPlates · dinnerTable (reuse E4 prop, re-materialed timber) · giantCage (iron bars + cloth) · chains (big links, snap state) · lanternSea (≈1,500 instanced paper lanterns, ONE draw, gentle bob) · houseKit (modular, seeded)
- palette: warm timber, slate blue, moss green, lantern amber. Each beast owns ONE glow colour (cyan · yellow · orange · amber · molten · Tuft blue-gold). Nothing else in the world uses Tuft's blue-gold
- COLOUR SCRIPT: hook (0–2.2) night, blue-gold glow over dark roofs · act 1 (2.2–43) bright late-morning day, saturated · act 2 (43–70) storm-blue night → festival dusk amber · act 3 (70–94) dark storm + the Titan's molten orange; twist (81) Tuft's blue-gold floods the frame; colossal (89) brightest blue-gold of the act · payoff (96.7) warm lantern gold + Tuft glow, the brightest key of the episode

## BEAST KIT LOOK (built; every beast obeys)
- Faceted low-poly bodies, flat-shaded, NO textures: colour lives in vertex colours
- Chunky proportions: big head, thick forelimbs, crouched predator stance for hunters; heavy and low for oxen
- Glow seams = faces in the same mesh painted with an emissive mask (HDR > 1) along wing edges, spine ridges and leg stripes; with bloom on, ONLY these glow
- Bone-white horns and claws; glowing eyes; mouth interior glows in the seam colour
- Our own silhouettes (inspired by the style of popular Roblox beast thumbnails, never a traced design)

## PUFF SYSTEM (built in 2B)
- `puff: <tuft|hero> <ball|room|colossal|deflate> @ <word>`
  - tuft: quills extend radially and the body swells (uniform scale), quill tips brighten with size
  - hero: torso + head swell toward a sphere (uniform), limbs stay normal size and stick out (comedy); ball = 3× body, room = fills homeBedroom (legs out the window), colossal = taller than the roofs (≈ the Titan's height ×1.2), riding beside colossal Tuft
  - deflate: 0.6 s shrink with 3 wobble overshoots, a squeak (sfx `squeak`), a little air-puff particle
- Colossal Tuft: quills glow blue-gold, wind ripples through the fluff, lantern light catches the tips (bloom)

## NEW STORY VOCAB (opt-in; add to `engine/story6.js` + `brief2spec.js` with tests; `@ word` as existing markers)
- `beast: <actor> <state> [to <anchor>] @ <word>`: Beast Kit states (idle, walk, run, roar, breathe, flinch, flee, lower, lift, fly, perch, sleep, curl). `flee` runs/flies off frame along the shot's exit direction
- `power: <actor> <cyanFire|lightning|fly> @ <word>`: inherited powers (cyanFire from the palms; lightning = sprint + yellow ribbon trail; fly = lift-off on an orange flame ribbon)
- `puff:` (above) · `cage: reveal @ <word>` (cloth whips off) · `chains: snap @ <word>` · `glow: tuft <0–1> @ <word>` (quill glow level) · `fizzle: <actor> @ <word>` (palms spit one grey smoke puff)

## BEATS
Cue times are ESTIMATES from the voice's pauses (voice 102.35 s). The VO words are authoritative: after v2:align, set every row's start to the onset of its first word in cues.json and its end to the next row's start. Never change the VO words. Cameras (`cam:`) are set by Claude Code after the world is built, honouring size / move / subject / notes.

| # | cue start–end (s) | VO words | mood | size | move | subject | action verb | expression + word it lands on | effect | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.00–1.10 | In this world, you get | tension | ecu | push | tuft | - | - | none | loc: festivalPlaza; look: night; puff: tuft colossal (already); glow: tuft 1; loopOpen: giant; HOOK frame 0: extreme close on a GIANT glowing eye opening, moon-white quills unfurl with blue-gold tips. Opening jolt (owner rule: quick subtle shake on the first frames only). Viewer must NOT be able to tell it is small Tuft |
| 2 | 1.10–2.19 | whatever power your *beast* has. | tension | wide | lowAuthority | tuft | - | - | impact | crowd: dummies 8 run; Pull-back-free reveal from low: the colossal glowing beast towers over the dark roofs, lanterns drift past, villagers run below. A huge horned silhouette in the foreground recoils (the Titan, unlit). Reads as "a monster attack" |
| 3 | 2.19–3.40 | Vance's dragon breathes *cyan fire*, | fun | wide | gamecam | nightfang | - | - | impact | loc: beastYard; look: day; beast: nightfang roar @ dragon; beast: nightfang breathe @ cyan; Hard cut to day. Nightfang rears and breathes a cyan fire column into the sky; the line of kids flinches. HERO visible at the far end of the line |
| 4 | 3.40–4.87 | so now Vance can too. | fun | medium | snap | vance | open_palms @ too | smirk @ Vance | impact | power: vance cyanFire @ too; see: hero; Vance pushes both palms forward: cyan fire jets out. The hero stands next in line, eyes wide |
| 5 | 4.87–6.10 | A storm wolf makes this girl | fun | wide | track | volt | - | - | none | beast: volt run @ storm; Volt sprints across the yard, yellow lightning crackling along its seams |
| 6 | 6.10–7.18 | faster than *lightning*. | fun | medium | whip | kira | sprint @ lightning | grin @ lightning | impact | power: kira lightning @ lightning; blur; Kira blurs past the lens leaving a yellow lightning ribbon |
| 7 | 7.18–8.98 | A sky hawk lets this kid *fly*. | fun | wide | track | cinder | jump @ fly | rocco:grin @ fly | impact | beast: cinder fly @ hawk; power: rocco fly @ fly; Cinder swoops low with flame-edged wings; Rocco lifts off on an orange flame trail |
| 8 | 8.98–10.57 | Then the teacher points at me. | comedy | medium | whip | teacher | point @ me | smile @ teacher | none | Every kid and every beast turns to look at the hero |
| 9 | 10.57–12.82 | My beast, Tuft, is the size of a *muffin*. | comedy | close | crashZoom | hero | open_palms @ Tuft | nervous_laugh @ muffin | crash | punch @ muffin; Tuft sits in his cupped hands, tiny; on *muffin* it sneezes one sparkle. FIRST LAUGH |
| 10 | 12.82–14.60 | He's scared of everything. So am I. | comedy | close | snap | hero+tuft | flinch @ I | terrified @ I | none | A leaf drifts down: Tuft's quills flatten and the hero flinches at the exact same moment |
| 11 | 14.60–15.90 | But by tomorrow night, | tension | medium | push | hero | - | neutral @ night | none | loopOpen: titan; The hero glances out past the yard to the mountain |
| 12 | 15.90–17.57 | a *Titan* will run from us. | tension | wide | push | prop:titanCave | - | - | impact | loc: titanCave; look: night; punch @ Titan; FLASH-FORWARD: the dark cave mouth; two molten eyes ignite on *Titan* |
| 13 | 17.57–19.19 | A spider drops onto my desk. | comedy | insert | snap | prop:spider | - | - | none | loc: beastClass; A tiny spider lowers on a thread right in front of the hero's nose |
| 14 | 19.19–20.11 | Tuft puffs up. | comedy | close | crashZoom | tuft | - | - | crash | puff: tuft ball @ puffs; Tuft balloons into a spiky ball on the desk |
| 15 | 20.11–21.23 | And so do *I*. | comedy | medium | snap | hero | - | shock @ I | impact | gag 1; puff: hero ball @ I; The hero inflates into a ball, arms and legs sticking out |
| 16 | 21.23–22.40 | I bounce off the ceiling | comedy | wide | whip | hero | - | panic @ bounce | impact | blur; He boings off the ceiling |
| 17 | 22.40–24.17 | like a beach ball. Everyone laughs. | comedy | wide | static-drift | hero | - | panic @ beach | none | crowd: dummies 10 idle; He bounces across desks while the class (10 kids) laughs and points |
| 18 | 24.17–26.38 | But nobody sees Vance's dragon back away from me. | tension | medium | push | nightfang | - | - | none | beast: nightfang flinch @ back; CLUE 1 (not emphasised): through the window, Nightfang sees the ball-hero and backs away, ears flat. Nobody in the room looks |
| 19 | 26.38–28.23 | Vance says, "Enjoy your *balloon* power." | comedy | close | snap | vance | arms_cross | smirk @ balloon | none | puff: hero deflate; Behind Vance the hero shrinks back to normal |
| 20 | 28.23–30.47 | "At the festival, I'm getting the strongest beast alive." | tension | medium | push | vance | - | scheme @ strongest | none | loopOpen: strongest; Vance looks past the window at the mountain |
| 21 | 30.47–32.76 | At dinner, my little sister Juni feeds Tuft blueberries. | fun | medium | orbit | juni+tuft | reach_for @ blueberries | warm @ Juni | none | loc: homeDining; look: day; Juni named + on screen ≈30.5. Blink the firefly circles her head |
| 22 | 32.76–34.80 | Dad's stone ox lifts our table for fun. | fun | wide | gamecam | boulder | dad:cheer @ fun | dad:laugh @ fun | none | beast: boulder lift @ lifts; Boulder raises the whole table on its horns; Dad laughs. BEAST SHOWCASE |
| 23 | 34.80–35.68 | Then the toaster pops. | comedy | insert | snap | prop:toaster | - | - | impact | Toast launches |
| 24 | 35.68–36.42 | I puff. | comedy | close | crashZoom | hero | - | shock @ puff | crash | puff: hero ball @ puff |
| 25 | 36.42–37.32 | The table *flies*. | comedy | wide | whip | prop:dinnerTable | - | - | impact | gag 2; blur; The ball-hero bumps the table: it flips off Boulder's horns, spaghetti everywhere |
| 26 | 37.32–39.08 | Dad's ox is now wearing spaghetti. | comedy | medium | static-drift | boulder | - | - | none | puff: hero deflate; Spaghetti draped over Boulder's horns; it blinks slowly |
| 27 | 39.08–41.15 | Juni whispers, "Tuft picked you for a reason." | emotion | close | push | juni | - | warm @ reason | none | loopOpen: reason; Juni holds Tuft up to the hero's face |
| 28 | 41.15–43.35 | I wish he picked a braver kid. | emotion | close | static-drift | hero | - | sad_soft @ braver | none | He looks away; Tuft's quills droop |
| 29 | 43.35–45.19 | That night, thunder cracks over the village. | tension | wide | tiltUp | hero | - | - | impact | loc: villageStreet; look: storm; lightning; Tilt up the night street to our house's attic window; lightning |
| 30 | 45.19–47.42 | I puff so big I fill my whole room. | comedy | wide | crashZoom | hero | - | terrified @ fill | crash | gag 3; loc: homeBedroom; puff: hero room @ puff; puff: tuft ball @ puff; He fills the whole attic, squashed against the rafters |
| 31 | 47.42–48.94 | My legs stick out the *window*. | comedy | wide | snap | hero | - | - | impact | loc: villageStreet; Exterior: two legs kick out of the round attic window; roof tiles pop off |
| 32 | 48.94–50.96 | And every beast on our street runs away. | tension | wide | push | prop:villageStreet | - | - | none | beast: fox flee @ every; beast: deer flee @ beast; beast: boar flee @ runs; CLUE 2 (wider): wide street, every neighbour's beast bolts away from our house |
| 33 | 50.96–53.55 | I tell Tuft I wish he was a dragon. | emotion | close | push | hero+tuft | - | sad_soft @ dragon | none | loc: homeBedroom; look: dawn; Tuft's quills flatten as he hears it |
| 34 | 53.55–55.36 | He hides under my bed all day. | emotion | medium | static-drift | tuft | - | - | none | Two tiny glowing eyes under the bed; window light sweeps across the floor (time passing) |
| 35 | 55.36–56.68 | Then comes the Beast Festival. | fun | wide | track | prop:lanternSea | - | - | none | loc: festivalPlaza; look: festivalDusk; loopOpen: festival; Lanterns rise over the plaza |
| 36 | 56.68–58.69 | Lanterns, music, and every beast in the village. | awe | wide | drone | prop:lanternSea | - | - | none | beast: nightfang fly; beast: volt run; beast: cinder fly; beast: boulder walk; BEAST PARADE: every glowing beast circles the plaza under the lantern sea. Tuft peeks out of the hero's hood |
| 37 | 58.69–60.69 | Vance pulls a cloth off a giant cage. | tension | medium | lowAuthority | vance | tug_pull @ cloth | smirk @ cloth | none | cage: reveal @ cloth; loopOpen: cage |
| 38 | 60.69–62.51 | Inside is the *Titan* from the mountain. | awe | wide | crane | titan | - | - | impact | beast: titan perch; punch @ Titan; loopClose: strongest; Crane up the chained Titan, ×12 scale, molten seams glowing |
| 39 | 62.51–64.23 | "Its power is mine now," he says. | tension | close | push | vance | open_palms @ mine | scheme @ mine | none | He raises his palms toward the Titan |
| 40 | 64.23–65.82 | But the rule says *your* beast. | tension | close | push | titan | - | - | none | punch @ your; ECU of the Titan's eye: it does not look at Vance |
| 41 | 65.82–67.59 | And the Titan was never his. | tension | medium | static-drift | vance+titan | - | nervous_laugh @ never | none | No glow link forms between them |
| 42 | 67.59–69.84 | Vance gets nothing. And the Titan gets *angry*. | tension | medium | push | vance+titan | - | shock @ angry | impact | fizzle: vance @ nothing; beast: titan roar @ angry; Vance's palms spit one smoke puff; behind him the Titan's seams flare molten |
| 43 | 69.84–70.50 | The chains snap. | tension | insert | static-drift | prop:chains | - | - | impact | chains: snap @ snap; loopClose: cage; look: storm |
| 44 | 70.50–72.24 | Every brave beast in the village runs. | tension | wide | push | nightfang | - | - | none | beast: volt flee @ brave; beast: cinder flee @ village; beast: boulder flee @ runs; Beasts stream past the lens in every direction |
| 45 | 72.24–73.10 | Even the *dragon*. | comedy | insert | crashZoom | nightfang | - | - | crash | beast: nightfang flee @ dragon; Nightfang yelps and flies off, Vance clinging to its tail |
| 46 | 73.10–75.12 | And Juni is frozen in its path. | tension | wide | lowAuthority | juni | - | terrified @ frozen | none | loopOpen: juni; beast: titan walk; The Titan's huge foot lifts over tiny Juni |
| 47 | 75.12–77.32 | Tuft jumps from my hoodie and runs to her. | emotion | medium | push | tuft | - | - | none | beast: tuft run to juni; Tuft leaps from the hood and plants himself in front of Juni, trembling |
| 48 | 77.32–78.66 | So I run after him. | tension | medium | track | hero | sprint | terrified @ run | none | blur |
| 49 | 78.66–81.13 | I have never been this scared in my whole life. | emotion | close | static-drift | hero | - | terrified @ scared | none | THE BREATH: he stands over Juni and Tuft, shaking; grade 5 % darker, vignette +0.15. Hold ≥ 1.5 s |
| 50 | 81.13–82.43 | The rule said *whatever* power. | tension | ecu | push | hero | - | determined @ whatever | none | twist; glow: tuft 0.6 @ whatever; look: tuftGlow; TWIST. Biggest visual change: storm-dark snaps to blue-gold as Tuft's quills ignite beside his face |
| 51 | 82.43–84.66 | And Tuft's power grows with how scared you are. | tension | insert | push | tuft | - | - | none | puff: tuft ball @ grows; glow: tuft 0.8 @ scared; Tuft swells, quills lengthening |
| 52 | 84.66–86.18 | Tuft never needed a brave kid. | emotion | close | push | hero+tuft | - | awe @ brave | none | They look at each other |
| 53 | 86.18–88.22 | He needed the *most scared* one. | emotion | close | push | hero | - | determined @ scared | none | loopClose: reason |
| 54 | 88.22–89.10 | We puff. And puff. | tension | wide | lowAuthority | hero+tuft | - | - | impact | puff: hero colossal @ We; puff: tuft colossal @ And; They balloon past the camera |
| 55 | 89.10–91.34 | Past the roofs, past the lanterns, past the *Titan*. | awe | wide | crane | tuft | - | - | impact | glow: tuft 1 @ Titan; loopClose: giant; Crane up with them past the roofs and lanterns to above the Titan: SAME framing family as shot 2, now lit and understood |
| 56 | 91.34–92.90 | The Titan looks up at us. | tension | close | lowAuthority | titan | - | - | none | Its molten eyes shrink to pinpoints |
| 57 | 92.90–94.68 | Then it runs all the way home. | fun | wide | track | titan | - | - | none | beast: titan flee to titanCave @ runs; loopClose: titan; The Titan bolts up the mountain into its cave. Nobody hurt |
| 58 | 94.68–96.70 | We deflate with the loudest *squeak* in history. | comedy | medium | whip | hero+tuft | - | embarrassed @ squeak | impact | puff: hero deflate @ squeak; puff: tuft deflate @ squeak; blur; They zip around the plaza like let-go balloons |
| 59 | 96.70–99.58 | Juni hugs Tuft, then me. Vance's dragon sleeps behind my house now. | payoff | medium | push | juni+hero | comfort_kneel @ hugs | warm @ me | none | payoff; loopClose: juni; light: ev 0.75 rim 1.6 rimK 900; PAYOFF: Juni hugs Tuft then the hero under the lanterns (brightest frame, hold ≥ 1.5 s). On *dragon*: the push settles to reveal Nightfang curled asleep behind our house (callback to "I wish he was a dragon") |
| 60 | 99.58–101.55 | And Juni says *boo* to me every night. | comedy | close | snap | juni+hero | - | juni:grin @ boo; hero:panic @ boo | impact | loc: homeBedroom; look: night; Juni pops up at the bedside: "boo"; the hero flinches |
| 61 | 101.55–103.20 | Just in case. | comedy | close | static-drift | hero+tuft | - | embarrassed @ case | none | glow: tuft 1 @ case; puff: tuft ball @ case; Two-shot close: the hero sheepish; Tuft starts to puff and his blue-gold glow swells to fill the frame by the last frame → seamless loop into shot 1's glowing eye. Ends at voice + 0.85 s (never a wide, never a pull) |

## PAYOFF SHOT
- shows: shot 59. Juni hugs Tuft, then the hero, under the lantern sea; the push settles on Nightfang asleep behind our house
- hold length: from "hugs" to the next cut (≥ 1.5 s)
- light: brightest key of the episode (payoffEV), warm lantern gold + Tuft's blue-gold rim; the hero's jacket stays within ΔE 12 of its charcoal

## R6 STAGING NOTES (from the engine phases; brief2spec and the plan must respect these)
- Rigid R6 has no elbows or knees: comfort_kneel = the classic two-knee kneel; hugs turn both actors to face each other and step in; carry = piggyback. Stage hugs and comforts in profile or ¾, never straight-on.
- Colossal shots (1, 2, 59–61 area): the roofs must be in frame below colossal Tuft, or the scale does not read. Tuft's eyes stay clear of lanterns.
- The room puff establishing view is from OUTSIDE the round attic window (ball + legs out the window); the inside angle is the close.
- Titan in titanCave lights itself (cracks + eyes); no moon rim on it.
- Beasts and FX run on ones; R6 kids on twos. Camera 'cine' follows a beast's live root on beast shots.
- No locked high-angle wide held over 1.0 s unless the row says `angle: high`.

## CHECKS
- [ ] hero on screen by 0:05 (visible in shot 3 at ≈2.2 s; `see: hero` in shot 4)
- [ ] the strongest beasts lead: no Tuft-as-small before shot 9 (≈10.6 s)
- [ ] loved one named and on screen by 0:40 (Juni ≈30.5 s)
- [ ] clue shown twice (Nightfang backs away ≈24.2 · whole street flees ≈48.9, wider)
- [ ] payoff promise (shot 12) closes on screen (shot 57)
- [ ] final shot not wide; final frame glow matches frame 0 (loop)
- [ ] last line ≠ first line
- [ ] family-safe: nobody hurt; the Titan is scared home, never fought; no blood, no weapons
- [ ] only beast seams, Tuft, fire, lightning and lanterns bloom
