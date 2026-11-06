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
    await page.locator("#play-button").click();
    await page.waitForFunction(() => !document.querySelector("#game-hud")?.classList.contains("is-hidden"), { timeout: 10000 });
    await page.waitForTimeout(1800);
    if (failures.length) throw new Error(failures.join("\n"));
    await page.screenshot({ path: "artifacts/akwantuo-" + target.name + "-transport-game.png", fullPage: true });
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
