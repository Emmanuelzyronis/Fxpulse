"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useFavoritesStore } from "@/stores/favoritesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useAssets } from "@/hooks/useAssets";
import { useRates } from "@/hooks/useRates";
import { useHistories, type HistoryPairInput } from "@/hooks/useHistories";
import { seriesChangePct } from "@/lib/history/normalizeSeries";
import { canConvert, rateOf } from "@/lib/rates/convert";
import { formatAmount } from "@/lib/format/number";
import { parseId, isAssetId } from "@/lib/assets/ids";
import { cn } from "@/lib/cn";
import type { HistoryRange } from "@/types/history";
import type { Asset } from "@/types/asset";
import { AUTO_PRECISION } from "@/types/settings";
import { AssetGlyph } from "@/components/converter/AssetSelect";
import { DeltaChip } from "@/components/common/DeltaChip";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { TimeframePicker } from "@/components/chart/TimeframePicker";
import {
  StarIcon,
  GripIcon,
  TrashIcon,
  ConvertIcon,
} from "@/components/layout/icons";
import { Sparkline } from "@/components/compare/Sparkline";

interface CardData {
  id: string;
  from: string;
  to: string;
  fromSym: string;
  toSym: string;
  fromAsset?: Asset;
  toAsset?: Asset;
  name: string;
  rate: number | null;
  values: number[];
  pct: number | null;
  rateLoading: boolean;
}

export function FavoritesList() {
  const hydrated = useHasHydrated();
  const pairs = useFavoritesStore((s) => s.pairs);
  const add = useFavoritesStore((s) => s.add);
  const remove = useFavoritesStore((s) => s.remove);
  const reorder = useFavoritesStore((s) => s.reorder);
  const router = useRouter();

  const [range, setRange] = useState<HistoryRange>("30d");

  const { data: catalog } = useAssets();
  const assets = useMemo(() => catalog?.assets ?? [], [catalog]);
  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const precisionPref = useSettingsStore((s) => s.precision);
  const precision = hydrated ? precisionPref : AUTO_PRECISION;

  const symOf = (id: string) =>
    assetById.get(id)?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);
  const nameOf = (id: string) => assetById.get(id)?.name ?? "";

  // Every leg across every favorite folds into one batched rates request.
  const legIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of pairs) {
      set.add(p.from);
      set.add(p.to);
    }
    return [...set];
  }, [pairs]);

  const {
    data: rates,
    isLoading: ratesLoading,
    isError: ratesError,
    refetch: refetchRates,
  } = useRates(legIds);

  // One history series per favorite, keyed by the pair id so the sparkline
  // stays aligned to its card. Shares the cache with the charts/compare pages.
  const historyPairs: HistoryPairInput[] = useMemo(
    () =>
      pairs.map((p) => ({
        id: p.id,
        from: p.from,
        to: p.to,
        label: `${symOf(p.from)}/${symOf(p.to)}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs, assetById],
  );
  const histories = useHistories(historyPairs, range);
  const historyByPair = useMemo(
    () => new Map(histories.map((h) => [h.input.id, h])),
    [histories],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pairs.findIndex((p) => p.id === active.id);
    const newIndex = pairs.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorder(oldIndex, newIndex);
  }

  function handleOpen(data: CardData) {
    // Load the pair into the converter, then take the user there.
    const s = useSettingsStore.getState();
    s.setBase(data.from);
    s.setQuote(data.to);
    router.push("/");
  }

  function handleRemove(data: CardData) {
    remove(data.id);
    toast("Removed from favorites", {
      description: `${data.fromSym}/${data.toSym}`,
      action: { label: "Undo", onClick: () => add(data.from, data.to) },
    });
  }

  // Persisted UI: hold a skeleton until the store rehydrates so the list
  // doesn't flash empty and then pop full.
  if (!hydrated) {
    return (
      <ul className="space-y-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3"
          >
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-16" />
          </li>
        ))}
      </ul>
    );
  }

  if (pairs.length === 0) {
    return (
      <EmptyState
        icon={<StarIcon className="h-6 w-6 text-muted" />}
        title="No favorites yet"
        description="Save a pair from the converter with “Save pair” and it lands here — reorderable, each with a live rate and trend."
        action={
          <Link
            href="/"
            className="rounded-lg bg-fg px-3 py-1.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Open converter
          </Link>
        }
      />
    );
  }

  const showRatesError = ratesError && !rates;
  const partialCount = rates?.partial?.length ?? 0;

  const cards: CardData[] = pairs.map((p) => {
    const res = historyByPair.get(p.id);
    const points = res?.data?.points ?? [];
    const values = points.map((pt) => pt.value);
    const pct = res?.data ? seriesChangePct(points) : null;
    const convertible = rates ? canConvert(p.from, p.to, rates) : false;
    const rate = convertible && rates ? rateOf(p.from, p.to, rates) : null;
    const fromSym = symOf(p.from);
    const toSym = symOf(p.to);
    return {
      id: p.id,
      from: p.from,
      to: p.to,
      fromSym,
      toSym,
      fromAsset: assetById.get(p.from),
      toAsset: assetById.get(p.to),
      name: `${nameOf(p.from) || fromSym} → ${nameOf(p.to) || toSym}`,
      rate,
      values,
      pct,
      rateLoading: ratesLoading && !rates,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Live rates, refreshed every minute
          {pairs.length > 1 ? " · drag to reorder" : ""}
        </p>
        <TimeframePicker value={range} onChange={setRange} />
      </div>

      {showRatesError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-sm">
          <span className="text-muted">Live rates are unavailable right now.</span>
          <button
            type="button"
            onClick={() => refetchRates()}
            className="font-medium text-fg transition-colors hover:text-brand"
          >
            Retry
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={pairs.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {cards.map((data) => (
              <SortableFavoriteCard
                key={data.id}
                data={data}
                range={range}
                precision={precision}
                onOpen={handleOpen}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {partialCount > 0 ? (
        <p className="text-xs text-muted">
          Some rates are delayed and served from the last good value.
        </p>
      ) : (
        <p className="text-xs text-muted">
          Saved on this device — favorites don’t sync across browsers.
        </p>
      )}
    </div>
  );
}

interface SortableFavoriteCardProps {
  data: CardData;
  range: HistoryRange;
  precision: number;
  onOpen: (data: CardData) => void;
  onRemove: (data: CardData) => void;
}

function SortableFavoriteCard({
  data,
  range,
  precision,
  onOpen,
  onRemove,
}: SortableFavoriteCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: data.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // The sparkline is market data, so it takes the up/down hue by net direction
  // (muted when there's no history yet). Gold stays reserved for interaction.
  const dirColor =
    data.pct == null
      ? "rgb(var(--muted))"
      : data.pct >= 0
        ? "rgb(var(--up))"
        : "rgb(var(--down))";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-surface px-3 py-3 shadow-panel",
        isDragging ? "z-10 border-brand/40 shadow-lg" : "border-border",
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${data.fromSym}/${data.toSym}`}
        className="flex-none cursor-grab touch-none rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripIcon className="h-4 w-4" />
      </button>

      {/* Identity */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex flex-none items-center gap-1">
          <AssetGlyph asset={data.fromAsset} symbol={data.fromSym} />
          <AssetGlyph asset={data.toAsset} symbol={data.toSym} />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold tabular text-fg">
            {data.fromSym}/{data.toSym}
          </div>
          <div className="truncate text-xs text-muted">{data.name}</div>
        </div>
      </div>

      {/* Live rate */}
      <div className="flex-none text-right">
        {data.rate != null ? (
          <>
            <div className="font-mono text-base font-medium tabular text-fg">
              {formatAmount(data.rate, { precision })}
            </div>
            <div className="text-[11px] text-muted">
              {data.toSym} per {data.fromSym}
            </div>
          </>
        ) : data.rateLoading ? (
          <Skeleton className="ml-auto h-5 w-16" />
        ) : (
          <div className="font-mono text-base text-muted">—</div>
        )}
      </div>

      <Sparkline
        values={data.values}
        stroke={dirColor}
        fill={dirColor}
        className="hidden h-8 w-20 flex-none sm:block"
        ariaLabel={
          data.pct != null
            ? `${data.fromSym} to ${data.toSym} trend over ${range}`
            : undefined
        }
      />

      {/* Direct flex child so it leaves no gap when there's no history yet. */}
      <DeltaChip change={data.pct} windowLabel={range} size="sm" />

      <div className="flex flex-none items-center gap-1">
        <button
          type="button"
          onClick={() => onOpen(data)}
          aria-label={`Open ${data.fromSym}/${data.toSym} in converter`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <ConvertIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(data)}
          aria-label={`Remove ${data.fromSym}/${data.toSym}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-down"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
