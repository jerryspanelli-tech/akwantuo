const projectUrl = process.env.VITE_SUPABASE_URL || "https://fktvbxmgseojcvztheqz.supabase.co";
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4oyGhQ6mUqtEXocFiqq2FA_GvFpSOuC";

if (!projectUrl.startsWith("https://") || !publishableKey.startsWith("sb_publishable_")) {
  throw new Error("AKWANTUO Supabase public configuration is missing or invalid.");
}

const response = await fetch(`${projectUrl}/auth/v1/settings`, {
  headers: { apikey: publishableKey }
});

if (!response.ok) {
  const detail = await response.text();
  throw new Error(`AKWANTUO Supabase Auth endpoint returned ${response.status}: ${detail.slice(0, 240)}`);
}

const settings = await response.json();
if (!settings || typeof settings !== "object") {
  throw new Error("AKWANTUO Supabase Auth endpoint returned an invalid settings payload.");
}

console.log("AKWANTUO Supabase Auth endpoint is reachable and accepts the project's publishable key.");
