# EPISODE BRIEF: unranked ("Unranked"; hero = cast/hero6.json, faces v6, acting v6, moods on; world = NEW rankCity, built this episode)

## META
- slug: unranked
- title: Lower Ranks Must Bow… But I Had NO Rank 😤 #shorts #roblox
- alt titles: Everyone Gets a Magic Rank… Mine Was SHOCKING 😳 #shorts #roblox · Born With No Magic Rank… They LAUGHED 😢 #shorts #roblox
- pinned comment: What's your birth symbol, and what rank does it give you? 👇 Did you find the loophole before me?
- comment question: What's your birth symbol, and what rank does it give you?
- clear: close insert ecu medium
- crowd costume: STUDENT (NEW: varied academy uniforms + glowing hand symbols; NOT the white CROWD dummy)
- length target: voice 92.09 s → end 92.94 s (voice + 0.85). Script 388 words. Voice: stories/unranked/voice.wav (owner's ElevenLabs v3 take, never altered, D3)

## PREMISE
- feeling: being compared to a gifted older brother
- rule line: "In this world, lower ranks must *bow* to higher ones." (8 words after the comma)
- hero weakness: born with no symbol, so no rank: everyone treats him as a zero
- loved one: Lila · SECOND (D-rank best friend, flower magic)
- loophole: "lower ranks must bow": the scanner's ERROR never meant zero, it meant too big to count. He is not LOWER than anyone, so he never bows, and a meter that steals power by rank cannot hold him
- clue plants: ≈9.6–12.7 (scanner says ERROR and SMOKES: it overheated) · ≈61.8–63.9 (the giant arena crystal flashes ERROR and cracks: wider). Second visual plant: shot 2 (hero the only one standing in the hook crowd, never pointed at) and ≈35.3 (his knees don't bend for Dax)
- twist line: "Turns out, ERROR never meant *zero*."
- last line: "He says he was tying his *shoe*." (≠ first line; twists the rule: the S-rank bows to the unranked)

## CAST
- HERO (fixed, `cast/hero6.json`): outfit unchanged · NO hand symbol (bare hands, always)
- lila → SECOND · costume LILA (NEW): cream academy cardigan, sage-green skirt + leggings, small pale-green LEAF symbol on the back of her right hand
- dax → RIVAL · costume DAX (NEW): navy academy blazer with gold trim, white shirt, gold LIGHTNING-SIGIL symbol on the back of his right hand, the confident quiff
- mom → ADULT_F (NEW troupe slot: adult female, modest Roblox hourglass per owner rule) · costume MOM: soft teal cardigan, apron, small blue WAVE symbol
- dad → ELDER · costume DAD: hair darkened to dark brown, mustard sweater, small orange FLAME symbol
- dog → NEW actor DOG: blocky golden dog, R15-style simple rig (sit, bow = front paws stretched, tail wag)
- water → DUMMY · costume STUDENT_C (NEW): aqua uniform trim, WAVE symbol (C rank)
- fire → DUMMY · costume STUDENT_B (NEW): red-orange trim, FLAME symbol (B rank)
- ice → DUMMY · costume STUDENT_A (NEW): ice-blue trim, CRYSTAL symbol (A rank)
- crowd: up to 120 DUMMY · costume STUDENT (NEW crowd costume, seeded hair/trim/symbol colours, distance LOD)

## SYMBOL SYSTEM (one look, every shot)
- The birth symbol sits on the BACK OF THE HAND (never the face: Mashle's face lines are off-limits). Emissive decal + soft glow.
- Size and glow grow with rank: D small + dim (pale green) · C (aqua) · B (orange) · A (ice blue) · S large + blazing (gold).
- Power = the symbol's colour bursting from the raised hand: D petals/one flower · C water ribbon · B fire jet · A ice spire · S gold lightning sigil that fills the sky.
- STOLEN = the symbol's light lifts off the hand as a ribbon and the symbol goes dark grey (the hand keeps its skin colour).
- RETURNED = a falling star hits the hand and the symbol re-ignites.
- HERO: no symbol, ever. His stolen "power" (shot 44) is pale WHITE-gold light from his whole body, not from a hand, and it is the brightest light in act 2.

## WORLD
- setting: rankCity, a bright magic-academy city (our own design): cream stone, teal roofs, brass details, floating lanterns. No Roblox logo, no game names, no real brands, no weapons.
- locations (NEW, register in the set library): academyClass (rows of desks, big windows, the rank scanner on a ceiling rail) · homeDining (warm wood dining room, long table, 4 chairs, dog bed) · homeEntry (front door, hallway, stairs; Dax's entrance) · rankArena (colossal round open-air arena, tiered stands, a field, a giant faceted RANK CRYSTAL floating above the field; sub-anchors: field, stands, crystalBelow, robotDrop, gate)
- props (NEW): rankScanner (brass arm + round glass screen) · rankCrystal (giant floating crystal with a glowing screen face) · rankRobot (≈12 hero-heights, boxy brass-and-steel, round glass chest METER with the letters D C B A S around a needle; its hands = `giantHand` re-skinned in steel) · dinnerTable · plates · skyCrack (a jagged violet split in the sky) · bolts (pile of oversized nuts/bolts/gears)
- palette: cream stone, teal, brass, warm daylight; each rank has ONE colour (D sage · C aqua · B orange · A ice-blue · S gold)
- COLOUR SCRIPT: act 1 (0–38 s) bright warm academy day, saturated · act 2 (38–74 s) golden-hour arena → violet storm after the sky cracks; every stolen symbol leaves the crowd greyer · act 3 (74 s–end) white-gold overload flash on the twist, then a rainbow star-rain at sunset; the payoff (shot 54) is the brightest frame

## DIEGETIC TEXT (owner exception, approved 2026-11-22)
In-world screen text is allowed ONLY on: the rankScanner screen (shots 6, 7, 8, 12), the robot's chest METER letters D C B A S (shots 29, 31, 36, 45, 47, 48) and the rankCrystal screen (shot 39). The no-labels rule (SEASON_1 §2c) holds everywhere else: no name tags, no rank letters floating over people.

## NEW STORY VOCAB (E4, opt-in; add to `engine/story6.js` + `brief2spec.js` with tests; `@ word` works like existing markers)
- `power: <actor> <flower|water|fire|ice|lightning> [on <actor>] @ <word>`: VFX burst from the actor's hand symbol (style per SYMBOL SYSTEM); `lightning` from dax draws the sky-sized sigil; `on <actor>` places a tiny flower on that actor's shoulder (shot 54).
- `screen: <prop> "<text>" [@ <word>]`: diegetic screen text (only on the props/rows listed in DIEGETIC TEXT; brief2spec rejects it elsewhere).
- `puff: <prop|actor> @ <word>`: small grey smoke curl from vents (scanner) or a crack + puff (crystal).
- `float: plates [past <actor> to <actor>] @ <word>`: plates glide to each seated actor; with `past … to …`, one plate drifts past the first actor to the second.
- `lift: <actor> <prop> @ <word>`: the actor raises the prop overhead one-handed (verb `carry_box` pose, prop attached; seated family stays seated in their chairs, chairs lift with the table).
- `bow: <crowd | actor…> @ <word>`: kneel wave (comfort_kneel pose, heads down), crowd staggered 0–0.6 s outward from the shot's subject; stays down until `rise:`. `dog` bows with front paws stretched. The HERO can never be in a `bow:` (row error).
- `robot: enter @ <word> | fall @ <word> | overload @ <word>`: enter = drops from the skyCrack, lands in a dust ring at robotDrop; fall = topples flat backwards (big dust ring, no damage to anyone); overload = swells 1.0→1.35 over 1.0 s with white light leaking from every seam, then pops into the `bolts` pile with a sparkle burst (cartoon, no fire, no explosion debris hitting anyone).
- `steal: <crowd | actor> @ <word>`: symbol light lifts off as a coloured ribbon into the robot's chest meter (0.8 s); the symbol goes dark grey. `steal: hero` = white-gold light from his whole body.
- `meter: <D|C|B|A|S|over|max> @ <word>`: needle + letter glow on the chest meter; `over` = needle past S, glass hairline cracks; `max` = spiderweb cracks, letters strobe white.
- `rain: symbols @ <word>`: glowing stars fall over the arena (2.0 s) and re-ignite every grey symbol they hit (reuse the `bloom: crowd random` stagger).
- Robot fists reuse `hand:` (enter/grab/carry/release/exit) with the steel skin.

## BEATS
Cue times are ESTIMATES from word counts (voice 92.09 s). The VO words are authoritative: after v2:align, set every row's start to the onset of its first word in cues.json and its end to the next row's start. Never change the VO words. Cameras (`cam:`) are set by Claude Code after the world is built, honouring size / move / subject / notes.

| # | cue start–end (s) | VO words | mood | size | move | subject | action verb | expression + word it lands on | effect | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.00–1.17 | In this world, lower ranks | fun | wide | track | lila | - | grin @ In | none | loc: rankArena; power: lila flower @ In; power: water water @ world; power: fire fire @ lower; power: ice ice @ ranks; loopOpen: ranks; HOOK, frame 0 already mid-action: fast track along a line of four kids on the arena field, each fires a bigger power than the last (petals → water ribbon → fire jet → ice spire). Opening jolt (owner rule: quick subtle shake at the very first frames only) |
| 2 | 1.17–2.35 | must *bow* to higher ones. | fun | wide | lowWide | dax | point @ bow | smirk @ bow | impact | power: dax lightning @ bow; bow: crowd @ bow; crowd: dummies 80 idle at field; Dax thrusts his hand up: a sky-sized gold lightning sigil blooms over the arena; the whole crowd drops to one knee in a wave. In the crowd ONE figure stays standing: the hero (plant, never pointed at) |
| 3 | 2.35–3.80 | Your rank is the symbol you're born with, | fun | insert | track | ice | - | - | none | Track across five raised hands, back-of-hand symbols growing in size and glow D → C → B → A → S (sage, aqua, orange, ice-blue, gold) |
| 4 | 3.80–5.17 | and I got *none*. | comedy | close | crashZoom | hero | open_palms @ none | neutral @ none | crash | The hero's bare hand slides into the end of the row: nothing. Crash on his deadpan face. Hero on screen by 3.8 s |
| 5 | 5.17–7.76 | On ranking day, a scanner read every hand in my class. | fun | medium | aisleTrack | prop:rankScanner | - | - | none | loc: academyClass; crowd: dummies 24 idle; loopOpen: error; The brass scanner arm glides along a row of raised hands, each screen blinks green |
| 6 | 7.76–8.70 | Fire got a B. | comedy | insert | snap | fire | - | grin @ B | impact | power: fire fire @ B; screen: rankScanner "B" @ B; Small flame jet from his hand; screen B |
| 7 | 8.70–9.64 | Ice got an A. | comedy | insert | snap | ice | - | smirk @ A | impact | power: ice ice @ A; screen: rankScanner "A" @ A; Ice spire frosts the desk; screen A |
| 8 | 9.64–11.75 | Then it read my empty hand and said *ERROR*. | tension | close | push | hero | - | neutral; shock @ ERROR | freeze | gag 1; screen: rankScanner "ERROR" @ ERROR; Scanner over his bare hand; the screen flickers red ERROR. clue 1 |
| 9 | 11.75–12.69 | It also started *smoking*. | comedy | insert | crashZoom | prop:rankScanner | - | - | crash | punch @ smoking; puff: rankScanner @ smoking; Smoke curls from its vents, the glass glows hot orange (it OVERHEATED: clue 1, played as a joke) |
| 10 | 12.69–14.10 | "Zero rank!" the whole class yelled. | comedy | wide | whip | fire | point @ Zero | laugh @ Zero | none | crowd: dummies 24 idle; The whole class points and laughs |
| 11 | 14.10–15.04 | Everybody laughed, except Lila. | comedy | medium | static-drift | lila | - | warm @ Lila | none | loopOpen: lila; In the laughing room, one girl isn't laughing: she gives him a tiny smile |
| 12 | 15.04–16.92 | Lila is D-rank, the lowest rank there is. | fun | medium | push | lila | - | nervous_laugh @ lowest | none | screen: rankScanner "D"; She holds up her hand: a small dim leaf symbol; the scanner behind her reads D |
| 13 | 16.92–18.57 | Her only magic makes *tiny* flowers bloom. | fun | ecu | push | lila | - | grin @ tiny | none | power: lila flower @ tiny; One tiny daisy pops up out of her palm |
| 14 | 18.57–19.74 | She's still my best friend. | fun | medium | static-drift | hero+lila | head_nod | warm @ friend | none | She slides the daisy onto his desk; he nods, deadpan |
| 15 | 19.74–20.92 | But home was even worse. | comedy | wide | snap | hero | - | neutral @ worse | none | loc: homeDining; Hard cut: the family at the long dinner table; the hero alone at the far end |
| 16 | 20.92–22.80 | At dinner, magic floats the plates to everyone. | fun | wide | orbit | mom | - | smile @ plates | none | float: plates @ floats; Mom flicks her wave symbol; plates glide through the air to Dad, Dax and Mom |
| 17 | 22.80–23.98 | Mine floated right *past* me. | comedy | medium | whip | hero | - | neutral @ past | none | float: plates past hero to dog @ past; His plate drifts past his face and lands at the dog's bed |
| 18 | 23.98–26.33 | So I lifted the whole table and grabbed my plate. | comedy | wide | static-drift | hero | carry_box @ lifted | neutral @ lifted | impact | gag 2; lift: hero dinnerTable @ lifted; Deadpan: he lifts the WHOLE table overhead one-handed, the family still seated (chairs come too), and plucks his plate (first look at his strength) |
| 19 | 26.33–27.97 | Mom just said, "*Elbows* off the table." | comedy | close | static-drift | mom | point @ Elbows | neutral @ Elbows | none | Mom, airborne with the table, doesn't even look up; points at his elbow |
| 20 | 27.97–29.38 | Then there's my big brother, Dax. | fun | medium | snap | dax | arms_cross | smirk @ Dax | none | loopOpen: dax; Dax leans in the doorway, gold symbol glowing |
| 21 | 29.38–31.26 | He's S-rank, the strongest kid in the city. | fun | wide | gamecam | dax | - | grin @ strongest | none | power: dax lightning @ strongest; Gold lightning crackles round him; trophies on the shelf behind rattle |
| 22 | 31.26–33.14 | When Dax walks in, everybody has to bow. | fun | wide | track | dax | walk | smirk @ bow | none | loc: homeEntry; Dax strolls in through the front door; the family starts to kneel on *bow* |
| 23 | 33.14–35.26 | Mom bows, Dad bows, and even the *dog* bows. | comedy | wide | static-drift | mom+dad | - | embarrassed @ Mom | none | gag 3; bow: mom @ Mom; bow: dad @ Dad; bow: dog @ dog; punch @ dog; Biggest gag: both parents kneel, then the dog bows with paws stretched |
| 24 | 35.26–36.90 | My knees just don't bend for him. | comedy | medium | push | hero | shrug @ bend | neutral @ bend | none | The hero is the ONLY one standing, eye level with Dax; Dax side-eyes him (plant, not emphasised) |
| 25 | 36.90–38.31 | I got grounded for being *rude*. | comedy | close | crashZoom | hero | - | neutral; embarrassed @ rude | crash | He sits on the stairs; Mom's pointing finger enters frame |
| 26 | 38.31–39.49 | Then came the Ranking Ceremony. | fun | wide | drone | prop:rankCrystal | - | - | none | loc: rankArena; look: goldenHour; loopOpen: ceremony; Drone over the colossal arena, the giant crystal floating above the field |
| 27 | 39.49–41.60 | Every kid in the city filled one giant arena. | awe | wide | crane | prop:rankCrystal | - | - | none | crowd: dummies 120 idle at stands; Crane up the packed stands; symbols glinting like stars across the crowd |
| 28 | 41.60–43.01 | And then the sky *cracked* open. | tension | wide | tiltUp | prop:skyCrack | - | - | impact | punch @ cracked; look: storm; loopClose: ceremony; loopOpen: robot; A jagged violet split tears across the golden sky |
| 29 | 43.01–45.13 | A giant robot dropped into the middle of us. | tension | wide | lowAuthority | prop:rankRobot | - | - | impact | robot: enter @ dropped; screen: rankRobot "D C B A S"; MIDPOINT. The robot slams into the field; dust ring; kids flinch back |
| 30 | 45.13–47.48 | It pulled the glowing symbols right out of our hands. | tension | wide | push | water | flinch @ pulled | terrified @ pulled | none | steal: crowd @ pulled; Ribbons of coloured light rip from every hand in the stands into the robot's chest; symbols go dark grey |
| 31 | 47.48–49.60 | Every stolen power filled a meter on its chest. | tension | insert | push | prop:rankRobot | - | - | none | meter: D @ Every; meter: C @ stolen; meter: B @ power; meter: A @ filled; The chest meter's needle climbs letter by letter |
| 32 | 49.60–51.01 | Dax flew up to fight it. | tension | wide | whip | dax | jump @ flew | determined @ fight | none | power: dax lightning @ fight; Dax rockets up on a gold lightning trail |
| 33 | 51.01–51.95 | He lasted one *second*. | comedy | medium | snap | dax | - | shock @ second | freeze | steal: dax @ second; tumble: dax to field; His gold symbol rips out in one tug; he drops into the grass (lands fine, dazed) |
| 34 | 51.95–53.12 | Then the robot grabbed Lila. | tension | medium | crashZoom | lila | - | panic @ Lila | crash | hand: enter; hand: grab lila @ grabbed; A steel fist scoops Lila off the field, legs kicking |
| 35 | 53.12–55.24 | It squeezed her last flower spark into its meter. | emotion | close | push | lila | - | sad_soft; cry @ last | none | steal: lila @ squeezed; In the fist: her tiny daisy-light lifts from her palm and drifts into the meter |
| 36 | 55.24–58.06 | The meter hit S. And the whole arena dropped to its *knees*. | tension | wide | lowAuthority | prop:rankRobot | - | - | impact | meter: S @ S; bow: crowd @ knees; punch @ knees; From low behind the robot: the meter blazes S in the foreground; behind it the whole arena drops to its knees |
| 37 | 58.06–60.17 | Everyone had to bow to it. Everyone except me. | awe | wide | drone | hero | - | - | none | Straight-down drone: a sea of kneeling kids; on *me* ONE tiny figure is still standing in the middle (the hero) |
| 38 | 60.17–61.82 | I walked straight through the bowing crowd. | tension | medium | lowAuthority | hero | walk | determined @ straight | none | cycle: walk 0 1; Low angle: the hero walks toward the robot, kneeling kids on both sides |
| 39 | 61.82–63.93 | Above us, the giant crystal flashed my rank: *ERROR*. | awe | wide | crane | prop:rankCrystal | - | - | impact | screen: rankCrystal "ERROR" @ ERROR; puff: rankCrystal @ ERROR; punch @ ERROR; Crane up from him to the crystal: ERROR across the whole sky and a crack runs through it (clue 2, wider) |
| 40 | 63.93–65.58 | I jumped and punched that robot *flat*. | fun | wide | gamecam | hero | jump @ jumped; push @ flat | determined; yell @ flat | impact | robot: fall @ flat; blur; One leap, one punch: the robot topples flat in a huge dust ring |
| 41 | 65.58–67.93 | Lila fell out of its fist, and I caught her. | fun | medium | orbit | hero+lila | catch @ caught | relief @ caught | none | hand: release lila @ fell; airCatch: hero lila @ caught; loopClose: lila; Mid-air catch, slow orbit |
| 42 | 67.93–69.81 | Everyone cheered. Then its giant hand grabbed *me*. | tension | wide | push | hero | - | grin @ cheered; panic @ me | impact | crowd: dummies 120 idle; hand: grab hero @ me; The crowd leaps up cheering, then a steel fist slams down and snatches him (reversal in one shot) |
| 43 | 69.81–71.22 | It started draining my power too. | tension | close | push | hero | - | terrified @ draining | none | steal: hero @ draining; Pale white-gold light pulls out of his whole body into the meter |
| 44 | 71.22–72.40 | I got weaker, and weaker. | tension | ecu | push | hero | - | sleepy @ weaker | none | His eyes droop; the light around him dims |
| 45 | 72.40–74.28 | Its meter went past S, and kept going. | tension | insert | static-drift | prop:rankRobot | - | - | none | meter: over @ past; still; THE BREATH. Needle slides past S; hairline cracks spread; grade 5 % darker, vignette +0.15. Hold ≥ 1.5 s |
| 46 | 74.28–75.69 | Turns out, ERROR never meant *zero*. | comedy | close | crashZoom | hero | - | sleepy; scheme @ zero | crash | twist; loopClose: error; look: day; TWIST. Biggest visual change: storm-violet snaps to white-gold light; his eyes open, a tiny grin |
| 47 | 75.69–77.10 | It meant too big to *count*. | tension | wide | push | prop:rankRobot | - | - | impact | meter: max @ count; punch @ count; White light leaks from every seam of the robot |
| 48 | 77.10–78.74 | The meter had nowhere left to go. | tension | ecu | push | prop:rankRobot | - | - | none | The meter glass spider-webs; the letters strobe white |
| 49 | 78.74–80.62 | The robot swelled up, and up, and *BOOM*. | tension | wide | lowAuthority | prop:rankRobot | - | - | impact | robot: overload @ BOOM; punch @ BOOM; loopClose: robot; It inflates like a balloon, then POP: a white sparkle burst |
| 50 | 80.62–82.50 | It fell apart into a pile of bolts. | comedy | medium | static-drift | hero | - | neutral @ bolts | none | Bolts and gears rain into a pile; the hero stands on top, holding Lila, deadpan |
| 51 | 82.50–84.62 | Every stolen power rained back down like glowing stars. | awe | wide | crane | prop:rankCrystal | - | - | none | rain: symbols @ rained; bloom: crowd random @ rained; look: goldenHour; Rainbow stars fall over the whole arena; symbols re-ignite across the stands |
| 52 | 84.62–85.79 | Lila's hand lit up first. | fun | insert | push | lila | - | warm @ lit | none | One star lands on her hand: the little leaf symbol glows again |
| 53 | 85.79–87.67 | A tiny flower bloomed right on my *shoulder*. | payoff | close | push | hero+lila | - | grin @ shoulder | none | payoff; power: lila flower on hero @ shoulder; light: ev 0.75 rim 1.6 rimK 900; PAYOFF. Lila grins; a tiny daisy pops up on his shoulder. Brightest frame of the episode. Hold ≥ 1.5 s |
| 54 | 87.67–89.55 | Then Dax walked over and *bowed* to me. | fun | medium | track | dax+hero | dax:comfort_kneel @ bowed | dax:embarrassed @ bowed | none | loopClose: dax; loopClose: ranks; Dax walks up and drops to one knee in front of him |
| 55 | 89.55–92.94 | He says he was tying his *shoe*. | comedy | close | static-drift | dax+hero | - | dax:nervous_laugh @ shoe | none | Two-shot close: Dax on one knee fiddling a shoelace that is already tied; the hero deadpan, the daisy on his shoulder. Ends at voice + 0.85 s (never a wide, never a pull) |

## PAYOFF SHOT
- shows: shot 53. Close on the hero and Lila in the star-rain; a tiny daisy blooms on his shoulder; her leaf symbol glowing again
- hold length: from "shoulder" to the next cut (≥ 1.5 s)
- light: brightest key of the episode (payoffEV), warm sunset gold + rainbow star glints; the hero's jacket stays within ΔE 12 of its charcoal

## CHECKS
- [ ] hero on screen by 0:05 (shot 4 at ≈3.8 s; also visible standing in shot 2)
- [ ] loved one named and on screen by 0:40 (Lila: on screen 0.0 s, named ≈14.1 s)
- [ ] clue shown twice (scanner ERROR + smoke ≈9.6–12.7 · arena crystal ERROR + crack ≈61.8–63.9, wider)
- [ ] final shot not wide (shot 55 close two-shot)
- [ ] last line ≠ first line
- [ ] diegetic text only on the rows listed in DIEGETIC TEXT
- [ ] family-safe: nobody hurt; Dax lands dazed; the robot pops into bolts, no fire, no debris on people
