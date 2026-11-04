export interface Settings { cm360: number; dpi: number; difficulty: number; }
const KEY = "aimlab.settings.v1";
export function load(): Settings { try { return { cm360: 35, dpi: 800, difficulty: 2, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { cm360: 35, dpi: 800, difficulty: 2 }; } }
export function save(s: Settings) { localStorage.setItem(KEY, JSON.stringify(s)); }
// radians per mouse count: 360 deg per (cm360 cm) at dpi counts/inch
export function radPerCount(s: Settings) { return (2 * Math.PI) / ((s.cm360 / 2.54) * s.dpi); }
