import Link from "next/link";
import { RoutineDayView, StudentNote } from "@/components/routine/routine-view";
import { AssignRoutineForm } from "@/components/teacher/assign-routine-form";
import { Chip } from "@/components/ui/chip";
import { routes } from "@/lib/navigation";
import { shortDate } from "@/lib/dates";
import type { RoutineDetail } from "@/lib/data/student-detail";
import type { ActiveRoutine } from "@/lib/domain/summary";

/** Pestaña Rutina: rutina activa (como D5, solo lectura) + asignar otra. */
export function RoutineTab({
  studentId,
  active,
  detail,
  week,
  options,
}: {
  studentId: string;
  active: ActiveRoutine | null;
  detail: RoutineDetail | null;
  week: { n: number; of: number | null; finished: boolean } | null;
  options: { id: string; name: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-3">
        {active && detail ? (
          <>
            <section className="flex items-start justify-between gap-3 px-1">
              <div className="flex flex-col gap-1">
                <Link href={routes.teacher.routine(detail.id)} className="text-xl font-bold tracking-[-0.02em] hover:text-lime">
                  {detail.name}
                </Link>
                <span className="text-[13px] text-mute">
                  Desde el {shortDate(active.start_date)}
                  {active.end_date ? ` hasta el ${shortDate(active.end_date)}` : ""} · {active.sessions_per_week ?? detail.days.length} por semana
                </span>
              </div>
              {week &&
                (week.finished ? (
                  <Chip tone="warn">Bloque terminado</Chip>
                ) : (
                  <Chip tone="flat">Semana {week.n}{week.of ? ` de ${week.of}` : ""}</Chip>
                ))}
            </section>
            {detail.days.map((d, i) => (
              <section key={d.id} className="flex flex-col gap-2">
                <span className="px-1 text-sm font-semibold text-mute">
                  Día {i + 1} · {d.name}
                </span>
                <RoutineDayView exercises={d.exercises} />
              </section>
            ))}
            {detail.student_note && <StudentNote text={detail.student_note} />}
          </>
        ) : (
          <section className="rounded-[24px] bg-surface px-[18px] py-5">
            <span className="text-base font-[650]">Sin rutina activa</span>
            <p className="mt-1 text-sm text-mute">Asignale una rutina para que vea qué entrenar cada día.</p>
          </section>
        )}
      </div>
      <AssignRoutineForm studentId={studentId} options={options} currentId={active?.id} />
    </div>
  );
}
