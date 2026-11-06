# AKWANTUO transport work — close-out report

**Status:** OPEN — the Greater Accra road/rail visual network is integrated into the main scene, with local car/trotro journeys and a mapped prototype train. Do not hand over the next master-prompt stage until remaining vehicle classes, lane-constrained driving, traffic interactions, mapped rail operations and required device checks are completed.

## Added and validated foundations

### Railway
- Ultra-modern station concept with concourse, platforms, passenger fit-out, access and sheltered interchange walkway.
- Schematic Greater Accra rail topology using 1,067 mm Cape gauge.
- Reusable track and train visual geometry, a two-car train rig and deterministic acceleration/braking/station-dwell controller.
- Route-to-service adapter only creates stops from eligible first-release station catalogue entries.
- Circle/Odaw remains a candidate location and is not silently promoted to an operational station.
- Preview startup checks reject invalid train operation state and verify station eligibility.
- The main playable scene creates a compact local rail corridor with paired rails, ballast, sleepers, an ultra-modern two-platform station, a sheltered terminal platform and a moving two-car train. The train uses the acceleration/braking controller, stops for an 8-second terminal dwell and opens alighting during that stop.
- The local passenger rail demo remains a compact integration slice inside the starting district, with boarding, fare deduction, passenger camera modes and terminal alighting. In addition, the main Greater Accra scene runs a two-car train along the connected schematic Accra Central–Odaw–Achimota–Tema route chain. It waits at the Accra Central station anchor until the player boards, then departs, passes the candidate Odaw/Circle marker and Achimota junction without stopping, and dwells at the planned Tema terminal where the player can alight. The mapped preview ride is free because no approved fare has been set. This is still a prototype: the mapped station anchors are markers rather than finished station buildings, and the service has no return trip, live timetable, signalling, dispatch, block occupancy or collision protection.

### Road vehicles
- Vehicle family catalogue for private cars, taxis, trotros, city buses, motorcycles, vans, rigid trucks and emergency vehicles; intercity coaches and articulated trucks remain later-release content.
- Reusable saloon-car prototype geometry, transform rig and bounded kinematic bicycle handling model.
- Keyboard driving plus mobile touch buttons for accelerate, reverse, brake and steering in the standalone transport preview.
- New vehicle interaction state machine validates proximity, seat availability, vehicle availability, stopped speed and safe exit.
- Added a swept circular-footprint collision helper for local vehicle-to-vehicle checks. The starter saloon uses it against the playable trotro so a low frame rate cannot skip through the minibus; deterministic smoke checks cover clear paths, crossing paths and invalid footprints.
- The starter saloon is now spawned in the main playable scene. The player can enter with E / the on-screen action control, drive with WASD or the touch joystick, brake, and exit only after stopping in a safe space.
- The playable saloon now has an in-cabin window view, interior free-look and exterior follow camera modes, cycled with C / the on-screen VIEW control. Camera anchors follow the vehicle rig.
- Road-vehicle simulation now preserves elapsed time through slow render frames by subdividing up to one second of catch-up into stable 100 ms dynamics steps. This avoids making the trotro journey crawl when browser rendering is temporarily slow; long tab-resume pauses remain bounded.
- Added a separate single-track motorcycle dynamics foundation with speed-scaled steering, acceleration/braking, yaw response and a bounded lean angle. Startup smoke checks cover turning lean, high-speed lean limits, braking and invalid controls. This is not yet connected to a rendered motorcycle, rider animation, wheel/suspension physics or the player control loop.
- This first playable vehicle slice is local-only and uses the prototype kinematic model; it is not yet a complete vehicle fleet or network-authoritative system.



### Greater Accra road route planning
- Added a shortest-distance route planner over the conceptual primary-road graph. It returns ordered node and segment IDs plus distance derived from the schematic map polylines.
- Future expansion stubs are excluded by default and can only be included when explicitly requested. Disconnected graph components return no route rather than inventing a connection.
- Runtime smoke checks cover Mallam-to-Tema routing, the future Prampram gateway exclusion/opt-in, and the currently disconnected Achimota component.
- Important limitation: the route is marked `planning_only`. The graph currently assumes bidirectional segments and does not enforce legal turns, grade-separated ramp transitions, lane directions, signal phases, congestion or vehicle-specific restrictions. It is not yet a driving/navigation system.

### Road projection and lane-centre navigation
- Added nearest-road projection against the authored centreline paths, including along-route distance, heading, lateral offset and cross-section width.
- Added forward/reverse lane-centre offsets and world-space lane-centre points. Divided-road median space is explicitly excluded from the drivable corridor test; shoulders remain included.
- Runtime smoke checks cover exact centreline projection, lane-centre placement, median/off-road rejection, opposing lane offsets and future Nsawam stub exclusion unless expansion is explicitly enabled.
- These road-navigation smoke checks passed inside the desktop and mobile-sized main-game browser run 42200398632, alongside the full trotro journey and Greater Accra map preview check.
- The connected Accra Central–Odaw–Achimota–Tema service chain was then exercised by startup smoke checks through its full terminal dwell; the desktop/mobile main-game journey and map-preview checks passed again in run 42201526071.
- Limitation: this is a reusable navigation foundation only. The starter saloon/trotro controls are not yet constrained to these mapped lanes, and it does not enforce legal turns, signals, traffic or collisions.

### Greater Accra road-network preview
- Added a dedicated developer page at `/greater-accra-transport-preview.html` that renders the first-release Greater Accra road corridor ribbons and lane markings from the shared map layout, with district-anchor markers, junction reservation envelopes and the schematic Gulf of Guinea coastline.
- The preview uses the same 21 km × 13.5 km planning coordinate frame as the Greater Accra layout. It is a navigable visual review scene, not a drivable map or a surveyed geographic representation. Four planning-only public transport corridors are overlaid with mode-coloured route lines and a legend; these lines follow the authored road graph and do not represent approved stop positions.
- Added a Chromium browser check to open the preview, detect uncaught page errors, verify its ready status and capture a map screenshot as a workflow artifact.
- Fixed the production multi-page build inputs so `greater-accra-transport-preview.html` is emitted as its own page rather than falling back to the main game entry. The browser check had exposed that the source HTML existed but was omitted from Vite's explicit Rollup input list.
- The preview now also instantiates the authored Circle interchange package: ground-level circulating surface and approaches, multi-level flyover/ramp structures, local vehicle/pedestrian access paths, and the Odaw river/rail corridor. These are visible design meshes only; no road traffic, collisions, navigation or full-city interchange integration is implied.
- Added the first-release schematic Cape-gauge rail corridors to the same map preview, with instanced sleepers, paired rails and ballast, plus markers for the three planned stations (Accra Central, Achimota and Tema). The candidate Circle/Odaw stop is intentionally not shown as a confirmed station. These are planning visuals, not surveyed track geometry or operational service.
- The first-release transport geometry is integrated into the main playable scene: Greater Accra-scale terrain bounds, Gulf coastline/ocean, major road surfaces and lane markings, Circle interchange structures, Cape-gauge rail tracks and planned-station markers. The compact local building block remains as a temporary near-spawn district. The map is still a compressed prototype; the road/rail meshes are visual-only and do not yet provide full collision, lane navigation or traffic control. This integration passed the main-game desktop/mobile-sized Chromium journey and Greater Accra map-preview readiness checks in GitHub Actions run 42198501990; the follow-up mesh-count assertions passed in run 42198967526. Screenshots and a build report were uploaded as artifacts. Visual inspection confirms the main-game capture shows the temporary local district and trotro journey, not a full Greater Accra city view.
- Startup diagnostics exposed a faulty traffic-signal smoke-test expectation: simulation time −1 second in a 48-second cycle correctly wraps to cycle position 47 (red), not green. The expectation has been corrected; the desktop/mobile browser journey is being rerun before the startup path is counted as verified.

### Road traffic controls
- Added a reusable zebra-crossing and tactile-paving geometry builder. Its layout validator checks unit direction, crossing dimensions, stripe count/width and tactile-paving depth; startup smoke checks cover valid layouts and reject invalid geometry inputs. No real Greater Accra pedestrian crossing is approved yet because exact junction endpoints and pedestrian desire lines still need map integration and review.
- Added a deterministic traffic-signal phase model with configurable green, amber and red durations plus a simulation-time offset.
- Smoke checks cover phase boundaries, cycle wrap, negative time offsets, invalid time rejection and protected-movement gating.
- This is a reusable simulation foundation only: no signal heads are placed in the playable map, no junction conflict groups or signal timings have been approved, and it does not yet control traffic AI or player movement.

### Railway / road crossing review
- Added geometry-based detection of road/rail centreline intersections using the first-release Greater Accra schematic road and Cape-gauge rail layouts.
- Circle and Achimota intersections are excluded from level-crossing candidates because those locations are reserved for grade-separated junction treatments. Four other intersections are identified for design review: N1/Tema corridor, Liberation Road, Spintex Road and the Spintex–Tema connection. The Spintex–Tema candidate crosses at a shallow angle and is explicitly flagged for alignment redesign/review rather than treated as an acceptable crossing.
- The same four review markers are now shown in the playable Greater Accra transport scene and the developer map preview. They are explicitly marked in code and diagnostics as review-required; they are not approved real-world crossing locations or completed crossing structures.
- Added a fail-safe crossing interlock helper: it warns as a train approaches, denies road entry, keeps barriers down until the train rear plus clearance has passed, and defaults to closed on system fault. Startup smoke checks cover clear, approach, occupied, rear-clear and fault cases.
- Important limitation: the interlock is a pure tested helper, not yet connected to mapped train position, road traffic AI, signal heads, barrier animations or player vehicle movement. The crossing candidates are inferred from provisional schematic centre lines and require alignment/site review before operational use.

### Public transport
- Passenger camera modes: interior window, interior free-look and exterior follow.
- Passenger vehicle profiles for trotro, city bus, coach and taxi.
- New boarding/alighting state machine checks stopped vehicle, open boarding/alighting, available seats and vehicle identity.
- A Ghana-inspired shared-trotro minibus visual is now spawned in the main playable scene. The player can board at a temporary preview stop, pay a fare from a local pesewa balance, ride while the vehicle moves with an interior-window/free-look/exterior camera, and alight at the temporary terminal stop.
- This is a short local preview journey inside the 180m test scene, not a Greater Accra route, a live schedule, an NPC-driven public transport service or a server-backed payment.
- Fare quote and deduction use integer pesewas and validate balances.
- Added four planning-only public-transport corridor proposals derived from connected first-release road paths: Mallam–Kaneshie–Circle–Tema (trotro), Circle–37–Osu–Labadi (city bus), Tetteh Quarshie–Spintex–Tema (trotro) and Madina–Adenta (shared taxi). They are route-planning corridors only; waypoint junctions are not approved passenger stops, and no timetables, frequencies, fares or live vehicles are implied.
- The playable-world diagnostics and developer map preview now report these four route plans. The developer map preview draws their corridor lines in mode colours. The browser verification asserts their presence alongside the road/rail network.
- Main-game startup smoke checks exercise fare calculation, repeat boarding rejection, moving-vehicle boarding/alighting rejection, seat availability, insufficient funds, wallet carry-over between transport modes, vehicle entry/exit safety, road-vehicle acceleration/braking, and rail station dwell/terminal completion.

### Quality checks
- Latest transport verification run 42205227064 passed: TypeScript typecheck, production build, desktop and mobile-sized main-game browser checks, Greater Accra map preview readiness and screenshot/report capture. The browser checks assert the four road/rail crossing candidates, four planning-only public transport corridors and mapped train boarding availability at Accra Central, then complete the local trotro boarding/camera/terminal/alighting journey. The run does not yet exercise the full mapped Accra–Tema train journey end-to-end. Artifact: [screenshots and build report](https://github.com/jerryspanelli-tech/akwantuo/actions/runs/42205227064).
- GitHub Actions runs TypeScript typecheck and production Vite build. The transport workflow also launches the actual main game in Chromium at desktop and mobile-sized viewports, enters gameplay, exercises the complete trotro boarding/camera/alighting journey, checks uncaught page errors, captures screenshots, and uploads a report artifact. A completed automated run passed the full main-game trotro journey on desktop and mobile-sized Chromium viewports: startup, gameplay entry, boarding, passenger-camera switching, route completion, terminal alighting and screenshot capture. The run also passed TypeScript typecheck and the production Vite build. The trotro route now uses a separately bounded frame delta so it continues to advance on lower-frame-rate devices while the rest of the game retains its tighter simulation cap. These are browser viewport tests, not a substitute for testing on a physical phone.
- The production map page and playable-scene integration were verified in GitHub Actions run 42198967526 (commit `efbfb65`). Desktop and mobile-sized Chromium tests both reported 99 road-surface meshes, 23 road-marking meshes, 2 rail routes, 3 planned station anchors and 6 Circle elevated structures; both also completed the trotro passenger journey. The map preview reached its ready state and screenshots/report were uploaded. Visual inspection confirmed the far-clip fix makes the map visible. A dedicated Circle interchange detail view now captures a closer view alongside the full Greater Accra overview; both screenshots were captured in run 42202320865. The full-city overview remains schematic at this scale. This remains automated Chromium viewport verification, not physical-device testing.
- No public deployment was made.
- Preview is a developer-only scene; it is not the main playable game.

## Explicitly not complete

These are not being represented as finished systems:
- Realistic final 3D assets for every Ghanaian vehicle class, interiors, articulated trailers and motorcycles. The new motorcycle dynamics helper is not a motorcycle model or a complete rideable vehicle.
- Complete physical collision and vehicle damage simulation; the new swept circular-footprint test is a conservative prototype check between the starter saloon and preview trotro, not full oriented-body physics or general traffic collision handling. Suspension, tyre grip, wheel steering/rotation, fuel, ownership, insurance, licences and garages are also outstanding.
- AI traffic, in-world traffic-light placement and junction conflict-group control, lane-level navigation, parking enforcement, emergency dispatch and road safety simulation. The deterministic signal phase helper is not an integrated junction-control system. The rail crossing interlock is also not yet wired to train/road simulation or animated crossing equipment.
- Driver entry/exit is connected for the starter saloon, but seat animations and visible driver placement are not yet implemented. The three camera modes are connected to the starter saloon and the preview trotro passenger ride; full passenger seat placement and animations remain unimplemented.
- Approved Greater Accra public-transport stop placements, timetables, multiple live vehicles, conductor/mate interaction, stop announcements, full fare UI and real destination boards. The four route corridors are planning-only; their junction waypoints are not real passenger stops. The current two temporary preview stops are deliberately not presented as real Accra stops.
- Rail signalling, block occupancy, switches, dispatch, timetable conflicts, train doors, full passenger interiors and operational railway certification. Mapped Accra Central boarding and Tema alighting are connected in the main game, but the complete mapped journey still needs an end-to-end browser/device test and finished station buildings. The four road/rail crossing markers remain review candidates; no crossing is operational.
- Multiplayer/server-authoritative vehicle ownership, seat reservations, fare transactions, economy integration, anti-cheat and persistence.
- Full playable Greater Accra streets and districts. The main scene now includes the 21 km × 13.5 km schematic road/rail corridor geometry, Circle interchange and mapped train, but most district streets/buildings, collision, lane-constrained driving, traffic and station structures are not yet integrated. The separate short local rail demo remains a compact prototype inside the starter district.
- Main-game mobile driving and camera controls are connected for the starter saloon. The preview trotro passenger journey uses the same on-screen interaction and view controls; additional vehicle classes and mapped public-transport services remain unconnected.

## Remaining work before this stage can close
1. Refine and approve the schematic Greater Accra road/rail alignments, add local streets, station buildings and approved public-transport stop placements.
2. Integrate vehicle interaction, driver/passenger seats and passenger camera anchors into the actual player and vehicle assets.
3. Add traffic collision/navigation and server-authoritative ownership/occupancy/fare transactions before online play.
4. Add the remaining vehicle-specific models and handling, then test on ordinary phones and computers. The current browser automation is a desktop/mobile viewport test, not a real-device certification.
5. Finish the mapped rail passenger journey with built Accra Central and Tema station structures and an end-to-end ride test; turn the four provisional road/rail crossing candidates into reviewed layouts, then wire the fail-safe interlock to train movement, road traffic and visible crossing equipment; add signalling, block occupancy and reviewed operational rules.

**Decision:** DO NOT advance to the next master-prompt stage. Transportation remains open. The next implementation pass must turn the proposed public transport corridors into reviewed in-world stop/route data, finish the mapped train station structures and end-to-end journey test, connect railway crossing safety to actual train/road movement, and continue building the full drivable road network. Online authority and production assets remain explicit release dependencies; they must not be described as complete.
