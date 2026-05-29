"use client";

type LocalUser = {
  id: string;
  email: string;
  companyName?: string;
  passwordHash: string;
  createdAt: string;
};

/** Session payload — keep small (no avatars; those live in PROFILE_KEY). */
export type LocalSession = {
  userId: string;
  email: string;
  displayName?: string;
  companyName?: string;
  signedInAt: string;
};

const SESSION_MAX_BYTES = 4_096;

const USERS_KEY = "sentra-local-users";
const SESSION_KEY = "sentra-local-session";
const GUIDE_KEY = "sentra-new-user-guide";
const PROFILE_KEY = "sentra-user-profile";

export type UserProfile = {
  displayName?: string;
  avatarUrl?: string;
};

function getUsers() {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) || "[]") as LocalUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: LocalUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(email: string, password: string) {
  const source = `${email.trim().toLowerCase()}:${password}`;
  const encoded = new TextEncoder().encode(source);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createLocalAccount({
  email,
  password,
  companyName,
}: {
  email: string;
  password: string;
  companyName?: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter your email.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const users = getUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("A local account already exists for this email.");
  }

  const user: LocalUser = {
    id: window.crypto.randomUUID(),
    email: normalizedEmail,
    companyName: companyName?.trim() || undefined,
    passwordHash: await hashPassword(normalizedEmail, password),
    createdAt: new Date().toISOString(),
  };
  saveUsers([user, ...users]);
  markNewUserGuidePending();

  return signInLocalAccount({ email: normalizedEmail, password });
}

export async function signInLocalAccount({ email, password }: { email: string; password: string }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUsers().find((item) => item.email === normalizedEmail);
  if (!user) throw new Error("No local account found for this email.");

  const passwordHash = await hashPassword(normalizedEmail, password);
  if (passwordHash !== user.passwordHash) {
    throw new Error("Incorrect local password.");
  }

  const session: LocalSession = {
    userId: user.id,
    email: user.email,
    companyName: user.companyName,
    signedInAt: new Date().toISOString(),
  };
  writeSession(session);
  return session;
}

function parseSession(raw: string | null): LocalSession | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as LocalSession & { avatarUrl?: string };
  if (parsed.avatarUrl) {
    delete parsed.avatarUrl;
  }
  return parsed;
}

function writeSession(session: LocalSession) {
  const payload = JSON.stringify(session);
  if (payload.length > SESSION_MAX_BYTES) {
    throw new Error("Session data is too large.");
  }
  window.localStorage.setItem(SESSION_KEY, payload);
}

/** Moves legacy avatar blobs out of session and trims bloated storage. */
export function repairLocalStorageQuota() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return;

    const legacy = JSON.parse(raw) as LocalSession & { avatarUrl?: string };
    if (legacy.avatarUrl) {
      const profile = getUserProfile();
      if (!profile.avatarUrl && legacy.avatarUrl.length <= 200_000) {
        saveUserProfile({ ...profile, avatarUrl: legacy.avatarUrl });
      }
      const session: LocalSession = {
        userId: legacy.userId,
        email: legacy.email,
        displayName: legacy.displayName,
        companyName: legacy.companyName,
        signedInAt: legacy.signedInAt,
      };
      writeSession(session);
    }
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export function getLocalSession() {
  if (typeof window === "undefined") return null;

  try {
    return parseSession(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function signOutLocalAccount() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(PROFILE_KEY) || "{}") as UserProfile;
  } catch {
    return {};
  }
}

export function saveUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify(profile);
  if (payload.length > 150_000) {
    throw new Error("Profile image is too large. Try a smaller photo.");
  }

  try {
    window.localStorage.setItem(PROFILE_KEY, payload);
  } catch {
    throw new Error("Browser storage is full. Remove your profile picture and try again.");
  }
}

export function updateLocalSession(session: Partial<LocalSession>) {
  if (typeof window === "undefined") return;
  const current = getLocalSession();
  if (!current) return;
  const updated = { ...current, ...session };
  writeSession(updated);
}

export function markNewUserGuidePending() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUIDE_KEY, "pending");
}

export function shouldShowNewUserGuide() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GUIDE_KEY) === "pending";
}

export function closeNewUserGuide() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(GUIDE_KEY, "closed");
}

export function skipNewUserGuide() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUIDE_KEY, "skipped");
}

export function completeNewUserGuide() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUIDE_KEY, "completed");
}

export function wasNewUserGuideClosedThisSession() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(GUIDE_KEY) === "closed";
}
