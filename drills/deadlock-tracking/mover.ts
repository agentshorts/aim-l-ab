import { MOVE } from "../../core/spec";
export type Mode = "walk" | "dash" | "slide" | "air" | "zip";
export class Mover {
  x = 0; y = 0; z = 15; vx = 0; vy = 0; vz = 0; mode: Mode = "walk"; tMode = 0; dir = 1; r: () => number; log: { mode: Mode; t: number }[] = []; t = 0;
  dashPeak = MOVE.dash.b1.peak; dashDur = MOVE.dash.b1.dur;
  constructor(public allowed: Mode[], seed = 3) { let s = seed; this.r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  set(m: Mode) { this.mode = m; this.tMode = 0; this.log.push({ mode: m, t: this.t });
    if (m === "dash") this.dir = this.r() < 0.5 ? -1 : 1;
    if (m === "air") { this.vy = MOVE.jumpV; }
    if (m === "zip") { this.y = 3; this.vy = 0; }
  }
  // dash speed profile: peak at start easing to walk by end (EST shape, peak and duration from spec)
  dashSpeed(t: number) { const k = Math.min(1, t / this.dashDur); return MOVE.walk + (this.dashPeak - MOVE.walk) * (1 - k) * (1 - k); }
  step(dt: number) {
    this.t += dt; this.tMode += dt;
    const lim = 9; // keep target in front arc
    switch (this.mode) {
      case "walk": this.vx = this.dir * MOVE.walk; if (this.tMode > 0.6 + this.r() * 0.8) this.pick(); break;
      case "dash": this.vx = this.dir * this.dashSpeed(this.tMode); if (this.tMode >= this.dashDur) this.set(this.allowed.includes("slide") && this.r() < 0.5 ? "slide" : "walk"); break;
      case "slide": { const sp = Math.abs(this.vx) - MOVE.slideFriction * 9.81 * dt * 10; this.vx = Math.sign(this.vx || this.dir) * Math.max(0, sp); if (sp < MOVE.walk) this.set("walk"); break; } // EST decel scale
      case "air": { this.vy -= MOVE.gravity * dt; const a = Math.abs(this.vx) < MOVE.airSlowCap ? MOVE.airAccelSlow : MOVE.airAccelFast;
        this.vx += -Math.sign(this.vx || 1) * a * dt * (this.tMode > 0.2 ? 1 : 0); if (this.y + this.vy * dt <= 0 && this.vy < 0) { this.y = 0; this.vy = 0; this.set("walk"); } break; }
      case "zip": this.vx = this.dir * MOVE.zipline.inner; if (this.tMode > 0.9) { this.y = 0; this.set("walk"); } break;
    }
    this.x += this.vx * dt; this.y += this.vy * dt; if (this.mode === "zip") this.y = 3;
    if (this.mode !== "air" && this.mode !== "zip") this.y = 0;
    if (Math.abs(this.x) > lim) { this.x = Math.sign(this.x) * lim; this.dir = -Math.sign(this.x); if (this.mode !== "air") this.vx = 0; }
  }
  pick() { const m = this.allowed[Math.floor(this.r() * this.allowed.length)]; this.dir = this.x > 4 ? -1 : this.x < -4 ? 1 : (this.r() < 0.5 ? -1 : 1); this.set(m); }
}
