const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

export function validatePublicHttpsUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return { ok: false as const, error: "Invalid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false as const, error: "Only HTTPS URLs are allowed." };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    return { ok: false as const, error: "Local or internal URLs are not allowed." };
  }

  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    /^10\./.test(parsed.hostname) ||
    /^192\.168\./.test(parsed.hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname)
  ) {
    return { ok: false as const, error: "Private network URLs are not allowed." };
  }

  return { ok: true as const, url: parsed.toString() };
}
