# Tracking levels v1 (Sprint 3)

Levels are data (`drills/deadlock-tracking/levels.ts`). Each `LevelDef` has:

- **vantage**: player eye position, plus a starting yaw and pitch.
- **paths**: 3D segments the targets walk back and forth on. The mover's x maps onto the segment, so a sloped segment is a ramp. Jumps add height on top. Zipline mode only on paths marked `zip`.
- **props**: asset pack models (ground_tile, wall_straight, wall_corner, building_guardhouse, building_tower, zipline) or code-shape boxes for platforms, ramps (`tilt`) and bridge decks. `tiles: true` caps a box with ground_tile models. Props block line of sight: the head only counts as on target when it is the first thing the crosshair ray hits.
- **targets / switchS**: more than one target means one live target and dim decoys; the live role moves every `switchS` seconds.

Routes are `#/tracking/<id>`, results are stored as `deadlock-tracking-<id>`, and each level gets a hub card. Difficulty still picks the allowed moves and the head size. If models fail to load, walls and buildings fall back to boxes of the same size.

## Levels

| id | Title | Vantage | Targets |
|---|---|---|---|
| high-ground | High ground | platform edge, eye 9.7 m | ground strafe 14 m out, 22 m wide; wall and guardhouse as cover |
| bridge | Bridge over the lane | bridge deck, eye 6.7 m | lane run 23 m from 26 m out to just short of the deck (steep look-down at the near end); rails cut line of sight |
| elevated-targets | Targets on high ground | street level, eye 1.7 m | rooftop strafe 6 m up, 14 m out; low walls on the ledge |
