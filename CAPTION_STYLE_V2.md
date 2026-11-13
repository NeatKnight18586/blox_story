# CAPTION STYLE V2 — "pop shorts" (docs/V2_BRIEF.md §9)

Data: `captions/pop-shorts-v2.json`. Generator: `scripts/v2/captions.py` (tests: `tests/v2/test_captions.py`).
v1 (`CAPTION_STYLE.md`, `captions/`) is untouched.

- **Font:** Lilita One (OFL, `npm i -D @expo-google-fonts/lilita-one`; fontconfig family "Lilita One"), size 96,
  white, outline 7 `&H00101010`, shadow 3, sentence case as written in the script.
- **Chunks:** 1–3 words from `cues.json`; break at punctuation and at pauses > 0.35 s. Quotes and trailing
  commas/periods are dropped; `?` and `!` stay.
- **Timing:** each chunk starts 40 ms before its first word, never earlier than its phrase onset; a chunk holds
  until the next starts unless the gap is a pause > 0.35 s (then the screen goes blank). Never overlapping.
- **Opener:** the first line is on screen from frame 0 at size 112.
- **Pop-in:** `{\an5\pos(540,1267)\fscx82\fscy82\t(0,80,\fscx108\fscy108)\t(80,130,\fscx100\fscy100)}`.
- **Emphasis:** words/phrases from `episode.json.emphasis` (multi-word phrases match consecutive words) take
  `{\c&H004AD8FF}` (#FFD84A) at 115 %; at most one per chunk; two colours total.
- **Position:** constant within a shot — y 1267 (lower middle, inside the 60–72 % band, clear of the bottom 20 %
  and right 12 % platform UI). A shot with `"captionY": "high"` moves to y 580, used only when the planner reports
  a face or key object under the band.
- **Never:** emoji, per-letter effects, rainbow karaoke.
- Burned by `scripts/v2/assemble.py` with `ass=<file>:fontsdir=node_modules/@expo-google-fonts/lilita-one/400Regular`.
