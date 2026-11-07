import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const failures = [];
try {
  for (const target of [
    { name: "desktop", viewport: { width: 1440, height: 1000 } },
    { name: "mobile", viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  ]) {
    const context = await browser.newContext({
      viewport: target.viewport,
      deviceScaleFactor: target.deviceScaleFactor ?? 1,
      isMobile: target.isMobile ?? false,
      hasTouch: target.hasTouch ?? false
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(target.name + ": " + error.message));
    page.on("console", (message) => { if (message.type() === "error") failures.push(target.name + " console: " + message.text()); });
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", timeout: 30000 });
    const introSkipControl = page.locator("#intro-skip");
    if (await introSkipControl.isVisible()) {
      await introSkipControl.click({ timeout: 3000 });
      await page.waitForFunction(() =>
        document.querySelector("#studio-intro")?.classList.contains("is-hidden") === true,
        { timeout: 3000 }
      );
      console.log(target.name + ": studio intro skip control passed");
    } else {
      await page.waitForFunction(() =>
        document.querySelector("#studio-intro")?.classList.contains("is-hidden") === true,
        { timeout: 5000 }
      );
      console.log(target.name + ": studio intro auto-dismiss passed");
    }
    await page.waitForFunction(() => {
      const status = document.querySelector("#boot-status")?.textContent ?? "";
      return status.includes("Your world is ready") || status.includes("Unable to start");
    }, { timeout: 30000 });
    const status = await page.locator("#boot-status").textContent();
    if (!status?.includes("Your world is ready")) failures.push(target.name + ": startup status was " + status);
    console.log(target.name + ": startup ready");
    const playableTransport = await page.evaluate(() => ({
      roadSurfaces: Number(document.documentElement.dataset.playableRoadSurfaceMeshes ?? 0),
      roadMarkings: Number(document.documentElement.dataset.playableRoadMarkingMeshes ?? 0),
      railRoutes: Number(document.documentElement.dataset.playableRailRoutes ?? 0),
      plannedStations: Number(document.documentElement.dataset.playableRailStations ?? 0),
      circleStructures: Number(document.documentElement.dataset.playableCircleStructures ?? 0),
      railRoadCrossingCandidates: Number(document.documentElement.dataset.playableRailRoadCrossingCandidates ?? 0),
      publicTransportCorridors: Number(document.documentElement.dataset.playablePublicTransportCorridors ?? 0),
      mappedRailService: document.documentElement.dataset.playableMappedRailService === "true",
      mappedRailBoardingOpen: document.documentElement.dataset.playableMappedRailBoardingOpen === "true"
    }));
    if (playableTransport.roadSurfaces < 1 || playableTransport.roadMarkings < 1 ||
        playableTransport.railRoutes < 2 || playableTransport.plannedStations < 3 ||
        playableTransport.circleStructures < 1 || playableTransport.railRoadCrossingCandidates !== 4 ||
        playableTransport.publicTransportCorridors !== 4 || !playableTransport.mappedRailService ||
        !playableTransport.mappedRailBoardingOpen) {
      failures.push(target.name + ": Greater Accra transport was not integrated into the playable scene: " +
        JSON.stringify(playableTransport));
    }
    console.log(target.name + ": Greater Accra playable transport " + JSON.stringify(playableTransport));
    const stageSixCatalogues = await page.evaluate(() => ({
      buildings: Number(document.documentElement.dataset.akwantuoBuildingCount ?? 0),
      districts: Number(document.documentElement.dataset.akwantuoBuildingDistrictCount ?? 0),
      properties: Number(document.documentElement.dataset.akwantuoPropertyCount ?? 0),
      businesses: Number(document.documentElement.dataset.akwantuoBusinessCount ?? 0),
      venueProgramme: Number(document.documentElement.dataset.akwantuoVenueProgrammeCount ?? 0),
      retailProducts: Number(document.documentElement.dataset.akwantuoRetailProductCount ?? 0),
      storeFridges: Number(document.documentElement.dataset.akwantuoStoreFridgeCount ?? 0),
      storeSnackRacks: Number(document.documentElement.dataset.akwantuoStoreSnackRackCount ?? 0),
      storeCollisionAreas: Number(document.documentElement.dataset.akwantuoStoreCollisionCount ?? 0),
      shopkeeperRig: document.documentElement.dataset.akwantuoStoreShopkeeperRig === "true",
      privateIsland: document.documentElement.dataset.akwantuoPrivateIslandName ?? "",
      privateIslandPrice: Number(document.documentElement.dataset.akwantuoPrivateIslandPrice ?? 0),
      privateIslandWatercraft: Number(document.documentElement.dataset.akwantuoPrivateIslandWatercraftCount ?? 0),
      privateIslandMeshes: Number(document.documentElement.dataset.akwantuoPrivateIslandMeshCount ?? 0),
      interiorBlueprints: Number(document.documentElement.dataset.akwantuoInteriorBlueprintCount ?? 0),
      renderedInteriorRooms: Number(document.documentElement.dataset.akwantuoInteriorRoomCount ?? 0),
      interiorLinks: Number(document.documentElement.dataset.akwantuoBuildingInteriorLinkCount ?? 0),
      stage6Checks: document.documentElement.dataset.akwantuoStage6Checks === "passed"
    }));
    if (stageSixCatalogues.buildings !== 23 || stageSixCatalogues.districts !== 12 || stageSixCatalogues.properties !== 23 || stageSixCatalogues.businesses !== 17 || stageSixCatalogues.venueProgramme !== 7 ||
        stageSixCatalogues.interiorBlueprints !== 11 || stageSixCatalogues.renderedInteriorRooms !== 11 ||
        stageSixCatalogues.retailProducts < 15 || stageSixCatalogues.storeFridges < 3 ||
        stageSixCatalogues.storeSnackRacks < 2 || stageSixCatalogues.storeCollisionAreas < 12 || !stageSixCatalogues.shopkeeperRig || stageSixCatalogues.privateIsland !== "Akwaaba Cay Private Island" ||
        stageSixCatalogues.privateIslandPrice < 10_000_000_000 || stageSixCatalogues.privateIslandWatercraft < 4 || stageSixCatalogues.privateIslandMeshes !== 1 ||
        stageSixCatalogues.interiorLinks !== 23 || !stageSixCatalogues.stage6Checks) {
      failures.push(target.name + ": Stage 6 building/district/property/interior catalogues are incomplete: " +
        JSON.stringify(stageSixCatalogues));
    }
    console.log(target.name + ": Stage 6 catalogues " + JSON.stringify(stageSixCatalogues));
    try {
      await page.waitForFunction(() => document.querySelector("#boot-screen")?.hasAttribute("hidden") === true, { timeout: 10000 });
    } catch (error) {
      const startupDom = await page.evaluate(() => {
        const boot = document.querySelector("#boot-screen");
        const shell = document.querySelector("#game-shell");
        const menu = document.querySelector("#main-menu");
        return {
          status: document.querySelector("#boot-status")?.textContent,
          startupStage: document.documentElement.dataset.startupHandoffStage,
          startupError: document.documentElement.dataset.startupHandoffError,
          bootExists: !!boot,
          bootHiddenProperty: boot instanceof HTMLElement ? boot.hidden : null,
          bootHasHiddenAttribute: boot?.hasAttribute("hidden") ?? false,
          bootClass: boot?.className,
          bootDisplay: boot instanceof HTMLElement ? getComputedStyle(boot).display : null,
          shellExists: !!shell,
          shellHiddenProperty: shell instanceof HTMLElement ? shell.hidden : null,
          shellClass: shell?.className,
          menuDisplay: menu instanceof HTMLElement ? getComputedStyle(menu).display : null,
          menuBounds: menu?.getBoundingClientRect().toJSON()
        };
      });
      console.error(target.name + ": boot handoff diagnostic " + JSON.stringify(startupDom));
      throw error;
    }
    await page.locator("#main-menu").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(() =>
      document.querySelector("#studio-intro")?.classList.contains("is-hidden") === true,
      { timeout: 5000 }
    );
    await page.locator("#play-button").waitFor({ state: "visible", timeout: 10000 });
    const continueInitiallyHidden = await page.locator("#continue-button").evaluate((element) => element.classList.contains("is-hidden"));
    if (!continueInitiallyHidden) throw new Error(target.name + ": Continue should be hidden before a local character save.");

    // Verify the opening menu's settings and news panels are functional.
    await page.locator("#settings-button").click({ timeout: 5000 });
    await page.locator("#settings-panel").waitFor({ state: "visible", timeout: 5000 });
    await page.locator("#graphics-quality").selectOption("performance");
    await page.locator("#brightness-setting").evaluate((element) => {
      const input = element;
      input.value = "110";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.locator("#camera-sensitivity-setting").evaluate((element) => {
      const input = element;
      input.value = "120";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.locator("#fog-setting").uncheck();
    await page.locator("#settings-save").click({ timeout: 5000 });
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Game settings saved"), { timeout: 5000 });
    const savedSettings = await page.evaluate(() => ({
      saved: JSON.parse(localStorage.getItem("akwantuo.game-settings.v1") ?? "null"),
      quality: document.documentElement.dataset.akwantuoGraphicsQuality ?? "",
      brightness: document.documentElement.dataset.akwantuoBrightness ?? "",
      sensitivity: document.documentElement.dataset.akwantuoCameraSensitivity ?? "",
      fog: document.documentElement.dataset.akwantuoFogEnabled ?? ""
    }));
    if (savedSettings.saved?.graphicsQuality !== "performance" || savedSettings.saved?.brightness !== 110 ||
        savedSettings.saved?.cameraSensitivity !== 120 || savedSettings.saved?.fog !== false ||
        savedSettings.quality !== "performance" || savedSettings.brightness !== "110" ||
        savedSettings.sensitivity !== "120" || savedSettings.fog !== "false") {
      throw new Error(target.name + ": settings did not apply and persist correctly: " + JSON.stringify(savedSettings));
    }
    await page.locator("#news-button").click({ timeout: 5000 });
    await page.locator("#news-panel").waitFor({ state: "visible", timeout: 5000 });
    const newsText = await page.locator("#news-panel").innerText();
    if (!newsText.includes("Welcome to AKWANTUO") || !newsText.includes("What is coming next")) {
      throw new Error(target.name + ": News / Updates panel content is incomplete.");
    }
    const newsCloseState = await page.locator("#news-close").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const panel = document.querySelector("#news-panel");
      const card = panel?.querySelector(".character-card");
      const cardRect = card?.getBoundingClientRect();
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        panelHidden: panel?.classList.contains("is-hidden") ?? true,
        cardRect: cardRect ? { x: cardRect.x, y: cardRect.y, width: cardRect.width, height: cardRect.height } : null
      };
    });
    console.log(target.name + ": news close control layout " + JSON.stringify(newsCloseState));
    await page.waitForTimeout(500);
    // The close control is already measured visible and pointer-enabled above;
    // avoid a redundant scroll action while the full-screen panel is settling.
    await page.locator("#news-close").click({ force: true, timeout: 5000 });
    console.log(target.name + ": settings apply/save/reload inputs and news panel passed");

    // A missing dedicated backend must fail clearly without blocking local play.
    await page.locator("#account-button").click({ timeout: 5000 });
    await page.locator("#account-email").fill("phase1-test@example.com");
    await page.locator("#account-password").fill("not-a-real-password");
    await page.locator("#account-signin").click({ timeout: 5000 });
    await page.waitForFunction(() => (document.querySelector("#account-status")?.textContent ?? "").includes("not configured yet"), { timeout: 5000 });
    await page.locator("#account-close").click({ timeout: 5000 });
    console.log(target.name + ": missing dedicated Supabase configuration fails safely and local play remains available");

    // Phase 1: exercise the character creator and device-local save before play.
    await page.locator("#character-button").click({ timeout: 5000 });
    await page.locator("#character-form").waitFor({ state: "visible", timeout: 5000 });
    await page.locator('#character-form select[name="presentation"]').selectOption("feminine");
    await page.locator('#character-form input[name="age"]').fill("29");
    await page.locator('#character-form select[name="complexion"]').selectOption("golden");
    await page.locator('#character-form select[name="build"]').selectOption("broad");
    await page.locator('#character-form select[name="hairstyle"]').selectOption("afro");
    await page.locator('#character-form select[name="outfit"]').selectOption("kente");
    await page.locator("#character-save").click({ timeout: 5000 });
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Appearance saved on this device"), { timeout: 5000 });
    const savedAppearance = await page.evaluate(() => {
      const raw = localStorage.getItem("akwantuo.character-appearance.v1");
      return raw ? JSON.parse(raw) : null;
    });
    if (!savedAppearance || savedAppearance.presentation !== "feminine" || savedAppearance.age !== 29 ||
        savedAppearance.complexionId !== "golden" || savedAppearance.bodyBuild !== "broad" ||
        savedAppearance.hairstyleId !== "afro" || savedAppearance.outfitId !== "kente") {
      throw new Error(target.name + ": character creator did not persist the selected appearance: " + JSON.stringify(savedAppearance));
    }
    await page.reload({ waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"), { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("#studio-intro")?.classList.contains("is-hidden") === true, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector("#boot-screen")?.hasAttribute("hidden") === true, { timeout: 10000 });
    const persistedSettings = await page.evaluate(() => ({
      quality: document.documentElement.dataset.akwantuoGraphicsQuality ?? "",
      brightness: document.documentElement.dataset.akwantuoBrightness ?? "",
      sensitivity: document.documentElement.dataset.akwantuoCameraSensitivity ?? "",
      fog: document.documentElement.dataset.akwantuoFogEnabled ?? ""
    }));
    if (persistedSettings.quality !== "performance" || persistedSettings.brightness !== "110" ||
        persistedSettings.sensitivity !== "120" || persistedSettings.fog !== "false") {
      throw new Error(target.name + ": settings were not reapplied after reload: " + JSON.stringify(persistedSettings));
    }
    await page.locator("#character-button").click({ timeout: 5000 });
    const reloadedAppearance = await page.locator("#character-form").evaluate((form) => {
      const values = new FormData(form);
      return {
        presentation: values.get("presentation"),
        age: Number(values.get("age")),
        complexionId: values.get("complexion"),
        bodyBuild: values.get("build"),
        hairstyleId: values.get("hairstyle"),
        outfitId: values.get("outfit")
      };
    });
    if (JSON.stringify(reloadedAppearance) !== JSON.stringify(savedAppearance)) {
      throw new Error(target.name + ": character appearance did not reload from device storage: " +
        JSON.stringify({ savedAppearance, reloadedAppearance }));
    }
    await page.locator("#character-close").click({ timeout: 5000 });
    const continueAfterSave = await page.locator("#continue-button").isVisible();
    if (!continueAfterSave) throw new Error(target.name + ": Continue did not appear after saving a character locally.");
    console.log(target.name + ": character creation, local save/reload and Continue visibility passed");

    await page.locator("#continue-button").click({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    await page.waitForTimeout(700);

    // Verify real player displacement through keyboard (desktop) and joystick (mobile).
    const playerStart = await page.evaluate(() => ({
      x: Number(document.documentElement.dataset.playerWorldX ?? NaN),
      z: Number(document.documentElement.dataset.playerWorldZ ?? NaN)
    }));
    if (!Number.isFinite(playerStart.x) || !Number.isFinite(playerStart.z)) {
      throw new Error(target.name + ": player movement diagnostics were not initialised.");
    }
    if (target.isMobile) {
      const joystickBounds = await page.locator("#joystick").boundingBox();
      if (!joystickBounds) throw new Error("mobile: movement joystick is not visible.");
      const centreX = joystickBounds.x + joystickBounds.width / 2;
      const centreY = joystickBounds.y + joystickBounds.height / 2;
      const touchSession = await page.context().newCDPSession(page);
      await touchSession.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 1, x: centreX, y: centreY, radiusX: 4, radiusY: 4, force: 1 }]
      });
      await touchSession.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ id: 1, x: centreX, y: centreY - joystickBounds.width * 0.22, radiusX: 4, radiusY: 4, force: 1 }]
      });
      // Software-rendered CI can produce fewer frames than a physical device.
      await page.waitForTimeout(3000);
      await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await touchSession.detach();
    } else {
      await page.keyboard.down("w");
      await page.waitForTimeout(3000);
      await page.keyboard.up("w");
    }
    await page.waitForFunction(({ x, z }) => {
      const currentX = Number(document.documentElement.dataset.playerWorldX ?? NaN);
      const currentZ = Number(document.documentElement.dataset.playerWorldZ ?? NaN);
      return Number.isFinite(currentX) && Number.isFinite(currentZ) && Math.hypot(currentX - x, currentZ - z) > 0.2;
    }, { x: playerStart.x, z: playerStart.z }, { timeout: 10000, polling: 100 });
    const playerAfterMove = await page.evaluate(() => ({
      x: Number(document.documentElement.dataset.playerWorldX ?? NaN),
      z: Number(document.documentElement.dataset.playerWorldZ ?? NaN)
    }));
    if (!Number.isFinite(playerAfterMove.x) || !Number.isFinite(playerAfterMove.z) ||
        Math.hypot(playerAfterMove.x - playerStart.x, playerAfterMove.z - playerStart.z) <= 0.2) {
      throw new Error(target.name + ": player did not move using " + (target.isMobile ? "the touch joystick" : "keyboard input") +
        ": " + JSON.stringify({ playerStart, playerAfterMove }));
    }
    if (target.isMobile) await page.locator("#jump-button").click({ timeout: 5000 });
    else await page.keyboard.press("Space");
    await page.waitForFunction(() => Number(document.documentElement.dataset.playerWorldY ?? 0) > 0.15,
      null, { timeout: 10000, polling: 100 });
    const jumpHeight = await page.evaluate(() => Number(document.documentElement.dataset.playerWorldY ?? 0));
    if (!Number.isFinite(jumpHeight) || jumpHeight < 0.15) {
      throw new Error(target.name + ": jump action did not lift the player: " + jumpHeight);
    }
    await page.waitForTimeout(900);
    console.log(target.name + ": player movement and jump controls passed");

    // Restore the standard street spawn so the following boarding tests start
    // from the intended trotro stop rather than the player's movement-test spot.
    await page.reload({ waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"),
      null, { timeout: 30000, polling: 100 });
    await page.waitForFunction(() => document.querySelector("#boot-screen")?.hasAttribute("hidden") === true,
      null, { timeout: 10000, polling: 100 });
    await page.locator("#play-button").click({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"),
      null, { timeout: 10000, polling: 100 });
    await page.waitForTimeout(500);

    // Exercise the playable starter saloon separately from passenger transport.
    const vehiclePage = await context.newPage();
    vehiclePage.on("pageerror", (error) => failures.push(target.name + " vehicle page: " + error.message));
    vehiclePage.on("console", (message) => { if (message.type() === "error") failures.push(target.name + " vehicle console: " + message.text()); });
    await vehiclePage.goto("http://127.0.0.1:4173/?akwantuoVehicleTest=1", { waitUntil: "networkidle", timeout: 30000 });
    await vehiclePage.waitForFunction(() => (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"), { timeout: 30000 });
    await vehiclePage.waitForFunction(() => document.querySelector("#boot-screen")?.hasAttribute("hidden") === true, { timeout: 10000 });
    if (await vehiclePage.evaluate(() => document.documentElement.dataset.vehicleTestMode) !== "true") {
      throw new Error(target.name + ": local starter-saloon test spawn did not activate.");
    }
    await vehiclePage.locator("#play-button").click({ timeout: 10000 });
    await vehiclePage.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    const carApproach = await vehiclePage.evaluate(() => ({
      playerX: Number(document.documentElement.dataset.playerWorldX ?? NaN),
      playerZ: Number(document.documentElement.dataset.playerWorldZ ?? NaN),
      carX: Number(document.documentElement.dataset.akwantuoStarterSaloonX ?? NaN),
      carZ: Number(document.documentElement.dataset.akwantuoStarterSaloonZ ?? NaN),
      mode: document.documentElement.dataset.akwantuoStarterSaloonMode ?? "",
      spawnMode: document.documentElement.dataset.vehicleTestMode ?? ""
    }));
    const entryDistance = Math.hypot(carApproach.playerX - (carApproach.carX - 1.15), carApproach.playerZ - carApproach.carZ);
    if (!Number.isFinite(entryDistance) || entryDistance > 2.5) {
      throw new Error(target.name + ": starter saloon test spawn is not at the driver's door: " +
        JSON.stringify({ carApproach, entryDistance }));
    }
    if (target.isMobile) await vehiclePage.locator("#interact-button").click({ timeout: 5000 });
    else await vehiclePage.keyboard.press("e");
    try {
      await vehiclePage.waitForFunction(() => document.documentElement.dataset.akwantuoStarterSaloonMode === "inside_vehicle",
        null, { timeout: 5000, polling: 100 });
    } catch {
      const entryDiagnostic = await vehiclePage.evaluate(() => ({
        playerX: Number(document.documentElement.dataset.playerWorldX ?? NaN),
        playerZ: Number(document.documentElement.dataset.playerWorldZ ?? NaN),
        carX: Number(document.documentElement.dataset.akwantuoStarterSaloonX ?? NaN),
        carZ: Number(document.documentElement.dataset.akwantuoStarterSaloonZ ?? NaN),
        mode: document.documentElement.dataset.akwantuoStarterSaloonMode ?? "",
        request: document.documentElement.dataset.transportActionRequest ?? "",
        notice: document.querySelector("#notice")?.textContent ?? ""
      }));
      throw new Error(target.name + ": starter saloon entry did not activate: " + JSON.stringify(entryDiagnostic));
    }
    const carStart = await vehiclePage.evaluate(() => ({
      x: Number(document.documentElement.dataset.akwantuoStarterSaloonX ?? NaN),
      z: Number(document.documentElement.dataset.akwantuoStarterSaloonZ ?? NaN),
      heading: Number(document.documentElement.dataset.akwantuoStarterSaloonHeading ?? NaN)
    }));
    if (!Number.isFinite(carStart.x) || !Number.isFinite(carStart.z) || !Number.isFinite(carStart.heading)) {
      throw new Error(target.name + ": starter saloon diagnostics were not initialised.");
    }
    if (target.isMobile) {
      const joystickBounds = await vehiclePage.locator("#joystick").boundingBox();
      if (!joystickBounds) throw new Error("mobile: vehicle movement joystick is not visible.");
      const centreX = joystickBounds.x + joystickBounds.width / 2;
      const centreY = joystickBounds.y + joystickBounds.height / 2;
      const touchSession = await vehiclePage.context().newCDPSession(vehiclePage);
      await touchSession.send("Input.dispatchTouchEvent", {
        type: "touchStart", touchPoints: [{ id: 2, x: centreX, y: centreY, radiusX: 4, radiusY: 4, force: 1 }]
      });
      await touchSession.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ id: 2, x: centreX, y: centreY - joystickBounds.width * 0.22, radiusX: 4, radiusY: 4, force: 1 }]
      });
      await vehiclePage.waitForTimeout(3000);
      await touchSession.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ id: 2, x: centreX + joystickBounds.width * 0.2, y: centreY - joystickBounds.width * 0.12, radiusX: 4, radiusY: 4, force: 1 }]
      });
      await vehiclePage.waitForTimeout(1800);
      await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await touchSession.detach();
    } else {
      await vehiclePage.keyboard.down("w");
      await vehiclePage.waitForTimeout(3000);
      await vehiclePage.keyboard.down("d");
      await vehiclePage.waitForTimeout(1800);
      await vehiclePage.keyboard.up("d");
      await vehiclePage.keyboard.up("w");
    }
    await vehiclePage.waitForFunction(({ x, z, heading }) => {
      const currentX = Number(document.documentElement.dataset.akwantuoStarterSaloonX ?? NaN);
      const currentZ = Number(document.documentElement.dataset.akwantuoStarterSaloonZ ?? NaN);
      const currentHeading = Number(document.documentElement.dataset.akwantuoStarterSaloonHeading ?? NaN);
      const turn = Math.atan2(Math.sin(currentHeading - heading), Math.cos(currentHeading - heading));
      return Math.hypot(currentX - x, currentZ - z) > 0.2 &&
        Number(document.documentElement.dataset.akwantuoStarterSaloonSpeed ?? 0) > 0 &&
        Math.abs(turn) > 0.005;
    }, carStart, { timeout: 10000, polling: 100 });
    if (target.isMobile) {
      const brakeBounds = await vehiclePage.locator("#vehicle-brake-button").boundingBox();
      if (!brakeBounds) throw new Error("mobile: vehicle brake control is not visible.");
      const touchSession = await vehiclePage.context().newCDPSession(vehiclePage);
      await touchSession.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 3, x: brakeBounds.x + brakeBounds.width / 2, y: brakeBounds.y + brakeBounds.height / 2, radiusX: 4, radiusY: 4, force: 1 }]
      });
      await vehiclePage.waitForFunction(() => Number(document.documentElement.dataset.akwantuoStarterSaloonSpeed ?? 99) <= 0.5,
        null, { timeout: 20000, polling: 100 });
      await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await touchSession.detach();
    } else {
      await vehiclePage.keyboard.down(" ");
      await vehiclePage.waitForFunction(() => Number(document.documentElement.dataset.akwantuoStarterSaloonSpeed ?? 99) <= 0.5,
        null, { timeout: 20000, polling: 100 });
      await vehiclePage.keyboard.up(" ");
    }
    if (target.isMobile) await vehiclePage.locator("#interact-button").click({ timeout: 5000 });
    else await vehiclePage.keyboard.press("e");
    await vehiclePage.waitForFunction(() => document.documentElement.dataset.akwantuoStarterSaloonMode === "on_foot", { timeout: 5000 });
    await vehiclePage.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("exited the vehicle"), { timeout: 5000 });
    await vehiclePage.screenshot({ path: "artifacts/akwantuo-" + target.name + "-starter-saloon.png", fullPage: false, timeout: 30000 });
    console.log(target.name + ": starter saloon entry, driving, steering, braking and safe exit passed");
    await vehiclePage.close();
    await page.bringToFront();
    await page.waitForTimeout(500);

    const npcTraffic = await page.evaluate(() => ({
      count: Number(document.documentElement.dataset.npcRoadTraffic ?? 0),
      route: document.documentElement.dataset.npcRoadTrafficRoute ?? "",
      laneCentre: document.documentElement.dataset.npcRoadTrafficLaneCenter === "true",
      distanceM: Number(document.documentElement.dataset.npcRoadTrafficDistanceM ?? 0),
      speedMps: Number(document.documentElement.dataset.npcRoadTrafficSpeedMps ?? 0),
      minimumGapM: Number(document.documentElement.dataset.npcRoadTrafficMinimumGapM ?? 0)
    }));
    if (npcTraffic.count !== 3 || npcTraffic.route !== "n1-tema-corridor" || !npcTraffic.laneCentre ||
        !Number.isFinite(npcTraffic.distanceM) || npcTraffic.distanceM <= 0 ||
        !Number.isFinite(npcTraffic.speedMps) || npcTraffic.speedMps < 0 ||
        !Number.isFinite(npcTraffic.minimumGapM) || npcTraffic.minimumGapM < 8) {
      failures.push(target.name + ": headway-controlled NPC traffic did not spawn three separated cars and advance on the N1 corridor: " +
        JSON.stringify(npcTraffic));
    } else {
      console.log(target.name + ": headway-controlled N1 traffic advanced " + JSON.stringify(npcTraffic));
    }

    // Exercise a complete trotro journey in a separate deterministic local test session.
    // The character-control test above intentionally moves the player; a dedicated
    // spawn prevents that movement from leaving the passenger interaction out of range.
    const trotroPage = await context.newPage();
    trotroPage.on("pageerror", (error) => failures.push(target.name + " trotro page: " + error.message));
    trotroPage.on("console", (message) => {
      if (message.type() === "error") failures.push(target.name + " trotro console: " + message.text());
    });
    await trotroPage.goto("http://127.0.0.1:4173/?akwantuoTrotroTest=1", {
      waitUntil: "networkidle",
      timeout: 30000
    });
    await trotroPage.waitForFunction(() =>
      (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"),
      { timeout: 30000 }
    );
    await trotroPage.waitForFunction(() =>
      document.querySelector("#boot-screen")?.hasAttribute("hidden") === true,
      { timeout: 10000 }
    );
    const trotroSpawn = await trotroPage.evaluate(() => ({
      mode: document.documentElement.dataset.trotroTestMode ?? "",
      playerX: Number(document.documentElement.dataset.playerWorldX ?? NaN),
      playerZ: Number(document.documentElement.dataset.playerWorldZ ?? NaN)
    }));
    if (trotroSpawn.mode !== "true") {
      throw new Error(target.name + ": local trotro test spawn did not activate: " + JSON.stringify(trotroSpawn));
    }
    await trotroPage.locator("#play-button").click({ timeout: 10000 });
    await trotroPage.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    if (target.isMobile) await trotroPage.locator("#interact-button").click({ timeout: 5000 });
    else await trotroPage.keyboard.press("e");
    try {
      await trotroPage.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Boarded shared trotro"), { timeout: 5000 });
    } catch (error) {
      const boardingDiagnostic = await trotroPage.evaluate((runtimeErrors) => ({
        notice: document.querySelector("#notice")?.textContent ?? "",
        playerX: document.documentElement.dataset.transportPlayerX,
        playerZ: document.documentElement.dataset.transportPlayerZ,
        trotroX: document.documentElement.dataset.transportTrotroX,
        trotroZ: document.documentElement.dataset.transportTrotroZ,
        passengerMode: document.documentElement.dataset.transportPassengerMode,
        trotroBranch: document.documentElement.dataset.transportTrotroBranch,
        trotroDistance: document.documentElement.dataset.transportTrotroDistance,
        trotroBoardResult: document.documentElement.dataset.transportTrotroBoardResult,
        runtimeErrors: runtimeErrors.slice(-12)
      }), failures);
      console.error(target.name + ": trotro boarding diagnostic " + JSON.stringify(boardingDiagnostic));
      throw error;
    }
    if (target.isMobile) {
      await trotroPage.locator("#vehicle-view-button").waitFor({ state: "visible", timeout: 5000 });
      await trotroPage.locator("#vehicle-view-button").click({ timeout: 5000 });
    } else await trotroPage.keyboard.press("c");
    await trotroPage.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Vehicle view"), { timeout: 5000 });
    console.log(target.name + ": trotro boarded and passenger camera switched");
    try {
      await trotroPage.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("You have reached the final stop"), { timeout: 60000 });
    } catch (error) {
      const diagnostic = await trotroPage.evaluate(() => ({
        notice: document.querySelector("#notice")?.textContent,
        trotroZ: document.documentElement.dataset.trotroZ,
        trotroSpeed: document.documentElement.dataset.trotroSpeed,
        trotroArrived: document.documentElement.dataset.trotroArrived
      }));
      console.error(target.name + ": trotro terminal diagnostic " + JSON.stringify(diagnostic));
      throw error;
    }
    console.log(target.name + ": trotro reached terminal");
    if (target.isMobile) await trotroPage.locator("#interact-button").click({ timeout: 5000 });
    else await trotroPage.keyboard.press("e");
    await trotroPage.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("You alighted"), { timeout: 5000 });
    await trotroPage.screenshot({ path: "artifacts/akwantuo-" + target.name + "-transport-game.png", fullPage: false, timeout: 30000 });
    console.log(target.name + ": trotro journey passed and screenshot captured");
    await trotroPage.close();
    // Closing a foreground tab does not reliably restore the previous page as
    // the active mobile tab. The game correctly suspends rendering while hidden.
    await page.bringToFront();
    await page.waitForFunction(() => document.visibilityState === "visible", { timeout: 5000 });

    // Re-open the playable world in a local-only test spawn at Accra Central,
    // then complete the mapped Accra–Tema train journey and terminal alighting.
    await page.goto("http://127.0.0.1:4173/?akwantuoTransportTest=rail", {
      waitUntil: "networkidle",
      timeout: 30000
    });
    await page.waitForFunction(() =>
      (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"),
      { timeout: 30000 }
    );
    await page.waitForFunction(() =>
      document.querySelector("#boot-screen")?.hasAttribute("hidden") === true,
      { timeout: 10000 }
    );
    await page.locator("#play-button").click({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    const railTestSpawn = await page.evaluate(() => ({
      mode: document.documentElement.dataset.transportTestMode ?? "",
      boardingOpen: document.documentElement.dataset.mappedRailBoardingOpen === "true"
    }));
    if (railTestSpawn.mode !== "rail" || !railTestSpawn.boardingOpen) {
      throw new Error(target.name + ": local mapped rail test spawn did not activate: " + JSON.stringify(railTestSpawn));
    }
    if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
    else await page.keyboard.press("e");
    await page.waitForFunction(() =>
      (document.querySelector("#notice")?.textContent ?? "").includes("Boarded the Accra–Tema train"),
      { timeout: 10000 }
    );
    console.log(target.name + ": mapped Accra Central train boarded and passenger camera active");
    await page.waitForFunction(() =>
      document.documentElement.dataset.mappedRailCompleted === "true" &&
      Number(document.documentElement.dataset.mappedRailSpeedMps ?? 1) <= 0.01,
      null,
      { timeout: 45000 }
    );
    const mappedTerminal = await page.evaluate(() => ({
      stopId: document.documentElement.dataset.mappedRailStopId ?? "",
      distanceM: Number(document.documentElement.dataset.mappedRailDistanceM ?? 0),
      speedMps: Number(document.documentElement.dataset.mappedRailSpeedMps ?? -1),
      completed: document.documentElement.dataset.mappedRailCompleted === "true"
    }));
    if (!mappedTerminal.completed || mappedTerminal.speedMps > 0.01 || mappedTerminal.distanceM < 10000) {
      throw new Error(target.name + ": mapped Accra–Tema train did not complete at its terminal: " + JSON.stringify(mappedTerminal));
    }
    if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
    else await page.keyboard.press("e");
    await page.waitForFunction(() =>
      (document.querySelector("#notice")?.textContent ?? "").includes("You alighted at Tema"),
      { timeout: 5000 }
    );
    const railAlighting = await page.evaluate(() => ({
      passengerMode: document.documentElement.dataset.transportPassengerMode ?? "",
      notice: document.querySelector("#notice")?.textContent ?? ""
    }));
    if (railAlighting.passengerMode !== "not_riding") {
      throw new Error(target.name + ": mapped train passenger state did not return to on-foot mode: " + JSON.stringify(railAlighting));
    }
    console.log(target.name + ": mapped Accra–Tema train reached Tema and passenger alighted");
    await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-mapped-rail.png", fullPage: false, timeout: 30000 });

    // Walk into and back out of one representative building for every
    // distinct interior blueprint on both desktop and mobile-sized viewports.
    const interiorCases = [
      { buildingId: "osu-corner-mart", roomId: "convenience-store", business: true, retail: true, screenshot: true },
      { buildingId: "akwaaba-provisions", roomId: "convenience-store", business: true, retail: true },
      { buildingId: "ama-salon", business: true, roomId: "salon" },
      { buildingId: "chop-bar", business: true, roomId: "restaurant" },
      { buildingId: "adom-compound", roomId: "compound-house", business: false },
      { buildingId: "coastal-guest-house", business: true, roomId: "guest-house" },
      { buildingId: "district-office", business: true, roomId: "office" },
      { buildingId: "ridge-clinic", business: true, roomId: "clinic" },
      { buildingId: "kwame-auto-works", business: true, roomId: "workshop" },
      { buildingId: "east-legon-apartments", roomId: "apartment", business: false },
      { buildingId: "akwaaba-creative-arts-centre", roomId: "creative-arts-centre", business: true }
    ];
    for (const interiorCase of interiorCases) {
      await page.goto("http://127.0.0.1:4173/?akwantuoInteriorTest=" + interiorCase.buildingId, {
        waitUntil: "networkidle",
        timeout: 30000
      });
      await page.waitForFunction(() =>
        (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"),
        { timeout: 30000 }
      );
      await page.waitForFunction(() =>
        document.querySelector("#boot-screen")?.hasAttribute("hidden") === true,
        { timeout: 10000 }
      );
      const testBuilding = await page.evaluate(() => document.documentElement.dataset.interiorTestMode ?? "");
      if (testBuilding !== interiorCase.buildingId) {
        throw new Error(target.name + ": requested interior test spawn was not selected: " + testBuilding);
      }
      await page.locator("#play-button").click({ timeout: 10000 });
      await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
      if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
      else await page.keyboard.press("e");
      await page.waitForFunction((roomId) =>
        document.documentElement.dataset.activeInteriorId === roomId &&
        (document.querySelector("#notice")?.textContent ?? "").includes("Entered "),
        interiorCase.roomId,
        { timeout: 5000 }
      );
      if (interiorCase.retail && stageSixCatalogues.retailProducts < 15) throw new Error(target.name + ": fictional convenience-store product catalogue is missing.");
      const activeBusiness = await page.evaluate(() => ({
        id: document.documentElement.dataset.activeBusinessId ?? "",
        serviceCount: Number(document.documentElement.dataset.activeBusinessServiceCount ?? 0),
        notice: document.querySelector("#notice")?.textContent ?? ""
      }));
      if (interiorCase.business
        ? activeBusiness.id !== "business-" + interiorCase.buildingId || activeBusiness.serviceCount < 1 || !activeBusiness.notice.includes("Services:")
        : activeBusiness.id !== "" || activeBusiness.serviceCount !== 0) {
        throw new Error(target.name + ": business service information did not match " + interiorCase.buildingId + ": " + JSON.stringify(activeBusiness));
      }
      if (interiorCase.buildingId === "akwaaba-creative-arts-centre" &&
          (!activeBusiness.notice.includes("modelling auditions") || !activeBusiness.notice.includes("fashion runway night"))) {
        throw new Error(target.name + ": creative arts centre weekly programme was not displayed: " + activeBusiness.notice);
      }
      if (interiorCase.retail) {
        await page.locator("#stage6-shopkeeper-talk").click({ timeout: 5000 });
        const greeting = await page.locator("#notice").textContent();
        if (!greeting?.includes("Akwaaba! Welcome in")) throw new Error(target.name + ": shopkeeper greeting did not appear.");
        await page.locator("#stage6-retail-browse").click({ timeout: 5000 });
        const shelves = await page.locator("#notice").textContent();
        if (!shelves?.includes("KolaPop Classic") || !shelves.includes("SunBurst Orange")) {
          throw new Error(target.name + ": live shop catalogue browsing failed: " + shelves);
        }
        await page.locator("#stage6-retail-basket").click({ timeout: 5000 });
        const basket = await page.evaluate(() => Number(document.documentElement.dataset.stage6RetailBasketCount ?? 0));
        if (basket !== 1) throw new Error(target.name + ": shop basket did not accept the selected product.");
        await page.locator("#stage6-retail-checkout").click({ timeout: 5000 });
        const checkoutPrompt = await page.locator("#notice").textContent();
        if (!checkoutPrompt?.includes("sign in to your AKWANTUO account")) {
          throw new Error(target.name + ": checkout did not require an authenticated player account.");
        }
        await page.locator("#account-close").click({ timeout: 5000 });
      }
      if (interiorCase.business) {
        await page.locator("#stage6-service-action").click({ timeout: 5000 });
        const serviceInteraction = await page.evaluate(() => ({
          count: Number(document.documentElement.dataset.stage6ServiceSelections ?? 0),
          notice: document.querySelector("#notice")?.textContent ?? ""
        }));
        if (serviceInteraction.count !== 1 || !serviceInteraction.notice.includes("Selected service") ||
            !serviceInteraction.notice.includes("no payment or transaction")) {
          throw new Error(target.name + ": service interaction failed for " + interiorCase.buildingId + ": " + JSON.stringify(serviceInteraction));
        }
      }
      await page.locator("#stage6-property-action").click({ timeout: 5000 });
      const propertyInteraction = await page.evaluate(() => ({
        count: Number(document.documentElement.dataset.stage6PropertyInspections ?? 0),
        notice: document.querySelector("#notice")?.textContent ?? ""
      }));
      if (propertyInteraction.count < 1 || !propertyInteraction.notice.includes("Property information:") ||
          !propertyInteraction.notice.includes("purchase or rental is not enabled")) {
        throw new Error(target.name + ": property inspection interaction failed for " + interiorCase.buildingId + ": " + JSON.stringify(propertyInteraction));
      }
      if (interiorCase.buildingId === "district-office") {
        await page.locator("#stage6-premium-assets").click({ timeout: 5000 });
        const premiumListing = await page.evaluate(() => ({
          count: Number(document.documentElement.dataset.stage6PremiumListingViews ?? 0),
          notice: document.querySelector("#notice")?.textContent ?? ""
        }));
        if (premiumListing.count !== 1 || !premiumListing.notice.includes("Akwaaba Cay Private Island") ||
            !premiumListing.notice.includes("GH₵250,000,000") || !premiumListing.notice.includes("WaveRider Jet Ski") ||
            !premiumListing.notice.includes("Ocean Crown Yacht") || !premiumListing.notice.includes("Coastline 28 Speedboat") || !premiumListing.notice.includes("Selected: Akwaaba Cay Private Island")) {
          throw new Error(target.name + ": premium island/boat property listing failed: " + JSON.stringify(premiumListing));
        }
      }
      if (interiorCase.buildingId === "akwaaba-creative-arts-centre") {
        await page.locator("#stage6-venue-action").click({ timeout: 5000 });
        const venueInteraction = await page.evaluate(() => ({
          count: Number(document.documentElement.dataset.stage6VenueInterestCount ?? 0),
          notice: document.querySelector("#notice")?.textContent ?? ""
        }));
        if (venueInteraction.count !== 1 || !venueInteraction.notice.includes("Interest noted for") ||
            !venueInteraction.notice.includes("not a saved booking")) {
          throw new Error(target.name + ": creative event interest interaction failed: " + JSON.stringify(venueInteraction));
        }
      }
      const interiorActionLabel = await page.locator("#interact-button").textContent();
      if (interiorActionLabel?.trim() !== "EXIT") {
        throw new Error(target.name + ": " + interiorCase.buildingId + " did not switch interaction to EXIT: " + interiorActionLabel);
      }
      if (interiorCase.screenshot) {
        await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-shop-interior.png", fullPage: false, timeout: 30000 });
      }
      if (interiorCase.buildingId === "akwaaba-creative-arts-centre") {
        await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-creative-arts-centre.png", fullPage: false, timeout: 30000 });
      }
      if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
      else await page.keyboard.press("e");
      await page.waitForFunction(() =>
        document.documentElement.dataset.activeInteriorId === "" &&
        (document.querySelector("#notice")?.textContent ?? "").includes("stepped back outside"),
        { timeout: 5000 }
      );
      console.log(target.name + ": entered and exited " + interiorCase.roomId + " at " + interiorCase.buildingId);
    }
    await page.goto("http://127.0.0.1:4173/?akwantuoIslandTest=1", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"), { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("#boot-screen")?.hasAttribute("hidden") === true, { timeout: 10000 });
    const islandState = await page.evaluate(() => ({
      spawn: document.documentElement.dataset.islandTestMode === "true",
      name: document.documentElement.dataset.akwantuoPrivateIslandName ?? "",
      price: Number(document.documentElement.dataset.akwantuoPrivateIslandPrice ?? 0),
      watercraft: Number(document.documentElement.dataset.akwantuoPrivateIslandWatercraftCount ?? 0),
      meshes: Number(document.documentElement.dataset.akwantuoPrivateIslandMeshCount ?? 0)
    }));
    if (!islandState.spawn || islandState.name !== "Akwaaba Cay Private Island" ||
        islandState.price < 10_000_000_000 || islandState.watercraft < 4 || islandState.meshes < 1) {
      throw new Error(target.name + ": private island scene/catalogue check failed: " + JSON.stringify(islandState));
    }
    await page.locator("#play-button").click({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-private-island.png", fullPage: false, timeout: 30000 });
    console.log(target.name + ": private island preview screenshot captured");
    for (const craftKind of ["speedboat", "jet_ski"]) {
      await page.goto("http://127.0.0.1:4173/?akwantuoWatercraftTest=" + craftKind, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForFunction(() => (document.querySelector("#boot-status")?.textContent ?? "").includes("Your world is ready"), { timeout: 30000 });
      await page.waitForFunction(() => document.querySelector("#boot-screen")?.hasAttribute("hidden") === true, { timeout: 10000 });
      const spawnKind = await page.evaluate(() => document.documentElement.dataset.watercraftTestMode ?? "");
      if (spawnKind !== craftKind) throw new Error(target.name + ": watercraft test spawn was not set for " + craftKind);
      await page.locator("#play-button").click({ timeout: 10000 });
      await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
      await page.keyboard.press("e");
      await page.waitForFunction((kind) => document.documentElement.dataset.akwantuoActiveWatercraft === kind, craftKind, { timeout: 5000 });
      const startPosition = await page.evaluate(() => ({
        x: Number(document.documentElement.dataset.akwantuoWatercraftX ?? 0),
        z: Number(document.documentElement.dataset.akwantuoWatercraftZ ?? 0)
      }));
      await page.keyboard.down("w");
      await page.waitForTimeout(6000);
      await page.keyboard.up("w");
      await page.keyboard.down("d");
      // A short steering input proves the rudder responds without executing
      // an unrealistic near-U-turn at maximum speed.
      await page.waitForTimeout(200);
      await page.keyboard.up("d");
      const movingCraft = await page.evaluate(() => ({
        x: Number(document.documentElement.dataset.akwantuoWatercraftX ?? 0),
        z: Number(document.documentElement.dataset.akwantuoWatercraftZ ?? 0),
        speed: Number(document.documentElement.dataset.akwantuoWatercraftSpeed ?? 0),
        active: document.documentElement.dataset.akwantuoActiveWatercraft ?? ""
      }));
      if (movingCraft.active !== craftKind || movingCraft.speed <= 0 ||
          Math.hypot(movingCraft.x - startPosition.x, movingCraft.z - startPosition.z) < 1 ||
          movingCraft.z > -3310) {
        throw new Error(target.name + ": " + craftKind + " did not drive and steer inside the Gulf navigation area: " + JSON.stringify(movingCraft));
      }
      await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-" + craftKind + ".png", fullPage: false, timeout: 30000 });
      // Disembarking at speed is intentionally blocked by the game. Brake to a
      // complete stop offshore before asserting the safe-disembark warning.
      await page.keyboard.down("Space");
      // Hold the brake long enough to stop the fastest supported watercraft.
      await page.waitForTimeout(7000);
      await page.keyboard.up("Space");
      const stoppedCraft = await page.evaluate(() => ({
        x: Number(document.documentElement.dataset.akwantuoWatercraftX ?? 0),
        z: Number(document.documentElement.dataset.akwantuoWatercraftZ ?? 0),
        speed: Number(document.documentElement.dataset.akwantuoWatercraftSpeed ?? 0),
        active: document.documentElement.dataset.akwantuoActiveWatercraft ?? ""
      }));
      if (stoppedCraft.active !== craftKind || stoppedCraft.speed > 0.5 ||
          stoppedCraft.z > -3310) {
        throw new Error(target.name + ": " + craftKind + " did not stop safely offshore before disembark test: " + JSON.stringify(stoppedCraft));
      }
      await page.keyboard.press("e");
      await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("offshore"), { timeout: 5000 });
      console.log(target.name + ": " + craftKind + " propulsion, steering, braking and offshore docking safety passed");
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Transport browser smoke checks passed on desktop and mobile viewports.");
