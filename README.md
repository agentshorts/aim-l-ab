# aim-lab

Browser aim and mechanics trainer. TypeScript, Canvas and Three.js, no frameworks.

- Drill A `drills/deadlock-souls/`: last hit troopers, secure and deny floating soul orbs.
- Drill B `drills/deadlock-tracking/`: track a target moving with dash, slide, jump with air strafe, and zipline.
- Mechanic numbers: `specs/deadlock_spec_v1.md` (sourced, estimates marked).

Build and run: `npm install && node build.mjs && python3 -m http.server 8731`, then open http://localhost:8731.
Tests: `node dist/unit.cjs` and `node tests/e2e.mjs http://localhost:8731 v3`.

All shapes are original. No game assets or logos.
