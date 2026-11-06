# AKWANTUO transport work — close-out report

**Status:** OPEN — playable road-vehicle integration has begun, but the transportation stage is not closed and must not be handed to the next master-prompt stage yet.

## Added and validated foundations

### Railway
- Ultra-modern station concept with concourse, platforms, passenger fit-out, access and sheltered interchange walkway.
- Schematic Greater Accra rail topology using 1,067 mm Cape gauge.
- Reusable track and train visual geometry, a two-car train rig and deterministic acceleration/braking/station-dwell controller.
- Route-to-service adapter only creates stops from eligible first-release station catalogue entries.
- Circle/Odaw remains a candidate location and is not silently promoted to an operational station.
- Preview startup checks reject invalid train operation state and verify station eligibility.

### Road vehicles
- Vehicle family catalogue for private cars, taxis, trotros, city buses, motorcycles, vans, rigid trucks and emergency vehicles; intercity coaches and articulated trucks remain later-release content.
- Reusable saloon-car prototype geometry, transform rig and bounded kinematic bicycle handling model.
- Keyboard driving plus mobile touch buttons for accelerate, reverse, brake and steering in the standalone transport preview.
- New vehicle interaction state machine validates proximity, seat availability, vehicle availability, stopped speed and safe exit.
- The starter saloon is now spawned in the main playable scene. The player can enter with E / the on-screen action control, drive with WASD or the touch joystick, brake, and exit only after stopping in a safe space.
- The playable saloon now has an in-cabin window view, interior free-look and exterior follow camera modes, cycled with C / the on-screen VIEW control. Camera anchors follow the vehicle rig.
- This first playable vehicle slice is local-only and uses the prototype kinematic model; it is not yet a complete vehicle fleet or network-authoritative system.

### Public transport
- Passenger camera modes: interior window, interior free-look and exterior follow.
- Passenger vehicle profiles for trotro, city bus, coach and taxi.
- New boarding/alighting state machine checks stopped vehicle, open boarding/alighting, available seats and vehicle identity.
- Fare quote and deduction use integer pesewas and validate balances.
- Preview startup smoke checks exercise boarding, fare deduction, alighting, vehicle entry and safe/unsafe exit.

### Quality checks
- Transport preview workflow runs TypeScript typecheck, production Vite build, Chromium screenshot capture and report artifact upload.
- No public deployment was made.
- Preview is a developer-only scene; it is not the main playable game.

## Explicitly not complete

These are not being represented as finished systems:
- Realistic final 3D assets for every Ghanaian vehicle class, interiors, articulated trailers and motorcycles.
- Full collision, suspension, tyre grip, wheel steering/rotation, vehicle damage, fuel, ownership, insurance, licences or garages.
- AI traffic, traffic-light phases, lane-level navigation, parking enforcement, emergency dispatch and road safety simulation.
- Driver entry/exit is connected for the starter saloon, but seat animations and visible driver placement are not yet implemented. The three camera modes are connected to that vehicle only; public-transport passenger seating/cameras remain unintegrated.
- Real public-transport route/stop placements, timetables, live vehicles, conductor/mate interaction, stop announcements, fare UI and route destination boards.
- Rail signalling, block occupancy, switches, dispatch, timetable conflicts, safety logic, train doors, passenger interiors and operational railway certification.
- Multiplayer/server-authoritative vehicle ownership, seat reservations, fare transactions, economy integration, anti-cheat and persistence.
- Integration of the preview models and transport controllers into the playable Greater Accra map.
- Main-game mobile driving and camera controls are now connected for the starter saloon; other vehicle classes and public-transport passenger journeys are not yet connected.

## Remaining work before this stage can close
1. Complete and approve Greater Accra road/rail geometry and transport stop placements.
2. Integrate vehicle interaction, driver/passenger seats and passenger camera anchors into the actual player and vehicle assets.
3. Add traffic collision/navigation and server-authoritative ownership/occupancy/fare transactions before online play.
4. Add vehicle-specific models and handling, then test on ordinary phones and computers.
5. Integrate mapped rail operations only after station/track geometry, signalling and operational rules have been reviewed.

**Decision:** DO NOT advance to the next master-prompt stage. Transportation remains open. The next implementation pass must connect public transport journeys and passenger camera modes to actual in-world vehicles/stops, connect train operations to in-world track/station geometry, and test road/rail interaction in the main game. Online authority and production assets remain explicit release dependencies; they must not be described as complete.
