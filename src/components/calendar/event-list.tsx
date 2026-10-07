import Link from "next/link";
import { eventDot, eventLines, eventMinutes, eventTime } from "@/lib/domain/calendar";
import type { CalendarEvent } from "@/lib/data/calendar";

/** Leyenda de tipos (D6). */
export function EventLegend() {
  const items = [
    { type: "presencial", label: "Presencial" },
    { type: "online", label: "Online" },
    { type: "evaluacion", label: "Evaluación" },
    { type: "tarea", label: "Tarea", square: true },
  ];
  return (
    <div className="flex flex-wrap gap-3 px-1 text-xs text-mute">
      {items.map((i) => {
        const d = eventDot(i.type);
        return (
          <span key={i.type} className="flex items-center gap-[5px]">
            <span
              className="box-border h-2 w-2"
              style={{ background: d.background, border: d.border, borderRadius: i.square ? 2 : d.radius }}
            />
            {i.label}
          </span>
        );
      })}
    </div>
  );
}

/** Lista de eventos del día: hora a la izquierda + tarjeta (D6). */
export function EventList({
  events,
  hrefFor,
  viewer = "teacher",
  emptyText = "Sin eventos este día.",
}: {
  events: CalendarEvent[];
  hrefFor?: (e: CalendarEvent) => string;
  viewer?: "teacher" | "student";
  emptyText?: string;
}) {
  if (events.length === 0) {
    return <p className="rounded-[20px] bg-surface px-4 py-5 text-sm text-mute">{emptyText}</p>;
  }
  return (
    <section className="flex flex-col gap-2">
      {events.map((e) => {
        const { title, sub } = eventLines(e, viewer);
        const mins = eventMinutes(e);
        const dot = eventDot(e.type);
        const card = (
          <div className="flex items-center gap-3 rounded-[20px] bg-surface p-3.5">
            <span className="box-border h-2.5 w-2.5 shrink-0" style={{ background: dot.background, border: dot.border, borderRadius: dot.radius }} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-[650]">{title}</span>
              <span className="truncate text-[13px] opacity-70">{sub}</span>
            </div>
            {mins && <span className="text-xs font-semibold opacity-70">{mins}′</span>}
          </div>
        );
        return (
          <div key={e.id} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-2.5">
            <span className="tabular pt-4 text-[13px] font-semibold text-mute">{eventTime(e)}</span>
            {hrefFor ? <Link href={hrefFor(e)}>{card}</Link> : card}
          </div>
        );
      })}
    </section>
  );
}
