# State machines v1

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
