import { Page, PageTitle } from "@/components/layout/page";
import { PillLink, PillRow } from "@/components/ui/pills";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { RoutineDayView, StudentNote } from "@/components/routine/routine-view";
import { TODAY_BUTTON, TodayButtonInner } from "@/components/student/home-cards";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getSummary } from "@/lib/data/students";
import { getRoutineDetail } from "@/lib/data/student-detail";
import { getWorkoutState } from "@/lib/data/student-home";
import { startWorkoutAction } from "@/lib/actions/workouts";
import { routineWeek } from "@/lib/domain/metrics";
import { nextRoutineDay } from "@/lib/domain/student-plan";
import { estimateMinutes } from "@/lib/domain/routine-format";
import { shortDate } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Mi plan · Trainer" };

/** Mi plan: la rutina asignada, día por día (tarjetas de D5 en modo lectura). */
export default async function MyPlanPage({ searchParams }: PageProps<"/student/routine">) {
  await requireRole("student");
  const { day: dayParam } = await searchParams;
  const studentId = await getMyStudentId();
  if (!studentId) return null;
  const s = await getSummary(studentId);
  const routine = s?.routine ? await getRoutineDetail(s.routine.id) : null;

  if (!s || !routine || routine.days.length === 0) {
    return (
      <Page narrow>
        <PageTitle>Mi plan</PageTitle>
        <EmptyState title="Todavía no tenés una rutina">Cuando tu coach te asigne una, la vas a ver acá día por día.</EmptyState>
      </Page>
    );
  }

  const state = await getWorkoutState(studentId);
  const next = nextRoutineDay(routine, state.last?.routine_day_id ?? null);
  const day = routine.days.find((d) => d.id === dayParam) ?? next ?? routine.days[0];
  const week = routineWeek(s);

  return (
    <Page narrow>
      <section className="flex items-start justify-between gap-3 px-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-[-0.03em]">{routine.name}</h1>
          <span className="text-[13px] text-mute">
            Desde el {shortDate(s.routine!.start_date)} · {routine.days.length} {routine.days.length === 1 ? "día" : "días"}
          </span>
        </div>
        {week && <Chip tone="flat">{week.finished ? "Bloque terminado" : week.of ? `Semana ${week.n} de ${week.of}` : `Semana ${week.n}`}</Chip>}
      </section>

      <PillRow>
        {routine.days.map((d, i) => (
          <PillLink key={d.id} href={`${routes.student.routine}?day=${d.id}`} active={d.id === day.id} size="lg">
            Día {i + 1} · {d.name}
          </PillLink>
        ))}
      </PillRow>

      <span className="px-1 text-[13px] text-mute">
        {day.exercises.length} ejercicios · ~{estimateMinutes(day.exercises)} min{day.id === next?.id ? " · Te toca este" : ""}
      </span>
      <RoutineDayView exercises={day.exercises} />
      {routine.student_note && <StudentNote text={routine.student_note} />}

      {state.openToday ? (
        <a href={`${routes.student.workout}/${state.openToday.id}`} className={`${TODAY_BUTTON} !bg-lime !text-bg`}>
          <TodayButtonInner label="Continuar entrenamiento" />
        </a>
      ) : (
        day.exercises.length > 0 && (
          <form action={startWorkoutAction.bind(null, day.id)} className="mt-1">
            <button type="submit" className={`${TODAY_BUTTON} !bg-lime !text-bg`}>
              <TodayButtonInner label={`Empezar ${day.name}`} />
            </button>
          </form>
        )
      )}
    </Page>
  );
}
