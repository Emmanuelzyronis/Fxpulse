"use client";

import { useId } from "react";
import type { Asset } from "@/types/asset";
import { cn } from "@/lib/cn";
import { AssetSelect } from "./AssetSelect";

interface MoneyFieldProps {
  label: string;
  assets: Asset[];
  assetId: string;
  onAssetChange: (id: string) => void;
  loadingAssets?: boolean;
  align?: "left" | "right";
  /** Read-only fields show a formatted result instead of an input. */
  readOnly?: boolean;
  /** Editable value (raw string). */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Commit hook for editable fields (Enter / blur). */
  onCommit?: () => void;
  /** Formatted text for read-only fields. */
  display?: string;
  autoFocus?: boolean;
  /** Highlight the field border in error red when the value is not a valid number. */
  isInvalid?: boolean;
}

/**
 * One side of the converter: a label, a large monospaced number (editable or a
 * read-only result), and the asset picker. The number is the loud element; the
 * chrome around it stays quiet.
 */
export function MoneyField({
  label,
  assets,
  assetId,
  onAssetChange,
  loadingAssets,
  align = "left",
  readOnly = false,
  value = "",
  onValueChange,
  onCommit,
  display,
  autoFocus,
  isInvalid = false,
}: MoneyFieldProps) {
  const inputId = useId();

  return (
    <div className={cn(
      "rounded-2xl border bg-surface p-3 shadow-panel sm:p-4 transition-colors",
      isInvalid ? "border-down/60" : "border-border",
    )}>
      <label
        htmlFor={readOnly ? undefined : inputId}
        className="block text-xs font-medium text-muted"
      >
        {label}
      </label>

      <div className="mt-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        {readOnly ? (
          <output
            className={cn(
              "min-w-0 flex-1 truncate font-mono text-2xl font-medium tabular text-fg sm:text-3xl",
              !display && "text-muted",
            )}
            aria-live="polite"
          >
            {display || "—"}
          </output>
        ) : (
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => onValueChange?.(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={onCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
                onCommit?.();
              }
            }}
            placeholder="0"
            aria-invalid={isInvalid || undefined}
            className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-medium tabular text-fg outline-none placeholder:text-muted/60 sm:text-3xl"
          />
        )}

        <AssetSelect
          assets={assets}
          value={assetId}
          onChange={onAssetChange}
          loading={loadingAssets}
          align={align}
          label={label}
        />
      </div>
    </div>
  );
}
