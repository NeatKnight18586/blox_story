# names100 — draft shot storyboard

> **Creative specification only. Not executable P2A/P1 JSON yet.** Narration source of truth is `VOICE_CUES.md`. The supplied WAV lasts 54.682993s; use 1641 frames @ 30fps = 54.7s with 17ms padding. Shot cuts are snapped to integer frames and placed at measured voice pauses.

## Timed visual plan

| Shot | Frames [start, end) | Seconds | Scene / visible action |
|---|---|---|---|
| S01 | 0–94 | 0.00–3.13 | **Rule / town** — Nightwide view of original block town; visual cue '100' on world clock |
| S02 | 94–169 | 3.13–5.63 | **Cost / count** — Clear close-up 100→99 illustration on an anonymous townsperson |
| S03 | 169–259 | 5.63–8.63 | **Zero / consequence** — Count reaches zero; neighbors turn away and a face/name fades |
| S04 | 259–320 | 8.63–10.67 | **Eli / unused** — Introduce shy Eli in distinctive styling; counter 100 remains |
| S05 | 320–398 | 10.67–13.27 | **Not brave or smart** — Eli avoids another person; restrained close-up |
| S06 | 398–482 | 13.27–16.07 | **Too shy to speak** — Eli wants to greet another person but cannot; counter still 100 |
| S07 | 482–573 | 16.07–19.10 | **Night / pale figures** — Moonlit bedroom window, two pale silhouettes outside |
| S08 | 573–630 | 19.10–21.00 | **Ghosts / rumor** — Exterior silhouettes through fog; eerie readable composition |
| S09 | 630–719 | 21.00–23.97 | **Faded nametag** — One ghost raises legible name tag 'MARA' |
| S10 | 719–769 | 23.97–25.63 | **Eli leans closer** — Over-shoulder move toward tag, nervous Eli |
| S11 | 769–823 | 25.63–27.43 | **Mara whispered** — Eli says 'Mara' 25.84–26.28; cue begins after name |
| S12 | 823–882 | 27.43–29.40 | **99 appears** — Counter settles at 99, Eli's realization begins |
| S13 | 882–938 | 29.40–31.27 | **Ghost becomes human** — Ghost Mara changes into solid colored human, 29.63–30.92 |
| S14 | 938–1046 | 31.27–34.87 | **They weren't dead** — Eli reacts; background silhouettes imply these were forgotten people |
| S15 | 1046–1096 | 34.87–36.53 | **Eli opens the door** — Low-angle door reveal; Eli decides to help |
| S16 | 1096–1203 | 36.53–40.10 | **Start saying names** — Named silhouettes regain color; use 1–2 live rigs plus crowd proxies |
| S17 | 1203–1296 | 40.10–43.20 | **Countdown montage** — 52, 18, 3, 1 timed to 40.33/41.20/42.01/42.57 |
| S18 | 1296–1371 | 43.20–45.70 | **Sunrise returns** — Cold night lighting shifts to sunrise, townspeople return |
| S19 | 1371–1406 | 45.70–46.87 | **Mothers cried** — Two-actor emotional reunion |
| S20 | 1406–1450 | 46.87–48.33 | **Friends ran together** — Two-actor reunion, existing walk/camera cuts if no run action |
| S21 | 1450–1490 | 48.33–49.67 | **Families whole** — Warm wide shot with stylized crowd proxies |
| S22 | 1490–1546 | 49.67–51.53 | **Eli hits zero** — Single dramatic insert counter→0 at spoken zero, ~50.96 |
| S23 | 1546–1641 | 51.53–54.70 | **Nobody remembers Eli** — Town passes Eli without recognition; restrained camera pull-away |

## Critical acting and continuity rules

- Eli has all **100** uses until he speaks **Mara** at 25.84–26.28 seconds. To ensure no premature drop, set 100→99 at **frame 789 (26.30s)** or later, then the ghost restores during 29.63–30.92s.
- Counter montage must show **52 (frame 1210), 18 (1236), 3 (1260), 1 (1277)**. Final counter **0 around frame 1529**, during Eli's spoken sacrifice.
- This story interprets reaching zero as a **one-time forgetting event**; speaking a forgotten person's name restores their recognition but does not reset their consumed name allowance. Avoid an implicit 'zero means forgotten every subsequent instant' contradiction.
- Use **two live actors** for Eli and Mara at the window; avoid 100 independently animated ghost rigs. Distant ghosts, town and reunion crowds can be inexpensive reusable silhouetted background figures.
- Eli shy/counter logic must be legible with simple facial acting, clear overlay numbers and a few purposeful camera moves; don't require lip-sync or ElevenLabs API integration.
- Preserve P2A rig, default classic body, tapered option and approved tests; Ghost effect, counters, nametag, bedroom window/door are **new capability requests**, not currently in P2A.
- Current stage: make an **inexpensive low-res animatic of 16.07–31.50s only**, validate the decisive MARA → 99 → human transformation, then ask for review. Do not render the entire 54.7s video on this task.

## Audio restrictions

The audio file `ADAM 1.WAV` remains provided in the ChatGPT conversation and is **not stored in GitHub**. Codex must use the written timestamps and render silent visuals for now; final 1:1 synchronization with the original WAV is a later editing step. If Codex requires exact audio sample data, do not pretend it can access it. Never synthesize a replacement voice.
