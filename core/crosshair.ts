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
// Matches the site's crosshair builder preview (assets/js/crosshair-generator.js + assets/css/app.css):
// pip inner edge offset = max(0, height/2 + gap) px; pips are width x height; pipBorder = 1 px rgba(0,0,0,.92) ring;
// the element opacity (pipOpacity) applies to the pip and its ring. Dot is a fixed 4x4 px with a 1 px black ring at
// dotOutlineOpacity, both multiplied by dotOpacity. staticGap=false animates +8 px on the site; the trainer has no bloom, so it draws static.
export const pipOffset = (c: CrosshairConfig) => Math.max(0, c.height / 2 + c.gap);
export const DOT_SIZE = 4;
const ring = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  g.fillRect(x - 1, y - 1, w + 2, 1); g.fillRect(x - 1, y + h, w + 2, 1); g.fillRect(x - 1, y, 1, h); g.fillRect(x + w, y, 1, h);
};
export type CrosshairRenderer = (g: CanvasRenderingContext2D, cx: number, cy: number, c: CrosshairConfig) => void;
export const drawCrosshair: CrosshairRenderer = (g, cx, cy, c) => {
  const col = `rgb(${c.r},${c.g},${c.b})`, w = c.width, h = c.height, d = pipOffset(c);
  cx = Math.round(cx); cy = Math.round(cy);
  const pips: [number, number, number, number][] = [[cx - w / 2, cy - d - h, w, h], [cx - w / 2, cy + d, w, h], [cx - d - h, cy - w / 2, h, w], [cx + d, cy - w / 2, h, w]];
  g.save();
  if (c.pipOpacity > 0 && w > 0 && h > 0) {
    if (c.pipBorder) { g.globalAlpha = c.pipOpacity * 0.92; g.fillStyle = "#000"; for (const p of pips) ring(g, ...p); }
    g.globalAlpha = c.pipOpacity; g.fillStyle = col; for (const [x, y, a, b] of pips) g.fillRect(x, y, a, b);
  }
  if (c.dotOpacity > 0) {
    const x = cx - DOT_SIZE / 2, y = cy - DOT_SIZE / 2;
    if (c.dotOutlineOpacity > 0) { g.globalAlpha = c.dotOpacity * c.dotOutlineOpacity; g.fillStyle = "#000"; ring(g, x, y, DOT_SIZE, DOT_SIZE); }
    g.globalAlpha = c.dotOpacity; g.fillStyle = col; g.fillRect(x, y, DOT_SIZE, DOT_SIZE);
  }
  g.restore();
};
let renderer: CrosshairRenderer = drawCrosshair;
export const setCrosshairRenderer = (r: CrosshairRenderer) => { renderer = r; };
export const renderCrosshair: CrosshairRenderer = (g, x, y, c) => renderer(g, x, y, c);
