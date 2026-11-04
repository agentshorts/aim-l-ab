# Movement study v1 (all numbers ESTIMATED)

Goal: estimate how targets move in real high-elo Deadlock fights and feed that into a "realistic" movement profile for the tracking drill.

## Data
- Source: a local folder of saved high-elo kill clips (441 mp4, 1920x1080, 60 fps, about 24 s each, four streams). Clips were read only, never moved or edited.
- Sample: 40 clips, stratified across the four streams, seed 7 (`study/movement_study_v2.py --n 40 --seed 7`). Run on the local analysis machine in one chunk of about 3 minutes with a per-clip checkpoint.

## Method
1. Frames downscaled to 480 px wide, every 2nd frame (30 fps).
2. Camera yaw and pitch from phase correlation on the central screen band. Degrees per pixel assume a 90 deg horizontal FOV (EST).
3. Non-fight filter (EST), a clip is kept when all hold:
   - no green "FINDING MATCH" queue banner in the top-left on any of 3 probe frames (rejects lobby/sandbox),
   - under 25% still frames (rejects shop, scoreboard, death cam),
   - at least 5% of frames with yaw above 20 deg/s (active aiming).
   Result: 31 of 40 clips kept (12.97 fight minutes), 9 rejected (2 lobby, 7 shop/idle/low aim).
4. Target motion: in a fight the shooter's camera follows the target, so camera yaw rate is used as the target's angular velocity (EST, includes aim error). A strafe reversal is a yaw sign change after a 5-frame smooth with a 10 deg/s dead band; the interval between reversals is recorded.
5. Own movement bursts (dash, zipline) from radial optical flow divergence, and jumps from a pitch down/up bob within 0.3 to 0.9 s.

An earlier v1 approach (tracking red enemy HP bars) was dropped: spot checks showed it locked onto the minimap, shop and scoreboard UI. An audio gunfire filter was also tried and could not tell the lobby from fights.

## Findings (study/movement_stats_v1.json)
| Measure | Value (EST) |
|---|---|
| Strafe reversal interval p10 / p25 / p50 / p75 / p90 | 0.20 / 0.40 / 0.83 / 1.47 / 2.00 s (n = 390) |
| Reversals per fight minute | about 30 |
| Tracking yaw speed, median clip p50 / p90 | 3.2 / 31.8 deg/s |
| Jump-like events | about 1.2 per fight minute |
| Dash-like bursts | 0.3 per minute (NOT reliable) |
| Zipline-like sustained bursts | 0 (NOT measured) |

Limits: dash, slide and zipline could not be measured reliably from the video signal (the divergence threshold rarely fired), and jumps are a rough proxy. Yaw speeds are likely underestimated during fast flicks (phase correlation loses large shifts). Treat everything as a first estimate.

## Use in the trainer
`drills/deadlock-tracking/profile.ts` profile "realistic" (Settings > Tracking movement):
- walk segment lengths sampled from the reversal interval distribution above, and the target reverses at every decision point,
- mode weights walk 0.84, air 0.05 (from the jump rate), dash 0.08 and zip 0.03 (low guesses, not measured),
- dash, slide, jump and zipline speeds unchanged from specs/deadlock_spec_v1.md.
"Classic" stays the default.

## Decision: dash and zipline weights (#22)

Video could not count dashes or zipline rides reliably, so the realistic profile sets them from reasoning instead of measurement:

- dash 0.12 per decision point (about 3.6 per minute at ~30 decisions per minute). Stamina allows roughly 10 or more dashes per minute; skilled players spend about a third of that on spacing in a duel and keep the rest for escapes. Up from the 0.08 placeholder, which made dashes feel rare next to strafes.
- zipline 0.02 per decision point (about 0.6 per minute). Ziplines move players between lanes, not inside a fight, so a target on a cable mid-duel should be the exception. Down from 0.03.
- walk takes the rest (0.81); air stays 0.05 (measured).

Revisit if a HUD stamina pip detector or a manual tag pass on about 20 clips becomes available.
