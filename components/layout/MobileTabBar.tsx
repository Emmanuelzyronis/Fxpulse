"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActivePath } from "./navItems";
import { AlertBadge } from "./AlertBadge";

/** Fixed bottom navigation for small screens; mirrors the desktop top nav. */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active ? "text-brand" : "text-muted")} />
                  {href === "/alerts" && (
                    <AlertBadge className="absolute -right-2.5 -top-1.5" />
                  )}
                </span>
                <span className={active ? "text-fg" : "text-muted"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
