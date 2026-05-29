"use client";

type LocalUser = {
  id: string;
  email: string;
  companyName?: string;
  passwordHash: string;
  createdAt: string;
};

export type LocalSession = {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  companyName?: string;
  signedInAt: string;
};

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
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getLocalSession() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null") as LocalSession | null;
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
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function updateLocalSession(session: Partial<LocalSession>) {
  if (typeof window === "undefined") return;
  const current = getLocalSession();
  if (!current) return;
  const updated = { ...current, ...session };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
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
