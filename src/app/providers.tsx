"use client";

import { Toaster } from "sonner";
import { SettingsProvider } from "@/settings/settings-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <Toaster
        theme="dark"
        toastOptions={{
          className: "border-white/10 bg-sentra-panel/95 text-white backdrop-blur-xl",
        }}
      />
    </SettingsProvider>
  );
}
