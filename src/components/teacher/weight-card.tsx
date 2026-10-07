"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/ui/charts";
import { Segmented } from "@/components/ui/segmented";
import { addDays, diffDays, shortDate } from "@/lib/dates";
import { MINUS, num, signed } from "@/lib/format";

/**
 * Card "Peso corporal" de D3: rangos 7D/30D/3M/6M/1A, línea lima con punto
 * final y leyenda (desde · resumen). Si se pasa `metric`, sirve para cualquier
 * medida (pestaña Métricas).
 */
const RANGES = [
  { value: "7D", label: "7D", days: 7 },
  { value: "30D", label: "30D", days: 30 },
  { value: "3M", label: "3M", days: 91 },
  { value: "6M", label: "6M", days: 182 },
  { value: "1A", label: "1A", days: 365 },
] as const;
type Range = (typeof RANGES)[number]["value"];

export function MetricChartCard({
  title,
  points,
  unit,
  today,
  defaultRange = "3M",
  stableWeeks = 0,
  headerExtra,
}: {
  title: string;
  points: { d: string; v: number }[];
  unit: string;
  today: string;
  defaultRange?: Range;
  stableWeeks?: number;
  headerExtra?: React.ReactNode;
}) {
  const [range, setRange] = useState<Range>(defaultRange);

  const view = useMemo(() => {
    const days = RANGES.find((r) => r.value === range)!.days;
    const from = addDays(today, -days);
    const inRange = points.filter((p) => p.d >= from);
    // Si en el rango hay un solo punto, se ancla con el anterior para ver la tendencia.
    const before = points.filter((p) => p.d < from).at(-1);
    const series = inRange.length < 2 && before ? [before, ...inRange] : inRange;
    return { series, coversStart: points.length > 0 && series[0]?.d === points[0].d };
  }, [points, range, today]);

  const s = view.series;
  let caption = "";
  if (s.length >= 2) {
    const delta = s[s.length - 1].v - s[0].v;
    const span = diffDays(s[0].d, s[s.length - 1].d);
    if (stableWeeks >= 3 && s.length >= 3) caption = `Estable las últimas ${stableWeeks} semanas`;
    else if (view.coversStart) caption = `${signed(delta)} ${unit} desde el inicio`;
    else caption = `${signed(delta)} ${unit} en ${span} días`;
  } else if (s.length === 1) caption = `Una sola medición: ${num(s[0].v)} ${unit}`;

  return (
    <section className="flex flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-[650]">{title}</span>
        <Segmented
          label="Período"
          options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          value={range}
          onChange={setRange}
        />
      </div>
      {headerExtra}
      {s.length >= 2 ? (
        <LineChart series={[{ values: s.map((p) => p.v) }]} height={96} label={`${title}: ${caption}`} />
      ) : (
        <div className="flex h-[96px] items-center justify-center rounded-2xl border border-dashed border-line text-[13px] text-mute">
          {s.length === 0 ? "Sin mediciones en este período" : "Hace falta otra medición para ver la evolución"}
        </div>
      )}
      <div className="flex justify-between text-xs text-mute">
        <span>{s[0] ? shortDate(s[0].d) : "—"}</span>
        <span>{caption.replace("-", MINUS)}</span>
      </div>
    </section>
  );
}
