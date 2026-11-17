// node scripts/v2/layout.js <episode.json> → the laid-out shots (engine/timeline.js) as JSON on stdout, for the Python tools.
import {readFileSync} from 'node:fs';
import {layoutShots} from '../../engine/timeline.js';
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
process.stdout.write(JSON.stringify(layoutShots(spec).map(({id, start, frames, move, size, beat, at}) => ({id, start, frames, move, size, beat: !!beat, at}))));
