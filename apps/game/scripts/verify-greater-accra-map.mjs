import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const failures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => failures.push("pageerror: " + error.message));
  page.on("console", message => { if (message.type() === "error") failures.push("console: " + message.text()); });
  await page.goto("http://127.0.0.1:4173/greater-accra-transport-preview.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => {
    const text = document.querySelector("#map-status")?.textContent ?? "";
    return text.includes("Network preview ready") || text.includes("Map preview failed");
  }, { timeout: 60000 }).catch(async error => {
    const diagnostic = await page.evaluate(() => ({
      status: document.querySelector("#map-status")?.textContent,
      canvas: !!document.querySelector("#map-canvas"),
      title: document.title
    }));
    throw new Error("Map preview timed out: " + JSON.stringify(diagnostic) + " · " + error.message);
  });
  const status = await page.locator("#map-status").textContent();
  if (!status?.includes("Network preview ready")) failures.push("Map preview did not become ready: " + status);
  if (failures.length) throw new Error(failures.join("\n"));
  // Allow the first WebGL frame to finish after synchronous map construction.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "artifacts/akwantuo-greater-accra-road-network.png", fullPage: false, timeout: 30000 });
  await page.goto("http://127.0.0.1:4173/greater-accra-transport-preview.html?view=detail", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => (document.querySelector("#map-status")?.textContent ?? "").includes("Network preview ready"), { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "artifacts/akwantuo-greater-accra-road-network-detail.png", fullPage: false, timeout: 30000 });
  console.log("Greater Accra road-network preview passed: " + status);
} finally {
  await browser.close();
}
if (failures.length) process.exit(1);
