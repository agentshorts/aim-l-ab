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
  { id: "apollo", name: "Apollo", bps: 2.632, ammo: 15, reloadS: 2.5, src: T + "#Apollo" },
  { id: "baba", name: "Baba", bps: 3.226, ammo: 15, reloadS: 2.5, pellets: 3, src: T + "#Baba" },
  { id: "billy", name: "Billy", bps: 11.77, ammo: 30, reloadS: 2.9, src: T + "#Billy" },
  { id: "calico", name: "Calico", bps: 4.762, ammo: 12, reloadS: 2.6, pellets: 9, src: T + "#Calico" },
  { id: "celeste", name: "Celeste", bps: 1.724, ammo: 8, reloadS: 2, src: T + "#Celeste" },
  { id: "deadman-danny", name: "Deadman Danny", bps: 4, ammo: 14, reloadS: 3.2, src: T + "#Deadman_Danny" },
  { id: "the-doorman", name: "The Doorman", bps: 1.587, ammo: 8, reloadS: 2.4, src: T + "#The_Doorman" },
  { id: "drifter", name: "Drifter", bps: 2.268, ammo: 12, reloadS: 2.444, pellets: 3, src: T + "#Drifter" },
  { id: "dynamo", name: "Dynamo", bps: 3.81, ammo: 20, reloadS: 2.35, src: T + "#Dynamo" },
  { id: "graves", name: "Graves", bps: 9.804, ammo: 40, reloadS: 2.8, src: T + "#Graves" },
  { id: "holliday", name: "Holliday", bps: 2.116, ammo: 10, reloadS: 2.75, src: T + "#Holliday" },
  { id: "ivy", name: "Ivy", bps: 13.61, ammo: 33, reloadS: 2.444, src: T + "#Ivy" },
  { id: "kelvin", name: "Kelvin", bps: 3.81, ammo: 14, reloadS: 2.585, src: T + "#Kelvin" },
  { id: "mcginnis", name: "McGinnis", bps: 4.762, ammo: 66, reloadS: 3.29, src: T + "#McGinnis", est: "spin-up gun: base 4.762 bullets/s used; the wiki lists 11.9 at max spin, the ramp is not modelled" },
  { id: "mina", name: "Mina", bps: 3.968, ammo: 12, reloadS: 1.7, src: T + "#Mina" },
  { id: "mo-krill", name: "Mo & Krill", bps: 5.291, ammo: 20, reloadS: 2.82, pellets: 4, src: T + "#Mo_%26_Krill" },
  { id: "nurse-harrow", name: "Nurse Harrow", bps: 2.632, ammo: 11, reloadS: 1.9, src: T + "#Nurse_Harrow" },
  { id: "paige", name: "Paige", bps: 2, ammo: 14, reloadS: 2.5, src: T + "#Paige" },
  { id: "rat-king", name: "Rat King", bps: 5, ammo: 24, reloadS: 2.8, pellets: 2, src: T + "#Rat_King" },
  { id: "rem", name: "Rem", bps: 3.846, ammo: 13, reloadS: 2, src: T + "#Rem" },
  { id: "shiv", name: "Shiv", bps: 1.814, ammo: 10, reloadS: 2.8, pellets: 6, src: T + "#Shiv", est: "primary fire only; alt-fire (0.7937/s, 12 pellets) not modelled" },
  { id: "silver", name: "Silver", bps: 1.177, ammo: 7, reloadS: 0.3, reloadSingle: true, reloadDelayS: 0.5, pellets: 7, src: T + "#Silver", est: "base form only; the transformed form (2/s, no ammo) is not modelled" },
  { id: "sinclair", name: "Sinclair", bps: 2.721, ammo: 16, reloadS: 2.5, burst: 2, src: T + "#Sinclair", est: "2-round burst applied as an even cadence" },
  { id: "solomon", name: "Solomon", bps: 2, ammo: 8, reloadS: 3, src: T + "#Solomon" },
  { id: "venator", name: "Venator", bps: 7.937, ammo: 33, reloadS: 2.8, src: T + "#Venator" },
  { id: "victor", name: "Victor", bps: 5.051, ammo: 24, reloadS: 2.4, src: T + "#Victor", est: "spin-up gun: base 5.051 bullets/s used; the wiki lists 5.848 at max spin, the ramp is not modelled" },
  { id: "violet", name: "Violet", bps: 1.539, ammo: 15, reloadS: 2.7, src: T + "#Violet" },
  { id: "viscous", name: "Viscous", bps: 4.762, ammo: 20, reloadS: 2.5, src: T + "#Viscous", est: "primary fire only; alt-fire (0.7937/s) not modelled" },
  { id: "warden", name: "Warden", bps: 3.81, ammo: 17, reloadS: 2.914, src: T + "#Warden", est: "fire rate listed as 3.81 x0.008 (scales with spirit); base 3.81 used" },
  { id: "yamato", name: "Yamato", bps: 2.381, ammo: 12, reloadS: 2.444, pellets: 5, src: T + "#Yamato", est: "ammo listed as 12 x0.15 (scales with spirit); base 12 used; alt-fire (0.9524/s, 1 bullet) not modelled" },
];
HERO_WEAPONS.sort((a, b) => a.name.localeCompare(b.name));
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
