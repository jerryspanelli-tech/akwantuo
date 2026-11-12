const projectUrl = process.env.VITE_SUPABASE_URL || "https://ugiysogfkclbcryhtkyn.supabase.co";
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable__WFhhKIwP7yxOqaMNsy9pA_ZHY9xE3m";

if (!projectUrl.startsWith("https://") || !publishableKey.startsWith("sb_publishable_")) {
  throw new Error("AKWANTUO Supabase public configuration is missing or invalid.");
}

const endpoint = `${projectUrl.replace(/\/$/, "")}/auth/v1/settings`;
const maxAttempts = 3;
let lastError;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const response = await fetch(endpoint, {
      headers: { apikey: publishableKey, Accept: "application/json" },
      signal: AbortSignal.timeout(12000)
    });

    if (response.ok) {
      const settings = await response.json();
      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        throw new Error("AKWANTUO Supabase Auth endpoint returned an invalid settings payload.");
      }
      console.log(`AKWANTUO Supabase Auth is reachable (HTTP ${response.status}); publishable key accepted.`);
      process.exit(0);
    }

    const detail = (await response.text()).slice(0, 240);
    const error = new Error(`AKWANTUO Supabase Auth returned HTTP ${response.status}: ${detail}`);
    if (response.status < 500 && response.status !== 429) throw error;
    lastError = error;
  } catch (error) {
    if (error instanceof Error && /HTTP 4\d\d/.test(error.message) && !/HTTP 429/.test(error.message)) throw error;
    lastError = error;
  }

  if (attempt < maxAttempts) {
    const delayMs = attempt * 2000;
    console.warn(`Supabase connectivity attempt ${attempt}/${maxAttempts} failed; retrying in ${delayMs / 1000}s.`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

throw new Error(`AKWANTUO Supabase Auth connectivity failed after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
