"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Asset, AssetKind } from "@/types/asset";
import { parseId } from "@/lib/assets/ids";
import { cn } from "@/lib/cn";
import { ChevronDownIcon, SearchIcon } from "@/components/layout/icons";

const KIND_LABEL: Record<AssetKind, string> = {
  fiat: "Fiat",
  crypto: "Crypto",
  metal: "Metals",
};
const KIND_ORDER: AssetKind[] = ["fiat", "crypto", "metal"];

/** Flag emoji when available, otherwise a monogram chip tinted by kind. */
export function AssetGlyph({ asset, symbol }: { asset?: Asset; symbol: string }) {
  if (asset?.flag) {
    return (
      <span className="text-base leading-none" aria-hidden="true">
        {asset.flag}
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted"
      aria-hidden="true"
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

function symbolOf(id: string, asset?: Asset): string {
  return asset?.symbol ?? parseId(id).upstreamId;
}

interface AssetSelectProps {
  assets: Asset[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
  /** Popover alignment relative to the trigger. */
  align?: "left" | "right";
  /** Accessible label for the trigger, e.g. "Base currency". */
  label?: string;
}

/**
 * Searchable, grouped asset picker across fiat / crypto / metals. Implemented
 * as a combobox: the trigger opens a popover with a filter input and a listbox;
 * arrow keys move, Enter selects, Escape closes, click-outside dismisses.
 */
export function AssetSelect({
  assets,
  value,
  onChange,
  loading,
  align = "left",
  label,
}: AssetSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const byId = useMemo(() => {
    const m = new Map<string, Asset>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);
  const selected = byId.get(value);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (a: Asset) =>
      !q ||
      a.symbol.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q);
    const out: Record<AssetKind, Asset[]> = { fiat: [], crypto: [], metal: [] };
    for (const a of assets) if (match(a)) out[a.kind].push(a);
    return out;
  }, [assets, query]);

  const flat = useMemo(
    () => KIND_ORDER.flatMap((k) => groups[k]),
    [groups],
  );

  // Keep the highlighted option in range as the filter narrows.
  useEffect(() => {
    setActiveIndex((i) => Math.min(Math.max(i, 0), Math.max(flat.length - 1, 0)));
  }, [flat.length]);

  // On open: focus the filter and highlight the current selection.
  useEffect(() => {
    if (!open) return;
    const idx = flat.findIndex((a) => a.id === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dismiss on outside pointer.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Scroll the active option into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const commit = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = flat[activeIndex];
      if (a) commit(a.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(flat.length - 1);
    }
  };

  const optionId = (id: string) => `${listboxId}-${id.replace(/[:]/g, "-")}`;
  const activeAsset = flat[activeIndex];

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `${label}: ${symbolOf(value, selected)}` : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <AssetGlyph asset={selected} symbol={symbolOf(value, selected)} />
        <span className="tabular">{symbolOf(value, selected)}</span>
        <ChevronDownIcon
          className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-panel",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeAsset ? optionId(activeAsset.id) : undefined}
              placeholder="Search currency, crypto, metal…"
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted"
            />
          </div>

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Assets"
            className="max-h-72 overflow-y-auto py-1"
          >
            {flat.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                No assets match “{query}”.
              </li>
            )}

            {KIND_ORDER.map((kind) => {
              const items = groups[kind];
              if (items.length === 0) return null;
              return (
                <li key={kind} role="presentation">
                  <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">
                    {KIND_LABEL[kind]}
                  </p>
                  <ul role="presentation">
                    {items.map((a) => {
                      const idx = flat.indexOf(a);
                      const isActive = idx === activeIndex;
                      const isSelected = a.id === value;
                      return (
                        <li
                          key={a.id}
                          id={optionId(a.id)}
                          role="option"
                          aria-selected={isSelected}
                          data-active={isActive}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => commit(a.id)}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm",
                            isActive ? "bg-surface-2" : "hover:bg-surface-2/60",
                          )}
                        >
                          <AssetGlyph asset={a} symbol={a.symbol} />
                          <span className="font-semibold tabular text-fg">{a.symbol}</span>
                          <span className="truncate text-muted">{a.name}</span>
                          {isSelected && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
