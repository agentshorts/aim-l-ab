# Hero weapon data v1 (#36, #49)

Base values (no items, no boons) for all 44 heroes from the [deadlock.wiki Hero Comparison Table](https://deadlock.wiki/Hero_Comparison_Table) (revision 210892, last modified 27 Oct 2026), reload checked against [Reload Time](https://deadlock.wiki/Reload_Time). The [30 Oct 2026 update](https://deadlock.wiki/Latest_Update) changed no base ammo, fire rate or reload for any hero (gun damage changes are not used here). Data lives in `core/heroes.ts`. EST marks an estimate or simplification.

| Hero | Bullets/s | Magazine | Reload (s) | Notes | Source |
|---|---|---|---|---|---|
| Abrams | 1.587 | 9 | 0.3525 | single-shell reload, 0.705 s delay (3.88 s from empty); 9 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Apollo | 2.632 | 15 | 2.5 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Baba | 3.226 | 15 | 2.5 | 3 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Bebop | 11.91 | 66 | 2.35 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Billy | 11.77 | 30 | 2.9 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Calico | 4.762 | 12 | 2.6 | 9 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Celeste | 1.724 | 8 | 2 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Deadman Danny | 4 | 14 | 3.2 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Drifter | 2.268 | 12 | 2.444 | 3 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Dynamo | 3.81 | 20 | 2.35 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Graves | 9.804 | 40 | 2.8 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Grey Talon | 1.667 | 17 | 2.35 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Haze | 9.524 | 25 | 2.35 | EST: ammo shown as 25 x0.5 (scales with spirit); base 25 used | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Holliday | 2.116 | 10 | 2.75 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Infernus | 9.524 | 27 | 2.25 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Ivy | 13.61 | 33 | 2.444 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Kelvin | 3.81 | 14 | 2.585 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Lady Geist | 2.116 | 9 | 2.585 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Lash | 5.831 | 29 | 2.35 | 3-round burst; EST: bullets per second applied as an even cadence; the in-game 3-round burst spacing is not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| McGinnis | 4.762 | 66 | 3.29 | EST: spin-up gun: base 4.762 bullets/s used; the wiki lists 11.9 at max spin, the ramp is not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Mina | 3.968 | 12 | 1.7 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Mirage | 2.721 | 16 | 2.6 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Mo & Krill | 5.291 | 20 | 2.82 | 4 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Nurse Harrow | 2.632 | 11 | 1.9 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Paige | 2 | 14 | 2.5 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Paradox | 7.559 | 40 | 2.585 | 5-round burst; EST: 5-round burst applied as an even cadence | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Pocket | 1.905 | 11 | 2.82 | 7 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Rat King | 5 | 24 | 2.8 | 2 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Rem | 3.846 | 13 | 2 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Seven | 5.831 | 29 | 2.35 | 3-round burst; EST: 3-round burst applied as an even cadence | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Shiv | 1.814 | 10 | 2.8 | 6 pellets per shot; EST: primary fire only; alt-fire (0.7937/s, 12 pellets) not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Silver | 1.177 | 7 | 0.3 | single-shell reload, 0.5 s delay (2.60 s from empty); 7 pellets per shot; EST: base form only; the transformed form (2/s, no ammo) is not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Sinclair | 2.721 | 16 | 2.5 | 2-round burst; EST: 2-round burst applied as an even cadence | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Solomon | 2 | 8 | 3 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| The Doorman | 1.587 | 8 | 2.4 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Venator | 7.937 | 33 | 2.8 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Victor | 5.051 | 24 | 2.4 | EST: spin-up gun: base 5.051 bullets/s used; the wiki lists 5.848 at max spin, the ramp is not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Vindicta | 4.329 | 19 | 2.914 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Violet | 1.539 | 15 | 2.7 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Viscous | 4.762 | 20 | 2.5 | EST: primary fire only; alt-fire (0.7937/s) not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Vyper | 14.29 | 24 | 1.6 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Warden | 3.81 | 17 | 2.914 | EST: fire rate listed as 3.81 x0.008 (scales with spirit); base 3.81 used | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Wraith | 10.58 | 52 | 2.82 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Yamato | 2.381 | 12 | 2.444 | 5 pellets per shot; EST: ammo listed as 12 x0.15 (scales with spirit); base 12 used; alt-fire (0.9524/s, 1 bullet) not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |

How it applies: Souls treats each click as a trigger pull (dropped while cycling, reloading or empty; empty auto-reloads; R reloads). Tracking assumes the trigger is held: the magazine drains at the fire rate and reload time does not count as on target. Off by default.
