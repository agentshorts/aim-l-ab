// Hero weapon data v1 (#36). Source: deadlock.wiki Hero Comparison Table, page revision 210892 (last modified 27 Oct 2026),
// https://deadlock.wiki/Hero_Comparison_Table , reload cross-checked with https://deadlock.wiki/Reload_Time .
// Checked against the 30 Oct 2026 gameplay update (https://deadlock.wiki/Latest_Update): no base ammo, fire rate or
// reload changes for these heroes. Values are base (no items, no boons). "est" marks anything inferred, not read off the table.
export interface HeroWeapon { id: string; name: string; bps: number; ammo: number; reloadS: number; reloadSingle?: boolean; reloadDelayS?: number; burst?: number; pellets?: number; src: string; est?: string }
const T = "https://deadlock.wiki/Hero_Comparison_Table";
export const HERO_WEAPONS: HeroWeapon[] = [
  { id: "abrams", name: "Abrams", bps: 1.587, ammo: 9, reloadS: 0.3525, reloadSingle: true, reloadDelayS: 0.705, pellets: 9, src: T + "#Abrams" },
  { id: "bebop", name: "Bebop", bps: 11.91, ammo: 66, reloadS: 2.35, src: T + "#Bebop" },
  { id: "grey-talon", name: "Grey Talon", bps: 1.667, ammo: 17, reloadS: 2.35, src: T + "#Grey_Talon" },
  { id: "haze", name: "Haze", bps: 9.524, ammo: 25, reloadS: 2.35, src: T + "#Haze", est: "ammo shown as 25 x0.5 (scales with spirit); base 25 used" },
  { id: "infernus", name: "Infernus", bps: 9.524, ammo: 27, reloadS: 2.25, src: T + "#Infernus" },
  { id: "lady-geist", name: "Lady Geist", bps: 2.116, ammo: 9, reloadS: 2.585, src: T + "#Lady_Geist" },
  { id: "lash", name: "Lash", bps: 5.831, ammo: 29, reloadS: 2.35, burst: 3, src: T + "#Lash", est: "bullets per second applied as an even cadence; the in-game 3-round burst spacing is not modelled" },
  { id: "mirage", name: "Mirage", bps: 2.721, ammo: 16, reloadS: 2.6, src: T + "#Mirage" },
  { id: "paradox", name: "Paradox", bps: 7.559, ammo: 40, reloadS: 2.585, burst: 5, src: T + "#Paradox", est: "5-round burst applied as an even cadence" },
  { id: "pocket", name: "Pocket", bps: 1.905, ammo: 11, reloadS: 2.82, pellets: 7, src: T + "#Pocket" },
  { id: "seven", name: "Seven", bps: 5.831, ammo: 29, reloadS: 2.35, burst: 3, src: T + "#Seven", est: "3-round burst applied as an even cadence" },
  { id: "vindicta", name: "Vindicta", bps: 4.329, ammo: 19, reloadS: 2.914, src: T + "#Vindicta" },
  { id: "vyper", name: "Vyper", bps: 14.29, ammo: 24, reloadS: 1.6, src: T + "#Vyper" },
  { id: "wraith", name: "Wraith", bps: 10.58, ammo: 52, reloadS: 2.82, src: T + "#Wraith" },
];
export const heroWeapon = (id: string) => HERO_WEAPONS.find((h) => h.id === id) ?? null;
/** Magazine, fire cadence and reload. Single-shell reload (Abrams): delay, then one shell per reloadS until full. */
export class Weapon {
  ammo: number; reloadLeft = 0; cool = 0; shots = 0; blocked = 0;
  constructor(public h: HeroWeapon) { this.ammo = h.ammo; }
  get reloading() { return this.reloadLeft > 0; }
  fullReload() { return this.h.reloadSingle ? (this.h.reloadDelayS ?? 0) + (this.h.ammo - this.ammo) * this.h.reloadS : this.h.reloadS; }
  reload() { if (!this.reloading && this.ammo < this.h.ammo) this.reloadLeft = this.fullReload(); }
  update(dt: number) { this.cool = Math.max(0, this.cool - dt); if (this.reloadLeft > 0) { this.reloadLeft -= dt; if (this.reloadLeft <= 0) { this.reloadLeft = 0; this.ammo = this.h.ammo; } } }
  /** One trigger pull: false when cycling, reloading or empty (empty starts a reload). */
  tryFire(): boolean { if (this.reloading || this.cool > 0 || this.ammo <= 0) { this.blocked++; if (this.ammo <= 0) this.reload(); return false; }
    this.ammo--; this.shots++; this.cool = 1 / this.h.bps; if (this.ammo <= 0) this.reload(); return true; }
  /** Held trigger for dt seconds (tracking): fires at cadence; returns true while bullets are coming out. */
  hold(dt: number): boolean { this.update(dt); if (this.reloading) return false; while (this.cool <= 0 && this.ammo > 0) { this.ammo--; this.shots++; this.cool += 1 / this.h.bps; } if (this.ammo <= 0 && this.cool <= 0) this.reload(); return !this.reloading; }
  label() { return this.reloading ? `${this.h.name}: reloading ${this.reloadLeft.toFixed(1)} s` : `${this.h.name}: ${this.ammo}/${this.h.ammo}`; }
}
