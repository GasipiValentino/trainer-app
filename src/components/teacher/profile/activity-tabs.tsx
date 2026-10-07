import { CheckinMetrics } from "@/components/teacher/checkin-metrics";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { formatTime, localDateKey, shortDate, shortDateUpper } from "@/lib/dates";
import { num } from "@/lib/format";
import { countFlags } from "@/lib/domain/metrics";
import type { WorkoutWithSets } from "@/lib/data/student-detail";
import type { Tables } from "@/types/database";

/** Pestaña Check-ins: respuestas semanales del alumno, la más reciente arriba. */
export function CheckinsTab({ checkins }: { checkins: Tables<"checkins">[] }) {
  if (checkins.length === 0) {
    return <EmptyState title="Todavía no completó check-ins">Los check-ins son semanales: aparecen acá cuando el alumno los responde.</EmptyState>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {checkins.map((c) => {
        const flags = countFlags(c);
        return (
          <article
            key={c.id}
            className={`flex flex-col gap-3.5 rounded-[24px] bg-surface px-[18px] py-4 ${flags >= 2 ? "border-[1.5px] border-[rgba(255,143,107,0.55)]" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-[650]">Semana del {shortDate(c.week_start)}</span>
              {flags >= 2 ? <Chip tone="warn" size="sm">{flags} fuera de lo habitual</Chip> : <span className="text-xs text-mute">{shortDate(localDateKey(c.created_at))}</span>}
            </div>
            <CheckinMetrics c={c} />
            {c.notes && <p className="rounded-2xl bg-raised px-3.5 py-3 text-sm leading-[1.45]">“{c.notes}”</p>}
          </article>
        );
      })}
    </div>
  );
}

/** Pestaña Historial: entrenamientos registrados con el resumen por ejercicio. */
export function WorkoutsTab({ workouts }: { workouts: WorkoutWithSets[] }) {
  if (workouts.length === 0) {
    return <EmptyState title="Sin entrenamientos registrados">Cuando el alumno complete una sesión, la vas a ver acá con cargas y repeticiones.</EmptyState>;
  }
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      {workouts.map((w) => {
        const minutes = w.completed_at ? Math.round((+new Date(w.completed_at) - +new Date(w.started_at)) / 60000) : null;
        return (
          <article key={w.id} className="flex flex-col gap-2.5 rounded-[22px] bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold">{w.dayName ?? "Entrenamiento libre"}</span>
                <span className="text-[13px] text-mute">
                  {shortDateUpper(localDateKey(w.started_at))} · {formatTime(w.started_at)}
                  {minutes ? ` · ${minutes}′` : ""} · {w.totalSets} series
                </span>
              </div>
              {!w.completed_at && <Chip tone="flat" size="sm">Sin terminar</Chip>}
            </div>
            <div className="flex flex-col gap-1">
              {w.exercises.map((e) => (
                <div key={e.name} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate">{e.name}</span>
                  <span className="tabular shrink-0 text-mute">
                    {e.sets} × {e.best.kg != null ? `${num(e.best.kg)} kg` : ""}
                    {e.best.reps != null ? ` · ${e.best.reps} reps` : ""}
                  </span>
                </div>
              ))}
            </div>
            {w.notes && <p className="rounded-2xl bg-raised px-3 py-2 text-[13px] text-mute">“{w.notes}”</p>}
          </article>
        );
      })}
    </div>
  );
}
