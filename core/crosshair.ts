// Reads the site's crosshair builder format (localStorage "dramalock-crosshair-v1", share link ?ch=).
// Precedence: URL ?ch= > localStorage > defaults. Order of ?ch= values matches KEYS, booleans 0/1.
export interface CrosshairConfig { r: number; g: number; b: number; gap: number; width: number; height: number; pipOpacity: number; dotOpacity: number; dotOutlineOpacity: number; pipBorder: boolean; staticGap: boolean; }
export const CROSSHAIR_KEY = "dramalock-crosshair-v1";
export const KEYS: (keyof CrosshairConfig)[] = ["r", "g", "b", "gap", "width", "height", "pipOpacity", "dotOpacity", "dotOutlineOpacity", "pipBorder", "staticGap"];
export const DEFAULT_CROSSHAIR: CrosshairConfig = { r: 0, g: 245, b: 255, gap: -3, width: 4, height: 10, pipOpacity: 1, dotOpacity: 0, dotOutlineOpacity: 0, pipBorder: false, staticGap: true };
const BOOL = new Set(["pipBorder", "staticGap"]);
export function sanitize(x: any): CrosshairConfig {
  const o: any = { ...DEFAULT_CROSSHAIR };
  if (x && typeof x === "object") for (const k of KEYS) { if (!(k in x)) continue; const v = x[k];
    if (BOOL.has(k)) o[k] = v === true || v === 1 || v === "1" || v === "true"; else if (Number.isFinite(+v)) o[k] = +v; }
  return o;
}
export function parseShare(s: string | null): CrosshairConfig | null {
  if (!s) return null; const p = s.split(","); if (p.length !== KEYS.length) return null;
  const o: any = {}; KEYS.forEach((k, i) => (o[k] = p[i].trim())); return sanitize(o);
}
export function toShare(c: CrosshairConfig) { return KEYS.map((k) => (typeof c[k] === "boolean" ? (c[k] ? 1 : 0) : c[k])).join(","); }
export function loadCrosshair(search = location.search, ls: Pick<Storage, "getItem"> = localStorage): { cfg: CrosshairConfig; source: "url" | "localStorage" | "default" } {
  const u = parseShare(new URLSearchParams(search).get("ch")); if (u) return { cfg: u, source: "url" };
  try { const raw = ls.getItem(CROSSHAIR_KEY); if (raw) return { cfg: sanitize(JSON.parse(raw)), source: "localStorage" }; } catch {}
  return { cfg: { ...DEFAULT_CROSSHAIR }, source: "default" };
}
// Geometry (ESTIMATED until checked against the site's preview renderer): four pips width x height px,
// inner edge at BASE_GAP + gap px from center (clamped >= 0); staticGap true means no bloom (trainer has no bloom anyway).
export const BASE_GAP = 8;
export type CrosshairRenderer = (g: CanvasRenderingContext2D, cx: number, cy: number, c: CrosshairConfig) => void;
export const drawCrosshair: CrosshairRenderer = (g, cx, cy, c) => {
  const col = `rgb(${c.r},${c.g},${c.b})`, w = c.width, h = c.height, d = Math.max(0, BASE_GAP + c.gap);
  cx = Math.round(cx); cy = Math.round(cy);
  const pips: [number, number, number, number][] = [[cx - w / 2, cy - d - h, w, h], [cx - w / 2, cy + d, w, h], [cx - d - h, cy - w / 2, h, w], [cx + d, cy - w / 2, h, w]];
  g.save();
  if (c.pipOpacity > 0) { g.globalAlpha = c.pipOpacity;
    if (c.pipBorder) { g.fillStyle = "#000"; for (const [x, y, a, b] of pips) g.fillRect(x - 1, y - 1, a + 2, b + 2); }
    g.fillStyle = col; for (const [x, y, a, b] of pips) g.fillRect(x, y, a, b); }
  const ds = Math.max(2, w);
  if (c.dotOutlineOpacity > 0) { g.globalAlpha = c.dotOutlineOpacity; g.fillStyle = "#000"; g.fillRect(cx - ds / 2 - 1, cy - ds / 2 - 1, ds + 2, ds + 2); }
  if (c.dotOpacity > 0) { g.globalAlpha = c.dotOpacity; g.fillStyle = col; g.fillRect(cx - ds / 2, cy - ds / 2, ds, ds); }
  g.restore();
};
let renderer: CrosshairRenderer = drawCrosshair;
export const setCrosshairRenderer = (r: CrosshairRenderer) => { renderer = r; };
export const renderCrosshair: CrosshairRenderer = (g, x, y, c) => renderer(g, x, y, c);
