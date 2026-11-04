# aim-lab

Browser aim and mechanics trainer. TypeScript, Canvas and Three.js, no frameworks.

- Drill A `drills/deadlock-souls/`: last hit troopers, secure and deny floating soul orbs.
- Drill B `drills/deadlock-tracking/`: track a target moving with dash, slide, jump with air strafe, and zipline.
- Mechanic numbers: `specs/deadlock_spec_v1.md` (sourced, estimates marked).

Build and run: `npm install && node build.mjs && python3 -m http.server 8731`, then open http://localhost:8731.
Tests: `node dist/unit.cjs` and `node tests/e2e.mjs http://localhost:8731 v3`.

All shapes are original. No game assets or logos.

## Embed (WordPress classic theme or any page)
Build: `npm install && node build.mjs`. Copy `dist/aimlab.js` and `dist/assets/` to e.g. `assets/js/aim-trainer/` in the theme (same origin). Then on a page:
```html
<div data-aimlab-mount></div>
<script src="/wp-content/themes/THEME/assets/js/aim-trainer/aimlab.js"></script>
```
Or call `AimLab.mount(document.getElementById("x"))`. Asset paths resolve relative to the script. Routes: `#/`, `#/souls`, `#/tracking`.
Crosshair: read from `?ch=` (11 comma values) then localStorage `dramalock-crosshair-v1`, then defaults.
Storage: localStorage by default. If `window.AIMLAB_WP = { restBase, nonce }` is set, a WordPress REST store at `/wp-json/aimlab/v1/` is used (endpoints not built yet).
Local test: `python3 -m http.server` in the repo root, open `index.html`. Tests: `node dist/unit.cjs`, `node tests/e2e_v2.mjs http://localhost:8000 vN`.
Specs: specs/deadlock_spec_v1.md, assets_v1.md, input_v1.md, state_machines_v1.md.
