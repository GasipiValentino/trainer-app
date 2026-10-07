import { Card, CardTitle } from "@/components/ui/card";
import { MetricChartCard } from "@/components/teacher/weight-card";
import { localDateKey, shortDateUpper } from "@/lib/dates";
import { num, signed } from "@/lib/format";
import { adherence, stableWeightWeeks } from "@/lib/domain/metrics";
import type { StudentSummary } from "@/lib/domain/summary";
import type { Measurement, WorkoutWithSets } from "@/lib/data/student-detail";

type Stat = { label: string; value: string; unit: string; delta: string; good: boolean | null };

/** Pestaña Resumen (D3): números clave, peso corporal e historial. */
export function SummaryTab({
  summary,
  measurements,
  workouts,
}: {
  summary: StudentSummary;
  measurements: Measurement[];
  workouts: WorkoutWithSets[];
}) {
  const today = localDateKey();
  const weights = measurements.filter((m) => m.weight != null).map((m) => ({ d: m.date, v: Number(m.weight) }));
  const fats = measurements.filter((m) => m.body_fat != null).map((m) => Number(m.body_fat));

  const adhNow = adherence(summary, 4, today);
  const adhPrev = adherence(summary, 4, today, 4);

  // Signo "bueno" según objetivo: bajar es bueno para grasa/recomposición,
  // subir para hipertrofia; en el resto el cambio de peso es neutro.
  const goal = summary.goal ?? "";
  const wantsGain = /hipertrofia|ganar/i.test(goal) ? true : /grasa|bajar|recomposici|definici|perder/i.test(goal) ? false : null;
  const wDelta = weights.length ? weights[weights.length - 1].v - weights[0].v : null;
  const fDelta = fats.length ? fats[fats.length - 1] - fats[0] : null;
  const aDelta = adhNow != null && adhPrev != null ? Math.round((adhNow - adhPrev) * 100) : null;

  const stats: Stat[] = [
    {
      label: "Peso",
      value: weights.length ? num(weights[weights.length - 1].v) : "—",
      unit: "kg",
      delta: wDelta != null && weights.length > 1 ? `${signed(wDelta)} desde inicio` : "Sin historial",
      good: wDelta == null || weights.length < 2 || wantsGain == null ? null : wantsGain ? wDelta >= 0 : wDelta <= 0,
    },
    {
      label: "Grasa",
      value: fats.length ? num(fats[fats.length - 1]) : "—",
      unit: "%",
      delta: fDelta != null && fats.length > 1 ? `${signed(fDelta)} pts` : "Sin historial",
      good: fDelta == null || fats.length < 2 ? null : fDelta <= 0,
    },
    {
      label: "Constancia",
      value: adhNow != null ? String(Math.round(adhNow * 100)) : "—",
      unit: "%",
      delta: aDelta != null ? `${signed(aDelta, 0)} este mes` : "Sin datos",
      good: aDelta == null ? null : aDelta >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <section className="grid grid-cols-3 gap-2 rounded-[24px] bg-surface px-[18px] py-4 lg:col-span-2">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex flex-col gap-[3px] ${i > 0 ? "border-l border-track pl-3" : ""}`}>
            <span className="text-xs text-mute">{s.label}</span>
            <span className="tabular text-2xl font-bold tracking-[-0.03em]">
              {s.value}
              {s.value !== "—" && <span className="text-[13px] font-medium text-mute"> {s.unit}</span>}
            </span>
            <span className={`text-xs ${s.good == null ? "text-mute" : s.good ? "text-lime" : "text-coral"}`}>{s.delta}</span>
          </div>
        ))}
      </section>

      <MetricChartCard
        title="Peso corporal"
        points={weights}
        unit="kg"
        today={today}
        stableWeeks={stableWeightWeeks(summary)}
      />

      <HistoryCard summary={summary} measurements={measurements} workouts={workouts} />
    </div>
  );
}

/** Historial: hitos recientes mezclados por fecha (entrenos, récords, mediciones, check-ins). */
function HistoryCard({
  summary,
  measurements,
  workouts,
}: {
  summary: StudentSummary;
  measurements: Measurement[];
  workouts: WorkoutWithSets[];
}) {
  const items: { d: string; text: string }[] = [];
  const lastWorkout = workouts.find((w) => w.completed_at);
  if (lastWorkout) {
    items.push({ d: localDateKey(lastWorkout.started_at), text: `Último entrenamiento${lastWorkout.dayName ? ` · ${lastWorkout.dayName}` : ""}` });
  }
  for (const l of summary.lifts.slice(0, 4)) {
    if (l.best > l.first) items.push({ d: localDateKey(l.bestAt), text: `Récord en ${l.name.toLowerCase()} · ${num(l.best)} kg` });
  }
  const lastMeasure = measurements.at(-1);
  if (lastMeasure) items.push({ d: lastMeasure.date, text: "Última medición" });
  if (summary.lastCheckin) items.push({ d: localDateKey(summary.lastCheckin.created_at), text: "Último check-in" });
  if (summary.routine) items.push({ d: summary.routine.start_date, text: `Empezó ${summary.routine.name}` });

  const sorted = items.sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);

  return (
    <Card>
      <CardTitle>Historial</CardTitle>
      {sorted.length === 0 ? (
        <p className="text-sm text-mute">Todavía no hay actividad registrada.</p>
      ) : (
        sorted.map((it, i) => (
          <div key={i} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5 text-sm">
            <span className="font-semibold text-mute">{shortDateUpper(it.d)}</span>
            <span>{it.text}</span>
          </div>
        ))
      )}
    </Card>
  );
}
