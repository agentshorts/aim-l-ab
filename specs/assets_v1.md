# Assets v1

Rule: no Valve assets, no ripped models, textures, sounds, logos or names styled as the Deadlock logo. Everything shipped is either original code-generated geometry or clearly licensed.

## Shipped in the build
| Asset | Where | License | Link | Notes |
|---|---|---|---|---|
| Oswald (variable TTF) | assets/fonts/Oswald-Variable.ttf | SIL Open Font License 1.1 (OFL text shipped next to it: assets/fonts/OFL_Oswald.txt) | https://github.com/google/fonts/tree/main/ofl/oswald | Condensed display face for titles, HUD numbers. OFL allows bundling and embedding; do not sell the font alone. |
| Trooper, orb, lane, buildings, zipline geometry | core/scene3d.ts | Original, part of this repo (MIT) | n/a | Built from Three.js primitives: puppet body, lantern head (amber vs sapphire glow), cage, sash, world HP bar; glowing icosahedron orbs; lane stripes; box buildings with lit windows; cables on posts. Evokes the setting without copying any model. |
| Palette | core/theme.css, PAL in core/scene3d.ts | Original | n/a | Dark teal and charcoal base, amber and sapphire team accents, cream text. Colors are not copyrightable; no logo use. |
| three.js | npm three | MIT | https://github.com/mrdoob/three.js/blob/dev/LICENSE | Renderer. License kept via legalComments in the bundle. |

## Researched candidates (not shipped yet)
| Source | License | Link | Possible use | Check before use |
|---|---|---|---|---|
| Kenney asset packs (e.g. City Kit, Prototype Textures) | CC0 1.0 (stated on each pack page) | https://kenney.nl/assets | Street props, building facades, prototype grid textures for lane | Confirm CC0 on the specific pack page and keep the License.txt from the zip. |
| Quaternius low poly models | CC0 (site states "free Low Poly 3D Models, using the CC0 License") | https://quaternius.com | Stylized humanoids or robots as an alternative trooper body | Confirm per pack; prefer non-humanoid robots to stay original. |
| Poly Pizza | Per model: CC0 or CC-BY 3.0 | https://poly.pizza | Lamps, lanterns, street lights | CC-BY needs visible credit (author, link, license) in an About panel. |
| Google Fonts alternates: Bebas Neue, Barlow Condensed | OFL 1.1 | https://fonts.google.com | Alternate display fonts | Ship OFL text with the font file. |
| Community fan kits for Deadlock | Usually unclear or "fan use only" | n/a | Not used | Only if a kit has an explicit license allowing redistribution; none found that is clearly permissive. |

No third-party model is used in v1 because the procedural shapes already read clearly at aim-trainer distances and avoid license bookkeeping. If a CC-BY model is added later, add an About/credits panel and list it here as assets_v2.md.
