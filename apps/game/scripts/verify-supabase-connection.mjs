const projectUrl = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!projectUrl || !publishableKey) {
  throw new Error("AKWANTUO Supabase public configuration is required for CI.");
}

const parsedUrl = new URL(projectUrl);
if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "ugiysogfkclbcryhtkyn.supabase.co") {
  throw new Error("CI must connect only to the dedicated AKWANTUO Supabase project.");
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("AKWANTUO Supabase publishable key is missing or invalid.");
}

const authResponse = await fetch(`${projectUrl}/auth/v1/settings`, {
  headers: { apikey: publishableKey }
});
if (!authResponse.ok) {
  const detail = await authResponse.text();
  throw new Error(`AKWANTUO Supabase Auth endpoint returned ${authResponse.status}: ${detail.slice(0, 240)}`);
}
const settings = await authResponse.json();
if (!settings || typeof settings !== "object" || settings.disable_signup === true) {
  throw new Error("AKWANTUO Auth is unreachable or account registration is disabled.");
}

for (const table of ["player_wallets", "player_inventory", "game_transactions"]) {
  const response = await fetch(`${projectUrl}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: publishableKey }
  });
  if (response.ok) {
    throw new Error(`Anonymous access unexpectedly succeeded for protected table ${table}.`);
  }
  if (![401, 403].includes(response.status)) {
    const detail = await response.text();
    throw new Error(`Unexpected anonymous access response for ${table}: ${response.status} ${detail.slice(0, 160)}`);
  }
}

console.log("AKWANTUO Supabase Auth endpoint is reachable; sign-up is enabled; anonymous reads are denied on protected economy tables.");
