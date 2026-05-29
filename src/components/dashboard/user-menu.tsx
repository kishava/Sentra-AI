"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  LogOut,
  Pencil,
  Settings,
  User,
  X,
} from "lucide-react";
import type { UserResponse } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  getLocalSession,
  getUserProfile,
  saveUserProfile,
  signOutLocalAccount,
  updateLocalSession,
  type UserProfile,
} from "@/lib/local-auth";
import { getBrowserClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({});
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = (profile.displayName || label || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarSrc = profile.avatarUrl;

  useEffect(() => {
    const stored = getUserProfile();
    setProfile(stored);

    if (!isBrowserSupabaseConfigured()) {
      const session = getLocalSession();
      setLabel(session?.email ?? null);
      if (session?.displayName && !stored.displayName) {
        setProfile((p) => ({ ...p, displayName: session.displayName }));
      }
      if (session?.avatarUrl && !stored.avatarUrl) {
        setProfile((p) => ({ ...p, avatarUrl: session.avatarUrl }));
      }
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) return;

    void supabase.auth.getUser().then((result: UserResponse) => {
      const email = result.data.user?.email ?? result.data.user?.id ?? "Account";
      setLabel(email);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      setEditName(profile.displayName || "");
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, profile.displayName]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...profile, avatarUrl: dataUrl };
      setProfile(updated);
      saveUserProfile(updated);
      updateLocalSession({ avatarUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    const updated = { ...profile, avatarUrl: undefined };
    setProfile(updated);
    saveUserProfile(updated);
    updateLocalSession({ avatarUrl: undefined });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveProfile() {
    setSaving(true);
    const updated = { ...profile, displayName: editName.trim() || undefined };
    setProfile(updated);
    saveUserProfile(updated);
    updateLocalSession({ displayName: updated.displayName });
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    setOpen(false);
  }

  async function signOut() {
    if (!isBrowserSupabaseConfigured()) {
      signOutLocalAccount();
      router.push("/sign-up");
      router.refresh();
      return;
    }

    const supabase = getBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/sign-up");
    router.refresh();
  }

  if (!label) return null;

  return (
    <div className="relative hidden md:block">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex max-w-[200px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/60 transition hover:bg-white/[0.09]"
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sentra-cyan/20 text-[9px] font-semibold text-sentra-cyan">
            {initials}
          </span>
        )}
        <span className="truncate">{profile.displayName || label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 origin-top-right rounded-[28px] border border-white/10 bg-sentra-ink/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-white/10">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-white/[0.06] text-lg font-semibold text-white/40">
                        {initials}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100"
                    aria-label="Change profile picture"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {profile.displayName || "Your profile"}
                  </p>
                  <p className="truncate text-xs text-white/45">{label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-white/40 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {avatarSrc && (
              <button
                type="button"
                onClick={removeAvatar}
                className="mt-2 text-xs text-white/35 transition hover:text-red-300"
              >
                Remove picture
              </button>
            )}

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
                  Display name
                </label>
                <div className="relative">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-10 pl-9 text-sm"
                  />
                  <Pencil className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
                  Email
                </label>
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/40">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button
                variant="neon"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => void saveProfile()}
                disabled={saving}
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                asChild
              >
                <Link href="/settings">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </Link>
              </Button>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-xs text-white/45 transition hover:bg-white/[0.06] hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
