import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { ALL_PLATFORM_ENV_KEYS, PLATFORM_SECRET_KEYS } from "@/lib/secrets/keys";

const CACHE_TTL_MS = 2 * 60 * 1000;
const STORAGE_BUCKET = "sentra-platform-secrets";
const STORAGE_OBJECT = "platform-env.json";

let overlay: Record<string, string> = {};
let loadedAt = 0;
let loadPromise: Promise<void> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let vaultBackend: "table" | "storage" | null = null;

function shouldLoadFromSupabase() {
  return isSupabaseConfigured() && Boolean(getSupabaseServiceRoleKey());
}

/** Read env with Supabase vault overlay (falls back to process.env). */
export function getPlatformEnv(key: string): string | undefined {
  const fromVault = overlay[key]?.trim();
  if (fromVault) return fromVault;
  const fromEnv = process.env[key]?.trim();
  return fromEnv || undefined;
}

export function getPlatformSecretsSource(): "supabase" | "env" | "mixed" {
  const secretKeys = [...PLATFORM_SECRET_KEYS];
  const fromVault = secretKeys.filter((key) => Boolean(overlay[key]?.trim())).length;
  const fromEnv = secretKeys.filter(
    (key) => !overlay[key]?.trim() && Boolean(process.env[key]?.trim()),
  ).length;

  if (fromVault > 0 && fromEnv === 0) return "supabase";
  if (fromEnv > 0 && fromVault === 0) return "env";
  if (fromVault > 0 && fromEnv > 0) return "mixed";
  return "env";
}

export function getPlatformVaultBackend() {
  return vaultBackend;
}

export function invalidatePlatformSecretsCache() {
  overlay = {};
  loadedAt = 0;
  vaultBackend = null;
}

async function fetchFromTable(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.from("platform_env").select("key, value");
  if (error) {
    if (/does not exist|relation.*platform_env|schema cache/i.test(error.message)) {
      return null;
    }
    throw error;
  }

  const next: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.key && row.value) next[row.key] = row.value;
  }
  return next;
}

async function fetchFromStorage(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(STORAGE_OBJECT);
  if (error) {
    if (/not found|does not exist/i.test(error.message)) return null;
    throw error;
  }

  const text = await data.text();
  const parsed = JSON.parse(text) as Record<string, string>;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && value.trim()) next[key] = value.trim();
  }
  return next;
}

async function fetchFromSupabase() {
  const admin = createAdminClient();
  const fromTable = await fetchFromTable(admin);
  if (fromTable && Object.keys(fromTable).length > 0) {
    vaultBackend = "table";
    return fromTable;
  }

  const fromStorage = await fetchFromStorage(admin);
  if (fromStorage && Object.keys(fromStorage).length > 0) {
    vaultBackend = "storage";
    return fromStorage;
  }

  if (fromTable) {
    vaultBackend = "table";
    return fromTable;
  }

  return {};
}

export async function ensurePlatformSecrets(force = false) {
  if (!shouldLoadFromSupabase()) return;

  if (!force && Date.now() - loadedAt < CACHE_TTL_MS && Object.keys(overlay).length > 0) {
    return;
  }

  if (loadPromise) {
    await loadPromise;
    return;
  }

  loadPromise = (async () => {
    try {
      overlay = await fetchFromSupabase();
      loadedAt = Date.now();
    } catch (error) {
      console.error("[secrets] Failed to load vault from Supabase", error);
    } finally {
      loadPromise = null;
    }
  })();

  await loadPromise;
}

export function schedulePlatformSecretsRefresh() {
  if (refreshTimer || !shouldLoadFromSupabase()) return;
  refreshTimer = setInterval(() => {
    void ensurePlatformSecrets(true);
  }, CACHE_TTL_MS);
}

export async function upsertPlatformEnvEntries(
  entries: Array<{ key: string; value: string; kind?: "secret" | "config" }>,
) {
  const admin = createAdminClient();
  const map = Object.fromEntries(entries.map((entry) => [entry.key, entry.value]));

  const rows = entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
    kind: (PLATFORM_SECRET_KEYS as readonly string[]).includes(entry.key) ? "secret" : "config",
    updated_at: new Date().toISOString(),
  }));

  const { error: tableError } = await admin.from("platform_env").upsert(rows, { onConflict: "key" });
  if (!tableError) {
    vaultBackend = "table";
    invalidatePlatformSecretsCache();
    await ensurePlatformSecrets(true);
    return;
  }

  if (!/does not exist|relation.*platform_env|schema cache/i.test(tableError.message)) {
    throw tableError;
  }

  await admin.storage.createBucket(STORAGE_BUCKET, { public: false, fileSizeLimit: 102_400 });
  const body = JSON.stringify(map, null, 2);
  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(STORAGE_OBJECT, body, { upsert: true, contentType: "application/json" });

  if (uploadError) throw uploadError;
  vaultBackend = "storage";
  invalidatePlatformSecretsCache();
  await ensurePlatformSecrets(true);
}

export function collectEnvForSync() {
  const entries: Array<{ key: string; value: string; kind: "secret" | "config" }> = [];
  for (const key of ALL_PLATFORM_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    entries.push({
      key,
      value,
      kind: PLATFORM_SECRET_KEYS.includes(key as never) ? "secret" : "config",
    });
  }
  return entries;
}
