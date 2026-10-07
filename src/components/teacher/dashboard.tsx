import Link from "next/link";
import { Avatar, initials } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ListCard, ROW_CLASS } from "@/components/ui/card";
import { WEEKDAY_INITIALS } from "@/lib/dates";
import { feedChipTone } from "@/lib/domain/presenters";
import { routes } from "@/lib/navigation";
import type { Alert } from "@/lib/domain/alerts";

/** Card lima "Atención hoy" (D1). */
export function AttentionCard({
  people,
  reviewHref,
}: {
  people: { id: string; firstName: string; lastName: string }[];
  reviewHref: string | null;
}) {
  const n = people.length;
  const AVATAR_BG = ["#111214", "#3A3C42", "#5A5D64"];
  return (
    <section className="flex flex-col gap-4 rounded-[28px] bg-lime p-5 text-bg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">Atención hoy</span>
          <span className="text-[30px] font-bold leading-[1.05] tracking-[-0.03em]">
            {n === 0 ? (
              <>Todo al día<br />por hoy</>
            ) : (
              <>
                {n} {n === 1 ? "alumno" : "alumnos"}
                <br />
                {n === 1 ? "necesita tu mirada" : "necesitan tu mirada"}
              </>
            )}
          </span>
        </div>
        {n > 0 && (
          <div className="flex shrink-0">
            {people.slice(0, 3).map((p, i) => (
              <span
                key={p.id}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-lime text-xs font-semibold text-ink"
                style={{ background: AVATAR_BG[i], marginLeft: i ? -10 : 0 }}
              >
                {initials(p.firstName, p.lastName)}
              </span>
            ))}
          </div>
        )}
      </div>
      <Link
        href={reviewHref ?? routes.teacher.students}
        className="flex h-[50px] items-center justify-between rounded-[25px] bg-bg pl-5 pr-2 text-[15px] font-semibold text-lime"
      >
        {n > 0 ? "Revisar uno por uno" : "Ver alumnos"}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-bg">
          <ArrowRightIcon />
        </span>
      </Link>
    </section>
  );
}

/** Card "Entrenos semana" (D1): total vs planificado y barras por día. */
export function WeekCard({
  done,
  planned,
  activeStudents,
  days,
  todayIndex,
}: {
  done: number;
  planned: number;
  activeStudents: number;
  days: { done: number; scheduled: number }[];
  todayIndex: number;
}) {
  const max = Math.max(8, ...days.map((d) => Math.max(d.done, d.scheduled)));
  return (
    <section className="flex items-end gap-[18px] rounded-[24px] bg-surface px-5 py-[18px]">
      <div className="flex min-w-[112px] flex-col gap-1">
        <span className="text-[13px] text-mute">Entrenos semana</span>
        <span className="tabular text-[32px] font-bold tracking-[-0.03em]">
          {done}
          <span className="text-base font-medium text-mute">/{planned}</span>
        </span>
        <span className="text-xs text-lime">
          {activeStudents} {activeStudents === 1 ? "alumno activo" : "alumnos activos"}
        </span>
      </div>
      <div className="grid flex-1 grid-cols-7 items-end gap-1.5" aria-label="Entrenos por día de esta semana">
        {days.map((d, i) => {
          const future = i > todayIndex;
          const value = future ? d.scheduled : d.done;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-lg"
                  title={future ? `${d.scheduled} agendados` : `${d.done} entrenos`}
                  style={{
                    height: `${Math.max(10, Math.round((value / max) * 100))}%`,
                    background: future ? "transparent" : "#D4F64A",
                    border: future ? "1.5px dashed #4A4D54" : "none",
                    opacity: !future && value === 0 ? 0.25 : 1,
                  }}
                />
              </div>
              <span className={`text-[11px] font-semibold ${i === todayIndex ? "text-lime" : "text-mute"}`}>{WEEKDAY_INITIALS[i]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type FeedItem = Alert & { firstName: string; lastName: string };

/** Destino de cada novedad: check-ins van a D7; mediciones a "Medir"; el resto al perfil. */
function feedHref(a: Alert) {
  if (a.type === "checkin_flags" || a.type === "checkin_missing") return routes.teacher.checkins;
  if (a.type === "measurements_stale") return `${routes.teacher.student(a.studentId)}/measure`;
  if (a.type === "no_routine" || a.type === "routine_ended") return `${routes.teacher.student(a.studentId)}?tab=rutina`;
  return routes.teacher.student(a.studentId);
}

/** Lista "Novedades" (D1) — también usada en "Ver todo". */
export function FeedList({ items, title = "Novedades", showAll }: { items: FeedItem[]; title?: string; showAll?: string }) {
  return (
    <ListCard
      title={title}
      action={
        showAll && (
          <Link href={showAll} className="text-[13px] text-lime">
            Ver todo
          </Link>
        )
      }
    >
      {items.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-mute">Sin novedades por ahora.</p>
      ) : (
        items.map((a) => (
          <Link key={`${a.studentId}-${a.key}`} href={feedHref(a)} className={ROW_CLASS}>
            <Avatar first={a.firstName} last={a.lastName} size={40} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">
                {a.firstName} {a.lastName}
              </span>
              <span className="truncate text-[13px] text-mute">{a.text}</span>
            </div>
            <Chip tone={feedChipTone(a)}>{a.chip}</Chip>
          </Link>
        ))
      )}
    </ListCard>
  );
}
