# State machines v2

Implicit states found during review, now explicit in code. Diagrams are Mermaid.

## 1. Session phases (core/session.ts)
```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> countdown: Start
  countdown --> running: 3 s elapsed
  countdown --> idle
  running --> paused: pointer lock lost (Esc)
  paused --> running: relocked
  paused --> results: End session
  paused --> idle
  running --> results: duration reached
  results --> idle
  results --> countdown: Again
```
Transitions are a whitelist table; illegal calls return false. Sim time only advances in `running`, and the last frame is clipped so a session gives exactly `durationS` of sim time.
Bug fixed: v1 drills ran forever with no end, no pause on lost lock, and scored time while unlocked.

## 2. Pointer lock / input (core/input.ts)
```mermaid
stateDiagram-v2
  [*] --> unlocked
  unlocked --> requesting: lock()
  requesting --> locked: pointerlockchange (raw or os accel)
  requesting --> error: pointerlockerror / promise rejected
  error --> requesting: lock() again
  locked --> unlocked: Esc / exitPointerLock
```
Mouse counts and clicks are only accepted in `locked`. Bug fixed: v1 accepted clicks when unlocked and applied each mousemove immediately instead of once per frame.

## 3. Wave (drills/deadlock-souls/sim.ts)
```mermaid
stateDiagram-v2
  [*] --> fighting
  fighting --> cleared: one side has no living troopers
  cleared --> fighting: after RESPAWN_DELAY 1.5 s (drill pacing)
```
Bug fixed: v1 respawned instantly in the same frame, so surviving troopers were wiped while their orbs were still in flight.

## 4. Floating orb lifecycle (drills/deadlock-souls/sim.ts)
```mermaid
stateDiagram-v2
  [*] --> dark: trooper dies
  dark --> lit: lightUp 0.15 s (ESTIMATED)
  lit --> claimed_secure: player shoots green
  lit --> claimed_deny: player shoots orange
  lit --> claimed_oppConfirm: opponent shoots own orange after react
  lit --> claimed_oppDeny: opponent shoots green after 80 ms grace + react
  lit --> claimed_popOwner: about 1.0 s with no claim
  claimed_secure --> [*]: fade 0.3 s
```
Shots at `dark` return early, at `claimed` return late. Bugs fixed: v1 counted a popped green orb as "missed" although the wiki says it is auto-awarded to the owner; v1 could not tell secure from deny in history.

## 5. Mover (drills/deadlock-tracking/mover.ts)
```mermaid
stateDiagram-v2
  [*] --> walk
  walk --> walk: re-pick
  walk --> dash
  walk --> air: jump
  walk --> zip
  dash --> slide: end of dash (if allowed)
  dash --> walk: end of dash or wall
  slide --> walk: speed below walk or wall
  air --> walk: land
  zip --> air: drop (keeps momentum)
```
Transitions are a table; illegal requests are counted (`illegal`, saved in results, 0 in the 60k step test). Bugs fixed: v1 zipline ended by teleporting from 3 m to the ground; v1 kept dashing into the wall with zero speed until the timer ran out.

## 6. App route (core/app.ts)
hub <-> souls <-> tracking by URL hash. Leaving a drill disposes it: stops its rAF loop, exits pointer lock, removes DOM. Bug fixed: v1 pages never stopped their loops (one page per drill, so it never mattered, but a single mount needs it).

## 7. Session end by the drill (core/shell.ts, v2)
A drill may expose `ended()`. While the session is `running`, the shell checks it every frame and goes `running -> results` when it returns true. Cover fire uses this for a loss. No new session states.

## 8. Free movement (core/freemove.ts, #51)
Replaces the on-rails mover for every tracking level. Targets move on a plane (along the path, across it) inside a box, plus height.
```mermaid
stateDiagram-v2
  [*] --> walk
  walk --> walk: new heading (any direction, including toward/away)
  walk --> dash: dash in any direction
  walk --> air: jump
  walk --> zip: only on cable paths
  dash --> slide: end of dash (if allowed)
  dash --> walk: end of dash or box edge
  slide --> walk: speed below walk or box edge
  slide --> air: slide-jump
  air --> walk: land (one air-strafe heading pick per jump)
  zip --> air: drop
```
Box: half path length along, `lat` across (default 2.5 m; 1.5 m on the ledge, 1 m on the ramp, 3 m on the bridge lane). Hitting an edge clamps, turns inward, and ends a dash or slide.
Spec numbers: walk 6.4 m/s, dash peak and duration by bucket, jump 295 u/s, air accel 15 / 5 above 450 u/s, zipline 18 m/s.
ESTIMATED: per-second rates of heading changes, dashes, jumps and zips by difficulty (`FREE_RATES`, all rising Easy to Pro), walk accel 40 m/s^2, air-strafe pick at 0.15 to 0.45 s into the jump.
The Classic/Realistic movement profile no longer changes tracking targets (it only fed the old rails mover).

## 9. Cover fire round (drills/deadlock-cover-fire/sim.ts, #43)
```mermaid
stateDiagram-v2
  [*] --> running
  running --> lost: an enemy inside loseDist (6 / 6 / 6.5 / 7 m)
  running --> survived: session timer ends
```

## 10. Cover fire enemy
```mermaid
stateDiagram-v2
  [*] --> spawn: back row
  spawn --> hidden: after 0.6 s
  hidden --> moving: wait over (exposed)
  moving --> hidden: reached next cover
  moving --> dead: hp 0 (respawn at the back after 1.2 s)
  hidden --> reached: inside loseDist
  moving --> reached: inside loseDist
```
Damage lands only in `moving`. While moving, an enemy strafes, steps back, jumps and dashes in any direction (forward-biased), always heading for the next cover and kept inside |x| <= 10 m. Illegal requests are counted and saved (`illegalTransitions`).

## 11. Cover fire peek (player)
```mermaid
stateDiagram-v2
  [*] --> cover
  cover --> out: hold Shift / Q / right mouse
  out --> peeked: after 0.15 s (ESTIMATED)
  out --> back: release
  peeked --> back: release
  back --> cover: after 0.15 s
  back --> out: hold again
```
Only `peeked` can shoot. The peek side is fixed per round (random left or right); the wall blocks the other side by geometry.
