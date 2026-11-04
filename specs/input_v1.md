# Mouse input v1

## Pipeline (core/input.ts)
1. Click Start: `requestPointerLock({ unadjustedMovement: true })` when Raw input is on. If the browser rejects the option (Firefox, Safari, some Linux builds) it retries plain `requestPointerLock()` and the badge shows "os accel". Chromium on Windows, macOS and ChromeOS supports unadjustedMovement (https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock#unadjustedmovement).
2. Every `mousemove` while locked adds `movementX/Y` to an accumulator and stores `event.timeStamp`. Nothing is dropped between frames (sub-frame accumulation), so 1000 to 8000 Hz mice are summed per frame.
3. Once per rAF frame `consume(now)` converts counts to radians, applies yaw/pitch (pitch clamped to +-1.45 rad) and records `now - event.timeStamp` per event as event-to-frame latency.
4. Clicks are queued with their timestamps and processed at the start of the next frame, before the sim step, against the camera after this frame's look update.

## Sensitivity math (core/sens.ts)
- radians per count = 2*pi / ((cm360 / 2.54) * dpi). Unit check: exactly (cm360/2.54)*dpi counts make one full turn (unit test).
- Deadlock: cm/360 = 914.4 / (dpi * sens * 0.044). Yaw 0.044 deg per count at sens 1 is **community measured, not published by Valve (ESTIMATE)**: mouse-sensitivity.com via https://senslab.pro/guides/deadlock-sensitivity, https://aimbetween.games/sensitivity/cs2-to-deadlock and https://dramalock.org/deadlock-sensitivity-converter/ . Check: sens 1 at 800 DPI = 25.98 cm/360 (unit test). Patches have changed it before, so re-verify after big updates.

## Latency and pacing measurement
- Results screen and e2e report event-to-frame latency p50 and p95 (time from mouse event to the frame that consumed it). This excludes compositor and display latency (about one more frame), which a browser cannot observe.
- Frame pacing: mean, p50, p99, max, standard deviation, and "hitches" (frames over 1.5x the median). Shown per session in results and saved with the run.

## Limits
- Headless tests cannot get pointer lock, so automated runs inject counts through `Input.inject` (same accumulator path).
- Browsers cap rAF at display refresh; 144 Hz needs a 144 Hz display and a headed browser.
