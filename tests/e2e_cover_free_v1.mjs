// Browser run of cover fire: run 1 peeks and tracks (bot hand), run 2 never peeks so an enemy must reach the player and end the round early.
import { chromium } from "playwright";
import { writeFileSync } from "fs";
const base = process.argv[2], tag = process.argv[3] || "vX"; const out = {}; const errs = [];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(`${base}/index.html`); await p.waitForSelector(".card");
await p.evaluate(() => localStorage.setItem("aimlab.settings.v2", JSON.stringify({ cm360: 35, dpi: 800, fov: 90, difficulty: 0, rawInput: true, durationS: 20 })));
await p.reload(); await p.waitForSelector('[data-drill="deadlock-cover-fire"]'); await p.screenshot({ path: `proof/cover_hub_${tag}.png`, fullPage: true });
await p.evaluate(() => (location.hash = "#/cover")); await p.waitForFunction(() => window.aimlab?.drill?.start); await p.waitForTimeout(500);
await p.screenshot({ path: `proof/cover_start_${tag}.png` });
await p.evaluate(() => window.aimlab.drill.start()); await p.waitForTimeout(3200);
await p.keyboard.down("ShiftLeft");
await p.evaluate(() => { const a = window.aimlab, H = a.hooks; window.__c = { peekedSeen: 0 }; const f = () => { if (a.drill?.session.phase === "running") { const s = H.sim;
  if (H.peek.canShoot) window.__c.peekedSeen = 1; // aim at the exposed enemy on the peek side first (the wall blocks the other side)
  H.bot = true; a.drill.input.inject(0, 0); } requestAnimationFrame(f); }; f(); });
await p.waitForTimeout(6000); await p.screenshot({ path: `proof/cover_peeking_${tag}.png` });
await p.waitForSelector("#results", { timeout: 90000 }); await p.keyboard.up("ShiftLeft"); await p.waitForTimeout(400); await p.screenshot({ path: `proof/cover_results_${tag}.png` });
out.run1 = await p.evaluate(() => { const d = window.aimlab.drill; return { peekedSeen: window.__c.peekedSeen, dbg: { ...window.aimlab.hooks.dbg }, result: d.drill.result(), sfx: [...new Set(d.sfx.played)] }; });
// run 2: never peek
await p.evaluate(() => { window.aimlab.hooks.bot = false; window.aimlab.drill.session.go("idle"); window.aimlab.drill.start(); }); await p.waitForTimeout(3200);
const t0 = Date.now(); await p.waitForSelector("#results", { timeout: 90000 }); out.run2ms = Date.now() - t0; await p.waitForTimeout(400);
await p.screenshot({ path: `proof/cover_lost_${tag}.png` });
out.run2 = await p.evaluate(() => { const d = window.aimlab.drill; return { round: window.aimlab.hooks.sim.round, result: d.drill.result(), saved: JSON.parse(localStorage.getItem("aimlab.results.v1") || "[]").length }; });
await p.evaluate(() => (location.hash = "#/")); await p.waitForSelector('[data-drill="deadlock-cover-fire"]'); out.hubBest = await p.evaluate(() => document.querySelector('[data-drill="deadlock-cover-fire"] .pb')?.textContent);
// tracking with free movement (#51): high-ground level, record velocity directions and modes
await p.evaluate(() => (location.hash = "#/tracking/high-ground")); await p.waitForFunction(() => window.aimlab?.drill?.start && window.aimlab.route === "tracking/high-ground");
await p.evaluate(() => window.aimlab.drill.start()); await p.waitForTimeout(3200);
await p.evaluate(() => { const a = window.aimlab; window.__f = { q: {}, modes: {} }; const f = () => { if (a.drill?.session.phase === "running") { const m = a.hooks.mover; a.hooks.autoAim(); a.drill.input.inject(0, 0);
  if (m.speed > 1) window.__f.q[`${Math.sign(m.vu)},${Math.sign(m.vv)}`] = 1; window.__f.modes[m.mode] = 1; } requestAnimationFrame(f); }; f(); });
await p.waitForTimeout(8000); await p.screenshot({ path: `proof/cover_tracking_free_${tag}.png` });
await p.waitForSelector("#results", { timeout: 60000 });
out.trackingFree = await p.evaluate(() => ({ quads: Object.keys(window.__f.q), modes: Object.keys(window.__f.modes), result: window.aimlab.drill.drill.result() }));
out.checks = { trackingFree: out.trackingFree.quads.length >= 4 && out.trackingFree.result.metrics.illegalTransitions === 0, peeked: out.run1.peekedSeen === 1, run1Kills: out.run1.result.metrics.kills > 0, run1Survived: out.run1.result.metrics.lost === 0,
  run2Lost: out.run2.round === "lost" && out.run2.result.metrics.lost === 1 && out.run2.result.metrics.closestM <= 6, run2Early: out.run2.result.metrics.survivedS < 19.5, hubSaved: out.hubBest && out.hubBest !== "none",
  noIllegal: out.run1.result.metrics.illegalTransitions === 0 && out.run2.result.metrics.illegalTransitions === 0 };
out.errors = errs; out.pass = Object.values(out.checks).every(Boolean) && !errs.length;
await b.close(); writeFileSync(`proof/e2e_cover_results_${tag}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
