import type { SupabaseClient } from "@supabase/supabase-js";
import {
  changeToSignal,
  compareSnapshots,
  extractStructuredFields,
  type ChangeDetectionResult,
} from "@/services/change-detection";
import {
  getLatestPageSnapshot,
  saveDetectedChangesDb,
  savePageSnapshotDb,
} from "@/lib/db/monitor-workspace";
import type { BrightDataCollectionMode, PageSnapshot } from "@/types/intelligence";

function extractUrls(evidence: string) {
  return Array.from(evidence.matchAll(/https?:\/\/[^\s"',)\\]+/gi)).map((match) => match[0]);
}

function hashContent(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

function inferBrightDataMode(evidence: string): BrightDataCollectionMode | undefined {
  const sections = evidence.split(/###\s+/);
  const section = sections[1] ?? sections[sections.length - 1] ?? "";
  const modeMatch = section.match(/\((serp|unlocker|scraper|browser|mcp)\)/i);
  return modeMatch ? (modeMatch[1].toLowerCase() as BrightDataCollectionMode) : undefined;
}

export async function runChangeDetectionWithDb({
  supabase,
  userId,
  monitorId,
  evidence,
  targetUrl,
}: {
  supabase: SupabaseClient;
  userId: string;
  monitorId: string;
  evidence: string;
  targetUrl?: string | null;
}): Promise<ChangeDetectionResult> {
  const urls = extractUrls(evidence);
  const url = targetUrl ?? urls[0] ?? "https://competitor.example/pricing";
  const fields = extractStructuredFields(evidence);
  const collectedAt = new Date().toISOString();
  const brightDataMode = inferBrightDataMode(evidence);

  const snapshot: PageSnapshot = {
    id: crypto.randomUUID(),
    monitorId,
    url,
    collectedAt,
    contentHash: hashContent(evidence),
    fields,
    rawExcerpt: evidence.slice(0, 800),
    brightDataMode,
  };

  const previousSnapshot = await getLatestPageSnapshot(supabase, userId, monitorId, url);
  const changes = compareSnapshots(previousSnapshot ?? undefined, snapshot, monitorId);

  await savePageSnapshotDb(supabase, userId, snapshot);
  if (changes.length) {
    await saveDetectedChangesDb(supabase, userId, changes);
  }

  return {
    snapshot,
    previousSnapshot: previousSnapshot ?? undefined,
    changes,
    changeSignals: changes.map(changeToSignal),
  };
}
