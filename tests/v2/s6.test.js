// npm run v2:test — Session 6 pure logic: render-farm shards, small-props library budgets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutShots, shardShots, totalFrames} from '../../engine/timeline.js';
import {smallProp, SMALL_PROP_NAMES, triangleCount} from '../../parts/props.js';

test('shards: contiguous, cover every frame once, cut on shot boundaries, balanced', () => {
  const shots = layoutShots(JSON.parse(readFileSync(new URL('../../stories/nobody/episode.json', import.meta.url))));
  const sh = shardShots(shots, 6), total = totalFrames(shots), starts = new Set(shots.map(s => s.start));
  assert.equal(sh.length, 6); assert.equal(sh[0].from, 0); assert.equal(sh.at(-1).to, total);
  sh.forEach((s, i) => { assert.ok(starts.has(s.from)); if (i) assert.equal(s.from, sh[i - 1].to); assert.equal(s.frames, s.to - s.from); });
  const longest = Math.max(...shots.map(s => s.frames));
  for (const s of sh) assert.ok(Math.abs(s.frames - total / 6) <= longest, `shard ${s.index} ${s.frames}`);
  assert.equal(shardShots(shots, 1).length, 1);
  assert.deepEqual(shardShots(shots, 6), sh);
});

test('small props: every prop builds, ≤ 400 triangles, deterministic, sits on the ground', async () => {
  const T = await import('three');
  for (const n of SMALL_PROP_NAMES) for (const seed of [0, 1, 2]) {
    const a = smallProp(n, seed), b = smallProp(n, seed), tris = triangleCount(a);
    assert.ok(tris > 0 && tris <= 400, `${n}#${seed}: ${tris} tris`);
    assert.equal(tris, triangleCount(b));
    const bb = new T.Box3().setFromObject(a);
    if (n !== 'cloud' && n !== 'cart') assert.ok(Math.abs(bb.min.y) < .05, `${n} min y ${bb.min.y}`);
  }
  assert.throws(() => smallProp('dragon'));
});
