import { useId } from "react";

interface SparklineProps {
  /** Ordered values, oldest → newest. Non-finite entries are dropped. */
  values: number[];
  width?: number;
  height?: number;
  /** Line color (any CSS color). Defaults to the current text color. */
  stroke?: string;
  /** Fill color under the line. Omit for a line only. */
  fill?: string;
  strokeWidth?: number;
  className?: string;
  /** When set, the sparkline is announced to screen readers; otherwise hidden. */
  ariaLabel?: string;
}

/**
 * A tiny, dependency-free trend line drawn straight to SVG. Values are scaled to
 * fit the box with a small vertical inset so peaks aren't clipped; a flat series
 * (or too few points) renders as a dim baseline so a row never looks broken.
 *
 * `vectorEffect="non-scaling-stroke"` keeps the line crisp when the SVG is
 * stretched by CSS, so callers can size it responsively.
 */
export function Sparkline({
  values,
  width = 100,
  height = 32,
  stroke = "currentColor",
  fill,
  strokeWidth = 1.5,
  className,
  ariaLabel,
}: SparklineProps) {
  const rawId = useId();
  const gradId = `spark-${rawId.replace(/[:]/g, "")}`;
  const pts = values.filter((v) => Number.isFinite(v));
  const w = width;
  const h = height;
  const inset = strokeWidth + 1;

  const a11y = ariaLabel
    ? { role: "img" as const, "aria-label": ariaLabel }
    : { "aria-hidden": true as const };

  if (pts.length < 2) {
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={className}
        {...a11y}
      >
        <line
          x1={0}
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={0.3}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  let min = Infinity;
  let max = -Infinity;
  for (const v of pts) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1; // flat series → straight centered line
  const n = pts.length;
  const innerH = h - inset * 2;

  const xAt = (i: number) => (i / (n - 1)) * w;
  const yAt = (v: number) => inset + innerH - ((v - min) / span) * innerH;

  const line = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}`)
    .join(" ");
  const area = fill
    ? `${line} L${w.toFixed(2)} ${h.toFixed(2)} L0 ${h.toFixed(2)} Z`
    : null;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      {...a11y}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.22} />
              <stop offset="100%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area!} fill={`url(#${gradId})`} stroke="none" />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
