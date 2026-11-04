import * as THREE from "three";
import { getModel, ModelName } from "../../core/models";
import { PAL, zipline } from "../../core/scene3d";
import type { Cable } from "../../core/freemove";
import type { Mode } from "./mover";
// Data-driven tracking levels (Sprint 3). A level is: where the player stands, the paths targets move on, and the props
// that make the space (asset pack models, or code shapes where no model exists yet: platforms, ramps, bridge decks).
export type V3 = [number, number, number];
/** A target walks back and forth between a and b (the mover's x maps onto the segment; jumps add to the path height). */
export interface PathDef { a: V3; b: V3; zip?: boolean; /** free-movement half-width across the path, m (default 2.5, ESTIMATED; narrower on ledges and the bridge) */ lat?: number }
export type PropDef =
  /** Asset pack model. sv scales per axis (model space); fallback is the code-shape stand-in built when the model fails to load. */
  | { model: ModelName; p: V3; ry?: number; s?: number; sv?: V3; fallback?: PropDef[] }
  /** Code-shape box: size [w,h,d], p is the centre of the TOP face; tilt (radians about the box's local X) makes ramps. */
  | { box: V3; p: V3; ry?: number; tilt?: number; color?: number; tiles?: boolean }
  /** Code-shape column (#54 statue plinths, arch pillars): radius r, height h, p is the base centre; sides 8 = octagon. */
  | { cyl: [number, number]; p: V3; sides?: number; color?: number };
/** Overhead zipline cable (#53): straight, level, from a to b (both at cable height). Riders hang 2 m below it. */
export interface ZipDef { a: V3; b: V3 }
export interface LevelDef {
  id: string; title: string; sub: string;
  /** Player eye position and starting look direction (yaw 0 looks down -Z). */
  vantage: V3; yaw0?: number; pitch0?: number;
  paths: PathDef[];
  props: PropDef[];
  /** Number of targets; when > 1 only one is live and the live role moves every switchS seconds. */
  targets?: number; switchS?: number;
  /** Ziplines (#53). Paths with zip: true can mount the nearest one when it runs over their free-movement box. */
  zips?: ZipDef[];
  /** #54 lane layouts: the same space is also a souls lane. Troopers walk the lane centre (x 0) along -Z, 13 to 19 m out. */
  souls?: { vantage: V3; yaw0?: number; pitch0?: number };
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
    if ("model" in pr) { const m = getModel(pr.model); if (!m && pr.fallback) { cover.push(...buildLevel(scene, { ...l, props: pr.fallback })); continue; } if (!m) { const fb = fallbackBox(pr.model); if (fb) { fb.position.set(pr.p[0], pr.p[1] + fb.userData.h / 2, pr.p[2]); fb.rotation.y = pr.ry ?? 0; scene.add(fb); cover.push(fb); } continue; }
      m.obj.position.set(...pr.p); m.obj.rotation.y = pr.ry ?? 0; if (pr.s) m.obj.scale.setScalar(pr.s); if (pr.sv) m.obj.scale.set(...pr.sv); scene.add(m.obj); cover.push(m.obj); continue; }
    if ("cyl" in pr) { const [r, hh] = pr.cyl; const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, pr.sides ?? 8), new THREE.MeshLambertMaterial({ color: pr.color ?? PAL.bldB }));
      c.position.set(pr.p[0], pr.p[1] + hh / 2, pr.p[2]); scene.add(c); cover.push(c); continue; }
    const [w, h, d] = pr.box; const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: pr.color ?? PAL.bldA }));
    box.position.y = -h / 2; g.add(box);
    if (pr.tiles) { const t = getModel("ground_tile"); if (t) for (let x = -w / 2 + 2; x <= w / 2 - 2 + 1e-6; x += 4) for (let z = -d / 2 + 2; z <= d / 2 - 2 + 1e-6; z += 4) { const c = getModel("ground_tile")!.obj; c.position.set(x, 0, z); g.add(c); } }
    g.position.set(...pr.p); g.rotation.order = "YXZ"; g.rotation.y = pr.ry ?? 0; g.rotation.x = pr.tilt ?? 0; scene.add(g); cover.push(g);
  }
  return cover;
}
/** Fallback box dims (model space, base at the origin) for models; also the collision volume of a model prop (#52). */
export const FALLBACK_DIMS: Partial<Record<ModelName, V3>> = { wall_straight: [4.1, 2.23, 0.6], wall_corner: [2.1, 1.46, 2.1], building_guardhouse: [6.1, 4.8, 5.1], building_tower: [4, 8.9, 4], ground_tile: [4, 0.2, 4] };
/** #52 collision. A solid is an oriented footprint (centre cx,cz, yaw ry, half sizes hw,hd) with a bottom and a top surface
 * (a plane, so tilted ramps have a sloped top and are solid down to the ground). */
export interface Solid { cx: number; cz: number; ry: number; hw: number; hd: number; bot: number; top: (x: number, z: number) => number }
export function levelSolids(l: { props: PropDef[] }): Solid[] {
  const out: Solid[] = [];
  for (const pr of l.props) {
    if ("model" in pr) { if (pr.fallback) { out.push(...levelSolids({ props: pr.fallback })); continue; } const d = FALLBACK_DIMS[pr.model]; if (!d || pr.model === "ground_tile") continue;
      const k = pr.s ?? 1, sv = pr.sv ?? [1, 1, 1], top = pr.p[1] + d[1] * k * sv[1]; out.push({ cx: pr.p[0], cz: pr.p[2], ry: pr.ry ?? 0, hw: d[0] * k * sv[0] / 2, hd: d[2] * k * sv[2] / 2, bot: pr.p[1], top: () => top }); continue; }
    if ("cyl" in pr) { const [r, h] = pr.cyl, top = pr.p[1] + h; out.push({ cx: pr.p[0], cz: pr.p[2], ry: 0, hw: r, hd: r, bot: pr.p[1], top: () => top }); continue; }
    const [w, h, d] = pr.box, ry = pr.ry ?? 0, tilt = pr.tilt ?? 0;
    if (!tilt) { const top = pr.p[1]; out.push({ cx: pr.p[0], cz: pr.p[2], ry, hw: w / 2, hd: d / 2, bot: pr.p[1] - h, top: () => top }); continue; }
    // tilted top plane through p: normal (0,1,0) turned by tilt about local X then ry about Y
    const o = new THREE.Object3D(); o.rotation.order = "YXZ"; o.rotation.set(tilt, ry, 0); o.updateMatrixWorld(); const n = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion);
    const [px, py, pz] = pr.p; out.push({ cx: px, cz: pz, ry, hw: w / 2, hd: d / 2 * Math.cos(tilt), bot: -1e9, top: (x, z) => py - (n.x * (x - px) + n.z * (z - pz)) / n.y });
  }
  return out;
}
/** Does a body (feet at world x, footY, z; radius pad, 1.8 m tall) overlap a solid below its walkable top? Standing on a top
 * (feet within 0.35 m under it, a step) or passing over or under it is fine. */
export function blocked(solids: Solid[], x: number, footY: number, z: number, pad = 0.35) {
  for (const s of solids) { const dx = x - s.cx, dz = z - s.cz, c = Math.cos(s.ry), sn = Math.sin(s.ry), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
    if (Math.abs(lx) > s.hw + pad || Math.abs(lz) > s.hd + pad) continue; const top = s.top(x, z); if (footY < top - 0.35 && footY + 1.8 > s.bot) return true; }
  return false;
}
/** Code-shape stand-ins for models that failed to load, sized from the model bounds. */
function fallbackBox(n: ModelName): THREE.Mesh | null {
  const s = FALLBACK_DIMS[n]; if (!s) return null; const m = new THREE.Mesh(new THREE.BoxGeometry(...s), new THREE.MeshLambertMaterial({ color: n.startsWith("building") ? PAL.bldB : PAL.stripe })); m.userData.h = s[1]; return m;
}
addLevel({ id: "high-ground", title: "High ground", sub: "You hold a raised platform. Targets strafe on the street below; keep your crosshair low and follow them past the cover.",
  vantage: [0, 9.7, 0], pitch0: -0.5,
  paths: [{ a: [-11, 0, -14], b: [11, 0, -14] }],
  props: [{ box: [8, 8, 6], p: [0, 8, 2], tiles: true, color: 0x2f2a24 }, { model: "wall_corner", p: [-3.2, 8, -0.2], ry: Math.PI }, { model: "wall_corner", p: [3.2, 8, -0.2], ry: -Math.PI / 2 },
    { model: "wall_straight", p: [4, 0, -9] }, { model: "building_guardhouse", p: [-8, 0, -22], ry: 0.3 }, { model: "building_tower", p: [12, 0, -24] }] });
addLevel({ id: "bridge", title: "Bridge over the lane", sub: "You stand on a bridge. Targets run up the lane toward the bridge; follow them down as they close in below you.",
  vantage: [0, 6.7, 0], pitch0: -0.3,
  paths: [{ a: [-3, 0, -26], b: [1, 0, -3], lat: 3 }],
  // bridge_deck_30m_v2 runs along Z (deck top Y 5.0, 3.2 m wide); turned 90 degrees so it spans the lane along X
  props: [{ model: "bridge_deck_30m", p: [0, 0, 0], ry: Math.PI / 2, fallback: [{ box: [30, 0.6, 3], p: [0, 5, 0], color: 0x6b4a2e }, { box: [30, 0.9, 0.15], p: [0, 5.9, -1.45], color: 0x9aa7a3 }, { box: [30, 0.9, 0.15], p: [0, 5.9, 1.45], color: 0x9aa7a3 },
    { box: [1, 4.4, 1], p: [-7, 4.4, 0] }, { box: [1, 4.4, 1], p: [7, 4.4, 0] }] },
    { model: "wall_straight", p: [-7, 0, -10], ry: Math.PI / 2 }, { model: "wall_straight", p: [7, 0, -16], ry: Math.PI / 2 }, { model: "building_guardhouse", p: [-11, 0, -24], ry: -0.4 }, { model: "building_tower", p: [10, 0, -30] }] });
addLevel({ id: "elevated-targets", title: "Targets on high ground", sub: "Targets strafe along a rooftop ledge above you. Track upward and hold through the low cover on the ledge.",
  vantage: [0, 1.7, -2], pitch0: 0.4,
  paths: [{ a: [-10, 6, -16], b: [10, 6, -16], lat: 1.5 }], // ledge is 5 m deep; 1.5 m keeps them on it
  props: [{ box: [24, 6, 5], p: [0, 6, -17], tiles: true }, { model: "wall_corner", p: [-6, 6, -14.6] }, { model: "wall_corner", p: [5, 6, -14.6], ry: -Math.PI / 2 },
    { model: "wall_straight", p: [-5, 0, -7] }, { model: "building_tower", p: [14, 0, -16] }, { model: "building_guardhouse", p: [-15, 0, -14], ry: Math.PI / 2 }] });
addLevel({ id: "multi-path", title: "Multi-path", sub: "Three targets on three paths: across, away from you, and up a ramp. Only the lit head counts, and it moves to another target every 4 s.",
  vantage: [0, 1.7, 0], targets: 3, switchS: 4,
  paths: [{ a: [-10, 0, -13], b: [10, 0, -13] }, { a: [7, 0, -8], b: [11, 0, -26] }, { a: [-9, 0, -9], b: [-5, 4.5, -25], lat: 1 }], // ramp is 2.5 m wide
  props: [// ramp_17m_v1 runs along +Z from its low end (rises to Y 4.5 at Z 17); placed at the path start, Z squashed to the 16.49 m run
    { model: "ramp_17m", p: [-9, 0, -9], ry: Math.atan2(4, -16), sv: [1, 1, Math.hypot(4, 16) / 17], fallback: [{ box: [2.5, 0.4, 17.2], p: [-7, 2.25, -17], ry: Math.atan2(4, -16), tilt: -Math.atan2(4.5, 16.5), color: 0x6b4a2e }] }, { box: [5, 4.5, 5], p: [-5, 4.5, -27.5], tiles: true },
    { model: "wall_straight", p: [4, 0, -18] }, { model: "building_guardhouse", p: [0, 0, -24] }, { model: "building_tower", p: [15, 0, -30] }] });

/** horizontal unit vectors along the path and across it (across points from a toward the player side for the lane) */
export function pathAxes(p: PathDef) { const dx = p.b[0] - p.a[0], dz = p.b[2] - p.a[2], n = Math.hypot(dx, dz) || 1; return { au: [dx / n, dz / n], av: [-dz / n, dx / n] }; }
/** free-movement point: along u, across v, height y above the path surface */
export function freePoint(p: PathDef, u: number, v: number, y: number): THREE.Vector3 { const q = pathPoint(p, u, y), { av } = pathAxes(p); q.x += av[0] * v; q.z += av[1] * v; return q; }
/** facing for a velocity in path coordinates (clips travel along local +Z) */
export function freeYaw(p: PathDef, vu: number, vv: number) { const { au, av } = pathAxes(p); return Math.atan2(au[0] * vu + av[0] * vv, au[1] * vu + av[1] * vv); }

/** #53: draw ziplines (cables run along Z or along X). */
export function buildZips(scene: THREE.Scene, zips: ZipDef[]) { for (const z of zips) { if (Math.abs(z.a[0] - z.b[0]) < 1e-6) zipline(scene, z.a[0], z.a[1], z.a[2], z.b[2]); else zipline(scene, z.a[2], z.a[1], z.a[0], z.b[0], true); } }
/** #53: level cables in a path's mover coordinates (u along, v across, h = rider feet height above the path) */
export function pathCables(p: PathDef, zips: ZipDef[]): Cable[] {
  if (!p.zip) return []; const { au, av } = pathAxes(p), mx = (p.a[0] + p.b[0]) / 2, my = (p.a[1] + p.b[1]) / 2, mz = (p.a[2] + p.b[2]) / 2;
  const uv = (q: V3) => [(q[0] - mx) * au[0] + (q[2] - mz) * au[1], (q[0] - mx) * av[0] + (q[2] - mz) * av[1]];
  return zips.map((z) => { const [u0, v0] = uv(z.a), [u1, v1] = uv(z.b); return { u0, v0, u1, v1, h: z.a[1] - my - 2 }; });
}

// #54 lane-accurate layouts. Each is one lane space used by both souls (troopers walk the lane centre along -Z, 13 to 19 m
// out) and tracking (targets free-move on the paths). Shapes are original code shapes plus the asset pack walls; proportions
// follow the reference shots on #54: a 12 m street between the painted lines, raised sidewalks with stair runs, statue
// plinths, an L-shaped overpass, a side terrace (high ground) and an arch, with ziplines running over and along the lane.
const STONE = 0x4a443c, DECK = 0x3f5a3a, WALK = 0x5a5248, PLINTH = 0x6b6358;
/** stair run: n steps rising toward +along from (x,z), each 0.3 m up and 0.5 m deep (alongX picks the run direction) */
function stairs(x: number, y0: number, z: number, n: number, width: number, dir: 1 | -1, alongX = false): PropDef[] {
  const out: PropDef[] = []; for (let i = 0; i < n; i++) { const top = y0 + 0.3 * (i + 1), off = dir * (i * 0.5 + 0.25);
    out.push(alongX ? { box: [0.5, top, width], p: [x + off, top, z], color: WALK } : { box: [width, top, 0.5], p: [x, top, z + off], color: WALK }); }
  return out;
}
addLevel({ id: "lane-plaza", title: "Lane: sidewalks and plaza", sub: "A street lane with raised sidewalks, stair runs and a statue plaza at the far end. A zipline runs over the lane.",
  vantage: [0, 1.7, 0],
  paths: [{ a: [0, 0, -10], b: [0, 0, -28], zip: true, lat: 4.5 }, { a: [8.5, 1.2, -8], b: [8.5, 1.2, -30], lat: 1.2 }], targets: 2, switchS: 5,
  props: [{ box: [4, 1.2, 70], p: [-8.5, 1.2, -25], color: WALK }, { box: [4, 1.2, 70], p: [8.5, 1.2, -25], color: WALK },
    ...stairs(4.5, 0, -20, 4, 2.4, 1, true), ...stairs(-4.5, 0, -12, 4, 2.4, -1, true),
    { box: [21, 1.2, 10], p: [0, 1.2, -38], color: STONE }, ...stairs(0, 0, -31, 4, 13, -1),
    { cyl: [1.1, 2.4], p: [-5, 1.2, -38], sides: 8, color: PLINTH }, { cyl: [1.1, 2.4], p: [5, 1.2, -38], sides: 8, color: PLINTH }, { cyl: [0.5, 2.2], p: [-5, 3.6, -38], sides: 8, color: 0x8a8070 }, { cyl: [0.5, 2.2], p: [5, 3.6, -38], sides: 8, color: 0x8a8070 },
    { model: "wall_straight", p: [-5.3, 0, -16], ry: Math.PI / 2 }, { model: "wall_straight", p: [5.3, 0, -26], ry: Math.PI / 2 }],
  zips: [{ a: [-2.5, 5.5, 2], b: [-2.5, 5.5, -60] }],
  souls: { vantage: [0, 1.7, 0], pitch0: -0.02 } });
addLevel({ id: "lane-overpass", title: "Lane: L-shaped overpass", sub: "An overpass crosses the lane and turns to run along its left side. Targets cross on the deck and run the lane beyond it.",
  vantage: [0, 1.7, 6], pitch0: 0.08,
  paths: [{ a: [-8, 5, -6], b: [8, 5, -6], lat: 1.2 }, { a: [0, 0, -10], b: [0, 0, -30], zip: true, lat: 4.5 }], targets: 2, switchS: 4,
  // deck crosses at 4.2 to 7.8 m (top 5 m) then the L leg runs along the left side to 25.8 m; rail only on the near side so
  // the souls view down the lane stays open
  props: [{ box: [22, 0.6, 3.6], p: [0, 5, -6], color: DECK }, { box: [3.6, 0.6, 18], p: [-9.2, 5, -16.8], color: DECK },
    { box: [22, 1, 0.15], p: [0, 6, -4.3], color: 0x9aa7a3 },
    { cyl: [0.45, 4.4], p: [-6.5, 0, -6], sides: 8, color: STONE }, { cyl: [0.45, 4.4], p: [6.5, 0, -6], sides: 8, color: STONE }, { cyl: [0.45, 4.4], p: [-9.2, 0, -22], sides: 8, color: STONE },
    ...stairs(9.2, 0, 3.8, 16, 2.4, -1), { model: "wall_straight", p: [5.3, 0, -22], ry: Math.PI / 2 }, { model: "wall_corner", p: [-5.4, 0, -26] }],
  zips: [{ a: [2.5, 7.5, 4], b: [2.5, 7.5, -60] }],
  souls: { vantage: [0, 6.7, -5.6], pitch0: -0.4 } });
addLevel({ id: "lane-terrace", title: "Lane: side terrace and arch", sub: "You hold a terrace beside the lane, reached by stairs, with an arch over the lane ahead. Targets run the lane and patrol the terrace.",
  vantage: [-7.3, 5.7, -2], yaw0: 0.45, pitch0: -0.25,
  paths: [{ a: [1, 0, -8], b: [1, 0, -30], zip: true, lat: 4.5 }, { a: [-9, 4, -10], b: [-9, 4, -26], lat: 1.5 }], targets: 2, switchS: 5,
  props: [{ box: [7, 4, 30], p: [-10, 4, -15], color: STONE, tiles: true }, ...stairs(-5.2, 0, -22, 13, 2.6, -1), { model: "wall_straight", p: [-6.8, 4, -20], ry: Math.PI / 2, s: 0.6 },
    { cyl: [0.8, 7], p: [-5.5, 0, -36], sides: 8, color: PLINTH }, { cyl: [0.8, 7], p: [5.5, 0, -36], sides: 8, color: PLINTH }, { box: [13, 1.2, 1.8], p: [0, 8.2, -36], color: PLINTH },
    { model: "wall_straight", p: [5.3, 0, -18], ry: Math.PI / 2 }],
  zips: [{ a: [3, 5.5, 2], b: [3, 5.5, -60] }],
  souls: { vantage: [-7.3, 5.7, -4], yaw0: 0.45, pitch0: -0.3 } });

/** #52: if feet ended inside a solid even after undoing the step (landing from a jump onto a wall, a zip drop), push out along
 * the shortest of 16 directions (up to 4 m, inside the box). */
export function unstick(m: { u: number; v: number; box: { u0: number; u1: number; v0: number; v1: number } }, inS: () => boolean) {
  if (!inS()) return true; const u = m.u, v = m.v;
  for (let r = 0.25; r <= 4; r += 0.25) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; m.u = Math.min(m.box.u1, Math.max(m.box.u0, u + Math.cos(a) * r)); m.v = Math.min(m.box.v1, Math.max(m.box.v0, v + Math.sin(a) * r)); if (!inS()) return true; }
  m.u = u; m.v = v; return false;
}
