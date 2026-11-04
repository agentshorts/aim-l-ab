import { MOVE } from "./spec";
// Free movement (#51): a target moves on a 2D plane (u, v) inside a box, in any direction, plus height y.
// State machine (specs/state_machines_v2.md):
//   walk -> walk (new heading) | dash (any direction) | air (jump) | zip (only on cable paths)
//   dash -> slide | walk ; slide -> walk | air (slide-jump) ; air -> walk (land) ; zip -> air (drop keeps momentum)
// Speeds come from the spec (walk 6.4 m/s, dash peak/duration by bucket, jump 295 u/s, air accel, zipline 18 m/s).
// ESTIMATED, no spec number: heading-change, dash and jump rates per difficulty, walk acceleration, the air-strafe pick.
export type FMode = "walk" | "dash" | "slide" | "air" | "zip";
const NEXT: Record<FMode, FMode[]> = { walk: ["walk", "dash", "air", "zip"], dash: ["slide", "walk"], slide: ["walk", "air"], air: ["walk"], zip: ["air"] };
export interface Rates { turn: number; dash: number; jump: number; zip: number } // events per second while walking
/** ESTIMATED rates, rising with difficulty (Easy, Normal, Hard, Pro). */
export const FREE_RATES: Rates[] = [ { turn: 0.7, dash: 0.12, jump: 0.08, zip: 0.05 }, { turn: 1.1, dash: 0.3, jump: 0.2, zip: 0.1 },
  { turn: 1.7, dash: 0.55, jump: 0.4, zip: 0.15 }, { turn: 2.5, dash: 0.85, jump: 0.65, zip: 0.2 } ];
export const WALK_ACCEL = 40; // m/s^2, ESTIMATED (reaches walk speed in about 0.16 s)
export interface Box { u0: number; u1: number; v0: number; v1: number }
export class FreeMover {
  u = 0; v = 0; y = 0; vu = 0; vv = 0; vy = 0; mode: FMode = "walk"; tMode = 0; t = 0; illegal = 0; log: { mode: FMode; t: number }[] = [];
  hu = 1; hv = 0; turns = 0; dashes = 0; jumps = 0; dashPeak = MOVE.dash.b2.peak; dashDur = MOVE.dash.b2.dur; r: () => number; airPick = 0; bias: [number, number] | null = null;
  constructor(public allowed: FMode[], public box: Box, public rates: Rates, seed = 5) { let s = seed >>> 0 || 5; this.r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); this.heading(); }
  get speed() { return Math.hypot(this.vu, this.vv); }
  /** new heading in any direction; a bias (e.g. toward the player) is mixed in when set */
  heading() { let a = this.r() * Math.PI * 2, hu = Math.cos(a), hv = Math.sin(a); if (this.bias) { hu += this.bias[0]; hv += this.bias[1]; } const n = Math.hypot(hu, hv) || 1; this.hu = hu / n; this.hv = hv / n; this.turns++; }
  set(m: FMode) {
    if (!NEXT[this.mode].includes(m) || (m !== "walk" && !this.allowed.includes(m))) { this.illegal++; return false; }
    this.mode = m; this.tMode = 0; this.log.push({ mode: m, t: this.t });
    if (m === "walk") { this.y = 0; this.vy = 0; }
    if (m === "dash") { this.heading(); this.dashes++; }
    if (m === "air") { this.vy = MOVE.jumpV; this.jumps++; this.airPick = 0.15 + this.r() * 0.3; }
    if (m === "slide") { const s = Math.max(this.speed, MOVE.slideMin), n = this.speed || 1; this.vu = (this.vu || this.hu) / n * s; this.vv = (this.vv || this.hv) / n * s; }
    if (m === "zip") { this.y = 3; this.vy = 0; this.v = 0; this.hu = this.u > (this.box.u0 + this.box.u1) / 2 ? -1 : 1; this.hv = 0; }
    return true;
  }
  step(dt: number) {
    this.t += dt; this.tMode += dt; const R = this.rates, p = (rate: number) => this.r() < rate * dt;
    switch (this.mode) {
      case "walk": { const tu = this.hu * MOVE.walk, tv = this.hv * MOVE.walk, du = tu - this.vu, dv = tv - this.vv, d = Math.hypot(du, dv), k = Math.min(1, WALK_ACCEL * dt / (d || 1));
        this.vu += du * k; this.vv += dv * k;
        if (p(R.turn)) this.heading(); else if (this.allowed.includes("dash") && p(R.dash)) this.set("dash"); else if (this.allowed.includes("air") && p(R.jump)) this.set("air"); else if (this.allowed.includes("zip") && p(R.zip)) this.set("zip"); break; }
      case "dash": { const k = Math.min(1, this.tMode / this.dashDur), s = MOVE.walk + (this.dashPeak - MOVE.walk) * (1 - k) * (1 - k); this.vu = this.hu * s; this.vv = this.hv * s;
        if (this.tMode >= this.dashDur - 1e-9) this.set(this.allowed.includes("slide") && this.r() < 0.5 ? "slide" : "walk"); break; }
      case "slide": { const s = this.speed, ns = Math.max(0, s - MOVE.slideFriction * 9.81 * 2 * dt); if (s > 0) { this.vu *= ns / s; this.vv *= ns / s; }
        if (this.allowed.includes("air") && p(R.jump * 2)) this.set("air"); else if (ns < MOVE.walk) this.set("walk"); break; }
      case "air": { this.vy -= MOVE.gravity * dt;
        // air strafe: once per jump, pick a new direction and accelerate toward it (spec air accel, slower above the cap)
        if (this.tMode >= this.airPick && this.airPick > 0) { this.heading(); this.airPick = -1; }
        if (this.airPick < 0) { const a = this.speed < MOVE.airSlowCap ? MOVE.airAccelSlow : MOVE.airAccelFast; this.vu += this.hu * a * dt; this.vv += this.hv * a * dt; } break; }
      case "zip": this.vu = this.hu * MOVE.zipline.inner; this.vv = 0; if (this.tMode > 0.9) this.set("air"); break;
    }
    this.u += this.vu * dt; this.v += this.vv * dt; this.y += this.vy * dt; if (this.mode === "zip") this.y = 3;
    if (this.mode === "air" && this.y <= 0 && this.vy < 0) { this.y = 0; this.set("walk"); }
    // stay inside the box: clamp, kill the outward speed, turn back inward
    const b = this.box; let hit = false;
    if (this.u < b.u0 || this.u > b.u1) { this.u = Math.min(b.u1, Math.max(b.u0, this.u)); this.vu = 0; this.hu = this.u <= b.u0 ? Math.abs(this.hu) || 1 : -Math.abs(this.hu) || -1; hit = true; }
    if (this.v < b.v0 || this.v > b.v1) { this.v = Math.min(b.v1, Math.max(b.v0, this.v)); this.vv = 0; this.hv = this.v <= b.v0 ? Math.abs(this.hv) || 1 : -Math.abs(this.hv) || -1; hit = true; }
    if (hit && (this.mode === "dash" || this.mode === "slide")) this.set("walk");
  }
}
