import { TROOPER, ORB } from "../../core/spec";
export type Team = "ally" | "enemy";
export type Kind = "ranged" | "melee" | "medic";
export interface Trooper { id: number; team: Team; kind: Kind; hp: number; max: number; x: number; z: number; alive: boolean; lastTick: number; windowAt?: number; }
export interface Orb { id: number; owner: Team; x: number; y: number; z: number; born: number; claimed: boolean; idealShot: number; }
export interface Event { t: number; type: string; data?: any; }
export interface SimOpts { perSide: number; variance: number; playerDamage: number; oppReact: number; seed: number; }
function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export class SoulSim {
  t = 0; troopers: Trooper[] = []; orbs: Orb[] = []; events: Event[] = []; nid = 1; r: () => number;
  constructor(public o: SimOpts) { this.r = rng(o.seed); this.spawnWave(); }
  spawnWave() {
    const kinds: Kind[] = ["ranged", "ranged", "melee", "medic"];
    for (const team of ["ally", "enemy"] as Team[]) for (let i = 0; i < this.o.perSide; i++) {
      const kind = kinds[i % 4]; const hp = TROOPER[kind].hp;
      this.troopers.push({ id: this.nid++, team, kind, hp, max: hp, x: (i - (this.o.perSide - 1) / 2) * 1.6, z: team === "ally" ? 14 : 20, alive: true, lastTick: 0 });
    }
  }
  living(team: Team) { return this.troopers.filter((t) => t.alive && t.team === team); }
  tickDamage(src: Trooper) { const base = TROOPER[src.kind].dpsVsTroopers * TROOPER.tickInterval; const v = this.o.variance; return base * (1 + v * (this.r() * 2 - 1)); }
  step(dt: number) {
    const end = this.t + dt;
    // trooper ticks happen on a fixed grid so tests can check exact HP drops
    let next = Math.floor(this.t / TROOPER.tickInterval + 1e-9) * TROOPER.tickInterval + TROOPER.tickInterval;
    while (next <= end + 1e-9) { this.t = next; this.doTick(); next += TROOPER.tickInterval; }
    this.t = end; this.updateOrbs();
    if (!this.living("ally").length && !this.living("enemy").length) { this.troopers = []; this.spawnWave(); }
    else if (!this.living("ally").length || !this.living("enemy").length) { this.troopers = []; this.spawnWave(); }
  }
  doTick() {
    const hits: [Trooper, number][] = [];
    for (const a of this.troopers) { if (!a.alive) continue; const foes = this.living(a.team === "ally" ? "enemy" : "ally"); if (!foes.length) continue;
      const tgt = foes.reduce((m, f) => (f.hp < m.hp ? f : m)); hits.push([tgt, this.tickDamage(a)]); }
    for (const [tgt, d] of hits) if (tgt.alive) { tgt.hp -= d; if (tgt.hp <= 0) this.kill(tgt, "trooper"); else if (tgt.hp <= this.o.playerDamage && tgt.windowAt === undefined) tgt.windowAt = this.t; }
    this.events.push({ t: this.t, type: "tick" });
  }
  kill(tr: Trooper, by: "trooper" | "player") {
    tr.alive = false; tr.hp = 0;
    const owner: Team = tr.team === "ally" ? "enemy" : "ally";
    this.orbs.push({ id: this.nid++, owner, x: tr.x, y: 1.6, z: tr.z, born: this.t, claimed: false, idealShot: this.t + ORB.lightUp });
    this.events.push({ t: this.t, type: by === "player" ? "lasthit" : "trooperkill", data: { id: tr.id, team: tr.team } });
  }
  updateOrbs() {
    for (const o of this.orbs) { if (o.claimed) continue; const age = this.t - o.born;
      // opponent bot: confirms its orange orbs and denies green ones after reaction time
      const oppReady = o.owner === "enemy" ? ORB.lightUp + this.o.oppReact : ORB.lightUp + ORB.grace + this.o.oppReact;
      if (age >= oppReady) { o.claimed = true; this.events.push({ t: this.t, type: o.owner === "enemy" ? "oppconfirm" : "oppdeny", data: { id: o.id } }); }
      else if (age >= ORB.pop) { o.claimed = true; this.events.push({ t: this.t, type: "pop", data: { id: o.id, owner: o.owner } }); } }
    this.orbs = this.orbs.filter((o) => !o.claimed || this.t - o.born < 0.3);
  }
  // remaining HP <= playerDamage is the window opening
  shootTrooper(tr: Trooper) {
    if (!tr.alive || tr.team !== "enemy") return { res: "invalid", errMs: 0 };
    tr.hp -= this.o.playerDamage; if (tr.hp <= 0) { const errMs = tr.windowAt === undefined ? 0 : (this.t - tr.windowAt) * 1000; this.kill(tr, "player"); return { res: "lasthit", errMs }; }
    if (tr.hp <= this.o.playerDamage && tr.windowAt === undefined) tr.windowAt = this.t; return { res: "hit", errMs: 0 };
  }
  shootOrb(o: Orb): { res: string; errMs: number } {
    const age = this.t - o.born; const errMs = (this.t - o.idealShot) * 1000;
    if (o.claimed) return { res: "late", errMs };
    if (age < ORB.lightUp) return { res: "early", errMs };
    o.claimed = true; const res = o.owner === "ally" ? "secure" : "deny"; this.events.push({ t: this.t, type: res }); return { res, errMs };
  }
}
