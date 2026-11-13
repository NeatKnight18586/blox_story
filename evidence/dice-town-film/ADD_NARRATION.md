# Adding the private narration

The master is silent and exactly 3513 frames at 30 fps (117.100 s), matching the locked edit and the
ElevenLabs Adam WAV (117.098 s, already at 1.25×). The WAV is not in Git. On a machine that has it:

```bash
ffmpeg -i evidence/dice-town-film/dice-town-1080x1920-silent.mp4 -i path/to/dice-town-narration.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart dice-town-final.mp4
```

Narrated + captioned version in one step (short white captions timed from the narration's own pauses,
`python3 scripts/dice-town-captions.py <wav>` regenerates `evidence/dice-town-film/captions.ass`):

```bash
ffmpeg -i evidence/dice-town-film/dice-town-1080x1920-silent.mp4 -i path/to/dice-town-narration.wav -map 0:v -map 1:a -vf "ass=evidence/dice-town-film/captions.ass:fontsdir=/usr/share/fonts/truetype/dejavu" -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart dice-town-final.mp4
```

The narrated file embeds the private narration, so it is kept out of Git.
