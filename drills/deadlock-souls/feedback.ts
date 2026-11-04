// Pure mapping from a trooper shot result to its feedback, so it can be unit tested without a canvas or audio.
export const DMG = 40; // drill weapon, see spec
export const AMBER = "#e8a93c";
export type TrooperFeedback = { marker: "kill" | "hit" | null; number: { text: string; color?: string } | null; sound: "lasthit" | "hit" | null };
export function trooperFeedback(res: string, dmg = DMG): TrooperFeedback {
  if (res === "lasthit") return { marker: "kill", number: { text: "LAST HIT", color: AMBER }, sound: "lasthit" };
  if (res === "hit") return { marker: "hit", number: { text: String(dmg) }, sound: "hit" };
  return { marker: null, number: null, sound: null };
}
