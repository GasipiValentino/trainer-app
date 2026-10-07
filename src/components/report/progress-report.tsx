/* eslint-disable @next/next/no-img-element -- URLs firmadas de Storage */
import { LineChart, TargetBars } from "@/components/ui/charts";
import { Chip } from "@/components/ui/chip";
import { PrintButton } from "@/components/report/print-button";
import { RangePicker } from "@/components/teacher/range-picker";
import { IconLink } from "@/components/ui/button";
import { BackIcon } from "@/components/ui/icons";
import { PROGRESS_RANGES } from "@/lib/domain/progress";
import { liftProgress } from "@/lib/domain/metrics";
import { age, fullName, LEVEL_LABEL, num, signed, signedPct } from "@/lib/format";
import { localDateKey, longDate, shortDate } from "@/lib/dates";
import { countFlags } from "@/lib/domain/metrics";
import type { ReportData } from "@/lib/data/report";

const METRICS = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "body_fat", label: "Grasa corporal", unit: "%" },
  { key: "muscle_mass", label: "Masa muscular", unit: "kg" },
  { key: "waist", label: "Cintura", unit: "cm" },
  { key: "chest", label: "Pecho", unit: "cm" },
  { key: "hips", label: "Cadera", unit: "cm" },
  { key: "arm", label: "Brazo", unit: "cm" },
  { key: "thigh", label: "Muslo", unit: "cm" },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="report-card flex break-inside-avoid flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4">
      <span className="text-base font-[650]">{title}</span>
      {children}
    </section>
  );
}

/**
 * Reporte de progreso: misma información para profesor y alumno (el profesor
 * además ve sus notas privadas). Se imprime / guarda como PDF desde el
 * navegador con estilos de impresión propios (globals.css).
 */
export function ProgressReport({ data, backHref, baseHref }: { data: ReportData; backHref: string; baseHref: string }) {
  const p = data.profile;
  const years = age(p.birth_date);
  const rangeLabel = PROGRESS_RANGES.find((r) => r.value === data.range)?.label ?? "";

  const metricRows = METRICS.map((m) => {
    const vals = data.allMeasurements.filter((x) => x[m.key] != null);
    const inRange = data.measurements.filter((x) => x[m.key] != null);
    if (vals.length === 0) return null;
    const startRow = inRange[0] ?? vals[vals.length - 1];
    const last = Number(vals[vals.length - 1][m.key]);
    const start = Number(startRow[m.key]);
    return { ...m, start, last, delta: last - start, startDate: startRow.date };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const firstPhoto = data.photos.at(-1);
  const lastPhoto = data.photos.length > 1 ? data.photos[0] : undefined;

  return (
    <main className="report mx-auto flex w-full max-w-[860px] flex-col gap-3 px-4 pb-16 pt-[58px] lg:px-8 lg:pt-8">
      <div className="no-print flex items-center justify-between gap-2">
        <IconLink href={backHref} aria-label="Volver">
          <BackIcon />
        </IconLink>
        <div className="flex items-center gap-2">
          <RangePicker options={PROGRESS_RANGES} value={data.range} baseHref={baseHref} />
          <PrintButton />
        </div>
      </div>

      <header className="flex flex-col gap-1 px-1">
        <span className="text-[13px] text-mute">
          Reporte de progreso · {rangeLabel.toLowerCase()} · desde el {longDate(data.from)}
        </span>
        <h1 className="text-[30px] font-bold tracking-[-0.03em]">{fullName(p.first_name, p.last_name)}</h1>
        <span className="text-sm text-mute">
          {[p.goal, p.level ? LEVEL_LABEL[p.level] : null, years != null ? `${years} años` : null, p.height_cm ? `${num(Number(p.height_cm))} cm` : null]
            .filter(Boolean)
            .join(" · ")}
          {data.coach ? ` · Coach: ${fullName(data.coach.firstName, data.coach.lastName)}` : ""}
        </span>
        <span className="text-xs text-mute">Generado el {longDate(data.generatedOn)}</span>
      </header>

      <section className="report-card grid grid-cols-2 gap-2 rounded-[24px] bg-surface px-[18px] py-4 sm:grid-cols-4">
        {[
          { label: "Entrenos en el período", value: String(data.workoutsInRange) },
          { label: "Cumplimiento", value: data.compliance.pct != null ? `${Math.round(data.compliance.pct * 100)} %` : "—" },
          { label: "Racha", value: `${data.streak} sem` },
          { label: "Entrenos totales", value: String(data.totalWorkouts) },
        ].map((x) => (
          <div key={x.label} className="flex flex-col gap-[3px]">
            <span className="text-xs text-mute">{x.label}</span>
            <span className="text-2xl font-bold tracking-[-0.03em]">{x.value}</span>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section title="Evolución · peso corporal">
          {data.weights.length >= 2 ? (
            <>
              <LineChart series={[{ values: data.weights.map((w) => w.v) }]} height={96} label="Evolución del peso" />
              <div className="flex justify-between text-xs text-mute">
                <span>{shortDate(data.weights[0].d)}</span>
                <span>
                  {num(data.weights[0].v)} → {num(data.weights[data.weights.length - 1].v)} kg ({signed(data.weights[data.weights.length - 1].v - data.weights[0].v)} kg)
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-mute">Sin suficientes mediciones de peso en el período.</p>
          )}
        </Section>

        <Section title={data.lift ? `Evolución · ${data.lift.name.toLowerCase()}` : "Evolución · fuerza"}>
          {data.liftSeries.length >= 2 ? (
            <>
              <LineChart series={[{ values: data.liftSeries.map((p) => p.v) }]} height={96} label="Evolución de la carga" />
              <div className="flex justify-between text-xs text-mute">
                <span>{shortDate(data.liftSeries[0].d)}</span>
                <span>
                  {num(data.liftSeries[0].v)} → {num(data.liftSeries[data.liftSeries.length - 1].v)} kg
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-mute">Sin registros con carga en el período.</p>
          )}
        </Section>
      </div>

      <Section title="Métricas">
        {metricRows.length === 0 ? (
          <p className="text-sm text-mute">Sin mediciones cargadas.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {metricRows.map((m) => (
              <div key={m.key} className="report-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl bg-raised px-3 py-2.5 text-sm">
                <span>{m.label}</span>
                <span className="tabular text-mute">
                  {num(m.start)} → <span className="font-[650] text-ink">{num(m.last)} {m.unit}</span>
                </span>
                <span className="min-w-[56px] text-right text-xs font-[650]">{signed(m.delta)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section title="Entrenamientos por semana">
          {data.sessions.length > 0 ? (
            <>
              <TargetBars values={data.sessions} target={data.compliance.target} label="Sesiones por semana" />
              <div className="flex justify-between text-xs text-mute">
                <span>{data.sessions.length} semanas</span>
                <span>Objetivo: {data.compliance.target} por semana</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-mute">Sin semanas completas en el período.</p>
          )}
        </Section>

        <Section title="Fuerza · mejores marcas">
          {data.prs.length === 0 ? (
            <p className="text-sm text-mute">Sin ejercicios con carga registrados.</p>
          ) : (
            data.prs.map((l) => (
              <div key={l.exerciseId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
                <span className="truncate">{l.name}</span>
                <span className="tabular text-mute">
                  {num(l.first)} → <span className="font-[650] text-ink">{num(l.best)} kg</span>
                </span>
                <Chip tone={liftProgress(l) > 0 ? "up" : "flat"} size="sm">
                  {signedPct(liftProgress(l))}
                </Chip>
              </div>
            ))
          )}
        </Section>
      </div>

      {data.badges.length > 0 && (
        <Section title="Logros">
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <span key={b.title} className="flex items-center gap-2 rounded-[18px] bg-raised py-1.5 pl-1.5 pr-3 text-sm font-semibold">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-[750] ${b.highlight ? "bg-lime text-bg" : "bg-line text-lime"}`}>
                  {b.icon}
                </span>
                {b.title}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Observaciones">
        {data.lastCheckin ? (
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-mute">
              Último check-in (semana del {shortDate(data.lastCheckin.week_start)}): energía {data.lastCheckin.energy}/5 · sueño {data.lastCheckin.sleep}/5 · estrés{" "}
              {data.lastCheckin.stress}/5 · dolor {data.lastCheckin.pain}/5 · motivación {data.lastCheckin.motivation}/5
              {countFlags(data.lastCheckin) >= 2 ? " — con respuestas fuera de lo habitual" : ""}
            </span>
            {data.lastCheckin.notes && <span>“{data.lastCheckin.notes}”</span>}
          </div>
        ) : (
          <p className="text-sm text-mute">Sin check-ins registrados.</p>
        )}
        {data.notes.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-track pt-3">
            <span className="text-xs font-semibold uppercase tracking-[0.04em] text-mute">Notas del coach (privadas)</span>
            {data.notes.slice(0, 5).map((n) => (
              <p key={n.id} className="text-sm">
                <span className="text-mute">{shortDate(localDateKey(n.created_at))} · </span>
                {n.content}
              </p>
            ))}
          </div>
        )}
      </Section>

      {(firstPhoto || lastPhoto) && (
        <Section title="Fotos">
          <div className="grid grid-cols-2 gap-2">
            {[
              { p: firstPhoto, label: "Inicio" },
              { p: lastPhoto, label: "Actual" },
            ].map(({ p: ph, label }) => {
              const url = ph?.urls.front ?? ph?.urls.side ?? ph?.urls.back;
              return url ? (
                <div key={label} className="relative h-[220px] overflow-hidden rounded-2xl bg-raised">
                  <img src={url} alt={`${label} · ${shortDate(ph!.date)}`} className="h-full w-full object-cover" />
                  <span className="absolute bottom-2.5 left-2.5 rounded-md bg-[rgba(17,18,20,0.6)] px-1.5 text-xs font-semibold">
                    {label} · {shortDate(ph!.date)}
                  </span>
                </div>
              ) : (
                <div key={label} className="stripes flex h-[220px] items-end rounded-2xl p-2.5 text-xs font-semibold text-mute">
                  {label} · sin foto
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </main>
  );
}
