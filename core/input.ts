import { Settings, radPerCount } from "./settings";
export class Look {
  yaw = 0; pitch = 0; clicks: number[] = [];
  constructor(private el: HTMLElement, private s: () => Settings) {
    el.addEventListener("click", () => { if (document.pointerLockElement !== el) el.requestPointerLock?.(); });
    document.addEventListener("mousemove", (e) => { if (document.pointerLockElement !== el) return; const k = radPerCount(this.s());
      this.yaw += e.movementX * k; this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - e.movementY * k)); });
    el.addEventListener("mousedown", (e) => { if (e.button === 0) this.clicks.push(performance.now()); });
  }
  drain() { const c = this.clicks; this.clicks = []; return c; }
}
