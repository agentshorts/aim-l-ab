import * as THREE from "three";
import { getModel, ModelName } from "../../core/models";
import { PAL } from "../../core/scene3d";
import type { Mode } from "./mover";
// Data-driven tracking levels (Sprint 3). A level is: where the player stands, the paths targets move on, and the props
// that make the space (asset pack models, or code shapes where no model exists yet: platforms, ramps, bridge decks).
export type V3 = [number, number, number];
/** A target walks back and forth between a and b (the mover's x maps onto the segment; jumps add to the path height). */
export interface PathDef { a: V3; b: V3; zip?: boolean }
export type PropDef =
  | { model: ModelName; p: V3; ry?: number; s?: number }
  /** Code-shape box: size [w,h,d], p is the centre of the TOP face; tilt (radians about the box's local X) makes ramps. */
  | { box: V3; p: V3; ry?: number; tilt?: number; color?: number; tiles?: boolean };
export interface LevelDef {
  id: string; title: string; sub: string;
  /** Player eye position and starting look direction (yaw 0 looks down -Z). */
  vantage: V3; yaw0?: number; pitch0?: number;
  paths: PathDef[];
  props: PropDef[];
  /** Number of targets; when > 1 only one is live and the live role moves every switchS seconds. */
  targets?: number; switchS?: number;
}
export const LEVEL_DEFS: Record<string, LevelDef> = {};
export const LEVEL_ORDER: string[] = [];
export function addLevel(l: LevelDef) { LEVEL_DEFS[l.id] = l; if (!LEVEL_ORDER.includes(l.id)) LEVEL_ORDER.push(l.id); }

/** World position on a path for mover coordinate x (centred, metres) and jump height y. */
export function pathPoint(p: PathDef, x: number, y: number): THREE.Vector3 {
  const a = new THREE.Vector3(...p.a), b = new THREE.Vector3(...p.b), mid = a.clone().add(b).multiplyScalar(0.5), d = b.clone().sub(a).normalize();
  return mid.addScaledVector(d, x).add(new THREE.Vector3(0, y, 0));
}
export const pathLen = (p: PathDef) => new THREE.Vector3(...p.a).distanceTo(new THREE.Vector3(...p.b));
/** Yaw that points a model's +Z along the path in the direction of travel (sign of the mover velocity). */
export function pathYaw(p: PathDef, sign: number) { const dx = (p.b[0] - p.a[0]) * sign, dz = (p.b[2] - p.a[2]) * sign; return Math.atan2(dx, dz); }
/** Moves a target may use on a path: zipline only where the path has a cable. */
export const pathModes = (p: PathDef, modes: Mode[]) => modes.filter((m) => m !== "zip" || p.zip);
/** Yaw/pitch (input convention: camera rotation.y = -yaw) that looks from eye at point. */
export function aimAngles(eye: THREE.Vector3, at: THREE.Vector3) { const dx = at.x - eye.x, dy = at.y - eye.y, dz = at.z - eye.z; return { yaw: Math.atan2(dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; }

/** Builds the props into the scene. Returns the meshes that block line of sight (cover). */
export function buildLevel(scene: THREE.Scene, l: LevelDef): THREE.Object3D[] {
  const cover: THREE.Object3D[] = [];
  for (const pr of l.props) {
    if ("model" in pr) { const m = getModel(pr.model); if (!m) { const fb = fallbackBox(pr.model); if (fb) { fb.position.set(pr.p[0], pr.p[1] + fb.userData.h / 2, pr.p[2]); fb.rotation.y = pr.ry ?? 0; scene.add(fb); cover.push(fb); } continue; }
      m.obj.position.set(...pr.p); m.obj.rotation.y = pr.ry ?? 0; if (pr.s) m.obj.scale.setScalar(pr.s); scene.add(m.obj); cover.push(m.obj); continue; }
    const [w, h, d] = pr.box; const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: pr.color ?? PAL.bldA }));
    box.position.y = -h / 2; g.add(box);
    if (pr.tiles) { const t = getModel("ground_tile"); if (t) for (let x = -w / 2 + 2; x <= w / 2 - 2 + 1e-6; x += 4) for (let z = -d / 2 + 2; z <= d / 2 - 2 + 1e-6; z += 4) { const c = getModel("ground_tile")!.obj; c.position.set(x, 0, z); g.add(c); } }
    g.position.set(...pr.p); g.rotation.order = "YXZ"; g.rotation.y = pr.ry ?? 0; g.rotation.x = pr.tilt ?? 0; scene.add(g); cover.push(g);
  }
  return cover;
}
/** Code-shape stand-ins for models that failed to load, sized from the model bounds. */
function fallbackBox(n: ModelName): THREE.Mesh | null {
  const dims: Partial<Record<ModelName, V3>> = { wall_straight: [4.1, 2.23, 0.6], wall_corner: [2.1, 1.46, 2.1], building_guardhouse: [6.1, 4.8, 5.1], building_tower: [4, 8.9, 4], ground_tile: [4, 0.2, 4] };
  const s = dims[n]; if (!s) return null; const m = new THREE.Mesh(new THREE.BoxGeometry(...s), new THREE.MeshLambertMaterial({ color: n.startsWith("building") ? PAL.bldB : PAL.stripe })); m.userData.h = s[1]; return m;
}
addLevel({ id: "high-ground", title: "High ground", sub: "You hold a raised platform. Targets strafe on the street below; keep your crosshair low and follow them past the cover.",
  vantage: [0, 9.7, 0], pitch0: -0.5,
  paths: [{ a: [-11, 0, -14], b: [11, 0, -14] }],
  props: [{ box: [8, 8, 6], p: [0, 8, 2], tiles: true, color: 0x2f2a24 }, { model: "wall_corner", p: [-3.2, 8, -0.2], ry: Math.PI }, { model: "wall_corner", p: [3.2, 8, -0.2], ry: -Math.PI / 2 },
    { model: "wall_straight", p: [4, 0, -9] }, { model: "building_guardhouse", p: [-8, 0, -22], ry: 0.3 }, { model: "building_tower", p: [12, 0, -24] }] });
addLevel({ id: "bridge", title: "Bridge over the lane", sub: "You stand on a bridge. Targets run up the lane toward the bridge; follow them down as they close in below you.",
  vantage: [0, 6.7, 0], pitch0: -0.3,
  paths: [{ a: [-3, 0, -26], b: [1, 0, -3] }],
  props: [{ box: [30, 0.6, 3], p: [0, 5, 0], color: 0x6b4a2e }, { box: [30, 0.9, 0.15], p: [0, 5.9, -1.45], color: 0x9aa7a3 }, { box: [30, 0.9, 0.15], p: [0, 5.9, 1.45], color: 0x9aa7a3 },
    { box: [1, 4.4, 1], p: [-7, 4.4, 0] }, { box: [1, 4.4, 1], p: [7, 4.4, 0] },
    { model: "wall_straight", p: [-7, 0, -10], ry: Math.PI / 2 }, { model: "wall_straight", p: [7, 0, -16], ry: Math.PI / 2 }, { model: "building_guardhouse", p: [-11, 0, -24], ry: -0.4 }, { model: "building_tower", p: [10, 0, -30] }] });
addLevel({ id: "elevated-targets", title: "Targets on high ground", sub: "Targets strafe along a rooftop ledge above you. Track upward and hold through the low cover on the ledge.",
  vantage: [0, 1.7, -2], pitch0: 0.4,
  paths: [{ a: [-10, 6, -16], b: [10, 6, -16] }],
  props: [{ box: [24, 6, 5], p: [0, 6, -17], tiles: true }, { model: "wall_corner", p: [-6, 6, -14.6] }, { model: "wall_corner", p: [5, 6, -14.6], ry: -Math.PI / 2 },
    { model: "wall_straight", p: [-5, 0, -7] }, { model: "building_tower", p: [14, 0, -16] }, { model: "building_guardhouse", p: [-15, 0, -14], ry: Math.PI / 2 }] });
