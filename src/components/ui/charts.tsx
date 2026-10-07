/**
 * Gráficos SVG propios, con el trazo exacto del diseño (D3, D4, E1, E3):
 * guías punteadas #2E3036, línea lima 2.5px, serie secundaria punteada mute.
 * Ocupan el ancho del contenedor (viewBox + trazo que no escala).
 */

type Series = { values: number[]; color?: string; dashed?: boolean; width?: number };

const W = 318;

function toPoints(values: number[], height: number, pad: number, min?: number, max?: number) {
  if (values.length === 0) return [];
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  const n = values.length;
  return values.map((v, i) => [
    n === 1 ? W : (i / (n - 1)) * W,
    pad + ((hi - v) / span) * (height - pad * 2),
  ] as const);
}

export function LineChart({
  series,
  height = 96,
  guides = 2,
  endDot = true,
  dotStroke = "#1C1D21",
  label,
  padRatio = 0.08,
}: {
  series: Series[];
  height?: number;
  guides?: number;
  endDot?: boolean;
  dotStroke?: string;
  label: string;
  padRatio?: number;
}) {
  const pad = Math.round(height * padRatio);
  const main = series[0];
  // Margen de valores para que una serie plana no quede pegada a un borde.
  const scaled = series.map((s) => {
    const lo = Math.min(...s.values);
    const hi = Math.max(...s.values);
    const extra = hi === lo ? 1 : (hi - lo) * 0.05;
    return toPoints(s.values, height, pad, lo - extra, hi + extra);
  });
  const last = scaled[0]?.[scaled[0].length - 1];
  const guideYs = Array.from({ length: guides }, (_, i) => (guides === 1 ? height / 2 : pad + (i * (height - pad * 2)) / (guides - 1)));

  return (
    <svg
      viewBox={`-6 -6 ${W + 12} ${height + 12}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className="block h-auto w-full overflow-visible"
      style={{ aspectRatio: `${W + 12} / ${height + 12}` }}
    >
      {guideYs.map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#2E3036" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      ))}
      {[...series].reverse().map((s, ri) => {
        const pts = scaled[series.length - 1 - ri];
        if (pts.length === 0) return null;
        return (
          <polyline
            key={ri}
            points={pts.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={s.color ?? "#D4F64A"}
            strokeWidth={s.width ?? (s.dashed ? 2 : 2.5)}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {endDot && last && main && (
        <circle cx={last[0]} cy={last[1]} r="5" fill={main.color ?? "#D4F64A"} stroke={dotStroke} strokeWidth="3" />
      )}
    </svg>
  );
}

/** Mini sparkline (E1 card "Sentadilla"). */
export function Sparkline({ values, color = "#D4F64A", height = 40, label }: { values: number[]; color?: string; height?: number; label: string }) {
  return <LineChart series={[{ values, color, width: 2.5 }]} height={height} guides={0} endDot={false} label={label} padRatio={0.1} />;
}

/**
 * Barras semanales (D4 "¿Cumple lo planificado?"): barra lima si cumplió el
 * objetivo, gris si no; línea punteada en el objetivo.
 */
export function TargetBars({ values, target, label }: { values: number[]; target: number; label: string }) {
  const max = Math.max(target * 1.35, ...values, 1);
  return (
    <div role="img" aria-label={label} className="relative grid h-[70px] items-end gap-[5px]" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      <div className="absolute inset-x-0 border-t-[1.5px] border-dashed border-task" style={{ bottom: `${(target / max) * 100}%` }} />
      {values.map((v, i) => (
        <div
          key={i}
          className="rounded-md"
          style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: v >= target ? "#D4F64A" : "#4A4D54" }}
        />
      ))}
    </div>
  );
}
