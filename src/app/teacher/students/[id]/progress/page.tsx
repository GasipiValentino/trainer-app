/* eslint-disable @next/next/no-img-element -- URLs firmadas de Storage */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { CompareCard } from "@/components/teacher/compare-card";
import { RangePicker } from "@/components/teacher/range-picker";
import { TargetBars } from "@/components/ui/charts";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { getSummary, isUuid } from "@/lib/data/students";
import { getExerciseSeries, getMeasurements, getPhotos, getWeeklyStats } from "@/lib/data/student-detail";
import { liftProgress, mainLift, topLifts } from "@/lib/domain/metrics";
import {
  PROGRESS_RANGES,
  frequencyVsProgress,
  plannedCompliance,
  rangeFrom,
  weeklySessions,
  weightVsStrength,
  type Comparison,
  type ProgressRange,
} from "@/lib/domain/progress";
import { localDateKey, mondayOf, shortDate } from "@/lib/dates";
import { fullName, num, signedPct } from "@/lib/format";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Progreso · Trainer" };

/** D4 — Progreso del alumno. */
export default async function StudentProgressPage({ params, searchParams }: PageProps<"/teacher/students/[id]/progress">) {
  await requireRole("teacher");
  const { id } = await params;
  const { range: rangeParam } = await searchParams;
  if (!isUuid(id)) notFound();
  const s = await getSummary(id);
  if (!s) notFound();

  const range: ProgressRange = PROGRESS_RANGES.some((r) => r.value === rangeParam) ? (rangeParam as ProgressRange) : "3m";
  const today = localDateKey();
  const from = rangeFrom(range, today);
  const lift = mainLift(s);

  const [weekly, liftSeries, measurements, photos] = await Promise.all([
    getWeeklyStats(id, from),
    lift ? getExerciseSeries(id, lift.exerciseId, from) : Promise.resolve([]),
    getMeasurements(id),
    getPhotos(id),
  ]);

  const weights = measurements.filter((m) => m.weight != null && m.date >= from).map((m) => ({ d: m.date, v: Number(m.weight) }));
  // El cumplimiento se mide desde que es alumno, no antes.
  const joinedMonday = mondayOf(localDateKey(s.createdAt));
  const sessions = weeklySessions(weekly, from > joinedMonday ? from : joinedMonday, today);
  const compliance = plannedCompliance(s, sessions);

  const comparisons = [
    lift ? weightVsStrength(weights, liftSeries, lift.name) : null,
    frequencyVsProgress(weekly, compliance.target),
  ].filter((c): c is Comparison => c !== null);

  const prs = topLifts(s, 3);
  const withFront = photos.filter((p) => p.urls.front);
  const firstPhoto = withFront.at(-1);
  const lastPhoto = withFront.length > 1 ? withFront[0] : undefined;
  const base = routes.teacher.student(id);

  return (
    <Page narrow>
      <SubHeader
        backHref={base}
        eyebrow="Progreso"
        title={fullName(s.firstName, s.lastName)}
        action={<RangePicker options={PROGRESS_RANGES} value={range} baseHref={routes.teacher.studentProgress(id)} />}
      />

      {comparisons.length > 0 ? (
        <CompareCard comparisons={comparisons} />
      ) : (
        <EmptyState title="Todavía no hay datos para comparar">
          Cuando registre entrenamientos con carga en este período, vas a ver acá cómo evoluciona.
        </EmptyState>
      )}

      <section className="flex flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-base font-[650]">¿Cumple lo planificado?</span>
          {compliance.pct != null && (
            <span className="text-[22px] font-bold tracking-[-0.02em]">
              {Math.round(compliance.pct * 100)}
              <span className="text-[13px] font-medium text-mute">%</span>
            </span>
          )}
        </div>
        {sessions.length > 0 ? (
          <TargetBars values={sessions} target={compliance.target} label={`Sesiones por semana, objetivo ${compliance.target}`} />
        ) : (
          <p className="text-sm text-mute">Sin semanas completas en el período.</p>
        )}
        <div className="flex justify-between text-xs text-mute">
          <span>{sessions.length} semanas</span>
          <span>Objetivo: {compliance.target} por semana</span>
        </div>
      </section>

      <section className="flex flex-col gap-2.5 rounded-[24px] bg-surface px-[18px] py-4">
        <span className="text-base font-[650]">Fuerza · mejores marcas</span>
        {prs.length === 0 ? (
          <p className="text-sm text-mute">Sin ejercicios con carga registrados.</p>
        ) : (
          prs.map((p) => (
            <div key={p.exerciseId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
              <span className="truncate">{p.name}</span>
              <span className="tabular text-mute">
                {num(p.first)} → <span className="font-[650] text-ink">{num(p.best)} kg</span>
              </span>
              <Chip tone={liftProgress(p) > 0 ? "up" : "flat"} size="sm">
                {signedPct(liftProgress(p))}
              </Chip>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2.5 rounded-[24px] bg-surface px-[18px] py-4">
        <div className="flex justify-between">
          <span className="text-base font-[650]">Fotos</span>
          <Link href={`${base}?tab=fotos`} className="text-[13px] text-lime">
            {withFront.length ? "Cambiar fechas" : "Cargar fotos"}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { p: firstPhoto, label: "Inicio" },
            { p: lastPhoto, label: "Actual" },
          ].map(({ p, label }) =>
            p?.urls.front ? (
              <div key={label} className="relative h-[150px] overflow-hidden rounded-2xl bg-raised">
                <img src={p.urls.front} alt={`${label} · ${shortDate(p.date)}`} className="h-full w-full object-cover" />
                <span className="absolute bottom-2.5 left-2.5 text-xs font-semibold">
                  {label} · {shortDate(p.date)}
                </span>
              </div>
            ) : (
              <div key={label} className="stripes flex h-[150px] items-end rounded-2xl p-2.5 text-xs font-semibold text-mute">
                {label} · sin foto
              </div>
            ),
          )}
        </div>
      </section>
    </Page>
  );
}
