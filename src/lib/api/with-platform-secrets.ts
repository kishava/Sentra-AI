import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";

/** Load Supabase vault secrets before API handlers that call external providers. */
export async function withPlatformSecrets<T>(handler: () => Promise<T>): Promise<T> {
  await ensurePlatformSecrets();
  return handler();
}
