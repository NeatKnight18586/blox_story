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
- juni → LITTLE · costume JUNI (NEW): lavender raincoat-hoodie, mint leggings, two low buns
- vance → RIVAL · costume VANCE (NEW): midnight-navy jacket with cyan piping, white tee, swept quiff
- kira → SECOND · costume KIRA (NEW): yellow-and-grey track jacket, high ponytail; never named in VO
- rocco → LEAD · costume ROCCO (NEW): orange flight vest, goggles accessory; never named in VO
- dad → ELDER · costume DAD_V (NEW): rolled-sleeve olive shirt
- teacher → ADULT_F · costume TEACHER (NEW): teal cardigan (modest Roblox hourglass per owner rule)
- crowd → DUMMY · costume STUDENT (E4 `studentLook(seed)`, NO hand symbols), up to 12 on screen
- tuft: beast TUFT
- blink: beast BLINK
- nightfang: beast NIGHTFANG
- volt: beast VOLT
- cinder: beast CINDER
- boulder: beast BOULDER
- titan: beast TITAN
- fox: beast FOX low
- deer: beast DEER low
- boar: beast BOAR low

## WORLD
- world module: parts/village/world.js
- locations: beastYard, beastClass, homeDining, homeBedroom, villageStreet, festivalPlaza, titanCave
- setting: a hillside BEAST VILLAGE (our own design): timber-frame houses, slate-blue roofs, mossy stone walls, lantern strings, a school with tall windows; the TITAN'S MOUNTAIN with a dark cave mouth looms over every exterior (landmark; story plant)
- build rule (PIPELINE.md): build only what the camera sees. Hero zones at full detail; midground = instanced modular HOUSE KIT placed by seed (4 wall × 3 roof × 3 door variants); background = dragonPeaks terrain + silhouette cards + height fog. At night, ~300 instanced lit windows + the LANTERN SEA carry the detail
- locations (built in phase 3):
  - beastYard (school yard, kids in a line with their beasts; mountain in the back)
  - beastClass (classroom, tall windows looking onto the yard; Nightfang visible outside a window)
  - homeDining (warm timber dining room, long table, 3 chairs, a hatch window; Boulder fits through the big barn-door side)
  - homeBedroom (small attic room, round window, bed with space under it)
  - villageStreet (night, cobbles, our house exterior with the attic round window, neighbours' beasts in yards)
  - festivalPlaza (dusk → night; lantern strings, stage with the giant CAGE, rooftops ringing the plaza, the mountain behind)
  - titanCave (insert only: cave mouth on the mountain; two eyes ignite)
- props (built in phases 2B/3, spec props2b): spider (tiny, on a thread) · toaster · spaghettiPlates · dinnerTable (reuse E4 prop, re-materialed timber) · giantCage (iron bars + cloth) · chains (big links, snap state) · lanternSea (≈1,500 instanced paper lanterns, ONE draw, gentle bob) · houseKit (modular, seeded)
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
| 1 | 0.00–1.12 | In this world, you get | tension | ecu | push | tuft | - | - | none | loc: festivalPlaza; look: night; puff: tuft colossal @ In; glow: tuft 1; loopOpen: giant; place: tuft 0 -58 yaw 0; place: hero -6 28 yaw 0; place: juni 60 34 yaw 0; place: vance -12 32 yaw 0; place: kira 5 30 yaw 0; place: rocco 10 28 yaw 0; place: dad 62 34 yaw 0; place: teacher -16 30 yaw 0; place: crowd 16 -6 yaw 0; cam: -5.8 26.5 -12 at -5.8 26.5 -40; fov: 34; HOOK frame 0: extreme close on a GIANT glowing eye opening, moon-white quills unfurl with blue-gold tips. Opening jolt (owner rule: quick subtle shake on the first frames only). Viewer must NOT be able to tell it is small Tuft |
| 2 | 1.12–2.92 | whatever power your *beast* has. | tension | wide | lowAuthority | tuft | - | - | impact | crowd: dummies 10 run to stage; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; crowdArea: 14 24 -6 2; cam: 0 3 46 at 0 26 -52; fov: 62; crowdArea: 14 24 -6 2; Pull-back-free reveal from low: the colossal glowing beast towers over the dark roofs, lanterns drift past, villagers run below. A huge horned silhouette in the foreground recoils (the Titan, unlit). Reads as "a monster attack" |
| 3 | 2.92–4.85 | Vance's dragon breathes *cyan* fire, | fun | wide | gamecam | nightfang | - | - | impact | loc: beastYard; look: day; beast: nightfang roar @ dragon; beast: nightfang breathe @ cyan; place: nightfang 3 -10 yaw 0; place: hero -6 -4 yaw 0; place: vance 0 -4 yaw 0; place: kira 5.5 -4 yaw 0; place: rocco 10 -4 yaw 0; place: teacher -12 -1 yaw 20; place: juni 50 34 yaw 0; place: dad 52 34 yaw 0; place: volt -20 2 yaw 90; place: cinder 16 1 yaw 0; place: boulder 46 24 yaw 0; place: tuft -5 -3.4 yaw 0; cam: 4 1.6 6 at -1 6 -14; fov: 50; Hard cut to day. Nightfang rears and breathes a cyan fire column into the sky; the line of kids flinches. HERO visible at the far end of the line |
| 4 | 4.85–6.12 | so now Vance can too. | fun | medium | snap | vance | push @ too | smirk @ Vance | impact | power: vance cyanFire @ too; see: hero; place: hero -3.2 -3.4 yaw 0; place: vance 0.4 -4 yaw 0; cam: 1.5 4 0.5 at -1 3.8 -8; fov: 48; Vance pushes both palms forward: cyan fire jets out. The hero stands next in line, eyes wide |
| 5 | 6.12–7.24 | A storm wolf makes this girl | fun | wide | track | volt | - | - | none | beast: volt run @ storm; place: volt -22 2 yaw 90; cam: -12 1.6 5 at -10 2 -2; fov: 50; Volt sprints across the yard, yellow lightning crackling along its seams |
| 6 | 7.24–8.35 | faster than *lightning*. | fun | medium | whip | kira | - | grin @ lightning | impact | power: kira lightning @ lightning; cycle: sprint 1 0; blur; place: kira -8 3 yaw 90; cam: -1 3.4 3 at -6 3.4 -1; fov: 36; Kira blurs past the lens leaving a yellow lightning ribbon |
| 7 | 8.35–10.23 | A sky hawk lets this kid *fly*. | fun | wide | track | cinder | rocco:jump @ fly | - | impact | beast: cinder fly @ hawk; power: rocco fly @ fly; place: cinder 4 4 yaw 0; place: rocco -2 -1 yaw 0; cam: -3 2.2 10 at 3 6 -6; fov: 52; Cinder swoops low with flame-edged wings; Rocco lifts off on an orange flame trail |
| 8 | 10.23–11.56 | Then the teacher points at me. | comedy | medium | whip | teacher | point @ me | smile @ teacher | none | place: teacher -3 1 yaw 0; cam: -2.2 4.4 3 at -3 4.2 -3; fov: 36; Every kid and every beast turns to look at the hero |
| 9 | 11.56–13.52 | My beast, Tuft, is the size of a *muffin*. | comedy | close | crashZoom | hero | reach_for @ Tuft | nervous_laugh @ muffin | crash | punch @ muffin; place: teacher -11 0 yaw 40; cam: -5.2 3.6 -3 at -5 3.2 -8; fov: 34; Tuft sits in his cupped hands, tiny; on *muffin* it sneezes one sparkle. FIRST LAUGH |
| 10 | 13.52–15.92 | He's scared of everything. So am I. | comedy | close | snap | hero+tuft | flinch @ I | terrified @ I | none | cam: -5.4 4.2 -2.5 at -5.2 3.4 -8; fov: 34; A leaf drifts down: Tuft's quills flatten and the hero flinches at the exact same moment |
| 11 | 15.92–16.89 | But by tomorrow night, | tension | medium | push | hero | - | neutral @ night | none | loopOpen: titan; cam: -4 4 -1 at -2 4.2 -8; fov: 40; The hero glances out past the yard to the mountain |
| 12 | 16.89–18.46 | a *Titan* will run from us. | tension | wide | push | prop:titanCave | - | - | impact | loc: titanCave; look: night; punch @ Titan; cam: 9 36 235 at 9 42 110; fov: 52; FLASH-FORWARD: the dark cave mouth; two molten eyes ignite on *Titan* |
| 13 | 18.46–19.97 | A spider drops onto my desk. | comedy | insert | snap | prop:spider | - | - | none | loc: beastClass; place: hero 1.5 2.8 yaw 0; place: vance -3 3 yaw 0; place: teacher -2 -7.5 yaw 0; place: kira 5 3 yaw 0; place: rocco 8 3 yaw 0; place: tuft 1.5 2.2 yaw 0; place: nightfang -22 -2 yaw 80; place: juni 40 18 yaw 0; place: dad 42 18 yaw 0; place: crowd 9 -1 yaw 0; cam: 2 4.4 8.4 at 1.5 4.1 5.4; fov: 28; A tiny spider lowers on a thread right in front of the hero's nose |
| 14 | 19.97–20.84 | Tuft puffs up. | comedy | close | crashZoom | tuft | - | - | crash | puff: tuft ball @ puffs; cam: 1.6 4 8 at 1.5 3.4 4.4; fov: 30; Tuft balloons into a spiky ball on the desk |
| 15 | 20.84–21.70 | And so do *I*. | comedy | medium | snap | hero | - | shock @ I | impact | gag 1; puff: hero ball @ I; cam: 1.5 4.2 12 at 1.5 4 4.8; fov: 40; The hero inflates into a ball, arms and legs sticking out |
| 16 | 21.70–22.52 | I bounce off the ceiling | comedy | wide | whip | hero | - | panic @ bounce | impact | blur; cam: 10.5 6 8.5 at -1 4.5 0; fov: 58; He boings off the ceiling |
| 17 | 22.52–24.43 | like a beach ball. Everyone laughs. | comedy | wide | static-drift | hero | - | panic @ beach | none | crowd: dummies 10 idle; cam: 10.5 6 8.5 at -1 3.5 -1; fov: 58; He bounces across desks while the class (10 kids) laughs and points |
| 18 | 24.43–26.80 | But nobody sees Vance's dragon back away from me. | tension | medium | push | nightfang | - | - | none | beast: nightfang flinch @ back; cam: -9 4.5 6 at -22 4.5 0; fov: 50; CLUE 1 (not emphasised): through the window, Nightfang sees the ball-hero and backs away, ears flat. Nobody in the room looks |
| 19 | 26.80–28.90 | Vance says, "Enjoy your *balloon* power." | comedy | close | snap | vance | arms_cross | smirk @ balloon | none | puff: hero deflate; place: vance -1 2.2 yaw 0; cam: -0.5 4.8 9 at -1 4.6 4.2; fov: 34; Behind Vance the hero shrinks back to normal |
| 20 | 28.90–31.51 | "At the festival, I'm getting the strongest beast alive." | tension | medium | push | vance | - | scheme @ strongest | none | loopOpen: strongest; cam: -4.2 4.6 9 at -3 5 -3; fov: 40; Vance looks past the window at the mountain |
| 21 | 31.51–34.06 | At dinner, my little sister Juni feeds Tuft blueberries. | fun | medium | orbit | juni+tuft | reach_for @ blueberries | warm @ Juni | none | loc: homeDining; look: day; Juni named + on screen ≈30.5. Blink the firefly circles her head |
| 22 | 34.06–36.16 | Dad's stone ox lifts our table for fun. | fun | wide | gamecam | boulder | dad:cheer @ fun | - | none | beast: boulder lift @ lifts; Boulder raises the whole table on its horns; Dad laughs. BEAST SHOWCASE |
| 23 | 36.16–37.28 | Then the toaster pops. | comedy | insert | snap | prop:toaster | - | - | impact | Toast launches |
| 24 | 37.28–37.85 | I puff. | comedy | close | crashZoom | hero | - | shock @ puff | crash | puff: hero ball @ puff |
| 25 | 37.85–38.91 | The table *flies*. | comedy | wide | whip | prop:dinnerTable | - | - | impact | gag 2; blur; The ball-hero bumps the table: it flips off Boulder's horns, spaghetti everywhere |
| 26 | 38.91–40.78 | Dad's ox is now wearing spaghetti. | comedy | medium | static-drift | boulder | - | - | none | puff: hero deflate; Spaghetti draped over Boulder's horns; it blinks slowly |
| 27 | 40.78–43.07 | Juni whispers, "Tuft picked you for a reason." | emotion | close | push | juni | - | warm @ reason | none | loopOpen: reason; Juni holds Tuft up to the hero's face |
| 28 | 43.07–44.52 | I wish he picked a braver kid. | emotion | close | static-drift | hero | - | sad_soft @ braver | none | He looks away; Tuft's quills droop |
| 29 | 44.52–46.45 | That night, thunder cracks over the village. | tension | wide | tiltUp | hero | - | - | impact | loc: villageStreet; look: storm; lightning; Tilt up the night street to our house's attic window; lightning |
| 30 | 46.45–48.30 | I puff so big I fill my whole room. | comedy | wide | crashZoom | hero | - | terrified @ fill | crash | gag 3; loc: homeBedroom; puff: hero room @ puff; puff: tuft ball @ puff; He fills the whole attic, squashed against the rafters |
| 31 | 48.30–49.64 | My legs stick out the *window*. | comedy | wide | snap | hero | - | - | impact | loc: villageStreet; Exterior: two legs kick out of the round attic window; roof tiles pop off |
| 32 | 49.64–51.61 | And every beast on our street runs away. | tension | wide | push | prop:villageStreet | - | - | none | beast: fox flee @ every; beast: deer flee @ beast; beast: boar flee @ runs; CLUE 2 (wider): wide street, every neighbour's beast bolts away from our house |
| 33 | 51.61–53.30 | I tell Tuft I wish he was a dragon. | emotion | close | push | hero+tuft | - | sad_soft @ dragon | none | loc: homeBedroom; look: goldenHour; Tuft's quills flatten as he hears it |
| 34 | 53.30–54.86 | He hides under my bed all day. | emotion | medium | static-drift | tuft | - | - | none | Two tiny glowing eyes under the bed; window light sweeps across the floor (time passing) |
| 35 | 54.86–56.22 | Then comes the Beast Festival. | fun | wide | track | prop:lanternSea | - | - | none | loc: festivalPlaza; look: goldenHour; loopOpen: festival; Lanterns rise over the plaza |
| 36 | 56.22–58.04 | Lanterns, music, and every beast in the village. | awe | wide | drone | prop:lanternSea | - | - | none | beast: nightfang fly; beast: volt run; beast: cinder fly; beast: boulder walk; BEAST PARADE: every glowing beast circles the plaza under the lantern sea. Tuft peeks out of the hero's hood |
| 37 | 58.04–60.56 | Vance pulls a cloth off a giant cage. | tension | medium | lowAuthority | vance | tug_pull @ cloth | smirk @ cloth | none | cage: reveal @ cloth; loopOpen: cage |
| 38 | 60.56–62.50 | Inside is the *Titan* from the mountain. | awe | wide | crane | titan | - | - | impact | beast: titan perch; punch @ Titan; loopClose: strongest; Crane up the chained Titan, ×12 scale, molten seams glowing |
| 39 | 62.50–64.65 | "Its power is mine now," he says. | tension | close | push | vance | push @ mine | scheme @ mine | none | He raises his palms toward the Titan |
| 40 | 64.65–66.09 | But the rule says *your* beast. | tension | close | push | titan | - | - | none | punch @ your; ECU of the Titan's eye: it does not look at Vance |
| 41 | 66.09–67.50 | And the Titan was never his. | tension | medium | static-drift | vance+titan | - | nervous_laugh @ never | none | No glow link forms between them |
| 42 | 67.50–69.77 | Vance gets nothing. And the Titan gets *angry*. | tension | medium | push | vance+titan | - | shock @ angry | impact | fizzle: vance @ nothing; beast: titan roar @ angry; Vance's palms spit one smoke puff; behind him the Titan's seams flare molten |
| 43 | 69.77–70.71 | The chains snap. | tension | insert | static-drift | prop:chains | - | - | impact | chains: snap @ snap; loopClose: cage; look: storm |
| 44 | 70.71–72.52 | Every brave beast in the village runs. | tension | wide | push | nightfang | - | - | none | beast: volt flee @ brave; beast: cinder flee @ village; beast: boulder flee @ runs; Beasts stream past the lens in every direction |
| 45 | 72.52–73.45 | Even the *dragon*. | comedy | insert | crashZoom | nightfang | - | - | crash | beast: nightfang flee @ dragon; Nightfang yelps and flies off, Vance clinging to its tail |
| 46 | 73.45–75.06 | And Juni is frozen in its path. | tension | wide | lowAuthority | juni | - | terrified @ frozen | none | loopOpen: juni; beast: titan walk; The Titan's huge foot lifts over tiny Juni |
| 47 | 75.06–76.82 | Tuft jumps from my hoodie and runs to her. | emotion | medium | push | tuft | - | - | none | beast: tuft run; Tuft leaps from the hood and plants himself in front of Juni, trembling |
| 48 | 76.82–77.85 | So I run after him. | tension | medium | track | hero | - | terrified @ run | none | blur; cycle: sprint 1 0 |
| 49 | 77.85–80.10 | I have never been this scared in my whole life. | emotion | close | static-drift | hero | - | terrified @ scared | none | THE BREATH: he stands over Juni and Tuft, shaking; grade 5 % darker, vignette +0.15. Hold ≥ 1.5 s |
| 50 | 80.10–81.51 | The rule said *whatever* power. | tension | ecu | push | hero | - | determined @ whatever | none | twist; glow: tuft 0.6 @ whatever; TWIST. Biggest visual change: storm-dark snaps to blue-gold as Tuft's quills ignite beside his face |
| 51 | 81.51–83.63 | And Tuft's power grows with how scared you are. | tension | insert | push | tuft | - | - | none | puff: tuft ball @ grows; glow: tuft 0.8 @ scared; Tuft swells, quills lengthening |
| 52 | 83.63–85.11 | Tuft never needed a brave kid. | emotion | close | push | hero+tuft | - | awe @ brave | none | They look at each other |
| 53 | 85.11–86.67 | He needed the most *scared* one. | emotion | close | push | hero | - | determined @ scared | none | loopClose: reason |
| 54 | 86.67–88.06 | We puff. And puff. | tension | wide | lowAuthority | hero+tuft | - | - | impact | puff: hero colossal @ We; puff: tuft colossal @ And; They balloon past the camera |
| 55 | 88.06–90.66 | Past the roofs, past the lanterns, past the *Titan*. | awe | wide | crane | tuft | - | - | impact | glow: tuft 1 @ Titan; loopClose: giant; Crane up with them past the roofs and lanterns to above the Titan: SAME framing family as shot 2, now lit and understood |
| 56 | 90.66–91.88 | The Titan looks up at us. | tension | close | lowAuthority | titan | - | - | none | Its molten eyes shrink to pinpoints |
| 57 | 91.88–93.38 | Then it runs all the way home. | fun | wide | track | titan | - | - | none | beast: titan flee @ runs; loopClose: titan; The Titan bolts up the mountain into its cave. Nobody hurt |
| 58 | 93.38–95.51 | We deflate with the loudest *squeak* in history. | comedy | medium | whip | hero+tuft | - | embarrassed @ squeak | impact | puff: hero deflate @ squeak; puff: tuft deflate @ squeak; blur; They zip around the plaza like let-go balloons |
| 59 | 95.51–99.04 | Juni hugs Tuft, then me. Vance's dragon sleeps behind my house now. | payoff | medium | push | juni+hero | comfort_kneel @ hugs | warm @ me | none | payoff; loopClose: juni; light: ev 0.75 rim 1.6 rimK 900; PAYOFF: Juni hugs Tuft then the hero under the lanterns (brightest frame, hold ≥ 1.5 s). On *dragon*: the push settles to reveal Nightfang curled asleep behind our house (callback to "I wish he was a dragon") |
| 60 | 99.04–101.55 | And Juni says *boo* to me every night. | comedy | close | snap | juni+hero | - | grin @ boo | impact | loc: homeBedroom; look: night; Juni pops up at the bedside: "boo"; the hero flinches |
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
