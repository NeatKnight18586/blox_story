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

## File checks before upload (assemble.py prints these)
- 1080×1920 native (never an upscale), 30 fps, H.264 High, AAC, `+faststart`.
- Length 2:02–2:50 (final shot held to `max(voice + 2.5 s, 122.5 s)`).
- Loudness −14 LUFS ± 1, true peak ≤ −1 dB. File ≤ 60 MB.
