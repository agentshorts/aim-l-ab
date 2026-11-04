// Session phase machine: idle -> countdown -> running -> results -> (idle | countdown)
// paused is entered from running when pointer lock is lost, and returns to running on relock.
export type Phase = "idle" | "countdown" | "running" | "paused" | "results";
const T: Record<Phase, Phase[]> = { idle: ["countdown"], countdown: ["running", "idle"], running: ["paused", "results"], paused: ["running", "results", "idle"], results: ["idle", "countdown"] };
export class Session {
  phase: Phase = "idle"; t = 0; countdown = 0; listeners: ((p: Phase, from: Phase) => void)[] = [];
  constructor(public durationS: number) {}
  can(p: Phase) { return T[this.phase].includes(p); }
  go(p: Phase) { if (!this.can(p)) return false; const f = this.phase; this.phase = p; if (p === "countdown") { this.countdown = 3; this.t = 0; } for (const l of this.listeners) l(p, f); return true; }
  // returns sim dt to apply this frame (0 unless running)
  step(dt: number) {
    if (this.phase === "countdown") { this.countdown -= dt; if (this.countdown <= 0) this.go("running"); return 0; }
    if (this.phase !== "running") return 0;
    this.t += dt; if (this.t >= this.durationS) { const over = this.t - this.durationS; this.t = this.durationS; this.go("results"); return Math.max(0, dt - over); }
    return dt;
  }
  remaining() { return Math.max(0, this.durationS - this.t); }
}
