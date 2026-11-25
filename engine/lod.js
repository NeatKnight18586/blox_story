// engine/lod.js — E1b crowd level of detail (pure). lodPick(dists, near, max): the indices that get the full-detail actor:
// within `near` studs of the camera, nearest first, at most `max` (ties by index, so a frame always picks the same set).
// keyPreset(preset, camPos, target, {el, offset}): a look preset whose sun (key) comes from the camera side, `el` degrees up,
// turned `offset` degrees off the lens axis (front light that still models the faces).
export const lodPick = (dists, near = 18, max = 24) => new Set(dists.map((d, i) => [d, i]).filter(([d]) => d <= near).sort((p, q) => p[0] - q[0] || p[1] - q[1]).slice(0, max).map(([, i]) => i));
export function keyPreset(preset, camPos, target, {el = 35, offset = 20} = {}) {
  const az = Math.atan2(camPos[0] - target[0], camPos[2] - target[2]) * 180 / Math.PI + offset;
  return {...preset, sunEl: el, sunAz: az};
}
