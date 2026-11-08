# names100 — S3C: private voiced + WHITE-caption creative approval
**REVIEW ONLY, no new 3D rendering, final full-episode export or automatic PR merge.** PR #15 stays DRAFT until user approves. Read this document and root `CAPTION_STYLE.md` as the complete next-task contract. Do not reread enormous historical STATUS.

## Authority & original audio
- Use PR #15's existing three silent S3B motion previews A (shy), B (reunion), C (forgotten) and their verified timing reports. Original `ADAM 1.WAV` is in the user's ChatGPT/Codex input only, not automatically in GitHub. It has **44,100Hz stereo, 2,411,520 samples per channel, 54.682993s**.
- If Codex can still access its private original and temporary voiced files, reuse them. Otherwise request/accept the original WAV attached to the new task. Do not synthesize, alter, time-stretch, publicly upload, or commit source narration/voiced media to Git history.

## Added caption direction (white cinematic Shorts style)
- Follow root `CAPTION_STYLE.md`: clean bold **white** sans serif, dark outline and small shadow, 2–5 word natural phrases, usually one line (two maximum), no distracting bounce, brand stickers or random colored words.
- Start at **720×1280 caption-review output** by upscaling the EXISTING 180×320/15fps silent movie and burning captions at output resolution. This is a **caption-typography proof**, NOT a high-res 3D render. A small alternative size is okay if performance constrains.
- Start in lower-middle (roughly y 63–67% from top) avoiding YouTube bottom/right UI. Adjust shot-by-shot only if text overlaps meaningful expressions, the handshake/approach, or Eli's counter. Respect safe margins; verify on 9:16 phone-size screenshots, especially warm bright reunion vs cold ending.
- Narration transcript is fixed. Use `VOICE_CUES.md` to initialize phrase ranges and the actual source WAV for precise caption group timings. Do not guess exact per-word timing or split phrases evenly; if genuine listening/forced alignment is unavailable, flag uncertain timings for human review rather than claiming perfect sync. No heavy new model or caption-subscription dependency.
- Keep captions **separate from Three.js**: small SRT/JSON source → ASS style with FFmpeg/libass overlay (or an existing FFmpeg subtitle filter), so changes require only cheap video re-encoding. Original silent clips remain intact.
- Prepare only three captioned voiced proof excerpts, not subtitles for the full 54.7s film yet. Correct names **Eli** and **Mara** and numerals; no early subtitle spoilers. Reuse these source files/style for future Shorts after approval.

## Exact S3C deliverable
1. **No more acting/code changes.** Preserve PR #15 as draft. Confirm original A/B/C and WAV hashes; no 3D rendering or source film modification.
2. Reuse or create three **private** voice-aligned review files with the requested white burned-in captions. Clip A source time **[10.6667,16.0667)**; B **[43.2000,49.6667)**; C **[49.6667,54.7000)** with source audio ending at54.682993. Original WAV starts at t=0 on the master clock; excerpt audio is trimmed from these absolute ranges and starts at0 inside the clip. Protect zero exactly at native frame1529. A/B/C may use existing 15fps previews, so odd-frame events appear one 30fps tick late (never early).
3. Verify caption text, visual placement, correct segment timing, H.264/yuv420p and AAC decode, playback, video/audio start and lengths. Provide a **single 3-up screen/contact sheet** showing actual caption overlays in one dark, one warm and one ending frame. Document actual caption positioning/font/size and any obstruction.
4. Deliver **genuinely iPad-accessible private download links** to these three narrated, captioned review MP4s using Codex task artifacts if supported. Never present internal `/tmp` paths as downloadable links. If no safe artifact route exists, report PARTIAL and give a concrete supported manual export workflow rather than pretending it worked.
5. User approval checklist: A: is the hesitation obvious? B: does the reunion feel like a progression? C: is Mara's failed recognition clear? **Captions:** readable, not over faces/counters, accurately timed and not overwhelming? Ask for approval of specific scenes/style. Stop. Do not merge PR #15 or start full render.

## After approval, NOT part of S3C
Merge PR #15 with targeted checks; integrate improvements and reusable caption source into **one full, low-res voiced+captioned rough cut** with original video at t=0. Verify cut transitions and audio with the user. Only after that, authorize an economical native-30fps high-res short stress test and single final export. Keep user-adjustable caption data; do not bake styling into 3D renders.

## Efficiency/quality boundaries
No speculative full caption framework, Whisper/model install, general subtitle engine, new animation or 54.7s final export. Existing FFmpeg, P1 artifacts and S3B proof footage only. Record concise outcome/links and show real evidence. Visual/style PASS does not mean human listening happened; only user confirms emotional/audio approval.
