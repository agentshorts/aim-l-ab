import * as THREE from "three";
import { Cues } from "./settings";
// 2D feedback overlay drawn over the 3D view: hit markers, floating numbers and labels, screen flashes, world-anchored rings and meters.
type Item = { kind: "marker" | "text" | "flash" | "label"; t0: number; dur: number; pos?: THREE.Vector3; text?: string; color: string; size?: number; kill?: boolean };
export type Ring = { pos: THREE.Vector3; frac: number; color: string; width?: number; r?: number; label?: string };
export class Fx {
  items: Item[] = []; rings: Ring[] = []; meter: { frac: number; text: string } | null = null; now = 0; cam: THREE.Camera | null = null; log: string[] = [];
  constructor(public canvas: HTMLCanvasElement, public cues: () => Cues) {}
  private push(i: Item) { this.items.push(i); this.log.push(i.kind + ":" + (i.text ?? "")); if (this.log.length > 500) this.log.shift(); }
  hitMarker(kill: boolean) { if (this.cues().hitMarkers) this.push({ kind: "marker", t0: this.now, dur: kill ? 0.35 : 0.18, color: kill ? "#ff5a3c" : "#ffffff", kill }); }
  number(pos: THREE.Vector3, text: string, color = "#fff") { if (this.cues().damageNumbers) this.push({ kind: "text", t0: this.now, dur: 0.7, pos: pos.clone(), text, color }); }
  label(pos: THREE.Vector3 | null, text: string, color: string, cue: keyof Cues = "claimFlash") { if (this.cues()[cue]) this.push({ kind: pos ? "text" : "label", t0: this.now, dur: 0.9, pos: pos?.clone(), text, color, size: 22 }); }
  flash(color: string, cue: keyof Cues = "claimFlash") { if (this.cues()[cue]) this.push({ kind: "flash", t0: this.now, dur: 0.25, color }); }
  clear() { this.items = []; this.rings = []; this.meter = null; }
  draw(now: number) {
    this.now = now; const c = this.canvas, g = c.getContext("2d")!, dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); const cx = W / 2, cy = H / 2;
    const proj = (p: THREE.Vector3) => { const v = p.clone().project(this.cam!); return v.z < 1 ? { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H } : null; };
    this.items = this.items.filter((i) => now - i.t0 < i.dur);
    for (const i of this.items) { const k = (now - i.t0) / i.dur; g.globalAlpha = 1 - k;
      if (i.kind === "flash") { const gr = g.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.7); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, i.color); g.globalAlpha = 0.35 * (1 - k); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      else if (i.kind === "marker") { const a = 6 + k * 4, b = a + (i.kill ? 9 : 6); g.strokeStyle = i.color; g.lineWidth = i.kill ? 3 : 2;
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { g.beginPath(); g.moveTo(cx + sx * a, cy + sy * a); g.lineTo(cx + sx * b, cy + sy * b); g.stroke(); } }
      else if (i.kind === "label") { g.font = `600 ${i.size ?? 18}px Oswald, sans-serif`; g.textAlign = "center"; g.fillStyle = i.color; g.fillText(i.text!, cx, cy - 60 - k * 20); }
      else if (i.pos && this.cam) { const p = proj(i.pos); if (!p) continue; g.font = `600 ${i.size ?? 16}px Oswald, sans-serif`; g.textAlign = "center"; g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,.7)"; const y = p.y - 10 - k * 30; g.strokeText(i.text!, p.x, y); g.fillStyle = i.color; g.fillText(i.text!, p.x, y); } }
    g.globalAlpha = 1;
    for (const r of this.rings) { if (!this.cam) break; const p = proj(r.pos); if (!p) continue; const rad = r.r ?? 18; g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = (r.width ?? 3) + 2; g.beginPath(); g.arc(p.x, p.y, rad, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = r.color; g.lineWidth = r.width ?? 3; g.beginPath(); g.arc(p.x, p.y, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, r.frac))); g.stroke();
      if (r.label) { g.font = "600 12px Oswald, sans-serif"; g.textAlign = "center"; g.fillStyle = r.color; g.fillText(r.label, p.x, p.y - rad - 5); } }
    if (this.meter) { const w = 160, x = cx - w / 2, y = cy + 48; g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(x, y, w, 6); g.fillStyle = "#e8a93c"; g.fillRect(x, y, w * Math.min(1, this.meter.frac), 6);
      g.font = "600 12px Oswald, sans-serif"; g.textAlign = "center"; g.fillStyle = "#e8e0cf"; g.fillText(this.meter.text, cx, y + 20); }
    this.rings = [];
  }
}
