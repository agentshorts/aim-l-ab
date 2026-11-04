import { MOVE } from "../../core/spec";
import { FREE_RATES, Rates } from "../../core/freemove";
// Cover fire sim (no three.js, unit tested). World: player at the origin looking down -z; distances are metres.
// State machines (specs/state_machines_v2.md):
//   round: running -> lost (an enemy got within loseDist) | survived (timer ran out, set by the drill)
//   enemy: spawn -> hidden -> moving -> hidden ... ; moving -> dead (hp 0) ; hidden|moving -> reached (inside loseDist)
//   peek:  cover -> out -> peeked -> back -> cover (out/back take PEEK_S; you can only damage while peeked)
export type EState = "spawn" | "hidden" | "moving" | "dead" | "reached";
export type RoundState = "running" | "lost" | "survived";
export type PeekState = "cover" | "out" | "peeked" | "back";
const ENEXT: Record<EState, EState[]> = { spawn: ["hidden"], hidden: ["moving", "reached"], moving: ["hidden", "dead", "reached"], dead: [], reached: [] };
const PNEXT: Record<PeekState, PeekState[]> = { cover: ["out"], out: ["peeked", "back"], peeked: ["back"], back: ["cover", "out"] };
/** Time to lean out or back in. ESTIMATED (no spec number), about a Deadlock strafe step. */
export const PEEK_S = 0.15;
export const SPAWN_S = 0.6, RESPAWN_S = 1.2;
/** Cover rows, distance from the player. The last row sits inside loseDist on every difficulty, so reaching it loses. */
/** enemies stay inside the arena: |x| at most this (street walls), ESTIMATED */
export const BOUND_X = 10;
export const ROWS = [34, 27, 21, 16, 12, 8.5, 5];
export interface Diff { count: number; wait: [number, number]; dashRate: number; hp: number; loseDist: number; label: string }
// hp is in seconds of on-target time with the base gun; dashRate is the chance a leg starts with a dash (ESTIMATED tuning, not spec)
export const DIFFS: Diff[] = [
  { label: "Easy", count: 2, wait: [1.4, 2.4], dashRate: 0.2, hp: 0.5, loseDist: 6 },
  { label: "Normal", count: 3, wait: [1.0, 2.0], dashRate: 0.4, hp: 0.7, loseDist: 6 },
  { label: "Hard", count: 4, wait: [0.7, 1.5], dashRate: 0.6, hp: 0.9, loseDist: 6.5 },
  { label: "Pro", count: 5, wait: [0.5, 1.1], dashRate: 0.8, hp: 1.1, loseDist: 7 } ];
export interface Enemy { id: number; state: EState; tState: number; x: number; z: number; row: number; fromX: number; fromZ: number; toX: number; toZ: number;
  legLen: number; legT: number; travelled: number; dashing: boolean; dashT: number; dashes: number; hp: number; max: number; wait: number; vx: number; vz: number; illegal: number; y: number; vy: number; dx: number; dz: number; strafe: number; back: number; jumps: number }
export class Peek {
  state: PeekState = "cover"; t = 0; illegal = 0; frac = 0; peekedS = 0;
  go(s: PeekState) { if (!PNEXT[this.state].includes(s)) { this.illegal++; return false; } this.state = s; this.t = 0; return true; }
  step(dt: number, hold: boolean) {
    this.t += dt;
    if (this.state === "cover" && hold) this.go("out");
    else if (this.state === "out") { if (!hold) this.go("back"); else if ((this.frac = Math.min(1, this.frac + dt / PEEK_S)) >= 1) this.go("peeked"); }
    else if (this.state === "peeked") { this.peekedS += dt; if (!hold) this.go("back"); }
    else if (this.state === "back") { if (hold) this.go("out"); else if ((this.frac = Math.max(0, this.frac - dt / PEEK_S)) <= 0) this.go("cover"); }
    if (this.state === "peeked") this.frac = 1; if (this.state === "cover") this.frac = 0;
  }
  get canShoot() { return this.state === "peeked"; }
}
export class CoverSim {
  enemies: Enemy[] = []; round: RoundState = "running"; t = 0; kills = 0; closest = Infinity; nextId = 1; events: { t: number; type: string; id: number }[] = [];
  respawns: number[] = []; rates: Rates; r: () => number; side: 1 | -1; covers: { x: number; z: number }[] = [];
  constructor(public d: Diff, seed = 7, level = 1) { this.rates = FREE_RATES[level] ?? FREE_RATES[1]; let s = seed >>> 0 || 7; this.r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); this.side = this.r() < 0.5 ? -1 : 1;
    // fixed cover layout: 3 lanes per row, staggered so every leg crosses open ground sideways as well as forward
    ROWS.forEach((z, i) => { for (const x of i === ROWS.length - 1 ? [-2, 2] : i % 2 ? [-4, 4] : [-7, 0, 7]) this.covers.push({ x, z }); });
    for (let i = 0; i < d.count; i++) this.spawn(); }
  coverAt(row: number) { const opts = this.covers.filter((c) => c.z === ROWS[row]); return opts[Math.floor(this.r() * opts.length)]; }
  spawn() { const c = this.coverAt(0); const e: Enemy = { id: this.nextId++, state: "spawn", tState: 0, x: c.x, z: c.z, row: 0, fromX: c.x, fromZ: c.z, toX: c.x, toZ: c.z, legLen: 0, legT: 0, travelled: 0,
      dashing: false, dashT: 0, dashes: 0, hp: this.d.hp, max: this.d.hp, wait: this.waitS() * 0.5 + this.r() * 0.8, vx: 0, vz: 0, illegal: 0, y: 0, vy: 0, dx: 0, dz: 1, strafe: 0, back: 0, jumps: 0 }; this.enemies.push(e); this.ev("spawn", e); return e; }
  waitS() { const [a, b] = this.d.wait; return a + (b - a) * this.r(); }
  ev(type: string, e: Enemy) { this.events.push({ t: this.t, type, id: e.id }); }
  set(e: Enemy, s: EState) { if (!ENEXT[e.state].includes(s)) { e.illegal++; return false; } e.state = s; e.tState = 0; this.ev(s, e); return true; }
  dist(e: Enemy) { return Math.hypot(e.x, e.z); }
  /** dash speed profile, same shape as the tracking mover: peak at start easing to walk (peak and duration from spec, shape ESTIMATED) */
  speed(e: Enemy) { if (!e.dashing) return MOVE.walk; const k = Math.min(1, e.dashT / MOVE.dash.b2.dur); return MOVE.walk + (MOVE.dash.b2.peak - MOVE.walk) * (1 - k) * (1 - k); }
  startLeg(e: Enemy) { const c = this.coverAt(Math.min(ROWS.length - 1, e.row + 1)); e.row = Math.min(ROWS.length - 1, e.row + 1);
    e.fromX = e.x; e.fromZ = e.z; e.toX = c.x; e.toZ = c.z; e.legLen = Math.hypot(c.x - e.x, c.z - e.z); e.travelled = 0; e.legT = 0;
    e.dashing = false; e.strafe = 0; e.back = 0; this.set(e, "moving"); if (this.r() < this.d.dashRate) this.dash(e, (c.x - e.fromX) / (e.legLen || 1), (c.z - e.fromZ) / (e.legLen || 1)); }
  /** dash in any direction, biased toward the next cover (forward unit fx, fz) */
  dash(e: Enemy, fx: number, fz: number) { const a = this.r() * Math.PI * 2; let dx = fx * 1.2 + Math.cos(a), dz = fz * 1.2 + Math.sin(a); const n = Math.hypot(dx, dz) || 1; e.dx = dx / n; e.dz = dz / n; e.dashing = true; e.dashT = 0; e.dashes++; this.ev("dash", e); }
  step(dt: number) {
    if (this.round !== "running" || dt <= 0) return; this.t += dt;
    for (let i = this.respawns.length - 1; i >= 0; i--) if ((this.respawns[i] -= dt) <= 0) { this.respawns.splice(i, 1); this.spawn(); }
    for (const e of this.enemies) { e.tState += dt;
      if (e.state === "spawn" && e.tState >= SPAWN_S) this.set(e, "hidden");
      else if (e.state === "hidden" && e.tState >= e.wait) this.startLeg(e);
      else if (e.state === "moving") { e.legT += dt; const R = this.rates, p = (rate: number) => this.r() < rate * dt;
        // free movement between covers (#51): strafe left/right, step back, jump, dash in any direction (forward-biased), always heading for the next cover
        let fx = e.toX - e.x, fz = e.toZ - e.z; const rem = Math.hypot(fx, fz); fx /= rem || 1; fz /= rem || 1; const px = -fz, pz = fx;
        if (!e.dashing && rem > 3 && e.legT > 0.35 && p(this.d.dashRate * 1.5)) this.dash(e, fx, fz);
        if (!e.dashing) { if (p(R.turn)) e.strafe = [-1, 0, 1][Math.floor(this.r() * 3)]; if (p(R.turn * 0.3)) e.back = 0.3; if (e.y <= 0 && p(R.jump)) { e.vy = MOVE.jumpV; e.jumps++; } }
        e.back = Math.max(0, e.back - dt);
        if (e.dashing) { const sp = this.speed(e); e.vx = e.dx * sp; e.vz = e.dz * sp; if ((e.dashT += dt) >= MOVE.dash.b2.dur) e.dashing = false; }
        else { const f = e.back > 0 ? -0.6 : 1, sx = fx * f + px * e.strafe * 0.6, sz = fz * f + pz * e.strafe * 0.6, n = Math.hypot(sx, sz) || 1; e.vx = sx / n * MOVE.walk; e.vz = sz / n * MOVE.walk; }
        e.x += e.vx * dt; e.z += e.vz * dt; e.x = Math.max(-BOUND_X, Math.min(BOUND_X, e.x)); e.z = Math.min(ROWS[0] + 2, e.z);
        if (e.y > 0 || e.vy > 0) { e.vy -= MOVE.gravity * dt; e.y = Math.max(0, e.y + e.vy * dt); if (e.y === 0) e.vy = 0; }
        if (Math.hypot(e.toX - e.x, e.toZ - e.z) < 0.5) { e.x = e.toX; e.z = e.toZ; e.y = 0; e.vy = 0; e.vx = e.vz = 0; e.dashing = false; e.wait = this.waitS(); this.set(e, "hidden"); } }
      if (e.state !== "dead" && e.state !== "spawn") { const dd = this.dist(e); this.closest = Math.min(this.closest, dd);
        if (dd <= this.d.loseDist && (e.state === "hidden" || e.state === "moving")) { this.set(e, "reached"); this.round = "lost"; this.ev("lost", e); } } }
    this.enemies = this.enemies.filter((e) => e.state !== "dead" || e.tState < 0.5);
  }
  /** damage only lands on an enemy that is exposed (moving between covers); hidden ones are behind cover */
  damage(id: number, amount: number) { const e = this.enemies.find((x) => x.id === id); if (!e || e.state !== "moving" || this.round !== "running") return "blocked";
    e.hp -= amount; if (e.hp <= 0) { e.hp = 0; this.set(e, "dead"); this.kills++; this.respawns.push(RESPAWN_S); return "kill"; } return "hit"; }
  exposed() { return this.enemies.filter((e) => e.state === "moving"); }
}
