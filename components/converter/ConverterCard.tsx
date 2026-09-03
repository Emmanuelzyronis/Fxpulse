"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAssets } from "@/hooks/useAssets";
import { useConversion } from "@/hooks/useConversion";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useLogStore } from "@/stores/logStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { AUTO_PRECISION } from "@/types/settings";
import { formatAmount, parseAmount } from "@/lib/format/number";
import { isAssetId, pairId, parseId } from "@/lib/assets/ids";
import { cn } from "@/lib/cn";
import { BellIcon, StarIcon, SwapIcon } from "@/components/layout/icons";
import { MoneyField } from "./MoneyField";
import { RateReadout } from "./RateReadout";

const PRECISION_OPTS: { label: string; value: number }[] = [
  { label: "Auto", value: AUTO_PRECISION },
  { label: "2", value: 2 },
  { label: "4", value: 4 },
  { label: "6", value: 6 },
];

/**
 * The converter: a live rate readout on top, two asset fields below. There's no
 * "Convert" button — the result tracks the amount as you type. Conversions are
 * saved to the log on commit (Enter or blur), de-duped per pair+amount.
 */
export function ConverterCard() {
  const { data: catalog, isLoading: assetsLoading } = useAssets();
  const assets = useMemo(() => catalog?.assets ?? [], [catalog]);
  const assetById = useMemo(() => {
    const m = new Map(assets.map((a) => [a.id, a]));
    return m;
  }, [assets]);

  const baseId = useSettingsStore((s) => s.baseId);
  const quoteId = useSettingsStore((s) => s.quoteId);
  const precision = useSettingsStore((s) => s.precision);
  const setBase = useSettingsStore((s) => s.setBase);
  const setQuote = useSettingsStore((s) => s.setQuote);
  const swap = useSettingsStore((s) => s.swap);
  const setPrecision = useSettingsStore((s) => s.setPrecision);

  const hydrated = useHasHydrated();
  const favPairs = useFavoritesStore((s) => s.pairs);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const logConversion = useLogStore((s) => s.log);

  const [amount, setAmount] = useState("100");
  const [spin, setSpin] = useState(0);
  const lastSig = useRef("");

  const from = baseId;
  const to = quoteId;
  const sym = (id: string) =>
    assetById.get(id)?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);
  const fromSym = sym(from);
  const toSym = sym(to);

  const amountNum = parseAmount(amount);
  const validAmount = Number.isFinite(amountNum);
  const conv = useConversion(from, to, validAmount ? amountNum : 0);

  const resultText =
    conv.result != null && validAmount ? formatAmount(conv.result, { precision }) : "";

  const isFav = hydrated && favPairs.some((p) => p.id === pairId(from, to));
  const canConvert = from !== to;

  const commit = (explicit: boolean) => {
    if (!validAmount || amountNum <= 0) return;
    if (conv.result == null || conv.rate == null) return;
    const sig = `${from}|${to}|${amountNum}`;
    if (sig === lastSig.current) {
      if (explicit) toast("Already the last entry in your log");
      return;
    }
    lastSig.current = sig;
    logConversion({ from, to, amount: amountNum, result: conv.result, rate: conv.rate });
    if (explicit) {
      toast.success("Saved to log", {
        description: `${formatAmount(amountNum)} ${fromSym} → ${resultText} ${toSym}`,
      });
    }
  };

  const handleSwap = () => {
    setSpin((s) => s + 180);
    swap();
  };

  return (
    <div className="w-full space-y-4">
      <RateReadout
        fromSymbol={fromSym}
        toSymbol={toSym}
        rate={conv.rate}
        change24h={conv.change24h}
        asOf={conv.asOf}
        isStale={conv.isStale}
        isLoading={conv.isLoading}
        isError={conv.isError}
        onRetry={conv.refetch}
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <MoneyField
          label="Amount"
          assets={assets}
          assetId={from}
          onAssetChange={setBase}
          loadingAssets={assetsLoading}
          value={amount}
          onValueChange={setAmount}
          onCommit={() => commit(false)}
          autoFocus
        />

        <div className="flex justify-center py-1 sm:py-0">
          <button
            type="button"
            onClick={handleSwap}
            aria-label={`Swap to ${toSym} → ${fromSym}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-panel transition-colors hover:border-brand/40 hover:text-brand focus-visible:text-brand"
          >
            <SwapIcon
              className="h-5 w-5 transition-transform duration-300 motion-reduce:transition-none"
              style={{ transform: `rotate(${spin}deg)` }}
            />
          </button>
        </div>

        <MoneyField
          label="Converts to"
          assets={assets}
          assetId={to}
          onAssetChange={setQuote}
          loadingAssets={assetsLoading}
          align="right"
          readOnly
          display={resultText}
        />
      </div>

      {!canConvert && (
        <p className="text-center text-sm text-muted">
          Pick two different assets to see a rate.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <span className="text-xs font-medium text-muted">Decimals</span>
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {PRECISION_OPTS.map((opt) => {
              const active = precision === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPrecision(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium tabular transition-colors",
                    active ? "bg-fg text-bg" : "text-muted hover:text-fg",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFav(from, to)}
            aria-pressed={isFav}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              isFav
                ? "border-brand/40 bg-brand/10 text-fg"
                : "border-border bg-surface text-muted hover:text-fg",
            )}
          >
            <StarIcon filled={isFav} className={cn("h-4 w-4", isFav && "text-brand")} />
            {isFav ? "Saved" : "Save pair"}
          </button>

          <Link
            href="/alerts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            <BellIcon className="h-4 w-4" />
            Set alert
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted">
        Press Enter to save this conversion to your log.
      </p>
    </div>
  );
}
