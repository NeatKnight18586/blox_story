// engine/troupe.js — Season 1 troupe slots (Amendment A4 G2). Pure: resolves an episode cast entry that names a slot
// into a full actor preset. Fixed per slot: skin, hair, face, scale (who they are). Per episode: outfit, accessories,
// tool and the role name (what they wear and who they play). AFK is fixed entirely (grey classic, buzz, 0.4, frozen).
//   cast entry: {style: 'v2', troupe: 'LEAD' | 'SECOND' | 'LITTLE' | 'RIVAL' | 'ELDER' | 'AFK', role: 'Kit', outfit: {...},
//                accessories: [...], tool, face}
export const SLOTS = ['LEAD', 'SECOND', 'LITTLE', 'RIVAL', 'ELDER'];
const FIXED = ['skin', 'hair', 'scale', 'tier', 'build', 'age', 'body', 'regions'];
export function resolveTroupe(entry, data) {
  const slot = entry.troupe;
  if (slot === 'AFK') { const {expressions, pose, ...p} = data.AFK; return {...p, hair: {...p.hair}, faceStyle: entry.faceStyle ?? 'v3'}; }   // Faces v3 default for the troupe
  // build + age are fixed per slot (A5 Decision 5): the kids are youth, the elder an adult
  const base = data.troupe?.[slot]; if (!base) throw Error('unknown troupe slot ' + slot);
  const {expressions, ...p} = base, out = {...p, hair: p.hair ? {...p.hair} : null};   // HERO (cast/hero.json): no hair
  if (entry.costume) { const k = data.costumes?.[entry.costume]; if (!k || k.slot !== slot) throw Error(`costume ${entry.costume} is not for slot ${slot}`); const {slot: _s, ...o} = k; Object.assign(out, o, {hair: o.hair ? {...o.hair} : out.hair}); }   // E1 (opt-in): a named re-costume that may change the slot's look (cast/troupe6.json costumes)
  if (entry.outfit) out.outfit = {...entry.outfit};
  if (entry.accessories) out.accessories = entry.accessories;
  if (entry.tool) out.tool = entry.tool;
  if (entry.face) out.face = entry.face;
  out.tag = entry.role ? {name: entry.role, role: entry.roleLine ?? null} : null;
  out.faceStyle = entry.faceStyle ?? p.faceStyle ?? 'v3';   // Faces v3 default for the troupe; HERO carries v5
  for (const k of Object.keys(entry.with ?? {})) if (!FIXED.includes(k)) out[k] = entry.with[k];   // slots keep who they are
  return out;
}

// ---- A5 §E Decision 1: night palette rule (pure). In a shot whose look is night/nightBright, every hero and troupe outfit
// colour (main, legs, accent, trim) has HSL lightness ≥ 0.32, so the cast stays brighter than a night ground. Crowds and
// AFK are exempt. Heroes = troupe actors except AFK, plus any cast entry with `hero: true`.
export const NIGHT_LOOKS = ['night', 'nightBright'], NIGHT_MIN_L = .32, OUTFIT_KEYS = ['main', 'legs', 'accent', 'trim'];
export function lightness(hex) {
  const n = parseInt(hex.replace('#', ''), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}
export function nightPaletteCheck(spec, data) {
  const night = NIGHT_LOOKS.includes(spec.look) || (spec.shots ?? []).some(s => NIGHT_LOOKS.includes(s.look)), out = [];
  if (!night) return out;
  for (const [name, c] of Object.entries(spec.cast ?? {})) {
    if (!(c.hero || (c.troupe && c.troupe !== 'AFK'))) continue;
    const outfit = c.troupe ? (c.outfit ?? data.troupe[c.troupe].outfit) : (c.outfit ?? {});
    for (const k of OUTFIT_KEYS) if (typeof outfit[k] === 'string' && lightness(outfit[k]) < NIGHT_MIN_L) out.push({actor: name, key: k, color: outfit[k], l: +lightness(outfit[k]).toFixed(3)});
  }
  return out;
}
