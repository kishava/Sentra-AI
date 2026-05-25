import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            className:
              "border-white/10 bg-sentra-panel/95 text-white backdrop-blur-xl",
          }}
        />
      </body>
    </html>
  );
}
