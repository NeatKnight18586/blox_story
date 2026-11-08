# blox_story — White Shorts Caption Style v1 (provisional)
**Style candidate for user approval, not a final render or claim about any competitor's exact captions.** This is a reusable presentation layer independent of Three.js and the original voice WAV.

## Look (720 × 1280 portrait target)
- **Clean, bold white sans serif** (reliable installed open-source font e.g. DejaVu Sans Bold or Liberation Sans Bold, chosen once and recorded). Sentence case by default, not all caps; **no emoji, colored words, giant popping stickers or multiple fonts**.
- Start **font height ~50–60 px**, dark charcoal/black outline ~3–4 px, subtle 1–2 px shadow; tune once against phone-size tests. Keep sharp edges and non-transparent white lettering. Use a faint backing only when needed over bright sunrise, not as the default.
- **One concise phrase, about 2–5 words**, on screen; normally one line, never more than two. Split at natural syntax/voice pauses, not one flashing word at a time. No full paragraphs. Keep names spelled **Eli** and **Mara**, and numeric speech matched accurately.
- **Placement candidate:** lower-middle, e.g. center around x=45% of width, baseline around y=63–67% of height (top-origin), leaving the right-side UI and bottom title/audio band clear. The exact Shorts safe area varies across devices. During tests allow a per-shot override to y~50–60% when a face, nametag, counter or reunion gesture would be covered. Never place text over a face, `MARA`, `100/99/0`, or the key emotional gesture. Keep a stable anchor inside each shot; don't bounce/jump caption position between phrases.
- At 180×320 rough-preview resolution, don't judge font quality. **Scale the existing low-res video to 720×1280 before burning the test caption overlay**, so text is crisp at the intended output size; 3D pixels may be blurry in this proof. Do not rerender 3D for caption experiments.

## Timing and source
- **Exact narration transcript and original WAV** are canonical, not YouTube auto-captions. The actual input lasts 54.682993s, and all subtitle times are relative to voice t=0.
- Build a **small versioned text/timing file (SRT or JSON)** and derive a deterministic ASS style/subtitle file for burning into MP4 with existing FFmpeg/libass. Keep audio, caption data, and rendered video separable so typo/style edits don't trigger expensive WebGL rerenders.
- Use existing `stories/names100/VOICE_CUES.md` phrase windows as initial guidance. For smaller groups, determine timestamps against the original WAV (review/forced-align only if existing tools are already available); **never assert word-level accuracy by dividing words evenly or using silence as a word transcript**. Report uncertain boundaries and request user feedback after listening. Don't install a large transcription model solely for this short pilot.
- Check cue text against verbatim ElevenLabs script; keep caption onset/offset aligned with audible words and avoid early reveals/spoilers. Blank screen in intentional speech pauses.
- Make optional plain SRT/YouTube caption track from the same authoritative text for accessibility (uploaded separately when publishing), even if a stylized white caption is burned into the picture.

## Acceptance — only THREE short captioned proofs for now
A (shyness 10.667–16.067s), B (reunion 43.200–49.667s), C (ending 49.667–54.700s). Use existing S3B silent motion frames + original sample-aligned WAV; encode **three private, user-accessible voiced captioned files**, verify FFmpeg decode, audio/video start, durations and caption overlays. Review a bright sunrise frame, moonlit/dark frame, face close-up and Eli's zero frame at mobile display size. Compare captions to safe-zone guides in actual YouTube Shorts editor if/when publishing; there is no universal pixel-perfect safe zone.

## Cost guardrail
**Zero new 3D renders.** Re-encode only these tiny clips with FFmpeg; keep original silent previews and WAV unchanged. Save only compact subtitle data and a couple of contact screenshots in repo; keep private voiced files outside public Git history. No new rendering backend, captions-in-Three.js engine, subscription or paid caption app.
