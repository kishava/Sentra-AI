import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

type RateLimitConfig = {
  action: string;
  limit: number;
  windowMs: number;
};

const LIMITS: Record<string, RateLimitConfig> = {
  chat: { action: "chat", limit: 30, windowMs: 60 * 60 * 1000 },
  intelligence: { action: "intelligence", limit: 15, windowMs: 24 * 60 * 60 * 1000 },
  monitor_check: { action: "monitor_check", limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  transcribe: { action: "transcribe", limit: 40, windowMs: 60 * 60 * 1000 },
  voice: { action: "voice", limit: 40, windowMs: 60 * 60 * 1000 },
};

function getWindowStart(windowMs: number) {
  const now = Date.now();
  const start = new Date(Math.floor(now / windowMs) * windowMs);
  return start.toISOString();
}

export async function checkRateLimit(userId: string, key: keyof typeof LIMITS) {
  const config = LIMITS[key];
  if (!config) return { allowed: true as const };

  if (!getSupabaseServiceRoleKey()) {
    return { allowed: true as const };
  }

  const windowStart = getWindowStart(config.windowMs);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("api_usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("action", config.action)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (existing && existing.count >= config.limit) {
    return {
      allowed: false as const,
      message: `Rate limit reached for ${config.action}. Try again later.`,
    };
  }

  if (existing) {
    await admin
      .from("api_usage")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);
  } else {
    await admin.from("api_usage").insert({
      user_id: userId,
      action: config.action,
      window_start: windowStart,
      count: 1,
    });
  }

  return { allowed: true as const };
}
