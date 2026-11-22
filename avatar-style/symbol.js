// avatar-style/symbol.js — E4 (unranked) birth symbol, PURE data (no three): rank → size / glow, the five shapes as vector paths, the
// opt-in cast field `symbol: {shape, color, rank}` and the state `symbolDark` (STOLEN: grey #5A5A60, no glow). The decal itself
// (emissive, on the back of the RIGHT hand, never the face) is built by avatar-style/symbol3d.js. The HERO never gets one: a hard error.
export const RANKS = ['D', 'C', 'B', 'A', 'S'];
export const SHAPES = ['leaf', 'wave', 'flame', 'crystal', 'lightning'];
export const DARK_COLOR = '#5A5A60';
// The five rank colours (owner brief; G2 pairwise ΔE2000 ≥ 20). C was #2EC4C4: 19.2 from A's ice blue → nudged to #18C4C0 (ΔE 1.7 from the brief's value).
export const RANK_LOOK = {D: {shape: 'leaf', color: '#9BD48A'}, C: {shape: 'wave', color: '#18C4C0'}, B: {shape: 'flame', color: '#FF8A2A'}, A: {shape: 'crystal', color: '#8FD3FF'}, S: {shape: 'lightning', color: '#FFC531'}};
// Size = the decal's edge in studs (S = 2 × D); glow = additive halo intensity 0..1 and radius as a multiple of the size.
export const RANK_SIZE = {D: .22, C: .27, B: .32, A: .38, S: .44}, RANK_GLOW = {D: .22, C: .38, B: .55, A: .75, S: 1}, RANK_HALO = {D: 1.5, C: 1.7, B: 1.9, A: 2.2, S: 2.6};
export const rankIndex = r => RANKS.indexOf(r);
export function symbolSpec(sym, {dark = false} = {}) {
  if (!sym) return null;
  if (!RANKS.includes(sym.rank)) throw Error(`symbol rank "${sym.rank}" is not one of ${RANKS.join(' ')}`);
  if (!SHAPES.includes(sym.shape)) throw Error(`symbol shape "${sym.shape}" is not one of ${SHAPES.join(' ')}`);
  return {shape: sym.shape, rank: sym.rank, color: dark ? DARK_COLOR : sym.color ?? RANK_LOOK[sym.rank].color, size: RANK_SIZE[sym.rank], glow: dark ? 0 : RANK_GLOW[sym.rank], halo: dark ? 1 : RANK_HALO[sym.rank], dark};
}
// The hero (cast key `hero`, troupe slot HERO, or preset.hero) has bare hands: any symbol on it is an error.
export function symbolHeroError(who, hasSymbol) { return hasSymbol && /^(hero|HERO)$/.test(who) ? `${who}: the HERO never gets a birth symbol (bare hands, always)` : null; }
export function assertNoHeroSymbol(who, hasSymbol) { const e = symbolHeroError(who, hasSymbol); if (e) throw Error(e); }
// Shapes: unit box [-.5, .5] (y up). {fills: [{pts, tone}], strokes: [{pts, w, tone}]}; tone lightens (>1) / darkens (<1) the colour.
const sine = (n, a, ph, y0) => Array.from({length: n + 1}, (_, i) => { const x = -.4 + .8 * i / n; return [x, y0 + a * Math.sin(x * 9 + ph)]; });
export const SHAPE_PATHS = {
  leaf: {fills: [{pts: [[0, .5], [.14, .36], [.26, .16], [.3, -.06], [.2, -.26], [.06, -.38], [0, -.4], [-.06, -.38], [-.2, -.26], [-.3, -.06], [-.26, .16], [-.14, .36]], tone: 1}],
    strokes: [{pts: [[0, .38], [0, -.5]], w: .07, tone: .62}, {pts: [[0, .02], [.17, .14]], w: .05, tone: .62}, {pts: [[0, -.14], [-.17, -.02]], w: .05, tone: .62}]},
  wave: {fills: [], strokes: [{pts: sine(14, .09, 0, .18), w: .17, tone: 1}, {pts: sine(14, .09, .9, -.14), w: .17, tone: 1}]},
  flame: {fills: [{pts: [[.04, .5], [.2, .26], [.32, .0], [.3, -.22], [.16, -.42], [0, -.5], [-.16, -.42], [-.3, -.22], [-.3, 0], [-.16, .2], [-.12, .02], [-.02, .22]], tone: 1}, {pts: [[0, -.04], [.12, -.18], [.1, -.34], [0, -.4], [-.1, -.34], [-.12, -.18]], tone: 1.25}], strokes: []},
  crystal: {fills: [{pts: [[0, .5], [.27, .2], [.27, -.2], [0, -.5], [-.27, -.2], [-.27, .2]], tone: 1}], strokes: [{pts: [[0, .5], [0, -.5]], w: .04, tone: .7}, {pts: [[-.27, .2], [0, -.1], [.27, .2]], w: .04, tone: .7}, {pts: [[0, -.1], [0, -.5]], w: .04, tone: .7}]},
  lightning: {fills: [{pts: [[.24, .5], [-.3, -.04], [-.02, -.04], [-.18, -.5], [.32, .08], [.04, .08], [.3, .5]], tone: 1}], strokes: []},
};
// luma (Rec.709, gamma-coded sRGB 0..1) of a colour: the unit of the symbol read gate.
export const lumaOf = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return .2126 * r + .7152 * g + .0722 * b; };
