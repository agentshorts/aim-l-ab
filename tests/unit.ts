import { SFX } from "../core/sfx_synth";
import { PROFILES, sampleQ } from "../drills/deadlock-tracking/profile";
import { trooperFeedback, DMG as SOUL_DMG } from "../drills/deadlock-souls/feedback";
import { labelLayout, LABEL_LANES, LANE_PX, Item } from "../core/fx";
import { normalize as norm2, CUE_KEYS as CK } from "../core/settings";
import { SoulSim } from "../drills/deadlock-souls/sim";
import { Mover } from "../drills/deadlock-tracking/mover";
import { MOVE, TROOPER, ORB } from "../core/spec";
import { cm360ToDeadlockSens, deadlockSensToCm360, radPerCountFromCm360 } from "../core/sens";
import { parseShare, loadCrosshair, DEFAULT_CROSSHAIR, toShare, CROSSHAIR_KEY, pipOffset } from "../core/crosshair";
import { Session } from "../core/session";
import { LocalStore } from "../core/storage";
let fails = 0; const ok = (name: string, c: boolean, info = "") => { console.log(`${c ? "PASS" : "FAIL"} ${name} ${info}`); if (!c) fails++; };
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e;
(async () => {
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 5, seed: 1 }); const e = s.troopers[1];
  s.step(0.5); ok("trooper HP drop per tick = 35 dps * 0.5 s = 17.5", near(e.hp, 300 - 17.5), `hp=${e.hp}`);
  for (let i = 0; i < 2000 && e.alive; i++) s.step(0.01); ok("ranged 300 hp dies at 9.0 s (18 ticks)", near(s.t, 9.0, 0.011), `t=${s.t.toFixed(3)}`);
  ok("orb spawns on death, floating share 50 of 100", s.orbs.some((o) => o.owner === "ally") && TROOPER.bounty0 * TROOPER.floatingShare === 50);
  ok("wave phase cleared, respawns after delay", s.wave === "cleared"); for (let i = 0; i < 200; i++) s.step(0.01); ok("new wave spawned", s.wave === "fighting" && s.waves === 2); }
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 0, seed: 1 });
  while (!s.orbs.length) s.step(0.001); const born = s.orbs[0].born; while (s.orbs.some((o) => o.owner === "ally" && o.state !== "claimed")) s.step(0.001);
  const d = s.events.find((e) => e.type === "oppDeny"); ok("opponent cannot deny before light-up + 80 ms grace", !!d && d.t - born >= ORB.lightUp + ORB.grace - 1e-6, `at ${((d!.t - born) * 1000).toFixed(0)} ms`); }
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 9, seed: 1 });
  while (!s.orbs.length) s.step(0.001); const born = s.orbs[0].born; while (s.orbs.some((o) => o.state !== "claimed")) s.step(0.001);
  const p = s.events.find((e) => e.type === "popOwner"); ok("unclaimed orb pops at 1.0 s to owner (not counted lost)", !!p && near(p.t - born, ORB.pop, 0.002), `${((p!.t - born) * 1000).toFixed(0)} ms`); }
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: 40, oppReact: 9, seed: 1 }); const e = s.troopers[1];
  while (e.windowAt === undefined) s.step(0.001); const r = s.shootTrooper(e); ok("last hit at window open: error ~0 ms", r.res === "lasthit" && Math.abs(r.errMs) <= 1.01, `err=${r.errMs.toFixed(2)} ms`);
  const o = s.orbs[0]; s.step(0.1); ok("orb shot while dark = early", s.shootOrb(o).res === "early"); s.step(0.0501); const r2 = s.shootOrb(o); ok("orb shot at light-up = secure, err ~0", r2.res === "secure" && Math.abs(r2.errMs) < 1, `err=${r2.errMs.toFixed(2)} ms`);
  ok("claimed orb cannot be claimed twice", s.shootOrb(o).res === "late"); }
{ const m = new Mover(["dash"]); m.set("dash"); let peak = 0, t = 0, dist = 0; const dt = 1 / 1000; while (m.mode === "dash") { m.step(dt); peak = Math.max(peak, Math.abs(m.vx)); dist += Math.abs(m.vx) * dt; t += dt; }
  ok("dash peak = 635 u/s = 16.13 m/s", near(peak, 635 * 0.0254, 0.05), `peak=${peak.toFixed(2)}`); ok("dash duration 0.62 s", near(t, 0.62, 0.002), `t=${t.toFixed(3)} dist=${dist.toFixed(2)} m (EST)`); }
{ const m = new Mover(["air"]); m.set("air"); let top = 0; while (m.mode === "air") { m.step(1 / 1000); top = Math.max(top, m.y); } ok("jump apex = 45 u = 1.143 m", near(top, 45 * 0.0254, 0.01), `apex=${top.toFixed(3)}`); }
{ const m = new Mover(["zip"]); m.x = -8; m.set("zip"); m.dir = 1; m.step(0.1); ok("zipline 18 m/s", near(Math.abs(m.vx), 18), `v=${m.vx}`);
  for (let i = 0; i < 2000 && m.mode !== "walk"; i++) m.step(0.005); ok("zip ends by dropping (air) then landing, no teleport", m.log.map((l) => l.mode).join(">") === "zip>air>walk", m.log.map((l) => l.mode).join(">"));
  const m2 = new Mover(["walk"]); m2.set("slide"); ok("illegal transition walk>slide rejected", m2.illegal === 1 && m2.mode === "walk"); }
{ const m = new Mover(["walk", "dash", "slide", "air", "zip"], 11); for (let i = 0; i < 60000; i++) m.step(1 / 144); ok("60k random steps: no illegal transitions, stays in bounds", m.illegal === 0 && Math.abs(m.x) <= 9 && m.y >= 0, `changes=${m.log.length}`); }
ok("gravity derived 24.56 m/s^2", near(MOVE.gravity, 24.564, 0.01), MOVE.gravity.toFixed(3));
// sensitivity math
ok("deadlock sens 1 @ 800 dpi = 25.98 cm/360", near(deadlockSensToCm360(1, 800), 25.977, 0.01), deadlockSensToCm360(1, 800).toFixed(3));
ok("cm360 <-> deadlock sens roundtrip", near(cm360ToDeadlockSens(deadlockSensToCm360(0.73, 1600), 1600), 0.73, 1e-9));
{ const k = radPerCountFromCm360(35, 800); const counts = (35 / 2.54) * 800; ok("35 cm of counts at 800 dpi = exactly 2*pi", near(counts * k, 2 * Math.PI, 1e-9)); }
// crosshair parsing and precedence
{ const mem: any = { [CROSSHAIR_KEY]: JSON.stringify({ ...DEFAULT_CROSSHAIR, r: 255, gap: 2 }) }; const ls = { getItem: (k: string) => mem[k] ?? null };
  ok("defaults when nothing set", loadCrosshair("", { getItem: () => null }).source === "default" && loadCrosshair("", { getItem: () => null }).cfg.g === 245);
  ok("localStorage used when no ?ch", loadCrosshair("", ls).source === "localStorage" && loadCrosshair("", ls).cfg.r === 255);
  const u = loadCrosshair("?ch=10,20,30,-1,3,8,0.5,1,0.2,1,0", ls); ok("?ch wins over localStorage, 11 values in order, booleans 0/1", u.source === "url" && u.cfg.r === 10 && u.cfg.gap === -1 && u.cfg.height === 8 && u.cfg.pipBorder === true && u.cfg.staticGap === false);
  ok("bad ?ch (wrong count) falls back", loadCrosshair("?ch=1,2,3", ls).source === "localStorage"); ok("share roundtrip", toShare(parseShare(toShare(DEFAULT_CROSSHAIR))!) === "0,245,255,-3,4,10,1,0,0,0,1", toShare(DEFAULT_CROSSHAIR)); }
  ok("pip offset matches site: max(0, h/2+gap); defaults -> 2 px", pipOffset(DEFAULT_CROSSHAIR) === 2 && pipOffset({ ...DEFAULT_CROSSHAIR, gap: -20 }) === 0, String(pipOffset(DEFAULT_CROSSHAIR)));
// session phases
{ const s = new Session(2); ok("cannot run from idle", !s.go("running")); s.go("countdown"); let tot = 0; for (let i = 0; i < 1000 && s.phase !== "results"; i++) tot += s.step(0.01); ok("countdown 3 s then exactly 2 s of sim time", near(tot, 2, 1e-9) && s.phase === "results", `sim=${tot.toFixed(3)}`); }
// storage
{ const mem: any = {}; const st = new LocalStore({ getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } });
  await st.addResult({ drill: "x", at: "2026-01-01T00:00:00Z", difficulty: 1, score: 5, metrics: {} }); const ex = await st.exportAll();
  const mem2: any = {}; const st2 = new LocalStore({ getItem: (k) => mem2[k] ?? null, setItem: (k, v) => { mem2[k] = v; } }); const n = await st2.importAll(JSON.parse(JSON.stringify(ex))); const n2 = await st2.importAll(ex);
  ok("export/import roundtrip, dedupe on reimport", n === 1 && n2 === 0 && (await st2.results("x"))[0].score === 5);
  let threw = false; try { await st2.importAll({ foo: 1 }); } catch { threw = true; } ok("import rejects foreign JSON", threw); }
})();
// ---- feedback cues and sfx (v4)
{ const sr = 48000; for (const [k, f] of Object.entries(SFX)) { const s = f(sr); let peak = 0, nan = false; for (const v of s) { if (!Number.isFinite(v)) nan = true; peak = Math.max(peak, Math.abs(v)); }
    ok(`sfx ${k}: finite, 0.05..1.6 s, peak 0.05..1.5`, !nan && s.length >= 0.05 * sr && s.length <= 1.6 * sr && peak > 0.05 && peak < 1.5, `len=${(s.length / sr).toFixed(2)}s peak=${peak.toFixed(2)}`); }
  for (const e of ["hit", "lasthit", "secure", "deny", "miss", "countdown"]) ok(`sfx event mapped: ${e}`, typeof SFX[e] === "function");
  const learn = norm2({}); ok("default preset learn, all cues on", learn.cuePreset === "learn" && CK.every((k) => learn.cues[k]));
  const pro = norm2({ cuePreset: "pro", cues: { hitMarkers: true } }); ok("pro preset forces cues off", CK.every((k) => !pro.cues[k]));
  const cu = norm2({ cuePreset: "custom", cues: { hitMarkers: false } }); ok("custom keeps per-cue toggles", !cu.cues.hitMarkers && cu.cues.orbCues);
  ok("volume clamped, mute bool", norm2({ volume: 7, muted: 1 }).volume === 1 && norm2({ muted: 1 }).muted === true); }
{ const s = new SoulSim({ perSide: 1, variance: 0, playerDamage: SOUL_DMG, oppReact: 9, seed: 1 }); const e = s.troopers[1]; const hp0 = e.hp;
  const r = s.shootTrooper(e); const fb = trooperFeedback(r.res);
  ok("body hit on full-HP trooper: result hit, hp -40", r.res === "hit" && near(hp0 - e.hp, 40), `res=${r.res} dhp=${hp0 - e.hp}`);
  ok("body hit feedback: hit sound, damage number 40, small marker", fb.sound === "hit" && fb.number?.text === "40" && fb.marker === "hit" && typeof SFX[fb.sound] === "function");
  const lh = trooperFeedback("lasthit"); ok("last hit feedback: lasthit sound, kill marker", lh.sound === "lasthit" && lh.marker === "kill" && lh.number?.text === "LAST HIT"); }
{ const L = (t0: number): Item => ({ kind: "label", t0, dur: 0.9, color: "#fff", text: "x" }); const its = [L(0), L(0.1), L(0.2), L(0.3)]; const m = labelLayout(its);
  const ys = [...m.values()]; ok("center labels never share a lane", new Set(ys).size === ys.length && ys.every((a) => ys.every((b) => a === b || Math.abs(a - b) >= LANE_PX)), ys.join(","));
  ok(`label lanes capped at ${LABEL_LANES}, oldest dropped, newest nearest center`, m.size === LABEL_LANES && !m.has(its[0]) && m.get(its[3]) === 60); }
{ const q = PROFILES.realistic.reversalQ!; ok("realistic reversal sampler hits study median 0.833 s", near(sampleQ(q, 0.5), 0.833, 1e-9) && sampleQ(q, 0) === 0.15 && sampleQ(q, 1) === 2.5);
  const m = new Mover(["walk", "dash", "slide", "air", "zip"], 11, PROFILES.realistic); let flips = 0, lastDir = m.dir; const dt = 1 / 240;
  for (let i = 0; i < 240 * 600; i++) { m.step(dt); if (m.dir !== lastDir) { flips++; lastDir = m.dir; } }
  const perMin = flips / 10; ok("realistic profile reversal rate consistent with study intervals (median 0.83 s, EST): 25..90 per min", perMin > 25 && perMin < 90, `${perMin.toFixed(1)}/min`);
  ok("realistic profile only uses legal transitions", m.illegal === 0);
  ok("settings default classic, accepts realistic", norm2({}).moveProfile === "classic" && norm2({ moveProfile: "realistic" }).moveProfile === "realistic" && norm2({ moveProfile: "x" }).moveProfile === "classic"); }
console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
