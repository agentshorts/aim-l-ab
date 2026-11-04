import * as THREE from "three";
import { Drill, DrillCtx } from "../../core/drill";
import { makeWorld, makeTrooper, zipline, PAL } from "../../core/scene3d";
import { Mover, Mode } from "./mover";
import { MOVE } from "../../core/spec";
const LEVELS: { modes: Mode[]; radius: number; bucket: "b1" | "b2" | "b3" }[] = [
  { modes: ["walk"], radius: 0.6, bucket: "b3" }, { modes: ["walk", "dash"], radius: 0.5, bucket: "b2" },
  { modes: ["walk", "dash", "slide", "air"], radius: 0.42, bucket: "b1" }, { modes: ["walk", "dash", "slide", "air", "zip"], radius: 0.36, bucket: "b1" } ];
export function trackingDrill(): Drill {
  let w: ReturnType<typeof makeWorld>, ctx: DrillCtx, mover: Mover, lvl = LEVELS[1]; let on = 0, tot = 0, best = 0, streak = 0;
  const ray = new THREE.Raycaster(); const center = new THREE.Vector2(0, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshLambertMaterial({ color: PAL.amber, emissive: 0x3a2200 }));
  const hero = makeTrooper("enemy", "ranged"); hero.bar.visible = false;
  const mk = () => { lvl = LEVELS[ctx.settings.difficulty] ?? LEVELS[1]; mover = new Mover(lvl.modes, (Math.random() * 1e9) | 0); mover.dashPeak = MOVE.dash[lvl.bucket].peak; mover.dashDur = MOVE.dash[lvl.bucket].dur; };
  const drill: Drill = {
    id: "deadlock-tracking", title: "Tracking: movement tech", primary: "on-target %",
    howTo: `<p>Keep the crosshair on the glowing head. The target moves with spec movement numbers:</p>
<ul><li>walk 6.4 m/s, dash 635/579/562 u/s over 0.62/0.68/0.72 s by speed bucket</li><li>slide after dash (friction 0.1875), jump 295 u/s to 1.14 m, air strafe</li><li>zipline 18 m/s, drop keeps momentum</li></ul><p class=hint>Score is time on target as a percent. Harder levels add moves and shrink the head.</p>`,
    hudLabels: ["on target %", "streak s", "best streak s", "mode"],
    init(cx) { ctx = cx; w = makeWorld(cx.canvas, cx.settings.fov); w.scene.add(head, hero.g); zipline(w.scene, -15, 4.7, -9.5, 9.5, true); mk(); },
    reset() { mk(); on = tot = best = streak = 0; ctx.input.yaw = 0; ctx.input.pitch = 0; },
    setSettings() { w.setFov(ctx.settings.fov); }, resize() { w.resize(); },
    update(dt) {
      if (dt <= 0) return; mover.step(dt);
      head.scale.setScalar(lvl.radius); head.position.set(mover.x, mover.y + 1.7, -mover.z); hero.g.position.set(mover.x, mover.y, -mover.z);
      w.cam.rotation.y = -ctx.input.yaw; w.cam.rotation.x = ctx.input.pitch; w.cam.updateMatrixWorld();
      ray.setFromCamera(center, w.cam); const hit = ray.intersectObject(head).length > 0; tot += dt;
      if (hit) { on += dt; streak += dt; best = Math.max(best, streak); } else streak = 0;
    },
    render() { w.cam.rotation.y = -ctx.input.yaw; w.cam.rotation.x = ctx.input.pitch; (head.material as THREE.MeshLambertMaterial).emissive.setHex(streak > 0 ? 0x664000 : 0x3a2200); w.renderer.render(w.scene, w.cam); },
    hud() { return [(100 * on / Math.max(tot, 1e-6)).toFixed(1), streak.toFixed(1), best.toFixed(1), mover.mode]; },
    result() { const p = 100 * on / Math.max(tot, 1e-6); return { score: +p.toFixed(1), metrics: { onTargetPct: +p.toFixed(1), bestStreakS: +best.toFixed(2), seconds: +tot.toFixed(1), modeChanges: mover.log.length, illegalTransitions: mover.illegal } }; },
  };
  drill.hooks = { get mover() { return mover; }, autoAim() { const m = mover; ctx.input.yaw = Math.atan2(m.x, m.z); ctx.input.pitch = Math.atan2(m.y, Math.hypot(m.x, m.z)); } };
  return drill;
}
