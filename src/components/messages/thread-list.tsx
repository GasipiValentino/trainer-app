import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTime, localDateKey, relativeDay } from "@/lib/dates";
import type { Thread } from "@/lib/data/messages";

/** Lista de conversaciones con las filas de "Novedades" (D1). */
export function ThreadList({ threads, hrefFor }: { threads: Thread[]; hrefFor: (id: string) => string }) {
  if (threads.length === 0) {
    return (
      <EmptyState title="Todavía no hay conversaciones">
        Cuando tus alumnos activen su cuenta vas a poder escribirles desde acá o desde su perfil.
      </EmptyState>
    );
  }
  const today = localDateKey();
  return (
    <section className="flex flex-col gap-1.5 rounded-[24px] bg-surface p-2">
      {threads.map((t) => {
        const when = t.lastAt ? (localDateKey(t.lastAt) === today ? formatTime(t.lastAt) : relativeDay(localDateKey(t.lastAt), today)) : "";
        return (
          <Link key={t.otherId} href={hrefFor(t.otherId)} className="flex items-center gap-3 rounded-[18px] bg-raised px-3 py-2.5">
            <Avatar first={t.firstName} last={t.lastName} size={40} tone={t.role === "teacher" ? "lime" : "neutral"} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex justify-between gap-2">
                <span className="truncate text-[15px] font-semibold">
                  {t.firstName} {t.lastName}
                </span>
                <span className={`shrink-0 text-xs ${t.unread ? "text-lime" : "text-mute"}`}>{when}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-[13px] ${t.unread ? "text-ink" : "text-mute"}`}>
                  {t.lastContent ? `${t.lastFromMe ? "Vos: " : ""}${t.lastContent}` : "Sin mensajes todavía"}
                </span>
                {t.unread > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-bg">
                    {t.unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
