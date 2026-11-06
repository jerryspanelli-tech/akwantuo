import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const failures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => failures.push(error.message));
  await page.goto("http://127.0.0.1:4173/greater-accra-transport-preview.html", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => {
    const text = document.querySelector("#map-status")?.textContent ?? "";
    return text.includes("Network preview ready") || text.includes("Map preview failed");
  }, { timeout: 30000 });
  const status = await page.locator("#map-status").textContent();
  if (!status?.includes("Network preview ready")) failures.push("Map preview did not become ready: " + status);
  if (failures.length) throw new Error(failures.join("\n"));
  await page.screenshot({ path: "artifacts/akwantuo-greater-accra-road-network.png", fullPage: false, timeout: 15000 });
  console.log("Greater Accra road-network preview passed: " + status);
} finally {
  await browser.close();
}
if (failures.length) process.exit(1);
