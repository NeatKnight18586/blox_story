# Touch Grass — beats (owner-approved script, voice 89.63 s, cues.json)
Narration is final. Never edit script.txt, voice.flac or cues.json. Times = word starts from cues.json; cut ON the word.
End: last shot holds to 90.10 s, hard cut, no outro.

## Look and world rules
- REAL world = DUST TOWN: gray, dry, overcast, dust haze; HDRI `quarry_01_1k.hdr`; desaturated palette (sat ≤ 0.15) on everything
  EXCEPT NOVA (yellow raincoat), the blue headset glow, and the grass blade. These three are the only saturated things in the real world.
- Light states: 0–77.7 `dustGray` (cold, flat, soft sun hidden) · 77.74 sun breaks through the dust → `dustGold` (warm, low sun, long
  shadows) to the end.
- VR worlds (saturated, bright, each its own location JSON): `zombieCity` (night, green fog, broken street = realism street modules,
  dark palette) · `dragonPeaks` (HDRI `venice_sunset_1k.hdr`, landform peaks, sunset) · `space` (black starfield dome, big sun sphere,
  no ground).
- Every VR → real cut and real → VR cut passes through a 4-frame blue `flash` (#49D9FF). Real-world shots never contain VR objects.
- The GIANT FINGER is Nova's: same skin #F2C59B, a yellow raincoat cuff (#FFC21A) at the wrist. Always ≥ 20× actor height. It comes
  through a bright jagged CRACK in the sky (`lightning` effect, white-cyan, static while the finger is in).
- TAP rhythm: every "Tap" word start = a finger contact frame + `impact` + 2-frame `shake`. The third "TAP" at 53.40 = bigger shake.
- No labels. Text only on the headset visor screen (shots 59–61) and nowhere else.
- Faces v5 cell names. Captions `pop-shorts-v5`.

## Cast (new file cast/touchgrass.json)
LEO (11, real: gray hoodie, dark gray pants, headset on except 42+) · LEO_VR (same face; navy armor plates + light-blue glowing trim,
open-face helmet, glowing sword) · NOVA (11, yellow raincoat, red boots, brown ponytail, skin #F2C59B, watering can) · BRO (VR friend,
round orange helmet with dark visor, chunky armor) · FRIENDS ×6 (VR: horned knight, chrome robot, ninja, astronaut, pirate captain,
crystal mage; recolor + accessories only) · ZOMBIES ×8 (green skin #7FB069, torn gray clothes, arms-forward pose) · TOWN ×40 (gray
clothes, each wearing a headset, seated on crates/porch steps, never walking) · BOSS (dragon.js, large, dark purple, can cry: tear).

## Props (new)
headset (black shell, emissive visor strip #49D9FF; on/off state; visor SCREEN for 59–61) · giant finger/forearm · watering can
(dented teal metal) · grass blade (3 bright green blades, 1 tall; the only green in the real world) · spaceship (simple chunky fighter)
· sun sphere · sword-in-stone (props.js sword + stone, `halo`) · crates, dead tree, broken birdhouse, power line, porch, shacks.

| # | in–out (s) | words | shot |
|---|---|---|---|
| 01 | 0.00–1.06 | In this world | THUMBNAIL/HOOK: extreme close of a gray townsperson's face, headset visor glowing blue on the face; dust blowing across lens; slow push |
| 02 | 1.06–3.21 | everyone lives inside a headset | crane up and back: rows of 40 gray people seated, every visor glowing, dust town to the horizon (scaleReveal) |
| 03 | 3.21–5.18 | Everyone except Nova | lowWide: NOVA in yellow walks between the rows toward camera, the only colour; face `calm` |
| 04 | 5.18–7.21 | Out here, the world is dust | wide establishing: cracked ground, dead tree, tumbleweed rolling across frame, shacks, haze |
| 05 | 7.21–7.92 | No grass | insert: cracked dry dirt, one dry stick, slow slide |
| 06 | 7.92–8.93 | No birds | empty power line + broken birdhouse swinging (ambient mover) |
| 07 | 8.93–10.14 | Just gray | wide, dust gust (`particles`) crosses the whole frame |
| 08 | 10.14–12.52 | Nova sits outside every single day | NOVA sitting on her porch step, medium; `timeOfDay` timelapse: shadows sweep fast (days passing) |
| 09 | 12.52–13.82 | Watering the dust | insert: watering can pouring (`particles` water) onto a dry dirt patch; can + stream 35–60 % of frame |
| 10 | 13.82–15.08 | Nobody knows why | over the shoulder of a seated headset person (soft, foreground), NOVA small watering in the background |
| 11 | 15.08–16.23 | Leo doesn't care | LEO slumped on a porch chair, headset in his hand, face `unimpressed` |
| 12 | 16.23–16.85 | Click | insert: headset on his head clicks ON, visor ignites; `impact` 16.23 |
| 13 | 16.85–17.74 | Blue light | snap close LEO, blue glow on his face, `freeze` 2 frames, face `grin` |
| 14 | 17.74–18.84 | And he's everywhere | crashZoom INTO the visor; blue `flash` at 18.70 |
| 15 | 18.84–20.21 | Zombie city? | zombieCity wide, green fog, 8 zombies shuffling toward camera |
| 16 | 20.21–21.17 | He's the hero | heroLow LEO_VR, glowing sword, `heroPose`, zombies behind, face `grin` |
| 17 | 21.17–22.17 | Dragon mountains? | dragonPeaks wide: a dragon flies across the sunset peaks |
| 18 | 22.17–23.04 | He rides one | drone track: LEO_VR riding the dragon's back, wind (`trail`) |
| 19 | 23.04–23.98 | Space war? | space wide: ships crossing, laser `trail`s, big sun |
| 20 | 23.98–25.16 | He's the captain | LEO_VR standing on his ship's nose, `pointUp`, stars streaking |
| 21 | 25.16–27.27 | In there, he has a hundred friends | dragonPeaks plateau: crane up over 100 armored friends cheering around LEO_VR (crowd) |
| 22 | 27.27–29.27 | Every one in crazy armor | 3 beat cuts (27.27 / 27.94 / 28.60): close of horned knight, chrome robot, crystal mage, each `cheer` |
| 23 | 29.27–31.08 | Out here, he has one | blue `flash` → DUST TOWN wide two-shot: LEO frozen on his chair (headset on), NOVA beside him watering; cold |
| 24 | 31.08–32.98 | Tap. Tap. Tap. | insert: NOVA's finger taps LEO's headset at 31.08 / 31.66 / 32.23 (contact frames), headset 35–60 % of frame |
| 25 | 32.98–34.34 | The sky cracks open | blue `flash` → zombieCity low angle up: the sky splits (CRACK), zombies `lookUp`, face `shock` |
| 26 | 34.34–36.37 | A giant finger pokes the zombies | scaleReveal: the giant finger comes down through the crack; poke contact 35.12 → zombies knocked flat, `shockwave` dust |
| 27 | 36.37–37.98 | "Bro," his friend whispers | two-shot LEO_VR + BRO, BRO leans in, face `stare_o` |
| 28 | 37.98–39.80 | You're getting poked by the sky | MEME SHOT: BRO close, face `xd_wince`, finger looming in the cracked sky behind him, in focus enough to read |
| 29 | 39.80–41.08 | Leo knows that finger | LEO_VR close, `lookUp`, face `side_eye` |
| 30 | 41.08–41.50 | It's Nova | blue `flash` → real: NOVA close tapping, face `flat_meh` |
| 31 | 41.50–42.89 | He ignores it | blue `flash` → LEO_VR turns his back on the finger, `armsCrossed`, face `unimpressed`; finger behind him |
| 32 | 42.89–43.96 | Space war | space: LEO's ship flying toward camera, battle behind |
| 33 | 43.96–45.62 | Tap. Tap. Tap. | space wide: a CRACK opens in space, the finger taps the ship 43.96 / 44.49 / 45.00 (ship jolts each time) |
| 34 | 45.62–47.12 | The finger boops his spaceship | the finger flicks (contact 45.96 "boops"); the ship spins away tumbling |
| 35 | 47.12–48.48 | Straight into the sun | ship shrinks into the big sun; white `flash` at 48.30 |
| 36 | 48.48–49.44 | Dragon world | dragonPeaks wide: BOSS on the highest peak, dark clouds, `lightning` |
| 37 | 49.44–50.44 | Final boss | lowAuthority BOSS roars, `shake` |
| 38 | 50.44–52.40 | The legendary sword is right there | LEO_VR reaching for the glowing sword in the stone (`halo`); sword 35–60 % of frame |
| 39 | 52.40–53.97 | Tap. Tap. TAP. | wide: the finger behind the BOSS taps its head 52.40 / 52.92 / 53.40 (big shake on 53.40) |
| 40 | 53.97–55.42 | The finger flicks the dragon | flick contact 54.36; BOSS tumbles off the peak (`fall`, spinning) |
| 41 | 55.42–56.73 | The dragon cries | BOSS sitting at the bottom, close, big tear, sad; comedic hold with tear dropping |
| 42 | 56.73–58.25 | Leo rips off the headset | blue `flash` → real: LEO yanks the headset off (headset leaves head at 57.28), `freeze` 2 |
| 43 | 58.25–60.48 | "WHAT, Nova? I was about to win!" | LEO close, standing, face `xd_shout` → `angry` at 59.24 |
| 44 | 60.48–61.65 | She doesn't say anything | NOVA medium, quiet, face `calm`, watering can in hand |
| 45 | 61.65–63.01 | She just points down | NOVA `point` down; camera tilts down along her arm to the ground |
| 46 | 63.01–65.02 | In the dust, there's something green | low macro push across the dirt toward a small green speck |
| 47 | 65.02–67.02 | One tiny blade of grass | HERO INSERT: the grass blade macro, backlit, dust motes, 35–60 % of frame; the only vivid green |
| 48 | 67.02–68.67 | The first one in years | scaleReveal pull back: the tiny blade in the huge gray town |
| 49 | 68.67–70.36 | Leo looks at her watering can | insert: the dented can in NOVA's hand; LEO's head turns into frame edge |
| 50 | 70.36–71.39 | "Every day?" | LEO close, face `o_small` |
| 51 | 71.39–73.67 | Nova shrugs. "Somebody had to." | NOVA medium, `shrug`, face `content` |
| 52 | 73.67–75.59 | "Now touch grass," she says | lowWide from grass level: the blade big in the foreground (sharp), LEO + NOVA behind; NOVA face `smile` |
| 53 | 75.59–76.86 | Leo kneels down | LEO kneels (new pose `kneel`), medium side angle |
| 54 | 76.86–77.74 | He touches it | macro: LEO's fingertip touches the blade (contact 77.32 "it"); mirrors the giant finger |
| 55 | 77.74–79.69 | It's... kind of soft | LEO close, face `blush_smile`; light change starts 77.74 → `dustGold`, sun breaks through |
| 56 | 79.69–81.56 | Behind him, the headsets come off | LEO kneeling foreground, 3 townspeople behind lift headsets off one after another |
| 57 | 81.56–82.65 | One by one | 3 beat cuts (81.56 / 81.84 / 82.08… hold to 82.65): townspeople removing headsets, faces `o_small`, blinking |
| 58 | 82.65–85.66 | A whole town, staring at one blade of grass | crane up (top-down-ish): the whole town standing in a circle around LEO, NOVA and the blade; gold light |
| 59 | 85.66–86.37 | Bzzt | insert: LEO's headset on the dirt, visor screen flickers on |
| 60 | 86.37–88.62 | "Achievement unlocked," says the headset | push in on the visor screen: gold trophy + "ACHIEVEMENT UNLOCKED" (screen text in the upper half of frame) |
| 61 | 88.62–90.10 | "Touched grass." | screen switches to "TOUCHED GRASS"; the real blade softly in the background behind the visor; hard cut at 90.10 |
