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

const clockFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const time = () => clockFormatter.format(new Date());
const updateTime = () => {
  const value = time();
  const statusTime = document.getElementById("zenvia-status-time");
  if (statusTime) statusTime.textContent = value;
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
  // Let the phone become visible before refreshing its clock text.
  window.requestAnimationFrame(updateTime);
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
    if (!/^\d{4,6}$/.test(pin)) { message.textContent = "Use 4 to 6 digits."; return; }
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
import { getAkwantuoSession, loadEconomyState, loadGameNews, loadGameNotifications, markGameNotificationRead, publishGameNews } from "../services/supabase";


function makeNewsElement(tag: "div" | "p" | "strong" | "small" | "button" | "input" | "textarea" | "select", className = ""): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

async function openNewsApp() {
  if (!appContent) return;
  const status = makeNewsElement("p", "zenvia-news-status");
  status.textContent = "Loading AKWANTUO updates…";
  appContent.append(status);
  try {
    const session = await getAkwantuoSession();
    if (!session) {
      status.textContent = "Sign in to your AKWANTUO account to view live news and notifications.";
      return;
    }
    const [stories, notifications] = await Promise.all([
      loadGameNews(session),
      loadGameNotifications(session)
    ]);
    appContent.replaceChildren();

    const feed = makeNewsElement("section", "zenvia-app-card");
    const feedTitle = makeNewsElement("strong");
    feedTitle.textContent = "Latest updates";
    feed.append(feedTitle);
    if (!stories.length) {
      const empty = makeNewsElement("p");
      empty.textContent = "No announcements have been published yet.";
      feed.append(empty);
    }
    for (const story of stories) {
      const item = makeNewsElement("article", "zenvia-news-item");
      const category = makeNewsElement("small");
      category.textContent = story.category;
      const headline = makeNewsElement("strong");
      headline.textContent = story.headline;
      const body = makeNewsElement("p");
      body.textContent = story.announcement;
      const date = makeNewsElement("small");
      date.textContent = story.published_at ? new Date(story.published_at).toLocaleString() : "";
      item.append(category, headline, body, date);
      feed.append(item);
    }
    appContent.append(feed);

    const inbox = makeNewsElement("section", "zenvia-app-card");
    const inboxTitle = makeNewsElement("strong");
    inboxTitle.textContent = `Notifications · ${notifications.filter(item => !item.read_at).length} unread`;
    inbox.append(inboxTitle);
    if (!notifications.length) {
      const empty = makeNewsElement("p");
      empty.textContent = "You’re all caught up.";
      inbox.append(empty);
    }
    for (const notification of notifications) {
      const item = makeNewsElement("article", "zenvia-news-item");
      const title = makeNewsElement("strong");
      title.textContent = notification.title;
      const body = makeNewsElement("p");
      body.textContent = notification.message;
      const meta = makeNewsElement("small");
      meta.textContent = `${notification.category} · ${new Date(notification.created_at).toLocaleString()}`;
      item.append(title, body, meta);
      if (!notification.read_at) {
        const read = makeNewsElement("button", "zenvia-news-button") as HTMLButtonElement;
        read.type = "button";
        read.textContent = "Mark as read";
        read.addEventListener("click", async () => {
          read.disabled = true;
          try {
            await markGameNotificationRead(session, notification.id);
            await openNewsApp();
          } catch {
            read.disabled = false;
            read.textContent = "Could not update — retry";
          }
        });
        item.append(read);
      }
      inbox.append(item);
    }
    appContent.append(inbox);

    if (session.user.app_metadata?.role === "admin") {
      const composer = makeNewsElement("section", "zenvia-app-card");
      const heading = makeNewsElement("strong");
      heading.textContent = "Admin · Publish update";
      const category = makeNewsElement("select") as HTMLSelectElement;
      for (const value of ["Official announcement", "Accra stories", "Market news", "Events", "World news"]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        category.append(option);
      }
      const headline = makeNewsElement("input") as HTMLInputElement;
      headline.placeholder = "Headline";
      headline.maxLength = 120;
      const announcement = makeNewsElement("textarea") as HTMLTextAreaElement;
      announcement.placeholder = "Write the announcement…";
      announcement.maxLength = 3000;
      announcement.rows = 4;
      const target = makeNewsElement("input") as HTMLInputElement;
      target.placeholder = "Optional player user ID (leave blank for everyone)";
      const publish = makeNewsElement("button", "zenvia-news-button") as HTMLButtonElement;
      publish.type = "button";
      publish.textContent = "Publish to players";
      const feedback = makeNewsElement("small");
      feedback.setAttribute("role", "status");
      publish.addEventListener("click", async () => {
        if (headline.value.trim().length < 3 || !announcement.value.trim()) {
          feedback.textContent = "Add a headline and announcement first.";
          return;
        }
        publish.disabled = true;
        feedback.textContent = "Publishing…";
        try {
          await publishGameNews(session, {
            category: category.value,
            headline: headline.value,
            announcement: announcement.value,
            targetPlayerId: target.value.trim() || undefined
          });
          await openNewsApp();
        } catch (error) {
          feedback.textContent = error instanceof Error ? error.message : "Could not publish update.";
          publish.disabled = false;
        }
      });
      composer.append(heading, category, headline, announcement, target, publish, feedback);
      appContent.append(composer);
    }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "News is temporarily unavailable.";
  }
}

async function openCediPayApp() {
  if (!appContent) return;
  const status = makeNewsElement("p", "zenvia-news-status");
  status.textContent = "Loading your wallet…";
  appContent.append(status);
  try {
    const session = await getAkwantuoSession();
    if (!session) {
      status.textContent = "Sign in to view your AKWANTUO wallet.";
      return;
    }
    const economy = await loadEconomyState(session);
    appContent.replaceChildren();
    const wallet = makeNewsElement("section", "zenvia-app-card");
    const label = makeNewsElement("small");
    label.textContent = "AVAILABLE BALANCE";
    const balance = makeNewsElement("strong");
    balance.textContent = `GH₵${((economy.wallet?.balance_pesewas ?? 0) / 100).toFixed(2)}`;
    wallet.append(label, balance);
    appContent.append(wallet);
    const inventory = makeNewsElement("section", "zenvia-app-card");
    const heading = makeNewsElement("strong");
    heading.textContent = "Your inventory";
    inventory.append(heading);
    if (!economy.inventory.length) {
      const empty = makeNewsElement("p");
      empty.textContent = "Your bag is empty. Visit a shop in the world to buy supplies.";
      inventory.append(empty);
    }
    for (const item of economy.inventory) {
      const line = makeNewsElement("p");
      line.textContent = `${item.name} · ${item.quantity}`;
      inventory.append(line);
    }
    appContent.append(inventory);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Wallet is temporarily unavailable.";
  }
}

async function openApp(name: string) {
  if (!unlocked || !appContent) return;
  if (appTitle) appTitle.textContent = name;
  appContent.replaceChildren();
async function openApp(name: string) {
  if (!unlocked || !appContent) return;
  if (appTitle) appTitle.textContent = name;
  appContent.replaceChildren();
  if (name === "CediPay") {
    if (homeScreen) homeScreen.hidden = true;
    if (lockScreen) lockScreen.hidden = true;
    if (appView) appView.hidden = false;
    await openCediPayApp();
    return;
  }
  if (name === "AKWANTUO News") {
    if (homeScreen) homeScreen.hidden = true;
    if (lockScreen) lockScreen.hidden = true;
    if (appView) appView.hidden = false;
    await openNewsApp();
    return;
  }
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
