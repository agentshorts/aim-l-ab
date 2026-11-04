# Hero weapon data v1 (#36)

Base values (no items, no boons) from the [deadlock.wiki Hero Comparison Table](https://deadlock.wiki/Hero_Comparison_Table) (revision 210892, last modified 27 Oct 2026), reload checked against [Reload Time](https://deadlock.wiki/Reload_Time). The [30 Oct 2026 update](https://deadlock.wiki/Latest_Update) changed no base ammo, fire rate or reload for these heroes (Abrams got +5% gun damage, not used here). Data lives in `core/heroes.ts`.

| Hero | Bullets/s | Magazine | Reload (s) | Notes | Source |
|---|---|---|---|---|---|
| Abrams | 1.587 | 9 | 0.3525 | single-shell reload, 0.705 s delay (3.88 s from empty); 9 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Bebop | 11.91 | 66 | 2.35 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Grey Talon | 1.667 | 17 | 2.35 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Haze | 9.524 | 25 | 2.35 | EST: ammo shown as 25 x0.5 (scales with spirit); base 25 used | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Infernus | 9.524 | 27 | 2.25 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Lady Geist | 2.116 | 9 | 2.585 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Lash | 5.831 | 29 | 2.35 | EST: bullets per second applied as an even cadence; the in-game 3-round burst spacing is not modelled | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Mirage | 2.721 | 16 | 2.6 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Paradox | 7.559 | 40 | 2.585 | EST: 5-round burst applied as an even cadence | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Pocket | 1.905 | 11 | 2.82 | 7 pellets per shot | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Seven | 5.831 | 29 | 2.35 | EST: 3-round burst applied as an even cadence | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Vindicta | 4.329 | 19 | 2.914 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Vyper | 14.29 | 24 | 1.6 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |
| Wraith | 10.58 | 52 | 2.82 |  | [wiki](https://deadlock.wiki/Hero_Comparison_Table) |

How it applies: Souls treats each click as a trigger pull (dropped while cycling, reloading or empty; empty auto-reloads; R reloads). Tracking assumes the trigger is held: the magazine drains at the fire rate and reload time does not count as on target. Off by default. Remaining heroes are tracked in a follow-up issue.
