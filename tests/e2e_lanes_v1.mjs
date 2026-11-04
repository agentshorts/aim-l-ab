// Browser pass for #52 #53 #54 #56: lane layouts in souls and tracking, zipline knock-off on the lane, collision counters.
import { chromium } from "playwright";
import { writeFileSync } from "fs";
const base = process.argv[2], tag = process.argv[3] || "vX"; const out = {}; const errs = [];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(`${base}/index.html`); await p.waitForSelector(".card");
await p.evaluate(() => localStorage.setItem("aimlab.settings.v2", JSON.stringify({ cm360: 35, dpi: 800, fov: 90, difficulty: 3, rawInput: true, durationS: 60 })));
await p.reload(); await p.waitForSelector('[data-drill="deadlock-souls-lane-plaza"]'); await p.screenshot({ path: `proof/lanes_hub_${tag}.png`, fullPage: true });
const go = async (r) => { await p.evaluate((x) => (location.hash = "#/" + x), r); await p.waitForFunction((x) => window.aimlab?.route === x && window.aimlab?.drill?.start, r, { timeout: 90000 }); await p.waitForTimeout(800);
  await p.evaluate(() => window.aimlab.drill.start()); await p.waitForTimeout(3500); };
for (const id of ["lane-plaza", "lane-overpass", "lane-terrace"]) {
  await go(`souls/${id}`); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; window.__c = {}; const F = () => { const r = H.fire(); window.__c[r] = (window.__c[r] || 0) + 1; }; const f = () => { if (a.hooks !== H) return; const s = H.sim;
    const o = s.orbs.find((o) => o.state === "lit"); if (o) { H.aimAt(o.x, H.orbY(o), o.z); F(); } else { const t = s.troopers.find((t) => t.alive && t.team === "enemy" && t.hp <= 40); if (t) { H.aimAt(t.x, 0.9, t.z); F(); } } requestAnimationFrame(f); }; f(); });
  await p.waitForTimeout(9000); await p.screenshot({ path: `proof/lanes_souls_${id}_${tag}.png` });
  out[`souls/${id}`] = await p.evaluate(() => ({ layout: window.aimlab.hooks.layout, shots: window.__c }));
  await go(`tracking/${id}`); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; for (const t of H.targets) t.mover.rates = { ...t.mover.rates, zip: 2 }; const f = () => { if (a.hooks !== H) return; H.autoAim(); requestAnimationFrame(f); }; f(); });
  await p.waitForTimeout(12000); await p.screenshot({ path: `proof/lanes_tracking_${id}_${tag}.png` });
  out[`tracking/${id}`] = await p.evaluate(() => { const H = window.aimlab.hooks; return { bumps: H.bumps, knockoffs: H.targets.reduce((a, t) => a + t.mover.knocks, 0), zipRides: H.targets.reduce((a, t) => a + t.mover.log.filter((e) => e.mode === "zip").length, 0), illegal: H.targets.reduce((a, t) => a + t.mover.illegal, 0), insideNow: H.targets.filter((t) => H.inSolid(t.path, t.mover)).length }; });
}
// lane (#53): force cable rides, hold aim, catch a knock-off mid fall
await go("tracking"); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; window.__k = null; H.targets[0].mover.rates = { ...H.targets[0].mover.rates, zip: 3 };
  const f = () => { if (a.hooks !== H) return; H.autoAim(); const m = H.mover; if (m.knocked && !window.__k) window.__k = 1; requestAnimationFrame(f); }; f(); });
await p.waitForFunction(() => window.__k, null, { timeout: 90000 }).catch(() => null); await p.screenshot({ path: `proof/lanes_zip_knock_${tag}.png` }); await p.waitForTimeout(6000);
out.laneZip = await p.evaluate(() => { const m = window.aimlab.hooks.mover; return { knockoffs: m.knocks, zipRides: m.log.filter((e) => e.mode === "zip").length, illegal: m.illegal, log: m.log.slice(-8).map((e) => e.mode) }; });
await p.screenshot({ path: `proof/lanes_zip_after_${tag}.png` });
// multi-path (#52): the across walker passes the ramp without entering it
await go("tracking/multi-path"); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; window.__in = 0; const f = () => { if (a.hooks !== H) return; window.__in += H.targets.filter((t) => H.inSolid(t.path, t.mover)).length; requestAnimationFrame(f); }; f(); });
await p.waitForTimeout(15000); await p.screenshot({ path: `proof/lanes_multipath_${tag}.png` });
out.multiPath = await p.evaluate(() => ({ bumps: window.aimlab.hooks.bumps, framesInsideSolid: window.__in }));
out.errors = errs; writeFileSync(`proof/e2e_lanes_results_${tag}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); await b.close();
