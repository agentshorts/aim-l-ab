import { Settings, normalize } from "./settings";
export interface RunResult { drill: string; at: string; difficulty: number; score: number; metrics: Record<string, number>; }
export interface ExportBlob { app: "aimlab"; version: 1; settings: Settings; results: RunResult[]; }
// Storage seam: LocalStore now; a WordPress REST backend can implement the same interface later.
export interface Store {
  loadSettings(): Promise<Settings>; saveSettings(s: Settings): Promise<void>;
  addResult(r: RunResult): Promise<void>; results(drill?: string): Promise<RunResult[]>;
  exportAll(): Promise<ExportBlob>; importAll(b: unknown): Promise<number>;
}
const KS = "aimlab.settings.v2", KR = "aimlab.results.v1";
export class LocalStore implements Store {
  constructor(private ls: Pick<Storage, "getItem" | "setItem"> = localStorage) {}
  private read<T>(k: string, d: T): T { try { const v = this.ls.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
  async loadSettings() { return normalize(this.read(KS, this.read("aimlab.settings.v1", {}))); }
  async saveSettings(s: Settings) { this.ls.setItem(KS, JSON.stringify(normalize(s))); }
  async addResult(r: RunResult) { const all = this.read<RunResult[]>(KR, []); all.push(r); this.ls.setItem(KR, JSON.stringify(all.slice(-2000))); }
  async results(drill?: string) { const a = this.read<RunResult[]>(KR, []); return drill ? a.filter((r) => r.drill === drill) : a; }
  async exportAll(): Promise<ExportBlob> { return { app: "aimlab", version: 1, settings: await this.loadSettings(), results: await this.results() }; }
  async importAll(b: any) {
    if (!b || b.app !== "aimlab" || !Array.isArray(b.results)) throw new Error("not an aimlab export");
    const ok = b.results.filter((r: any) => r && typeof r.drill === "string" && Number.isFinite(r.score) && typeof r.at === "string");
    const cur = await this.results(); const seen = new Set(cur.map((r) => r.drill + r.at));
    const merged = cur.concat(ok.filter((r: RunResult) => !seen.has(r.drill + r.at))).sort((a, b) => a.at.localeCompare(b.at));
    this.ls.setItem(KR, JSON.stringify(merged)); if (b.settings) await this.saveSettings(b.settings); return merged.length - cur.length;
  }
}
// Placeholder for the WordPress deploy: expects a plugin exposing /wp-json/aimlab/v1/{settings,results} with a REST nonce.
// Not implemented server side yet; falls back to LocalStore for reads it cannot serve.
export class WordPressStore implements Store {
  constructor(private base: string, private nonce: string, private local = new LocalStore()) {}
  private async req(path: string, init?: RequestInit) { const r = await fetch(this.base + path, { ...init, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-WP-Nonce": this.nonce } }); if (!r.ok) throw new Error(String(r.status)); return r.json(); }
  async loadSettings() { try { return normalize(await this.req("/settings")); } catch { return this.local.loadSettings(); } }
  async saveSettings(s: Settings) { await this.local.saveSettings(s); try { await this.req("/settings", { method: "POST", body: JSON.stringify(s) }); } catch {} }
  async addResult(r: RunResult) { await this.local.addResult(r); try { await this.req("/results", { method: "POST", body: JSON.stringify(r) }); } catch {} }
  async results(d?: string) { try { return await this.req("/results" + (d ? "?drill=" + encodeURIComponent(d) : "")); } catch { return this.local.results(d); } }
  exportAll() { return this.local.exportAll(); } importAll(b: unknown) { return this.local.importAll(b); }
}
export function bestOf(rs: RunResult[], difficulty?: number) { const f = rs.filter((r) => difficulty === undefined || r.difficulty === difficulty); return f.length ? f.reduce((a, b) => (b.score > a.score ? b : a)) : null; }
export function getStore(): Store { const wp = (window as any).AIMLAB_WP; return wp?.restBase ? new WordPressStore(wp.restBase, wp.nonce) : new LocalStore(); }
