// scripts/v2/flicker.js — pure pixel comparison for the stability gate (Amendment A1).
// a, b: RGBA byte arrays of the same view rendered twice (camera 4 mm apart). Returns
//   raw:  % of pixels whose colour changed by more than `thresh` on any channel (the literal A1 metric)
//   gate: % of pixels whose new colour differs by more than `thresh` from EVERY pixel in the 5×5 neighbourhood of
//         the first render. A silhouette or text edge that slides by ≤ 2 px finds its new colour next door and is
//         excused; a surface that flips colour (z-fighting, shadow acne, swimming texture) does not.
// Self-contained (no imports): stability.js also injects its source into the page.
export function flickerCount(a, b, w, h, thresh = 40, radius = 2) {
  let raw = 0, gate = 0;
  const far = (i, j) => Math.abs(a[i] - b[j]) > thresh || Math.abs(a[i + 1] - b[j + 1]) > thresh || Math.abs(a[i + 2] - b[j + 2]) > thresh;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = (y * w + x) * 4;
    if (!far(j, j)) continue;
    raw++;
    let explained = false;
    for (let dy = -radius; dy <= radius && !explained; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
      if (!far((yy * w + xx) * 4, j)) { explained = true; break; }
    }
    if (!explained) gate++;
  }
  const n = w * h;
  return {raw: 100 * raw / n, gate: 100 * gate / n};
}
