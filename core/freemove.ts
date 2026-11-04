import { MOVE } from "./spec";
// Free movement (#51): a target moves on a 2D plane (u, v) inside a box, in any direction, plus height y.
// State machine (specs/state_machines_v2.md):
//   walk -> walk (new heading) | dash (any direction) | air (jump) | zip (only on cable paths)
//   dash -> slide | walk ; slide -> walk | air (slide-jump) ; air -> walk (land) ; zip -> air (drop keeps momentum)
//   zip -> air (knocked: hit on the cable, falls with no jump boost, lands, back to walk) (#53, specs/state_machines_v3.md)
// Ziplines (#53) are cables in mover coordinates; a walker mounts one only when it is within MOUNT_R of the cable line.
// Speeds come from the spec (walk 6.4 m/s, dash peak/duration by bucket, jump 295 u/s, air accel, zipline 18 m/s).
// ESTIMATED, no spec number: heading-change, dash and jump rates per difficulty, walk acceleration, the air-strafe pick.
export type FMode = "walk" | "dash" | "slide" | "air" | "zip";
// #58: air -> dash (air dash, any direction incl. up/down, repeatable while stamina lasts) ; dash -> air (air dash ends airborne)
const NEXT: Record<FMode, FMode[]> = { walk: ["walk", "dash", "air", "zip"], dash: ["slide", "walk", "air", "dash"], slide: ["walk", "air"], air: ["walk", "dash"], zip: ["air"] };
export interface Rates { turn: number; dash: number; jump: number; zip: number; /** #58 air dashes per second while airborne */ airDash?: number } // events per second while walking
/** #58 stamina: dashes (ground or air) cost one bar; 3 bars (spec: heroes start with 2 to 4), one bar back every 4.5 s (spec). */
export const STAMINA = { bars: 3, regenS: 4.5 };
/** #58 air dash elevation choices, rad (down a bit, level, up, steep up): "up-left" etc. come from these times any heading */
export const AIR_DASH_ELEV = [-0.35, 0, 0.45, 0.8];
/** #58 tracked-time before a target breaks away, s, by difficulty (Easy, Normal, Hard, Pro). ESTIMATED. */
export const EVADE_AFTER = [2.0, 1.2, 0.7, 0.4];
/** ESTIMATED rates, rising with difficulty (Easy, Normal, Hard, Pro). */
export const FREE_RATES: Rates[] = [ { turn: 0.7, dash: 0.12, jump: 0.08, zip: 0.05, airDash: 0 }, { turn: 1.1, dash: 0.3, jump: 0.2, zip: 0.1, airDash: 0.6 },
  { turn: 1.7, dash: 0.55, jump: 0.4, zip: 0.15, airDash: 1.5 }, { turn: 2.5, dash: 0.85, jump: 0.65, zip: 0.2, airDash: 3 } ];
export const WALK_ACCEL = 40; // m/s^2, ESTIMATED (reaches walk speed in about 0.16 s)
export interface Box { u0: number; u1: number; v0: number; v1: number }
/** cable in mover coordinates: from (u0,v0) to (u1,v1), rider feet at height h above the path surface */
export interface Cable { u0: number; v0: number; u1: number; v1: number; h: number }
export const MOUNT_R = 3; // m, ESTIMATED: how far from the cable line a walker may grab it
export const ZIP_RIDE: [number, number] = [0.9, 1.6]; // s ridden before the drop, ESTIMATED
export class FreeMover {
  u = 0; v = 0; y = 0; vu = 0; vv = 0; vy = 0; mode: FMode = "walk"; tMode = 0; t = 0; illegal = 0; log: { mode: FMode; t: number }[] = [];
  hu = 1; hv = 0; turns = 0; dashes = 0; jumps = 0; dashPeak = MOVE.dash.b2.peak; dashDur = MOVE.dash.b2.dur; r: () => number; airPick = 0; bias: [number, number] | null = null;
  stamina = STAMINA.bars; airDash = false; elev = 0; airDashes = 0; evades = 0; noBoost = false;
  cables: Cable[] = []; cable: Cable | null = null; zipT = 1.2; knocked = false; knocks = 0;
  constructor(public allowed: FMode[], public box: Box, public rates: Rates, seed = 5) { let s = seed >>> 0 || 5; this.r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); this.heading(); }
  get speed() { return Math.hypot(this.vu, this.vv); }
  /** new heading in any direction; a bias (e.g. toward the player) is mixed in when set */
  heading() { let a = this.r() * Math.PI * 2, hu = Math.cos(a), hv = Math.sin(a); if (this.bias) { hu += this.bias[0]; hv += this.bias[1]; } const n = Math.hypot(hu, hv) || 1; this.hu = hu / n; this.hv = hv / n; this.turns++; }
  set(m: FMode) {
    if (!NEXT[this.mode].includes(m) || (m !== "walk" && !(m === "air" && this.mode === "zip") && !this.allowed.includes(m))) { this.illegal++; return false; }
    const prev = this.mode; this.mode = m; this.tMode = 0; if (m !== "dash") { this.airDash = false; this.elev = 0; } this.log.push({ mode: m, t: this.t });
    if (m === "walk") { this.y = 0; this.vy = 0; }
    if (m === "dash") { const fromAir = prev === "air" || (prev === "dash" && this.airDash); if (!this.evading) this.heading(); this.evading = false; this.dashes++; this.stamina -= 1;
      this.airDash = fromAir; this.elev = fromAir ? AIR_DASH_ELEV[Math.floor(this.r() * AIR_DASH_ELEV.length)] : 0; if (fromAir) this.airDashes++; }
    if (m === "air") { if (this.knocked || this.noBoost) { this.noBoost = false; this.vy = 0; this.airPick = 0; } else { this.vy = MOVE.jumpV; this.jumps++; this.airPick = 0.15 + this.r() * 0.3; } }
    if (m === "walk") this.knocked = false;
    if (m === "slide") { const s = Math.max(this.speed, MOVE.slideMin), n = this.speed || 1; this.vu = (this.vu || this.hu) / n * s; this.vv = (this.vv || this.hv) / n * s; }
    if (m === "zip") { const c = this.cable!, du = c.u1 - c.u0, dv = c.v1 - c.v0, L = Math.hypot(du, dv) || 1, t = ((this.u - c.u0) * du + (this.v - c.v0) * dv) / (L * L);
      this.u = c.u0 + du * t; this.v = c.v0 + dv * t; this.y = c.h; this.vy = 0; const sg = this.r() < 0.5 ? 1 : -1; this.hu = du / L * sg; this.hv = dv / L * sg; this.vu = this.hu * MOVE.zipline.inner; this.vv = this.hv * MOVE.zipline.inner; this.zipT = ZIP_RIDE[0] + this.r() * (ZIP_RIDE[1] - ZIP_RIDE[0]); }
    return true;
  }
  /** cable within MOUNT_R of the walker, if any */
  nearCable(): Cable | null { for (const c of this.cables) { const du = c.u1 - c.u0, dv = c.v1 - c.v0, L2 = du * du + dv * dv || 1, t = Math.max(0, Math.min(1, ((this.u - c.u0) * du + (this.v - c.v0) * dv) / L2));
    if (Math.hypot(this.u - c.u0 - du * t, this.v - c.v0 - dv * t) < MOUNT_R) return c; } return null; }
  /** #53: shot while riding: knocked off the cable, falls (no jump boost, keeps half its speed), then walks again */
  knock() { if (this.mode !== "zip") return false; this.knocked = true; this.vu *= 0.5; this.vv *= 0.5; this.knocks++; return this.set("air"); }
  evading = false;
  canDash(reserve = 0) { return this.allowed.includes("dash") && this.stamina >= 1 + reserve; }
  /** ground dashes keep bars in reserve for air dashes when air dashes are on, so chains in the air can happen */
  private get groundReserve() { return (this.rates.airDash ?? 0) > 0 ? 1 : 0; }
  /** #58: being tracked: break away. Dash (ground or air) roughly reversing or cutting across the current direction when stamina
   * allows, else a sharp turn. */
  evade() { if (this.mode === "zip" || this.mode === "dash") return false; const a = (this.r() < 0.5 ? 1 : -1) * (Math.PI / 2 + this.r() * Math.PI / 3), sp = this.speed;
    const bu = sp > 0.5 ? this.vu / sp : this.hu, bv = sp > 0.5 ? this.vv / sp : this.hv; this.hu = bu * Math.cos(a) - bv * Math.sin(a); this.hv = bu * Math.sin(a) + bv * Math.cos(a); this.turns++; this.evades++;
    if ((this.mode === "walk" || this.mode === "air") && this.canDash()) { this.evading = true; return this.set("dash"); } return true; }
  step(dt: number) {
    this.stamina = Math.min(STAMINA.bars, this.stamina + dt / STAMINA.regenS);
    this.t += dt; this.tMode += dt; const R = this.rates, p = (rate: number) => this.r() < rate * dt;
    switch (this.mode) {
      case "walk": { const tu = this.hu * MOVE.walk, tv = this.hv * MOVE.walk, du = tu - this.vu, dv = tv - this.vv, d = Math.hypot(du, dv), k = Math.min(1, WALK_ACCEL * dt / (d || 1));
        this.vu += du * k; this.vv += dv * k;
        if (p(R.turn)) this.heading(); else if (this.canDash(this.groundReserve) && p(R.dash)) this.set("dash"); else if (this.allowed.includes("air") && p(R.jump)) this.set("air"); else if (this.allowed.includes("zip") && p(R.zip) && (this.cable = this.nearCable())) this.set("zip"); break; }
      case "dash": { const k = Math.min(1, this.tMode / this.dashDur), s = MOVE.walk + (this.dashPeak - MOVE.walk) * (1 - k) * (1 - k), c = Math.cos(this.elev); this.vu = this.hu * s * c; this.vv = this.hv * s * c;
        if (this.airDash) this.vy = s * Math.sin(this.elev); // air dash: straight line in 3D, gravity resumes after
        if (this.tMode >= this.dashDur - 1e-9) { if (this.airDash && this.y > 0.3 && this.canDash() && this.r() < Math.min(0.75, (R.airDash ?? 0) / 4)) this.set("dash"); /* chain: a second air dash straight out of the first */ else if (this.airDash) { this.noBoost = true; this.vy = Math.min(this.vy, 2); this.set("air"); } else this.set(this.allowed.includes("slide") && this.r() < 0.5 ? "slide" : "walk"); } break; }
      case "slide": { const s = this.speed, ns = Math.max(0, s - MOVE.slideFriction * 9.81 * 2 * dt); if (s > 0) { this.vu *= ns / s; this.vv *= ns / s; }
        if (this.allowed.includes("air") && p(R.jump * 2)) this.set("air"); else if (ns < MOVE.walk) this.set("walk"); break; }
      case "air": { this.vy -= MOVE.gravity * dt;
        // air strafe: once per jump, pick a new direction and accelerate toward it (spec air accel, slower above the cap)
        if (this.tMode >= this.airPick && this.airPick > 0) { this.heading(); this.airPick = -1; }
        if (this.canDash() && p((R.airDash ?? 0))) { this.set("dash"); break; }
        if (this.airPick < 0) { const a = this.speed < MOVE.airSlowCap ? MOVE.airAccelSlow : MOVE.airAccelFast; this.vu += this.hu * a * dt; this.vv += this.hv * a * dt; } break; }
      case "zip": this.vu = this.hu * MOVE.zipline.inner; this.vv = this.hv * MOVE.zipline.inner; if (this.tMode > this.zipT) this.set("air"); break;
    }
    this.u += this.vu * dt; this.v += this.vv * dt; this.y += this.vy * dt; if (this.mode === "zip") this.y = this.cable!.h;
    if (this.mode === "air" && this.y <= 0 && this.vy < 0) { this.y = 0; this.set("walk"); }
    if (this.mode === "dash" && this.airDash && this.y <= 0 && this.vy <= 0) { this.y = 0; this.vy = 0; this.airDash = false; this.elev = 0; this.set("walk"); } // air dash into the floor lands
    // stay inside the box: clamp, kill the outward speed, turn back inward
    const b = this.box; let hit = false;
    if (this.u < b.u0 || this.u > b.u1) { this.u = Math.min(b.u1, Math.max(b.u0, this.u)); this.vu = 0; this.hu = this.u <= b.u0 ? Math.abs(this.hu) || 1 : -Math.abs(this.hu) || -1; hit = true; }
    if (this.v < b.v0 || this.v > b.v1) { this.v = Math.min(b.v1, Math.max(b.v0, this.v)); this.vv = 0; this.hv = this.v <= b.v0 ? Math.abs(this.hv) || 1 : -Math.abs(this.hv) || -1; hit = true; }
    if (hit && this.mode === "dash" && this.airDash) { this.noBoost = true; this.vy = Math.min(this.vy, 0); this.set("air"); }
    else if (hit && (this.mode === "dash" || this.mode === "slide")) this.set("walk");
    if (hit && this.mode === "zip") this.set("air"); // cable leaves the box: drop
  }
}
