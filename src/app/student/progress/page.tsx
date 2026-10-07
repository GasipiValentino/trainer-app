import Link from "next/link";
import { Page } from "@/components/layout/page";
import { LineChart } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getSummary } from "@/lib/data/students";
import { getExerciseSeries, getMeasurements } from "@/lib/data/student-detail";
import { getWorkoutState } from "@/lib/data/student-home";
import { adherence, liftProgress, mainLift, weekStreak } from "@/lib/domain/metrics";
import { badges } from "@/lib/domain/student-plan";
import { diffDays, localDateKey, longDate, weekdayShort, shortDate } from "@/lib/dates";
import { num, signed, signedPct } from "@/lib/format";
import { routes } from "@/lib/navigation";
import type { Lift } from "@/lib/domain/summary";

export const metadata = { title: "Mi progreso · Trainer" };

/** E3 — Mi progreso. */
export default async function MyProgressPage() {
  await requireRole("student");
  const studentId = await getMyStudentId();
  if (!studentId) return null;
  const today = localDateKey();

  const [s, measurements, state] = await Promise.all([getSummary(studentId), getMeasurements(studentId), getWorkoutState(studentId)]);
  if (!s) return null;

  // Destacado: el récord más reciente (o el ejercicio principal).
  const records = s.lifts.filter((l) => l.best > l.first).sort((a, b) => b.bestAt.localeCompare(a.bestAt));
  const hero: Lift | null = records[0] ?? mainLift(s);
  const heroSeries = hero ? await getExerciseSeries(studentId, hero.exerciseId, localDateKey(hero.firstAt)) : [];
  const heroWeeks = hero ? Math.max(1, Math.round(diffDays(localDateKey(hero.firstAt), localDateKey(hero.bestAt)) / 7)) : 0;

  const since = localDateKey(s.createdAt);
  const adh = adherence(s, 4, today);
  const streak = weekStreak(s, today);

  // Medidas: último valor de cada una vs el primero.
  const metric = (key: "weight" | "waist" | "body_fat", label: string, unit: string, pts = false) => {
    const vals = measurements.filter((m) => m[key] != null);
    if (vals.length === 0) return null;
    const first = Number(vals[0][key]);
    const last = Number(vals[vals.length - 1][key]);
    return { label, value: `${num(last)} ${unit}`, delta: vals.length > 1 ? `${signed(last - first)}${pts ? " pts" : ""}` : null };
  };
  const meas = [metric("weight", "Peso", "kg"), metric("waist", "Cintura", "cm"), metric("body_fat", "Grasa corporal", "%", true)].filter(
    (m): m is NonNullable<typeof m> => m !== null,
  );

  // Adherencia de las primeras 4 semanas completas desde el alta.
  const firstMonthAdh = diffDays(since, today) >= 28 ? adherence(s, 4, addWeeks(since, 5)) : null;
  const badgeList = badges({
    recordName: records[0]?.name ?? null,
    streak,
    totalWorkouts: state.total,
    weeksSinceStart: Math.floor(diffDays(since, today) / 7),
    firstMonthAdherence: firstMonthAdh,
  });

  return (
    <Page>
      <header className="flex items-end justify-between px-1">
        <div className="flex flex-col">
          <span className="text-[13px] text-mute">Desde el {longDate(since)}</span>
          <h1 className="text-[30px] font-bold tracking-[-0.03em]">Mi progreso</h1>
        </div>
        <Link href={routes.student.report} className="flex h-10 items-center rounded-[20px] border border-line px-3.5 text-[13px] font-semibold">
          Ver reporte
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-3">
          {hero ? (
            <section className="flex flex-col gap-2.5 rounded-[28px] bg-lime p-5 text-bg">
              <span className="text-[13px] font-semibold">
                {records[0] ? `Nuevo récord · ${weekdayShort(localDateKey(hero.bestAt))} ${shortDate(localDateKey(hero.bestAt))}` : "Tu ejercicio principal"}
              </span>
              <div className="flex items-end justify-between gap-3">
                <span className="line-clamp-2 min-w-0 text-[26px] font-bold leading-tight tracking-[-0.02em]">{hero.name}</span>
                <span className="shrink-0 text-[44px] font-[750] leading-none tracking-[-0.04em]">
                  {num(hero.best)}
                  <span className="text-lg font-semibold"> kg</span>
                </span>
              </div>
              {heroSeries.length >= 2 && (
                <LineChart series={[{ values: heroSeries.map((p) => p.v), color: "#111214" }]} height={56} guides={0} dotStroke="#D4F64A" label={`Evolución de ${hero.name}`} />
              )}
              <span className="text-sm font-semibold">
                Empezaste en {num(hero.first)} kg: {signedPct(liftProgress(hero))} en {heroWeeks} {heroWeeks === 1 ? "semana" : "semanas"}
              </span>
            </section>
          ) : (
            <EmptyState title="Tu progreso aparece acá">Cuando registres entrenamientos con carga vas a ver cómo evolucionan tus marcas.</EmptyState>
          )}

          <section className="grid grid-cols-3 gap-2 rounded-[24px] bg-surface px-[18px] py-4">
            {[
              { label: "Entrenos", value: String(state.total), unit: "" },
              { label: "Constancia", value: adh != null ? String(Math.round(adh * 100)) : "—", unit: adh != null ? "%" : "" },
              { label: "Racha", value: String(streak), unit: "sem" },
            ].map((x, i) => (
              <div key={x.label} className={`flex flex-col gap-[3px] ${i ? "border-l border-track pl-3" : ""}`}>
                <span className="text-xs text-mute">{x.label}</span>
                <span className="text-2xl font-bold tracking-[-0.03em]">
                  {x.value}
                  {x.unit && <span className="text-[13px] font-medium text-mute"> {x.unit}</span>}
                </span>
              </div>
            ))}
          </section>
        </div>

        <div className="flex flex-col gap-3">
          <section className="flex flex-col rounded-[24px] bg-surface px-2 pb-2 pt-1.5">
            <div className="flex items-center justify-between px-3 pb-1 pt-3">
              <span className="text-base font-[650]">Medidas</span>
              {meas.length > 0 && (
                <Link href={routes.student.measurements} className="text-[13px] text-lime">
                  Ver historial
                </Link>
              )}
            </div>
            {meas.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-mute">Tu coach todavía no cargó mediciones.</p>
            ) : (
              <div className="flex flex-col gap-1.5 pt-1.5">
                {meas.map((m) => (
                  <div key={m.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl bg-raised p-3">
                    <span className="text-[15px]">{m.label}</span>
                    <span className="tabular text-[15px] font-[650]">{m.value}</span>
                    {m.delta ? (
                      <span className="flex h-6 min-w-[52px] items-center justify-center rounded-xl bg-[var(--lime-soft)] px-2 text-xs font-[650] text-lime">{m.delta}</span>
                    ) : (
                      <span className="min-w-[52px]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {badgeList.length > 0 && (
            <section className="flex flex-col gap-2">
              <span className="px-1 pt-1 text-base font-[650]">Logros</span>
              <div className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pr-4 lg:mr-0 lg:flex-wrap lg:pr-0">
                {badgeList.map((b) => (
                  <div key={b.title} className="flex w-[130px] shrink-0 flex-col gap-2.5 rounded-[22px] bg-surface p-3.5">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-[750] ${b.highlight ? "bg-lime text-bg" : "bg-raised text-lime"}`}
                    >
                      {b.icon}
                    </span>
                    <span className="text-sm font-semibold leading-tight">{b.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Page>
  );
}

function addWeeks(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n * 7)).toISOString().slice(0, 10);
}
