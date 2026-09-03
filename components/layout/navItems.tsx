import type { ComponentType, SVGProps } from "react";
import {
  BellIcon,
  ChartIcon,
  CompareIcon,
  ConvertIcon,
  LogIcon,
  StarIcon,
} from "./icons";

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Primary destinations, in reading order. Labels name what the user does. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Convert", Icon: ConvertIcon },
  { href: "/compare", label: "Compare", Icon: CompareIcon },
  { href: "/charts", label: "Charts", Icon: ChartIcon },
  { href: "/favorites", label: "Favorites", Icon: StarIcon },
  { href: "/log", label: "Log", Icon: LogIcon },
  { href: "/alerts", label: "Alerts", Icon: BellIcon },
];

/** Active when the path equals the item, or is nested beneath a non-root item. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
