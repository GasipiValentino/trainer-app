"use client";

import { useMemo, useState } from "react";
import { MetricChartCard } from "@/components/teacher/weight-card";
import { PillButton, PillRow } from "@/components/ui/pills";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { shortDateUpper } from "@/lib/dates";
import { num } from "@/lib/format";
import { deleteMeasurementAction } from "@/lib/actions/students";
import type { Measurement } from "@/lib/data/student-detail";

/** Pestaña Métricas: elegir medida, ver su evolución y el historial cargado. */
const METRICS = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "body_fat", label: "Grasa", unit: "%" },
  { key: "muscle_mass", label: "Masa muscular", unit: "kg" },
  { key: "waist", label: "Cintura", unit: "cm" },
  { key: "chest", label: "Pecho", unit: "cm" },
  { key: "hips", label: "Cadera", unit: "cm" },
  { key: "arm", label: "Brazo", unit: "cm" },
  { key: "thigh", label: "Muslo", unit: "cm" },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

export function MetricsTab({
  studentId,
  measurements,
  measureHref,
  today,
  readOnly = false,
}: {
  studentId: string;
  measurements: Measurement[];
  measureHref: string;
  today: string;
  /** Vista del alumno: sin cargar ni borrar mediciones. */
  readOnly?: boolean;
}) {
  const available = METRICS.filter((m) => measurements.some((x) => x[m.key] != null));
  const [metric, setMetric] = useState<MetricKey>(available[0]?.key ?? "weight");
  const def = METRICS.find((m) => m.key === metric)!;

  const points = useMemo(
    () => measurements.filter((m) => m[metric] != null).map((m) => ({ d: m.date, v: Number(m[metric]) })),
    [measurements, metric],
  );

  if (measurements.length === 0) {
    return (
      <EmptyState
        title="Sin mediciones todavía"
        action={readOnly ? undefined : <LinkButton href={measureHref}>Cargar primera medición</LinkButton>}
      >
        {readOnly ? "Tu coach todavía no cargó mediciones." : "Cargá solo las medidas que uses: ninguna es obligatoria."}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PillRow>
        {available.map((m) => (
          <PillButton key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)}>
            {m.label}
          </PillButton>
        ))}
      </PillRow>

      <MetricChartCard key={metric} title={def.label} points={points} unit={def.unit} today={today} defaultRange="6M" />

      <section className="flex flex-col rounded-[24px] bg-surface px-2 pb-2 pt-1.5">
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <span className="text-[17px] font-[650]">Mediciones</span>
          {!readOnly && (
            <LinkButton href={measureHref} size="sm" variant="outline">
              + Medir
            </LinkButton>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {[...measurements].reverse().map((m) => {
            const parts = METRICS.filter((x) => m[x.key] != null).map((x) => `${x.label} ${num(Number(m[x.key]))} ${x.unit}`);
            return (
              <div key={m.id} className="flex items-start gap-3 rounded-[18px] bg-raised px-3 py-2.5">
                <span className="w-[52px] shrink-0 pt-0.5 text-sm font-semibold text-mute">{shortDateUpper(m.date)}</span>
                <span className="min-w-0 flex-1 text-sm">
                  {parts.join(" · ")}
                  {m.notes && <span className="block text-[13px] text-mute">{m.notes}</span>}
                </span>
                {!readOnly && (
                  <form action={deleteMeasurementAction.bind(null, studentId, m.id)}>
                    <button type="submit" className="text-[13px] font-semibold text-mute hover:text-coral" aria-label={`Borrar medición del ${m.date}`}>
                      Borrar
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
