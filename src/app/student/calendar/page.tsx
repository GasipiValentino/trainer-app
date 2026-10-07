import Link from "next/link";
import { Page } from "@/components/layout/page";
import { BackIcon } from "@/components/ui/icons";
import { EventLegend, EventList } from "@/components/calendar/event-list";
import { requireRole } from "@/lib/auth/session";
import { getEvents, type CalendarEvent } from "@/lib/data/calendar";
import { addDays, localDateKey, mondayOf, monthTitle, WEEKDAY_INITIALS, zonedMidnight } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Agenda · Trainer" };

/** Agenda del alumno (solo lectura): semana con días y sesiones, como D6. */
export default async function StudentCalendarPage({ searchParams }: PageProps<"/student/calendar">) {
  await requireRole("student");
  const sp = await searchParams;
  const today = localDateKey();
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const monday = mondayOf(date);
  const events = await getEvents(zonedMidnight(monday).toISOString(), zonedMidnight(addDays(monday, 7)).toISOString());
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const k = localDateKey(e.start_at);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const href = (d: string) => `${routes.student.calendar}?date=${d}`;

  return (
    <Page narrow className="gap-3.5">
      <header className="flex flex-col px-1">
        <div className="flex items-center gap-1.5 text-[13px] text-mute">
          <Link href={href(addDays(date, -7))} aria-label="Semana anterior" className="-ml-1 rounded-full p-1 hover:text-ink">
            <BackIcon size={14} />
          </Link>
          <span>{monthTitle(date)}</span>
          <Link href={href(addDays(date, 7))} aria-label="Semana siguiente" className="rounded-full p-1 hover:text-ink">
            <BackIcon size={14} className="rotate-180" />
          </Link>
        </div>
        <h1 className="text-[30px] font-bold tracking-[-0.03em]">Agenda</h1>
      </header>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(monday, i);
          const n = byDay.get(d)?.length ?? 0;
          const on = d === date;
          return (
            <Link
              key={d}
              href={href(d)}
              scroll={false}
              className={`flex h-[72px] flex-col items-center justify-center gap-1 rounded-[22px] ${on ? "bg-lime text-bg" : "bg-surface"}`}
            >
              <span className="text-xs font-semibold opacity-75">{WEEKDAY_INITIALS[i]}</span>
              <span className="text-lg font-bold">{Number(d.slice(8))}</span>
              <span className="text-[11px] font-semibold opacity-80">{n ? `${n} ses` : "—"}</span>
            </Link>
          );
        })}
      </div>
      <EventLegend />
      <EventList events={byDay.get(date) ?? []} viewer="student" emptyText="No tenés nada agendado este día." />
    </Page>
  );
}
