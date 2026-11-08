import "./style.css";

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required interface element: #${id}`);
  return element as T;
};

const loading = byId<HTMLElement>("loading");
const menu = byId<HTMLElement>("menu");
const world = byId<HTMLElement>("world");
const settingsPanel = byId<HTMLElement>("settings-panel");
const errorBox = byId<HTMLElement>("world-error");
let stopWorld: (() => void) | null = null;
let startingWorld = false;
type Quality = "auto" | "high" | "low";
function readQuality(): Quality {
  try {
    const value = localStorage.getItem("akwantuo.graphics-quality");
    return value === "high" || value === "low" ? value : "auto";
  } catch { return "auto"; }
}
let selectedQuality: Quality = readQuality();
byId<HTMLSelectElement>("quality").value = selectedQuality;

function showMenu() {
  stopWorld?.();
  stopWorld = null;
  world.hidden = true;
  menu.hidden = false;
  settingsPanel.hidden = true;
  startingWorld = false;
}

async function enterWorld() {
  if (startingWorld || stopWorld) return;
  startingWorld = true;
  menu.hidden = true;
  world.hidden = false;
  errorBox.hidden = true;
  try {
    const { startWorld } = await import("./world/createWorld");
    stopWorld = startWorld(byId<HTMLCanvasElement>("game-canvas"), byId<HTMLElement>("movement-stick"), selectedQuality);
  } catch (error) {
    errorBox.textContent = error instanceof Error
      ? `The 3D world could not start: ${error.message}`
      : "The 3D world could not start on this device. Return to the menu and try again.";
    errorBox.hidden = false;
  } finally {
    startingWorld = false;
  }
}

byId<HTMLButtonElement>("play").addEventListener("click", () => void enterWorld());
byId<HTMLButtonElement>("back-menu").addEventListener("click", showMenu);
byId<HTMLButtonElement>("settings").addEventListener("click", () => { settingsPanel.hidden = false; });
byId<HTMLButtonElement>("close-settings").addEventListener("click", () => { settingsPanel.hidden = true; });
byId<HTMLSelectElement>("quality").addEventListener("change", (event) => {
  const value = (event.currentTarget as HTMLSelectElement).value;
  selectedQuality = value === "high" || value === "low" ? value : "auto";
  try { localStorage.setItem("akwantuo.graphics-quality", selectedQuality); } catch { /* Storage may be unavailable. */ }
});
window.addEventListener("pagehide", () => stopWorld?.());

window.setTimeout(() => {
  loading.style.opacity = "0";
  window.setTimeout(() => {
    loading.hidden = true;
    menu.hidden = false;
  }, 500);
}, 650);
