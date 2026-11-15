# AKWANTUO Greater Accra geography audit

**Status:** audit only; no runtime geometry changed in this commit.

## Purpose

The playable world should read as a recognisable, coherent Accra-inspired city. The current map is explicitly a compressed, stylised game layout rather than surveyed GIS. This audit records what is grounded in public Ghanaian transport references and what must be corrected or verified before changing coordinates.

## Current implementation findings

Reviewed on `fix/serve-character-models-from-game`:

- `greaterAccraLayout.ts` defines a 21 km × 13.5 km local coordinate frame, approximate district anchors, 16 primary-road nodes, 14 road paths and a schematic coastline.
- `roadNetwork.ts` contains primary-road topology only. It does not yet represent the full urban street hierarchy or all important connecting links.
- The N6 geometry currently starts at Achimota and runs north to Ofankor. There is no N6 segment in the authored graph from Circle through the intervening northern Accra corridor to Achimota.
- The N4 is represented from Tetteh Quarshie through Madina toward Adenta; the road network does not yet extend the route beyond that corridor.
- `railNetwork.ts` correctly models Achimota as the branch point between the Tema branch and the northbound Eastern Line. The Odaw/Circle point is explicitly provisional and must remain a candidate corridor marker, not a confirmed station.
- `greaterAccraLandmarks.ts` places eight landmarks with hand-authored local coordinates and creates 35 neighbourhood-road ribbons. Those coordinates are game anchors, not verified geographic positions.
- `ghanaianWorldDetail.ts` places coastline and vegetation props using the same stylised coordinate frame. Those props must be reviewed after the coastline and district layout are reconciled.

## External reference facts

1. Ghana Highway Authority's Greater Accra regional trunk-road map is published in the Ghana Metre Grid coordinate system and shows the regional trunk network, settlements, waterways and Gulf of Guinea coastline. It is the preferred starting reference for the regional road hierarchy and spatial orientation:
   - https://static-gha.s3.amazonaws.com/static/pdf/road_network/GHA%20GREATER%20ACCRA%202020_CE.pdf
2. The National Road Safety Authority's Greater Accra profile identifies N1, N4 and N6 as roads through the region. It identifies N1 blackspot sections including Mallam Junction–Weija Barrier and the Accra–Tema Motorway; N4 blackspots include Okponglo, Madina and Adenta; N6 blackspots include Circle–Caprice, Alajo–Apenkwa and Achimota–Ofankor. This confirms that the N6 needs a connected Circle-to-Achimota-to-Ofankor corridor in the game graph, not only an isolated Achimota–Ofankor segment:
   - https://nrsa.gov.gh/about-us/greater-accra-regional-profile/
3. The Ghana Highway Authority road-network list describes N1 as the Elubo–Tema route, N4 as Accra–Bunso and N6 as Accra–Kumasi. Road labels in the game should preserve these national-route identities rather than treating N4/N6 as isolated local roads:
   - https://www.highways.gov.gh/road_net
4. The Ministry of Finance PPP Portal states that the Eastern Railway Line links Accra to Kumasi, with a branch from Achimota to Tema Port, and documents the 1,067 mm gauge. This supports the existing Achimota branch-point concept. It does not validate the exact in-game track polyline or an Odaw station:
   - https://ppp.mofep.gov.gh/project/69/eastern-railway-line-project
5. The Land Use and Spatial Planning Authority publishes the Greater Accra Regional Spatial Development Framework volumes. These are useful for district relationships, urban expansion, transport corridors and protected areas:
   - https://luspa.gov.gh/spatial-plans/

## Required next implementation sequence

### A. Establish a geospatial reference layer

- Use the Ghana Highway Authority Greater Accra map and LUSPA spatial framework as reference sources.
- Define a documented transformation from Ghana Metre Grid / geographic reference coordinates into the game's local X/Z coordinates.
- Keep the world compressed for gameplay if needed, but use one consistent transformation and record its scale and origin. Do not hand-adjust each landmark independently.
- Treat exact local-street geometry, building footprints, railway alignments and station footprints as unverified until a suitable source is available.

### B. Repair the primary road graph

- Add the missing connected N6 corridor from Circle north through the Caprice / Alajo / Apenkwa corridor to Achimota, then continue to Ofankor.
- Preserve the N1 west-to-east connection through Mallam / Kaneshie / Circle and onward toward Tema.
- Keep N4 connected from Tetteh Quarshie through Madina and Adenta, with later northbound expansion clearly marked.
- Model junctions as connected graph nodes, not roads that visually cross without a navigable connection.
- Keep local access streets distinct from national highways and frontage roads.

### C. Reconcile railway and roads

- Keep Achimota as the Eastern Line branch point.
- Preserve the Accra–Achimota–Tema and Accra–Achimota–Nsawam route relationships.
- Keep Odaw/Circle as an unconfirmed corridor candidate unless a reliable current source confirms a station there.
- Review road/rail crossings against the map before creating barriers, signals or station footprints.

### D. Organise buildings by district

- Place commercial buildings along appropriate main streets and town centres.
- Place residential clusters behind local access roads rather than directly on motorway carriageways.
- Keep industrial / port uses around Tema and its logistics corridors.
- Keep Airport City, Accra Mall / Tetteh Quarshie, Osu, Makola, Labadi, Achimota and Legon recognisable in their relative positions.
- Preserve all existing landmarks and interiors; relocate only after their reference positions and collision footprints have been checked.

## Guardrails

- Do not delete existing world content, player data, Supabase data, deployment configuration or the old Accra Life repository.
- Do not present a schematic route as surveyed or operational infrastructure.
- Do not make large coordinate changes in one commit. First add a coordinate transform and graph-level validation, then update one corridor at a time.
- Extend the existing map and transport smoke tests to verify connectivity, route continuity, map bounds, crossings and district relationships.
- Keep all work on the existing PR branch. Do not merge PR #10 or change `main` as part of this stage.
