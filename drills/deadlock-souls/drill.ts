import * as THREE from "three";
import { Drill, DrillCtx } from "../../core/drill";
import { makeWorld, makeTrooper, makeOrb, zipline, PAL } from "../../core/scene3d";
import { Settings } from "../../core/settings";
import { SoulSim, Orb } from "./sim";
import { ORB } from "../../core/spec";
const DIFF = [ { perSide: 2, variance: 0, react: 0.9 }, { perSide: 3, variance: 0.1, react: 0.45 }, { perSide: 4, variance: 0.2, react: 0.28 }, { perSide: 4, variance: 0.3, react: 0.17 } ];
import { DMG, trooperFeedback } from "./feedback";
export function soulsDrill(): Drill {
  let w: ReturnType<typeof makeWorld>, ctx: DrillCtx, sim: SoulSim; const ray = new THREE.Raycaster(); const center = new THREE.Vector2(0, 0);
  const tv = new Map<number, ReturnType<typeof makeTrooper>>(), ov = new Map<number, ReturnType<typeof makeOrb>>();
  let c: Record<string, number> = {}, errs: number[] = [], lhErrs: number[] = [], seen = 0;
  const add = (k: string, n = 1) => (c[k] = (c[k] || 0) + n);
  const mk = () => { const d = DIFF[ctx.settings.difficulty] ?? DIFF[1]; sim = new SoulSim({ perSide: d.perSide, variance: d.variance, playerDamage: DMG, oppReact: d.react, seed: (Math.random() * 1e9) | 0 }); };
  const clearViews = () => { for (const v of tv.values()) w.scene.remove(v.g); for (const v of ov.values()) w.scene.remove(v.g); tv.clear(); ov.clear(); };
  const GREEN = "#7fcf6a", AMBER = "#e8a93c";
  const orbPos = (o: Orb) => new THREE.Vector3(o.x, orbY(o), -o.z);
  const orbY = (o: Orb) => o.y + Math.min(0.6, (sim.t - o.born) * 1.5);
  function fire() {
    ray.setFromCamera(center, w.cam); const targets: THREE.Object3D[] = [];
    for (const [id, v] of ov) { const o = sim.orbs.find((x) => x.id === id); if (o && o.state !== "claimed") targets.push(v.g); }
    for (const [id, v] of tv) { const t = sim.troopers.find((x) => x.id === id); if (t?.alive) targets.push(v.hit); }
    const hit = ray.intersectObjects(targets, true)[0];
    const { fx, sfx } = ctx;
    if (!hit) { add("miss"); fx.label(null, "miss", "#9aa4a8", "missFeedback"); sfx.play("miss"); return "miss"; }
    for (const [id, v] of ov) if (hit.object.parent === v.g) { const o = sim.orbs.find((x) => x.id === id)!; const r = sim.shootOrb(o); add(r.res); const at = orbPos(o);
      if (r.res === "secure" || r.res === "deny") { errs.push(r.errMs); fx.hitMarker(true); const sec = r.res === "secure";
        fx.label(at, `${sec ? "SECURED" : "DENIED"} +2 (${r.errMs >= 0 ? "+" : ""}${r.errMs.toFixed(0)} ms)`, sec ? GREEN : AMBER); fx.flash(sec ? "rgba(127,207,106,.9)" : "rgba(232,169,60,.9)"); sfx.play(r.res); }
      else { fx.label(at, r.res === "early" ? "EARLY: orb still dark" : "LATE: already claimed", "#9aa4a8", "missFeedback"); sfx.play("miss"); }
      return r.res; }
    for (const [id, v] of tv) if (hit.object === v.hit) { const t = sim.troopers.find((x) => x.id === id)!; const r = sim.shootTrooper(t); add(r.res); const at = new THREE.Vector3(t.x, 2.2, -t.z);
      if (r.res === "lasthit") lhErrs.push(r.errMs);
      const fb = trooperFeedback(r.res); if (fb.marker) fx.hitMarker(fb.marker === "kill"); if (fb.number) fx.number(at, fb.number.text, fb.number.color); if (fb.sound) sfx.play(fb.sound);
      return r.res; }
    return "none";
  }
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + Math.abs(y), 0) / a.length : 0);
  const drill: Drill = {
    id: "deadlock-souls", title: "Souls: last hit, secure, deny", primary: "points",
    howTo: `<p>Troopers trade fire in lane (spec numbers: ranged 300 HP, melee 400, medic 350; 35 DPS vs troopers).</p>
<ul><li>Shoot <b style="color:#e8a93c">amber</b> enemy troopers. Your gun does ${DMG}; the HP bar turns white when one shot kills.</li>
<li>A kill drops a floating orb: dark, then it lights up (about 0.15 s, estimated). Shoot <b style="color:#7fcf6a">green</b> orbs to secure, <b style="color:#e8a93c">orange</b> orbs to deny.</li>
<li>You get an 80 ms owner grace on green orbs. Unclaimed orbs pop at about 1 s.</li></ul><p class=hint>Points: last hit 1, secure 2, deny 2, denied or lost orb minus 1.</p>`,
    hudLabels: ["last hits", "secures", "denies", "lost orbs", "orb ms"],
    init(cx) { ctx = cx; w = makeWorld(cx.canvas, cx.settings.fov); cx.fx.cam = w.cam; zipline(w.scene, -5, 4.5, 4, -60); zipline(w.scene, 5, 4.5, 4, -60); mk(); },
    reset() { clearViews(); mk(); c = {}; errs = []; lhErrs = []; seen = 0; ctx.input.yaw = 0; ctx.input.pitch = -0.02; },
    setSettings(s: Settings) { w.setFov(s.fov); },
    resize() { w.resize(); },
    update(dt, clicks) {
      for (const _ of clicks) fire();
      if (dt > 0) sim.step(dt);
      for (; seen < sim.events.length; seen++) { const e = sim.events[seen]; const o = sim.orbs.find((x) => x.id === e.data.id);
        if (e.type === "oppDeny" || e.type === "oppConfirm") { add("lostOrb"); if (o) ctx.fx.label(orbPos(o), e.type === "oppDeny" ? "THEY DENIED -1" : "THEY SECURED -1", "#d0563b"); ctx.sfx.play("lost"); }
        if (e.type === "popOwner" && o) ctx.fx.label(orbPos(o), e.data.owner === "ally" ? "auto (no bonus)" : "missed deny", "#9aa4a8", "missFeedback"); if (e.type === "popOwner" && e.data.owner === "ally") add("autoClaim"); if (e.type === "popOwner" && e.data.owner === "enemy") add("missedDeny"); }
    },
    render() {
      const live = new Set(sim.troopers.filter((t) => t.alive).map((t) => t.id));
      for (const [id, v] of tv) if (!live.has(id)) { w.scene.remove(v.g); tv.delete(id); }
      for (const t of sim.troopers) { if (!t.alive) continue; let v = tv.get(t.id); if (!v) { v = makeTrooper(t.team, t.kind); v.g.position.set(t.x, 0, -t.z); v.g.rotation.y = t.team === "ally" ? Math.PI : 0; w.scene.add(v.g); tv.set(t.id, v); }
        const one = t.team === "enemy" && t.hp <= DMG && ctx.settings.cues.lastHitWindow; v.setHp(t.hp / t.max, one);
        if (one) ctx.fx.rings.push({ pos: new THREE.Vector3(t.x, 1.5, -t.z), frac: 1, color: "#ffffff", r: 14, width: 2, label: "1 SHOT" }); v.bar.quaternion.copy(w.cam.quaternion); v.bar.rotation.y -= v.g.rotation.y; }
      const ids = new Set(sim.orbs.map((o) => o.id));
      for (const [id, v] of ov) if (!ids.has(id)) { w.scene.remove(v.g); ov.delete(id); }
      for (const o of sim.orbs) { let v = ov.get(o.id); if (!v) { v = makeOrb(); w.scene.add(v.g); ov.set(o.id, v); }
        v.g.position.set(o.x, orbY(o), -o.z); v.set(o.owner === "ally" ? 0x7fcf6a : PAL.amber, o.state === "lit"); v.g.visible = o.state !== "claimed"; v.g.rotation.y += 0.05;
        if (ctx.settings.cues.orbCues && o.state !== "claimed") { const age = sim.t - o.born, col = o.owner === "ally" ? GREEN : AMBER, p = orbPos(o);
          if (o.state === "dark") ctx.fx.rings.push({ pos: p, frac: age / ORB.lightUp, color: "#9aa4a8", label: "wait" });
          else { const grace = o.owner === "ally" && age < ORB.lightUp + ORB.grace;
            ctx.fx.rings.push({ pos: p, frac: 1 - (age - ORB.lightUp) / (ORB.pop - ORB.lightUp), color: col, label: grace ? "GRACE" : o.owner === "ally" ? "SECURE" : "DENY" }); } } }
      w.cam.rotation.y = -ctx.input.yaw; w.cam.rotation.x = ctx.input.pitch; w.cam.updateMatrixWorld(); w.renderer.render(w.scene, w.cam);
    },
    hud() { return [String(c.lasthit || 0), String(c.secure || 0), String(c.deny || 0), String(c.lostOrb || 0), mean(errs).toFixed(0)]; },
    result() { const score = (c.lasthit || 0) + 2 * (c.secure || 0) + 2 * (c.deny || 0) - (c.lostOrb || 0);
      return { score, metrics: { lastHits: c.lasthit || 0, secures: c.secure || 0, denies: c.deny || 0, lostOrbs: c.lostOrb || 0, autoClaimed: c.autoClaim || 0, missedDenies: c.missedDeny || 0, earlyOrbShots: c.early || 0, misses: c.miss || 0, orbErrMs: +mean(errs).toFixed(1), lastHitErrMs: +mean(lhErrs).toFixed(1) } }; },
  };
  drill.hooks = { get sim() { return sim; }, fire, aimAt(x: number, y: number, z: number) { ctx.input.yaw = Math.atan2(x, z); ctx.input.pitch = Math.atan2(y - 1.7, Math.hypot(x, z)); }, orbY, ORB };
  return drill;
}
