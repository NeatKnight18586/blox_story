// engine/troupe.js — Season 1 troupe slots (Amendment A4 G2). Pure: resolves an episode cast entry that names a slot
// into a full actor preset. Fixed per slot: skin, hair, face, scale (who they are). Per episode: outfit, accessories,
// tool and the role name (what they wear and who they play). AFK is fixed entirely (grey classic, buzz, 0.4, frozen).
//   cast entry: {style: 'v2', troupe: 'LEAD' | 'SECOND' | 'LITTLE' | 'RIVAL' | 'ELDER' | 'AFK', role: 'Kit', outfit: {...},
//                accessories: [...], tool, face}
export const SLOTS = ['LEAD', 'SECOND', 'LITTLE', 'RIVAL', 'ELDER'];
const FIXED = ['skin', 'hair', 'scale', 'tier'];
export function resolveTroupe(entry, data) {
  const slot = entry.troupe;
  if (slot === 'AFK') { const {expressions, pose, ...p} = data.AFK; return {...p, hair: {...p.hair}}; }
  const base = data.troupe?.[slot]; if (!base) throw Error('unknown troupe slot ' + slot);
  const {expressions, ...p} = base, out = {...p, hair: {...p.hair}};
  if (entry.outfit) out.outfit = {...entry.outfit};
  if (entry.accessories) out.accessories = entry.accessories;
  if (entry.tool) out.tool = entry.tool;
  if (entry.face) out.face = entry.face;
  out.tag = entry.role ? {name: entry.role, role: entry.roleLine ?? null} : null;
  for (const k of Object.keys(entry.with ?? {})) if (!FIXED.includes(k)) out[k] = entry.with[k];   // slots keep who they are
  return out;
}
