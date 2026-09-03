import { cn } from "@/lib/cn";

/** A shimmering placeholder block sized by className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      aria-hidden="true"
    />
  );
}
