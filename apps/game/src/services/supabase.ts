import type { CharacterAppearance } from "../character/appearance";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zqdxorjlmwaqyxtguqpb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_gjoKeAb488wlfNVywbG36Q_GtoUjdAQ";
const SESSION_KEY = "akwantuo.auth.session.v1";

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

function readStoredSession(): AkwantuoSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as AkwantuoSession : null;
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
    throw new Error(message);
  }
  return payload as T;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export async function getAkwantuoSession(): Promise<AkwantuoSession | null> {
  const session = readStoredSession();
  if (!session) return null;
  if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  if (!session.refresh_token) {
    storeSession(null);
    return null;
  }
  try {
    const refreshed = await request<Omit<AkwantuoSession, "user"> & { user?: AkwantuoUser }>(
      "/auth/v1/token?grant_type=refresh_token",
      { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) }
    );
    const nextSession = { ...refreshed, user: refreshed.user ?? session.user };
    storeSession(nextSession);
    return nextSession;
  } catch {
    storeSession(null);
    return null;
  }
}

export async function signInAkwantuo(email: string, password: string): Promise<AkwantuoSession> {
  const session = await request<AkwantuoSession>(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }
  );
  storeSession(session);
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
  return { session, confirmationRequired: false };
}

export async function signOutAkwantuo(): Promise<void> {
  const session = readStoredSession();
  try {
    if (session?.access_token) {
      await request<unknown>("/auth/v1/logout", { method: "POST" }, session.access_token);
    }
  } finally {
    storeSession(null);
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
