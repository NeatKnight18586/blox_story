// engine/moods7.js — Retention Engine mood presets (pure; data in engine/moods7.json; R-LOOK-02, R-LENS-01).
//   moodLocation(loc, mood) → a parts/location.js location with the mood's HDRI, exposure, env, fog and sun
//   postFor(mood, {shot, t, acts}) → engine/post7.js settings for one frame (DOF only on emotion-lens / close shots; act temperature shift)
//   wbGains(temp, tint) → white-balance multipliers [r, g, b]; actOf(t, acts) → 1…4
export const MOODS = ['dawnHope', 'overcastDread', 'goldenBittersweet', 'nightMystery', 'stormAction'];

export function moodLocation(loc, m) {
  return {...loc, exposure: m.exposure, env: {...(loc.env ?? {}), intensity: m.env},
    backdrop: {...(loc.backdrop ?? {}), type: loc.backdrop?.type === 'hdri' ? 'hdri' : 'groundedSkybox', hdri: m.hdri, rotation: m.rotation ?? 0, intensity: m.backdrop ?? 1},
    fog: m.fog ? {...m.fog} : loc.fog, sun: {...(loc.sun ?? {}), ...m.sun, az: undefined, el: undefined}};
}
export const actOf = (t, acts) => !acts?.length ? 1 : 1 + acts.filter(a => t >= a).length;
export const wbGains = (temp = 0, tint = 0) => { const g = [1 + temp, 1 - tint * .5, 1 - temp]; const m = (g[0] + g[1] + g[2]) / 3; return g.map(v => +(v / m).toFixed(4)); };
export function wantsDof(shot = {}) { return shot.lens === 'emotion' || shot.size === 'close' || (shot.mm ?? 0) >= 70; }
export function postFor(m, {shot = {}, t = 0, acts = null, focus = null} = {}) {
  const act = actOf(t, acts), temp = (m.grade?.temp ?? 0) + (m.acts?.[act - 1] ?? 0);
  return {bloom: m.bloom, rays: m.rays, ao: m.ao, rain: m.rain ?? null, act,
    dof: wantsDof(shot) && focus ? {...m.dof, focus} : null,
    grade: {...m.grade, temp, gains: wbGains(temp, m.grade?.tint ?? 0)}};
}
