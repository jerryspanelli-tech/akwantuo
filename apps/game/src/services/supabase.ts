import type { CharacterAppearance } from "../character/appearance";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
const EXPECTED_SUPABASE_HOST = "ugiysogfkclbcryhtkyn.supabase.co";
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

type AuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: AkwantuoUser;
};

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

function normalizeSession(result: AuthTokenResponse, fallbackUser?: AkwantuoUser): AkwantuoSession {
  const user = result.user ?? fallbackUser;
  if (!result.access_token || !result.refresh_token || !user) {
    throw new Error("AKWANTUO Auth returned an incomplete session. Please sign in again.");
  }
  const expiresAt = typeof result.expires_at === "number"
    ? result.expires_at
    : typeof result.expires_in === "number"
      ? Math.floor(Date.now() / 1000) + result.expires_in
      : undefined;
  return {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: expiresAt,
    user
  };
}

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("AKWANTUO online services are not configured yet. Connect a dedicated AKWANTUO Supabase project first.");
  }

  let bearerToken = accessToken;
  if (accessToken && readStoredSession()) {
    const currentSession = await getAkwantuoSession();
    if (!currentSession) {
      throw new Error("Your AKWANTUO session has expired. Please sign in again.");
    }
    bearerToken = currentSession.access_token;
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
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
  if (!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) return false;
  try {
    const url = new URL(SUPABASE_URL);
    return url.protocol === "https:" && url.hostname === EXPECTED_SUPABASE_HOST;
  } catch {
    return false;
  }
}

let refreshInFlight: Promise<AkwantuoSession | null> | null = null;

export async function getAkwantuoSession(): Promise<AkwantuoSession | null> {
  const session = readStoredSession();
  if (!session) return null;
  if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  if (!session.refresh_token) {
    storeSession(null);
    return null;
  }

  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refreshed = await request<AuthTokenResponse>(
        "/auth/v1/token?grant_type=refresh_token",
        { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) }
      );
      const nextSession = normalizeSession(refreshed, session.user);
      storeSession(nextSession);
      return nextSession;
    } catch {
      storeSession(null);
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function signInAkwantuo(email: string, password: string): Promise<AkwantuoSession> {
  const result = await request<AuthTokenResponse>(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }
  );
  const session = normalizeSession(result);
  storeSession(session);
  return session;
}

export async function signUpAkwantuo(email: string, password: string, displayName: string): Promise<{ session: AkwantuoSession | null; confirmationRequired: boolean }> {
  const redirectTo = encodeURIComponent(window.location.origin);
  const result = await request<AuthTokenResponse>(
    `/auth/v1/signup?redirect_to=${redirectTo}`,
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password, data: { display_name: displayName.trim() } })
    }
  );
  if (!result.access_token || !result.refresh_token) {
    if (!result.user?.id) {
      throw new Error("AKWANTUO Auth did not return a user record for the new account.");
    }
    return { session: null, confirmationRequired: true };
  }
  const session = normalizeSession(result);
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
    look: appearance
    // Deliberately do not write game_save here. Character-editor saves must
    // never overwrite persistent world progress with placeholder metadata.
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
