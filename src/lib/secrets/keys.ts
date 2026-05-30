/** Keys stored in Supabase platform_env (server-only vault). */
export const PLATFORM_SECRET_KEYS = [
  "AIML_API_KEY",
  "FEATHERLESS_API_KEY",
  "BRIGHT_DATA_API_KEY",
  "BRIGHT_DATA_MANAGEMENT_KEY",
  "SPEECHMATICS_API_KEY",
] as const;

/** Non-secret provider config — optional in vault; env still works. */
export const PLATFORM_CONFIG_KEYS = [
  "BRIGHT_DATA_SERP_ZONE",
  "BRIGHT_DATA_WEB_UNLOCKER_ZONE",
  "BRIGHT_DATA_SCRAPER_ZONE",
  "BRIGHT_DATA_BROWSER_ZONE",
  "BRIGHT_DATA_SERP_ENDPOINT",
  "BRIGHT_DATA_WEB_UNLOCKER_ENDPOINT",
  "BRIGHT_DATA_SCRAPER_ENDPOINT",
  "BRIGHT_DATA_BROWSER_ENDPOINT",
  "BRIGHT_DATA_STUDIO_COLLECTOR_ID",
  "BRIGHT_DATA_MCP_URL",
  "BRIGHT_DATA_MCP_GROUPS",
  "BRIGHT_DATA_CACHE_TTL_SECONDS",
  "AIML_BASE_URL",
  "FEATHERLESS_BASE_URL",
  "SPEECHMATICS_TTS_URL",
  "SPEECHMATICS_TTS_VOICE",
] as const;

export type PlatformSecretKey = (typeof PLATFORM_SECRET_KEYS)[number];
export type PlatformConfigKey = (typeof PLATFORM_CONFIG_KEYS)[number];
export type PlatformEnvKey = PlatformSecretKey | PlatformConfigKey;

export const ALL_PLATFORM_ENV_KEYS: PlatformEnvKey[] = [
  ...PLATFORM_SECRET_KEYS,
  ...PLATFORM_CONFIG_KEYS,
];
