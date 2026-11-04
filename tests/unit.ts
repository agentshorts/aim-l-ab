import { SoulSim } from "../drills/deadlock-souls/sim";
import { Mover } from "../drills/deadlock-tracking/mover";
import { MOVE, TROOPER, ORB } from "../core/spec";
let fails = 0; const ok = (name: string, c: boolean, info = "") => { console.log(`${c ? "PASS" : "FAIL"} ${name} ${info}`); if (!c) fails++; };
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e;
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 5, seed: 1 }); const e = s.troopers[1];
  s.step(0.5); ok("trooper HP drop per tick = 35 dps * 0.5 s", near(e.hp, 300 - 17.5), `hp=${e.hp}`);
  s.step(4.0); ok("after 9 ticks", near(e.hp, 300 - 9 * 17.5), `hp=${e.hp}`);
  for (let i = 0; i < 2000 && e.alive; i++) s.step(0.01); ok("ranged 300 hp dies at 9.0 s (18 ticks)", near(s.t, 9.0, 0.011), `t=${s.t.toFixed(3)}`);
  const o = s.orbs.find((x) => x.owner === "ally"); ok("orb spawns on death, floating share 50 of 100", !!o && TROOPER.bounty0 * TROOPER.floatingShare === 50);
}
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 0, seed: 1 });
  while (!s.orbs.length) s.step(0.001); const born = s.orbs.map(o => o.born)[0];
  while (s.orbs.some(o => o.owner === "ally" && !o.claimed)) s.step(0.001);
  const deny = s.events.find((e) => e.type === "oppdeny"); ok("opponent cannot deny before light-up + 80 ms grace", !!deny && deny.t - born >= ORB.lightUp + ORB.grace - 1e-6, `at ${((deny!.t - born) * 1000).toFixed(0)} ms`);
}
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 9, seed: 1 });
  while (!s.orbs.length) s.step(0.001); const born = s.orbs[0].born; while (s.orbs.length && !s.orbs.every(o => o.claimed)) s.step(0.001);
  const p = s.events.find((e) => e.type === "pop"); ok("unclaimed orb pops at ~1.0 s", !!p && near(p.t - born, ORB.pop, 0.002), `${((p!.t - born) * 1000).toFixed(0)} ms`);
}
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 9, seed: 1 }); const e = s.troopers[1];
  while (e.windowAt === undefined) s.step(0.001); const r = s.shootTrooper(e) as any; ok("last hit on window open: error ~0 ms, kill", r.res === "lasthit" && Math.abs(r.errMs) <= 1.01, `err=${r.errMs.toFixed(2)} ms hp window opens at ${e.windowAt?.toFixed(3)} s`);
  const o = s.orbs[0]; s.step(0.1); ok("orb shot before light-up = early", s.shootOrb(o).res === "early"); s.step(0.0501); const r2 = s.shootOrb(o); ok("orb shot at light-up = secure, err ~0", r2.res === "secure" && Math.abs(r2.errMs) < 1, `err=${r2.errMs.toFixed(2)} ms`);
}
{ const m = new Mover(["dash"]); m.set("dash"); let peak = 0, dist = 0, t = 0; const dt = 1 / 1000; while (m.mode === "dash") { const v = Math.abs(m.vx); m.step(dt); peak = Math.max(peak, Math.abs(m.vx)); dist += Math.abs(m.vx) * dt; t += dt; }
  ok("dash peak = 635 u/s = 16.13 m/s", near(peak, 635 * 0.0254, 0.05), `peak=${peak.toFixed(2)}`); ok("dash duration 0.62 s", near(t, 0.62, 0.002), `t=${t.toFixed(3)}`); console.log(`INFO dash distance (EST model) ${dist.toFixed(2)} m`); }
{ const m = new Mover(["air"]); m.set("air"); let top = 0; while (m.mode === "air") { m.step(1 / 1000); top = Math.max(top, m.y); }
  ok("jump apex = 45 u = 1.143 m", near(top, 45 * 0.0254, 0.01), `apex=${top.toFixed(3)}`); }
{ const m = new Mover(["zip"]); m.x = -8; m.dir = 1; m.set("zip"); m.dir = 1; m.step(0.1); ok("zipline 18 m/s", near(Math.abs(m.vx), 18), `v=${m.vx}`); }
ok("gravity derived 24.56 m/s^2", near(MOVE.gravity, 24.564, 0.01), MOVE.gravity.toFixed(3));
console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
