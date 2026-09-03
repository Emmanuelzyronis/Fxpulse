import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "./EmptyState";

/**
 * Honest placeholder for sections that land in a later milestone. It describes
 * what the section will do rather than claiming there's no data (favorites and
 * the log already persist from the converter), and points back to a live area.
 */
export function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={icon}
      action={
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-fg px-3.5 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Open the converter
        </Link>
      }
    />
  );
}
