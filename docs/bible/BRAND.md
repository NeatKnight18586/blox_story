# Brand: how we stand out from Volze (R-BRAND-*, R-CAP-*)

Volze is a first-person anthology. We are a third-person storyteller with a recurring hero.

- **R-BRAND-01 The Storyteller voice:** third person (N-VO-03), "In this town…" / "In this world…". It's a recognizable verbal logo in
  the first 2 words. QA reads the first two words of `cues.json`; a miss is reported to the owner, never fixed by editing the VO.
- **R-BRAND-02 Recurring hero:** slot HERO (`cast/hero.json`: actor v5, faces v5, bare yellow head, open charcoal jacket over a
  royal-blue strip, sage trousers). The hero wanders into a new world every episode (N-WORLD-01): anthology freedom plus a face viewers follow.
  The old note in `cast/hero.json` ("first-person narrator") is superseded by N-VO-03.
- **R-BRAND-03 Signature prop + colour in 0–3 s:** the hero's signature prop and signature colour are both on screen in a shot that
  covers part of 0–3 s. The prop isn't built yet. Phase 4 proposes 3 options to the owner, and the colour is fixed with the caption accent in Phase 6.
- **R-BRAND-04 Realism contrast:** crisp, photographic-feeling worlds (PBR, real light, fog, depth of field) with clean blocky R6
  characters inside. The contrast is the scroll-stopper. Realism wins over render speed (N-REAL-01).
- **R-BRAND-05 Roblox-native twists:** twists can hinge on game logic (respawn, checkpoints, server time), which live-action and AI-slop
  channels can't do. Non-Roblox viewers must still read it as Twilight-Zone-style fiction.
- **R-BRAND-06 Caption identity:** one brand accent colour and one rounded heavy font. Never Volze's white + #FFD700. Today's
  keyword yellow #FFD542 falls in that family, so it's retired for new episodes. Phase 6 proposes 3 accents with sample frames and the owner picks.
- **R-BRAND-07 Series packaging:** every episode is listed in `series.yml` (season, episode, slug, title, EPxx folder) for YouTube
  Shorts Series sequential playback, even before the channel enables the feature.

## Captions (R-CAP-*) — style `pop-shorts-v6` (`captions/pop-shorts-v6.json`, Phase 6)
- **R-CAP-01:** one word at a time; two only when the first is ≤ 3 letters or a function word AND the second is a content word
  ("at midnight", never "one at"), or when the first word would be on screen < 2 frames ("And there's"). Lilita One 132 (heavy,
  rounded), outline 11 + shadow 4 in near-black, centred at x 50 %, y 64 % (yHigh 29 % via shot `captionY: "high"`), max width 68 % →
  inside the safe box x 12–84 %, y 10–76 % (Shorts UI: top bar ≤ 8 %, action rail x ≥ 86 % for y 45–88 %, bottom bar y ≥ 78 %).
  Measured: cap height 4.2 % of the frame (≥ 2.6 %), every sample box inside the safe box (`tools/caption_samples.py`).
- **R-CAP-02:** each caption starts on the frame that holds its first word's onset (floor(onset × fps), ASS times floored to
  centiseconds so libass agrees) and stays until the next one; every caption ≥ 2 frames (a start 1 frame after the previous moves 1 frame
  later, still ≤ +1). Measured through libass (`tools/caption_sync.py`): egg VO 10 s 21/21 and 60 s 126/126 captions, −0.96…+0.24 frames.
  QA (`tools/qa_episode.py`) recomputes it from the cues for every v6 episode.
- **R-CAP-03 / R-BRAND-06:** brand accent (×1.12 scale) only on the owner's `*stressed*` words (+ spec `keywords`). Options (all pass:
  outline contrast ≥ 7:1, ΔE from white ≥ 25, hue ≥ 30° from Volze gold #FFD700 and the hero skin #FFD542): lantern teal #2EE6D0
  (matches the signature lantern), ember coral #FF7B52, ultra violet #B98CFF. Provisional: lantern teal; the owner's pick sets
  `accentKey` + `accentApproved: true` (QA R-CAP-01 stays SKIP until then).

## Sound (N-AUD-01) — `scripts/v2/sfx.py` `place6`, only with spec `"sfx": "on"`
Beat-type hit list for format 6: clue (crash zoom on a clue) → glass `plink` · reveal (snap zoom) → `crack` · impact → wood `knock` ·
whip / other crash or snap → `whoosh` · the 0:00 jolt → soft `thud` · spec `sfxCues` as written. Hits < 0.25 s apart keep the
higher-priority one; every hit −30 dB RMS (16 dB under the voice). No BGM: `music.mp3` is never mixed for format 6.
