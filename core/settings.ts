import { heroWeapon } from "./heroes";
export const CUE_KEYS = ["hitMarkers", "damageNumbers", "lastHitWindow", "orbCues", "claimFlash", "missFeedback", "trackingGlow", "streakMeter"] as const;
export type CueKey = typeof CUE_KEYS[number];
export type Cues = Record<CueKey, boolean>;
export const CUE_LABELS: Record<CueKey, string> = { hitMarkers: "Hit markers", damageNumbers: "Damage numbers", lastHitWindow: "Last-hit window", orbCues: "Orb timing rings", claimFlash: "Secure/deny flash", missFeedback: "Miss feedback", trackingGlow: "On-target glow", streakMeter: "Streak meter" };
export type CuePreset = "learn" | "pro" | "custom";
export const presetCues = (p: "learn" | "pro"): Cues => Object.fromEntries(CUE_KEYS.map((k) => [k, p === "learn"])) as Cues;
export interface Settings { cm360: number; dpi: number; fov: number; difficulty: number; rawInput: boolean; durationS: number; cuePreset: CuePreset; cues: Cues; volume: number; muted: boolean; moveProfile: "classic" | "realistic"; heroWeapon: string; }
export const DEFAULTS: Settings = { cm360: 35, dpi: 800, fov: 90, difficulty: 1, rawInput: true, durationS: 60, cuePreset: "learn", cues: presetCues("learn"), volume: 0.6, muted: false, moveProfile: "classic", heroWeapon: "off" };
export function normalize(x: any): Settings {
  const s = { ...DEFAULTS, ...(x || {}) };
  const clamp = (v: any, lo: number, hi: number, d: number) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
  s.cm360 = clamp(s.cm360, 1, 300, 35); s.dpi = clamp(s.dpi, 100, 32000, 800); s.fov = clamp(s.fov, 60, 120, 90);
  s.difficulty = Math.round(clamp(s.difficulty, 0, 3, 1)); s.durationS = clamp(s.durationS, 15, 300, 60); s.rawInput = !!s.rawInput;
  s.cuePreset = ["learn", "pro", "custom"].includes(s.cuePreset) ? s.cuePreset : "learn";
  const base = s.cuePreset === "custom" ? presetCues("learn") : presetCues(s.cuePreset);
  s.cues = Object.fromEntries(CUE_KEYS.map((k) => [k, s.cuePreset === "custom" && typeof x?.cues?.[k] === "boolean" ? x.cues[k] : base[k]])) as Cues;
  s.volume = clamp(s.volume, 0, 1, 0.6); s.muted = !!s.muted; s.moveProfile = s.moveProfile === "realistic" ? "realistic" : "classic"; s.heroWeapon = heroWeapon(String(s.heroWeapon)) ? String(s.heroWeapon) : "off"; return s;
}
