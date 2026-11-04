# Deadlock mechanics spec v1 (aim lab drills A and B)

Retrieved 2026-11-04 from deadlock.wiki (community wiki, values sourced from game files such as heroes.vdata and abilities.vdata). Every number links to its page. Anything not stated by a source is marked **ESTIMATED** with the derivation. Units: 1 hu (hammer unit) = 0.0254 m ([Movement](https://deadlock.wiki/Movement)).

## Troopers ([Trooper](https://deadlock.wiki/Trooper))
| Stat | Ranged | Melee | Medic |
|---|---|---|---|
| Base health | 300 | 400 | 350 |
| DPS vs players | 28 | n/a (melee 80 per hit) | 28 |
| DPS vs troopers | 35 (table "Troopers", all types) | | |
| Range | 25 m | 3 m | 36 m |
| Walk speed | 6.3 m/s | 8.1 m/s | 6.3 m/s |
| Bounty | 100 + 2 per min | same | same |

- Wave: 3 Ranged + 1 Medic at start, 2 Ranged + 1 Melee + 1 Medic after 5 min. Spawn interval 30 s (0 to 20 min).
- Trooper vs trooper damage resist: 42.5% (wiki combat table, "Troopers" row). Out of combat regen 7.
- Trooper attack cadence (per shot damage and interval): **not published**. Drill uses DPS 35 applied as ticks every 0.5 s (17.5 per tick) **ESTIMATED** model, scaled by (1 - 0.425) only if the "resist" toggle is on (default off, since the wiki table is ambiguous on whether 35 is pre or post resist).

## Soul orbs ([Souls](https://deadlock.wiki/Souls), [Trooper Math](https://deadlock.wiki/Trooper))
- Bounty split 50% ground orb / 50% floating orb (changed from 40% floating to 50% per Trooper update history).
- Ground orb: only owning team picks up by walking near; despawns after 18 s (40 s after 10:00).
- Floating orb: spawns intangible and dark, lights up "after a short instant" (**ESTIMATED 0.15 s** in drill, not published), then claimable by either team with one bullet or pellet regardless of damage; the bullet is refunded.
- Owning team gets an **80 ms grace period** at light-up where only they can confirm.
- If nobody claims it, it "pops" after **about a second** (drill uses 1.0 s, source says "about") and goes to the owning team if allies are nearby.
- Deny = shooting an enemy-owned (orange) orb: denier gets the souls, owner loses them.
- Melee kill on a trooper auto-confirms; 100% bounty on kill, no orbs.
- No HP threshold for denying (unlike Dota); deny happens on the orb, not the unit.
- Drill trooper value at minute 0: 100 souls, so floating orb 50.

## Hero movement
- Base move speed varies by hero, e.g. Abrams 6.4 m/s + 1.6 sprint = 8.0 total; Shiv 6.5 + 1.6 = 8.1; Vindicta 7.9 + 1.6 ([Move Speed](https://deadlock.wiki/Move_Speed)). Sprint builds at 0.6 m/s/s out of combat. Shooting multiplier 75%. Crouch 4.8 m/s.
- Dash ([Dashing](https://deadlock.wiki/Dashing)): same distance for all heroes; speed buckets: B1 peak 635 u/s (16.1 m/s), 0.62 s; B2 peak 579 u/s (14.7 m/s), 0.68 s; B3 peak 562 u/s (14.3 m/s), 0.72 s. Dash jump window opens 0.3 s after dash start for 0.2 s. Down dash: double tap crouch within 0.44 s (28 ticks), 0.5 stamina.
- Dash distance: **not published as a number. ESTIMATED** about 6 to 8 m (peak speed times duration is an upper bound of 10 m; drill uses an ease-out profile giving 6.6 m).
- Stamina: 1 bar regen 4.5 s; heroes start with 2 to 4 bars ([Stamina](https://deadlock.wiki/Stamina)).
- Slide ([Sliding](https://deadlock.wiki/Sliding)): needs > 350 u/s (8.9 m/s) and crouch; friction coefficient 0.1875, late slide penalty about 3.1875 (from grounded dash).
- Jump ([Jumping](https://deadlock.wiki/Jumping)): ground jump peak speed 295 u/s (7.49 m/s), max height +45 u (1.14 m). One air jump by default.
- Gravity: **not published. DERIVED ESTIMATE** g = v^2/(2h) = 295^2/(2*45) = 967 u/s^2 = 24.6 m/s^2.
- Zipline ([Zipline](https://deadlock.wiki/Zipline)): 18 m/s inner lane, 21 m/s outer lanes; boost +80%.
- Air strafe ([Air Strafing](https://deadlock.wiki/Air_Strafing)): stronger below 450 u/s (11.4 m/s), weaker above (convars citadel_aircontrol_speed_slow/fast, values not published). Drill uses **ESTIMATED** air accel 15 m/s^2 below 11.4 m/s and 5 m/s^2 above.

## Timing math for Drill A
Weapon is hitscan in drill (real heroes have bullet travel, out of scope v1). Last hit window: the shot that drops trooper HP to 0 is the last hit. Ideal shot time for a last hit with weapon damage D: earliest moment remaining HP <= D, which is just after the trooper tick that brings HP to <= D (ideal = that tick time). Timing error = shot time minus ideal. Orb confirm timing error = shot time minus orb light-up time.
