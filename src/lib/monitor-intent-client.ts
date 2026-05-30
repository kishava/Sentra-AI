import { inferMonitorIntentHeuristically } from "@/lib/monitor-intent-heuristic";
import { readResponseJson } from "@/lib/http/read-response-json";
import type { MonitorIntent } from "@/types/intelligence";

/** Resolve monitor intent via AIML (server route) with client heuristic fallback. */
export async function fetchMonitorIntent(
  input: string,
  options?: { signal?: AbortSignal },
): Promise<MonitorIntent> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Describe what you want to watch.");
  }

  try {
    const response = await fetch("/api/monitor-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: options?.signal,
      body: JSON.stringify({ input: trimmed }),
    });
    const data = await readResponseJson<{ intent?: MonitorIntent; error?: string }>(response);

    if (response.ok && data.intent) {
      return data.intent;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
  }

  return inferMonitorIntentHeuristically(trimmed);
}
