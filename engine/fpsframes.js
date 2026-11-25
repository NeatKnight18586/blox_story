// engine/fpsframes.js — Kit 1: frame-counted timings are authored at 24 fps and stay time-based at high frame rates (pure).
// framesFor(n24, fps) = how many frames last as long as n24 frames at 24 fps. Below 48 fps the authored count is kept as is
// (every 24/30 fps spec renders exactly as before); at ≥ 48 fps (opt-in spec "fps": 60) it scales, rounded to the nearest frame.
export const HIGH_FPS = 48;
export const framesFor = (n24, fps = 24) => fps >= HIGH_FPS ? Math.max(1, Math.round(n24 * fps / 24)) : n24;
