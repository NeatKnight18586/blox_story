# PUBLISHING — every upload (docs/V2_BRIEF.md §13)

## Required text
- Video description **and** channel About page, verbatim:
  > Original fan-made animation. Not affiliated with, sponsored or endorsed by Roblox Corporation.
- Never use the Roblox logo or wordmark in a video, thumbnail, title card or channel art. Our hair, faces, outfits, accessories, props and worlds are our own designs (CLAUDE.md, brief §6.0).
- Never imply the videos are official.

## Per upload
- **Title:** the rule in ≤ 60 characters (e.g. "In this kingdom, you're nobody until you pull your sword").
- **First frame = the rule shown** (frame 0 is already composed for this: the hook caption is on screen from frame 0).
- **Pinned comment:** one question for viewers (e.g. "What would YOUR stone be hiding?").
- **Audience setting:** choose honestly per YouTube's rules. The content is written for a general teen-and-up audience and kept family-safe (no gore, no on-screen death, no weapons used on people, no romance, no real brands).
- **Music:** only royalty-free tracks you hold rights to. Do not use the Shorts music library on videos longer than 60 s. (`assemble.py` mixes `stories/<slug>/music.mp3` at −20 dB under the voice only if that file exists.)
- **Sound effects:** none (owner decision, 2026-11-12).
- **Voice:** confirm the ElevenLabs plan in use permits commercial use before uploading.

## File checks before upload (Amendment A2: `assemble.py` and `npm run v2:qc` print these)
- Upload the **1440×2560 master** (`<slug>-master.mp4`, from the GitHub prerelease or sent directly), never the
  review proxy. 30 fps, H.264 High, yuv420p, BT.709, AAC 320k, `+faststart`, ≥ 16 Mb/s, no size cap.
  `v2:qc` must have passed (`review/<slug>/qc.json`).
- Length 2:02–2:50 (final shot held to `max(voice + 2.5 s, 122.5 s)`).
- Loudness −14 LUFS ± 1, true peak ≤ −1 dB.
- **Publish as Unlisted first**, wait until **1440p** appears in YouTube's quality menu (YouTube's 1440p+ processing
  uses VP9/AV1 with more bits; it can take a while after upload), check it on a phone, then make it Public.