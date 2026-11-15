// scripts/v2/tex4.js — writes the format v4 surfaces to the disk cache (renders/cache/tex4/<name>-512.bin) so renders load
// them instead of generating them in every page. Deterministic; skipped when the file exists.  node scripts/v2/tex4.js [--force]
import {mkdirSync, existsSync, writeFileSync} from 'node:fs';
import {NAMES4, SIZE4, CACHE_DIR, gen4, pack4} from '../../parts/materials4.js';
mkdirSync(CACHE_DIR, {recursive: true}); const t0 = Date.now(), made = [];
for (const n of NAMES4) { const f = `${CACHE_DIR}/${n}-${SIZE4}.bin`; if (existsSync(f) && !process.argv.includes('--force')) continue; writeFileSync(f, pack4(gen4(n))); made.push(n); }
console.log(JSON.stringify({made, ms: Date.now() - t0, dir: CACHE_DIR}));
