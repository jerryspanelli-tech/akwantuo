const phone = document.getElementById("zenvia-phone");
const launcher = document.getElementById("phone-launcher");
const lockScreen = document.getElementById("zenvia-lock");
const homeScreen = document.getElementById("zenvia-home");
const appView = document.getElementById("zenvia-app-view");
const appTitle = document.getElementById("zenvia-app-title");
const appContent = document.getElementById("zenvia-app-content");
const closeButton = document.getElementById("zenvia-close");
const backButton = document.getElementById("zenvia-back");
const fingerprint = document.getElementById("zenvia-fingerprint");
const powerButton = document.getElementById("zenvia-power");
let unlocked = false;
let opened = false;
const time = () => new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit"}).format(new Date());
const updateTime = () => {
  const value = time();
  for (const id of ["zenvia-status-time","zenvia-lock-time","zenvia-widget-time"]) {
    const node = document.getElementById(id); if (node) node.textContent = value;
  }
};
const showHome = () => { if (lockScreen) lockScreen.hidden = true; if (homeScreen) homeScreen.hidden = false; if (appView) appView.hidden = true; };
const showLock = () => { unlocked = false; if (lockScreen) lockScreen.hidden = false; if (homeScreen) homeScreen.hidden = true; if (appView) appView.hidden = true; };
const openPhone = () => { if (!phone) return; opened = true; phone.hidden = false; showLock(); updateTime(); };
const closePhone = () => { if (!phone) return; opened = false; phone.hidden = true; };
launcher?.addEventListener("click", openPhone);
closeButton?.addEventListener("click", closePhone);
fingerprint?.addEventListener("click", () => { unlocked = true; showHome(); });
document.getElementById("zenvia-pin-unlock")?.addEventListener("click", () => {
  const pin = window.prompt("Enter your Zenvia phone PIN (demo only):");
  if (pin && /^\d{4,6}$/.test(pin)) { unlocked = true; showHome(); }
  else if (pin !== null) window.alert("Enter a 4–6 digit PIN.");
});
powerButton?.addEventListener("click", showLock);
backButton?.addEventListener("click", showHome);
document.getElementById("zenvia-app-grid")?.addEventListener("click", event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-app]") : null;
  if (button?.dataset.app) openApp(button.dataset.app);
});
document.querySelector(".zenvia-dock")?.addEventListener("click", event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-app]") : null;
  if (button?.dataset.app) openApp(button.dataset.app);
});
function openApp(name: string) {
  if (!unlocked) return;
  if (appTitle) appTitle.textContent = name;
  if (!appContent) return;\n  appContent.replaceChildren();
  const card = (title: string, body: string) => {
    const section = document.createElement("section");
    section.className = "zenvia-app-card";
    const heading = document.createElement("strong"); heading.textContent = title;
    const paragraph = document.createElement("p"); paragraph.textContent = body;
    section.append(heading, paragraph); appContent.append(section);
  };
  const pages: Record<string, [string, string][]> = {
    "AKWANTUO News": [["Top stories","Official announcements, Accra stories and world events will appear here."],["Market bulletin","Virtual company and cryptocurrency market updates will connect to the game economy."],["Admin updates","Verified AKWANTUO administration announcements and event alerts."]],
    "WayGo": [["3D Accra navigation","Search Greater Accra destinations and follow road-based GPS directions. The full 3D phone map is the next implementation phase."],["Location sharing","Share your live or one-time location with friends when multiplayer location services are enabled."]],
    "AppBay": [["Discover apps","Browse, install, update and remove apps. Downloadable app management is planned for the next phase."],["Your phone","Zenvia One · Powered by AKWANTUO OS"]],
    "Chale": [["Your conversations","Private messages, group chats, voice notes and player location sharing."],["Contacts","Your in-game contacts and online friends will appear here."]],
    "Vibez": [["Your social feed","Player posts, photos, stories, likes and comments."],["Explore","Discover creators and happenings around Accra."]],
    "CoinVest": [["Your portfolio","Track simulated Bitcoin and virtual cryptocurrency investments using in-game GH₵."],["Market risk","Prices can rise or fall. No real-money trading is connected."]],
    "TradeMarket": [["Ghana Exchange","Buy and sell shares in fictional in-game companies."],["Market watch","Prices and company news will be linked to the simulated game economy."]],
    "CediPay": [["Your wallet","Your in-game GH₵ balance, transfers and payments."],["Payments","Pay participating in-game businesses and players when those services are enabled."]],
    "BetZone": [["Match predictions","A future virtual-currency sports prediction feature. No real-money gambling."],["Responsible play","Virtual wagers only; no cash deposits or withdrawals."]],
    "PlayZone": [["Mobile games","Discover small games and activities available inside the Zenvia phone."]],
    "TuneBox": [["Your music","Music player and in-game radio stations."]],
    "Phone": [["Recent calls","Your calls and contacts will appear here when calling is implemented."]],
    "Camera": [["Camera","Capture and save moments from your AKWANTUO life."]],
    "Contacts": [["Contacts","Friends, businesses and saved numbers."]],
    "Settings": [["Zenvia settings","Display, wallpaper, notifications, security, fingerprint and phone preferences."],["Security","Fingerprint unlock and phone PIN are visual prototypes here; account-grade security will be connected to the authenticated player profile."]]
  };
  for (const [title, body] of (pages[name] || [["Coming soon","This application will be connected to its full gameplay system in a later phase."]])) card(title, body);
  if (homeScreen) homeScreen.hidden = true; if (lockScreen) lockScreen.hidden = true; if (appView) appView.hidden = false;
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && opened) closePhone();
  if ((event.key === "p" || event.key === "P") && !event.repeat && !(event.target instanceof Element && event.target.matches("input,textarea"))) {
    if (opened) closePhone(); else openPhone();
  }
});
updateTime();
window.setInterval(updateTime, 15000);
