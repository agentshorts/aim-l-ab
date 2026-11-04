# Asset pack v3 swap-in (models from the modeler's v3 job; the asset list itself is in assets_v3.md)

| File | Measured on the box (three.js Box3 and raycast) | Used in |
|---|---|---|
| target_dummy_v3.glb | slide clip lowest vertex Y 0.000 on every frame (v2 dropped through the floor); bind min Y 0.000 | all tracking levels (replaces v2, which is removed) |
| bridge_deck_30m_v2.glb | X -1.60..1.60, Y 0..5.60, Z -15.05..15.05; deck top Y 5.01 | bridge level, ry 90 degrees so it spans X; vantage eye stays 6.7 |
| ramp_17m_v1.glb | X -1.51..1.51, Z 0..17.01; surface Y 0.13 at Z 0.5, 2.25 at 8.5, 4.37 at 16.5 | multi-path level at the ramp path start, yaw atan2(4,-16), Z scaled 16.49/17 to the path run |

Both level props keep their previous code shapes as `fallback`, built only if the model fails to load. bridge_deck_30m_v1.glb was not used.
