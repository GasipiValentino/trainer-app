import { Page } from "@/components/layout/page";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { MessagesButton } from "@/components/layout/messages-button";
import { AttentionCard, FeedList, WeekCard, type FeedItem } from "@/components/teacher/dashboard";
import { Onboarding } from "@/components/teacher/onboarding";
import { requireRole } from "@/lib/auth/session";
import { countTeacherSessionsToday, sessionsPerDay } from "@/lib/data/calendar";
import { getUnreadCount } from "@/lib/data/messages";
import { getEnrichedStudents } from "@/lib/data/students";
import { getOnboarding } from "@/lib/data/teacher";
import { pendingAttention } from "@/lib/domain/alerts";
import { plannedPerWeek, workoutsBetween } from "@/lib/domain/metrics";
import { attentionScore } from "@/lib/domain/presenters";
import { addDays, formatLongDay, greeting, localDateKey, mondayOf, weekdayIndex, zonedMidnight } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Hoy · Trainer" };

/** D1 — Inicio del profesor. */
export default async function TeacherHomePage() {
  const user = await requireRole("teacher");
  const today = localDateKey();
  const monday = mondayOf(today);

  const [students, sessionsToday, unread, onboarding, scheduled] = await Promise.all([
    getEnrichedStudents(),
    countTeacherSessionsToday(user.id),
    getUnreadCount(user.id),
    getOnboarding(user.id),
    sessionsPerDay(user.id, zonedMidnight(monday).toISOString(), zonedMidnight(addDays(monday, 7)).toISOString()),
  ]);

  const sessionsLabel = sessionsToday === 0 ? "Sin sesiones hoy" : `${sessionsToday} ${sessionsToday === 1 ? "sesión" : "sesiones"} hoy`;
  const header = (
    <GreetingHeader
      firstName={user.firstName}
      lastName={user.lastName}
      title={`${greeting()}, ${user.firstName}`}
      subtitle={`${formatLongDay()} · ${sessionsLabel}`}
      accountHref={routes.teacher.account}
      avatarTone="lime"
      action={<MessagesButton href={routes.teacher.messages} unread={unread} />}
    />
  );

  // Primer ingreso: onboarding mientras no lo cierre y le falten pasos.
  const showOnboarding =
    !onboarding.done && !(students.length > 0 && onboarding.hasRoutine && onboarding.hasEvent);
  if (showOnboarding) {
    return (
      <Page narrow>
        {header}
        <Onboarding
          firstName={user.firstName}
          hasStudent={students.length > 0}
          hasRoutine={onboarding.hasRoutine}
          hasEvent={onboarding.hasEvent}
        />
      </Page>
    );
  }

  // --- Atención hoy: alumnos con alertas pendientes, por urgencia.
  const queue = students
    .filter((s) => pendingAttention(s, s.alerts).length > 0)
    .sort((a, b) => attentionScore(b) - attentionScore(a));

  // --- Semana: entrenos hechos por día vs sesiones agendadas a futuro.
  const withAccount = students.filter((s) => s.userId);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return { done: withAccount.reduce((acc, s) => acc + workoutsBetween(s, d, d), 0), scheduled: scheduled[d] ?? 0 };
  });
  const done = days.slice(0, weekdayIndex(today) + 1).reduce((a, d) => a + d.done, 0);
  const planned = withAccount.filter((s) => s.routine).reduce((a, s) => a + plannedPerWeek(s), 0);

  // --- Novedades: una fila por alumno (su alerta más relevante, como en D1);
  // atención pendiente primero, después logros e info.
  const feed: FeedItem[] = students
    .flatMap((s) => {
      const top = s.alerts.find((a) => a.severity !== "attention" || !s.reviewed.includes(a.key));
      return top ? [{ ...top, firstName: s.firstName, lastName: s.lastName }] : [];
    })
    .sort((a, b) => {
      const order = { attention: 0, positive: 1, info: 2 } as const;
      return order[a.severity] - order[b.severity] || b.weight - a.weight;
    });

  return (
    <Page>
      {header}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3">
          <AttentionCard
            people={queue}
            reviewHref={queue[0] ? `${routes.teacher.student(queue[0].id)}?review=1` : null}
          />
          <WeekCard done={done} planned={planned} activeStudents={withAccount.length} days={days} todayIndex={weekdayIndex(today)} />
        </div>
        <FeedList items={feed.slice(0, 4)} showAll={feed.length > 4 ? routes.teacher.news : undefined} />
      </div>
    </Page>
  );
}
