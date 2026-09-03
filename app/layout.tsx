import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/layout/Nav";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

// Plex Sans for UI/prose; Plex Mono for the numeric "tape" (rates, amounts,
// deltas). Both are exposed as CSS variables that globals.css/Tailwind consume.
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FXPulse — live currency, crypto & metals converter",
    template: "%s · FXPulse",
  },
  description:
    "Convert fiat, crypto and precious metals at live rates. Track history, compare pairs, pin favorites, keep a log, and set rate alerts.",
  applicationName: "FXPulse",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1013" },
  ],
};

/**
 * Runs before paint to set the theme class from the persisted setting, so the
 * page never flashes the wrong palette. ThemeApplier keeps it in sync after
 * hydration. Kept dependency-free and defensive (private mode / bad JSON).
 */
const NO_FLASH_THEME = `
(function(){try{
  var t = "system";
  var raw = localStorage.getItem("fxpulse:settings");
  if (raw) { var s = JSON.parse(raw); if (s && s.state && s.state.theme) t = s.state.theme; }
  var dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
} catch (e) {} })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <Nav />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-12">
              {children}
            </main>
            <MobileTabBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
