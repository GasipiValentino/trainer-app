import Link from "next/link";
import { Page } from "@/components/layout/page";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { PersonPill } from "@/components/auth/auth-shell";
import { initials } from "@/components/ui/avatar";
import { FormMessage } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import {
  CoachMessageCard,
  LiftCard,
  TODAY_BUTTON,
  TodayButtonInner,
  TodayCard,
  UpcomingRow,
  WeekDotsCard,
} from "@/components/student/home-cards";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getMyCoach } from "@/lib/data/coach";
import { getSummary } from "@/lib/data/students";
import { getExerciseSeries, getRoutineDetail } from "@/lib/data/student-detail";
import { getEvents, SESSION_TYPES } from "@/lib/data/calendar";
import { getLastCoachMessage, getMyCheckin, getWorkoutState } from "@/lib/data/student-home";
import { startWorkoutAction } from "@/lib/actions/workouts";
import { liftProgress, mainLift, plannedPerWeek, routineWeek, workoutsBetween } from "@/lib/domain/metrics";
import { nextRoutineDay } from "@/lib/domain/student-plan";
import { estimateMinutes, rpeRange } from "@/lib/domain/routine-format";
import { TYPE_LABEL } from "@/lib/domain/calendar";
import {
  addDays,
  diffDays,
  formatLongDay,
  formatTime,
  localDateKey,
  mondayOf,
  relativeDay,
  weekdayIndex,
  weekdayShort,
  zonedMidnight,
} from "@/lib/dates";
import { num, signedPct } from "@/lib/format";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Hoy · Trainer" };

/** E1 — Inicio del alumno. */
export default async function StudentHomePage({ searchParams }: PageProps<"/student">) {
  const user = await requireRole("student");
  const sp = await searchParams;
  const studentId = await getMyStudentId();
  const today = localDateKey();
  const monday = mondayOf(today);

  const header = (coach?: { firstName: string; lastName: string } | null) => (
    <GreetingHeader
      firstName={user.firstName}
      lastName={user.lastName}
      title={`Hola, ${user.firstName}`}
      subtitle={formatLongDay()}
      accountHref={routes.student.account}
      action={
        coach && (
          <Link href={routes.student.messages}>
            <PersonPill initials={initials(coach.firstName, coach.lastName)} label="Tu coach" />
          </Link>
        )
      }
    />
  );

  if (!studentId) {
    return (
      <Page>
        {header(null)}
        <EmptyState title="Tu cuenta no está vinculada a un profesor">
          Pedile a tu profesor un link de invitación nuevo.
        </EmptyState>
      </Page>
    );
  }

  const [summary, coach, state, weekEvents, upcoming] = await Promise.all([
    getSummary(studentId),
    getMyCoach(studentId),
    getWorkoutState(studentId),
    getEvents(zonedMidnight(monday).toISOString(), zonedMidnight(addDays(monday, 7)).toISOString()),
    getEvents(zonedMidnight(addDays(today, 1)).toISOString(), zonedMidnight(addDays(today, 30)).toISOString()),
  ]);
  if (!summary) return null;

  const routine = summary.routine ? await getRoutineDetail(summary.routine.id) : null;
  const lift = mainLift(summary);
  const [liftSeries, message, lastWeekCheckin] = await Promise.all([
    lift ? getExerciseSeries(studentId, lift.exerciseId, addDays(today, -84)) : Promise.resolve([]),
    coach ? getLastCoachMessage(user.id, coach.id) : Promise.resolve(null),
    getMyCheckin(studentId, addDays(monday, -7)),
  ]);

  // --- Entreno de hoy
  const todayEvent = weekEvents.find((e) => localDateKey(e.start_at) === today && (SESSION_TYPES as readonly string[]).includes(e.type));
  // Si el profesor agendó hoy una sesión con el nombre de un día de la rutina, manda ese día.
  const scheduledDay = todayEvent && routine ? routine.days.find((d) => d.name.toLowerCase() === todayEvent.title.toLowerCase()) : undefined;
  const nextDay = routine
    ? (scheduledDay ?? nextRoutineDay(routine, state.doneToday?.routine_day_id ?? state.last?.routine_day_id ?? null))
    : null;
  const todayDay = state.openToday
    ? routine?.days.find((d) => d.id === state.openToday!.routine_day_id) ?? nextDay
    : state.doneToday
      ? routine?.days.find((d) => d.id === state.doneToday!.routine_day_id) ?? null
      : nextDay;
  const week = routineWeek(summary);

  // --- Semana: hechos vs planificados (días con sesión agendada)
  const target = plannedPerWeek(summary);
  const doneThisWeek = workoutsBetween(summary, monday, addDays(monday, 6));
  const plannedDays = new Set(weekEvents.filter((e) => (SESSION_TYPES as readonly string[]).includes(e.type)).map((e) => localDateKey(e.start_at)));
  const workoutDays = new Set(summary.workoutDates);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return { done: workoutDays.has(d), planned: plannedDays.has(d) };
  });

  // --- Check-in pendiente: la semana pasada sin responder (lun a jue), o la actual desde el viernes.
  const checkinDue = !lastWeekCheckin && weekdayIndex(today) <= 3;

  const eyebrow = todayEvent
    ? `Hoy · ${formatTime(todayEvent.start_at)} · ${TYPE_LABEL[todayEvent.type]}`
    : state.doneToday
      ? "Hoy · Completado"
      : "Hoy · Por tu cuenta";

  return (
    <Page>
      {header(coach)}

      {sp.done === "1" && <FormMessage kind="success">¡Entrenamiento guardado! Buen trabajo.</FormMessage>}
      {sp.checkin === "1" && <FormMessage kind="success">Check-in enviado. ¡Gracias!</FormMessage>}
      {sp.error === "workout" && <FormMessage kind="error">No pudimos empezar el entrenamiento. Intentá nuevamente.</FormMessage>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3">
          {!routine || !todayDay ? (
            <EmptyState title="Todavía no tenés una rutina asignada">
              {coach ? `${coach.firstName} te la va a cargar pronto. Mientras tanto podés escribirle.` : "Tu profesor te la va a cargar pronto."}
            </EmptyState>
          ) : (
            <TodayCard
              eyebrow={eyebrow}
              title={todayDay.name}
              badge={week ? (week.finished ? "Bloque terminado" : week.of ? `Semana ${week.n} de ${week.of}` : `Semana ${week.n}`) : null}
              facts={[
                `${todayDay.exercises.length} ${todayDay.exercises.length === 1 ? "ejercicio" : "ejercicios"}`,
                `~${estimateMinutes(todayDay.exercises)} min`,
                rpeRange(todayDay.exercises) ?? "",
              ].filter(Boolean)}
              action={
                state.doneToday && !state.openToday ? (
                  <Link href={routes.student.routine} className={TODAY_BUTTON}>
                    <TodayButtonInner label="Ver mi plan" />
                  </Link>
                ) : state.openToday ? (
                  <Link href={`${routes.student.workout}/${state.openToday.id}`} className={TODAY_BUTTON}>
                    <TodayButtonInner label="Continuar entrenamiento" />
                  </Link>
                ) : (
                  <form action={startWorkoutAction.bind(null, todayDay.id)}>
                    <button type="submit" className={TODAY_BUTTON}>
                      <TodayButtonInner label="Empezar entrenamiento" />
                    </button>
                  </form>
                )
              }
            />
          )}

          <section className="grid grid-cols-2 gap-2.5">
            <WeekDotsCard done={doneThisWeek} target={target} days={days} todayIndex={weekdayIndex(today)} />
            {lift ? (
              <LiftCard
                href={routes.student.progress}
                name={lift.name}
                best={num(lift.best)}
                values={liftSeries.map((p) => p.v)}
                caption={`${signedPct(liftProgress(lift))} en ${Math.max(1, Math.round(diffDays(localDateKey(lift.firstAt), today) / 7))} semanas`}
              />
            ) : (
              <Link href={routes.student.progress} className="flex flex-col justify-between gap-2 rounded-[24px] bg-surface p-4">
                <span className="text-[13px] text-mute">Progreso</span>
                <span className="text-sm">Registrá tus entrenamientos para ver cómo evolucionan tus cargas.</span>
              </Link>
            )}
          </section>

          {checkinDue && (
            <Link href={routes.student.checkin} className="flex items-center justify-between gap-3 rounded-[24px] border-[1.5px] border-lime bg-surface p-4">
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-[650]">¿Cómo fue tu semana?</span>
                <span className="text-[13px] text-mute">Check-in pendiente · 1 minuto</span>
              </span>
              <span className="flex h-9 items-center rounded-[18px] bg-lime px-3.5 text-[13px] font-bold text-bg">Responder</span>
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {coach && message && (
            <CoachMessageCard
              href={routes.student.messages}
              coachFirst={coach.firstName}
              coachLast={coach.lastName}
              when={relativeDay(localDateKey(message.created_at), today)}
              text={message.content}
            />
          )}

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-base font-[650]">Próximos entrenamientos</span>
              <Link href={routes.student.calendar} className="text-[13px] text-lime">
                Agenda
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="rounded-[20px] bg-surface px-4 py-4 text-sm text-mute">No tenés sesiones agendadas.</p>
            ) : (
              upcoming.slice(0, 3).map((e) => {
                const d = localDateKey(e.start_at);
                const with_ = coach && e.type !== "tarea" ? ` con ${coach.firstName}` : "";
                const sub =
                  e.description ??
                  `${formatTime(e.start_at)} · ${TYPE_LABEL[e.type] ?? "Sesión"}${e.type === "presencial" ? with_ : ""}`;
                return <UpcomingRow key={e.id} dow={weekdayShort(d).toUpperCase()} day={String(Number(d.slice(8)))} title={e.title} sub={sub} />;
              })
            )}
          </section>
        </div>
      </div>

      {!routine && coach && (
        <LinkButton href={routes.student.messages} variant="tonal" className="w-full lg:w-auto">
          Escribirle a {coach.firstName}
        </LinkButton>
      )}
    </Page>
  );
}
