// scripts/freeze-check.js — engine freeze for episode sessions: npm run ep:check -- --story <slug> [--base <ref>] (default: the commit in stories/<slug>/BASE if that file exists, else origin/main); fails if the branch diff touches anything outside stories/<slug>/, beasts/*.json, parts/locations/*.json, cast/*.json.
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
export const ALLOWED = slug => [new RegExp(`^stories/${slug.replace(/[^\w-]/g, '')}/`), /^beasts\/[^/]+\.json$/, /^parts\/locations\/[^/]+\.json$/, /^cast\/[^/]+\.json$/];
// Pure: the files not covered by the allow-list.
export const violations = (files, slug) => { const ok = ALLOWED(slug); return files.filter(f => f && !ok.some(r => r.test(f))); };
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const slug = arg('story'); if (!slug) { console.error('usage: npm run ep:check -- --story <slug> [--base <ref>]'); process.exit(2); }
  const baseFile = `stories/${slug.replace(/[^\w-]/g, '')}/BASE`, base = arg('base', existsSync(baseFile) ? readFileSync(baseFile, 'utf8').trim() : 'origin/main'), git = a => execFileSync('git', a, {encoding: 'utf8'}).split('\n').filter(Boolean);
  const files = [...new Set([...git(['diff', '--name-only', `${base}...HEAD`]), ...git(['diff', '--name-only', 'HEAD'])])], bad = violations(files, slug);
  console.log(bad.length ? `FAIL  freeze: ${bad.length} file(s) outside stories/${slug}/, beasts/, parts/locations/, cast/:\n  ${bad.join('\n  ')}` : `PASS  freeze: ${files.length} changed file(s), all inside the episode lane`);
  process.exit(bad.length ? 1 : 0);
}
