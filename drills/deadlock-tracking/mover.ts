import { MOVE } from "../../core/spec";
// Mover state machine (see specs/state_machines_v1.md)
// walk -> dash | air | zip ; dash -> slide | walk ; slide -> walk ; air -> walk (land) ; zip -> air (drop keeps momentum)
export type Mode = "walk" | "dash" | "slide" | "air" | "zip";
const NEXT: Record<Mode, Mode[]> = { walk: ["dash", "air", "zip", "walk"], dash: ["slide", "walk"], slide: ["walk"], air: ["walk"], zip: ["air"] };
export class Mover {
  x = 0; y = 0; z = 15; vx = 0; vy = 0; mode: Mode = "walk"; tMode = 0; dir = 1; r: () => number; log: { mode: Mode; t: number }[] = []; t = 0; illegal = 0;
  dashPeak = MOVE.dash.b1.peak; dashDur = MOVE.dash.b1.dur; walkFor = 1; lim = 9;
  constructor(public allowed: Mode[], seed = 3) { let s = seed; this.r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  set(m: Mode) {
    if (m !== this.mode && !NEXT[this.mode].includes(m)) { this.illegal++; return; }
    this.mode = m; this.tMode = 0; this.log.push({ mode: m, t: this.t });
    if (m === "walk") { this.vy = 0; this.y = 0; this.walkFor = 0.6 + this.r() * 0.8; }
    if (m === "air") { if (this.y <= 0) this.vy = MOVE.jumpV; }
    if (m === "zip") { this.y = 3; this.vy = 0; }
  }
  // dash speed profile: peak at start easing to walk by end (shape ESTIMATED, peak and duration from spec)
  dashSpeed(t: number) { const k = Math.min(1, t / this.dashDur); return MOVE.walk + (this.dashPeak - MOVE.walk) * (1 - k) * (1 - k); }
  step(dt: number) {
    this.t += dt; this.tMode += dt;
    switch (this.mode) {
      case "walk": this.vx = this.dir * MOVE.walk; if (this.tMode > this.walkFor) this.pick(); break;
      case "dash": this.vx = this.dir * this.dashSpeed(this.tMode); if (this.tMode >= this.dashDur - 1e-9) this.set(this.allowed.includes("slide") && this.r() < 0.5 ? "slide" : "walk"); break;
      case "slide": { const sp = Math.abs(this.vx) - MOVE.slideFriction * 9.81 * dt * 10; this.vx = this.dir * Math.max(0, sp); if (sp < MOVE.walk) this.set("walk"); break; } // decel scale ESTIMATED
      case "air": { this.vy -= MOVE.gravity * dt; const a = Math.abs(this.vx) < MOVE.airSlowCap ? MOVE.airAccelSlow : MOVE.airAccelFast;
        if (this.tMode > 0.2) this.vx -= this.dir * a * dt; break; } // air strafe back toward center
      case "zip": this.vx = this.dir * MOVE.zipline.inner; if (this.tMode > 0.9) this.set("air"); break;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.mode === "zip") this.y = 3;
    if (this.mode === "air" && this.y <= 0 && this.vy < 0) { this.y = 0; this.set("walk"); }
    if (Math.abs(this.x) > this.lim) { this.x = Math.sign(this.x) * this.lim; this.dir = -Math.sign(this.x); this.vx = 0;
      if (this.mode === "dash" || this.mode === "slide") this.set("walk"); }
  }
  pick() {
    const opts = this.allowed.filter((m) => NEXT.walk.includes(m)); const m = opts[Math.floor(this.r() * opts.length)] ?? "walk";
    this.dir = this.x > 4 ? -1 : this.x < -4 ? 1 : this.r() < 0.5 ? -1 : 1;
    if (m === "walk") { this.tMode = 0; this.walkFor = 0.6 + this.r() * 0.8; this.log.push({ mode: "walk", t: this.t }); } else this.set(m);
  }
}
