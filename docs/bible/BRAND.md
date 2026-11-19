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

## Captions (R-CAP-*)
- **R-CAP-01:** one word at a time (max two when the first is ≤ 3 letters), heavy rounded font, thick black outline/shadow, placed
  inside the Shorts safe zone: clear of the bottom UI, the right-hand action rail and the top bar (exact box measured in Phase 6).
- **R-CAP-02:** each caption appears on its word's start time from `cues.json`, within ± 1 frame at the episode fps.
- **R-CAP-03:** the brand accent marks only stressed words: the owner's `*word*` marks in `script.txt` (the marks aren't spoken).
