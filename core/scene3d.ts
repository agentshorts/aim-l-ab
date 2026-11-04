import * as THREE from "three";
// Original stylized lane: dusk city street, lane stripes, low buildings, zipline cables. No external models.
export const PAL = { bg: 0x10171a, fog: 0x1a2428, ground: 0x2a3236, stripe: 0x3d4a4f, bldA: 0x23302f, bldB: 0x2f2a24, win: 0xe8a93c, cable: 0x9aa7a3, amber: 0xe8a93c, amberGlow: 0xffcf7a, sapphire: 0x5b8fd6, sapphireGlow: 0xa8ccff, wood: 0x6b4a2e, cloth: 0x3b3f44 };
export function makeWorld(canvas: HTMLCanvasElement, fovH: number) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.bg); scene.fog = new THREE.Fog(PAL.fog, 25, 90);
  const cam = new THREE.PerspectiveCamera(70, 1, 0.05, 300); cam.position.set(0, 1.7, 0); cam.rotation.order = "YXZ";
  scene.add(new THREE.HemisphereLight(0xcfd8e0, 0x2a2018, 1.6)); const sun = new THREE.DirectionalLight(0xffe0b0, 1.4); sun.position.set(-10, 20, -5); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 200), new THREE.MeshLambertMaterial({ color: PAL.ground })); ground.rotation.x = -Math.PI / 2; ground.position.z = -60; scene.add(ground);
  const stripeM = new THREE.MeshBasicMaterial({ color: PAL.stripe });
  for (let z = -2; z > -120; z -= 6) for (const x of [-6, 6]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3), stripeM); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.01, z); scene.add(s); }
  const winM = new THREE.MeshBasicMaterial({ color: PAL.win });
  for (let i = 0; i < 16; i++) for (const side of [-1, 1]) {
    const h = 6 + ((i * 7 + (side + 1) * 3) % 9), w = 7, d = 9; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: i % 2 ? PAL.bldA : PAL.bldB }));
    b.position.set(side * 15, h / 2, -i * 10 + 4); scene.add(b);
    for (let k = 0; k < 3; k++) if ((i + k) % 2 === 0) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), winM); wn.position.set(side * (15 - w / 2 - 0.01), 2.5 + k * 2.2, -i * 10 + 4 + (k - 1) * 2.5); wn.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(wn); }
  }
  const resize = () => { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = (2 * Math.atan(Math.tan((fovH * Math.PI) / 360) / cam.aspect) * 180) / Math.PI; cam.updateProjectionMatrix(); };
  return { renderer, scene, cam, resize, setFov(f: number) { fovH = f; resize(); } };
}
export function zipline(scene: THREE.Scene, x: number, y: number, z0: number, z1: number, horizontal = false) {
  const g = new THREE.Group(); const cm = new THREE.MeshLambertMaterial({ color: PAL.cable }); const pm = new THREE.MeshLambertMaterial({ color: PAL.wood });
  const len = horizontal ? Math.abs(z1 - z0) : Math.abs(z1 - z0);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), cm);
  if (horizontal) { cable.rotation.z = Math.PI / 2; cable.position.set((z0 + z1) / 2, y, x); } else { cable.rotation.x = Math.PI / 2; cable.position.set(x, y, (z0 + z1) / 2); }
  g.add(cable);
  for (const e of [z0, z1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, y + 0.6, 0.3), pm); if (horizontal) p.position.set(e, (y + 0.6) / 2, x); else p.position.set(x, (y + 0.6) / 2, e); g.add(p); }
  scene.add(g); return g;
}
// trooper: squat puppet body, small arms, lantern head (amber candle team vs sapphire lamp team), original shapes
export function makeTrooper(team: "ally" | "enemy", kind: string) {
  const g = new THREE.Group(); const glow = team === "ally" ? PAL.sapphireGlow : PAL.amberGlow, tint = team === "ally" ? PAL.sapphire : PAL.amber;
  const scale = kind === "melee" ? 1.15 : 1;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.0, 8), new THREE.MeshLambertMaterial({ color: PAL.cloth })); body.position.y = 0.8; g.add(body);
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 8), new THREE.MeshLambertMaterial({ color: tint })); sash.position.y = 0.95; g.add(sash);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.14), new THREE.MeshLambertMaterial({ color: PAL.wood })); leg.position.set(s * 0.13, 0.2, 0); g.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), new THREE.MeshLambertMaterial({ color: PAL.wood })); arm.position.set(s * 0.38, 0.9, 0); arm.rotation.z = s * 0.25; g.add(arm); }
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshLambertMaterial({ color: 0x222222, wireframe: true })); cage.position.y = 1.5; g.add(cage);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: glow })); head.position.y = 1.5; g.add(head);
  if (kind === "medic") { const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.DoubleSide })); flag.position.set(0.3, 1.9, 0); g.add(flag); }
  g.scale.setScalar(scale);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.9; g.add(hit);
  // world-space HP bar
  const bar = new THREE.Group(); const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.09), new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.09), new THREE.MeshBasicMaterial({ color: team === "ally" ? 0x7fcf6a : 0xd0563b, depthTest: false })); fg.position.z = 0.001;
  bar.add(bg, fg); bar.position.y = 2.05; bar.renderOrder = 10; g.add(bar);
  return { g, hit, setHp(f: number, lowWindow: boolean) { fg.scale.x = Math.max(0.001, f); fg.position.x = -0.45 * (1 - f); (fg.material as THREE.MeshBasicMaterial).color.setHex(lowWindow ? 0xffffff : team === "ally" ? 0x7fcf6a : 0xd0563b); }, bar };
}
export function makeOrb() {
  const g = new THREE.Group(); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: 0x333333 }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false })); g.add(core, halo);
  return { g, core, halo, set(color: number, lit: boolean) { (core.material as THREE.MeshBasicMaterial).color.setHex(lit ? color : 0x2a2a2a); (halo.material as THREE.MeshBasicMaterial).color.setHex(color); (halo.material as THREE.MeshBasicMaterial).opacity = lit ? 0.25 : 0.05; } };
}
