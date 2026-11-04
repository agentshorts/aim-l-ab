export interface Settings { cm360: number; dpi: number; fov: number; difficulty: number; rawInput: boolean; durationS: number; }
export const DEFAULTS: Settings = { cm360: 35, dpi: 800, fov: 90, difficulty: 1, rawInput: true, durationS: 60 };
export function normalize(x: any): Settings {
  const s = { ...DEFAULTS, ...(x || {}) };
  const clamp = (v: any, lo: number, hi: number, d: number) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
  s.cm360 = clamp(s.cm360, 1, 300, 35); s.dpi = clamp(s.dpi, 100, 32000, 800); s.fov = clamp(s.fov, 60, 120, 90);
  s.difficulty = Math.round(clamp(s.difficulty, 0, 3, 1)); s.durationS = clamp(s.durationS, 15, 300, 60); s.rawInput = !!s.rawInput; return s;
}
