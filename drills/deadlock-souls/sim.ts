import { TROOPER, ORB } from "../../core/spec";
export type Team = "ally" | "enemy";
export type Kind = "ranged" | "melee" | "medic";
export interface Trooper { id: number; team: Team; kind: Kind; hp: number; max: number; x: number; z: number; alive: boolean; windowAt?: number; }
// Orb lifecycle: dark -> lit -> claimed(by) ; claimed orbs are removed after FADE seconds
export type OrbState = "dark" | "lit" | "claimed";
export type ClaimBy = "secure" | "deny" | "oppConfirm" | "oppDeny" | "popOwner";
export interface Orb { id: number; owner: Team; x: number; y: number; z: number; born: number; state: OrbState; by?: ClaimBy; claimedAt?: number; idealShot: number; }
export interface Event { t: number; type: string; data?: any; }
export interface SimOpts { perSide: number; variance: number; playerDamage: number; oppReact: number; seed: number; }
// Wave phase: fighting -> cleared (respawn delay) -> fighting
export type WavePhase = "fighting" | "cleared";
export const FADE = 0.3, RESPAWN_DELAY = 1.5; // drill pacing, not game values
function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export class SoulSim {
  t = 0; troopers: Trooper[] = []; orbs: Orb[] = []; events: Event[] = []; nid = 1; r: () => number; wave: WavePhase = "fighting"; clearedAt = 0; waves = 0;
  constructor(public o: SimOpts) { this.r = rng(o.seed); this.spawnWave(); }
  spawnWave() {
    const kinds: Kind[] = ["ranged", "ranged", "melee", "medic"]; this.waves++;
    // survivors of the last wave keep their hp and place (clearing one side no longer resets the other); the new wave joins behind them
    const survivors = this.troopers.filter((t) => t.alive); this.troopers = survivors;
    for (const team of ["ally", "enemy"] as Team[]) for (let i = 0; i < Math.min(this.o.perSide, 2 * this.o.perSide - survivors.filter((t) => t.team === team).length); i++) { // cap a side at two waves
      const kind = kinds[i % 4]; const hp = TROOPER[kind].hp;
      this.troopers.push({ id: this.nid++, team, kind, hp, max: hp, x: (i - (this.o.perSide - 1) / 2) * 1.8 + (team === "ally" ? 0.9 : 0), z: (team === "ally" ? 13 : 19) + (survivors.some((t) => t.team === team) ? (team === "ally" ? -1.5 : 1.5) : 0), alive: true });
    }
    this.wave = "fighting"; this.events.push({ t: this.t, type: "wave" });
  }
  living(team: Team) { return this.troopers.filter((t) => t.alive && t.team === team); }
  tickDamage(src: Trooper) { const base = TROOPER[src.kind].dpsVsTroopers * TROOPER.tickInterval; const v = this.o.variance; return base * (1 + v * (this.r() * 2 - 1)); }
  step(dt: number) {
    const end = this.t + dt;
    let next = Math.floor(this.t / TROOPER.tickInterval + 1e-9) * TROOPER.tickInterval + TROOPER.tickInterval;
    while (next <= end + 1e-9) { this.t = next; if (this.wave === "fighting") this.doTick(); this.updateOrbs(); next += TROOPER.tickInterval; }
    this.t = end; this.updateOrbs();
    if (this.wave === "fighting" && (!this.living("ally").length || !this.living("enemy").length)) { this.wave = "cleared"; this.clearedAt = this.t; }
    else if (this.wave === "cleared" && this.t - this.clearedAt >= RESPAWN_DELAY) this.spawnWave();
  }
  doTick() {
    const hits: [Trooper, number][] = [];
    for (const a of this.troopers) { if (!a.alive) continue; const foes = this.living(a.team === "ally" ? "enemy" : "ally"); if (!foes.length) continue;
      hits.push([foes.reduce((m, f) => (f.hp < m.hp ? f : m)), this.tickDamage(a)]); }
    for (const [tgt, d] of hits) if (tgt.alive) { tgt.hp -= d; if (tgt.hp <= 0) this.kill(tgt, "trooper"); else if (tgt.hp <= this.o.playerDamage && tgt.windowAt === undefined) tgt.windowAt = this.t; }
  }
  kill(tr: Trooper, by: "trooper" | "player") {
    tr.alive = false; tr.hp = 0; const owner: Team = tr.team === "ally" ? "enemy" : "ally";
    this.orbs.push({ id: this.nid++, owner, x: tr.x, y: 1.6, z: tr.z, born: this.t, state: "dark", idealShot: this.t + ORB.lightUp });
    this.events.push({ t: this.t, type: by === "player" ? "lasthit" : "trooperkill", data: { id: tr.id, team: tr.team } });
  }
  private claim(o: Orb, by: ClaimBy) { o.state = "claimed"; o.by = by; o.claimedAt = this.t; this.events.push({ t: this.t, type: by, data: { id: o.id, owner: o.owner } }); }
  updateOrbs() {
    for (const o of this.orbs) {
      const age = this.t - o.born;
      if (o.state === "dark" && age >= ORB.lightUp - 1e-9) o.state = "lit";
      if (o.state !== "lit") continue;
      // opponent bot: confirms own (orange) orbs after react; may only deny green orbs after the owner's grace
      const oppAt = ORB.lightUp + this.o.oppReact + (o.owner === "ally" ? ORB.grace : 0);
      if (age >= oppAt - 1e-9 && oppAt < ORB.pop) this.claim(o, o.owner === "enemy" ? "oppConfirm" : "oppDeny");
      else if (age >= ORB.pop - 1e-9) this.claim(o, "popOwner");
    }
    this.orbs = this.orbs.filter((o) => o.state !== "claimed" || this.t - (o.claimedAt ?? 0) < FADE);
  }
  shootTrooper(tr: Trooper) {
    if (!tr.alive || tr.team !== "enemy") return { res: "invalid", errMs: 0 };
    tr.hp -= this.o.playerDamage;
    if (tr.hp <= 0) { const errMs = tr.windowAt === undefined ? 0 : (this.t - tr.windowAt) * 1000; this.kill(tr, "player"); return { res: "lasthit", errMs }; }
    if (tr.hp <= this.o.playerDamage && tr.windowAt === undefined) tr.windowAt = this.t;
    return { res: "hit", errMs: 0 };
  }
  shootOrb(o: Orb): { res: string; errMs: number } {
    this.updateOrbs(); const errMs = (this.t - o.idealShot) * 1000;
    if (o.state === "claimed") return { res: "late", errMs };
    if (o.state === "dark") return { res: "early", errMs };
    const by: ClaimBy = o.owner === "ally" ? "secure" : "deny"; this.claim(o, by); return { res: by, errMs };
  }
}
