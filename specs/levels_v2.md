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
| multi-path | Multi-path | street level, eye 1.7 m | 3 targets: lateral, receding diagonal, ramp up 4.5 m; live role switches every 4 s |

## v2 additions (#52, #53, #54)
- `zips: ZipDef[]` per level: level cables, along Z (over and along the lane) or along X. Drawn with the pylon kit.
- `souls: { vantage, yaw0, pitch0 }`: the level is also a souls lane (route `#/souls/<id>`, hub card "Souls: <title>").
  Troopers keep their sim paths: the lane centre, 13 to 19 m out along -Z. Unit test: every trooper slot is clear of
  solids and visible from the souls vantage.
- `cyl` prop: code-shape octagonal column (statue plinths, arch pillars, overpass piers).
- Collision volumes come from the props (`levelSolids`): box props, model props by their fallback box dims, tilted boxes as
  solid ramps.
- The default lane (`#/tracking`) now has its target box on the lane itself (9 to 25 m out, 10 m wide) with the cable over
  its left side, so cable rides run along the lane.

### Lane layouts (#54). Original shapes plus the asset pack walls; no Valve assets.
| id | souls vantage | tracking paths | high ground | zipline |
|---|---|---|---|---|
| lane-plaza | lane, eye 1.7 m | lane (zip) + right sidewalk 1.2 m | raised sidewalks with 4-step stair runs, plaza with stairs and two octagonal statue plinths at 33-43 m | x -2.5, 5.5 m |
| lane-overpass | on the overpass, eye 6.7 m | overpass deck (5 m) + lane under it (zip) | L-shaped overpass: crosses the lane at 4 to 8 m, turns along the left side to 26 m; 16-step stairs on the right | x 2.5, 7.5 m |
| lane-terrace | terrace edge, eye 5.7 m | lane (zip) + terrace top (4 m) | 7 m wide terrace on the left with a 13-step stair run at 22-28 m; arch over the lane at 36 m | x 3, 5.5 m |
