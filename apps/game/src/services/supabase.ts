import type { CharacterAppearance } from "../character/appearance";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ugiysogfkclbcryhtkyn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable__WFhhKIwP7yxOqaMNsy9pA_ZHY9xE3m";
const SESSION_KEY = "akwantuo.auth.session.v1";
const REFRESH_TIMEOUT_MS = 10_000;

export interface AkwantuoUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AkwantuoSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: AkwantuoUser;
}

export interface PlayerProfile {
  id: string;
  display_name: string;
  gender: "male" | "female";
  age: number | null;
  look: CharacterAppearance;
  game_save: Record<string, unknown>;
}

class SupabaseRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "SupabaseRequestError";
  }
}

function readStoredSession(): AkwantuoSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AkwantuoSession>;
    if (typeof value.access_token !== "string" || typeof value.refresh_token !== "string" ||
        !value.user || typeof value.user.id !== "string") {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return value as AkwantuoSession;
  } catch {
    return null;
  }
}

function storeSession(session: AkwantuoSession | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Authentication still works for this tab if persistent browser storage is unavailable.
  }
}

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers
    }
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.message === "string" ? payload.message
      : typeof payload.msg === "string" ? payload.msg
      : typeof payload.error_description === "string" ? payload.error_description
      : typeof payload.error === "string" ? payload.error
      : `Supabase request failed (${response.status})`;
    const code = typeof payload.error_code === "string" ? payload.error_code
      : typeof payload.code === "string" ? payload.code
      : typeof payload.error === "string" ? payload.error
      : undefined;
    throw new SupabaseRequestError(message, response.status, code);
  }
  return payload as T;
}

function isDefinitiveInvalidRefresh(error: unknown): boolean {
  if (!(error instanceof SupabaseRequestError) || error.status !== 400) return false;
  const reason = `${error.code ?? ""} ${error.message}`.toLowerCase();
  return reason.includes("refresh_token_not_found") ||
    reason.includes("invalid refresh token") ||
    reason.includes("refresh token not found");
}

function showOfflineAccountState(user: AkwantuoUser): void {
  // Startup can still enter the local game, but no expired access token is exposed
  // as an active session and authenticated cloud operations remain unavailable.
  document.documentElement.dataset.akwantuoAuthState = "offline";
  const accountStatus = document.querySelector<HTMLElement>("#account-status");
  if (accountStatus) {
    accountStatus.textContent = `Welcome back, ${user.email || "AKWANTUO player"}. You are offline; reconnect to restore cloud access.`;
  }
  const accountButton = document.querySelector<HTMLElement>("#account-button");
  if (accountButton) accountButton.innerHTML = "ACCOUNT <small>OFFLINE</small>";
  const signOutButton = document.querySelector<HTMLElement>("#account-signout");
  signOutButton?.classList.remove("is-hidden");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export async function getAkwantuoSession(): Promise<AkwantuoSession | null> {
  const session = readStoredSession();
  if (!session) {
    document.documentElement.dataset.akwantuoAuthState = "signed_out";
    return null;
  }
  if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000) + 60) {
    document.documentElement.dataset.akwantuoAuthState = "signed_in";
    return session;
  }
  if (!session.refresh_token) {
    storeSession(null);
    document.documentElement.dataset.akwantuoAuthState = "signed_out";
    return null;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const refreshed = await request<Omit<AkwantuoSession, "user"> & { user?: AkwantuoUser }>(
      "/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
        signal: controller.signal
      }
    );
    const nextSession = { ...refreshed, user: refreshed.user ?? session.user };
    storeSession(nextSession);
    document.documentElement.dataset.akwantuoAuthState = "signed_in";
    return nextSession;
  } catch (error) {
    if (isDefinitiveInvalidRefresh(error)) {
      storeSession(null);
      document.documentElement.dataset.akwantuoAuthState = "signed_out";
      return null;
    }
    // Network errors, timeouts, rate limits and server errors do not prove that
    // the refresh credential is invalid. Retain it for a later retry, but never
    // return or use the possibly expired access token.
    showOfflineAccountState(session.user);
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function signInAkwantuo(email: string, password: string): Promise<AkwantuoSession> {
  const session = await request<AkwantuoSession>(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }
  );
  storeSession(session);
  document.documentElement.dataset.akwantuoAuthState = "signed_in";
  return session;
}

export async function signUpAkwantuo(email: string, password: string, displayName: string): Promise<{ session: AkwantuoSession | null; confirmationRequired: boolean }> {
  const result = await request<{ access_token?: string; refresh_token?: string; expires_at?: number; user: AkwantuoUser }>(
    "/auth/v1/signup",
    { method: "POST", body: JSON.stringify({ email: email.trim(), password, data: { display_name: displayName.trim() } }) }
  );
  if (!result.access_token || !result.refresh_token) {
    return { session: null, confirmationRequired: true };
  }
  const session: AkwantuoSession = {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: result.expires_at,
    user: result.user
  };
  storeSession(session);
  document.documentElement.dataset.akwantuoAuthState = "signed_in";
  return { session, confirmationRequired: false };
}

export async function signOutAkwantuo(): Promise<void> {
  const session = readStoredSession();
  try {
    if (session?.access_token && (!session.expires_at || session.expires_at > Math.floor(Date.now() / 1000))) {
      await request<unknown>("/auth/v1/logout", { method: "POST" }, session.access_token);
    }
  } finally {
    storeSession(null);
    document.documentElement.dataset.akwantuoAuthState = "signed_out";
  }
}

export async function loadPlayerProfile(session: AkwantuoSession): Promise<PlayerProfile | null> {
  const rows = await request<PlayerProfile[]>(
    `/rest/v1/player_profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,display_name,gender,age,look,game_save`,
    { method: "GET" },
    session.access_token
  );
  return rows[0] ?? null;
}

export async function savePlayerProfile(
  session: AkwantuoSession,
  appearance: CharacterAppearance,
  displayName?: string
): Promise<void> {
  const payload = {
    id: session.user.id,
    display_name: displayName?.trim() || String(session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Citizen"),
    gender: appearance.presentation === "feminine" ? "female" : "male",
    age: appearance.age,
    look: appearance,
    game_save: { schema_version: 1, last_saved_at: new Date().toISOString() }
  };
  await request<unknown>(
    "/rest/v1/player_profiles?on_conflict=id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(payload)
    },
    session.access_token
  );
}

export interface EconomyState {
  wallet: { balance_pesewas: number } | null;
  inventory: Array<{ product_id: string; name: string; quantity: number }>;
  owned_assets: Array<{ asset_id: string; name: string; asset_type: string; purchased_at: string }>;
}

export interface ShopProductRecord {
  product_id: string;
  name: string;
  category: string;
  price_pesewas: number;
  stock_quantity: number;
}

export async function loadEconomyState(session: AkwantuoSession): Promise<EconomyState> {
  return request<EconomyState>("/rest/v1/rpc/akwantuo_get_economy_state", {
    method: "POST",
    body: "{}"
  }, session.access_token);
}

export async function loadShopProducts(session: AkwantuoSession): Promise<ShopProductRecord[]> {
  return request<ShopProductRecord[]>(
    "/rest/v1/shop_products?select=product_id,name,category,price_pesewas,stock_quantity&order=category,name",
    { method: "GET" },
    session.access_token
  );
}

export async function purchaseShopItems(
  session: AkwantuoSession,
  items: Array<{ product_id: string; quantity: number }>
): Promise<{ transaction_id: number; total_pesewas: number; balance_pesewas: number; items: unknown[] }> {
  return request("/rest/v1/rpc/akwantuo_purchase_retail", {
    method: "POST",
    body: JSON.stringify({ p_items: items })
  }, session.access_token);
}

export async function purchaseGameAsset(
  session: AkwantuoSession,
  assetId: string
): Promise<{ owned_asset_id: number; asset_id: string; name: string; price_pesewas: number; balance_pesewas: number }> {
  return request("/rest/v1/rpc/akwantuo_purchase_asset", {
    method: "POST",
    body: JSON.stringify({ p_asset_id: assetId })
  }, session.access_token);
}
