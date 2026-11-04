import { coverFireDrill } from "../drills/deadlock-cover-fire/drill";
import themeCss from "./theme.css";
import { getStore, Store } from "./storage";
import { renderHub } from "./hub";
import { runDrill } from "./shell";
import { soulsDrill } from "../drills/deadlock-souls/drill";
import { trackingDrill } from "../drills/deadlock-tracking/drill";
import { setCrosshairRenderer, loadCrosshair } from "./crosshair";
import { setModelBase, preloadModels, modelsReady, modelStatus } from "./models";
export interface MountOpts { assetBase?: string; store?: Store; }
// Self-contained entry: mount(el) renders hub and drills with hash routes (#/, #/souls, #/tracking).
export function mount(el: HTMLElement, opts: MountOpts = {}) {
  const base = opts.assetBase ?? scriptBase();
  if (!document.getElementById("aimlab-css")) { const st = document.createElement("style"); st.id = "aimlab-css"; st.textContent = themeCss.replace(/\.\.\/assets\//g, base + "assets/"); document.head.append(st); }
  setModelBase(base); preloadModels();
  el.classList.add("aimlab-root"); const store = opts.store ?? getStore(); let cur: { dispose(): void } | null = null;
  const api: any = { store, setCrosshairRenderer, loadCrosshair, models: modelStatus };
  const route = async () => {
    cur?.dispose(); cur = null; el.replaceChildren(); const r = location.hash.replace(/^#\/?/, "");
    const nav = (x: string) => { location.hash = "#/" + x; };
    const tl = r.startsWith("tracking/") ? r.slice(9) : undefined;
    if (r === "souls" || r === "tracking" || r === "cover" || tl) { await Promise.race([modelsReady(), new Promise((res) => setTimeout(res, 4000))]); const d = r === "souls" ? soulsDrill() : r === "cover" ? coverFireDrill() : trackingDrill(tl); const sh = await runDrill(el, d, store, nav); cur = sh; api.drill = sh; api.hooks = d.hooks; }
    else { await renderHub(el, store, nav); api.drill = null; }
    api.route = r; el.dispatchEvent(new CustomEvent("aimlab:route", { detail: r }));
  };
  addEventListener("hashchange", route); route();
  (window as any).aimlab = api; return api;
}
function scriptBase() { const s = (document.currentScript as HTMLScriptElement | null)?.src || [...document.scripts].map((x) => x.src).find((x) => /aimlab(\.min)?\.js/.test(x)) || ""; return s ? s.replace(/[^/]*$/, "") : "./"; }
(window as any).AimLab = { mount };
const auto = document.querySelector<HTMLElement>("[data-aimlab-mount]"); if (auto) mount(auto);
