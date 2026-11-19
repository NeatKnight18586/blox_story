// engine/signs6.js — diegetic sign helper (Phase 4, R-SIGN-01). Pure sizing; episode.js builds the plate (opt-in spec.signs).
// One call: sign('DAY 19', {at, face, readFrom: 14, fov: 54}) → {text, lines, at, face, w, h, capH}: a plate whose cap height is
// ≥ 3 % of the frame height (+ 15 % margin) when seen from `readFrom` units at vertical fov `fov`. ≤ 3 words (R-SIGN-01).
// Cap height model of parts/sets4/common.js textPlate: the font is .72 × plate height / lines (canvas px), Lilita One caps ≈ .70 em,
// so capH = .504 × h / lines — valid while the text is not width-bound, which the aspect below guarantees.
export const CAP_FRAC = .03, MARGIN = 1.15, CAP_PER_H = .72 * .70;

export function splitLines(text, lines) {
  if (lines) return lines;
  const w = String(text).trim().split(/\s+/);
  return w.length === 3 && text.length > 12 ? [w.slice(0, 2).join(' '), w[2]] : [w.join(' ')];
}
export const frameHeightAt = (dist, fovDeg) => 2 * dist * Math.tan(fovDeg * Math.PI / 360);
export const capFraction = (capH, dist, fovDeg) => capH / frameHeightAt(dist, fovDeg);

export function sign(text, {at = [0, 3, 0], face = null, yaw = null, readFrom = 12, fov = 54, lines = null, color = '#f4efe2', ink = '#1c1a17', border = null, id = null} = {}) {
  const words = String(text).trim().split(/\s+/);
  if (words.length > 3) throw Error(`sign "${text}": ${words.length} words (R-SIGN-01: ≤ 3)`);
  const L = splitLines(text, lines), n = L.length, chars = Math.max(...L.map(s => s.length));
  const capH = CAP_FRAC * MARGIN * frameHeightAt(readFrom, fov);
  const h = capH * n / CAP_PER_H;
  const aspect = Math.max(1.2, 4.92 / n, .5 * chars / n);    // keeps textPlate's font under its 150 px cap and inside 90 % width
  return {id: id ?? String(text).toLowerCase().replace(/[^a-z0-9]+/g, '_'), text: String(text), lines: L, at, ...(face ? {face} : {}), ...(yaw !== null ? {yaw} : {}),
    w: +(h * aspect).toFixed(3), h: +h.toFixed(3), capH: +capH.toFixed(3), color, ink, ...(border ? {border} : {})};
}
