import { Drill } from "./drill";
import { Input, LockState } from "./input";
import { Session, Phase } from "./session";
import { FrameStats, loop, pct } from "./timing";
import { Store, bestOf, RunResult } from "./storage";
import { Settings } from "./settings";
import { loadCrosshair, renderCrosshair, CrosshairConfig } from "./crosshair";
import { h, settingsPanel, stat } from "./ui";
import { lineChart } from "./chart";
import { Fx } from "./fx";
import { AudioCore } from "./audio";
export const sfx = new AudioCore();
export async function runDrill(root: HTMLElement, drill: Drill, store: Store, nav: (r: string) => void) {
  const settings: Settings = await store.loadSettings();
  let xh: CrosshairConfig = loadCrosshair().cfg;
  const stage = h("div", { class: "stage" }); const cv = h("canvas", { id: "c" }) as HTMLCanvasElement; const xc = h("canvas", { id: "xh" }) as HTMLCanvasElement; const fc = h("canvas", { id: "fx" }) as HTMLCanvasElement; stage.append(cv, fc, xc);
  const timer = h("div", { class: "timer" }, "");
  const stats = drill.hudLabels.map(stat); const hud = h("div", { class: "hud" }, ...stats.map((s) => s.el));
  const lockBadge = h("span", { class: "hint" }, "mouse: unlocked");
  const top = h("div", { class: "topbar" }, h("a", { class: "btn ghost", href: "#/", onclick: (e: Event) => { e.preventDefault(); nav(""); } }, "Hub"), h("span", { class: "title" }, drill.title), h("span", { class: "sp" }), lockBadge);
  const overlay = h("div", { class: "overlay" }); root.append(stage, top, timer, hud, overlay);
  const input = new Input(cv, () => settings); const fx = new Fx(fc, () => settings.cues); sfx.set(settings.volume, settings.muted); const frame = new FrameStats(); const session = new Session(settings.durationS);
  drill.init({ canvas: cv, settings, input, fx, sfx });
  const fit = () => { xc.width = xc.clientWidth * devicePixelRatio; xc.height = xc.clientHeight * devicePixelRatio; drill.resize(); drawX(); };
  const drawX = () => { const g = xc.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, xc.width, xc.height); g.scale(devicePixelRatio, devicePixelRatio); renderCrosshair(g, xc.clientWidth / 2, xc.clientHeight / 2, xh); };
  addEventListener("resize", fit); fit();
  const show = (...kids: Node[]) => { overlay.replaceChildren(...kids); overlay.classList.remove("hidden"); };
  const hide = () => overlay.classList.add("hidden");
  const start = () => { sfx.unlock(); fx.clear(); lastCount = 0; drill.reset(); frame.reset(); input.stats.latencyMs = []; session.durationS = settings.durationS; session.go("countdown"); input.lock(); };
  const startCard = () => h("div", { class: "panel" }, h("h2", {}, drill.title), h("div", { html: drill.howTo }), h("p", { class: "hint" }, "Click Start to lock the mouse. Esc pauses."),
    h("div", { style: "display:flex;gap:8px;margin-top:10px" }, h("button", { class: "btn", id: "start", onclick: start }, "Start"), h("button", { class: "btn ghost", onclick: () => show(settingsCard()) }, "Settings")));
  const settingsCard = () => h("div", {}, settingsPanel(settings, async (s) => { await store.saveSettings(s); drill.setSettings(s); sfx.set(s.volume, s.muted); fit(); }), h("div", { style: "margin-top:8px" }, h("button", { class: "btn", onclick: () => show(startCard()) }, "Done")));
  input.onState = (s: LockState) => { lockBadge.textContent = `mouse: ${s}${s === "locked" ? (input.rawActive ? " (raw)" : " (os accel)") : ""}`;
    if (s === "unlocked" && session.phase === "running") session.go("paused");
    if (s === "locked" && session.phase === "paused") session.go("running"); };
  session.listeners.push(async (p: Phase) => {
    if (p === "running" || p === "countdown") hide();
    if (p === "running" && wasCountdown) sfx.play("go"); wasCountdown = p === "countdown";
    if (p === "paused") show(h("div", { class: "panel" }, h("h2", {}, "Paused"), h("p", {}, "Click Resume to relock the mouse."), h("button", { class: "btn", onclick: () => input.lock() }, "Resume"), " ", h("button", { class: "btn ghost", onclick: () => { session.go("results"); } }, "End session")));
    if (p === "results") { input.unlock(); await finish(); }
    if (p === "idle") show(startCard());
  });
  async function finish() {
    const r = drill.result(); const f = frame.summary(); const lat = input.stats.latencyMs;
    const metrics = { ...r.metrics, frameMeanMs: +f.mean.toFixed(2), frameP99Ms: +f.p99.toFixed(2), hitches: f.hitches, inputLatencyP50Ms: +pct(lat, 0.5).toFixed(2), inputLatencyP95Ms: +pct(lat, 0.95).toFixed(2) };
    const prev = await store.results(drill.id); const pb = bestOf(prev, settings.difficulty);
    const run: RunResult = { drill: drill.id, at: new Date().toISOString(), difficulty: settings.difficulty, score: +r.score.toFixed(2), metrics };
    await store.addResult(run); const isPb = !pb || run.score > pb.score;
    const chart = h("canvas", { style: "width:100%;height:130px" }) as HTMLCanvasElement;
    show(h("div", { class: "panel", id: "results" }, h("h2", {}, "Results"), h("div", { class: "big" }, String(run.score)), h("div", { class: isPb ? "pb" : "hint" }, isPb ? "New personal best" : `Personal best ${pb!.score}`), h("div", { class: "hint" }, `${drill.primary}, difficulty ${["Easy", "Normal", "Hard", "Pro"][settings.difficulty]}`),
      h("div", { class: "grid" }, ...Object.entries(metrics).map(([k, v]) => h("div", { class: "stat" }, h("b", {}, String(Number.isInteger(v) ? v : (+v).toFixed(1))), h("span", {}, k)))),
      chart, h("div", { style: "display:flex;gap:8px;margin-top:10px" }, h("button", { class: "btn", onclick: () => { session.go("idle"); start(); } }, "Again"), h("button", { class: "btn ghost", onclick: () => nav("") }, "Hub"))));
    lineChart(chart, prev.concat(run).filter((x) => x.difficulty === settings.difficulty).slice(-30).map((x) => x.score), { label: drill.primary });
  }
  let lastCount = 0, wasCountdown = false;
  show(startCard());
  const stop = loop((dt, now) => {
    const clicks = input.consume(now); const sdt = session.step(dt);
    drill.update(sdt, session.phase === "running" ? clicks : [], now); drill.render(); fx.draw(now / 1000);
    if (session.phase === "countdown") { const n = Math.ceil(session.countdown); if (n !== lastCount) { lastCount = n; sfx.play("countdown"); } }
    timer.textContent = session.phase === "countdown" ? String(Math.ceil(session.countdown)) : session.phase === "running" || session.phase === "paused" ? session.remaining().toFixed(1) : "";
    const v = drill.hud(); stats.forEach((s, i) => s.set(v[i] ?? ""));
  }, frame);
  const api = { fx, sfx, session, input, frame, drill, start, finish, reloadCrosshair(search?: string) { xh = loadCrosshair(search).cfg; drawX(); }, setCrosshair(c: CrosshairConfig) { xh = c; drawX(); }, get crosshair() { return xh; }, dispose() { stop(); input.unlock(); removeEventListener("resize", fit); root.replaceChildren(); } };
  return api;
}
