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

// Delegate app taps from the phone document so taps on icons, labels, and
// nested elements all reach the same app router even if the home layout changes.
// Give Chale its own button handlers instead of relying on the generic
// app-grid delegation. This covers both the home-screen icon and dock shortcut.
phone?.querySelectorAll<HTMLButtonElement>('button[data-app="Chale"]').forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    void openApp("Chale");
  });
});

// Keep delegated routing for the other Zenvia apps.
document.addEventListener("click", event => {
  const button = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>("#zenvia-phone button[data-app]")
    : null;
  if (button?.dataset.app && button.dataset.app.toLowerCase() !== "chale") {
    void openApp(button.dataset.app);
  }
});
import { getAkwantuoSession, signInAkwantuo, signUpAkwantuo, loadEconomyState, loadGameNews, loadGameNotifications, markGameNotificationRead, publishGameNews, getChalePhoneNumber, addChaleContact, loadChaleContacts, loadChaleMessages, sendChaleMessage, blockChalePlayer, type ChaleContact, type ChaleMessage } from "../services/supabase";


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
  appContent.replaceChildren();
  appContent.classList.add("chale-app");
  let session = await getAkwantuoSession().catch(() => null);
  let myNumber = "";
  let activeContact: ChaleContact | null = null;
  let contactsCache: ChaleContact[] = [];
  let authMode: "signin" | "signup" = "signin";
  const el = (tag: "div"|"section"|"p"|"strong"|"small"|"span"|"button"|"input"|"form"|"textarea", cls = "") => makeNewsElement(tag, cls);
  const btn = (label: string, cls = "chale-btn") => {
    const b = el("button", cls) as HTMLButtonElement; b.type = "button"; b.textContent = label; return b;
  };
  const feedback = (target: HTMLElement, message: string, error = false) => {
    target.textContent = message; target.classList.toggle("is-error", error);
  };
  const initials = (name: string) => name.trim().split(/\s+/).slice(0,2).map(x => x[0] || "").join("").toUpperCase() || "C";

  const renderAuth = (notice = "") => {
    if (!appContent) return;
    appContent.replaceChildren();
    const screen = el("div","chale-auth-screen");
    const brand = el("div","chale-brand");
    const mark = el("span","chale-brand-mark"); mark.textContent = "C";
    const brandText = el("div");
    const brandName = el("strong"); brandName.textContent = "Chale";
    const tagline = el("small"); tagline.textContent = "Your people. Your conversations.";
    brandText.append(brandName,tagline); brand.append(mark,brandText);
    const intro = el("div","chale-auth-intro");
    const heading = el("strong"); heading.textContent = authMode === "signin" ? "Welcome back" : "Join Chale";
    const desc = el("p"); desc.textContent = authMode === "signin"
      ? "Sign in with your AKWANTUO account to message people you know in the game."
      : "Create an AKWANTUO account. Your private Chale number will be set up automatically.";
    intro.append(heading,desc);
    const tabs = el("div","chale-auth-switch");
    const tabIn = btn("Sign in",authMode === "signin" ? "is-active" : "");
    const tabUp = btn("Create account",authMode === "signup" ? "is-active" : "");
    tabIn.addEventListener("click",()=>{authMode="signin";renderAuth();});
    tabUp.addEventListener("click",()=>{authMode="signup";renderAuth();});
    tabs.append(tabIn,tabUp);
    const form = el("form","chale-auth-form") as HTMLFormElement;
    const email = el("input") as HTMLInputElement; email.type="email"; email.placeholder="Email address"; email.autocomplete="email"; email.required=true;
    const password = el("input") as HTMLInputElement; password.type="password"; password.placeholder="Password"; password.minLength=8; password.required=true; password.autocomplete=authMode==="signin"?"current-password":"new-password";
    let playerName: HTMLInputElement | null = null;
    if(authMode==="signup"){playerName=el("input") as HTMLInputElement;playerName.placeholder="Player name";playerName.maxLength=40;playerName.required=true;form.append(playerName);}
    form.append(email,password);
    const status=el("small","chale-feedback");status.setAttribute("role","status");if(notice)feedback(status,notice);
    const submit=el("button","chale-primary") as HTMLButtonElement;submit.type="submit";submit.textContent=authMode==="signin"?"Sign in to Chale":"Create account";
    form.append(submit,status);
    form.addEventListener("submit",async event=>{
      event.preventDefault();submit.disabled=true;feedback(status,authMode==="signin"?"Signing in…":"Creating your account…");
      try{
        if(authMode==="signin") session=await signInAkwantuo(email.value.trim(),password.value);
        else{
          const result=await signUpAkwantuo(email.value.trim(),password.value,playerName?.value.trim()||"");
          if(!result.session){authMode="signin";renderAuth("Account created. Check your email to confirm it, then sign in here.");return;}
          session=result.session;
        }
        if (session) window.dispatchEvent(new CustomEvent("akwantuo:session-updated", { detail: session }));
        await initialiseChale();
      }catch(error){feedback(status,error instanceof Error?error.message:"Could not connect. Please try again.",true);submit.disabled=false;}
    });
    const privacy=el("small","chale-auth-privacy");privacy.textContent="Your real phone number is never shared with other players.";
    screen.append(brand,intro,tabs,form,privacy);appContent.append(screen);email.focus();
  };

  const initialiseChale = async () => {
    if(!session){renderAuth();return;}
    appContent?.replaceChildren();
    const loading=el("div","chale-loading");loading.textContent="Setting up your private Chale space…";appContent?.append(loading);
    try{myNumber=await getChalePhoneNumber(session);await renderHome();}
    catch(error){renderAuth(error instanceof Error?error.message:"Chale could not load.");}
  };

  const renderHome = async () => {
    if(!appContent||!session)return;
    activeContact=null;appContent.replaceChildren();
    const shell=el("div","chale-shell");
    const top=el("div","chale-topbar");
    const brand=el("div","chale-top-brand");
    const mark=el("span","chale-brand-mark");mark.textContent="C";
    const brandText=el("div");const title=el("strong");title.textContent="Chale";
    const sub=el("small");sub.textContent="Private player messaging";brandText.append(title,sub);brand.append(mark,brandText);
    const refresh=btn("↻","chale-icon-btn");refresh.setAttribute("aria-label","Refresh chats");refresh.addEventListener("click",()=>{void renderHome();});top.append(brand,refresh);
    const number=el("div","chale-number-strip");const numberText=el("div");
    const caption=el("small");caption.textContent="YOUR CHALE NUMBER";const value=el("strong");value.textContent=myNumber;numberText.append(caption,value);
    const copy=btn("Copy","chale-copy-btn");copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(myNumber);copy.textContent="Copied";window.setTimeout(()=>copy.textContent="Copy",1400);}catch{copy.textContent=myNumber;}});
    number.append(numberText,copy);
    const tools=el("div","chale-home-tools");const search=el("input","chale-search") as HTMLInputElement;search.type="search";search.placeholder="Search contacts";
    const add=btn("+ Add contact","chale-add-toggle");tools.append(search,add);
    const addForm=el("form","chale-add-panel") as HTMLFormElement;addForm.hidden=true;
    const addTitle=el("strong");addTitle.textContent="Add someone by Chale number";
    const addNumber=el("input") as HTMLInputElement;addNumber.placeholder="AK-12345678";addNumber.maxLength=11;addNumber.required=true;addNumber.autocomplete="off";
    const addName=el("input") as HTMLInputElement;addName.placeholder="Name (optional)";addName.maxLength=40;
    const addSubmit=el("button","chale-primary") as HTMLButtonElement;addSubmit.type="submit";addSubmit.textContent="Save contact";
    const addStatus=el("small","chale-feedback");addForm.append(addTitle,addNumber,addName,addSubmit,addStatus);
    add.addEventListener("click",()=>{addForm.hidden=!addForm.hidden;if(!addForm.hidden)addNumber.focus();});
    addForm.addEventListener("submit",async event=>{
      event.preventDefault();if(!session||!addNumber.value.trim())return;addSubmit.disabled=true;feedback(addStatus,"Checking Chale number…");
      try{await addChaleContact(session,addNumber.value.trim(),addName.value.trim());await renderHome();}
      catch(error){feedback(addStatus,error instanceof Error?error.message:"Could not add contact.",true);addSubmit.disabled=false;}
    });
    const heading=el("div","chale-list-heading");const chats=el("strong");chats.textContent="Chats";const count=el("small");heading.append(chats,count);
    const list=el("div","chale-contact-list");const listStatus=el("small","chale-feedback");
    shell.append(top,number,tools,addForm,heading,list,listStatus);appContent.append(shell);
    try{
      contactsCache=await loadChaleContacts(session);count.textContent=String(contactsCache.length);
      const draw=()=>{
        list.replaceChildren();const query=search.value.trim().toLowerCase();
        const rows=contactsCache.filter(c=>(c.display_name+" "+c.phone_number+" "+(c.last_message||"")).toLowerCase().includes(query));
        if(!rows.length){
          const empty=el("div","chale-empty");const symbol=el("div","chale-empty-mark");symbol.textContent=query?"⌕":"C";
          const title=el("strong");title.textContent=query?"No matches found":"Your chats start here";
          const copy=el("p");copy.textContent=query?"Try another name or Chale number.":"Add a player's Chale number. You can chat when you have both saved each other's number.";
          empty.append(symbol,title,copy);list.append(empty);return;
        }
        for(const contact of rows){
          const item=btn("","chale-contact-row");const avatar=el("span","chale-avatar");avatar.textContent=initials(contact.display_name);
          const text=el("span","chale-contact-copy");const first=el("span","chale-contact-firstline");
          const name=el("strong");name.textContent=contact.display_name;const date=el("small");
          date.textContent=contact.last_message_at?new Date(contact.last_message_at).toLocaleDateString([],{day:"numeric",month:"short"}):"";
          first.append(name,date);const preview=el("span","chale-contact-preview");
          preview.textContent=contact.is_mutual?(contact.last_message||"Start a private conversation"):"Waiting for them to save your number";
          text.append(first,preview);const state=el("span",contact.is_mutual?"chale-online-dot":"chale-pending");
          if(!contact.is_mutual)state.textContent="Pending";
          item.append(avatar,text,state);item.disabled=!contact.is_mutual;
          item.addEventListener("click",()=>{if(contact.is_mutual)void renderConversation(contact);});list.append(item);
        }
      };
      search.addEventListener("input",draw);draw();
    }catch(error){feedback(listStatus,error instanceof Error?error.message:"Could not load contacts.",true);}
  };

  const renderConversation = async (contact:ChaleContact) => {
    if(!appContent||!session)return;activeContact=contact;appContent.replaceChildren();
    const chat=el("div","chale-chat-screen");const header=el("div","chale-chat-topbar");
    const back=btn("‹","chale-icon-btn");back.setAttribute("aria-label","Back to chats");back.addEventListener("click",()=>{void renderHome();});
    const avatar=el("span","chale-avatar");avatar.textContent=initials(contact.display_name);
    const identity=el("div","chale-chat-identity");const name=el("strong");name.textContent=contact.display_name;
    const number=el("small");number.textContent=contact.phone_number;identity.append(name,number);
    const block=btn("⋮","chale-icon-btn");block.setAttribute("aria-label","Conversation options");
    const messages=el("div","chale-messages");const status=el("small","chale-feedback");
    const form=el("form","chale-composer") as HTMLFormElement;const input=el("textarea") as HTMLTextAreaElement;
    input.placeholder="Message";input.maxLength=2000;input.rows=1;input.required=true;input.autocomplete="off";
    const send=btn("➤","chale-send") as HTMLButtonElement;send.type="submit";send.setAttribute("aria-label","Send message");
    form.append(input,send);header.append(back,avatar,identity,block);chat.append(header,messages,status,form);appContent.append(chat);
    block.addEventListener("click",async()=>{
      if(!session||!window.confirm("Block "+contact.display_name+"? They will no longer be able to contact you through Chale."))return;
      block.disabled=true;try{await blockChalePlayer(session,contact.contact_id);await renderHome();}
      catch(error){feedback(status,error instanceof Error?error.message:"Could not block player.",true);block.disabled=false;}
    });
    const loadMessages=async()=>{
      if(!session||activeContact?.contact_id!==contact.contact_id)return;
      messages.replaceChildren();
      try{
        const rows:ChaleMessage[]=await loadChaleMessages(session,contact.contact_id);
        if(!rows.length){const empty=el("p","chale-message-empty");empty.textContent="This is the beginning of your conversation with "+contact.display_name+".";messages.append(empty);}
        for(const row of rows){
          const bubble=el("article",row.sender_id===session.user.id?"chale-message mine":"chale-message");
          const body=el("p");body.textContent=row.body;const time=el("small");
          time.textContent=new Date(row.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
          bubble.append(body,time);messages.append(bubble);
        }
        messages.scrollTop=messages.scrollHeight;
      }catch(error){feedback(status,error instanceof Error?error.message:"Could not load messages.",true);}
    };
    await loadMessages();
    form.addEventListener("submit",async event=>{
      event.preventDefault();const body=input.value.trim();if(!body||!session||activeContact?.contact_id!==contact.contact_id)return;
      send.disabled=true;
      try{await sendChaleMessage(session,contact.contact_id,body);input.value="";feedback(status,"");await loadMessages();}
      catch(error){feedback(status,error instanceof Error?error.message:"Message could not be sent.",true);}
      finally{send.disabled=false;}
    });
    input.focus();
  };

  if(!session)renderAuth();else await initialiseChale();
}
let disposeWayGoApp: (() => void) | null = null;

async function openApp(name: string) {
  if (!unlocked || !appContent) return;
  const appKey = name.trim().toLowerCase();
  appContent.classList.remove("chale-app");
  disposeWayGoApp?.();
  disposeWayGoApp = null;
  if (appTitle) appTitle.textContent = name;
  appContent.replaceChildren();
  if (!unlocked || !appContent) return;
  if (appTitle) appTitle.textContent = name;
  appContent.replaceChildren();
  if (appKey === "chale" || appKey.startsWith("chale ")) {
    if (homeScreen) homeScreen.hidden = true;
    if (lockScreen) lockScreen.hidden = true;
    if (appView) appView.hidden = false;
    await openChaleApp();
    return;
  }
  if (appKey === "cedipay") {
    if (homeScreen) homeScreen.hidden = true;
    if (lockScreen) lockScreen.hidden = true;
    if (appView) appView.hidden = false;
    await openCediPayApp();
    return;
  }
  if (appKey === "akwantuo news") {
    if (homeScreen) homeScreen.hidden = true;
    if (lockScreen) lockScreen.hidden = true;
    if (appView) appView.hidden = false;
    await openNewsApp();
    return;
  }
  if (appKey === "waygo") {
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
