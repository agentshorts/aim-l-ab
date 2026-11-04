import { radPerCountFromCm360 } from "./sens";
// Pointer lock state machine: unlocked -> requesting -> locked -> unlocked; requesting -> error (-> requesting on next click)
export type LockState = "unlocked" | "requesting" | "locked" | "error";
export interface InputStats { events: number; latencyMs: number[]; rawActive: boolean; }
export class Input {
  state: LockState = "unlocked"; rawActive = false; yaw = 0; pitch = 0;
  private dx = 0; private dy = 0; private pendingStamps: number[] = []; private clicks: number[] = [];
  stats: InputStats = { events: 0, latencyMs: [], rawActive: false }; onState: (s: LockState) => void = () => {};
  constructor(private el: HTMLElement, private cfg: () => { cm360: number; dpi: number; rawInput: boolean }) {
    document.addEventListener("pointerlockchange", () => this.set(document.pointerLockElement === el ? "locked" : "unlocked"));
    document.addEventListener("pointerlockerror", () => this.set("error"));
    // movementX/Y are raw counts when unadjustedMovement is granted; sum every event so no sub-frame motion is lost
    document.addEventListener("mousemove", (e) => { if (this.state !== "locked") return; this.dx += e.movementX; this.dy += e.movementY; this.stats.events++; this.pendingStamps.push(e.timeStamp); });
    el.addEventListener("mousedown", (e) => { if (e.button === 0 && this.state === "locked") this.clicks.push(e.timeStamp); });
  }
  private set(s: LockState) { this.state = s; this.onState(s); }
  async lock() {
    if (this.state === "locked" || this.state === "requesting") return; this.set("requesting");
    const req = (opts?: any) => (this.el.requestPointerLock as any).call(this.el, opts);
    try {
      if (this.cfg().rawInput) { try { await req({ unadjustedMovement: true }); this.rawActive = true; } catch { this.rawActive = false; await req(); } }
      else { this.rawActive = false; await req(); }
    } catch { if ((this.state as LockState) === "requesting") this.set("error"); }
    this.stats.rawActive = this.rawActive;
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  // called once per frame: applies all accumulated counts, records event-to-frame latency
  consume(frameNow: number) {
    const k = radPerCountFromCm360(this.cfg().cm360, this.cfg().dpi);
    this.yaw += this.dx * k; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - this.dy * k)); this.dx = this.dy = 0;
    for (const t of this.pendingStamps) this.stats.latencyMs.push(frameNow - t); this.pendingStamps.length = 0;
    if (this.stats.latencyMs.length > 4000) this.stats.latencyMs.splice(0, 2000);
    const c = this.clicks; this.clicks = []; return c;
  }
  // test and automation hook
  inject(dx: number, dy: number, stamp = performance.now()) { this.dx += dx; this.dy += dy; this.stats.events++; this.pendingStamps.push(stamp); }
  click(stamp = performance.now()) { this.clicks.push(stamp); }
}
