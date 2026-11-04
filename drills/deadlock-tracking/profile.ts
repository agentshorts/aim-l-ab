// Movement profiles for the tracking target. "realistic" is fitted from the high-elo clip study
// (study/movement_stats_v1.json, specs/movement_study_v1.md). ALL VALUES ARE ESTIMATES.
import type { Mode } from "./mover";
export type MoveProfileId = "classic" | "realistic";
export interface MoveProfile { id: MoveProfileId; reversalQ?: [number, number][]; weights?: Partial<Record<Mode, number>>; alwaysReverse: boolean }
export const PROFILES: Record<MoveProfileId, MoveProfile> = {
  classic: { id: "classic", alwaysReverse: false },
  realistic: {
    id: "realistic", alwaysReverse: true,
    // strafe reversal interval inverse CDF [quantile, seconds], p10..p90 from 390 reversals in 31 fight clips (EST)
    reversalQ: [[0, 0.15], [0.1, 0.2], [0.25, 0.4], [0.5, 0.833], [0.75, 1.467], [0.9, 2.003], [1, 2.5]],
    // per decision point (~30 per min). air from ~1.2 jump-like events/min (EST). dash and zip were not measurable from
    // video, so they are set from stamina budget and map use (decision recorded in specs/movement_study_v1.md, #22):
    // dash 0.12 = about 3.6 dashes/min, roughly a third of what stamina regen allows, matching mid-fight spacing use;
    // zip 0.02 = about 0.6/min, since ziplines are a rotation tool and are rarely ridden inside a fight.
    weights: { walk: 0.81, dash: 0.12, air: 0.05, zip: 0.02 },
  },
};
/** Inverse CDF sample, linear between quantile knots. */
export function sampleQ(q: [number, number][], u: number): number {
  for (let i = 1; i < q.length; i++) if (u <= q[i][0]) { const [a, x0] = q[i - 1], [b, x1] = q[i]; return x0 + (x1 - x0) * ((u - a) / (b - a || 1)); }
  return q[q.length - 1][1];
}
