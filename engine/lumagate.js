// engine/lumagate.js — A5 §E Decision 2: measure the character, not a box (pure; Node-testable).
// luma: Float32Array (0–1) of w×h, row 0 = top. mask: Uint8Array (1 = actor pixel). Ring = pixels whose distance to the mask
// is in [r0, r1] px (chamfer 3-4 distance ≈ Euclidean), excluding the mask itself.
export function distanceToMask(mask, w, h) {
  const INF = 1e9, d = new Float32Array(w * h); for (let i = 0; i < w * h; i++) d[i] = mask[i] ? 0 : INF;
  const at = (x, y) => d[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = at(x, y); if (!v) continue;
    if (x > 0) v = Math.min(v, at(x - 1, y) + 3); if (y > 0) { v = Math.min(v, at(x, y - 1) + 3); if (x > 0) v = Math.min(v, at(x - 1, y - 1) + 4); if (x < w - 1) v = Math.min(v, at(x + 1, y - 1) + 4); } d[y * w + x] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { let v = at(x, y); if (!v) continue;
    if (x < w - 1) v = Math.min(v, at(x + 1, y) + 3); if (y < h - 1) { v = Math.min(v, at(x, y + 1) + 3); if (x < w - 1) v = Math.min(v, at(x + 1, y + 1) + 4); if (x > 0) v = Math.min(v, at(x - 1, y + 1) + 4); } d[y * w + x] = v; }
  for (let i = 0; i < w * h; i++) d[i] /= 3; return d;
}
export function maskStats(luma, mask, w, h, {r0 = 6, r1 = 14} = {}) {
  const dist = distanceToMask(mask, w, h); let sa = 0, na = 0, sr = 0, nr = 0;
  for (let i = 0; i < w * h; i++) { if (mask[i]) { sa += luma[i]; na++; } else if (dist[i] >= r0 && dist[i] <= r1) { sr += luma[i]; nr++; } }
  return {actor: na ? sa / na : null, ring: nr ? sr / nr : null, actorPx: na, ringPx: nr, contrast: na && nr ? sa / na - sr / nr : null};
}
