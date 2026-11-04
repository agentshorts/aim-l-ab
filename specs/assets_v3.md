# Assets v3: original 3D asset pack v1

Source: in-house procedural Blender build (asset pack v1, build script and licence sheet in `assets/models/LICENSES_v1.md`). All items are original work: no third-party models or textures, no game assets or logos, no AI-generated art. CC0 sources: none.

| File (assets/models/) | Size | Tris | Licence | Used in |
|---|---|---|---|---|
| trooper_melee_v1.glb | 20 KB | 208 | original, owned by project | souls troopers (melee) |
| trooper_ranged_v1.glb | 21 KB | 224 | original | souls troopers (ranged, medic), ally team re-tinted sapphire |
| soul_orb_v1.glb | 27 KB | 292 | original | souls orbs (origin at base, centre 0.25 m up, offset in code) |
| ground_tile_v1.glb | 18 KB | 216 | original | loaded, not placed yet |
| wall_straight_v1.glb | 10 KB | 84 | original | loaded, not placed yet |
| wall_corner_v1.glb | 6 KB | 48 | original | loaded, not placed yet |
| building_guardhouse_v1.glb | 15 KB | 132 | original | tracking backdrop |
| building_tower_v1.glb | 16 KB | 158 | original | tracking backdrop |
| zipline_pylon_v1.glb | 25 KB | 296 | original | both drills, scaled so the 6.0 m anchor meets the cable height |
| zipline_cable_10m_v1.glb | 11 KB | 128 | original | both drills, tiled and scaled along the run |
| target_dummy_v1.glb | 89 KB | 280 | original rig and keyframed clips | tracking target (12 bones, idle/run/dash/slide/jump) |

Loading: `core/models.ts` loads from `<bundle dir>/assets/models/` with GLTFLoader, so the same build works from the repo and the WordPress theme folder. If a file fails to load, the code-built shapes are used.

Dummy notes: root travel is stripped (X/Z always, Y also in jump), the mover drives position, and clips are re-based to t=0. Facing turns the clip's +Z toward the direction of travel.
