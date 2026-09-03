"use client";

import { useId, useMemo, type ReactElement } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  normalizeSeries,
  type NamedSeries,
  type NormalizeMode,
} from "@/lib/history/normalizeSeries";
import { formatAmount, formatPercent } from "@/lib/format/number";
import { cn } from "@/lib/cn";

/**
 * Categorical series colors. The first is brand gold — the pair you're focused
 * on. The rest are distinct data-series hues (not up/down signals), so green and
 * red stay reserved for the market-direction chips elsewhere.
 */
export const SERIES_COLORS = [
  "rgb(var(--brand))",
  "rgb(var(--fg))",
  "#6366f1",
  "#0ea5e9",
  "#a855f7",
];

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function fmtDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtDayLong(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtAxis(v: number, mode: NormalizeMode): string {
  if (!Number.isFinite(v)) return "";
  if (mode === "pct") return `${v > 0 ? "+" : ""}${v.toFixed(0)}%`;
  if (mode === "index100") return v.toFixed(0);
  return formatAmount(v);
}

function fmtValue(v: number, mode: NormalizeMode): string {
  if (!Number.isFinite(v)) return "—";
  if (mode === "pct") return formatPercent(v, 2);
  if (mode === "index100") return v.toFixed(2);
  return formatAmount(v);
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string }>;
  label?: string;
  labels?: Record<string, string>;
  mode?: NormalizeMode;
}

function ChartTooltip({
  active,
  payload,
  label,
  labels = {},
  mode = "absolute",
}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface/95 px-3 py-2 text-xs shadow-panel backdrop-blur">
      <div className="mb-1 font-medium text-muted">
        {label ? fmtDayLong(String(label)) : ""}
      </div>
      <ul className="space-y-0.5">
        {payload.map((p) => {
          const key = String(p.dataKey);
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.color }}
                aria-hidden
              />
              <span className="text-muted">{labels[key] ?? key}</span>
              <span className="ml-auto font-mono tabular text-fg">
                {typeof p.value === "number" ? fmtValue(p.value, mode) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Line/area chart for one or more pairs. A single pair renders as a gold area;
 * multiple pairs render as overlaid lines and should be normalized (index100 /
 * pct) so different-magnitude pairs are comparable.
 */
export function RateChart({
  series,
  mode,
  height = 300,
  className,
}: {
  series: NamedSeries[];
  mode: NormalizeMode;
  height?: number;
  className?: string;
}) {
  const gradientId = "chart-grad-" + useId().replace(/[:]/g, "");
  const { rows, seriesIds } = useMemo(
    () => normalizeSeries(series, mode),
    [series, mode],
  );
  const labels = useMemo(
    () => Object.fromEntries(series.map((s) => [s.id, s.label])),
    [series],
  );

  const single = series.length === 1;
  const axisTick = { fill: "rgb(var(--muted))", fontSize: 11 } as const;
  const gridStroke = "rgb(var(--border))";
  const baseline = mode === "index100" ? 100 : mode === "pct" ? 0 : null;

  const axes: ReactElement[] = [
    <CartesianGrid
      key="grid"
      vertical={false}
      stroke={gridStroke}
      strokeOpacity={0.6}
    />,
    <XAxis
      key="x"
      dataKey="date"
      tickFormatter={(d) => fmtDay(String(d))}
      tick={axisTick}
      tickLine={false}
      axisLine={{ stroke: gridStroke }}
      minTickGap={28}
      interval="preserveStartEnd"
    />,
    <YAxis
      key="y"
      tickFormatter={(v) => fmtAxis(Number(v), mode)}
      tick={axisTick}
      tickLine={false}
      axisLine={false}
      width={64}
      domain={["auto", "auto"]}
    />,
    <Tooltip
      key="tip"
      content={<ChartTooltip labels={labels} mode={mode} />}
      cursor={{ stroke: gridStroke, strokeWidth: 1 }}
    />,
  ];
  if (baseline !== null) {
    axes.push(
      <ReferenceLine
        key="base"
        y={baseline}
        stroke={gridStroke}
        strokeDasharray="3 3"
      />,
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {single ? (
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity={0.28} />
                <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity={0} />
              </linearGradient>
            </defs>
            {axes}
            <Area
              type="monotone"
              dataKey={seriesIds[0]}
              stroke="rgb(var(--brand))"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        ) : (
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {axes}
            {seriesIds.map((id, i) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={seriesColor(i)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
