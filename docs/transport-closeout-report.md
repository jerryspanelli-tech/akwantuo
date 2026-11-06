# AKWANTUO transport work — close-out report

**Status:** OPEN — the local playable transport slice is integrated and under automated browser verification. Do not hand over the next master-prompt stage until the Greater Accra transport network, remaining vehicle classes, traffic interactions and required device checks are completed.

## Added and validated foundations

### Railway
- Ultra-modern station concept with concourse, platforms, passenger fit-out, access and sheltered interchange walkway.
- Schematic Greater Accra rail topology using 1,067 mm Cape gauge.
- Reusable track and train visual geometry, a two-car train rig and deterministic acceleration/braking/station-dwell controller.
- Route-to-service adapter only creates stops from eligible first-release station catalogue entries.
- Circle/Odaw remains a candidate location and is not silently promoted to an operational station.
- Preview startup checks reject invalid train operation state and verify station eligibility.
- The main playable scene creates a compact local rail corridor with paired rails, ballast, sleepers, an ultra-modern two-platform station, a sheltered terminal platform and a moving two-car train. The train uses the acceleration/braking controller, stops for an 8-second terminal dwell and opens alighting during that stop.
- This is a local integration slice inside the 180m prototype district, not the Greater Accra mapped railway route, and it has no signals, crossings, switches or passenger boarding yet.

### Road vehicles
- Vehicle family catalogue for private cars, taxis, trotros, city buses, motorcycles, vans, rigid trucks and emergency vehicles; intercity coaches and articulated trucks remain later-release content.
- Reusable saloon-car prototype geometry, transform rig and bounded kinematic bicycle handling model.
- Keyboard driving plus mobile touch buttons for accelerate, reverse, brake and steering in the standalone transport preview.
- New vehicle interaction state machine validates proximity, seat availability, vehicle availability, stopped speed and safe exit.
- Added a swept circular-footprint collision helper for local vehicle-to-vehicle checks. The starter saloon uses it against the playable trotro so a low frame rate cannot skip through the minibus; deterministic smoke checks cover clear paths, crossing paths and invalid footprints.
- The starter saloon is now spawned in the main playable scene. The player can enter with E / the on-screen action control, drive with WASD or the touch joystick, brake, and exit only after stopping in a safe space.
- The playable saloon now has an in-cabin window view, interior free-look and exterior follow camera modes, cycled with C / the on-screen VIEW control. Camera anchors follow the vehicle rig.
- This first playable vehicle slice is local-only and uses the prototype kinematic model; it is not yet a complete vehicle fleet or network-authoritative system.


### Greater Accra road-network preview
- Added a dedicated developer page at `/greater-accra-transport-preview.html` that renders the first-release Greater Accra road corridor ribbons and lane markings from the shared map layout, with district-anchor markers, junction reservation envelopes and the schematic Gulf of Guinea coastline.
- The preview uses the same 21 km × 13.5 km planning coordinate frame as the Greater Accra layout. It is a navigable visual review scene, not a drivable map or a surveyed geographic representation.
- Added a Chromium browser check to open the preview, detect uncaught page errors, verify its ready status and capture a map screenshot as a workflow artifact.
- The main-game startup handoff was also reordered so the boot overlay is dismissed and the menu shown before the continuous render loop starts. This avoids making the first menu transition depend on render-loop scheduling; the latest desktop/mobile journey test is pending.

### Road traffic controls
- Added a reusable zebra-crossing and tactile-paving geometry builder. Its layout validator checks unit direction, crossing dimensions, stripe count/width and tactile-paving depth; startup smoke checks cover valid layouts and reject invalid geometry inputs. No real Greater Accra crossing is placed yet because exact junction endpoints and pedestrian desire lines still need map integration and review.
- Added a deterministic traffic-signal phase model with configurable green, amber and red durations plus a simulation-time offset.
- Smoke checks cover phase boundaries, cycle wrap, negative time offsets, invalid time rejection and protected-movement gating.
- This is a reusable simulation foundation only: no signal heads are placed in the playable map, no junction conflict groups or signal timings have been approved, and it does not yet control traffic AI or player movement.

### Public transport
- Passenger camera modes: interior window, interior free-look and exterior follow.
- Passenger vehicle profiles for trotro, city bus, coach and taxi.
- New boarding/alighting state machine checks stopped vehicle, open boarding/alighting, available seats and vehicle identity.
- A Ghana-inspired shared-trotro minibus visual is now spawned in the main playable scene. The player can board at a temporary preview stop, pay a fare from a local pesewa balance, ride while the vehicle moves with an interior-window/free-look/exterior camera, and alight at the temporary terminal stop.
- This is a short local preview journey inside the 180m test scene, not a Greater Accra route, a live schedule, an NPC-driven public transport service or a server-backed payment.
- Fare quote and deduction use integer pesewas and validate balances.
- Main-game startup smoke checks exercise fare calculation, repeat boarding rejection, moving-vehicle boarding/alighting rejection, seat availability, insufficient funds, wallet carry-over between transport modes, vehicle entry/exit safety, road-vehicle acceleration/braking, and rail station dwell/terminal completion.

### Quality checks
- GitHub Actions runs TypeScript typecheck and production Vite build. The transport workflow also launches the actual main game in Chromium at desktop and mobile-sized viewports, enters gameplay, exercises the complete trotro boarding/camera/alighting journey, checks uncaught page errors, captures screenshots, and uploads a report artifact. A completed automated run passed the full main-game trotro journey on desktop and mobile-sized Chromium viewports: startup, gameplay entry, boarding, passenger-camera switching, route completion, terminal alighting and screenshot capture. The run also passed TypeScript typecheck and the production Vite build. The trotro route now uses a separately bounded frame delta so it continues to advance on lower-frame-rate devices while the rest of the game retains its tighter simulation cap. These are browser viewport tests, not a substitute for testing on a physical phone.
- No public deployment was made.
- Preview is a developer-only scene; it is not the main playable game.

## Explicitly not complete

These are not being represented as finished systems:
- Realistic final 3D assets for every Ghanaian vehicle class, interiors, articulated trailers and motorcycles.
- Complete physical collision and vehicle damage simulation; the new swept circular-footprint test is a conservative prototype check between the starter saloon and preview trotro, not full oriented-body physics or general traffic collision handling. Suspension, tyre grip, wheel steering/rotation, fuel, ownership, insurance, licences and garages are also outstanding.
- AI traffic, in-world traffic-light placement and junction conflict-group control, lane-level navigation, parking enforcement, emergency dispatch and road safety simulation. The deterministic signal phase helper is not an integrated junction-control system.
- Driver entry/exit is connected for the starter saloon, but seat animations and visible driver placement are not yet implemented. The three camera modes are connected to the starter saloon and the preview trotro passenger ride; full passenger seat placement and animations remain unimplemented.
- Approved Greater Accra public-transport route/stop placements, timetables, multiple live vehicles, conductor/mate interaction, stop announcements, full fare UI and real destination boards. The current two temporary preview stops are deliberately not presented as real Accra stops.
- Rail signalling, block occupancy, switches, dispatch, timetable conflicts, safety logic, train doors, passenger interiors and operational railway certification.
- Multiplayer/server-authoritative vehicle ownership, seat reservations, fare transactions, economy integration, anti-cheat and persistence.
- Integration of the preview models and transport controllers into the playable Greater Accra map. The current playable scene remains a small 180m prototype and is not the Greater Accra map. The rail demo is local-only and not positioned on the schematic Greater Accra rail corridor.
- Main-game mobile driving and camera controls are connected for the starter saloon. The preview trotro passenger journey uses the same on-screen interaction and view controls; additional vehicle classes and mapped public-transport services remain unconnected.

## Remaining work before this stage can close
1. Complete and approve Greater Accra road/rail geometry and transport stop placements.
2. Integrate vehicle interaction, driver/passenger seats and passenger camera anchors into the actual player and vehicle assets.
3. Add traffic collision/navigation and server-authoritative ownership/occupancy/fare transactions before online play.
4. Add the remaining vehicle-specific models and handling, then test on ordinary phones and computers. The current browser automation is a desktop/mobile viewport test, not a real-device certification.
5. Integrate mapped rail operations only after station/track geometry, signalling and operational rules have been reviewed.

**Decision:** DO NOT advance to the next master-prompt stage. Transportation remains open. The next implementation pass must connect public transport journeys to approved in-world route/stop data, connect train operations to the approved Greater Accra rail alignment/stations, add railway crossing/safety and passenger boarding, and test road/rail interaction in the main game. Online authority and production assets remain explicit release dependencies; they must not be described as complete.
