import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Global3DField } from "@/components/shared/global-3d-field";
import { SettingsProvider } from "@/settings/settings-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Sentra AI | Autonomous Enterprise Intelligence",
  description:
    "Sentra AI transforms the live web into autonomous enterprise intelligence using Bright Data, OpenAI, and voice AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SettingsProvider>
          <Global3DField />
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              className:
                "border-white/10 bg-sentra-panel/95 text-white backdrop-blur-xl",
            }}
          />
        </SettingsProvider>
      </body>
    </html>
  );
}
