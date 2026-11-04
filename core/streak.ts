// Streak keeping with forgiveness (#59). The streak grows while on target. When off target it resets, except:
//  - grace: right after the live target switches (multi-target levels) the streak holds for GRACE_SWITCH_S so the player can move over;
//  - cover hold: while the target the player was tracking is behind cover (occluded, or in a cover state) the streak holds; when it comes
//    out, the player gets GRACE_SWITCH_S to get back on it.
// While held the streak does not grow. Reasons are counted so tests and the HUD can show why it held.
export const GRACE_SWITCH_S = 0.5;
export type Hold = "none" | "switch" | "cover" | "reacquire";
export class StreakKeeper {
  streak = 0; best = 0; grace = 0; hold: Hold = "none"; holds = { switch: 0, cover: 0, reacquire: 0 }; resets = 0; private wasCovered = false;
  /** call once when the live target changes */
  switched() { if (this.streak > 0) { this.grace = GRACE_SWITCH_S; this.hold = "switch"; } }
  /** onTarget: crosshair on the live target this frame. covered: the tracked target is behind cover this frame. Returns the frame's hold. */
  update(dt: number, onTarget: boolean, covered: boolean): Hold {
    if (onTarget) { this.streak += dt; this.best = Math.max(this.best, this.streak); this.grace = 0; this.hold = "none"; this.wasCovered = false; return "none"; }
    if (this.streak <= 0) { this.hold = "none"; return "none"; }
    if (covered) { this.wasCovered = true; this.hold = "cover"; this.holds.cover += dt; return "cover"; }
    if (this.wasCovered) { this.wasCovered = false; this.grace = GRACE_SWITCH_S; this.hold = "reacquire"; }
    if (this.grace > 0) { this.grace -= dt; const h = this.hold === "none" ? "switch" : this.hold; this.holds[h as "switch" | "reacquire"] += dt; return h; }
    this.streak = 0; this.hold = "none"; this.resets++; return "none";
  }
  reset() { this.streak = 0; this.best = 0; this.grace = 0; this.hold = "none"; this.wasCovered = false; this.resets = 0; this.holds = { switch: 0, cover: 0, reacquire: 0 }; }
}
