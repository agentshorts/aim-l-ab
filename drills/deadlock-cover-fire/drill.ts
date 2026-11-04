import * as THREE from "three";
import { Drill, DrillCtx } from "../../core/drill";
import { makeWorld, makeTrooper, PAL } from "../../core/scene3d";
import { getModel } from "../../core/models";
import { DummyView } from "../deadlock-tracking/dummy";
import { MOVE } from "../../core/spec";
import { CoverSim, Peek, DIFFS, Enemy } from "./sim";
/** Player cover: a wall 1.2 m ahead, 3.2 m wide and taller than eye height. Leaning out moves the eye PEEK_X to the peek side. */
export const WALL = { z: -1.2, half: 1.6, h: 1.9 }, PEEK_X = 2.3, EYE = 1.7;
type View = { hero: ReturnType<typeof makeTrooper>; dummy: DummyView | null };
export function coverFireDrill(): Drill {
  let w: ReturnType<typeof makeWorld>, ctx: DrillCtx, sim: CoverSim; const peek = new Peek(); let hold = { key: false, mouse: false };
  const ray = new THREE.Raycaster(), center = new THREE.Vector2(0, 0); const views = new Map<number, View>(); let blockers: THREE.Object3D[] = []; let coverGroup: THREE.Group | null = null;
  let on = 0, exposedT = 0, streak = 0, best = 0, hitTick = 0, seen = 0, lostAt: number | null = null;
  const RED = "#d0563b", AMBER = "#e8a93c";
  const wpos = (e: Enemy, y = 0) => new THREE.Vector3(e.x, y + e.y, -e.z);
  const mkCover = () => {
    if (coverGroup) w.scene.remove(coverGroup); coverGroup = new THREE.Group(); blockers = [];
    const mat = new THREE.MeshLambertMaterial({ color: PAL.stripe }), own = new THREE.MeshLambertMaterial({ color: PAL.bldB });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(WALL.half * 2, WALL.h, 0.4), own); wall.position.set(0, WALL.h / 2, WALL.z); coverGroup.add(wall); blockers.push(wall);
    // enemy cover: a crate 0.8 m in front of each cover point (toward you), tall enough to hide a standing hero
    const wm = getModel("wall_straight");
    for (const c of sim.covers) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.6), mat); b.position.set(c.x, 1.0, -(c.z - 0.8)); coverGroup.add(b); blockers.push(b);
      if (wm) { const m = wm.obj.clone(); m.position.copy(b.position).setY(0); m.scale.set(1.5 / 4.1, 2.0 / 2.23, 1); /* wall_straight is 4.1 x 2.23 m; match the 1.5 x 2.0 m hit box */ m.traverse((o) => ((o as THREE.Mesh).raycast = () => {})); coverGroup.add(m); b.visible = false; } }
    w.scene.add(coverGroup); };
  const clearViews = () => { for (const v of views.values()) { w.scene.remove(v.hero.g); if (v.dummy) w.scene.remove(v.dummy.g); } views.clear(); };
  const mk = () => { const d = DIFFS[ctx.settings.difficulty] ?? DIFFS[1]; sim = new CoverSim(d, (Math.random() * 1e9) | 0, ctx.settings.difficulty); clearViews(); mkCover(); peek.state = "cover"; peek.frac = 0; peek.peekedS = 0; seen = 0; lostAt = null; };
  const onKey = (down: boolean) => (e: KeyboardEvent) => { if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyQ") hold.key = down; };
  const onMouse = (down: boolean) => (e: MouseEvent) => { if (e.button === 2) hold.mouse = down; };
  const camUpdate = () => { w.cam.position.set(sim.side * PEEK_X * peek.frac, EYE, 0); w.cam.rotation.y = -ctx.input.yaw; w.cam.rotation.x = ctx.input.pitch; w.cam.updateMatrixWorld(); };
  // test hook: aim at the exposed enemy on the peek side inside update, so the ray sees the same frame (browser test only)
  let bot = false; const dbg: Record<string, number> = { none: 0, wall: 0, cover: 0, enemy: 0, exposedFrames: 0 }; const botAim = () => { w.cam.position.set(sim.side * PEEK_X * peek.frac, EYE, 0); const r = new THREE.Raycaster();
    const clear = (e: Enemy) => { const v = views.get(e.id); if (!v) return false; const to = new THREE.Vector3(e.x, 1.0 + e.y, -e.z).sub(w.cam.position); const d = to.length(); r.set(w.cam.position, to.normalize()); r.far = d; return !r.intersectObjects(blockers, false).length; };
    const ex = sim.exposed().filter(clear).sort((a, b) => a.hp - b.hp)[0]; if (ex) drill.hooks!.aimAt(ex); };
  const drill: Drill = {
    holdsFire: true, id: "deadlock-cover-fire", title: "Cover fire: hold the line", primary: "points",
    howTo: `<p>Enemies dash from cover to cover toward you. If one gets within the lose distance (6 to 7 m by difficulty), you lose the round.</p>
<ul><li>You stand behind your own wall and can only peek <b>one side</b> (shown in the HUD, picked each round). Hold <b>Shift</b>, <b>Q</b> or <b>right mouse</b> to lean out; let go to duck back.</li>
<li>Fire is held for you while you are leaned out: keep the crosshair on a moving enemy to wear it down. Enemies behind cover take no damage; you only get them in the open.</li>
<li>They walk at 6.4 m/s and can dash (579 u/s peak over 0.68 s, spec numbers) at the start of a run or mid-run.</li></ul>
<p class=hint>Points: 100 per kill, 5 per second survived, 250 for lasting the full timer. Red rings mark enemies close to your line.</p>`,
    hudLabels: ["kills", "closest m", "on target %", "peek", "alive s"],
    init(cx) { ctx = cx; w = makeWorld(cx.canvas, cx.settings.fov); cx.fx.cam = w.cam;
      addEventListener("keydown", onKey(true)); addEventListener("keyup", onKey(false)); cx.canvas.addEventListener("mousedown", onMouse(true)); addEventListener("mouseup", onMouse(false)); cx.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      mk(); },
    reset() { mk(); on = exposedT = streak = best = hitTick = 0; hold = { key: false, mouse: false }; ctx.input.yaw = 0; ctx.input.pitch = -0.03; },
    setSettings(s) { w.setFov(s.fov); }, resize() { w.resize(); },
    update(dt, _clicks, now) {
      if (dt <= 0) return; peek.step(dt, hold.key || hold.mouse); sim.step(dt); if (bot) botAim(); camUpdate();
      for (; seen < sim.events.length; seen++) { const ev = sim.events[seen]; const e = sim.enemies.find((x) => x.id === ev.id);
        if (ev.type === "dash" && e && ctx.settings.cues.missFeedback) ctx.fx.label(wpos(e, 2.3), "DASH", AMBER);
        if (ev.type === "dead" && e) { ctx.fx.label(wpos(e, 2.3), "KILL +100", "#7fcf6a"); ctx.fx.hitMarker(true); ctx.fx.flash("rgba(127,207,106,.8)"); ctx.sfx.play("kill"); }
        if (ev.type === "lost") { lostAt = now; ctx.fx.flash("rgba(208,86,59,.95)"); ctx.fx.label(null, "THEY REACHED YOUR COVER", RED); ctx.sfx.play("lost"); } }
      const ex = sim.exposed(); if (ex.length) exposedT += dt;
      // first thing the crosshair ray hits: your wall and enemy cover block shots, enemies behind cover take nothing
      const targets: THREE.Object3D[] = [...blockers]; for (const e of sim.enemies) { const v = views.get(e.id); if (v && e.state !== "dead") targets.push(v.hero.hit); }
      ray.setFromCamera(center, w.cam); const hit = ray.intersectObjects(targets, false)[0];
      const id = hit ? [...views.entries()].find(([, v]) => v.hero.hit === hit.object)?.[0] : undefined; const tgt = id ? sim.enemies.find((e) => e.id === id) : undefined;
      dbg[!hit ? "none" : hit.object === blockers[0] ? "wall" : blockers.includes(hit.object) ? "cover" : "enemy"]++; if (sim.exposed().length) dbg.exposedFrames++;
      const firing = peek.canShoot && (ctx.weapon ? ctx.weapon.hold(dt) : true);
      if (firing && tgt && tgt.state === "moving") { on += dt; streak += dt; best = Math.max(best, streak); const r = sim.damage(tgt.id, dt);
        if (r === "hit" && (hitTick += dt) > 0.12) { hitTick = 0; ctx.sfx.play("hit", 0.4); ctx.fx.hitMarker(false); } }
      else { if (streak > 0.6 && ctx.settings.cues.missFeedback) ctx.fx.label(null, "lost track", "#9aa4a8", "missFeedback"); streak = 0; }
    },
    render() {
      camUpdate(); const live = new Set(sim.enemies.map((e) => e.id));
      for (const [id, v] of views) if (!live.has(id)) { w.scene.remove(v.hero.g); if (v.dummy) w.scene.remove(v.dummy.g); views.delete(id); }
      for (const e of sim.enemies) { let v = views.get(e.id); if (!v) { const hero = makeTrooper("enemy", "ranged"); const dummy = DummyView.create(); w.scene.add(hero.g);
          if (dummy) { for (const c of hero.g.children) if (c !== hero.bar && c !== hero.hit) c.visible = false; w.scene.add(dummy.g); } v = { hero, dummy }; views.set(e.id, v); }
        const p = wpos(e); v.hero.g.position.copy(p); v.hero.setHp(e.hp / e.max, false); v.hero.bar.quaternion.copy(w.cam.quaternion);
        const face = e.state === "moving" ? Math.atan2(e.vx, -e.vz) : Math.atan2(-p.x, -p.z);
        if (v.dummy) { v.dummy.g.position.copy(p); v.dummy.update(e.state === "moving" ? (e.dashing ? "dash" : e.y > 0 ? "air" : "walk") : "walk", e.state === "moving" ? Math.hypot(e.vx, e.vz) : 0, 1 / 60, e.dashing ? MOVE.dash.b2.dur : undefined); v.dummy.g.rotation.y = face; v.dummy.g.visible = e.state !== "dead"; }
        else v.hero.g.rotation.y = face;
        v.hero.g.visible = e.state !== "dead";
        const d = sim.dist(e); if (e.state !== "dead" && d < sim.d.loseDist + 5) ctx.fx.rings.push({ pos: wpos(e, 1.2), frac: Math.max(0, (d - sim.d.loseDist) / 5), color: RED, label: `${d.toFixed(1)} m` });
        else if (e.state === "moving" && ctx.settings.cues.trackingGlow) ctx.fx.rings.push({ pos: wpos(e, 1.2), frac: e.hp / e.max, color: AMBER, r: 10, width: 2 }); }
      ctx.fx.meter = ctx.settings.cues.streakMeter ? { frac: Math.min(1, streak / 2), text: `${peek.canShoot ? "PEEKING" : peek.state === "cover" ? "IN COVER" : "LEANING"} ${sim.side > 0 ? "right" : "left"}  track ${streak.toFixed(1)} s` } : null;
      w.renderer.render(w.scene, w.cam); },
    hud() { return [String(sim.kills), Number.isFinite(sim.closest) ? sim.closest.toFixed(1) : "-", (100 * on / Math.max(exposedT, 1e-6)).toFixed(1), `${sim.side > 0 ? "R" : "L"} ${peek.state}`, sim.t.toFixed(1)]; },
    result() { const survived = sim.round !== "lost"; const sec = Math.floor(sim.t); const score = 100 * sim.kills + 5 * sec + (survived ? 250 : 0);
      return { score, metrics: { kills: sim.kills, survivedS: +sim.t.toFixed(1), lost: survived ? 0 : 1, closestM: +(Number.isFinite(sim.closest) ? sim.closest : 0).toFixed(2), onTargetPct: +(100 * on / Math.max(exposedT, 1e-6)).toFixed(1),
        bestTrackS: +best.toFixed(2), peekedPct: +(100 * peek.peekedS / Math.max(sim.t, 1e-6)).toFixed(1), dashes: sim.enemies.reduce((a, e) => a + e.dashes, 0), illegalTransitions: peek.illegal + sim.enemies.reduce((a, e) => a + e.illegal, 0) } }; },
    ended() { return sim.round === "lost" && lostAt !== null; },
  };
  drill.hooks = { get sim() { return sim; }, peek, setPeek(b: boolean) { hold.key = b; }, set bot(b: boolean) { bot = b; }, dbg,
    aimAt(e: Enemy) { const eye = w.cam.position; const dx = e.x - eye.x, dz = -e.z - eye.z, dy = 1.0 + e.y - eye.y; ctx.input.yaw = Math.atan2(dx, -dz); ctx.input.pitch = Math.atan2(dy, Math.hypot(dx, dz)); } };
  return drill;
}
