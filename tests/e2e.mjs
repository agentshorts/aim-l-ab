import { chromium } from "playwright";
const base = process.argv[2]; const out = {};
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
for (const d of ["deadlock-souls", "deadlock-tracking"]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", m => m.type()==="error" && errs.push(m.text()));
  await p.goto(`${base}/drills/${d}/`); await p.waitForTimeout(1500);
  if (d === "deadlock-souls") { // bot: aim at troopers with low HP and orbs, fire
    for (let i = 0; i < 120; i++) { await p.evaluate(() => { const a = window.__aim, s = a.getSim();
      const orb = s.orbs.find(o => !o.claimed && s.t - o.born >= 0.15); if (orb) { a.aimAt(orb.x, orb.y + Math.min(0.6, (s.t - orb.born) * 1.5), orb.z); a.fire(); return; }
      const t = s.troopers.find(t => t.alive && t.team === "enemy" && t.hp <= 40); if (t) { a.aimAt(t.x, 0.9, t.z); a.fire(); } }); await p.waitForTimeout(100); }
  } else { await p.evaluate(() => { const a = window.__aim; const f = () => { const m = a.getMover(); a.look.yaw = Math.atan2(m.x, m.z); a.look.pitch = Math.atan2(m.y, Math.hypot(m.x, m.z)); requestAnimationFrame(f); }; f(); }); await p.waitForTimeout(8000); }
  await p.screenshot({ path: `proof/${d}_${process.argv[3] || "vX"}.png` });
  out[d] = await p.evaluate(() => { const a = window.__aim; const r = { frame: a.stats.summary() }; if (a.score) r.score = { ...a.score.c, meanOrbErrMs: a.score.meanAbsErr() }; if (a.onPct) r.onTargetPct = a.onPct(); return r; });
  out[d].errors = errs; await p.close();
}
await b.close(); console.log(JSON.stringify(out, null, 1));
