#!/usr/bin/env python3
"""tools/rule_ids.py: rule-ID consistency check (Retention Engine Phase 1).

  python3 tools/rule_ids.py            → prints a JSON report, exit 1 on any error

docs/bible/RULES_CARD.md is the only place a rule ID is defined (a table row "| ID | rule |").
Checks: (1) IDs are unique and well formed; (2) every ID used in the scanned files is defined in the card;
(3) every card ID is explained outside the card (docs/bible/*.md, or CLAUDE.md for N-* and R-FLOW-*); (4) card ≤ 120 lines.
Pure helpers (card_ids, used_ids, check) are unit-tested in tests/v2/test_rule_ids.py.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARD = ROOT / 'docs/bible/RULES_CARD.md'
ID_RE = re.compile(r'\b([NR]-[A-Z]+-\d{2})\b')
ROW_RE = re.compile(r'^\|\s*([NR]-[A-Z]+-\d+)\s*\|')
MAX_CARD_LINES = 120


def card_ids(text):
    """IDs defined by table rows of the card, in order (duplicates kept so check() can report them)."""
    return [m.group(1) for line in text.splitlines() if (m := ROW_RE.match(line))]


def used_ids(text):
    """Every rule ID mentioned in a text (wildcards like R-STORY-* are not IDs)."""
    return set(ID_RE.findall(text))


def check(card_text, docs, explain_docs):
    """docs: {name: text} scanned for uses; explain_docs: {name: text} that must explain each card ID. → (errors, stats)."""
    errors, ids = [], card_ids(card_text)
    seen = set()
    for i in ids:
        if not re.fullmatch(r'[NR]-[A-Z]+-\d{2}', i): errors.append(f'malformed ID {i}')
        if i in seen: errors.append(f'duplicate ID {i}')
        seen.add(i)
    for name, text in docs.items():
        for u in sorted(used_ids(text) - seen): errors.append(f'{name}: uses undefined ID {u}')
    explained = set().union(*(used_ids(t) for t in explain_docs.values())) if explain_docs else set()
    for i in ids:
        if i not in explained: errors.append(f'{i}: defined in the card but explained in no long doc')
    n = len(card_text.splitlines())
    if n > MAX_CARD_LINES: errors.append(f'RULES_CARD.md has {n} lines (> {MAX_CARD_LINES})')
    return errors, {'ids': len(ids), 'card_lines': n, 'files_scanned': len(docs)}


def main():
    card = CARD.read_text()
    bible = {p.relative_to(ROOT).as_posix(): p.read_text() for p in sorted((ROOT / 'docs/bible').glob('*.md')) if p != CARD}
    extra = [ROOT / 'CLAUDE.md', ROOT / 'docs/AUDIT.md', *sorted((ROOT / 'tools').glob('*.py')),
             *sorted((ROOT / 'episodes').glob('*/*.yml')), *sorted((ROOT / 'docs/postmortems').glob('*.md'))]
    docs = {**bible, **{p.relative_to(ROOT).as_posix(): p.read_text() for p in extra if p.exists() and p.name != 'rule_ids.py'}}
    explain = {**bible, 'CLAUDE.md': (ROOT / 'CLAUDE.md').read_text()}
    errors, stats = check(card, docs, explain)
    print(json.dumps({'pass': not errors, **stats, 'errors': errors}, indent=1))
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
