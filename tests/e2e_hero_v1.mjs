// Browser run with the hero weapon setting on: Haze in tracking (held fire, reloads), Lady Geist in souls (click spam limited by cadence).
import { chromium } from "playwright";
import { writeFileSync } from "fs";
const base = process.argv[2], tag = process.argv[3] || "vX"; const out = {}; const errs = [];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const set = (hw) => p.evaluate((hw) => localStorage.setItem("aimlab.settings.v2", JSON.stringify({ cm360: 35, dpi: 800, fov: 90, difficulty: 2, rawInput: true, durationS: 20, heroWeapon: hw })), hw);
await p.goto(`${base}/index.html`); await p.waitForSelector(".card"); await set("haze"); await p.reload(); await p.waitForSelector("#s-hw");
out.settingsOption = await p.evaluate(() => { const s = document.querySelector("#s-hw"); return { value: s.value, options: s.options.length }; });
await p.screenshot({ path: `proof/hero_setting_hub_${tag}.png`, fullPage: true });
await p.goto(`${base}/index.html#/tracking`); await p.waitForFunction(() => window.aimlab?.drill?.start);
await p.evaluate(() => window.aimlab.drill.start()); await p.waitForTimeout(3200);
await p.evaluate(() => { const a = window.aimlab; window.__w = { reloadSeen: 0, minAmmo: 99 }; const f = () => { if (a.drill?.session.phase === "running") { a.hooks.autoAim(); a.drill.input.inject(0, 0); const w = a.drill.weapon; if (w) { if (w.reloading) window.__w.reloadSeen = 1; window.__w.minAmmo = Math.min(window.__w.minAmmo, w.ammo); } } requestAnimationFrame(f); }; f(); });
await p.waitForFunction(() => window.__w.reloadSeen === 1, null, { timeout: 15000 }).catch(() => {});
await p.screenshot({ path: `proof/hero_tracking_reload_${tag}.png` });
await p.waitForSelector("#results", { timeout: 40000 }); await p.waitForTimeout(400); await p.screenshot({ path: `proof/hero_tracking_results_${tag}.png` });
out.tracking = await p.evaluate(() => { const d = window.aimlab.drill; return { hero: d.weapon?.h.name, shots: d.weapon?.shots, reloadSeen: window.__w.reloadSeen, minAmmo: window.__w.minAmmo, ammoLabel: document.querySelector(".ammo")?.textContent, result: d.drill.result() }; });
await set("lady-geist"); await p.goto(`${base}/index.html#/souls`); await p.reload(); await p.waitForFunction(() => window.aimlab?.drill?.start);
await p.evaluate(() => window.aimlab.drill.start()); await p.waitForTimeout(3200);
await p.evaluate(() => { const a = window.aimlab; const f = () => { if (a.drill?.session.phase === "running") { const s = a.hooks.sim; const orb = s.orbs.find((o) => o.state === "lit"); const t = s.troopers.find((t) => t.alive && t.team === "enemy"); if (orb) a.hooks.aimAt(orb.x, a.hooks.orbY(orb), orb.z); else if (t) a.hooks.aimAt(t.x, 0.9, t.z); a.drill.input.click(); a.drill.input.inject(0, 0); } requestAnimationFrame(f); }; f(); });
await p.waitForTimeout(6000); await p.keyboard.press("KeyR"); out.soulsAfterR = await p.evaluate(() => ({ reloading: window.aimlab.drill.weapon.reloading, label: document.querySelector(".ammo")?.textContent }));
await p.screenshot({ path: `proof/hero_souls_running_${tag}.png` });
await p.waitForSelector("#results", { timeout: 40000 });
out.souls = await p.evaluate(() => { const d = window.aimlab.drill; return { hero: d.weapon?.h.name, shots: d.weapon?.shots, blocked: d.weapon?.blocked, result: d.drill.result() }; });
// checks: Haze held fire must reload at least once in 20 s (25 rounds at 9.524/s); Geist may fire at most 2.116/s plus a magazine's slack
out.checks = { option: out.settingsOption?.value === "haze" && out.settingsOption.options === 45, trackingReload: out.tracking.reloadSeen === 1 && out.tracking.shots > 25,
  soulsCadence: out.souls.shots > 0 && out.souls.shots <= Math.ceil(20 * 2.116) + 1 && out.souls.blocked > out.souls.shots };
out.errors = errs; out.pass = Object.values(out.checks).every(Boolean) && !errs.length;
await b.close(); writeFileSync(`proof/e2e_hero_results_${tag}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
