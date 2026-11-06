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
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => {
      const status = document.querySelector("#boot-status")?.textContent ?? "";
      return status.includes("Your world is ready") || status.includes("Unable to start");
    }, { timeout: 30000 });
    const status = await page.locator("#boot-status").textContent();
    if (!status?.includes("Your world is ready")) failures.push(target.name + ": startup status was " + status);
    console.log(target.name + ": startup ready");
    await page.locator("#play-button").click({ timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Exercise a complete trotro journey, including the passenger camera control.
    if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
    else await page.keyboard.press("e");
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Boarded shared trotro"), { timeout: 5000 });
    if (target.isMobile) {
      await page.locator("#vehicle-view-button").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#vehicle-view-button").click({ timeout: 5000 });
    }
    else await page.keyboard.press("c");
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("Vehicle view"), { timeout: 5000 });
    console.log(target.name + ": trotro boarded and passenger camera switched");
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("You have reached the final stop"), { timeout: 30000 });
    console.log(target.name + ": trotro reached terminal");
    if (target.isMobile) await page.locator("#interact-button").click({ timeout: 5000 });
    else await page.keyboard.press("e");
    await page.waitForFunction(() => (document.querySelector("#notice")?.textContent ?? "").includes("You alighted"), { timeout: 5000 });

    if (failures.length) throw new Error(failures.join("\n"));
    await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-transport-game.png", fullPage: false, timeout: 10000 });
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
