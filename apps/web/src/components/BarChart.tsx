'use client';

interface BarChartProps {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
  color?: string;
}

/**
 * Minimal single-series bar chart. Per docs' dataviz guidance: thin bars,
 * rounded data-ends, 2px gaps, recessive baseline, native <title> tooltips
 * as the hover layer (no legend needed — a single series is named by the
 * section heading, not color).
 */
export function BarChart({ data, formatValue = (v) => String(v), color = 'var(--tf-primary)' }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 100;
  const height = 48;
  const barWidth = width / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height + 4}`} className="w-full h-28" preserveAspectRatio="none">
      <line x1="0" y1={height} x2={width} y2={height} stroke="var(--tf-border)" strokeWidth="0.5" />
      {data.map((d, i) => {
        const barHeight = (d.value / max) * height;
        return (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={height - barHeight}
            width={barWidth * 0.7}
            height={Math.max(barHeight, 0.5)}
            rx={0.8}
            fill={color}
          >
            <title>
              {d.label}: {formatValue(d.value)}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
