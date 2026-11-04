import { chromium } from "playwright";
import { writeFileSync } from "fs";
const base = process.argv[2], tag = process.argv[3] || "vX"; const out = {}; const errs = [];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(`${base}/index.html`); await p.waitForSelector(".card");
await p.evaluate(() => localStorage.setItem("aimlab.settings.v2", JSON.stringify({ cm360: 35, dpi: 800, fov: 90, difficulty: 2, rawInput: true, durationS: 20 })));
// seed one history entry per drill so cards and charts render; real sessions below add more
await p.reload(); await p.waitForSelector(".card");
let sfxCounts = {};
async function session(route, perFrame, ms) {
  await p.evaluate((r) => (location.hash = "#/" + r), route); await p.waitForFunction(() => window.aimlab?.drill?.start);
  await p.waitForTimeout(500); await p.screenshot({ path: `proof/${route}_start_${tag}.png` });
  await p.evaluate(() => window.aimlab.drill.start()); await p.waitForTimeout(3200);
  await p.evaluate(perFrame);
  await p.waitForTimeout(ms / 2); await p.screenshot({ path: `proof/${route}_running_${tag}.png` });
  await p.waitForSelector("#results", { timeout: ms + 15000 }); await p.waitForTimeout(400); await p.screenshot({ path: `proof/${route}_results_${tag}.png` });
  const r = await p.evaluate(() => { const a = window.aimlab, d = a.drill; return { fxLog: [...new Set(d.fx.log.map((x) => x.split(" (")[0]))].slice(0, 40), sfx: d.sfx.played.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {}), frame: d.frame.summary(), result: d.drill.result(), phase: d.session.phase, lock: d.input.state, latency: (() => { const l = [...d.input.stats.latencyMs].sort((x, y) => x - y); return { n: l.length, p50: l[l.length >> 1], p95: l[Math.floor(l.length * 0.95)] }; })() }; });
  Object.assign(sfxCounts, { [route]: r.sfx }); return r;
}
out.souls = await session("souls", () => { const a = window.aimlab, H = a.hooks; const f = () => { if (a.drill?.session.phase !== "running") return requestAnimationFrame(f);
  const s = H.sim; const orb = s.orbs.find((o) => o.state === "lit"); const t = s.troopers.find((t) => t.alive && t.team === "enemy" && t.hp <= 40);
  // simulated hand: inject raw counts each frame (exercises accumulation and latency path), click when on target
  if (orb) { H.aimAt(orb.x, H.orbY(orb), orb.z); a.drill.input.click(); } else if (t) { H.aimAt(t.x, 0.9, t.z); a.drill.input.click(); }
  a.drill.input.inject(1, 0); a.drill.input.inject(-1, 0); requestAnimationFrame(f); }; f(); }, 20000);
out.tracking = await session("tracking", () => { const a = window.aimlab; window.__clips = {}; const f = () => { if (a.drill?.session.phase === "running") { a.hooks.autoAim(); a.drill.input.inject(0, 0); const d = a.hooks.dummy; if (d) window.__clips[a.hooks.mover.mode + ">" + d.clip] = 1; } requestAnimationFrame(f); }; f(); }, 20000);
out.models = await p.evaluate(() => window.aimlab.models); out.dummyModeToClip = await p.evaluate(() => Object.keys(window.__clips).sort());
await p.evaluate(() => (location.hash = "#/")); await p.waitForSelector(".card"); await p.waitForTimeout(500); await p.screenshot({ path: `proof/hub_${tag}.png` });
out.hubHistory = await p.evaluate(async () => (await window.aimlab.store.results()).map((r) => [r.drill, r.score]));
// crosshair URL precedence in the live page
await p.goto(`${base}/index.html?ch=255,80,40,2,3,12,1,1,1,1,1#/souls`); await p.waitForFunction(() => window.aimlab?.drill); await p.waitForTimeout(500);
out.crosshair = await p.evaluate(() => window.aimlab.drill.crosshair); await p.screenshot({ path: `proof/souls_crosshair_url_${tag}.png` });
// fallback: block every .glb and confirm both drills still run on code shapes
const p2 = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs2 = []; p2.on("pageerror", (e) => errs2.push(String(e)));
await p2.route("**/*.glb", (r) => r.abort()); await p2.goto(`${base}/index.html#/tracking`); await p2.waitForFunction(() => window.aimlab?.drill?.start, null, { timeout: 15000 });
await p2.evaluate(() => window.aimlab.drill.start()); await p2.waitForTimeout(4500); await p2.screenshot({ path: `proof/tracking_fallback_${tag}.png` });
out.fallback = await p2.evaluate(() => ({ failed: window.aimlab.models.failed.length, dummy: window.aimlab.hooks.dummy, phase: window.aimlab.drill.session.phase })); out.fallback.errors = errs2;
out.sfxPlayed = sfxCounts; out.done = true; out.errors = errs; await b.close(); writeFileSync(`proof/e2e_results_${tag}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
