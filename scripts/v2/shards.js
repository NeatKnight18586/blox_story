// node scripts/v2/shards.js --story <slug> [--n 6]  → JSON matrix for .github/workflows/render.yml
// {"include": [{"index", "from", "to", "frames"}, ...]} (to exclusive), from engine/timeline.js shardShots.
import {readFileSync} from 'node:fs';
import {layoutShots, shardShots} from '../../engine/timeline.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const spec = JSON.parse(readFileSync(arg('spec') ?? `stories/${arg('story')}/episode.json`, 'utf8'));
const shards = shardShots(layoutShots(spec), Number(arg('n', 6)));
console.log(JSON.stringify({include: shards.map(({index, from, to, frames}) => ({index, from, to, frames}))}));
