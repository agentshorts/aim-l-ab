import { Settings, normalize, CUE_KEYS, CUE_LABELS, presetCues, CuePreset } from "./settings";
import { cm360ToDeadlockSens, deadlockSensToCm360 } from "./sens";
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, ...kids: (Node | string | null | undefined)[]) {
  const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k.startsWith("on")) (e as any)[k] = v; else if (k === "html") e.innerHTML = v; else e.setAttribute(k, String(v)); }
  for (const c of kids) if (c != null) e.append(c); return e;
}
export function settingsPanel(s: Settings, onChange: (s: Settings) => void, onLive?: (volume: number, muted: boolean) => void) {
  const inp = (id: string, v: any, step = "any") => h("input", { id, type: "number", step, value: v });
  const cm = inp("s-cm", s.cm360), dpi = inp("s-dpi", s.dpi, "1"), dl = inp("s-dl", cm360ToDeadlockSens(s.cm360, s.dpi).toFixed(3)), fov = inp("s-fov", s.fov, "1");
  const dur = inp("s-dur", s.durationS, "1");
  const diff = h("select", { id: "s-diff" }, ...["Easy", "Normal", "Hard", "Pro"].map((n, i) => h("option", { value: i, ...(i === s.difficulty ? { selected: "" } : {}) }, n)));
  const raw = h("input", { id: "s-raw", type: "checkbox", ...(s.rawInput ? { checked: "" } : {}) });
  const preset = h("select", { id: "s-preset" }, ...[["learn", "Learn (all cues on)"], ["pro", "Pro (cues off)"], ["custom", "Custom"]].map(([v, n]) => h("option", { value: v, ...(v === s.cuePreset ? { selected: "" } : {}) }, n)));
  const cueBoxes = CUE_KEYS.map((k) => h("input", { id: "s-cue-" + k, type: "checkbox", ...(s.cues[k] ? { checked: "" } : {}) }) as HTMLInputElement);
  const vol = h("input", { id: "s-vol", type: "range", min: 0, max: 1, step: 0.05, value: s.volume }) as HTMLInputElement;
  const mute = h("input", { id: "s-mute", type: "checkbox", ...(s.muted ? { checked: "" } : {}) }) as HTMLInputElement;
  const fire = () => { const cues = Object.fromEntries(CUE_KEYS.map((k, i) => [k, cueBoxes[i].checked]));
    const n = normalize({ ...s, cm360: +cm.value, dpi: +dpi.value, fov: +fov.value, difficulty: +diff.value, durationS: +dur.value, rawInput: raw.checked, cuePreset: preset.value, cues, volume: +vol.value, muted: mute.checked }); Object.assign(s, n); onChange(n); };
  preset.onchange = () => { if (preset.value !== "custom") { const c = presetCues(preset.value as Exclude<CuePreset, "custom">); CUE_KEYS.forEach((k, i) => (cueBoxes[i].checked = c[k])); } fire(); };
  cueBoxes.forEach((b) => (b.onchange = () => { preset.value = "custom"; fire(); }));
  // volume applies live while dragging; the save (and any re-render) waits for release
  vol.oninput = () => onLive?.(+vol.value, mute.checked); vol.onchange = fire; mute.onchange = () => { onLive?.(+vol.value, mute.checked); fire(); };
  cm.oninput = () => { dl.value = cm360ToDeadlockSens(+cm.value, +dpi.value).toFixed(3); fire(); };
  dpi.oninput = () => { dl.value = cm360ToDeadlockSens(+cm.value, +dpi.value).toFixed(3); fire(); };
  dl.oninput = () => { cm.value = deadlockSensToCm360(+dl.value, +dpi.value).toFixed(2); fire(); };
  for (const e of [fov, diff, raw, dur]) (e as HTMLElement).onchange = fire;
  const f = (label: string, el: HTMLElement, hint = "") => h("div", { class: "field" }, h("label", {}, label), h("div", {}, el, hint ? h("div", { class: "hint" }, hint) : null));
  return h("div", { class: "panel settings" }, h("h3", {}, "Settings"),
    f("cm / 360", cm), f("Mouse DPI", dpi), f("Deadlock sens", dl, "Converted with yaw 0.044 deg per count (community measured, estimate)."),
    f("Horizontal FOV", fov), f("Difficulty", diff), f("Session length (s)", dur), f("Raw input", raw, "Asks the browser for unadjustedMovement (no OS acceleration) where supported."),
    f("Feedback cues", preset), h("div", { class: "cues" }, ...CUE_KEYS.map((k, i) => h("label", {}, cueBoxes[i], CUE_LABELS[k]))),
    f("Volume", vol), f("Mute", mute));
}
export function stat(label: string) { const b = h("b", {}, "0"); const el = h("div", { class: "stat" }, b, h("span", {}, label)); return { el, set: (v: string) => { b.textContent = v; } }; }
