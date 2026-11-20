// campaigns/tapcap/world/moods.js — the episode's 3 lighting presets (prompt §4) on top of the engine's Phase 5 moods
// (engine/moods7.json: post chain, grade, bloom, AO, DOF). Sky, sun and practicals are ours (no HDRI: a toy-photography sky dome).
//   0:00–0:38 dawnHope · 0:38–1:04 rainNight (nightMystery + stormAction rain) · 1:05–1:15 golden (goldenBittersweet)
export const ACTS = [{from: 0, to: 38, mood: 'dawnHope'}, {from: 38, to: 64.5, mood: 'rainNight'}, {from: 64.5, to: 75.16, mood: 'golden'}];
export const MOODS_TC = {
  dawnHope: {base: 'dawnHope', sky: ['#6FA8E8', '#BFE0F5', '#BFE0F5'], sun: {dir: [-.55, .42, -.72], color: '#FFD3A0', i: 2.6}, hemi: ['#CFE3FF', '#E8D5C0', .9],
    fill: {color: '#BFD6FF', i: .5}, rim: {color: '#FFE9D2', i: 1.2}, exposure: .64, fog: {color: '#F2DCC8', near: 70, far: 330}, wet: 0, spot: 1.4, clouds: '#FFF5EE'},
  rainNight: {base: 'nightMystery', rainFrom: 'stormAction', sky: ['#0B1426', '#17263F', '#22344F'], sun: {dir: [.4, .7, .35], color: '#8FB0FF', i: .65}, hemi: ['#3A5682', '#141B28', .55],
    fill: {color: '#6F8FC8', i: .35}, rim: {color: '#9CC4FF', i: 1.1}, exposure: .44, fog: {color: '#16223A', near: 30, far: 170}, wet: 1, spot: 1.3, clouds: '#2B3A55', practicals: '#FFC98A'},
  golden: {base: 'goldenBittersweet', sky: ['#7FA7D6', '#F5B57A', '#FFD49A'], sun: {dir: [-.35, .22, -.91], color: '#FFC77A', i: 3.0}, hemi: ['#FFD9B0', '#B88A6A', .7],
    fill: {color: '#C9B6FF', i: .4}, rim: {color: '#FFC77A', i: 2.4}, exposure: .74, fog: {color: '#F2B98A', near: 60, far: 300}, wet: .35, spot: 1.2, clouds: '#FFE0C2'},
};
export const SKY_EV = -.5;   // sky-only exposure (Pass B revision §3)
export const moodAt = t => (ACTS.find(a => t >= a.from && t < a.to) ?? ACTS.at(-1)).mood;
