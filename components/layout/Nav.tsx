"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActivePath } from "./navItems";
import { LiveStatus } from "./LiveStatus";
import { ThemeToggle } from "./ThemeToggle";
import { AlertBadge } from "./AlertBadge";

/** Gold mark: a rhombus holding a rate "pulse" waveform — the app's heartbeat. */
function BrandMark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-lg"
      aria-label="FXPulse — home"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="text-brand">
        <path d="M12 1.5 22.5 12 12 22.5 1.5 12Z" fill="currentColor" opacity="0.16" />
        <path
          d="M3.5 12h3l1.8-4.2L11 16.5l1.8-6 1.7 3.3h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-fg">FXPulse</span>
    </Link>
  );
}

/** Sticky top bar: brand, primary nav (desktop), live status and theme toggle. */
export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <BrandMark />

        <nav className="ml-4 hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-brand")} />
                {label}
                {href === "/alerts" && <AlertBadge className="ml-0.5" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LiveStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
