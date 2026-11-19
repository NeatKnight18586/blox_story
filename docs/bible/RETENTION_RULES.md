# Retention rules (prompt §1c–1e): numbered, with how each one is measured

Inputs QA uses: `stories/<slug>/cues.json` (VO word timestamps), `stories/<slug>/episode.json` (shots, effects, captions style),
`episodes/EPxx/spec.yml` (beats, counter, reversal, hero shots, signage). "Runtime" = the last frame time of the finished video.
Every rule prints PASS/FAIL with timestamps (Phase 3). An override is only `--allow RULE_ID`, logged in `episodes/EPxx/qa/allow.log` (R-FLOW-06).

## 1c Algorithm facts we design against
- **R-ALGO-01:** Shorts go to a small seed audience first. Weak early engagement (swipe-away, low retention) caps distribution, and
  swipe-away in seconds 1–3 is the strongest negative signal. So every opening is designed against it (R-HOOK-*).
- **R-ALGO-02:** diagnostic targets, read from YouTube Studio in the postmortem: Viewed vs Swiped Away ≥ 70 % viewed; Average
  Percentage Viewed ≥ 70 % (elite 80 %+); plus loop/rewatch rate, shares, comments.
- **R-ALGO-03:** longer isn't automatically better. A long Short that leaks retention does worse than a tight one; length is earned by
  distinct beats (R-LEN-*).
- **R-ALGO-04:** YouTube's inauthentic-content policy demonetizes generic, repetitive, template-based content and "templated
  storylines". The 4-act engine is a skeleton only. Each episode must differ from the previous 3 in hook type, setting era, anchor
  relationship, counter type, twist category and ending type. `docs/VARIETY_MATRIX.md` (Phase 2) flags repeats.
- **R-ALGO-05:** twists may be sad, never gratuitously distressing or emotionally manipulative (teen/general audience). Owner check.

## 1d The view jails
**10K jail (3K–10K views): the niche likes it, the wider audience swipes.**
- **R-HOOK-01:** effort is irrelevant; only the hook and the retention graph count. Every postmortem judges the graph, not the work.
- **R-HOOK-02:** the first 5 s must be understandable by someone who has never played Roblox (mystery, problem, decision, ranking,
  shared nostalgia). Spec `roblox_context_starts_at_s` ≥ 5; the validator rejects less.
- **R-HOOK-03:** frame 1 is motion + the rule's visual. QA: shot 1 has a camera move and `reveal: true`; no greeting words in the
  first line ("hi", "hey", "welcome", "today"); no static establishing shot; no channel intro.
- **R-HOOK-04:** VO starts ≤ 0.3 s (first word start); the hook (rule + break, spec `hook_break` end) is spoken by 5.0 s and within
  18 words. Because the VO is final (N-VO-02), a hook-timing FAIL is reported to the owner as a VO note; nothing gets cut.
- **R-MID-01:** new information or an escalation every ≤ 6 s. QA: gaps between consecutive spec beats (each with a type: info |
  escalation | reveal | reversal | payoff) are ≤ 6.0 s.
- **R-MID-02:** the counter is visible ≥ 3 times in Act II (shots whose `see` lists the counter object) and its shown value changes.
- **R-MID-03:** the reversal timestamp is within 55–75 % of runtime.

**30K jail (20K–40K views): the format works; tiny leaks cap it.**
- **R-LEAK-01:** no dead air on the picture side. The VO is final and its pauses stay (N-VO-02, owner 2026-11-19). So every VO gap
  > 0.4 s (next word start − word end) must contain a cut or a camera event (whip, snap, crash zoom, freeze, impact) inside the gap.
  QA lists every gap with its length; FAIL only where the picture has no event in it.
- **R-LEAK-02:** no shot > 2.5 s without camera motion; moving shots ≤ 3.5 s (carried over from format v5; stops slow drifts).
- **R-LEAK-03:** a postmortem against the retention graph every episode (`docs/postmortems/TEMPLATE.md`, Phase 7). Each drop maps to
  hook / middle / ending leak and produces one rule change or one new QA check.
- **R-END-01:** the video ends ≤ 0.3 s after the end of the final word of the loop line. No hold on the last frame (replaces the
  0.85 s format-v5 hold in `assemble.py`, via a new opt-in option).
- **R-END-02:** banned ending signals: "thanks for watching", subscribe/like/follow asks, "part 2?", "follow for more", end cards,
  logo outros, fade-to-black. QA scans caption text and the effects list (`fadeColor` in the last 2 s fails).

## 1e Length policy (data-gated)
- **R-LEN-01:** default tier ≈ 2 min: **105–135 s** (owner, 2026-11-19; replaces the prompt's 60–105 s default and format v5's 75–90 s).
  An episode below 105 s needs `--allow R-LEN-01` (logged).
- **R-LEN-02:** 136–165 s unlocks only after 3 consecutive postmortems with APV ≥ 70 %, and only if the beats keep R-MID-01.
  The current tier lives in `docs/LENGTH_TIER.md` (Phase 7); QA reads it.
- **R-LEN-03:** hard cap 175 s (safely under the 3:00 Shorts limit).
