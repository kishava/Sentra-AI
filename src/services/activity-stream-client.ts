import type { ActivityStreamEvent } from "@/types/activity-console";

export async function streamWorldActivity(
  query: string,
  onEvent: (event: ActivityStreamEvent) => void,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/world-engine/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error((await response.text().catch(() => "")) || "Unable to open activity stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const packets = buffer.split("\n\n");
    buffer = packets.pop() ?? "";
    packets.forEach((packet) => {
      const data = packet
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6);
      if (data) onEvent(JSON.parse(data) as ActivityStreamEvent);
    });
  }
}
