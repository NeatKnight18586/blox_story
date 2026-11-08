# names100 — voiceover timing cues

Measured source: supplied ElevenLabs `ADAM 1.WAV` (44,100 Hz stereo, 54.682993 seconds). Audio is in ChatGPT conversation, NOT in GitHub. Target 30fps = 1,641 frames = 54.700s (17ms trailing padding). These are waveform-pause-aligned spoken-phrase windows, accurate for shot planning but not certified phoneme-level forced alignment. Keep the ORIGINAL audio separate; don't resynthesize voices or infer new timing.

| # | Approx. spoken interval (seconds) | Narration |
|---:|---:|---|
| 1 | 0.00–0.72 | In this town, |
| 2 | 0.90–2.97 | you can only say names one hundred times. |
| 3 | 3.36–4.23 | Every time you do, |
| 4 | 4.47–5.36 | your number goes down. |
| 5 | 5.88–6.91 | And when it reaches zero, |
| 6 | 7.40–8.27 | everyone forgets you. |
| 7 | 8.88–10.49 | Eli still had all one hundred. |
| 8 | 10.89–11.82 | Not because he was brave, |
| 9 | 12.15–12.99 | not because he was smart. |
| 10 | 13.50–15.69 | He was just too shy to call anyone by name. |
| 11 | 16.28–16.75 | Every night, |
| 12 | 17.09–18.87 | pale figures stood outside his window. |
| 13 | 19.36–20.83 | The town called them ghosts. |
| 14 | 21.21–21.73 | But one night, |
| 15 | 22.07–23.70 | one of them held up a faded name tag. |
| 16 | 24.26–25.27 | Eli leaned closer. |
| 17 | 25.84–26.28 | Mara, |
| 18 | 26.71–27.15 | he whispered. |
| 19 | 27.64–29.13 | His number dropped to ninety-nine, |
| 20 | 29.63–30.92 | and the ghost turned human. |
| 21 | 31.49–32.37 | That's when he understood. |
| 22 | 32.82–33.48 | They weren't dead. |
| 23 | 33.92–34.61 | They were forgotten. |
| 24 | 35.13–36.34 | So Eli opened the door, |
| 25 | 36.72–38.52 | and started saying every name he could. |
| 26 | 38.86–39.89 | One after another. |
| 27 | 40.33–40.86 | Fifty-two. |
| 28 | 41.20–41.69 | Eighteen. |
| 29 | 42.01–42.32 | Three. |
| 30 | 42.57–42.94 | One. |
| 31 | 43.42–44.13 | By sunrise, |
| 32 | 44.36–45.51 | the forgotten were home again. |
| 33 | 45.91–46.70 | Mothers cried. |
| 34 | 47.01–48.17 | Friends ran to each other. |
| 35 | 48.50–49.43 | Families were whole. |
| 36 | 49.80–51.28 | And Eli's number hit zero. |
| 37 | 51.77–52.25 | After that, |
| 38 | 52.69–54.46 | no one remembered the boy who saved them. |

## Critical synchronized beats

- `Mara` is spoken at **25.84–26.28s**. Counter 100→99 should not happen before voice ends; choose **frame 788 (26.267s)** or later at the measured phrase end.
- Ghost becomes human during **29.63–30.92s**, after the name is spoken.
- Spoken countdown cues: **52 at 40.33s (frame 1210)**, **18 at 41.20s (1236)**, **3 at 42.01s (1260)**, **1 at 42.57s (1277)**.
- Counter hits 0 during the words ending near **50.96s (frame 1529)**. Don't forget Eli early.
- Silence includes pauses between spoken windows; use them for cuts but retain exact audio at t=0.
