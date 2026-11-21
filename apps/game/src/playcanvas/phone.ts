const phone = document.getElementById("zenvia-phone");
const launcher = document.getElementById("phone-launcher");
const lockScreen = document.getElementById("zenvia-lock");
const homeScreen = document.getElementById("zenvia-home");
const appView = document.getElementById("zenvia-app-view");
const appTitle = document.getElementById("zenvia-app-title");
const appContent = document.getElementById("zenvia-app-content");
const closeButton = document.getElementById("zenvia-close");
const backButton = document.getElementById("zenvia-back");
const fingerprint = document.getElementById("zenvia-fingerprint") as HTMLButtonElement | null;
const powerButton = document.getElementById("zenvia-power");
const pinButton = document.getElementById("zenvia-pin-unlock");
const PIN_HASH_KEY = "akwantuo.zenvia.pin.hash.v1";
const PIN_SALT_KEY = "akwantuo.zenvia.pin.salt.v1";
let unlocked = false;
let opened = false;
let pinPanel: HTMLElement | null = null;

const time = () => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date());
const updateTime = () => {
  const value = time();
  for (const id of ["zenvia-status-time", "zenvia-lock-time", "zenvia-widget-time"]) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }
};
const showHome = () => {
  if (lockScreen) lockScreen.hidden = true;
  if (homeScreen) homeScreen.hidden = false;
  if (appView) appView.hidden = true;
};
const showLock = () => {
  unlocked = false;
  if (lockScreen) lockScreen.hidden = false;
  if (homeScreen) homeScreen.hidden = true;
  if (appView) appView.hidden = true;
  pinPanel?.remove();
  pinPanel = null;
};
const openPhone = () => {
  if (!phone) return;
  opened = true;
  phone.hidden = false;
  showLock();
  updateTime();
};
const closePhone = () => {
  if (!phone) return;
  opened = false;
  phone.hidden = true;
};
launcher?.addEventListener("click", openPhone);
closeButton?.addEventListener("click", closePhone);
fingerprint?.addEventListener("click", () => {
  if (!fingerprint) return;
  fingerprint.disabled = true;
  fingerprint.classList.add("scanning");
  const hint = lockScreen?.querySelector("small");
  if (hint) hint.textContent = "Simulated fingerprint scan…";
  window.setTimeout(() => {
    fingerprint.classList.remove("scanning");
    fingerprint.disabled = false;
    if (hint) hint.textContent = "Touch fingerprint to unlock";
    unlocked = true;
    showHome();
  }, 850);
});
pinButton?.addEventListener("click", () => showPinPanel());
powerButton?.addEventListener("click", showLock);
backButton?.addEventListener("click", showHome);

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.slice().buffer as ArrayBuffer, iterations: 120000, hash: "SHA-256" }, material, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}
function showPinPanel() {
  if (!lockScreen || pinPanel) return;
  const existingHash = localStorage.getItem(PIN_HASH_KEY);
  const panel = document.createElement("div");
  panel.className = "zenvia-pin-panel";
  const heading = document.createElement("strong");
  heading.textContent = existingHash ? "Enter your phone PIN" : "Create a phone PIN";
  const note = document.createElement("small");
  note.textContent = existingHash ? "This PIN is saved on this device." : "Choose 4–6 digits for this device.";
  const input = document.createElement("input");
  input.type = "password";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.maxLength = 6;
  input.placeholder = "••••";
  input.setAttribute("aria-label", "Phone PIN");
  const confirm = document.createElement("input");
  confirm.type = "password";
  confirm.inputMode = "numeric";
  confirm.autocomplete = "off";
  confirm.maxLength = 6;
  confirm.placeholder = "Confirm PIN";
  confirm.setAttribute("aria-label", "Confirm phone PIN");
  confirm.hidden = Boolean(existingHash);
  const message = document.createElement("small");
  message.setAttribute("role", "status");
  const submit = document.createElement("button");
  submit.type = "button";
  submit.textContent = existingHash ? "Unlock" : "Save PIN";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  submit.addEventListener("click", async () => {
    const pin = input.value;
    if (!/^\\d{4,6}$/.test(pin)) { message.textContent = "Use 4 to 6 digits."; return; }
    try {
      if (existingHash) {
        const saltText = localStorage.getItem(PIN_SALT_KEY);
        if (!saltText) throw new Error("PIN setup needs to be reset.");
        const salt = Uint8Array.from(atob(saltText), char => char.charCodeAt(0));
        if (await hashPin(pin, salt) !== existingHash) { message.textContent = "That PIN is incorrect."; input.value = ""; return; }
      } else {
        if (confirm.value !== pin) { message.textContent = "The PINs do not match."; return; }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        localStorage.setItem(PIN_SALT_KEY, btoa(String.fromCharCode(...salt)));
        localStorage.setItem(PIN_HASH_KEY, await hashPin(pin, salt));
      }
      unlocked = true;
      showHome();
    } catch {
      message.textContent = "PIN storage is unavailable in this browser.";
    }
  });
  cancel.addEventListener("click", () => { panel.remove(); pinPanel = null; });
  panel.append(heading, note, input, confirm, message, submit, cancel);
  lockScreen.append(panel);
  pinPanel = panel;
  input.focus();
}

document.getElementById("zenvia-app-grid")?.addEventListener("click", event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-app]") : null;
  if (button?.dataset.app) openApp(button.dataset.app);
});
document.querySelector(".zenvia-dock")?.addEventListener("click", event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-app]") : null;
  if (button?.dataset.app) openApp(button.dataset.app);
});
function openApp(name: string) {
  if (!unlocked || !appContent) return;
  if (appTitle) appTitle.textContent = name;
  appContent.replaceChildren();
  const card = (title: string, body: string) => {
    const section = document.createElement("section");
    section.className = "zenvia-app-card";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = body;
    section.append(heading, paragraph);
    appContent.append(section);
  };
  const pages: Record<string, [string, string][]> = {
    "AKWANTUO News": [["Top stories", "Official announcements, Accra stories and world events will appear here."], ["Market bulletin", "Virtual company and cryptocurrency market updates will connect to the game economy."], ["Admin updates", "Verified AKWANTUO administration announcements and event alerts."]],
    "WayGo": [["3D Accra navigation", "Search Greater Accra destinations and follow road-based GPS directions. The existing road-route engine is being prepared for this in-phone map."], ["Location sharing", "Share your live or one-time location with friends when multiplayer location services are enabled."]],
    "AppBay": [["Discover apps", "Browse, install, update and remove apps. The app catalogue and installation flow are still being built."], ["Your phone", "Zenvia One · Powered by AKWANTUO OS"]],
    "Chale": [["Your conversations", "Private messages, group chats, voice notes and player location sharing."], ["Contacts", "Your in-game contacts and online friends will appear here."]],
    "Vibez": [["Your social feed", "Player posts, photos, stories, likes and comments."], ["Explore", "Discover creators and happenings around Accra."]],
    "CoinVest": [["Your portfolio", "Track simulated cryptocurrency investments using in-game GH₵."], ["Market risk", "Prices can rise or fall. No real-money trading is connected."]],
    "TradeMarket": [["Ghana Exchange", "Buy and sell shares in fictional in-game companies."], ["Market watch", "Prices and company news will be linked to the simulated game economy."]],
    "CediPay": [["Your wallet", "Your in-game GH₵ balance, transfers and payments."], ["Payments", "Pay participating in-game businesses and players when those services are enabled."]],
    "BetZone": [["Match predictions", "A future virtual-currency sports prediction feature. No real-money gambling."], ["Responsible play", "Virtual wagers only; no cash deposits or withdrawals."]],
    "PlayZone": [["Mobile games", "Discover small games and activities available inside the Zenvia phone."]],
    "TuneBox": [["Your music", "Music player and in-game radio stations."]],
    "Phone": [["Recent calls", "Your calls and contacts will appear here when calling is implemented."]],
    "Camera": [["Camera", "Capture and save moments from your AKWANTUO life."]],
    "Contacts": [["Contacts", "Friends, businesses and saved numbers."]],
    "Settings": [["Zenvia settings", "Display, wallpaper, notifications, security and phone preferences."], ["Device PIN", "The local phone PIN is a convenience lock for this browser/device, not your AKWANTUO account password. Fingerprint unlock is a simulated game animation and never accesses device biometrics."]]
  };
  for (const [title, body] of (pages[name] || [["Coming soon", "This application will be connected to its full gameplay system in a later phase."]])) card(title, body);
  if (homeScreen) homeScreen.hidden = true;
  if (lockScreen) lockScreen.hidden = true;
  if (appView) appView.hidden = false;
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && opened) closePhone();
  if ((event.key === "p" || event.key === "P") && !event.repeat && !(event.target instanceof Element && event.target.matches("input,textarea"))) {
    if (opened) closePhone(); else openPhone();
  }
});
updateTime();
window.setInterval(updateTime, 15000);
