// avatar-style/deltae.js — pure sRGB → Lab and CIEDE2000 (E4 G2 rank-colour gate). No three, node-testable.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), lin = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4, RAD = Math.PI / 180;
export function lab(h) {
  const [r, g, b] = hex(h).map(lin), x = (.4124 * r + .3576 * g + .1805 * b) / .95047, y = .2126 * r + .7152 * g + .0722 * b, z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
  const f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
export function deltaE2000(h1, h2) {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2), C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2, G = .5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2, Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2), H = (b, a) => { const h = Math.atan2(b, a) / RAD; return h < 0 ? h + 360 : h; }, hp1 = H(b1, ap1), hp2 = H(b2, ap2);
  const dL = L2 - L1, dC = Cp2 - Cp1; let dh = hp2 - hp1; if (Math.abs(dh) > 180) dh += dh > 0 ? -360 : 360;
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * RAD / 2), Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2; let hb = hp1 + hp2; if (Math.abs(hp1 - hp2) > 180) hb += hp1 + hp2 < 360 ? 360 : -360; hb /= 2;
  const T = 1 - .17 * Math.cos((hb - 30) * RAD) + .24 * Math.cos(2 * hb * RAD) + .32 * Math.cos((3 * hb + 6) * RAD) - .2 * Math.cos((4 * hb - 63) * RAD);
  const dT = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7)), Sl = 1 + .015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + .045 * Cpb, Sh = 1 + .015 * Cpb * T, Rt = -Math.sin(2 * dT * RAD) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
// Pure: the luma (Rec.709 on gamma-coded sRGB, 0..1) of a hex colour; the symbol gate's contrast unit.
export const luma = h => { const [r, g, b] = hex(h); return .2126 * r + .7152 * g + .0722 * b; };
