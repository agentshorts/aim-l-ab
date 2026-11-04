import { Store, bestOf } from "./storage";
import { h, settingsPanel } from "./ui";
import { sfx } from "./sfx_core";
import { lineChart } from "./chart";
import { loadCrosshair, toShare } from "./crosshair";
import { LEVEL_DEFS, LEVEL_ORDER } from "../drills/deadlock-tracking/levels";
export const DRILLS = [
  { id: "deadlock-souls", route: "souls", title: "Souls", sub: "Last hit troopers, secure your orbs, deny theirs.", primary: "points" },
  { id: "deadlock-tracking", route: "tracking", title: "Tracking", sub: "Stay on a target that dashes, slides, jumps and ziplines.", primary: "on-target %" },
];
export async function renderHub(root: HTMLElement, store: Store, nav: (r: string) => void) {
  const s = await store.loadSettings(); const all = await store.results();
  const cards = [...DRILLS, ...LEVEL_ORDER.map((id) => ({ id: `deadlock-tracking-${id}`, route: `tracking/${id}`, title: `Tracking: ${LEVEL_DEFS[id].title}`, sub: LEVEL_DEFS[id].sub, primary: "on-target %" }))].map((d) => { const rs = all.filter((r) => r.drill === d.id); const pb = bestOf(rs, s.difficulty); const last = rs[rs.length - 1];
    const chart = h("canvas", { style: "width:100%;height:90px" }) as HTMLCanvasElement;
    const el = h("div", { class: "card", "data-drill": d.id }, h("div", { class: "art" }), h("div", { class: "body" }, h("h3", { style: "margin:0;color:#ffcf7a" }, d.title), h("p", { class: "hint", style: "margin:4px 0 8px" }, d.sub),
      h("div", { style: "display:flex;gap:16px;margin-bottom:8px" }, h("div", {}, h("span", { class: "hint" }, "Best "), h("b", { class: "pb" }, pb ? String(pb.score) : "none")), h("div", {}, h("span", { class: "hint" }, "Last "), h("b", {}, last ? String(last.score) : "none")), h("div", {}, h("span", { class: "hint" }, "Sessions "), h("b", {}, String(rs.length)))),
      chart, h("div", { style: "margin-top:10px" }, h("a", { class: "btn", href: "#/" + d.route, onclick: (e: Event) => { e.preventDefault(); nav(d.route); } }, "Play"))));
    return { el, draw: () => lineChart(chart, rs.filter((r) => r.difficulty === s.difficulty).slice(-30).map((r) => r.score), { label: d.primary }) }; });
  const file = h("input", { type: "file", accept: "application/json", class: "hidden" }) as HTMLInputElement;
  const msg = h("div", { class: "hint", id: "io-msg" });
  file.onchange = async () => { try { const n = await store.importAll(JSON.parse(await file.files![0].text())); msg.textContent = `Imported ${n} new results.`; renderHub(root, store, nav); } catch (e) { msg.textContent = "Import failed: " + (e as Error).message; } };
  const exp = async () => { const blob = new Blob([JSON.stringify(await store.exportAll(), null, 1)], { type: "application/json" }); const a = h("a", { href: URL.createObjectURL(blob), download: `aimlab-export-${new Date().toISOString().slice(0, 10)}.json` }); a.click(); };
  const xh = loadCrosshair();
  root.replaceChildren(h("div", { class: "hub" },
    h("header", {}, h("h1", {}, "Aim Lab"), h("span", { class: "hint" }, "Deadlock mechanics drills")),
    h("div", { class: "cols" }, h("div", {}, h("div", { class: "cards" }, ...cards.map((c) => c.el))),
      h("div", {}, settingsPanel(s, (n) => store.saveSettings(n).then(() => renderHub(root, store, nav)), (v, m) => sfx.set(v, m)),
        h("div", { class: "panel", style: "margin-top:14px" }, h("h3", {}, "Data"), h("p", { class: "hint" }, "Settings, history and personal bests are saved in this browser."),
          h("button", { class: "btn", id: "export", onclick: exp }, "Export JSON"), " ", h("button", { class: "btn ghost", onclick: () => file.click() }, "Import JSON"), file, msg),
        h("div", { class: "panel", style: "margin-top:14px" }, h("h3", {}, "Crosshair"), h("p", { class: "hint" }, `Source: ${xh.source}. Uses the site's crosshair builder (share code below).`), h("code", { style: "font-size:12px" }, toShare(xh.cfg)))))));
  cards.forEach((c) => c.draw());
}
