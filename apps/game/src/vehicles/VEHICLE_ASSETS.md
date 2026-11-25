# Vehicle model asset candidates

These are external source candidates only. Do not remove the current procedural vehicle visuals until the GLB files have been added to `apps/game/public/assets/vehicles/`, their hierarchy and scale have been inspected, and the game build has passed.

| Role | Candidate | Format / size | Licence | Notes |
|---|---|---:|---|---|
| Player / NPC cars | [Vinish realistic cars](https://vinish.dev/free-3d-models/realistic-cars) | GLB, about 3.0–4.8 MB each | CC BY 4.0 | Higher-detail models with interiors and named wheel nodes; add attribution in game credits. |
| Public transport minibus | [Grab3D minibus](https://grab3d.com/models/vehicles/minibus/) | GLB, 1.4 MB | CC0 1.0 | Lightweight stylized model, 25,969 triangles, interior seats, four rolling wheels. |
| Alternative minibus | [Innerscene 8 m minibus](https://www.innerscene.com/tools/library/3d-parts/minibus-8-m-8f4e1345) | GLB, 493 KB | CC0 | Generic van-based minibus, seats and sliding door; inspect scale and wheel hierarchy before use. |
| Large bus | [Innerscene low-floor city bus](https://www.innerscene.com/tools/library/3d-parts/low-floor-city-bus-9e7ce899) | GLB, 784 KB | CC0 | Exterior visualization with editable wheel assemblies; no interior seating or powertrain. |

## Integration requirements

- Keep the Babylon.js vehicle dynamics, NPC route logic, collision and enter/exit interactions.
- Use separate model instances and varied paint colours for player and NPC vehicles.
- Verify wheel node names, wheel radius, model forward axis, ground pivot and real-world dimensions.
- Add headlights, brake lights, reverse lights and indicators as runtime-controlled emissive meshes if the source model does not provide suitable light nodes.
- Add engine and tyre audio as a separate audio task; do not infer sound support from a GLB.
- Optimize high-detail hero vehicles separately from NPC traffic for mobile memory and draw-call budgets.
- Retain a safe fallback until every replacement asset loads successfully.
