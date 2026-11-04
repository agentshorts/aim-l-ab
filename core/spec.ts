// Numbers from specs/deadlock_spec_v1.md. EST = estimated, see spec.
export const HU = 0.0254;
export const TROOPER = {
  ranged: { hp: 300, dpsVsTroopers: 35 },
  melee: { hp: 400, dpsVsTroopers: 35 },
  medic: { hp: 350, dpsVsTroopers: 35 },
  tickInterval: 0.5, // EST
  bounty0: 100,
  floatingShare: 0.5,
};
export const ORB = { lightUp: 0.15 /* EST */, grace: 0.08, pop: 1.0 };
export const MOVE = {
  walk: 6.4, sprint: 1.6,
  dash: { b1: { peak: 635 * HU, dur: 0.62 }, b2: { peak: 579 * HU, dur: 0.68 }, b3: { peak: 562 * HU, dur: 0.72 } },
  slideMin: 350 * HU, slideFriction: 0.1875,
  jumpV: 295 * HU, jumpH: 45 * HU,
  gravity: (295 * 295) / (2 * 45) * HU, // DERIVED EST
  zipline: { inner: 18, outer: 21 },
  airSlowCap: 450 * HU, airAccelSlow: 15, airAccelFast: 5, // EST
};
