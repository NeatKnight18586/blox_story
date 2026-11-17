// engine/heroread.js — hero readability without tags (owner rule for Season 1, after §2c "no labels"). Pure.
//   rimFor(size, subject, camPos, H)   soft rim light from behind the shot's subject: wides and mediums; off in close-ups
//   crowdColours(members, avoid)       no crowd member wears a subject's main outfit colour (or anything close to it)
//   crowdClashes(points, subject, main) crowd members within 6 units of the subject wearing (near) its main colour
//   wideCentred(x)                     in wides the subject stays inside the middle 60 % of the frame width
export const RIM = {wide: 3.4, medium: 2.4, back: 5.5, up: 3.8, distance: 16, angle: .3, penumbra: .85, decay: 1.2, color: '#e4edff'};
export const SUBJECT_BAND = [.2, .8];      // middle 60 % of the frame width
export const CLASH = {radius: 6, rgb: 90};  // "the same colour": RGB distance (0–441) below 90
export const CROWD_SAFE = ['#7a8a96', '#9a7f62', '#6f8f6a', '#8c6f8f', '#a8a07a', '#6c7f9e', '#b07a6a', '#8a8a8a', '#5f8c86', '#9c8aa8'];

const hex = c => { const s = String(c).replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
export const rgbDist = (a, b) => { const x = hex(a), y = hex(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

// Rim light (SpotLight, no shadow): behind the subject as seen from the camera, above the head, aimed at the upper chest.
export function rimFor(size, subject, camPos, H = 5.3) {
  if (!subject || !camPos || !['wide', 'medium'].includes(size)) return null;   // off in close-ups and inserts
  let dx = subject[0] - camPos[0], dz = subject[2] - camPos[2]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const chest = [subject[0], subject[1] + .7 * H, subject[2]];
  return {position: [subject[0] + dx * RIM.back, subject[1] + H * .72 + RIM.up, subject[2] + dz * RIM.back], target: chest, intensity: RIM[size],
    distance: RIM.distance, angle: RIM.angle, penumbra: RIM.penumbra, decay: RIM.decay, color: RIM.color};
}

// Crowd colours (pure): a member whose shirt or trousers sit within CLASH.rgb of any avoided colour gets the first safe
// colour that is far from every avoided colour (seeded by its index so neighbours differ).
export function crowdColours(members, avoid = [], palette = CROWD_SAFE, min = CLASH.rgb) {
  if (!avoid.length) return members;
  const safe = palette.filter(p => avoid.every(a => rgbDist(p, a) >= min * 1.2)), pick = i => safe[i % safe.length] ?? '#8a8a8a';
  return members.map(m => {
    const near = c => avoid.some(a => rgbDist(c, a) < min);
    return near(m.shirt) || near(m.pants) ? {...m, shirt: near(m.shirt) ? pick(m.i) : m.shirt, pants: near(m.pants) ? pick(m.i + 3) : m.pants} : m;
  });
}
// Check (pure): members {x, z, shirt} within CLASH.radius of the subject wearing (near) its main colour.
export function crowdClashes(members, subject, main, radius = CLASH.radius, min = CLASH.rgb) {
  return members.filter(m => Math.hypot(m.x - subject[0], m.z - subject[2]) <= radius && rgbDist(m.shirt, main) < min);
}
export const wideCentred = x => x >= SUBJECT_BAND[0] && x <= SUBJECT_BAND[1];
