import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Global3DField } from "@/components/shared/global-3d-field";
import { Providers } from "@/app/providers";
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
    "Sentra AI transforms the live web into GTM intelligence using Bright Data, AI/ML API, and Speechmatics voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <Global3DField />
          {children}
        </Providers>
      </body>
    </html>
  );
}
