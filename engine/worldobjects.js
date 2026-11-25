// engine/worldobjects.js — E3 (opt-in spec.worldObjects): a `prop:<name>` subject names an object the world builds itself
// (parts/library6.json `worldObjects`; giantHand = the story6 hand). Pure check, run by episode.js after the world is built:
// each named object exists exactly once in the scene and is never also a spec insert prop (no duplicate mesh).
export function worldObjectErrors(names = [], countOf = () => 0, specProps = []) {
  const out = [];
  for (const n of names) {
    const k = countOf(n); if (k !== 1) out.push(`spec.worldObjects: ${k} scene objects named ${n} (need exactly 1)`);
    if (specProps.some(p => p.prop === n || p.id === n)) out.push(`spec.worldObjects: ${n} is also a spec prop (duplicate insert)`);
  }
  return out;
}
