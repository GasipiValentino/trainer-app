import Link from "next/link";
import { Page } from "@/components/layout/page";
import { Avatar } from "@/components/ui/avatar";
import { BackIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { CheckinMetrics } from "@/components/teacher/checkin-metrics";
import { RemindButton } from "@/components/teacher/remind-button";
import { requireRole } from "@/lib/auth/session";
import { getEnrichedStudents } from "@/lib/data/students";
import { getWeekCheckins } from "@/lib/data/checkins";
import { ALERT_RULES } from "@/lib/domain/alerts";
import { countFlags } from "@/lib/domain/metrics";
import { addDays, localDateKey, mondayOf, shortDate, weekdayTime } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Check-ins · Trainer" };

/** D7 — Check-ins de la semana. */
export default async function CheckinsPage({ searchParams }: PageProps<"/teacher/check-ins">) {
  await requireRole("teacher");
  const sp = await searchParams;
  const thisMonday = mondayOf(localDateKey());
  // Por defecto, la última semana completa (como "Semana del 28 sep" en D7).
  const week = typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? mondayOf(sp.week) : addDays(thisMonday, -7);

  const [students, checkins] = await Promise.all([getEnrichedStudents(), getWeekCheckins(week)]);
  const weekEnd = addDays(week, 6);
  // Esperados: alumnos con cuenta activa que ya eran alumnos esa semana.
  const expected = students.filter((s) => s.userId && localDateKey(s.createdAt) <= weekEnd);
  const byStudent = new Map(checkins.map((c) => [c.student_id, c]));
  const answered = expected.filter((s) => byStudent.has(s.id));
  const missing = expected.filter((s) => !byStudent.has(s.id));

  const flagged = answered
    .map((s) => ({ s, c: byStudent.get(s.id)!, flags: countFlags(byStudent.get(s.id)!) }))
    .filter((x) => x.flags >= ALERT_RULES.checkinFlagsMin)
    .sort((a, b) => b.flags - a.flags);
  const calm = answered.filter((s) => !flagged.some((f) => f.s.id === s.id));
  const pct = expected.length ? answered.length / expected.length : 0;

  const weekHref = (w: string) => `${routes.teacher.checkins}?week=${w}`;

  return (
    <Page narrow>
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[13px] text-mute">
            <Link href={weekHref(addDays(week, -7))} aria-label="Semana anterior" className="-ml-1 rounded-full p-1 hover:text-ink">
              <BackIcon size={14} />
            </Link>
            <span>Semana del {shortDate(week)}</span>
            {week < thisMonday && (
              <Link href={weekHref(addDays(week, 7))} aria-label="Semana siguiente" className="rounded-full p-1 hover:text-ink">
                <BackIcon size={14} className="rotate-180" />
              </Link>
            )}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-0.03em]">Check-ins</h1>
        </div>
      </header>

      {expected.length === 0 ? (
        <EmptyState title="Todavía no hay alumnos con cuenta activa" action={<LinkButton href={routes.teacher.newStudent}>Agregar alumno</LinkButton>}>
          Los check-ins los completan los alumnos desde su app, una vez por semana.
        </EmptyState>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4">
            <span className="text-[32px] font-bold tracking-[-0.03em]">
              {answered.length}
              <span className="text-base font-medium text-mute"> de {expected.length} respondieron</span>
            </span>
            <div className="h-2 overflow-hidden rounded bg-track">
              <div className="h-full rounded bg-lime" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
            {week >= addDays(thisMonday, -7) && <RemindButton userIds={missing.map((s) => s.userId!)} />}
            {week < addDays(thisMonday, -7) && missing.length > 0 && (
              <p className="text-[13px] text-mute">No respondieron: {missing.map((s) => s.firstName).join(", ")}.</p>
            )}
          </section>

          {flagged.map(({ s, c, flags }) => (
            <section key={c.id} className="flex flex-col gap-3.5 rounded-[24px] border-[1.5px] border-[rgba(255,143,107,0.55)] bg-surface px-[18px] py-4">
              <div className="flex items-center gap-3">
                <Avatar first={s.firstName} last={s.lastName} size={42} />
                <Link href={`${routes.teacher.student(s.id)}?tab=checkins`} className="flex flex-1 flex-col">
                  <span className="text-base font-[650]">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="text-[13px] text-coral">{flags} respuestas fuera de lo habitual</span>
                </Link>
                <span className="text-xs text-mute">{weekdayTime(c.created_at)}</span>
              </div>
              <CheckinMetrics c={c} />
              {c.notes && <p className="rounded-2xl bg-raised px-3.5 py-3 text-sm leading-[1.45]">“{c.notes}”</p>}
              <div className="flex gap-2">
                <Link
                  href={s.userId ? routes.teacher.thread(s.userId) : routes.teacher.student(s.id)}
                  className="flex h-[46px] flex-1 items-center justify-center rounded-[23px] bg-lime text-sm font-bold text-bg"
                >
                  Responder
                </Link>
                <Link
                  href={s.routine ? routes.teacher.routine(s.routine.id) : `${routes.teacher.student(s.id)}?tab=rutina`}
                  className="flex h-[46px] flex-1 items-center justify-center rounded-[23px] border border-line text-sm font-semibold"
                >
                  Bajar la carga
                </Link>
              </div>
            </section>
          ))}

          {calm.length > 0 && (
            <section className="flex flex-col rounded-[24px] bg-surface px-2 pb-2 pt-1.5">
              <span className="px-3 pb-1.5 pt-3 text-base font-[650]">Sin novedades · {calm.length}</span>
              <div className="flex flex-col gap-1.5">
                {calm.map((s) => {
                  const c = byStudent.get(s.id)!;
                  return (
                    <Link key={s.id} href={`${routes.teacher.student(s.id)}?tab=checkins`} className="flex items-center gap-3 rounded-[18px] bg-raised px-3 py-2.5">
                      <Avatar first={s.firstName} last={s.lastName} size={36} />
                      <span className="flex-1 truncate text-[15px] font-semibold">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className="shrink-0 text-[13px] text-mute">
                        Energía {c.energy} · Sueño {c.sleep}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </Page>
  );
}
