// engine/nolabels.js — owner rule "no labels" (docs/season1/SEASON_1.md §2c; permanent from episode 1). Pure.
// Season 1 episodes draw no name tags, role tags, AFK tag, chat bubbles, class cards, and no overhead tag/stat/card/icon UI
// on people or objects. Text is allowed only on real in-world objects (scoreboard, clock, note, sign, switch: a rule-UI item
// with facing 'world' on a scene object, of a text kind) and in the captions.
//   labelsOff(spec)            → true for `season: 1` (the default there) or `labels: false`; "Nobody" and older specs: false
//   uiAllowed(item, castNames) → may this spec.ui item be drawn when labels are off?
//   stripLabels(spec)          → a copy the renderer uses: label fields removed, cards off, only in-world UI kept
//   labelIssues(spec)          → plan.js `noLabels` errors for a Season 1 spec that still asks for any label
export const WORLD_TEXT_KINDS = ['plate', 'stat', 'bar', 'checklist'];   // text that can be painted on a real object
export const CAST_LABEL_KEYS = ['tag', 'tags', 'bubble', 'stat'];

export const labelsOff = spec => spec?.labels === false || (spec?.season === 1);
const targetActor = (to, castNames) => castNames.includes(String(to ?? '').split('.')[0]);
export function uiAllowed(u, castNames = []) {
  return (u.facing ?? 'screen') === 'world' && WORLD_TEXT_KINDS.includes(u.kind) && !targetActor(u.to, castNames);
}
const hasLabel = (c, k) => {
  const v = c?.[k]; if (v === undefined || v === null || v === false) return false;
  if (Array.isArray(v)) return v.some(e => Array.isArray(e) ? e.slice(1).some(x => x !== null && x !== undefined && x !== '') : !!e);
  return true;
};
const reveals = spec => [...(spec.classReveals ?? []), ...(spec.shots ?? []).flatMap(s => [].concat(s.classReveal ?? []))];

export function labelIssues(spec) {
  if (!spec?.season && spec?.labels !== false) return [];
  const out = [], names = Object.keys(spec.cast ?? {});
  if (spec.season === 1 && spec.labels === true) out.push('noLabels: Season 1 cannot set "labels": true (owner rule §2c)');
  for (const [n, c] of Object.entries(spec.cast ?? {})) for (const k of CAST_LABEL_KEYS) if (hasLabel(c, k)) out.push(`noLabels: cast ${n} uses "${k}"`);
  for (const [n, c] of Object.entries(spec.cast ?? {})) if (hasLabel(c?.with, 'tag')) out.push(`noLabels: cast ${n} uses "with.tag"`);
  for (const r of reveals(spec)) if (r.card !== false) out.push(`noLabels: classReveal ${r.actor}/${r.cls} draws a class card (set card: false)`);
  for (const e of spec.effects ?? []) if (e.type === 'card') out.push(`noLabels: effect "card" at ${e.at} s`);
  for (const u of spec.ui ?? []) if (!uiAllowed(u, names)) out.push(`noLabels: ui ${u.id ?? u.kind} (${u.kind}, ${u.facing ?? 'screen'}, on ${u.to}) is a label; only world-facing text on real objects is allowed`);
  return out;
}

export function stripLabels(spec) {
  if (!labelsOff(spec)) return spec;
  const names = Object.keys(spec.cast ?? {}), out = {...spec, cast: {}};
  for (const [n, c] of Object.entries(spec.cast ?? {})) {
    const x = {...c, noTag: true}; for (const k of CAST_LABEL_KEYS) delete x[k];
    if (x.with) { x.with = {...x.with}; delete x.with.tag; }
    out.cast[n] = x;
  }
  out.ui = (spec.ui ?? []).filter(u => uiAllowed(u, names));
  out.effects = (spec.effects ?? []).filter(e => e.type !== 'card');
  out.classReveals = (spec.classReveals ?? []).map(r => ({...r, card: false}));
  out.shots = (spec.shots ?? []).map(s => s.classReveal ? {...s, classReveal: Array.isArray(s.classReveal) ? s.classReveal.map(r => ({...r, card: false})) : {...s.classReveal, card: false}} : s);
  return out;
}
