import { mountWayGoApp } from "./waygo";
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
  disposeWayGoApp?.();
  disposeWayGoApp = null;
  if (lockScreen) lockScreen.hidden = true;
  if (homeScreen) homeScreen.hidden = false;
  if (appView) appView.hidden = true;
};
const showLock = () => {
  disposeWayGoApp?.();
  disposeWayGoApp = null;
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
  disposeWayGoApp?.();
  disposeWayGoApp = null;
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
import { getAkwantuoSession, loadEconomyState, loadGameNews, loadGameNotifications, markGameNotificationRead, publishGameNews, getChalePhoneNumber, addChaleContact, loadChaleContacts, loadChaleMessages, sendChaleMessage, blockChalePlayer, type ChaleContact, type ChaleMessage } from "../services/supabase";


function makeNewsElement(tag: "div" | "p" | "strong" | "small" | "button" | "input" | "textarea" | "select" | "section" | "article" | "form" | "span", className = ""): HTMLElement {
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


async function openChaleApp() {
  if (!appContent) return;
  const session = await getAkwantuoSession();
  appContent.replaceChildren();
  if (!session) {
    const notice = makeNewsElement("p", "zenvia-news-status");
    notice.textContent = "Sign in to your AKWANTUO account to use Chale. Your game number is linked to your player account.";
    appContent.append(notice);
    return;
  }

  const status = makeNewsElement("p", "chale-status");
  status.textContent = "Connecting to Chale…";
  appContent.append(status);
  let myNumber = "";
  let activeContact: ChaleContact | null = null;

  const renderHome = async () => {
    activeContact = null;
    appContent?.replaceChildren();
    if (!appContent) return;
    const numberCard = makeNewsElement("section", "zenvia-app-card chale-number-card");
    const numberLabel = makeNewsElement("small");
    numberLabel.textContent = "YOUR AKWANTUO GAME NUMBER";
    const numberValue = makeNewsElement("strong");
    numberValue.textContent = myNumber;
    const numberHint = makeNewsElement("p");
    numberHint.textContent = "Share this number with a player you trust. Both players must save each other’s number before chatting. This is not your real phone number."
    numberCard.append(numberLabel, numberValue, numberHint);

    const addCard = makeNewsElement("form", "zenvia-app-card chale-add-form") as HTMLFormElement;
    const addTitle = makeNewsElement("strong");
    addTitle.textContent = "Add a contact";
    const numberInput = makeNewsElement("input") as HTMLInputElement;
    numberInput.placeholder = "Enter their AKWANTUO number";
    numberInput.autocomplete = "off";
    numberInput.maxLength = 11;
    numberInput.required = true;
    const labelInput = makeNewsElement("input") as HTMLInputElement;
    labelInput.placeholder = "Save name (optional)";
    labelInput.maxLength = 40;
    const addButton = makeNewsElement("button", "chale-action") as HTMLButtonElement;
    addButton.type = "submit";
    addButton.textContent = "Save number";
    const addFeedback = makeNewsElement("small", "chale-feedback");
    addCard.append(addTitle, numberInput, labelInput, addButton, addFeedback);
    addCard.addEventListener("submit", async event => {
      event.preventDefault();
      if (!numberInput.value.trim()) return;
      addButton.disabled = true;
      addFeedback.textContent = "Checking number…";
      try {
        await addChaleContact(session, numberInput.value.trim(), labelInput.value.trim());
        await renderHome();
      } catch (error) {
        addFeedback.textContent = error instanceof Error ? error.message : "Could not save this number.";
        addButton.disabled = false;
      }
    });

    const contactsCard = makeNewsElement("section", "zenvia-app-card chale-contacts");
    const contactsHeading = makeNewsElement("strong");
    contactsHeading.textContent = "Your contacts";
    const refresh = makeNewsElement("button", "chale-refresh") as HTMLButtonElement;
    refresh.type = "button";
    refresh.textContent = "Refresh";
    const contactHeader = makeNewsElement("div", "chale-section-heading");
    contactHeader.append(contactsHeading, refresh);
    contactsCard.append(contactHeader);
    const contactList = makeNewsElement("div", "chale-contact-list");
    contactsCard.append(contactList);
    refresh.addEventListener("click", async () => {
      refresh.disabled = true;
      await renderHome();
    });
    try {
      const contacts = await loadChaleContacts(session);
      if (!contacts.length) {
        const empty = makeNewsElement("p");
        empty.textContent = "No contacts yet. Ask a player for their in-game number, then add it above.";
        contactList.append(empty);
      }
      for (const contact of contacts) {
        const item = makeNewsElement("button", "chale-contact-item") as HTMLButtonElement;
        item.type = "button";
        const name = makeNewsElement("strong");
        name.textContent = contact.display_name;
        const detail = makeNewsElement("small");
        detail.textContent = contact.phone_number;
        const preview = makeNewsElement("span");
        preview.textContent = contact.is_mutual ? (contact.last_message || "Tap to start chatting") : "Waiting for them to save your number";
        item.append(name, detail, preview);
        item.disabled = !contact.is_mutual;
        item.addEventListener("click", () => { if (contact.is_mutual) void renderConversation(contact); });
        contactList.append(item);
      }
    } catch (error) {
      const failed = makeNewsElement("p");
      failed.textContent = error instanceof Error ? error.message : "Could not load contacts.";
      contactList.append(failed);
    }
    appContent.append(numberCard, addCard, contactsCard);
  };

  const renderConversation = async (contact: ChaleContact) => {
    activeContact = contact;
    appContent?.replaceChildren();
    if (!appContent) return;
    const header = makeNewsElement("section", "chale-chat-header");
    const back = makeNewsElement("button", "chale-back") as HTMLButtonElement;
    back.type = "button";
    back.textContent = "‹ Contacts";
    back.addEventListener("click", () => renderHome());
    const identity = makeNewsElement("div");
    const name = makeNewsElement("strong");
    name.textContent = contact.display_name;
    const number = makeNewsElement("small");
    number.textContent = contact.phone_number;
    identity.append(name, number);
    const block = makeNewsElement("button", "chale-block") as HTMLButtonElement;
    block.type = "button";
    block.textContent = "Block";
    block.addEventListener("click", async () => {
      if (!window.confirm("Block this player? They will no longer be able to contact you through Chale.")) return;
      block.disabled = true;
      try {
        await blockChalePlayer(session, contact.contact_id);
        await renderHome();
      } catch (error) {
        block.disabled = false;
        const note = makeNewsElement("p", "chale-feedback");
        note.textContent = error instanceof Error ? error.message : "Could not block player.";
        header.append(note);
      }
    });
    header.append(back, identity, block);

    const messagesPane = makeNewsElement("div", "chale-messages");
    const composer = makeNewsElement("form", "chale-composer");
    const input = makeNewsElement("input") as HTMLInputElement;
    input.placeholder = "Message…";
    input.maxLength = 2000;
    input.autocomplete = "off";
    input.required = true;
    const send = makeNewsElement("button", "chale-action") as HTMLButtonElement;
    send.type = "submit";
    send.textContent = "Send";
    const feedback = makeNewsElement("small", "chale-feedback");
    composer.append(input, send);
    appContent.append(header, messagesPane, composer, feedback);

    const loadMessages = async () => {
      messagesPane.replaceChildren();
      const messages: ChaleMessage[] = await loadChaleMessages(session, contact.contact_id);
      if (!messages.length) {
        const empty = makeNewsElement("p");
        empty.textContent = "This is the start of your conversation.";
        messagesPane.append(empty);
      }
      for (const message of messages) {
        const bubble = makeNewsElement("article", message.sender_id === session.user.id ? "chale-message mine" : "chale-message");
        const body = makeNewsElement("p");
        body.textContent = message.body;
        const time = makeNewsElement("small");
        time.textContent = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        bubble.append(body, time);
        messagesPane.append(bubble);
      }
      messagesPane.scrollTop = messagesPane.scrollHeight;
    };
    try {
      await loadMessages();
    } catch (error) {
      feedback.textContent = error instanceof Error ? error.message : "Could not load conversation.";
    }
    composer.addEventListener("submit", async event => {
      event.preventDefault();
      const body = input.value.trim();
      if (!body || !activeContact) return;
      send.disabled = true;
      feedback.textContent = "Sending…";
      try {
        await sendChaleMessage(session, contact.contact_id, body);
        input.value = "";
        feedback.textContent = "";
        await loadMessages();
      } catch (error) {
        feedback.textContent = error instanceof Error ? error.message : "Message could not be sent.";
      } finally {
        send.disabled = false;
      }
    });
  };

  try {
    myNumber = await getChalePhoneNumber(session);
    await renderHome();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Chale is temporarily unavailable.";
  }
}

let disposeWayGoApp: (() => void) | null = null;

async function openApp(name: string) {
  if (!unlocked || !appContent) return;
  disposeWayGoApp?.();
  disposeWayGoApp = null;
  if (appTitle) appTitle.textContent = name;
  appContent.replaceChildren();
  if (!unlocked || !appContent) return;
  if (appTitle) appTitle.textContent = name;
  appContent.replaceChildren();
  if (name === "Chale") {
    if (homeScreen) homeScreen.hidden = true;
    if (lockScreen) lockScreen.hidden = true;
    if (appView) appView.hidden = false;
    await openChaleApp();
    return;
  }
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
  if (name === "WayGo") {
    if (homeScreen) homeScreen.hidden = true;
    if (lockScreen) lockScreen.hidden = true;
    if (appView) appView.hidden = false;
    disposeWayGoApp = mountWayGoApp(appContent);
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
