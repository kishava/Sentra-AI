import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sentra: {
          cyan: "#53f4ff",
          blue: "#6272ff",
          violet: "#a855f7",
          pink: "#ff4fd8",
          green: "#4ade80",
          amber: "#fbbf24",
          ink: "#050712",
          panel: "#0b1020",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"SF Pro Display\"",
          "\"SF Pro Text\"",
          "var(--font-inter)",
          "Inter",
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"SF Pro Display\"",
          "\"SF Pro Text\"",
          "var(--font-inter)",
          "Inter",
          "sans-serif",
        ],
        ui: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"SF Pro Display\"",
          "\"SF Pro Text\"",
          "var(--font-inter)",
          "Inter",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 14px 38px rgba(37, 111, 235, 0.18), 0 1px 1px rgba(255, 255, 255, 0.08) inset",
        "violet-glow": "0 16px 44px rgba(113, 107, 255, 0.22)",
      },
      backgroundImage: {
        "radial-grid":
          "radial-gradient(circle at center, rgba(83,244,255,0.12) 0, transparent 34%), linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
        "aurora":
          "radial-gradient(circle at 20% 20%, rgba(83,244,255,0.2), transparent 28%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.22), transparent 28%), radial-gradient(circle at 50% 80%, rgba(255,79,216,0.16), transparent 30%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.75", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(18px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(18px) rotate(-360deg)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-glow": "pulseGlow 3.2s ease-in-out infinite",
        orbit: "orbit 8s linear infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
