import * as THREE from "three";
import { getModel, stripRootMotion } from "../../core/models";
import type { Mode } from "./mover";
// Skinned target dummy driven by the mover: root motion stripped, position and facing come from the mover.
export type Clip = "idle" | "run" | "dash" | "slide" | "jump";
export const ONE_SHOT: Clip[] = ["dash", "slide", "jump"];
export function clipFor(mode: Mode, vx: number): Clip {
  return mode === "dash" ? "dash" : mode === "slide" ? "slide" : mode === "air" ? "jump" : mode === "zip" ? "idle" : Math.abs(vx) > 0.5 ? "run" : "idle";
}
/** Clips travel along local +Z; rotating +pi/2 about Y points +Z at world +X. */
export const facingFor = (vx: number, prev: number) => (vx > 0.05 ? Math.PI / 2 : vx < -0.05 ? -Math.PI / 2 : prev);
export class DummyView {
  g = new THREE.Group(); mixer: THREE.AnimationMixer | null = null; actions = new Map<Clip, THREE.AnimationAction>(); cur: Clip | null = null; lastMode: Mode | null = null; face = Math.PI / 2;
  static create(): DummyView | null {
    const m = getModel("target_dummy"); if (!m) return null; const v = new DummyView(); v.g.add(m.obj); v.mixer = new THREE.AnimationMixer(m.obj);
    for (const c of stripRootMotion(m.animations)) { const a = v.mixer.clipAction(c); if (ONE_SHOT.includes(c.name as Clip)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } v.actions.set(c.name as Clip, a); }
    m.obj.traverse((o) => { (o as THREE.Mesh).raycast = () => {}; o.frustumCulled = false; }); return v;
  }
  /** timeScale fits one-shot clips to the mover's state length (dashDur, airtime). */
  update(mode: Mode, vx: number, dt: number, stateLen?: number) {
    const want = clipFor(mode, vx); const entered = mode !== this.lastMode; this.lastMode = mode;
    if (want !== this.cur || (entered && ONE_SHOT.includes(want))) { const a = this.actions.get(want); if (a) { const prev = this.cur ? this.actions.get(this.cur) : null;
        a.reset(); a.timeScale = stateLen && ONE_SHOT.includes(want) ? a.getClip().duration / stateLen : 1; a.play(); if (prev && prev !== a) prev.crossFadeTo(a, 0.08, false); this.cur = want; } }
    this.face = facingFor(vx, this.face); this.g.rotation.y = this.face; this.mixer?.update(dt);
  }
}
