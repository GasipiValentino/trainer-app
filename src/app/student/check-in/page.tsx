import { PersonPill } from "@/components/auth/auth-shell";
import { IconLink } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import { initials } from "@/components/ui/avatar";
import { CheckinForm } from "@/components/student/checkin-form";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getMyCoach } from "@/lib/data/coach";
import { getSummary } from "@/lib/data/students";
import { getMyCheckin } from "@/lib/data/student-home";
import { plannedPerWeek, workoutsBetween } from "@/lib/domain/metrics";
import { addDays, localDateKey, mondayOf, shortDate, weekdayIndex } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Check-in · Trainer" };

/**
 * E4 — Check-in. Semana objetivo: lunes a jueves, la semana pasada si no la
 * respondió; desde el viernes, la semana en curso.
 */
export default async function CheckinPage() {
  await requireRole("student");
  const studentId = await getMyStudentId();
  if (!studentId) return null;
  const today = localDateKey();
  const thisMonday = mondayOf(today);
  const lastMonday = addDays(thisMonday, -7);

  const [summary, coach, lastWeek, thisWeek] = await Promise.all([
    getSummary(studentId),
    getMyCoach(studentId),
    getMyCheckin(studentId, lastMonday),
    getMyCheckin(studentId, thisMonday),
  ]);
  if (!summary) return null;

  const week = weekdayIndex(today) <= 3 && !lastWeek ? lastMonday : thisMonday;
  const existing = week === lastMonday ? lastWeek : thisWeek;
  const coachName = coach?.firstName ?? "tu coach";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-3.5 px-4 pb-10 pt-[58px] lg:pt-8">
      <header className="flex items-center justify-between">
        <IconLink href={routes.student.home} aria-label="Cerrar">
          <CloseIcon />
        </IconLink>
        {coach && <PersonPill initials={initials(coach.firstName, coach.lastName)} label={`Pedido por ${coach.firstName}`} />}
      </header>
      <section className="flex flex-col gap-1 px-1">
        <h1 className="text-[28px] font-bold tracking-[-0.03em]">¿Cómo fue tu semana?</h1>
        <span className="text-sm text-mute">
          {existing ? `Ya lo enviaste: podés corregirlo · semana del ${shortDate(week)}` : `1 minuto · 1 es muy bajo, 5 es muy alto · semana del ${shortDate(week)}`}
        </span>
      </section>
      <CheckinForm
        weekStart={week}
        coachFirstName={coachName}
        planned={plannedPerWeek(summary)}
        doneDefault={workoutsBetween(summary, week, addDays(week, 6))}
        initial={
          existing
            ? {
                energy: existing.energy,
                sleep: existing.sleep,
                stress: existing.stress,
                pain: existing.pain,
                motivation: existing.motivation,
                notes: existing.notes,
                done: existing.workouts_done,
              }
            : undefined
        }
      />
    </main>
  );
}
