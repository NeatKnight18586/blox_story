// TapCap Slime Guy presets (data). Colours from the rarity chart (prompt §2); bands are fractions of total height H.
export const BANDS = {head: .33, torso: .29, switch: .04, base: .34, tol: .02};
// rest-pose layout in H units (y = 0 at the feet); tuned so the visible front-view bands measure to BANDS (qa/proportions.json)
export const LAYOUT = {
  base: {y0: 0, y1: .34, wTop: .44, wBot: .40, notchW: .30, notchH: .12},
  switch: {y0: .34, y1: .38, w: .24},
  torso: {y0: .38, y1: .69, wAt67: .30, wBot: .48},
  head: {yb: .672, yt: .983, wTop: .352, wBot: .420},
  eye: {hOfHead: .22, wOfH: 1 / 3, sepOfBlockW: .545, yOfHead: .56},   // eye centres .5 of the VISIBLE head width (block + side drips) = .545 of the block width
};
export const COLORS = {
  frozen: {tier: 'core', body: '#25BFFF'}, grape: {tier: 'core', body: '#5A2A9C'}, bubblegum: {tier: 'core', body: '#FFA9D4'},
  midnight: {tier: 'core', body: '#121217', drip: '#45464E'}, banana: {tier: 'core', body: '#FFE12E'},
  pumpkin: {tier: 'rare', body: '#FF781C'}, strawberry: {tier: 'rare', body: '#E3234E'}, coffee: {tier: 'rare', body: '#B9875C'},
  demo: {tier: 'demo', body: '#9aa3b5', gradient: ['#3C4A6B', '#9AA6C4', '#F1F3F8']},   // gradient demo unit (form check)
  cosmic: {tier: 'ultra', body: '#9A5CFF', cosmic: ['#7A35FF', '#3FAEFF', '#FF9233'], glitter: 3.2},
};
export const PAINT = {cosmic: ['#7B3FD0', '#FF8A2A', '#2F7BEA'], banana: '#F2D23A'};
// Expressions (prompt §2): same pill eyes + thin arc mouth. eyeH/eyeTilt are multipliers / degrees (tops toward centre).
export const FACES = {
  default: {mouth: 'frown', sag: .012, eyeH: 1, eyeTilt: 0},
  hopeful: {mouth: 'smile', sag: .010, eyeH: 1, eyeTilt: 0},
  gasp: {mouth: 'oval', eyeH: 1.15, eyeTilt: 0},
  sad: {mouth: 'frown', sag: .021, eyeH: 1, eyeTilt: 8},
  joy: {mouth: 'smile', sag: .016, eyeH: .70, eyeTilt: 0},
};
// ID colours for the measured proportion render (flat, unlit)
export const FLAT = {head: '#ff0000', torso: '#00ff00', switch: '#0000ff', base: '#ffff00', eye: '#000000', mouth: '#ff00ff', print: '#00ff00'};
