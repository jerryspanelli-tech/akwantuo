import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const failures = [];
try {
  for (const target of [
    { name: "desktop", viewport: { width: 1440, height: 1000 } },
    { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
  ]) {
    const context = await browser.newContext({
      viewport: target.viewport,
      isMobile: target.isMobile ?? false,
      hasTouch: target.hasTouch ?? false
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(target.name + ": " + error.message));
    page.on("console", (message) => { if (message.type() === "error") failures.push(target.name + " console: " + message.text()); });
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", timeout: 30000 });
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
    await page.locator("#play-button").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#play-button").click({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    await page.waitForTimeout(1200);

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

    // Exercise a complete trotro journey, including the passenger camera control.
    if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
    else await page.keyboard.press("e");
    try {
      await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Boarded shared trotro"), { timeout: 5000 });
    } catch (error) {
      const boardingDiagnostic = await page.evaluate((runtimeErrors) => ({
        notice: document.querySelector("#notice")?.textContent ?? "",
        playerX: document.documentElement.dataset.transportPlayerX,
        playerZ: document.documentElement.dataset.transportPlayerZ,
        trotroX: document.documentElement.dataset.transportTrotroX,
        trotroZ: document.documentElement.dataset.transportTrotroZ,
        passengerMode: document.documentElement.dataset.transportPassengerMode,
        lastActionNotice: document.documentElement.dataset.transportLastNotice,
        lastActionAt: document.documentElement.dataset.transportLastActionAt,
        lastKey: document.documentElement.dataset.transportLastKey,
        hasEnteredWorld: document.documentElement.dataset.transportHasEnteredWorld,
        actionRequest: document.documentElement.dataset.transportActionRequest,
        actionConsumedAt: document.documentElement.dataset.transportActionConsumedAt,
        actionPassengerModeBefore: document.documentElement.dataset.transportActionPassengerModeBefore,
        trotroBranch: document.documentElement.dataset.transportTrotroBranch,
        trotroDistance: document.documentElement.dataset.transportTrotroDistance,
        trotroBoardResult: document.documentElement.dataset.transportTrotroBoardResult,
        renderFrame: document.documentElement.dataset.transportRenderFrame,
        renderFrameAt: document.documentElement.dataset.transportRenderFrameAt,
        actionRequestAt: document.documentElement.dataset.transportActionRequestAt,
        visibilityAtInput: document.documentElement.dataset.transportVisibilityAtInput,
        visibilityNow: document.visibilityState,
        runtimeErrors: runtimeErrors.slice(-12)
      }), failures);
      console.error(target.name + ": trotro boarding diagnostic " + JSON.stringify(boardingDiagnostic));
      throw error;
    }
    if (target.isMobile) {
      await page.locator("#vehicle-view-button").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#vehicle-view-button").click({ timeout: 5000 });
    }
    else await page.keyboard.press("c");
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Vehicle view"), { timeout: 5000 });
    console.log(target.name + ": trotro boarded and passenger camera switched");
    try {
      await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("You have reached the final stop"), { timeout: 60000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        notice: document.querySelector("#notice")?.textContent,
        trotroZ: document.documentElement.dataset.trotroZ,
        trotroSpeed: document.documentElement.dataset.trotroSpeed,
        trotroArrived: document.documentElement.dataset.trotroArrived
      }));
      console.error(target.name + ": trotro terminal diagnostic " + JSON.stringify(diagnostic));
      throw error;
    }
    console.log(target.name + ": trotro reached terminal");
    if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
    else await page.keyboard.press("e");
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("You alighted"), { timeout: 5000 });

    if (failures.length) throw new Error(failures.join("\n"));
    await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-transport-game.png", fullPage: false, timeout: 30000 });
    console.log(target.name + ": trotro journey passed and screenshot captured");
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
