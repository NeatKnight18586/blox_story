"""Measure a real P1 render using only the Python/Linux standard library."""
import argparse
import json
import os
from pathlib import Path
import resource
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--shots', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--report', required=True)
args = parser.parse_args()
command = ['node', 'scripts/render-shot-list.js', '--shots', args.shots, '--out', args.out]
report = Path(args.report).absolute()
if any(p.is_symlink() for p in [report, *report.parents]):
    raise ValueError('Refusing a linked resource report path')
report.parent.mkdir(parents=True, exist_ok=True)
ticks = os.sysconf('SC_CLK_TCK')
seen = {}

def observe(root_pid):
    rows = {}
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        try:
            text = (entry / 'stat').read_text()
            values = text[text.rindex(')') + 2:].split()
            rows[int(entry.name)] = (int(values[1]), int(values[19]), int(values[11]), int(values[12]))
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            continue
    descendants = {root_pid}
    previous = set()
    while previous != descendants:
        previous = descendants.copy()
        descendants.update(pid for pid, row in rows.items() if row[0] in descendants)
    for pid in descendants:
        if pid in rows:
            _, start, user, system = rows[pid]
            seen[(pid, start)] = (user / ticks, system / ticks)

before = resource.getrusage(resource.RUSAGE_CHILDREN)
started = time.perf_counter()
process = subprocess.Popen(command)
try:
    while process.poll() is None:
        observe(process.pid)
        time.sleep(.25)
except KeyboardInterrupt:
    process.terminate()
    process.wait()
finally:
    if process.poll() is None:
        process.terminate()
        process.wait()
after = resource.getrusage(resource.RUSAGE_CHILDREN)
data = {
    'command': command, 'exitCode': process.returncode,
    'wallSeconds': time.perf_counter() - started,
    'sampledTreeCpuUserSeconds': sum(value[0] for value in seen.values()),
    'sampledTreeCpuSystemSeconds': sum(value[1] for value in seen.values()),
    'observedProcessCount': len(seen), 'sampleIntervalSeconds': .25,
    'waitedChildCpuUserSeconds': after.ru_utime - before.ru_utime,
    'waitedChildCpuSystemSeconds': after.ru_stime - before.ru_stime,
    'peakIndividualChildRssKiB': after.ru_maxrss,
    'method': 'Linux /proc per-process cumulative CPU sampled every .25s over the renderer subtree, keyed by PID/start time and retained after exit. A lower bound: last fractions or short-lived children may be missed. Waited-child rusage is separate and may exclude adopted descendants; do not sum it with sampled CPU. ru_maxrss is largest individual child; exporter manifest gives sampled summed tree RSS.'
}
with tempfile.NamedTemporaryFile('w', dir=report.parent, prefix='.resource-', delete=False) as handle:
    temporary = Path(handle.name)
    json.dump(data, handle, indent=2)
    handle.write('\n')
    handle.flush()
    os.fsync(handle.fileno())
os.replace(temporary, report)
raise SystemExit(process.returncode)
