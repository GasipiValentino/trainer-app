import Link from "next/link";
import { Page } from "@/components/layout/page";
import { Segmented } from "@/components/ui/segmented";
import { BackIcon } from "@/components/ui/icons";
import { EventLegend, EventList } from "@/components/calendar/event-list";
import { requireRole } from "@/lib/auth/session";
import { getEvents, SESSION_TYPES, type CalendarEvent } from "@/lib/data/calendar";
import { eventDot } from "@/lib/domain/calendar";
import { addDays, diffDays, localDateKey, mondayOf, monthTitle, WEEKDAY_INITIALS, weekdayIndex, zonedMidnight, longDate } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Agenda · Trainer" };

type View = "dia" | "semana" | "mes";

const firstOfMonth = (key: string) => `${key.slice(0, 7)}-01`;
const addMonths = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
};

/** D6 — Agenda del profesor (Día / Semana / Mes). */
export default async function CalendarPage({ searchParams }: PageProps<"/teacher/calendar">) {
  await requireRole("teacher");
  const sp = await searchParams;
  const today = localDateKey();
  const view: View = sp.view === "dia" || sp.view === "mes" ? sp.view : "semana";
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  const monday = mondayOf(date);
  const monthStart = firstOfMonth(date);
  const nextMonth = addMonths(monthStart, 1);

  // Rango a consultar según la vista.
  const [from, to] =
    view === "mes" ? [monthStart, nextMonth] : view === "dia" ? [date, addDays(date, 1)] : [monday, addDays(monday, 7)];
  const events = await getEvents(zonedMidnight(from).toISOString(), zonedMidnight(to).toISOString());

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const k = localDateKey(e.start_at);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  const href = (p: { view?: View; date?: string }) => `${routes.teacher.calendar}?view=${p.view ?? view}&date=${p.date ?? date}`;
  const step = view === "mes" ? [addMonths(monthStart, -1), nextMonth] : view === "dia" ? [addDays(date, -1), addDays(date, 1)] : [addDays(date, -7), addDays(date, 7)];

  const views: { value: View; label: string; href: string }[] = [
    { value: "dia", label: "Día", href: href({ view: "dia" }) },
    { value: "semana", label: "Semana", href: href({ view: "semana" }) },
    { value: "mes", label: "Mes", href: href({ view: "mes" }) },
  ];

  return (
    <Page narrow className="gap-3.5">
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[13px] text-mute">
            <Link href={href({ date: step[0] })} aria-label="Anterior" className="-ml-1 rounded-full p-1 hover:text-ink">
              <BackIcon size={14} />
            </Link>
            <span>{view === "dia" ? longDate(date) : monthTitle(view === "mes" ? monthStart : date)}</span>
            <Link href={href({ date: step[1] })} aria-label="Siguiente" className="rounded-full p-1 hover:text-ink">
              <BackIcon size={14} className="rotate-180" />
            </Link>
            {date !== today && (
              <Link href={href({ date: today })} className="ml-1 font-semibold text-lime">
                Hoy
              </Link>
            )}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-0.03em]">Agenda</h1>
        </div>
        <Segmented variant="header" label="Vista" options={views} value={view} />
      </header>

      {view !== "mes" && (
        <>
          {view === "semana" && (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(monday, i);
                const n = byDay.get(d)?.length ?? 0;
                const on = d === date;
                return (
                  <Link
                    key={d}
                    href={href({ date: d })}
                    scroll={false}
                    aria-current={on ? "date" : undefined}
                    className={`flex h-[72px] flex-col items-center justify-center gap-1 rounded-[22px] ${on ? "bg-lime text-bg" : "bg-surface text-ink"}`}
                  >
                    <span className="text-xs font-semibold opacity-75">{WEEKDAY_INITIALS[i]}</span>
                    <span className="text-lg font-bold">{Number(d.slice(8))}</span>
                    <span className="text-[11px] font-semibold opacity-80">{n ? `${n} ses` : "—"}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <EventLegend />
          <EventList
            events={byDay.get(date) ?? []}
            hrefFor={(e) => `${routes.teacher.calendar}/${e.id}`}
            emptyText={date === today ? "No tenés nada agendado hoy." : "Sin eventos este día."}
          />
          <Link href={`${routes.teacher.newEvent}?date=${date}`} className="self-start px-1 text-[13px] font-semibold text-lime">
            + Agregar evento el {longDate(date)}
          </Link>
        </>
      )}

      {view === "mes" && <MonthGrid monthStart={monthStart} today={today} byDay={byDay} hrefFor={(d) => href({ view: "semana", date: d })} events={events} />}
    </Page>
  );
}

function MonthGrid({
  monthStart,
  today,
  byDay,
  hrefFor,
  events,
}: {
  monthStart: string;
  today: string;
  byDay: Map<string, CalendarEvent[]>;
  hrefFor: (d: string) => string;
  events: CalendarEvent[];
}) {
  const offset = weekdayIndex(monthStart);
  const days = diffDays(monthStart, addMonths(monthStart, 1));
  const sessions = events.filter((e) => (SESSION_TYPES as readonly string[]).includes(e.type) && e.type !== "evaluacion").length;
  const evals = events.filter((e) => e.type === "evaluacion").length;

  return (
    <>
      <section className="flex flex-col gap-2 rounded-[24px] bg-surface px-3 py-3.5">
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-mute">
          {WEEKDAY_INITIALS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = addDays(monthStart, i);
            const evs = byDay.get(d) ?? [];
            const isToday = d === today;
            return (
              <Link
                key={d}
                href={hrefFor(d)}
                className={`flex h-[50px] flex-col items-center justify-center gap-1 rounded-[14px] ${isToday ? "bg-lime text-bg" : d < today ? "text-task" : "text-ink"}`}
              >
                <span className="text-sm font-semibold">{i + 1}</span>
                <span className="flex h-[5px] gap-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className="h-[5px] w-[5px] rounded-full" style={{ background: isToday ? "#111214" : eventDot(e.type).background === "transparent" ? "#F2F2EE" : eventDot(e.type).background }} />
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <div className="flex justify-between rounded-[20px] bg-surface px-4 py-3.5 text-sm">
        <span>Este mes</span>
        <span className="text-mute">
          {sessions} {sessions === 1 ? "sesión" : "sesiones"} · {evals} {evals === 1 ? "evaluación" : "evaluaciones"}
        </span>
      </div>
    </>
  );
}
