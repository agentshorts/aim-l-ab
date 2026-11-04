import { SoulSim, Trooper, Orb } from "./sim";
import { FrameStats, loop } from "../../core/timing";
import { load, save } from "../../core/settings";
import { Look } from "../../core/input";
import { Score } from "../../core/score";
import { card } from "../../core/hud";

const cv = document.getElementById("c") as HTMLCanvasElement; const g = cv.getContext("2d")!;
const st = load(); const stats = new FrameStats(); const look = new Look(cv, () => st); const score = new Score();
const diff = [ { perSide: 2, variance: 0, react: 1.2 }, { perSide: 3, variance: 0.1, react: 0.5 }, { perSide: 4, variance: 0.2, react: 0.3 }, { perSide: 4, variance: 0.3, react: 0.18 } ];
let sim = mk();
function mk() { const d = diff[st.difficulty] ?? diff[1]; return new SoulSim({ perSide: d.perSide, variance: d.variance, playerDamage: 40, oppReact: d.react, seed: 7 }); }
card(`<b>Deadlock souls drill</b><br>Click to lock mouse. Shoot ENEMY (orange) troopers to last hit (hitscan, 40 dmg per shot).<br>
When a trooper dies, its floating orb lights up after a short instant. Shoot GREEN orbs to secure, ORANGE orbs to deny, before the opponent does (80 ms grace for owner, pop at about 1 s).<br>
Difficulty <select id=df>${diff.map((_, i) => `<option ${i == st.difficulty ? "selected" : ""}>${i}</option>`).join("")}</select>
cm/360 <input id=cm size=3 value=${st.cm360}> DPI <input id=dpi size=4 value=${st.dpi}>`);
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
for (const id of ["df", "cm", "dpi"]) $(id).onchange = () => { st.difficulty = +$("df").value; st.cm360 = +$("cm").value; st.dpi = +$("dpi").value; save(st); sim = mk(); };

const FOV = 1.2; let W = 0, H = 0, F = 0;
function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; F = W / 2 / Math.tan(FOV / 2); } resize(); addEventListener("resize", resize);
function proj(x: number, y: number, z: number) { // camera at (0,1.7,0), yaw then pitch
  const cy = Math.cos(look.yaw), sy = Math.sin(look.yaw); let dx = x * cy - z * sy, dz = x * sy + z * cy; const dy0 = y - 1.7;
  const cp = Math.cos(look.pitch), sp = Math.sin(look.pitch); const dy = dy0 * cp - dz * sp; dz = dy0 * sp + dz * cp;
  if (dz < 0.1) return null; return { sx: W / 2 + (dx / dz) * F, sy: H / 2 - (dy / dz) * F, s: F / dz };
}
function trooperRect(t: Trooper) { const p = proj(t.x, 0.9, t.z); if (!p) return null; const w = 0.7 * p.s, h = 1.8 * p.s; return { x: p.sx - w / 2, y: p.sy - h / 2, w, h }; }
function orbPos(o: Orb) { const p = proj(o.x, o.y + Math.min(0.6, (sim.t - o.born) * 1.5), o.z); return p ? { ...p, r: 0.25 * p.s } : null; }
function fire() {
  const cx = W / 2, cy = H / 2;
  for (const o of sim.orbs) { if (o.claimed) continue; const p = orbPos(o); if (p && Math.hypot(p.sx - cx, p.sy - cy) <= p.r) { const r = sim.shootOrb(o); score.add(r.res); if (r.res === "secure" || r.res === "deny") score.err(r.errMs); return r.res; } }
  for (const t of sim.troopers) { const r = trooperRect(t); if (t.alive && r && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) { const o = sim.shootTrooper(t); score.add(o.res); if (o.res === "lasthit") score.add("lasthitErr", o.errMs); return o.res; } }
  score.add("miss"); return "miss";
}
let seen = 0;
loop((dt) => {
  for (const _ of look.drain()) fire();
  sim.step(dt);
  for (; seen < sim.events.length; seen++) { const e = sim.events[seen]; if (e.type === "oppdeny" || e.type === "pop" && e.data.owner === "ally") score.add("missedOrb"); }
  g.fillStyle = "#1b1f27"; g.fillRect(0, 0, W, H);
  const hz = proj(0, 0, 1000); g.fillStyle = "#2b3140"; if (hz) g.fillRect(0, hz.sy, W, H);
  for (const t of sim.troopers) { if (!t.alive) continue; const r = trooperRect(t); if (!r) continue;
    g.fillStyle = t.team === "enemy" ? "#e0803a" : "#4aa3e0"; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = "#000"; g.fillRect(r.x, r.y - 10, r.w, 6); g.fillStyle = t.hp <= 40 ? "#fff" : "#5d5"; g.fillRect(r.x, r.y - 10, r.w * t.hp / t.max, 6); }
  for (const o of sim.orbs) { const p = orbPos(o); if (!p || o.claimed) continue; const lit = sim.t - o.born >= 0.15;
    g.fillStyle = !lit ? "#333" : o.owner === "ally" ? "#4f4" : "#f90"; g.beginPath(); g.arc(p.sx, p.sy, p.r, 0, 7); g.fill(); }
  g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(W / 2 - 8, H / 2); g.lineTo(W / 2 + 8, H / 2); g.moveTo(W / 2, H / 2 - 8); g.lineTo(W / 2, H / 2 + 8); g.stroke();
  const c = score.c, f = stats.summary();
  g.fillStyle = "#fff"; g.font = "14px monospace";
  g.fillText(`last hits ${c.lasthit || 0}  secures ${c.secure || 0}  denies ${c.deny || 0}  missed orbs ${c.missedOrb || 0}  misses ${c.miss || 0}  orb err ${score.meanAbsErr().toFixed(0)} ms  frame ${f.mean.toFixed(2)} ms`, 10, H - 12);
}, stats);
(window as any).__aim = { sim, stats, score, look, fire, proj, get W() { return W; }, get H() { return H; }, aimAt(x: number, y: number, z: number) { look.yaw = Math.atan2(-x, z) * -1; const d = Math.hypot(x, z); look.pitch = Math.atan2(y - 1.7, d); }, getSim: () => sim };
