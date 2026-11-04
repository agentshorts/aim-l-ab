// Browser pass for #57 sounds, #58 harder targets and air dashes, #59 streak forgiveness. Pro difficulty, 30 s sessions.
import { chromium } from "playwright";
import { writeFileSync } from "fs";
const base = process.argv[2], tag = process.argv[3] || "vX"; const out = {}; const errs = [];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(`${base}/index.html`); await p.waitForSelector(".card");
await p.evaluate(() => localStorage.setItem("aimlab.settings.v2", JSON.stringify({ cm360: 35, dpi: 800, fov: 90, difficulty: 3, rawInput: true, durationS: 30 })));
await p.reload(); await p.waitForSelector(".card");
const go = async (r) => { await p.evaluate((x) => (location.hash = "#/" + x), r); await p.waitForFunction((x) => window.aimlab?.route === x && window.aimlab?.drill?.start, r, { timeout: 90000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { window.aimlab.sfx.played.length = 0; window.__hum = 0; window.__holds = {}; window.aimlab.drill.start(); }); await p.waitForTimeout(3500); };
const played = () => p.evaluate(() => { const c = {}; for (const n of window.aimlab.sfx.played) c[n] = (c[n] || 0) + 1; return c; });
// 1) tracking, single target: aim perfectly; streak tiers, hum, evades and air dashes
await go("tracking"); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; const f = () => { if (a.hooks !== H) return; H.autoAim(); window.__hum = Math.max(window.__hum, a.sfx.humLevel); requestAnimationFrame(f); }; f(); });
await p.waitForTimeout(12000); await p.screenshot({ path: `proof/sds_tracking_streak_${tag}.png` });
out.tracking = await p.evaluate(() => { const H = window.aimlab.hooks, m = H.mover; return { streakS: +H.streak.streak.toFixed(1), humMax: +window.__hum.toFixed(2), evades: m.evades, airDashes: m.airDashes, dashes: m.dashes, illegal: m.illegal, staminaNow: +m.stamina.toFixed(2) }; });
out.tracking.played = await played();
await p.waitForFunction(() => window.aimlab.sfx.played.some((n) => n === "done" || n === "best"), null, { timeout: 40000 }).catch(() => null); await p.waitForTimeout(500);
out.tracking.endSounds = (await played()); await p.screenshot({ path: `proof/sds_tracking_results_${tag}.png` });
// 2) tracking multi-path (3 targets, live one switches every 4 s): aim lags 0.3 s after each switch, so only the grace keeps the streak
await go("tracking/multi-path"); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; let last = H.mover, lag = 0, t0 = performance.now(); window.__sw = 0; window.__maxDuringLag = 0; window.__resetDuringLag = 0;
  const f = (now) => { if (a.hooks !== H) return; const dt = (now - t0) / 1000; t0 = now; if (H.mover !== last) { last = H.mover; lag = 0.3; window.__sw++; window.__pre = H.streak.streak; }
    if (lag > 0) { lag -= dt; if (H.streak.streak === 0 && window.__pre > 0) window.__resetDuringLag++; if (H.hold !== "none") window.__holds[H.hold] = (window.__holds[H.hold] || 0) + 1; } else H.autoAim(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
await p.waitForTimeout(13000); await p.screenshot({ path: `proof/sds_tracking_switch_${tag}.png` });
out.switching = await p.evaluate(() => { const H = window.aimlab.hooks; return { switches: window.__sw, framesHeld: window.__holds, resetsDuringLag: window.__resetDuringLag, streakS: +H.streak.streak.toFixed(1), switchHoldS: +H.streak.holds.switch.toFixed(2), resets: H.streak.resets }; });
// 3) cover fire with the aim bot: cover holds, peek sounds, kill combos, hum
await go("cover"); await p.keyboard.down("ShiftLeft"); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; window.__cov = 0; const f = () => { if (a.hooks !== H) return; if (a.drill?.session.phase === "running") { H.bot = true; a.drill.input.inject(0, 0); } window.__hum = Math.max(window.__hum, a.sfx.humLevel); if (H.hold === "cover" && !window.__cov) { window.__cov = 1; } requestAnimationFrame(f); }; f(); });
await p.waitForFunction(() => window.__cov, null, { timeout: 20000 }).catch(() => null); await p.screenshot({ path: `proof/sds_cover_held_${tag}.png` }); await p.waitForTimeout(10000);
out.cover = await p.evaluate(() => { const S = window.aimlab.hooks.streak; return { coverHoldS: +S.holds.cover.toFixed(2), reacquireS: +S.holds.reacquire.toFixed(2), switchHoldS: +S.holds.switch.toFixed(2), best: +S.best.toFixed(1), humMax: +window.__hum.toFixed(2), sawCoverHold: !!window.__cov }; });
out.cover.played = await played(); await p.keyboard.up("ShiftLeft");
// 4) souls: a perfect player chains good shots; combo chimes rise
await go("souls"); await p.evaluate(() => { const a = window.aimlab, H = a.hooks; const f = () => { if (a.hooks !== H) return; const s = H.sim;
  const o = s.orbs.find((o) => o.state === "lit"); if (o) { H.aimAt(o.x, H.orbY(o), o.z); H.fire(); } else { const t = s.troopers.find((t) => t.alive && t.team === "enemy" && t.hp <= 12); if (t) { H.aimAt(t.x, 0.9, t.z); H.fire(); } } /* only shoot troopers at last-hit health, so good shots chain */ requestAnimationFrame(f); }; f(); });
await p.waitForTimeout(12000); await p.screenshot({ path: `proof/sds_souls_combo_${tag}.png` });
out.souls = { played: await played() };
out.errors = errs; writeFileSync(`proof/e2e_sds_results_${tag}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); await b.close();
