#!/usr/bin/env python3
"""scripts/v2/season_state.py — the /season daily loop's state (Amendment A4 §I). STATE.md decides what happens next.

  python3 scripts/v2/season_state.py plan [approve | notes | swap]     # what /season must do now (JSON), never writes
  python3 scripts/v2/season_state.py set --episode N --slug s --step voice|animatic|review|final --log "text"
  python3 scripts/v2/season_state.py init                              # episode: 1 egg, step: voice

docs/season1/STATE.md holds one state line pair (`episode: <n> <slug>`, `step: …`) and a dated log line per step.
`transition` (pure) maps (state, command, facts) → (new state, actions); the command file .claude/commands/season.md runs
the actions in order and then calls `set` with the new state.
"""
import argparse, datetime, json, os, re, sys

STATE = 'docs/season1/STATE.md'
STEPS = ('voice', 'animatic', 'review', 'final', 'published-ready')   # published-ready: the final passed QC and was delivered
OWNER_INPUTS = ('script.txt', 'voice file', 'beats prompt')   # format v4 D1: the owner writes every script; /season never plans or writes one
WAIT = 'waits for the owner\'s script.txt, voice file and beats prompt (stories/{slug}/script.txt, voice.*, beats.md); Claude Code never writes or edits a script (V4 D1)'
HEADER = '# Season 1 state (read by `/season`; nothing else decides what happens next. A4 §I)'


def parse(text):
    ep = re.search(r'^episode:\s*(\d+)\s+(\S+)\s*$', text, re.M); st = re.search(r'^step:\s*(\S+)\s*$', text, re.M)
    if not ep or not st or st.group(1) not in STEPS: raise ValueError('STATE.md needs "episode: <n> <slug>" and "step: voice|animatic|review|final|published-ready"')
    log = [l[2:] for l in text.split('## Log', 1)[1].splitlines() if l.startswith('- ')] if '## Log' in text else []
    paused = bool(re.search(r'^paused:\s*true\s*$', text, re.M))   # owner pause (format v5 build-out): /season does nothing
    return {'episode': int(ep.group(1)), 'slug': ep.group(2), 'step': st.group(1), 'log': log, **({'paused': True} if paused else {})}


def fmt(s):
    return '\n'.join([HEADER, '', f"episode: {s['episode']} {s['slug']}", f"step: {s['step']}", *(['paused: true'] if s.get('paused') else []), '', '## Log', *[f'- {l}' for l in s['log']]]) + '\n'


def cards(md):
    """Card order of SEASON_1.md §6: [(n, slug)]."""
    return [(int(n), slug) for n, slug in re.findall(r'^### (\d+) · [^·]+ · `([^`]+)`', md, re.M)]


def transition(state, cmd=None, *, voice=False, script=False, beats=False, cards_list=(), finals_done=0):
    """Pure. state: {episode, slug, step}; cmd: None | 'approve' | 'notes' | 'swap'; voice / script / beats: the owner's
    stories/<slug>/voice.*, script.txt and beats.md exist;
    finals_done: finals delivered before this one. → {'state': new or same, 'actions': [...], 'stop': reason or None}."""
    s, ep, slug, step = dict(state), state['episode'], state['slug'], state['step']
    if state.get('paused'): return {'state': s, 'actions': [], 'stop': 'paused by the owner (STATE.md paused: true): /season does nothing until it is removed'}
    nxt = next((c for c in cards_list if c[0] == ep + 1), None)
    if cmd == 'swap':
        if step != 'voice': return {'state': s, 'actions': [], 'stop': f'swap only while step is voice (now {step})'}
        return {'state': s, 'actions': ['swap-card', 'log-swap'], 'stop': f'card swapped: episode {ep} ' + WAIT.format(slug='<new slug>')}
    if step in ('voice', 'animatic'):
        if cmd in ('approve', 'notes'): return {'state': s, 'actions': [], 'stop': f'nothing to approve yet: episode {ep} {slug} is at step {step}'}
        missing = [n for n, ok in zip(OWNER_INPUTS, (script, voice, beats)) if not ok]
        if missing: return {'state': s, 'actions': [], 'stop': f'episode {ep} {slug} ' + WAIT.format(slug=slug) + f'; missing: {", ".join(missing)}'}
        return {'state': {**s, 'step': 'review'}, 'actions': ['E1'], 'stop': 'animatic delivered: wait for approve or notes'}
    if step == 'review':
        if cmd not in ('approve', 'notes'): return {'state': s, 'actions': [], 'stop': f'episode {ep} {slug} is waiting for the owner: /season approve or /season notes: …'}
        acts = (['revise'] if cmd == 'notes' else []) + ['E2']
        if (finals_done + 1) % 5 == 0: acts.append(f'compilation-{(finals_done + 1) // 5}')
        if not nxt: return {'state': {**s, 'step': 'final'}, 'actions': acts + ['season-complete'], 'stop': 'last card delivered'}
        return {'state': {'episode': nxt[0], 'slug': nxt[1], 'step': 'voice'}, 'actions': acts, 'stop': f'next: episode {nxt[0]} {nxt[1]} ' + WAIT.format(slug=nxt[1])}
    if step == 'published-ready':   # delivered: move on; format v4 (docs/season1/V4.md D1): the owner writes and voices every script
        if not nxt: return {'state': s, 'actions': ['season-complete'], 'stop': 'last card delivered'}
        return {'state': {'episode': nxt[0], 'slug': nxt[1], 'step': 'voice'}, 'actions': [], 'stop': f'next: episode {nxt[0]} {nxt[1]} ' + WAIT.format(slug=nxt[1])}
    if step == 'final':   # an E2 that was interrupted: finish it, then continue as an approval
        return transition({**s, 'step': 'review'}, 'approve', voice=voice, cards_list=cards_list, finals_done=finals_done)
    raise ValueError(step)


def log_line(text, today=None):
    return f"{today or datetime.date.today().isoformat()} · {text}"


def main():
    a = argparse.ArgumentParser(); a.add_argument('op', choices=['plan', 'set', 'init']); a.add_argument('cmd', nargs='?')
    a.add_argument('--episode', type=int); a.add_argument('--slug'); a.add_argument('--step', choices=STEPS); a.add_argument('--log', default='')
    a.add_argument('--state', default=STATE); a.add_argument('--season', default='docs/season1/SEASON_1.md'); o = a.parse_args()
    if o.op == 'init':
        s = {'episode': 1, 'slug': 'egg', 'step': 'voice', 'log': [log_line('init (Session 9): episode 1 egg, step voice; stories/egg/voice.flac is already committed, so the next /season goes straight to the animatic')]}
        open(o.state, 'w').write(fmt(s)); print(json.dumps({k: s[k] for k in ('episode', 'slug', 'step')})); return
    s = parse(open(o.state).read())
    if o.op == 'set':
        s.update({k: v for k, v in (('episode', o.episode), ('slug', o.slug), ('step', o.step)) if v is not None}); s['log'].append(log_line(o.log or f"episode {s['episode']} {s['slug']}: step {s['step']}"))
        open(o.state, 'w').write(fmt(s)); print(json.dumps({k: s[k] for k in ('episode', 'slug', 'step')})); return
    cmd = (o.cmd or '').split(':')[0].strip().lower() or None
    voice = any(os.path.exists(f"stories/{s['slug']}/voice.{e}") for e in ('flac', 'wav', 'mp3', 'm4a'))
    script = os.path.exists(f"stories/{s['slug']}/script.txt"); beats = os.path.exists(f"stories/{s['slug']}/beats.md")
    finals = sum(1 for l in s['log'] if ' final delivered' in l)
    r = transition(s, cmd, voice=voice, script=script, beats=beats, cards_list=cards(open(o.season).read()), finals_done=finals)
    r['state'] = {k: r['state'][k] for k in ('episode', 'slug', 'step', 'paused') if k in r['state']}
    print(json.dumps({'now': {k: s[k] for k in ('episode', 'slug', 'step')}, 'cmd': cmd, 'voice': voice, 'script': script, 'beats': beats, **r}, ensure_ascii=False))


if __name__ == '__main__':
    main()
