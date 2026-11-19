# RULES CARD (read first, every session; IDs are defined only here)
Detail per ID: N/FLOW → CLAUDE.md · STORY → STORY_ENGINE.md · BRAND/CAP → BRAND.md · ALGO/HOOK/MID/LEAK/END/LEN → RETENTION_RULES.md
· CUT/CAM/LENS/SIGN/ANIM/HERO/LOOP/JOLT/LABEL → CINEMA.md · LOOK → LOOK.md. QA = `tools/qa_episode.py` (Phase 3), spec = `episodes/EPxx/spec.yml` (Phase 2).
"(owner)" = owner decision; "QA" = checked by code; "spec" = checked by the spec validator; "owner check" = judged by the owner, not by code.

## Non-negotiables
| ID | Rule |
|---|---|
| N-VO-01 | The owner writes all narration. Never write, rewrite or "fix" narration, scripts or beats. |
| N-VO-02 | The VO the owner sends is final: never trim, stretch or re-time it. Visuals adapt to it (owner, 2026-11-19). |
| N-VO-03 | Narration is third person; the brand opener family is "In this town…" / "In this world…". |
| N-AUD-01 | No BGM from us (owner handles music). SFX only behind `sfx: on` in the spec; default off. |
| N-FACE-01 | Faces: the owner's 48-face sheet (faces v5) only. |
| N-CHAR-01 | R6 proportions, satin bodies, modern hair (no bacon hair); adult women modest hourglass; elders/kids age-appropriate. |
| N-WORLD-01 | Every episode builds a new town/world; no reused map or location layout. Reusable code is fine. |
| N-JOLT-01 | One quick, subtle camera shake at 0:00 only (see R-JOLT-01). |
| N-REPO-01 | No licence file. Nothing that can cost money on GitHub (standard runners, no LFS, no paid features). |
| N-TOK-01 | Token budget: small targeted reads, presets, scripts; no micro-motion (breathing, sway) unless a beat needs it. |
| N-RES-01 | Final master is native 1440×2560 (owner, 2026-11-19); a 1080×1920 proxy is made from it. |
| N-REAL-01 | Realism wins over render speed (owner, 2026-11-19); the only time limit is free Actions limits (6 h/job, shard more). |

## Story engine (spec + owner check)
| ID | Rule |
|---|---|
| R-STORY-01 | Hook = [universal rule of this world] + [it breaks today / one exception], inside the first 12–18 words. |
| R-STORY-02 | Act I (≈ 0:04–0:25): three concrete, slightly absurd or darkly funny consequences of the rule. |
| R-STORY-03 | Act II: an intimate anchor (someone the hero protects/depends on) + a visible ticking counter. |
| R-STORY-04 | Act III: the hero's logical fix fails AND reveals the premise was inverted. |
| R-STORY-05 | Act IV: bittersweet payoff (sacrifice or lateral thinking); last line echoes the first; hard cut on it. |
| R-STORY-06 | Every premise combines ≥ 2 unrelated sources and twists ≥ 1 core element. |
| R-STORY-07 | A Volze premise may be a source, but its rule, twist and setting may not all survive. |
| R-STORY-08 | Never reuse another creator's twist; renaming/re-setting a known plot is a copy. |
| R-STORY-09 | Sources: PD tales/myths/fables/legends freely; modern films/books only the "what if", never characters, scenes, titles. |

## Brand
| ID | Rule |
|---|---|
| R-BRAND-01 | The first 2 words are the verbal logo: "In this town…" / "In this world…" (QA on cues). |
| R-BRAND-02 | One recurring R6 hero (slot HERO) wanders into each new world. |
| R-BRAND-03 | Hero's signature prop + signature colour are on screen within 0–3 s (QA). |
| R-BRAND-04 | Realism contrast: photographic-feeling world, clean blocky satin R6 characters in it. |
| R-BRAND-05 | Twists may hinge on game logic, but must work as general fiction for non-players. |
| R-BRAND-06 | Our caption identity: one brand accent (not white/#FFD700-family yellow) + one rounded heavy font. |
| R-BRAND-07 | `series.yml` keeps season/episode numbers for YouTube Shorts Series. |
| R-CAP-01 | Captions: 1 word (max 2) at a time, heavy rounded font, black outline/shadow, inside the Shorts safe zone (QA). |
| R-CAP-02 | Captions sync to VO word timestamps within ± 1 frame (QA). |
| R-CAP-03 | Brand accent only on stressed words (owner's `*word*` marks). |

## Algorithm and policy
| ID | Rule |
|---|---|
| R-ALGO-01 | Seconds 0–3 decide distribution: design every opening against swipe-away. |
| R-ALGO-02 | Targets: Viewed vs Swiped ≥ 70 %; APV ≥ 70 % (elite 80 %+); watch loops, shares, comments. |
| R-ALGO-03 | Length is earned by beats, never padded (see R-LEN-*). |
| R-ALGO-04 | Vary hook type, setting era, anchor, counter type, twist category, ending type vs the previous 3 episodes (variety matrix). |
| R-ALGO-05 | Sad is allowed; gratuitously distressing or manipulative is not (teen/general audience). |

## View jails (QA unless noted)
| ID | Rule |
|---|---|
| R-HOOK-01 | Effort is irrelevant; only the hook and the retention graph count (process; postmortem). |
| R-HOOK-02 | First 5 s understandable with zero Roblox knowledge; Roblox context starts ≥ 5 s (spec). |
| R-HOOK-03 | Frame 1 = motion + the rule's visual. No greeting, static establishing shot or channel intro. |
| R-HOOK-04 | VO starts ≤ 0.3 s; the hook (rule + break) is spoken by 5.0 s and within 18 words. |
| R-MID-01 | A new piece of information or escalation every ≤ 6 s (from beats). |
| R-MID-02 | The counter is visible ≥ 3 times in Act II and visibly advances. |
| R-MID-03 | The reversal lands at 55–75 % of runtime. |
| R-LEAK-01 | No dead picture: every VO gap > 0.4 s contains a cut or camera event. The VO itself is never edited (N-VO-02). |
| R-LEAK-02 | No shot > 2.5 s without camera motion; no moving shot > 3.5 s. |
| R-LEAK-03 | Postmortem against the retention graph after every episode (`docs/postmortems/`). |
| R-END-01 | Last frame ≤ 0.3 s after the end of the final word. No hold. |
| R-END-02 | Banned: "thanks for watching", subscribe/follow asks, "part 2?", end cards, logo outros, fade-to-black. |

## Length
| ID | Rule |
|---|---|
| R-LEN-01 | Default tier ≈ 2 min: 105–135 s (owner, 2026-11-19). Shorter only by `--allow R-LEN-01` (logged). |
| R-LEN-02 | 136–165 s unlocks only after 3 consecutive episodes with APV ≥ 70 % and enough beats for R-MID-01 (`docs/LENGTH_TIER.md`). |
| R-LEN-03 | Hard cap 175 s. |

## Cinema grammar (QA unless noted)
| ID | Rule |
|---|---|
| R-CUT-01 | Average one cut or major camera event every 1.5–2.2 s; cuts land on VO word timestamps. |
| R-CUT-02 | Nearly every VO clause gets its own visual beat (planner, Phase 4). |
| R-CAM-01 | Zero locked-off shots: every shot pushes, pulls, orbits, tilts, cranes, tracks or whips. |
| R-CAM-02 | Scale contrast: alternate macro inserts and wides; same-class neighbours (wide-wide, macro-macro) ≤ 2 times per episode. |
| R-CAM-03 | Whip-zoom onto clues, snap-zoom on reveals, slow push-in on emotional lines. |
| R-LENS-01 | Lenses: 18–24 mm scale wides, 35 mm action, 85 mm+ shallow DOF for emotion (mm → fov table in CINEMA.md). |
| R-SIGN-01 | 3–6 diegetic signs/props carry lore; ≤ 3 words each; cap height ≥ 3 % of frame, on screen ≥ 1.0 s. |
| R-ANIM-01 | Crisp R6 key poses, snappy head tilts, hard freezes, instant face swaps; environment FX tweened smoothly. |
| R-HERO-01 | Exactly 3 hero shots get bespoke work: frame 1, the reversal, the final loop frame. |
| R-LOOP-01 | The final frame's composition matches/leads into frame 1 (metric set in Phase 4). |
| R-JOLT-01 | `openHit` on shot 1 only; no other camera shake anywhere (not at cuts, not mid-shot). |
| R-LABEL-01 | No name tags, labels, bubbles, cards or overhead UI on characters; in-world signs/props are allowed. |

## Look (Phase 5 fills LOOK.md)
| ID | Rule |
|---|---|
| R-LOOK-01 | Photoreal PBR worlds (stone, wood, plaster, tile, grass…) at real building scale; characters small against them. |
| R-LOOK-02 | Five mood presets (dawn hope, overcast dread, golden bittersweet, night mystery, storm action); key light + colour temperature shift per act. |
| R-LOOK-03 | Characters chunky R6, matte/satin, simple outfits with tiny details (badge, collar, patch). |
| R-LOOK-04 | Crowds of 6–20 background R6s in most shots where the story allows. |
| R-LOOK-05 | Camera mostly low, wide, close; foreground limb/torso for depth; slight Dutch tilts; light blur on whips; shallow DOF on emotion. |
| R-LOOK-06 | Creatures are cute-creepy hybrids, rendered more realistically than the characters. |

## Workflow
| ID | Rule |
|---|---|
| R-FLOW-01 | Passes: set → blocking → sequences (4–8) → final; stop at each for the owner's "approve" or notes. |
| R-FLOW-02 | Session start: read this card, `episodes/EPxx/spec.yml`, `episodes/EPxx/HANDOFF.md` only. Do not explore. |
| R-FLOW-03 | Look at contact sheets only (`tools/contact_sheet.py`, ≤ 1600 px, shot numbers burned in); never single frames or video. |
| R-FLOW-04 | Touch only the pass's files; re-render only changed shots. |
| R-FLOW-05 | End every session by updating `episodes/EPxx/HANDOFF.md` (≤ 30 lines: done, approved, open notes by shot number, next step). |
| R-FLOW-06 | No final render while QA has a FAIL; override only `--allow RULE_ID`, logged in the episode folder. |
| R-FLOW-07 | Episode prompts are directed specs: follow values literally; if a value is impossible, say so instead of improvising. |
