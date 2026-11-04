import * as THREE from "three";
import { Drill, DrillCtx } from "../../core/drill";
import { makeWorld, makeTrooper, PAL } from "../../core/scene3d";
import { Mode } from "./mover";
import { FreeMover, FREE_RATES } from "../../core/freemove";
import { MOVE } from "../../core/spec";
import { PROFILES } from "./profile";
import { DummyView } from "./dummy";
import { getModel } from "../../core/models";
import { LEVEL_DEFS, LevelDef, PathDef, buildLevel, pathLen, pathModes, aimAngles, freePoint, freeYaw, levelSolids, blocked, buildZips, pathCables, unstick } from "./levels";
const LEVELS: { modes: Mode[]; radius: number; bucket: "b1" | "b2" | "b3" }[] = [
  { modes: ["walk"], radius: 0.6, bucket: "b3" }, { modes: ["walk", "dash"], radius: 0.5, bucket: "b2" },
  { modes: ["walk", "dash", "slide", "air"], radius: 0.42, bucket: "b1" }, { modes: ["walk", "dash", "slide", "air", "zip"], radius: 0.36, bucket: "b1" } ];
/** The original street lane, expressed as a level: player at the origin. #53: the zipline now runs over the lane and along it
 * (as in the reference), so the target's free box is the lane itself, 9 to 25 m out and 10 m wide, with the cable over its left side. */
const LANE: LevelDef = { id: "lane", title: "Tracking: movement tech", sub: "", vantage: [0, 1.7, 0], paths: [{ a: [0, 0, -9], b: [0, 0, -25], zip: true, lat: 5 }], props: [],
  zips: [{ a: [-3, 4.7, -2], b: [-3, 4.7, -60] }] };
type Target = { path: PathDef; mover: FreeMover; head: THREE.Mesh; hero: ReturnType<typeof makeTrooper>; dummy: DummyView | null; sign: number };
export function trackingDrill(levelId?: string): Drill {
  const L = (levelId && LEVEL_DEFS[levelId]) || LANE; const isLane = L === LANE;
  let w: ReturnType<typeof makeWorld>, ctx: DrillCtx, lvl = LEVELS[1]; let on = 0, tot = 0, best = 0, streak = 0;
  const ray = new THREE.Raycaster(); const center = new THREE.Vector2(0, 0); let cover: THREE.Object3D[] = []; const solids = levelSolids(L); let zipHit = 0, bumps = 0;
  const eye = new THREE.Vector3(...L.vantage); const T: Target[] = []; let live = 0, tSwitch = 0;
  const nT = Math.max(1, L.targets ?? 1);
  for (let i = 0; i < nT; i++) { const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshLambertMaterial({ color: PAL.amber, emissive: 0x3a2200 }));
    const hero = makeTrooper("enemy", "ranged"); hero.bar.visible = false; T.push({ path: L.paths[i % L.paths.length], mover: null as any, head, hero, dummy: null, sign: 1 }); }
  let mover: FreeMover; let head: THREE.Mesh;
  /** #52: feet inside a level solid (walls, buildings, the ramp body, bridge pillars) */
  const inSolid = (path: PathDef, m: FreeMover) => { if (m.mode === "zip") return false; const p = freePoint(path, m.u, m.v, m.y); return blocked(solids, p.x, p.y, p.z); };
  const mk = () => { lvl = LEVELS[ctx.settings.difficulty] ?? LEVELS[1];
    // free movement (#51): any direction inside a box around the path (half-length along, path.lat across, default 2.5 m ESTIMATED)
    for (const t of T) { const lim = pathLen(t.path) / 2, lat = t.path.lat ?? 2.5; const m = new FreeMover(pathModes(t.path, lvl.modes), { u0: -lim, u1: lim, v0: -lat, v1: lat }, FREE_RATES[ctx.settings.difficulty] ?? FREE_RATES[1], (Math.random() * 1e9) | 0);
      m.dashPeak = MOVE.dash[lvl.bucket].peak; m.dashDur = MOVE.dash[lvl.bucket].dur; m.cables = pathCables(t.path, L.zips ?? []); if (!isLane) m.u = (Math.random() - 0.5) * lim;
      for (let k = 0; k < 40 && inSolid(t.path, m); k++) { m.u = (Math.random() - 0.5) * 2 * lim; m.v = (Math.random() - 0.5) * 2 * lat; } t.mover = m; }
    live = 0; tSwitch = 0; mover = T[0].mover; head = T[0].head; };
  const drill: Drill = {
    holdsFire: true, id: isLane ? "deadlock-tracking" : `deadlock-tracking-${L.id}`, title: isLane ? L.title : `Tracking: ${L.title}`, primary: "on-target %",
    howTo: `<p>Keep the crosshair on the glowing head. The target moves with spec movement numbers:</p>
<ul><li>walk 6.4 m/s, dash 635/579/562 u/s over 0.62/0.68/0.72 s by speed bucket</li><li>slide after dash (friction 0.1875), jump 295 u/s to 1.14 m, air strafe</li><li>zipline 18 m/s, drop keeps momentum</li></ul><p class=hint>Score is time on target as a percent. Harder levels add moves and shrink the head.</p>${isLane ? "" : `<p>${L.sub}</p>`}`,
    hudLabels: ["on target %", "streak s", "best streak s", "mode"],
    init(cx) { ctx = cx; w = makeWorld(cx.canvas, cx.settings.fov); cx.fx.cam = w.cam; w.cam.position.copy(eye);
      for (const t of T) { w.scene.add(t.head, t.hero.g); t.dummy = DummyView.create(); if (t.dummy) { t.hero.g.visible = false; w.scene.add(t.dummy.g); } }
      buildZips(w.scene, L.zips ?? []);
      if (isLane) {
        for (const [n, x, z, ry] of [["building_guardhouse", -11, -26, 0.4], ["building_tower", 12, -30, -0.3]] as const) { const b = getModel(n); if (b) { b.obj.position.set(x, 0, z); b.obj.rotation.y = ry; w.scene.add(b.obj); } } }
      else cover = buildLevel(w.scene, L);
      mk(); },
    reset() { mk(); on = tot = best = streak = 0; ctx.input.yaw = L.yaw0 ?? 0; ctx.input.pitch = L.pitch0 ?? 0; },
    setSettings() { w.setFov(ctx.settings.fov); }, resize() { w.resize(); },
    update(dt) {
      if (dt <= 0) return;
      if (T.length > 1 && (tSwitch += dt) >= (L.switchS ?? 4)) { tSwitch = 0; live = (live + 1) % T.length; mover = T[live].mover; head = T[live].head; }
      T.forEach((t, i) => { const m = t.mover, pu = m.u, pv = m.v; m.step(dt);
        // #52 collision: a step that ends inside a solid is undone; the mover turns away (a dash or slide ends there)
        if (inSolid(t.path, m)) { m.u = pu; m.v = pv; m.vu = 0; m.vv = 0; m.heading(); bumps++; if (m.mode === "dash" || m.mode === "slide") m.set("walk"); unstick(m, () => inSolid(t.path, m)); } const p = freePoint(t.path, m.u, m.v, m.y);
        t.head.scale.setScalar(i === live ? lvl.radius : lvl.radius * 0.8); t.head.position.set(p.x, p.y + 1.7, p.z); t.hero.g.position.copy(p);
        if (t.dummy) { t.dummy.g.position.copy(p); t.dummy.update(m.mode, m.speed, dt, m.mode === "dash" ? m.dashDur : m.mode === "air" ? 2 * MOVE.jumpV / MOVE.gravity : undefined); if (m.speed > 0.05) { const f = freeYaw(t.path, m.vu, m.vv); t.dummy.g.rotation.y = f; t.dummy.face = f; } else t.dummy.g.rotation.y = t.dummy.face; }
        const mat = t.head.material as THREE.MeshLambertMaterial; if (i !== live) { mat.color.setHex(0x59626a); mat.emissive.setHex(0); } });
      w.cam.rotation.y = -ctx.input.yaw; w.cam.rotation.x = ctx.input.pitch; w.cam.updateMatrixWorld();
      ray.setFromCamera(center, w.cam); const hits = ray.intersectObjects([head, ...cover], true); const firing = ctx.weapon ? ctx.weapon.hold(dt) : true; const hit = firing && hits.length > 0 && hits[0].object === head; tot += dt;
      // #53: a target hit while on the zipline is knocked off after 0.12 s of hits (ESTIMATED; held fire lands several bullets)
      if (hit && mover.mode === "zip") { if ((zipHit += dt) >= 0.12) { mover.knock(); zipHit = 0; ctx.fx.label(head.position.clone(), "KNOCKED OFF", "#e8a93c"); } } else zipHit = 0;
      if (hit) { on += dt; const before = Math.floor(streak / 3); streak += dt; best = Math.max(best, streak); if (Math.floor(streak / 3) > before) { ctx.sfx.play("countdown", 0.6); ctx.fx.label(null, `${Math.floor(streak)} s streak`, "#e8a93c", "streakMeter"); } }
      else { if (streak > 1) ctx.fx.label(null, "lost target", "#9aa4a8", "missFeedback"); streak = 0; }
    },
    render() { w.cam.rotation.y = -ctx.input.yaw; w.cam.rotation.x = ctx.input.pitch; const glow = ctx.settings.cues.trackingGlow; (head.material as THREE.MeshLambertMaterial).emissive.setHex(glow && streak > 0 ? 0xb07000 : 0x3a2200);
      (head.material as THREE.MeshLambertMaterial).color.setHex(glow && streak > 0 ? 0xffd27a : PAL.amber);
      ctx.fx.meter = ctx.settings.cues.streakMeter ? { frac: streak / 10, text: `streak ${streak.toFixed(1)} s (best ${best.toFixed(1)})` } : null; w.renderer.render(w.scene, w.cam); },
    hud() { return [(100 * on / Math.max(tot, 1e-6)).toFixed(1), streak.toFixed(1), best.toFixed(1), mover.mode]; },
    result() { const p = 100 * on / Math.max(tot, 1e-6); return { score: +p.toFixed(1), metrics: { onTargetPct: +p.toFixed(1), bestStreakS: +best.toFixed(2), seconds: +tot.toFixed(1), modeChanges: mover.log.length, illegalTransitions: mover.illegal, knockoffs: T.reduce((a, t) => a + t.mover.knocks, 0), bumps } }; },
  };
  drill.hooks = { level: L.id, get live() { return live; }, get mover() { return mover; }, get dummy() { const d = T[live].dummy; return d ? { clip: d.cur, face: d.face } : null; },
    get headPos() { return head.position.toArray(); }, get bumps() { return bumps; }, solids, targets: T, inSolid, autoAim() { const a = aimAngles(eye, head.position); ctx.input.yaw = a.yaw; ctx.input.pitch = a.pitch; } };
  return drill;
}
