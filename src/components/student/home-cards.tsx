import Link from "next/link";
import type { ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { PlayIcon } from "@/components/ui/icons";
import { Sparkline } from "@/components/ui/charts";
import { initials } from "@/components/ui/avatar";
import { WEEKDAY_INITIALS } from "@/lib/dates";

/** Card lima "entreno de hoy" (E1). La acción llega como hijo (form o link). */
export function TodayCard({
  eyebrow,
  title,
  badge,
  facts,
  action,
}: {
  eyebrow: string;
  title: string;
  badge?: string | null;
  facts: string[];
  action: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[28px] bg-lime p-5 text-bg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-semibold">{eyebrow}</span>
          <span className="text-[32px] font-bold leading-none tracking-[-0.03em]">{title}</span>
        </div>
        {badge && <Chip tone="dark" size="sm" className="!h-7 !px-2.5">{badge}</Chip>}
      </div>
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-x-[18px] gap-y-1 text-sm font-semibold">
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      )}
      {action}
    </section>
  );
}

/** Botón negro con círculo lima de E1 ("Empezar entrenamiento ▶"). */
export function TodayButtonInner({ label }: { label: string }) {
  return (
    <>
      {label}
      <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-lime text-bg">
        <PlayIcon />
      </span>
    </>
  );
}
export const TODAY_BUTTON =
  "flex h-[52px] w-full items-center justify-between rounded-[26px] bg-bg pl-5 pr-2 text-base font-[650] text-lime";

/** "Esta semana · 1 de 4" con puntos por día (E1). */
export function WeekDotsCard({
  done,
  target,
  days,
  todayIndex,
}: {
  done: number;
  target: number;
  days: { done: boolean; planned: boolean }[];
  todayIndex: number;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[24px] bg-surface p-4">
      <span className="text-[13px] text-mute">Esta semana</span>
      <span className="text-[28px] font-bold tracking-[-0.03em]">
        {done}
        <span className="text-[15px] font-medium text-mute"> de {target}</span>
      </span>
      <div className="grid grid-cols-7 gap-[3px]">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className="box-border h-4 w-4 rounded-full"
              style={{
                background: d.done ? "#D4F64A" : "transparent",
                border: d.done ? "none" : d.planned ? (i === todayIndex ? "2px solid #D4F64A" : "1.5px dashed #6A6D74") : "1.5px solid #2E3036",
              }}
            />
            <span className="text-[10px] font-semibold text-mute">{WEEKDAY_INITIALS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card de ejercicio principal con sparkline (E1 "Sentadilla 112 kg"). */
export function LiftCard({ href, name, best, values, caption }: { href: string; name: string; best: string; values: number[]; caption: string }) {
  return (
    <Link href={href} className="flex flex-col gap-1.5 rounded-[24px] bg-surface p-4">
      <span className="truncate text-[13px] text-mute">{name}</span>
      <span className="text-[28px] font-bold tracking-[-0.03em]">
        {best}
        <span className="text-[15px] font-medium text-mute"> kg</span>
      </span>
      {values.length >= 2 && <Sparkline values={values} height={34} label={`Evolución de ${name}`} />}
      <span className="text-xs font-semibold text-lime">{caption}</span>
    </Link>
  );
}

/** Último mensaje del coach (E1). */
export function CoachMessageCard({
  href,
  coachFirst,
  coachLast,
  when,
  text,
}: {
  href: string;
  coachFirst: string;
  coachLast: string;
  when: string;
  text: string;
}) {
  return (
    <Link href={href} className="flex gap-3 rounded-[24px] bg-surface p-4">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-lime text-[11px] font-bold text-bg">
        {initials(coachFirst, coachLast)}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[13px] text-mute">
          {coachFirst} · {when}
        </span>
        <span className="line-clamp-4 text-[15px] leading-[1.4]">{text}</span>
      </div>
    </Link>
  );
}

/** Fila de "Próximos entrenamientos" (E1): caja de fecha + título + detalle. */
export function UpcomingRow({ dow, day, title, sub, href }: { dow: string; day: string; title: string; sub: string; href?: string }) {
  const body = (
    <>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-raised">
        <span className="text-[11px] font-semibold uppercase text-mute">{dow}</span>
        <span className="text-[17px] font-bold">{day}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-[650]">{title}</span>
        <span className="truncate text-[13px] text-mute">{sub}</span>
      </div>
    </>
  );
  const cls = "flex items-center gap-3 rounded-[20px] bg-surface p-3";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
