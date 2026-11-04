import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
// Original asset pack v1 (specs/assets_v3.md). Loaded from <bundle dir>/assets/models/ so it works inside the WP theme folder.
// Every caller keeps its code-built shapes as the fallback: get() returns null until (or unless) the file loaded.
export const MODEL_NAMES = ["trooper_melee", "trooper_ranged", "soul_orb", "ground_tile", "wall_straight", "wall_corner", "building_guardhouse", "building_tower", "zipline_pylon", "zipline_cable_10m", "target_dummy"] as const;
export type ModelName = typeof MODEL_NAMES[number];
type Loaded = { scene: THREE.Group; animations: THREE.AnimationClip[] };
const cache = new Map<ModelName, Loaded | null>(); let base = "./"; let all: Promise<void> | null = null;
export const modelStatus = { loaded: [] as string[], failed: [] as string[] };
export function setModelBase(b: string) { base = b; }
export function preloadModels(): Promise<void> {
  if (all) return all; const loader = new GLTFLoader();
  all = Promise.all(MODEL_NAMES.map((n) => loader.loadAsync(`${base}assets/models/${n}_v1.glb`)
    .then((g) => { cache.set(n, { scene: g.scene, animations: g.animations }); modelStatus.loaded.push(n); })
    .catch(() => { cache.set(n, null); modelStatus.failed.push(n); }))).then(() => undefined);
  return all;
}
export function modelsReady() { return all ?? Promise.resolve(); }
/** A fresh instance (skinned meshes cloned with their skeleton), or null when not loaded. */
export function getModel(n: ModelName): { obj: THREE.Object3D; animations: THREE.AnimationClip[] } | null {
  const m = cache.get(n); if (!m) return null; return { obj: skClone(m.scene), animations: m.animations };
}
/** Recolour team accents: materials named *amber* / *teal* take the given colour (materials are cloned per instance). */
export function tint(obj: THREE.Object3D, color: number, glow: number) {
  obj.traverse((o) => { const me = o as THREE.Mesh; if (!me.isMesh) return; const mats = (Array.isArray(me.material) ? me.material : [me.material]).map((m) => {
    if (!/amber|teal/i.test(m.name)) return m; const c = (m as THREE.MeshStandardMaterial).clone(); c.color.setHex(color); if (/_E$/.test(m.name)) c.emissive.setHex(glow); return c; });
    me.material = Array.isArray(me.material) ? mats : mats[0]; });
}
/** Remove root-motion travel (the mover drives position). Horizontal root translation is always zeroed; vertical root
 * translation is kept as posture (slide crouch, dash dip) except in clips listed in dropY (jump height comes from the mover).
 * Also shifts each clip to start at t=0 (the pack's clips start at frame 1, 1/24 s, which holds a frame at every loop). */
export function stripRootMotion(clips: THREE.AnimationClip[], rootName = "root", dropY: string[] = ["jump"]): THREE.AnimationClip[] {
  return clips.map((c) => { const t0 = Math.min(...c.tracks.map((t) => t.times[0])); const tracks = c.tracks.map((t) => {
      const n = t.clone(); if (t0 > 0) for (let i = 0; i < n.times.length; i++) n.times[i] -= t0;
      if (t.name === `${rootName}.position`) for (let i = 0; i < n.values.length; i += 3) { n.values[i] = 0; n.values[i + 2] = 0; if (dropY.includes(c.name)) n.values[i + 1] = 0; }
      return n; });
    return new THREE.AnimationClip(c.name, -1, tracks); });
}
