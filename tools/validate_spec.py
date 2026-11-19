#!/usr/bin/env python3
"""tools/validate_spec.py: episodes/EPxx/spec.yml validator (Retention Engine Phase 2).

  python3 tools/validate_spec.py episodes/EP01/spec.yml [--allow RULE_ID --reason "…"]…
  python3 tools/validate_spec.py --all            (every episodes/EP*/spec.yml)

Prints PASS/FAIL lines with rule IDs, exit 1 on any FAIL. An --allow turns that rule's FAILs into ALLOWED and appends a line
to episodes/EPxx/qa/allow.log (R-FLOW-06); N-* rules and missing fields cannot be allowed.
The spec carries the owner's story decisions (written in chat, N-VO-01); this tool only checks them.
Pure: validate(spec, others, tier) → list of (rule_id, message). Tests: tests/v2/test_spec.py.
"""
import argparse, datetime, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from variety_matrix import variety_flags, load_specs  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

ENUMS = {
    'hook_type': ['rule_exception', 'forbidden_action', 'countdown', 'mystery_object', 'impossible_fact', 'ranking', 'decision', 'nostalgia'],
    'twist_category': ['protector_monster', 'curse_gift', 'hero_is_cause', 'time_loop', 'identity', 'game_logic', 'sacrifice_reframe', 'other'],
    'payoff_type': ['sacrifice', 'lateral', 'reunion', 'reveal'],
    'counter.type': ['number', 'countdown', 'clock', 'lanterns', 'rings', 'days', 'lives', 'objects', 'other'],
    'source.kind': ['emotional', 'roblox', 'fantasy', 'retold', 'volze'],
    'hero_shot.role': ['frame1', 'reversal', 'final'],
    'beat.type': ['info', 'escalation', 'reveal', 'reversal', 'payoff'],
}
# field → rule ID that requires it (missing field = FAIL under that ID)
REQUIRED = {
    'id': 'R-BRAND-07', 'slug': 'R-BRAND-07', 'season': 'R-BRAND-07', 'episode': 'R-BRAND-07', 'world': 'N-WORLD-01',
    'hook_rule': 'R-STORY-01', 'hook_break': 'R-STORY-01', 'hook_type': 'R-ALGO-04', 'micro_examples': 'R-STORY-02',
    'anchor': 'R-STORY-03', 'counter': 'R-STORY-03', 'false_solution': 'R-STORY-04', 'inversion': 'R-STORY-04',
    'twist_category': 'R-ALGO-04', 'payoff_type': 'R-STORY-05', 'loop_line_echo': 'R-STORY-05', 'setting_era': 'R-ALGO-04',
    'signage': 'R-SIGN-01', 'hero_shots': 'R-HERO-01', 'target_length_s': 'R-LEN-01', 'sources': 'R-STORY-06',
    'what_was_transformed': 'R-STORY-06', 'roblox_context_starts_at_s': 'R-HOOK-02',
}
TRANSFORM_KEYS = ['rule', 'twist', 'setting', 'other']
HARD = (60, 175)            # R-LEN-03 cap; nothing under 60 s is a story
DEFAULT_TIER = (105, 135)   # R-LEN-01 (owner 2026-11-19); docs/LENGTH_TIER.md overrides
UNALLOWABLE = ('N-', 'MISSING')


def empty(v):
    return v is None or (isinstance(v, (str, list, dict)) and len(v) == 0) or (isinstance(v, str) and not v.strip())


def read_tier(path=ROOT / 'docs/LENGTH_TIER.md'):
    """The current tier from the line `tier: 105-135` in docs/LENGTH_TIER.md (default if absent)."""
    try:
        m = re.search(r'^tier:\s*(\d+)\s*-\s*(\d+)', Path(path).read_text(), re.M)
        return (int(m.group(1)), int(m.group(2))) if m else DEFAULT_TIER
    except OSError:
        return DEFAULT_TIER


def words(s):
    return [w for w in re.split(r'\s+', str(s).strip()) if w]


def validate(spec, others=(), tier=DEFAULT_TIER):
    """spec: dict from spec.yml; others: the other episodes' specs (variety + world reuse). → [(rule_id, message)]"""
    E = []
    err = lambda rid, msg: E.append((rid, msg))
    if not isinstance(spec, dict): return [('MISSING', 'spec is not a mapping')]
    for f, rid in REQUIRED.items():
        if f not in spec or empty(spec[f]): err('MISSING', f'{f} missing or empty (required by {rid})')

    def enum(key, v):
        if v is not None and v not in ENUMS[key]: err('MISSING', f"{key} '{v}' not one of {ENUMS[key]}")
    enum('hook_type', spec.get('hook_type')); enum('twist_category', spec.get('twist_category')); enum('payoff_type', spec.get('payoff_type'))

    me = spec.get('micro_examples')
    if isinstance(me, list) and len([x for x in me if not empty(x)]) != 3: err('R-STORY-02', f'micro_examples has {len(me)} items, need exactly 3')
    hw = len(words(spec.get('hook_rule', ''))) + len(words(spec.get('hook_break', '')))
    if spec.get('hook_rule') and spec.get('hook_break') and hw > 18: err('R-STORY-01', f'hook_rule + hook_break = {hw} words (> 18)')

    an = spec.get('anchor')
    if isinstance(an, dict):
        for k in ('who', 'relationship'):
            if empty(an.get(k)): err('MISSING', f'anchor.{k} missing (required by R-STORY-03)')
    elif an is not None: err('MISSING', 'anchor must be {who, relationship}')
    c = spec.get('counter')
    if isinstance(c, dict):
        for k in ('type', 'start', 'end'):
            if empty(c.get(k)) and c.get(k) != 0: err('MISSING', f'counter.{k} missing (required by R-STORY-03)')
        enum('counter.type', c.get('type'))
        if c.get('start') is not None and c.get('start') == c.get('end'): err('R-STORY-03', 'counter start == end: it must tick')
    elif c is not None: err('MISSING', 'counter must be {type, start, end}')

    srcs = spec.get('sources')
    if isinstance(srcs, list):
        titles = {str(s.get('title', '')).strip().lower() for s in srcs if isinstance(s, dict) and s.get('title')}
        if len(srcs) < 2 or len(titles) < 2: err('R-STORY-06', f'{len(titles)} distinct source(s); need ≥ 2 unrelated sources')
        for s in srcs:
            if not isinstance(s, dict) or empty(s.get('title')) or empty(s.get('kind')): err('MISSING', 'each source needs {kind, title}'); continue
            enum('source.kind', s.get('kind'))
        kinds = [s.get('kind') for s in srcs if isinstance(s, dict)]
    else:
        kinds = []
        if srcs is not None: err('MISSING', 'sources must be a list of {kind, title}')
    wt = spec.get('what_was_transformed')
    if isinstance(wt, dict):
        got = [k for k in wt if k in TRANSFORM_KEYS and not empty(wt[k])]
        bad = [k for k in wt if k not in TRANSFORM_KEYS]
        if bad: err('MISSING', f'what_was_transformed keys {bad} not in {TRANSFORM_KEYS}')
        if not got: err('R-STORY-06', 'what_was_transformed names no twisted element')
        if 'volze' in kinds and not any(k in got for k in ('rule', 'twist', 'setting')):
            err('R-STORY-07', 'a Volze source: at least one of rule/twist/setting must be transformed')
    elif wt is not None: err('MISSING', f'what_was_transformed must map {TRANSFORM_KEYS} → what changed')

    r = spec.get('roblox_context_starts_at_s')
    if r is not None and (not isinstance(r, (int, float)) or r < 5): err('R-HOOK-02', f'roblox_context_starts_at_s = {r} (must be ≥ 5)')

    sg = spec.get('signage')
    if isinstance(sg, list):
        if not 3 <= len(sg) <= 6: err('R-SIGN-01', f'{len(sg)} signs (need 3–6)')
        for s in sg:
            t = s.get('text') if isinstance(s, dict) else s
            if empty(t): err('MISSING', 'a sign has no text'); continue
            if len(words(t)) > 3: err('R-SIGN-01', f"sign '{t}' has {len(words(t))} words (≤ 3)")

    hs = spec.get('hero_shots')
    if isinstance(hs, list):
        roles = [h.get('role') if isinstance(h, dict) else None for h in hs]
        if sorted(r for r in roles if r) != sorted(ENUMS['hero_shot.role']) or len(hs) != 3:
            err('R-HERO-01', f'hero_shots roles {roles}; need exactly one each of {ENUMS["hero_shot.role"]}')

    tl = spec.get('target_length_s')
    if isinstance(tl, (int, float)):
        if not HARD[0] <= tl <= HARD[1]: err('R-LEN-03', f'target_length_s {tl} outside {HARD[0]}–{HARD[1]} s')
        elif not tier[0] <= tl <= tier[1]: err('R-LEN-01', f'target_length_s {tl} outside the current tier {tier[0]}–{tier[1]} s')
    elif tl is not None: err('MISSING', 'target_length_s must be a number')

    for b in spec.get('beats') or []:   # optional until the blocking pass (Phase 3 QA uses them)
        if not isinstance(b, dict) or not isinstance(b.get('at_s'), (int, float)): err('MISSING', 'each beat needs at_s (number)'); continue
        enum('beat.type', b.get('type'))

    w = str(spec.get('world', '')).strip().lower()
    for o in others:
        if o is spec or o.get('id') == spec.get('id'): continue
        if w and str(o.get('world', '')).strip().lower() == w: err('N-WORLD-01', f"world '{spec['world']}' already used by {o.get('id')}")
    for f in variety_flags(spec, [o for o in others if o.get('id') != spec.get('id')]):
        err('R-ALGO-04', f.split(': ', 1)[1])
    return E


def apply_allow(errors, allow):
    """→ (fails, allowed). Missing/enum problems and N-* rules can't be allowed."""
    fails, allowed = [], []
    for rid, m in errors:
        (allowed if rid in allow and not rid.startswith(UNALLOWABLE) else fails).append((rid, m))
    return fails, allowed


def log_allow(spec_path, allowed, reason):
    log = Path(spec_path).parent / 'qa' / 'allow.log'
    log.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    with log.open('a') as f:
        for rid, m in allowed: f.write(f'{stamp} validate_spec --allow {rid}: {m} | reason: {reason or "(none given)"}\n')


def main():
    import yaml
    a = argparse.ArgumentParser()
    a.add_argument('spec', nargs='*'); a.add_argument('--all', action='store_true')
    a.add_argument('--dir', default=str(ROOT / 'episodes')); a.add_argument('--allow', action='append', default=[])
    a.add_argument('--reason', default=''); o = a.parse_args()
    paths = sorted(Path(o.dir).glob('EP*/spec.yml')) if o.all else [Path(p) for p in o.spec]
    if not paths: a.error('give a spec.yml or --all')
    others = load_specs(o.dir)
    tier, bad = read_tier(), 0
    for p in paths:
        spec = yaml.safe_load(p.read_text()) or {}
        fails, allowed = apply_allow(validate(spec, others, tier), set(o.allow))
        for rid, m in fails: print(f'FAIL {rid}: {m}')
        for rid, m in allowed: print(f'ALLOWED {rid}: {m}')
        if allowed: log_allow(p, allowed, o.reason)
        print(f'{"PASS" if not fails else "FAIL"} {p} ({len(fails)} fail, {len(allowed)} allowed, tier {tier[0]}–{tier[1]} s)')
        bad += bool(fails)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
