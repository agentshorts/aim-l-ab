# Sounds, harder targets, streak forgiveness (v1)

Issues #57, #58, #59. Numbers marked ESTIMATED are tuning choices, not spec values.

## #57 sounds
- Streak hum (tracking, cover fire): a soft sustained chord (root, fifth, octave) through a 1800 Hz lowpass. Level = streak / 15 s, capped at 1. Pitch climbs the A major pentatonic (220 to 440 Hz) and gain rises 0.03 to 0.11 as the streak grows. Silent at 0 and whenever the session is not running. ESTIMATED.
- Streak tiers: every 3 s of streak plays a rising arpeggio, tier 1 to 5, each longer and higher than the last.
- Losing a streak longer than 1 s plays the soft miss sound.
- Zipline knock-off plays a thud ("knock").
- Cover fire: a short "peek" click when you lean out, kill combo chimes (2x, 3x, 4x) for kills within 3 s of each other.
- Souls: consecutive good shots (last hit, secure, deny) with no miss or early shot play combo chimes on top of the normal sound; best combo is in the results.
- End of session: a fanfare for a new personal best, else a short "done" chord.

## #58 increasing difficulty
- Tracking detects tracking through the streak: after EVADE_AFTER seconds of continuous tracking (Easy 2.0, Normal 1.2, Hard 0.7, Pro 0.4 s; ESTIMATED) the target breaks away: it turns 90 to 150 degrees off its current direction and dashes if it has stamina, else just turns.
- Air dashes: air may go to dash, and an air dash may chain into another air dash. Air dash elevation is picked from -0.35, 0, 0.45, 0.8 rad, so some go up (up-left, up-right). Rate per second airborne: Easy 0, Normal 0.6, Hard 1.5, Pro 3. Chance to chain straight into another: airDash rate / 4, max 0.75. ESTIMATED.
- Stamina: 3 dash bars, one bar back every 4.5 s. When air dashes are on, ground dashes keep one bar in reserve for the air.
- An air dash ends in a fall with no jump boost; it lands to walk if it reaches the floor.

## #59 streak forgiveness
- Target switch (multi-target tracking, or a kill in cover fire): the streak holds for 0.5 s while you move to the new target. It does not grow while held.
- Cover: the streak holds as long as the target you were tracking is behind cover (tracking: the crosshair is within 2.5 head radii of the head line and cover blocks it; cover fire: your tracked enemy is hidden). When it comes back out you get 0.5 s to get on it again.
- Simply missing gets no grace: off target with no switch or cover resets at once.
- The meter shows "held" or "held: behind cover" while a hold is active.
