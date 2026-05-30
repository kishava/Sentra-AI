export const LOCAL_SESSION_COOKIE = "sentra-local-session";

export type LocalSessionPayload = {
  userId: string;
  email: string;
  displayName?: string;
  companyName?: string;
  signedInAt: string;
};

export function parseLocalSessionCookie(value: string | undefined | null): LocalSessionPayload | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as LocalSessionPayload;
    if (!parsed.userId || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeLocalSessionCookie(session: LocalSessionPayload) {
  return encodeURIComponent(JSON.stringify(session));
}
